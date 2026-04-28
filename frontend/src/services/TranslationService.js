/**
 * TranslationService.js
 * Free translation via MyMemory API — no API key, 5000 requests/day.
 * Falls back to original text gracefully when offline.
 */

const BASE_URL = 'https://api.mymemory.translated.net/get';

// Cache to avoid re-translating same text
const cache = new Map();

/**
 * Translate text from one language to another.
 * @param {string} text - Text to translate
 * @param {string} fromLang - Source language code (e.g. 'hi', 'en')
 * @param {string} toLang - Target language code (e.g. 'en', 'hi')
 * @returns {Promise<{translated: string, success: boolean}>}
 */
export async function translate(text, fromLang = 'hi', toLang = 'en') {
  if (!text || !text.trim()) return { translated: text, success: false };
  if (fromLang === toLang) return { translated: text, success: true };

  const cacheKey = `${fromLang}|${toLang}|${text}`;
  if (cache.has(cacheKey)) {
    return { translated: cache.get(cacheKey), success: true };
  }

  try {
    const params = new URLSearchParams({
      q: text.trim(),
      langpair: `${fromLang}|${toLang}`,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${BASE_URL}?${params}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const result = data.responseData.translatedText;
      cache.set(cacheKey, result);
      return { translated: result, success: true };
    }
    throw new Error('Bad response');
  } catch (err) {
    console.warn('TranslationService: offline or error, returning original', err.message);
    return { translated: text, success: false };
  }
}

/**
 * Language metadata for display
 */
export const LANGUAGES = [
  { code: 'en-US', lang: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'hi-IN', lang: 'hi', label: 'Hindi',      flag: '🇮🇳' },
  { code: 'ta-IN', lang: 'ta', label: 'Tamil',      flag: '🇮🇳' },
  { code: 'te-IN', lang: 'te', label: 'Telugu',     flag: '🇮🇳' },
  { code: 'kn-IN', lang: 'kn', label: 'Kannada',    flag: '🇮🇳' },
  { code: 'mr-IN', lang: 'mr', label: 'Marathi',    flag: '🇮🇳' },
  { code: 'bn-IN', lang: 'bn', label: 'Bengali',    flag: '🇮🇳' },
  { code: 'es-ES', lang: 'es', label: 'Spanish',    flag: '🇪🇸' },
  { code: 'fr-FR', lang: 'fr', label: 'French',     flag: '🇫🇷' },
  { code: 'ar-SA', lang: 'ar', label: 'Arabic',     flag: '🇸🇦' },
  { code: 'de-DE', lang: 'de', label: 'German',     flag: '🇩🇪' },
  { code: 'zh-CN', lang: 'zh', label: 'Mandarin',   flag: '🇨🇳' },
  { code: 'pt-BR', lang: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'ja-JP', lang: 'ja', label: 'Japanese',   flag: '🇯🇵' },
];

/** Get 2-letter lang code from full locale (e.g. 'hi-IN' → 'hi') */
export function getLangCode(locale) {
  return locale ? locale.split('-')[0] : 'en';
}

/** Get browser's preferred language code */
export function getBrowserLang() {
  const nav = navigator.language || 'en-US';
  return getLangCode(nav);
}

const TranslationService = { translate, LANGUAGES, getLangCode, getBrowserLang };
export default TranslationService;
