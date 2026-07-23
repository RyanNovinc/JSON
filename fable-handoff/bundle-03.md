# JSON.fit — meal / nutrition data layer handoff

**Part 3 of 5.** Read all 5 parts in order: bundle-01.md, bundle-02.md, bundle-03.md, bundle-04.md, bundle-05.md.

Generated read-only from branch `feature/file-import`. Order: type definitions → ingredient
database → meal data → runtime consumers → UI.

**Secrets:** every file was scanned for API keys, tokens and secrets before inclusion.
No secrets were found in any bundled file, so nothing was redacted.

**Read this first — three facts that will otherwise mislead you:**
1. An ingredient table exists (`src/data/ingredients.ts`, 195 rows) but it carries **no macros and
   no unit→gram conversions**. It is a shopping/dietary registry, not a nutrition database. Macros
   exist **only** as `plate_macros` precomputed per meal in `curated_meals.ts`.
2. `src/utils/ingredientScaling.ts` **deliberately ignores** the per-row
   `scaling: 'scales' | 'fixed' | 'flex'` field (see its header comment). Scaling is uniform across
   the plate. `flex_ingredient_id` is read **only** by the boot validator.
3. `CURATED_MEALS` is a static ES import — it is **compiled into the app bundle**, not fetched from
   json.fit at runtime.

---

---

# 4. RUNTIME CONSUMERS (cont.)

## FILE: src/utils/ingredientScaling.ts  (219 lines)

```typescript
// src/utils/ingredientScaling.ts
//
// Single source of truth for turning a stored ingredient amount into the string
// shown in a recipe's ingredient list (RecipeDetailScreen, the meal-prep screen,
// the shopping list). Cook Mode step prose is scaled separately in meal_substeps.ts.
//
// ============================================================================
// DESIGN DECISION: SCALING IS UNIFORM. The `scaling` field is NOT read here.
// ============================================================================
// The plan generator multiplies a single scale_factor across the WHOLE plate, and
// the macro panel / day card display that uniform scaled number as the source of
// truth (e.g. 680 = 800 x 0.85 across every macro). This utility therefore scales
// every ingredient uniformly and deliberately IGNORES the per-row
// `scaling: 'scales' | 'fixed' | 'flex'` field in curated_meals.ts. Honoring per-row
// `fixed` would desync the ingredient list from the panel and break macro accuracy
// on plated meals. The field is left untouched in the data; we simply do not read it
// for display. (If a future feature needs it for something else, read it there.)
//
// Unit CLASS governs rounding and format only:
//
//   mass / volume (g, ml, kg, l)
//     scaled by portions * planScale
//     g / ml  -> nearest whole integer
//     kg / l  -> 2 dp, trailing zeros stripped  (not present in current data;
//                included for forward-compat with the canonical unit enum)
//
//   discrete (count, cloves)
//     scaled by portions * planScale
//     base per-serving >= 1 -> rounded to nearest whole, floored at 1 (a real
//       per-serving item never drops to 0, even when the plan shrinks it)
//     base per-serving <  1 and not a batch aromatic -> rendered to the nearest
//       1/4 as a fraction (min 1/4, never 0, never "pinch"), e.g. lime 0.25 ->
//       "1/4", egg 0.17 -> "1/4". GATED ON THE BASE per-serving amount, not the
//       scaled amount, so a 1-per-serving item the plan shrinks still floors to 1.
//     see the batch-aromatic rule for the < 1 in-a-batch case
//
//   seasoning / leavener (tsp, tbsp)
//     planScale is NOT applied. Seasonings are ~0 macro, so scaling them adds no
//     macro accuracy but produces ugly decimals; convention is to season to taste.
//     Shown as the base per-serving amount (x integer portions) rounded to the
//     nearest 1/4 and rendered as a vulgar fraction. A positive amount that rounds
//     to 0 renders as "pinch".
//
// BATCH-AROMATIC RULE: a whole/discrete item that works out to less than 1 per
// serving in a batch recipe (produces_servings > 1) is a property of the pot, not
// the plate (bay leaf, cinnamon stick, star anise, garlic). Dividing it per serving
// rounds it to 0. Instead it renders at the BATCH amount with a "(for the batch)"
// tag, so 1 cinnamon stick across an 8-serving curry shows "1 (for the batch)".
//
// ----------------------------------------------------------------------------
// What this function returns: the QUANTITY string only (amount + unit word where a
// unit word applies). The ingredient's display name is resolved elsewhere
// (ingredient_id -> label, in the ingredient library) and appended by the caller:
//   "200 g"            + " chicken thigh"  -> "200 g chicken thigh"
//   "1/2 tsp"          + " ground cumin"   -> "1/2 tsp ground cumin"
//   "pinch"            + " salt"           -> "pinch salt"          (caller may add "of")
//   "2"                + " eggs"           -> "2 eggs"              (count = bare number)
//   "2 cloves"         + " garlic"         -> "2 cloves garlic"
//   "3 (for the batch)"+ " bay leaves"     -> render as "bay leaves: 3 (for the batch)"
//                                             or place the tag after the name.
// For the batch-aromatic case the "(for the batch)" tag is part of the returned
// string; prefer a "{name}: {qty}" layout, or append the tag after the name, so it
// does not read as "3 (for the batch) bay leaves".
// ----------------------------------------------------------------------------

export type MassVolumeUnit = 'g' | 'ml' | 'kg' | 'l';
export type SeasoningUnit = 'tsp' | 'tbsp';
export type DiscreteUnit = 'count' | 'cloves' | 'bulb';

/**
 * Every unit observed in curated_meals.ts: g, ml, tsp, tbsp, count, cloves, bulb.
 * kg and l are included for forward-compatibility with the canonical unit enum
 * (src/types/ingredients.ts) but do not currently appear in the data.
 */
export type ScalableUnit = MassVolumeUnit | SeasoningUnit | DiscreteUnit;

const MASS_VOLUME = new Set<string>(['g', 'ml', 'kg', 'l']);
const SEASONING = new Set<string>(['tsp', 'tbsp']);
const DISCRETE = new Set<string>(['count', 'cloves', 'bulb']);

export function isMassVolume(unit: string): boolean {
  return MASS_VOLUME.has(unit);
}
export function isSeasoning(unit: string): boolean {
  return SEASONING.has(unit);
}
export function isDiscrete(unit: string): boolean {
  return DISCRETE.has(unit);
}

export interface DisplayIngredientArgs {
  /** The stored `base_amount`. */
  baseAmount: number;
  /** The stored `unit`. Typed loosely as string for caller convenience. */
  unit: string;
  /**
   * meal.produces_servings for BASE rows (method.ingredients).
   * Pass 1 for PLATE rows (plate.additional_ingredients) — they are already per serving.
   */
  producesServings: number;
  /** Integer servings being cooked. Default 1. A meal-prep flow may set it higher. */
  portions?: number;
  /** The plan's scale_factor for this meal. Default 1. */
  planScale?: number;
}

const BATCH_TAG = ' (for the batch)';

/**
 * Format one stored ingredient amount into its display quantity string.
 * See the file header for the full rule set. Pure and side-effect free.
 */
export function displayIngredient(args: DisplayIngredientArgs): string {
  const { baseAmount, unit } = args;
  const producesServings =
    Number.isFinite(args.producesServings) && args.producesServings > 0
      ? args.producesServings
      : 1;
  const portions = args.portions ?? 1;
  const planScale = args.planScale ?? 1;

  const perServing = baseAmount / producesServings;

  // --- SEASONINGS (tsp, tbsp): planScale never applied. -----------------------
  if (isSeasoning(unit)) {
    // Integer portions keep the result on clean 1/4 steps.
    return formatSeasoning(perServing * portions, unit);
  }

  // --- DISCRETE (count, cloves) ----------------------------------------------
  if (isDiscrete(unit)) {
    // Batch-aromatic rule: a sub-1-per-serving whole item in a batch is a pot-level
    // quantity. Show the batch total (scaled by planScale to stay consistent with
    // uniform scaling; portions does not apply — the batch is the batch), not a
    // per-serving fraction.
    if (producesServings > 1 && perServing < 1) {
      const batch = Math.max(1, Math.round(baseAmount * planScale));
      return formatDiscrete(batch, unit) + BATCH_TAG;
    }
    // Fractional discrete: base per-serving < 1 and not a batch aromatic (so a plate
    // or single-serve row like a quarter lime or 1/6 of an egg). Render to the nearest
    // 1/4 (min 1/4, never 0 or "pinch") so it neither rounds away nor overstates to 1.
    // Gated on the BASE per-serving amount, not the scaled amount, so a 1-per-serving
    // item the plan shrinks still floors to 1 (below) instead of dropping to a fraction.
    if (perServing < 1) {
      return formatDiscreteFraction(perServing * portions * planScale, unit);
    }
    // Whole per-serving item: scale, round, and never drop below 1.
    const n = Math.max(1, Math.round(perServing * portions * planScale));
    return formatDiscrete(n, unit);
  }

  // --- MASS / VOLUME (g, ml, kg, l) and any unrecognised unit ------------------
  const raw = perServing * portions * planScale;
  if (unit === 'kg' || unit === 'l') {
    return `${stripTrailingZeros(raw.toFixed(2))} ${unit}`;
  }
  // g, ml, and (defensively) anything not otherwise classified: whole integer.
  return `${Math.round(raw)} ${unit}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QUARTER_FRACTIONS: Record<number, string> = { 1: '1/4', 2: '1/2', 3: '3/4' };

/** Render a whole count of quarters as "1/4", "1/2", "3/4", "1", "1 1/4", ... */
function quartersToString(quarters: number): string {
  const whole = Math.floor(quarters / 4);
  const rem = quarters % 4;
  if (rem === 0) return `${whole}`;
  if (whole === 0) return QUARTER_FRACTIONS[rem];
  return `${whole} ${QUARTER_FRACTIONS[rem]}`;
}

/**
 * Seasonings: round to the nearest 1/4 and render as a vulgar fraction.
 * A positive amount that rounds to 0 becomes "pinch".
 */
function formatSeasoning(raw: number, unit: string): string {
  const quarters = Math.round(raw * 4);
  if (quarters <= 0) {
    return raw > 0 ? 'pinch' : `0 ${unit}`;
  }
  return `${quartersToString(quarters)} ${unit}`;
}

/**
 * Fractional discrete (sub-1-per-serving count/cloves): nearest 1/4, floored at 1/4
 * (never 0, never "pinch"). count -> bare fraction ("1/4"); cloves -> "1/4 clove".
 */
function formatDiscreteFraction(raw: number, unit: string): string {
  const quarters = Math.max(1, Math.round(raw * 4)); // min 1/4, never 0
  const qty = quartersToString(quarters);
  if (unit === 'cloves') {
    return `${qty} ${quarters <= 4 ? 'clove' : 'cloves'}`; // <= 1 -> singular
  }
  if (unit === 'bulb') {
    return `${qty} ${quarters <= 4 ? 'bulb' : 'bulbs'}`; // <= 1 -> singular
  }
  return qty;
}

/** Whole discrete: count -> bare number (caller appends the noun). cloves -> "N clove(s)". */
function formatDiscrete(n: number, unit: string): string {
  if (unit === 'cloves') {
    return n === 1 ? '1 clove' : `${n} cloves`;
  }
  if (unit === 'bulb') {
    return n === 1 ? '1 bulb' : `${n} bulbs`;
  }
  return `${n}`;
}

/** "2.00" -> "2", "2.50" -> "2.5", "2.05" -> "2.05". */
function stripTrailingZeros(s: string): string {
  return s.replace(/\.?0+$/, '');
}
```

## FILE: src/utils/curated_meals_validation.ts  (301 lines)

```typescript
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
```

## FILE: src/utils/mealFeasibility.ts  (579 lines)

```typescript
// src/utils/mealFeasibility.ts
//
// Basket feasibility engine + certified-fix search.
//
// Answers ONE question at Save time: given the user's picks, their slot
// structure, and the downstream system's two levers (independent per-meal
// scaling within [min_scale, max_scale]; capped single-ingredient top-ups),
// is the macro target reachable at all? Binary reachability — landing the
// exact numbers is the generation-time job, not this file's.
//
// Design rules this encodes (locked):
// - Runs ONCE per Save. Never while picking. Never blocks.
// - Fires only on HARD infeasibility: unreachable even at max scale + full
//   top-up caps. No soft "leans on top-ups" tier.
// - Empty slots are bounded by a real filler pool (quick/simple eligible
//   meals), not treated as free variables.
// - Certification is brute force: a fix is only claimed if hypothetically
//   adding that exact plate flips the verdict green. Adding an option is
//   monotone (it can only expand the feasible region), so certificates are
//   sound within the model.
// - Floors checked for protein + calories (adders can't always rescue them);
//   ceilings checked for calories (daily) and fat/carbs (weekly average) —
//   the can't-subtract failure mode. Fiber checked as a floor with its cap.
//
// All functions are pure. `__internals` is exported for the unit tests in
// the validation plan (engine-vs-exhaustive, fire-rate Monte Carlo).

import { CuratedMeal } from '../types/curated_meals';
import {
  MealSlot,
  emptyFilter,
  mealsForSlots,
} from './curatedShelves';

// ---------------------------------------------------------------------------
// Tunables (design constants from the adjuster spec — keep in sync with the
// generation prompt's adjuster table)
// ---------------------------------------------------------------------------

export const ADJ_KCAL_UP_CAP = 720; // max daily kcal addable from adjusters
// derivation: protein_shake 250 + mixed_nuts 250 + protein_bar 220 = 720
export const ADJ_PROTEIN_CAP = 80;  // max daily protein addable from adjusters  
// derivation: protein_shake 35 + tuna_pouch 25 + protein_bar 20 = 80
export const ADJ_FIBER_CAP = 15;    // max daily fiber addable from adjusters
// derivation: steamed_mixed_veg 5 + berries 5 + protein_bar 5 = 15

const KCAL_TOL = 0.05;   // daily ±5%
const PROTEIN_TOL = 0.10; // daily ±10% (floor = 0.90 × target)
const WEEKLY_TOL = 0.10;  // carbs/fat ±10% weekly average
const FIBER_FLOOR = 0.80; // ≥80% of fiber target daily

const DEFAULT_S_MIN = 0.7;
const DEFAULT_S_MAX = 1.5;
const FILLER_MAX_MINUTES = 15; // empty-slot pool = quick/simple eligible meals
const MAX_FIXES = 3;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface Targets {
  kcal: number;
  protein_g: number;
  fiber_g?: number; // optional — fiber check skipped if absent
  carbs_g?: number; // optional — weekly carb ceiling skipped if absent
  fat_g?: number;   // optional — weekly fat ceiling skipped if absent
}

export type FailAxis = 'protein' | 'calories' | 'fat' | 'carbs' | 'fiber';
export type FailDirection = 'floor' | 'ceiling';

export interface Failure {
  axis: FailAxis;
  direction: FailDirection;
  /** Daily-equivalent gap in the axis's own unit (g, or kcal for calories). */
  gap: number;
}

export interface CertifiedFix {
  slug: string;
  plateId: string;
  /** SlotSpec.id the fix was certified in — apply the pick into this slot. */
  slot: string;
  /** Tab/slot the fix was certified in (display label, e.g. "Breakfast"). */
  slotLabel: string;
  name: string;
  imageFilename?: string;
}

export interface BasketVerdict {
  feasible: boolean;
  /** Worst failure first. Empty when feasible. */
  failures: Failure[];
  /** Up to 3 single additions, each individually proven to flip the verdict. */
  fixes: CertifiedFix[];
  /** True when failures exist but no single addition certifies (red copy). */
  unfixableBySingleAdd: boolean;
}

/**
 * The screen describes its visible tabs in this shape. `mealSlots` is the
 * list of MealSlot keys the tab draws from (same values passed to
 * mealsForSlots today). `perDay` is occurrences per day on days the slot
 * occurs; `weeklyOccurrences` is total per week (dessert < 7 ⇒ its own
 * day-type). `borrowGroup` marks interchangeable slots (lunch+dinner).
 */
export interface SlotSpec {
  id: string;
  label: string;
  mealSlots: MealSlot[];
  perDay: number;
  weeklyOccurrences: number;
  borrowGroup?: 'main';
}

export interface AssessArgs {
  slots: SlotSpec[];
  /**
   * V2 (slot-scoped): `${slotId}|${key}` where key is a bare slug or
   * `${slug}:${plateId}` and slotId matches a SlotSpec.id. Legacy bare keys
   * (no '|') are also accepted and resolve by eligibility, the V1 behaviour.
   */
  selectedKeys: string[];
  allMeals: CuratedMeal[];
  targets: Targets;
  allergies?: string[];
  avoid?: string[];
}

// ---------------------------------------------------------------------------
// Option extraction
// ---------------------------------------------------------------------------

interface Opt {
  kcal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
  sMin: number;
  sMax: number;
}

// Single choke point for plate-macro field names. If your Plate type names
// these differently, fix it HERE only. (Verified against butter_chicken.md:
// kcal / protein / carbs / fat / fiber, snake_case with _g suffix.)
function plateToOpt(meal: CuratedMeal, plate: any): Opt | null {
  const pm: any = plate?.plate_macros;
  if (!pm || !pm.kcal) return null;
  return {
    kcal: pm.kcal,
    p: pm.protein_g ?? 0,
    c: pm.carbs_g ?? 0,
    f: pm.fat_g ?? 0,
    fib: pm.fiber_g ?? 0,
    sMin: (meal as any).min_scale ?? DEFAULT_S_MIN,
    sMax: (meal as any).max_scale ?? DEFAULT_S_MAX,
  };
}

function nonStuntPlates(meal: CuratedMeal): any[] {
  return (meal.plates ?? []).filter((p: any) => !p.is_stunt_plate);
}

/** selectedKeys may be scoped (`slot|key`, V2) or bare (`key`, legacy). */
function splitScopedKeys(selectedKeys: string[]): {
  legacy: Set<string>;
  bySlot: Map<string, Set<string>>;
} {
  const legacy = new Set<string>();
  const bySlot = new Map<string, Set<string>>();
  for (const raw of selectedKeys) {
    const i = raw.indexOf('|');
    if (i === -1) {
      legacy.add(raw);
    } else {
      const slot = raw.slice(0, i);
      const key = raw.slice(i + 1);
      if (!bySlot.has(slot)) bySlot.set(slot, new Set());
      bySlot.get(slot)!.add(key);
    }
  }
  return { legacy, bySlot };
}

/**
 * Resolve the user's selected keys into options for one slot spec. Scoped
 * keys bind to the spec whose id matches their slot; legacy bare keys fall
 * back to eligibility membership (the V1 behaviour). Lunch↔dinner borrowing
 * is applied later in buildWeek via borrowGroup, not here.
 */
function optionsForSlot(
  spec: SlotSpec,
  selectedKeys: string[],
  allMeals: CuratedMeal[]
): Opt[] {
  const eligible = mealsForSlots(spec.mealSlots, allMeals, emptyFilter(), 'default');
  const { legacy, bySlot } = splitScopedKeys(selectedKeys);
  const scoped = bySlot.get(spec.id);
  const selected = new Set<string>([...legacy, ...(scoped ?? [])]);
  const opts: Opt[] = [];
  for (const meal of eligible) {
    if (selected.has(meal.slug)) {
      // Bare slug = AI may choose among non-stunt plates.
      for (const plate of nonStuntPlates(meal)) {
        const o = plateToOpt(meal, plate);
        if (o) opts.push(o);
      }
    }
    for (const plate of meal.plates ?? []) {
      if (selected.has(`${meal.slug}:${(plate as any).id}`)) {
        const o = plateToOpt(meal, plate);
        if (o) opts.push(o);
      }
    }
  }
  return opts;
}

/** Empty-slot pool: quick/simple eligible meals, non-stunt plates. */
// Keep in lockstep with mealPlanPromptV2.ts — the engine must model the SAME
// filler set the prompt will actually offer, or verdicts drift from reality.
const DEFAULT_FILLER_SLUGS: string[] = [
  'greek_yoghurt_bowl',
  'hard_boiled_eggs',
  'protein_shake',
  'overnight_oats',
  'edamame',
  'mixed_nuts',
  'banana_snack',
  'greek_yogurt_snack',
  'tuna_pouch',
];
const FALLBACK_UF_PLATES = 6;

function fillerOptionsForSlot(spec: SlotSpec, allMeals: CuratedMeal[]): Opt[] {
  const eligible = mealsForSlots(spec.mealSlots, allMeals, emptyFilter(), 'default');
  // Tier 1: authored filler pool, gated on HANDS-ON time (overnight oats is
  // 5 min active / 245 total and belongs in the pool).
  const opts: Opt[] = [];
  for (const meal of eligible) {
    const isFiller =
      (meal as any).universal_filler === true ||
      DEFAULT_FILLER_SLUGS.includes(meal.slug as string);
    if (!isFiller) continue;
    const m0: any = (meal as any).methods?.[0];
    const active = m0?.time_active_minutes ?? m0?.time_total_minutes ?? 0;
    if (active > FILLER_MAX_MINUTES) continue;
    for (const plate of nonStuntPlates(meal)) {
      const o = plateToOpt(meal, plate);
      if (o) opts.push(o);
    }
  }
  if (opts.length > 0) return opts;
  // Tier 2 (mains, dessert): top eligible plates by protein density — the
  // prompt builder inlines the same fallback as UF rows, so an uncovered
  // lunch/dinner is still assessable instead of skipping the whole check.
  const candidates: Opt[] = [];
  for (const meal of eligible) {
    for (const plate of nonStuntPlates(meal)) {
      const o = plateToOpt(meal, plate);
      if (o) candidates.push(o);
    }
  }
  candidates.sort((x, y) => y.p / y.kcal - x.p / x.kcal);
  return candidates.slice(0, FALLBACK_UF_PLATES);
}

// ---------------------------------------------------------------------------
// Day-type construction
// ---------------------------------------------------------------------------

interface Occ {
  options: Opt[];
}
type DayType = Occ[];

interface WeekModel {
  /** [dayType, daysPerWeek] — e.g. [base, 6], [base+dessert, 1]. */
  dayTypes: [DayType, number][];
}

function buildWeek(
  slots: SlotSpec[],
  selectedKeys: string[],
  allMeals: CuratedMeal[],
  injected?: { slotId: string; opt: Opt }
): WeekModel | null {
  // Resolve options per slot, with lunch/dinner borrowing.
  const perSlot = new Map<string, Opt[]>();
  for (const spec of slots) {
    let opts = optionsForSlot(spec, selectedKeys, allMeals);
    if (injected && injected.slotId === spec.id) opts = [...opts, injected.opt];
    perSlot.set(spec.id, opts);
  }
  // Borrow: main-group slots share their unions.
  const mainIds = slots.filter((s) => s.borrowGroup === 'main').map((s) => s.id);
  if (mainIds.length > 1) {
    const union: Opt[] = mainIds.flatMap((id) => perSlot.get(id) ?? []);
    if (union.length > 0) for (const id of mainIds) perSlot.set(id, union);
  }
  // Empty slots fall back to the filler pool.
  for (const spec of slots) {
    if ((perSlot.get(spec.id) ?? []).length === 0) {
      const fillers = fillerOptionsForSlot(spec, allMeals);
      if (fillers.length === 0) return null; // can't model this slot — skip check
      perSlot.set(spec.id, fillers);
    }
  }

  const daily = slots.filter((s) => s.weeklyOccurrences >= 7);
  const capped = slots.filter(
    (s) => s.weeklyOccurrences > 0 && s.weeklyOccurrences < 7
  );

  const base: DayType = [];
  for (const spec of daily) {
    const perDay = Math.max(1, Math.round(spec.weeklyOccurrences / 7));
    for (let i = 0; i < perDay; i++) base.push({ options: perSlot.get(spec.id)! });
  }
  if (base.length === 0) return null;

  // One extra day-type per capped slot (dessert is the realistic case; if
  // several capped slots exist they're modeled on the same heavy day —
  // conservative and simple).
  if (capped.length === 0) return { dayTypes: [[base, 7]] };
  const heavyDays = Math.max(...capped.map((s) => s.weeklyOccurrences));
  const heavy: DayType = [
    ...base,
    ...capped.map((s) => ({ options: perSlot.get(s.id)! })),
  ];
  return {
    dayTypes: [
      [base, 7 - heavyDays],
      [heavy, heavyDays],
    ],
  };
}

// ---------------------------------------------------------------------------
// Per-day greedy bounds
// ---------------------------------------------------------------------------

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function kcalBounds(day: DayType): { lo: number; hi: number } {
  return {
    lo: sum(day.map((o) => Math.min(...o.options.map((x) => x.kcal * x.sMin)))),
    hi: sum(day.map((o) => Math.max(...o.options.map((x) => x.kcal * x.sMax)))),
  };
}

/**
 * Max achievable {axis} on this day at a calorie spend inside [kLo, kHi].
 * Per occurrence, take the best-density option for the axis; pour remaining
 * calories by density. Continuous-knapsack greedy — optimal for this shape.
 * Returns null if the day can't even reach kLo (caller handles via kcal check).
 */
function maxAxisAtKcal(
  day: DayType,
  axis: (o: Opt) => number,
  kLo: number,
  kHi: number
): number {
  const occ = day.map((o) => {
    let best = o.options[0];
    let bestRho = -1;
    for (const x of o.options) {
      const rho = axis(x) / x.kcal;
      if (rho > bestRho) { bestRho = rho; best = x; }
    }
    return { rho: bestRho, kMin: best.kcal * best.sMin, kMax: best.kcal * best.sMax };
  });
  let spend = sum(occ.map((o) => o.kMin));
  let val = sum(occ.map((o) => o.rho * o.kMin));
  const budget = Math.min(Math.max(spend, kLo), kHi);
  let remaining = budget - spend;
  if (remaining > 0) {
    for (const o of [...occ].sort((a, b) => b.rho - a.rho)) {
      const add = Math.min(remaining, o.kMax - o.kMin);
      if (add > 0) { val += o.rho * add; remaining -= add; }
      if (remaining <= 0) break;
    }
  }
  return val;
}

