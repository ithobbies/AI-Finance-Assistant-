import React from 'react';
import { Wallet } from 'lucide-react';
import { User } from 'firebase/auth';

interface MobileHeaderProps {
  user: User;
}

export function MobileHeader({ user }: MobileHeaderProps) {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-h3 font-semibold tracking-tight">Finance 2026</h1>
      </div>
      <div className="flex items-center gap-3">
        {user.photoURL ? (
          <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-border shadow-sm" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center border border-border shadow-sm">
            <span className="text-xs font-medium">{user.displayName?.charAt(0) || 'U'}</span>
          </div>
        )}
      </div>
    </header>
  );
}
