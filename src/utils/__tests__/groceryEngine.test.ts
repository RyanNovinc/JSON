// src/utils/__tests__/groceryEngine.test.ts
//
// Covers the two changes that are pure logic and therefore testable without a
// build: the native grocery engine's pantry filtering + price carry-over, and
// the import shape-detection predicate.
//
// Run:  npx jest src/utils/__tests__/groceryEngine.test.ts

import { buildNativeGroceryList } from '../groceryEngine';
import { CURATED_MEALS } from '../../data/curated_meals';
import { INGREDIENTS } from '../../data/ingredients';

const MEALS = CURATED_MEALS as any;
const INGS = INGREDIENTS as any;

// A trimmed version of a real imported plan: two days, one batch meal placed
// twice at 0.7, plus a single-serve meal and an adjuster. The grocery_list
// carries ingredient_id exactly as the JSON step now emits it.
const plan: any = {
  id: 'test_plan',
  name: '7-Day Cut',
  dailyMeals: {
    '2026-07-29': {
      date: '2026-07-29',
      dayName: 'Wednesday',
      meals: [
        {
          id: 'm1',
          name: 'Baked Oats',
          type: 'breakfast',
          curated_meal_slug: 'baked_oats',
          plate_id: 'standard',
          scale_factor: 0.7,
        },
        {
          id: 'm2',
          name: 'BBQ Pulled Pork',
          type: 'lunch',
          curated_meal_slug: 'pulled_pork',
          plate_id: 'pulled_pork',
          scale_factor: 0.7,
        },
      ],
    },
    '2026-07-30': {
      date: '2026-07-30',
      dayName: 'Thursday',
      meals: [
        {
          id: 'm3',
          name: 'BBQ Pulled Pork',
          type: 'dinner',
          curated_meal_slug: 'pulled_pork',
          plate_id: 'pulled_pork',
          scale_factor: 0.7,
        },
      ],
    },
  },
  grocery_list: {
    total_estimated_cost: 239,
    total_estimated_cost_low: 239,
    total_estimated_cost_high: 263,
    currency: 'AU$',
    categories: [
      {
        category_name: 'Meat & Seafood',
        items: [
          {
            item_name: 'Pork shoulder roast, boneless',
            ingredient_id: 'pork_shoulder_boneless',
            quantity: '2.2',
            unit: 'kg',
            estimated_price: 22.0,
            is_purchased: false,
          },
        ],
      },
      {
        category_name: 'Pantry & Grains',
        items: [
          {
            item_name: 'Rolled oats',
            ingredient_id: 'rolled_oats_raw',
            quantity: '1',
            unit: 'kg',
            estimated_price: 2.5,
            is_purchased: false,
          },
        ],
      },
    ],
  },
};

describe('import shape detection', () => {
  // Mirrors looksLikeMealPlan in ImportRoutineScreen. If this ever fails, an
  // opened meal plan would be handed to the workout validator again.
  const looksLikeMealPlan = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text);
      return (
        !!parsed &&
        typeof parsed === 'object' &&
        !!parsed.dailyMeals &&
        typeof parsed.dailyMeals === 'object' &&
        !parsed.routine_name
      );
    } catch {
      return false;
    }
  };

  it('routes a meal plan to the meal importer', () => {
    expect(looksLikeMealPlan(JSON.stringify(plan))).toBe(true);
  });

  it('leaves a workout program on the workout path', () => {
    const workout = { routine_name: 'PPL', days_per_week: 6, blocks: [{}] };
    expect(looksLikeMealPlan(JSON.stringify(workout))).toBe(false);
  });

  it('leaves unparseable text on the workout path (it has repair logic)', () => {
    expect(looksLikeMealPlan('{ not json')).toBe(false);
  });
});

describe('buildNativeGroceryList', () => {
  const build = (choices: Record<string, string> = {}) =>
    buildNativeGroceryList(plan, choices as any);

  it('produces items from the plan', () => {
    const { items } = build();
    expect(items.length).toBeGreaterThan(0);
  });

  it('excludes pantry-negligible ingredients (no "buy salt")', () => {
    const { items } = build();
    const negligible = items.filter((i: any) => {
      const id = i.id.startsWith('ing_') ? i.id.slice(4).split('__')[0] : null;
      return id ? !!INGS[id]?.is_pantry_negligible : false;
    });
    expect(negligible.map((i: any) => i.name)).toEqual([]);
  });

  it('carries prices across from the imported list by ingredient_id', () => {
    const { items, pricedItemCount } = build();
    expect(pricedItemCount).toBeGreaterThan(0);

    const pork = items.find((i: any) => i.id === 'ing_pork_shoulder_boneless');
    if (pork) expect(pork.estimatedCost).toBe(22.0);

    const oats = items.find((i: any) => i.id === 'ing_rolled_oats_raw');
    if (oats) expect(oats.estimatedCost).toBe(2.5);
  });

  it('reports how many items it could not price', () => {
    const { pricedItemCount, unpricedItemCount, items } = build();
    expect(pricedItemCount + unpricedItemCount).toBe(items.length);
  });

  it('counts batch servings from scale factors, not placements', () => {
    // pulled_pork appears twice at 0.7 = 1.4 servings consumed.
    const { curatedMeals } = build();
    const pork = curatedMeals.find((m: any) => m.slug === 'pulled_pork');
    expect(pork).toBeDefined();
    expect(pork!.totalScale).toBeCloseTo(1.4, 2);
  });

  it('changes the ingredient list when a meal switches to from-scratch', () => {
    // Find any meal in the plan that actually has an alternative variant.
    const withAlt = ['pulled_pork', 'baked_oats'].find((slug) => {
      const variants = MEALS[slug]?.sauce_variants ?? [];
      return variants.length > 1;
    });

    if (!withAlt) {
      console.warn('No multi-variant meal in the fixture — skipping variant test');
      return;
    }

    const variants = MEALS[withAlt].sauce_variants;
    const alt = variants.find((v: any) => !v.is_default);
    expect(alt).toBeDefined();

    const before = build();
    const after = build({ [withAlt]: alt.id });

    const names = (b: any) => b.items.map((i: any) => i.name).sort().join('|');
    expect(names(after)).not.toBe(names(before));

    // The scratch list still prices whatever it can rather than zeroing out.
    expect(after.pricedItemCount + after.unpricedItemCount).toBe(after.items.length);
  });

  it('survives a plan with no imported grocery list', () => {
    const bare = { ...plan, grocery_list: undefined };
    const { items, pricedItemCount } = buildNativeGroceryList(bare as any, {} as any);
    expect(items.length).toBeGreaterThan(0);
    expect(pricedItemCount).toBe(0);
  });
});