/** Min achievable {axis} while keeping calories ≥ kLo. Mirror greedy. */
function minAxisAtKcal(day: DayType, axis: (o: Opt) => number, kLo: number): number {
  const occ = day.map((o) => {
    let best = o.options[0];
    let bestPhi = Number.POSITIVE_INFINITY;
    for (const x of o.options) {
      const phi = axis(x) / x.kcal;
      if (phi < bestPhi) { bestPhi = phi; best = x; }
    }
    return { phi: bestPhi, kMin: best.kcal * best.sMin, kMax: best.kcal * best.sMax };
  });
  let spend = sum(occ.map((o) => o.kMin));
  let val = sum(occ.map((o) => o.phi * o.kMin));
  let needed = kLo - spend;
  if (needed > 0) {
    for (const o of [...occ].sort((a, b) => a.phi - b.phi)) {
      const add = Math.min(needed, o.kMax - o.kMin);
      if (add > 0) { val += o.phi * add; needed -= add; }
      if (needed <= 0) break;
    }
  }
  return val;
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

function checkWeek(week: WeekModel, T: Targets): Failure[] {
  const failures: Failure[] = [];
  const kLo = (1 - KCAL_TOL) * T.kcal;
  const kHi = (1 + KCAL_TOL) * T.kcal;
  const pFloor = (1 - PROTEIN_TOL) * T.protein_g;

  let weeklyFatMin = 0;
  let weeklyCarbMin = 0;
  let worstKcalFloorGap = 0;
  let worstKcalCeilGap = 0;
  let worstProteinGap = 0;
  let worstFiberGap = 0;

  for (const [day, count] of week.dayTypes) {
    if (count <= 0 || day.length === 0) continue;
    const { lo, hi } = kcalBounds(day);

    if (lo > kHi) worstKcalCeilGap = Math.max(worstKcalCeilGap, lo - kHi);
    if (hi + ADJ_KCAL_UP_CAP < kLo)
      worstKcalFloorGap = Math.max(worstKcalFloorGap, kLo - hi - ADJ_KCAL_UP_CAP);

    const maxP = maxAxisAtKcal(day, (o) => o.p, kLo, kHi);
    if (maxP + ADJ_PROTEIN_CAP < pFloor)
      worstProteinGap = Math.max(worstProteinGap, pFloor - maxP - ADJ_PROTEIN_CAP);

    if (T.fiber_g) {
      const maxFib = maxAxisAtKcal(day, (o) => o.fib, kLo, kHi);
      const fibFloor = FIBER_FLOOR * T.fiber_g;
      if (maxFib + ADJ_FIBER_CAP < fibFloor)
        worstFiberGap = Math.max(worstFiberGap, fibFloor - maxFib - ADJ_FIBER_CAP);
    }

    weeklyFatMin += count * minAxisAtKcal(day, (o) => o.f, lo > kLo ? lo : kLo);
    weeklyCarbMin += count * minAxisAtKcal(day, (o) => o.c, lo > kLo ? lo : kLo);
  }

  if (worstProteinGap > 0)
    failures.push({ axis: 'protein', direction: 'floor', gap: worstProteinGap });
  if (worstKcalCeilGap > 0)
    failures.push({ axis: 'calories', direction: 'ceiling', gap: worstKcalCeilGap });
  if (worstKcalFloorGap > 0)
    failures.push({ axis: 'calories', direction: 'floor', gap: worstKcalFloorGap });
  if (T.fat_g) {
    const fatCeil = 7 * T.fat_g * (1 + WEEKLY_TOL);
    if (weeklyFatMin > fatCeil)
      failures.push({ axis: 'fat', direction: 'ceiling', gap: (weeklyFatMin - fatCeil) / 7 });
  }
  if (T.carbs_g) {
    const carbCeil = 7 * T.carbs_g * (1 + WEEKLY_TOL);
    if (weeklyCarbMin > carbCeil)
      failures.push({ axis: 'carbs', direction: 'ceiling', gap: (weeklyCarbMin - carbCeil) / 7 });
  }
  if (worstFiberGap > 0)
    failures.push({ axis: 'fiber', direction: 'floor', gap: worstFiberGap });

  // Worst-first: protein > calories > fat > carbs > fiber.
  const rank: Record<FailAxis, number> = { protein: 0, calories: 1, fat: 2, carbs: 3, fiber: 4 };
  failures.sort((a, b) => rank[a.axis] - rank[b.axis]);
  return failures;
}

/** Min positive slack across all checks — used to rank certified fixes. */
function feasibilityMargin(week: WeekModel, T: Targets): number {
  const kLo = (1 - KCAL_TOL) * T.kcal;
  const kHi = (1 + KCAL_TOL) * T.kcal;
  const pFloor = (1 - PROTEIN_TOL) * T.protein_g;
  let margin = Number.POSITIVE_INFINITY;
  for (const [day, count] of week.dayTypes) {
    if (count <= 0 || day.length === 0) continue;
    const { lo, hi } = kcalBounds(day);
    margin = Math.min(margin, kHi - lo, hi + ADJ_KCAL_UP_CAP - kLo);
    const maxP = maxAxisAtKcal(day, (o) => o.p, kLo, kHi);
    margin = Math.min(margin, maxP + ADJ_PROTEIN_CAP - pFloor);
  }
  return margin;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function assessBasket(args: AssessArgs): BasketVerdict | null {
  const { slots, selectedKeys, allMeals, targets } = args;
  if (!targets || !targets.kcal || !targets.protein_g) return null;
  const week = buildWeek(slots, selectedKeys, allMeals);
  if (!week) return null; // structure not modelable — silently pass (never block)

  const failures = checkWeek(week, targets);
  if (failures.length === 0)
    return { feasible: true, failures: [], fixes: [], unfixableBySingleAdd: false };

  // --- Certified-fix search: brute force, per plate, per slot ---
  const picked = new Set(
    selectedKeys.map((raw) => {
      const k = raw.includes('|') ? raw.slice(raw.indexOf('|') + 1) : raw;
      return k.includes(':') ? k.split(':')[0] : k;
    })
  );
  const allergies = (args.allergies ?? []).map((a) => a.toLowerCase());
  const avoid = (args.avoid ?? []).map((a) => a.toLowerCase());

  const candidates: (CertifiedFix & { margin: number })[] = [];
  for (const spec of slots) {
    const eligible = mealsForSlots(spec.mealSlots, allMeals, emptyFilter(), 'default');
    for (const meal of eligible) {
      if (picked.has(meal.slug)) continue;
      const mealAllergens = String((meal as any).contains_allergens ?? '').toLowerCase();
      if (allergies.some((a) => a && mealAllergens.includes(a))) continue;
      const nameLc = meal.display_name.toLowerCase();
      if (avoid.some((a) => a && nameLc.includes(a))) continue;

      for (const plate of nonStuntPlates(meal)) {
        const opt = plateToOpt(meal, plate);
        if (!opt) continue;
        const hypo = buildWeek(slots, selectedKeys, allMeals, {
          slotId: spec.id,
          opt,
        });
        if (!hypo) continue;
        if (checkWeek(hypo, targets).length === 0) {
          candidates.push({
            slug: meal.slug,
            plateId: (plate as any).id,
            slot: spec.id,
            slotLabel: spec.label,
            name: meal.display_name,
            imageFilename:
              (plate as any).image_filename ?? (meal as any).image_filename,
            margin: feasibilityMargin(hypo, targets),
          });
        }
      }
    }
  }

  // Best plate per slug, ranked by post-fix margin.
  const bestBySlug = new Map<string, CertifiedFix & { margin: number }>();
  for (const c of candidates) {
    const cur = bestBySlug.get(c.slug);
    if (!cur || c.margin > cur.margin) bestBySlug.set(c.slug, c);
  }
  const fixes = [...bestBySlug.values()]
    .sort((a, b) => b.margin - a.margin)
    .slice(0, MAX_FIXES)
    .map(({ margin, ...fix }) => fix);

  return {
    feasible: false,
    failures,
    fixes,
    unfixableBySingleAdd: fixes.length === 0,
  };
}

// Exposed for the validation plan's unit tests (engine vs exhaustive,
// fire-rate Monte Carlo). Not for app code.
export const __internals = {
  buildWeek,
  checkWeek,
  kcalBounds,
  maxAxisAtKcal,
  minAxisAtKcal,
  feasibilityMargin,
};
```

## FILE: src/utils/buildPrepSession.ts  (513 lines)

```typescript
/**
 * buildPrepSession — projects a generated weekly meal plan into a deterministic
 * "Meal-Prep Session". Pure function, no AI, no I/O: it groups the plan's meals
 * by curated slug + plate, classifies each group by its `meal_prep` metadata
 * (plate-level overriding meal-level), and sorts the cook-ahead / prep-ahead
 * work longest-first.
 *
 * Meals with no curated linkage (invented / manual / legacy) can't be classified
 * from metadata, so they fall to the quiet "Make fresh" list by name. A plan with
 * ZERO curated linkage is flagged `isLegacyPlan` so the screen can show a
 * "regenerate to use prep" line instead of an empty cook-ahead.
 *
 * Servings note: `cookServings` (what we deep-link into the cook flow) is the
 * rounded SUM of per-eating scale factors across the group, NOT the occurrence
 * count — this is a bulking app, scale factors run >1, so occurrences would
 * undershoot. The builder stays UI-agnostic and does NOT clamp to the cook
 * flow's portion range; that clamp belongs at the deep-link boundary (the
 * RecipeDetail `servings` route param), because the bound is a UI constant, not
 * a property of the recipe. (min_scale/max_scale are NOT the right bound — they
 * cap a single serving's scale, a different unit from a portion count.)
 */

import type {
  SimplifiedMealPlan,
} from '../types/nutrition';
import type {
  CuratedMeal,
  Plate,
  CookingMethod,
  RecipeStep,
  MealPrep,
  MealPrepStrategy,
  EquipmentType,
} from '../types/curated_meals';
import { CURATED_MEALS } from '../data/curated_meals';

export type PrepStrategy = MealPrepStrategy; // 'full' | 'partial' | 'none'

/** New freshness-aware item format for meal-prep session UI */
export interface PrepSessionItem {
  curated_meal_slug: string;
  plate_id: string;
  display_name: string;
  total_servings: number;
  dates_eaten: string[]; // YYYY-MM-DD
  meal_prep: {
    strategy: 'full' | 'partial' | 'none';
    prep_note?: string;
    storage?: {
      fridge_days?: number;
      freeze_months?: number;
    };
  };
  freshness?: {
    fridge_days: number;        // resolved or default 4
    fridge_dates: string[];     // eat dates with offset < fridge_days
    freeze_dates: string[];     // eat dates with offset >= fridge_days
    freeze_servings: number;
    freeze_note?: string;       // e.g. "Freeze 3 portions on cook day —
                               //  thaw overnight before Jun 18, Jun 19, Jun 20"
  };
}

/** New freshness-aware session format */
export interface PrepSessionWithFreshness {
  sessionDate: string; // YYYY-MM-DD
  items: PrepSessionItem[];
}

/** A batch of identical meal (same slug + plate) to cook or prep ahead. */
export interface PrepGroup {
  /** `${slug}::${plateId}` — stable, used as the AsyncStorage completion key. */
  key: string;
  slug: string;
  plateId: string;
  meal: CuratedMeal;
  plate: Plate;
  method: CookingMethod;
  displayName: string;
  /** How many plan meals map here. The human "covers N meals" count for the card. */
  occurrences: number;
  /** round(Σ scale_factor over occurrences), min 1. The value deep-linked into the cook flow. */
  cookServings: number;
  strategy: PrepStrategy;
  prepNote?: string;
  prepAheadSummary?: string;
  dayOfSummary?: string;
  reason?: string;
  storage?: { fridge_days?: number; freeze_months?: number };
  /** method.time_total_minutes — used for longest-first ordering ONLY. */
  sortMinutes: number;
  /** method.time_active_minutes — one cook session's hands-on time. Feeds the payoff sum. */
  activeMinutes: number;
  /** 'full': all steps. 'partial': the method's base instructions (default boundary). */
  prepAheadSteps: RecipeStep[];
  /** 'partial': the plate's additional_instructions (assembled fresh). Empty for 'full'. */
  dayOfSteps: RecipeStep[];
}

/**
 * A line in the quiet "Make fresh" list. Covers both curated meals classified
 * 'none' (linked) and meals with no curated slug (unlinked / invented / legacy).
 * Deliberately lighter than PrepGroup: a PrepGroup mandates a resolved
 * CuratedMeal/Plate/Method, which unlinked meals don't have, and the Make-Fresh
 * list only needs a name + count.
 */
export interface MakeFreshItem {
  key: string;
  displayName: string;
  occurrences: number;
  /** true = a curated meal classified 'none'; false = no curated linkage. */
  linked: boolean;
  slug?: string;
  plateId?: string;
  reason?: string;
}

export interface PrepSession {
  /** strategy 'full' — cook everything ahead. Longest cook first. */
  cookAhead: PrepGroup[];
  /** strategy 'partial' — cook components ahead, finish fresh. Longest cook first. */
  prepAhead: PrepGroup[];
  /** strategy 'none' + all unlinked meals. Sorted by name. */
  makeFresh: MakeFreshItem[];
  totals: {
    /** Σ occurrences across cookAhead + prepAhead — the meals the prep "covers". */
    mealCount: number;
    /** Days the plan spans. */
    dayCount: number;
    /** Σ time_active_minutes across cookAhead + prepAhead. The payoff "~T min". NOT total time. */
    activeMinutes: number;
    /** # of plan meal instances that resolved to a curated meal (incl. 'none'). */
    curatedCount: number;
    /** true when curatedCount === 0 → screen shows "this plan predates prep support". */
    isLegacyPlan: boolean;
    /** Union of method equipment across cookAhead + prepAhead. Sorted for determinism. */
    equipment: EquipmentType[];
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Helper to resolve curated meal by slug - mirrors MealPlanDayScreen usage */
function getCuratedMealBySlug(slug: string, curated: Record<string, CuratedMeal> = CURATED_MEALS): CuratedMeal | null {
  return curated[slug] || null;
}

/** Helper to resolve plate from meal and plate_id - mirrors existing logic */
function getPlateFromMeal(meal: CuratedMeal, plateId: string): Plate | null {
  return meal.plates.find(p => p.id === plateId) || meal.plates[0] || null;
}

/** Helper to calculate days between two dates */
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function sanitizeScale(n: unknown): number {
  return typeof n === 'number' && isFinite(n) && n > 0 ? n : 1;
}

function numOr(n: unknown, fallback: number): number {
  return typeof n === 'number' && isFinite(n) ? n : fallback;
}

/** Mirror RecipeDetailScreen: select by plate_id, else fall back to the first plate. */
function resolvePlate(meal: CuratedMeal, plateId: unknown): Plate {
  if (typeof plateId === 'string') {
    const found = meal.plates.find((p) => p.id === plateId);
    if (found) return found;
  }
  return meal.plates[0];
}

function unionEquipment(groups: PrepGroup[]): EquipmentType[] {
  const set = new Set<EquipmentType>();
  for (const g of groups) {
    const eq = g.method.equipment_required;
    if (Array.isArray(eq)) for (const e of eq) set.add(e);
  }
  return Array.from(set).sort();
}

interface Acc {
  meal: CuratedMeal;
  plate: Plate;
  method: CookingMethod;
  strategy: PrepStrategy;
  mp?: MealPrep;
  occurrences: number;
  scaleSum: number;
}

function toPrepGroup(key: string, acc: Acc): PrepGroup {
  const { meal, plate, method, strategy, mp, occurrences, scaleSum } = acc;
  const baseSteps = Array.isArray(method.instructions) ? method.instructions : [];
  const plateSteps = Array.isArray(plate.additional_instructions) ? plate.additional_instructions : [];

  let prepAheadSteps: RecipeStep[];
  let dayOfSteps: RecipeStep[];
  if (strategy === 'full') {
    // Cook everything ahead; nothing left for the day of.
    prepAheadSteps = [...baseSteps, ...plateSteps];
    dayOfSteps = [];
  } else {
    // 'partial' default boundary: base cooked ahead, plate assembled fresh.
    // (The *_step_ids overrides are inert until RecipeStep gains an id.)
    prepAheadSteps = baseSteps;
    dayOfSteps = plateSteps;
  }

  return {
    key,
    slug: meal.slug,
    plateId: plate.id,
    meal,
    plate,
    method,
    displayName: plate.display_name || meal.display_name,
    occurrences,
    cookServings: Math.max(1, Math.round(scaleSum)),
    strategy,
    prepNote: mp?.prep_note,
    prepAheadSummary: mp?.prep_ahead_summary,
    dayOfSummary: mp?.day_of_summary,
    reason: mp?.reason,
    storage: mp?.storage,
    sortMinutes: numOr(method.time_total_minutes, 0),
    activeMinutes: numOr(method.time_active_minutes, 0),
    prepAheadSteps,
    dayOfSteps,
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

/** New freshness-aware buildPrepSession that returns PrepSessionItem format */
export function buildPrepSessionWithFreshness(
  plan: SimplifiedMealPlan,
  curated: Record<string, CuratedMeal> = CURATED_MEALS,
): PrepSessionWithFreshness | null {
  const dailyMeals = plan?.dailyMeals;
  if (!dailyMeals || typeof dailyMeals !== 'object') return null;

  const dateKeys = Object.keys(dailyMeals).sort();
  if (dateKeys.length === 0) return null;

  // Find earliest date with actual meals for session date
  let sessionDate = dateKeys[0];
  for (const dateKey of dateKeys) {
    const dayData = dailyMeals[dateKey];
    if (dayData?.meals && Array.isArray(dayData.meals) && dayData.meals.length > 0) {
      // Check if any meals have curated_meal_slug (are eligible for prep)
      const hasCuratedMeals = dayData.meals.some(meal => meal.curated_meal_slug);
      if (hasCuratedMeals) {
        sessionDate = dateKey;
        break;
      }
    }
  }

  // Group servings by curated_meal_slug + plate_id
  const mealGroups: { [key: string]: { dates: string[]; meal: any; servings: number } } = {};

  for (const dateKey of dateKeys) {
    const dayData = dailyMeals[dateKey];
    if (!dayData?.meals || !Array.isArray(dayData.meals)) continue;

    for (const serving of dayData.meals) {
      if (serving.curated_meal_slug) {
        const groupKey = `${serving.curated_meal_slug}_${serving.plate_id || 'standard'}`;
        if (!mealGroups[groupKey]) {
          mealGroups[groupKey] = { dates: [], meal: serving, servings: 0 };
        }
        mealGroups[groupKey].dates.push(dateKey);
        mealGroups[groupKey].servings += 1; // Count number of meal instances
      }
    }
  }

  const items: PrepSessionItem[] = [];

  for (const [groupKey, group] of Object.entries(mealGroups)) {
    const { dates, meal, servings } = group;
    const curatedMeal = getCuratedMealBySlug(meal.curated_meal_slug, curated);
    if (!curatedMeal) continue;

    const plateId = meal.plate_id || 'standard';
    const plate = getPlateFromMeal(curatedMeal, plateId);
    if (!plate) continue;

    // Resolve storage config: plate-level overrides meal-level
    const storage = plate.meal_prep?.storage ?? curatedMeal.meal_prep?.storage;
    const strategy = plate.meal_prep?.strategy ?? curatedMeal.meal_prep?.strategy ?? 'none';
    const prepNote = plate.meal_prep?.prep_note ?? curatedMeal.meal_prep?.prep_note;

    // Skip 'none' strategy meals
    if (strategy === 'none') continue;

    // Compute freshness for 'full' and 'partial' strategies
    const fridgeDays = storage?.fridge_days ?? 4;
    const fridgeDates: string[] = [];
    const freezeDates: string[] = [];

    for (const eatDate of dates) {
      const offset = daysBetween(sessionDate, eatDate);
      if (offset < fridgeDays) {
        fridgeDates.push(eatDate);
      } else {
        freezeDates.push(eatDate);
      }
    }

    const freezeServings = freezeDates.length;
    let freezeNote: string | undefined;
    if (freezeDates.length > 0) {
      const formattedDates = freezeDates
        .map(date => {
          const d = new Date(date);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        })
        .join(', ');
      freezeNote = `Freeze ${freezeServings} portions on cook day — thaw overnight before ${formattedDates}`;
    }

    const item: PrepSessionItem = {
      curated_meal_slug: meal.curated_meal_slug,
      plate_id: plateId,
      display_name: plate.display_name || curatedMeal.display_name,
      total_servings: servings,
      dates_eaten: dates.sort(),
      meal_prep: {
        strategy,
        prep_note: prepNote,
        storage
      },
      freshness: {
        fridge_days: fridgeDays,
        fridge_dates: fridgeDates.sort(),
        freeze_dates: freezeDates.sort(),
        freeze_servings: freezeServings,
        freeze_note: freezeNote
      }
    };

    items.push(item);
  }

  return {
    sessionDate,
    items
  };
}

export function buildPrepSession(
  plan: SimplifiedMealPlan,
  curated: Record<string, CuratedMeal> = CURATED_MEALS,
): PrepSession {
  const empty: PrepSession = {
    cookAhead: [],
    prepAhead: [],
    makeFresh: [],
    totals: {
      mealCount: 0,
      dayCount: 0,
      activeMinutes: 0,
      curatedCount: 0,
      isLegacyPlan: true,
      equipment: [],
    },
  };

  const dailyMeals = plan?.dailyMeals;
  if (!dailyMeals || typeof dailyMeals !== 'object') return empty;

  const dayKeys = Object.keys(dailyMeals);
  const dayCount = dayKeys.length;

  const groups = new Map<string, Acc>();
  const freshCurated = new Map<string, MakeFreshItem>(); // curated meals classified 'none'
  const freshUnlinked = new Map<string, MakeFreshItem>(); // no curated linkage, keyed by name
  let curatedCount = 0;

  for (const dateKey of dayKeys) {
    const dayMeals = dailyMeals[dateKey]?.meals;
    if (!Array.isArray(dayMeals)) continue;

    for (const meal of dayMeals) {
      const slug = typeof meal?.curated_meal_slug === 'string' ? meal.curated_meal_slug : undefined;
      const curatedMeal = slug ? curated[slug] : undefined;

      const linked =
        !!slug &&
        !!curatedMeal &&
        Array.isArray(curatedMeal.plates) &&
        curatedMeal.plates.length > 0 &&
        Array.isArray(curatedMeal.methods) &&
        curatedMeal.methods.length > 0;

      if (!linked) {
        // Unlinked: invented / manual / legacy. Surface by name in Make Fresh.
        const name = (meal?.name || 'Untitled meal').trim() || 'Untitled meal';
        const k = `unlinked::${name.toLowerCase()}`;
        const existing = freshUnlinked.get(k);
        if (existing) existing.occurrences += 1;
        else freshUnlinked.set(k, { key: k, displayName: name, occurrences: 1, linked: false });
        continue;
      }

      // From here on curatedMeal is a valid, fully-populated CuratedMeal.
      const cm = curatedMeal as CuratedMeal;
      curatedCount += 1;

      const plate = resolvePlate(cm, meal.plate_id);
      const method = cm.methods[0];
      const mp = plate.meal_prep
        ? { ...cm.meal_prep, ...plate.meal_prep } as MealPrep
        : cm.meal_prep;
      const strategy: PrepStrategy = mp?.strategy ?? 'none';
      const k = `${cm.slug}::${plate.id}`;

      if (strategy === 'none') {
        const existing = freshCurated.get(k);
        if (existing) existing.occurrences += 1;
        else
          freshCurated.set(k, {
            key: k,
            displayName: plate.display_name || cm.display_name,
            occurrences: 1,
            linked: true,
            slug: cm.slug,
            plateId: plate.id,
            reason: mp?.reason,
          });
        continue;
      }

      const acc = groups.get(k);
      if (acc) {
        acc.occurrences += 1;
        acc.scaleSum += sanitizeScale(meal.scale_factor);
      } else {
        groups.set(k, {
          meal: cm,
          plate,
          method,
          strategy,
          mp,
          occurrences: 1,
          scaleSum: sanitizeScale(meal.scale_factor),
        });
      }
    }
  }

  const cookAhead: PrepGroup[] = [];
  const prepAhead: PrepGroup[] = [];
  for (const [key, acc] of groups) {
    const grp = toPrepGroup(key, acc);
    if (acc.strategy === 'full') cookAhead.push(grp);
    else prepAhead.push(grp); // 'partial'
  }

  const byLongestFirst = (a: PrepGroup, b: PrepGroup): number =>
    b.sortMinutes - a.sortMinutes || a.displayName.localeCompare(b.displayName);
  cookAhead.sort(byLongestFirst);
  prepAhead.sort(byLongestFirst);

  const makeFresh: MakeFreshItem[] = [...freshCurated.values(), ...freshUnlinked.values()].sort(
    (a, b) => a.displayName.localeCompare(b.displayName),
  );

  const prepGroups = [...cookAhead, ...prepAhead];
  const mealCount = prepGroups.reduce((s, g) => s + g.occurrences, 0);
  const activeMinutes = prepGroups.reduce((s, g) => s + g.activeMinutes, 0);

  return {
    cookAhead,
    prepAhead,
    makeFresh,
    totals: {
      mealCount,
      dayCount,
      activeMinutes,
      curatedCount,
      isLegacyPlan: curatedCount === 0,
      equipment: unionEquipment(prepGroups),
    },
  };
}

/** Helper for day view: returns map of meals to freeze dates */
export function buildFreshnessIndex(plan: SimplifiedMealPlan): Map<string, Set<string>> {
  const session = buildPrepSessionWithFreshness(plan);
  const index = new Map<string, Set<string>>();

  if (!session) return index;

  for (const item of session.items) {
    const key = `${item.curated_meal_slug}_${item.plate_id}`;
    const freezeDatesSet = new Set(item.freshness?.freeze_dates || []);
    index.set(key, freezeDatesSet);
  }

  return index;
}
```

## FILE: src/utils/curatedShelves.ts  (189 lines)

```typescript
// utils/curatedShelves.ts
//
// Pure, framework-free logic for the "Foods you like" redesign (Direction A).
// Wired to the REAL types in src/types/curated_meals.ts:
//   - equipment lives on CookingMethod.equipment_required (NOT method.equipment)
//   - plates may ALSO carry equipment_required (assembly-only kit)
//   - MealSlot includes 'snack' + granular snack slots + evening_snack
//   - EquipmentType extended with 'no_cook' (authoring decision)
//   - plate_finished_weight_g is NEW/optional (density; may be absent)
//
// Tolerates missing fields throughout (catalogue is mid-authoring).

import { MealSlot, EquipmentType, CuratedMeal, Plate, CookingMethod } from '../types/curated_meals';

// Re-export types needed by the screen
export { MealSlot, EquipmentType };

type PartialPlate = Omit<Partial<CuratedMeal['plates'][number]>, 'plate_macros'> & {
  plate_macros?: Partial<CuratedMeal['plates'][number]['plate_macros']>;
};
export type MealLike = {
  slug: string;
  display_name?: string;
  eligible_slots?: CuratedMeal['eligible_slots'];
  methods?: Array<Partial<CuratedMeal['methods'][number]>>;
  plates?: PartialPlate[];
} & Partial<Omit<CuratedMeal, 'slug' | 'display_name' | 'eligible_slots' | 'methods' | 'plates'>>;

// Order tuned for the bulker audience: no/low-effort kit first.
export const EQUIPMENT_ORDER: EquipmentType[] = [
  'no_cook', 'microwave', 'blender', 'stovetop', 'air_fryer', 'slow_cooker',
  'rice_cooker', 'oven', 'pressure_cooker', 'grill', 'food_processor', 'freezer',
];

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  no_cook: 'No-cook', microwave: 'Microwave', blender: 'Blender',
  stovetop: 'Stovetop', air_fryer: 'Air fryer', slow_cooker: 'Slow cooker',
  rice_cooker: 'Rice cooker', oven: 'Oven', pressure_cooker: 'Pressure cooker',
  grill: 'Grill', food_processor: 'Food processor', freezer: 'Freezer',
};

export type CoreShelf = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'dessert';
export type TimeBucket = 'quick' | 'medium' | 'involved';
export type ShelfStatus = 'empty' | 'lean' | 'ready';
export type SortMode = 'default' | 'density';
export type BadgeKind = 'set_and_forget' | 'fast' | 'none';


// ---- Tunable constants ----
export const LEAN_THRESHOLDS: Record<CoreShelf, number> = {
  breakfast: 3, lunch: 3, dinner: 3, snacks: 2, dessert: 1,
};
export const SET_AND_FORGET_MIN = 120;
export const FAST_ACTIVE_MAX = 15;
export const SHELF_CARD_CAP = 8;

// ---- Slot -> shelf mapping (real slot values) ----
export const SHELF_SLOTS: Record<CoreShelf, MealSlot[]> = {
  breakfast: ['breakfast', 'brunch'],
  lunch:     ['lunch', 'second_lunch'],
  dinner:    ['dinner', 'early_dinner'],
  snacks:    ['snack', 'morning_snack', 'afternoon_snack', 'evening_snack'],
  dessert:   ['dessert'],
};

// pre_workout / post_workout are NOT snacks — they're exotic opt-in shelves.
export const EXOTIC_SLOTS: MealSlot[] = [
  'brunch', 'second_lunch', 'early_dinner',
  'morning_snack', 'afternoon_snack', 'evening_snack',
  'pre_workout', 'post_workout',
];

// ---- Badge ----
export function mealBadge(meal: MealLike): BadgeKind {
  const m = meal.methods?.[0];
  const total = m?.time_total_minutes ?? 0;
  const active = m?.time_active_minutes ?? 0;
  if (total >= SET_AND_FORGET_MIN) return 'set_and_forget';
  if (active > 0 && active <= FAST_ACTIVE_MAX) return 'fast';
  return 'none';
}

// ---- Density ----
export function mealDensity(meal: MealLike): number {
  const p = meal.plates?.[0];
  const kcal = p?.plate_macros?.kcal ?? 0;
  const g = p?.plate_finished_weight_g ?? 0;
  return g > 0 ? kcal / g : 0;
}
export function densityUnavailable(meals: MealLike[]): boolean {
  return meals.every((m) => mealDensity(m) === 0);
}

// ---- Selection counting (distinct meals, not plate-keys) ----
export function isMealPicked(meal: MealLike, selected: Set<string>): boolean {
  if (selected.has(meal.slug)) return true;
  const prefix = meal.slug + ':';
  for (const k of selected) if (k.startsWith(prefix)) return true;
  return false;
}
export function pickedMealCount(meals: MealLike[], selected: Set<string>): number {
  return meals.filter((m) => isMealPicked(m, selected)).length;
}

// ---- Shelf status ----
export interface ShelfStatusResult { status: ShelfStatus; picked: number; needed: number; }
export function coreShelfStatus(shelf: CoreShelf, shelfMeals: MealLike[], selected: Set<string>): ShelfStatusResult {
  const picked = pickedMealCount(shelfMeals, selected);
  const t = LEAN_THRESHOLDS[shelf];
  if (picked === 0) return { status: 'empty', picked, needed: t };
  if (picked < t) return { status: 'lean', picked, needed: t - picked };
  return { status: 'ready', picked, needed: 0 };
}
export function exoticShelfStatus(shelfMeals: MealLike[], selected: Set<string>): ShelfStatusResult {
  const picked = pickedMealCount(shelfMeals, selected);
  return picked === 0 ? { status: 'empty', picked, needed: 1 } : { status: 'ready', picked, needed: 0 };
}

// ---- Filtering: intersection across groups, union within group ----
export interface FilterState { equipment: Set<EquipmentType>; time: TimeBucket | null; }
export function emptyFilter(): FilterState { return { equipment: new Set(), time: null }; }

export function mealTimeBucket(meal: MealLike): TimeBucket {
  const active = meal.methods?.[0]?.time_active_minutes ?? 0;
  if (active <= 15) return 'quick';
  if (active <= 30) return 'medium';
  return 'involved';
}

// Equipment a meal can be made with = union of its methods' equipment_required.
// (Plate-level equipment_required is ADDITIVE kit for a specific plate; it does
// not make the meal "require" that kit, so it's excluded from the meal-level
// filterable set. A plate's own kit is enforced downstream at plan time.)
export function mealEquipment(meal: MealLike): Set<EquipmentType> {
  const s = new Set<EquipmentType>();
  meal.methods?.forEach((m) =>
    m.equipment_required?.forEach((e) => { if (EQUIPMENT_ORDER.includes(e)) s.add(e); })
  );
  return s;
}

export function passesFilter(meal: MealLike, f: FilterState): boolean {
  if (f.equipment.size > 0) {
    const me = mealEquipment(meal);
    let hit = false;
    for (const e of f.equipment) if (me.has(e)) { hit = true; break; }
    if (!hit) return false;
  }
  if (f.time && mealTimeBucket(meal) !== f.time) return false;
  return true;
}

function nameOf(m: MealLike): string {
  return m.plates?.[0]?.display_name || m.display_name || m.slug;
}
export function mealsForSlots<T extends MealLike>(slots: MealSlot[], all: T[], f: FilterState, sort: SortMode): T[] {
  let list = all.filter((m) => (m.eligible_slots ?? []).some((s) => slots.includes(s)) && passesFilter(m, f));
  if (sort === 'density') list = [...list].sort((a, b) => mealDensity(b) - mealDensity(a));
  else list = [...list].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  return list;
}
export function mealsForCoreShelf<T extends MealLike>(shelf: CoreShelf, all: T[], f: FilterState, sort: SortMode): T[] {
  return mealsForSlots(SHELF_SLOTS[shelf], all, f, sort);
}

// ---- Trailing card ----
export type TrailingCard =
  | { kind: 'all_picked'; total: number }
  | { kind: 'more'; more: number }
  | { kind: 'none' };
export function trailingCardState(shelfMeals: MealLike[], selected: Set<string>, expanded: boolean, cap: number = SHELF_CARD_CAP): TrailingCard {
  const total = shelfMeals.length;
  if (total > 0 && pickedMealCount(shelfMeals, selected) === total) return { kind: 'all_picked', total };
  if (expanded) return { kind: 'none' };
  const more = total - cap;
  if (more >= 2) return { kind: 'more', more };
  return { kind: 'none' };
}

// ---- Equipment chip counts (stable list incl. zeros; scoped to time filter) ----
export interface EquipmentChip { value: EquipmentType; count: number; disabled: boolean; }
export function equipmentChipCounts(all: MealLike[], f: FilterState): EquipmentChip[] {
  const timeOnly: FilterState = { equipment: new Set(), time: f.time };
  const pool = all.filter((m) => passesFilter(m, timeOnly));
  return EQUIPMENT_ORDER.map((value) => {
    const count = pool.filter((m) => mealEquipment(m).has(value)).length;
    return { value, count, disabled: count === 0 };
  });
}
```

## FILE: src/utils/nutritionMacros.ts  (280 lines)

```typescript
// src/utils/nutritionMacros.ts
//
// Macro computation + finalize step for the nutrition questionnaire.
//
// This is a NEW, self-contained copy of the Mifflin-St Jeor / TDEE math
// used by the new questionnaire flow. It deliberately does NOT touch the
// existing copies in NutritionQuestionnaireScreen, NutritionStep4, or
// WeightTracker — those keep working untouched.
//
// `finalizeNutrition` is the bridge to the prompt builder: it computes
// the macros from the collected answers and writes the two storage keys
// `assembleMealPlanningPrompt` requires —
//   - nutrition_questionnaire_results  ({ formData, macroResults })
//   - budget_cooking_questionnaire_results  ({ formData })
// — in exactly the shapes the builder reads. The save* methods on
// WorkoutStorage also flip the matching NutritionCompletionStatus flags.

import { WorkoutStorage } from './storage';
import { clearNutritionAnswers } from './nutritionQuestionnaireStorage';
import type { NutritionAnswers } from './nutritionQuestionnaireStorage';
import { derivePhase } from './goalsProfile';
import type { GoalsProfile, DerivedPhase, TrainingState } from './goalsProfile';

export interface MacroResults {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  extreme: 1.9,
};

// protein / carbs / fat as % of calories
const DIET_SPLITS: Record<string, { p: number; c: number; f: number }> = {
  balanced: { p: 20, c: 50, f: 30 },
  high_protein: { p: 30, c: 40, f: 30 },
  low_carb: { p: 25, c: 25, f: 50 },
  keto: { p: 20, c: 5, f: 75 },
};

// kg of body mass change per week → daily calorie delta (~7700 kcal/kg).
function dailyDelta(targetRateKgPerWeek: number): number {
  return (targetRateKgPerWeek * 7700) / 7;
}

export function computeMacros(a: NutritionAnswers): MacroResults | null {
  const { gender, age, height, weight, activityLevel, goal } = a;
  if (!gender || !age || !height || !weight || !activityLevel) return null;

  // Mifflin-St Jeor BMR
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    const male = 10 * weight + 6.25 * height - 5 * age + 5;
    const female = 10 * weight + 6.25 * height - 5 * age - 161;
    bmr = (male + female) / 2;
  }

  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55));

  const targetRate = (weight * (a.targetRatePercentage ?? 0)) / 100; // kg/week
  let calories = tdee;
  if (goal === 'lose_weight') calories = Math.round(tdee - dailyDelta(targetRate));
  else if (goal === 'gain_weight') calories = Math.round(tdee + dailyDelta(targetRate));

  const split =
    a.dietType === 'custom' && a.customMacros
      ? { p: a.customMacros.protein, c: a.customMacros.carbs, f: a.customMacros.fat }
      : DIET_SPLITS[a.dietType ?? 'balanced'] ?? DIET_SPLITS.balanced;

  const protein = Math.round((calories * split.p) / 100 / 4);
  const carbs = Math.round((calories * split.c) / 100 / 4);
  const fat = Math.round((calories - protein * 4 - carbs * 4) / 9);

  return { bmr: Math.round(bmr), tdee, calories, protein, carbs, fat };
}

// kg/week target derived from % bodyweight, rounded for display/storage.
export function computeTargetRate(a: NutritionAnswers): number {
  return Number(
    (((a.weight ?? 0) * (a.targetRatePercentage ?? 0)) / 100).toFixed(2)
  );
}

// Compute macros AND persist the two keys the prompt builder reads.
// Returns the macros (or null if required inputs are missing).
export async function finalizeNutrition(
  a: NutritionAnswers
): Promise<MacroResults | null> {
  const macros = computeMacros(a);
  if (!macros) return null;

  const now = new Date().toISOString();
  const targetRate = computeTargetRate(a);

  const nutritionResults: import('./storage').NutritionQuestionnaireResults = {
    formData: {
      goal: String(a.goal || ''),
      // builder parseFloat()s this; maintain → null so it shows a sane default
      rate: a.goal === 'maintain' ? '0' : String(targetRate),
      gender: String(a.gender || ''),
      age: String(a.age || ''),
      height: String(a.height || ''),
      weight: String(a.weight || ''),
      heightUnit: 'cm', // default unit
      weightUnit: 'kg', // default unit
      activityLevel: String(a.activityLevel || ''),
      jobType: 'desk_job', // not collected in this flow; builder default
    },
    macroResults: {
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      bmr: macros.bmr,
      tdee: macros.tdee,
      weeklyWeightChange: targetRate,
    },
    completedAt: now,
  };

  const budgetCookingResults: import('./storage').BudgetCookingQuestionnaireResults = {
    formData: {
      weeklyBudget: String(a.weeklyBudget || ''),
      country: String(a.country || ''),
      countryCode: String(a.countryCode || ''),
      city: String(a.city || ''),
      groceryStore: String(a.groceryStore || ''),
      planningStyle: Number(a.planningStyle ?? 3), // batch/leftover preference; builder default is 3
      cookingEnjoyment: 3, // default value since not collected in this flow
      timeInvestment: a.timeInvestment ?? 60,
      varietySeeking: 3, // default value since not collected in this flow
      skillConfidence: a.skillConfidence ?? 3,
      mealsPerDay: a.mealsPerDay ?? 3,
      snackingStyle: String(a.snackingStyle || ''),
      snackFrequency: a.snackFrequency,
      dessertFrequency: a.dessertFrequency as '0' | 'few_per_week' | 'most_nights' | 'every_night' | 'ai_decide' | undefined,
      budgetMin: a.budgetMin,
      budgetMax: a.budgetMax,
      planDuration: a.planDuration,
      startDate: a.startDate,
      cookingEquipment: a.cookingEquipment ?? [],
      eatingChallenges: a.eatingChallenges ?? [],
      allergies: a.allergies ?? [],
      avoidFoods: a.avoidFoods ?? [],
    },
    completedAt: now,
  };

  await WorkoutStorage.saveNutritionResults(nutritionResults);
  await WorkoutStorage.saveBudgetCookingResults(budgetCookingResults);

  // Clear the nutrition draft to prevent draft/final divergence once results are saved.
  // Best-effort: a failure here must not break finalization (results are already saved).
  try { await clearNutritionAnswers(); } catch { /* intentionally swallowed */ }

  return macros;
}

// ---------------------------------------------------------------------------
// Phase-aware macro computation (Phase 2 — phase-aware nutrition)
// ---------------------------------------------------------------------------

// Daily calorie target derived from the research-based rates in the build plan.
// Used by computeMacrosPhaseAware; exported for unit tests.
export function phaseCaloricTarget(
  tdee: number,
  phase: DerivedPhase,
  weightKg: number,
  bodyFatPct?: number,
  trainingState?: TrainingState
): number {
  switch (phase) {
    case 'bulk': {
      // Surplus scales with adaptation rate: new gains fast, advanced gains slow.
      // "returning" groups with "consistent" — muscle-memory regain needs a modest
      // surplus, and elevated-BF returners are already routed to recomp.
      const surplusPct =
        trainingState === 'new'      ? 1.10
        : trainingState === 'advanced' ? 1.05
        : 1.07; // consistent + returning (and default when unknown)
      return Math.round(tdee * surplusPct);
    }
    case 'lean_bulk': {
      const surplusPct =
        trainingState === 'new'      ? 1.07
        : trainingState === 'advanced' ? 1.03
        : 1.05; // consistent + returning
      return Math.round(tdee * surplusPct);
    }
    case 'cut': {
      // Leaner-means-slower ceiling: scale max deficit to available fat mass.
      // Prevents aggressive deficits when little fat remains to lose.
      const maxWeeklyLossPct =
        bodyFatPct == null ? 0.5
        : bodyFatPct < 15  ? 0.35
        : bodyFatPct < 20  ? 0.5
        : 0.75;
      const maxWeeklyLossKg = (weightKg * maxWeeklyLossPct) / 100;
      const ceilingDeficit = Math.round((maxWeeklyLossKg * 7700) / 7);
      const deficit = Math.min(500, ceilingDeficit);
      return Math.round(tdee - deficit);
    }
    case 'recomp':
      // Small deficit (8% or 300 kcal, whichever is smaller) — maintenance-adjacent.
      return Math.round(tdee - Math.min(300, Math.round(tdee * 0.08)));
    case 'maintain':
    default:
      return tdee;
  }
}

// Research-based protein targets (g/kg), biased high on cut to protect muscle.
function phaseProteinPerKg(phase: DerivedPhase): number {
  switch (phase) {
    case 'cut':      return 2.2;
    case 'recomp':   return 2.0;
    case 'lean_bulk':
    case 'maintain': return 1.8;
    case 'bulk':     return 1.6;
  }
}

// Phase-aware macro computation. Uses GoalsProfile weight (authoritative) and
// derives calorie/protein targets from the derived phase. Falls back gracefully
// when questionnaire fields required for BMR are not yet collected.
export function computeMacrosPhaseAware(
  answers: NutritionAnswers,
  profile: GoalsProfile
): MacroResults | null {
  const { gender, age, height, activityLevel } = answers;
  const weight = profile.currentWeightKg;
  if (!gender || !age || !height || !activityLevel || !weight) return null;

  // Mifflin-St Jeor BMR (mirrors computeMacros — keep in lockstep)
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    const male   = 10 * weight + 6.25 * height - 5 * age + 5;
    const female = 10 * weight + 6.25 * height - 5 * age - 161;
    bmr = (male + female) / 2;
  }

  const tdee = Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.55));
  const phase = derivePhase(profile);
  const calories = phaseCaloricTarget(tdee, phase, weight, profile.currentBodyFatPct, profile.trainingState);

  // Protein: research-based floor; bumped above the split-derived amount if needed.
  const pFloor = Math.round(weight * phaseProteinPerKg(phase));
  const split =
    answers.dietType === 'custom' && answers.customMacros
      ? { p: answers.customMacros.protein, c: answers.customMacros.carbs, f: answers.customMacros.fat }
      : DIET_SPLITS[answers.dietType ?? 'balanced'] ?? DIET_SPLITS.balanced;

  const splitProtein = Math.round((calories * split.p) / 100 / 4);
  const protein = Math.max(splitProtein, pFloor);

  // Remaining calories split fat:carb at the user's chosen ratio.
  const proteinKcal = protein * 4;
  const remaining = Math.max(0, calories - proteinKcal);
  const fatRatio = split.f / (split.f + split.c);
  const fat = Math.round((remaining * fatRatio) / 9);
  const carbs = Math.round((calories - proteinKcal - fat * 9) / 4);

  return { bmr: Math.round(bmr), tdee, calories, protein, carbs, fat };
}
```

## FILE: src/utils/goalsProfileStorage.ts  (51 lines)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoalsProfile } from './goalsProfile';

const KEY = '@goals_profile';

export async function loadGoalsProfile(): Promise<GoalsProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GoalsProfile;
  } catch (e) {
    console.error('loadGoalsProfile failed', e);
    return null;
  }
}

export async function saveGoalsProfile(profile: GoalsProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('saveGoalsProfile failed', e);
  }
}

// Falls back to a minimal default profile when none exists yet, so this
// also works as the create path for a user editing Goals & Stats before
// ever completing the onboarding gate.
export async function updateGoalsProfileField<K extends keyof GoalsProfile>(
  field: K,
  value: GoalsProfile[K]
): Promise<void> {
  const current = await loadGoalsProfile();
  const base: GoalsProfile = current ?? { currentWeightKg: 0, trainingState: 'new' };
  await saveGoalsProfile({ ...base, [field]: value });
}

export async function clearGoalsProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.error('clearGoalsProfile failed', e);
  }
}

// Returns true only when the minimum required fields are present.
// goalBodyFatPct, goalWeightKg, and currentBodyFatPct are all optional.
export async function hasGoalsProfile(): Promise<boolean> {
  const profile = await loadGoalsProfile();
  return profile != null && profile.currentWeightKg > 0 && !!profile.trainingState;
}

```

