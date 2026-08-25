import fs from 'fs';
import path from 'path';

function checkRecipeImages() {
  console.log('🔍 Checking recipe page images...\n');
  
  // Find all recipe pages
  const rDir = './r';
  const recipeDirs = fs.readdirSync(rDir).filter(dir => 
    fs.statSync(path.join(rDir, dir)).isDirectory()
  );
  
  const referencedImages = new Set();
  const missingImages = [];
  const existingImages = [];
  
  // Check each recipe page for image references
  for (const slug of recipeDirs) {
    try {
      const htmlPath = path.join(rDir, slug, 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf8');
      
      // Extract og:image URL
      const ogImageMatch = html.match(/og:image" content="https:\/\/json\.fit\/images\/meals\/([^"]+)"/);
      if (ogImageMatch) {
        const imageFile = ogImageMatch[1];
        referencedImages.add(imageFile);
        
        // Check if image exists
        const imagePath = path.join('images/meals', imageFile);
        if (fs.existsSync(imagePath)) {
          existingImages.push({ slug, image: imageFile, path: imagePath });
        } else {
          missingImages.push({ slug, image: imageFile, path: imagePath });
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not check ${slug}: ${error.message}`);
    }
  }
  
  // Report results
  console.log(`📊 **IMAGE VERIFICATION RESULTS:**`);
  console.log(`- Total recipe pages: ${recipeDirs.length}`);
  console.log(`- Images referenced: ${referencedImages.size}`);
  console.log(`- Images existing: ${existingImages.length}`);
  console.log(`- Images missing: ${missingImages.length}\n`);
  
  if (existingImages.length > 0) {
    console.log('✅ **EXISTING IMAGES:**');
    existingImages.forEach(({ slug, image }) => {
      console.log(`   ${slug} → ${image}`);
    });
    console.log('');
  }
  
  if (missingImages.length > 0) {
    console.log('❌ **MISSING IMAGES:**');
    missingImages.forEach(({ slug, image }) => {
      console.log(`   ${slug} → ${image}`);
    });
    console.log('');
    console.log('These images need to be created or uploaded to images/meals/');
  }
  
  // Check images directory contents
  console.log('📁 **IMAGES DIRECTORY CONTENTS:**');
  try {
    const mealsDir = './images/meals';
    if (fs.existsSync(mealsDir)) {
      const files = fs.readdirSync(mealsDir);
      if (files.length > 0) {
        files.forEach(file => console.log(`   ${file}`));
      } else {
        console.log('   (empty)');
      }
    } else {
      console.log('   Directory does not exist');
    }
  } catch (error) {
    console.log(`   Error reading directory: ${error.message}`);
  }
}

checkRecipeImages();