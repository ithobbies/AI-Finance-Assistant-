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
        "p-5 md:p-6 rounded-[1.5rem] border flex items-start gap-4 shadow-[0_1px_3px_0_rgb(0_0_0/0.04)] dark:shadow-[0_1px_3px_0_rgb(255_255_255/0.02)] transition-all hover:shadow-md",
        insight.type === 'warning' 
          ? "bg-destructive/10 border-destructive/20 text-destructive"
          : insight.type === 'success'
            ? "bg-success/10 border-success/20 text-success"
            : "bg-primary/10 border-primary/20 text-primary"
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
