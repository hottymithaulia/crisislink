/**
 * seedEvents.js
 * A pool of 20 demo events — mix of genuine emergencies and obvious spam/fakes.
 * The seed endpoint randomly picks up to 10 and runs them through SpamFilter.
 * This demonstrates the filter system live to judges.
 */

const EVENT_POOL = [
  // ── GENUINE EMERGENCIES ───────────────────────────────────────────────────
  {
    text: 'Building fire on 4th floor, Saket Complex. Heavy smoke visible from street. People evacuating now.',
    type: 'fire', urgency: 'critical',
    lat: 19.9780, lon: 75.8470,
    user_id: 'verified_user_1', trust: 0.85,
    confirmations: 5, fakes: 0,
    genuine: true,
  },
  {
    text: 'Major car accident near City Mall intersection. Two vehicles involved. Someone is unconscious, urgent medical help needed.',
    type: 'accident', urgency: 'high',
    lat: 19.9745, lon: 75.8430,
    user_id: 'verified_user_2', trust: 0.75,
    confirmations: 3, fakes: 0,
    genuine: true,
  },
  {
    text: 'Person collapsed near Metro Station entrance. Not responding, pulse is weak. Need ambulance immediately.',
    type: 'medical', urgency: 'critical',
    lat: 19.9795, lon: 75.8515,
    user_id: 'verified_user_3', trust: 0.90,
    confirmations: 4, fakes: 0,
    genuine: true,
  },
  {
    text: 'Underpass near Sector 7 completely flooded. Water level at knee height and rising. Multiple vehicles stuck, people wading through.',
    type: 'flood', urgency: 'high',
    lat: 19.9710, lon: 75.8390,
    user_id: 'verified_user_4', trust: 0.70,
    confirmations: 2, fakes: 0,
    genuine: true,
  },
  {
    text: 'Strong smell of gas near Sector 12 market. Shopkeeper reported possible LPG cylinder leak. Area should be evacuated.',
    type: 'hazmat', urgency: 'high',
    lat: 19.9680, lon: 75.8335,
    user_id: 'verified_user_5', trust: 0.65,
    confirmations: 2, fakes: 1,
    genuine: true,
  },
  {
    text: 'Elderly woman fell and injured her hip near Shivaji Park gate. Cannot get up, needs medical assistance.',
    type: 'medical', urgency: 'medium',
    lat: 19.9755, lon: 75.8500,
    user_id: 'verified_user_6', trust: 0.60,
    confirmations: 1, fakes: 0,
    genuine: true,
  },
  {
    text: 'Transformer explosion near residential block C. Power outage in 3 buildings. Small fire visible at transformer box.',
    type: 'hazmat', urgency: 'high',
    lat: 19.9730, lon: 75.8455,
    user_id: 'demo_user_7', trust: 0.55,
    confirmations: 1, fakes: 0,
    genuine: true,
  },
  {
    text: 'Brawl outside the dhaba near NH-7. Around 8 people involved, police needed urgently.',
    type: 'police', urgency: 'medium',
    lat: 19.9800, lon: 75.8540,
    user_id: 'demo_user_8', trust: 0.50,
    confirmations: 1, fakes: 2,
    genuine: true,
  },

  // ── SPAM / FAKE REPORTS (filter should catch these) ───────────────────────
  {
    text: 'test',
    type: 'incident', urgency: 'low',
    lat: 19.9762, lon: 75.8456,
    user_id: 'spammer_1', trust: 0.10,
    confirmations: 0, fakes: 3,
    genuine: false,
    expectedBlock: 'Message too short',
  },
  {
    text: 'testing testing testing testing testing testing',
    type: 'incident', urgency: 'low',
    lat: 19.9762, lon: 75.8456,
    user_id: 'spammer_2', trust: 0.10,
    confirmations: 0, fakes: 2,
    genuine: false,
    expectedBlock: 'Spam keyword / repeated words',
  },
  {
    text: 'asdfghjkl',
    type: 'incident', urgency: 'low',
    lat: 0, lon: 0,  // null island
    user_id: 'spammer_3', trust: 0.05,
    confirmations: 0, fakes: 4,
    genuine: false,
    expectedBlock: 'Spam pattern + null island coordinates',
  },
  {
    text: 'accident in bhopal at main chowk very bad accident happened',
    type: 'accident', urgency: 'high',
    lat: 23.2599, lon: 77.4126,  // Bhopal — far from demo centre
    user_id: 'spammer_4', trust: 0.15,
    confirmations: 0, fakes: 1,
    genuine: false,
    expectedBlock: null,  // passes filter (legit text) — flagged as unverified only
  },
  {
    text: 'lol lol lol',
    type: 'incident', urgency: 'low',
    lat: 19.9762, lon: 75.8456,
    user_id: 'spammer_5', trust: 0.05,
    confirmations: 0, fakes: 5,
    genuine: false,
    expectedBlock: 'Spam keyword',
  },
  {
    text: 'FAKE FAKE FAKE FAKE FAKE',
    type: 'incident', urgency: 'low',
    lat: 19.9762, lon: 75.8456,
    user_id: 'spammer_6', trust: 0.05,
    confirmations: 0, fakes: 3,
    genuine: false,
    expectedBlock: 'Spam keyword detected: fake alert',
  },
];

/**
 * Get a random selection of events from the pool.
 * @param {number} count - How many to pick (max 10)
 * @returns {Array} Shuffled subset
 */
function getRandomEvents(count = 10) {
  const shuffled = [...EVENT_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, 10));
}

module.exports = { EVENT_POOL, getRandomEvents };
