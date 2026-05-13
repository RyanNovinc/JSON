import { AllergenType } from './curated_meals';

/**
 * Unique identifier for each ingredient in the database
 */
export type IngredientId = 
  | 'almond_butter'
  | 'apple_cider_vinegar'
  | 'apple_juice_cloudy'
  | 'avocado'
  | 'baking_potato'
  | 'banana'
  | 'basmati_rice_cooked'
  | 'bay_leaves_dried'
  | 'beef_mince_regular'
  | 'beef_stock_cube'
  | 'black_pepper_ground'
  | 'blueberries_frozen'
  | 'brioche_bun'
  | 'brown_onion'
  | 'brown_sugar'
  | 'butter_chicken_jar_sauce'
  | 'butter_salted'
  | 'carrot'
  | 'celery'
  | 'cheese_tasty_grated'
  | 'chia_seeds'
  | 'chicken_thigh_skinless'
  | 'cinnamon_ground'
  | 'cocoa_powder'
  | 'coconut_cream'
  | 'coconut_water'
  | 'coleslaw_mayo'
  | 'coriander_leaves_fresh'
  | 'crushed_tomatoes_canned'
  | 'desiccated_coconut'
  | 'egg_whole'
  | 'espresso_shot'
  | 'flour_plain'
  | 'flour_tortilla_small'
  | 'full_cream_milk'
  | 'garam_masala'
  | 'garlic_bread_frozen'
  | 'garlic_clove'
  | 'garlic_powder'
  | 'ghee'
  | 'ginger_fresh'
  | 'greek_yoghurt_plain'
  | 'greek_yoghurt_plain_full_fat'
  | 'greek_yoghurt_vanilla_full_fat'
  | 'ground_coriander'
  | 'ground_cumin'
  | 'ground_turmeric'
  | 'honey'
  | 'ice_cream_vanilla'
  | 'kashmiri_chilli_powder'
  | 'ketchup_tomato'
  | 'lasagne_sheets_dry'
  | 'lemon_juice'
  | 'lime'
  | 'macadamia_butter'
  | 'macaroni_dry'
  | 'mango_frozen'
  | 'mango_nectar'
  | 'maple_syrup'
  | 'medjool_dates'
  | 'mint_leaves'
  | 'mozzarella_shredded'
  | 'mustard_powder'
  | 'nutmeg_ground'
  | 'olive_oil'
  | 'onion_powder'
  | 'oregano_dried'
  | 'oreo_cookies'
  | 'pancetta_diced'
  | 'paprika_sweet'
  | 'parmesan_grated'
  | 'peanut_butter_natural'
  | 'pickled_red_onion'
  | 'pineapple_frozen'
  | 'pork_shoulder_boneless'
  | 'raspberries_frozen'
  | 'red_wine_cooking'
  | 'ricotta_full_fat'
  | 'rolled_oats_raw'
  | 'salt'
  | 'sour_cream'
  | 'spaghetti_dry'
  | 'spinach_baby'
  | 'spring_onion'
  | 'strawberries_frozen'
  | 'sugar_white'
  | 'thickened_cream'
  | 'thyme_dried'
  | 'tomato_passata'
  | 'tomato_paste'
  | 'whey_protein_chocolate'
  | 'whey_protein_vanilla'
  | 'worcestershire_sauce';

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
}