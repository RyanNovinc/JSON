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
import { sanitizeGoalsProfile } from '../goalsProfileStorage';
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

  // The '@goals_profile' value, adjusted 2026-08-08. See the note below.
  //
  // The verbatim on-device value was:
  //   { currentWeightKg: 82, currentBodyFatPct: 183, goalWeightKg: 90, ... }
  // — body fat stored as 183 (the user's height, typed into the body-fat box)
  // and a goal weight ABOVE current weight, while their questionnaire answer
  // said 'lose_weight'.
  //
  // That profile used to derive 'cut', but only because the OLD derivePhase let
  // a body-fat comparison override the goal-weight direction. That override was
  // itself the bug fixed on 2026-08-08: a user asking to gain 8 kg was being put
  // in a deficit. Under the corrected rules the same profile derives lean_bulk,
  // targets rise from ~2337 to ~2977 kcal, and this basket comes out feasible —
  // so the reproduction stopped reproducing anything.
  //
  // The fix is to state the case the report was actually about — a user on a cut
  // with these targets — rather than reconstruct it out of a derivation bug.
  // The numbers are unchanged by design: the cut deficit is min(500, ceiling),
  // and the ceiling for any body fat at or above 20% is ~677 kcal, so 500 wins
  // for 25% exactly as it did for 183. Same phase, same deficit, same protein
  // multiplier, byte-identical targets — now reached honestly.
  //
  // The corrupt profile is not discarded: see 'the corrupt profile' block at the
  // bottom, which pins the new behaviour so this can't silently regress.
  profile: {
    currentWeightKg: 82,
    currentBodyFatPct: 25,
    goalWeightKg: 75,
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
    expect(derived.kcalLo).toBe(2218);
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
  it('prints the full model the feasibility check runs on', () => {
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

    // ---- what this actually establishes ----
    //
    // The targets assertions above DO hold: this fixture derives the reported
    // 2335 kcal / 162 g protein floor / 208–254 g carbs. The day shape and the
    // pick binding print correctly. That is worth keeping.
    //
    // The infeasibility assertion is NOT here, and see the skipped test below
    // for why.
    expect(verdict).not.toBeNull();
  });

  // 2026-08-08: this has never passed, and the reason is not a regression.
  //
  // At the commit that added this file (56fe316) the suite could not even run —
  // it imports '../basketCheck', which did not exist until 182a7d5. So the
  // expected numbers were transcribed from the on-device report rather than
  // produced by a run, and the fixture was never checked against them. The
  // 2 kcal gap on kcalLo (2220 written, 2218 computed) is the fingerprint of a
  // hand-copied figure.
  //
  // Verified at HEAD with the original corrupt profile and the original
  // derivePhase: identical output, verdict FEASIBLE. Nothing on the meals side
  // or in the engine moved.
  //
  // There is also a decent reason it CANNOT reproduce. The reported bug was
  // target-resolution divergence — the screen checking against questionnaire
  // maintenance ceilings while the plan was built to phase-aware cut ceilings
  // ~50 g/day lower. resolveBasketTargets fixed that. This fixture was dumped
  // 2026-07-31, AFTER the fix, so the state it captured may contain no
  // infeasible basket to find.
  //
  // To arm this guard properly it needs a basket that is genuinely infeasible
  // under today's unified targets — either captured from a device that still
  // shows the heads-up, or constructed by hand. Do not reach it by tuning the
  // fixture until it goes red.
  it.skip('fires the heads-up (carbs ceiling) — never reproduced, see comment', () => {
    const result = runBasketCheck({
      answers: FIXTURE.answers,
      goalsProfile: FIXTURE.profile,
      selectedKeys: scopedKeys(),
      allMeals: ALL,
      avoid: FIXTURE.favorites.avoid,
    });
    expect(result.verdict!.feasible).toBe(false);
    expect(
      result.verdict!.failures.some(
        (f) => f.axis === 'carbs' && f.direction === 'ceiling'
      )
    ).toBe(true);
  });
});
// ===========================================================================
// The corrupt profile, kept as its own guard
// ===========================================================================
//
// The verbatim on-device profile no longer belongs in the fixture above,
// because it no longer derives the phase the reported basket was measured
// against. It is worth keeping as a test in its own right: it is the exact
// shape that used to send a gaining user into a deficit, and this pins that
// it doesn't any more.

describe('the corrupt profile', () => {
  const CORRUPT: GoalsProfile = {
    currentWeightKg: 82,
    currentBodyFatPct: 183, // the user's height, typed into the body-fat box
    goalWeightKg: 90, // ABOVE current weight — they asked to gain
    goalBodyFatPct: 13,
    trainingState: 'consistent',
  };

  it('no longer resolves to cut-level targets despite the impossible body fat', () => {
    const { targets } = runBasketCheck({
      answers: FIXTURE.answers,
      goalsProfile: CORRUPT,
      selectedKeys: [],
      allMeals: ALL,
    });
    expect(targets).not.toBeNull();

    const { targets: cutTargets } = runBasketCheck({
      answers: FIXTURE.answers,
      goalsProfile: FIXTURE.profile,
      selectedKeys: [],
      allMeals: ALL,
    });

    // A goal weight 8 kg ABOVE current weight must produce a surplus, whatever
    // the body-fat field says. Before 2026-08-08 this came out below the cut
    // targets, because the body-fat comparison outranked the stated direction.
    expect(targets!.kcal).toBeGreaterThan(cutTargets!.kcal);
  });

  it('still gets sanitised on the storage boundary, so the app never sees 183', () => {
    const { profile: repaired, repaired: didRepair } =
      sanitizeGoalsProfile(CORRUPT);
    expect(didRepair).toBe(true);
    expect(repaired.currentBodyFatPct).toBeUndefined();
    // The goal weight is plausible on its own, so it survives — the direction
    // it implies is the user's, not a corruption.
    expect(repaired.goalWeightKg).toBe(90);
  });
});