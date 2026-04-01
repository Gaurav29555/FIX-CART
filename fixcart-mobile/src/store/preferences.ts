import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { LanguageCode } from '../i18n/translations';

const LANGUAGE_KEY = 'fixcart_language';
const CURRENCY_KEY = 'fixcart_currency';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'CAD' | 'AUD';

interface PreferencesState {
  language: LanguageCode;
  currency: CurrencyCode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (language: LanguageCode) => Promise<void>;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: 'en',
  currency: 'INR',
  hydrated: false,
  hydrate: async () => {
    const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
    const storedCurrency = await SecureStore.getItemAsync(CURRENCY_KEY);
    set({
      language: (stored as LanguageCode) || 'en',
      currency: (storedCurrency as CurrencyCode) || 'INR',
      hydrated: true,
    });
  },
  setLanguage: async (language) => {
    await SecureStore.setItemAsync(LANGUAGE_KEY, language);
    set({ language });
  },
  setCurrency: async (currency) => {
    await SecureStore.setItemAsync(CURRENCY_KEY, currency);
    set({ currency });
  },
}));
