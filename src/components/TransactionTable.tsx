import { Download, Trash2, Pencil } from 'lucide-react';
import { Transaction } from '../types';
import { cn, formatDate, getCategoryColor } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExportCSV: () => void;
}

export function TransactionTable({ transactions, onEdit, onDelete, onExportCSV }: TransactionTableProps) {
  const { language, currency } = useSettings();

  const formatCurrency = (amount: number) => {
    return `${currency}${amount.toLocaleString()}`;
  };

  return (
    <div className="card-primary overflow-hidden">
      <div className="p-4 md:p-6 border-b border-border flex items-center justify-between">
        <h2 className="text-h2">
          {language === 'ru' ? 'История транзакций' : 'Transaction History'}
        </h2>
        <button
          onClick={onExportCSV}
          className="btn-secondary px-3 py-1.5 md:px-4 md:py-2 text-caption font-medium"
        >
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">{language === 'ru' ? 'Экспорт CSV' : 'Export CSV'}</span>
          <span className="md:hidden">CSV</span>
        </button>
      </div>
      
      {/* Desktop View */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border text-label">
              <th className="px-6 py-4 font-medium">{language === 'ru' ? 'Дата' : 'Date'}</th>
              <th className="px-6 py-4 font-medium">{language === 'ru' ? 'Категория' : 'Category'}</th>
              <th className="px-6 py-4 font-medium">{language === 'ru' ? 'Описание' : 'Description'}</th>
              <th className="px-6 py-4 font-medium text-right">{language === 'ru' ? 'Сумма' : 'Amount'}</th>
              <th className="px-6 py-4 font-medium text-right">{language === 'ru' ? 'Действия' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-caption">
                  {language === 'ru' ? 'Пока нет транзакций.' : 'No transactions yet.'}
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4 text-body whitespace-nowrap">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      getCategoryColor(t.category)
                    )}>
                      {t.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-body">
                    {t.description}
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-right whitespace-nowrap",
                    t.type === 'income' ? 'amount-income' : 'amount-expense'
                  )}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(t.id)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title={language === 'ru' ? 'Редактировать' : 'Edit'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(t.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title={language === 'ru' ? 'Удалить' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
