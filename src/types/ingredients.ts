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
  | 'beef_chuck'
  | 'beef_mince_regular'
  | 'beef_stock_cube'
  | 'beef_stock_liquid'
  | 'black_beans_canned'
  | 'black_pepper_ground'
  | 'blueberries_frozen'
  | 'brioche_bun'
  | 'brown_onion'
  | 'brown_sugar'
  | 'butter_chicken_jar_sauce'
  | 'butter_salted'
  | 'capsicum_red'
  | 'carrot'
  | 'cayenne_pepper'
  | 'celery'
  | 'cheese_tasty_grated'
  | 'chia_seeds'
  | 'chicken_stock_liquid'
  | 'chicken_thigh_skinless'
  | 'cinnamon_ground'
  | 'cinnamon_stick'
  | 'cocoa_powder'
  | 'coconut_cream'
  | 'coconut_water'
  | 'coleslaw_mayo'
  | 'coriander_leaves_fresh'
  | 'corn_chips'
  | 'crushed_tomatoes_canned'
  | 'desiccated_coconut'
  | 'egg_whole'
  | 'espresso_shot'
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
  | 'greek_yoghurt_plain'
  | 'greek_yoghurt_plain_full_fat'
  | 'greek_yoghurt_vanilla_full_fat'
  | 'ground_coriander'
  | 'ground_cumin'
  | 'ground_turmeric'
  | 'honey'
  | 'ice_cream_vanilla'
  | 'jalapenos_pickled'
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
  | 'sour_cream'
  | 'sourdough_crusty'
  | 'spaghetti_dry'
  | 'spinach_baby'
  | 'spring_onion'
  | 'star_anise'
  | 'strawberries_frozen'
  | 'sugar_brown_palm_substitute'
  | 'sugar_white'
  | 'tamarind_paste'
  | 'thickened_cream'
  | 'thyme_dried'
  | 'thyme_fresh'
  | 'tomato_passata'
  | 'tomato_paste'
  | 'water'
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