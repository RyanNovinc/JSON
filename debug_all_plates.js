const fs = require('fs');

// Read the files
const mealImagesContent = fs.readFileSync('./src/assets/mealImages.ts', 'utf8');
const curatedMealsContent = fs.readFileSync('./src/data/curated_meals.ts', 'utf8');

// Extract MEAL_IMAGES keys
const mealImageMatches = mealImagesContent.match(/'([^']+\.png)':/g) || [];
const mealImageKeys = mealImageMatches.map(match => match.slice(1, -2));

console.log('=== COMPREHENSIVE PLATE IMAGE AUDIT ===');

// Extract ALL image_filename values from both base meals AND plates
const allImageFilenames = [];

// Base meal image_filename values
const baseMealMatches = curatedMealsContent.match(/^\s*image_filename:\s*'([^']+\.png)'/gm) || [];
baseMealMatches.forEach(match => {
  const filename = match.match(/'([^']+)'/)[1];
  allImageFilenames.push({ type: 'base', filename });
});

// Plate image_filename values  
const plateMatches = curatedMealsContent.match(/^\s*image_filename:\s*'([^']+\.png)'/gm) || [];
// We need to be more specific to get plate context
const plateImageMatches = [];

// Split into lines and look for plate context
const lines = curatedMealsContent.split('\n');
let inPlates = false;
let currentMealSlug = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Track current meal slug
  const slugMatch = line.match(/slug:\s*'([^']+)'/);
  if (slugMatch && !inPlates) {
    currentMealSlug = slugMatch[1];
  }
  
  // Track if we're in plates section
  if (line.includes('plates: [')) {
    inPlates = true;
  } else if (inPlates && line.match(/^\s*},?\s*$/) && !line.includes('image_filename')) {
    // Check if we're exiting plates section
    const nextLine = lines[i + 1];
    if (nextLine && !nextLine.trim().startsWith('{') && !nextLine.includes('id:')) {
      inPlates = false;
    }
  }
  
  // Look for image_filename in plates context
  if (inPlates && line.includes('image_filename:')) {
    const filenameMatch = line.match(/image_filename:\s*'([^']+\.png)'/);
    if (filenameMatch) {
      plateImageMatches.push({ 
        type: 'plate', 
        filename: filenameMatch[1], 
        meal: currentMealSlug 
      });
    }
  }
}

console.log(`Found ${baseMealMatches.length} base meal image filenames`);
console.log(`Found ${plateImageMatches.length} plate image filenames`);

// Check each against registry
console.log('\n=== BASE MEAL FILENAMES ===');
baseMealMatches.forEach(match => {
  const filename = match.match(/'([^']+)'/)[1];
  const hasKey = mealImageKeys.includes(filename);
  console.log(`${hasKey ? '✅' : '❌'} BASE: "${filename}"`);
});

console.log('\n=== PLATE FILENAMES ===');
plateImageMatches.forEach(({ filename, meal }) => {
  const hasKey = mealImageKeys.includes(filename);
  console.log(`${hasKey ? '✅' : '❌'} PLATE (${meal}): "${filename}"`);
});

console.log('\n=== MISSING PLATE KEYS ===');
const missingPlateKeys = plateImageMatches.filter(({ filename }) => !mealImageKeys.includes(filename));
missingPlateKeys.forEach(({ filename, meal }) => {
  console.log(`MISSING: "${filename}" from meal "${meal}"`);
});

console.log(`\nSummary: ${missingPlateKeys.length} plate filenames are NOT registry keys`);