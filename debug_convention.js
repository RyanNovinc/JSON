const fs = require('fs');

// Read mealImages to get keys
const mealImagesContent = fs.readFileSync('./src/assets/mealImages.ts', 'utf8');
const mealImageMatches = mealImagesContent.match(/'([^']+\.png)':/g) || [];
const mealImageKeys = mealImageMatches.map(match => match.slice(1, -2));

console.log('=== CONVENTION MISMATCH ANALYSIS ===');

// Test known mismatches
const testCases = [
  'butter_chicken_with_rice.png',
  'brekkie_grow.png', 
  'mango_mass.png',
  'Chicken Schnitzel.png',
  'Schnitzel Plate (plate).png'
];

testCases.forEach(filename => {
  const hasKey = mealImageKeys.includes(filename);
  console.log(`${hasKey ? '✅' : '❌'} "${filename}"`);
  if (!hasKey) {
    // Look for similar keys
    const similar = mealImageKeys.filter(key => 
      key.toLowerCase().replace(/[^a-z]/g, '') === filename.toLowerCase().replace(/[^a-z]/g, '')
    );
    if (similar.length > 0) {
      console.log(`   Similar: ${similar.map(s => `"${s}"`).join(', ')}`);
    }
  }
});

console.log('\n=== SAMPLE MISMATCHED PAIRS ===');
console.log('Data uses: "butter_chicken_with_rice.png"');
console.log('Registry expects: "Butter Chicken with Basmati Rice.png"');
console.log('');
console.log('Data uses: "brekkie_grow.png"'); 
console.log('Registry expects: "Brekkie to GROW-Grow.png"');
console.log('');
console.log('Data uses: "mango_mass.png"');
console.log('Registry expects: "Mango Mass.png"');