const fs = require('fs');

console.log('=== APPLYING WEB OVERRIDES TO CURRENT MEALS.JSON ===');

// Read current meals.json and overrides
const currentMealsPath = './meals.json';
const currentMeals = JSON.parse(fs.readFileSync(currentMealsPath, 'utf8'));

let webImageOverrides = {};
try {
  webImageOverrides = JSON.parse(fs.readFileSync('./src/data/web_image_overrides.json', 'utf8'));
} catch (error) {
  console.log('No web_image_overrides.json found, exiting');
  process.exit(1);
}

console.log(`Loaded ${Object.keys(currentMeals).length} meals from current meals.json`);
console.log(`Loaded ${Object.keys(webImageOverrides).length} meal overrides from web_image_overrides.json`);

// Process each meal to apply web image overrides
const processedMeals = {};
let webOverrideCount = 0;

Object.entries(currentMeals).forEach(([slug, meal]) => {
  const processedMeal = { ...meal };
  const overrides = webImageOverrides[slug];
  
  // Apply meal-level override if present
  if (overrides?.image_filename) {
    processedMeal.image_filename = overrides.image_filename;
    webOverrideCount++;
  }
  
  // Process plates with overrides
  if (meal.plates && overrides?.plates) {
    processedMeal.plates = meal.plates.map(plate => {
      const plateOverride = overrides.plates[plate.display_name];
      if (plateOverride) {
        webOverrideCount++;
        return { ...plate, image_filename: plateOverride };
      }
      return plate;
    });
  }
  
  processedMeals[slug] = processedMeal;
});

console.log(`📸 Applied ${webOverrideCount} web image filename overrides`);

// Write updated meals.json
const jsonOutput = JSON.stringify(processedMeals, null, 2);
fs.writeFileSync('./meals.json', jsonOutput);

console.log('✅ Successfully updated meals.json with web overrides');

// Count image references
let imageCount = 0;
Object.values(processedMeals).forEach(meal => {
  if (meal.image_filename) imageCount++;
  if (meal.plates) {
    meal.plates.forEach(plate => {
      if (plate.image_filename) imageCount++;
    });
  }
});

console.log(`📸 Found ${imageCount} image filename references`);

// SAFETY NET: Check that all image_filename values exist as files in the website
console.log('\n=== SAFETY CHECK: Verifying image files exist ===');

function slugifyImage(f) {
  if (!f) return '';
  var ext = (f.match(/\.(png|jpe?g|webp)$/i) || ['', 'png'])[1].toLowerCase();
  var base = f.replace(/\.(png|jpe?g|webp)$/i, '');
  var slug = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').toLowerCase();
  return slug + '.' + ext;
}

const websiteImagesDir = '/Users/ryannovinc/Desktop/JSON.fit-website/images/meals';
let websiteFiles = new Set();

try {
  websiteFiles = new Set(fs.readdirSync(websiteImagesDir));
} catch (error) {
  console.log(`⚠️ WARNING: Could not read website images directory: ${websiteImagesDir}`);
  console.log('Skipping safety check - website directory not accessible');
}

if (websiteFiles.size > 0) {
  const missingFiles = [];
  
  Object.values(processedMeals).forEach(meal => {
    if (meal.image_filename) {
      const slugified = slugifyImage(meal.image_filename);
      if (!websiteFiles.has(slugified)) {
        missingFiles.push({
          type: 'meal',
          original: meal.image_filename,
          expected: slugified,
          meal: meal.name
        });
      }
    }
    
    if (meal.plates) {
      meal.plates.forEach(plate => {
        if (plate.image_filename) {
          const slugified = slugifyImage(plate.image_filename);
          if (!websiteFiles.has(slugified)) {
            missingFiles.push({
              type: 'plate',
              original: plate.image_filename,
              expected: slugified,
              meal: meal.name,
              plate: plate.display_name
            });
          }
        }
      });
    }
  });
  
  if (missingFiles.length === 0) {
    console.log(`✅ All ${imageCount} image files verified present in website`);
  } else {
    console.log(`⚠️ WARNING: ${missingFiles.length} image files missing from website:`);
    missingFiles.forEach(missing => {
      if (missing.type === 'meal') {
        console.log(`  MEAL "${missing.meal}": "${missing.original}" → expects "${missing.expected}"`);
      } else {
        console.log(`  PLATE "${missing.meal}.${missing.plate}": "${missing.original}" → expects "${missing.expected}"`);
      }
    });
    console.log(`\n⚠️ These files should be added to ${websiteImagesDir}/`);
  }
}