## FILE: src/utils/recipeFavorites.ts  (161 lines)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import RobustStorage from './robustStorage';

// ============================================================================
// Recipe favourites — browse-time "heart this recipe to find it later".
//
// IMPORTANT: this is deliberately SEPARATE from `curatedFavoritesStorage`,
// which backs the questionnaire's food-preference picker. Mixing the two would
// mean hearting a recipe while browsing silently changes the inputs to plan
// generation. Keep them apart.
//
// Storage shape: a JSON string[] of favourite entries, newest-first. Each entry
// is either:
//   - "slug::plateId"  → a specific plating of a recipe (current format), or
//   - "slug"           → a legacy whole-recipe favourite (pre plate support).
//
// We store identifiers only (not denormalised meal data) so consumers always
// read fresh details from CURATED_MEALS — no stale copies. Legacy bare-slug
// entries keep working: parseEntry leaves plateId undefined and consumers fall
// back to the recipe's first/default plate.
//
// Follows the same RobustStorage-with-AsyncStorage-fallback pattern used by
// favoriteExercises elsewhere in the app.
// ============================================================================

const STORAGE_KEY = 'recipeFavorites';
const SEP = '::';

export type FavoriteRef = { slug: string; plateId?: string };

function parseEntry(entry: string): FavoriteRef {
  const i = entry.indexOf(SEP);
  if (i === -1) return { slug: entry };
  return { slug: entry.slice(0, i), plateId: entry.slice(i + SEP.length) };
}

function makeEntry(slug: string, plateId?: string): string {
  return plateId ? `${slug}${SEP}${plateId}` : slug;
}

