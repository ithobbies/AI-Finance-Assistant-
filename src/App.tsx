import { useEffect, useState, useMemo } from 'react';
import { Transaction, RegularPayment, DEFAULT_CATEGORIES } from './types';
import { Wallet, LogIn } from 'lucide-react';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { AppShell } from './components/layout/AppShell';
import { Tab } from './components/layout/MobileBottomNav';
import { InputView } from './views/InputView';
import { HistoryView } from './views/HistoryView';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { ReportsArchiveView } from './views/ReportsArchiveView';
import { CalendarView } from './views/CalendarView';
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
  const [regularPayments, setRegularPayments] = useState<RegularPayment[]>([]);
  const [paymentOccurrences, setPaymentOccurrences] = useState<PaymentOccurrence[]>([]);
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

  // Fetch regular payments from Firestore
  useEffect(() => {
    if (!isAuthReady || !user) {
      setRegularPayments([]);
      return;
    }

    const q = query(collection(db, 'regularPayments'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const payments: RegularPayment[] = [];
      snapshot.forEach((doc) => {
        payments.push({ id: doc.id, ...doc.data() } as RegularPayment);
      });
      setRegularPayments(payments);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'regularPayments');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Fetch payment occurrences from Firestore
  useEffect(() => {
    if (!isAuthReady || !user) {
      setPaymentOccurrences([]);
      return;
    }

    const q = query(collection(db, 'paymentOccurrences'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const occs: PaymentOccurrence[] = [];
      snapshot.forEach((doc) => {
        occs.push({ id: doc.id, ...doc.data() } as PaymentOccurrence);
      });
      setPaymentOccurrences(occs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'paymentOccurrences');
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
        <div className="max-w-md w-full card-primary p-8 text-center shadow-xl">
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
    <AppShell 
      user={user} 
      onLogout={logout} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
    >
      {!hasSeenOnboarding && <Onboarding />}
      <Toaster position="top-center" richColors />
      
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
      
      {activeTab === 'calendar' && (
        <CalendarView 
          transactions={transactions}
          regularPayments={regularPayments}
          paymentOccurrences={paymentOccurrences}
        />
      )}
      
      {activeTab === 'archive' && (
        <ReportsArchiveView />
      )}
      
      {activeTab === 'settings' && (
        <SettingsView transactions={transactions} />
      )}

      <EditModal 
        transaction={editingTransaction} 
        isOpen={!!editingTransaction} 
        onClose={() => setEditingTransaction(null)} 
        onSave={handleSaveEdit} 
        categories={uniqueCategories}
      />
    </AppShell>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
