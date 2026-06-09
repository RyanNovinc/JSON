const fs = require('fs');

console.log('=== WEB FILENAME MIGRATION ===');
console.log('Capturing manually-patched website image filenames for source data...\n');

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

const migrations = {};
let mealCount = 0;
let plateCount = 0;

console.log('Analyzing differences between website (patched) vs app source (slugified)...\n');

Object.entries(websiteMeals).forEach(([slug, websiteMeal]) => {
  const appMeal = appMeals[slug];
  if (!appMeal) return;
  
  // Skip single-plate meals (they work fine with slugify)
  if (!websiteMeal.plates || websiteMeal.plates.length <= 1) return;
  
  let mealNeedsMigration = false;
  
  // Check meal-level image_filename
  if (websiteMeal.image_filename && appMeal.image_filename) {
    const websiteValue = websiteMeal.image_filename;
    const expectedFromApp = slugifyImage(appMeal.image_filename);
    
    if (websiteValue !== expectedFromApp) {
      if (!migrations[slug]) migrations[slug] = {};
      migrations[slug].web_image_filename = websiteValue;
      mealNeedsMigration = true;
      mealCount++;
      console.log(`MEAL ${slug}:`);
      console.log(`  App source: "${appMeal.image_filename}" → slugify: "${expectedFromApp}"`);
      console.log(`  Website: "${websiteValue}" (MANUAL PATCH)`);
      console.log(`  → Will add web_image_filename: "${websiteValue}"\n`);
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
          if (!migrations[slug]) migrations[slug] = {};
          if (!migrations[slug].plates) migrations[slug].plates = {};
          migrations[slug].plates[websitePlate.display_name] = { web_image_filename: websiteValue };
          mealNeedsMigration = true;
          plateCount++;
          console.log(`PLATE ${slug}.${websitePlate.display_name}:`);
          console.log(`  App source: "${appPlate.image_filename}" → slugify: "${expectedFromApp}"`);
          console.log(`  Website: "${websiteValue}" (MANUAL PATCH)`);
          console.log(`  → Will add web_image_filename: "${websiteValue}"\n`);
        }
      }
    });
  }
});

console.log('=== MIGRATION SUMMARY ===');
console.log(`Multi-plate meals analyzed: ${Object.keys(websiteMeals).filter(slug => websiteMeals[slug].plates?.length > 1).length}`);
console.log(`Meals needing web_image_filename: ${mealCount}`);
console.log(`Plates needing web_image_filename: ${plateCount}`);
console.log(`Total meals with migrations: ${Object.keys(migrations).length}\n`);

if (Object.keys(migrations).length === 0) {
  console.log('✅ No migrations needed - all source data already matches website!');
} else {
  console.log('=== MIGRATIONS TO APPLY ===');
  console.log('Add these web_image_filename fields to curated_meals.ts:\n');
  
  Object.entries(migrations).forEach(([slug, changes]) => {
    console.log(`// ${slug}`);
    if (changes.web_image_filename) {
      console.log(`web_image_filename: '${changes.web_image_filename}',`);
    }
    if (changes.plates) {
      Object.entries(changes.plates).forEach(([plateName, plateChanges]) => {
        console.log(`// In plate "${plateName}":`);
        console.log(`web_image_filename: '${plateChanges.web_image_filename}',`);
      });
    }
    console.log('');
  });
}

// Write detailed migration data for step 3
fs.writeFileSync('./migration_data.json', JSON.stringify(migrations, null, 2));
console.log('Migration data saved to migration_data.json for application to source files.');