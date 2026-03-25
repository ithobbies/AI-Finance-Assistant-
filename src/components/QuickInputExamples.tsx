import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface QuickInputExamplesProps {
  onSelect: (text: string) => void;
}

export function QuickInputExamples({ onSelect }: QuickInputExamplesProps) {
  const { language } = useSettings();

  const examples = language === 'ru' 
    ? [
        "Кофе 300", 
        "Зарплата 150000", 
        "Такси 500, продукты 2500", 
        "Перевод жене 10000",
        "Подписка Netflix 1200",
        "Бензин 2000"
      ]
    : [
        "Coffee 5", 
        "Salary 5000", 
        "Taxi 15, groceries 120", 
        "Transfer to wife 500",
        "Netflix subscription 15",
        "Gas 40"
      ];

  return (
    <div className="flex overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 gap-2 scrollbar-hide">
      {examples.map((ex, i) => (
        <button
          key={i}
          onClick={() => onSelect(ex)}
          className="whitespace-nowrap text-caption font-medium px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-colors border border-border active:scale-95"
        >
          + {ex}
        </button>
      ))}
    </div>
  );
}
