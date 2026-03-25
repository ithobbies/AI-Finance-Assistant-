import { useEffect, useState, useMemo } from 'react';
import { Transaction, DashboardStats, DEFAULT_CATEGORIES } from './types';
import { parseTransactions } from './services/ai';
import { Wallet, LogIn, LogOut, Archive, Settings } from 'lucide-react';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { Navigation, Tab } from './components/Navigation';
import { InputView } from './views/InputView';
import { HistoryView } from './views/HistoryView';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { ReportsArchiveView } from './views/ReportsArchiveView';
import { EditModal } from './components/EditModal';
import { Toaster, toast } from 'sonner';
import { Onboarding } from './components/Onboarding';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('input');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { language, hasSeenOnboarding } = useSettings();

  // Test connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Fetch transactions from Firestore
  useEffect(() => {
    if (!isAuthReady || !user) {
      setTransactions([]);
      return;
    }

    const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((doc) => {
        txs.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      // Sort by date descending
      txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(DEFAULT_CATEGORIES);
    transactions.forEach(t => categories.add(t.category));
    return Array.from(categories).sort();
  }, [transactions]);

  const handleSave = async (parsedTransactions: Omit<Transaction, 'id' | 'userId' | 'createdAt'>[]) => {
    if (!user) return;
    
    try {
      for (const p of parsedTransactions) {
        await addDoc(collection(db, 'transactions'), {
          ...p,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
      }
      toast.success(language === 'ru' ? 'Транзакции сохранены' : 'Transactions saved');
    } catch (error) {
      toast.error(language === 'ru' ? 'Ошибка сохранения' : 'Error saving transactions');
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    }
  };

  const handleEdit = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setEditingTransaction(transaction);
    }
  };

  const handleSaveEdit = async (id: string, data: Partial<Transaction>) => {
    try {
      await updateDoc(doc(db, 'transactions', id), data);
      toast.success(language === 'ru' ? 'Изменения сохранены' : 'Changes saved');
    } catch (error) {
      toast.error(language === 'ru' ? 'Ошибка сохранения' : 'Error saving changes');
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    
    const transactionToDelete = transactions.find(t => t.id === id);
    
    try {
      await deleteDoc(doc(db, 'transactions', id));
      toast.success(language === 'ru' ? 'Транзакция удалена' : 'Transaction deleted', {
        action: {
          label: language === 'ru' ? 'Отменить' : 'Undo',
          onClick: async () => {
            if (transactionToDelete && user) {
              try {
                const { id: _, ...rest } = transactionToDelete;
                await addDoc(collection(db, 'transactions'), {
                  ...rest,
                  userId: user.uid,
                  createdAt: serverTimestamp()
                });
                toast.success(language === 'ru' ? 'Восстановлено' : 'Restored');
              } catch (e) {
                toast.error(language === 'ru' ? 'Ошибка восстановления' : 'Restore error');
              }
            }
          }
        }
      });
    } catch (error) {
      toast.error(language === 'ru' ? 'Ошибка удаления' : 'Error deleting transaction');
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;

    const headers = ['Date', 'Category', 'Description', 'Type', 'Amount'];
    const rows = transactions.map(t => [
      t.date,
      `"${t.category}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type,
      t.amount.toString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `finance_2026_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(language === 'ru' ? 'Экспорт завершен' : 'Export completed');
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex items-center justify-center p-4">
        <div className="max-w-md w-full surface-elevated text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-h1 mb-2">Finance 2026</h1>
          <p className="text-body text-muted-foreground mb-8">Sign in to securely track your personal and business finances.</p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-foreground text-background hover:bg-foreground/90 font-medium py-3 px-4 rounded-xl transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      {!hasSeenOnboarding && <Onboarding />}
      <Toaster position="top-center" richColors />
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12">
        <header className="flex flex-row items-center justify-between gap-4 mb-8 md:mb-12">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-3 bg-primary/10 rounded-xl md:rounded-2xl border border-primary/20">
              <Wallet className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-h1">Finance 2026</h1>
              <p className="text-caption hidden md:block">
                {language === 'ru' ? 'Умный учет личных и бизнес финансов' : 'Smart personal & business tracking'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              {user.photoURL && (
                <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-border" referrerPolicy="no-referrer" />
              )}
              <span className="text-sm font-medium text-foreground hidden md:inline-block">{user.displayName}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-muted hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
              title={language === 'ru' ? 'Выйти' : 'Sign out'}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          <Navigation activeTab={activeTab} onChange={setActiveTab} />
          
          <main className="flex-1 min-w-0">
            {error && (
              <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm">
                {error}
              </div>
            )}

            {activeTab === 'input' && (
              <InputView 
                onSave={handleSave} 
                recentTransactions={transactions.slice(0, 5)} 
                uniqueCategories={uniqueCategories}
              />
            )}
            
            {activeTab === 'history' && (
              <HistoryView 
                transactions={transactions} 
                onEdit={handleEdit} 
                onDelete={handleDelete} 
                onExportCSV={handleExportCSV} 
              />
            )}
            
            {activeTab === 'dashboard' && (
              <DashboardView 
                transactions={transactions} 
                onNavigate={setActiveTab}
              />
            )}
            
            {activeTab === 'archive' && (
              <ReportsArchiveView />
            )}
            
            {activeTab === 'settings' && (
              <SettingsView transactions={transactions} />
            )}
          </main>
        </div>
      </div>
      
      <EditModal 
        transaction={editingTransaction} 
        isOpen={!!editingTransaction} 
        onClose={() => setEditingTransaction(null)} 
        onSave={handleSaveEdit} 
        categories={uniqueCategories}
      />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
