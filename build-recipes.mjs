import fs from 'fs';
import path from 'path';

// Base URLs for absolute links
const SITE_BASE = 'https://json.fit';
const IMAGE_BASE = 'https://json.fit/images/meals/';

// Convert underscores to hyphens for image filenames (proven logic)
function slugifyImage(filename) {
  return filename ? filename.replace(/_/g, '-') : '';
}

// ACCESSORS - adjust these if field names in r/meals.json don't match
const ACCESSORS = {
  slug: meal => meal.slug,
  title: meal => meal.display_name,
  image: meal => meal.image_filename,
  description: meal => meal.plates?.[0]?.description || 'Delicious homemade recipe',
  ingredients: meal => {
    const method = meal.methods?.[0];
    if (!method || !method.ingredients) return [];
    return method.ingredients.map(ing => ({
      name: ing.ingredient_id.replace(/_/g, ' '),
      amount: ing.base_amount,
      unit: ing.unit,
      notes: ing.notes || ''
    }));
  },
  instructions: meal => {
    const method = meal.methods?.[0];
    if (!method || !method.instructions) return [];
    return method.instructions.map((inst, index) => ({
      step: index + 1,
      text: inst.summary
    }));
  },
  macros: meal => meal.plates?.[0]?.plate_macros || {},
  servings: meal => meal.produces_servings || 1,
  cuisine: meal => meal.cuisine || '',
  protein: meal => meal.primary_protein || ''
};

