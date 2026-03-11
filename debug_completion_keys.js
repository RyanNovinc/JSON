// Debug script to trace workout completion key generation
// This will help identify key mismatches between save and load

console.log('=== WORKOUT COMPLETION KEY DEBUG ===\n');

// Simulate the exact key generation logic from both screens

// 1. WorkoutLogScreen saving logic (confirmFinishWorkout)
console.log('1. SAVING LOGIC (WorkoutLogScreen):');

const saveExample = {
  day: { day_name: 'Full Body A' },
  blockName: 'Block 1: Foundation (Part 1)',
  currentWeek: 1
};

const weekString = saveExample.currentWeek.toString();
const workoutKey = `${saveExample.day?.day_name || 'unknown'}_week${weekString}`;
const completedKey = `completed_${saveExample.blockName}_week${weekString}`;

console.log('  - Day Name:', saveExample.day.day_name);
console.log('  - Block Name:', saveExample.blockName);
console.log('  - Week:', saveExample.currentWeek);
console.log('  - Week String:', weekString);
console.log('  - Workout Key:', workoutKey);
console.log('  - Completed Key:', completedKey);

console.log('\n2. LOADING LOGIC (DaysScreen):');

const loadExample = {
  localBlock: { block_name: 'Block 1: Foundation (Part 1)' },
  currentWeek: 1
};

const loadCompletedKey = `completed_${loadExample.localBlock.block_name}_week${loadExample.currentWeek}`;
const loadWorkoutKey = (dayName, week) => `${dayName}_week${week}`;

console.log('  - Block Name:', loadExample.localBlock.block_name);
console.log('  - Current Week:', loadExample.currentWeek);
console.log('  - Load Completed Key:', loadCompletedKey);
console.log('  - Load Workout Key Function:', loadWorkoutKey('Full Body A', 1));

console.log('\n3. KEY COMPARISON:');
console.log('  - Save Completed Key:', completedKey);
console.log('  - Load Completed Key:', loadCompletedKey);
console.log('  - Keys Match?:', completedKey === loadCompletedKey);

console.log('  - Save Workout Key:', workoutKey);
console.log('  - Load Workout Key:', loadWorkoutKey('Full Body A', 1));
console.log('  - Workout Keys Match?:', workoutKey === loadWorkoutKey('Full Body A', 1));

console.log('\n4. POTENTIAL ISSUES:');

// Check for common issues
const issues = [];

if (completedKey !== loadCompletedKey) {
  issues.push('❌ COMPLETED KEY MISMATCH');
}

if (workoutKey !== loadWorkoutKey('Full Body A', 1)) {
  issues.push('❌ WORKOUT KEY MISMATCH');
}

if (saveExample.blockName.includes(':')) {
  issues.push('⚠️  Block name contains special characters (:)');
}

if (saveExample.day.day_name.includes(' ')) {
  issues.push('ℹ️  Day name contains spaces');
}

if (issues.length === 0) {
  console.log('✅ No obvious key issues found');
} else {
  issues.forEach(issue => console.log('  ' + issue));
}

console.log('\n5. SIMULATED STORAGE OPERATIONS:');

// Simulate the save operation
const simulatedCompletedSet = new Set();
simulatedCompletedSet.add(workoutKey);
const savedData = JSON.stringify(Array.from(simulatedCompletedSet));

console.log('  - Simulated Save Data:', savedData);

// Simulate the load operation  
const loadedData = JSON.parse(savedData);
const loadedSet = new Set(loadedData);
const isCompleted = loadedSet.has(loadWorkoutKey('Full Body A', 1));

console.log('  - Simulated Load Data:', Array.from(loadedSet));
console.log('  - Is Workout Completed?:', isCompleted);

console.log('\n=== DEBUG COMPLETE ===');