async function readRaw(): Promise<string[]> {
  try {
    const raw =
      (await RobustStorage.getItem(STORAGE_KEY, true)) ??
      (await AsyncStorage.getItem(STORAGE_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch (error) {
    console.error('Failed to load recipe favourites:', error);
    return [];
  }
}

async function writeRaw(entries: string[]): Promise<void> {
  const json = JSON.stringify(entries);
  const ok = await RobustStorage.setItem(STORAGE_KEY, json, true);
  if (!ok) await AsyncStorage.setItem(STORAGE_KEY, json);
}

// ---------------------------------------------------------------------------
// Plate-aware API (current)
// ---------------------------------------------------------------------------

/** All favourites, parsed into {slug, plateId?}, newest-first. */
export async function loadFavorites(): Promise<FavoriteRef[]> {
  return (await readRaw()).map(parseEntry);
}

/** Is this exact plating favourited? (plateId omitted → matches a legacy bare slug). */
export async function isPlateFavorite(slug: string, plateId?: string): Promise<boolean> {
  return (await readRaw()).includes(makeEntry(slug, plateId));
}

/** Add a plating (no-op if already present). Returns updated entries. */
export async function addPlateFavorite(slug: string, plateId?: string): Promise<string[]> {
  const key = makeEntry(slug, plateId);
  const all = await readRaw();
  if (!all.includes(key)) all.unshift(key); // newest-first
  await writeRaw(all);
  return all;
}

/** Remove a plating. Returns updated entries. */
export async function removePlateFavorite(slug: string, plateId?: string): Promise<string[]> {
  const key = makeEntry(slug, plateId);
  const all = (await readRaw()).filter((e) => e !== key);
  await writeRaw(all);
  return all;
}

/** Toggle a plating. Returns the NEW favourited state (true = now saved). */
export async function togglePlateFavorite(slug: string, plateId?: string): Promise<boolean> {
  const key = makeEntry(slug, plateId);
  const all = await readRaw();
  if (all.includes(key)) {
    await writeRaw(all.filter((e) => e !== key));
    return false;
  }
  all.unshift(key);
  await writeRaw(all);
  return true;
}

// ---------------------------------------------------------------------------
// Legacy slug-only API (kept for back-compat with existing callers such as the
// Library screen, which lists one entry per favourited recipe).
// ---------------------------------------------------------------------------

/** Unique favourited slugs, newest-first (collapses multiple platings of a recipe). */
export async function loadFavoriteSlugs(): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of await readRaw()) {
    const { slug } = parseEntry(entry);
    if (!seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

/** Is this recipe favourited in ANY plating (or as a legacy bare slug)? */
export async function isRecipeFavorite(slug: string): Promise<boolean> {
  return (await readRaw()).some((entry) => parseEntry(entry).slug === slug);
}

/** Add a bare-slug (whole recipe) favourite. Returns updated entries. */
export async function addRecipeFavorite(slug: string): Promise<string[]> {
  return addPlateFavorite(slug, undefined);
}

/** Remove ALL favourites for a recipe (every plating + any legacy bare slug). */
export async function removeRecipeFavorite(slug: string): Promise<string[]> {
  const all = (await readRaw()).filter((entry) => parseEntry(entry).slug !== slug);
  await writeRaw(all);
  return all;
}

/** Toggle a bare-slug (whole recipe) favourite. Returns the NEW state. */
export async function toggleRecipeFavorite(slug: string): Promise<boolean> {
  return togglePlateFavorite(slug, undefined);
}

export const RecipeFavorites = {
  // plate-aware
  loadFavorites,
  isPlateFavorite,
  addPlateFavorite,
  removePlateFavorite,
  togglePlateFavorite,
  // legacy slug-only
  loadFavoriteSlugs,
  isRecipeFavorite,
  addRecipeFavorite,
  removeRecipeFavorite,
  toggleRecipeFavorite,
};

export default RecipeFavorites;
```

## FILE: src/utils/curatedFavoritesStorage.ts  (257 lines)

```typescript
// src/utils/curatedFavoritesStorage.ts
//
// Standalone store for the user's "Foods you like" taste profile.
//
// V2 (slot-scoped picks):
//   - picks: Array<{ slot, slug, plate_id? }> — the tab the user was on at
//     tap time IS the slot. Picking Butter Chicken under Lunch says nothing
//     about Dinner; the same meal can be picked independently in both.
//   - slugs: kept as a LEGACY MIRROR — the unique BASE slugs derived from
//     picks — so the live prompt builder (which reads `slugs` and expects
//     bare slugs it can resolve against json.fit) keeps working unchanged
//     until the builder rebuild ships. Never write plate-composite keys
//     ("slug:plateId") into this array.
//   - cuisines / avoid / likedDishes unchanged (free-text taste context).
//
// Lunch↔dinner interchangeability is a SCHEDULING-time relaxation granted in
// the prompt (and the feasibility engine's borrow group) — it is not encoded
// here. Storage records what the user actually said, per slot.
//
// BACKWARD COMPAT (read): three shapes can exist on disk —
//   1. bare string[] of slugs        (oldest)
//   2. { slugs, cuisines, ... }      (V1 object)
//   3. { version: 2, picks, slugs, cuisines, ... }
// loadCuratedFavoritesV2 normalises all three. V1 shapes return picks: [];
// the picker screen hydrates legacy slugs into every eligible tab once, and
// the user prunes. Composite keys that leaked into V1 `slugs` (an interim
// screen build wrote plate keys there) are normalised to base slugs on read.
//
// BACKWARD COMPAT (write): saveCuratedFavorites (V1 signature) still works
// for old callers — it read-modify-writes, reconciling stored picks against
// the new slug set (picks whose slug was removed are dropped; picks are
// otherwise preserved).

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nutrition_curated_favorites';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanSlot =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'dessert'
  | 'brunch'
  | 'second_lunch'
  | 'early_dinner'
  | 'pre_workout'
  | 'post_workout'
  | 'morning_snack'
  | 'afternoon_snack'
  | 'evening_snack';

export interface SlotPick {
  /** Tab context at tap time. */
  slot: PlanSlot;
  slug: string;
  /** Absent = bare-slug pick: the AI may choose among the meal's plates. */
  plate_id?: string;
}

/** V1 view — what legacy callers (summary card, live prompt builder) read. */
export interface CuratedFavorites {
  slugs: string[];
  cuisines: string[];
  avoid: string[];
  likedDishes: string[];
}

export interface CuratedFavoritesV2 extends CuratedFavorites {
  version: 2;
  picks: SlotPick[];
}

const EMPTY_V2: CuratedFavoritesV2 = {
  version: 2,
  picks: [],
  slugs: [],
  cuisines: [],
  avoid: [],
  likedDishes: [],
};

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const cleanStrings = (v: any): string[] =>
  Array.isArray(v)
    ? v.filter((s) => typeof s === 'string' && s.trim().length > 0)
    : [];

/** "slug:plateId" → "slug"; bare slugs pass through. */
const baseSlug = (s: string): string => {
  const i = s.indexOf(':');
  return i === -1 ? s : s.slice(0, i);
};

const uniqueBaseSlugs = (slugs: string[]): string[] =>
  Array.from(new Set(slugs.map(baseSlug)));

const cleanPicks = (v: any): SlotPick[] => {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: SlotPick[] = [];
  for (const p of v) {
    if (!p || typeof p.slot !== 'string' || typeof p.slug !== 'string') continue;
    if (!p.slot.trim() || !p.slug.trim()) continue;
    const plateId =
      typeof p.plate_id === 'string' && p.plate_id.trim().length > 0
        ? p.plate_id
        : undefined;
    const id = `${p.slot}|${p.slug}:${plateId ?? ''}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(
      plateId
        ? { slot: p.slot as PlanSlot, slug: p.slug, plate_id: plateId }
        : { slot: p.slot as PlanSlot, slug: p.slug }
    );
  }
  return out;
};

/** Derive the legacy mirror from picks (bare base slugs, unique). */
const mirrorSlugs = (picks: SlotPick[]): string[] =>
  Array.from(new Set(picks.map((p) => p.slug)));

// ---------------------------------------------------------------------------
// V2 API
// ---------------------------------------------------------------------------

export async function loadCuratedFavoritesV2(): Promise<CuratedFavoritesV2> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_V2 };
    const parsed = JSON.parse(raw);

    // Oldest shape: a bare array of slugs.
    if (Array.isArray(parsed)) {
      return {
        ...EMPTY_V2,
        slugs: uniqueBaseSlugs(cleanStrings(parsed)),
      };
    }

    const picks = cleanPicks(parsed?.picks);
    const storedSlugs = uniqueBaseSlugs(cleanStrings(parsed?.slugs));
    return {
      version: 2,
      picks,
      // The mirror is the union: slugs derived from picks PLUS any stored
      // slugs beyond them. Extras can only come from V1-API saves (slot-less
      // additions) — they ride the mirror until the picker hydrates them.
      slugs: Array.from(new Set([...picks.map((p) => p.slug), ...storedSlugs])),
      cuisines: cleanStrings(parsed?.cuisines),
      avoid: cleanStrings(parsed?.avoid),
      likedDishes: cleanStrings(parsed?.likedDishes),
    };
  } catch (e) {
    console.error('loadCuratedFavoritesV2 failed', e);
    return { ...EMPTY_V2 };
  }
}

export async function saveCuratedFavoritesV2(input: {
  picks: SlotPick[];
  cuisines: string[];
  avoid: string[];
  likedDishes: string[];
}): Promise<void> {
  try {
    const picks = cleanPicks(input.picks);
    const payload: CuratedFavoritesV2 = {
      version: 2,
      picks,
      slugs: mirrorSlugs(picks),
      cuisines: Array.from(new Set(cleanStrings(input.cuisines))),
      avoid: Array.from(new Set(cleanStrings(input.avoid))),
      likedDishes: Array.from(new Set(cleanStrings(input.likedDishes))),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('saveCuratedFavoritesV2 failed', e);
  }
}

/**
 * Count of actual food picks. Use this for "N picks" UI — unlike
 * favoritesCount it never counts cuisines/avoid/likedDishes. Falls back to
 * the slug mirror for legacy data that predates slot-scoped picks.
 */
export function picksCount(fav: CuratedFavorites | CuratedFavoritesV2): number {
  const picks = (fav as CuratedFavoritesV2).picks;
  if (Array.isArray(picks) && picks.length > 0) return picks.length;
  return fav.slugs.length;
}

// ---------------------------------------------------------------------------
// V1 API — preserved for existing callers (prompt builder, older screens)
// ---------------------------------------------------------------------------

export async function loadCuratedFavorites(): Promise<CuratedFavorites> {
  const v2 = await loadCuratedFavoritesV2();
  return {
    slugs: v2.slugs,
    cuisines: v2.cuisines,
    avoid: v2.avoid,
    likedDishes: v2.likedDishes,
  };
}

export async function saveCuratedFavorites(fav: CuratedFavorites): Promise<void> {
  try {
    const current = await loadCuratedFavoritesV2();
    const slugs = uniqueBaseSlugs(cleanStrings(fav.slugs));
    const slugSet = new Set(slugs);
    const payload: CuratedFavoritesV2 = {
      version: 2,
      // Preserve slot detail where it still applies; drop picks whose meal
      // the caller removed. Slugs the caller ADDED have no slot context —
      // they ride the mirror only, and the picker hydrates them on next open.
      picks: current.picks.filter((p) => slugSet.has(p.slug)),
      slugs,
      cuisines: Array.from(new Set(cleanStrings(fav.cuisines))),
      avoid: Array.from(new Set(cleanStrings(fav.avoid))),
      likedDishes: Array.from(new Set(cleanStrings(fav.likedDishes))),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('saveCuratedFavorites failed', e);
  }
}

export async function clearCuratedFavorites(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.error('clearCuratedFavorites failed', e);
  }
}

/**
 * True if the user has provided ANY taste-profile signal (legacy semantics:
 * counts all four arrays). Prefer picksCount() for "N picks" UI.
 */
export function favoritesCount(fav: CuratedFavorites): number {
  return (
    fav.slugs.length +
    fav.cuisines.length +
    fav.avoid.length +
    fav.likedDishes.length
  );
}
```

## FILE: src/utils/mealPlanPromptV2.ts  (990 lines)

```typescript
// src/utils/mealPlanPromptV2.ts
//
// V2 MEAL-PLAN GENERATION PROMPT BUILDER
// ======================================
// Replaces the legacy builders (dynamicMealPlanningPrompt.ts /
// mealPlanningPrompt.ts). Organising principle: THE APP PLANS, THE AI
// SCHEDULES AND ADDS. Every number that can be computed app-side is computed
// here and inlined as an absolute number. The external model's whole job:
// choose an option per occurrence, choose a scale, add the column, patch
// gaps from a fixed table.
//
// What changed vs the legacy builder:
// - PER-MEAL FETCHES ABOLISHED. Options are serialised from local
//   CURATED_MEALS (~1 table row per plate). One tiny fetch survives at the
//   top — the v2 instructions file — as capability gate + hotfix channel.
//   Review/JSON files stay fetched at stage transitions.
// - READS V2 SLOT-SCOPED PICKS. favorites.picks → per-slot frames, so plans
//   are slot-faithful. Lunch↔dinner borrowing is demoted from standing rule
//   to tool. Legacy slug-only saves hydrate into every eligible frame.
// - EQUIPMENT REMOVED END-TO-END. Curated picks are never equipment-checked
//   (self-selection is the filter); inventions assume a standard kitchen.
//   This also kills the live reviewer bug that swapped out picked smoothies.
// - TOLERANCES UNIFIED: kcal ±5% DAILY, protein ±10% daily, fiber ≥80%
//   daily, carbs/fat ±10% weekly average. Stated as absolute numbers.
// - PURE FUNCTION: buildMealPlanPrompt(answers, macros, favorites, sleep?)
//   reads NO storage — snapshot-testable. assembleMealPlanPromptV2() is the
//   thin async wrapper that loads and passes; wire it in wherever
//   assembleDynamicMealPlanningPrompt (or assembleMealPlanningPrompt) is
//   called today, then delete both legacy builders and the in-app
//   review/JSON prompts once the /prompts/v2/ files are live on json.fit.
//
// SERVER FILES THIS EXPECTS (upload before shipping; v1 URLs freeze forever):
//   https://json.fit/prompts/v2/instructions.md        (capability gate, ~500 words)
//   https://json.fit/prompts/v2/meal-review-prompt.md  (review, daily ±5% kcal)
//   https://json.fit/prompts/v2/meal-json-prompt.md    (conversion)
//
// OPTIONAL DATA PASS: add `universal_filler?: boolean` to CuratedMeal and tag
// the simple crowd-pleasers. Until then DEFAULT_FILLER_SLUGS below is the
// filler pool, so nothing blocks on the audit.
//
// FIELD-NAME CHOKE POINTS (fix here only if your repo differs):
//   - sniffMacros(): MacroResults field names
//   - answers.weight (kg), answers.startDate (token or ISO), budgetMin/Max

import { CuratedMeal, MealSlot, Plate } from '../types/curated_meals';
import { CURATED_MEALS } from '../data/curated_meals';
import {
  CuratedFavoritesV2,
  PlanSlot,
  loadCuratedFavoritesV2,
} from './curatedFavoritesStorage';
import {
  NutritionAnswers,
  loadNutritionAnswers,
} from './nutritionQuestionnaireStorage';
import { computeMacros, computeMacrosPhaseAware } from './nutritionMacros';
import { WorkoutStorage } from './storage';
import { loadGoalsProfile } from './goalsProfileStorage';
import { derivePhase } from './goalsProfile';
import type { DerivedPhase } from './goalsProfile';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PROMPT_VERSION = 'v2';

const INSTRUCTIONS_URL = 'https://json.fit/prompts/v2/instructions.md';
const REVIEW_URL = 'https://json.fit/prompts/v2/meal-review-prompt.md';

const FETCH_FAIL_MESSAGE =
  "This prompt needs to fetch files from json.fit, but fetching isn't working in your AI. To use JSON.fit:\n" +
  '- Use Claude.ai with web search enabled in the message composer\n' +
  '- Or ChatGPT with browsing enabled\n' +
  'Then paste this prompt again.';

// Tolerances (the single statement of truth — review file must match).
const KCAL_TOL = 0.05; // daily
const PROTEIN_TOL = 0.1; // daily
const CF_TOL = 0.1; // carbs/fat, weekly average
const FIBER_FLOOR_PCT = 0.8; // daily
const PROTEIN_FLOOR_G_PER_KG = 0.4; // per main meal

const STUNT_CAP = 1;
const MAX_ADJUSTERS_PER_DAY = 3;
// Hands-on time gate for tier-1 fillers (ACTIVE minutes — overnight oats is
// 5 min active / 245 total and absolutely belongs in the pool).
const FILLER_MAX_ACTIVE_MINUTES = 20;
// When a frame has no picks and no tier-1 fillers (mains, dessert), inline
// the top eligible plates by protein density as UF rows instead — a
// delegated slot still produces curated references, never a blank table.
const FALLBACK_UF_PLATES = 6;

// Fallback filler pool until `universal_filler` is authored on the data.
const DEFAULT_FILLER_SLUGS: string[] = [
  'greek_yoghurt_bowl',
  'hard_boiled_eggs',
  'protein_shake',
  'overnight_oats',
  'edamame',
  'mixed_nuts',
  'banana_snack',
  'greek_yogurt_snack',
  'tuna_pouch',
];

// Fixed adjuster table — near-pure macro dials with exact per-unit macros.
// Emitted as STANDALONE plan entries (a shake next to breakfast), never
// attached to meals. Where one exists as a curated snack, the AI emits the
// curated reference instead of an invented entry.
interface Adjuster {
  id: string;
  unit: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
  axis: string;
  maxPerDay: number;
  curatedRef?: string; // slug to emit as curated reference
}
const ADJUSTERS: Adjuster[] = [
  { id: 'protein_shake',     unit: '1 serving',    kcal: 250, p: 35,  c: 16, f: 5,  fib: 0, axis: 'protein',     maxPerDay: 2, curatedRef: 'protein_shake' },
  { id: 'greek_yogurt_snack', unit: '1 serving',   kcal: 170, p: 17,  c: 9,  f: 6,  fib: 0, axis: 'protein',     maxPerDay: 1, curatedRef: 'greek_yogurt_snack' },
  { id: 'tuna_pouch',        unit: '1 serving',    kcal: 110, p: 25,  c: 0,  f: 1,  fib: 0, axis: 'protein',     maxPerDay: 1, curatedRef: 'tuna_pouch' },
  { id: 'beef_jerky',        unit: '1 serving',    kcal: 115, p: 14,  c: 5,  f: 3,  fib: 0, axis: 'protein',     maxPerDay: 1, curatedRef: 'beef_jerky' },
  { id: 'hard_boiled_eggs',  unit: '1 serving',    kcal: 140, p: 12,  c: 1,  f: 10, fib: 0, axis: 'protein',     maxPerDay: 1, curatedRef: 'hard_boiled_eggs' },
  { id: 'protein_bar',       unit: '1 serving',    kcal: 220, p: 20,  c: 22, f: 7,  fib: 5, axis: 'protein',     maxPerDay: 1, curatedRef: 'protein_bar' },
  { id: 'cheese_snack',      unit: '1 serving',    kcal: 115, p: 7,   c: 1,  f: 9,  fib: 0, axis: 'protein+fat', maxPerDay: 1, curatedRef: 'cheese_snack' },
  { id: 'mixed_nuts',        unit: '1 serving',    kcal: 250, p: 9,   c: 9,  f: 22, fib: 3, axis: 'fat',         maxPerDay: 1, curatedRef: 'mixed_nuts' },
  { id: 'banana_snack',      unit: '1 serving',    kcal: 105, p: 1,   c: 27, f: 0,  fib: 3, axis: 'carbs',       maxPerDay: 2, curatedRef: 'banana_snack' },
  { id: 'steamed_rice',      unit: '1 serving',    kcal: 195, p: 4,   c: 42, f: 0,  fib: 1, axis: 'carbs',       maxPerDay: 2, curatedRef: 'steamed_rice' },
  { id: 'steamed_mixed_veg', unit: '1 serving',    kcal: 65,  p: 4,   c: 11, f: 1,  fib: 5, axis: 'fibre',       maxPerDay: 2, curatedRef: 'steamed_mixed_veg' },
  { id: 'baked_potato',      unit: '1 serving',    kcal: 140, p: 3,   c: 31, f: 0,  fib: 3, axis: 'carbs',       maxPerDay: 2, curatedRef: 'baked_potato' },
  { id: 'berries',           unit: '1 serving',    kcal: 80,  p: 1,   c: 18, f: 0,  fib: 5, axis: 'fibre',       maxPerDay: 2, curatedRef: 'berries' },
];

// ---------------------------------------------------------------------------
// Slot structure (mirrors the picker's tab derivation — keep in lockstep)
// ---------------------------------------------------------------------------

const EXOTIC_FILL_ORDER: PlanSlot[] = [
  'brunch',
  'second_lunch',
  'early_dinner',
  'pre_workout',
  'post_workout',
];

// Picks under snack-time slots fold into the snack frame; everything else is
// its own slot. (Mirrors the picker's snacks shelf.)
const SLOT_FOLD: Partial<Record<PlanSlot, PlanSlot>> = {
  morning_snack: 'snack',
  afternoon_snack: 'snack',
  evening_snack: 'snack',
};

const SLOT_POOL: Record<string, MealSlot[]> = {
  breakfast: ['breakfast'],
  lunch: ['lunch'],
  dinner: ['dinner'],
  snack: ['snack', 'morning_snack', 'afternoon_snack', 'evening_snack'],
  dessert: ['dessert'],
  brunch: ['brunch'],
  second_lunch: ['second_lunch'],
  early_dinner: ['early_dinner'],
  pre_workout: ['pre_workout'],
  post_workout: ['post_workout'],
};

const SLOT_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
  dessert: 'Dessert',
  brunch: 'Brunch',
  second_lunch: 'Second lunch',
  early_dinner: 'Early dinner',
  pre_workout: 'Pre-workout',
  post_workout: 'Post-workout',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptTargets {
  kcal: number;
  kcalLo: number;
  kcalHi: number;
  protein: number;
  pLo: number;
  pHi: number;
  pFloor: number;
  fibMin: number;
  cLo: number;
  cHi: number;
  fLo: number;
  fHi: number;
}

interface PlanOption {
  key: string; // "slug:plate_id" — verbatim lookup key
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
  sMin: number;
  sMax: number;
  serves: number;
  prep: 'full' | 'partial' | 'none';
  stunt: boolean;
  filler: boolean;
}

interface SlotFrame {
  slot: PlanSlot;
  label: string;
  occurrencesPerWeek: number;
  perDay: number;
  options: PlanOption[];
  borrowableWith?: PlanSlot;
}

export interface BuildOpts {
  /** Axes the user accepted as short at Save time (e.g. ['protein']). */
  acceptedShortfall?: string[];
  /** Derived phase from GoalsProfile — injected by assembleMealPlanPromptV2. */
  derivedPhase?: DerivedPhase;
  /** GoalsProfile weight (kg) — preferred over answers.weight for tolerances. */
  profileWeightKg?: number;
  /** True when GoalsProfile has goalWeightKg or goalBodyFatPct — triggers lean-mass-targets.md fetch. */
  hasLeanMassTargets?: boolean;
}

interface SleepDataLike {
  bedtime?: string;
  wakeTime?: string;
  optimizationLevel?: string;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const n0 = (x: number) => String(Math.round(x));
const n5 = (x: number) => String(Math.round(x / 5) * 5);

function sniffMacros(r: any): { kcal: number; protein: number; carbs: number; fat: number } | null {
  if (!r) return null;
  // First try computeMacros field names, then legacy fields
  const kcal = r.calories ?? r.targetCalories ?? r.kcal ?? r.dailyCalories;
  const protein = r.protein ?? r.proteinTarget ?? r.protein_g ?? r.proteinGrams;
  const carbs = r.carbs ?? r.carbsTarget ?? r.carbs_g ?? 0;
  const fat = r.fat ?? r.fatTarget ?? r.fat_g ?? 0;
  if (!kcal || !protein) return null;
  return {
    kcal,
    protein,
    carbs,
    fat,
  };
}

function fiberTarget(kcal: number): number {
  return Math.min(45, Math.max(25, Math.round((kcal / 1000) * 14)));
}

export function deriveTargets(macros: any, weightKg?: number): PromptTargets | null {
  const m = sniffMacros(macros);
  if (!m) return null;
  const fib = fiberTarget(m.kcal);
  const pFloor =
    weightKg && weightKg > 0
      ? Math.round(PROTEIN_FLOOR_G_PER_KG * weightKg)
      : Math.max(20, Math.round(m.protein * 0.18));
  return {
    kcal: Math.round(m.kcal),
    kcalLo: Math.round(m.kcal * (1 - KCAL_TOL)),
    kcalHi: Math.round(m.kcal * (1 + KCAL_TOL)),
    protein: Math.round(m.protein),
    pLo: Math.round(m.protein * (1 - PROTEIN_TOL)),
    pHi: Math.round(m.protein * (1 + PROTEIN_TOL)),
    pFloor,
    fibMin: Math.round(fib * FIBER_FLOOR_PCT),
    cLo: Math.round(m.carbs * (1 - CF_TOL)),
    cHi: Math.round(m.carbs * (1 + CF_TOL)),
    fLo: Math.round(m.fat * (1 - CF_TOL)),
    fHi: Math.round(m.fat * (1 + CF_TOL)),
  };
}

function eligibleMeals(slot: PlanSlot, all: CuratedMeal[]): CuratedMeal[] {
  const pool = SLOT_POOL[slot] ?? [slot as MealSlot];
  return all.filter((m) => m.eligible_slots.some((s) => pool.includes(s)));
}

function prepOf(meal: CuratedMeal, plate: Plate): 'full' | 'partial' | 'none' {
  return (plate.meal_prep?.strategy ?? meal.meal_prep?.strategy ?? 'none') as
    | 'full'
    | 'partial'
    | 'none';
}

function plateOption(meal: CuratedMeal, plate: Plate, filler = false): PlanOption | null {
  const pm = plate.plate_macros;
  if (!pm || !pm.kcal) return null;
  return {
    key: `${meal.slug}:${plate.id}`,
    name: plate.display_name || meal.display_name,
    kcal: pm.kcal,
    p: pm.protein_g ?? 0,
    c: pm.carbs_g ?? 0,
    f: pm.fat_g ?? 0,
    fib: pm.fiber_g ?? 0,
    sMin: meal.min_scale ?? 0.7,
    sMax: meal.max_scale ?? 1.5,
    serves: meal.produces_servings ?? 1,
    prep: prepOf(meal, plate),
    stunt: !!plate.is_stunt_plate,
    filler,
  };
}

// ---------------------------------------------------------------------------
// Occurrence + structure derivation (all ai_decide resolved app-side)
// ---------------------------------------------------------------------------

function snackOccurrences(freq: string | undefined, kcal: number): number {
  if (!freq || freq === '0') return 0;
  if (freq === '2') return 14;
  if (freq === '3+') return 21;
  if (freq === 'ai_decide') return kcal >= 2800 ? 14 : 7;
  return 7;
}

function dessertOccurrences(freq: string | undefined): number {
  switch (freq) {
    case 'every_night': return 7;
    case 'most_nights': return 5;
    case 'few_per_week': return 3;
    case 'once_per_week': return 1;
    case 'ai_decide': return 3;
    default: return 0;
  }
}

function structureSlots(answers: NutritionAnswers, all: CuratedMeal[]): PlanSlot[] {
  const mealsPerDay = (answers as any).mealsPerDay ?? 3;
  const core: PlanSlot[] =
    mealsPerDay === 1 ? ['dinner'] : mealsPerDay === 2 ? ['lunch', 'dinner'] : ['breakfast', 'lunch', 'dinner'];
  const slots: PlanSlot[] = [...core];
  let extra = Math.max(0, mealsPerDay - 3);
  for (const s of EXOTIC_FILL_ORDER) {
    if (extra <= 0) break;
    if (eligibleMeals(s, all).length > 0) {
      slots.push(s);
      extra -= 1;
    }
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Frames from V2 picks
// ---------------------------------------------------------------------------

function buildFrames(
  answers: NutritionAnswers,
  favorites: CuratedFavoritesV2,
  targets: PromptTargets,
  all: CuratedMeal[]
): SlotFrame[] {
  const bySlug = new Map(all.map((m) => [m.slug as string, m]));
  const snackOcc = snackOccurrences((answers as any).snackFrequency, targets.kcal);
  const dessertOcc = dessertOccurrences((answers as any).dessertFrequency);

  const slots: PlanSlot[] = structureSlots(answers, all);
  if (snackOcc > 0) slots.push('snack');
  if (dessertOcc > 0) slots.push('dessert');

  // Group picks by (folded) slot. Picks for slots outside this structure are
  // dropped — that food has no occurrence to fill this week.
  const picksBySlot = new Map<PlanSlot, { slug: string; plate_id?: string }[]>();
  const addPick = (slot: PlanSlot, slug: string, plate_id?: string) => {
    const folded = SLOT_FOLD[slot] ?? slot;
    if (!slots.includes(folded)) return;
    if (!picksBySlot.has(folded)) picksBySlot.set(folded, []);
    picksBySlot.get(folded)!.push({ slug, plate_id });
  };
  const pickedSlugs = new Set(favorites.picks.map((p) => p.slug));
  for (const p of favorites.picks) addPick(p.slot, p.slug, p.plate_id);
  // Mirror-only slugs — legacy data, or V1-API additions with no slot
  // context — hydrate into every eligible frame, like the picker does.
  for (const slug of favorites.slugs) {
    if (pickedSlugs.has(slug)) continue;
    const meal = bySlug.get(slug);
    if (!meal) continue;
    for (const s of slots) {
      if (eligibleMeals(s, all).some((m) => m.slug === meal.slug)) addPick(s, slug);
    }
  }

  // Resolve picks → options. Bare slug = every non-stunt plate of the meal;
  // plate pick = exactly that plate (stunt allowed — the user chose it; the
  // weekly stunt cap still applies via the rules).
  const frames: SlotFrame[] = slots.map((slot) => {
    const seen = new Set<string>();
    const options: PlanOption[] = [];
    for (const p of picksBySlot.get(slot) ?? []) {
      const meal = bySlug.get(p.slug);
      if (!meal) continue;
      const plates = p.plate_id
        ? (meal.plates ?? []).filter((pl) => pl.id === p.plate_id)
        : (meal.plates ?? []).filter((pl) => !pl.is_stunt_plate);
      for (const pl of plates) {
        const opt = plateOption(meal, pl);
        if (opt && !seen.has(opt.key)) {
          seen.add(opt.key);
          options.push(opt);
        }
      }
    }
    return {
      slot,
      label: SLOT_LABEL[slot] ?? slot,
      occurrencesPerWeek: slot === 'snack' ? snackOcc : slot === 'dessert' ? dessertOcc : 7,
      perDay: slot === 'snack' ? Math.max(1, Math.round(snackOcc / 7)) : 1,
      options,
      borrowableWith: slot === 'lunch' ? 'dinner' : slot === 'dinner' ? 'lunch' : undefined,
    };
  });

  // Uncovered frames get universal fillers (marked UF) — allergen/avoid
  // filtered, never stunt. Picked options are never filtered: the user
  // looked at the meal and chose it; self-selection is the filter.
  // Tier 1: the authored filler pool (universal_filler flag or the default
  // list), gated on hands-on time. Tier 2 (mains, dessert — the pool has no
  // entries there): top eligible plates by protein density, so a delegated
  // slot still emits curated references rather than a blank table.
  const allergies = ((answers as any).allergies ?? []).map((a: string) => a.toLowerCase());
  const avoid = (favorites.avoid ?? []).map((a) => a.toLowerCase());
  const passesDiet = (meal: CuratedMeal): boolean => {
    const mealAllergens = String(meal.contains_allergens ?? '').toLowerCase();
    if (allergies.some((a: string) => a && mealAllergens.includes(a))) return false;
    const nameLc = meal.display_name.toLowerCase();
    if (avoid.some((a) => a && nameLc.includes(a))) return false;
    return true;
  };
  const fillerPool = all.filter(
    (m) => (m as any).universal_filler === true || DEFAULT_FILLER_SLUGS.includes(m.slug as string)
  );
  for (const frame of frames) {
    if (frame.options.length > 0) continue;
    for (const meal of eligibleMeals(frame.slot, fillerPool)) {
      const active = meal.methods?.[0]?.time_active_minutes ?? meal.methods?.[0]?.time_total_minutes ?? 0;
      if (active > FILLER_MAX_ACTIVE_MINUTES) continue;
      if (!passesDiet(meal)) continue;
      for (const pl of (meal.plates ?? []).filter((p) => !p.is_stunt_plate)) {
        const opt = plateOption(meal, pl, true);
        if (opt) frame.options.push(opt);
      }
    }
    if (frame.options.length === 0) {
      const candidates: PlanOption[] = [];
      for (const meal of eligibleMeals(frame.slot, all)) {
        if (!passesDiet(meal)) continue;
        for (const pl of (meal.plates ?? []).filter((p) => !p.is_stunt_plate)) {
          const opt = plateOption(meal, pl, true);
          if (opt) candidates.push(opt);
        }
      }
      candidates.sort((x, y) => y.p / y.kcal - x.p / x.kcal);
      frame.options.push(...candidates.slice(0, FALLBACK_UF_PLATES));
    }
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Meal timing (computed app-side from sleep data; defaults otherwise)
// ---------------------------------------------------------------------------

function parseClock(s?: string): number | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function fmtClock(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = Math.round((m % 60) / 15) * 15;
  const total = h24 * 60 + mm;
  const h = Math.floor((total % 1440) / 60);
  const minute = total % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${minute.toString().padStart(2, '0')} ${ap}`;
}

function mealTimes(
  frames: SlotFrame[],
  sleep?: SleepDataLike | null
): { first: string; last: string; lines: string[] } {
  const wake = parseClock(sleep?.wakeTime) ?? 7 * 60;
  let bed = parseClock(sleep?.bedtime) ?? 22 * 60 + 30;
  if (bed <= wake) bed += 1440; // crosses midnight
  const level = sleep?.optimizationLevel ?? 'moderate';
  const afterWake = level === 'maximum' ? 45 : level === 'minimal' ? 90 : 60;
  const beforeBed = level === 'maximum' ? 240 : level === 'minimal' ? 120 : 180;

  const first = wake + afterWake;
  const last = bed - beforeBed;

  const ORDER: PlanSlot[] = ['breakfast', 'brunch', 'lunch', 'second_lunch', 'early_dinner', 'dinner'];
  const timed = ORDER.filter((s) => frames.some((f) => f.slot === s));
  const lines: string[] = [];
  timed.forEach((slot, i) => {
    const t = timed.length === 1 ? last : first + ((last - first) * i) / (timed.length - 1);
    lines.push(`${SLOT_LABEL[slot]} ~${fmtClock(t)}`);
  });
  if (frames.some((f) => f.slot === 'pre_workout')) lines.push('Pre-workout: 45–60 min before training');
  if (frames.some((f) => f.slot === 'post_workout')) lines.push('Post-workout: within 60 min after training');
  if (frames.some((f) => f.slot === 'snack')) lines.push('Snacks: between the meals above');
  if (frames.some((f) => f.slot === 'dessert')) lines.push('Dessert: after dinner');
  return { first: fmtClock(first), last: fmtClock(last), lines };
}

// ---------------------------------------------------------------------------
// Start date (answers.startDate is a token or an ISO date)
// ---------------------------------------------------------------------------

function resolveStartDate(token?: string): Date {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
  if (!token || token === 'tomorrow') return tomorrow;
  if (token === 'today') return today;
  if (token === 'next_monday') {
    const d = new Date(today);
    const delta = ((8 - d.getDay()) % 7) || 7;
    d.setDate(d.getDate() + delta);
    return d;
  }
  const parsed = new Date(token);
  return isNaN(parsed.getTime()) ? tomorrow : parsed;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const pretty = (d: Date) =>
  d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function optionRow(o: PlanOption): string {
  const name = `${o.name}${o.stunt ? ' (stunt)' : ''}${o.filler ? ' (UF)' : ''}`;
  return `| ${name} | ${o.key} | ${n0(o.kcal)} | ${n0(o.p)} | ${n0(o.c)} | ${n0(o.f)} | ${n0(o.fib)} | ${o.sMin}–${o.sMax} | ${o.serves} | ${o.prep} |`;
}

function frameSection(f: SlotFrame): string {
  const perDay = f.perDay > 1 ? ` (${f.perDay}/day)` : '';
  const head = `### ${f.label} — ${f.occurrencesPerWeek}×/week${perDay}`;
  const table = [
    '| option | key | kcal | P | C | F | fib | scale | serves | prep |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...f.options.map(optionRow),
  ].join('\n');
  const notes: string[] = [];
  if (f.options.some((o) => o.filler))
    notes.push(
      'Rows marked (UF) were NOT picked by the user — use them only to cover occurrences their picks don\u2019t.'
    );
  if (f.borrowableWith)
    notes.push(
      `May borrow from ${SLOT_LABEL[f.borrowableWith]} when it helps reuse a batch or hit the day's targets.`
    );
  const realOpts = f.options.filter((o) => !o.filler).length;
  if (realOpts > 0 && realOpts * 2 <= f.occurrencesPerWeek)
    notes.push(
      `With ${realOpts} option${realOpts === 1 ? '' : 's'} for ${f.occurrencesPerWeek} occurrences, repetition is expected and correct — vary the scale day to day rather than inventing variety.`
    );
  return [head, table, ...notes.map((s) => `> ${s}`)].join('\n');
}

function adjusterSection(): string {
  const rows = ADJUSTERS.map(
    (a) =>
      `| ${a.id} | ${a.unit} | ${a.kcal} | ${a.p} | ${a.c} | ${a.f} | ${a.fib} | ${a.axis} | ${a.maxPerDay} |${a.curatedRef ? ` curated: \`${a.curatedRef}\`` : ''}`
  );
  return [
    '## Adjusters (standalone entries used to close a day\u2019s gaps)',
    '| id | unit | kcal | P | C | F | fib | axis | max/day |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
    `Routing: protein gap → protein_shake/greek_yogurt_snack/tuna_pouch; carb gap → steamed_rice/baked_potato/banana_snack; fat gap → mixed_nuts/cheese_snack; fibre gap → steamed_mixed_veg/berries. Maximum ${MAX_ADJUSTERS_PER_DAY} adjuster items per day.`,
    'Adjusters are independent of user snack preferences and always available to close daily gaps regardless of snack count.',
    'Output format: all adjusters have curated references — emit the curated slug, never invent entries.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Phase context block (injected into the prompt when GoalsProfile is present)
// ---------------------------------------------------------------------------

function phaseContextBlock(phase: DerivedPhase, macros: any, planDays: number, hasLeanMassTargets?: boolean): string {
  const PHASE_LABELS: Record<DerivedPhase, string> = {
    cut:       'Cut (fat loss)',
    recomp:    'Recomp (simultaneous fat loss + muscle gain)',
    lean_bulk: 'Lean bulk (controlled muscle gain)',
    bulk:      'Bulk (muscle gain)',
    maintain:  'Maintain (weight maintenance)',
  };

  const tdee: number = macros?.tdee ?? macros?.bmr ?? 0;
  const cal: number  = macros?.calories ?? macros?.kcal ?? 0;
  const delta = cal - tdee;

  let rationale: string;
  switch (phase) {
    case 'cut':
      rationale =
        `Calorie deficit: ${Math.abs(delta)} kcal/day below maintenance (${tdee} kcal). ` +
        `Deficit is capped at 500 kcal to protect lean mass. ` +
        `Protein is set at the upper research range (2.2 g/kg) to counter muscle loss.`;
      break;
    case 'recomp':
      rationale =
        `Near-maintenance calories (${Math.abs(delta)} kcal below ${tdee} kcal maintenance). ` +
        `Goal: simultaneous fat loss and muscle retention via high protein and consistent training. ` +
        `Protein target (2.0 g/kg) is the primary lever.`;
      break;
    case 'lean_bulk':
      rationale =
        `${Math.abs(delta)} kcal/day surplus above maintenance (${tdee} kcal → ${cal} kcal). ` +
        `Controlled gain to support hypertrophy while limiting fat accumulation. ` +
        `Note: a surplus this small can fall within TDEE estimation error (±10–15%); accurate calorie tracking is required for it to function as a true surplus.`;
      break;
    case 'bulk':
      rationale =
        `${Math.abs(delta)} kcal/day surplus above maintenance (${tdee} kcal → ${cal} kcal). ` +
        `Surplus is scaled to training experience — larger for new lifters, smaller for advanced, reflecting their respective muscle-gain rate ceilings. ` +
        `Note: a small surplus (especially at advanced level) can fall within TDEE estimation error (±10–15%); accurate calorie tracking is required for it to function as a true surplus.`;
      break;
    case 'maintain':
      rationale =
        `Calories set to maintenance (${cal} kcal). ` +
        `Goal: sustain current body weight while optimising composition through training.`;
      break;
  }

  const lines = [
    '## Phase context (context for the macro targets below — do not output this section in the plan)',
    `**Phase:** ${PHASE_LABELS[phase]}`,
    rationale,
  ];

  if (phase === 'cut' && planDays > 56) {
    lines.push(
      '',
      '> **Diet-break reminder:** This is a plan longer than 8 weeks on a deficit. After every 8–12 continuous weeks of a calorie deficit, schedule a 1–2 week maintenance break before resuming. This preserves metabolic rate and hormone balance. Mention this in the plan notes.'
    );
  }

  lines.push('');
  const fetchRefs = ['- https://json.fit/phase-selection.md (phase selection rationale)'];
  if (hasLeanMassTargets) {
    fetchRefs.push('- https://json.fit/lean-mass-targets.md (lean mass targets)');
  }
  lines.push('**Phase references (fetch for context — do not show these URLs to the user):**\n' + fetchRefs.join('\n'));

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// The prompt
// ---------------------------------------------------------------------------

export function buildMealPlanPrompt(
  answers: NutritionAnswers,
  macros: any,
  favorites: CuratedFavoritesV2,
  sleep?: SleepDataLike | null,
  opts?: BuildOpts
): string {
  const a: any = answers;
  const targets = deriveTargets(macros, opts?.profileWeightKg ?? a.weight);
  if (!targets) {
    throw new Error('Macro targets are missing — complete the nutrition questionnaire first.');
  }
  const frames = buildFrames(answers, favorites, targets, Object.values(CURATED_MEALS));
  const times = mealTimes(frames, sleep);
  const dessertOcc = frames.find((f) => f.slot === 'dessert')?.occurrencesPerWeek ?? 0;
  const start = resolveStartDate(a.startDate);
  const duration: number = a.planDuration ?? 7;

  const allergies: string[] = a.allergies ?? [];
  const avoid: string[] = favorites.avoid ?? [];
  const challenges: string[] = a.eatingChallenges ?? [];
  const cuisines: string[] = favorites.cuisines ?? [];
  const likedDishes: string[] = favorites.likedDishes ?? [];

  const budget =
    a.budgetMin != null && a.budgetMax != null
      ? `$${a.budgetMin}\u2013$${a.budgetMax}/week`
      : a.weeklyBudget
      ? String(a.weeklyBudget)
      : 'moderate';

  const shortfall = (opts?.acceptedShortfall ?? []).filter(Boolean);

  const parts: string[] = [];

  parts.push(
    `**FETCH CHECK:** Fetch ${INSTRUCTIONS_URL} now and follow it alongside this prompt. If the fetch fails for any reason, stop and reply only:\n"${FETCH_FAIL_MESSAGE}"`
  );

  // Opener callout — fires after the fetch check passes. Sets expectations
  // for the whole three-step flow so users don't bounce thinking the AI's
  // first response is the final deliverable.
  parts.push(
    [
      '## START YOUR RESPONSE WITH THIS EXACT CALLOUT',
      '',
      'The VERY FIRST thing in your response must be this callout, formatted as a code block (triple backticks, no language identifier). Do not add anything before it. Reproduce it verbatim:',
      '',
      '```',
      '🍽️ Creating your meal plan draft.',
      '',
      'This is the first of three steps:',
      '1. I\u2019ll write the draft below.',
      '2. You\u2019ll review it and reply "happy" \u2014 I\u2019ll run a quality check.',
      '3. Reply "happy" again after that, and I\u2019ll turn it into your file.',
      '```',
      '',
      'This callout tells the user what to expect from the whole flow so they don\u2019t get lost between steps. After the callout, continue with the meal plan work as normal.',
      '',
      '## FORMATTING RULES (CRITICAL)',
      '',
      'Code blocks (triple backticks) in YOUR CHAT RESPONSE are RESERVED for the opening callout above and the closing callout at the end. Do not use code blocks elsewhere in your visible response \u2014 not for meal names, not for example output, not for ingredient lists. Use **bold**, headers, tables, and bullet lists for the plan itself.',
      '',
      'Note: this rule applies to what you write in chat. Anything you fetch (such as the instructions file) is your own reference material and is not part of your visible response \u2014 the user never sees it.',
    ].join('\n')
  );

  parts.push(
    `I'm using JSON.fit. Build my ${duration}-day meal plan by SELECTING and SCALING from the options below. Do not search past chats; everything you need is here.`
  );

  parts.push(
    [
      '## How this works (binding rules)',
      '1. Each option below is an OPTION for its slot, not a promise of appearance. Fill every occurrence of a slot by choosing ONE option and a scale factor. Options may repeat across the week. If a slot has more options than occurrences, leave some out \u2014 that is correct, not an error.',
      '2. scale_factor multiplies that plate\u2019s macros uniformly. Use steps of 0.05 within the stated [min\u2013max]. Macros for a serving = plate macros \u00d7 scale_factor.',
      '3. Serve options in their listed slot by default. Lunch and dinner options MAY be swapped between those two slots when it helps reuse a batch or hit a day\u2019s targets. All other slots use only their own options.',
      '4. Batch meals (serves > 1): if you schedule one, schedule its full batch within the week, or state "freeze N portions" in the prep notes. Place fridge-eaten servings on consecutive days starting at the cook; any serving more than 4 days after the cook must be a frozen portion with a thaw note ("freeze N portions; thaw overnight before day X"). Rotate its plates.',
      `5. Maximum ${STUNT_CAP} stunt plate this week. Dessert appears exactly ${dessertOcc} time(s) \u2014 never more, never as "optional".`,
      `6. Adjusters (table below) are standalone items used to close a day\u2019s gaps. Maximum ${MAX_ADJUSTERS_PER_DAY} per day.`,
      '7. Fallback order when a day misses target: rescale \u2192 adjusters \u2192 swap option within the slot \u2192 universal fillers (marked UF) for uncovered occurrences \u2192 only if all else fails, invent a simple meal and say so in the plan notes.',
      '8. Curated options are output as references (slug + plate_id + scale_factor) \u2014 never rewrite them as recipes. Slugs and plate_ids are verbatim lookup keys; copy them exactly.',
    ].join('\n')
  );

  const mealVariety: string = (a.mealVariety as string) ?? 'balanced';
  const varietyDirective =
    mealVariety === 'convenience'
      ? 'VARIETY — Convenience. Repeat meals aggressively to minimise cooking and shopping. Reuse the same mains across multiple days via batching, and keep adjusters consistent day to day. Repetition is desired here, not a flaw.'
      : mealVariety === 'variety'
      ? 'VARIETY — High. Maximise day to day variety: rotate the main options across more days and vary the adjusters and produce daily. Accept more cooking and shopping to avoid repetition.'
      : 'VARIETY — Balanced. Use roughly two to three distinct mains per slot across the week, and rotate the adjusters and produce so the same top-up doesn’t appear every single day. Still batch where it genuinely helps.';
  parts.push(varietyDirective);

  if (opts?.derivedPhase) {
    parts.push(phaseContextBlock(opts.derivedPhase, macros, duration, opts?.hasLeanMassTargets));
  }

  const targetLines = [
    '## Your daily targets (absolute numbers — already computed)',
    `- Calories: ${n5(targets.kcalLo)}\u2013${n5(targets.kcalHi)} kcal EVERY day`,
    `- Protein: ${targets.pLo}\u2013${targets.pHi} g EVERY day; every main meal \u2265 ${targets.pFloor} g`,
    `- Fibre: \u2265 ${targets.fibMin} g every day`,
    `- Weekly averages: carbs ${targets.cLo}\u2013${targets.cHi} g, fat ${targets.fLo}\u2013${targets.fHi} g`,
    `- Meal times: first meal ~${times.first}, last meal finished by ~${times.last}. Suggested: ${times.lines.join('; ')}`,
    `- Plan dates: ${duration} days starting ${pretty(start)} (${iso(start)}). Use actual calendar dates.`,
  ];
  if (duration > 7)
    targetLines.push(
      '- Build one 7-day week from the structure below, then repeat the pattern for the remaining days (rotating options where there are several).'
    );
  if (shortfall.length)
    targetLines.push(
      `- The user has already accepted that their picks alone run short on: ${shortfall.join(', ')}. Close those gaps with adjusters and fillers as a matter of routine \u2014 do not flag it or ask about it.`
    );
  parts.push(targetLines.join('\n'));

  parts.push(['## Week structure', ...frames.map(frameSection)].join('\n\n'));

  parts.push(adjusterSection());

  parts.push(
    [
      '## Build procedure',
      'Work one day at a time. For each day: place batch servings first, fill the remaining occurrences, then write the arithmetic line before moving on (compute with a code tool if available \u2014 never sum in your head):',
      '  Mon: baked_oats:standard 1.0 (520/38) + protein_shake:standard 1.0 (250/30) + butter_chicken:standard 0.9 (648/47) + pulled_pork:bowl 0.85 (1131/52) = 2549 kcal / 167 P',
      '(Illustrative format only \u2014 your options and numbers are in the tables above.)',
      'If a day lands outside its calorie or protein band, fix it per rule 7 and re-write the line. Do not present any day that fails its band.',
    ].join('\n')
  );

  parts.push(
    [
      '## Constraints — apply to UF rows and invented food only',
      `Allergies: ${allergies.length ? allergies.join(', ') : 'none'}. Avoid: ${avoid.length ? avoid.join(', ') : 'none'}.${challenges.length ? ` Eating challenges to accommodate: ${challenges.join(', ')}.` : ''}`,
      'Assume a standard kitchen; prefer no-cook or one-pan inventions, \u226420 min hands-on. The curated options above were chosen by the user \u2014 do not second-guess, equipment-check, or substitute them.',
    ].join('\n')
  );

  parts.push(
    [
      '## Grocery list',
      `Location & store: ${a.groceryStore ?? 'local supermarket'} in ${a.city ?? ''} ${a.country ?? ''}`.trim() + `. Weekly budget: ${budget}.`,
      'Include every ingredient across the plan (curated meals included, from your knowledge of those recipes), organised by shopping category, with quantity, unit, and a realistic estimated price for that store. Notes only for items bought outside the main store. Give a total as a range: low = sum of items, high = low \u00d7 1.10 rounded up, with the currency symbol.',
    ].join('\n')
  );

  // Soft taste-context lives BEFORE the closing instruction so the closer
  // is always the dead-last thing the prompt tells the AI.
  if (cuisines.length || likedDishes.length) {
    parts.push(
      [
        '## Taste context (soft preferences)',
        `${cuisines.length ? `Cuisines they enjoy: ${cuisines.join(', ')}.` : ''} ${likedDishes.length ? `Liked dishes (build from your own knowledge if you use them as inventions): ${likedDishes.join(', ')}.` : ''}`.trim(),
      ].join('\n')
    );
  }

  // Closing callout — must be the dead-last instruction in the prompt so
  // the AI puts it dead-last in its response.
  parts.push(
    [
      '## Output',
      'Present the full plan in chat: each day with dates and times, the per-day arithmetic line, prep notes, then the grocery list. Present only the final clean version \u2014 no working, no drafts.',
      '',
      '## END YOUR RESPONSE WITH THIS EXACT CALLOUT',
      '',
      'The VERY LAST thing in your response must be this callout, formatted as a code block (triple backticks, no language identifier). Do not add anything after it. Reproduce it verbatim:',
      '',
      '```',
      '\u2705 Your meal plan draft is ready.',
      '',
      '\u25b6 Reply "happy" when you\u2019re done \u2014 I\u2019ll run a quality check on it.',
      '\u270f\ufe0f Want changes? Just tell me what to adjust.',
      '```',
      '',
      `When the user confirms they\u2019re satisfied (any reasonable confirmation \u2014 "happy", "looks good", "yes", "done", "ready" \u2014 accept it), fetch ${REVIEW_URL} and follow it. Don\u2019t mention URLs to the user.`,
    ].join('\n')
  );

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Review launcher — exact per-user numbers restated, zero duplicated rules.
// The fetched review file is the enforcement layer; this just points at it.
// ---------------------------------------------------------------------------

export function buildReviewLauncher(t: PromptTargets): string {
  return `Review the meal plan above as a quality gate.
Fetch ${REVIEW_URL} and follow it exactly.
Verify against these targets (authoritative \u2014 use these, not numbers recalled from earlier):
- Calories: ${t.kcalLo}\u2013${t.kcalHi} kcal every day
- Protein: ${t.pLo}\u2013${t.pHi} g every day (each main meal \u2265 ${t.pFloor} g)
- Fibre: \u2265 ${t.fibMin} g every day
- Weekly averages: carbs ${t.cLo}\u2013${t.cHi} g, fat ${t.fLo}\u2013${t.fHi} g`;
}

// ---------------------------------------------------------------------------
// Async wrapper — the only storage-touching entry point. Wire THIS in where
// assembleDynamicMealPlanningPrompt / assembleMealPlanningPrompt is called.
// ---------------------------------------------------------------------------

export async function assembleMealPlanPromptV2(opts?: BuildOpts): Promise<string> {
  const answers = await loadNutritionAnswers();
  if (!answers) {
    throw new Error('Please complete the nutrition questionnaire first.');
  }

  // Phase-aware path: load GoalsProfile and use research-based macro targets
  // when available. Falls back to questionnaire-derived macros for users who
  // haven't completed GoalsIntake (backwards compatible).
  let macros: any = null;
  let derivedPhase: DerivedPhase | undefined;
  let profileWeightKg: number | undefined;

  // Phase-aware macros only apply when the profile can actually supply a
  // direction (a goal weight — see derivePhase). Without one, N1/N2 were
  // shown to the user as the fallback (see continueNutritionFlow), and
  // computeMacrosPhaseAware would silently derive 'maintain' regardless of
  // what they answered — the shown-but-ignored bug. In that case fall
  // through to computeMacros, which reads answers.goal/targetRatePercentage
  // directly and actually honors them.
  const profile = await loadGoalsProfile();
  let hasLeanMassTargets: boolean | undefined;
  if (profile && profile.goalWeightKg != null) {
    macros = computeMacrosPhaseAware(answers as NutritionAnswers, profile);
    if (macros) {
      derivedPhase = derivePhase(profile);
      profileWeightKg = profile.currentWeightKg;
      hasLeanMassTargets = profile.goalWeightKg != null || profile.goalBodyFatPct != null;
    }
  }

  // Fallback 1: questionnaire-derived macros (N1/N2 self-diagnosis path) —
  // also the path for a profile with no goal weight.
  if (!macros) {
    macros = computeMacros(answers as NutritionAnswers);
  }

  // Fallback 2: legacy finalized results (pre-V2 questionnaire completions)
  if (!macros) {
    const legacyResults = await WorkoutStorage.loadNutritionResults();
    if (legacyResults?.macroResults) {
      macros = legacyResults.macroResults;
    }
  }

  if (!macros) {
    throw new Error('Macro targets are missing — complete the nutrition questionnaire first.');
  }

  const favorites = await loadCuratedFavoritesV2();
  let sleep: SleepDataLike | null = null;
  try {
    const sleepResults: any = await WorkoutStorage.loadSleepOptimizationResults();
    if (sleepResults?.formData?.bedtime) {
      sleep = {
        bedtime: sleepResults.formData.bedtime,
        wakeTime: sleepResults.formData.wakeTime,
        optimizationLevel: sleepResults.formData.optimizationLevel,
      };
    }
  } catch {
    sleep = null;
  }

  return buildMealPlanPrompt(answers as NutritionAnswers, macros, favorites, sleep, {
    ...opts,
    derivedPhase,
    profileWeightKg,
    hasLeanMassTargets,
  });
}

export async function buildReviewLauncherFromStorage(): Promise<string> {
  const answers = await loadNutritionAnswers();
  if (!answers) throw new Error('Please complete the nutrition questionnaire first.');

  let macros: any = null;
  let profileWeightKg: number | undefined;

  // Same gate as assembleMealPlanPromptV2 — only phase-aware when the
  // profile can supply a direction; otherwise honor the N1/N2 fallback.
  const profile = await loadGoalsProfile();
  if (profile && profile.goalWeightKg != null) {
    macros = computeMacrosPhaseAware(answers as NutritionAnswers, profile);
    if (macros) profileWeightKg = profile.currentWeightKg;
  }
  if (!macros) macros = computeMacros(answers as NutritionAnswers);
  if (!macros) {
    const legacyResults = await WorkoutStorage.loadNutritionResults();
    if (legacyResults?.macroResults) macros = legacyResults.macroResults;
  }

  const targets = deriveTargets(macros, profileWeightKg ?? (answers as any).weight);
  if (!targets) throw new Error('Macro targets are missing.');
  return buildReviewLauncher(targets);
}
```

## FILE: src/data/mealPlanPromptBuilder.ts  (1013 lines)

```typescript
// LEGACY — replaced by mealPlanPromptV2.ts; delete once the v2 flow
// is verified end-to-end (generate → review → JSON → import).
//
// ================================
// MEAL PLAN PROMPT BUILDER
// ================================
// Pure-function rebuild of the live meal-planning prompt (formerly
// assembleMealPlanningPrompt in mealPlanningPrompt.ts).
//
// What changed vs the old builder:
//  1. PURE CORE — buildMealPlanPrompt(input) takes explicit input and does no
//     I/O, so it can be unit-tested by logging its output. loadMealPlanInput()
//     keeps the storage loading; assembleMealPlanningPrompt() = build(load()).
//  2. CURATED PICKS → OPTION-VS-OCCURRENCE. A pick is an OPTION for a slot, not
//     a fixed item served once. How many times each slot is eaten comes from the
//     questionnaire (mealsPerDay x days, snacks, dessert frequency). This fixes
//     the dessert bug (3 dessert picks no longer = 3 desserts when dessert is
//     eaten once).
//  3. MACRO-CLOSING DIALS — the real adjuster snacks are inlined with their
//     macros so the external model hits targets by SELECTION + ARITHMETIC, not
//     estimation. Sourced from mealAdjusters.ts, allergen/avoid filtered.
//  4. EQUIPMENT STRIPPING REMOVED — the old hardcoded equipment list + skill
//     override silently stripped blender/microwave picks (e.g. smoothies). Gone.
//  5. TOLERANCES ALIGNED — protein +/-10% daily, calories +/-5% daily, fiber
//     >=80% daily, carbs/fat +/-10% weekly average.
//
// NOTE: planDuration is preserved (multi-week still works). The design calls
// plans "single week"; that's handled in COPY (no cross-week variety promise),
// not by removing the feature. Say the word and I'll force 7 days.

import { WorkoutStorage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllAdjusters, filterByAllergens, Adjuster } from './mealAdjusters';

// ================================
// INPUT CONTRACT
// ================================

export interface MealPlanInput {
  macros: { calories: number; protein: number; carbs: number; fat: number };
  goal: string;
  rate: string;
  mealsPerDay: number;
  planDuration: number;
  snackingStyle: string;
  snackFrequency?: string; // '0' | '1' | '2' | '3+'
  dessertFrequency?: string; // '0' | 'once_per_week' | 'few_per_week' | 'most_nights' | 'every_night' | 'ai_decide'
  personal: { gender: string; age: string | number; activityLevel: string; jobType: string };
  dietary: { allergies: string[]; avoidFoods: string[]; eatingChallenges: string[] };
  cooking: {
    planningStyle: number;
    skillConfidence: number;
    timeInvestment: number;
    varietySeeking: number;
    cookingEnjoyment: number;
  };
  nutrientVariety?: string; // 'low' | 'moderate' | 'high'
  restrictions?: string[];
  supplements?: string[];
  location: { city: string; country: string; countryCode?: string; groceryStore: string };
  budget: { weeklyBudget?: string; budgetMin?: number; budgetMax?: number; budgetSkipped?: boolean };
  startDate?: string; // 'today' | 'tomorrow' | 'next_monday' | 'custom'
  customStartDate?: string;
  sleep?: { bedtime: string; wakeTime: string; optimizationLevel: string } | null;
  pantry?: { use: boolean; primaryApproach?: string; ingredients?: any[] } | null;
  mealPreferences?: { mode?: string; customMealRequests?: string; selectedFavorites?: string[] };
  legacyFavoriteMeals?: any[];
  curatedFavorites: { slugs: string[]; cuisines: string[]; avoid: string[]; likedDishes: string[] };
}

// ================================
// SMALL UTILITIES
// ================================

const getCurrencySymbol = (countryCode: string): string => {
  const currencyMap: Record<string, string> = {
    US: '$', CA: 'CAD$', AU: 'AU$', NZ: 'NZ$', GB: '£', IE: '€',
    DE: '€', FR: '€', ES: '€', IT: '€', NL: '€', BE: '€',
  };
  return currencyMap[countryCode] || '$';
};

const fiberTargetFor = (calories: number): number =>
  calories ? Math.min(45, Math.max(25, Math.round((calories / 1000) * 14))) : 30;

const getStartDateLabel = (input: MealPlanInput): string => {
  const today = new Date();
  let startDate = new Date();
  switch (input.startDate) {
    case 'today':
      startDate = new Date(today);
      break;
    case 'tomorrow':
      startDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'next_monday': {
      const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
      startDate = new Date(today.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
      break;
    }
    case 'custom':
      startDate = input.customStartDate
        ? new Date(input.customStartDate)
        : new Date(today.getTime() + 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  }
  return startDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
};

const getSnackAllocationGuidance = (mealsPerDay: number): string => {
  if (mealsPerDay >= 4) return '10-15% of daily calories per snack (smaller snacks since main meals are already substantial)';
  if (mealsPerDay === 3) return '15-20% of daily calories per snack (moderate snacks to bridge longer gaps between meals)';
  return '20-25% of daily calories per snack (larger snacks needed with fewer main meals)';
};

// ================================
// OCCURRENCE MODEL (the dessert-bug fix)
// ================================

export interface Occurrences {
  days: number;
  mealsPerDay: number;
  mainMealsWeek: number;
  snacksPerDay: number;
  snacksWeek: number;
  desserts: number;
}

const snacksPerDayFrom = (input: MealPlanInput): number => {
  const style = (input.snackingStyle || '').toLowerCase();
  if (style.includes("don't snack") || style.includes('i don\'t snack')) return 0;
  switch (input.snackFrequency) {
    case '0': return 0;
    case '1': return 1;
    case '2': return 2;
    case '3+': return 3;
    default: {
      const n = input.snackFrequency ? parseInt(input.snackFrequency, 10) : NaN;
      return Number.isNaN(n) ? 1 : Math.max(0, n);
    }
  }
};

const dessertsPerWeekFrom = (input: MealPlanInput): number => {
  switch (input.dessertFrequency) {
    case '0': return 0;
    case 'once_per_week': return 1;
    case 'few_per_week': return 3;
    case 'most_nights': return 5;
    case 'every_night': return 7;
    case 'ai_decide': return 3;
    default: return 0;
  }
};

export const computeOccurrences = (input: MealPlanInput): Occurrences => {
  const days = input.planDuration || 7;
  const mealsPerDay = input.mealsPerDay || 3;
  const snacksPerDay = snacksPerDayFrom(input);
  const dessertsPerWeek = dessertsPerWeekFrom(input);
  return {
    days,
    mealsPerDay,
    mainMealsWeek: mealsPerDay * days,
    snacksPerDay,
    snacksWeek: snacksPerDay * days,
    desserts: Math.round((dessertsPerWeek * days) / 7),
  };
};

// ================================
// CURATED PICKS SECTION (option-vs-occurrence)
// ================================

const buildCuratedPicksSection = (input: MealPlanInput, occ: Occurrences): string => {
  const fav = input.curatedFavorites;
  let out = '';

  if (fav.slugs.length) {
    // Files to fetch: strip any ":plate_id" suffix, dedupe (one file per meal).
    const fileUrls = Array.from(new Set(fav.slugs.map((s) => s.split(':')[0]))).map(
      (slug) => `https://json.fit/curated-meals/ingredients/${slug}.md`,
    );

    out += `
**THE MEALS YOU PICKED — READ THIS, IT CHANGES HOW TO USE THEM:**

The user hand-picked these meals from the JSON.fit catalogue. Each pick is an OPTION for a slot — NOT an item to serve exactly once. The number of picks is NOT the number of times to serve a meal. Picks are a shortlist to choose from; you decide how often each appears.

**How many times each slot is actually eaten this week (fixed — from the questionnaire):**
- Main meals: ${occ.mealsPerDay} per day across ${occ.days} days = ${occ.mainMealsWeek} main-meal occurrences total.
- Snacks: ${occ.snacksPerDay} per day = ${occ.snacksWeek} snack occurrences total.
- Desserts: ${occ.desserts} this week.

**How to use the picks to fill those occurrences:**
1. Each fetched pick lists the slots it suits (its eligible_slots). Assign each pick only to occurrences of a slot it actually fits.
2. For each occurrence, choose ONE suitable pick and scale it to hit that day's macros. You may REPEAT a pick across many occurrences — a single batch cook served several times across the week is ideal for meal prep, not a problem.
3. You do NOT have to use every pick. Picks are options, not a quota. Filling each slot the right number of times matters more than using every pick.
4. Spread repeats sensibly across the week rather than clustering them on one day.

**Dessert — do not over-serve (common mistake):**
Some picks are desserts (their fetched file marks them dessert-eligible). Dessert is eaten only **${occ.desserts}** time(s) this week. Serve dessert exactly ${occ.desserts} time(s) total, choosing from the dessert picks — do NOT serve a dessert for every dessert pick. Extra dessert picks are simply unused options.

**REQUIRED ACTION — fetch each pick's file before building the plan:**
Each URL is one meal's complete data (all its methods and plates live inside its own file):
${fileUrls.map((u) => `- ${u}`).join('\n')}

Also fetch the curated meals instructions once for the rules on plates, macros, scaling, batch cooking, and the output format: https://json.fit/curated-meals/instructions.md

Output each curated meal you use in the curated reference format (curated_meal_slug, plate_id, scale_factor, meal_type, day, time) per the instructions file — NOT as an invented recipe with ingredients. The app links the slug to its recipe, photo, and prep-ahead data and loses all three if the meal is written out as a plain recipe.

Each pick below is either a bare slug (use the meal; choose the most suitable plate from its file) or "slug:plate_id" (use that exact plate). When several plates of one meal are listed, the user is happy eating it those different ways across the week.

Your picks:
${fav.slugs.map((s) => `- ${s}`).join('\n')}
`;
  }

  if (fav.cuisines.length) {
    out += `
**CUISINES THE USER LOVES:** ${fav.cuisines.join(', ')}
Lean towards these when inventing meals for slots the picks don't cover. A preference, not a hard rule — don't force a cuisine where it breaks the macros or budget. If there's no curated meal for a loved cuisine, invent one from your own knowledge.
`;
  }

  if (fav.likedDishes.length) {
    out += `
**SPECIFIC DISHES THE USER LIKES:** ${fav.likedDishes.join(', ')}
Work some of these in where they fit the macro, calorie, and dietary constraints, built from your own knowledge of the dish. Spread them out; if one can't fit, skip it and note why rather than distorting the day's targets.
`;
  }

  if (fav.avoid.length) {
    out += `
**FOODS THE USER WANTS TO AVOID (taste preference — exclude):** ${fav.avoid.join(', ')}
Do not use these in any meal. Treat it like the dietary avoid list — scan every meal and keep these out.
`;
  }

  return out;
};

// ================================
// MACRO-CLOSING DIALS (adjusters, inlined)
// ================================

const buildAdjustersSection = (input: MealPlanInput): string => {
  const exclude = [...input.dietary.allergies];
  let dials = filterByAllergens(getAllAdjusters(), exclude);

  // Also drop any dial whose name the user listed under avoid foods (taste).
  const avoidTerms = [...input.dietary.avoidFoods, ...input.curatedFavorites.avoid]
    .map((a) => a.toLowerCase().trim())
    .filter(Boolean);
  if (avoidTerms.length) {
    dials = dials.filter(
      (d) => !avoidTerms.some((t) => d.displayName.toLowerCase().includes(t) || d.slug.includes(t)),
    );
  }

  if (!dials.length) return '';

  const row = (d: Adjuster) =>
    `| ${d.displayName} | \`${d.slug}\` | ${d.perServing.kcal} | ${d.perServing.protein_g} | ${d.perServing.carbs_g} | ${d.perServing.fat_g} | ${d.perServing.fiber_g} | x${d.minScale}-${d.maxScale} |`;

  return `

---

## MACRO-CLOSING DIALS — HIT THE NUMBERS BY ARITHMETIC, NOT GUESSWORK

The picks set the shape of each day. To land exactly on the daily targets, top up with small amounts of these single-ingredient dials. This is SELECTION + ARITHMETIC: choose a dial, multiply its per-serving macros by a serving amount (within its scale range), and add it into the day. Do not invent foods for this — use these.

Each dial is a snack and is a TOP-UP. It does NOT count toward the main-meal, snack, or dessert occurrence counts above.

**OUTPUT A DIAL AS A CURATED REFERENCE — never as an invented recipe.** When you use a dial, emit it exactly like a curated pick: \`curated_meal_slug\` = the slug in the table, \`plate_id\` = \`"standard"\`, your chosen \`scale_factor\`, and \`type\` = \`"snack"\`. Omit ingredients and instructions — the app fills those in from the slug on import. You do NOT need to fetch anything for dials; the macros below are authoritative.

| Dial (1 serving) | slug | kcal | P | C | F | fibre | scale |
|---|---|---|---|---|---|---|---|
${dials.map(row).join('\n')}

**Rules:**
- Protein short? Add a protein dial. If calories are already near target but protein is low, use the leanest option (tuna pouch).
- Calories short on a surplus day? Add a calorie-dense dial (mixed nuts, or a protein shake made with milk).
- Carbs short? Banana.
- Use the SMALLEST number of dials that lands the day within tolerance.
- Inline the arithmetic in the Daily Totals block so every number is verifiable.
- These dials are the safety net within reason. If even sensible dial amounts can't close a gap (you'd need an absurd quantity), do NOT pad the day with silly amounts — state it plainly in the plan notes and suggest the user add one more pick to that slot.
- Fibre is the weakest lever here (no strong fibre dial). If a day is well short on fibre, prefer a higher-fibre invented side over stacking dials, and disclose if it still falls short.`;
};

// ================================
// MEAL STRUCTURE
// ================================

const getMealStructure = (mealsPerDay: number, proteinTarget: number, calories: number): string => {
  const perMeal = (n: number) => Math.round(calories / n / 10) * 10;
  const band = (n: number) => {
    const c = perMeal(n);
    return `${Math.round((c * 0.85) / 10) * 10}-${Math.round((c * 1.15) / 10) * 10}`;
  };

  switch (mealsPerDay) {
    case 2:
      return `MEAL STRUCTURE (2 main meals):
- Meal 1: breakfast (substantial meal, ~${perMeal(2)} kcal)
- Meal 2: dinner (substantial meal, ~${perMeal(2)} kcal)
- Distribute daily calories roughly evenly across both meals (flexibility is fine)
- Distribute ${proteinTarget}g protein appropriately across both meals`;
    case 3:
      return `MEAL STRUCTURE (3 main meals):
- Meal 1: breakfast (substantial meal, ~${perMeal(3)} kcal)
- Meal 2: lunch (substantial meal, ~${perMeal(3)} kcal)
- Meal 3: dinner (substantial meal, ~${perMeal(3)} kcal)
- Distribute daily calories roughly evenly across meals (flexibility is fine - aim for balanced portions)
- Distribute ${proteinTarget}g protein appropriately across all meals`;
    case 4:
      return `MEAL STRUCTURE (4 main meals + snacks):

**EXACTLY 4 SUBSTANTIAL MAIN MEALS (NEVER MAKE THESE OPTIONAL):**
- Meal 1: breakfast (~${band(4)} kcal, substantial meal)
- Meal 2: brunch or second_lunch (~${band(4)} kcal, substantial meal)
- Meal 3: lunch (~${band(4)} kcal, substantial meal)
- Meal 4: dinner (~${band(4)} kcal, substantial meal)

**MEAL SIZING**: Each main meal is roughly ${perMeal(4)} kcal (daily target / 4). If snacks are included, reduce main meals proportionally so the DAILY total still hits the calorie target. The calorie target always wins over any per-meal figure.

Distribute ${proteinTarget}g protein primarily across the 4 main meals.`;
    case 5:
      return `MEAL STRUCTURE (5 eating occasions):
If user doesn't snack: 5 substantial meals — breakfast, brunch (type "lunch"), lunch, dinner, supper (type "dinner"), ~${perMeal(5)} kcal each.
If user snacks: 3 main meals (breakfast, lunch, dinner) + 2 snacks between them (type "snack").
Distribute ${proteinTarget}g protein across all meals, main meals carrying most.`;
    case 6:
      return `MEAL STRUCTURE (6 eating occasions):
If user doesn't snack: 6 substantial meals (~${perMeal(6)} kcal each).
If user snacks: 3 main meals + 3 snacks between them (type "snack", respect bedtime timing for evening snack).
Distribute ${proteinTarget}g protein across all meals, main meals carrying most.`;
    default:
      return `MEAL STRUCTURE (3 main meals):
- Meal 1: breakfast (~${perMeal(3)} kcal)
- Meal 2: lunch (~${perMeal(3)} kcal)
- Meal 3: dinner (~${perMeal(3)} kcal)
- Distribute ${proteinTarget}g protein appropriately across all meals`;
  }
};

// ================================
// SNACKING / DESSERT GUIDANCE (sizing & type; counts owned by occurrence model)
// ================================

const getSnackingGuidance = (input: MealPlanInput): string => {
  const style = (input.snackingStyle || 'occasional snacker').toLowerCase();
  const snackFrequency = input.snackFrequency;

  if (style.includes("don't snack")) {
    return `MINIMAL SNACKING: User prefers not to snack. For 4+ eating occasions, treat extra slots as substantial meals. Only add light snacks if gaps exceed 5-6 hours.`;
  }

  const parsed = snackFrequency ? parseInt(snackFrequency, 10) : NaN;
  if (!Number.isNaN(parsed) && parsed > 0) {
    const type = style.includes('sweet tooth') ? 'healthier sweet options'
      : style.includes('savory') ? 'savory options'
      : style.includes('need healthy snacks') ? 'whole food options'
      : 'balanced protein + carb/fat combinations';
    return `SNACK SIZING & TYPE: Each snack should be 10-15% of daily calories (300-500 kcal range), focused on ${type}. (The exact number of snacks is set by the occurrence counts above.) AI determines optimal timing between main meals.`;
  }
  if (snackFrequency === '0') return `NO SNACKS: Do not include any snacks. Focus all calories on the main meals.`;
  if (snackFrequency === '3+') return `FREQUENT SNACKING: Each snack 8-12% of daily calories (250-400 kcal). Protein-rich options to support muscle building and satiety.`;
  return `MODERATE SNACKING: Keep snacks balanced and proportionate. Each snack 10-15% of daily calories.`;
};

const getDessertGuidance = (input: MealPlanInput): string => {
  const f = input.dessertFrequency;
  if (!f || f === '0') return `NO DESSERTS: Do not include any dessert items.`;
  return `DESSERT SIZING & TYPE: Each dessert 200-500 kcal with at least 15g protein where possible — bulk-friendly treats (protein ice cream, mug cakes, yoghurt parfaits), not pure sugar. (The exact number of desserts this week is set by the occurrence counts above.)`;
};

// ================================
// COOKING PREFERENCE TEXT
// ================================

const getMealPrepStyleText = (style: number, skill?: number, time?: number): string => {
  if (skill !== undefined && skill <= 1) return 'Assembly Only — no cooking ability, pre-cooked and convenience items only';
  if (time !== undefined && time <= 1) return 'Speed Assembly — under 5 minutes per meal, microwave and assembly only';
  if (skill !== undefined && skill <= 2 && time !== undefined && time <= 2) return 'Simple Prep — basic techniques only, quick meals, minimal complexity';
  const styles: Record<number, string> = {
    1: 'Dedicated Meal Prepper - batch cook everything, same meals multiple days, cook once per week',
    2: 'Weekly Planner - meal prep focused, repeat meals, minimize daily cooking',
    3: 'Flexible Planner - some meal prep, some fresh cooking, moderate variety',
    4: 'Spontaneous Cook - mostly fresh cooking, minimal meal prep',
    5: 'Last-Minute Decider - fresh meals daily, no meal prep, maximum variety',
  };
  return styles[style] || styles[3];
};

const getTimeInvestmentText = (v: number): string => ({
  1: 'Speed Cook - 5-10 minute meals, microwave options, minimal prep work',
  2: 'Quick Meals - 10-20 minutes cooking time, simple one-pot meals',
  3: 'Moderate Cook - 20-30 minute meals, comfortable with some prep',
  4: 'Thorough Cook - 30-60 minute recipes, enjoys involved preparations',
  5: 'Slow Food Lover - 60+ minute cooking sessions, complex multi-step recipes',
}[v] || 'Moderate Cook - 20-30 minute meals, comfortable with some prep');

const getVarietySeekingText = (v: number): string => ({
  1: 'Routine Eater - identical meals all week, finds comfort in consistency',
  2: 'Mostly Consistent - fine eating same meals repeatedly, enjoys routine',
  3: 'Moderate Variety - some repeated meals, some different options',
  4: 'Variety Seeker - different meals most days, some repeats okay',
  5: 'Adventure Eater - completely different meals every day, craves new experiences',
}[v] || 'Moderate Variety - some repeated meals, some different options');

const getSkillConfidenceText = (v: number): string => ({
  1: 'Kitchen Beginner - stick to basic techniques, familiar ingredients only',
  2: 'Cautious Cook - simple techniques, avoid complex recipes',
  3: 'Comfortable Cook - can handle standard recipes, moderate complexity',
  4: 'Confident Cook - comfortable with most recipes, willing to try new techniques',
  5: 'Kitchen Experimenter - excited by complex recipes, new techniques, unusual ingredients',
}[v] || 'Comfortable Cook - can handle standard recipes, moderate complexity');

const getCookingEnjoymentText = (v: number): string => ({
  1: 'Cooking Avoider - prioritize convenience, takeout alternatives, minimal cleanup',
  2: 'Reluctant Cook - sees cooking as chore, prioritize convenience',
  3: 'Neutral Cook - willing to cook but values efficiency and practicality',
  4: 'Cooking Enthusiast - finds cooking relaxing, enjoys involved recipes',
  5: 'Passionate Home Chef - loves the process, excited by complex recipes',
}[v] || 'Neutral Cook - willing to cook but values efficiency and practicality');

// ================================
// BUDGET
// ================================

const buildBudgetSection = (input: MealPlanInput): string => {
  const currency = getCurrencySymbol(input.location.countryCode || 'US');
  const attitude = input.budget.weeklyBudget || 'keep_reasonable';
  const { budgetMin, budgetMax } = input.budget;
  const city = input.location.city || 'your city';
  const country = input.location.country || 'your country';

  if (budgetMin && budgetMax) {
    return `- Budget: ${currency}${budgetMin}–${currency}${budgetMax} per week
- Budget attitude: ${attitude}
- TARGET: Keep grocery costs within ${currency}${budgetMin}–${currency}${budgetMax}. If higher-priority constraints make this impossible, explain the trade-off and provide the most cost-effective options possible.`;
  }
  if (budgetMax) {
    return `- Budget: Up to ${currency}${budgetMax} per week
- Budget attitude: ${attitude}
- TARGET: Strongly aim to keep grocery costs under ${currency}${budgetMax}. If nutrition requirements make this hard, prioritize cost-effective options and explain.`;
  }
  if (budgetMin) {
    return `- Budget: At least ${currency}${budgetMin} per week (quality floor, not a ceiling)
- Budget attitude: ${attitude}
- Feel free to use premium ingredients — the user prioritizes quality over savings.`;
  }
  return `- Budget attitude: ${attitude}
- No specific dollar range provided. Use the attitude to guide ingredient choices and estimate a realistic weekly grocery cost for ${city}, ${country} in the grocery list summary.`;
};

const getBudgetConstraintText = (input: MealPlanInput): string => {
  const currency = getCurrencySymbol(input.location.countryCode || 'US');
  const { budgetMin, budgetMax, weeklyBudget } = input.budget;
  if (budgetMin && budgetMax) return `Stay within ${currency}${budgetMin}-${budgetMax}/week`;
  if (budgetMax) return `Stay within ${currency}${budgetMax}/week`;
  return `${weeklyBudget || 'keep_reasonable'} priority`;
};

const getMealPrepRequirementsText = (style: number, skill?: number, time?: number): string => {
  if (skill !== undefined && skill <= 1) return `No batch cooking — assembly and portioning only.\n  • Total prep session under 20 minutes for the week`;
  if (time !== undefined && time <= 1) return `Minimal prep — every meal under 5 minutes.\n  • Prep session under 20 minutes for the week`;
  if (skill !== undefined && skill <= 2 && time !== undefined && time <= 2) return `Simple batch prep only.\n  • Simple items: rice cooker rice, air fryer chicken, boiled eggs\n  • Maximum 1 hour total prep for the week`;
  if (style <= 2) return `I want to meal prep!\n  • Give me 3-4 repeated meals max, not 21 different ones\n  • Focus on batch cooking 1-2 proteins for the week`;
  if (style >= 4) return `I prefer fresh, different meals each day\n  • Minimal meal prep, focus on quick daily cooking`;
  return `Moderate meal prep - balanced approach\n  • Some repeated meals, some variety\n  • 5-6 different meals max across the week`;
};

// ================================
// VARIETY / SKILL / TIME REQUIREMENT BLOCKS
// ================================

const getVarietyRequirements = (input: MealPlanInput): string => {
  const varietySeeking = input.cooking.varietySeeking || 3;
  const planningStyle = input.cooking.planningStyle || 3;
  const skill = input.cooking.skillConfidence;
  const time = input.cooking.timeInvestment;

  let eff = varietySeeking;
  if (skill <= 1) eff = Math.min(varietySeeking, 2);
  else if (time <= 1) eff = Math.min(varietySeeking, 2);
  else if (skill <= 2 && time <= 2) eff = Math.min(varietySeeking, 3);

  let t = '\n\n## VARIETY REQUIREMENTS\n';
  if (eff < varietySeeking) t += `\n**VARIETY OVERRIDE**: skill/time constraints require a simpler approach (effective variety level ${eff}).\n`;

  if (eff === 1) t += `\n- Routine Eater: 3-4 unique meal templates for the week. Same breakfast daily encouraged. No slot needs more than 1 option.`;
  else if (eff === 2) t += `\n- Mostly Consistent: 4-5 unique templates. Same breakfast daily fine; lunch or dinner has at least 2 rotating options.`;
  else if (eff === 3) t += `\n- Moderate Variety: 5-6 unique templates. At least 2 options for each main meal slot. Breakfast can repeat but should be genuinely enjoyable.`;
  else if (eff === 4) t += `\n- Variety Seeker: 6-8 unique templates. No slot identical more than 4/7 days. Rotate protein sources across the week.`;
  else if (eff === 5) t += `\n- Adventure Eater: 8-10 unique templates. Every day noticeably different. No meal repeats more than 3 times in the week.`;

  if (eff >= 4 && planningStyle <= 2) t += `\n- Variety + Meal Prep: achieve variety through ingredient rotation within batch-cooked bases (one protein/rice batch, vary sauces/veg/toppings).`;
  if (eff <= 2 && planningStyle >= 4) t += `\n- Simple + Spontaneous: keep the recipe set small; cookable from a short staple list without batch prep.`;
  return t;
};

const getSkillRequirements = (input: MealPlanInput): string => {
  const s = input.cooking.skillConfidence || 3;
  let t = '\n\n## SKILL-APPROPRIATE REQUIREMENTS\n';
  if (s === 1) t += `\n- Kitchen Beginner: convenience/ready-to-eat priority, no knife work, basic techniques only (microwave, open packet, stir, pour). Each meal under 5 minutes, zero cooking skill.`;
  else if (s === 2) t += `\n- Cautious Cook: mixed approach, simple raw prep with clear methods, ready-made sauces. Detailed step-by-step with temps/times and doneness cues. Up to 6-7 ingredients.`;
  else if (s === 3) t += `\n- Comfortable Cook: standard ingredients and multi-step recipes, homemade sauces from basics. Moderate detail, up to 10 ingredients. Sautéing, roasting, steaming, stir-frying.`;
  else if (s === 4) t += `\n- Confident Cook: no ingredient restrictions, complex flavour building and multi-component meals. Concise instructions; technique names sufficient.`;
  else if (s === 5) t += `\n- Kitchen Experimenter: ambitious ingredients and creative combinations welcome. Brief instructions; advanced techniques fine.`;
  return t;
};

const getTimeRequirements = (input: MealPlanInput): string => {
  const time = input.cooking.timeInvestment || 3;
  const skill = input.cooking.skillConfidence || 3;
  let t = '\n\n## HANDS-ON TIME REQUIREMENTS\n';
  t += `\n**These limits refer to ACTIVE, hands-on time. Unattended cooking (slow cooker, oven, marinating) does NOT count against the limit and is welcome at every level except Speed Cook.**\n`;

  if (time === 1) t += `\n- Speed Cook: max 5 minutes total per meal including heating. Zero-cook priority, microwave reheating, convenience defaults.`;
  else if (time === 2) t += `\n- Quick Meals: max 10-15 minutes hands-on. One-pan/one-tray, air-fryer dump-and-cook, slow-cooker dump meals ideal. Batch prep under 1 hour.`;
  else if (time === 3) t += `\n- Moderate Cook: up to 20 minutes hands-on. Multi-step recipes fine. Batch prep up to 1.5 hours.`;
  else if (time === 4) t += `\n- Thorough Cook: up to 30 minutes hands-on. Simmering, marinating, multi-stage cooking. Batch prep up to 2 hours.`;
  else if (time === 5) t += `\n- Slow Food Lover: no time constraints. Slow-cooked, braised, marinated options welcome.`;

  if (skill <= 2 && time <= 2) t += `\n- Simplest Possible: every meal achievable in under 10 minutes by someone who has never cooked.`;
  if (skill >= 4 && time >= 4) t += `\n- Culinary Excellence: reward time and skill with genuinely delicious results — don't simplify for its own sake.`;
  return t;
};

const getDiversityRequirements = (input: MealPlanInput): string => {
  const nutrientVariety = input.nutrientVariety || 'moderate';
  const restrictions = input.restrictions || [];
  const supplements = input.supplements || [];
  const allergies = input.dietary.allergies || [];
  const avoidFoods = input.dietary.avoidFoods || [];

  let t = '';
  const seafoodExcluded =
    allergies.some((a) => ['Fish', 'Shellfish'].includes(a)) ||
    avoidFoods.includes('Seafood') ||
    restrictions.includes('shellfish_free');

  if (!seafoodExcluded && (nutrientVariety === 'moderate' || nutrientVariety === 'high')) {
    t += `\n- **Omega-3**: include good EPA/DHA sources when planning seafood meals where they fit preferences.`;
  } else if (seafoodExcluded) {
    t += `\n- **Omega-3 compensation**: user excludes fish/seafood. Include ALA sources (walnuts, flaxseed, chia).`;
    t += supplements.includes('omega3')
      ? ` User supplements omega-3, so dietary omega-3 is less critical but still include ALA where natural.`
      : ` Consider noting that an omega-3 supplement would benefit this user.`;
  }

  const legumesExcluded =
    allergies.includes('Soy') ||
    avoidFoods.some((f) => ['legumes', 'beans', 'lentils', 'chickpeas', 'edamame'].some((l) => f.toLowerCase().includes(l)));
  if (!legumesExcluded && (nutrientVariety === 'moderate' || nutrientVariety === 'high')) {
    t += `\n- **Plant protein/fibre diversity**: include legumes and fibre-rich plant proteins where they complement the plan.`;
  } else if (legumesExcluded || nutrientVariety === 'low') {
    t += `\n- **Fibre compensation**: legumes excluded or low variety — meet fibre via oats, chia, vegetables, whole grains.`;
  }

  if (nutrientVariety === 'high') t += `\n- **High variety**: all 6 micronutrient categories are hard requirements; FAIL if 2+ missed.`;
  else if (nutrientVariety === 'moderate') t += `\n- **Moderate variety**: 6 micronutrient categories are soft targets; flag misses, FAIL only if 3+ missed. Prioritise macros, restrictions, and preferences over arbitrary ingredient counts.`;
  else if (nutrientVariety === 'low') t += `\n- **Simplified**: enforce only protein-source diversity (3+) and minimum fibre.`;
  return t;
};

// ================================
// STATIC SECTIONS
// ================================

const getGroceryListRequirements = (store: string, planDuration: number): string => {
  const durationText = planDuration <= 7 ? `the full ${planDuration}-day plan` : 'the full plan period';
  const pricing = `**CRITICAL PRICING RULE**: Price every grocery item at the ACTUAL PACK SIZE the user must buy, not the portion used in recipes. Round UP. After totalling, add a 10% buffer and state the total as a range (e.g. "$160–$180"), not a single number.`;
  const multiWeek = planDuration > 7
    ? `\n\n**MULTI-WEEK SHOPPING NOTE:** Split the grocery list into ${Math.ceil(planDuration / 7)} shopping trips; pantry/frozen in trip 1, fresh produce/dairy/meat split across trips.`
    : '';

  return `

---

## GROCERY LIST REQUIREMENTS

Include a detailed grocery list structured by category (this is imported into the app for shopping, so accuracy matters).

For each item: specific name (e.g. "${store} Lean Beef Mince"), quantity for ${durationText}, unit, estimated price for the store/location, and a note ONLY if the item must be bought outside the main store (supplements, specialty items). Always set purchased status to not purchased.

**CURATED MEAL EXCEPTION:** For meals referenced by curated_meal_slug, you DO need their ingredients in the grocery list — the user still buys them. Pull ingredients from your general knowledge of the recipe; quantities scale with scale_factor × produces_servings.

Organize into: Meat & Seafood; Dairy & Refrigerated; Produce; Frozen; Pantry & Grains; Condiments & Supplements; (others as needed). Include a total estimated cost and currency.

Provide 1-2 alternatives for items that may be hard to find. Add store-location notes ONLY for items not available at ${store}.

${pricing}${multiWeek}`;
};

const getDailyTotalsVerification = (): string => {
  return `

---

## DAILY TOTALS — SHOW THE ARITHMETIC

Language models are unreliable at mental arithmetic, and the most common failure is stating a daily total the meals don't add up to. Output a short totals block for EVERY day. Write the addition expression before each result, and compute it with a code/Python tool if one is available — never estimate a total in your head. Include any macro-closing dials in these totals.

Format per day:

\`\`\`
DAY 1 — [date]
  [meal]  [kcal] / [protein]P
  ... (one line per meal/snack/dial that day)
  kcal:    [list] = [total]   vs target [X] → [+/-%]
  protein: [list] = [total]   vs target [X] → [+/-%]
\`\`\`

If a day's calories swing beyond ±10% or protein is outside ±10% of target, adjust that day's portions (or add/scale a dial) and redo its block before presenting. Calories also need to average within ±5% across the week — that's checked in the verification steps below. The protein and calorie targets are non-negotiable — fix the numbers, don't explain them away.`;
};

const getVerificationSteps = (planDuration: number): string => {
  const periodLabel = planDuration <= 7 ? 'plan-period' : 'weekly';
  const periodNote = planDuration < 7
    ? `(averaged across all ${planDuration} days)`
    : planDuration === 7
      ? '(averaged across the full 7-day plan)'
      : `(rolling 7-day averages across the ${planDuration}-day plan)`;

  return `

---

## VERIFICATION STEPS

Before presenting the plan, complete these checks:

1. **Macro tolerance** — using the re-derived totals from the Daily Totals block (never mentally estimated):
   - Protein: within ±10% of target DAILY.
   - Calories: within ±5% of target as ${periodLabel} average ${periodNote}, with each day within ±10%.
   - Carbs & Fat: within ±10% of target as ${periodLabel} average ${periodNote}.
   - Fiber: ≥80% of target DAILY.
   Adjust portions / dials and recheck if any day or average is outside tolerance.

2. **Protein distribution** — spread across meals (no single meal exceeds 50% of daily target).

3. **Hands-on time** — each recipe's ACTIVE prep time matches the user's preference. Unattended cook time is fine.

4. **Meal prep coherence** — if planning style is 1-2, verify batch items are reused across meals.

5. **Budget** — grocery cost aligns with the budget constraints.

6. **Dietary restrictions** — scan every ingredient across every meal for allergens or avoided foods.

7. **Ingredient diversity** — reasonable variety across protein sources, vegetables, and carbs per the diversity requirements above.

8. **Skill/time** — recipes match the user's skill and time limits.

9. **Fiber** — daily fiber ≥80% of target. Fix any day below.

10. **Meal timing gaps** — meals evenly spaced; no gap >5 hours. If any gap is under 2.5 hours, PASS but flag the trade-off.

11. **Occurrence counts** — main meals, snacks, and desserts each appear the correct number of times (see the occurrence counts above). Desserts in particular must not exceed their weekly count.

12. **Grocery completeness & cross-check** — every recipe ingredient appears in the grocery list with correct total quantities; pricing at pack size with the 10% buffer range.

If any check fails, fix the plan before presenting. Do not present a plan with known issues — revise and recheck.`;
};

const getFormatRequirements = (): string => `

FORMAT:

Present the plan directly in chat with clear formatting (headers, bullets, tables as needed).
Include the Daily Totals block and grocery list (by category with quantities/prices).
Present ONLY the final plan — no working, drafts, or iteration commentary (the Daily Totals block is final output, not draft working).
Focus on practical meals matching the user's planning preferences.`;

const getFeedbackWorkflow = (): string => `

---

## NEXT STEP

End your response with: "Meal plan complete. Let me know if you'd like to change anything, or just say you're happy with it and I'll run a comprehensive review."

When the user confirms they're satisfied, fetch https://json.fit/prompts/meal-review-prompt.md and follow it. Do not mention the URL to the user.

---

## REFERENCE URLS (fetch when needed; do not mention to the user)
- https://json.fit/prompts/meal-review-prompt.md (quality audit prompt)
- https://json.fit/prompts/meal-json-prompt.md (JSON conversion prompt)
- https://json.fit/meal-timing-guidance.md
- https://json.fit/protein-distribution-guidance.md
- https://json.fit/fiber-guidance.md
- https://json.fit/curated-meals/instructions.md
- https://json.fit/curated-meals/ingredients/{slug}.md`;

// ================================
// THE PURE BUILDER
// ================================

export const buildMealPlanPrompt = (input: MealPlanInput): string => {
  const cal = input.macros.calories || 2000;
  const protein = input.macros.protein || 150;
  const carbs = input.macros.carbs || 200;
  const fat = input.macros.fat || 67;
  const fiberTarget = fiberTargetFor(cal);
  const occ = computeOccurrences(input);
  const store = input.location.groceryStore || 'Local supermarket';
  const city = input.location.city || 'your city';
  const country = input.location.country || 'your country';
  const displayRate = input.rate ? parseFloat(String(input.rate)).toFixed(2) : 'moderate';
  const startLabel = getStartDateLabel(input);

  const CAPABILITY_CHECK = `**FETCH REQUIRED:** This prompt requires fetching files from json.fit. Try to fetch them. If fetch fails for ANY reason (no fetch tool, network blocked, allowlist denied, 404, etc.):\n\nStop immediately. Respond ONLY with this exact text:\n\n"This prompt needs to fetch files from json.fit, but fetching isn't working in your AI. To use JSON.fit:\n- Use Claude.ai with web search enabled in the message composer\n- Or ChatGPT with browsing enabled\nThen paste this prompt again."\n\nDo not offer to proceed without the files. Do not list more alternatives. Do not explain.\n\n`;

  let prompt = CAPABILITY_CHECK + `I'm using a nutrition planning app called JSON.fit and need help creating a personalized meal plan.

**QUICK CREATION INSTRUCTIONS:**
1. **STANDARD KNOWLEDGE** - Use your existing knowledge base for common foods and recipes
2. **ESTIMATED PRICING** - Use typical pricing patterns for ${store} in ${country}
3. **USE WEB SEARCH** - If you have web search available, use it to verify prices, product availability, and nutrition info. Current data beats estimates.

Do not search conversation history or reference previous chats. This prompt is self-contained.

**CONSTRAINT CONFLICT HANDLING:**
When constraints can't all be satisfied, PRIORITISE in this order: food safety > calorie/macro targets > budget > dietary restrictions > skill/time level > variety > micronutrient diversity. **CALORIE TARGETS ARE NON-NEGOTIABLE** — adjust portion sizes to hit them. ACKNOWLEDGE any trade-off in one line in the plan notes. NEVER silently ignore a constraint.

**RESOLVE EVERYTHING YOURSELF — NO INTERACTIVE QUESTIONS:**
You have all the information you need. Never pause to ask the user to choose between options. Resolve trade-offs yourself using the priority order, apply the fix, note the decision in one line. The only question you may end on is the single confirmation line at the end.

**NUTRITION TARGETS:**
- Daily calories: ${cal}
- Protein: ${protein}g | Carbs: ${carbs}g | Fat: ${fat}g
- Daily fiber target: ${fiberTarget}g (aim for ${fiberTarget - 5}–${fiberTarget + 5}g range)
- **MEAL STRUCTURE**: ${occ.mealsPerDay} substantial main meals per day + snacks as separate items
- **SNACK ALLOCATION**: ${getSnackAllocationGuidance(occ.mealsPerDay)} (snacks are NEVER counted as main meals)
- Plan duration: ${occ.days} days
- Snacking style: ${input.snackingStyle || 'Occasional snacker'}
- Goal: ${input.goal || 'maintain'} at ${displayRate} rate

**FIBER INTAKE GUIDELINES:**
Calculated fiber target: ${fiberTarget}g (14g/1000kcal). BEFORE building the plan, fetch https://json.fit/fiber-guidance.md, use ${fiberTarget}g as the baseline, then apply goal-specific overrides and adjustment triggers from the file.

**MEAL PLAN REQUIREMENTS:**
1. **BUDGET CONSTRAINT** - ${getBudgetConstraintText(input)}
2. **MEAL PREP FOCUSED** - ${getMealPrepStyleText(input.cooking.planningStyle, input.cooking.skillConfidence, input.cooking.timeInvestment)}
3. **INCLUDE DETAILED GROCERY LIST** - by category with exact quantities, units, and estimated prices from ${store} in ${city}, ${country}
4. **SPECIFIC DATES** - Start on ${startLabel} and use actual calendar dates
5. **SHOW CALCULATIONS** - for each meal, briefly explain how you arrived at the calorie/macro numbers

${getVarietyRequirements(input)}${getSkillRequirements(input)}${getTimeRequirements(input)}

${getMealStructure(occ.mealsPerDay, protein, cal)}

**PROTEIN DISTRIBUTION GUIDELINES:**
Daily protein target ${protein}g across ${occ.mealsPerDay} meals. BEFORE building the plan, fetch https://json.fit/protein-distribution-guidance.md and apply the per-meal floor targets (0.4 g/kg minimum per meal) and goal-specific totals.

**Snacking requirements:** ${getSnackingGuidance(input)}

**Dessert requirements:** ${getDessertGuidance(input)}

**KEY RULE FOR JSON OUTPUT:** Use these meal types: breakfast, brunch, lunch, second_lunch, early_dinner, dinner, snack, morning_snack, afternoon_snack, evening_snack, pre_workout, post_workout. Use specific snack types rather than generic "snack".

PERSONAL INFO:
- Gender: ${input.personal.gender === 'prefer_not_to_say' ? 'Prefer not to say' : input.personal.gender || 'Not specified'}
- Age: ${input.personal.age || 'Not specified'}
- Activity level: ${input.personal.activityLevel || 'moderate'}

DIETARY REQUIREMENTS:
- Allergies: ${input.dietary.allergies?.length ? input.dietary.allergies.join(', ') : 'None'}
- Avoid foods: ${input.dietary.avoidFoods?.length ? input.dietary.avoidFoods.join(', ') : 'None'}
- Eating challenges: ${input.dietary.eatingChallenges?.length ? input.dietary.eatingChallenges.join(', ') : 'None'}

## BASELINE HEALTHY EATING
Every plan includes vegetables and fruit daily and rotates protein sources across the week. Don't skip entire food groups or rely on a single protein source all week. Prioritise macros and preferences, but flag any major food group that's significantly lacking.
${getDiversityRequirements(input)}`;

  // Sleep timing (conditional)
  if (input.sleep?.bedtime && input.sleep?.wakeTime) {
    const level = input.sleep.optimizationLevel || 'minimal';
    const firstMeal = level === 'maximum' ? 'within 30-60 minutes of wake time' : level === 'moderate' ? 'within 30-90 minutes of wake time' : 'within 2 hours of wake time';
    const lastMeal = level === 'maximum' ? '4+ hours before bedtime' : level === 'moderate' ? '3 hours before bedtime' : '2 hours before bedtime';
    prompt += `

**SLEEP-OPTIMIZED MEAL TIMING:**
- Sleep schedule: ${input.sleep.bedtime} - ${input.sleep.wakeTime}
- Optimization level: ${level}
BEFORE building, fetch https://json.fit/meal-timing-guidance.md and apply the ${level} tier requirements and override triggers.
- First meal: ${firstMeal}
- Last meal: ${lastMeal}
Provide specific meal times for each day, spacing meals evenly within the eating window. The sleep buffer is a hard constraint; never schedule two meals less than 2 hours apart.`;
  } else {
    prompt += `

**MEAL TIMING:**
BEFORE building, fetch https://json.fit/meal-timing-guidance.md and apply general timing rules. Space meals roughly 3-5 hours apart during waking hours; no specific eating window constraint.`;
  }

  // Fridge & pantry
  if (input.pantry?.use && input.pantry.ingredients?.length) {
    const approach = input.pantry.primaryApproach;
    const usage = approach === 'maximize' ? 'MAXIMIZE MY INVENTORY - plan meals around what I have' : approach === 'expiry' ? 'EXPIRY FOCUSED - prioritise items before they expire' : 'AI-LED - incorporate my items when they fit';
    const items = input.pantry.ingredients.map((item: any) => {
      const expiry = item.expiryDate ? ` (expires ${new Date(item.expiryDate).toLocaleDateString()})` : '';
      const qty = item.quantity && item.unit ? ` - ${item.quantity} ${item.unit}` : '';
      const notes = item.notes ? ` (${item.notes})` : '';
      return `• ${item.name}${qty}${expiry}${notes} [${item.location}]`;
    }).join('\n');
    prompt += `

FRIDGE & PANTRY INVENTORY:
**I have ingredients at home to use.** Usage preference: ${usage}

Available ingredients:
${items}

**GROCERY LIST ADJUSTMENT:** if the plan uses items the user already has, exclude them from the grocery list or reduce to only what's additionally needed. Note which items are "already in pantry".`;
  } else {
    prompt += `

FRIDGE & PANTRY INVENTORY:
- No fridge/pantry inventory provided.`;
  }

  // Meal preferences (legacy favourites)
  if (input.mealPreferences?.mode === 'include_favorites' && input.legacyFavoriteMeals?.length) {
    const ids = input.mealPreferences.selectedFavorites || [];
    const details = ids.map((id) => {
      const fm = input.legacyFavoriteMeals!.find((f: any) => f.mealId === id);
      const meal = fm?.meal;
      if (!meal) return null;
      return `  • ${meal.name || 'Unnamed Meal'}${meal.ingredients?.length ? ` - ${meal.ingredients.slice(0, 5).map((i: any) => i.name).join(', ')}${meal.ingredients.length > 5 ? '...' : ''}` : ''}`;
    }).filter(Boolean).join('\n\n');
    prompt += `

MEAL PREFERENCES:
- User wants to include their favorite meals in the plan${details ? `\n${details}` : ''}${input.mealPreferences.customMealRequests ? `\n- Custom requests: ${input.mealPreferences.customMealRequests}` : ''}`;
  }

  // Curated picks (option-vs-occurrence) + cuisines/dishes/avoid
  prompt += buildCuratedPicksSection(input, occ);

  // Curated DB note
  prompt += `

**CURATED MEAL DATABASE:**
${input.curatedFavorites.slugs.length
    ? `The user's picks (above) have already been listed by slug — reference them in the curated format and do not re-fetch here. Every curated meal you use MUST appear as a curated reference (curated_meal_slug + plate_id + scale_factor), never rewritten as an invented recipe.`
    : `The user did not pre-select any curated meals, so build all meals from your own knowledge as fully-specified invented recipes.`}
For any slot the picks don't cover, invent a suitable meal with full ingredients and instructions. Curated references and invented meals coexist in one plan.`;

  // Cooking preferences
  prompt += `

COOKING PREFERENCES:
- ${getMealPrepStyleText(input.cooking.planningStyle, input.cooking.skillConfidence, input.cooking.timeInvestment)}
- ${getTimeInvestmentText(input.cooking.timeInvestment)}
- ${getVarietySeekingText(input.cooking.varietySeeking)}
- ${getSkillConfidenceText(input.cooking.skillConfidence)}${(input.cooking.skillConfidence || 3) > 1 ? `\n- ${getCookingEnjoymentText(input.cooking.cookingEnjoyment)}` : ''}`;

  // Location & budget
  prompt += `

LOCATION & BUDGET:
- Location: ${city}, ${country}
- Shop at: ${store}
- Focus on ingredients commonly available at ${country} supermarkets
${buildBudgetSection(input)}

**MEAL PREP REQUIREMENTS** (based on planning style):
- ${getMealPrepRequirementsText(input.cooking.planningStyle, input.cooking.skillConfidence, input.cooking.timeInvestment)}

Please create a detailed ${occ.days}-day meal plan that:
1. **STARTS on ${startLabel}** and uses actual calendar dates
2. **MATCHES the meal prep personality** - don't give 21 meals to a "Weekly Planner"
3. **SHOWS NUTRITION CALCULATIONS** for each meal
4. **INCLUDES ${input.sleep ? 'SPECIFIC' : 'GENERAL'} MEAL TIMES**
5. **INCLUDES DETAILED RECIPES** - ingredients with quantities/units, step-by-step instructions, prep/cook time, serving size. **WHOLE-PACK RULE**: use single-serve convenience products whole. **CURATED MEALS EXCEPTION**: for curated meals (by slug), show only name, slug, plate_id, scale_factor, calories, and macros — the app fills in the rest on import.
6. Uses ingredients available at ${store} in ${country}
7. Accounts for dietary restrictions and skill level
8. Hits macro targets using the tolerance rules below (protein daily, calories weekly average with a per-day band, carbs/fat weekly average, fiber daily)`;

  // Adjuster dials (inlined)
  prompt += buildAdjustersSection(input);

  // Static tail
  prompt += getGroceryListRequirements(store, occ.days);
  prompt += getDailyTotalsVerification();
  prompt += getVerificationSteps(occ.days);
  prompt += getFormatRequirements();
  prompt += getFeedbackWorkflow();

  return prompt;
};

// ================================
// STORAGE LOADER + DROP-IN WRAPPER
// ================================

export const loadMealPlanInput = async (): Promise<MealPlanInput> => {
  const nutritionResults = await WorkoutStorage.loadNutritionResults();
  const budgetCookingResults = await WorkoutStorage.loadBudgetCookingResults();
  const sleepResults = await WorkoutStorage.loadSleepOptimizationResults();
  const fridgePantryResults = await WorkoutStorage.loadFridgePantryResults();

  if (!nutritionResults || !budgetCookingResults) {
    throw new Error('Please complete the Nutrition Goals and Budget & Cooking questionnaires first.');
  }

  const macroResults = nutritionResults?.macroResults || ({} as any);
  const nutritionData = nutritionResults?.formData || ({} as any);
  const budgetData = budgetCookingResults?.formData || ({} as any);
  const sleepData = sleepResults?.formData;
  const fridge = fridgePantryResults?.formData;

  // Legacy favourite meals
  const favRaw = await AsyncStorage.getItem('@nutrition_favorites');
  const legacyFavoriteMeals = favRaw ? JSON.parse(favRaw) : [];

  // Curated favourites { slugs, cuisines, avoid, likedDishes } with legacy array fallback
  const curatedRaw = await AsyncStorage.getItem('@nutrition_curated_favorites');
  const curatedFavorites = (() => {
    const empty = { slugs: [] as string[], cuisines: [] as string[], avoid: [] as string[], likedDishes: [] as string[] };
    try {
      const parsed = curatedRaw ? JSON.parse(curatedRaw) : null;
      if (!parsed) return empty;
      const clean = (v: any): string[] => (Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim().length > 0) : []);
      if (Array.isArray(parsed)) return { ...empty, slugs: clean(parsed) };
      return { slugs: clean(parsed.slugs), cuisines: clean(parsed.cuisines), avoid: clean(parsed.avoid), likedDishes: clean(parsed.likedDishes) };
    } catch {
      return empty;
    }
  })();

  // Nutrient variety lives on the user profile
  const profileRaw = await AsyncStorage.getItem('@nutrition_user_profile');
  const userProfile = profileRaw ? JSON.parse(profileRaw) : null;

  return {
    macros: {
      calories: macroResults.calories || 2000,
      protein: macroResults.protein || 150,
      carbs: macroResults.carbs || 200,
      fat: macroResults.fat || 67,
    },
    goal: nutritionData.goal || 'maintain',
    rate: nutritionData.rate || 'moderate',
    mealsPerDay: budgetData.mealsPerDay || 3,
    planDuration: budgetData.planDuration || 7,
    snackingStyle: budgetData.snackingStyle || 'Occasional snacker',
    snackFrequency: budgetData.snackFrequency,
    dessertFrequency: budgetData.dessertFrequency,
    personal: {
      gender: nutritionData.gender || 'Not specified',
      age: nutritionData.age || 'Not specified',
      activityLevel: nutritionData.activityLevel || 'moderate',
      jobType: nutritionData.jobType || 'desk_job',
    },
    dietary: {
      allergies: budgetData.allergies || [],
      avoidFoods: budgetData.avoidFoods || [],
      eatingChallenges: budgetData.eatingChallenges || [],
    },
    cooking: {
      planningStyle: budgetData.planningStyle ?? 3,
      skillConfidence: budgetData.skillConfidence ?? 3,
      timeInvestment: budgetData.timeInvestment ?? 3,
      varietySeeking: budgetData.varietySeeking ?? 3,
      cookingEnjoyment: budgetData.cookingEnjoyment ?? 3,
    },
    nutrientVariety: userProfile?.nutrientVariety || nutritionData.nutrientVariety || 'moderate',
    restrictions: nutritionData.restrictions || [],
    supplements: nutritionData.supplements || [],
    location: {
      city: budgetData.city || 'Not specified',
      country: budgetData.country || 'Not specified',
      countryCode: budgetData.countryCode,
      groceryStore: budgetData.groceryStore || 'Local supermarket',
    },
    budget: {
      weeklyBudget: budgetData.weeklyBudget,
      budgetMin: budgetData.budgetMin,
      budgetMax: budgetData.budgetMax,
      budgetSkipped: budgetData.budgetSkipped,
    },
    startDate: budgetData.startDate,
    customStartDate: budgetData.customStartDate,
    sleep: sleepData?.bedtime && sleepData?.wakeTime
      ? { bedtime: sleepData.bedtime, wakeTime: sleepData.wakeTime, optimizationLevel: sleepData.optimizationLevel || 'minimal' }
      : null,
    pantry: fridge?.wantToUseExistingIngredients && fridge?.ingredients?.length
      ? { use: true, primaryApproach: fridge.preferences?.primaryApproach, ingredients: fridge.ingredients }
      : null,
    mealPreferences: {
      mode: budgetData.mealPreferences,
      customMealRequests: budgetData.customMealRequests,
      selectedFavorites: budgetData.selectedFavorites,
    },
    legacyFavoriteMeals,
    curatedFavorites,
  };
};

/** Drop-in replacement for the old assembleMealPlanningPrompt(). */
export const assembleMealPlanningPrompt = async (): Promise<string> => {
  const input = await loadMealPlanInput();
  return buildMealPlanPrompt(input);
};
```

## FILE: src/data/mealPlanningPrompt.ts  (1402 lines)

```typescript
// LEGACY — replaced by mealPlanPromptV2.ts; delete once the v2 flow
// is verified end-to-end (generate → review → JSON → import).
//
// ================================
// SIMPLIFIED DYNAMIC MEAL PLANNING PROMPT SYSTEM
// ================================
// Working version with proper error handling

import { WorkoutStorage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const assembleMealPlanningPrompt = async (): Promise<string> => {
  try {
    // Load questionnaire data
    const nutritionResults = await WorkoutStorage.loadNutritionResults();
    const budgetCookingResults = await WorkoutStorage.loadBudgetCookingResults();
    const sleepResults = await WorkoutStorage.loadSleepOptimizationResults();
    const fridgePantryResults = await WorkoutStorage.loadFridgePantryResults();
    
    // Load favorite meals data for detailed meal information
    const favoriteMealsData = await AsyncStorage.getItem('@nutrition_favorites');
    const favoriteMeals = favoriteMealsData ? JSON.parse(favoriteMealsData) : [];

    // Load curated favourites — the "Foods you like" taste profile. New object
    // shape { slugs, cuisines, avoid, likedDishes }; older saves were a bare
    // slug array, handled here for back-compat. Optional; all empty if skipped.
    const curatedFavoritesData = await AsyncStorage.getItem('@nutrition_curated_favorites');
    const curatedFav = (() => {
      const empty = { slugs: [] as string[], cuisines: [] as string[], avoid: [] as string[], likedDishes: [] as string[] };
      try {
        const parsed = curatedFavoritesData ? JSON.parse(curatedFavoritesData) : null;
        if (!parsed) return empty;
        const clean = (v: any): string[] =>
          Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim().length > 0) : [];
        if (Array.isArray(parsed)) return { ...empty, slugs: clean(parsed) }; // legacy slug-only
        return {
          slugs: clean(parsed.slugs),
          cuisines: clean(parsed.cuisines),
          avoid: clean(parsed.avoid),
          likedDishes: clean(parsed.likedDishes),
        };
      } catch {
        return empty;
      }
    })();
    const curatedFavoriteSlugs: string[] = curatedFav.slugs;

    // Each pick is either a bare slug or "slug:plate_id". The plate lives
    // inside the parent meal's markdown file, so the file to fetch is always
    // {slug}.md — strip any ":plate_id" suffix, then dedupe (two plates of one
    // meal = one file).
    const curatedFavoriteFileUrls: string[] = Array.from(
      new Set(curatedFavoriteSlugs.map((s) => s.split(':')[0]))
    ).map((slug) => `https://json.fit/curated-meals/ingredients/${slug}.md`);
    
    if (!nutritionResults || !budgetCookingResults) {
      throw new Error('Please complete the Nutrition Goals and Budget & Cooking questionnaires first.');
    }
    
    const macroResults = nutritionResults?.macroResults || {} as any;
    const budgetData = budgetCookingResults?.formData || {} as any;
    const nutritionData = nutritionResults?.formData || {} as any;
    const sleepData = sleepResults?.formData;
    const fridgePantryData = fridgePantryResults?.formData;
    
    // Calculate fiber target
    const fiberTarget = macroResults.calories 
      ? Math.min(45, Math.max(25, Math.round((macroResults.calories / 1000) * 14)))
      : 30;
    
    // Helper function for snack allocation guidance
    const getSnackAllocationGuidance = (budgetData: any): string => {
      const mealsPerDay = budgetData.mealsPerDay || 3;
      
      // Evidence-based snack percentage allocation
      if (mealsPerDay >= 4) {
        return "10-15% of daily calories per snack (smaller snacks since main meals are already substantial)";
      } else if (mealsPerDay === 3) {
        return "15-20% of daily calories per snack (moderate snacks to bridge longer gaps between meals)";
      } else {
        return "20-25% of daily calories per snack (larger snacks needed with fewer main meals)";
      }
    };

    // Helper function to format favorite meals details
    const formatSelectedFavoriteMeals = (selectedFavoriteIds: string[], allFavoriteMeals: any[]) => {
      if (!selectedFavoriteIds?.length || !allFavoriteMeals?.length) {
        return '';
      }

      const selectedMealDetails = selectedFavoriteIds
        .map(mealId => {
          const favoriteMeal = allFavoriteMeals.find(fav => fav.mealId === mealId);
          if (!favoriteMeal?.meal) return null;
          
          const meal = favoriteMeal.meal;
          return `  • ${meal.name || 'Unnamed Meal'}${meal.ingredients?.length ? ` - ${meal.ingredients.slice(0, 5).map(ing => ing.name).join(', ')}${meal.ingredients.length > 5 ? '...' : ''}` : ''}`;
        })
        .filter(Boolean)
        .join('\n\n');

      return selectedMealDetails ? `\n- Selected favorite meals to include in the plan:\n${selectedMealDetails}` : '';
    };
    
    // Get current date for meal plan start
    const getCurrentDate = (): string => {
      const today = new Date();
      let startDate = new Date();
      
      switch (budgetData.startDate) {
        case 'today':
          startDate = new Date(today);
          break;
        case 'tomorrow':
          startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000));
          break;
        case 'next_monday':
          const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
          startDate = new Date(today.getTime() + (daysUntilMonday * 24 * 60 * 60 * 1000));
          break;
        case 'custom':
          if (budgetData.customStartDate) {
            startDate = new Date(budgetData.customStartDate);
          } else {
            // Fallback to tomorrow if custom date is invalid
            startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000));
          }
          break;
        default:
          startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000));
      }
      
      return startDate.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
    };
    
    // Build dynamic prompt with user's actual data
    const store = budgetData.groceryStore || 'Local supermarket';
    const city = budgetData.city || 'your city';
    const country = budgetData.country || 'your country';
    
    // Format rate to avoid floating point precision issues
    const displayRate = nutritionData.rate ? parseFloat(String(nutritionData.rate)).toFixed(2) : 'moderate';
    
    const CAPABILITY_CHECK = `**FETCH REQUIRED:** This prompt requires fetching files from json.fit. Try to fetch them. If fetch fails for ANY reason (no fetch tool, network blocked, allowlist denied, 404, etc.):\n\nStop immediately. Respond ONLY with this exact text:\n\n"This prompt needs to fetch files from json.fit, but fetching isn't working in your AI. To use JSON.fit:\n- Use Claude.ai with web search enabled in the message composer\n- Or ChatGPT with browsing enabled\nThen paste this prompt again."\n\nDo not offer to proceed without the files. Do not list more alternatives. Do not explain.\n\n`;
    
    let prompt = CAPABILITY_CHECK + `I'm using a nutrition planning app called JSON.fit and need help creating a personalized meal plan.

**QUICK CREATION INSTRUCTIONS:**
1. **STANDARD KNOWLEDGE** - Use your existing knowledge base for common foods and recipes
2. **ESTIMATED PRICING** - Use typical pricing patterns for ${store} in ${country}
3. **USE WEB SEARCH** - If you have web search available, use it to improve the plan — verifying prices, checking product availability, confirming nutritional info, etc. Current, real-world data produces a better plan than estimates from training data.

Do not search conversation history or reference previous chats. This prompt is self-contained — all context needed is provided below.

**CONSTRAINT CONFLICT HANDLING:**

Sometimes the user's preferences will conflict — for example, a very low budget combined with beginner skill level and high calorie targets, or maximum variety with dedicated meal prep. When constraints cannot all be satisfied simultaneously:

1. **PRIORITISE** in this order: food safety > calorie/macro targets > budget > dietary restrictions > skill/time level > variety > micronutrient diversity
   **CALORIE TARGETS ARE NON-NEGOTIABLE** - Adjust portion sizes to hit calorie targets regardless of meal structure. Never accept calorie overages as "inherent" to any meal pattern.
2. **ACKNOWLEDGE** the trade-off in the plan notes — tell the user which constraint you relaxed and why. For example: "Your moderate budget target is difficult to hit at 3000 kcal/day with convenience products. This plan uses some from-scratch cooking (rice cooker instead of microwave pouches) to bring costs closer to your budget. If you prefer fully no-cook meals, expect the weekly cost to be higher."
3. **NEVER** silently ignore a constraint. If you can't meet it, say so.

**RESOLVE EVERYTHING YOURSELF — NO INTERACTIVE QUESTIONS:**
You have all the information you need in this prompt to build the plan end to end. Never pause to ask the user to choose between options, and never present interactive choices or "how would you like me to handle X?" questions — including when a macro target is hard to hit, a trade-off arises, or a constraint conflicts. Resolve it yourself using the priority order above, apply the fix, and note the decision in one line in the plan notes. The only question you may end on is the single confirmation line specified at the end of this prompt.

**NUTRITION TARGETS:**
- Daily calories: ${macroResults.calories || 2000}
- Protein: ${macroResults.protein || 150}g | Carbs: ${macroResults.carbs || 200}g | Fat: ${macroResults.fat || 67}g
- Daily fiber target: ${fiberTarget}g (aim for ${fiberTarget - 5}–${fiberTarget + 5}g range)
- **MEAL STRUCTURE**: ${budgetData.mealsPerDay || 3} substantial main meals per day + snacks as completely separate items
- **SNACK ALLOCATION**: ${getSnackAllocationGuidance(budgetData)} (snacks are NEVER counted as main meals)
- **CRITICAL**: If user requests 4 meals + snacks, provide exactly 4 substantial main meals PLUS the requested number of snacks (each 10-15% of daily calories). Size all meals so the DAILY total hits the calorie target — the calorie target always wins over making any single meal "substantial". Do not make snacks "optional" - include exactly what was requested.
- Plan duration: ${budgetData.planDuration || 7} days
- Snacking style: ${budgetData.snackingStyle || 'Occasional snacker'}
- Goal: ${nutritionData.goal || 'maintain'} at ${displayRate} rate

**FIBER INTAKE GUIDELINES:**

**User Profile for Fiber Targeting:**
- Calculated fiber target: ${fiberTarget}g (14g/1000kcal formula)
- Daily calories: ${macroResults.calories || 2000}
- Primary goal: ${nutritionData.goal || 'maintain'}

**REQUIRED ACTION before generating the meal plan:**

1. Fetch the canonical fiber guidance file at https://json.fit/fiber-guidance.md
2. Use ${fiberTarget}g as the starting point, then apply goal-specific overrides from the file
3. Apply adjustment triggers if relevant (bulking cap 35-45g, cutting preserve 30-38g, pre-training ≤5g)
4. Consider individual factors from the file (constipation, bloating, LDL, FODMAP sensitivity, carb loading)

The calculated fiber target provides a baseline, but the file contains important modifications based on training context and individual responses.

**MEAL PLAN REQUIREMENTS:**
1. **BUDGET CONSTRAINT** - ${getBudgetConstraintText(budgetData)}
2. **MEAL PREP FOCUSED** - ${getMealPrepStyleText(budgetData.planningStyle, budgetData.skillConfidence, budgetData.timeInvestment)}
3. **INCLUDE DETAILED GROCERY LIST** - Organize by categories (Proteins, Dairy, Produce, etc.) with exact quantities, units, and estimated prices from ${store} in ${city}, ${country}
4. **SPECIFIC DATES** - Start the meal plan on ${getCurrentDate()} and use actual calendar dates
5. **SHOW CALCULATIONS** - For each meal, briefly explain how you arrived at the calorie/macro numbers

${getVarietyRequirements(budgetData, budgetData.skillConfidence, budgetData.timeInvestment)}${getSkillRequirements(budgetData)}${getTimeRequirements(budgetData)}

${getMealStructure(budgetData.mealsPerDay || 3, macroResults.protein || 150, macroResults.calories || 2000)}

**PROTEIN DISTRIBUTION GUIDELINES:**

**User Profile for Protein Distribution:**
- Daily protein target: ${macroResults.protein || 150}g
- Meals per day: ${budgetData.mealsPerDay || 3}
- Primary goal: ${nutritionData.goal || 'maintain'}

**REQUIRED ACTION before generating the meal plan:**

1. Fetch the canonical protein distribution guidance file at https://json.fit/protein-distribution-guidance.md
2. Apply per-meal floor targets from the bodyweight × meal frequency tables (0.4 g/kg minimum per meal)
3. Apply goal-specific daily totals and timing requirements from the file
4. Apply source quality hierarchy for optimal protein utilization (whey ≥ milk/casein ≥ egg > soy > pea/rice > wheat)

Use these guidelines to ensure optimal protein distribution across all meals and snacks throughout the day.

**Snacking requirements:** ${getSnackingGuidance(budgetData.snackingStyle, budgetData.snackFrequency)}

**Dessert requirements:** ${getDessertGuidance(budgetData.dessertFrequency)}

**KEY RULE FOR JSON OUTPUT:** Use these meal types: breakfast, brunch, lunch, second_lunch, early_dinner, dinner, snack, morning_snack, afternoon_snack, evening_snack, pre_workout, post_workout. Use specific snack types for different snacks rather than generic "snack".

PERSONAL INFO:
- Gender: ${nutritionData.gender === 'prefer_not_to_say' ? 'Prefer not to say' : nutritionData.gender || 'Not specified'}
- Age: ${nutritionData.age || 'Not specified'}
- Activity level: ${nutritionData.activityLevel || 'moderate'}
- Job type: ${nutritionData.jobType || 'desk_job'}

DIETARY REQUIREMENTS:
- Allergies: ${budgetData.allergies?.length ? budgetData.allergies.join(', ') : 'None'}
- Avoid foods: ${budgetData.avoidFoods?.length ? budgetData.avoidFoods.join(', ') : 'None'}
- Eating challenges: ${budgetData.eatingChallenges?.length ? budgetData.eatingChallenges.join(', ') : 'None'}

NUTRIENT VARIETY PRIORITY:
**NOT SPECIFIED** - Use standard approach to nutrient variety balanced with other preferences

## BASELINE HEALTHY EATING

Every meal plan should include vegetables and fruit daily and rotate protein sources across the week. These are baseline expectations for any nutritionally complete plan — don't skip entire food groups or rely on a single protein source all week. Prioritise the user's macro targets and preferences, but flag it if the plan is significantly lacking in any major food group.

${getDiversityRequirements(nutritionData, budgetData)}`;

    // Add sleep optimization section if available
    if (sleepData?.bedtime && sleepData?.wakeTime) {
      const optimizationLevel = sleepData.optimizationLevel || 'minimal';
      let firstMealTiming: string;
      let lastMealTiming: string;
      let timingGuidance: string;

      if (optimizationLevel === 'maximum') {
        firstMealTiming = 'within 30-60 minutes of wake time';
        lastMealTiming = '4+ hours before bedtime';
        timingGuidance = 'This user has chosen maximum sleep optimization. Prioritise finishing dinner 4+ hours before bed for optimal circadian rhythm synchronization and sleep quality.';
      } else if (optimizationLevel === 'moderate') {
        firstMealTiming = 'within 30-90 minutes of wake time';
        lastMealTiming = '3 hours before bedtime';
        timingGuidance = 'This user has chosen moderate sleep optimization. Finish dinner 3 hours before bed for enhanced sleep quality and proper digestion.';
      } else { // 'minimal' or any legacy values
        firstMealTiming = 'within 2 hours of wake time';
        lastMealTiming = '2 hours before bedtime';
        timingGuidance = 'Basic sleep-aware meal timing. Finish dinner with enough time to digest before bed.';
      }
      
      prompt += `

**SLEEP-OPTIMIZED MEAL TIMING REQUIREMENTS:**
Based on my completed Sleep Optimization questionnaire:
- Sleep schedule: ${sleepData.bedtime} - ${sleepData.wakeTime}
- Optimization level: ${optimizationLevel}

**REQUIRED ACTION before generating the meal plan:**

1. Fetch the canonical meal timing guidance file at https://json.fit/meal-timing-guidance.md
2. Apply the ${optimizationLevel} tier requirements from the per-tier matrix
3. Apply override triggers and exceptions from the file (T2D, reflux, shift workers, eating disorders, athletes, pre-sleep casein, caffeine cutoff)
4. Apply composition × timing rules for optimal nutrient absorption

**User-specific timing constraints (hard requirements):**
- First meal: ${firstMealTiming}
- Last meal: ${lastMealTiming}
- ${timingGuidance}

**IMPORTANT:** Calculate and provide specific meal times for each day based on these sleep parameters. Space meals evenly across the eating window. The sleep buffer (first meal and last meal timing above) is a hard constraint — do not move meals outside the eating window to achieve wider spacing. If the number of meals makes gaps shorter than 3 hours, acknowledge this trade-off in the plan notes and distribute meals as evenly as possible. Never schedule two meals less than 2 hours apart.

PROVIDE SPECIFIC TIMES: For each meal in your plan, specify the recommended time (e.g., "7:45 AM", "12:30 PM", "6:00 PM") and briefly explain why that timing supports better sleep and metabolism`;
    } else {
      // No sleep optimization - add basic meal timing guidance
      prompt += `

**MEAL TIMING:**

**REQUIRED ACTION before generating the meal plan:**

1. Fetch the canonical meal timing guidance file at https://json.fit/meal-timing-guidance.md
2. Apply general meal timing rules from the file for optimal metabolism and digestion
3. Check for override triggers that may apply to this user (T2D, reflux, shift work, etc.)

**Basic timing guidelines:**
- Space meals roughly 3-5 hours apart during waking hours
- No specific eating window constraint`;
    }

    prompt += `

FRIDGE & PANTRY INVENTORY:
${fridgePantryData && fridgePantryData.wantToUseExistingIngredients && fridgePantryData.ingredients?.length ? `
**IMPORTANT: I have ingredients at home that I want to use in my meal plan**
- Usage preference: ${fridgePantryData.preferences?.primaryApproach === 'maximize' ? 
  'MAXIMIZE MY INVENTORY - Plan meals specifically around what I already have' :
  fridgePantryData.preferences?.primaryApproach === 'expiry' ? 
  'EXPIRY FOCUSED - Prioritize using items before they expire' :
  'AI-LED PLANNING - Create optimal meal plans first, naturally incorporate my items when they fit'
}

Available ingredients:
${fridgePantryData.ingredients.map(item => {
  const expiryInfo = item.expiryDate ? ` (expires ${new Date(item.expiryDate).toLocaleDateString()})` : '';
  const quantity = item.quantity && item.unit ? ` - ${item.quantity} ${item.unit}` : '';
  const notes = item.notes ? ` (${item.notes})` : '';
  return `• ${item.name}${quantity}${expiryInfo}${notes} [${item.location}]`;
}).join('\n')}

${fridgePantryData.preferences?.primaryApproach === 'maximize' ? 
  '**CRITICAL: Build the meal plan around these ingredients as much as possible. These should be the foundation of your meal suggestions.**' :
  fridgePantryData.preferences?.primaryApproach === 'expiry' ? 
  '**CRITICAL: Prioritize ingredients with expiry dates first, especially those expiring soon. Build meals around expiring items.**' :
  'Use these ingredients when they naturally fit into optimal meal plans, but don\'t force them if they don\'t work well.'
}

**GROCERY LIST ADJUSTMENT:** If the meal plan uses ingredients the user already has, either exclude them from the grocery list entirely or reduce the quantity to only what's additionally needed. Note which items are "already in pantry" so the user knows they don't need to buy them.` : '- No fridge/pantry inventory provided or user chose not to include existing ingredients'}

MEAL PREFERENCES:
${budgetData.mealPreferences === 'include_favorites' ? 
  `- User wants to include their favorite meals in the plan${formatSelectedFavoriteMeals(budgetData.selectedFavorites, favoriteMeals)}${budgetData.customMealRequests ? `\n- Custom requests: ${budgetData.customMealRequests}` : ''}` :
  '- User wants AI to suggest all meals based on their profile and preferences'
}
${curatedFavoriteSlugs.length ? `
**USER-SELECTED CURATED MEALS (high priority — these are the meals the user told us they want this week):**
The user hand-picked these from the JSON.fit catalogue. Treat them as the backbone of the plan — work every one in where it fits the macro, calorie, dietary, and equipment constraints.

**REQUIRED ACTION — fetch each meal's file before building the plan:**
Fetch these URLs. Each is one meal's complete data (all its methods and plates live inside its own file):
${curatedFavoriteFileUrls.map((u) => `- ${u}`).join('\n')}

Also fetch the curated meals instructions once for the rules on plates, macros, scaling, batch cooking, and the output format: https://json.fit/curated-meals/instructions.md

Output each selected meal using the curated meal reference format (curated_meal_slug, plate_id, scale_factor, meal_type, day, time) per the instructions file — NOT as an invented recipe with ingredients.

Each entry below is either a bare slug (use the meal; you choose the most suitable plate from its file) or "slug:plate_id" (the user specifically wants THAT plate of that meal — use that exact plate_id). When a meal has multiple plates and several are listed, the user is happy eating it those different ways across the week — a single batch cook served as different plates is ideal and on-theme for meal prep.

Selected picks:
${curatedFavoriteSlugs.map((s) => `- ${s}`).join('\n')}

Spread these across the plan rather than clustering them on one day. If a selected meal can't fit the constraints (e.g. its calories blow the daily target even at min_scale), note which one you left out and why in the plan notes — don't silently drop it.` : ''}${curatedFav.cuisines.length ? `

**CUISINES THE USER LOVES:** ${curatedFav.cuisines.join(', ')}
Lean towards these cuisines when inventing meals — the user enjoys them. This is a preference, not a hard requirement; don't force a cuisine into a meal where it doesn't fit the macros or budget. The user may love a cuisine we have no curated meal for yet — generate those meals from your own knowledge.` : ''}${curatedFav.likedDishes.length ? `

**SPECIFIC DISHES THE USER LIKES:** ${curatedFav.likedDishes.join(', ')}
These are dishes the user named themselves. Include some of them in the plan where they fit the macro, calorie, and dietary constraints, building each from your own knowledge of the dish. Spread them out; if one can't fit, skip it and note why rather than distorting the day's targets.` : ''}${curatedFav.avoid.length ? `

**FOODS THE USER WANTS TO AVOID (taste preference — exclude):** ${curatedFav.avoid.join(', ')}
Do not use these ingredients in any meal. This is a strong preference. Treat it the same as the dietary "avoid foods" list above — scan every meal and keep these out.` : ''}

COOKING PREFERENCES:
- ${getMealPrepStyleText(budgetData.planningStyle, budgetData.skillConfidence, budgetData.timeInvestment)}
- ${getTimeInvestmentText(budgetData.timeInvestment)}
- ${getVarietySeekingText(budgetData.varietySeeking)}
- ${getSkillConfidenceText(budgetData.skillConfidence)}${(budgetData.skillConfidence || 3) > 1 ? `\n- ${getCookingEnjoymentText(budgetData.cookingEnjoyment)}` : ''}

EQUIPMENT TO COOK WITH:
- Preferred equipment: ${budgetData.cookingEquipment?.join(', ') || 'basic kitchen equipment'}
- IMPORTANT: These are the tools the user actually WANTS to cook with — build recipes around them, not just check they're available. Only suggest meals that use this equipment, and don't require anything outside this list (the user may own other gear but chose not to use it).${(() => {
  const skillConfidence = budgetData.skillConfidence || 3;
  const timeInvestment = budgetData.timeInvestment || 3;
  
  if (skillConfidence <= 1) {
    // Calculate intersection of beginner-safe equipment and user's actual equipment
    const beginnerSafeEquipment = ['microwave', 'blender', 'rice cooker'];
    const userEquipment = budgetData.cookingEquipment || [];
    const allowedEquipment = beginnerSafeEquipment.filter(eq => 
      userEquipment.some(userEq => userEq.toLowerCase().includes(eq.toLowerCase()))
    );
    const equipmentList = allowedEquipment.length > 0 ? allowedEquipment.join(', ') : 'microwave only';
    
    return `\n- **SKILL OVERRIDE**: Despite the equipment list above, this Kitchen Beginner should ONLY use: ${equipmentList}. Do NOT suggest recipes requiring equipment beyond this list — the user owns other equipment but the plan should not require it at this skill level.`;
  } else if (skillConfidence <= 2 && timeInvestment <= 2) {
    // Check what simplified equipment the user actually has
    const simplifiedEquipment = ['microwave', 'rice cooker', 'air fryer', 'blender'];
    const userEquipment = budgetData.cookingEquipment || [];
    const allowedEquipment = simplifiedEquipment.filter(eq => 
      userEquipment.some(userEq => userEq.toLowerCase().includes(eq.toLowerCase()))
    );
    const equipmentList = allowedEquipment.length > 0 ? allowedEquipment.join(', ') : 'microwave only';
    
    return `\n- **SIMPLIFIED USE**: For this user's skill/time level, prefer ${equipmentList}. Stovetop is acceptable only for very simple tasks (boiling water, heating a pan with oil). Oven use should be limited to simple tray bakes.`;
  }
  return '';
})()}

