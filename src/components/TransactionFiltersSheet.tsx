import React, { useEffect, useState } from 'react';
import { X, Check, Filter } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

interface TransactionFiltersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  filterType: 'all' | 'income' | 'expense';
  setFilterType: (type: 'all' | 'income' | 'expense') => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  sortBy: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
  setSortBy: (sort: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc') => void;
  onReset: () => void;
}

export function TransactionFiltersSheet({
  isOpen,
  onClose,
  categories,
  filterType,
  setFilterType,
  categoryFilter,
  setCategoryFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  sortBy,
  setSortBy,
  onReset
}: TransactionFiltersSheetProps) {
  const { language } = useSettings();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className={cn(
          "relative w-full bg-background rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-12 h-1.5 bg-secondary rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-border shrink-0">
          <h2 className="text-h2 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            {language === 'ru' ? 'Фильтры' : 'Filters'}
          </h2>
          <button 
            type="button"
            aria-label="Close filters"
            onClick={onClose}
            className="btn-icon -mr-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          
          {/* Type Filter */}
          <div className="space-y-3">
            <h3 className="text-label">
              {language === 'ru' ? 'Тип операции' : 'Transaction Type'}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setFilterType('all')}
                className={cn("flex-1 h-11 rounded-xl text-caption font-medium transition-all border active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", filterType === 'all' ? "bg-foreground text-background border-foreground shadow-sm" : "bg-transparent text-muted border-border hover:bg-secondary/50 hover:text-foreground")}
              >
                {language === 'ru' ? 'Все' : 'All'}
              </button>
              <button 
                onClick={() => setFilterType('income')}
                className={cn("flex-1 h-11 rounded-xl text-caption font-medium transition-all border active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", filterType === 'income' ? "bg-success text-success-foreground border-success shadow-sm" : "bg-transparent text-muted border-border hover:bg-secondary/50 hover:text-foreground")}
              >
                {language === 'ru' ? 'Доходы' : 'Income'}
              </button>
              <button 
                onClick={() => setFilterType('expense')}
                className={cn("flex-1 h-11 rounded-xl text-caption font-medium transition-all border active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2", filterType === 'expense' ? "bg-destructive text-destructive-foreground border-destructive shadow-sm" : "bg-transparent text-muted border-border hover:bg-secondary/50 hover:text-foreground")}
              >
                {language === 'ru' ? 'Расходы' : 'Expenses'}
              </button>
            </div>
          </div>

          {/* Sort By */}
          <div className="space-y-3">
            <h3 className="text-label">
              {language === 'ru' ? 'Сортировка' : 'Sort By'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'date_desc', label: language === 'ru' ? 'Сначала новые' : 'Newest First' },
                { id: 'date_asc', label: language === 'ru' ? 'Сначала старые' : 'Oldest First' },
                { id: 'amount_desc', label: language === 'ru' ? 'Сумма (убыв.)' : 'Amount (Desc)' },
                { id: 'amount_asc', label: language === 'ru' ? 'Сумма (возр.)' : 'Amount (Asc)' },
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id as any)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 rounded-xl text-caption font-medium border transition-colors",
                    sortBy === option.id 
                      ? "bg-primary/10 border-primary/30 text-primary" 
                      : "bg-transparent border-border text-muted"
                  )}
                >
                  {option.label}
                  {sortBy === option.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <h3 className="text-label">
              {language === 'ru' ? 'Период' : 'Date Range'}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">{language === 'ru' ? 'С' : 'From'}</label>
                <input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="input-base"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-muted mb-1">{language === 'ru' ? 'По' : 'To'}</label>
                <input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="input-base"
                />
              </div>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-3 pb-8">
            <h3 className="text-label">
              {language === 'ru' ? 'Категория' : 'Category'}
            </h3>
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-base"
            >
              <option value="all">{language === 'ru' ? 'Все категории' : 'All Categories'}</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-border bg-background shrink-0 flex gap-3">
          <button 
            type="button"
            onClick={() => {
              onReset();
              onClose();
            }}
            className="btn-secondary flex-1"
          >
            {language === 'ru' ? 'Сбросить' : 'Reset'}
          </button>
          <button 
            onClick={onClose}
            className="btn-primary flex-[2]"
          >
            {language === 'ru' ? 'Применить' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
