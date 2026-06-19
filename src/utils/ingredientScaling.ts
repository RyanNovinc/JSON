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
export type DiscreteUnit = 'count' | 'cloves';

/**
 * Every unit observed in curated_meals.ts: g, ml, tsp, tbsp, count, cloves.
 * kg and l are included for forward-compatibility with the canonical unit enum
 * (src/types/ingredients.ts) but do not currently appear in the data.
 */
export type ScalableUnit = MassVolumeUnit | SeasoningUnit | DiscreteUnit;

const MASS_VOLUME = new Set<string>(['g', 'ml', 'kg', 'l']);
const SEASONING = new Set<string>(['tsp', 'tbsp']);
const DISCRETE = new Set<string>(['count', 'cloves']);

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
  return qty;
}

/** Whole discrete: count -> bare number (caller appends the noun). cloves -> "N clove(s)". */
function formatDiscrete(n: number, unit: string): string {
  if (unit === 'cloves') {
    return n === 1 ? '1 clove' : `${n} cloves`;
  }
  return `${n}`;
}

/** "2.00" -> "2", "2.50" -> "2.5", "2.05" -> "2.05". */
function stripTrailingZeros(s: string): string {
  return s.replace(/\.?0+$/, '');
}