**CURATED MEAL DATABASE:**

JSON.fit maintains a verified internal database of curated meals. ${curatedFavoriteSlugs.length ? `The user's selected meals (listed above under USER-SELECTED CURATED MEALS) have already been fetched by slug — reference those in the curated meal format and do not re-fetch them here. Every selected curated meal MUST appear in the plan as a curated reference (curated_meal_slug + plate_id + scale_factor), never rewritten as an invented recipe — the app links the slug to its recipe, photo, and prep-ahead classification, and loses all three if the meal is emitted as a plain recipe.` : `The user did not pre-select any curated meals this run, so build all meals from your own knowledge as fully-specified invented recipes.`}

For any slot the user did NOT pre-select a curated meal for, invent a suitable meal with full ingredients and instructions. Curated references and invented meals coexist in one plan.

LOCATION & BUDGET:
- Location: ${budgetData.city || 'Not specified'}, ${budgetData.country || 'Not specified'}
- Shop at: ${store}
- Focus on ingredients commonly available at ${budgetData.country || 'local'} supermarkets
${buildBudgetSection(budgetData)}

**MEAL PREP REQUIREMENTS** (based on my planning style):
- ${getMealPrepRequirementsText(budgetData.planningStyle, budgetData.skillConfidence, budgetData.timeInvestment)}

