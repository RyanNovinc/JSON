const fs = require('fs');

// Get registry keys
const mealImagesContent = fs.readFileSync('src/assets/mealImages.ts', 'utf8');
const keyMatches = mealImagesContent.match(/'([^']+\.png)':/g) || [];
const registryKeys = keyMatches.map(match => match.slice(1, -2));

// Parse curated_meals.ts to get actual meal objects
const curatedContent = fs.readFileSync('src/data/curated_meals.ts', 'utf8');

// Extract all meal.image_filename and plate.image_filename values
const allFilenames = new Set();
const mealBaseFilenames = [];
const plateFilenames = [];
const mealsWithUndefinedBase = [];

// Find all base meal image_filename values
const baseMealMatches = curatedContent.match(/^\s*image_filename:\s*'([^']+\.png)'/gm) || [];
baseMealMatches.forEach(match => {
  const filename = match.match(/'([^']+)'/)[1];
  allFilenames.add(filename);
  mealBaseFilenames.push(filename);
});

// Find meals with undefined image_filename at base level
const lines = curatedContent.split('\n');
let currentMealSlug = '';
let inPlates = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Track current meal
  const slugMatch = line.match(/^\s*slug:\s*'([^']+)'/);
  if (slugMatch && !inPlates) {
    currentMealSlug = slugMatch[1];
  }
  
  // Check for undefined base image_filename (not in plates)
  if (!inPlates && line.includes('image_filename: undefined')) {
    mealsWithUndefinedBase.push(currentMealSlug);
  }
  
  // Track plates section
  if (line.includes('plates: [')) {
    inPlates = true;
  } else if (inPlates && line.match(/^\s*},?\s*$/) && !line.includes('image_filename')) {
    const nextLine = lines[i + 1];
    if (nextLine && !nextLine.trim().startsWith('{') && !nextLine.includes('id:')) {
      inPlates = false;
    }
  }
  
  // Extract plate image_filename values
  if (inPlates && line.includes('image_filename:')) {
    const filenameMatch = line.match(/image_filename:\s*'([^']+\.png)'/);
    if (filenameMatch) {
      const filename = filenameMatch[1];
      allFilenames.add(filename);
      plateFilenames.push({ meal: currentMealSlug, filename });
    }
  }
}

console.log('=== COMPREHENSIVE VALIDATION ===');
console.log(`Total unique filenames found: ${allFilenames.size}`);
console.log(`Base meal filenames: ${mealBaseFilenames.length}`);
console.log(`Plate filenames: ${plateFilenames.length}`);
console.log(`Meals with undefined base image_filename: ${mealsWithUndefinedBase.length}`);

console.log('\n=== MISSING FROM REGISTRY ===');
const missingFilenames = [...allFilenames].filter(f => !registryKeys.includes(f));
missingFilenames.forEach(f => console.log('MISSING:', f));
console.log(`Missing count: ${missingFilenames.length}`);

console.log('\n=== MISSING PER-PLATE FILENAMES ===');
const missingPlateFilenames = plateFilenames.filter(({ filename }) => !registryKeys.includes(filename));
missingPlateFilenames.forEach(({ meal, filename }) => {
  console.log(`MISSING PLATE: "${filename}" from meal "${meal}"`);
});
console.log(`Missing plate filename count: ${missingPlateFilenames.length}`);

console.log('\n=== MEALS WITH UNDEFINED BASE IMAGE_FILENAME ===');
mealsWithUndefinedBase.forEach(slug => {
  console.log(`Meal "${slug}" has undefined base image_filename`);
  
  // Check if its plates have valid filenames
  const mealPlates = plateFilenames.filter(p => p.meal === slug);
  const validPlates = mealPlates.filter(p => registryKeys.includes(p.filename));
  const invalidPlates = mealPlates.filter(p => !registryKeys.includes(p.filename));
  
  console.log(`  - ${mealPlates.length} plates total`);
  console.log(`  - ${validPlates.length} plates with valid filenames`);
  console.log(`  - ${invalidPlates.length} plates with invalid filenames`);
  invalidPlates.forEach(p => console.log(`    INVALID: "${p.filename}"`));
});