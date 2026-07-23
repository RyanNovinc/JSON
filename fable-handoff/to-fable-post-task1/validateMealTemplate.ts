// src/utils/validateMealTemplate.ts — NEW FILE
// Task 1 Phase A: template invariant guard. Wire into the existing boot-time
// curated_meals validation (CLAUDE.md gotcha 4: a bad meal edit crashes at
// launch — these checks should run in that same pass).
//
// Returns [] for valid meals, including all legacy meals (no template fields).

import { CuratedMeal } from '../types/curated_meals';

export function validateMealTemplate(meal: CuratedMeal): string[] {
  const errors: string[] = [];
  const hasBase = !!meal.base_ingredients;
  const hasVariants = !!(meal.sauce_variants && meal.sauce_variants.length > 0);

  // Legacy meal: no template fields at all is fine.
  if (!hasBase && !hasVariants) return errors;

  if (hasBase !== hasVariants) {
    errors.push(
      `${meal.slug}: base_ingredients and sauce_variants must be present together`
    );
    return errors;
  }

  const variants = meal.sauce_variants!;

  // Unique variant ids
  const ids = variants.map(v => v.id);
  if (new Set(ids).size !== ids.length) {
    errors.push(`${meal.slug}: duplicate sauce_variant ids: ${ids.join(', ')}`);
  }

  // Exactly one default, and the default is the shortcut with zero extra time.
  const defaults = variants.filter(v => v.is_default);
  if (defaults.length !== 1) {
    errors.push(`${meal.slug}: expected exactly 1 default variant, found ${defaults.length}`);
  } else {
    const d = defaults[0];
    if (d.shortcut_level !== 'shortcut') {
      errors.push(
        `${meal.slug}: default variant '${d.id}' must be shortcut_level 'shortcut' — scratch is never the default`
      );
    }
    if (d.extra_active_minutes !== 0) {
      errors.push(
        `${meal.slug}: default variant '${d.id}' must have extra_active_minutes 0`
      );
    }
    // Default variant must run on every method.
    for (const m of meal.methods) {
      if (!(m.id in d.instructions)) {
        errors.push(
          `${meal.slug}: default variant '${d.id}' has no instructions for method '${m.id}'`
        );
      }
    }
  }

  // THE GUARD: base ∩ any variant must be empty by ingredient_id.
  // (Ryan's rule: variants are additive and self-contained, never subtractive.
  //  Cream lives inside each variant, so it must not also live in base.)
  const baseIds = new Set(meal.base_ingredients!.map(i => i.ingredient_id));
  for (const v of variants) {
    const overlap = v.ingredients
      .map(i => i.ingredient_id)
      .filter(id => baseIds.has(id));
    if (overlap.length > 0) {
      errors.push(
        `${meal.slug}: ingredient(s) in both base and variant '${v.id}': ${overlap.join(', ')}`
      );
    }
  }

  // Methods carry zero ingredients and zero steps on template meals —
  // otherwise macros silently double-count and steps have two sources of truth.
  for (const m of meal.methods) {
    if (m.ingredients.length > 0) {
      errors.push(
        `${meal.slug}: template meal method '${m.id}' must have ingredients: [] (found ${m.ingredients.length})`
      );
    }
    if (m.instructions.length > 0) {
      errors.push(
        `${meal.slug}: template meal method '${m.id}' must have instructions: [] — steps live on the variant`
      );
    }
  }

  // Every variant instruction key must reference a real method.
  const methodIds = new Set(meal.methods.map(m => m.id));
  for (const v of variants) {
    for (const key of Object.keys(v.instructions)) {
      if (!methodIds.has(key)) {
        errors.push(
          `${meal.slug}: variant '${v.id}' has instructions for unknown method '${key}'`
        );
      }
    }
  }

  return errors;
}
