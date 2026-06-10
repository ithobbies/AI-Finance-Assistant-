import React, { useEffect, useState } from 'react';
import { RegularPayment, RegularPaymentKind, ScheduleType } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import {
  X,
  ChevronLeft,
  Tag,
  CreditCard,
  List as ListIcon,
  Bell,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, db } from '../firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { PRESETS, SUBSCRIPTION_PRESETS, BANKING_PRESETS, getPresetIcon } from '../lib/presets';

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

function FormRow({
  label,
  icon,
  children,
  isLast,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className={cn('flex items-center justify-between px-4 py-3.5', !isLast && 'border-b border-white/5')}>
      <div className="flex items-center gap-3 text-[15px] text-muted-foreground">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <span>{label}</span>
      </div>
      <div className="ml-4 flex-1 text-right text-[15px] text-foreground">{children}</div>
    </div>
  );
}

export function RegularPaymentModal({ isOpen, onClose, payment }: RegularPaymentModalProps) {
  const { language, currency } = useSettings();

  const [step, setStep] = useState<'select' | 'details'>('select');
  const [isSaving, setIsSaving] = useState(false);

  const [kind, setKind] = useState<RegularPaymentKind>('subscription');
  const [presetId, setPresetId] = useState('custom');
  const [iconKey, setIconKey] = useState('box');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [color, setColor] = useState(COLORS[0]);
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [listName, setListName] = useState('');
  const [reminders, setReminders] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (payment) {
        setStep('details');
        setKind(payment.kind);
        setTitle(payment.title);
        setAmount(String(payment.amount));
        setScheduleType(payment.scheduleType);
        setStartDate(payment.startDate);
        setColor(payment.color || COLORS[0]);
        setIconKey(payment.iconKey || 'box');
        setCategory(payment.category || '');
        setPaymentMethod(payment.paymentMethod || '');
        setListName(payment.listName || '');
        setReminders(payment.reminders ?? true);

        if (payment.kind === 'subscription') {
          const matchedPreset = SUBSCRIPTION_PRESETS.find(
            (preset) => preset.iconKey === payment.iconKey && preset.color === payment.color
          );
          setPresetId(matchedPreset?.id || 'custom');
        } else {
          const matchedPreset = BANKING_PRESETS.find(
            (preset) => preset.iconKey === payment.iconKey && preset.color === payment.color
          );
          setPresetId(matchedPreset?.id || 'custom_bank');
        }
      } else {
        setStep('select');
        setKind('subscription');
        setPresetId('custom');
        setIconKey('box');
        setTitle('');
        setAmount('');
        setScheduleType('monthly');
        setStartDate(new Date().toISOString().split('T')[0]);
        setColor('bg-zinc-800');
        setCategory(language === 'ru' ? 'Подписки' : 'Subscriptions');
        setPaymentMethod('');
        setListName('');
        setReminders(true);
      }
    }
  }, [isOpen, payment, language]);

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
    setStep('details');
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    if (!title.trim() || !amount || Number.isNaN(Number(amount))) {
      toast.error(language === 'ru' ? 'Заполни название и сумму' : 'Fill in title and amount');
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
        category: category || (kind === 'subscription' ? 'Subscriptions' : 'Banking'),
        iconKey,
        color,
        paymentMethod: paymentMethod || '',
        listName: listName || '',
        reminders,
        status: 'active',
        updatedAt: serverTimestamp(),
      };

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-6">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative flex h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-t-[2.5rem] bg-[#1C1C1E] shadow-2xl sm:h-[85vh] sm:rounded-[2.5rem]">
        {/* Glow effect based on selected color */}
        {step === 'details' && (
          <div
            className={cn(
              'absolute -top-40 left-1/2 h-[300px] w-[300px] -translate-x-1/2 rounded-full opacity-20 blur-[80px]',
              color
            )}
          />
        )}

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-4 py-4">
          {step === 'details' && !payment ? (
            <button
              onClick={() => setStep('select')}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="w-10" /> // Spacer
          )}

          <h2 className="text-[17px] font-semibold text-white">
            {step === 'select'
              ? language === 'ru'
                ? 'Новый платеж'
                : 'New Payment'
              : payment
                ? language === 'ru'
                  ? 'Редактировать'
                  : 'Edit Payment'
                : language === 'ru'
                  ? 'Новая подписка'
                  : 'New Subscription'}
          </h2>

          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-24 pt-2">
          {step === 'select' ? (
            <div className="space-y-6">
              <div className="flex rounded-xl bg-[#2C2C2E] p-1">
                <button
                  onClick={() => setKind('subscription')}
                  className={cn(
                    'flex-1 rounded-lg py-2 text-[15px] font-medium transition-all',
                    kind === 'subscription' ? 'bg-[#3A3A3C] text-white shadow' : 'text-muted-foreground'
                  )}
                >
                  {language === 'ru' ? 'Подписка' : 'Subscription'}
                </button>
                <button
                  onClick={() => setKind('banking')}
                  className={cn(
                    'flex-1 rounded-lg py-2 text-[15px] font-medium transition-all',
                    kind === 'banking' ? 'bg-[#3A3A3C] text-white shadow' : 'text-muted-foreground'
                  )}
                >
                  {language === 'ru' ? 'Банк' : 'Banking'}
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                {(kind === 'subscription' ? SUBSCRIPTION_PRESETS : BANKING_PRESETS).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className={cn(
                        'flex h-14 w-14 items-center justify-center rounded-full text-white transition-all hover:scale-105 active:scale-95',
                        'shadow-[0_6px_12px_-2px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-4px_6px_rgba(0,0,0,0.2)]',
                        'border border-white/10',
                        preset.color
                      )}
                    >
                      <div className="drop-shadow-md">
                        {getPresetIcon(preset.iconKey, 'h-7 w-7')}
                      </div>
                    </div>
                    <span className="w-full truncate text-center text-[10px] font-medium text-muted-foreground">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hero Icon */}
              <div className="flex justify-center py-4">
                <div
                  className={cn(
                    'flex h-20 w-20 items-center justify-center rounded-full text-white shadow-xl ring-4 ring-background/50',
                    color
                  )}
                >
                  {getPresetIcon(iconKey, 'h-10 w-10')}
                </div>
              </div>

              {/* Group 1: Core Details */}
              <div className="overflow-hidden rounded-[20px] bg-[#2C2C2E]">
                <FormRow label={language === 'ru' ? 'Название' : 'Name'}>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={language === 'ru' ? 'Название' : 'Name'}
                    className="w-full bg-transparent text-right text-white placeholder:text-muted-foreground focus:outline-none"
                  />
                </FormRow>
                <FormRow label={language === 'ru' ? 'Расписание' : 'Payment Schedule'}>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                    className="w-full appearance-none bg-transparent text-right text-white focus:outline-none"
                    dir="rtl"
                  >
                    <option value="monthly">{language === 'ru' ? 'Ежемесячно' : 'Monthly'}</option>
                    <option value="yearly">{language === 'ru' ? 'Ежегодно' : 'Yearly'}</option>
                    <option value="one-time">{language === 'ru' ? 'Разово' : 'One-time'}</option>
                  </select>
                </FormRow>
                <FormRow label={language === 'ru' ? 'Дата старта' : 'Start Date'} isLast>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-transparent text-right text-white focus:outline-none [&::-webkit-calendar-picker-indicator]:invert"
                  />
                </FormRow>
              </div>

              {/* Group 2: Amount */}
              <div className="overflow-hidden rounded-[20px] bg-[#2C2C2E]">
                <FormRow label={language === 'ru' ? 'Сумма' : 'Amount'} isLast>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-muted-foreground">{currency}</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-24 bg-transparent text-right text-white focus:outline-none"
                    />
                  </div>
                </FormRow>
              </div>

              {/* Group 3: Additional Settings */}
              <div className="overflow-hidden rounded-[20px] bg-[#2C2C2E]">
                <FormRow
                  label={language === 'ru' ? 'Категория' : 'Category'}
                  icon={<Tag className="h-4 w-4" />}
                >
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={language === 'ru' ? 'Развлечения' : 'Entertainment'}
                    className="w-full bg-transparent text-right text-white placeholder:text-muted-foreground focus:outline-none"
                  />
                </FormRow>
                <FormRow
                  label={language === 'ru' ? 'Оплата с' : 'Pay with'}
                  icon={<CreditCard className="h-4 w-4" />}
                >
                  <input
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder={language === 'ru' ? 'Нет' : 'None'}
                    className="w-full bg-transparent text-right text-white placeholder:text-muted-foreground focus:outline-none"
                  />
                </FormRow>
                <FormRow
                  label={language === 'ru' ? 'Список' : 'List'}
                  icon={<ListIcon className="h-4 w-4" />}
                >
                  <input
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    placeholder={language === 'ru' ? 'Личный' : 'Personal'}
                    className="w-full bg-transparent text-right text-white placeholder:text-muted-foreground focus:outline-none"
                  />
                </FormRow>
                <FormRow
                  label={language === 'ru' ? 'Уведомления' : 'Notifications'}
                  icon={<Bell className="h-4 w-4" />}
                  isLast
                >
                  <select
                    value={reminders ? 'true' : 'false'}
                    onChange={(e) => setReminders(e.target.value === 'true')}
                    className="w-full appearance-none bg-transparent text-right text-white focus:outline-none"
                    dir="rtl"
                  >
                    <option value="true">{language === 'ru' ? 'По умолчанию' : 'Default'}</option>
                    <option value="false">{language === 'ru' ? 'Выкл' : 'Off'}</option>
                  </select>
                </FormRow>
              </div>

              {payment && (
                <button
                  onClick={async () => {
                    if (window.confirm(language === 'ru' ? 'Удалить этот платеж?' : 'Delete this payment?')) {
                      await deleteDoc(doc(db, 'regularPayments', payment.id));
                      toast.success(language === 'ru' ? 'Платеж удален' : 'Payment deleted');
                      onClose();
                    }
                  }}
                  className="w-full rounded-[20px] bg-[#2C2C2E] py-3.5 text-[15px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
                >
                  {language === 'ru' ? 'Удалить платеж' : 'Delete Payment'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sticky Bottom Button */}
        {step === 'details' && (
          <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/5 bg-[#1C1C1E]/90 p-4 pb-8 backdrop-blur-md sm:pb-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full rounded-[18px] bg-white py-4 text-[17px] font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {isSaving
                ? language === 'ru'
                  ? 'Сохранение...'
                  : 'Saving...'
                : payment
                  ? language === 'ru'
                    ? 'Сохранить изменения'
                    : 'Save Changes'
                  : language === 'ru'
                    ? 'Добавить подписку'
                    : 'Add Subscription'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
