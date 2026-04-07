import React from 'react';
import { PlusCircle, ListOrdered, LayoutDashboard, Settings, Archive, Wallet, LogOut, CalendarDays } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { User } from 'firebase/auth';
import { Tab } from './MobileBottomNav';

interface DesktopSidebarProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  user: User;
  onLogout: () => void;
}

export function DesktopSidebar({ activeTab, onChange, user, onLogout }: DesktopSidebarProps) {
  const { language } = useSettings();

  const tabs = [
    { id: 'dashboard', label: language === 'ru' ? 'Главная' : 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: language === 'ru' ? 'История' : 'History', icon: ListOrdered },
    { id: 'calendar', label: language === 'ru' ? 'Календарь' : 'Calendar', icon: CalendarDays },
    { id: 'input', label: language === 'ru' ? 'Добавить' : 'Add', icon: PlusCircle },
    { id: 'archive', label: language === 'ru' ? 'AI' : 'AI', icon: Archive },
    { id: 'settings', label: language === 'ru' ? 'Настройки' : 'Settings', icon: Settings },
  ] as const;

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border h-screen sticky top-0 bg-background/50 backdrop-blur-xl">
      <div className="p-6 flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
          <Wallet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-h3 font-bold tracking-tight">Finance 2026</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            {language === 'ru' ? 'Умный учет' : 'Smart Tracking'}
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 flex flex-col gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id as Tab)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                isActive 
                  ? 'bg-primary/10 text-primary shadow-sm' 
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-border" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border">
              <span className="text-xs font-medium">{user.displayName?.charAt(0) || 'U'}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {language === 'ru' ? 'Выйти' : 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
