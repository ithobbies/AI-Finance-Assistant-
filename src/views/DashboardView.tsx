import React, { useMemo, useState, useEffect } from 'react';
import { DashboardStats, Transaction } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { AIReportDrawer } from '../components/AIReportDrawer';
import { auth } from '../firebase';
import { BalanceCard } from '../components/BalanceCard';
import { QuickActions } from '../components/QuickActions';
import { InsightCard } from '../components/InsightCard';
import { motion, useMotionValue, animate } from 'motion/react';

type Period = '7d' | '28d' | '90d' | '365d' | 'month';

interface DashboardViewProps {
  transactions: Transaction[];
  onNavigate?: (tab: any) => void;
}

const PIE_COLORS = ['#f43f5e', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#64748b'];

function normalizeAngle(angle: number) {
  let a = angle % 360;
  if (a < 0) a += 360;
  return a;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  if (endAngle - startAngle >= 359.9) {
    return `M ${x} ${y - radius} A ${radius} ${radius} 0 1 1 ${x} ${y + radius} A ${radius} ${radius} 0 1 1 ${x} ${y - radius}`;
  }
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}

const InteractiveDonut = ({ data, total, currency, language, colors }: any) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const rotation = useMotionValue(0);

  const slices = useMemo(() => {
    let currentAngle = 0;
    return data.map((cat: any, i: number) => {
      const angle = total > 0 ? (cat.value / total) * 360 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle += angle;
      const centerAngle = startAngle + angle / 2;
      return { ...cat, startAngle, endAngle, centerAngle, index: i };
    });
  }, [data, total]);

  useEffect(() => {
    if (slices.length > 0) {
      rotation.set(-slices[0].centerAngle);
      setActiveIndex(0);
    }
  }, [slices, rotation]);

  const handlePan = (event: any, info: any) => {
    const newRot = rotation.get() + info.delta.x * 0.5;
    rotation.set(newRot);

    const targetCenter = normalizeAngle(-newRot);
    let closestIndex = 0;
    let minDiff = Infinity;
    slices.forEach((slice: any, i: number) => {
      const diff = Math.min(
        Math.abs(slice.centerAngle - targetCenter),
        360 - Math.abs(slice.centerAngle - targetCenter)
      );
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    });
    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  };

  const handlePanEnd = (event: any, info: any) => {
    const currentRot = rotation.get();
    const velocity = info.velocity.x;
    const projectedRot = currentRot + velocity * 0.05;

    const targetCenter = normalizeAngle(-projectedRot);
    let closestIndex = 0;
    let minDiff = Infinity;

    slices.forEach((slice: any, i: number) => {
      const diff = Math.min(
        Math.abs(slice.centerAngle - targetCenter),
        360 - Math.abs(slice.centerAngle - targetCenter)
      );
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    });

    setActiveIndex(closestIndex);

    const sliceCenter = slices[closestIndex].centerAngle;
    let diff = (sliceCenter - (-currentRot)) % 360;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const snapRot = currentRot - diff;

    animate(rotation, snapRot, {
      type: "spring",
      stiffness: 200,
      damping: 25,
      mass: 1
    });
  };

  if (!data || data.length === 0) return null;

  const activeSlice = slices[activeIndex] || slices[0];

  return (
    <div className="relative w-full flex flex-col items-center justify-center mb-8 mt-4">
      {/* Triangle Indicator */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
        <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor" className="text-muted-foreground opacity-50">
          <path d="M7 12L0 0H14L7 12Z" />
        </svg>
      </div>

      {/* Donut Chart */}
      <motion.div
        className="relative w-64 h-64 touch-none cursor-grab active:cursor-grabbing"
        onPan={handlePan}
        onPanEnd={handlePanEnd}
      >
        <motion.svg 
          viewBox="0 0 200 200" 
          className="w-full h-full overflow-visible"
          style={{ rotate: rotation }}
        >
          <g>
            {slices.map((slice: any, i: number) => {
              const isActive = i === activeIndex;
              const gap = slices.length > 1 ? 10 : 0;
              const angle = slice.endAngle - slice.startAngle;
              const actualGap = Math.min(gap, angle * 0.5);
              const pathStart = slice.startAngle + actualGap / 2;
              const pathEnd = slice.endAngle - actualGap / 2;
              const color = colors[i % colors.length];
              const d = describeArc(100, 100, 80, pathStart, pathEnd);

              return (
                <g key={i}>
                  {/* Glow */}
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeLinecap="round"
                    initial={false}
                    animate={{
                      strokeWidth: isActive ? 19 : 6,
                      opacity: isActive ? 0.3 : 0,
                    }}
                    className="blur-md"
                    transition={{ duration: 0.3 }}
                  />
                  {/* Main Stroke */}
                  <motion.path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeLinecap="round"
                    initial={false}
                    animate={{
                      strokeWidth: isActive ? 11 : 5,
                      opacity: 1,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </g>
              );
            })}
          </g>
        </motion.svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
          <motion.span 
            key={`name-${activeIndex}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-semibold mb-1 w-full truncate px-4 text-foreground"
          >
            {activeSlice?.name}
          </motion.span>
          <motion.span 
            key={`val-${activeIndex}`}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-muted-foreground font-medium"
          >
            {currency}{activeSlice?.value.toLocaleString()} • {Math.round(((activeSlice?.value || 0) / total) * 100)}%
          </motion.span>
        </div>
      </motion.div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-6 flex-wrap max-w-[200px]">
        {slices.map((_: any, i: number) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              i === activeIndex 
                ? "bg-foreground scale-125" 
                : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
};

export function DashboardView({ transactions, onNavigate }: DashboardViewProps) {
  const { language, currency } = useSettings();
  const [period, setPeriod] = useState<Period>('28d');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false);
  const [showSecondaryAnalytics, setShowSecondaryAnalytics] = useState(false);

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
      const ruMonths = ['Янв.', 'Фев.', 'Мар.', 'Апр.', 'Май', 'Июн.', 'Июл.', 'Авг.', 'Сен.', 'Окт.', 'Ноя.', 'Дек.'];
      return ruMonths[month - 1];
    }
    const d = new Date(year, month - 1, 1);
    let label = d.toLocaleDateString('en-US', { month: 'short' });
    return label.charAt(0).toUpperCase() + label.slice(1) + '.';
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
    <div className="w-full space-y-6 md:space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
            {language === 'ru' ? `Привет, ${auth.currentUser?.displayName?.split(' ')[0] || 'Пользователь'}!` : `Hello, ${auth.currentUser?.displayName?.split(' ')[0] || 'User'}!`}
          </h2>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1">
          {(['7d', '28d', '90d', '365d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "flex-none px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap",
                period === p 
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm" 
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
              )}
            >
              {getPeriodLabel(p)}
            </button>
          ))}
          <div className="w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-1 shrink-0" />
          <div className="relative flex items-center flex-none">
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
                "px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap",
                period === 'month' 
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm" 
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-800"
              )}
            >
              {formatMonthLabel(selectedMonth, language)}
            </button>
          </div>
        </div>
      </div>

      {/* Main Balance & Income/Expense Cards */}
      <BalanceCard stats={stats} totalBalance={totalBalance} dateRangeStr={dateRangeStr} />

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
      <div className="flex flex-col gap-6 md:gap-8">
        {/* Cashflow Chart - Always visible */}
        {cashflowData.length > 0 && (
          <div className="bg-card border border-border rounded-[1.5rem] p-6 md:p-8 shadow-sm">
            <h3 className="text-h3 mb-6">
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

        {/* Secondary Analytics - Collapsible */}
        {categoryData.length > 0 && (
          <div className="bg-card border border-border rounded-[2rem] shadow-sm overflow-hidden">
            <button 
              onClick={() => setShowSecondaryAnalytics(!showSecondaryAnalytics)}
              className="w-full flex items-center justify-between p-6 md:p-8 text-left hover:bg-muted/50 transition-colors"
            >
              <h3 className="text-lg font-medium text-foreground">
                {language === 'ru' ? 'Аналитика по категориям' : 'Category Analytics'}
              </h3>
              {showSecondaryAnalytics ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            
            {showSecondaryAnalytics && (
              <div className="px-6 pb-6 md:px-8 md:pb-8 pt-2">
                <div className="flex items-center justify-between mb-6">
                  <div className="relative flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                    <span>{selectedMonth.split('-')[0]} {formatMonthLabel(selectedMonth, language)}</span>
                    <ChevronDown className="w-4 h-4" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setPeriod('month');
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ru' ? `${categoryData.length} категорий` : `${categoryData.length} categories`}
                  </div>
                </div>

                <InteractiveDonut 
                  data={categoryData} 
                  total={stats.periodExpenses} 
                  currency={currency} 
                  language={language} 
                  colors={PIE_COLORS} 
                />

                {/* Categories List */}
                <div className="flex flex-col gap-3 mb-8">
                  {categoryData.slice(0, 3).map((cat, idx) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length], color: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="text-foreground truncate max-w-[120px] sm:max-w-[200px]">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-muted-foreground">{Math.round((cat.value / stats.periodExpenses) * 100)}%</span>
                        <span className="font-medium text-foreground w-20 text-right">{currency}{cat.value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-3xl p-5 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === 'ru' ? 'Всего расходов' : 'Total Expenses'}
                    </p>
                    <p className="text-xl font-semibold text-foreground truncate">
                      {currency}{stats.periodExpenses.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-3xl p-5 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === 'ru' ? 'Всего доходов' : 'Total Income'}
                    </p>
                    <p className="text-xl font-semibold text-foreground truncate">
                      {currency}{stats.periodIncome.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
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
