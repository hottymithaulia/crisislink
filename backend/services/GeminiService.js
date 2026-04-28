/**
 * GeminiService.js
 * Uses Google Gemini 1.5 Flash to intelligently analyze crisis reports.
 * Replaces keyword-matching with real language understanding:
 *   - Works in ALL languages (Hindi, Tamil, Telugu, Arabic, etc.)
 *   - Detects incident type, urgency, location hints
 *   - Spots spam/jokes/fake reports by tone and context
 *   - Falls back gracefully when no API key is set
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;

let genAI = null;
let model = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  console.log('✨ Gemini 2.5 Flash loaded — smart incident analysis active');
} else {
  console.warn('⚠️  GEMINI_API_KEY not set — falling back to keyword analysis');
}

/**
 * Analyze a crisis report using Gemini.
 * Returns structured data about the incident.
 */
async function analyzeReport(text) {
  // ── Fallback (no API key) ─────────────────────────────────────────────────
  if (!model) {
    return fallbackAnalysis(text);
  }

  const prompt = `
You are an AI safety system for CrisisLink, a real-time hyperlocal emergency platform.
A user has submitted the following report. Analyze it carefully.

REPORT: "${text}"

Respond ONLY with a valid JSON object (no markdown, no explanation) with these fields:

{
  "type": one of ["fire", "accident", "medical", "flood", "police", "hazmat", "incident"],
  "urgency": one of ["critical", "high", "medium", "low"],
  "is_genuine": true or false,
  "spam_reason": null or a short reason if spam/joke/fake,
  "spam_confidence": 0.0 to 1.0 (how confident you are it's spam),
  "location_hint": extracted location name or null if not mentioned,
  "summary": one sentence summary in English (even if report was in another language),
  "lang_detected": ISO 639-1 code of the report language (e.g. "hi", "en", "ta")
}

Rules for is_genuine = false:
- Clearly joking or sarcastic (e.g. "lol there's an accident", "haha fire", "jk someone fell")
- Test messages (e.g. "testing", "hello", "abc", "asdf")
- Threats or obvious misinformation with no emergency context
- Profanity with no actual incident
- Single words with no context
- Repetitive gibberish or incomplete thoughts that lack ANY actionable detail (e.g. "accident accident in the", "fire fire fire")
- Vague statements without a clear crisis (e.g. "something is wrong", "help me please" with no context)

Rules for urgency:
- critical: immediate life threat (fire spreading, person unconscious, building collapse)
- high: serious injury, major accident, crime in progress
- medium: minor injury, suspicious activity, assistance needed
- low: non-urgent report, potential hazard

Note on leniency: Broken sentences are okay IF they contain a noun or detail indicating an actual emergency (e.g., "car crash blood"). If it is just repeated vague words, mark it spam.
`.trim();

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // Strip possible markdown fences
    const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);

    return {
      type:              parsed.type || 'incident',
      urgency:           parsed.urgency || 'medium',
      is_genuine:        parsed.is_genuine !== false,
      spam_reason:       parsed.spam_reason || null,
      spam_confidence:   typeof parsed.spam_confidence === 'number' ? parsed.spam_confidence : 0,
      location_hint:     parsed.location_hint || null,
      summary:           parsed.summary || text,
      lang_detected:     parsed.lang_detected || 'en',
      source:            'gemini',
    };

  } catch (err) {
    console.warn('Gemini analysis failed, using fallback:', err.message);
    return fallbackAnalysis(text);
  }
}

/**
 * Keyword-based fallback when Gemini is not available.
 * Kept as a safety net.
 */
function fallbackAnalysis(text) {
  const t = text.toLowerCase().trim();

  // Spam signals
  const jokePatterns = [/\blol\b/, /\bhaha\b/, /\bjk\b/, /\bj\/k\b/, /\bjust kidding\b/, /\btest\b/, /\basdf\b/, /\bhello\b/];
  const isJoke = jokePatterns.some(p => p.test(t));
  const isTooShort = t.length < 8;
  const isRepeat = /(.)\1{4,}/.test(t);

  const spam_confidence = isJoke ? 0.85 : isTooShort ? 0.7 : isRepeat ? 0.9 : 0;

  // Type detection
  let type = 'incident';
  if (/fire|आग|ᬯᬶᬚᬬ|آتش/.test(t)) type = 'fire';
  else if (/accident|crash|collision|दुर्घटना|حادثة/.test(t)) type = 'accident';
  else if (/medical|hospital|doctor|ambulance|heart|injured|चोट|مريض/.test(t)) type = 'medical';
  else if (/flood|water|बाढ|فيضان/.test(t)) type = 'flood';
  else if (/police|crime|theft|robbery|पुलिस|شرطة/.test(t)) type = 'police';
  else if (/gas|chemical|toxic|hazmat|गैस/.test(t)) type = 'hazmat';

  // Urgency detection
  let urgency = 'medium';
  if (/critical|emergency|dying|unconscious|collapse|blast|explosion/.test(t)) urgency = 'critical';
  else if (/injured|serious|urgent|help|मदद|sos/.test(t)) urgency = 'high';
  else if (/minor|small|possible|suspect/.test(t)) urgency = 'low';

  return {
    type,
    urgency,
    is_genuine: spam_confidence < 0.6,
    spam_reason: isJoke ? 'Appears to be a joke or sarcastic message' : isTooShort ? 'Message too short to be a genuine report' : isRepeat ? 'Repetitive characters detected' : null,
    spam_confidence,
    location_hint: null,
    summary: text,
    lang_detected: 'en',
    source: 'fallback',
  };
}

module.exports = { analyzeReport };
