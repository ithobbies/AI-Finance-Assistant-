import React from 'react';
import { User } from 'firebase/auth';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav, Tab } from './MobileBottomNav';
import { DesktopSidebar } from './DesktopSidebar';
import { MainContent } from './MainContent';

interface AppShellProps {
  user: User;
  onLogout: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: React.ReactNode;
}

export function AppShell({ user, onLogout, activeTab, onTabChange, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 flex flex-col md:flex-row">
      <MobileHeader user={user} />
      <DesktopSidebar activeTab={activeTab} onChange={onTabChange} user={user} onLogout={onLogout} />
      
      <MainContent>
        {children}
      </MainContent>

      <MobileBottomNav activeTab={activeTab} onChange={onTabChange} />
    </div>
  );
}
