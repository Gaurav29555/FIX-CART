import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { LanguageCode } from '../i18n/translations';

const LANGUAGE_KEY = 'fixcart_language';

interface PreferencesState {
  language: LanguageCode;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLanguage: (language: LanguageCode) => Promise<void>;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  language: 'en',
  hydrated: false,
  hydrate: async () => {
    const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
    set({
      language: (stored as LanguageCode) || 'en',
      hydrated: true,
    });
  },
  setLanguage: async (language) => {
    await SecureStore.setItemAsync(LANGUAGE_KEY, language);
    set({ language });
  },
}));
