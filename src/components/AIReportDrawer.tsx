import React, { useState, useEffect, useRef } from 'react';
import { Transaction } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { X, Sparkles, FileText, Search, TrendingDown, Copy, Check, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateCustomReport } from '../services/ai';
import { saveReportToArchive, auth } from '../firebase';
import { cn } from '../lib/utils';

interface AIReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
}

type ReportType = 'tldr' | 'audit' | 'savings';
type PeriodType = 'current_month' | 'last_month' | 'last_90_days' | 'all_time';

const LOADER_MESSAGES_RU = [
  "Собираю транзакции...",
  "Анализирую категории...",
  "Ищу скрытые закономерности...",
  "Формирую выводы...",
  "Почти готово..."
];

const LOADER_MESSAGES_EN = [
  "Gathering transactions...",
  "Analyzing categories...",
  "Finding hidden patterns...",
  "Formulating insights...",
  "Almost done..."
];

export function AIReportDrawer({ isOpen, onClose, transactions }: AIReportDrawerProps) {
  const { language } = useSettings();
  const [period, setPeriod] = useState<PeriodType>('current_month');
  const [reportType, setReportType] = useState<ReportType>('audit');
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [loaderIndex, setLoaderIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management and body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Focus close button for accessibility
      setTimeout(() => closeButtonRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoaderIndex((prev) => (prev + 1) % 5);
      }, 2500);
    } else {
      setLoaderIndex(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setReport(null);
    setError(null);
    setIsCopied(false);
    setIsSaved(false);
    try {
      const generatedReport = await generateCustomReport(transactions, reportType, period, language);
      setReport(generatedReport);
    } catch (err: any) {
      console.error(err);
      setError(err.message || (language === 'ru' ? 'Произошла ошибка при генерации отчета.' : 'An error occurred while generating the report.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (report) {
      await navigator.clipboard.writeText(report);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSaveReport = async () => {
    if (!report || !auth.currentUser) return;
    
    setIsSaving(true);
    try {
      const periodLabels: Record<PeriodType, { ru: string; en: string }> = {
        current_month: { ru: 'Текущий месяц', en: 'Current Month' },
        last_month: { ru: 'Прошлый месяц', en: 'Last Month' },
        last_90_days: { ru: 'Последние 90 дней', en: 'Last 90 Days' },
        all_time: { ru: 'За всё время', en: 'All Time' }
      };
      
      const typeLabels: Record<ReportType, { ru: string; en: string }> = {
        tldr: { ru: 'Краткая сводка', en: 'Short Summary' },
        audit: { ru: 'Глубокий аудит', en: 'Deep Audit' },
        savings: { ru: 'Поиск экономии', en: 'Savings Search' }
      };

      await saveReportToArchive({
        userId: auth.currentUser.uid,
        date: Date.now(),
        periodName: periodLabels[period][language],
        reportType: typeLabels[reportType][language],
        content: report
      });
      setIsSaved(true);
    } catch (error) {
      console.error("Failed to save report:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const loaderMessages = language === 'ru' ? LOADER_MESSAGES_RU : LOADER_MESSAGES_EN;

  return (
    <div 
      className="fixed inset-0 z-50 flex md:justify-end bg-background md:bg-black/50 md:backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-report-title"
    >
      <div 
        ref={drawerRef}
        className="bg-background w-full h-full md:max-w-2xl shadow-2xl md:border-l border-border flex flex-col animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
      >
        {/* Sticky Top Bar */}
        <div className="sticky top-0 z-20 flex items-center p-4 md:p-6 border-b border-border bg-background/90 backdrop-blur-md shrink-0">
          <button 
            ref={closeButtonRef}
            onClick={() => {
              if (report) {
                setReport(null);
              } else {
                onClose();
              }
            }} 
            className="p-2 -ml-2 mr-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors md:hidden"
            aria-label={language === 'ru' ? 'Назад' : 'Back'}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="flex-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary hidden md:block" />
            <h3 id="ai-report-title" className="text-h2">
              {language === 'ru' ? 'AI Аналитик' : 'AI Analyst'}
            </h3>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 -mr-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors hidden md:block"
            aria-label={language === 'ru' ? 'Закрыть' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {transactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-muted" />
              </div>
              <div>
                <h4 className="text-h3">
                  {language === 'ru' ? 'Нет данных' : 'No data'}
                </h4>
                <p className="text-body text-muted-foreground mt-1 max-w-xs mx-auto">
                  {language === 'ru' ? 'Добавьте транзакции, чтобы AI смог составить отчет.' : 'Add transactions so AI can generate a report.'}
                </p>
              </div>
            </div>
          ) : !report && !isGenerating && !error ? (
            <div className="p-4 md:p-6 space-y-8 flex-1">
              {/* Config Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-label mb-3">
                    {language === 'ru' ? 'Период анализа' : 'Analysis Period'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'current_month', label: language === 'ru' ? 'Текущий месяц' : 'Current Month' },
                      { id: 'last_month', label: language === 'ru' ? 'Прошлый месяц' : 'Last Month' },
                      { id: 'last_90_days', label: language === 'ru' ? '90 дней' : '90 Days' },
                      { id: 'all_time', label: language === 'ru' ? 'Всё время' : 'All Time' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setPeriod(opt.id as PeriodType)}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-medium border transition-colors text-center",
                          period === opt.id 
                            ? "bg-primary/10 border-primary/30 text-primary" 
                            : "bg-transparent border-border text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-label mb-3">
                    {language === 'ru' ? 'Тип отчета' : 'Report Type'}
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Report Type Buttons */}
                    <button
                      onClick={() => setReportType('tldr')}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.98]",
                        reportType === 'tldr' 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "border-border hover:bg-secondary"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-xl shrink-0",
                        reportType === 'tldr' ? "bg-primary/20" : "bg-secondary"
                      )}>
                        <FileText className={cn("w-5 h-5", reportType === 'tldr' ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <div className="text-body font-semibold text-heading">
                          {language === 'ru' ? 'Краткая сводка (TL;DR)' : 'Short Summary (TL;DR)'}
                        </div>
                        <div className="text-caption text-muted-foreground mt-1 leading-relaxed">
                          {language === 'ru' ? 'Быстрая оценка расходов (3-5 предложений).' : 'Quick expense evaluation (3-5 sentences).'}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setReportType('audit')}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.98]",
                        reportType === 'audit' 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "border-border hover:bg-secondary"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-xl shrink-0",
                        reportType === 'audit' ? "bg-primary/20" : "bg-secondary"
                      )}>
                        <Search className={cn("w-5 h-5", reportType === 'audit' ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <div className="text-body font-semibold text-heading">
                          {language === 'ru' ? 'Глубокий аудит' : 'Deep Audit'}
                        </div>
                        <div className="text-caption text-muted-foreground mt-1 leading-relaxed">
                          {language === 'ru' ? 'Детальный анализ с поиском аномалий.' : 'Detailed analysis with anomaly detection.'}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setReportType('savings')}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.98]",
                        reportType === 'savings' 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "border-border hover:bg-secondary"
                      )}
                    >
                      <div className={cn(
                        "p-2 rounded-xl shrink-0",
                        reportType === 'savings' ? "bg-primary/20" : "bg-secondary"
                      )}>
                        <TrendingDown className={cn("w-5 h-5", reportType === 'savings' ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <div className="text-body font-semibold text-heading">
                          {language === 'ru' ? 'Поиск экономии' : 'Savings Search'}
                        </div>
                        <div className="text-caption text-muted-foreground mt-1 leading-relaxed">
                          {language === 'ru' ? 'Советы, где можно было бы сократить расходы.' : 'Tips on where you could cut expenses.'}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 text-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="space-y-3">
                <h4 className="text-h2">
                  {language === 'ru' ? 'AI анализирует данные' : 'AI is analyzing data'}
                </h4>
                <p className="text-body text-muted-foreground animate-pulse">
                  {loaderMessages[loaderIndex]}
                </p>
              </div>
              
              {/* Skeleton lines to simulate thinking */}
              <div className="w-full max-w-sm space-y-3 mt-8 opacity-50">
                <div className="h-2 bg-secondary rounded-full w-3/4 mx-auto animate-pulse"></div>
                <div className="h-2 bg-secondary rounded-full w-full mx-auto animate-pulse delay-75"></div>
                <div className="h-2 bg-secondary rounded-full w-5/6 mx-auto animate-pulse delay-150"></div>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h4 className="text-h3">
                  {language === 'ru' ? 'Ошибка генерации' : 'Generation Error'}
                </h4>
                <p className="text-body text-muted-foreground mt-1 max-w-xs mx-auto">
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                className="px-6 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-medium transition-colors mt-4"
              >
                {language === 'ru' ? 'Попробовать снова' : 'Try Again'}
              </button>
            </div>
          ) : report ? (
            <div className="p-4 md:p-6 flex-1">
              <div className="markdown-body bg-card p-5 md:p-8 rounded-3xl border border-border text-[15px] md:text-base leading-relaxed break-words shadow-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sticky Bottom Action Bar */}
        {transactions.length > 0 && !isGenerating && !error && (
          <div className="sticky bottom-0 z-20 p-4 md:p-6 bg-background/90 backdrop-blur-md border-t border-border shrink-0">
            {!report ? (
              <button
                onClick={handleGenerate}
                className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
              >
                <Sparkles className="w-5 h-5" />
                {language === 'ru' ? 'Сгенерировать отчет' : 'Generate Report'}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 py-3.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-2xl font-medium transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isCopied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
                  {isCopied 
                    ? (language === 'ru' ? 'Скопировано!' : 'Copied!') 
                    : (language === 'ru' ? 'Скопировать' : 'Copy')}
                </button>
                <button
                  onClick={handleSaveReport}
                  disabled={isSaving || isSaved}
                  className="flex-1 py-3.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-2xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                >
                  {isSaved ? <Check className="w-5 h-5 text-success" /> : <Save className="w-5 h-5" />}
                  {isSaved 
                    ? (language === 'ru' ? 'Сохранено!' : 'Saved!') 
                    : isSaving 
                      ? (language === 'ru' ? 'Сохранение...' : 'Saving...') 
                      : (language === 'ru' ? 'В архив' : 'Save to Archive')}
                </button>
                <button
                  onClick={() => setReport(null)}
                  className="flex-1 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-medium transition-colors active:scale-[0.98] hidden md:flex items-center justify-center"
                >
                  {language === 'ru' ? 'Новый отчет' : 'New Report'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
