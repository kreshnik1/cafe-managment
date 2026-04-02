import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { TRANSLATIONS, Language, TranslationKey } from '../i18n/translations';

export type Currency = 'USD' | 'EUR' | 'MKD';

interface SettingsContextValue {
  currency: Currency;
  language: Language;
  setCurrency: (c: Currency) => void;
  setLanguage: (l: Language) => void;
  t: (key: TranslationKey) => string;
  fmt: (amount: number) => string;
}

const STORE_KEY = 'cafe_app_settings_v1';

const SettingsContext = createContext<SettingsContextValue>({
  currency:    'USD',
  language:    'en',
  setCurrency: () => {},
  setLanguage: () => {},
  t:           (key) => TRANSLATIONS.en[key],
  fmt:         (n)   => `$${Math.abs(n).toFixed(2)}`,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [language, setLanguageState] = useState<Language>('en');

  // Load persisted settings on mount
  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        if (saved.currency) setCurrencyState(saved.currency as Currency);
        if (saved.language) setLanguageState(saved.language as Language);
      } catch {}
    });
  }, []);

  async function persist(c: Currency, l: Language) {
    try {
      await SecureStore.setItemAsync(STORE_KEY, JSON.stringify({ currency: c, language: l }));
    } catch {}
  }

  function setCurrency(c: Currency) {
    setCurrencyState(c);
    persist(c, language);
  }

  function setLanguage(l: Language) {
    setLanguageState(l);
    persist(currency, l);
  }

  function t(key: TranslationKey): string {
    return TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key];
  }

  function fmt(amount: number): string {
    const n = Math.abs(amount);
    switch (currency) {
      case 'EUR': return `€${n.toFixed(2)}`;
      case 'MKD': return `${Math.round(n).toLocaleString()} ден`;
      default:    return `$${n.toFixed(2)}`;
    }
  }

  return (
    <SettingsContext.Provider value={{ currency, language, setCurrency, setLanguage, t, fmt }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext);
}
