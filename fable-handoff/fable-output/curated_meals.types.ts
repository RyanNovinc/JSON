// src/types/curated_meals.ts — FULL REPLACEMENT
// Task 1 Phase A: sauce-axis template types. Everything below is the existing
// file plus three additions, each marked with `// NEW (sauce axis)`:
//   1. SauceVariant interface
//   2. CuratedMeal.base_ingredients / CuratedMeal.sauce_variants
//   3. Doc updates on CookingMethod (template meals author ingredients: [])

import { IngredientId, CanonicalUnit } from './ingredients';

export interface RecipeStep {
  summary: string;
  substeps: string[];
}

export type MealSlug =
  | 'butter_chicken'
  | 'brekkie_grow'
  | 'mango_mass'
  | 'king_kong_chocolate'
  | 'strawberry_stack'
  | 'choc_muscle_maxx'
  | 'cookies_gains'
  | 'raspberry_rip'
  | 'energy_lift_heavy'
  | 'mornin_muscle'
  | 'dirty_eden'
  | 'strawbrekkie_beast'
  | 'banana_bulk'
  | 'pulled_pork'
  | 'bolognese'
  | 'massaman'
  | 'chilli_con_carne'
  | 'lamb_shanks'
  | 'beef_stew'
  | 'maple_muscle_toast'
  | 'muscle_oats'
  | 'scramble_stack'
  | 'overnight_oats'
  | 'pb_banana_toast'
  | 'protein_pancakes'
  | 'baked_oats'
  | 'big_breakfast_plate'
  | 'shakshuka'
  | 'smoked_salmon_bagel'
  | 'steak_and_eggs'
  | 'freezer_breakfast_burrito'
  | 'greek_yoghurt_bowl'
  | 'cottage_cheese_bowl'
  | 'egg_muffins'
  | 'protein_ice_cream'
  | 'cottage_cheese_ice_cream'
  | 'chocolate_protein_mug_cake'
  | 'fudgy_protein_brownies'
  | 'protein_chocolate_chip_cookies'
  | 'protein_banana_bread'
  | 'edible_protein_cookie_dough'
  | 'no_bake_protein_cheesecake'
  | 'chocolate_protein_mousse'
  | 'frozen_date_snickers_bark'
  | 'greek_yogurt_snack'
  | 'beef_jerky'
  | 'edamame'
  | 'protein_shake'
  | 'protein_bar'
  | 'cheese_snack'
  | 'hard_boiled_eggs'
  | 'tuna_pouch'
  | 'roasted_chickpeas'
  | 'no_bake_protein_balls'
  | 'mixed_nuts'
  | 'trail_mix'
  | 'banana_snack'
  | 'dried_fruit'
  | 'dark_chocolate'
  | 'teriyaki_chicken_rice_bowl'
  | 'beef_broccoli_stir_fry'
  | 'thai_basil_chicken'
  | 'beef_bulgogi_bowl'
  | 'spaghetti_carbonara'
  | 'sheet_pan_salmon_potatoes'
  | 'chicken_fajita_bowl'
  | 'spicy_chipotle_chicken_burrito'
  | 'chicken_shawarma'
  | 'satay_chicken'
  | 'honey_chicken'
  | 'chicken_mac_and_cheese'
  | 'turkey_meatballs_spaghetti'
  | 'tuna_pasta_bake'
  | 'lamb_kofta'
  | 'sheet_pan_sausage_veg'
  | 'honey_soy_salmon_noodles'
  | 'carne_asada_bowl'
  | 'chicken_schnitzel'
  | 'beef_ragu_gnocchi'
  | 'cevapi'
  | 'palacinke'
  | (string & {}); // Allow test fixtures and future slugs without breaking existing literals

export type CuisineType = 'australian' | 'mediterranean' | 'asian' | 'indian' | 'mexican' | 'breakfast' | 'italian' | 'smoothie' | 'thai' | 'dessert' | 'snack';

export type PrimaryProtein = 'chicken' | 'beef' | 'lamb' | 'pork' | 'turkey' | 'fish' | 'seafood' | 'eggs' | 'dairy' | 'plant';

export type MealSlot = 'breakfast' | 'brunch' | 'lunch' | 'second_lunch' | 'early_dinner' | 'dinner' | 'snack' | 'morning_snack' | 'afternoon_snack' | 'evening_snack' | 'pre_workout' | 'post_workout' | 'dessert';

export type AllergenType = 'Nuts' | 'Shellfish' | 'Dairy' | 'Eggs' | 'Gluten/Wheat' | 'Soy' | 'Fish' | 'Sesame';

export type EquipmentType = 'stovetop' | 'oven' | 'microwave' | 'air_fryer' | 'slow_cooker' | 'rice_cooker' | 'pressure_cooker' | 'grill' | 'blender' | 'food_processor' | 'no_cook' | 'freezer';

export type IngredientScaling = 'scales' | 'fixed' | 'flex';

export type ShortcutLevel = 'scratch' | 'shortcut';

export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export interface BaseMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface MealIngredient {
  ingredient_id: IngredientId;
  base_amount: number;
  unit: CanonicalUnit;
  scaling: IngredientScaling;
  notes?: string;
}

