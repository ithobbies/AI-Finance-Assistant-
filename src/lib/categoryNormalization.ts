import { DEFAULT_CATEGORIES } from '../types';

const CATEGORY_ALIASES: Record<string, string> = {
  'кофе': 'Кафе и рестораны',
  'ресторан': 'Кафе и рестораны',
  'кафе': 'Кафе и рестораны',
  'макдак': 'Кафе и рестораны',
  'бензин': 'Транспорт / Топливо',
  'заправка': 'Транспорт / Топливо',
  'такси': 'Транспорт / Услуги',
  'убер': 'Транспорт / Услуги',
  'uber': 'Транспорт / Услуги',
  'зарплата': 'Доход / Зарплата',
  'зп': 'Доход / Зарплата',
  'продукты': 'Семья / Продукты',
  'супермаркет': 'Семья / Продукты',
  'еда': 'Семья / Продукты',
  'аптека': 'Здоровье / Лекарства',
  'лекарства': 'Здоровье / Лекарства',
  'интернет': 'Связь',
  'телефон': 'Связь',
  'мобильный': 'Связь',
  'одежда': 'Одежда и обувь',
  'обувь': 'Одежда и обувь',
  'подарок': 'Подарки',
  'кредит': 'Финансы / Кредиты',
  'ипотека': 'Финансы / Кредиты',
  'подписка': 'Подписки',
  'netflix': 'Подписки',
  'spotify': 'Подписки',
};

export function normalizeCategory(rawCategory: string, existingCategories: string[]): string {
  if (!rawCategory) return 'Разное';
  
  const lowerRaw = rawCategory.toLowerCase().trim();
  
  // 1. Check exact match in existing
  const exactMatch = existingCategories.find(c => c.toLowerCase() === lowerRaw);
  if (exactMatch) return exactMatch;

  // 2. Check aliases
  for (const [alias, normalized] of Object.entries(CATEGORY_ALIASES)) {
    if (lowerRaw.includes(alias)) {
      return normalized;
    }
  }

  // 3. Capitalize first letter
  return rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
}
