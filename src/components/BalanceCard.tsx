import React from 'react';
import { ArrowUpRight, ArrowDownRight, Briefcase } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { DashboardStats } from '../types';

interface BalanceCardProps {
  stats: DashboardStats;
}

export function BalanceCard({ stats }: BalanceCardProps) {
  const { language, currency } = useSettings();
  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    return `${isNegative ? '-' : ''}${currency}${absAmount.toLocaleString()}`;
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Main Balance */}
      <div className="relative overflow-hidden rounded-[2rem] bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-8 shadow-2xl shadow-zinc-900/20 dark:shadow-zinc-100/10 border border-zinc-800 dark:border-zinc-200">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/30 dark:bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-label text-zinc-400 dark:text-zinc-500">
              {language === 'ru' ? 'Чистый поток за период' : 'Period Net Cashflow'}
            </h3>
            <div className="p-2.5 bg-white/10 dark:bg-black/5 rounded-2xl backdrop-blur-md">
              <Briefcase className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
            </div>
          </div>
          <p className="text-display text-white dark:text-zinc-900 mb-2">
            {stats.periodNet > 0 ? '+' : ''}{formatCurrency(stats.periodNet)}
          </p>
        </div>
      </div>

      {/* Income / Expense Cards */}
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        <div className="surface-primary hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-success/10 rounded-xl">
              <ArrowUpRight className="w-5 h-5 text-success" />
            </div>
            <h3 className="text-label">
              {language === 'ru' ? 'Доходы' : 'Income'}
            </h3>
          </div>
          <p className="amount-hero amount-income">
            {formatCurrency(stats.periodIncome)}
          </p>
        </div>

        <div className="surface-primary hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-destructive/10 rounded-xl">
              <ArrowDownRight className="w-5 h-5 text-destructive" />
            </div>
            <h3 className="text-label">
              {language === 'ru' ? 'Расходы' : 'Expenses'}
            </h3>
          </div>
          <p className="amount-hero amount-expense">
            {formatCurrency(stats.periodExpenses)}
          </p>
        </div>
      </div>
    </div>
  );
}
