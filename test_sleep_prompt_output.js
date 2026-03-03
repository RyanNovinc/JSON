// Test current sleep optimization prompt output

console.log('🕒 TESTING CURRENT SLEEP OPTIMIZATION PROMPT OUTPUT');
console.log('=================================================');

// Test case: bedtime: 9:30 PM, wakeTime: 6:30 AM, optimizationLevel: maximum
const testSleepData = {
  bedtime: '9:30 PM',
  wakeTime: '6:30 AM', 
  optimizationLevel: 'maximum'
};

// Mock the logic from assembleMealPlanningPrompt() lines 92-117
console.log('\n📋 PROMPT 1 OUTPUT (assembleMealPlanningPrompt):');
console.log('===============================================');

if (testSleepData?.bedtime && testSleepData?.wakeTime) {
  const optimizationLevel = testSleepData.optimizationLevel || 'moderate';
  let eatingWindowHours;
  let firstMealTiming;
  let lastMealTiming;
  
  if (optimizationLevel === 'maximum') {
    eatingWindowHours = '8-10';
    firstMealTiming = '30-90 minutes after wake time';
    lastMealTiming = '3 hours before bedtime';
  } else { // moderate or any other level
    eatingWindowHours = '10-12';
    firstMealTiming = 'within 2 hours of wake time';
    lastMealTiming = '2 hours before bedtime';
  }
  
  console.log('**SLEEP-OPTIMIZED MEAL TIMING REQUIREMENTS:**');
  console.log(`Based on my completed Sleep Optimization questionnaire:`);
  console.log(`- Sleep schedule: ${testSleepData.bedtime} - ${testSleepData.wakeTime}`);
  console.log(`- Optimization level: ${optimizationLevel}`);
  console.log(`- CRITICAL: Calculate and provide specific meal times for each day based on these sleep parameters:`);
  console.log(`  • First meal: ${firstMealTiming}`);
  console.log(`  • Last meal: ${lastMealTiming}`);
  console.log(`  • ${eatingWindowHours} hour eating window`);
  console.log(`- PROVIDE SPECIFIC TIMES: For each meal in your plan, specify the recommended time (e.g., "7:45 AM", "12:30 PM", "6:00 PM") and briefly explain why that timing supports better sleep and metabolism`);
}

// Mock the logic from getMealPlanReviewPrompt() lines 236-241
console.log('\n\n📋 PROMPT 2 OUTPUT (getMealPlanReviewPrompt):');
console.log('=============================================');

if (testSleepData?.bedtime && testSleepData?.wakeTime) {
  const optimizationLevel = testSleepData.optimizationLevel || 'moderate';
  const eatingWindowRange = optimizationLevel === 'maximum' ? '8-10' : '10-12';
  
  console.log('## HARD CONSTRAINTS — ZERO TOLERANCE');
  console.log('');
  console.log('These must pass after your fixes. If any of these still fail after revision, you have not finished — go back and fix again.');
  console.log('');
  console.log(`- **Eating window** MUST be within ${eatingWindowRange} hours (${optimizationLevel} sleep optimization). Do not rationalize exceeding it.`);
}

// Mock the logic from sleep compliance section (Check #7) lines 266-277
console.log('\n### 7. Sleep Optimization Compliance (if applicable)');

if (testSleepData?.bedtime && testSleepData?.wakeTime) {
  const optimizationLevel = testSleepData.optimizationLevel || 'moderate';
  const eatingWindowRange = optimizationLevel === 'maximum' ? '8-10' : '10-12';
  
  console.log('If sleep optimization was requested, check meal timing:');
  console.log(`- Meal times align with specified sleep schedule (${testSleepData.bedtime} - ${testSleepData.wakeTime})`);
  console.log(`- Eating window is within ${eatingWindowRange} hours (${optimizationLevel} optimization)`);
  console.log('- Last meal timing respects bedtime constraints (2-4+ hours before bed)');
  console.log('- First meal timing aligns with wake time preferences');
  console.log('- **FAIL if** meal timing conflicts with sleep optimization requirements');
  console.log('- **FIX**: Shift meal times to fit the specified eating window. Recalculate all gaps and verify.');
}

console.log('\n\n🧮 CALCULATION FOR TEST CASE:');
console.log('============================');
console.log('Sleep Schedule: 9:30 PM bedtime, 6:30 AM wake');
console.log('Optimization Level: maximum');
console.log('');
console.log('CURRENT CONSTRAINTS:');
console.log('• First meal: 30-90 minutes after wake = 7:00-8:00 AM');
console.log('• Last meal: 3 hours before bed = 6:30 PM');
console.log('• Eating window: 8-10 hours = 7:00 AM - 6:30 PM = 11.5 hours');
console.log('');
console.log('❌ PROBLEM: The eating window calculation is WRONG!');
console.log('❌ 7:00 AM to 6:30 PM is 11.5 hours, not 8-10 hours');
console.log('❌ To fit 8-10 hours max, dinner would need to be at 4:30-5:00 PM');
console.log('❌ This forces impractically early dinner times');
console.log('');
console.log('✅ INSIGHT: Last meal timing (3 hours before bed) is the evidence-based constraint');
console.log('✅ The "8-10 hour eating window" should be a soft preference, not hard constraint');