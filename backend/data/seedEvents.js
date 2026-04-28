/**
 * seedEvents.js
 * A pool of 20 demo events — mix of genuine emergencies and obvious spam/fakes.
 * The seed endpoint randomly picks up to 10 and runs them through SpamFilter.
 * This demonstrates the filter system live to judges.
 */

const EVENT_POOL = [
  // ── GENUINE EMERGENCIES ───────────────────────────────────────────────────
  {
    text: 'Airstrike warning sirens activated in Sector 4. Communications are down, relying on mesh. Seek underground shelter immediately.',
    type: 'incident', urgency: 'critical',
    lat: 23.2620, lon: 77.4150,
    user_id: 'verified_user_1', trust: 0.85,
    confirmations: 5, fakes: 0,
    genuine: true,
  },
  {
    text: 'Massive earthquake aftershock felt. Main bridge collapsed. Several cars trapped under debris. Need heavy rescue equipment.',
    type: 'accident', urgency: 'high',
    lat: 23.2580, lon: 77.4110,
    user_id: 'verified_user_2', trust: 0.75,
    confirmations: 3, fakes: 0,
    genuine: true,
  },
  {
    text: 'Government has imposed total internet blackout. Protests turning violent near the main square. Stay away from the central district.',
    type: 'police', urgency: 'critical',
    lat: 23.2640, lon: 77.4180,
    user_id: 'verified_user_3', trust: 0.90,
    confirmations: 4, fakes: 0,
    genuine: true,
  },
  {
    text: 'Flash floods have breached the eastern dam. Water levels rising 2 feet per hour. Evacuate to higher ground immediately.',
    type: 'flood', urgency: 'high',
    lat: 23.2550, lon: 77.4080,
    user_id: 'verified_user_4', trust: 0.70,
    confirmations: 2, fakes: 0,
    genuine: true,
  },
  {
    text: 'Chemical plant explosion on the outskirts. Yellow toxic smoke spreading south. Keep windows sealed and wear masks.',
    type: 'hazmat', urgency: 'high',
    lat: 23.2530, lon: 77.4050,
    user_id: 'verified_user_5', trust: 0.65,
    confirmations: 2, fakes: 1,
    genuine: true,
  },
  {
    text: 'Makeshift triage center set up at the community hall. We have 14 injured from the blasts, running low on medical supplies.',
    type: 'medical', urgency: 'medium',
    lat: 23.2600, lon: 77.4170,
    user_id: 'verified_user_6', trust: 0.60,
    confirmations: 1, fakes: 0,
    genuine: true,
  },
  {
    text: 'Armed militia spotted setting up roadblocks on Highway 7. Do not attempt to leave the city via the northern route.',
    type: 'police', urgency: 'high',
    lat: 23.2570, lon: 77.4130,
    user_id: 'demo_user_7', trust: 0.55,
    confirmations: 1, fakes: 0,
    genuine: true,
  },
  {
    text: 'Power grid is completely down. Cell towers failing. We are switching all communications to the local CrisisLink mesh network.',
    type: 'incident', urgency: 'medium',
    lat: 23.2650, lon: 77.4200,
    user_id: 'demo_user_8', trust: 0.50,
    confirmations: 1, fakes: 2,
    genuine: true,
  },

  // ── SPAM / FAKE REPORTS (filter should catch these) ───────────────────────
  {
    text: 'test',
    type: 'incident', urgency: 'low',
    lat: 23.2610, lon: 77.4140,
    user_id: 'spammer_1', trust: 0.10,
    confirmations: 0, fakes: 3,
    genuine: false,
    expectedBlock: 'Message too short',
  },
  {
    text: 'testing testing testing testing testing testing',
    type: 'incident', urgency: 'low',
    lat: 23.2610, lon: 77.4140,
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
    lat: 23.2610, lon: 77.4140,
    user_id: 'spammer_5', trust: 0.05,
    confirmations: 0, fakes: 5,
    genuine: false,
    expectedBlock: 'Spam keyword',
  },
  {
    text: 'FAKE FAKE FAKE FAKE FAKE',
    type: 'incident', urgency: 'low',
    lat: 23.2610, lon: 77.4140,
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
