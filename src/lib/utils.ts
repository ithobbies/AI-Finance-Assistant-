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
    'Доход / Продажи': 'bg-success/10 text-success dark:bg-success/20',
    'Бизнес / Закупки': 'bg-primary/10 text-primary dark:bg-primary/20',
    'Бизнес / Реклама и Услуги': 'bg-secondary text-foreground',
    'Доход / Зарплата': 'bg-success/10 text-success dark:bg-success/20',
    'Семья / Продукты': 'bg-warning/10 text-warning dark:bg-warning/20',
    'Семья / Дети': 'bg-primary/10 text-primary dark:bg-primary/20',
    'Транспорт / Топливо': 'bg-primary/10 text-primary dark:bg-primary/20',
    'Транспорт / Услуги': 'bg-secondary text-foreground',
    'Хобби / Аквариум': 'bg-primary/10 text-primary dark:bg-primary/20',
    'Хобби / Электроника и Игры': 'bg-secondary text-foreground',
    'Подписки': 'bg-primary/10 text-primary dark:bg-primary/20',
    'Домашние расходы': 'bg-secondary text-foreground',
    'Одежда и обувь': 'bg-primary/10 text-primary dark:bg-primary/20',
    'Здоровье / Лекарства': 'bg-destructive/10 text-destructive dark:bg-destructive/20',
    'Связь': 'bg-primary/10 text-primary dark:bg-primary/20',
    'Финансы / Кредиты': 'bg-destructive/10 text-destructive dark:bg-destructive/20',
    'Подарки': 'bg-warning/10 text-warning dark:bg-warning/20',
    'Кафе и рестораны': 'bg-destructive/10 text-destructive dark:bg-destructive/20',
    'Путешествия': 'bg-primary/10 text-primary dark:bg-primary/20',
    'Образование': 'bg-primary/10 text-primary dark:bg-primary/20'
  };

  return colors[category] || 'bg-secondary text-muted-foreground';
}
