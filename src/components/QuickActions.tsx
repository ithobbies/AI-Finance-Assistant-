import React from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface QuickActionsProps {
  onAdd: () => void;
  onAskAI: () => void;
}

export function QuickActions({ onAdd, onAskAI }: QuickActionsProps) {
  const { language } = useSettings();

  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6">
      <button
        onClick={onAdd}
        className="group relative flex flex-col items-center justify-center gap-3 p-6 bg-card hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-foreground rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative p-3 bg-primary/10 text-primary rounded-2xl group-hover:scale-110 transition-transform duration-300">
          <Plus className="w-6 h-6" />
        </div>
        <span className="relative text-body font-semibold tracking-wide">
          {language === 'ru' ? 'Добавить' : 'Add New'}
        </span>
      </button>

      <button
        onClick={onAskAI}
        className="group relative flex flex-col items-center justify-center gap-3 p-6 bg-card hover:bg-zinc-50 dark:hover:bg-zinc-900/50 text-foreground rounded-[1.5rem] border border-border shadow-sm hover:shadow-md transition-all active:scale-[0.98] overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform duration-300">
          <Sparkles className="w-6 h-6" />
        </div>
        <span className="relative text-body font-semibold tracking-wide">
          {language === 'ru' ? 'Спросить AI' : 'Ask AI'}
        </span>
      </button>
    </div>
  );
}