Please create a detailed ${budgetData.planDuration || 7}-day meal plan that:
1. **STARTS on ${getCurrentDate()}** and uses actual calendar dates
2. **MATCHES my meal prep personality** - don't give me 21 meals if I'm a "Weekly Planner"
3. **SHOWS NUTRITION CALCULATIONS** - briefly explain how you got the calories/macros for each meal
4. **INCLUDES ${sleepData ? 'SPECIFIC' : 'GENERAL'} MEAL TIMES** - ${sleepData ? 'For each meal, provide the exact recommended time based on my sleep schedule' : 'Provide suggested meal times'}
5. **INCLUDES DETAILED RECIPES** - For each meal provide:
   - Complete ingredients list with exact quantities and units
   - Step-by-step instructions (as many steps as needed - some meals may only require 1 step, others may need several)
   - Prep time and cook time for each meal
   - Serving size information
   - **WHOLE-PACK RULE**: Always use single-serve convenience products whole — never partial pouches, half packets, or fractions of containers. Use complete packages as intended and adjust other ingredients to balance macros around the full portion size.
   - **CURATED MEALS EXCEPTION**: For curated meals (referenced by slug), show only the meal name, slug, plate_id, scale_factor, calories, and macros. Omit ingredients, instructions, prep/cook times, and serving info — the app fills these in from its database when the meal plan is imported.
