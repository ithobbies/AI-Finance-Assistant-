import React, { useState } from 'react';
import { useSettings, Theme, Currency, Language } from '../contexts/SettingsContext';
import { Settings, Globe, DollarSign, Moon, Sun, Monitor, LogOut, Shield, Download, User } from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Transaction } from '../types';
import { toast } from 'sonner';

interface SettingsViewProps {
  transactions: Transaction[];
}

export function SettingsView({ transactions }: SettingsViewProps) {
  const { language, setLanguage, currency, setCurrency, theme, setTheme } = useSettings();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.error(language === 'ru' ? 'Нет данных для экспорта' : 'No data to export');
      return;
    }

    const headers = ['Date', 'Description', 'Category', 'Amount', 'Type'];
    const csvContent = [
      headers.join(','),
      ...transactions.map(t => 
        `${t.date},"${t.description.replace(/"/g, '""')}","${t.category}",${t.amount},${t.type}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(language === 'ru' ? 'Данные успешно экспортированы' : 'Data exported successfully');
  };

  const handleDeleteAccount = async () => {
    const confirmMessage = language === 'ru' 
      ? 'Вы уверены, что хотите навсегда удалить свой аккаунт и все данные? Это действие нельзя отменить.' 
      : 'Are you sure you want to permanently delete your account and all data? This action cannot be undone.';
    
    if (!window.confirm(confirmMessage)) return;

    const user = auth.currentUser;
    if (!user) return;

    setIsDeleting(true);
    try {
      // Delete all user transactions
      const q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Delete user account
      await deleteUser(user);
      toast.success(language === 'ru' ? 'Аккаунт успешно удален' : 'Account deleted successfully');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error(language === 'ru' 
          ? 'Для удаления аккаунта требуется недавняя авторизация. Пожалуйста, выйдите и войдите снова.' 
          : 'Deleting an account requires a recent login. Please sign out and sign in again.');
      } else {
        toast.error(language === 'ru' ? 'Ошибка при удалении аккаунта' : 'Failed to delete account');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full layout-section">
      <div>
        <h2 className="text-h1 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          {language === 'ru' ? 'Настройки' : 'Settings'}
        </h2>
        <p className="text-body text-muted-foreground mt-1">
          {language === 'ru' ? 'Управление вашим аккаунтом и предпочтениями' : 'Manage your account and preferences'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Preferences */}
        <div className="card-primary overflow-hidden p-0">
          <div className="p-6 border-b border-border">
            <h3 className="text-h2">
              {language === 'ru' ? 'Предпочтения' : 'Preferences'}
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {/* Language */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-body font-medium text-foreground">
                    {language === 'ru' ? 'Язык' : 'Language'}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {language === 'ru' ? 'Выберите язык интерфейса' : 'Select interface language'}
                  </p>
                </div>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="input-base px-3 py-2 w-full md:w-auto"
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Currency */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 text-success rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-body font-medium text-foreground">
                    {language === 'ru' ? 'Валюта' : 'Currency'}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {language === 'ru' ? 'Основная валюта для отображения' : 'Primary currency for display'}
                  </p>
                </div>
              </div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="input-base px-3 py-2 w-full md:w-auto"
              >
                <option value="₽">₽ (RUB)</option>
                <option value="₴">₴ (UAH)</option>
                <option value="$">$ (USD)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
              </select>
            </div>

            {/* Theme */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  {theme === 'light' ? <Sun className="w-5 h-5" /> : theme === 'dark' ? <Moon className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-body font-medium text-foreground">
                    {language === 'ru' ? 'Тема оформления' : 'Theme'}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {language === 'ru' ? 'Светлая, темная или системная' : 'Light, dark, or system'}
                  </p>
                </div>
              </div>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
                className="input-base px-3 py-2 w-full md:w-auto"
              >
                <option value="system">{language === 'ru' ? 'Системная' : 'System'}</option>
                <option value="light">{language === 'ru' ? 'Светлая' : 'Light'}</option>
                <option value="dark">{language === 'ru' ? 'Темная' : 'Dark'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data & Export */}
        <div className="card-primary overflow-hidden p-0">
          <div className="p-6 border-b border-border">
            <h3 className="text-h2">
              {language === 'ru' ? 'Данные и Экспорт' : 'Data & Export'}
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-body font-medium text-foreground">
                    {language === 'ru' ? 'Экспорт данных' : 'Export Data'}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {language === 'ru' ? 'Скачать все транзакции в CSV' : 'Download all transactions as CSV'}
                  </p>
                </div>
              </div>
              <button
                className="btn-secondary px-4 py-2 text-sm"
                onClick={handleExportCSV}
              >
                {language === 'ru' ? 'Экспорт CSV' : 'Export CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="card-primary overflow-hidden p-0">
          <div className="p-6 border-b border-border">
            <h3 className="text-h2">
              {language === 'ru' ? 'Аккаунт' : 'Account'}
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 text-destructive rounded-xl">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-body font-medium text-foreground">
                    {language === 'ru' ? 'Выйти из аккаунта' : 'Sign Out'}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {language === 'ru' ? 'Завершить текущую сессию' : 'End current session'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl text-sm font-medium transition-colors"
              >
                {language === 'ru' ? 'Выйти' : 'Sign Out'}
              </button>
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 text-destructive rounded-xl">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-destructive">
                      {language === 'ru' ? 'Удалить аккаунт' : 'Delete Account'}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {language === 'ru' ? 'Навсегда удалить все ваши данные' : 'Permanently delete all your data'}
                    </p>
                  </div>
                </div>
                <button
                  className="btn-destructive px-4 py-2 text-sm"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting 
                    ? (language === 'ru' ? 'Удаление...' : 'Deleting...') 
                    : (language === 'ru' ? 'Удалить' : 'Delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
