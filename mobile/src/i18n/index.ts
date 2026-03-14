/**
 * i18n Configuration - Multi-language support with dynamic loading
 *
 * Supports 12 Indian languages. The first 5 (en, hi, ta, te, mr) are bundled
 * locally for instant access. The remaining 7 are loaded on-demand via the
 * Sarvam Translation API and cached in AsyncStorage for offline use.
 */

import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Bundled translation files
import en from './en.json';
import hi from './hi.json';
import ta from './ta.json';
import te from './te.json';
import mr from './mr.json';

// ---------------------------------------------------------------------------
// API Base URL (mirrors the pattern in services/api.ts)
// ---------------------------------------------------------------------------
const API_BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:8000'
    : 'http://localhost:8000'
  : 'https://api.nano.app';

// ---------------------------------------------------------------------------
// AsyncStorage key prefix for cached translation bundles
// ---------------------------------------------------------------------------
const CACHE_KEY_PREFIX = '@i18n_bundle_';

// ---------------------------------------------------------------------------
// Pre-loaded (bundled) resources
// ---------------------------------------------------------------------------
const resources: Record<string, { translation: Record<string, any> }> = {
  en: { translation: en },
  hi: { translation: hi },
  ta: { translation: ta },
  te: { translation: te },
  mr: { translation: mr },
};

// ---------------------------------------------------------------------------
// Language metadata
// ---------------------------------------------------------------------------
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  /** true if the translation JSON is bundled in the app binary */
  bundled: boolean;
}

export const LANGUAGES: Language[] = [
  // Bundled languages (shipped with the app)
  { code: 'en', name: 'English', nativeName: 'English', bundled: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', bundled: true },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bundled: true },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bundled: true },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', bundled: true },

  // Dynamic languages (downloaded on-demand via Sarvam API)
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', bundled: false },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', bundled: false },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', bundled: false },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', bundled: false },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', bundled: false },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', bundled: false },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', bundled: false },
];

// ---------------------------------------------------------------------------
// Helper: flatten a nested JSON object into dot-separated key/value pairs
// e.g. { a: { b: "hello" } } => { "a.b": "hello" }
// ---------------------------------------------------------------------------
const flattenObject = (
  obj: Record<string, any>,
  prefix = '',
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(result, flattenObject(obj[key], fullKey));
    } else {
      result[fullKey] = String(obj[key]);
    }
  }
  return result;
};

// ---------------------------------------------------------------------------
// Helper: unflatten dot-separated keys back into a nested object
// e.g. { "a.b": "hello" } => { a: { b: "hello" } }
// ---------------------------------------------------------------------------
const unflattenObject = (
  flat: Record<string, string>,
): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
};

// ---------------------------------------------------------------------------
// loadLanguage(langCode)
//
// Ensures the translation bundle for `langCode` is available in i18next.
// - For bundled languages: returns true immediately (already in memory).
// - For dynamic languages: checks AsyncStorage cache first, then falls back
//   to the Sarvam Translation API batch endpoint.
// - Translated bundles are persisted in AsyncStorage for offline access.
//
// Returns true on success, false on failure.
// ---------------------------------------------------------------------------
export const loadLanguage = async (langCode: string): Promise<boolean> => {
  // Already loaded in i18next (bundled or previously fetched this session)
  if (i18n.hasResourceBundle(langCode, 'translation')) {
    return true;
  }

  const lang = LANGUAGES.find((l) => l.code === langCode);
  if (!lang) {
    console.warn(`[i18n] Unknown language code: ${langCode}`);
    return false;
  }

  // Bundled languages should already be registered; treat as success
  if (lang.bundled) {
    return true;
  }

  // ---- Try AsyncStorage cache first ----
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${langCode}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      i18n.addResourceBundle(langCode, 'translation', parsed, true, true);
      console.log(`[i18n] Loaded ${langCode} from cache`);
      return true;
    }
  } catch (err) {
    console.warn(`[i18n] Cache read failed for ${langCode}:`, err);
    // Continue to API fallback
  }

  // ---- Fetch from Sarvam Translation API ----
  try {
    // Flatten the English bundle into an array of strings for batch translation
    const flatEn = flattenObject(en);
    const keys = Object.keys(flatEn);
    const values = Object.values(flatEn);

    const response = await fetch(`${API_BASE_URL}/ai/translate/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: values,
        source_language: 'en',
        target_language: langCode,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }

    const data = await response.json();
    const translatedTexts: string[] = data.translated_texts ?? data.translations ?? [];

    if (translatedTexts.length !== keys.length) {
      throw new Error(
        `Translation count mismatch: expected ${keys.length}, got ${translatedTexts.length}`,
      );
    }

    // Rebuild the nested translation object
    const flatTranslated: Record<string, string> = {};
    keys.forEach((key, idx) => {
      flatTranslated[key] = translatedTexts[idx];
    });
    const translationBundle = unflattenObject(flatTranslated);

    // Register with i18next
    i18n.addResourceBundle(langCode, 'translation', translationBundle, true, true);

    // Persist to AsyncStorage for offline access
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${langCode}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(translationBundle));
      console.log(`[i18n] Cached ${langCode} translation bundle`);
    } catch (cacheErr) {
      console.warn(`[i18n] Failed to cache ${langCode}:`, cacheErr);
      // Non-fatal: the bundle is still loaded in memory
    }

    console.log(`[i18n] Loaded ${langCode} from API`);
    return true;
  } catch (err) {
    console.error(`[i18n] Failed to load ${langCode}:`, err);
    return false;
  }
};

// ---------------------------------------------------------------------------
// changeLanguage(langCode)
//
// High-level helper that loads the bundle (if needed) and then switches the
// active language. Returns true if the switch was successful.
// ---------------------------------------------------------------------------
export const changeLanguage = async (langCode: string): Promise<boolean> => {
  const loaded = await loadLanguage(langCode);
  if (!loaded) {
    console.error(`[i18n] Cannot switch to ${langCode}: bundle not available`);
    return false;
  }

  await i18n.changeLanguage(langCode);
  console.log(`[i18n] Language changed to ${langCode}`);
  return true;
};

// ---------------------------------------------------------------------------
// Initialise i18next
// ---------------------------------------------------------------------------
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
