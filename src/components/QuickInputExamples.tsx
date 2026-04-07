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
        "Такси 500, продукты 2500"
      ]
    : [
        "Coffee 5", 
        "Salary 5000", 
        "Taxi 15, groceries 120"
      ];

  return (
    <div className="flex flex-wrap gap-2">
      {examples.map((ex, i) => (
        <button
          key={i}
          onClick={() => onSelect(ex)}
          className="text-caption font-medium px-3 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-colors border border-border active:scale-95"
        >
          + {ex}
        </button>
      ))}
    </div>
  );
}
