import { INGREDIENTS } from '../data/ingredients';
import { CURATED_MEALS } from '../data/curated_meals';
import { AllergenType } from '../types/curated_meals';

/**
 * Validates the integrity of the ingredients table at runtime.
 * Checks for:
 * - Key/ID mismatches
 * - Valid typical_pack_size values
 * - Duplicate display names
 * 
 * @throws {Error} if any validation check fails
 */
export function validateIngredientsTable(): void {
  const displayNames = new Set<string>();
  
  for (const [key, ingredient] of Object.entries(INGREDIENTS)) {
    // Check that record key matches ingredient ID
    if (key !== ingredient.id) {
      throw new Error(
        `Ingredient key mismatch: record key "${key}" does not match ingredient ID "${ingredient.id}"`
      );
    }
    
    // Check typical_pack_size is positive if present
    if (ingredient.typical_pack_size !== undefined) {
      if (ingredient.typical_pack_size <= 0) {
        throw new Error(
          `Invalid typical_pack_size for ingredient "${ingredient.id}": must be positive, got ${ingredient.typical_pack_size}`
        );
      }
    }
    
    // Check for duplicate display names
    if (displayNames.has(ingredient.display_name)) {
      throw new Error(
        `Duplicate display_name found: "${ingredient.display_name}" is used by multiple ingredients`
      );
    }
    displayNames.add(ingredient.display_name);
  }
}

/**
 * Validates the integrity of the curated meals table at runtime.
 * Checks for:
 * - Key/slug mismatches
 * - Valid produces_servings
 * - At least one plate exists
 * - Unique plate IDs within a meal
 * - All ingredient IDs exist in ingredients table (methods and plates)
 * - Units match canonical units (methods and plates)
 * - Flex ingredient is used and exists (methods or plates)
 * - Unique method IDs
 * - Allergens properly declared (from methods and plates)
 * - Valid scale ranges
 * - Valid plate fields
 * 
 * @throws {Error} if any validation check fails
 */
