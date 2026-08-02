// src/utils/__tests__/variantAudit.test.ts
//
// Diagnostic, not an assertion. Prints (a) which meals carry a from-scratch
// sauce_variant, and (b) what ingredients each meal actually resolves to —
// because a meal with no resolvable ingredients gets no table in the generation
// prompt, which leaves the AI to improvise that item on the grocery list.
//
// Run:  npx jest src/utils/__tests__/variantAudit.test.ts

import { CURATED_MEALS } from '../../data/curated_meals';
import { INGREDIENTS } from '../../data/ingredients';
import { resolveBaseIngredients } from '../resolveMealIngredients';

const MEALS = CURATED_MEALS as any;
const INGS = INGREDIENTS as any;

const PLAN_SLUGS = [
  'baked_oats',
  'baked_potato',
  'pulled_pork',
  'beef_broccoli_stir_fry',
  'beef_bulgogi_bowl',
  'tuna_pouch',
  'steamed_mixed_veg',
  'berries',
  'chocolate_protein_mug_cake',
];

// Every adjuster with a curated reference — these are the ones the prompt now
// emits tables for, and the ones most likely to be one-ingredient stubs.
const ADJUSTER_SLUGS = [
  'protein_shake',
  'greek_yogurt_snack',
  'tuna_pouch',
  'beef_jerky',
  'hard_boiled_eggs',
  'protein_bar',
  'cheese_snack',
  'mixed_nuts',
  'banana_snack',
  'steamed_rice',
  'steamed_mixed_veg',
  'baked_potato',
  'berries',
];

const describeMeal = (slug: string): string => {
  const meal = MEALS[slug];
  if (!meal) return `${slug}: NOT FOUND IN CURATED_MEALS`;

  let rows: any[] = [];
  let err = '';
  try {
    rows = resolveBaseIngredients(meal) ?? [];
  } catch (e: any) {
    err = ` (threw: ${e?.message})`;
  }

  const shown = rows.map((r: any) => {
    const meta = INGS[r.ingredient_id];
    const neg = meta?.is_pantry_negligible ? ' [PANTRY-NEGLIGIBLE, hidden]' : '';
    const known = meta ? '' : ' [NOT IN INGREDIENTS]';
    return `      ${r.ingredient_id} ${r.base_amount}${r.unit}${neg}${known}`;
  });

  const visible = rows.filter((r: any) => !INGS[r.ingredient_id]?.is_pantry_negligible).length;
  const flag = visible === 0 ? '  <-- NO TABLE EMITTED' : '';

  return `${slug}: ${rows.length} row(s), ${visible} visible${flag}${err}\n${shown.join('\n')}`;
};

describe('curated meal audit', () => {
  it('variants for the meals in this plan', () => {
    const rows = PLAN_SLUGS.map((slug) => {
      const meal = MEALS[slug];
      if (!meal) return `${slug}: NOT FOUND`;
      const variants = meal.sauce_variants ?? [];
      return `${slug}: ${variants.length} variant(s)`;
    });
    console.log('\n=== VARIANTS ===\n' + rows.join('\n'));
    expect(true).toBe(true);
  });

  it('ingredients for the meals in this plan', () => {
    console.log('\n=== PLAN MEAL INGREDIENTS ===\n' + PLAN_SLUGS.map(describeMeal).join('\n'));
    expect(true).toBe(true);
  });

  it('ingredients for every adjuster', () => {
    console.log('\n=== ADJUSTER INGREDIENTS ===\n' + ADJUSTER_SLUGS.map(describeMeal).join('\n'));

    const empty = ADJUSTER_SLUGS.filter((s) => {
      const meal = MEALS[s];
      if (!meal) return true;
      try {
        const rows = resolveBaseIngredients(meal) ?? [];
        return rows.filter((r: any) => !INGS[r.ingredient_id]?.is_pantry_negligible).length === 0;
      } catch {
        return true;
      }
    });
    console.log(
      `\nAdjusters that would get NO ingredient table: ${empty.length}` +
        (empty.length ? ` — ${empty.join(', ')}` : ' — none, all good')
    );
    expect(true).toBe(true);
  });
});