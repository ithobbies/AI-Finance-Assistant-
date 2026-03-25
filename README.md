# Finance 2026 💰

Finance 2026 is a modern, responsive, and intelligent financial tracking application designed for both personal and business use. It leverages the power of Gemini AI to parse natural language inputs into structured financial data and generate deep analytical reports.

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12-orange.svg)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC.svg)](https://tailwindcss.com/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-Flash_3.0-blueviolet.svg)](https://ai.google.dev/)

---

## 🌟 Key Features

### 🧠 AI-Powered Input
- **Natural Language Parsing**: Simply type "Spent 500 on dinner with friends yesterday" and the AI will automatically extract the amount, category, date, and description.
- **Bulk Processing**: Input multiple transactions at once using plain text.

### 📊 Intelligent Analytics
- **AI Financial Analyst**: Generate custom reports based on your transaction history:
  - **TL;DR**: A quick summary of your financial health.
  - **Deep Audit**: Detailed analysis identifying spending patterns and anomalies.
  - **Savings Search**: Actionable tips on where you can cut costs.
- **Visual Dashboard**: Real-time charts and statistics (Income vs. Expenses, Net Balance).

### 📂 Archive & History
- **Reports Archive**: Save your AI-generated reports to a secure archive in Firestore for future reference.
- **Transaction History**: Full CRUD (Create, Read, Update, Delete) capabilities for all your records.
- **CSV Export**: Export your entire transaction history to a CSV file for external accounting.

### 🛠️ Modern UX/UI
- **Responsive Design**: Optimized for mobile, tablet, and desktop.
- **Dark Mode Support**: Seamlessly switches between light and dark themes.
- **Bilingual Support**: Full support for English and Russian languages.
- **Secure Authentication**: Google Login integration via Firebase Auth.

---

## 🚀 Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4, Lucide Icons, Framer Motion
- **Backend/Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google Provider)
- **AI Engine**: Google Gemini 3.0 Flash (`@google/genai`)
- **Charts**: Recharts

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Firebase Project
- Gemini API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd finance-2026
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   ```
   *Note: Firebase configuration should be placed in `firebase-applet-config.json`.*

4. **Start the development server**:
   ```bash
   npm run dev
   ```

---

## 📁 Project Structure

```text
├── src/
│   ├── components/       # Reusable UI components (Modals, Drawers, Nav)
│   ├── contexts/         # React Contexts (Settings, Theme)
│   ├── services/         # External API integrations (Gemini AI)
│   ├── views/            # Main application views (Chat, Dashboard, History, Archive)
│   ├── firebase.ts       # Firebase initialization and helper functions
│   ├── types.ts          # TypeScript interfaces and enums
│   └── main.tsx          # Application entry point
├── firestore.rules       # Security rules for Firestore
├── firebase-blueprint.json # Data structure definition
└── metadata.json         # App metadata
```

---

## 🔒 Security

The application implements strict **Firebase Security Rules** to ensure data privacy:
- **Ownership Isolation**: Users can only read, write, or delete their own data.
- **Data Validation**: All incoming data is validated against a strict schema (types, lengths, required fields).
- **Immutable Fields**: Critical metadata like `userId` and `createdAt` cannot be modified after creation.

---

## 🇷🇺 Описание на русском

**Finance 2026** — это современное приложение для учета финансов, которое использует искусственный интеллект для автоматизации ввода данных и глубокого анализа расходов.

### Основные возможности:
- **Ввод данных голосом или текстом**: AI понимает обычную речь и превращает её в транзакции.
- **AI Аналитик**: Получайте советы по экономии и подробные аудиты ваших трат.
- **Архив отчетов**: Сохраняйте важные выводы AI в облако.
- **Безопасность**: Ваши данные защищены Google Auth и строгими правилами Firestore.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
