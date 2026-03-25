import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'Доход / Продажи': 'bg-success/20 text-success',
    'Бизнес / Закупки': 'bg-primary/20 text-primary',
    'Бизнес / Реклама и Услуги': 'bg-secondary text-foreground',
    'Доход / Зарплата': 'bg-success/20 text-success',
    'Семья / Продукты': 'bg-warning/20 text-warning',
    'Семья / Дети': 'bg-primary/20 text-primary',
    'Транспорт / Топливо': 'bg-primary/20 text-primary',
    'Транспорт / Услуги': 'bg-secondary text-foreground',
    'Хобби / Аквариум': 'bg-primary/20 text-primary',
    'Хобби / Электроника и Игры': 'bg-secondary text-foreground',
    'Подписки': 'bg-primary/20 text-primary',
    'Домашние расходы': 'bg-secondary text-foreground',
    'Одежда и обувь': 'bg-primary/20 text-primary',
    'Здоровье / Лекарства': 'bg-destructive/20 text-destructive',
    'Связь': 'bg-primary/20 text-primary',
    'Финансы / Кредиты': 'bg-destructive/20 text-destructive',
    'Подарки': 'bg-warning/20 text-warning',
    'Кафе и рестораны': 'bg-destructive/20 text-destructive',
    'Путешествия': 'bg-primary/20 text-primary',
    'Образование': 'bg-primary/20 text-primary'
  };

  return colors[category] || 'bg-secondary text-muted';
}
