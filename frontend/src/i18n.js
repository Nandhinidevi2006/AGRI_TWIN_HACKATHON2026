import en from './locales/en.json';
import ta from './locales/ta.json';
import hi from './locales/hi.json';

const locales = { en, ta, hi };

/**
 * Retrieve localized strings for a given language and namespace.
 * @param {string} lang - Language code ('en', 'ta', 'hi').
 * @param {string} namespace - Component namespace, e.g., 'dashboard'.
 * @returns {object} - Object containing string mappings.
 */
export function getStrings(lang, namespace) {
  const selected = locales[lang] ?? locales.en;
  return selected[namespace] ?? {};
}
