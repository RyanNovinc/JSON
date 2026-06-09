const fs = require('fs');

console.log('=== VERIFICATION: Compare regenerated vs deployed meals.json ===\n');

// Read current app meals.json and current website meals.json
const appMealsPath = './meals.json';
const websiteMealsPath = '/Users/ryannovinc/Desktop/JSON.fit-website/r/meals.json';

const appMeals = JSON.parse(fs.readFileSync(appMealsPath, 'utf8'));
const websiteMeals = JSON.parse(fs.readFileSync(websiteMealsPath, 'utf8'));

console.log(`App meals.json: ${Object.keys(appMeals).length} meals`);
console.log(`Website meals.json: ${Object.keys(websiteMeals).length} meals\n`);

// Compare image_filename values 
const differences = [];

Object.entries(websiteMeals).forEach(([slug, websiteMeal]) => {
  const appMeal = appMeals[slug];
  if (!appMeal) return;
  
  // Compare meal-level image_filename
  if (websiteMeal.image_filename !== appMeal.image_filename) {
    differences.push({
      type: 'meal',
      slug: slug,
      app: appMeal.image_filename || '(none)',
      website: websiteMeal.image_filename || '(none)'
    });
  }
  
  // Compare plate-level image_filename
  if (websiteMeal.plates && appMeal.plates) {
    websiteMeal.plates.forEach((websitePlate, index) => {
      const appPlate = appMeal.plates[index];
      if (appPlate && websitePlate.image_filename !== appPlate.image_filename) {
        differences.push({
          type: 'plate',
          slug: slug,
          plate: websitePlate.display_name,
          app: appPlate.image_filename || '(none)',
          website: websitePlate.image_filename || '(none)'
        });
      }
    });
  }
});

if (differences.length === 0) {
  console.log('✅ VERIFICATION PASSED');
  console.log('All image_filename values in regenerated meals.json match the deployed website!');
} else {
  console.log(`❌ VERIFICATION FAILED`);
  console.log(`Found ${differences.length} differences between app and website meals.json:\n`);
  
  differences.forEach(diff => {
    if (diff.type === 'meal') {
      console.log(`MEAL ${diff.slug}:`);
      console.log(`  App:     ${diff.app}`);
      console.log(`  Website: ${diff.website}`);
    } else {
      console.log(`PLATE ${diff.slug}.${diff.plate}:`);
      console.log(`  App:     ${diff.app}`);
      console.log(`  Website: ${diff.website}`);
    }
    console.log('');
  });
  
  console.log('❌ DO NOT DEPLOY - differences detected!');
}