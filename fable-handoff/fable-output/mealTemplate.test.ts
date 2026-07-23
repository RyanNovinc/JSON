// src/utils/__tests__/mealTemplate.test.ts — NEW FILE
// Guards the sauce-axis template invariants. Complements the existing macro
// divergence test (which should be extended to route template meals through
// resolveMealIngredients when recomputing plate_macros).

import { validateMealTemplate } from '../validateMealTemplate';
import {
  resolveMealIngredients,
  resolveMealInstructions,
  isTemplateMeal,
} from '../resolveMealIngredients';
import { CURATED_MEALS } from '../../data/curated_meals';
import { CuratedMeal, MealIngredient } from '../../types/curated_meals';

const ing = (
  ingredient_id: string,
  base_amount: number,
  unit: any = 'g',
  scaling: any = 'scales'
): MealIngredient => ({ ingredient_id, base_amount, unit, scaling });

const templateFixture = (overrides: Partial<CuratedMeal> = {}): CuratedMeal =>
  ({
    slug: 'test_meal',
    display_name: 'Test',
    cuisine: 'indian',
    primary_protein: 'chicken',
    produces_servings: 1,
    eligible_slots: ['dinner'],
    min_scale: 1,
    max_scale: 1,
    contains_allergens: [],
    flex_ingredient_id: 'basmati_rice_dry',
    base_ingredients: [ing('chicken_thigh_skinless', 200)],
    sauce_variants: [
      {
        id: 'jar',
        display_name: 'Jar',
        shortcut_level: 'shortcut',
        is_default: true,
        extra_active_minutes: 0,
        ingredients: [ing('butter_chicken_jar_sauce', 200)],
        instructions: { stovetop: [{ summary: 's', substeps: ['s'] }] },
      },
    ],
    methods: [
      {
        id: 'stovetop',
        display_name: 'Stovetop',
        time_active_minutes: 10,
        time_total_minutes: 15,
        skill_min: 1,
        shortcut_level: 'shortcut',
        ingredients: [],
        instructions: [],
      },
    ],
    plates: [
      {
        id: 'standard',
        display_name: 'Standard',
        description: '',
        base_serving_multiplier: 1,
        additional_ingredients: [ing('basmati_rice_dry', 60)],
        additional_instructions: [],
        assembly_time_minutes: 0,
        plate_macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
      },
    ],
    ...overrides,
  } as CuratedMeal);

describe('validateMealTemplate', () => {
  it('passes all current catalogue meals (legacy meals validate as no-ops)', () => {
    for (const meal of Object.values(CURATED_MEALS)) {
      expect(validateMealTemplate(meal)).toEqual([]);
    }
  });

  it('rejects an ingredient present in both base and a variant', () => {
    const bad = templateFixture();
    bad.sauce_variants![0].ingredients.push(ing('chicken_thigh_skinless', 50));
    const errors = validateMealTemplate(bad);
    expect(errors.some(e => e.includes('chicken_thigh_skinless'))).toBe(true);
  });

  it('rejects a scratch default', () => {
    const bad = templateFixture();
    bad.sauce_variants![0].shortcut_level = 'scratch';
    expect(validateMealTemplate(bad).length).toBeGreaterThan(0);
  });

  it('rejects template methods that still carry ingredients', () => {
    const bad = templateFixture();
    bad.methods[0].ingredients = [ing('olive_oil', 10)];
    expect(
      validateMealTemplate(bad).some(e => e.includes("ingredients: []"))
    ).toBe(true);
  });

  it('rejects a default variant missing a method', () => {
    const bad = templateFixture();
    bad.methods.push({ ...bad.methods[0], id: 'slow_cooker', display_name: 'SC' });
    expect(
      validateMealTemplate(bad).some(e => e.includes('slow_cooker'))
    ).toBe(true);
  });
});

describe('resolveMealIngredients', () => {
  it('template path: base + default variant + plate additions', () => {
    const meal = templateFixture();
    const { ingredients, source } = resolveMealIngredients(meal, {
      plateId: 'standard',
    });
    expect(source).toBe('template');
    expect(ingredients.map(i => i.ingredient_id)).toEqual([
      'chicken_thigh_skinless',
      'butter_chicken_jar_sauce',
      'basmati_rice_dry',
    ]);
  });

  it('legacy path: falls back to method.ingredients unchanged', () => {
    const legacy = templateFixture({
      base_ingredients: undefined,
      sauce_variants: undefined,
    });
    legacy.methods[0].ingredients = [ing('chicken_thigh_skinless', 200)];
    const { ingredients, source } = resolveMealIngredients(legacy, {
      plateId: 'standard',
      methodId: 'stovetop',
    });
    expect(source).toBe('legacy');
    expect(ingredients.map(i => i.ingredient_id)).toEqual([
      'chicken_thigh_skinless',
      'basmati_rice_dry',
    ]);
  });

  it('is method-invariant for template meals (no methodId consumed)', () => {
    const meal = templateFixture();
    const a = resolveMealIngredients(meal, { plateId: 'standard' });
    const b = resolveMealIngredients(meal, { plateId: 'standard', methodId: 'anything' });
    expect(a.ingredients).toEqual(b.ingredients);
  });

  it('resolveMealInstructions reads variant steps keyed by method', () => {
    const meal = templateFixture();
    expect(resolveMealInstructions(meal, 'stovetop')).toHaveLength(1);
    expect(resolveMealInstructions(meal, 'nonexistent')).toHaveLength(0);
  });

  it('isTemplateMeal distinguishes migrated from legacy', () => {
    expect(isTemplateMeal(templateFixture())).toBe(true);
    expect(
      isTemplateMeal(
        templateFixture({ base_ingredients: undefined, sauce_variants: undefined })
      )
    ).toBe(false);
  });
});
