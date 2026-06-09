const fs = require('fs');

// Extract MEAL_IMAGES keys (the actual object keys)
const mealImagesContent = fs.readFileSync('./src/assets/mealImages.ts', 'utf8');
const mealImageMatches = mealImagesContent.match(/'([^']+\.png)':/g) || [];
const mealImageKeys = mealImageMatches.map(match => match.slice(1, -2));

// Create a simulated MEAL_IMAGES object to test hasOwnProperty
const MEAL_IMAGES = {};
mealImageKeys.forEach(key => {
  MEAL_IMAGES[key] = true; // dummy value
});

console.log('=== hasOwnProperty TESTS ===');

const testCases = [
  'butter_chicken_with_rice.png',
  'brekkie_grow.png', 
  'mango_mass.png',
  'Chicken Schnitzel.png',
  'Schnitzel Plate (plate).png'
];

testCases.forEach(filename => {
  const hasOwn = MEAL_IMAGES.hasOwnProperty(filename);
  console.log(`MEAL_IMAGES.hasOwnProperty('${filename}'): ${hasOwn}`);
});

console.log('\n=== FIRST 10 ACTUAL KEYS ===');
mealImageKeys.slice(0, 10).forEach(key => {
  console.log(`"${key}"`);
});

console.log(`\nTotal keys: ${mealImageKeys.length}`);