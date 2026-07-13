/**
 * Test to reproduce the exact user scenario: 
 * - User logs "1 kg × 2 reps" 
 * - But sees "VOLUME = 1 kg" in calendar
 * - This happens when user's active unit is 'lbs' but they think they're logging in kg
 */

import { WorkoutStorage } from '../storage';
import type { WorkoutHistory } from '../storage';

// FIXME: this is a hand-copied duplicate of the real convertWeight (which lives in
// src/contexts/WeightUnitContext.tsx), not an import of it. The same goes for the volume
// arithmetic below, which re-derives what src/components/WorkoutCalendar.tsx does rather
// than calling it. So this suite exercises NO production conversion code — it can only
// ever confirm that a copy of the logic behaves like the copy of the logic, and it will
// not notice if production drifts away from it. It should be rewritten to import the real
// conversion and drive the real calendar volume calculation. Left as-is for now: it is a
// characterisation test, and rewriting it is a separate piece of work.
const convertWeight = (weight: number, fromUnit: 'kg' | 'lbs', toUnit: 'kg' | 'lbs'): number => {
  if (fromUnit === toUnit) return weight;
  
  if (fromUnit === 'kg' && toUnit === 'lbs') {
    return Math.round(weight * 2.20462 * 10) / 10;
  } else if (fromUnit === 'lbs' && toUnit === 'kg') {
    return Math.round(weight / 2.20462 * 10) / 10;
  }
  
  return weight;
};

