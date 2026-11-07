import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Locale } from '../core/types';
import { loadSettings } from '../data/localRepositories';

const LOADERS: Record<Locale, () => Promise<{ default: object }>> = {
  fr: () => import('./fr.json'),
  en: () => import('./en.json'),
};

/** Seule la langue active est chargée : les textes pèsent lourd au démarrage sur mobile. */
export async function initI18n(): Promise<void> {
  const lng = loadSettings().locale;
  const { default: translation } = await LOADERS[lng]();
  await i18n.use(initReactI18next).init({
    resources: { [lng]: { translation } },
    lng,
    fallbackLng: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export async function switchLocale(locale: Locale): Promise<void> {
  if (!i18n.hasResourceBundle(locale, 'translation')) {
    const { default: translation } = await LOADERS[locale]();
    i18n.addResourceBundle(locale, 'translation', translation);
  }
  await i18n.changeLanguage(locale);
}

export default i18n;
