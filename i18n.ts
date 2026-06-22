import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import ja from './locales/ja.json';

const LANG_KEY = '@kippy_language';

function deviceLang(): string {
  const tag = Localization.getLocales()[0]?.languageTag ?? 'en';
  if (tag.startsWith('zh')) return 'zh-CN';
  if (tag.startsWith('ja')) return 'ja';
  return 'en';
}

// Synchronous init — resources are bundled so this resolves immediately.
// The app can use useTranslation() straight away; applyPersistedLanguage()
// updates the active locale once AsyncStorage resolves.
i18next.use(initReactI18next).init({
  lng: deviceLang(),
  fallbackLng: 'en',
  resources: {
    en:      { translation: en },
    'zh-CN': { translation: zhCN },
    ja:      { translation: ja },
  },
  interpolation: { escapeValue: false },
});

export async function applyPersistedLanguage(): Promise<void> {
  const saved = await AsyncStorage.getItem(LANG_KEY);
  if (saved && saved !== i18next.language) {
    await i18next.changeLanguage(saved);
  }
}

export async function changeLanguage(lang: string): Promise<void> {
  await i18next.changeLanguage(lang);
  await AsyncStorage.setItem(LANG_KEY, lang);
}

export default i18next;
