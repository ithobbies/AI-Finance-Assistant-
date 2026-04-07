import React, { useState, useRef, useEffect } from 'react';
import { Transaction, TransactionKind, TransactionScope } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { parseTransactions, ParsedTransaction } from '../services/ai';
import { Sparkles, Check, X, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { normalizeCategory } from '../lib/categoryNormalization';
import { generateFingerprint } from '../utils/idempotency';
import { QuickInputExamples } from '../components/QuickInputExamples';
import { ParsedTransactionCard } from '../components/ParsedTransactionCard';
import { StickyActionBar } from '../components/StickyActionBar';

interface InputViewProps {
  onSave: (transactions: Omit<Transaction, 'id' | 'userId' | 'createdAt'>[]) => Promise<void>;
  recentTransactions: Transaction[];
  uniqueCategories: string[];
}

export function InputView({ onSave, recentTransactions, uniqueCategories }: InputViewProps) {
  const { language, currency } = useSettings();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewTransactions, setPreviewTransactions] = useState<ParsedTransaction[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasConfirmedDuplicates, setHasConfirmedDuplicates] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleParse = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    try {
      const parsed = await parseTransactions(input, uniqueCategories);
      const normalized = parsed.map(p => ({
        ...p,
        category: normalizeCategory(p.category, uniqueCategories),
        source: 'ai' as const,
        fingerprint: generateFingerprint(p)
      }));
      setPreviewTransactions(normalized);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (language === 'ru' ? 'Ошибка распознавания' : 'Failed to parse transactions'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!previewTransactions || previewTransactions.length === 0) return;
    setIsSaving(true);
    try {
      const toSave = previewTransactions.map((t) => {
        const clean: any = {
          date: t.date,
          amount: t.amount,
          description: t.description,
          category: t.category,
          type: t.type,
          source: t.source,
          fingerprint: t.fingerprint,
        };
        if (t.kind !== undefined) clean.kind = t.kind;
        if (t.scope !== undefined) clean.scope = t.scope;
        if (t.accountId !== undefined) clean.accountId = t.accountId;
        if (t.accountName !== undefined) clean.accountName = t.accountName;
        if (t.counterparty !== undefined) clean.counterparty = t.counterparty;
        if (t.aiConfidence !== undefined) clean.aiConfidence = t.aiConfidence;
        if (t.tags !== undefined) clean.tags = t.tags;
        return clean as Omit<Transaction, 'id' | 'userId' | 'createdAt'>;
      });
      
      if (!hasConfirmedDuplicates) {
        const duplicates = toSave.filter(t => 
          recentTransactions.some(rt => rt.fingerprint === t.fingerprint)
        );

        if (duplicates.length > 0) {
          toast.warning(
            language === 'ru' 
              ? `Найдено ${duplicates.length} возможных дубликатов. Нажмите "Сохранить" еще раз для подтверждения.` 
              : `Found ${duplicates.length} possible duplicates. Click "Save" again to confirm.`
          );
          setHasConfirmedDuplicates(true);
          setIsSaving(false);
          return;
        }
      }

      await onSave(toSave);
      setInput('');
      setPreviewTransactions(null);
      setHasConfirmedDuplicates(false);
      toast.success(language === 'ru' ? 'Транзакции сохранены' : 'Transactions saved');
    } catch (err) {
      // Error is handled in App.tsx
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewTransactions(null);
    setHasConfirmedDuplicates(false);
  };

  const updatePreviewItem = (index: number, field: keyof ParsedTransaction, value: any) => {
    if (!previewTransactions) return;
    const updated = [...previewTransactions];
    updated[index] = { ...updated[index], [field]: value };
    setPreviewTransactions(updated);
  };

  const removePreviewItem = (index: number) => {
    if (!previewTransactions) return;
    const updated = previewTransactions.filter((_, i) => i !== index);
    if (updated.length === 0) {
      handleCancelPreview();
    } else {
      setPreviewTransactions(updated);
    }
  };

  const appendExample = (text: string) => {
    setInput(prev => {
      const separator = prev && !prev.endsWith('\n') ? '\n' : '';
      return prev + separator + text;
    });
    // Optional: focus textarea after appending
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }, 10);
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pb-40 md:pb-8">
      <div className="text-center mb-2">
        <h2 className="text-h1 mb-2">
          {language === 'ru' ? 'Быстрый ввод' : 'Quick Input'}
        </h2>
        <p className="text-body text-muted-foreground">
          {language === 'ru' 
            ? 'Опишите ваши доходы и расходы в свободной форме. ИИ всё поймет.' 
            : 'Describe your income and expenses naturally. AI will figure it out.'}
        </p>
      </div>

      {!previewTransactions ? (
        <div className="flex flex-col gap-4 animate-in fade-in">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'ru' ? "Например: вчера 3200 заправка авто и 9000 перевод жене в бюджет\nМожно вводить сразу несколько операций с новой строки." : "e.g., yesterday 3200 for gas and 9000 transfer to wife\nYou can enter multiple operations on new lines."}
              disabled={isLoading}
              rows={5}
              className={cn(
                "w-full bg-card border border-border rounded-3xl p-5 pl-12 resize-none",
                "text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                "transition-all duration-200 shadow-sm text-[16px] leading-relaxed", // text-[16px] prevents iOS zoom
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            />
            <Sparkles className="absolute left-5 top-5 w-5 h-5 text-primary" />
            
            {input && !isLoading && (
              <button
                onClick={() => setInput('')}
                className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground transition-colors bg-secondary rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={handleParse}
            disabled={!input.trim() || isLoading}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-medium text-lg",
              "transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            )}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {language === 'ru' ? 'Анализируем...' : 'Analyzing...'}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {language === 'ru' ? 'Распознать' : 'Parse'}
              </>
            )}
          </button>
          
          <QuickInputExamples onSelect={appendExample} />
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-in fade-in">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-h2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {language === 'ru' ? 'Проверьте данные' : 'Review Data'}
            </h3>
            <span className="text-label bg-secondary px-3 py-1 rounded-full">
              {previewTransactions.length} {language === 'ru' ? 'записей' : 'entries'}
            </span>
          </div>

          <div className="space-y-4">
            {previewTransactions.map((t, i) => (
              <ParsedTransactionCard 
                key={i} 
                transaction={t} 
                index={i} 
                onUpdate={updatePreviewItem}
                onRemove={removePreviewItem}
              />
            ))}
          </div>

          <StickyActionBar>
            <button
              onClick={handleCancelPreview}
              disabled={isSaving}
              className="flex-1 py-4 px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-2xl font-medium transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-[2] py-4 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              {hasConfirmedDuplicates 
                ? (language === 'ru' ? 'Подтвердить дубликаты' : 'Confirm Duplicates')
                : (language === 'ru' ? 'Сохранить всё' : 'Save All')}
            </button>
          </StickyActionBar>
        </div>
      )}

      {!previewTransactions && recentTransactions.length > 0 && (
        <div className="mt-4 px-2">
          <h3 className="text-label mb-4">
            {language === 'ru' ? 'Недавние записи' : 'Recent Entries'}
          </h3>
          <div className="flex flex-col gap-3">
            {recentTransactions.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 card-secondary">
                <div>
                  <p className="text-body font-medium">{t.description}</p>
                  <p className="text-caption">{t.category}</p>
                </div>
                <div className={cn(
                  "whitespace-nowrap",
                  t.type === 'income' ? 'amount-income' : 'amount-expense'
                )}>
                  {t.type === 'income' ? '+' : '-'}{currency}{t.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
