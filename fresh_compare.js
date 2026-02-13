const fs = require('fs');

// Read the actual current app glossary
const { exerciseGlossary } = require('./src/data/workoutPrompt');

console.log('Current App Glossary Count:', exerciseGlossary.length);
console.log('Sample exercises from app:', exerciseGlossary.slice(0, 5));

// Test for specific exercises that might be problematic
const testExercises = [
  'Decline Dumbbell Fly',
  'High Cable Fly',
  'Cable Fly',
  'Dumbbell Fly'
];

console.log('\n=== Testing Specific Exercises ===');
testExercises.forEach(exercise => {
  const found = exerciseGlossary.includes(exercise);
  console.log(`"${exercise}": ${found ? '✅ FOUND' : '❌ MISSING'}`);
});

// Get all unique exercises from the app glossary
const appSet = new Set(exerciseGlossary);
console.log('\nUnique exercises in app:', appSet.size);
console.log('Duplicates in app glossary:', exerciseGlossary.length - appSet.size);