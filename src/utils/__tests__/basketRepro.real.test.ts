// src/utils/__tests__/basketRepro.real.test.ts
//
// THE 20-MINUTE-BUILD REPLACEMENT. Runs the exact pick-time feasibility
// check the confirm sheet runs — real curated_meals, real curatedShelves,
// real target resolution — against a pasted snapshot of the on-device
// state, and prints the whole model so one jest run shows: the derived
// targets, which slots are pick-fed vs filler-fed, the per-day carb floors,
// and the verdict.
//
// TO REPRODUCE THE REPORTED BASKET, fill in FIXTURE below:
//   - answers / profile: your stats. The "targets match the report" test
//     fails loudly if they don't derive 2220–2450 kcal / 162 g protein
//     floor / 208–254 g weekly carbs, so a wrong guess can't silently test
//     a different user.
//   - favorites: paste the raw value of the '@nutrition_curated_favorites'
//     AsyncStorage key (the object with picks/slugs), or hand-write the
//     picks. Empty picks ⇒ the verdict tests skip and tell you so.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { CURATED_MEALS } from '../../data/curated_meals';
import {
  runBasketCheck,
  hydrateSelection,
  buildTabs,
  normalizeSelectedKeys,
  tabLabel,
  tabSlot,
} from '../basketCheck';
import { __internals } from '../mealFeasibility';
import type { GoalsProfile } from '../goalsProfile';

// ===========================================================================
// FIXTURE — the on-device state. Everything below the ruler is machinery.
// ===========================================================================

const FIXTURE = {
  // Stats that must derive the reported targets (see the first test):
  // kcal 2337 → band 2220–2454 · protein 180 → floor 162 · carbs 231 →
  // weekly band 208–254 · fat 77. The values here already do; swap in your
  // real ones — if they derive the same numbers, the tests don't care.
  // Real on-device data, dumped 2026-07-31 from the iOS simulator's
  // AsyncStorage (device 53CEE57F…, container A363E7CF…):
  //   - 'nutrition_questionnaire_results' (stats; resolveNutritionAnswers
  //     numifies the stored strings, mirrored here)
  //   - 'budget_cooking_questionnaire_results' (mealsPerDay/snack/dessert,
  //     merged in by resolveNutritionAnswers)
  answers: {
    gender: 'male',
    age: 28,
    height: 183, // cm
    weight: 82, // kg
    activityLevel: 'moderate',
    goal: 'lose_weight',
    dietType: 'high_protein',
    targetRatePercentage: 0.5,
    mealsPerDay: 4,
    snackFrequency: '2',
    dessertFrequency: 'once_per_week',
    allergies: [] as string[],
  } as any,

  // Real '@goals_profile' value, verbatim. NOTE: currentBodyFatPct is stored
  // as 183 (clearly corrupt — looks like the height) and goalWeightKg 90 is
  // ABOVE current weight. Kept as stored; do not sanitize.
  profile: {
    currentWeightKg: 82,
    currentBodyFatPct: 183,
    goalWeightKg: 90,
    goalBodyFatPct: 13,
    trainingState: 'consistent',
  } as GoalsProfile,

  // Raw '@nutrition_curated_favorites' value from the same dump (version 2),
  // verbatim minus fields the harness doesn't read (cuisines/likedDishes).
  favorites: {
    picks: [
      { slot: 'breakfast', slug: 'baked_oats', plate_id: 'standard' },
      { slot: 'breakfast', slug: 'banana_bulk' },
      { slot: 'breakfast', slug: 'big_breakfast_plate' },
      { slot: 'lunch', slug: 'pulled_pork', plate_id: 'pulled_pork' },
      { slot: 'lunch', slug: 'beef_broccoli_stir_fry' },
      { slot: 'lunch', slug: 'beef_bulgogi_bowl' },
      { slot: 'dinner', slug: 'pulled_pork', plate_id: 'pulled_pork' },
      { slot: 'dinner', slug: 'beef_broccoli_stir_fry' },
      { slot: 'dinner', slug: 'beef_bulgogi_bowl' },
      { slot: 'brunch', slug: 'baked_oats', plate_id: 'standard' },
      { slot: 'brunch', slug: 'banana_bulk' },
      { slot: 'brunch', slug: 'big_breakfast_plate' },
      { slot: 'snack', slug: 'baked_potato' },
      { slot: 'snack', slug: 'banana_snack' },
      { slot: 'snack', slug: 'banana_bulk' },
      { slot: 'dessert', slug: 'chocolate_protein_mousse' },
      { slot: 'dessert', slug: 'chocolate_protein_mug_cake' },
      { slot: 'dessert', slug: 'cottage_cheese_ice_cream' },
      { slot: 'snack', slug: 'dark_chocolate', plate_id: 'standard' },
    ] as { slot: string; slug: string; plate_id?: string }[],
    slugs: [
      'baked_oats',
      'banana_bulk',
      'big_breakfast_plate',
      'pulled_pork',
      'beef_broccoli_stir_fry',
      'beef_bulgogi_bowl',
      'baked_potato',
      'banana_snack',
      'chocolate_protein_mousse',
      'chocolate_protein_mug_cake',
      'cottage_cheese_ice_cream',
      'dark_chocolate',
    ] as string[], // legacy mirror — as stored; hydration handles it
    avoid: [] as string[],
  },
};

