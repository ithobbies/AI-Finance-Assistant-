import React from 'react';
import { Transaction } from '../types';
import { cn, formatDate, getCategoryColor } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';
import { Tag, User, Building2 } from 'lucide-react';

interface MobileTransactionCardProps {
  transaction: Transaction;
  onClick: (id: string) => void;
}

export function MobileTransactionCard({ transaction: t, onClick }: MobileTransactionCardProps) {
  const { language, currency } = useSettings();
  const isIncome = t.type === 'income';

  const formatCurrency = (amount: number) => {
    return `${currency}${amount.toLocaleString()}`;
  };

  return (
    <button
      onClick={() => onClick(t.id)}
      className="w-full text-left card-primary p-4 active:scale-[0.98] transition-all touch-manipulation focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
      aria-label={`${t.description}, ${isIncome ? '+' : '-'}${formatCurrency(t.amount)}, ${t.category}, ${formatDate(t.date)}`}
    >
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-h3 truncate">
            {t.description}
          </h3>
          <div className="flex items-center gap-2 mt-1.5 text-caption">
            <span>{formatDate(t.date)}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md font-medium truncate max-w-[120px]",
              getCategoryColor(t.category)
            )}>
              {t.category}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className={cn(
            "text-h3 whitespace-nowrap",
            isIncome ? 'amount-income' : 'amount-expense'
          )}>
            {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
          </span>
        </div>
      </div>

      {/* Optional Metadata Row */}
      {(t.accountName || t.counterparty || (t.tags && t.tags.length > 0)) && (
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border text-caption">
          {t.accountName && (
            <div className="flex items-center gap-1 bg-secondary border border-border/50 px-2 py-1 rounded-md">
              <Building2 className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{t.accountName}</span>
            </div>
          )}
          {t.counterparty && (
            <div className="flex items-center gap-1 bg-secondary border border-border/50 px-2 py-1 rounded-md">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{t.counterparty}</span>
            </div>
          )}
          {t.tags && t.tags.length > 0 && (
            <div className="flex items-center gap-1 bg-secondary border border-border/50 px-2 py-1 rounded-md">
              <Tag className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{t.tags.join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
}
