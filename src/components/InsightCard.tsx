import React from 'react';
import { AlertCircle, TrendingDown, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface InsightCardProps {
  insight: {
    type: 'warning' | 'success' | 'neutral' | string;
    text: string;
  };
}

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <div 
      className={cn(
        "p-5 rounded-[1.5rem] border flex items-start gap-4 transition-all hover:shadow-md",
        insight.type === 'warning' 
          ? "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-700 dark:text-fuchsia-400 dark:shadow-[0_0_15px_rgba(217,70,239,0.15)]"
          : insight.type === 'success'
            ? "bg-lime-500/10 border-lime-500/30 text-lime-700 dark:text-lime-400 dark:shadow-[0_0_15px_rgba(163,230,53,0.15)]"
            : "bg-cyan-500/10 border-cyan-500/30 text-cyan-700 dark:text-cyan-400 dark:shadow-[0_0_15px_rgba(34,211,238,0.15)]"
      )}
    >
      <div className="shrink-0 mt-0.5">
        {insight.type === 'warning' ? <AlertCircle className="w-6 h-6" /> : 
         insight.type === 'success' ? <TrendingDown className="w-6 h-6" /> : 
         <Sparkles className="w-6 h-6" />}
      </div>
      <span className="text-body font-medium">{insight.text}</span>
    </div>
  );
}