// ===========================================================================

const ALL = Object.values(CURATED_MEALS) as any[];

function scopedKeys(): string[] {
  const tabs = buildTabs(
    FIXTURE.answers.mealsPerDay,
    FIXTURE.answers.snackFrequency,
    FIXTURE.answers.dessertFrequency,
    ALL
  );
  return Array.from(
    hydrateSelection(FIXTURE.favorites.picks as any, FIXTURE.favorites.slugs, tabs, ALL)
  );
}

describe('targets match the report', () => {
  it('derives 2220–2450 kcal · 162 g protein floor · 208–254 g weekly carbs from the fixture stats', () => {
    const { targets } = runBasketCheck({
      answers: FIXTURE.answers,
      goalsProfile: FIXTURE.profile,
      selectedKeys: [],
      allMeals: ALL,
    });
    expect(targets).not.toBeNull();
    const t = targets!;
    const derived = {
      kcal: t.kcal,
      kcalLo: Math.round(t.kcal * 0.95),
      kcalHi: Math.round(t.kcal * 1.05),
      proteinFloor: Math.round(t.protein_g * 0.9),
      carbsLo: Math.round((t.carbs_g ?? 0) * 0.9),
      carbsHi: Math.round((t.carbs_g ?? 0) * 1.1),
      fat: t.fat_g,
    };
    // eslint-disable-next-line no-console
    console.log('[repro] derived targets:', derived);
    expect(derived.kcalLo).toBe(2220);
    expect(derived.proteinFloor).toBe(162);
    expect(derived.carbsLo).toBe(208);
    expect(derived.carbsHi).toBe(254);
    // kcalHi lands at 2454 from kcal 2337; the report's "2450" was rounded.
    expect(Math.abs(derived.kcalHi - 2450)).toBeLessThanOrEqual(5);
  });
});

const havePicks =
  FIXTURE.favorites.picks.length > 0 || FIXTURE.favorites.slugs.length > 0;

(havePicks ? describe : describe.skip)('the saved basket', () => {
  it('prints the full model and fires the heads-up (carbs ceiling)', () => {
    const keys = scopedKeys();
    const result = runBasketCheck({
      answers: FIXTURE.answers,
      goalsProfile: FIXTURE.profile,
      selectedKeys: keys,
      allMeals: ALL,
      avoid: FIXTURE.favorites.avoid,
    });
    const { targets, tabs, slotSpecs, verdict } = result;

    // ---- diagnostic dump: what the engine actually modelled ----
    const normalized = normalizeSelectedKeys(keys);
    const bySlot = new Map<string, number>();
    for (const k of normalized) {
      const i = k.indexOf('|');
      if (i === -1) continue;
      const slot = k.slice(0, i);
      bySlot.set(slot, (bySlot.get(slot) ?? 0) + 1);
    }
    // eslint-disable-next-line no-console
    console.log(
      '[repro] slots:',
      tabs
        .map((t) => {
          const id = tabSlot(t);
          const n = bySlot.get(id) ?? 0;
          return `${tabLabel(t)}(${id}): ${n > 0 ? `${n} pick key(s)` : 'FILLER-FED'}`;
        })
        .join(' · ')
    );

    const week = __internals.buildWeek(slotSpecs, normalized, ALL);
    if (week && targets?.carbs_g) {
      const kLo = 0.95 * targets.kcal;
      let weeklyCarbMin = 0;
      for (const [day, count] of week.dayTypes) {
        if (count <= 0 || day.length === 0) continue;
        const { lo, hi } = __internals.kcalBounds(day);
        const dMin = __internals.minAxisAtKcal(day, (o: any) => o.c, lo > kLo ? lo : kLo);
        weeklyCarbMin += count * dMin;
        // eslint-disable-next-line no-console
        console.log(
          `[repro] day×${count}: kcal bounds ${lo.toFixed(0)}–${hi.toFixed(0)}, ` +
            `min carbs ${dMin.toFixed(1)} g (ceiling ${(targets.carbs_g * 1.1).toFixed(1)})`
        );
      }
      // eslint-disable-next-line no-console
      console.log(
        `[repro] weekly carb minimum ${weeklyCarbMin.toFixed(0)} g vs ceiling ` +
          `${(7 * targets.carbs_g * 1.1).toFixed(0)} g ` +
          `(daily-eq ${(weeklyCarbMin / 7).toFixed(1)} vs ${(targets.carbs_g * 1.1).toFixed(1)})`
      );
    }
    // eslint-disable-next-line no-console
    console.log(
      '[repro] verdict:',
      verdict === null
        ? 'null — check skipped (targets or structure unresolvable)'
        : verdict.feasible
        ? 'FEASIBLE — heads-up stays quiet'
        : `INFEASIBLE — ${verdict.failures
            .map((f) => `${f.axis} ${f.direction} gap ${f.gap.toFixed(1)}`)
            .join('; ')} | fixes: ${
            verdict.fixes.map((f) => `${f.name} → ${f.slotLabel}`).join(', ') || '(none)'
          }`
    );

    // ---- the assertion the device build was for ----
    expect(verdict).not.toBeNull();
    expect(verdict!.feasible).toBe(false);
    expect(
      verdict!.failures.some((f) => f.axis === 'carbs' && f.direction === 'ceiling')
    ).toBe(true);
  });
});