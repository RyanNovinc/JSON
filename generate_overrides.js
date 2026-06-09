const fs = require('fs');

console.log('=== GENERATING WEB IMAGE OVERRIDES ===');
console.log('Creating standalone override file from website patches...\n');

// Read deployed website meals.json (contains our manual patches)
const websiteMealsPath = '/Users/ryannovinc/Desktop/JSON.fit-website/r/meals.json';
const websiteMeals = JSON.parse(fs.readFileSync(websiteMealsPath, 'utf8'));

// Read current app source meals.json 
const appMealsPath = './meals.json';
const appMeals = JSON.parse(fs.readFileSync(appMealsPath, 'utf8'));

// Extract website's exact slugifyImage function
function slugifyImage(f) {
  if (!f) return '';
  var ext = (f.match(/\.(png|jpe?g|webp)$/i) || ['', 'png'])[1].toLowerCase();
  var base = f.replace(/\.(png|jpe?g|webp)$/i, '');
  var slug = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').toLowerCase();
  return slug + '.' + ext;
}

const overrides = {};
let mealOverrideCount = 0;
let plateOverrideCount = 0;

console.log('Analyzing differences between website (patched) vs app source (slugified)...\n');

Object.entries(websiteMeals).forEach(([slug, websiteMeal]) => {
  const appMeal = appMeals[slug];
  if (!appMeal) return;
  
  // Skip single-plate meals (they work fine with slugify)
  if (!websiteMeal.plates || websiteMeal.plates.length <= 1) return;
  
  let needsOverride = false;
  
  // Check meal-level image_filename
  if (websiteMeal.image_filename && appMeal.image_filename) {
    const websiteValue = websiteMeal.image_filename;
    const expectedFromApp = slugifyImage(appMeal.image_filename);
    
    if (websiteValue !== expectedFromApp) {
      if (!overrides[slug]) overrides[slug] = {};
      overrides[slug].image_filename = websiteValue;
      needsOverride = true;
      mealOverrideCount++;
      console.log(`MEAL ${slug}:`);
      console.log(`  App "${appMeal.image_filename}" → slugify "${expectedFromApp}"`);
      console.log(`  Website manual patch: "${websiteValue}"`);
      console.log(`  → Override: "${websiteValue}"\n`);
    }
  }
  
  // Check plate-level image_filename for multi-plate meals
  if (websiteMeal.plates && appMeal.plates) {
    websiteMeal.plates.forEach(websitePlate => {
      const appPlate = appMeal.plates.find(p => p.display_name === websitePlate.display_name);
      
      if (websitePlate.image_filename && appPlate?.image_filename) {
        const websiteValue = websitePlate.image_filename;
        const expectedFromApp = slugifyImage(appPlate.image_filename);
        
        if (websiteValue !== expectedFromApp) {
          if (!overrides[slug]) overrides[slug] = {};
          if (!overrides[slug].plates) overrides[slug].plates = {};
          overrides[slug].plates[websitePlate.display_name] = websiteValue;
          needsOverride = true;
          plateOverrideCount++;
          console.log(`PLATE ${slug}.${websitePlate.display_name}:`);
          console.log(`  App "${appPlate.image_filename}" → slugify "${expectedFromApp}"`);
          console.log(`  Website manual patch: "${websiteValue}"`);
          console.log(`  → Override: "${websiteValue}"\n`);
        }
      }
    });
  }
});

console.log('=== OVERRIDE SUMMARY ===');
console.log(`Multi-plate meals analyzed: ${Object.keys(websiteMeals).filter(slug => websiteMeals[slug].plates?.length > 1).length}`);
console.log(`Meal-level overrides: ${mealOverrideCount}`);
console.log(`Plate-level overrides: ${plateOverrideCount}`);
console.log(`Total meals with overrides: ${Object.keys(overrides).length}\n`);

// Write the override file
const overrideFilePath = './src/data/web_image_overrides.json';
fs.writeFileSync(overrideFilePath, JSON.stringify(overrides, null, 2));

console.log(`✅ Saved ${Object.keys(overrides).length} meal overrides to ${overrideFilePath}`);
console.log('\nOverride file shape:');
console.log(JSON.stringify(overrides, null, 2));