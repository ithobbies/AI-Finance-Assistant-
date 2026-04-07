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
  
  // For regular payments
  regularPaymentId?: string;
  regularPaymentDueDate?: string; // YYYY-MM-DD
  
  createdAt: any; // Timestamp
}

export type RegularPaymentKind = 'subscription' | 'banking';
export type ScheduleType = 'monthly' | 'yearly' | 'one-time' | 'custom' | 'trial';

export interface RegularPayment {
  id: string;
  userId: string;
  kind: RegularPaymentKind;
  title: string;
  amount: number;
  currency: string;
  scheduleType: ScheduleType;
  intervalUnit?: 'day' | 'week' | 'month' | 'year';
  intervalCount?: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  category: Category;
  iconKey?: string;
  color?: string;
  
  // Banking specific
  subtype?: 'credit' | 'loan' | 'installment' | 'pay-in-parts' | 'other';
  totalInstallments?: number;
  lender?: string;
  
  // Trial specific
  trialEndDate?: string;
  postTrialScheduleType?: 'monthly' | 'yearly' | 'custom';
  
  // Extra metadata
  paymentMethod?: string;
  listName?: string;
  reminders?: boolean;
  notes?: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: any; // Timestamp
  updatedAt?: any; // Timestamp
}

export interface PaymentOccurrence {
  id: string;
  userId: string;
  paymentId: string;
  dueDate: string; // YYYY-MM-DD
  occurrenceKey: string; // paymentId_YYYY-MM-DD
  status: 'paid' | 'skipped';
  paidAt?: string; // YYYY-MM-DD
  paidAmount?: number;
  transactionId?: string;
  installmentNumber?: number;
  createdAt: any;
  updatedAt?: any;
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
