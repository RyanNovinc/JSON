const fs = require('fs');

// Read the files
const mealImagesContent = fs.readFileSync('./src/assets/mealImages.ts', 'utf8');
const curatedMealsContent = fs.readFileSync('./src/data/curated_meals.ts', 'utf8');

// Extract MEAL_IMAGES keys
const mealImageMatches = mealImagesContent.match(/'([^']+\.png)':/g) || [];
const mealImageKeys = mealImageMatches.map(match => match.slice(1, -2)); // Remove ' and ':

// Extract image_filename values from curated meals
const imageFilenameMatches = curatedMealsContent.match(/image_filename:\s*'([^']+\.png)'/g) || [];
const imageFilenames = imageFilenameMatches.map(match => match.match(/'([^']+)'/)[1]);

console.log('=== MEAL_IMAGES KEYS ===');
mealImageKeys.forEach(key => console.log(`"${key}"`));
console.log(`\nTotal: ${mealImageKeys.length}`);

console.log('\n=== IMAGE_FILENAME VALUES ===');
const uniqueFilenames = [...new Set(imageFilenames)];
uniqueFilenames.forEach(filename => console.log(`"${filename}"`));
console.log(`\nTotal unique: ${uniqueFilenames.length}`);

console.log('\n=== MISMATCH ANALYSIS ===');
uniqueFilenames.forEach(filename => {
  const rawMatch = mealImageKeys.includes(filename);
  const nfcFilename = filename.normalize('NFC');
  const nfcMatch = mealImageKeys.some(key => key.normalize('NFC') === nfcFilename);
  
  if (!rawMatch && !nfcMatch) {
    console.log(`❌ NO MATCH: "${filename}"`);
  } else if (!rawMatch && nfcMatch) {
    console.log(`🔶 NFC ONLY: "${filename}" (raw fails, NFC works)`);
  } else if (rawMatch) {
    console.log(`✅ EXACT MATCH: "${filename}"`);
  }
});

console.log('\n=== MISSING KEYS ===');
uniqueFilenames.forEach(filename => {
  if (!mealImageKeys.includes(filename)) {
    console.log(`Missing key for: "${filename}"`);
  }
});