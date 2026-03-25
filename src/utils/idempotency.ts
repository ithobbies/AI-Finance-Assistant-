import { Transaction } from '../types';

export function generateFingerprint(t: Omit<Transaction, 'id' | 'userId' | 'createdAt'>): string {
  return `${t.date}-${t.amount}-${t.description.toLowerCase().trim()}-${t.type}`;
}
