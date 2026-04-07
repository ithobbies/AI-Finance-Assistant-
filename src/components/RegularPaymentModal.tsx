import React, { useEffect, useMemo, useState } from 'react';
import { RegularPayment, RegularPaymentKind, ScheduleType } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import {
  X,
  Save,
  Trash2,
  RefreshCw,
  CreditCard,
  Calendar,
  ChevronDown,
  ChevronUp,
  Bell,
  Layers3,
  Palette,
  Landmark,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, db } from '../firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { PRESETS, getPresetIcon } from '../lib/presets';

interface RegularPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: RegularPayment | null;
}

const COLORS = [
  'bg-zinc-800',
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
];

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function RegularPaymentModal({ isOpen, onClose, payment }: RegularPaymentModalProps) {
  const { language, currency } = useSettings();

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [kind, setKind] = useState<RegularPaymentKind>('subscription');
  const [presetId, setPresetId] = useState('custom');
  const [iconKey, setIconKey] = useState('box');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [intervalUnit, setIntervalUnit] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [intervalCount, setIntervalCount] = useState('1');

  const [color, setColor] = useState(COLORS[0]);
  const [category, setCategory] = useState(language === 'ru' ? 'Подписки' : 'Subscriptions');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [listName, setListName] = useState('');
  const [notes, setNotes] = useState('');
  const [reminders, setReminders] = useState(true);
  const [status, setStatus] = useState<'active' | 'paused' | 'completed'>('active');

  const [subtype, setSubtype] = useState<'credit' | 'loan' | 'installment' | 'pay-in-parts' | 'other'>('credit');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [lender, setLender] = useState('');

  const [trialEndDate, setTrialEndDate] = useState('');
  const [postTrialScheduleType, setPostTrialScheduleType] = useState<'monthly' | 'yearly' | 'custom'>('monthly');

  useEffect(() => {
    if (payment) {
      setKind(payment.kind);
      setTitle(payment.title);
      setAmount(String(payment.amount));
      setScheduleType(payment.scheduleType);
      setStartDate(payment.startDate);
      setEndDate(payment.endDate || '');
      setIntervalUnit(payment.intervalUnit || 'month');
      setIntervalCount(String(payment.intervalCount || 1));
      setColor(payment.color || COLORS[0]);
      setIconKey(payment.iconKey || 'box');
      setCategory(payment.category);
      setPaymentMethod(payment.paymentMethod || '');
      setListName(payment.listName || '');
      setNotes(payment.notes || '');
      setReminders(payment.reminders ?? true);
      setStatus(payment.status);

      setSubtype(payment.subtype || 'credit');
      setTotalInstallments(payment.totalInstallments ? String(payment.totalInstallments) : '');
      setLender(payment.lender || '');

      setTrialEndDate(payment.trialEndDate || '');
      setPostTrialScheduleType(payment.postTrialScheduleType || 'monthly');

      if (payment.kind === 'subscription') {
        const matchedPreset = PRESETS.find((preset) => preset.iconKey === payment.iconKey && preset.color === payment.color);
        setPresetId(matchedPreset?.id || 'custom');
      } else {
        setPresetId('custom');
      }
    } else {
      setKind('subscription');
      setPresetId('custom');
      setIconKey('box');
      setTitle('');
      setAmount('');
      setScheduleType('monthly');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setIntervalUnit('month');
      setIntervalCount('1');
      setColor('bg-zinc-800');
      setCategory(language === 'ru' ? 'Подписки' : 'Subscriptions');
      setPaymentMethod('');
      setListName('');
      setNotes('');
      setReminders(true);
      setStatus('active');

      setSubtype('credit');
      setTotalInstallments('');
      setLender('');

      setTrialEndDate('');
      setPostTrialScheduleType('monthly');
    }
  }, [isOpen, language, payment]);

  useEffect(() => {
    if (!payment && kind === 'banking') {
      setIconKey('landmark');
      setColor('bg-blue-600');
      setCategory(language === 'ru' ? 'Финансы / Кредиты' : 'Finance / Credit');
    }
    if (!payment && kind === 'subscription') {
      setCategory(language === 'ru' ? 'Подписки' : 'Subscriptions');
    }
  }, [kind, language, payment]);

  const previewAmount = useMemo(() => {
    const value = Number(amount);
    return Number.isFinite(value) ? value : 0;
  }, [amount]);

  if (!isOpen) return null;

  const handlePresetClick = (preset: typeof PRESETS[number]) => {
    setPresetId(preset.id);
    setColor(preset.color);
    setIconKey(preset.iconKey);
    if (preset.id !== 'custom') {
      setTitle(preset.name);
    } else {
      setTitle('');
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    if (!title.trim() || !amount || Number.isNaN(Number(amount))) {
      toast.error(language === 'ru' ? 'Заполни название и сумму' : 'Fill in title and amount');
      return;
    }

    if (scheduleType === 'custom' && (!intervalCount || Number(intervalCount) <= 0)) {
      toast.error(language === 'ru' ? 'Укажи корректный интервал' : 'Provide a valid custom interval');
      return;
    }

    if (scheduleType === 'trial' && !trialEndDate) {
      toast.error(language === 'ru' ? 'Укажи дату конца пробного периода' : 'Provide trial end date');
      return;
    }

    setIsSaving(true);

    try {
      const data: any = {
        userId: auth.currentUser.uid,
        kind,
        title: title.trim(),
        amount: Number(amount),
        currency,
        scheduleType,
        startDate,
        category,
        iconKey,
        color,
        paymentMethod: paymentMethod || '',
        listName: listName || '',
        reminders,
        notes: notes || '',
        status,
        updatedAt: serverTimestamp(),
      };

      if (endDate) data.endDate = endDate;

      if (scheduleType === 'custom') {
        data.intervalUnit = intervalUnit;
        data.intervalCount = Number(intervalCount);
      }

      if (scheduleType === 'trial') {
        data.trialEndDate = trialEndDate;
        data.postTrialScheduleType = postTrialScheduleType;
      }

      if (kind === 'banking') {
        data.subtype = subtype;
        data.lender = lender || '';
        if ((subtype === 'installment' || subtype === 'pay-in-parts') && totalInstallments) {
          data.totalInstallments = Number(totalInstallments);
        }
      }

      if (payment) {
        await updateDoc(doc(db, 'regularPayments', payment.id), data);
        toast.success(language === 'ru' ? 'Платёж обновлён' : 'Payment updated');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'regularPayments'), data);
        toast.success(language === 'ru' ? 'Платёж добавлен' : 'Payment created');
      }

      onClose();
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Не удалось сохранить платёж' : 'Failed to save payment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!payment) return;

    if (!window.confirm(language === 'ru' ? 'Удалить этот регулярный платёж?' : 'Delete this regular payment?')) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteDoc(doc(db, 'regularPayments', payment.id));
      toast.success(language === 'ru' ? 'Платёж удалён' : 'Payment deleted');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(language === 'ru' ? 'Не удалось удалить платёж' : 'Failed to delete payment');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] border border-border bg-card shadow-2xl sm:rounded-[2rem]">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted sm:hidden" />

        <div className="border-b border-border px-5 pb-4 pt-4 sm:px-6 sm:pt-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {payment
                  ? language === 'ru' ? 'Редактирование' : 'Edit mode'
                  : language === 'ru' ? 'Новый платеж' : 'New payment'}
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                {language === 'ru' ? 'Регулярный платеж' : 'Regular payment'}
              </h2>
            </div>

            <button onClick={onClose} className="btn-secondary h-10 w-10 rounded-2xl p-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-hidden rounded-[1.6rem] border border-white/5 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.22),transparent_56%)] p-4">
            <div className="flex items-center gap-4">
              <div className={cn('flex h-14 w-14 items-center justify-center rounded-[1.2rem] text-white shadow-sm', color)}>
                {getPresetIcon(iconKey, 'h-7 w-7')}
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {title || (language === 'ru' ? 'Новый платеж' : 'New payment')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {kind === 'subscription'
                    ? language === 'ru' ? 'Подписка / сервис' : 'Subscription / service'
                    : language === 'ru' ? 'Банк / кредит / рассрочка' : 'Banking / credit / installments'}
                </p>
              </div>

              <div className="ml-auto text-right">
                <p className="text-xl font-semibold tracking-tight">
                  {currency}{previewAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {scheduleType === 'monthly'
                    ? language === 'ru' ? 'в месяц' : 'per month'
                    : scheduleType === 'yearly'
                      ? language === 'ru' ? 'в год' : 'per year'
                      : scheduleType === 'one-time'
                        ? language === 'ru' ? 'разово' : 'one time'
                        : scheduleType === 'trial'
                          ? language === 'ru' ? 'trial' : 'trial'
                          : language === 'ru' ? 'кастомно' : 'custom'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            <button
              onClick={() => setKind('subscription')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all',
                kind === 'subscription'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <RefreshCw className="h-4 w-4" />
              {language === 'ru' ? 'Подписка' : 'Subscription'}
            </button>

            <button
              onClick={() => setKind('banking')}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all',
                kind === 'banking'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CreditCard className="h-4 w-4" />
              {language === 'ru' ? 'Банк' : 'Banking'}
            </button>
          </div>

          {kind === 'subscription' && (
            <section>
              <SectionTitle
                icon={<RefreshCw className="h-4 w-4" />}
                title={language === 'ru' ? 'Выбери сервис' : 'Choose a service'}
                subtitle={language === 'ru' ? 'Пресеты помогают быстрее создать красивую карточку' : 'Presets create a polished card faster'}
              />

              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      'rounded-2xl border p-3 text-center transition-all',
                      presetId === preset.id
                        ? 'border-primary bg-primary/8'
                        : 'border-border bg-secondary/50 hover:bg-secondary'
                    )}
                  >
                    <div className={cn('mx-auto flex h-11 w-11 items-center justify-center rounded-2xl text-white', preset.color)}>
                      {getPresetIcon(preset.iconKey, 'h-5 w-5')}
                    </div>
                    <p className="mt-2 text-[11px] font-medium leading-tight">{preset.name}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle
              icon={<Calendar className="h-4 w-4" />}
              title={language === 'ru' ? 'Основная информация' : 'Core details'}
            />

            <div className="space-y-3 rounded-[1.6rem] bg-secondary/45 p-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {language === 'ru' ? 'Название' : 'Title'}
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={kind === 'subscription' ? 'Netflix, Spotify, ChatGPT…' : language === 'ru' ? 'Ипотека, кредит, займ…' : 'Mortgage, loan, installment…'}
                  className="input-base bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {language === 'ru' ? 'Сумма' : 'Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      {currency}
                    </span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="input-base bg-background pl-9 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {language === 'ru' ? 'Периодичность' : 'Schedule'}
                  </label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                    className="input-base bg-background"
                  >
                    <option value="monthly">{language === 'ru' ? 'Ежемесячно' : 'Monthly'}</option>
                    <option value="yearly">{language === 'ru' ? 'Ежегодно' : 'Yearly'}</option>
                    <option value="one-time">{language === 'ru' ? 'Разово' : 'One-time'}</option>
                    <option value="custom">{language === 'ru' ? 'Кастомный интервал' : 'Custom interval'}</option>
                    <option value="trial">{language === 'ru' ? 'Пробный период' : 'Trial'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {language === 'ru' ? 'Дата старта' : 'Start date'}
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-base bg-background"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {language === 'ru' ? 'Дата окончания' : 'End date'}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-base bg-background"
                  />
                </div>
              </div>

              {scheduleType === 'custom' && (
                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-primary/20 bg-primary/6 p-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      {language === 'ru' ? 'Каждые' : 'Every'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={intervalCount}
                      onChange={(e) => setIntervalCount(e.target.value)}
                      className="input-base bg-background"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                      {language === 'ru' ? 'Единица' : 'Unit'}
                    </label>
                    <select
                      value={intervalUnit}
                      onChange={(e) => setIntervalUnit(e.target.value as any)}
                      className="input-base bg-background"
                    >
                      <option value="day">{language === 'ru' ? 'Дни' : 'Days'}</option>
                      <option value="week">{language === 'ru' ? 'Недели' : 'Weeks'}</option>
                      <option value="month">{language === 'ru' ? 'Месяцы' : 'Months'}</option>
                      <option value="year">{language === 'ru' ? 'Годы' : 'Years'}</option>
                    </select>
                  </div>
                </div>
              )}

              {scheduleType === 'trial' && (
                <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/6 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        {language === 'ru' ? 'Конец пробного' : 'Trial ends'}
                      </label>
                      <input
                        type="date"
                        value={trialEndDate}
                        onChange={(e) => setTrialEndDate(e.target.value)}
                        className="input-base bg-background"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                        {language === 'ru' ? 'После trial' : 'After trial'}
                      </label>
                      <select
                        value={postTrialScheduleType}
                        onChange={(e) => setPostTrialScheduleType(e.target.value as any)}
                        className="input-base bg-background"
                      >
                        <option value="monthly">{language === 'ru' ? 'Ежемесячно' : 'Monthly'}</option>
                        <option value="yearly">{language === 'ru' ? 'Ежегодно' : 'Yearly'}</option>
                        <option value="custom">{language === 'ru' ? 'Кастомный интервал' : 'Custom interval'}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {kind === 'banking' && (
            <section>
              <SectionTitle
                icon={<Landmark className="h-4 w-4" />}
                title={language === 'ru' ? 'Банковские детали' : 'Banking details'}
              />

              <div className="space-y-3 rounded-[1.6rem] bg-secondary/45 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {language === 'ru' ? 'Тип' : 'Type'}
                    </label>
                    <select
                      value={subtype}
                      onChange={(e) => setSubtype(e.target.value as any)}
                      className="input-base bg-background"
                    >
                      <option value="credit">{language === 'ru' ? 'Кредит' : 'Credit'}</option>
                      <option value="loan">{language === 'ru' ? 'Займ' : 'Loan'}</option>
                      <option value="installment">{language === 'ru' ? 'Рассрочка' : 'Installment'}</option>
                      <option value="pay-in-parts">{language === 'ru' ? 'Оплата частями' : 'Pay in parts'}</option>
                      <option value="other">{language === 'ru' ? 'Другое' : 'Other'}</option>
                    </select>
                  </div>

                  {(subtype === 'installment' || subtype === 'pay-in-parts') && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {language === 'ru' ? 'Всего платежей' : 'Total installments'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(e.target.value)}
                        className="input-base bg-background"
                        placeholder="12"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {language === 'ru' ? 'Банк / кредитор' : 'Bank / lender'}
                  </label>
                  <input
                    value={lender}
                    onChange={(e) => setLender(e.target.value)}
                    className="input-base bg-background"
                    placeholder={language === 'ru' ? 'Название банка или сервиса…' : 'Bank or provider name…'}
                  />
                </div>
              </div>
            </section>
          )}

          <section>
            <button
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-2xl bg-secondary/55 px-4 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold">
                  {language === 'ru' ? 'Дополнительные настройки' : 'Additional settings'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {language === 'ru' ? 'Категория, способ оплаты, заметки, цвет и статус' : 'Category, payment method, notes, color and status'}
                </p>
              </div>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 rounded-[1.6rem] bg-secondary/45 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {language === 'ru' ? 'Категория' : 'Category'}
                    </label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input-base bg-background"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {language === 'ru' ? 'Статус' : 'Status'}
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="input-base bg-background"
                    >
                      <option value="active">{language === 'ru' ? 'Активен' : 'Active'}</option>
                      <option value="paused">{language === 'ru' ? 'На паузе' : 'Paused'}</option>
                      <option value="completed">{language === 'ru' ? 'Завершён' : 'Completed'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {language === 'ru' ? 'Метод оплаты' : 'Payment method'}
                    </label>
                    <input
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="input-base bg-background"
                      placeholder={language === 'ru' ? 'Карта •••• 1234' : 'Card •••• 1234'}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {language === 'ru' ? 'Группа / список' : 'List / group'}
                    </label>
                    <input
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      className="input-base bg-background"
                      placeholder={language === 'ru' ? 'Личные, Бизнес…' : 'Personal, Business…'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setReminders((prev) => !prev)}
                    className={cn(
                      'flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all',
                      reminders
                        ? 'border-primary bg-primary/8'
                        : 'border-border bg-background'
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Bell className="h-4 w-4" />
                      {language === 'ru' ? 'Напоминания' : 'Reminders'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {reminders
                        ? language === 'ru' ? 'Вкл.' : 'On'
                        : language === 'ru' ? 'Выкл.' : 'Off'}
                    </span>
                  </button>

                  <div className="rounded-2xl border border-border bg-background px-4 py-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Layers3 className="h-4 w-4" />
                      {language === 'ru' ? 'Иконка / цвет' : 'Icon / color'}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-white', color)}>
                        {getPresetIcon(iconKey, 'h-4 w-4')}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {language === 'ru' ? 'Ниже можно поменять цвет карточки' : 'Change the card color below'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {language === 'ru' ? 'Заметки' : 'Notes'}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-base min-h-[90px] resize-none bg-background"
                    placeholder={language === 'ru' ? 'Любая полезная информация по этому платежу…' : 'Anything helpful about this payment…'}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Palette className="h-4 w-4" />
                    {language === 'ru' ? 'Цвет карточки' : 'Card color'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((item) => (
                      <button
                        key={item}
                        onClick={() => setColor(item)}
                        className={cn(
                          'h-8 w-8 rounded-full transition-all',
                          item,
                          color === item
                            ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-card'
                            : 'opacity-80 hover:scale-105'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            {payment && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-secondary h-12 w-12 shrink-0 rounded-2xl p-0 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary h-12 flex-1 rounded-2xl px-5 text-sm"
            >
              <Save className="h-4 w-4" />
              {isSaving
                ? language === 'ru' ? 'Сохранение…' : 'Saving…'
                : payment
                  ? language === 'ru' ? 'Сохранить изменения' : 'Save changes'
                  : language === 'ru' ? 'Создать платеж' : 'Create payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}