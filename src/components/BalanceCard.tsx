import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { DashboardStats } from '../types';
import { cn } from '../lib/utils';

interface BalanceCardProps {
  stats: DashboardStats;
  totalBalance: number;
  dateRangeStr: string;
}

export function BalanceCard({ stats, totalBalance, dateRangeStr }: BalanceCardProps) {
  const { language, currency } = useSettings();
  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    return `${isNegative ? '-' : ''}${currency}${absAmount.toLocaleString()}`;
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-6 md:p-8 shadow-xl border border-zinc-800 dark:border-zinc-200">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/30 dark:bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500 mb-1">
              {language === 'ru' ? 'Общий баланс' : 'Total Balance'}
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              {formatCurrency(totalBalance)}
            </h1>
          </div>
          
          <div className="flex items-end justify-between pt-4 border-t border-white/10 dark:border-black/10">
            <div>
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                {language === 'ru' ? 'Чистый поток' : 'Net Cashflow'} • {dateRangeStr}
              </p>
              <p className={cn("text-lg font-semibold", stats.periodNet >= 0 ? "text-emerald-400 dark:text-emerald-600" : "text-rose-400 dark:text-rose-600")}>
                {stats.periodNet > 0 ? '+' : ''}{formatCurrency(stats.periodNet)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Income / Expense Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-card border border-border rounded-[1.5rem] p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-success/10 rounded-lg">
              <ArrowUpRight className="w-4 h-4 text-success" />
            </div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {language === 'ru' ? 'Доходы' : 'Income'}
            </h3>
          </div>
          <p className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
            {formatCurrency(stats.periodIncome)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-[1.5rem] p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-destructive/10 rounded-lg">
              <ArrowDownRight className="w-4 h-4 text-destructive" />
            </div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {language === 'ru' ? 'Расходы' : 'Expenses'}
            </h3>
          </div>
          <p className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">
            {formatCurrency(stats.periodExpenses)}
          </p>
        </div>
      </div>
    </div>
  );
}
