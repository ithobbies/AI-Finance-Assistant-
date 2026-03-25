import React from 'react';
import { cn } from '../lib/utils';

interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .sticky-action-bar-mobile {
            bottom: calc(4rem + env(safe-area-inset-bottom));
          }
        }
      `}</style>
      <div className={cn(
        "fixed left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border z-40 sticky-action-bar-mobile",
        "md:sticky md:bottom-0 md:bg-transparent md:dark:bg-transparent md:backdrop-blur-none md:border-t-0 md:p-0 md:mt-6",
        className
      )}>
        <div className="max-w-3xl mx-auto flex gap-3">
          {children}
        </div>
      </div>
    </>
  );
}