export function validateCuratedMeals(): void {
  for (const [key, meal] of Object.entries(CURATED_MEALS)) {
    // Check that record key matches meal slug
    if (key !== meal.slug) {
      throw new Error(
        `Meal key mismatch: record key "${key}" does not match meal slug "${meal.slug}"`
      );
    }
    
    // Check produces_servings is positive integer
    if (!Number.isInteger(meal.produces_servings) || meal.produces_servings <= 0) {
      throw new Error(
        `Invalid produces_servings for meal "${meal.slug}": must be positive integer, got ${meal.produces_servings}`
      );
    }
    
    // Check at least one plate exists
    if (!meal.plates || meal.plates.length === 0) {
      throw new Error(
        `Meal "${meal.slug}" must have at least one plate`
      );
    }
    
    // Check unique plate IDs
    const plateIds = new Set<string>();
    for (const plate of meal.plates) {
      if (plateIds.has(plate.id)) {
        throw new Error(
          `Duplicate plate ID "${plate.id}" in meal "${meal.slug}"`
        );
      }
      plateIds.add(plate.id);
      
      // Check plate fields
      if (plate.base_serving_multiplier <= 0) {
        throw new Error(
          `Invalid base_serving_multiplier for plate "${plate.id}" in meal "${meal.slug}": must be positive, got ${plate.base_serving_multiplier}`
        );
      }
      
      if (plate.assembly_time_minutes < 0) {
        throw new Error(
          `Invalid assembly_time_minutes for plate "${plate.id}" in meal "${meal.slug}": must be non-negative, got ${plate.assembly_time_minutes}`
        );
      }
      
      // Check equipment_required field if present
      if (plate.equipment_required !== undefined) {
        if (!Array.isArray(plate.equipment_required) || plate.equipment_required.length === 0) {
          throw new Error(
            `Invalid equipment_required for plate "${plate.id}" in meal "${meal.slug}": must be non-empty array when present, got ${JSON.stringify(plate.equipment_required)}`
          );
        }
      }
    }
    
    // Check min_scale and max_scale
    if (meal.min_scale <= 0) {
      throw new Error(
        `Invalid min_scale for meal "${meal.slug}": must be positive, got ${meal.min_scale}`
      );
    }
    if (meal.min_scale >= meal.max_scale) {
      throw new Error(
        `Invalid scale range for meal "${meal.slug}": min_scale (${meal.min_scale}) must be less than max_scale (${meal.max_scale})`
      );
    }
    
    // Check flex_ingredient_id exists in ingredients table
    if (!INGREDIENTS[meal.flex_ingredient_id]) {
      throw new Error(
        `Flex ingredient "${meal.flex_ingredient_id}" for meal "${meal.slug}" does not exist in ingredients table`
      );
    }
    
    // Track all allergens from all ingredients across all methods and plates
    const allAllergens = new Set<AllergenType>();
    let flexIngredientUsed = false;
    const methodIds = new Set<string>();
    
    // Validate cooking methods
    for (const method of meal.methods) {
      // Check for unique method IDs
      if (methodIds.has(method.id)) {
        throw new Error(
          `Duplicate method ID "${method.id}" in meal "${meal.slug}"`
        );
      }
      methodIds.add(method.id);
      
      for (const mealIngredient of method.ingredients) {
        const ingredient = INGREDIENTS[mealIngredient.ingredient_id];
        
        // Check ingredient exists
        if (!ingredient) {
          throw new Error(
            `Ingredient "${mealIngredient.ingredient_id}" in method "${method.id}" of meal "${meal.slug}" does not exist in ingredients table`
          );
        }
        
        // Check unit matches canonical unit
        if (mealIngredient.unit !== ingredient.canonical_unit) {
          throw new Error(
            `Unit mismatch for ingredient "${mealIngredient.ingredient_id}" in method "${method.id}" of meal "${meal.slug}": ` +
            `expected "${ingredient.canonical_unit}" but got "${mealIngredient.unit}"`
          );
        }
        
        // Track if flex ingredient is used
        if (mealIngredient.ingredient_id === meal.flex_ingredient_id) {
          flexIngredientUsed = true;
        }
        
        // Collect allergens from this ingredient
        for (const allergen of ingredient.allergens) {
          allAllergens.add(allergen);
        }
      }
    }
    
    // Validate plates
    for (const plate of meal.plates) {
      for (const mealIngredient of plate.additional_ingredients) {
        const ingredient = INGREDIENTS[mealIngredient.ingredient_id];
        
        // Check ingredient exists
        if (!ingredient) {
          throw new Error(
            `Ingredient "${mealIngredient.ingredient_id}" in plate "${plate.id}" of meal "${meal.slug}" does not exist in ingredients table`
          );
        }
        
        // Check unit matches canonical unit
        if (mealIngredient.unit !== ingredient.canonical_unit) {
          throw new Error(
            `Unit mismatch for ingredient "${mealIngredient.ingredient_id}" in plate "${plate.id}" of meal "${meal.slug}": ` +
            `expected "${ingredient.canonical_unit}" but got "${mealIngredient.unit}"`
          );
        }
        
        // Track if flex ingredient is used
        if (mealIngredient.ingredient_id === meal.flex_ingredient_id) {
          flexIngredientUsed = true;
        }
        
        // Collect allergens from this ingredient
        for (const allergen of ingredient.allergens) {
          allAllergens.add(allergen);
        }
      }
    }
    
    // Check flex ingredient is actually used in at least one method or plate
    if (!flexIngredientUsed) {
      throw new Error(
        `Flex ingredient "${meal.flex_ingredient_id}" is not used in any method or plate of meal "${meal.slug}"`
      );
    }
    
    // Check that meal contains_allergens is a superset of all ingredient allergens
    const mealAllergens = new Set(meal.contains_allergens);
    allAllergens.forEach(allergen => {
      if (!mealAllergens.has(allergen)) {
        throw new Error(
          `Meal "${meal.slug}" does not declare allergen "${allergen}" which is present in its ingredients`
        );
      }
    });
    
    // Validate meal image fields
    if (meal.image_filename !== undefined) {
      // Check file extension
      const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
      const hasValidExtension = validExtensions.some(ext => 
        meal.image_filename!.toLowerCase().endsWith(ext)
      );
      if (!hasValidExtension) {
        throw new Error(
          `Invalid image_filename for meal "${meal.slug}": "${meal.image_filename}" must end with .png, .jpg, .jpeg, or .webp`
        );
      }
      
      // Check for path separators
      if (meal.image_filename.includes('/') || meal.image_filename.includes('\\')) {
        throw new Error(
          `Invalid image_filename for meal "${meal.slug}": "${meal.image_filename}" must be a filename only, no path separators`
        );
      }
    }
    
    if (meal.photo_url !== undefined) {
      if (!meal.photo_url.startsWith('https://')) {
        throw new Error(
          `Invalid photo_url for meal "${meal.slug}": "${meal.photo_url}" must start with https://`
        );
      }
    }
    
    // Validate plate image fields
    for (const plate of meal.plates) {
      if (plate.image_filename !== undefined) {
        // Check file extension
        const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
        const hasValidExtension = validExtensions.some(ext => 
          plate.image_filename!.toLowerCase().endsWith(ext)
        );
        if (!hasValidExtension) {
          throw new Error(
            `Invalid image_filename for plate "${plate.id}" in meal "${meal.slug}": "${plate.image_filename}" must end with .png, .jpg, .jpeg, or .webp`
          );
        }
        
        // Check for path separators
        if (plate.image_filename.includes('/') || plate.image_filename.includes('\\')) {
          throw new Error(
            `Invalid image_filename for plate "${plate.id}" in meal "${meal.slug}": "${plate.image_filename}" must be a filename only, no path separators`
          );
        }
      }
      
      if (plate.photo_url !== undefined) {
        if (!plate.photo_url.startsWith('https://')) {
          throw new Error(
            `Invalid photo_url for plate "${plate.id}" in meal "${meal.slug}": "${plate.photo_url}" must start with https://`
          );
        }
      }
    }
  }
}

/**
 * Validates both ingredients and curated meals tables.
 * This is the main validation function to call at app startup.
 * 
 * @throws {Error} if any validation check fails
 */
export function validateAll(): void {
  validateIngredientsTable();
  validateCuratedMeals();
}