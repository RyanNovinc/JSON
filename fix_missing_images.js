const fs = require('fs');
const path = require('path');

// Exact slugifyImage transform from the website
function slugifyImage(f) {
  if (!f) return '';
  let ext = (f.match(/\.(png|jpe?g|webp)$/i) || ['', 'png'])[1].toLowerCase();
  let base = f.replace(/\.(png|jpe?g|webp)$/i, '');
  let slug = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-').toLowerCase();
  return slug + '.' + ext;
}

console.log('=== FIXING MISSING IMAGES ===\n');

const sourceDir = 'src/assets/meals';
const targetDir = 'images/meals';

// Manual mappings for the missing files based on the app's naming conventions
const manualMappings = {
  // Pulled Pork variants
  'BBQ Pulled Pork Burger (sandwich).png': 'pulled_pork_sandwich.png',
  'Pulled Pork Rice Bowl (bowl).png': 'pulled_pork_bowl.png',
  'Loaded Pulled Pork Baked Potato (baked_potato).png': 'pulled_pork_baked_potato.png',
  'Pulled Pork Tacos (tacos).png': 'pulled_pork_tacos.png',
  'Pulled Pork Mac & Cheese Stack ⚡ STUNT PLATE (mac_cheese).png': 'pulled_pork_mac_cheese.png',
  
  // Bolognese variants
  'Spaghetti Bolognese (spaghetti).png': 'bolognese_spaghetti.png',
  'Loaded Bolognese Baked Potato (baked_potato).png': 'bolognese_baked_potato.png',
  'Bolognese with Garlic Bread (garlic_bread).png': 'bolognese_garlic_bread.png',
  'Bolognese Lasagne ⚡ STUNT PLATE (lasagne).png': 'bolognese_lasagne.png',
  
  // Chilli variants
  'Bulking Chilli Bowl.png': 'chilli_con_carne_bowl.png',
  'Loaded Chilli Nachos ⚡ STUNT.png': 'chilli_con_carne_nachos.png',
  
  // Lamb and Beef variants
  'Lamb Shank on Creamy Mash.png': 'lamb_shanks_mash.png',
  'Beef Stew on Creamy Mash.png': 'beef_stew_mash.png',
  'Beef Stew with Crusty Bread.png': 'beef_stew_bread.png',
  
  // Thai variants
  'Thai Basil Chicken with Fried Egg (fried_egg).png': 'thai_basil_chicken_with_fried_egg.png',
  
  // Chipotle variants
  'Spicy Chipotle Chicken Burrito Bowl (burrito_bowl).png': 'spicy_chipotle_chicken_burrito_bowl.png',
  
  // Shawarma variants
  'Chicken Shawarma Wrap (wrap).png': 'chicken_shawarma_wrap.png',
  'Chicken Shawarma Rice Bowl (rice_bowl).png': 'chicken_shawarma_rice_bowl.png',
  
  // Kofta variants
  'Lamb Kofta Rice Bowl (rice_bowl).png': 'lamb_kofta_rice_bowl.png',
  'Lamb Kofta Wrap (wrap).png': 'lamb_kofta_wrap.png',
  
  // Schnitzel variants
  'Schnitzel Roll (roll).png': 'schnitzel_roll.png'
};

console.log('Processing missing images with manual mappings...\n');
console.log('| Original Filename | Expected Slug | Source File | Status |');
console.log('|-------------------|---------------|-------------|--------|');

let fixed = 0;
let stillMissing = 0;

Object.entries(manualMappings).forEach(([originalFilename, sourceFilename]) => {
  const expectedSlug = slugifyImage(originalFilename);
  const sourcePath = path.join(sourceDir, sourceFilename);
  const targetPath = path.join(targetDir, expectedSlug);
  
  let status = '';
  
  if (fs.existsSync(sourcePath)) {
    if (fs.existsSync(targetPath)) {
      status = '✓ Already exists';
    } else {
      try {
        fs.copyFileSync(sourcePath, targetPath);
        status = '✓ Fixed';
        fixed++;
      } catch (err) {
        status = `❌ Copy failed: ${err.message}`;
        stillMissing++;
      }
    }
  } else {
    status = '❌ Source still not found';
    stillMissing++;
  }
  
  console.log(`| ${originalFilename} | ${expectedSlug} | ${sourceFilename} | ${status} |`);
});

console.log(`\nSUMMARY:`);
console.log(`- ${fixed} files fixed`);
console.log(`- ${stillMissing} files still missing`);

if (stillMissing > 0) {
  console.log('\nChecking available source files for missing images...');
  const sourceFiles = fs.readdirSync(sourceDir);
  
  Object.entries(manualMappings).forEach(([originalFilename, sourceFilename]) => {
    if (!fs.existsSync(path.join(sourceDir, sourceFilename))) {
      console.log(`Missing source: ${sourceFilename}`);
      // Look for similar files
      const similar = sourceFiles.filter(f => 
        f.includes(sourceFilename.replace('.png', '').split('_')[0]) ||
        f.includes(sourceFilename.replace('.png', '').split('_')[1])
      );
      if (similar.length > 0) {
        console.log(`  Similar files: ${similar.slice(0, 3).join(', ')}`);
      }
    }
  });
}