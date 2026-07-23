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

/**
 * Equipment types matching the exact equipment IDs from the budget cooking questionnaire
 */
export type EquipmentType = 'stovetop' | 'oven' | 'microwave' | 'air_fryer' | 'slow_cooker' | 'rice_cooker' | 'pressure_cooker' | 'grill' | 'blender' | 'food_processor' | 'no_cook' | 'freezer';

/**
 * How an ingredient scales when the meal portion is adjusted
 * - scales: ingredient quantity multiplies with the meal's scale factor (e.g. chicken, rice, oil)
 * - fixed: ingredient quantity stays the same regardless of scale (e.g. spices, salt, a single egg)
 * - flex: ingredient absorbs calorie rounding; the meal plan AI nudges this quantity to hit precise calorie targets (typically rice, oats, or oil)
 */
export type IngredientScaling = 'scales' | 'fixed' | 'flex';

/**
 * scratch uses from-scratch ingredients; shortcut uses jar sauces, rotisserie chicken, pre-marinated proteins, etc.
 */
export type ShortcutLevel = 'scratch' | 'shortcut';

/**
 * matches the skillConfidence scale from the budget cooking questionnaire (1 = Kitchen Beginner, 5 = Kitchen Experimenter)
 */
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export interface BaseMacros {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

/**
 * Individual ingredient with scaling behavior for a cooking method
 */
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

/**
 * Prep-ahead classification consumed by the Meal-Prep Session feature.
 * `buildPrepSession` reads this to project a weekly plan into a prep session.
 *
 * - 'full'    — cook all servings ahead, store, reheat. Stews, curries, braises,
 *               roasts, mince dishes, soups, casseroles, cooked grain+protein
 *               bowls — anything that reheats well. Surfaces as a "Cook N
 *               servings" card that deep-links into the cook flow.
 * - 'partial' — cook the cooked components ahead, finish/assemble fresh.
 *               Default boundary (NO extra authoring required): the chosen
 *               method's base `instructions` are the prep-ahead steps; the
 *               plate's `additional_instructions` are the day-of steps. This
 *               reuses the recipe's existing "Cook the base" vs "Plate it up"
 *               structure. Only set the *_step_ids overrides below if that
 *               default split is wrong for a given meal.
 * - 'none'    — make fresh, nothing to prep. Dairy/raw/assembly-only/
 *               texture-sensitive-cold (yoghurt + fruit, smoothies, undressed
 *               salads that degrade). Surfaces in the quiet "Make fresh" list so
 *               the user can see it was skipped on purpose.
 */
export type MealPrepStrategy = 'full' | 'partial' | 'none';

export interface MealPrep {
  strategy: MealPrepStrategy;

  /** One-line summary shown on the prep card (e.g. "Cook the curry, store, reheat"). */
  prep_note?: string;

  /** For 'partial' meals: what to prepare ahead (e.g. "Turkey meatballs + tomato sauce"). */
  prep_ahead_summary?: string;

  /** For 'partial' meals: what to do day-of (e.g. "Boil fresh spaghetti"). */
  day_of_summary?: string;

  /** For 'none' only: why it's intentionally made fresh. Shown in the Make Fresh list. */
  reason?: string;

  /** Storage guidance shown on cook-ahead / prep-ahead cards ("fridge 4 days · freeze 3 mo"). */
  storage?: {
    fridge_days?: number;
    freeze_months?: number;
  };

  /**
   * 'partial' OVERRIDES ONLY. By default a 'partial' meal treats the method's
   * base `instructions` as prep-ahead and the plate's `additional_instructions`
   * as day-of — so these are unnecessary unless that split is wrong for a meal.
   *
   * NOTE — architectural gap: RecipeStep has no `id` field yet, so these are
   * NOT yet consumed by the app (the default base/plate boundary is the only
   * wired path). They are typed here so authoring stays forward-compatible;
   * wire them up only once RecipeStep gains a stable `id`.
   */
  prep_ahead_step_ids?: string[];
  day_of_step_ids?: string[];
}

/** 
 * Plate-level meal prep overrides. All fields optional since they merge with meal-level config.
 */
export type MealPrepOverride = Partial<MealPrep>;

/**
 * A "plate" represents one way to serve a meal. Most meals have a single plate
 * (e.g. butter chicken with rice and naan). Multi-variant meals like pulled pork
 * have several plates (sandwich, bowl, tacos), each with its own accompaniments,
 * macros, and assembly instructions, sharing a single base cook session.
 *
 * Every CuratedMeal has at least one plate.
 */
export interface Plate {
  /** Stable identifier unique within the meal (e.g. 'standard', 'sandwich', 'bowl'). */
  id: string;

  /** Descriptive name shown to the user (e.g. "BBQ Pulled Pork Burger"). */
  display_name: string;

  /** Short flavour description (e.g. "Buns, slaw, BBQ sauce, slap it on"). */
  description: string;

  /**
   * Marks plates that are high-calorie or indulgent variants the user should
   * use sparingly. UI surfaces this with a label; AI meal planner avoids
   * using more than one per week.
   */
  is_stunt_plate?: boolean;

  /**
   * How much of the base cooked recipe this plate uses, expressed as a fraction
   * of one "serving" as defined by the meal's `produces_servings`. A standard
   * plate is 1.0. A stunt plate that uses extra base might be 1.2.
   * For single-plate meals, this is always 1.0.
   */
  base_serving_multiplier: number;

  /**
   * Optional note shown to the user during the cook session if they plan to
   * use this plate later in the week. Example: "Reserve 300g of shredded pork
   * before BBQ-tossing — this plate uses unsauced pork."
   */
  reserve_before_finishing_note?: string;

  /**
   * Optional equipment required to assemble this specific plate, beyond what the cooking method requires. 
   * Used when a plate has its own cooking step. For example, a baked potato plate needs an oven even if 
   * the base recipe is slow-cooker only. When absent, the plate assumes assembly requires no equipment 
   * beyond what the method already declared. When present, the user must have all listed equipment to 
   * access this plate.
   */
  equipment_required?: EquipmentType[];

  /**
   * Ingredients used to assemble this plate, in addition to the base recipe
   * (which is defined on the meal's cooking method). For a single-plate meal
   * like butter chicken, these are the rice and naan; for pulled pork tacos,
   * these are the tortillas, avocado, cheese, etc.
   */
  additional_ingredients: MealIngredient[];

  /**
   * Step-by-step assembly instructions, separate from the cook session. Kept
   * brief — these run after the base recipe is already cooked.
   */
  additional_instructions: RecipeStep[];

  /** Active hands-on time required to assemble this specific plate. */
  assembly_time_minutes: number;

  /**
   * Total macros for this plate (base recipe portion + accompaniments combined).
   * This is what the user is actually consuming. Not a delta — the full picture.
   */
  plate_macros: BaseMacros;

  /** Cooked, plated weight in grams. Used to compute calorie density
   *  (kcal per gram) for the density sort in the Foods-you-like picker.
   *  Optional during authoring — meals without it sort last under density. */
  plate_finished_weight_g?: number;

  /**
   * Filename of the image asset for this specific plate, e.g. 'pulled_pork_sandwich.png'. The image file should 
   * live at src/assets/meals/<filename>. Optional. When a plate has its own image, UI uses it; when absent, 
   * UI falls back to the meal's image_filename.
   */
  image_filename?: string;

  /**
   * URL of a hosted hero photo for this specific plate. Optional. When absent, UI falls back to the meal's photo_url.
   */
  photo_url?: string;

  /**
   * Optional prep-ahead override for THIS plate. When present it overrides the
   * meal-level `meal_prep` for this plate only — e.g. the base curry is 'full',
   * but a "with garlic bread" plate of it is 'partial' (reheat the stew, bake
   * the bread fresh). When absent, the plate inherits the meal's `meal_prep`.
   */
  meal_prep?: MealPrepOverride;
}

/**
 * A specific way to prepare this meal with equipment and skill requirements
 */
export interface CookingMethod {
  id: string;
  display_name: string;
  equipment_required?: EquipmentType[];
  time_active_minutes: number;
  time_total_minutes: number;
  skill_min: SkillLevel;
  shortcut_level: ShortcutLevel;
  /**
   * LEGACY MEALS: base recipe ingredients, as before. For single-plate meals
   * (smoothies, legacy butter chicken) this includes everything; for multi-plate
   * meals accompaniments live on the plates.
   * TEMPLATE MEALS (base_ingredients + sauce_variants present): MUST be []
   * (validator-enforced). Methods change steps and timing, never ingredients,
   * never macros. resolveMealIngredients() is the single read path.
   */
  ingredients: MealIngredient[];
  /**
   * LEGACY MEALS: base recipe steps only. Assembly instructions for serving
   * specific plates are separate (Plate.additional_instructions).
   * TEMPLATE MEALS: MUST be []. Steps live on SauceVariant.instructions keyed
   * by this method's id — read them via resolveMealInstructions().
   */
  instructions: RecipeStep[];
  /**
   * When present, overrides the meal's base macros for that specific method 
   * (e.g. slow cooker version has slightly different macros than scratch).
   * When absent, the method uses the meal's top-level base_macros.
   */
  macros_override?: BaseMacros;
}

export interface CuratedMeal {
  slug: MealSlug;
  display_name: string;
  cuisine: CuisineType;
  primary_protein: PrimaryProtein;
  /**
   * How many servings the base recipe yields when cooked. Useful for the AI meal 
   * planner to schedule a single cook session and spread the eatings across the week.
   * Single-plate meals (smoothies, butter chicken) are 1. Multi-plate meals can be higher.
   */
  produces_servings: number;
  eligible_slots: MealSlot[];
  min_scale: number;
  max_scale: number;
  contains_allergens: AllergenType[];
  /**
   * At least one plate is required. Every meal has at least one way to be served.
   * Single-plate meals have one plate with id 'standard'. Multi-plate meals have
   * several plates with descriptive IDs like 'sandwich', 'bowl', 'tacos'.
   */
  plates: Plate[];
  methods: CookingMethod[];
  flex_ingredient_id: IngredientId;
  /**
   * Filename of the image asset for this meal, e.g. 'butter_chicken.png'. The image file should live at 
   * src/assets/meals/<filename>. Optional during database population — meals without images yet leave this 
   * undefined. The UI layer is responsible for resolving filenames to actual loaded images.
   */
  image_filename?: string;
  /**
   * URL of a hosted hero photo for this meal, e.g. on json.fit. Optional during database population. 
   * The UI layer chooses whether to use image_filename (bundled) or photo_url (hosted) based on context.
   */
  photo_url?: string;
  /**
   * Default prep-ahead classification for the meal, read by `buildPrepSession`
   * to project a weekly plan into a Meal-Prep Session. A plate may override this
   * via its own `meal_prep`. Optional during authoring — a meal without it is
   * treated as 'none' (shown under "Make fresh") so nothing breaks while the
   * catalogue is being classified. See the GitHub authoring rubric for how to
   * classify each meal.
   */
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

/**
 * This is the input to the method-selection logic. The app will read these fields from the existing
 * budgetCookingResults storage and pass them to a future selectMethodForUser function. The fields use
 * snake_case here because they're our database layer's convention, separate from the existing formData
 * camelCase shape in storage — a mapping function will translate between them later.
 */
export interface UserCookingPreferences {
  cooking_equipment: EquipmentType[];
  skill_confidence: SkillLevel;
  time_investment: 1 | 2 | 3 | 4 | 5;
  planning_style: 1 | 2 | 3 | 4 | 5;
}