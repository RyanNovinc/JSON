// Load the actual runtime modules
const { CURATED_MEALS } = require('./src/data/curated_meals.ts');

console.log('=== RUNTIME MEAL IMAGE_FILENAME VALUES ===');
const runtimeFilenames = [];

Object.values(CURATED_MEALS).forEach(meal => {
  if (meal.image_filename) {
    runtimeFilenames.push(meal.image_filename);
    console.log(`Base meal "${meal.slug}" -> "${meal.image_filename}"`);
  }
  
  meal.plates?.forEach(plate => {
    if (plate.image_filename) {
      runtimeFilenames.push(plate.image_filename);
      console.log(`Plate "${meal.slug}:${plate.id}" -> "${plate.image_filename}"`);
    }
  });
});

console.log(`\n=== RUNTIME COMPARISON ===`);
console.log(`Found ${runtimeFilenames.length} runtime image filenames`);

// Load mealImages keys (simulated)
const fs = require('fs');
const mealImagesContent = fs.readFileSync('./src/assets/mealImages.ts', 'utf8');
const mealImageMatches = mealImagesContent.match(/'([^']+\.png)':/g) || [];
const mealImageKeys = mealImageMatches.map(match => match.slice(1, -2));

const uniqueRuntime = [...new Set(runtimeFilenames)];
console.log(`Unique runtime filenames: ${uniqueRuntime.length}`);

uniqueRuntime.forEach(filename => {
  const hasKey = mealImageKeys.includes(filename);
  console.log(`${hasKey ? '✅' : '❌'} "${filename}"`);
});