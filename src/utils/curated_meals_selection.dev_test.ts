/**
 * Development test script for curated meal selection logic.
 * Run with: npx ts-node src/utils/curated_meals_selection.dev_test.ts
 * or: node -r ts-node/register src/utils/curated_meals_selection.dev_test.ts
 */

import { selectMethodForUser, getTimeInvestmentCeiling } from './curated_meals_selection';
import { CURATED_MEALS } from '../data/curated_meals';
import { UserCookingPreferences } from '../types/curated_meals';

// Test counter
let testNumber = 0;
let passCount = 0;
let failCount = 0;

function runTest(
  name: string,
  user: UserCookingPreferences,
  intent: 'user_requested' | 'ai_suggested',
  expected: { method_id: string | null; exceeds_skill?: boolean; exceeds_time?: boolean }
) {
  testNumber++;
  const butterChicken = CURATED_MEALS.butter_chicken;
  const result = selectMethodForUser(butterChicken, user, { intent });
  
  let passed = true;
  let errors: string[] = [];
  
  if (expected.method_id === null) {
    if (result !== null) {
      passed = false;
      errors.push(`Expected null, got method ${result.method.id}`);
    }
  } else {
    if (result === null) {
      passed = false;
      errors.push(`Expected method ${expected.method_id}, got null`);
    } else {
      if (result.method.id !== expected.method_id) {
        passed = false;
        errors.push(`Expected method ${expected.method_id}, got ${result.method.id}`);
      }
      if (expected.exceeds_skill !== undefined && result.exceeds_skill !== expected.exceeds_skill) {
        passed = false;
        errors.push(`Expected exceeds_skill ${expected.exceeds_skill}, got ${result.exceeds_skill}`);
      }
      if (expected.exceeds_time !== undefined && result.exceeds_time !== expected.exceeds_time) {
        passed = false;
        errors.push(`Expected exceeds_time ${expected.exceeds_time}, got ${result.exceeds_time}`);
      }
    }
  }
  
  if (passed) {
    console.log(`✅ Test ${testNumber}: ${name}`);
    passCount++;
  } else {
    console.log(`❌ Test ${testNumber}: ${name}`);
    errors.forEach(e => console.log(`   ${e}`));
    failCount++;
  }
}

console.log('Running curated meal selection tests...\n');

// Test 1: All-equipped power user, ai_suggested
// Note: slow_cooker wins because it has the lowest active time (5 min vs 12 min vs 25 min)
runTest(
  'All-equipped power user, ai_suggested',
  {
    cooking_equipment: ['stovetop', 'oven', 'microwave', 'air_fryer', 'slow_cooker', 'rice_cooker', 'pressure_cooker', 'grill', 'blender', 'food_processor'],
    skill_confidence: 5,
    time_investment: 5,
    planning_style: 5
  },
  'ai_suggested',
  { method_id: 'slow_cooker', exceeds_skill: false, exceeds_time: false }
);

// Test 2: Beginner with limited time, ai_suggested
runTest(
  'Beginner with limited time, ai_suggested',
  {
    cooking_equipment: ['stovetop', 'microwave'],
    skill_confidence: 2,
    time_investment: 2,
    planning_style: 3
  },
  'ai_suggested',
  { method_id: 'stovetop_shortcut', exceeds_skill: false, exceeds_time: false }
);

// Test 3: Beginner with limited time, user_requested
runTest(
  'Beginner with limited time, user_requested',
  {
    cooking_equipment: ['stovetop', 'microwave'],
    skill_confidence: 2,
    time_investment: 2,
    planning_style: 3
  },
  'user_requested',
  { method_id: 'stovetop_shortcut', exceeds_skill: false, exceeds_time: false }
);

// Test 4: Meal prepper with slow cooker, ai_suggested
runTest(
  'Meal prepper with slow cooker, ai_suggested',
  {
    cooking_equipment: ['stovetop', 'slow_cooker'],
    skill_confidence: 3,
    time_investment: 3,
    planning_style: 1
  },
  'ai_suggested',
  { method_id: 'slow_cooker', exceeds_skill: false, exceeds_time: false }
);

// Test 5a: No viable method (microwave only), ai_suggested
runTest(
  'No viable method (microwave only), ai_suggested',
  {
    cooking_equipment: ['microwave'],
    skill_confidence: 5,
    time_investment: 5,
    planning_style: 3
  },
  'ai_suggested',
  { method_id: null }
);

// Test 5b: No viable method (microwave only), user_requested
runTest(
  'No viable method (microwave only), user_requested',
  {
    cooking_equipment: ['microwave'],
    skill_confidence: 5,
    time_investment: 5,
    planning_style: 3
  },
  'user_requested',
  { method_id: null }
);

// Test 6: User-requested meal where only a hard method survives
runTest(
  'User-requested meal where only a hard method survives',
  {
    cooking_equipment: ['slow_cooker'],  // Only slow cooker, no stovetop
    skill_confidence: 1,
    time_investment: 1,
    planning_style: 3
  },
  'user_requested',
  { method_id: 'slow_cooker', exceeds_skill: true, exceeds_time: false }
);

// Test 7: Comfort fit beats meal-prepper preference
runTest(
  'Comfort fit beats meal-prepper preference',
  {
    cooking_equipment: ['stovetop', 'slow_cooker'],
    skill_confidence: 2,
    time_investment: 5,
    planning_style: 1
  },
  'ai_suggested',
  { method_id: 'slow_cooker', exceeds_skill: false, exceeds_time: false }
);

// Test 8: All methods exceed comfort, meal-prepper preference wins
runTest(
  'All methods exceed comfort under user_requested, meal-prepper wins',
  {
    cooking_equipment: ['stovetop', 'slow_cooker'],
    skill_confidence: 1,  // All methods require skill 2 or 3
    time_investment: 5,
    planning_style: 1     // Meal prepper
  },
  'user_requested',
  { method_id: 'slow_cooker', exceeds_skill: true, exceeds_time: false }
);

// Summary
console.log('\n========================================');
console.log(`Tests completed: ${testNumber}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
if (failCount === 0) {
  console.log('\n✅ All tests passed!');
} else {
  console.log('\n❌ Some tests failed.');
  process.exit(1);
}