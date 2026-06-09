const fs = require('fs');

// Import curated meals data
const curatedMealsContent = fs.readFileSync('./src/data/curated_meals.ts', 'utf8');

// Extract the CURATED_MEALS object from TypeScript content
// This is a simple regex approach - for production, you'd want a proper TS parser
const objectMatch = curatedMealsContent.match(/export const CURATED_MEALS[^{]*({[\s\S]*})[^}]*;/);
if (!objectMatch) {
  console.error('Could not extract CURATED_MEALS object from TypeScript file');
  process.exit(1);
}

// Create a temporary JS file to require the data
// Remove import statements, type annotations, and replace export
const cleanContent = curatedMealsContent
  .replace(/import[^;]+;/g, '') // Remove import statements
  .replace(/export const CURATED_MEALS: Record<[^>]+> = /g, 'module.exports = '); // Replace export with type annotation

const tempJsContent = `
// Temporary file to export curated meals data
${cleanContent}
`;

fs.writeFileSync('./temp_curated_meals.js', tempJsContent);

try {
  // Load the data
  const CURATED_MEALS = require('./temp_curated_meals.js');
  
  // Load web image overrides
  let webImageOverrides = {};
  try {
    webImageOverrides = JSON.parse(fs.readFileSync('./src/data/web_image_overrides.json', 'utf8'));
  } catch (error) {
    console.log('No web_image_overrides.json found, using standard behavior');
  }
  
  console.log('=== REGENERATING MEALS.JSON ===');
  console.log(`Loaded ${Object.keys(CURATED_MEALS).length} meals from curated_meals.ts`);
  console.log(`Loaded ${Object.keys(webImageOverrides).length} meal overrides from web_image_overrides.json`);
  
  // Process each meal to apply web image overrides
  const processedMeals = {};
  let webOverrideCount = 0;
  
  Object.entries(CURATED_MEALS).forEach(([slug, meal]) => {
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
  
  // Write to meals.json
  const jsonOutput = JSON.stringify(processedMeals, null, 2);
  fs.writeFileSync('./meals.json', jsonOutput);
  
  console.log('✅ Successfully regenerated meals.json');
  
  // Count image references
  let imageCount = 0;
  Object.values(CURATED_MEALS).forEach(meal => {
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
  
} catch (error) {
  console.error('Error loading curated meals:', error);
} finally {
  // Clean up temporary file
  if (fs.existsSync('./temp_curated_meals.js')) {
    fs.unlinkSync('./temp_curated_meals.js');
  }
}