import { IngredientId, CanonicalUnit } from './ingredients';

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
  | 'bolognese';

export type CuisineType = 'australian' | 'mediterranean' | 'asian' | 'indian' | 'mexican' | 'breakfast' | 'italian' | 'smoothie';

export type PrimaryProtein = 'chicken' | 'beef' | 'lamb' | 'pork' | 'fish' | 'seafood' | 'eggs' | 'dairy' | 'plant';

export type MealSlot = 'breakfast' | 'brunch' | 'lunch' | 'second_lunch' | 'early_dinner' | 'dinner' | 'snack' | 'morning_snack' | 'afternoon_snack' | 'evening_snack' | 'pre_workout' | 'post_workout';

export type AllergenType = 'Nuts' | 'Shellfish' | 'Dairy' | 'Eggs' | 'Gluten/Wheat' | 'Soy' | 'Fish' | 'Sesame';

/**
 * Equipment types matching the exact equipment IDs from the budget cooking questionnaire
 */
export type EquipmentType = 'stovetop' | 'oven' | 'microwave' | 'air_fryer' | 'slow_cooker' | 'rice_cooker' | 'pressure_cooker' | 'grill' | 'blender' | 'food_processor';

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
  additional_instructions: string[];

  /** Active hands-on time required to assemble this specific plate. */
  assembly_time_minutes: number;

  /**
   * Total macros for this plate (base recipe portion + accompaniments combined).
   * This is what the user is actually consuming. Not a delta — the full picture.
   */
  plate_macros: BaseMacros;

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
}

/**
 * A specific way to prepare this meal with equipment and skill requirements
 */
export interface CookingMethod {
  id: string;
  display_name: string;
  equipment_required: EquipmentType[];
  time_active_minutes: number;
  time_total_minutes: number;
  skill_min: SkillLevel;
  shortcut_level: ShortcutLevel;
  /**
   * Ingredients used in the base recipe cook session only. For single-plate meals
   * (smoothies, current butter chicken), this includes everything. For multi-plate
   * meals (future pulled pork), this excludes accompaniments which live on the plates.
   */
  ingredients: MealIngredient[];
  /**
   * Step-by-step cooking instructions for the base recipe only. Assembly
   * instructions for serving specific plates are separate (Plate.additional_instructions).
   */
  instructions: string[];
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