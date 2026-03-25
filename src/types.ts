export type TransactionType = 'income' | 'expense';
export type TransactionKind = 'income' | 'expense' | 'transfer' | 'debt_payment' | 'subscription';
export type TransactionScope = 'personal' | 'family' | 'business';
export type TransactionSource = 'manual' | 'ai';

export const DEFAULT_CATEGORIES = [
  'Доход / Продажи',
  'Бизнес / Закупки',
  'Бизнес / Реклама и Услуги',
  'Доход / Зарплата',
  'Семья / Продукты',
  'Семья / Дети',
  'Транспорт / Топливо',
  'Транспорт / Услуги',
  'Хобби / Аквариум',
  'Хобби / Электроника и Игры',
  'Подписки',
  'Домашние расходы',
  'Одежда и обувь',
  'Здоровье / Лекарства',
  'Связь',
  'Финансы / Кредиты',
  'Подарки',
  'Кафе и рестораны',
  'Путешествия',
  'Образование'
];

export type Category = string;

export interface Transaction {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  category: Category;
  type: TransactionType; // Legacy, kept for backward compatibility
  
  // Extended Domain Model
  kind?: TransactionKind;
  scope?: TransactionScope;
  accountId?: string;
  accountName?: string;
  counterparty?: string;
  source?: TransactionSource;
  aiConfidence?: number;
  tags?: string[];
  fingerprint?: string; // For idempotency and duplicate detection
  
  createdAt: any; // Timestamp
}

export interface DashboardStats {
  periodIncome: number;
  periodExpenses: number;
  periodNet: number;
  transactionsCount: number;
}

export interface SavedAIReport {
  id: string;
  userId: string;
  date: number;
  periodName: string;
  reportType: string;
  content: string;
}
