import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  return (
    <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto bg-background">
      <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
        {children}
      </div>
    </main>
  );
}
