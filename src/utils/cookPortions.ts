/**
 * Cook-flow portion bounds.
 *
 * Shared on purpose: the deep-link SENDER (the Meal-Prep Session "Cook N
 * servings" cards) and the RECEIVER (RecipeDetailScreen's Portions stepper)
 * must clamp to the same range, and buildPrepSession deliberately stays
 * UI-agnostic — it emits a raw `cookServings = max(1, round(Σ scale_factor))`,
 * and the clamp to a real UI range happens here, at the boundary.
 *
 * Raised from the old hard-coded 10 to 20: in a bulk a single meal can be eaten
 * 9+ times a week at scale >1 (13+ portions), so silently capping the week's
 * cook at 10 undershoots — worse than a tall stepper. 20 covers any realistic
 * weekly count and kills the "card says 13, stepper caps at 10" mismatch.
 *
 * If a preset ever lands exactly on MAX_COOK_PORTIONS, treat that as the rare
 * undershoot signal. True multi-batch ("cook 2 batches of an 8-serving recipe")
 * is a later refinement — intentionally not built yet.
 */

export const MIN_COOK_PORTIONS = 1;
export const MAX_COOK_PORTIONS = 20;

/**
 * Clamp any incoming value (a `servings` route param, or stepper arithmetic) to
 * a whole number of portions within [MIN_COOK_PORTIONS, MAX_COOK_PORTIONS].
 * Non-numeric / missing / non-finite input falls back to MIN_COOK_PORTIONS.
 */
export function clampCookPortions(value: unknown): number {
  const n = Math.round(Number(value));
  if (!isFinite(n)) return MIN_COOK_PORTIONS;
  return Math.min(MAX_COOK_PORTIONS, Math.max(MIN_COOK_PORTIONS, n));
}