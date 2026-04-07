import React, { useMemo, useState } from 'react';
import { Transaction, RegularPayment, PaymentOccurrence as PaymentOccurrenceType } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Pause,
  Play,
  PencilLine,
  SkipForward,
  RotateCcw,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
  isBefore,
  startOfDay,
} from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { RegularPaymentModal } from '../components/RegularPaymentModal';
import { auth, db } from '../firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { generateOccurrences } from '../lib/recurrence';
import { getPresetIcon } from '../lib/presets';

interface CalendarViewProps {
  transactions: Transaction[];
  regularPayments: RegularPayment[];
  paymentOccurrences: PaymentOccurrenceType[];
}

type KindFilter = 'all' | 'subscription' | 'banking';
type StatusFilter = 'all' | 'upcoming' | 'paid' | 'overdue' | 'paused';

interface DecoratedOccurrence {
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

function KindSegment({
  value,
  onChange,
  language,
}: {
  value: KindFilter;
  onChange: (value: KindFilter) => void;
  language: string;
}) {
  const items: { value: KindFilter; label: string }[] = [
    { value: 'all', label: language === 'ru' ? 'Все' : 'All' },
    { value: 'subscription', label: language === 'ru' ? 'Подписки' : 'Subscriptions' },
    { value: 'banking', label: language === 'ru' ? 'Банк' : 'Banking' },
  ];

  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary p-1">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'rounded-xl px-3 py-2 text-xs font-semibold transition-all',
            value === item.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function StatusChips({
  value,
  onChange,
  language,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
  language: string;
}) {
  const items: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: language === 'ru' ? 'Все статусы' : 'All statuses' },
    { value: 'upcoming', label: language === 'ru' ? 'Ожидается' : 'Upcoming' },
    { value: 'paid', label: language === 'ru' ? 'Оплачено' : 'Paid' },
    { value: 'overdue', label: language === 'ru' ? 'Просрочено' : 'Overdue' },
    { value: 'paused', label: language === 'ru' ? 'На паузе' : 'Paused' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
            value === item.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({
  occurrence,
  language,
}: {
  occurrence: DecoratedOccurrence;
  language: string;
}) {
  const label = occurrence.isPaid
    ? language === 'ru' ? 'Оплачено' : 'Paid'
    : occurrence.isSkipped
      ? language === 'ru' ? 'Пропущено' : 'Skipped'
      : occurrence.isPaused
        ? language === 'ru' ? 'Пауза' : 'Paused'
        : occurrence.isOverdue
          ? language === 'ru' ? 'Просрочено' : 'Overdue'
          : language === 'ru' ? 'Ожидается' : 'Upcoming';

  const className = occurrence.isPaid
    ? 'bg-success/12 text-success'
    : occurrence.isSkipped
      ? 'bg-secondary text-muted-foreground'
      : occurrence.isPaused
        ? 'bg-secondary text-muted-foreground'
        : occurrence.isOverdue
          ? 'bg-destructive/12 text-destructive'
          : 'bg-primary/12 text-primary';

  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]', className)}>
      {label}
    </span>
  );
}

function EmptyState({
  title,
  subtitle,
  cta,
  onAction,
}: {
  title: string;
  subtitle: string;
  cta: string;
  onAction: () => void;
}) {
  return (
    <div className="card-primary px-5 py-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mx-auto mb-6 max-w-[280px] text-sm text-muted-foreground">{subtitle}</p>
      <button onClick={onAction} className="btn-primary px-5 py-3 text-sm">
        {cta}
      </button>
    </div>
  );
}

export function CalendarView({ transactions, regularPayments, paymentOccurrences }: CalendarViewProps) {
  const { language, currency } = useSettings();
  const locale = language === 'ru' ? ru : enUS;

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(startOfDay(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RegularPayment | null>(null);
  const [actionOccurrence, setActionOccurrence] = useState<DecoratedOccurrence | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const today = startOfDay(new Date());

  const rawMonthOccurrences = useMemo(() => {
    const result: DecoratedOccurrence[] = [];

    regularPayments.forEach((payment) => {
      if (payment.status === 'completed') return;

      const generated = generateOccurrences(payment, monthStart, monthEnd);

      generated.forEach((generatedOccurrence) => {
        const dueDate = generatedOccurrence.date;
        const dateStr = format(dueDate, 'yyyy-MM-dd');
        const occurrenceKey = `${payment.id}_${dateStr}`;

        const override = paymentOccurrences.find((o) => o.occurrenceKey === occurrenceKey);
        const transaction = transactions.find(
          (t) => t.regularPaymentId === payment.id && t.regularPaymentDueDate === dateStr
        );

        const isSkipped = override?.status === 'skipped';
        const isPaid = override?.status === 'paid' || (!override && !!transaction);
        const isPaused = payment.status === 'paused';
        const isOverdue = !isPaid && !isSkipped && !isPaused && isBefore(dueDate, today);

        result.push({
          payment,
          dueDate,
          occurrenceKey,
          isPaid,
          isOverdue,
          isSkipped,
          isPaused,
          installmentNumber: generatedOccurrence.installmentNumber,
          transaction,
          override,
        });
      });
    });

    return result.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [monthEnd, monthStart, paymentOccurrences, regularPayments, today, transactions]);

  const kindScopedOccurrences = useMemo(() => {
    if (kindFilter === 'all') return rawMonthOccurrences;
    return rawMonthOccurrences.filter((item) => item.payment.kind === kindFilter);
  }, [kindFilter, rawMonthOccurrences]);

  const visibleOccurrences = useMemo(() => {
    return kindScopedOccurrences.filter((item) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'paid') return item.isPaid;
      if (statusFilter === 'overdue') return item.isOverdue;
      if (statusFilter === 'upcoming') return !item.isPaid && !item.isOverdue && !item.isSkipped && !item.isPaused;
      if (statusFilter === 'paused') return item.isPaused;
      return true;
    });
  }, [kindScopedOccurrences, statusFilter]);

  const listOccurrences = useMemo(() => {
    if (selectedDate) {
      return visibleOccurrences.filter((item) => isSameDay(item.dueDate, selectedDate));
    }
    return visibleOccurrences;
  }, [selectedDate, visibleOccurrences]);

  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = monthStart.getDay();
  const paddingDays = Array.from({ length: startDay === 0 ? 6 : startDay - 1 }).map((_, i) => i);

  const totalAmount = kindScopedOccurrences
    .filter((item) => !item.isSkipped && !item.isPaused)
    .reduce((sum, item) => sum + item.payment.amount, 0);

  const paidAmount = kindScopedOccurrences
    .filter((item) => item.isPaid)
    .reduce((sum, item) => sum + item.payment.amount, 0);

  const remainingAmount = Math.max(totalAmount - paidAmount, 0);

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleDayClick = (day: Date) => {
    if (selectedDate && isSameDay(selectedDate, day)) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate(day);
  };

  const handleMarkAsPaid = async (occurrence: DecoratedOccurrence) => {
    if (!auth.currentUser) return;

    try {
      const dueDate = format(occurrence.dueDate, 'yyyy-MM-dd');

      const txRef = await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser.uid,
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: occurrence.payment.amount,
        description: occurrence.payment.title,
        category: occurrence.payment.category,
        type: 'expense',
        kind: occurrence.payment.kind === 'subscription' ? 'subscription' : 'debt_payment',
        regularPaymentId: occurrence.payment.id,
        regularPaymentDueDate: dueDate,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'paymentOccurrences', occurrence.occurrenceKey), {
        userId: auth.currentUser.uid,
        paymentId: occurrence.payment.id,
        dueDate,
        occurrenceKey: occurrence.occurrenceKey,
        status: 'paid',
        paidAt: format(new Date(), 'yyyy-MM-dd'),
        paidAmount: occurrence.payment.amount,
        transactionId: txRef.id,
        installmentNumber: occurrence.installmentNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success(language === 'ru' ? 'Платёж отмечен как оплаченный' : 'Payment marked as paid');
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Не удалось отметить оплату' : 'Failed to mark payment');
    }
  };

  const handleUndoOccurrence = async (occurrence: DecoratedOccurrence) => {
    if (!auth.currentUser) return;

    try {
      const occurrenceDocId = occurrence.override?.id || occurrence.occurrenceKey;
      await deleteDoc(doc(db, 'paymentOccurrences', occurrenceDocId));

      const transactionId = occurrence.override?.transactionId || occurrence.transaction?.id;
      if (transactionId) {
        await deleteDoc(doc(db, 'transactions', transactionId));
      }

      toast.success(language === 'ru' ? 'Действие отменено' : 'Action undone');
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Не удалось отменить действие' : 'Failed to undo');
    }
  };

  const handleSkip = async (occurrence: DecoratedOccurrence) => {
    if (!auth.currentUser) return;

    try {
      await setDoc(doc(db, 'paymentOccurrences', occurrence.occurrenceKey), {
        userId: auth.currentUser.uid,
        paymentId: occurrence.payment.id,
        dueDate: format(occurrence.dueDate, 'yyyy-MM-dd'),
        occurrenceKey: occurrence.occurrenceKey,
        status: 'skipped',
        installmentNumber: occurrence.installmentNumber,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast.success(language === 'ru' ? 'Платёж пропущен' : 'Payment skipped');
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Не удалось пропустить платёж' : 'Failed to skip payment');
    }
  };

  const handleTogglePause = async (payment: RegularPayment) => {
    try {
      await updateDoc(doc(db, 'regularPayments', payment.id), {
        status: payment.status === 'paused' ? 'active' : 'paused',
        updatedAt: serverTimestamp(),
      });

      toast.success(language === 'ru' ? 'Статус обновлён' : 'Status updated');
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Не удалось обновить статус' : 'Failed to update status');
    }
  };

  const handleComplete = async (payment: RegularPayment) => {
    try {
      await updateDoc(doc(db, 'regularPayments', payment.id), {
        status: 'completed',
        updatedAt: serverTimestamp(),
      });

      toast.success(language === 'ru' ? 'Платёж завершён' : 'Payment completed');
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Не удалось завершить платёж' : 'Failed to complete payment');
    }
  };

  const openCreateModal = () => {
    setEditingPayment(null);
    setIsModalOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-32">
      <section className="overflow-hidden rounded-[2rem] border border-white/5 bg-card shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.20),transparent_55%)] px-5 pb-5 pt-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {language === 'ru' ? 'Календарь платежей' : 'Payments calendar'}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {currency}{totalAmount.toLocaleString()}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {language === 'ru' ? 'Запланировано на месяц' : 'Scheduled this month'}
              </p>
            </div>

            <button
              onClick={openCreateModal}
              className="btn-primary h-11 w-11 shrink-0 rounded-2xl p-0"
              aria-label={language === 'ru' ? 'Добавить платёж' : 'Add payment'}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-background/70 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {language === 'ru' ? 'Оплачено' : 'Paid'}
              </p>
              <p className="mt-1 text-lg font-semibold">{currency}{paidAmount.toLocaleString()}</p>
            </div>

            <div className="rounded-2xl bg-background/70 px-4 py-3 backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {language === 'ru' ? 'Осталось' : 'Remaining'}
              </p>
              <p className="mt-1 text-lg font-semibold">{currency}{remainingAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: totalAmount > 0 ? `${Math.min((paidAmount / totalAmount) * 100, 100)}%` : '0%' }}
            />
          </div>
        </div>

        <div className="border-t border-border px-4 py-4 sm:px-5">
          <div className="mb-4 flex items-center justify-between">
            <button onClick={handlePrevMonth} className="btn-secondary h-10 w-10 rounded-2xl p-0">
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center">
              <p className="text-sm font-semibold capitalize">{format(currentMonth, 'LLLL yyyy', { locale })}</p>
              <p className="text-xs text-muted-foreground">
                {selectedDate
                  ? language === 'ru'
                    ? `Выбран ${format(selectedDate, 'd MMM', { locale })}`
                    : `Selected ${format(selectedDate, 'd MMM', { locale })}`
                  : language === 'ru'
                    ? 'Показываем весь месяц'
                    : 'Showing full month'}
              </p>
            </div>

            <button onClick={handleNextMonth} className="btn-secondary h-10 w-10 rounded-2xl p-0">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <KindSegment value={kindFilter} onChange={setKindFilter} language={language} />
            <StatusChips value={statusFilter} onChange={setStatusFilter} language={language} />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card px-4 pb-4 pt-4 shadow-sm sm:px-5">
        <div className="mb-3 grid grid-cols-7 gap-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => (
            <div key={day} className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {language === 'en' ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'][index] : day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {paddingDays.map((item) => (
            <div key={`pad-${item}`} className="aspect-square opacity-0" />
          ))}

          {daysInMonth.map((day) => {
            const dayOccurrences = visibleOccurrences.filter((item) => isSameDay(item.dueDate, day));
            const isSelected = !!selectedDate && isSameDay(day, selectedDate);
            const hasOverdue = dayOccurrences.some((item) => item.isOverdue);
            const hasPaid = dayOccurrences.some((item) => item.isPaid);
            const isCurrentDay = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'relative aspect-square rounded-[1.35rem] border p-1.5 text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-[0_10px_24px_rgba(99,102,241,0.22)]'
                    : isCurrentDay
                      ? 'border-primary/40 bg-primary/6'
                      : dayOccurrences.length > 0
                        ? 'border-border bg-secondary/40 hover:bg-secondary/60'
                        : 'border-transparent bg-transparent hover:bg-secondary/35',
                  hasOverdue && !isSelected && 'border-destructive/30'
                )}
              >
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        isSelected || isCurrentDay ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    {dayOccurrences.length > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                          hasOverdue
                            ? 'bg-destructive/12 text-destructive'
                            : hasPaid
                              ? 'bg-success/12 text-success'
                              : 'bg-primary/12 text-primary'
                        )}
                      >
                        {dayOccurrences.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-1">
                    {dayOccurrences.slice(0, 2).map((item) => (
                      <div
                        key={item.occurrenceKey}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full text-white ring-2 ring-card',
                          item.payment.color || 'bg-zinc-800'
                        )}
                      >
                        {getPresetIcon(item.payment.iconKey, 'h-3.5 w-3.5')}
                      </div>
                    ))}

                    {dayOccurrences.length > 2 && (
                      <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-semibold text-muted-foreground">
                        +{dayOccurrences.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {selectedDate
                ? language === 'ru'
                  ? 'Платежи на выбранный день'
                  : 'Payments for selected day'
                : language === 'ru'
                  ? 'Платежи месяца'
                  : 'Payments this month'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedDate
                ? format(selectedDate, 'd MMMM', { locale })
                : language === 'ru'
                  ? 'Список актуальных платежей ниже'
                  : 'Your active payment timeline below'}
            </p>
          </div>

          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="btn-ghost h-9 rounded-xl px-3 text-xs"
            >
              <X className="h-4 w-4" />
              {language === 'ru' ? 'Сбросить' : 'Clear'}
            </button>
          )}
        </div>

        {listOccurrences.length === 0 ? (
          <EmptyState
            title={language === 'ru' ? 'Пока пусто' : 'Nothing here yet'}
            subtitle={
              selectedDate
                ? language === 'ru'
                  ? 'На этот день нет платежей по выбранным фильтрам.'
                  : 'There are no payments for this day with current filters.'
                : language === 'ru'
                  ? 'Добавь подписку или банковский платёж, чтобы увидеть красивую ленту на месяц.'
                  : 'Add a subscription or banking payment to start building your monthly timeline.'
            }
            cta={language === 'ru' ? 'Добавить платёж' : 'Add payment'}
            onAction={openCreateModal}
          />
        ) : (
          listOccurrences.map((occurrence) => (
            <article
              key={occurrence.occurrenceKey}
              className="card-primary overflow-hidden px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm',
                    occurrence.payment.color || 'bg-zinc-800'
                  )}
                >
                  {getPresetIcon(occurrence.payment.iconKey, 'h-6 w-6')}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">{occurrence.payment.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {format(occurrence.dueDate, 'd MMM', { locale })}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{occurrence.payment.scheduleType}</span>
                        {occurrence.payment.kind === 'banking' && occurrence.payment.totalInstallments ? (
                          <>
                            <span>•</span>
                            <span>
                              {language === 'ru' ? 'Платёж' : 'Installment'} {occurrence.installmentNumber}/{occurrence.payment.totalInstallments}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold tracking-tight">
                        {currency}{occurrence.payment.amount.toLocaleString()}
                      </p>
                      <div className="mt-1 flex justify-end">
                        <StatusBadge occurrence={occurrence} language={language} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {!occurrence.isPaid && !occurrence.isSkipped && !occurrence.isPaused ? (
                      <button
                        onClick={() => handleMarkAsPaid(occurrence)}
                        className="btn-primary h-10 rounded-2xl px-4 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {language === 'ru' ? 'Оплатить' : 'Mark paid'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUndoOccurrence(occurrence)}
                        className="btn-secondary h-10 rounded-2xl px-4 text-sm"
                      >
                        <RotateCcw className="h-4 w-4" />
                        {language === 'ru' ? 'Отменить' : 'Undo'}
                      </button>
                    )}

                    <button
                      onClick={() => setActionOccurrence(occurrence)}
                      className="btn-secondary ml-auto h-10 w-10 rounded-2xl p-0"
                      aria-label={language === 'ru' ? 'Дополнительные действия' : 'More actions'}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <RegularPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        payment={editingPayment}
      />

      {actionOccurrence && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-4 shadow-2xl">
            <div className="mb-4 mx-auto h-1.5 w-12 rounded-full bg-muted" />
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {language === 'ru' ? 'Действия' : 'Actions'}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{actionOccurrence.payment.title}</h3>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setEditingPayment(actionOccurrence.payment);
                  setIsModalOpen(true);
                  setActionOccurrence(null);
                }}
                className="btn-secondary w-full justify-start rounded-2xl px-4 py-3"
              >
                <PencilLine className="h-4 w-4" />
                {language === 'ru' ? 'Редактировать' : 'Edit payment'}
              </button>

              {!actionOccurrence.isPaid && !actionOccurrence.isSkipped && !actionOccurrence.isPaused && (
                <button
                  onClick={() => {
                    handleSkip(actionOccurrence);
                    setActionOccurrence(null);
                  }}
                  className="btn-secondary w-full justify-start rounded-2xl px-4 py-3"
                >
                  <SkipForward className="h-4 w-4" />
                  {language === 'ru' ? 'Пропустить этот платёж' : 'Skip this occurrence'}
                </button>
              )}

              <button
                onClick={() => {
                  handleTogglePause(actionOccurrence.payment);
                  setActionOccurrence(null);
                }}
                className="btn-secondary w-full justify-start rounded-2xl px-4 py-3"
              >
                {actionOccurrence.payment.status === 'paused' ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
                {actionOccurrence.payment.status === 'paused'
                  ? language === 'ru' ? 'Возобновить платежи' : 'Resume payments'
                  : language === 'ru' ? 'Поставить на паузу' : 'Pause payments'}
              </button>

              <button
                onClick={() => {
                  handleComplete(actionOccurrence.payment);
                  setActionOccurrence(null);
                }}
                className="btn-secondary w-full justify-start rounded-2xl px-4 py-3 text-warning"
              >
                <CheckCircle2 className="h-4 w-4" />
                {language === 'ru' ? 'Завершить план' : 'Complete plan'}
              </button>

              <button
                onClick={() => setActionOccurrence(null)}
                className="btn-ghost mt-2 w-full justify-center rounded-2xl px-4 py-3"
              >
                {language === 'ru' ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}