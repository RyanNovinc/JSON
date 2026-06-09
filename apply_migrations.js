const fs = require('fs');

console.log('=== APPLYING MIGRATIONS TO CURATED_MEALS.TS ===');

// Read the migration data
const migrations = JSON.parse(fs.readFileSync('./migration_data.json', 'utf8'));

// Read the curated meals file
const filePath = './src/data/curated_meals.ts';
let content = fs.readFileSync(filePath, 'utf8');

let changeCount = 0;

Object.entries(migrations).forEach(([slug, changes]) => {
  console.log(`\nProcessing ${slug}...`);
  
  // Find the meal section
  const mealPattern = new RegExp(`${slug}:\\s*{([\\s\\S]*?)},\\s*\\n\\s*(?:[a-z_]+:|})`, 'g');
  const mealMatch = mealPattern.exec(content);
  
  if (!mealMatch) {
    console.log(`  ❌ Could not find meal ${slug}`);
    return;
  }
  
  let mealSection = mealMatch[0];
  
  // Apply meal-level web_image_filename
  if (changes.web_image_filename) {
    const imagePattern = /image_filename:\s*'([^']+)'/;
    const match = imagePattern.exec(mealSection);
    if (match) {
      const replacement = `image_filename: '${match[1]}',\n    web_image_filename: '${changes.web_image_filename}',`;
      mealSection = mealSection.replace(imagePattern, replacement);
      changeCount++;
      console.log(`  ✅ Added meal web_image_filename: '${changes.web_image_filename}'`);
    }
  }
  
  // Apply plate-level web_image_filename
  if (changes.plates) {
    Object.entries(changes.plates).forEach(([plateName, plateChanges]) => {
      // Find the specific plate by display_name
      const platePattern = new RegExp(`display_name:\\s*'${plateName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}'[\\s\\S]*?(?=},\\s*{|},?\\s*\\])`);
      const plateMatch = platePattern.exec(mealSection);
      
      if (plateMatch) {
        const plateSection = plateMatch[0];
        const plateImagePattern = /image_filename:\s*'([^']+)'/;
        const plateImageMatch = plateImagePattern.exec(plateSection);
        
        if (plateImageMatch) {
          const plateReplacement = `image_filename: '${plateImageMatch[1]}',\n        web_image_filename: '${plateChanges.web_image_filename}',`;
          const newPlateSection = plateSection.replace(plateImagePattern, plateReplacement);
          mealSection = mealSection.replace(plateSection, newPlateSection);
          changeCount++;
          console.log(`  ✅ Added plate "${plateName}" web_image_filename: '${plateChanges.web_image_filename}'`);
        }
      } else {
        console.log(`  ❌ Could not find plate "${plateName}" in ${slug}`);
      }
    });
  }
  
  // Replace the meal section in the content
  content = content.replace(mealMatch[0], mealSection);
});

// Write the updated file
fs.writeFileSync(filePath, content);

console.log(`\n=== MIGRATION COMPLETE ===`);
console.log(`Applied ${changeCount} web_image_filename changes to curated_meals.ts`);