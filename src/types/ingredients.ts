import { AllergenType } from './curated_meals';

/**
 * Unique identifier for each ingredient in the database
 */
export type IngredientId = 
  | 'almond_butter'
  | 'apple_cider_vinegar'
  | 'apple_juice_cloudy'
  | 'avocado'
  | 'bacon'
  | 'bagel'
  | 'baked_beans'
  | 'baking_potato'
  | 'baking_powder'
  | 'banana'
  | 'basmati_rice_dry'
  | 'bay_leaves_dried'
  | 'beef_chuck'
  | 'beef_mince_regular'
  | 'beef_stock_cube'
  | 'beef_stock_liquid'
  | 'black_beans_canned'
  | 'black_pepper_ground'
  | 'breakfast_sausage'
  | 'blueberries_frozen'
  | 'brioche_bun'
  | 'brioche_loaf'
  | 'brown_onion'
  | 'brown_sugar'
  | 'butter_chicken_jar_sauce'
  | 'butter_salted'
  | 'capsicum_red'
  | 'carrot'
  | 'cayenne_pepper'
  | 'celery'
  | 'cheese_tasty_grated'
  | 'cherry_tomatoes'
  | 'chia_seeds'
  | 'chicken_stock_liquid'
  | 'chicken_thigh_skinless'
  | 'cinnamon_ground'
  | 'cinnamon_stick'
  | 'cocoa_powder'
  | 'coconut_cream'
  | 'coconut_water'
  | 'coleslaw_mayo'
  | 'corn_chips'
  | 'cottage_cheese'
  | 'cream_cheese'
  | 'crushed_tomatoes_canned'
  | 'cucumber'
  | 'desiccated_coconut'
  | 'egg_whole'
  | 'espresso_shot'
  | 'everything_bagel_seasoning'
  | 'feta'
  | 'flour_plain'
  | 'flour_tortilla_small'
  | 'fish_sauce'
  | 'full_cream_milk'
  | 'garam_masala'
  | 'garlic_bread_frozen'
  | 'garlic_clove'
  | 'garlic_powder'
  | 'ghee'
  | 'ginger_fresh'
  | 'granola'
  | 'greek_yoghurt_plain'
  | 'greek_yoghurt_plain_full_fat'
  | 'greek_yoghurt_vanilla_full_fat'
  | 'ground_coriander'
  | 'ground_cumin'
  | 'ground_turmeric'
  | 'honey'
  | 'ice_cream_vanilla'
  | 'jalapenos_pickled'
  | 'jam'
  | 'kashmiri_chilli_powder'
  | 'ketchup_tomato'
  | 'kidney_beans_canned'
  | 'lamb_shank'
  | 'lasagne_sheets_dry'
  | 'lemon_juice'
  | 'lime'
  | 'macadamia_butter'
  | 'macaroni_dry'
  | 'mango_frozen'
  | 'mango_nectar'
  | 'maple_syrup'
  | 'massaman_curry_paste'
  | 'medjool_dates'
  | 'mint_leaves'
  | 'mixed_berries'
  | 'mozzarella_shredded'
  | 'mustard_powder'
  | 'mushroom_brown'
  | 'nutmeg_ground'
  | 'olive_oil'
  | 'onion_powder'
  | 'oregano_dried'
  | 'oreo_cookies'
  | 'pancetta_diced'
  | 'paprika_smoked'
  | 'paprika_sweet'
  | 'parmesan_grated'
  | 'parsley_flat_leaf'
  | 'peanut_butter_natural'
  | 'peanuts_roasted_unsalted'
  | 'pickled_red_onion'
  | 'pineapple_frozen'
  | 'pork_shoulder_boneless'
  | 'potato_waxy'
  | 'potato_baby_chat'
  | 'raspberries_frozen'
  | 'red_wine_cooking'
  | 'ricotta_full_fat'
  | 'rolled_oats_raw'
  | 'salt'
  | 'sirloin_steak'
  | 'smoked_salmon'
  | 'sour_cream'
  | 'sourdough_crusty'
  | 'spaghetti_dry'
  | 'spinach_baby'
  | 'spring_onion'
  | 'star_anise'
  | 'strawberries_frozen'
  | 'sugar_white'
  | 'tamarind_paste'
  | 'thickened_cream'
  | 'thyme_dried'
  | 'thyme_fresh'
  | 'tomato_passata'
  | 'tomato_paste'
  | 'tortilla_large'
  | 'water'
  | 'whey_protein_chocolate'
  | 'whey_protein_vanilla'
  | 'worcestershire_sauce'
  | 'instant_pudding_mix'
  | 'vanilla_extract'
  | 'chocolate_chips'
  | 'oat_flour'
  | 'beef_jerky'
  | 'edamame'
  | 'protein_bar'
  | 'tuna'
  | 'chickpeas'
  | 'mixed_nuts'
  | 'dried_fruit'
  | 'dark_chocolate'
  | 'chicken_breast'
  | 'jasmine_rice'
  | 'soy_sauce'
  | 'rice_vinegar'
  | 'cornstarch'
  | 'sesame_oil'
  | 'broccoli'
  | 'sesame_seeds'
  | 'oyster_sauce'
  | 'chinese_cooking_wine'
  | 'chicken_mince'
  | 'pear'
  | 'salmon_fillet'
  | 'lemon'
  | 'chilli_powder'
  | 'coriander_fresh'
  | 'chipotle_in_adobo'
  | 'coconut_milk'
  | 'curry_powder'
  | 'turkey_mince'
  | 'breadcrumbs'
  | 'dried_basil'
  | 'peas'
  | 'sweetcorn'
  | 'lamb_mince'
  | 'sausage'
  | 'noodles'
  | 'orange_juice'
  | 'bread_roll'
  | 'sweet_chilli_sauce'
  | 'lettuce'
  | 'gnocchi'
  | 'thai_basil_fresh'
  | 'red_chilli_fresh'
  | 'green_beans'
  | 'bicarb_soda'
  | 'ajvar'
  | 'pasta_sauce_tomato_jar'
  | 'chilli_seasoning_mix'
  | 'bbq_sauce_bottled'
  | 'casserole_recipe_base_mix'
  | 'slow_cook_recipe_base_pouch';

