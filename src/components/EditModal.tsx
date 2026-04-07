import React, { useState, useEffect } from 'react';
import { Transaction, Category } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { X } from 'lucide-react';

interface EditModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<Transaction>) => Promise<void>;
  categories: string[];
}

export function EditModal({ transaction, isOpen, onClose, onSave, categories }: EditModalProps) {
  const { language } = useSettings();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setCategory(transaction.category);
      setDate(transaction.date);
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave(transaction.id, {
        description,
        amount: parseFloat(amount),
        category,
        date
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card-primary w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-h2">
            {language === 'ru' ? 'Редактировать запись' : 'Edit Transaction'}
          </h3>
          <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-label mb-1">
              {language === 'ru' ? 'Описание' : 'Description'}
            </label>
            <input required type="text" value={description} onChange={e => setDescription(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-label mb-1">
              {language === 'ru' ? 'Сумма' : 'Amount'}
            </label>
            <input required type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-label mb-1">
              {language === 'ru' ? 'Категория' : 'Category'}
            </label>
            <input required type="text" list="category-options" value={category} onChange={e => setCategory(e.target.value)} className="input-base" />
            <datalist id="category-options">
              {categories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-label mb-1">
              {language === 'ru' ? 'Дата' : 'Date'}
            </label>
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="input-base" />
          </div>
          <button disabled={isLoading} type="submit" className="btn-primary w-full py-3 mt-6">
            {language === 'ru' ? 'Сохранить' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
