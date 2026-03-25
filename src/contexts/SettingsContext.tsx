import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';
export type Currency = '₴' | '$' | '€';
export type Language = 'ru' | 'en';

interface Settings {
  theme: Theme;
  currency: Currency;
  language: Language;
  hasSeenOnboarding: boolean;
}

interface SettingsContextType extends Settings {
  setTheme: (theme: Theme) => void;
  setCurrency: (currency: Currency) => void;
  setLanguage: (language: Language) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
}

const defaultSettings: Settings = {
  theme: 'dark',
  currency: '₴',
  language: 'ru',
  hasSeenOnboarding: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('finance_theme');
    return (saved as Theme) || defaultSettings.theme;
  });
  
  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('finance_currency');
    return (saved as Currency) || defaultSettings.currency;
  });
  
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('finance_language');
    return (saved as Language) || defaultSettings.language;
  });

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(() => {
    const saved = localStorage.getItem('finance_has_seen_onboarding');
    return saved === 'true' ? true : defaultSettings.hasSeenOnboarding;
  });

  useEffect(() => {
    localStorage.setItem('finance_theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('finance_currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('finance_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('finance_has_seen_onboarding', hasSeenOnboarding.toString());
  }, [hasSeenOnboarding]);

  return (
    <SettingsContext.Provider value={{ theme, currency, language, hasSeenOnboarding, setTheme, setCurrency, setLanguage, setHasSeenOnboarding }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
