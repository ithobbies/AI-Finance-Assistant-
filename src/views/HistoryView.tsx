import React, { useState, useMemo } from 'react';
import { TransactionTable } from '../components/TransactionTable';
import { MobileTransactionCard } from '../components/MobileTransactionCard';
import { TransactionFiltersSheet } from '../components/TransactionFiltersSheet';
import { Transaction } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Search, Filter, X, TrendingUp, TrendingDown, Wallet, Download } from 'lucide-react';
import { cn } from '../lib/utils';

interface HistoryViewProps {
  transactions: Transaction[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExportCSV: () => void;
}

export function HistoryView({ transactions, onEdit, onDelete, onExportCSV }: HistoryViewProps) {
  const { language, currency } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const filteredAndSorted = useMemo(() => {
    let result = [...transactions];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.description.toLowerCase().includes(lowerSearch) || 
        t.category.toLowerCase().includes(lowerSearch)
      );
    }

    if (filterType !== 'all') {
      result = result.filter(t => t.type === filterType);
    }

    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category === categoryFilter);
    }

    if (dateFrom) {
      result = result.filter(t => t.date >= dateFrom);
    }

    if (dateTo) {
      result = result.filter(t => t.date <= dateTo);
    }

    result.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      return 0;
    });

    return result;
  }, [transactions, searchTerm, filterType, categoryFilter, dateFrom, dateTo, sortBy]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredAndSorted.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, net: income - expense, count: filteredAndSorted.length };
  }, [filteredAndSorted]);

  const [displayLimit, setDisplayLimit] = useState(20);

  // Reset display limit when filters change
  React.useEffect(() => {
    setDisplayLimit(20);
  }, [searchTerm, filterType, categoryFilter, dateFrom, dateTo, sortBy]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setSortBy('date_desc');
    setDateFrom('');
    setDateTo('');
    setCategoryFilter('all');
    setDisplayLimit(20);
  };

  const hasActiveFilters = searchTerm || filterType !== 'all' || categoryFilter !== 'all' || dateFrom || dateTo;

  const displayedTransactions = filteredAndSorted.slice(0, displayLimit);
  const hasMore = displayLimit < filteredAndSorted.length;

  return (
    <div className="w-full pb-20 md:pb-0">
      <div className="flex flex-col layout-cards mb-6 md:mb-8">
        
        {/* Header & Mobile Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-h2">
            {language === 'ru' ? 'История операций' : 'Transaction History'}
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onExportCSV}
              className="btn-outline md:hidden p-2 shadow-sm border-transparent bg-card"
              aria-label={language === 'ru' ? 'Экспорт CSV' : 'Export CSV'}
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsFiltersSheetOpen(true)}
              className="btn-outline md:hidden relative p-2 shadow-sm border-transparent bg-card"
              aria-label={language === 'ru' ? 'Фильтры' : 'Filters'}
            >
              <Filter className="w-5 h-5" />
              {hasActiveFilters && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-background" />
              )}
            </button>
            
            {hasActiveFilters && (
              <button 
                onClick={resetFilters}
                className="hidden md:flex items-center gap-2 text-caption text-muted hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
                {language === 'ru' ? 'Сбросить фильтры' : 'Reset filters'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input 
            type="text" 
            placeholder={language === 'ru' ? 'Поиск транзакций...' : 'Search transactions...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-base pl-9"
          />
        </div>

        {/* Sticky Summary Bar for Mobile */}
        <div className="sticky top-0 z-10 md:static -mx-4 px-4 py-3 md:p-0 md:mx-0 bg-background/90 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-b border-border md:border-none">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
            <div className="hidden md:block p-4 card-primary">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Filter className="w-4 h-4" />
                <span className="text-label">{language === 'ru' ? 'Записей' : 'Count'}</span>
              </div>
              <p className="text-h2">{summary.count}</p>
            </div>
            <div className="p-2 md:p-4 card-primary flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-1 md:gap-2 text-success mb-0.5 md:mb-1">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-label text-success">{language === 'ru' ? 'Доходы' : 'Income'}</span>
              </div>
              <p className="amount-hero amount-income truncate w-full">{currency}{summary.income.toLocaleString()}</p>
            </div>
            <div className="p-2 md:p-4 card-primary flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-1 md:gap-2 text-destructive mb-0.5 md:mb-1">
                <TrendingDown className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-label text-destructive">{language === 'ru' ? 'Расходы' : 'Expense'}</span>
              </div>
              <p className="amount-hero amount-expense truncate w-full">{currency}{summary.expense.toLocaleString()}</p>
            </div>
            <div className="p-2 md:p-4 card-primary flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-1 md:gap-2 text-primary mb-0.5 md:mb-1">
                <Wallet className="w-3 h-3 md:w-4 md:h-4" />
                <span className="text-label text-primary">{language === 'ru' ? 'Итог' : 'Net'}</span>
              </div>
              <p className="amount-hero amount-neutral text-primary truncate w-full">{summary.net > 0 ? '+' : ''}{currency}{summary.net.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Desktop Filters */}
        <div className="hidden md:block p-4 card-primary space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => setFilterType('all')}
              className={cn("px-3 py-1.5 rounded-lg text-caption font-medium transition-colors", filterType === 'all' ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-secondary/80")}
            >
              {language === 'ru' ? 'Все' : 'All'}
            </button>
            <button 
              onClick={() => setFilterType('income')}
              className={cn("px-3 py-1.5 rounded-lg text-caption font-medium transition-colors", filterType === 'income' ? "bg-success text-success-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80")}
            >
              {language === 'ru' ? 'Доходы' : 'Income'}
            </button>
            <button 
              onClick={() => setFilterType('expense')}
              className={cn("px-3 py-1.5 rounded-lg text-caption font-medium transition-colors", filterType === 'expense' ? "bg-destructive text-destructive-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/80")}
            >
              {language === 'ru' ? 'Расходы' : 'Expenses'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input 
                type="text" 
                placeholder={language === 'ru' ? 'Поиск...' : 'Search...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-base pl-9"
              />
            </div>

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
            
            <div className="flex gap-2">
              <input 
                type="date" 
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-base"
                title={language === 'ru' ? 'С даты' : 'From date'}
              />
              <input 
                type="date" 
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-base"
                title={language === 'ru' ? 'По дату' : 'To date'}
              />
            </div>

            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="input-base"
            >
              <option value="date_desc">{language === 'ru' ? 'Сначала новые' : 'Newest First'}</option>
              <option value="date_asc">{language === 'ru' ? 'Сначала старые' : 'Oldest First'}</option>
              <option value="amount_desc">{language === 'ru' ? 'Сумма (убыв.)' : 'Amount (Desc)'}</option>
              <option value="amount_asc">{language === 'ru' ? 'Сумма (возр.)' : 'Amount (Asc)'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Transaction List */}
      <div className="md:hidden space-y-3">
        {filteredAndSorted.length === 0 ? (
          <div className="p-8 text-center text-muted card-primary">
            {language === 'ru' ? 'Пока нет транзакций.' : 'No transactions yet.'}
          </div>
        ) : (
          <>
            {displayedTransactions.map(t => (
              <MobileTransactionCard 
                key={t.id} 
                transaction={t} 
                onClick={onEdit} 
              />
            ))}
            {hasMore && (
              <button
                onClick={() => setDisplayLimit(prev => prev + 20)}
                className="btn-secondary w-full py-3.5 mt-4"
              >
                {language === 'ru' ? 'Загрузить ещё' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Desktop Transaction Table */}
      <div className="hidden md:block">
        <TransactionTable 
          transactions={displayedTransactions} 
          onEdit={onEdit} 
          onDelete={onDelete} 
          onExportCSV={onExportCSV} 
        />
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setDisplayLimit(prev => prev + 20)}
              className="btn-secondary px-6 py-2.5"
            >
              {language === 'ru' ? 'Загрузить ещё' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Filters Sheet */}
      <TransactionFiltersSheet
        isOpen={isFiltersSheetOpen}
        onClose={() => setIsFiltersSheetOpen(false)}
        categories={categories}
        filterType={filterType}
        setFilterType={setFilterType}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onReset={resetFilters}
      />
    </div>
  );
}
