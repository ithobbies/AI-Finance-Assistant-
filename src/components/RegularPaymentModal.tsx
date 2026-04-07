import React, { useState, useEffect } from 'react';
import { RegularPayment, RegularPaymentKind, ScheduleType } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { X, Save, Trash2, Calendar, CreditCard, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, db } from '../firebase';
import { addDoc, collection, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { PRESETS, getPresetIcon } from '../lib/presets';

interface RegularPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: RegularPayment | null;
}

const COLORS = [
  'bg-zinc-800', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 
  'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

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
  const [color, setColor] = useState(COLORS[0]);
  const [category, setCategory] = useState('Подписки');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState<'active' | 'paused' | 'completed'>('active');
  
  // Banking specific
  const [subtype, setSubtype] = useState('credit');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [lender, setLender] = useState('');

  // Trial specific
  const [trialEndDate, setTrialEndDate] = useState('');
  const [postTrialScheduleType, setPostTrialScheduleType] = useState<'monthly' | 'yearly' | 'custom'>('monthly');

  useEffect(() => {
    if (payment) {
      setKind(payment.kind);
      setTitle(payment.title);
      setAmount(payment.amount.toString());
      setScheduleType(payment.scheduleType);
      setStartDate(payment.startDate);
      setEndDate(payment.endDate || '');
      setColor(payment.color || COLORS[0]);
      setIconKey(payment.iconKey || 'box');
      setCategory(payment.category);
      setNotes(payment.notes || '');
      setPaymentMethod(payment.paymentMethod || '');
      setStatus(payment.status);
      
      if (payment.subtype) setSubtype(payment.subtype);
      if (payment.totalInstallments) setTotalInstallments(payment.totalInstallments.toString());
      if (payment.lender) setLender(payment.lender);
      
      if (payment.trialEndDate) setTrialEndDate(payment.trialEndDate);
      if (payment.postTrialScheduleType) setPostTrialScheduleType(payment.postTrialScheduleType);

      if (payment.kind === 'subscription') {
        const matchedPreset = PRESETS.find(p => p.iconKey === payment.iconKey && p.color === payment.color);
        if (matchedPreset) {
          setPresetId(matchedPreset.id);
        } else {
          setPresetId('custom');
        }
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
      setColor(COLORS[0]);
      setCategory('Подписки');
      setNotes('');
      setPaymentMethod('');
      setStatus('active');
      
      setSubtype('credit');
      setTotalInstallments('');
      setLender('');
      
      setTrialEndDate('');
      setPostTrialScheduleType('monthly');
    }
  }, [payment, isOpen]);

  useEffect(() => {
    if (!payment && kind === 'banking') {
      setIconKey('landmark');
      setColor('bg-blue-600');
    } else if (!payment && kind === 'subscription' && presetId === 'custom') {
      setIconKey('box');
      setColor('bg-zinc-800');
    }
  }, [kind, payment, presetId]);

  if (!isOpen) return null;

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setPresetId(preset.id);
    if (preset.id !== 'custom') {
      setTitle(preset.name);
      setColor(preset.color);
      setIconKey(preset.iconKey);
    } else {
      setTitle('');
      setColor('bg-zinc-800');
      setIconKey('box');
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !amount || isNaN(Number(amount))) {
      toast.error(language === 'ru' ? 'Заполните название и сумму' : 'Fill title and amount');
      return;
    }

    if (!auth.currentUser) return;

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
        color,
        iconKey,
        status,
        updatedAt: serverTimestamp()
      };

      if (endDate) data.endDate = endDate;
      if (notes) data.notes = notes;
      if (paymentMethod) data.paymentMethod = paymentMethod;

      if (kind === 'banking') {
        data.subtype = subtype;
        if (lender) data.lender = lender;
        if (subtype === 'installment' || subtype === 'pay-in-parts') {
          if (totalInstallments) data.totalInstallments = Number(totalInstallments);
        }
      }
      
      if (scheduleType === 'trial') {
        if (trialEndDate) data.trialEndDate = trialEndDate;
        data.postTrialScheduleType = postTrialScheduleType;
      }

      if (payment) {
        await updateDoc(doc(db, 'regularPayments', payment.id), data);
        toast.success(language === 'ru' ? 'Сохранено' : 'Saved');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, 'regularPayments'), data);
        toast.success(language === 'ru' ? 'Добавлено' : 'Added');
      }
      onClose();
    } catch (error) {
      toast.error(language === 'ru' ? 'Ошибка сохранения' : 'Error saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!payment) return;
    if (!window.confirm(language === 'ru' ? 'Удалить этот платеж?' : 'Delete this payment?')) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'regularPayments', payment.id));
      toast.success(language === 'ru' ? 'Удалено' : 'Deleted');
      onClose();
    } catch (error) {
      toast.error(language === 'ru' ? 'Ошибка удаления' : 'Error deleting');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-card border border-border rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">
            {payment 
              ? (language === 'ru' ? 'Редактировать' : 'Edit Payment') 
              : (language === 'ru' ? 'Новый регулярный платеж' : 'New Regular Payment')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Type Selector */}
          <div className="flex bg-secondary p-1 rounded-xl">
            <button
              onClick={() => setKind('subscription')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all",
                kind === 'subscription' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <RefreshCw className="w-4 h-4" />
              {language === 'ru' ? 'Подписка' : 'Subscription'}
            </button>
            <button
              onClick={() => setKind('banking')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all",
                kind === 'banking' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CreditCard className="w-4 h-4" />
              {language === 'ru' ? 'Банк / Кредит' : 'Banking'}
            </button>
          </div>

          {kind === 'subscription' && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-3">
                {language === 'ru' ? 'Сервис' : 'Service'}
              </label>
              <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-2 px-2">
                {PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "flex flex-col items-center gap-2 min-w-[72px] p-3 rounded-2xl border-2 transition-all",
                      presetId === preset.id ? "border-primary bg-primary/5" : "border-transparent bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", preset.color)}>
                      {getPresetIcon(preset.iconKey)}
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {language === 'ru' ? 'Название' : 'Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === 'subscription' ? 'Netflix, Spotify...' : 'Ипотека, Кредит...'}
                className="w-full bg-secondary border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors"
                disabled={kind === 'subscription' && presetId !== 'custom'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {language === 'ru' ? 'Сумма' : 'Amount'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{currency}</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-secondary border border-transparent focus:border-primary rounded-xl pl-8 pr-4 py-3 outline-none transition-colors text-lg font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  {language === 'ru' ? 'Периодичность' : 'Schedule'}
                </label>
                <select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                  className="w-full bg-secondary border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors appearance-none"
                >
                  <option value="monthly">{language === 'ru' ? 'Ежемесячно' : 'Monthly'}</option>
                  <option value="yearly">{language === 'ru' ? 'Ежегодно' : 'Yearly'}</option>
                  <option value="one-time">{language === 'ru' ? 'Один раз' : 'One-time'}</option>
                  <option value="trial">{language === 'ru' ? 'Пробный период' : 'Trial'}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  {language === 'ru' ? 'Дата начала' : 'Start Date'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-secondary border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors"
                />
              </div>
            </div>

            {scheduleType === 'trial' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    {language === 'ru' ? 'Конец пробного' : 'Trial Ends'}
                  </label>
                  <input
                    type="date"
                    value={trialEndDate}
                    onChange={(e) => setTrialEndDate(e.target.value)}
                    className="w-full bg-background border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">
                    {language === 'ru' ? 'После пробного' : 'After Trial'}
                  </label>
                  <select
                    value={postTrialScheduleType}
                    onChange={(e) => setPostTrialScheduleType(e.target.value as any)}
                    className="w-full bg-background border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors appearance-none"
                  >
                    <option value="monthly">{language === 'ru' ? 'Ежемесячно' : 'Monthly'}</option>
                    <option value="yearly">{language === 'ru' ? 'Ежегодно' : 'Yearly'}</option>
                  </select>
                </div>
              </div>
            )}

            {kind === 'banking' && (
              <div className="space-y-4 p-4 bg-secondary/50 rounded-2xl border border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      {language === 'ru' ? 'Тип' : 'Type'}
                    </label>
                    <select
                      value={subtype}
                      onChange={(e) => setSubtype(e.target.value)}
                      className="w-full bg-background border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors appearance-none"
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
                      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                        {language === 'ru' ? 'Всего платежей' : 'Total Installments'}
                      </label>
                      <input
                        type="number"
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(e.target.value)}
                        placeholder="12"
                        className="w-full bg-background border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    {language === 'ru' ? 'Банк / Кредитор' : 'Bank / Lender'}
                  </label>
                  <input
                    type="text"
                    value={lender}
                    onChange={(e) => setLender(e.target.value)}
                    placeholder={language === 'ru' ? 'Название банка...' : 'Bank name...'}
                    className="w-full bg-background border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{language === 'ru' ? 'Дополнительные настройки' : 'Advanced Settings'}</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      {language === 'ru' ? 'Статус' : 'Status'}
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-secondary border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors appearance-none"
                    >
                      <option value="active">{language === 'ru' ? 'Активен' : 'Active'}</option>
                      <option value="paused">{language === 'ru' ? 'На паузе' : 'Paused'}</option>
                      <option value="completed">{language === 'ru' ? 'Завершен' : 'Completed'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      {language === 'ru' ? 'Дата окончания' : 'End Date'}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-secondary border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    {language === 'ru' ? 'Метод оплаты' : 'Payment Method'}
                  </label>
                  <input
                    type="text"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    placeholder={language === 'ru' ? 'Карта *1234' : 'Card *1234'}
                    className="w-full bg-secondary border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    {language === 'ru' ? 'Заметки' : 'Notes'}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={language === 'ru' ? 'Дополнительная информация...' : 'Additional info...'}
                    className="w-full bg-secondary border border-transparent focus:border-primary rounded-xl px-4 py-3 outline-none transition-colors min-h-[80px] resize-none"
                  />
                </div>

                {(presetId === 'custom' || kind === 'banking') && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                      {language === 'ru' ? 'Цвет' : 'Color'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-transform",
                            c,
                            color === c ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-110 opacity-70 hover:opacity-100"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-border flex items-center gap-3 bg-secondary/30">
          {payment && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-3 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSaving ? (language === 'ru' ? 'Сохранение...' : 'Saving...') : (language === 'ru' ? 'Сохранить' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
