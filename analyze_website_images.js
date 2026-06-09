const fs = require('fs');
const path = require('path');

// Exact slugifyImage transform from the website
function slugifyImage(f) {
  if (!f) return '';
  var ext = (f.match(/\.(png|jpe?g|webp)$/i) || ['', 'png'])[1].toLowerCase();
  var base = f.replace(/\.(png|jpe?g|webp)$/i, '');
  var slug = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-').toLowerCase();
  return slug + '.' + ext;
}

console.log('=== WEBSITE IMAGE ANALYSIS ===\n');

// 1. Parse meals.json and collect all image_filename values
console.log('1. Parsing meals.json...');
const mealsData = JSON.parse(fs.readFileSync('meals.json', 'utf8'));
const allImageFilenames = new Set();

Object.values(mealsData).forEach(meal => {
  // Meal-level image_filename
  if (meal.image_filename) {
    allImageFilenames.add(meal.image_filename);
  }
  
  // Plate-level image_filename
  if (meal.plates) {
    meal.plates.forEach(plate => {
      if (plate.image_filename) {
        allImageFilenames.add(plate.image_filename);
      }
    });
  }
});

console.log(`Found ${allImageFilenames.size} unique image_filename values\n`);

// 2. Generate expected slugified filenames
console.log('2. Computing expected slugified filenames...');
const filenameToSlug = new Map();
allImageFilenames.forEach(filename => {
  const slug = slugifyImage(filename);
  filenameToSlug.set(filename, slug);
});

// 3. List actual contents of images/meals/
console.log('3. Checking images/meals/ directory...');
const imagesMealsDir = 'images/meals';
let actualFiles = new Set();

if (fs.existsSync(imagesMealsDir)) {
  actualFiles = new Set(fs.readdirSync(imagesMealsDir));
  console.log(`Found ${actualFiles.size} files in ${imagesMealsDir}/\n`);
} else {
  console.log(`Directory ${imagesMealsDir}/ does not exist!\n`);
}

// 4. Cross-reference: find mismatches
console.log('4. Cross-referencing expected slugs vs actual files...\n');
console.log('| Original Filename | Expected Slug | Status |');
console.log('|-------------------|---------------|--------|');

const missing = [];
const present = [];

filenameToSlug.forEach((slug, original) => {
  if (actualFiles.has(slug)) {
    console.log(`| ${original} | ${slug} | ✓ OK |`);
    present.push({ original, slug, status: 'already-ok' });
  } else {
    console.log(`| ${original} | ${slug} | ❌ MISSING |`);
    missing.push({ original, slug, status: 'missing' });
  }
});

console.log(`\nSUMMARY:`);
console.log(`- ${present.length} images OK`);
console.log(`- ${missing.length} images MISSING`);

if (missing.length > 0) {
  console.log(`\nMISSING FILES:`);
  missing.forEach(item => {
    console.log(`  ${item.original} -> ${item.slug}`);
  });
}

// 5. Check for potential renames (case differences, etc.)
console.log(`\n5. Checking for potential renames...`);
missing.forEach(item => {
  // Look for similar files in actual directory
  const lowerSlug = item.slug.toLowerCase();
  const potentialMatches = Array.from(actualFiles).filter(file => 
    file.toLowerCase() === lowerSlug ||
    file.toLowerCase().replace(/[-_]/g, '') === lowerSlug.replace(/[-_]/g, '')
  );
  
  if (potentialMatches.length > 0) {
    console.log(`  ${item.original} -> ${item.slug}`);
    console.log(`    Potential matches: ${potentialMatches.join(', ')}`);
  }
});