/**
 * SpamFilter.js
 * Multi-layer spam/false-report detection for CrisisLink.
 * Checks: keyword spam, too-short text, all-caps shouting, repeated chars,
 * and geographic plausibility.
 */

// ── Known spam phrases & patterns ────────────────────────────────────────────
const SPAM_KEYWORDS = [
  'test', 'testing', 'asdf', 'qwerty', 'asdfgh', 'zxcvbn',
  'hello', 'hi there', 'lol', 'haha', 'lmao', 'xyz',
  'blah', 'foo', 'bar', 'baz', 'nothing', 'ignore this',
  'fake alert', 'this is fake', 'not real',
];

const SPAM_PATTERNS = [
  /^[a-z]{1,3}\s*[a-z]{1,3}$/i,            // "ab cd" — too vague
  /^(.)\1{4,}/,                              // "aaaaaaa..." repeated char
  /^[^a-zA-Z\u0900-\u097F]*$/,              // Only numbers/symbols (no text/Hindi)
  /^[0-9\s]+$/,                             // Pure numbers
];

// Words that signal a real emergency (whitelist fast-pass)
const EMERGENCY_WORDS = [
  'fire', 'accident', 'flood', 'medical', 'help', 'emergency', 'police',
  'ambulance', 'injured', 'unconscious', 'collapsed', 'danger', 'urgent',
  'rescue', 'trapped', 'explosion', 'gas leak', 'shooting', 'theft',
  // Hindi emergency words
  'आग', 'दुर्घटना', 'बाढ़', 'मदद', 'चोट', 'खतरा', 'पुलिस', 'अस्पताल',
];

/**
 * Check if text is spam
 * @param {string} text
 * @returns {{ spam: boolean, reason: string|null, confidence: number }}
 */
function analyze(text) {
  if (!text || typeof text !== 'string') {
    return { spam: true, reason: 'Empty or invalid text', confidence: 1.0 };
  }

  const trimmed = text.trim();
  const lower   = trimmed.toLowerCase();

  // ── Hard blocks ────────────────────────────────────────────────────────────
  if (trimmed.length < 8) {
    return { spam: true, reason: 'Message too short (min 8 characters)', confidence: 1.0 };
  }

  for (const kw of SPAM_KEYWORDS) {
    if (lower === kw || lower.startsWith(kw + ' ') || lower.endsWith(' ' + kw)) {
      return { spam: true, reason: `Spam keyword detected: "${kw}"`, confidence: 0.95 };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { spam: true, reason: 'Message matches spam pattern', confidence: 0.9 };
    }
  }

  // ── Emergency whitelist ────────────────────────────────────────────────────
  const hasEmergencyWord = EMERGENCY_WORDS.some(w => lower.includes(w.toLowerCase()));
  if (hasEmergencyWord && trimmed.length >= 15) {
    return { spam: false, reason: null, confidence: 0.05 };
  }

  // ── Suspicion scoring ──────────────────────────────────────────────────────
  let suspicion = 0;

  // Repeated words
  const words = lower.split(/\s+/);
  const unique = new Set(words);
  if (words.length > 3 && unique.size / words.length < 0.5) {
    suspicion += 0.35; // lots of repeated words
  }

  // No punctuation or spaces at all
  if (!/[\s,.]/.test(trimmed) && trimmed.length < 20) {
    suspicion += 0.2;
  }

  // Mostly uppercase (shouting, not emergency)
  const upperRatio = (trimmed.match(/[A-Z]/g) || []).length / Math.max(trimmed.length, 1);
  if (upperRatio > 0.7 && trimmed.length > 5) {
    suspicion += 0.15;
  }

  if (suspicion >= 0.5) {
    return { spam: true, reason: 'Message appears to be spam or non-emergency', confidence: suspicion };
  }

  return { spam: false, reason: null, confidence: suspicion };
}

/**
 * Check geographic plausibility.
 * If coordinates are obviously wrong (ocean, null island, etc.) flag them.
 * @param {number} lat @param {number} lon
 * @returns {{ valid: boolean, reason: string|null }}
 */
function checkCoordinates(lat, lon) {
  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, reason: 'Invalid coordinates' };
  }
  // Null island (0,0) ± 1 degree
  if (Math.abs(lat) < 1 && Math.abs(lon) < 1) {
    return { valid: false, reason: 'Coordinates at null island (0,0)' };
  }
  // Valid lat/lon range
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { valid: false, reason: 'Coordinates out of valid range' };
  }
  return { valid: true, reason: null };
}

module.exports = { analyze, checkCoordinates };
