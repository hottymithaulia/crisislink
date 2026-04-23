/**
 * Test: EscalationTimer
 * Tests automatic escalation of events over time
 */

const PingEvent = require('../PingEvent');
const EventStore = require('../EventStore');
const EscalationTimer = require('../EscalationTimer');

function runTests() {
  console.log('=== TEST: EscalationTimer ===\n');
  
  const store = new EventStore();
  const escalation = new EscalationTimer();
  let passCount = 0;
  let failCount = 0;

  // Test 1: Event 2 minutes old - hyperlocal
  console.log('TEST 1: 2-minute-old event');
  const event1 = new PingEvent({
    user_id: 'user_test',
    type: 'accident',
    text: 'Test event 2 min old',
    timestamp: Date.now() - (2 * 60 * 1000) // 2 minutes ago
  });
  store.addEvent(event1);
  escalation.checkAndEscalate(store);
  
  console.log(`  Age: ${event1.getAgeMinutes()} minutes`);
  console.log(`  State: ${event1.escalation_state}`);
  console.log(`  Radius: ${event1.current_radius_km} km`);
  console.log(`  Color: ${escalation.getColor(event1)}`);
  
  if (event1.escalation_state === 'hyperlocal' && event1.current_radius_km === 1) {
    console.log('  ✓ PASS: 2-min event is hyperlocal\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected hyperlocal state with 1km radius\n');
    failCount++;
  }

  // Test 2: Event 8 minutes old - neighborhood
  console.log('TEST 2: 8-minute-old event');
  const event2 = new PingEvent({
    user_id: 'user_test',
    type: 'fire',
    text: 'Test event 8 min old',
    timestamp: Date.now() - (8 * 60 * 1000) // 8 minutes ago
  });
  store.addEvent(event2);
  escalation.checkAndEscalate(store);
  
  console.log(`  Age: ${event2.getAgeMinutes()} minutes`);
  console.log(`  State: ${event2.escalation_state}`);
  console.log(`  Radius: ${event2.current_radius_km} km`);
  console.log(`  Color: ${escalation.getColor(event2)}`);
  
  if (event2.escalation_state === 'neighborhood' && event2.current_radius_km === 5) {
    console.log('  ✓ PASS: 8-min event is neighborhood\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected neighborhood state with 5km radius\n');
    failCount++;
  }

  // Test 3: Event 20 minutes old - unresolved
  console.log('TEST 3: 20-minute-old event');
  const event3 = new PingEvent({
    user_id: 'user_test',
    type: 'medical',
    text: 'Test event 20 min old',
    timestamp: Date.now() - (20 * 60 * 1000) // 20 minutes ago
  });
  store.addEvent(event3);
  escalation.checkAndEscalate(store);
  
  console.log(`  Age: ${event3.getAgeMinutes()} minutes`);
  console.log(`  State: ${event3.escalation_state}`);
  console.log(`  Radius: ${event3.current_radius_km} km`);
  console.log(`  Color: ${escalation.getColor(event3)}`);
  console.log(`  Cloud escalation: ${event3.needs_cloud_escalation}`);
  
  if (event3.escalation_state === 'unresolved' && 
      event3.current_radius_km === 25 && 
      event3.needs_cloud_escalation === true) {
    console.log('  ✓ PASS: 20-min event is unresolved with cloud escalation\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected unresolved state with 25km and cloud escalation\n');
    failCount++;
  }

  // Test 4: Get label for event
  console.log('TEST 4: Event label generation');
  const label = escalation.getLabel(event1);
  console.log(`  Label: ${label}`);
  
  if (label.includes('Hyperlocal') && label.includes('Posted')) {
    console.log('  ✓ PASS: Label generated correctly\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Label format incorrect\n');
    failCount++;
  }

  // Test 5: Stage info lookup
  console.log('TEST 5: Stage info lookup');
  const stageInfo = escalation.getStageInfo('neighborhood');
  console.log(`  Neighborhood stage: ${JSON.stringify(stageInfo)}`);
  
  if (stageInfo.radiusKm === 5 && stageInfo.color === '#f59e0b') {
    console.log('  ✓ PASS: Stage info correct\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Stage info incorrect\n');
    failCount++;
  }

  // Test 6: Time until next escalation
  console.log('TEST 6: Time until next escalation');
  const timeInfo = escalation.getTimeUntilNextEscalation(event1);
  console.log(`  Minutes until next: ${timeInfo.minutesUntilNext}`);
  console.log(`  Next stage: ${timeInfo.nextStage}`);
  
  if (timeInfo.minutesUntilNext !== null && timeInfo.minutesUntilNext <= 3) {
    console.log('  ✓ PASS: Time until escalation calculated\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Time calculation incorrect\n');
    failCount++;
  }

  // Test 7: Visibility check
  console.log('TEST 7: Visibility at distance');
  const visible = escalation.isVisibleAtDistance(event2, 3); // 3km from event2
  const notVisible = escalation.isVisibleAtDistance(event1, 10); // 10km from event1 (only 1km radius)
  
  console.log(`  Event2 visible at 3km: ${visible} (radius: ${event2.current_radius_km}km)`);
  console.log(`  Event1 visible at 10km: ${notVisible} (radius: ${event1.current_radius_km}km)`);
  
  if (visible === true && notVisible === false) {
    console.log('  ✓ PASS: Visibility checks correct\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Visibility checks incorrect\n');
    failCount++;
  }

  // Test 8: Force escalate
  console.log('TEST 8: Force escalate');
  const event8 = new PingEvent({
    user_id: 'user_test',
    type: 'accident',
    text: 'Test event for force escalate'
  });
  store.addEvent(event8);
  
  escalation.forceEscalate(event8, 'unresolved');
  
  console.log(`  Forced to: ${event8.escalation_state}`);
  console.log(`  Radius: ${event8.current_radius_km}km`);
  
  if (event8.escalation_state === 'unresolved' && event8.current_radius_km === 25) {
    console.log('  ✓ PASS: Force escalate worked\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Force escalate failed\n');
    failCount++;
  }

  // Test 9: Invalid force escalate
  console.log('TEST 9: Invalid force escalate');
  try {
    escalation.forceEscalate(event8, 'invalid_stage');
    console.log('  ✗ FAIL: Should have thrown error\n');
    failCount++;
  } catch (error) {
    console.log(`  Error caught: ${error.message}`);
    console.log('  ✓ PASS: Error thrown for invalid stage\n');
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
