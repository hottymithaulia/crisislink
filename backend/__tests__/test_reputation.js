/**
 * Test: ReputationEngine
 * Tests trust score calculation and reputation management
 */

const PingEvent = require('../PingEvent');
const EventStore = require('../EventStore');
const ReputationEngine = require('../ReputationEngine');

function runTests() {
  console.log('=== TEST: ReputationEngine ===\n');
  
  const reputation = new ReputationEngine();
  const store = new EventStore();
  let passCount = 0;
  let failCount = 0;

  // Test 1: New user starts at 50%
  console.log('TEST 1: New user reputation');
  const userId1 = 'user_new';
  const userRep1 = store.getUserReputation(userId1);
  const score1 = reputation.calculateScore(userId1, userRep1);
  const percent1 = reputation.getPercentage(score1);
  console.log(`  New user score: ${score1} (${percent1}%)`);
  
  if (score1 === 0.5) {
    console.log('  ✓ PASS: New users start at 50%\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected 0.5 (50%)\n');
    failCount++;
  }

  // Test 2: 8 confirmations out of 8 posts = 80%
  console.log('TEST 2: 8 confirmations');
  const userId2 = 'user_8confirm';
  store.userReputation.set(userId2, { confirmed: 8, fakes: 0, total: 8 });
  const score2 = reputation.calculateScore(userId2, store.getUserReputation(userId2));
  const percent2 = reputation.getPercentage(score2);
  console.log(`  8 confirmations score: ${score2} (${percent2}%)`);
  
  if (percent2 === 80) {
    console.log('  ✓ PASS: 8 confirmations = 80%\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected 80%\n');
    failCount++;
  }

  // Test 3: 5 fakes out of 5 posts = 0% (harsh penalty)
  console.log('TEST 3: 5 fakes (penalty)');
  const userId3 = 'user_5fake';
  store.userReputation.set(userId3, { confirmed: 0, fakes: 5, total: 5 });
  const score3 = reputation.calculateScore(userId3, store.getUserReputation(userId3));
  const percent3 = reputation.getPercentage(score3);
  console.log(`  5 fakes score: ${score3} (${percent3}%)`);
  
  if (percent3 === 0) {
    console.log('  ✓ PASS: All fakes = 0% (harsh penalty)\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected 0%\n');
    failCount++;
  }

  // Test 4: Mixed (6 confirm, 4 fake) out of 10 = 20%
  console.log('TEST 4: Mixed results');
  const userId4 = 'user_mixed';
  store.userReputation.set(userId4, { confirmed: 6, fakes: 4, total: 10 });
  const score4 = reputation.calculateScore(userId4, store.getUserReputation(userId4));
  const percent4 = reputation.getPercentage(score4);
  console.log(`  6 confirm, 4 fake score: ${score4} (${percent4}%)`);
  
  if (percent4 === 20) {
    console.log('  ✓ PASS: Mixed results = 20%\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected 20%\n');
    failCount++;
  }

  // Test 5: Display tiers
  console.log('TEST 5: Display tiers');
  const tier1 = reputation.getDisplayTier(0.9); // Trusted
  const tier2 = reputation.getDisplayTier(0.6); // Neutral
  const tier3 = reputation.getDisplayTier(0.3); // Unverified
  
  console.log(`  90% tier: ${tier1.tier} (${tier1.label}) - ${tier1.color}`);
  console.log(`  60% tier: ${tier2.tier} (${tier2.label}) - ${tier2.color}`);
  console.log(`  30% tier: ${tier3.tier} (${tier3.label}) - ${tier3.color}`);
  
  if (tier1.tier === 'trusted' && tier2.tier === 'neutral' && tier3.tier === 'unverified') {
    console.log('  ✓ PASS: Display tiers correct\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Tiers incorrect\n');
    failCount++;
  }

  // Test 6: Add confirmation via engine
  console.log('TEST 6: Add confirmation via engine');
  const event6 = new PingEvent({
    user_id: 'user_confirm_test',
    type: 'accident',
    text: 'Test event for confirmation'
  });
  store.addEvent(event6);
  
  const result = reputation.addConfirmation(event6.id, event6.user_id, store);
  console.log(`  Confirmation added, count: ${result.confirmations}`);
  console.log(`  Author reputation: ${result.authorReputationPercent}%`);
  
  if (result.confirmations >= 1) {
    console.log('  ✓ PASS: Confirmation added\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Confirmation not added\n');
    failCount++;
  }

  // Test 7: Add fake report via engine
  console.log('TEST 7: Add fake report via engine');
  const event7 = new PingEvent({
    user_id: 'user_fake_test',
    type: 'accident',
    text: 'Test event for fake report'
  });
  store.addEvent(event7);
  
  // Set up reputation first
  store.userReputation.set(event7.user_id, { confirmed: 0, fakes: 0, total: 1 });
  
  const result7 = reputation.addFakeReport(event7.id, event7.user_id, store);
  console.log(`  Fake report added, count: ${result7.fakes}`);
  console.log(`  Author reputation: ${result7.authorReputationPercent}%`);
  
  if (result7.fakes >= 1) {
    console.log('  ✓ PASS: Fake report added\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Fake report not added\n');
    failCount++;
  }

  // Test 8: Event not found error
  console.log('TEST 8: Event not found handling');
  try {
    reputation.addConfirmation('non_existent_id', 'user_test', store);
    console.log('  ✗ FAIL: Should have thrown error\n');
    failCount++;
  } catch (error) {
    console.log(`  Error caught: ${error.message}`);
    console.log('  ✓ PASS: Error thrown for non-existent event\n');
    passCount++;
  }

  // Summary
  console.log('=== RESULTS ===');
  console.log(`Passed: ${passCount}/${passCount + failCount}`);
  console.log(`Failed: ${failCount}/${passCount + failCount}`);
  
  if (failCount === 0) {
    console.log('\n✅ ALL TESTS PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests();
