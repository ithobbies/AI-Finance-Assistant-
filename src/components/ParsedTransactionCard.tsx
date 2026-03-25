import React from 'react';
import { ParsedTransaction } from '../services/ai';
import { useSettings } from '../contexts/SettingsContext';
import { AlertTriangle, AlertCircle, Tag, Wallet, Users, Trash2 } from 'lucide-react';
import { TransactionKind, TransactionScope } from '../types';

interface ParsedTransactionCardProps {
  transaction: ParsedTransaction;
  index: number;
  onUpdate: (index: number, field: keyof ParsedTransaction, value: any) => void;
  onRemove: (index: number) => void;
}

export function ParsedTransactionCard({ transaction: t, index, onUpdate, onRemove }: ParsedTransactionCardProps) {
  const { language } = useSettings();

  return (
    <div className="flex flex-col gap-3 p-4 card-primary relative animate-in fade-in slide-in-from-bottom-4">
      <button 
        onClick={() => onRemove(index)}
        className="absolute -top-2 -right-2 p-2 bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-colors z-10 shadow-sm"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-label ml-1">{language === 'ru' ? 'Описание' : 'Description'}</label>
          <input
            type="text"
            value={t.description}
            onChange={(e) => onUpdate(index, 'description', e.target.value)}
            className="input-base py-2.5"
          />
        </div>
        <div className="space-y-1">
          <label className="text-label ml-1">{language === 'ru' ? 'Категория' : 'Category'}</label>
          <input
            type="text"
            value={t.category}
            onChange={(e) => onUpdate(index, 'category', e.target.value)}
            className="input-base py-2.5"
          />
        </div>
        
        <div className="flex gap-3 sm:col-span-2">
          <div className="flex-1 space-y-1">
            <label className="text-label ml-1">{language === 'ru' ? 'Сумма' : 'Amount'}</label>
            <input
              type="number"
              value={t.amount}
              onChange={(e) => onUpdate(index, 'amount', Number(e.target.value))}
              className="input-base py-2.5"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-label ml-1">{language === 'ru' ? 'Тип' : 'Type'}</label>
            <select
              value={t.type}
              onChange={(e) => onUpdate(index, 'type', e.target.value)}
              className="input-base py-2.5"
            >
              <option value="expense">{language === 'ru' ? 'Расход' : 'Expense'}</option>
              <option value="income">{language === 'ru' ? 'Доход' : 'Income'}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-label ml-1">{language === 'ru' ? 'Дата' : 'Date'}</label>
          <input
            type="date"
            value={t.date}
            onChange={(e) => onUpdate(index, 'date', e.target.value)}
            className="input-base py-2.5"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-label ml-1">{language === 'ru' ? 'Вид' : 'Kind'}</label>
            <select
              value={t.kind || 'expense'}
              onChange={(e) => onUpdate(index, 'kind', e.target.value as TransactionKind)}
              className="input-base py-2.5"
            >
              <option value="expense">{language === 'ru' ? 'Расход' : 'Expense'}</option>
              <option value="income">{language === 'ru' ? 'Доход' : 'Income'}</option>
              <option value="transfer">{language === 'ru' ? 'Перевод' : 'Transfer'}</option>
              <option value="debt_payment">{language === 'ru' ? 'Долг/Кредит' : 'Debt Payment'}</option>
              <option value="subscription">{language === 'ru' ? 'Подписка' : 'Subscription'}</option>
            </select>
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-label ml-1">{language === 'ru' ? 'Сфера' : 'Scope'}</label>
            <select
              value={t.scope || 'personal'}
              onChange={(e) => onUpdate(index, 'scope', e.target.value as TransactionScope)}
              className="input-base py-2.5"
            >
              <option value="personal">{language === 'ru' ? 'Личное' : 'Personal'}</option>
              <option value="family">{language === 'ru' ? 'Семья' : 'Family'}</option>
              <option value="business">{language === 'ru' ? 'Бизнес' : 'Business'}</option>
            </select>
          </div>
        </div>

        <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Wallet className="absolute left-3 top-3 w-4 h-4 text-muted" />
            <input
              type="text"
              value={t.accountName || ''}
              onChange={(e) => onUpdate(index, 'accountName', e.target.value)}
              className="input-base pl-9 py-2.5"
              placeholder={language === 'ru' ? 'Счет (напр. Тинькофф)' : 'Account (e.g. Chase)'}
            />
          </div>
          <div className="flex-1 relative">
            <Users className="absolute left-3 top-3 w-4 h-4 text-muted" />
            <input
              type="text"
              value={t.counterparty || ''}
              onChange={(e) => onUpdate(index, 'counterparty', e.target.value)}
              className="input-base pl-9 py-2.5"
              placeholder={language === 'ru' ? 'Контрагент' : 'Counterparty'}
            />
          </div>
        </div>
        
        {t.tags && t.tags.length > 0 && (
          <div className="sm:col-span-2 flex flex-wrap gap-1.5 items-center mt-1">
            <Tag className="w-3.5 h-3.5 text-muted" />
            {t.tags.map((tag, idx) => (
              <span key={idx} className="px-2 py-1 bg-secondary text-caption rounded-lg border border-border">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {(t.confidence !== undefined || t.warning) && (
        <div className="flex items-start gap-2 mt-2 pt-3 border-t border-border">
          {t.warning ? (
            <div className="flex items-center gap-1.5 text-caption text-warning bg-warning/10 px-2.5 py-1.5 rounded-lg w-full">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t.warning}</span>
            </div>
          ) : t.confidence !== undefined && t.confidence < 80 ? (
            <div className="flex items-center gap-1.5 text-caption text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg w-full">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{language === 'ru' ? `Уверенность ИИ: ${t.confidence}%` : `AI Confidence: ${t.confidence}%`}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
