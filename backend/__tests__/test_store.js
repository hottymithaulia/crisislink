/**
 * Test: EventStore
 * Tests event storage, retrieval, and location-based queries
 */

const PingEvent = require('../PingEvent');
const EventStore = require('../EventStore');

function runTests() {
  console.log('=== TEST: EventStore ===\n');
  
  const store = new EventStore();
  let passCount = 0;
  let failCount = 0;

  // Test 1: Create and add events
  console.log('TEST 1: Create and add events');
  const event1 = new PingEvent({
    user_id: 'user_123',
    type: 'accident',
    urgency: 'high',
    text: 'Car accident on Main Street',
    lat: 19.9762,
    lon: 75.8456
  });
  
  const event2 = new PingEvent({
    user_id: 'user_456',
    type: 'fire',
    urgency: 'critical',
    text: 'Building fire on Oak Avenue',
    lat: 19.9800,
    lon: 75.8500
  });
  
  store.addEvent(event1);
  store.addEvent(event2);
  
  console.log(`  Event 1 added: ${event1.id} (type: ${event1.type})`);
  console.log(`  Event 2 added: ${event2.id} (type: ${event2.type})`);
  console.log(`  Created ${store.getEventCount()} events`);
  
  if (store.getEventCount() === 2) {
    console.log('  ✓ PASS: Events created and stored\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected 2 events\n');
    failCount++;
  }

  // Test 2: Query nearby events
  console.log('TEST 2: Query nearby events');
  const nearby = store.getNearbyEvents(19.9762, 75.8456, 5);
  console.log(`  Searching within 5km of (19.9762, 75.8456)`);
  console.log(`  Found ${nearby.length} events`);
  
  if (nearby.length >= 1) {
    console.log(`  First event: ${nearby[0].text}`);
    console.log('  ✓ PASS: Found nearby events\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected at least 1 nearby event\n');
    failCount++;
  }

  // Test 3: Serialize event
  console.log('TEST 3: Serialize event');
  const serialized = event1.serialize();
  const size = event1.getSize();
  console.log(`  Serialized size: ${size} bytes`);
  console.log(`  Serialized (truncated): ${serialized.substring(0, 100)}...`);
  
  if (size > 0 && size < 2000) {
    console.log('  ✓ PASS: Event serialized successfully\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Serialization failed or size too large\n');
    failCount++;
  }

  // Test 4: Deserialize event
  console.log('TEST 4: Deserialize event');
  const deserialized = PingEvent.deserialize(serialized);
  console.log(`  Deserialized: ${deserialized.type} - ${deserialized.text.substring(0, 30)}`);
  console.log(`  ID match: ${deserialized.id === event1.id}`);
  
  if (deserialized && deserialized.id === event1.id && deserialized.type === event1.type) {
    console.log('  ✓ PASS: Event deserialized correctly\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Deserialization failed\n');
    failCount++;
  }

  // Test 5: Get event by ID
  console.log('TEST 5: Get event by ID');
  const foundEvent = store.getEventById(event1.id);
  console.log(`  Searching for: ${event1.id}`);
  console.log(`  Found: ${foundEvent ? foundEvent.text : 'NOT FOUND'}`);
  
  if (foundEvent && foundEvent.id === event1.id) {
    console.log('  ✓ PASS: Found event by ID\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Could not find event by ID\n');
    failCount++;
  }

  // Test 6: Count events
  console.log('TEST 6: Count events');
  const count = store.getEventCount();
  console.log(`  Total events: ${count}`);
  
  if (count === 2) {
    console.log('  ✓ PASS: Count correct\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected count=2\n');
    failCount++;
  }

  // Test 7: User reputation tracking
  console.log('TEST 7: User reputation tracking');
  const userRep = store.getUserReputation('user_123');
  console.log(`  User user_123 reputation: ${JSON.stringify(userRep)}`);
  
  if (userRep.total === 1) {
    console.log('  ✓ PASS: User reputation tracked\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: User reputation not tracked correctly\n');
    failCount++;
  }

  // Test 8: Distance calculation
  console.log('TEST 8: Distance calculation');
  const distance = store.calculateDistance(19.9762, 75.8456, 19.9800, 75.8500);
  console.log(`  Distance between points: ${distance.toFixed(2)} km`);
  
  if (distance > 0 && distance < 10) {
    console.log('  ✓ PASS: Distance calculated correctly\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Distance calculation incorrect\n');
    failCount++;
  }

  // Test 9: Non-existent event
  console.log('TEST 9: Non-existent event lookup');
  const notFound = store.getEventById('non_existent_id');
  console.log(`  Searching for: non_existent_id`);
  console.log(`  Result: ${notFound}`);
  
  if (notFound === null) {
    console.log('  ✓ PASS: Returns null for non-existent events\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Should return null for non-existent events\n');
    failCount++;
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
