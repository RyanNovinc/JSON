import { INGREDIENTS } from '../data/ingredients';
import {
  CuratedMeal,
  Plate,
  CookingMethod,
  MealIngredient,
  BaseMacros,
} from '../types/curated_meals';
import { resolveBaseIngredients } from './resolveMealIngredients';

const ZERO = (): BaseMacros => ({ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });

/**
 * Grams for one ingredient line. CONVERT THE CANONICAL UNIT TO GRAMS FIRST —
 * macros are always per 100g, never per ml / count / tsp.
 *
 *   grams = base_amount × grams_per_canonical_unit
 */
export function ingredientGrams(line: MealIngredient): number {
  const row = INGREDIENTS[line.ingredient_id];
  if (!row) throw new Error(`computeMacros: unknown ingredient_id "${line.ingredient_id}"`);
  return line.base_amount * (row.grams_per_canonical_unit ?? 1);
}

/**
 * Macros contributed by one ingredient line, per the per-100g model.
 * `is_pantry_negligible` rows contribute ZERO to macro totals (their amount is
 * still rendered in method / cook-mode steps — that happens elsewhere).
 */
export function ingredientMacros(line: MealIngredient): BaseMacros {
  const row = INGREDIENTS[line.ingredient_id];
  if (!row) throw new Error(`computeMacros: unknown ingredient_id "${line.ingredient_id}"`);
  if (row.is_pantry_negligible) return ZERO();
  const m = row.macros_per_100g;
  if (!m) throw new Error(`computeMacros: ingredient "${line.ingredient_id}" has no macros_per_100g`);
  const f = ingredientGrams(line) / 100;
  return {
    kcal: m.kcal * f,
    protein_g: m.protein_g * f,
    carbs_g: m.carbs_g * f,
    fat_g: m.fat_g * f,
    fiber_g: m.fiber_g * f,
  };
}

function accumulate(lines: MealIngredient[] | undefined): BaseMacros {
  const acc = ZERO();
  for (const line of lines ?? []) {
    const m = ingredientMacros(line);
    acc.kcal += m.kcal;
    acc.protein_g += m.protein_g;
    acc.carbs_g += m.carbs_g;
    acc.fat_g += m.fat_g;
    acc.fiber_g += m.fiber_g;
  }
  return acc;
}

/**
 * True macros for one plate, cooked via one method — resolved from ingredients,
 * NOT from the authored `plate_macros` literal.
 *
 *   plate = base recipe share + plate accompaniments
 *     base share      = Σ method.ingredients × base_serving_multiplier / produces_servings
 *     accompaniments  = Σ plate.additional_ingredients   (absolute, per plate)
 *
 * The cooking METHOD contributes zero as a *process*: no evaporation, reduction,
 * or oil-absorption modelling — only ingredient masses count.
 *
 * The base-recipe ingredient list is resolved through resolveBaseIngredients():
 *   - LEGACY meals: it returns method.ingredients (byte-identical to the old
 *     direct read — so every legacy plate's macros are unchanged).
 *   - TEMPLATE meals (sauce axis): method.ingredients is [] and the real base is
 *     base_ingredients + the selected sauce variant (jar default, or `variantId`).
 *     Method choice moves nothing; the jar↔scratch toggle does.
 *
 * REPO SEMANTICS PRESERVED: the plate share multiplies the ACCUMULATED base
 * (`(Σ base) × share`), and plate additions are added unscaled — exactly as
 * before. We do NOT scale each base line individually (as resolveMealIngredients'
 * scaleShare would), because `Σ(mᵢ × share)` reorders the float sum vs
 * `(Σ mᵢ) × share` and would perturb the ~64 meals with produces_servings > 1.
 * Fixed rows therefore scale with the plate share here just as they always have.
 */
export function computePlateMacros(
  meal: CuratedMeal,
  plate: Plate,
  method: CookingMethod,
  variantId?: string,
): BaseMacros {
  const base = accumulate(resolveBaseIngredients(meal, { methodId: method.id, variantId }));
  const share = plate.base_serving_multiplier / (meal.produces_servings || 1);
  const add = accumulate(plate.additional_ingredients);
  return {
    kcal: base.kcal * share + add.kcal,
    protein_g: base.protein_g * share + add.protein_g,
    carbs_g: base.carbs_g * share + add.carbs_g,
    fat_g: base.fat_g * share + add.fat_g,
    fiber_g: base.fiber_g * share + add.fiber_g,
  };
}
