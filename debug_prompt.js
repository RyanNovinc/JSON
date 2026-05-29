// Debug script to test assemblePlanningPrompt
const { assemblePlanningPrompt } = require('./src/data/planningPrompt');

console.log('=== Testing assemblePlanningPrompt ===');

// Test with empty data (what might be happening)
console.log('\n1. Testing with empty object:');
try {
  const result1 = assemblePlanningPrompt({});
  console.log('Type:', typeof result1);
  console.log('Length:', result1 ? result1.length : 'null/undefined');
  console.log('First 200 chars:', result1 ? result1.slice(0, 200) : 'EMPTY');
} catch (e) {
  console.log('ERROR:', e.message);
}

// Test with sample valid data
console.log('\n2. Testing with sample data:');
const sampleData = {
  primaryGoal: 'build_muscle',
  programDuration: '8_weeks',
  totalTrainingDays: 4,
  selectedEquipment: ['commercial_gym'],
  trainingExperience: 'intermediate',
  volumePreference: '12-16'
};

try {
  const result2 = assemblePlanningPrompt(sampleData);
  console.log('Type:', typeof result2);
  console.log('Length:', result2 ? result2.length : 'null/undefined');
  console.log('First 200 chars:', result2 ? result2.slice(0, 200) : 'EMPTY');
  console.log('Contains fetch URLs:', result2 ? result2.includes('json.fit') : 'N/A');
} catch (e) {
  console.log('ERROR:', e.message);
}