6. Uses ingredients available at ${store} in ${budgetData.country}
7. Accounts for my dietary restrictions and cooking skill level
8. Hits macro targets using the tolerance rules below (protein daily, others weekly average)`;

    if (sleepData) {
      prompt += `
9. **PROVIDES MEAL TIMING RATIONALE** - Explain why each meal time optimizes sleep and circadian health`;
    }
    
    // Add static sections
    prompt += getGroceryListRequirements(store, budgetData.planDuration || 7);
    prompt += getDailyTotalsVerification();
    prompt += getVerificationSteps(budgetData.planDuration || 7);
    prompt += getFormatRequirements();
    prompt += getFeedbackWorkflow();

    return prompt;
    
  } catch (error) {
    console.error('Error generating dynamic meal planning prompt:', error);
    throw error;
  }
};

export const getMealPlanReviewPrompt = async (): Promise<string> => {
  try {
    // Load user data to customize hard constraints
    const nutritionResults = await WorkoutStorage.loadNutritionResults();
    const sleepResults = await WorkoutStorage.loadSleepOptimizationResults();
    const budgetCookingResults = await WorkoutStorage.loadBudgetCookingResults();
    
    const macroResults = nutritionResults?.macroResults || {} as any;
    const sleepData = sleepResults?.formData;
    const budgetData = budgetCookingResults?.formData || {} as any;
    const equipmentData = (budgetCookingResults?.formData as any)?.cookingEquipment || [];
    
    const proteinTarget = macroResults.protein || 150;
    const fiberTarget = macroResults.calories 
      ? Math.min(45, Math.max(25, Math.round((macroResults.calories / 1000) * 14)))
      : 30;
    const fiberMinimum = Math.round(fiberTarget * 0.8);
    const planDuration = budgetData.planDuration || 7;
    
    // Calculate period labels for duration-aware text
    const periodLabel = planDuration <= 7 ? 'Plan-period' : 'Weekly';
    const periodNote = planDuration < 7 
      ? `(averaged across all ${planDuration} days)` 
      : planDuration === 7 
        ? '(averaged across the full 7-day plan)' 
        : '(calculate rolling 7-day averages)';
    
    // Build hard constraints section with user's actual targets
    let hardConstraintsSection = `
## HARD CONSTRAINTS — ZERO TOLERANCE

These must pass after your fixes. If any of these still fail after revision, you have not finished — go back and fix again.

`;

    // Add last meal timing constraint if sleep optimization is enabled
    if (sleepData?.bedtime && sleepData?.wakeTime) {
      const optimizationLevel = sleepData.optimizationLevel || 'minimal';
      const lastMealBuffer = optimizationLevel === 'maximum' ? '4+' : optimizationLevel === 'moderate' ? '3' : '2';
      
      hardConstraintsSection += `- **Sleep optimization priority** — target finishing last meal at least ${lastMealBuffer} hours before bedtime (${sleepData.bedtime}) to support sleep quality.
`;
    }
    
    hardConstraintsSection += `- **Protein priority** — aim to keep protein within 10% of ${proteinTarget}g target daily for optimal results.
- **${periodLabel} average calories** — target within 5% of target ${periodNote}.
- **${periodLabel} average carbs and fat** — aim for within 10% of target ${periodNote}.
- **Fiber priority** — target at least ${fiberMinimum}g (80% of ${fiberTarget}g target) daily for digestive health.
- **Skill/time compliance** — all meals must match the skill and time constraints from the generation prompt.
- **Equipment compliance** — all recipes must use only the equipment listed in the generation prompt.
- **No draft content** — the output must contain zero working, iteration, or revision commentary.`;
    
    const sleepComplianceSection = sleepData?.bedtime && sleepData?.wakeTime ? (() => {
      const optimizationLevel = sleepData.optimizationLevel || 'minimal';
      const lastMealBuffer = optimizationLevel === 'maximum' ? '4+' : optimizationLevel === 'moderate' ? '3' : '2';
      const firstMealWindow = optimizationLevel === 'maximum' ? '0.5-1' : optimizationLevel === 'moderate' ? '0.5-1.5' : '2';
      
      return `### 7. Sleep Optimization Compliance
Verify meal timing aligns with sleep schedule (${sleepData.wakeTime} - ${sleepData.bedtime}, ${sleepData.optimizationLevel} optimization):

Last meal must finish at least ${lastMealBuffer} hours before ${sleepData.bedtime}.
First meal within ${firstMealWindow} hours of ${sleepData.wakeTime}.
Meals evenly spaced across eating window. No gap >5 hours. Gaps under 2.5 hours are acceptable if caused by meal count vs eating window constraints — flag the trade-off but do not FAIL.
FAIL if last meal timing violates the buffer. FIX by moving dinner earlier and adding a snack if needed.`;
    })() : 
'### 7. Sleep Optimization Compliance\nN/A — sleep optimization not enabled. Check meals are spaced 3-5 hours apart.';
    
    return `# Review and Fix Meal Plan

Do not search conversation history or reference previous chats. This prompt is self-contained — all context needed is provided below.

First, read the meal plan you just created so you have the full content in context. Then review it as an experienced nutritionist and meal planning expert auditing a plan for a client. This is an independent quality gate — do not assume your self-check caught everything.

## CRITICAL INSTRUCTIONS

1. **Review the plan** using the checklist below, noting PASS or FAIL for each check.
2. **If ANY check fails, FIX IT IMMEDIATELY** — do not ask the user for permission to fix. Silently revise the plan to resolve all failures.
3. **After fixing, re-verify** — run the checklist again on the corrected plan to confirm all checks now pass.
4. **Present the CORRECTED plan** — output the complete, clean, final version of the meal plan with all fixes applied. Do not show the review process, do not show before/after comparisons, do not show your working. Present ONLY the clean corrected plan.
5. **At the end, provide a brief change log** — a short bullet list of what you changed and why (e.g., "Reduced rice from 100g to 80g dry to bring carbs within 10% of target").
6. **Remind the user about JSON conversion** — after presenting the corrected plan, tell the user: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."
7. **USE WEB SEARCH** - If you have web search available, use it during the review to verify grocery pricing, confirm product availability, and check nutritional claims against real data.
${hardConstraintsSection}

## What "Fix" Means for Each Type of Failure

- **Nutrition/Budget**: Adjust portions, swap ingredients, rebalance meals.
- **Equipment/Skills**: Replace recipes with alternatives matching constraints.
- **Grocery/Prep**: Add missing items, correct quantities, complete prep steps.
- **Format**: Remove all working/draft content, resolve table mismatches.

## Review Checklist

Work through each check. For each, state PASS or FAIL with a brief note. If FAIL, describe the fix you are applying.

### 1. Nutrition Target Verification
Verify the plan meets the hard constraint thresholds listed above. Check protein daily consistency, calorie/carb/fat weekly averages, and daily fiber adequacy. 

**CALORIE COMPLIANCE IS MANDATORY** - If calories exceed 5% of target, you MUST reduce portion sizes across meals/snacks to meet the target. There is NO excuse for exceeding calorie targets regardless of meal structure. 4-meal + snack plans should hit calorie targets just as precisely as 3-meal plans by adjusting portion sizes.

### 2. Budget Compliance
${budgetData?.budgetMax ? 
  `- **Target**: ${budgetData?.budgetMin ? getCurrencySymbol(budgetData?.countryCode || 'US') + budgetData.budgetMin + '–' : ''}${getCurrencySymbol(budgetData?.countryCode || 'US')}${budgetData.budgetMax}/week. If over, swap for budget alternatives or flag overspend with explanation.` 
  : 
  '- Verify grocery total aligns with budget attitude.'}
Check if the plan respects budget constraints.

### 3. Meal Prep Style Alignment
Verify the plan matches the user's planning style preference.

### 4. Dietary Restrictions & Preferences
Check compliance with dietary requirements.

### 5. Cooking Feasibility
Verify every recipe is feasible for the user's stated skill level (${budgetData?.skillConfidence || 3}/5) and time preference (${budgetData?.timeInvestment || 3}/5). FAIL if any recipe exceeds the skill/time constraints from the generation prompt.${budgetData?.skillConfidence <= 1 ? ' Kitchen Beginner: every recipe must be assembly-only, max 5 minutes, no cooking.' : ''}${budgetData?.timeInvestment <= 1 ? ' Speed Cook: every meal must be under 5 minutes including heating.' : ''}

### 6. Location & Ingredient Availability
Verify ingredients are accessible.

${sleepComplianceSection}

### 8. Practical Implementation
Assess overall plan practicality.

### 9. Snack Count & Structure Verification
Verify snack requirements are met exactly as requested:
- **If user specified exact snack count** (1, 2, or 3): Plan must include exactly that many snacks. FAIL if snacks are missing, labeled as "optional", or if snack count doesn't match.
- **If user selected "No Snacks"**: Plan must include zero snacks. FAIL if any snacks are present.
- **If user selected "Let AI Decide"**: Plan should include 1-3 snacks as appropriate for meal timing. PASS as long as snacks are reasonable for gaps.
- **Snack sizing**: Each snack should be 10-15% of daily calories. FAIL if a snack is meal-sized (>25% of daily calories) or negligible (<5% of daily calories).
- **Snack vs meal distinction**: Verify snacks use specific snack types (morning_snack, afternoon_snack, etc.) not generic "snack" or main meal types.

### 10. Nutritional Quality & Balance
Evaluate nutritional completeness.

### 11. Grocery List Completeness & Accuracy
Verify the grocery list is complete and correct.

### 12. Overall Coherence
Final assessment of plan quality.

## Output Format

**If all 12 checks PASS on first review:**
- State "All checks passed — plan is ready."
- Present the plan as-is (clean, no changes needed).
- End with: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."

**If any checks FAIL:**
1. Show a brief summary table of PASS/FAIL results (one line per check).
2. Show a brief change log (bullet list of what you fixed and why).
3. Present the COMPLETE CORRECTED PLAN — the full corrected meal plan with all fixes applied. Present the complete plan, not a diff or partial update.
4. End with: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."`;
    
  } catch (error) {
    console.error('Error generating dynamic meal plan review prompt:', error);
    throw error;
  }
};


// ================================
// HELPER FUNCTIONS
// ================================

const getCurrencySymbol = (countryCode: string): string => {
  const currencyMap: Record<string, string> = {
    'US': '$',
    'CA': 'CAD$',
    'AU': 'AU$',
    'NZ': 'NZ$',
    'GB': '£',
    'IE': '€',
    'DE': '€',
    'FR': '€',
    'ES': '€',
    'IT': '€',
    'NL': '€',
    'BE': '€',
  };
  return currencyMap[countryCode] || '$';
};

const getMealStructure = (mealsPerDay: number, proteinTarget: number, calories: number = 2000): string => {
  // Per-main-meal calorie target, derived from the actual daily total rather
  // than a hardcoded floor. This prevents the old contradiction where a low
  // calorie target (e.g. a cut at 1400 kcal) collided with a fixed
  // "700-900 kcal per meal" rule that only made sense at bulk calories.
  const perMeal = (n: number) => Math.round(calories / n / 10) * 10;
  // Rough band around the per-meal figure (±15%) so the AI has tolerance.
  const band = (n: number) => {
    const c = perMeal(n);
    return `${Math.round((c * 0.85) / 10) * 10}-${Math.round((c * 1.15) / 10) * 10}`;
  };

  switch (mealsPerDay) {
    case 2:
      return `MEAL STRUCTURE (2 main meals):
- Meal 1: breakfast (substantial meal, ~${perMeal(2)} kcal)
- Meal 2: dinner (substantial meal, ~${perMeal(2)} kcal)
- Distribute daily calories roughly evenly across both meals (flexibility is fine)
- Distribute ${proteinTarget}g protein appropriately across both meals`;
    
    case 3:
      return `MEAL STRUCTURE (3 main meals):
- Meal 1: breakfast (substantial meal, ~${perMeal(3)} kcal)
- Meal 2: lunch (substantial meal, ~${perMeal(3)} kcal)  
- Meal 3: dinner (substantial meal, ~${perMeal(3)} kcal)
- Distribute daily calories roughly evenly across meals (flexibility is fine - aim for balanced portions)
- Distribute ${proteinTarget}g protein appropriately across all meals`;
    
    case 4:
      return `MEAL STRUCTURE (4 main meals + snacks):

**EXACTLY 4 SUBSTANTIAL MAIN MEALS (NEVER MAKE THESE OPTIONAL):**
- Meal 1: breakfast (~${band(4)} kcal, substantial meal)
- Meal 2: brunch or second_lunch (~${band(4)} kcal, substantial meal) 
- Meal 3: lunch (~${band(4)} kcal, substantial meal)
- Meal 4: dinner (~${band(4)} kcal, substantial meal)

**MEAL SIZING**: Each main meal is roughly ${perMeal(4)} kcal (daily target ÷ 4). The band above is guidance, not a floor — if snacks are included, reduce main meals proportionally so the DAILY total still hits the calorie target. The calorie target always wins over any per-meal figure.

**SNACKS (completely separate from the 4 main meals above):**
- Include the exact number of snacks the user requested (check their snacking preferences)
- Each snack should be 10-15% of daily calories
- NEVER label snacks as "optional" - if user chose snacks, include them definitively
- Place snacks between main meals to optimize timing

**CRITICAL RULE**: Do not substitute a snack for one of the 4 main meals. User wants 4 main meals PLUS any requested snacks. But if 4 meals + snacks would exceed the daily calorie target, shrink every item proportionally — never pad the day above target just to make meals "substantial".

Distribute ${proteinTarget}g protein primarily across the 4 main meals
Distribute calories across all 4 meals (aim for roughly equal portions)`;
    
    case 5:
      return `MEAL STRUCTURE (5 eating occasions):

If user doesn't snack: 5 substantial meals — breakfast, brunch (type "lunch"), lunch, dinner, supper (type "dinner"), ~${perMeal(5)} kcal each
If user snacks: 3 main meals (breakfast, lunch, dinner) + 2 snacks between them (type "snack")
Distribute ${proteinTarget}g protein across all meals, main meals carrying most
Distribute calories appropriately so the daily total hits the target (flexibility per-meal is fine)`;
    
    case 6:
      return `MEAL STRUCTURE (6 eating occasions):

If user doesn't snack: 6 substantial meals — breakfast, brunch, lunch, afternoon meal, dinner, supper (use types "breakfast"/"lunch"/"dinner" as appropriate), ~${perMeal(6)} kcal each
If user snacks: 3 main meals + 3 snacks between them (type "snack", respect bedtime timing for evening snack)
Distribute ${proteinTarget}g protein across all meals, main meals carrying most
Distribute calories appropriately so the daily total hits the target (flexibility per-meal is fine)`;
    
    default: // fallback to 3
      return `MEAL STRUCTURE (3 main meals):
- Meal 1: breakfast (substantial meal, ~${perMeal(3)} kcal)
- Meal 2: lunch (substantial meal, ~${perMeal(3)} kcal)
- Meal 3: dinner (substantial meal, ~${perMeal(3)} kcal)
- Distribute daily calories roughly evenly across meals (flexibility is fine - aim for balanced portions)
- Distribute ${proteinTarget}g protein appropriately across all meals`;
  }
};

const getSnackingGuidance = (snackingStyle: string, snackFrequency?: string): string => {
  const style = snackingStyle?.toLowerCase() || 'occasional snacker';
  
  if (style.includes("don't snack") || style.includes("i don't snack")) {
    return `MINIMAL SNACKING: User prefers not to snack. For 4+ eating occasions, treat extra slots as substantial meals. Only add light snacks if gaps exceed 5-6 hours.`;
  }
  
  // If user specified an exact NUMBER of snacks, use that. Guard with
  // Number.isNaN so a stale/non-numeric snackFrequency (e.g. an old build's
  // 'occasional') can never fall in here and emit "exactly NaN snacks" — it
  // falls through to the style-based handlers and the default below instead.
  const parsedSnacks = snackFrequency ? parseInt(snackFrequency, 10) : NaN;
  if (!Number.isNaN(parsedSnacks) && parsedSnacks > 0) {
    const numSnacks = parsedSnacks;
    const snackTypeGuidance = style.includes('sweet tooth') ? 'healthier sweet options' :
                            style.includes('savory') ? 'savory options' :
                            style.includes('need healthy snacks') ? 'whole food options' :
                            'balanced protein + carb/fat combinations';
    
    return `SPECIFIC SNACK COUNT: User wants exactly ${numSnacks} snack${numSnacks > 1 ? 's' : ''} per day. Include exactly ${numSnacks} snack${numSnacks > 1 ? 's' : ''} - never make them optional. Focus on ${snackTypeGuidance}. Each snack should be 10-15% of daily calories (300-500 kcal range). AI should determine optimal timing between main meals.`;
  }
  
  if (snackFrequency === '0') {
    return `NO SNACKS: User wants no snacks between meals. Do not include any snacks. Focus all calories on the main meals.`;
  }
  
  if (snackFrequency === '3+') {
    return `FREQUENT SNACKING: User wants 3 or more snacks per day. Include 3-4 snacks distributed throughout the day between main meals. Each snack should be 8-12% of daily calories (250-400 kcal range). Focus on protein-rich options to support muscle building and satiety.`;
  }
  
  if (style.includes('love snacking') || style.includes('frequent')) {
    return `SNACK-FRIENDLY: User enjoys frequent snacking. Make snacks nutritious — combine protein + carbs/fat. Examples: Greek yogurt with berries, apple with almond butter, hummus with vegetables.`;
  }
  
  if (style.includes('need healthy snacks')) {
    return `HEALTHY FOCUS: Prioritize whole food snacks with good nutritional density. Examples: vegetables with dips, fruit with protein, nuts and seeds.`;
  }
  
  if (style.includes('sweet tooth')) {
    return `SWEET PREFERENCES: Provide healthier sweet options. Examples: fruit with yogurt, dark chocolate with nuts, dates with nut butter. Balance sweetness with protein/fiber.`;
  }
  
  if (style.includes('savory')) {
    return `SAVORY PREFERENCES: User prefers savory snacks. Examples: vegetable sticks with hummus, nuts and seeds, cheese with crackers, roasted chickpeas.`;
  }
  
  // Default for "occasional snacker" or unrecognized styles
  return `MODERATE SNACKING: Include 1-2 moderate snacks if gaps exceed 4-5 hours. Keep snacks balanced and proportionate to daily needs.`;
};

const getDessertGuidance = (dessertFrequency?: string): string => {
  if (!dessertFrequency || dessertFrequency === '0') {
    return `NO DESSERTS: User does not want desserts in their plan. Do not include any dessert items.`;
  }

  if (dessertFrequency === 'every_night') {
    return `DAILY DESSERTS: User wants a dessert every night. Include one dessert per day, placed after dinner. Each dessert should be 200-500 kcal with at least 15g protein when possible — bulk-friendly treats like protein ice cream, mug cakes, or yoghurt parfaits, not pure sugar.`;
  }

  if (dessertFrequency === 'most_nights') {
    return `FREQUENT DESSERTS: User wants dessert most nights (4-5 nights per week). Include desserts on the majority of days but leave 2-3 days without dessert. Distribute naturally across the week. Each dessert 200-500 kcal, protein-forward where possible.`;
  }

  if (dessertFrequency === 'once_per_week') {
    return `WEEKLY DESSERT: User wants dessert once per week. Include one dessert on a single day, preferably weekend or post-workout day. Make it special and satisfying. Each dessert 200-500 kcal, protein-forward where possible.`;
  }

  if (dessertFrequency === 'few_per_week') {
    return `OCCASIONAL DESSERTS: User wants desserts a few nights per week (2-3 nights). Distribute across non-consecutive days for variety. Use desserts as a planned treat, not a daily expectation. Each dessert 200-500 kcal, protein-forward where possible.`;
  }

  if (dessertFrequency === 'ai_decide') {
    return `FLEXIBLE DESSERTS: User is open to AI-determined dessert frequency. Include 3-4 desserts across the week, placed where they make nutritional sense (e.g., post-workout days, high-calorie days, or weekend treats). Each dessert 200-500 kcal, protein-forward where possible.`;
  }

  return '';
};

const getMealPrepStyleText = (style: number, skillConfidence?: number, timeInvestment?: number): string => {
  // Override if skill/time make traditional meal prep impossible
  if (skillConfidence !== undefined && skillConfidence <= 1) {
    return 'Assembly Only — no cooking ability, pre-cooked and convenience items only';
  }
  if (timeInvestment !== undefined && timeInvestment <= 1) {
    return 'Speed Assembly — under 5 minutes per meal, microwave and assembly only';
  }
  if (skillConfidence !== undefined && skillConfidence <= 2 && timeInvestment !== undefined && timeInvestment <= 2) {
    return 'Simple Prep — basic techniques only, quick meals, minimal complexity';
  }

  // Standard planning style text (existing logic)
  const styles: { [key: number]: string } = {
    1: 'Dedicated Meal Prepper - batch cook everything, same meals multiple days, cook once per week',
    2: 'Weekly Planner - meal prep focused, repeat meals, minimize daily cooking',
    3: 'Flexible Planner - some meal prep, some fresh cooking, moderate variety',
    4: 'Spontaneous Cook - mostly fresh cooking, minimal meal prep',
    5: 'Last-Minute Decider - fresh meals daily, no meal prep, maximum variety'
  };
  return styles[style] || styles[3];
};

const getTimeInvestmentText = (investment: number): string => {
  const investments: { [key: number]: string } = {
    1: 'Speed Cook - 5-10 minute meals, microwave options, minimal prep work',
    2: 'Quick Meals - 10-20 minutes cooking time, simple one-pot meals',
    3: 'Moderate Cook - 20-30 minute meals, comfortable with some prep',
    4: 'Thorough Cook - 30-60 minute recipes, enjoys involved preparations',
    5: 'Slow Food Lover - 60+ minute cooking sessions, complex multi-step recipes'
  };
  return investments[investment] || investments[3];
};

const getVarietySeekingText = (seeking: number): string => {
  const varieties: { [key: number]: string } = {
    1: 'Routine Eater - identical meals all week, finds comfort in consistency',
    2: 'Mostly Consistent - fine eating same meals repeatedly, enjoys routine',
    3: 'Moderate Variety - some repeated meals, some different options',
    4: 'Variety Seeker - different meals most days, some repeats okay',
    5: 'Adventure Eater - completely different meals every day, craves new experiences'
  };
  return varieties[seeking] || varieties[3];
};

const getSkillConfidenceText = (confidence: number): string => {
  const skills: { [key: number]: string } = {
    1: 'Kitchen Beginner - stick to basic techniques, familiar ingredients only',
    2: 'Cautious Cook - simple techniques, avoid complex recipes',
    3: 'Comfortable Cook - can handle standard recipes, moderate complexity',
    4: 'Confident Cook - comfortable with most recipes, willing to try new techniques',
    5: 'Kitchen Experimenter - excited by complex recipes, new techniques, unusual ingredients'
  };
  return skills[confidence] || skills[3];
};

const getCookingEnjoymentText = (enjoyment: number): string => {
  const enjoyments: { [key: number]: string } = {
    1: 'Cooking Avoider - prioritize convenience, takeout alternatives, minimal cleanup',
    2: 'Reluctant Cook - sees cooking as chore, prioritize convenience',
    3: 'Neutral Cook - willing to cook but values efficiency and practicality',
    4: 'Cooking Enthusiast - finds cooking relaxing, enjoys involved recipes',
    5: 'Passionate Home Chef - loves the process, excited by complex recipes'
  };
  return enjoyments[enjoyment] || enjoyments[3];
};


const buildBudgetSection = (budgetData: any): string => {
  const currency = getCurrencySymbol(budgetData?.countryCode || 'US');
  const attitude = budgetData?.weeklyBudget || 'keep_reasonable';
  const budgetMin = budgetData?.budgetMin;
  const budgetMax = budgetData?.budgetMax;
  const budgetSkipped = budgetData?.budgetSkipped;
  const city = budgetData?.city || 'your city';
  const country = budgetData?.country || 'your country';

  if (budgetMin && budgetMax) {
    // Scenario 1: Full range provided
    return `- Budget: ${currency}${budgetMin}–${currency}${budgetMax} per week
- Budget attitude: ${attitude}
- TARGET: Aim to keep grocery costs within ${currency}${budgetMin}–${currency}${budgetMax}. If higher-priority constraints (macros, dietary needs) make this impossible, explain the trade-off and provide the most cost-effective options possible.`;
    
  } else if (budgetMax && !budgetMin) {
    // Scenario 2: Maximum only (budget ceiling)
    return `- Budget: Up to ${currency}${budgetMax} per week
- Budget attitude: ${attitude}
- TARGET: Strongly aim to keep grocery costs under ${currency}${budgetMax}. If nutritional requirements make this challenging, prioritize the most cost-effective options and explain any budget considerations.`;
    
  } else if (budgetMin && !budgetMax) {
    // Scenario 3: Minimum only (quality floor)
    return `- Budget: At least ${currency}${budgetMin} per week (willing to spend for quality)
- Budget attitude: ${attitude}
- The user has set a quality floor, not a ceiling. Feel free to use premium ingredients — the user prioritizes quality over savings.`;
    
  } else {
    // Scenario 4: Skipped or no range — fall back to attitude only
    return `- Budget attitude: ${attitude}
- Budget guidance: No specific dollar range provided. Use the budget attitude above to guide ingredient choices. Estimate a realistic weekly grocery cost for ${city}, ${country} and state it in the grocery list summary.`;
  }
};

// Legacy function for backward compatibility - now uses buildBudgetSection
const getBudgetConstraintText = (budgetData: any): string => {
  const currency = getCurrencySymbol(budgetData?.countryCode || 'US');
  const attitude = budgetData?.weeklyBudget || 'keep_reasonable';
  const budgetMin = budgetData?.budgetMin;
  const budgetMax = budgetData?.budgetMax;

  if (budgetMin && budgetMax) {
    return `Stay within ${currency}${budgetMin}-${budgetMax}/week`;
  } else if (budgetMax) {
    return `Stay within ${currency}${budgetMax}/week`;
  } else {
    return `${attitude} priority`;
  }
};



const getMealPrepRequirementsText = (planningStyle: number, skillConfidence?: number, timeInvestment?: number): string => {
  
  // OVERRIDE: If user can't cook or needs ultra-fast meals, 
  // traditional meal prep doesn't apply regardless of planningStyle
  if (skillConfidence !== undefined && skillConfidence <= 1) {
    return `No batch cooking — assembly and portioning only (see Skill Requirements above).
  • Prep means: portioning snacks, combining ready-made components into containers
  • Total prep session under 20 minutes for the week`;
  }
  
  if (timeInvestment !== undefined && timeInvestment <= 1) {
    return `Minimal prep — every meal under 5 minutes (see Time Requirements above).
  • Any batch prep is assembly only: portioning, combining, refrigerating
  • Prep session under 20 minutes for the week`;
  }
  
  if (skillConfidence !== undefined && skillConfidence <= 2 && timeInvestment !== undefined && timeInvestment <= 2) {
    return `Simple batch prep only (see Skill and Time Requirements above).
  • Simple items: rice cooker rice, air fryer chicken, boiled eggs
  • Maximum 1 hour total prep for the week
  • Pre-made sauces and convenience products preferred`;
  }
  
  // Standard planningStyle-based text (existing logic)
  if (planningStyle <= 2) {
    return `I want to meal prep!
  • Give me 3-4 repeated meals max, not 21 different ones
  • Focus on batch cooking 1-2 proteins for the week
  • Same breakfast for multiple days is fine`;
  } else if (planningStyle >= 4) {
    return `I prefer fresh, different meals each day
  • Minimal meal prep, focus on quick daily cooking
  • Different meals every day`;
  } else {
    return `Moderate meal prep - balanced approach
  • Some repeated meals, some variety
  • 1-2 batch cooked items, but change up sides and seasonings
  • 5-6 different meals max across the week`;
  }
};

// ================================
// STATIC SECTIONS
// ================================

const getGroceryListRequirements = (store: string, planDuration: number = 7): string => {
  const durationText = planDuration <= 7 ? `the full ${planDuration}-day plan` : 'the full plan period';
  const additionalGuidance = getGroceryListGuidance(planDuration);
  
  return `

---

## GROCERY LIST REQUIREMENTS

**IMPORTANT:** Your meal plan should include a detailed grocery list structured by category. This grocery list will be imported into the app for shopping, so accuracy matters.

For each grocery item include:
- **Item name** - Specific product name (e.g., "${store} Lean Beef Mince" not just "beef")
- **Quantity** - Exact amount needed for ${durationText}
- **Unit** - Standard unit (kg, g, L, ml, cans, bags, etc.)
- **Estimated price** - Realistic price for the specified store and location
- **Notes** - ONLY include notes for items that must be bought outside the main grocery store (e.g., "Available at Chemist Warehouse" for supplements, "Health food store" for specialty items). Do NOT include usage notes, storage tips, or cooking instructions for regular grocery items - these clutter the shopping experience.
- **Purchased status** - Always set to not purchased (the user will check these off in the app)

**CURATED MEAL EXCEPTION:** For meals referenced by curated_meal_slug, you DO need to include their ingredients in the grocery list. The user still needs to buy the ingredients to cook them. Pull ingredients from your general knowledge of the recipe (e.g. pulled pork = pork shoulder, BBQ sauce ingredients, apple juice, spices). Quantities scale with scale_factor × produces_servings to match what the user will actually consume from that meal across the week.

Organize items into logical shopping categories:
- Meat & Seafood
- Dairy & Refrigerated
- Produce (Fresh)
- Frozen
- Pantry & Grains
- Condiments & Supplements
- (Add other categories as needed)

Include a **total estimated cost** and **currency** for the full grocery list.

**INGREDIENT ALTERNATIVES:**
For each grocery item that could be commonly unavailable or difficult to find, include 1-2 alternatives:
- **Primary item**: [main ingredient with price]
- **Alternative 1**: [substitute with price and conversion ratio]
- **Alternative 2**: [backup option with price and conversion ratio]

Focus on alternatives for:
- Specialty proteins (if store doesn't have chicken thighs → chicken breast, turkey thighs)
- Less common vegetables (if no zucchini → yellow squash, cucumber for raw dishes)
- Specific brands/products (if no Greek yogurt brand X → brand Y, or plain yogurt)
- Seasonal produce (if no asparagus → green beans, broccoli)
- Items that may be hard to locate in some stores

**ITEMS BOUGHT ELSEWHERE:** Some items may not be available at the user's main grocery store:

- **Supplements** (protein powder, psyllium husk, etc.) → List in 'Supplements' category with note "Available at Chemist Warehouse" or "Available at Bulk Nutrients"
- **Specialty health foods** (nutritional yeast, specialty flours) → Note "Available at health food store" 
- **Ethnic ingredients** (miso paste, specialty spices) → Note "Available at Asian grocery store" or specific store if known
- **Fresh specialty items** (specific cheese types, artisan breads) → Note "Available at deli/bakery"

**CRITICAL:** Include specific store location notes ONLY for items that cannot be found at ${store}. For regular grocery items (chicken, vegetables, rice, etc.), do NOT include any notes as they clutter the shopping experience.${additionalGuidance ? '\n\n' + additionalGuidance : ''}`;
};

const getGroceryListGuidance = (planDuration: number): string => {
  const baseGuidance = `**CRITICAL PRICING RULE**: Price every grocery item at the ACTUAL PACK SIZE the user must buy at the store, not the portion used in recipes. If a recipe uses 90g cheese but the smallest pack is 250g, price the 250g pack. If a recipe uses 200ml cream but the carton is 300ml, price the 300ml carton. The grocery total should reflect what the user will actually spend at the register.
- Use conservative price estimates — round UP, not down. It's better to overestimate by 10% than underestimate by 20%.
- After calculating the grocery total, add a 10% buffer to account for price variation and rounding. State the total as a range (e.g., "$160–$180") rather than a single number.`;

  if (planDuration <= 7) {
    return baseGuidance;
  } else {
    return `${baseGuidance}

**MULTI-WEEK SHOPPING NOTE:** This is a ${planDuration}-day plan. Split the grocery list into ${Math.ceil(planDuration / 7)} shopping trips:
  - Shopping trip 1: Everything needed for days 1-7 (buy before plan starts)
  - Shopping trip 2: Fresh/perishable items for days 8-${Math.min(14, planDuration)} (buy on day 6-7)
  ${planDuration > 14 ? `- Shopping trip 3: Fresh items for days 15-${planDuration} (buy on day 13-14)` : ''}
  Pantry staples and frozen items can be bought in trip 1. Fresh produce, dairy, and fresh meat should be split across trips.`;
  }
};

