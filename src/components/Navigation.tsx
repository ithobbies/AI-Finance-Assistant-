import React from 'react';
import { PlusCircle, ListOrdered, LayoutDashboard, Settings, Archive } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export type Tab = 'input' | 'history' | 'dashboard' | 'archive' | 'settings';

interface NavigationProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
}

export function Navigation({ activeTab, onChange }: NavigationProps) {
  const { language } = useSettings();

  const tabs = [
    { id: 'dashboard', label: language === 'ru' ? 'Главная' : 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: language === 'ru' ? 'История' : 'History', icon: ListOrdered },
    { id: 'input', label: language === 'ru' ? 'Добавить' : 'Add', icon: PlusCircle },
    { id: 'archive', label: language === 'ru' ? 'AI' : 'AI', icon: Archive },
    { id: 'settings', label: language === 'ru' ? 'Настройки' : 'Settings', icon: Settings },
  ] as const;

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <nav className="hidden md:flex flex-col gap-2 w-64 shrink-0 pr-8 border-r border-border h-[calc(100vh-8rem)] sticky top-32">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id as Tab)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left font-medium ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <div className="flex items-end justify-between px-2 pt-2 pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            if (tab.id === 'input') {
              return (
                <div key={tab.id} className="flex flex-col items-center justify-end w-1/5 pb-1">
                  <button
                    onClick={() => onChange(tab.id as Tab)}
                    aria-label={tab.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center justify-center w-14 h-14 -translate-y-4 rounded-full shadow-lg transition-transform active:scale-95 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-primary/25' 
                        : 'bg-primary/90 text-primary-foreground hover:bg-primary'
                    }`}
                  >
                    <Icon className="w-7 h-7" />
                  </button>
              <span className={`text-[10px] font-medium -mt-1 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {tab.label}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id as Tab)}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center w-1/5 gap-1 p-2 transition-colors rounded-xl ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-1 rounded-full transition-colors ${isActive ? 'bg-primary/10' : ''}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium truncate w-full text-center">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
