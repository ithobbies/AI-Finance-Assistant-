import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Sparkles, BarChart3, History, ArrowRight, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export function Onboarding() {
  const { language, setHasSeenOnboarding } = useSettings();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <Sparkles className="w-12 h-12 text-primary" />,
      title: language === 'ru' ? 'Добро пожаловать в AI Finance' : 'Welcome to AI Finance',
      description: language === 'ru' 
        ? 'Ваш умный финансовый ассистент. Забудьте о ручном вводе категорий и сумм.'
        : 'Your smart financial assistant. Forget about manual entry of categories and amounts.',
    },
    {
      icon: <Sparkles className="w-12 h-12 text-primary" />,
      title: language === 'ru' ? 'Пишите как думаете' : 'Write as you think',
      description: language === 'ru'
        ? 'Просто напишите "вчера кофе 300 и такси 500", а ИИ сам всё распознает и распределит.'
        : 'Just write "yesterday coffee 5 and taxi 15", and AI will parse and categorize it.',
    },
    {
      icon: <BarChart3 className="w-12 h-12 text-success" />,
      title: language === 'ru' ? 'Умная аналитика' : 'Smart Analytics',
      description: language === 'ru'
        ? 'Получайте советы и отчеты от ИИ-аналитика на основе ваших трат.'
        : 'Get advice and reports from the AI analyst based on your spending.',
    },
    {
      icon: <History className="w-12 h-12 text-primary" />,
      title: language === 'ru' ? 'Всё под контролем' : 'Everything under control',
      description: language === 'ru'
        ? 'Удобная история операций, фильтры и экспорт данных в CSV.'
        : 'Convenient transaction history, filters, and CSV data export.',
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setHasSeenOnboarding(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="surface-elevated w-full max-w-md !rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-95 duration-300 !p-0">
        <div className="p-8 flex flex-col items-center text-center min-h-[320px] justify-center relative">
          
          <div className="absolute top-8 flex gap-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-secondary"
                )}
              />
            ))}
          </div>

          <div className="mt-8 mb-6 p-4 bg-secondary rounded-full">
            {steps[step].icon}
          </div>
          
          <h2 className="text-h2 mb-3">
            {steps[step].title}
          </h2>
          
          <p className="text-body text-muted-foreground leading-relaxed">
            {steps[step].description}
          </p>
        </div>

        <div className="p-6 bg-background border-t border-border flex gap-3">
          {step < steps.length - 1 ? (
            <>
              <button
                onClick={() => setHasSeenOnboarding(true)}
                className="flex-1 py-3 px-4 text-muted hover:text-foreground font-medium transition-colors"
              >
                {language === 'ru' ? 'Пропустить' : 'Skip'}
              </button>
              <button
                onClick={handleNext}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {language === 'ru' ? 'Далее' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleNext}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              {language === 'ru' ? 'Начать использование' : 'Get Started'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