describe('Real Scenario: User Bug Reproduction', () => {
  beforeEach(async () => {
    await WorkoutStorage.saveWorkoutHistory([]);
  });

  test('SCENARIO: User logs 1×2 with lbs active unit, sees 1kg volume', async () => {
    // SIMULATE: User has 'lbs' as their active unit preference
    const userActiveUnit = 'lbs'; // This is globalUnit when user logs
    const calendarDisplayUnit = 'kg'; // What WorkoutCalendar shows
    
    console.log('🎯 REPRODUCING THE USER SCENARIO:');
    console.log(`- User's active unit: ${userActiveUnit}`);
    console.log(`- Calendar display unit: ${calendarDisplayUnit}`);
    console.log('- User enters: "1" weight, "2" reps');
    console.log('- User THINKS they are logging: 1 kg × 2 reps = 2 kg volume');
    console.log('- But app ACTUALLY logs: 1 lbs × 2 reps');
    
    // Step 1: Save set with user's active unit (simulating WorkoutLogScreenAdapter logic)
    const setAsLogged: WorkoutHistory['sets'][0] = {
      setNumber: 1,
      weight: '1', // User types "1"
      reps: '2',   // User types "2"
      completed: true,
      unit: userActiveUnit // App stamps user's active unit
    };

    const historyEntry: WorkoutHistory = {
      id: 'scenario-test',
      routineName: 'Test Routine',
      dayName: 'Test Day',
      exerciseName: 'Bench Press',
      date: '2026-06-12',
      sets: [setAsLogged]
    };
    
    await WorkoutStorage.addWorkoutEntry(historyEntry);
    
    // Step 2: Calculate volume as WorkoutCalendar does
    const history = await WorkoutStorage.loadWorkoutHistory();
    const savedSet = history[0].sets[0];
    
    console.log('\n📋 SAVED SET DATA:');
    console.log(`Raw set: ${JSON.stringify(savedSet)}`);
    
    // Step 3: Volume calculation (current WorkoutCalendar logic)
    const weight = parseFloat(savedSet.weight) || 0;
    const reps = parseInt(savedSet.reps) || 0;
    
    // OLD LOGIC (the bug): Convert individual weight, then multiply
    const convertedWeight = convertWeight(weight, savedSet.unit || 'kg', calendarDisplayUnit);
    const volumeOldWay = convertedWeight * reps;
    
    // NEW LOGIC (the fix): Calculate total volume, then convert
    const totalWeightInOriginalUnit = weight * reps;
    const volumeNewWay = convertWeight(totalWeightInOriginalUnit, savedSet.unit || 'kg', calendarDisplayUnit);
    
    console.log('\n🧮 VOLUME CALCULATIONS:');
    console.log(`Weight per set: ${weight} ${savedSet.unit}`);
    console.log(`Reps: ${reps}`);
    console.log(`Converted weight per set: ${convertedWeight} ${calendarDisplayUnit}`);
    console.log(`Volume (old way): ${convertedWeight} × ${reps} = ${volumeOldWay} ${calendarDisplayUnit}`);
    console.log(`Volume (new way): ${totalWeightInOriginalUnit} ${savedSet.unit} → ${volumeNewWay} ${calendarDisplayUnit}`);
    
    // Step 4: Verify this reproduces the user's bug
    console.log('\n🐛 BUG VERIFICATION:');
    if (volumeOldWay === 1 && calendarDisplayUnit === 'kg') {
      console.log('✅ BUG REPRODUCED! User sees 1 kg volume instead of expected 2 kg');
      console.log('✅ This confirms the issue: user logs in lbs unit but expects kg behavior');
    } else {
      console.log(`❌ Bug not reproduced. Got ${volumeOldWay} ${calendarDisplayUnit}`);
    }
    
    // Test assertions
    expect(savedSet.unit).toBe('lbs'); // Set is saved with lbs unit

    // Old way rounds per-set BEFORE multiplying: 1 lbs -> 0.5 kg (1 d.p.), x2 reps = 1.0 kg.
    // This previously asserted 0.9, which contradicted both this test's own comment and its
    // own `if (volumeOldWay === 1)` bug-reproduction branch below. The arithmetic gives 1.
    expect(volumeOldWay).toBe(1);

    // New way multiplies first, then converts once: 2 lbs -> 0.9 kg. More accurate, because
    // rounding once at the end does not amplify the per-set rounding error by the rep count.
    expect(volumeNewWay).toBe(0.9);
    
    // The bug is that user expects 2 kg but sees ~1 kg because they logged in lbs unknowingly
  });
  
  test('REAL ROOT CAUSE: User has lbs preference but expects kg behavior', () => {
    console.log('\n🎯 ROOT CAUSE ANALYSIS:');
    console.log('1. User somehow has "lbs" as their active unit preference');
    console.log('2. When they log "1 × 2", app correctly saves as 1 lbs × 2 reps');  
    console.log('3. Calendar displays volume in kg: 1 lbs × 2 = 2 lbs = ~0.9 kg');
    console.log('4. User expects to see 2 kg but sees ~1 kg');
    console.log('5. REAL FIX: Check why user has lbs preference when they want kg');
    
    // The issue is NOT the unit stamping (that works correctly)
    // The issue is WHY the user has 'lbs' as their preference when they want kg
    
    expect(true).toBe(true); // This test just documents the real issue
  });

  test('VERIFY: Fixed display shows consistent units', () => {
    // Test that after our fixes, display is consistent
    const testScenarios: Array<{ userUnit: 'kg' | 'lbs'; displayUnit: 'kg' | 'lbs'; weight: number; reps: number; expectedVolume: number }> = [
      { userUnit: 'kg', displayUnit: 'kg', weight: 1, reps: 2, expectedVolume: 2 },
      { userUnit: 'lbs', displayUnit: 'lbs', weight: 1, reps: 2, expectedVolume: 2 },
      { userUnit: 'lbs', displayUnit: 'kg', weight: 1, reps: 2, expectedVolume: 0.9 },
      { userUnit: 'kg', displayUnit: 'lbs', weight: 1, reps: 2, expectedVolume: 4.4 }
    ];
    
    testScenarios.forEach(scenario => {
      const totalWeight = scenario.weight * scenario.reps;
      const convertedVolume = convertWeight(totalWeight, scenario.userUnit, scenario.displayUnit);
      
      console.log(`${scenario.userUnit} → ${scenario.displayUnit}: ${scenario.weight}×${scenario.reps} = ${convertedVolume}`);
      expect(Math.round(convertedVolume * 10) / 10).toBe(scenario.expectedVolume);
    });
  });
});