/**
 * Grocery store categories for organizing shopping lists
 */
export type IngredientCategory = 
  | 'meat_seafood'
  | 'dairy_refrigerated'
  | 'produce'
  | 'frozen'
  | 'pantry_grains'
  | 'condiments_supplements'
  | 'bakery'
  | 'other';

/**
 * The unit an ingredient is always measured in within the database.
 * Most ingredients use g (solids) or ml (liquids) for aggregatability.
 * Use count for whole items (eggs, lemons).
 * tsp / tbsp / cloves are allowed for ingredients where a precise gram measurement
 * is awkward (spices, garlic) — these don't aggregate cleanly across meals but are
 * acceptable for low-quantity items.
 */
export type CanonicalUnit = 'g' | 'ml' | 'count' | 'tsp' | 'tbsp' | 'cloves';

/**
 * Dietary categories an ingredient satisfies
 */
export type DietaryFlag = 'vegan' | 'vegetarian' | 'gluten_free' | 'dairy_free' | 'nut_free';

/**
 * What the authored gram amount refers to — what you weigh at the bench:
 * raw meat, dry rice, drained beans, or the product as purchased.
 */
export type IngredientState = 'raw' | 'dry' | 'cooked' | 'canned_drained' | 'as_sold';

/**
 * Macro panel, ALWAYS per 100 GRAMS of `state` (not per canonical unit).
 * Resolve grams first via grams_per_canonical_unit, then apply.
 */
export interface Macros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

/**
 * Central ingredient definition with all metadata needed for meal planning,
 * grocery aggregation, and dietary filtering
 */
export interface Ingredient {
  id: IngredientId;
  display_name: string;
  category: IngredientCategory;
  canonical_unit: CanonicalUnit;
  dietary_flags: DietaryFlag[];
  allergens: AllergenType[];
  typical_pack_size?: number;
  typical_pack_unit?: string;
  notes?: string;

  // --- macro model (added by the DB rebuild) ---
  // Required: every ingredient row carries sourced/estimated macros.
  state: IngredientState;
  macros_per_100g: Macros;           // per 100g of `state`
  grams_per_canonical_unit: number;  // 1 for 'g'; density for 'ml'; g per item for count/tsp/tbsp/cloves
  macro_source: string;
  macro_confidence: 'sourced' | 'estimated';
  drained_grams_per_pack?: number;   // canned goods only
  is_pantry_negligible?: boolean;    // hide from shopping list + macro totals; still render in steps
  user_overridable?: boolean;
  brand_reference?: string;
  atwater_exempt?: boolean;          // kcal not reconstructable from P/C/F; skip Atwater check
}