import { GoogleGenAI, Type } from '@google/genai';
import { Transaction } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ParsedTransaction extends Omit<Transaction, 'id' | 'userId' | 'createdAt'> {
  confidence?: number;
  warning?: string;
}

export async function parseTransactions(input: string, currentCategories: string[]): Promise<ParsedTransaction[]> {
  const today = new Date();
  const currentDateStr = today.toISOString().split('T')[0];

  const systemInstruction = `
You are a financial assistant. Parse the user's natural language input into a list of transactions.
Today's date is ${currentDateStr}. Use this to resolve relative dates like "вчера" (yesterday), "сегодня" (today).

Existing categories used by the user:
${currentCategories.map(c => `- ${c}`).join('\n')}

Rules:
1. If the user says "оплата частями", map it to "Финансы / Кредиты" or "Хобби / Электроника и Игры" based on context.
2. Determine if each transaction is an 'income' or 'expense' for the 'type' field.
3. Determine the 'kind' of transaction: 'income', 'expense', 'transfer', 'debt_payment', or 'subscription'.
4. Determine the 'scope' of the transaction: 'personal', 'family', or 'business'. Default to 'personal' if unclear.
5. Extract the absolute amount as a number.
6. Extract a short description.
7. Format the date as YYYY-MM-DD.
8. For 'category', try to use one of the existing categories listed above. If the transaction clearly does not fit any existing category, create a new, concise category name.
9. If an account name is mentioned (e.g., "с карты Тинькофф", "наличные"), extract it to 'accountName'.
10. If a counterparty is mentioned (e.g., "перевод жене", "от Ивана"), extract it to 'counterparty'.
11. Extract any relevant keywords as an array of strings in 'tags'.
12. Provide a 'confidence' score from 0 to 100 indicating how sure you are about the parsing.
13. If you are unsure about the category, amount, or date, provide a short 'warning' message explaining why.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: input,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: 'Date in YYYY-MM-DD format' },
            amount: { type: Type.NUMBER, description: 'Absolute amount of the transaction' },
            description: { type: Type.STRING, description: 'Short description of the transaction' },
            category: { type: Type.STRING, description: 'An existing category or a new concise category name' },
            type: { type: Type.STRING, description: "'income' or 'expense'" },
            kind: { type: Type.STRING, description: "'income', 'expense', 'transfer', 'debt_payment', or 'subscription'" },
            scope: { type: Type.STRING, description: "'personal', 'family', or 'business'" },
            accountName: { type: Type.STRING, description: "Account name if mentioned, otherwise omit" },
            counterparty: { type: Type.STRING, description: "Counterparty if mentioned, otherwise omit" },
            tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Relevant keywords" },
            confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 100" },
            warning: { type: Type.STRING, description: "Warning message if unsure about parsing, otherwise omit" }
          },
          required: ['date', 'amount', 'description', 'category', 'type', 'kind', 'scope', 'confidence'],
        },
      },
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error('No response text');
    const parsed = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    throw new Error('Failed to parse transactions from input.');
  }
}

export async function generateFinancialAdvice(transactions: Transaction[], language: string): Promise<string> {
  if (transactions.length === 0) {
    return language === 'ru' ? 'Недостаточно данных для анализа.' : 'Not enough data for analysis.';
  }
  
  const recentTransactions = transactions.slice(0, 50).map(t => ({
    date: t.date,
    amount: t.amount,
    category: t.category,
    type: t.type,
    description: t.description
  }));

  const prompt = `Analyze these recent financial transactions and provide a brief, actionable financial advice or insight (maximum 3 sentences). Focus on spending patterns, potential savings, or unusual expenses. Language: ${language === 'ru' ? 'Russian' : 'English'}. Transactions: ${JSON.stringify(recentTransactions)}`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || (language === 'ru' ? 'Не удалось сгенерировать совет.' : 'Failed to generate advice.');
  } catch (error) {
    console.error('Failed to generate AI advice:', error);
    return language === 'ru' ? 'Ошибка при получении рекомендаций.' : 'Error getting recommendations.';
  }
}

export async function generateCustomReport(
  transactions: Transaction[], 
  reportType: 'tldr' | 'audit' | 'savings', 
  period: 'current_month' | 'last_month' | 'last_90_days' | 'all_time',
  language: string
): Promise<string> {
  if (transactions.length === 0) {
    return language === 'ru' ? 'Недостаточно данных для анализа.' : 'Not enough data for analysis.';
  }

  const now = new Date();
  let startDate = new Date(0);
  let endDate = new Date(now);

  if (period === 'current_month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === 'last_month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (period === 'last_90_days') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 90);
  }

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  const filteredTransactions = transactions
    .filter(t => period === 'all_time' || (t.date >= startStr && t.date <= endStr))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 500)
    .map(t => ({
      date: t.date,
      amount: t.amount,
      category: t.category,
      type: t.type,
      description: t.description
    }));

  if (filteredTransactions.length === 0) {
    return language === 'ru' ? 'Нет транзакций за выбранный период.' : 'No transactions found for the selected period.';
  }

  let prompt = '';
  const langStr = language === 'ru' ? 'Russian' : 'English';

  if (reportType === 'tldr') {
    prompt = `
You are a financial analyst. Provide a very concise summary (TL;DR) of the following transactions.
Language: ${langStr}.
Be extremely brief (3-5 sentences). Highlight the total income, total expenses, and the biggest spending category.
Use emojis and bold text for numbers.

Transactions:
${JSON.stringify(filteredTransactions)}
    `;
  } else if (reportType === 'audit') {
    prompt = `
You are an expert personal finance auditor. Generate a detailed, professional financial audit report in Markdown format based on the following transactions.
Language: ${langStr}.

The report MUST strictly follow this exact structure and style (use emojis, bold text, and tables as shown):

### 📊 Сводный отчёт (Audit)
**Общая картина:**
* **Всего доходов:** [Amount]
* **Всего расходов:** [Amount]
* **Баланс:** [Amount]

**Структура доходов:**
1. **[Category]:** [Amount] ([Percentage]%)
...

**Основные категории расходов:**
1. **[Category]: [Amount]** ([Percentage]%) — [Brief analysis of what was bought based on descriptions].
...

---

### 🔍 Поиск аномалий и анализ
[Identify any unusual spending patterns, large single expenses, or categories that seem disproportionately high. Explain why they stand out.]

### 💡 Выводы
[1-2 paragraphs of deep, actionable insights based on the data].

Transactions data (JSON):
${JSON.stringify(filteredTransactions)}
    `;
  } else if (reportType === 'savings') {
    prompt = `
You are a strict and pragmatic financial advisor. Your goal is to find ways for the user to save money based on their transactions.
Language: ${langStr}.

Generate a report in Markdown format focusing ONLY on cost-cutting and savings.

Structure:
### ✂️ Поиск экономии (Savings Search)

**Где можно сократить расходы:**
1. **[Category/Specific Expense]:** [Amount] — [Why this is a potential waste and how to cut it].
2. ...

**Анализ подписок и регулярных трат:**
[Identify recurring expenses or subscriptions that could be canceled or optimized].

**Жесткая рекомендация:**
[One strict, no-nonsense advice on how to improve their financial discipline next month].

Transactions data (JSON):
${JSON.stringify(filteredTransactions)}
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
    });

    return response.text || (language === 'ru' ? 'Не удалось сгенерировать отчёт.' : 'Failed to generate report.');
  } catch (error) {
    console.error('Failed to generate AI report:', error);
    return language === 'ru' ? 'Ошибка при получении отчёта.' : 'Error getting report.';
  }
}
