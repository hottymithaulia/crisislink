/**
 * Test: VoiceProcessor
 * Tests incident type detection and urgency classification
 */

const VoiceProcessor = require('../VoiceProcessor');

function runTests() {
  console.log('=== TEST: VoiceProcessor ===\n');
  
  const processor = new VoiceProcessor();
  let passCount = 0;
  let failCount = 0;

  // Test 1: Accident detection
  console.log('TEST 1: Accident detection');
  const test1 = processor.analyzeVoiceInput('Car accident on Main Street blocking traffic');
  console.log(`  Input: "${test1.text}"`);
  console.log(`  Output: type=${test1.type}, urgency=${test1.urgency}`);
  if (test1.type === 'accident' && test1.urgency === 'high') {
    console.log('  ✓ PASS: Correctly detected accident with high urgency\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected type=accident, urgency=high\n');
    failCount++;
  }

  // Test 2: Fire detection
  console.log('TEST 2: Fire detection');
  const test2 = processor.analyzeVoiceInput('Fire burning building urgent help');
  console.log(`  Input: "${test2.text}"`);
  console.log(`  Output: type=${test2.type}, urgency=${test2.urgency}`);
  if (test2.type === 'fire' && test2.urgency === 'critical') {
    console.log('  ✓ PASS: Correctly detected fire with critical urgency\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected type=fire, urgency=critical\n');
    failCount++;
  }

  // Test 3: Medical detection
  console.log('TEST 3: Medical detection');
  const test3 = processor.analyzeVoiceInput('Person injured and bleeding');
  console.log(`  Input: "${test3.text}"`);
  console.log(`  Output: type=${test3.type}, urgency=${test3.urgency}`);
  if (test3.type === 'medical' && test3.urgency === 'high') {
    console.log('  ✓ PASS: Correctly detected medical with high urgency\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected type=medical, urgency=high\n');
    failCount++;
  }

  // Test 4: Unknown/fallback detection
  console.log('TEST 4: Unknown detection');
  const test4 = processor.analyzeVoiceInput('Something weird happening');
  console.log(`  Input: "${test4.text}"`);
  console.log(`  Output: type=${test4.type}, urgency=${test4.urgency}`);
  if (test4.type === 'incident' && test4.urgency === 'low') {
    console.log('  ✓ PASS: Correctly defaulted to incident/low\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected type=incident, urgency=low\n');
    failCount++;
  }

  // Test 5: Police/crime detection
  console.log('TEST 5: Police detection');
  const test5 = processor.analyzeVoiceInput('Theft in progress, someone stole a wallet');
  console.log(`  Input: "${test5.text}"`);
  console.log(`  Output: type=${test5.type}, urgency=${test5.urgency}`);
  if (test5.type === 'police') {
    console.log('  ✓ PASS: Correctly detected police/crime incident\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected type=police\n');
    failCount++;
  }

  // Test 6: Flood detection
  console.log('TEST 6: Flood detection');
  const test6 = processor.analyzeVoiceInput('Flash flood on the main road, cars submerged');
  console.log(`  Input: "${test6.text}"`);
  console.log(`  Output: type=${test6.type}, urgency=${test6.urgency}`);
  if (test6.type === 'flood') {
    console.log('  ✓ PASS: Correctly detected flood\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected type=flood\n');
    failCount++;
  }

  // Test 7: Critical urgency detection
  console.log('TEST 7: Critical urgency detection');
  const test7 = processor.analyzeVoiceInput('911 emergency, person unconscious and not breathing');
  console.log(`  Input: "${test7.text}"`);
  console.log(`  Output: urgency=${test7.urgency}`);
  if (test7.urgency === 'critical') {
    console.log('  ✓ PASS: Correctly detected critical urgency\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Expected urgency=critical\n');
    failCount++;
  }

  // Test 8: Invalid input handling
  console.log('TEST 8: Invalid input handling');
  const test8 = processor.analyzeVoiceInput('');
  console.log(`  Input: ""`);
  console.log(`  Output: success=${test8.success}, type=${test8.type}`);
  if (!test8.success && test8.type === 'incident') {
    console.log('  ✓ PASS: Correctly handled empty input\n');
    passCount++;
  } else {
    console.log('  ✗ FAIL: Should return success=false for empty input\n');
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