function generateRecipeHTML(meal) {
  const slug = ACCESSORS.slug(meal);
  const title = ACCESSORS.title(meal);
  const image = ACCESSORS.image(meal);
  const description = ACCESSORS.description(meal);
  const ingredients = ACCESSORS.ingredients(meal);
  const instructions = ACCESSORS.instructions(meal);
  const macros = ACCESSORS.macros(meal);
  const servings = ACCESSORS.servings(meal);
  const cuisine = ACCESSORS.cuisine(meal);
  const protein = ACCESSORS.protein(meal);

  // Generate absolute URLs
  const pageUrl = `${SITE_BASE}/r/${slug}/`;
  const imageUrl = image ? `${IMAGE_BASE}${slugifyImage(image)}` : '';
  const relativeImageUrl = image ? `../images/${slugifyImage(image)}` : '';
  
  const jsonLdIngredients = ingredients.map(ing => 
    `${ing.amount} ${ing.unit || ''} ${ing.name}`.trim()
  );

  const jsonLdInstructions = instructions.map(inst => ({
    "@type": "HowToStep",
    "name": `Step ${inst.step}`,
    "text": inst.text
  }));

  const recipeJsonLd = {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    "name": title,
    "description": description,
    "image": imageUrl ? [imageUrl] : [],
    "url": pageUrl,
    "recipeIngredient": jsonLdIngredients,
    "recipeInstructions": jsonLdInstructions,
    "recipeYield": servings.toString(),
    "recipeCuisine": cuisine,
    "nutrition": {
      "@type": "NutritionInformation",
      "calories": macros.kcal ? `${macros.kcal} calories` : undefined,
      "proteinContent": macros.protein_g ? `${macros.protein_g}g` : undefined,
      "carbohydrateContent": macros.carbs_g ? `${macros.carbs_g}g` : undefined,
      "fatContent": macros.fat_g ? `${macros.fat_g}g` : undefined,
      "fiberContent": macros.fiber_g ? `${macros.fiber_g}g` : undefined
    }
  };

  const ingredientsList = ingredients.map(ing => 
    `<li>${ing.amount} ${ing.unit || ''} ${ing.name}${ing.notes ? ` (${ing.notes})` : ''}</li>`
  ).join('\n        ');

  const instructionsList = instructions.map(inst =>
    `<li><strong>Step ${inst.step}:</strong> ${inst.text}</li>`
  ).join('\n        ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
  <script type="application/ld+json">
${JSON.stringify(recipeJsonLd, null, 2)}
  </script>
</head>
<body>
  <header>
    <h1>${title}</h1>
  </header>
  
  <main>
    ${relativeImageUrl ? `<img src="${relativeImageUrl}" alt="${title}" style="max-width: 100%; height: auto;">` : ''}
    
    <section>
      <h2>Description</h2>
      <p>${description}</p>
    </section>

    <section>
      <h2>Recipe Info</h2>
      <ul>
        <li><strong>Servings:</strong> ${servings}</li>
        ${cuisine ? `<li><strong>Cuisine:</strong> ${cuisine}</li>` : ''}
        ${protein ? `<li><strong>Primary Protein:</strong> ${protein}</li>` : ''}
        ${macros.kcal ? `<li><strong>Calories:</strong> ${macros.kcal} per serving</li>` : ''}
        ${macros.protein_g ? `<li><strong>Protein:</strong> ${macros.protein_g}g</li>` : ''}
        ${macros.carbs_g ? `<li><strong>Carbs:</strong> ${macros.carbs_g}g</li>` : ''}
        ${macros.fat_g ? `<li><strong>Fat:</strong> ${macros.fat_g}g</li>` : ''}
      </ul>
    </section>

    ${ingredients.length > 0 ? `
    <section>
      <h2>Ingredients</h2>
      <ul>
        ${ingredientsList}
      </ul>
    </section>` : ''}

    ${instructions.length > 0 ? `
    <section>
      <h2>Instructions</h2>
      <ol>
        ${instructionsList}
      </ol>
    </section>` : ''}
  </main>
</body>
</html>`;
}

function main() {
  try {
    // Import curated meals from TypeScript file (convert to JSON-like structure)
    const mealsTS = fs.readFileSync('./src/data/curated_meals.ts', 'utf8');
    
    // Extract the meals object using a more robust regex
    const exportMatch = mealsTS.match(/export const CURATED_MEALS: Record<[^>]+> = (\{[\s\S]*?\n\};)/);
    if (!exportMatch) {
      throw new Error('Could not find CURATED_MEALS export in TypeScript file');
    }
    
    // Create a simplified parser - since we need to work with existing pages,
    // let's extract the key data we need from the TypeScript structure
    const mealsCode = exportMatch[1];
    
    // For now, let's work with the existing directories to regenerate them
    const rDir = './r';
    if (!fs.existsSync(rDir)) {
      fs.mkdirSync(rDir);
    }
    
    const existingDirs = fs.readdirSync(rDir).filter(dir => 
      fs.statSync(path.join(rDir, dir)).isDirectory()
    );
    
    console.log(`Found ${existingDirs.length} existing recipe directories`);
    
    // Create mock meals data from directory names for regeneration
    const meals = existingDirs.map(slug => {
      // Try to read existing HTML to extract some data
      try {
        const htmlPath = path.join(rDir, slug, 'index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
        const imageMatch = html.match(/og:image" content="[^"]*\/([^"/]+\.png)"/);
        
        return {
          slug: slug,
          display_name: titleMatch ? titleMatch[1] : slug.replace(/_/g, ' '),
          image_filename: imageMatch ? imageMatch[1] : `${slug}.png`,
          plates: [{
            description: descMatch ? descMatch[1] : 'Delicious homemade recipe'
          }],
          methods: [{ ingredients: [], instructions: [] }],
          produces_servings: 1,
          cuisine: '',
          primary_protein: ''
        };
      } catch (error) {
        console.warn(`Could not read existing data for ${slug}, using defaults`);
        return {
          slug: slug,
          display_name: slug.replace(/_/g, ' '),
          image_filename: `${slug}.png`,
          plates: [{ description: 'Delicious homemade recipe' }],
          methods: [{ ingredients: [], instructions: [] }],
          produces_servings: 1,
          cuisine: '',
          primary_protein: ''
        };
      }
    });
    console.log(`Found ${meals.length} meals to process`);

    for (const meal of meals) {
      const slug = ACCESSORS.slug(meal);
      const title = ACCESSORS.title(meal);
      const ingredients = ACCESSORS.ingredients(meal);
      const instructions = ACCESSORS.instructions(meal);
      const macros = ACCESSORS.macros(meal);
      
      // Create directory for this meal
      const mealDir = path.join('r', slug);
      if (!fs.existsSync(mealDir)) {
        fs.mkdirSync(mealDir, { recursive: true });
      }

      // Generate HTML content
      const htmlContent = generateRecipeHTML(meal);
      
      // Write index.html
      const htmlPath = path.join(mealDir, 'index.html');
      fs.writeFileSync(htmlPath, htmlContent);

      // Log what we got for this page
      const hasIngredients = ingredients.length > 0;
      const hasInstructions = instructions.length > 0;
      const hasMacros = Object.keys(macros).length > 0;
      
      if (!hasIngredients && !hasInstructions) {
        console.log(`${slug}: head metadata only (no ingredients or instructions)`);
      } else {
        console.log(`${slug}: ${title} - ingredients: ${ingredients.length}, instructions: ${instructions.length}, macros: ${hasMacros ? 'yes' : 'no'}`);
      }
    }

    console.log('\\nRecipe page generation complete!');
  } catch (error) {
    console.error('Error generating recipe pages:', error);
    process.exit(1);
  }
}

main();