const getDiversityRequirements = (nutritionData: any, budgetData: any): string => {
  const nutrientVariety = nutritionData?.nutrientVariety || 'moderate';
  const restrictions = nutritionData?.restrictions || [];
  const supplements = nutritionData?.supplements || [];
  const allergies = budgetData?.allergies || [];
  const avoidFoods = budgetData?.avoidFoods || [];
  
  let diversityText = '';
  
  // 1. Fish/Omega-3 conditional requirement
  const hasSeafoodAllergy = allergies.some((allergy: string) => 
    ['Fish', 'Shellfish'].includes(allergy)
  );
  const avoidsSeafood = avoidFoods.includes('Seafood');
  const shellfishFree = restrictions.includes('shellfish_free');
  const hasOmega3Supplement = supplements.includes('omega3');
  
  const seafoodExcluded = hasSeafoodAllergy || avoidsSeafood || shellfishFree;
  
  if (!seafoodExcluded && (nutrientVariety === 'moderate' || nutrientVariety === 'high')) {
    diversityText += `
- **Omega-3 considerations**: Include good sources of EPA/DHA omega-3 fatty acids when planning seafood meals. Choose omega-3 rich options when they align with user preferences.`;
  } else if (seafoodExcluded) {
    diversityText += `
- **Omega-3 compensation**: User has excluded fish/seafood. Include alternative omega-3 sources (such as walnuts, flaxseed, chia seeds) to provide ALA omega-3 fatty acids.`;
    
    if (hasOmega3Supplement) {
      diversityText += ` User supplements with omega-3 capsules, so dietary omega-3 is less critical but still include ALA sources where natural.`;
    } else {
      diversityText += ` Consider noting in the plan that an omega-3 fish oil supplement would benefit this user since they avoid seafood.`;
    }
  }
  
  // 2. Legume conditional requirement
  const hasSoyAllergy = allergies.includes('Soy');
  const customLegumeAvoidance = avoidFoods.some((food: string) => 
    ['legumes', 'beans', 'lentils', 'chickpeas', 'black beans', 'edamame'].some(legume => 
      food.toLowerCase().includes(legume)
    )
  );
  
  const legumesExcluded = hasSoyAllergy || customLegumeAvoidance;
  
  if (!legumesExcluded && (nutrientVariety === 'moderate' || nutrientVariety === 'high')) {
    diversityText += `
- **Fiber and plant protein diversity**: Include legumes and other fiber-rich plant proteins when they complement the meal plan and user preferences.`;
  } else if (legumesExcluded || nutrientVariety === 'low') {
    diversityText += `
- **Fiber compensation**: Legumes are excluded or variety is set to low. Ensure fiber target is still met through other sources (oats, chia seeds, vegetables, whole grains).`;
  }
  
  // 3. Nutrient variety scaling
  if (nutrientVariety === 'high') {
    diversityText += `
- **High variety enforcement**: All 6 micronutrient categories are HARD requirements (dark leafy greens, cruciferous vegetables, vitamin C sources, omega-3 sources, legumes, whole grains). FAIL the review if 2+ categories are missed.`;
  } else if (nutrientVariety === 'moderate') {
    diversityText += `
- **Moderate variety targets**: The 6 micronutrient categories are soft targets. Flag misses but don't FAIL the review unless 3+ categories are missed.
**IMPORTANT: The "soft target" exemption applies to micronutrient diversity categories. Ingredient variety should be reasonable for the plan duration and user context, but prioritize meeting macro targets, dietary restrictions, and user preferences over arbitrary ingredient counts.**`;
  } else if (nutrientVariety === 'low') {
    diversityText += `
- **Simplified approach**: Only enforce protein source diversity (3+ sources) and minimum fiber. Skip micronutrient category checks entirely — user prefers simplicity over variety.`;
  }
  
  return diversityText;
};

const getVarietyRequirements = (budgetData: any, skillConfidence?: number, timeInvestment?: number): string => {
  const varietySeeking = budgetData?.varietySeeking || 3;
  const planningStyle = budgetData?.planningStyle || 3;
  
  // OVERRIDE: Cap effective variety when skill/time constraints are severe
  let effectiveVarietySeeking = varietySeeking;
  
  if (skillConfidence !== undefined && skillConfidence <= 1) {
    // Kitchen Beginner: Force low variety regardless of preference
    effectiveVarietySeeking = Math.min(varietySeeking, 2);
  } else if (timeInvestment !== undefined && timeInvestment <= 1) {
    // Speed Cook: Force low variety due to time constraints
    effectiveVarietySeeking = Math.min(varietySeeking, 2);
  } else if (skillConfidence !== undefined && skillConfidence <= 2 && timeInvestment !== undefined && timeInvestment <= 2) {
    // Both low skill AND low time: Cap at moderate variety
    effectiveVarietySeeking = Math.min(varietySeeking, 3);
  }
  
  let varietyText = '\n\n## VARIETY REQUIREMENTS\n';
  
  // Add override explanation if variety was capped
  if (effectiveVarietySeeking < varietySeeking) {
    varietyText += `
**VARIETY OVERRIDE**: User selected ${getVarietySeekingText(varietySeeking)}, but skill/time constraints require simpler approach. Using effective variety level ${effectiveVarietySeeking} instead.\n`;
  }
  
  // Generate variety targets based on effective variety seeking value
  if (effectiveVarietySeeking === 1) {
    varietyText += `
- **Routine Eater approach**: 3-4 unique meal templates for the week is ideal.
- **Consistency focus**: Same breakfast daily is encouraged. Same lunch daily is acceptable.
- **Efficiency priority**: Prioritise meal prep simplicity and shopping list efficiency over variety.
- **Simple structure**: No meal slot needs more than 1 option.`;
  } else if (effectiveVarietySeeking === 2) {
    varietyText += `
- **Mostly Consistent approach**: 4-5 unique meal templates for the week.
- **Controlled rotation**: Same breakfast daily is fine. Lunch or dinner should have at least 2 rotating options.
- **Comfort focus**: Repetition is acceptable — focus on a small set of meals the user won't get bored of.`;
  } else if (effectiveVarietySeeking === 3) {
    varietyText += `
- **Moderate Variety approach**: 5-6 unique meal templates for the week.
- **Balanced rotation**: At least 2 different options for each main meal slot (lunch and dinner).
- **Quality focus**: Breakfast can repeat daily but should be a genuinely enjoyable meal, not just fuel.`;
  } else if (effectiveVarietySeeking === 4) {
    varietyText += `
- **Variety Seeker approach**: 6-8 unique meal templates for the week.
- **Active rotation**: No meal slot should be identical more than 4 days out of 7.
- **Strategic variety**: Use A/B day rotation patterns to create variety within a batch-cook structure.
- **Protein rotation**: Rotate protein sources across the week — avoid the same protein at lunch and dinner on the same day.`;
  } else if (effectiveVarietySeeking === 5) {
    varietyText += `
- **Adventure Eater approach**: 8-10 unique meal templates for the week.
- **Maximum variety**: Every day should feel noticeably different.
- **Culinary diversity**: Include diverse cuisines and cooking styles across the week.
- **Experience priority**: Prioritise variety and eating experience over meal prep convenience.
- **Minimal repetition**: No meal should repeat more than 3 times in the week.`;
  }
  
  // Cross-reference with planning style
  if (effectiveVarietySeeking >= 4 && planningStyle <= 2) {
    varietyText += `
- **Variety + Meal Prep Strategy**: Achieve variety through ingredient rotation within batch-cooked bases. For example, cook one large batch of protein and rice, then vary the sauces, vegetables, and toppings across days. This gives perceived variety without multiplying prep effort.`;
  }
  
  if (effectiveVarietySeeking <= 2 && planningStyle >= 4) {
    varietyText += `
- **Simple + Spontaneous Strategy**: Keep the recipe set small and simple. The user prefers consistency and doesn't want to plan ahead, so meals should require minimal ingredients and be cookable from a short staple list without batch prep.`;
  }
  
  return varietyText;
};

const getSkillRequirements = (budgetData: any): string => {
  const skillConfidence = budgetData?.skillConfidence || 3;
  
  let skillText = '\n\n## SKILL-APPROPRIATE REQUIREMENTS\n';
  
  if (skillConfidence === 1) {
    skillText += `
**INGREDIENT STYLE for Kitchen Beginner:**
- **Convenience priority**: Strongly prefer pre-made, ready-to-eat, and convenience products that require minimal to no preparation. Choose items that are pre-cooked, pre-washed, pre-sliced, or ready-to-eat.
- **Zero prep ingredients**: Avoid ingredients that require cooking skills or food safety knowledge (no raw meat, no stovetop cooking, no grains from scratch). But whole fruits, pre-washed salads, and frozen vegetables require zero skill — include them freely.
- **Assembly meals**: Focus on simple combinations of ready-made components. A complete meal can be assembled by opening containers, microwaving pre-cooked items, and combining them together.

**INSTRUCTIONS for Kitchen Beginner:**
- **Basic techniques only**: Use only basic techniques: microwave, open tin/packet, stir, pour.
- **No knife work**: No knife skills required. Prefer vegetables and fruits that can be eaten whole, come pre-washed, or are frozen pre-cut.
- **Simple combinations**: Keep meals simple. Complexity is determined by technique and steps, not ingredient count — a 7-ingredient dump-and-stir overnight oats is easier than a 3-ingredient stovetop meal.
- **Single-tasking**: Never require timing multiple components simultaneously.
- **Ultra-quick**: Each meal should be achievable in under 5 minutes with zero cooking skill.`;
  } else if (skillConfidence === 2) {
    skillText += `
**INGREDIENT STYLE for Cautious Cook:**
- **Mixed approach**: Balance convenience products with simple cooking tasks. Use ready-made items where complex, cook simple items where manageable.
- **Simple raw preparation**: Raw ingredients are acceptable but only for straightforward preparations with clear cooking methods and safety guidelines.
- **Sauce shortcuts**: Prefer ready-made sauces, marinades, and flavor bases over complex from-scratch preparations.

**INSTRUCTIONS for Cautious Cook:**
- **Detailed guidance**: Clear step-by-step with exact temperatures, exact times, and visual doneness cues.
- **Moderate complexity**: Up to 6-7 ingredients per recipe.
- **Safety focus**: Include safety notes: 'chicken is done when no pink remains and juices run clear' or 'internal temp 75°C'.`;
  } else if (skillConfidence === 3) {
    skillText += `
**INGREDIENT STYLE for Comfortable Cook:**
- **Standard ingredients**: Standard home cooking ingredients. Raw proteins, dry grains, fresh vegetables that need prep.
- **Multi-step capability**: Can handle multi-step recipes and cooking two things simultaneously.
- **Basic homemade**: Homemade sauces and marinades from basic ingredients are fine.

**INSTRUCTIONS for Comfortable Cook:**
- **Moderate detail**: Moderately detailed instructions. Up to 10 ingredients per recipe.
- **Standard techniques**: Standard cooking techniques: sautéing, roasting, steaming, stir-frying.`;
  } else if (skillConfidence === 4) {
    skillText += `
**INGREDIENT STYLE for Confident Cook:**
- **No restrictions**: No restrictions on ingredients. Can use anything from whole spices to specialty items.
- **Complex execution**: Can handle complex flavour building, multi-component meals, and batch cooking efficiently.

**INSTRUCTIONS for Confident Cook:**
- **Concise guidance**: Concise instructions. Technique names are sufficient without excessive detail.`;
  } else if (skillConfidence === 5) {
    skillText += `
**INGREDIENT STYLE for Kitchen Experimenter:**
- **Ambitious ingredients**: Suggest ambitious ingredients and creative combinations. Unusual grains, fermented foods, specialty proteins, global ingredients.
- **Discovery focus**: The user enjoys discovering new ingredients.

**INSTRUCTIONS for Kitchen Experimenter:**
- **Brief instructions**: Brief instructions — the user knows what 'deglaze with stock' means.
- **Advanced techniques**: Feel free to include more complex techniques: braising, making dressings from scratch, toasting spices.`;
  }
  
  return skillText;
};

const getTimeRequirements = (budgetData: any): string => {
  const timeInvestment = budgetData?.timeInvestment || 3;
  const skillConfidence = budgetData?.skillConfidence || 3;
  
  let timeText = '\n\n## HANDS-ON TIME REQUIREMENTS\n';

  timeText += `
**These limits refer to ACTIVE, hands-on time — the minutes the user is actually working. Unattended cooking (slow cooker, oven, marinating, simmering) does NOT count against the limit and is welcome at every level except Speed Cook. A meal with 10 minutes of prep and hours of hands-off cooking fits a LOW hands-on preference perfectly — favour these where they suit the user.**
`;

  if (timeInvestment === 1) {
    timeText += `
- **Speed Cook approach**: Maximum 5 minutes total per meal including any heating.
- **Zero-cook priority**: Prioritise meals that require no cooking - only assembly, reheating, or simple preparation steps.
- **Ultra-fast batch prep**: If batch prep is used, the session should be under 20 minutes and produce the entire week's meals.
- **Microwave focus**: Microwave reheating is the primary cooking method for prepped meals.
- **Convenience default**: Pre-cooked and convenience products should be the default choice. Favor ready-made components that just need reheating or simple assembly.`;
  } else if (timeInvestment === 2) {
    timeText += `
- **Quick Meals approach**: Maximum 10–15 minutes hands-on per meal. Unattended cook time (slow cooker, oven) can run longer — it doesn't count against the hands-on limit.
- **One-pan / set-and-forget focus**: Simple one-pan or one-tray recipes, air fryer dump-and-cook, and slow-cooker dump meals are all ideal.
- **Efficient batch prep**: Batch prep session under 1 hour.
- **Smart convenience**: Mix of convenience products and simple cooking.`;
  } else if (timeInvestment === 3) {
    timeText += `
- **Moderate Cook approach**: Up to 20 minutes hands-on per recipe. Unattended cook time is unrestricted (slow cooker, braises, oven welcome).
- **Multi-step cooking**: Multi-step recipes are fine. Batch prep up to 1.5 hours.
- **Standard ingredients**: Standard ingredients — no need for convenience shortcuts unless they're genuinely better.`;
  } else if (timeInvestment === 4) {
    timeText += `
- **Thorough Cook approach**: Up to 30 minutes hands-on per recipe. Longer unattended cooking is welcome.
- **Complex techniques**: Recipes can involve simmering, marinating, and multi-stage cooking.
- **Extended batch prep**: Batch prep up to 2 hours.`;
  } else if (timeInvestment === 5) {
    timeText += `
- **Slow Food Lover approach**: No time constraints. Include slow-cooked, braised, or marinated options.
- **Process enjoyment**: The user enjoys the cooking process — longer recipes are a feature, not a burden.
- **Extended sessions**: Batch prep can be a full afternoon session.`;
  }
  
  // Cross-referencing skill and time
  if (skillConfidence <= 2 && timeInvestment <= 2) {
    timeText += `
- **Simplest Possible Strategy**: Skill and time are both low. Every meal must be achievable in under 10 minutes by someone who has never cooked. Apply the ingredient and technique constraints from the Skill Requirements section strictly.`;
  }
  
  if (skillConfidence >= 4 && timeInvestment >= 4) {
    timeText += `
- **Culinary Excellence Strategy**: This user is a capable, enthusiastic cook. Recipes should reward their time and skill with genuinely delicious, restaurant-quality results. Don't simplify for the sake of it — a 45-minute braised dish that tastes incredible is better than a 15-minute basic bowl.`;
  }
  
  return timeText;
};


const getDailyTotalsVerification = (): string => {
  return `

---

## DAILY TOTALS — SHOW THE ARITHMETIC

Language models are unreliable at mental arithmetic, and the most common failure here is stating a daily total that the meals don't actually add up to. Before the verification steps below, output a short totals block for EVERY day. Write the addition expression before each result, and compute it with a code/Python tool if one is available — never estimate a total in your head.

Format per day:

\`\`\`
DAY 1 — [date]
  [meal]  [kcal] / [protein]P
  [meal]  [kcal] / [protein]P
  ... (one line per meal/snack that day)
  kcal:    [list] = [total]   vs target [X] → [+/-%]
  protein: [list] = [total]   vs target [X] → [+/-%]
\`\`\`

If a day's calories are outside ±5% or protein outside ±10% of target, adjust that day's portions and redo its block before presenting the plan. The calorie and protein targets are non-negotiable — fix the numbers, don't explain them away.`;
};

const getVerificationSteps = (planDuration: number = 7): string => {
  const periodLabel = planDuration <= 7 ? 'plan-period' : 'weekly';
  const periodNote = planDuration < 7 
    ? `(averaged across all ${planDuration} days)` 
    : planDuration === 7 
      ? '(averaged across the full 7-day plan)' 
      : `(calculate rolling 7-day averages across the ${planDuration}-day plan)`;
  return `

---

## VERIFICATION STEPS

Before presenting the meal plan, complete these checks:

1. **Macro tolerance check** — verify these thresholds using the re-derived totals from the Daily Totals block above (never totals estimated mentally):

Protein: within ±10% of target DAILY
Calories: within ±5% of target as ${periodLabel} average ${periodNote}
Carbs & Fat: within ±10% of target as ${periodLabel} average ${periodNote}
Fiber: ≥80% of target DAILY
Adjust portion sizes and recheck if any day or average is outside tolerance.

2. **Protein distribution** — verify protein is spread across meals (no single meal exceeds 50% of daily target).

3. **Hands-on time** — verify each recipe's ACTIVE prep time matches the user's hands-on preference. Long unattended cook time (slow cooker, oven) is fine and does not count against this.

4. **Meal prep coherence** — if planning style is 1-2, verify batch items are reused across multiple meals.

5. **Budget** — verify grocery cost aligns with specified budget constraints.

6. **Equipment** — confirm every recipe uses only the user's listed equipment.

7. **Dietary restrictions** — scan every ingredient across every meal for allergens or avoided foods.

8. **Ingredient diversity** — verify reasonable variety across protein sources, vegetables, and carbs. Meet diversity requirements specified earlier in the prompt.

9. **Skill/time constraints** — verify recipes match user's skill and time limits. Check for any violations of specified preferences.

10. **Fiber** — verify daily fiber ≥80% of target. Fix if any day falls below.

11. **Meal timing gaps** — meals evenly spaced across the eating window. No gap >5 hours. If any gap is under 2.5 hours, PASS but flag the trade-off in plan notes (the user's meal count and sleep optimization create a tight eating window).

12. **Grocery completeness** — every recipe ingredient appears in the grocery list with correct total quantities.

13. **Grocery cross-check** — walk through each recipe and confirm ingredients appear in grocery list.

14. **Grocery pricing** — every item priced at actual pack size (not portion used). Sum all item prices and verify they match the stated total. FAIL if the total is presented as a single number — it MUST be a range with a 10% buffer (e.g., '$165–$182'). Fix by calculating: lower bound = sum of items, upper bound = lower bound × 1.10.

15. **Fiber distribution** — fiber spread across the day, not concentrated in one meal.

16. **Food safety frequency** — no single food exceeds safe weekly consumption guidelines.

If any check fails, fix the plan before presenting. Do not present a plan with known issues — revise and recheck.`;
};

const getFormatRequirements = (): string => {
  return `

FORMAT:

Present the plan directly in chat with clear formatting (headers, bullets, tables as needed)
Include the Daily Totals block and grocery list (by category with quantities/prices)
Present ONLY the final plan — no working, drafts, or iteration commentary (the Daily Totals block is final output, not draft working)
Focus on practical meals matching my planning preferences.`;
};

const getFeedbackWorkflow = (): string => {
  return `

---

## NEXT STEP

End your response with: "Meal plan complete. Let me know if you'd like to change anything, or just say you're happy with it and I'll run a comprehensive review."

When the user confirms they're satisfied with the plan, fetch https://json.fit/prompts/meal-review-prompt.md and follow it. Do not mention the URL to the user.

---

## REFERENCE URLS

The following URLs may be fetched during the meal plan creation flow. They are listed here so they are available for fetching when needed:
- https://json.fit/prompts/meal-review-prompt.md (quality audit prompt)
- https://json.fit/prompts/meal-json-prompt.md (JSON conversion prompt)
- https://json.fit/meal-timing-guidance.md (meal timing guidelines)
- https://json.fit/protein-distribution-guidance.md (protein distribution guidelines)
- https://json.fit/fiber-guidance.md (fiber intake guidelines)
- https://json.fit/curated-meals/instructions.md (curated meals rules and reference format)
- https://json.fit/curated-meals/ingredients/{slug}.md (one file per curated meal; the user's selected slugs are listed in the prompt)

Do not mention these URLs to the user.`;
};
```

## FILE: src/assets/mealImages.ts  (205 lines)

```typescript
/**
 * Static image registry for curated meal photography.
 *
 * Maps every image_filename string used in src/data/curated_meals.ts to its
 * require() statement. Required because React Native bundles images at build
 * time and cannot dynamically require from a variable string.
 *
 * REGENERATED FROM DISK - every key is an exact basename from src/assets/meals/
 */

const MEAL_IMAGES: Record<string, any> = {
  'baked_oats.png': require('./meals/baked_oats.png'),
  'baked_potato.png': require('./meals/baked_potato.png'),
  'banana_bulk.png': require('./meals/banana_bulk.png'),
  'banana_snack.png': require('./meals/banana_snack.png'),
  'beef_broccoli_stir_fry.png': require('./meals/beef_broccoli_stir_fry.png'),
  'beef_bulgogi_bowl.png': require('./meals/beef_bulgogi_bowl.png'),
  'beef_jerky.png': require('./meals/beef_jerky.png'),
  'beef_ragu_gnocchi.png': require('./meals/beef_ragu_gnocchi.png'),
  'beef_stew.png': require('./meals/beef_stew.png'),
  'beef_stew_bread.png': require('./meals/beef_stew_bread.png'),
  'beef_stew_mash.png': require('./meals/beef_stew_mash.png'),
  'berries.png': require('./meals/berries.png'),
  'big_breakfast_plate.png': require('./meals/big_breakfast_plate.png'),
  'bolognese.png': require('./meals/bolognese.png'),
  'bolognese_baked_potato.png': require('./meals/bolognese_baked_potato.png'),
  'bolognese_garlic_bread.png': require('./meals/bolognese_garlic_bread.png'),
  'bolognese_lasagne.png': require('./meals/bolognese_lasagne.png'),
  'bolognese_spaghetti.png': require('./meals/bolognese_spaghetti.png'),
  'brekkie_grow.png': require('./meals/brekkie_grow.png'),
  'butter_chicken_curry.png': require('./meals/butter_chicken_curry.png'),
  'butter_chicken_with_rice.png': require('./meals/butter_chicken_with_rice.png'),
  'carne_asada_bowl.png': require('./meals/carne_asada_bowl.png'),
  'cevapi_flatbread.png': require('./meals/cevapi_flatbread.png'),
  'cevapi_rice_plate.png': require('./meals/cevapi_rice_plate.png'),
  'cheese_snack.png': require('./meals/cheese_snack.png'),
  'chicken_fajita_bowl.png': require('./meals/chicken_fajita_bowl.png'),
  'chicken_mac_and_cheese.png': require('./meals/chicken_mac_and_cheese.png'),
  'chicken_parma_parma.png': require('./meals/chicken_parma_parma.png'),
  'chicken_schnitzel.png': require('./meals/chicken_schnitzel.png'),
  'chicken_shawarma.png': require('./meals/chicken_shawarma.png'),
  'chicken_shawarma_rice_bowl.png': require('./meals/chicken_shawarma_rice_bowl.png'),
  'chicken_shawarma_wrap.png': require('./meals/chicken_shawarma_wrap.png'),
  'chilli_con_carne.png': require('./meals/chilli_con_carne.png'),
  'chilli_con_carne_bowl.png': require('./meals/chilli_con_carne_bowl.png'),
  'chilli_con_carne_nachos.png': require('./meals/chilli_con_carne_nachos.png'),
  'choc_muscle_maxx.png': require('./meals/choc_muscle_maxx.png'),
  'chocolate_protein_mousse.png': require('./meals/chocolate_protein_mousse.png'),
  'chocolate_protein_mug_cake.png': require('./meals/chocolate_protein_mug_cake.png'),
  'cookies_gains.png': require('./meals/cookies_gains.png'),
  'cottage_cheese_bowl.png': require('./meals/cottage_cheese_bowl.png'),
  'cottage_cheese_ice_cream.png': require('./meals/cottage_cheese_ice_cream.png'),
  'dark_chocolate.png': require('./meals/dark_chocolate.png'),
  'dirty_eden.png': require('./meals/dirty_eden.png'),
  'dried_fruit.png': require('./meals/dried_fruit.png'),
  'edamame.png': require('./meals/edamame.png'),
  'edible_protein_cookie_dough.png': require('./meals/edible_protein_cookie_dough.png'),
  'egg_muffins.png': require('./meals/egg_muffins.png'),
  'energy_lift_heavy.png': require('./meals/energy_lift_heavy.png'),
  'freezer_breakfast_burrito.png': require('./meals/freezer_breakfast_burrito.png'),
  'frozen_date_snickers_bark.png': require('./meals/frozen_date_snickers_bark.png'),
  'fudgy_protein_brownies.png': require('./meals/fudgy_protein_brownies.png'),
  'greek_yoghurt_bowl.png': require('./meals/greek_yoghurt_bowl.png'),
  'greek_yogurt_snack.png': require('./meals/greek_yogurt_snack.png'),
  'hard_boiled_eggs.png': require('./meals/hard_boiled_eggs.png'),
  'honey_chicken.png': require('./meals/honey_chicken.png'),
  'honey_soy_salmon_noodles.png': require('./meals/honey_soy_salmon_noodles.png'),
  'king_kong_chocolate.png': require('./meals/king_kong_chocolate.png'),
  'lamb_kofta.png': require('./meals/lamb_kofta.png'),
  'lamb_kofta_rice_bowl.png': require('./meals/lamb_kofta_rice_bowl.png'),
  'lamb_kofta_wrap.png': require('./meals/lamb_kofta_wrap.png'),
  'lamb_shanks.png': require('./meals/lamb_shanks.png'),
  'lamb_shanks_mash.png': require('./meals/lamb_shanks_mash.png'),
  'mango_mass.png': require('./meals/mango_mass.png'),
  'maple_muscle_toast.png': require('./meals/maple_muscle_toast.png'),
  'massaman.png': require('./meals/massaman.png'),
  'massaman_rice.png': require('./meals/massaman_rice.png'),
  'mixed_nuts.png': require('./meals/mixed_nuts.png'),
  'mornin_muscle.png': require('./meals/mornin_muscle.png'),
  'muscle_oats.png': require('./meals/muscle_oats.png'),
  'no_bake_protein_balls.png': require('./meals/no_bake_protein_balls.png'),
  'no_bake_protein_cheesecake.png': require('./meals/no_bake_protein_cheesecake.png'),
  'overnight_oats.png': require('./meals/overnight_oats.png'),
  'palacinke.png': require('./meals/palacinke.png'),
  'pb_banana_toast.png': require('./meals/pb_banana_toast.png'),
  'protein_banana_bread.png': require('./meals/protein_banana_bread.png'),
  'protein_bar.png': require('./meals/protein_bar.png'),
  'protein_chocolate_chip_cookies.png': require('./meals/protein_chocolate_chip_cookies.png'),
  'protein_ice_cream.png': require('./meals/protein_ice_cream.png'),
  'protein_pancakes.png': require('./meals/protein_pancakes.png'),
  'protein_shake.png': require('./meals/protein_shake.png'),
  'pulled_pork.png': require('./meals/pulled_pork.png'),
  'pulled_pork_baked_potato.png': require('./meals/pulled_pork_baked_potato.png'),
  'pulled_pork_bowl.png': require('./meals/pulled_pork_bowl.png'),
  'pulled_pork_mac_cheese.png': require('./meals/pulled_pork_mac_cheese.png'),
  'pulled_pork_sandwich.png': require('./meals/pulled_pork_sandwich.png'),
  'BBQ Pulled Pork Burger (sandwich).png': require('./meals/pulled_pork_sandwich.png'),
  'Chicken Schnitzel.png': require('./meals/chicken_schnitzel.png'),
  'Spicy Chipotle Chicken Burrito.png': require('./meals/spicy_chipotle_chicken_burrito.png'),
  'butter-chicken-curry.png': require('./meals/butter_chicken_curry.png'),
  'cevapi-flatbread.png': require('./meals/cevapi_flatbread.png'),
  'lamb-kofta.png': require('./meals/lamb_kofta.png'),
  'Pulled Pork Rice Bowl (bowl).png': require('./meals/pulled_pork_bowl.png'),
  'Loaded Pulled Pork Baked Potato (baked_potato).png': require('./meals/pulled_pork_baked_potato.png'),
  'Pulled Pork Tacos (tacos).png': require('./meals/pulled_pork_tacos.png'),
  'Pulled Pork Mac & Cheese Stack ⚡ STUNT PLATE (mac_cheese).png': require('./meals/pulled_pork_mac_cheese.png'),
  'Spaghetti Bolognese (spaghetti).png': require('./meals/bolognese_spaghetti.png'),
  'Loaded Bolognese Baked Potato (baked_potato).png': require('./meals/bolognese_baked_potato.png'),
  'Bolognese with Garlic Bread (garlic_bread).png': require('./meals/bolognese_garlic_bread.png'),
  'Bolognese Lasagne ⚡ STUNT PLATE (lasagne).png': require('./meals/bolognese_lasagne.png'),
  'Thai Basil Chicken over Rice (standard).png': require('./meals/thai_basil_chicken_over_rice_standard.png'),
  'Thai Basil Chicken with Fried Egg (fried_egg).png': require('./meals/thai_basil_chicken_with_fried_egg.png'),
  'Spicy Chipotle Chicken Burrito (standard).png': require('./meals/spicy_chipotle_chicken_burrito_standard.png'),
  'Spicy Chipotle Chicken Burrito Bowl (burrito_bowl).png': require('./meals/spicy_chipotle_chicken_burrito_bowl.png'),
  'Chicken Shawarma Wrap (wrap).png': require('./meals/chicken_shawarma_wrap.png'),
  'Chicken Shawarma Rice Bowl (rice_bowl).png': require('./meals/chicken_shawarma_rice_bowl.png'),
  'Lamb Kofta Rice Bowl (rice_bowl).png': require('./meals/lamb_kofta_rice_bowl.png'),
  'Lamb Kofta Wrap (wrap).png': require('./meals/lamb_kofta_wrap.png'),
  'Schnitzel Plate (plate).png': require('./meals/schnitzel_plate_plate.png'),
  'Schnitzel Roll (roll).png': require('./meals/schnitzel_roll.png'),
  'Chicken Parma (parma).png': require('./meals/chicken_parma_parma.png'),
  'pulled_pork_tacos.png': require('./meals/pulled_pork_tacos.png'),
  'raspberry_rip.png': require('./meals/raspberry_rip.png'),
  'roasted_chickpeas.png': require('./meals/roasted_chickpeas.png'),
  'satay_chicken.png': require('./meals/satay_chicken.png'),
  'schnitzel_plate_plate.png': require('./meals/schnitzel_plate_plate.png'),
  'schnitzel_roll.png': require('./meals/schnitzel_roll.png'),
  'scramble_stack.png': require('./meals/scramble_stack.png'),
  'shakshuka.png': require('./meals/shakshuka.png'),
  'sheet_pan_salmon_potatoes.png': require('./meals/sheet_pan_salmon_potatoes.png'),
  'sheet_pan_sausage_veg.png': require('./meals/sheet_pan_sausage_veg.png'),
  'smoked_salmon_bagel.png': require('./meals/smoked_salmon_bagel.png'),
  'spaghetti_carbonara.png': require('./meals/spaghetti_carbonara.png'),
  'spicy_chipotle_chicken_burrito.png': require('./meals/spicy_chipotle_chicken_burrito.png'),
  'spicy_chipotle_chicken_burrito_bowl.png': require('./meals/spicy_chipotle_chicken_burrito_bowl.png'),
  'spicy_chipotle_chicken_burrito_standard.png': require('./meals/spicy_chipotle_chicken_burrito_standard.png'),
  'steak_and_eggs.png': require('./meals/steak_and_eggs.png'),
  'steamed_mixed_veg.png': require('./meals/steamed_mixed_veg.png'),
  'steamed_rice.png': require('./meals/steamed_rice.png'),
  'strawberry_stack.png': require('./meals/strawberry_stack.png'),
  'strawbrekkie_beast.png': require('./meals/strawbrekkie_beast.png'),
  'teriyaki_chicken_rice_bowl.png': require('./meals/teriyaki_chicken_rice_bowl.png'),
  'thai_basil_chicken.png': require('./meals/thai_basil_chicken.png'),
  'thai_basil_chicken_over_rice_standard.png': require('./meals/thai_basil_chicken_over_rice_standard.png'),
  'thai_basil_chicken_with_fried_egg.png': require('./meals/thai_basil_chicken_with_fried_egg.png'),
  'trail_mix.png': require('./meals/trail_mix.png'),
  'tuna_pasta_bake.png': require('./meals/tuna_pasta_bake.png'),
  'tuna_pouch.png': require('./meals/tuna_pouch.png'),
  'turkey_meatballs_spaghetti.png': require('./meals/turkey_meatballs_spaghetti.png'),
};

/**
 * Returns the require()'d image source for a given image_filename, or undefined
 * if the filename is not registered. 
 */
export function getMealImage(filename: string | undefined): any | undefined {
  if (!filename) return undefined;
  
  // Keep the MISS warning permanently to catch data drift
  if (!MEAL_IMAGES[filename]) {
    console.warn('[getMealImage] MISS:', filename);
  }
  
  return MEAL_IMAGES[filename];
}

// DEV assertion to catch data/registry drift at build time
if (__DEV__) {
  // This will be populated by the validation script
  const ALL_DATA_FILENAMES = new Set();
  
  // Load and validate all data filenames at startup
  import('../data/curated_meals').then(({ CURATED_MEALS }) => {
    Object.values(CURATED_MEALS).forEach((meal: any) => {
      // Check base meal image_filename
      if (meal.image_filename) {
        ALL_DATA_FILENAMES.add(meal.image_filename);
        if (!MEAL_IMAGES[meal.image_filename]) {
          throw new Error(`REGISTRY DRIFT: Data references '${meal.image_filename}' but registry doesn't have this key. Update registry or fix data.`);
        }
      } else {
        console.warn(`[DEV] Meal '${meal.slug}' has undefined base image_filename - this will show placeholder in list view`);
      }
      
      // Check all plate image_filenames
      if (meal.plates) {
        meal.plates.forEach((plate: any) => {
          if (plate.image_filename) {
            ALL_DATA_FILENAMES.add(plate.image_filename);
            if (!MEAL_IMAGES[plate.image_filename]) {
              throw new Error(`REGISTRY DRIFT: Plate '${plate.display_name}' references '${plate.image_filename}' but registry doesn't have this key. Update registry or fix data.`);
            }
          }
        });
      }
    });
    
    console.log(`[DEV] Validated ${ALL_DATA_FILENAMES.size} unique image filenames against registry`);
  }).catch(err => {
    console.error('[DEV] Registry validation failed:', err);
  });
}

export { MEAL_IMAGES };

```

