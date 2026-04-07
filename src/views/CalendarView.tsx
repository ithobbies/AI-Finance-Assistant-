import React, { useState, useMemo } from 'react';
import { Transaction, RegularPayment, PaymentOccurrence as PaymentOccurrenceType } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Circle, AlertCircle, Calendar as CalendarIcon, CreditCard, RefreshCw, XCircle, Play, Pause } from 'lucide-react';
import { cn } from '../lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO, isBefore, startOfDay } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { RegularPaymentModal } from '../components/RegularPaymentModal';
import { auth, db } from '../firebase';
import { addDoc, collection, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { generateOccurrences } from '../lib/recurrence';
import { getPresetIcon } from '../lib/presets';

interface CalendarViewProps {
  transactions: Transaction[];
  regularPayments: RegularPayment[];
  paymentOccurrences: PaymentOccurrenceType[];
}

type FilterType = 'all' | 'subscription' | 'banking' | 'paid' | 'overdue' | 'upcoming' | 'paused';

interface PaymentOccurrence {
  payment: RegularPayment;
  dueDate: Date;
  occurrenceKey: string;
  isPaid: boolean;
  isOverdue: boolean;
  isSkipped: boolean;
  isPaused: boolean;
  installmentNumber: number;
  transaction?: Transaction;
  override?: PaymentOccurrenceType;
}

export function CalendarView({ transactions, regularPayments, paymentOccurrences }: CalendarViewProps) {
  const { language, currency } = useSettings();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
      if (payment.status === 'completed') return;
      
      const isPaused = payment.status === 'paused';
      if (filter === 'subscription' && payment.kind !== 'subscription') return;
      if (filter === 'banking' && payment.kind !== 'banking') return;
      if (filter === 'paused' && !isPaused) return;

      const generated = generateOccurrences(payment, start, end);

      generated.forEach(gen => {
        const dateStr = format(gen.date, 'yyyy-MM-dd');
        const occurrenceKey = `${payment.id}_${dateStr}`;
        
        const override = paymentOccurrences.find(o => o.occurrenceKey === occurrenceKey);
        
        const matchingTx = transactions.find(t => 
          t.regularPaymentId === payment.id && 
          t.regularPaymentDueDate === dateStr
        );

        const isSkipped = override?.status === 'skipped';
        const isPaid = override?.status === 'paid' || (!override && !!matchingTx);
        const isOverdue = !isPaid && !isSkipped && isBefore(gen.date, today);

        if (filter === 'paid' && !isPaid) return;
        if (filter === 'overdue' && !isOverdue) return;
        if (filter === 'upcoming' && (isPaid || isOverdue || isSkipped)) return;
        if (filter !== 'paused' && filter !== 'all' && isPaused) return;

        if (selectedDate && !isSameDay(gen.date, selectedDate)) return;

        results.push({
          payment,
          dueDate: gen.date,
          occurrenceKey,
          isPaid,
          isOverdue,
          isSkipped,
          isPaused,
          installmentNumber: gen.installmentNumber,
          transaction: matchingTx,
          override
        });
      });
    });

    return results.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [regularPayments, currentMonth, filter, transactions, paymentOccurrences, selectedDate]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  // Calculate padding for first day of month (0 = Sunday, 1 = Monday)
  const startDay = startOfMonth(currentMonth).getDay();
  const paddingDays = Array.from({ length: startDay === 0 ? 6 : startDay - 1 }).map((_, i) => i);

  const totalAmount = occurrences.filter(o => !o.isSkipped && !o.isPaused).reduce((sum, occ) => sum + occ.payment.amount, 0);
  const paidAmount = occurrences.filter(o => o.isPaid).reduce((sum, occ) => sum + occ.payment.amount, 0);

  const handlePrevMonth = () => { setCurrentMonth(subMonths(currentMonth, 1)); setSelectedDate(null); };
  const handleNextMonth = () => { setCurrentMonth(addMonths(currentMonth, 1)); setSelectedDate(null); };

  const handleDayClick = (day: Date) => {
    if (selectedDate && isSameDay(day, selectedDate)) {
      setSelectedDate(null);
    } else {
      setSelectedDate(day);
    }
  };

  const handleMarkAsPaid = async (occurrence: PaymentOccurrence) => {
    if (!auth.currentUser) return;
    try {
      const dateStr = format(occurrence.dueDate, 'yyyy-MM-dd');
      
      // 1. Create transaction
      const txRef = await addDoc(collection(db, 'transactions'), {
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

      // 2. Create/Update occurrence override
      const occRef = doc(collection(db, 'paymentOccurrences'));
      await setDoc(occRef, {
        userId: auth.currentUser.uid,
        paymentId: occurrence.payment.id,
        dueDate: dateStr,
        occurrenceKey: occurrence.occurrenceKey,
        status: 'paid',
        paidAt: format(new Date(), 'yyyy-MM-dd'),
        paidAmount: occurrence.payment.amount,
        transactionId: txRef.id,
        installmentNumber: occurrence.installmentNumber,
        createdAt: serverTimestamp()
      });

      toast.success(language === 'ru' ? 'Отмечено как оплаченное' : 'Marked as paid');
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Ошибка' : 'Error');
    }
  };

  const handleUnmarkPaid = async (occurrence: PaymentOccurrence) => {
    if (!auth.currentUser || !occurrence.override) return;
    try {
      // 1. Delete occurrence override
      await deleteDoc(doc(db, 'paymentOccurrences', occurrence.override.id));
      
      // 2. Delete linked transaction if exists
      if (occurrence.override.transactionId) {
        await deleteDoc(doc(db, 'transactions', occurrence.override.transactionId));
      } else if (occurrence.transaction) {
        await deleteDoc(doc(db, 'transactions', occurrence.transaction.id));
      }
      
      toast.success(language === 'ru' ? 'Отметка снята' : 'Unmarked');
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Ошибка' : 'Error');
    }
  };

  const handleSkip = async (occurrence: PaymentOccurrence) => {
    if (!auth.currentUser) return;
    try {
      const dateStr = format(occurrence.dueDate, 'yyyy-MM-dd');
      
      const occRef = doc(collection(db, 'paymentOccurrences'));
      await setDoc(occRef, {
        userId: auth.currentUser.uid,
        paymentId: occurrence.payment.id,
        dueDate: dateStr,
        occurrenceKey: occurrence.occurrenceKey,
        status: 'skipped',
        installmentNumber: occurrence.installmentNumber,
        createdAt: serverTimestamp()
      });

      toast.success(language === 'ru' ? 'Пропущено' : 'Skipped');
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Ошибка' : 'Error');
    }
  };

  const handleTogglePause = async (payment: RegularPayment) => {
    try {
      const newStatus = payment.status === 'paused' ? 'active' : 'paused';
      await updateDoc(doc(db, 'regularPayments', payment.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(language === 'ru' ? 'Статус обновлен' : 'Status updated');
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Ошибка' : 'Error');
    }
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

        <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 scrollbar-hide w-full md:w-auto">
          {(['all', 'subscription', 'banking', 'paid', 'overdue', 'upcoming', 'paused'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelectedDate(null); }}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap",
                filter === f ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f === 'all' ? (language === 'ru' ? 'Все' : 'All') :
               f === 'subscription' ? (language === 'ru' ? 'Подписки' : 'Subs') :
               f === 'banking' ? (language === 'ru' ? 'Банк' : 'Bank') :
               f === 'paid' ? (language === 'ru' ? 'Оплачено' : 'Paid') :
               f === 'overdue' ? (language === 'ru' ? 'Просрочено' : 'Overdue') :
               f === 'paused' ? (language === 'ru' ? 'На паузе' : 'Paused') :
               (language === 'ru' ? 'Ожидается' : 'Upcoming')}
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
            // Get all occurrences for this day ignoring the selectedDate filter
            const dayOccurrences = regularPayments.flatMap(payment => {
              if (payment.status === 'completed') return [];
              if (filter === 'subscription' && payment.kind !== 'subscription') return [];
              if (filter === 'banking' && payment.kind !== 'banking') return [];
              
              const generated = generateOccurrences(payment, startOfMonth(currentMonth), endOfMonth(currentMonth));
              return generated.filter(gen => isSameDay(gen.date, day)).map(gen => {
                const dateStr = format(gen.date, 'yyyy-MM-dd');
                const occurrenceKey = `${payment.id}_${dateStr}`;
                const override = paymentOccurrences.find(o => o.occurrenceKey === occurrenceKey);
                const matchingTx = transactions.find(t => t.regularPaymentId === payment.id && t.regularPaymentDueDate === dateStr);
                const isPaid = override?.status === 'paid' || (!override && !!matchingTx);
                const isSkipped = override?.status === 'skipped';
                const isOverdue = !isPaid && !isSkipped && isBefore(gen.date, startOfDay(new Date()));
                return { isPaid, isOverdue, isSkipped, payment };
              });
            });

            const isCurrentDay = isToday(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            
            return (
              <div 
                key={day.toISOString()} 
                onClick={() => handleDayClick(day)}
                className={cn(
                  "aspect-square rounded-xl md:rounded-2xl p-1 md:p-2 flex flex-col items-center justify-start gap-1 transition-all cursor-pointer relative",
                  isCurrentDay ? "bg-primary/10 border-2 border-primary" : "hover:bg-secondary/50 border-2 border-transparent",
                  isSelected && !isCurrentDay && "bg-primary/20 border-primary/50",
                  dayOccurrences.length > 0 && !isCurrentDay && !isSelected && "bg-secondary/30"
                )}
              >
                <span className={cn(
                  "text-xs md:text-sm font-medium",
                  isCurrentDay ? "text-primary" : "text-foreground"
                )}>
                  {format(day, 'd')}
                </span>
                <div className="flex flex-wrap justify-center gap-0.5 md:gap-1 mt-auto">
                  {dayOccurrences.slice(0, 3).map((occ, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 md:w-2 md:h-2 rounded-full",
                        occ.isPaid ? "bg-success" : occ.isSkipped ? "bg-muted-foreground" : occ.isOverdue ? "bg-destructive" : "bg-primary"
                      )}
                    />
                  ))}
                  {dayOccurrences.length > 3 && <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-muted-foreground" />}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> {language === 'ru' ? 'Ожидается' : 'Upcoming'}</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success" /> {language === 'ru' ? 'Оплачено' : 'Paid'}</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-destructive" /> {language === 'ru' ? 'Просрочено' : 'Overdue'}</div>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {language === 'ru' ? 'Платежи' : 'Payments'}
            {selectedDate && (
              <span className="text-sm font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {format(selectedDate, 'd MMM', { locale })}
              </span>
            )}
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
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ru' ? 'Нет платежей' : 'No payments found'}
            </h3>
            <p className="text-muted-foreground max-w-[250px] mx-auto">
              {language === 'ru' 
                ? 'В этом месяце нет запланированных платежей по выбранным фильтрам.' 
                : 'There are no scheduled payments for this month with the selected filters.'}
            </p>
            <button 
              onClick={() => { setEditingPayment(null); setIsModalOpen(true); }}
              className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              {language === 'ru' ? 'Добавить платеж' : 'Add Payment'}
            </button>
          </div>
        ) : (
          occurrences.map((occ, i) => (
            <div 
              key={i}
              className="flex flex-col p-4 bg-card border border-border rounded-2xl hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between cursor-pointer" onClick={() => { setEditingPayment(occ.payment); setIsModalOpen(true); }}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm",
                    occ.payment.color || "bg-zinc-800"
                  )}>
                    {getPresetIcon(occ.payment.iconKey, "w-6 h-6")}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors text-base">
                      {occ.payment.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CalendarIcon className="w-3 h-3" />
                        <span>{format(occ.dueDate, 'd MMM', { locale })}</span>
                        <span>•</span>
                        <span className="capitalize">{occ.payment.scheduleType}</span>
                        {occ.payment.kind === 'banking' && occ.payment.totalInstallments && (
                          <>
                            <span>•</span>
                            <span>{occ.installmentNumber} / {occ.payment.totalInstallments}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <p className="font-bold text-lg">{currency}{occ.payment.amount.toLocaleString()}</p>
                  <div className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                    occ.isPaid ? "bg-success/10 text-success" : 
                    occ.isSkipped ? "bg-secondary text-muted-foreground" : 
                    occ.isPaused ? "bg-secondary text-muted-foreground" :
                    occ.isOverdue ? "bg-destructive/10 text-destructive" : 
                    "bg-primary/10 text-primary"
                  )}>
                    {occ.isPaid ? (language === 'ru' ? 'Оплачено' : 'Paid') : 
                     occ.isSkipped ? (language === 'ru' ? 'Пропущено' : 'Skipped') :
                     occ.isPaused ? (language === 'ru' ? 'Пауза' : 'Paused') :
                     occ.isOverdue ? (language === 'ru' ? 'Просрочено' : 'Overdue') : 
                     (language === 'ru' ? 'Ожидается' : 'Upcoming')}
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border/50">
                {!occ.isPaid && !occ.isSkipped && !occ.isPaused && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSkip(occ); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors text-xs font-medium"
                    >
                      <Circle className="w-3.5 h-3.5" />
                      {language === 'ru' ? 'Пропустить' : 'Skip'}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(occ); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors text-xs font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {language === 'ru' ? 'Оплатить' : 'Mark Paid'}
                    </button>
                  </>
                )}
                {(occ.isPaid || occ.isSkipped) && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleUnmarkPaid(occ); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-xs font-medium"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    {language === 'ru' ? 'Отменить' : 'Undo'}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleTogglePause(occ.payment); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80 transition-colors text-xs font-medium ml-auto"
                >
                  {occ.payment.status === 'paused' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {occ.payment.status === 'paused' ? (language === 'ru' ? 'Возобновить' : 'Resume') : (language === 'ru' ? 'Пауза' : 'Pause')}
                </button>
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
