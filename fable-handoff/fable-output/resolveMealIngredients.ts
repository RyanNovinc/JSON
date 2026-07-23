// src/utils/resolveMealIngredients.ts — NEW FILE
// Task 1 Phase C: the ONE path that answers "what ingredients is the user
// actually cooking/eating for this meal, on this plate, with this variant?"
//
// Consumers to wire onto this (repo-side, Phase C):
//   - computePlateMacros() — replace its direct method.ingredients read
//   - shopping list builder
//   - meal detail / cook mode (ingredients list + steps via resolveMealInstructions)
//
// Legacy meals (no base_ingredients/sauce_variants) fall back to
// method.ingredients unchanged, so the 70-meal migration can land one meal at
// a time without breaking the rest of the catalogue.

import {
  CuratedMeal,
  MealIngredient,
  RecipeStep,
  SauceVariant,
} from '../types/curated_meals';

export interface ResolveOptions {
  plateId: string;
  /** Omit to get the default (jar/shortcut) variant. Ignored for legacy meals. */
  variantId?: string;
  /**
   * Only used by the LEGACY fallback (legacy meals key ingredients on the
   * method). Template meals are method-invariant by construction.
   */
  methodId?: string;
}

export interface ResolvedIngredients {
  ingredients: MealIngredient[];
  /** The variant that was resolved (template meals only). */
  variant?: SauceVariant;
  source: 'template' | 'legacy';
}

export function isTemplateMeal(meal: CuratedMeal): boolean {
  return !!(meal.base_ingredients && meal.sauce_variants && meal.sauce_variants.length > 0);
}

export function getDefaultVariant(meal: CuratedMeal): SauceVariant | undefined {
  return meal.sauce_variants?.find(v => v.is_default) ?? meal.sauce_variants?.[0];
}

/**
 * Scaling note: base/method amounts are authored for the FULL base recipe
 * (produces_servings servings). A plate consumes
 * base_serving_multiplier / produces_servings of that. This helper applies
 * that share to ALL scaling types, matching the plain reading of
 * "this plate uses 1.5 servings' worth of the base". If the repo's
 * computePlateMacros treats 'fixed' rows differently at fractional shares,
 * align THERE — the macro divergence test is the arbiter. For butter_chicken
 * (produces_servings 1, multiplier 1.0) this is a no-op either way.
 */
function scaleShare(list: MealIngredient[], share: number): MealIngredient[] {
  if (share === 1) return [...list];
  return list.map(i => ({ ...i, base_amount: i.base_amount * share }));
}

export function resolveMealIngredients(
  meal: CuratedMeal,
  opts: ResolveOptions
): ResolvedIngredients {
  const plate = meal.plates.find(p => p.id === opts.plateId);
  if (!plate) {
    throw new Error(`[resolveMealIngredients] ${meal.slug}: unknown plate '${opts.plateId}'`);
  }
  const share = plate.base_serving_multiplier / (meal.produces_servings || 1);

  if (isTemplateMeal(meal)) {
    const variant = opts.variantId
      ? meal.sauce_variants!.find(v => v.id === opts.variantId)
      : getDefaultVariant(meal);
    if (!variant) {
      throw new Error(
        `[resolveMealIngredients] ${meal.slug}: unknown variant '${opts.variantId}'`
      );
    }
    return {
      ingredients: [
        ...scaleShare(meal.base_ingredients!, share),
        ...scaleShare(variant.ingredients, share),
        ...plate.additional_ingredients, // authored per plate, no share applied
      ],
      variant,
      source: 'template',
    };
  }

  // Legacy fallback: ingredients keyed on the method, exactly as today.
  const method = opts.methodId
    ? meal.methods.find(m => m.id === opts.methodId)
    : meal.methods[0];
  if (!method) {
    throw new Error(
      `[resolveMealIngredients] ${meal.slug}: unknown method '${opts.methodId}'`
    );
  }
  return {
    ingredients: [
      ...scaleShare(method.ingredients, share),
      ...plate.additional_ingredients,
    ],
    source: 'legacy',
  };
}

/**
 * Steps for (method × variant). Template meals read the variant's
 * method-keyed map; legacy meals read method.instructions as today.
 * Plate.additional_instructions are appended by the caller as before
 * (day-of / assembly boundary is unchanged for buildPrepSession).
 */
export function resolveMealInstructions(
  meal: CuratedMeal,
  methodId: string,
  variantId?: string
): RecipeStep[] {
  if (isTemplateMeal(meal)) {
    const variant = variantId
      ? meal.sauce_variants!.find(v => v.id === variantId)
      : getDefaultVariant(meal);
    return variant?.instructions[methodId] ?? [];
  }
  return meal.methods.find(m => m.id === methodId)?.instructions ?? [];
}

/** Method ids a variant is actually offered on (key presence = availability). */
export function methodsForVariant(meal: CuratedMeal, variantId: string): string[] {
  const variant = meal.sauce_variants?.find(v => v.id === variantId);
  if (!variant) return [];
  return meal.methods.map(m => m.id).filter(id => id in variant.instructions);
}
