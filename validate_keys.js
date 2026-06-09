const fs = require('fs');

// Get registry keys
const mealImagesContent = fs.readFileSync('src/assets/mealImages.ts', 'utf8');
const keyMatches = mealImagesContent.match(/'([^']+\.png)':/g) || [];
const registryKeys = keyMatches.map(match => match.slice(1, -2));

// Get all image_filename values from curated_meals.ts
const curatedContent = fs.readFileSync('src/data/curated_meals.ts', 'utf8');
const filenameMatches = curatedContent.match(/image_filename:\s*'([^']+\.png)'/g) || [];
const dataFilenames = filenameMatches.map(match => match.match(/'([^']+)'/)[1]);

console.log('=== MISSING FROM REGISTRY ===');
const missing = [...new Set(dataFilenames)].filter(f => !registryKeys.includes(f));
missing.forEach(f => console.log('MISS:', f));

console.log('\nMissing count:', missing.length);
console.log('Total unique data filenames:', [...new Set(dataFilenames)].length);