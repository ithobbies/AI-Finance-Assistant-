import React, { useMemo, useState } from 'react';
import { DashboardStats, Transaction } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Wallet } from 'lucide-react';
import { cn } from '../lib/utils';
import { AIReportDrawer } from '../components/AIReportDrawer';
import { auth } from '../firebase';
import { BalanceCard } from '../components/BalanceCard';
import { QuickActions } from '../components/QuickActions';
import { InsightCard } from '../components/InsightCard';

type Period = '7d' | '28d' | '90d' | '365d' | 'month';

interface DashboardViewProps {
  transactions: Transaction[];
  onNavigate?: (tab: any) => void;
}

const PIE_COLORS = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#64748b'];

export function DashboardView({ transactions, onNavigate }: DashboardViewProps) {
  const { language, currency } = useSettings();
  const [period, setPeriod] = useState<Period>('28d');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false);

  const { stats, totalBalance, periodTransactions, dateRangeStr, cashflowData, categoryData, insights } = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0);
    let endDate = new Date(now);
    let prevStartDate = new Date(0);
    let prevEndDate = new Date(0);

    if (period === '7d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
      
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 6);
    } else if (period === '28d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 27);
      startDate.setHours(0, 0, 0, 0);
      
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 27);
    } else if (period === '90d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 89);
      startDate.setHours(0, 0, 0, 0);
      
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 89);
    } else if (period === '365d') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 364);
      startDate.setHours(0, 0, 0, 0);
      
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 364);
    } else if (period === 'month') {
      const [year, month] = selectedMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
      
      prevStartDate = new Date(year, month - 2, 1);
      prevEndDate = new Date(year, month - 1, 0);
    }

    const formatLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const startStr = formatLocal(startDate);
    const endStr = formatLocal(endDate);
    const prevStartStr = formatLocal(prevStartDate);
    const prevEndStr = formatLocal(prevEndDate);

    let periodIncome = 0;
    let periodExpenses = 0;
    let prevPeriodIncome = 0;
    let prevPeriodExpenses = 0;
    let totalBalance = 0;
    let transactionsCount = 0;
    const filtered: Transaction[] = [];

    transactions.forEach(t => {
      if (t.type === 'income') totalBalance += t.amount;
      else totalBalance -= t.amount;

      if (t.date >= startStr && t.date <= endStr) {
        filtered.push(t);
        transactionsCount++;
        if (t.type === 'income') periodIncome += t.amount;
        else periodExpenses += t.amount;
      } else if (t.date >= prevStartStr && t.date <= prevEndStr) {
        if (t.type === 'income') prevPeriodIncome += t.amount;
        else prevPeriodExpenses += t.amount;
      }
    });

    // Formatting date range
    const formatDate = (d: Date) => d.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const dateRangeStr = `${formatDate(startDate)} - ${formatDate(endDate)}`;

    // Cashflow Data (Timeline)
    const groupBy = period === '7d' || period === '28d' || period === 'month' ? 'day' : 'month';
    const flowMap: Record<string, { name: string; income: number; expense: number; timestamp: number }> = {};

    filtered.forEach(t => {
      const d = new Date(t.date);
      let key = '';
      let name = '';
      if (groupBy === 'day') {
        key = t.date;
        name = d.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        name = d.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', year: 'numeric' });
      }

      if (!flowMap[key]) {
        flowMap[key] = { name, income: 0, expense: 0, timestamp: d.getTime() };
      }
      if (t.type === 'income') flowMap[key].income += t.amount;
      else flowMap[key].expense += t.amount;
    });

    const cashflowData = Object.values(flowMap).sort((a, b) => a.timestamp - b.timestamp);

    // Category Data (Pie Chart)
    const expensesByCategory: Record<string, number> = {};
    filtered.forEach(t => {
      if (t.type === 'expense') {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      }
    });

    const sortedCategories = Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    let finalCategoryData = sortedCategories;
    if (sortedCategories.length > 5) {
      const top5 = sortedCategories.slice(0, 5);
      const otherSum = sortedCategories.slice(5).reduce((sum, cat) => sum + cat.value, 0);
      finalCategoryData = [...top5, { name: language === 'ru' ? 'Другое' : 'Other', value: otherSum }];
    }

    // Insights
    const insights = [];
    const expenseDiff = prevPeriodExpenses > 0 ? ((periodExpenses - prevPeriodExpenses) / prevPeriodExpenses) * 100 : 0;
    if (expenseDiff > 15) {
      insights.push({
        type: 'warning',
        text: language === 'ru' 
          ? `Ваши расходы выросли на ${expenseDiff.toFixed(0)}% по сравнению с прошлым периодом.`
          : `Your expenses are up ${expenseDiff.toFixed(0)}% compared to the previous period.`
      });
    } else if (expenseDiff < -10) {
      insights.push({
        type: 'success',
        text: language === 'ru' 
          ? `Отлично! Вы потратили на ${Math.abs(expenseDiff).toFixed(0)}% меньше, чем в прошлом периоде.`
          : `Great job! You spent ${Math.abs(expenseDiff).toFixed(0)}% less than the previous period.`
      });
    }

    if (periodExpenses > periodIncome && periodIncome > 0) {
      insights.push({
        type: 'warning',
        text: language === 'ru'
          ? `Внимание: Ваши расходы превышают доходы в этом периоде.`
          : `Warning: Your expenses exceed your income this period.`
      });
    }

    if (sortedCategories.length > 0) {
      const topCategory = sortedCategories[0];
      if (topCategory.value > periodExpenses * 0.4) {
        insights.push({
          type: 'neutral',
          text: language === 'ru'
            ? `Самая большая статья расходов: "${topCategory.name}" (${currency}${topCategory.value.toLocaleString()}). Это составляет ${Math.round((topCategory.value / periodExpenses) * 100)}% от всех расходов.`
            : `Largest expense category: "${topCategory.name}" (${currency}${topCategory.value.toLocaleString()}). This makes up ${Math.round((topCategory.value / periodExpenses) * 100)}% of all expenses.`
        });
      }
    }

    return {
      stats: {
        periodIncome,
        periodExpenses,
        periodNet: periodIncome - periodExpenses,
        transactionsCount
      },
      totalBalance,
      periodTransactions: filtered,
      dateRangeStr,
      cashflowData,
      categoryData: finalCategoryData,
      insights
    };
  }, [transactions, period, language, selectedMonth]);

  const formatMonthLabel = (monthStr: string, lang: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    if (lang === 'ru') {
      const ruMonths = ['Янв', 'Фев', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
      return ruMonths[month - 1];
    }
    const d = new Date(year, month - 1, 1);
    let label = d.toLocaleDateString('en-US', { month: 'short' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const getPeriodLabel = (p: Period) => {
    const labels: Record<string, { ru: string; en: string }> = {
      '7d': { ru: '7 ДН.', en: '7 D.' },
      '28d': { ru: '28 ДН', en: '28 D' },
      '90d': { ru: '90 ДН', en: '90 D' },
      '365d': { ru: '365 ДН', en: '365 D' },
    };
    return labels[p][language];
  };

  const formatCurrency = (amount: number) => {
    const isNegative = amount < 0;
    const absAmount = Math.abs(amount);
    return `${isNegative ? '-' : ''}${currency}${absAmount.toLocaleString()}`;
  };

  return (
    <div className="w-full layout-section pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h2 className="text-h1">
              {language === 'ru' ? `Привет, ${auth.currentUser?.displayName?.split(' ')[0] || 'Пользователь'}!` : `Hello, ${auth.currentUser?.displayName?.split(' ')[0] || 'User'}!`}
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-foreground rounded-full border border-border/50 shadow-sm">
              <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold tracking-wide tabular-nums">{formatCurrency(totalBalance)}</span>
            </div>
          </div>
          <p className="text-body text-muted-foreground">{dateRangeStr}</p>
        </div>
        
        <div className="flex items-center gap-1.5 p-1.5 bg-secondary/50 backdrop-blur-md rounded-2xl border border-border/50 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {(['7d', '28d', '90d', '365d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-2 text-caption font-medium rounded-xl transition-all whitespace-nowrap",
                period === p 
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {getPeriodLabel(p)}
            </button>
          ))}
          <div className="w-px h-4 bg-border/80 mx-1 shrink-0" />
          <div className="relative flex items-center">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPeriod('month');
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button
              className={cn(
                "px-4 py-2 text-caption font-medium rounded-xl transition-all whitespace-nowrap",
                period === 'month' 
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {formatMonthLabel(selectedMonth, language)}
            </button>
          </div>
        </div>
      </div>

      {/* Main Balance & Income/Expense Cards */}
      <BalanceCard stats={stats} />

      {/* Quick Actions */}
      <QuickActions 
        onAdd={() => onNavigate?.('input')} 
        onAskAI={() => setIsReportDrawerOpen(true)} 
      />

      {/* Insights */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-3">
          {insights.map((insight, idx) => (
            <InsightCard key={idx} insight={insight} />
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="layout-cards grid-cols-1 lg:grid-cols-2">
        {/* Cashflow Chart - Always visible */}
        {cashflowData.length > 0 && (
          <div className="surface-primary">
            <h3 className="text-section-title mb-6">
              {language === 'ru' ? 'Денежный поток' : 'Cashflow'}
            </h3>
            <div className="h-64 md:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#a1a1aa', fontSize: 12 }} 
                    tickFormatter={(val) => `${val}`}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    formatter={(value: number, name: string) => [
                      `${currency}${value.toLocaleString()}`, 
                      name === 'income' 
                        ? (language === 'ru' ? 'Доход' : 'Income') 
                        : (language === 'ru' ? 'Расход' : 'Expense')
                    ]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36}
                    formatter={(value) => value === 'income' 
                      ? (language === 'ru' ? 'Доходы' : 'Income') 
                      : (language === 'ru' ? 'Расходы' : 'Expenses')}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Category Chart - Hidden on mobile, visible on lg */}
        {categoryData.length > 0 && (
          <div className="hidden lg:block surface-primary">
            <h3 className="text-section-title mb-6">
              {language === 'ru' ? 'Топ расходов' : 'Top Expenses'}
            </h3>
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    formatter={(value: number) => [`${currency}${value.toLocaleString()}`, language === 'ru' ? 'Сумма' : 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="text-caption truncate" title={entry.name}>
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AIReportDrawer 
        isOpen={isReportDrawerOpen} 
        onClose={() => setIsReportDrawerOpen(false)} 
        transactions={transactions} 
      />
    </div>
  );
}
