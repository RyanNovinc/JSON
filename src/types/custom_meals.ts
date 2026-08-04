// src/types/custom_meals.ts
//
// User-created meals ("Your meals").
//
// DESIGN (locked):
//   Custom meals are stored LEAN (CustomMeal below) and presented to the
//   rest of the app as CuratedMeal-shaped views (CustomMealView, built by
//   toCustomMealView in src/utils/customMealsStorage.ts). That keeps the
//   picker, feasibility engine, plan rendering and prompt builder on their
//   existing code paths. Three deliberate deviations from curated meals:
//     - image is a device file URI (image_uri), never a bundled
//       image_filename. Resolution branches at each seam: URI first,
//       getMealImage fallback.
//     - ingredients are FREE TEXT (no ingredient_id, no library mapping,
//       no pack sizes). The generation prompt emits them in the meal's
//       ingredient table so the AI can localise and price them; native
//       groceryEngine price-merge falls back to name matching.
//     - macros are USER-ENTERED per serving and frozen on the single
//       'standard' plate. Never computed from ingredients.
//   No sauce variants, no cook mode (Ryan's call: plain step list only),
//   no flex ingredient. Scale pinned to 1.0 (min_scale = max_scale = 1):
//   the AI schedules occurrences as-is and adjusters absorb calorie gaps,
//   so the user-entered macros stay honest.
//
// CONVENTION: everything the user enters (macros, ingredient amounts) is
// PER SERVING. produces_servings only tells the AI how many servings one
// cook yields, for batch scheduling — it never divides the macros.

import {
  AllergenType,
  BaseMacros,
  CuisineType,
  CuratedMeal,
  MealSlot,
  PrimaryProtein,
  RecipeStep,
} from './curated_meals';

/** Prefix that namespaces custom slugs away from curated ones. */
export const CUSTOM_MEAL_SLUG_PREFIX = 'custom_';

export const isCustomMealSlug = (slug: string | undefined | null): boolean =>
  typeof slug === 'string' && slug.startsWith(CUSTOM_MEAL_SLUG_PREFIX);

/** One free-text ingredient row. Amounts are PER SERVING. */
export interface CustomIngredient {
  /** Stable row id within the meal (React keys / edit rows), e.g. 'ci_1'. */
  id: string;
  /** e.g. "chicken breast" */
  name: string;
  /** e.g. 150. Optional — "to taste" rows leave it out. */
  amount?: number;
  /** Free text: 'g', 'ml', 'tbsp', 'slices', ''. Deliberately NOT CanonicalUnit. */
  unit?: string;
}

export interface CustomMeal {
  /** Always CUSTOM_MEAL_SLUG_PREFIX + generated id. See newCustomMealSlug(). */
  slug: string;
  display_name: string;
  /** Short flavour description, shown wherever curated descriptions show. */
  description?: string;
  /**
   * Derived from the category the user picks at creation
   * (Breakfast / Main / Snack / Smoothie / Dessert):
   * breakfast | snack | smoothie | dessert map 1:1; Main maps to
   * 'australian' (any non-leaf cuisine lands on the Mains shelf in
   * NutritionHomeScreen's derivation). The dedicated "Your meals" shelf is
   * the primary surface, so this only matters for shelf fallthrough and
   * CategoryLibrary routing.
   */
  cuisine: CuisineType;
  /** Required in the create form (one chip row). Consumed by prompt/filters. */
  primary_protein: PrimaryProtein;
  eligible_slots: MealSlot[];
  /** Servings one cook of this recipe yields. Default 1. */
  produces_servings: number;
  contains_allergens: AllergenType[];
  /** Per-serving macros, user-entered. fiber_g defaults to 0 in the form. */
  macros: BaseMacros;
  /** Per-serving ingredient rows, free text. */
  ingredients: CustomIngredient[];
  /** Cooking steps. The form collects summaries; substeps always []. */
  steps: RecipeStep[];
  /** Hands-on minutes. Optional. Drives the effort tag in the picker. */
  time_active_minutes?: number;
  /** Wall-clock minutes. Optional; the view defaults it to active minutes. */
  time_total_minutes?: number;
  /**
   * True if making this meal involves heat/appliances. Drives the picker's
   * No-cook chip via the view's equipment_required sentinel (see
   * toCustomMealView).
   */
  requires_cooking?: boolean;
  /** file:// URI under <documentDirectory>/custom-meals/. */
  image_uri?: string;
  created_at: string; // ISO
  updated_at: string; // ISO
}

/**
 * What the rest of the app consumes: a CuratedMeal plus custom-only fields.
 * Built exclusively by toCustomMealView() in customMealsStorage.ts.
 */
export type CustomMealView = CuratedMeal & {
  custom: true;
  image_uri?: string;
  custom_ingredients: CustomIngredient[];
};

/** Any meal the app can show. Merge seams produce arrays of this. */
export type AnyMeal = CuratedMeal | CustomMealView;

export const isCustomMeal = (
  m: AnyMeal | null | undefined
): m is CustomMealView => !!m && (m as CustomMealView).custom === true;