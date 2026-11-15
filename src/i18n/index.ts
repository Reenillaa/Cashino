import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { getLocales } from 'expo-localization';
import es from './es';
import en from './en';

export type Lang = 'es' | 'en';
export const LANGS: Lang[] = ['es', 'en'];

export function deviceLanguage(): Lang {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'es' ? 'es' : 'en';
  } catch {
    return 'es';
  }
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { es: { translation: es }, en: { translation: en } },
    lng: deviceLanguage(),
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
    returnObjects: true,
  });
}

export function setLanguage(pref: Lang | 'system') {
  const lng = pref === 'system' ? deviceLanguage() : pref;
  if (i18n.language !== lng) void i18n.changeLanguage(lng);
}

/** Picks the right language from inline bilingual content ({ es, en }). */
export function tr<T>(content: { es: T; en: T }, lang?: string): T {
  const l = (lang ?? i18n.language) as Lang;
  return l === 'en' ? content.en : content.es;
}

export function useT() {
  const { t, i18n: inst } = useTranslation();
  return { t, lang: (inst.language === 'en' ? 'en' : 'es') as Lang };
}

export default i18n;