// ============================================================================
// NEW (sauce axis) — SauceVariant
// ----------------------------------------------------------------------------
// The difficulty axis, decoupled from cooking method. A variant is ADDITIVE and
// SELF-CONTAINED: base_ingredients + variant.ingredients + plate additions is
// the complete recipe. A variant never subtracts from base (validator-enforced:
// base ∩ variant must be empty by ingredient_id).
//
// Product rule this encodes: the DEFAULT variant is the jar/shortcut version.
// Scratch is an optional toggle, never the default. Methods carry zero
// ingredients, so switching stovetop ↔ slow cooker never moves macros;
// switching jar ↔ scratch always does (macros are computed from ingredients).
// ============================================================================
export interface SauceVariant {
  /** Stable id unique within the meal (e.g. 'jar', 'scratch'). */
  id: string;

  /** Shown on the variant toggle (e.g. "Jar Sauce", "From Scratch"). */
  display_name: string;

  /** 'shortcut' for jar/pre-made; 'scratch' for the optional from-scratch build. */
  shortcut_level: ShortcutLevel;

  /**
   * Exactly one variant per meal is the default, and it must be the shortcut.
   * Validator-enforced.
   */
  is_default?: boolean;

  /** Hands-on minutes ADDED to the chosen method's time_active_minutes. 0 for the default. */
  extra_active_minutes: number;

  /** Wall-clock minutes ADDED to the method's time_total_minutes (marinades, longer simmers). */
  extra_total_minutes?: number;

  /** Optional skill floor for this variant. The default variant defines the meal's advertised skill. */
  skill_min?: SkillLevel;

  /**
   * Everything this version needs beyond base_ingredients. Self-contained:
   * e.g. the jar variant carries its cream, the scratch variant carries its
   * own (larger) cream. Disjoint from base by validator guard.
   */
  ingredients: MealIngredient[];

  /**
   * Cook steps keyed by CookingMethod.id. Methods are metadata (equipment,
   * timing, skill); the actual steps for (method × variant) live here. A
   * method id ABSENT from this map means the variant is not offered on that
   * method. The default variant must cover every method (validator-enforced).
   */
  instructions: Record<string, RecipeStep[]>;

  notes?: string;
}

export type MealPrepStrategy = 'full' | 'partial' | 'none';

export interface MealPrep {
  strategy: MealPrepStrategy;
  prep_note?: string;
  prep_ahead_summary?: string;
  day_of_summary?: string;
  reason?: string;
  storage?: {
    fridge_days?: number;
    freeze_months?: number;
  };
  prep_ahead_step_ids?: string[];
  day_of_step_ids?: string[];
}

export type MealPrepOverride = Partial<MealPrep>;

export interface Plate {
  id: string;
  display_name: string;
  description: string;
  is_stunt_plate?: boolean;
  base_serving_multiplier: number;
  reserve_before_finishing_note?: string;
  equipment_required?: EquipmentType[];
  additional_ingredients: MealIngredient[];
  additional_instructions: RecipeStep[];
  assembly_time_minutes: number;
  plate_macros: BaseMacros;
  plate_finished_weight_g?: number;
  image_filename?: string;
  photo_url?: string;
  meal_prep?: MealPrepOverride;
}

export interface CookingMethod {
  id: string;
  display_name: string;
  equipment_required?: EquipmentType[];
  time_active_minutes: number;
  time_total_minutes: number;
  skill_min: SkillLevel;
  shortcut_level: ShortcutLevel;
  /**
   * LEGACY MEALS: base recipe ingredients, as before.
   * TEMPLATE MEALS (base_ingredients + sauce_variants present): MUST be []
   * (validator-enforced). Methods change steps and timing, never ingredients,
   * never macros. resolveMealIngredients() is the single read path.
   */
  ingredients: MealIngredient[];
  /**
   * LEGACY MEALS: base recipe steps, as before.
   * TEMPLATE MEALS: MUST be []. Steps live on SauceVariant.instructions keyed
   * by this method's id — read them via resolveMealInstructions().
   */
  instructions: RecipeStep[];
  macros_override?: BaseMacros;
}

export interface CuratedMeal {
  slug: MealSlug;
  display_name: string;
  cuisine: CuisineType;
  primary_protein: PrimaryProtein;
  produces_servings: number;
  eligible_slots: MealSlot[];
  min_scale: number;
  max_scale: number;
  contains_allergens: AllergenType[];
  plates: Plate[];
  methods: CookingMethod[];
  flex_ingredient_id: IngredientId;
  image_filename?: string;
  photo_url?: string;
  meal_prep?: MealPrep;

  // ==========================================================================
  // NEW (sauce axis) — template fields. Present together or not at all
  // (validator-enforced). Absent = legacy meal, resolver falls back to
  // method.ingredients so nothing breaks during the 70-meal migration.
  // ==========================================================================

  /**
   * Ingredients common to EVERY variant and EVERY method: typically the
   * protein + garnish. NO sauce, NO starch. Starch (rice, pasta, bread) lives
   * on the plates that carry it, so a curry-only plate is genuinely starch-free.
   */
  base_ingredients?: MealIngredient[];

  /** The additive difficulty axis. Exactly one is_default (the shortcut). */
  sauce_variants?: SauceVariant[];
}

export interface UserCookingPreferences {
  cooking_equipment: EquipmentType[];
  skill_confidence: SkillLevel;
  time_investment: 1 | 2 | 3 | 4 | 5;
  planning_style: 1 | 2 | 3 | 4 | 5;
}
