import React, { useState, useMemo } from 'react';
import { Transaction, RegularPayment } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, AlertCircle, Calendar as CalendarIcon, CreditCard, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, isBefore, startOfDay } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { RegularPaymentModal } from '../components/RegularPaymentModal';
import { auth, db } from '../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface CalendarViewProps {
  transactions: Transaction[];
  regularPayments: RegularPayment[];
}

type FilterType = 'all' | 'subscription' | 'banking';

interface PaymentOccurrence {
  payment: RegularPayment;
  dueDate: Date;
  isPaid: boolean;
  isOverdue: boolean;
  transaction?: Transaction;
}

export function CalendarView({ transactions, regularPayments }: CalendarViewProps) {
  const { language, currency } = useSettings();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [filter, setFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RegularPayment | null>(null);

  const locale = language === 'ru' ? ru : enUS;

  // Generate occurrences for the current month
  const occurrences = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const today = startOfDay(new Date());
    
    const results: PaymentOccurrence[] = [];

    regularPayments.forEach(payment => {
      if (payment.status !== 'active') return;
      if (filter !== 'all' && payment.kind !== filter) return;

      const startDate = parseISO(payment.startDate);
      if (isBefore(end, startOfDay(startDate))) return; // Hasn't started yet

      // Simple logic: if monthly, it occurs on the same day of the month
      // For a real app, we'd use a recurrence library like rrule, but let's implement basic monthly/yearly
      let occurrenceDate: Date | null = null;

      if (payment.scheduleType === 'monthly') {
        const day = startDate.getDate();
        const monthDays = end.getDate();
        const actualDay = Math.min(day, monthDays);
        occurrenceDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), actualDay);
      } else if (payment.scheduleType === 'yearly') {
        if (startDate.getMonth() === currentMonth.getMonth()) {
          occurrenceDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), startDate.getDate());
        }
      } else if (payment.scheduleType === 'one-time') {
        if (isSameMonth(startDate, currentMonth)) {
          occurrenceDate = startDate;
        }
      }

      if (occurrenceDate && !isBefore(occurrenceDate, startOfDay(startDate))) {
        if (payment.endDate && isBefore(parseISO(payment.endDate), occurrenceDate)) {
          return; // Past end date
        }

        const dateStr = format(occurrenceDate, 'yyyy-MM-dd');
        
        // Check if paid
        const matchingTx = transactions.find(t => 
          t.regularPaymentId === payment.id && 
          t.regularPaymentDueDate === dateStr
        );

        results.push({
          payment,
          dueDate: occurrenceDate,
          isPaid: !!matchingTx,
          isOverdue: !matchingTx && isBefore(occurrenceDate, today),
          transaction: matchingTx
        });
      }
    });

    return results.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [regularPayments, currentMonth, filter, transactions]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Calculate padding for first day of month (0 = Sunday, 1 = Monday)
  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDay === 0 ? 6 : startDay - 1 }).map((_, i) => i);

  const totalAmount = occurrences.reduce((sum, occ) => sum + occ.payment.amount, 0);
  const paidAmount = occurrences.filter(o => o.isPaid).reduce((sum, occ) => sum + occ.payment.amount, 0);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleMarkAsPaid = async (occurrence: PaymentOccurrence) => {
    if (!auth.currentUser) return;
    try {
      const dateStr = format(occurrence.dueDate, 'yyyy-MM-dd');
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser.uid,
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: occurrence.payment.amount,
        description: occurrence.payment.title,
        category: occurrence.payment.category,
        type: 'expense',
        kind: occurrence.payment.kind,
        regularPaymentId: occurrence.payment.id,
        regularPaymentDueDate: dateStr,
        createdAt: serverTimestamp()
      });
      toast.success(language === 'ru' ? 'Отмечено как оплаченное' : 'Marked as paid');
    } catch (error) {
      toast.error(language === 'ru' ? 'Ошибка' : 'Error');
    }
  };

  const getIcon = (payment: RegularPayment) => {
    if (payment.kind === 'subscription') return <RefreshCw className="w-4 h-4" />;
    return <CreditCard className="w-4 h-4" />;
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pb-32">
      {/* Header & Total */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2">
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {language === 'ru' ? 'К оплате в этом месяце' : 'Due this month'}
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          {currency}{totalAmount.toLocaleString()}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {language === 'ru' ? 'Оплачено:' : 'Paid:'} <span className="text-foreground font-medium">{currency}{paidAmount.toLocaleString()}</span>
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold capitalize min-w-[120px] text-center">
            {format(currentMonth, 'LLLL yyyy', { locale })}
          </h2>
          <button onClick={handleNextMonth} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex bg-secondary p-1 rounded-xl">
          {(['all', 'subscription', 'banking'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === 'all' ? (language === 'ru' ? 'Все' : 'All') :
               f === 'subscription' ? (language === 'ru' ? 'Подписки' : 'Subs') :
               (language === 'ru' ? 'Банк' : 'Bank')}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card border border-border rounded-[2rem] p-4 md:p-6 shadow-sm">
        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, i) => (
            <div key={i} className="text-center text-[10px] md:text-xs font-medium text-muted-foreground uppercase">
              {language === 'en' ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'][i] : day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {paddingDays.map(i => (
            <div key={`pad-${i}`} className="aspect-square rounded-2xl opacity-0" />
          ))}
          {daysInMonth.map(day => {
            const dayOccurrences = occurrences.filter(o => isSameDay(o.dueDate, day));
            const isCurrentDay = isToday(day);
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "aspect-square rounded-xl md:rounded-2xl p-1 md:p-2 flex flex-col items-center justify-start gap-1 transition-colors relative",
                  isCurrentDay ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/50 border border-transparent",
                  dayOccurrences.length > 0 && !isCurrentDay && "bg-secondary/30"
                )}
              >
                <span className={cn(
                  "text-xs md:text-sm font-medium",
                  isCurrentDay ? "text-primary" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                <div className="flex flex-wrap justify-center gap-0.5 md:gap-1 mt-auto">
                  {dayOccurrences.map((occ, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                        occ.isPaid ? "bg-success" : occ.isOverdue ? "bg-destructive" : "bg-blue-500"
                      )}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> {language === 'ru' ? 'Ожидается' : 'Upcoming'}</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success" /> {language === 'ru' ? 'Оплачено' : 'Paid'}</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-destructive" /> {language === 'ru' ? 'Просрочено' : 'Overdue'}</div>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">
            {language === 'ru' ? 'Платежи' : 'Payments'}
          </h3>
          <button 
            onClick={() => { setEditingPayment(null); setIsModalOpen(true); }}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {language === 'ru' ? 'Добавить' : 'Add New'}
          </button>
        </div>

        {occurrences.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-[2rem]">
            <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {language === 'ru' ? 'В этом месяце платежей нет' : 'No payments this month'}
            </p>
          </div>
        ) : (
          occurrences.map((occ, i) => (
            <div 
              key={i}
              onClick={() => { setEditingPayment(occ.payment); setIsModalOpen(true); }}
              className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-white",
                  occ.payment.color || "bg-zinc-800"
                )}>
                  {getIcon(occ.payment)}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {occ.payment.title}
                  </h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{format(occ.dueDate, 'd MMM', { locale })}</span>
                    <span>•</span>
                    <span className="capitalize">{occ.payment.scheduleType}</span>
                    {occ.payment.kind === 'banking' && occ.payment.totalInstallments && (
                      <>
                        <span>•</span>
                        <span>{language === 'ru' ? 'Рассрочка' : 'Installment'}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold">{currency}{occ.payment.amount.toLocaleString()}</p>
                  <p className={cn(
                    "text-[10px] font-medium uppercase tracking-wider",
                    occ.isPaid ? "text-success" : occ.isOverdue ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {occ.isPaid ? (language === 'ru' ? 'Оплачено' : 'Paid') : 
                     occ.isOverdue ? (language === 'ru' ? 'Просрочено' : 'Overdue') : 
                     (language === 'ru' ? 'Ожидается' : 'Upcoming')}
                  </p>
                </div>
                
                {!occ.isPaid && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(occ); }}
                    className="p-2 rounded-full bg-secondary text-muted-foreground hover:bg-success/10 hover:text-success transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <RegularPaymentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        payment={editingPayment}
      />
    </div>
  );
}
