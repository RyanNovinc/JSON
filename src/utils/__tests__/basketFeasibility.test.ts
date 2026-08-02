// src/utils/__tests__/basketFeasibility.test.ts
//
// Reproduces the reported infeasible-basket case in miniature and pins the
// behaviour of the feasibility engine + the shared wiring (basketCheck).
//
// The reported case: cut at 2220–2450 kcal, 162 g protein floor, weekly
// carbs 208–254 g. Three calorie-dense breakfasts picked; the structure
// (mealsPerDay 4) grants breakfast AND brunch drawing from the same pool.
// Two servings of the cheapest option lock in 151 g of carbs before lunch
// exists; the generating AI proved the carb band unreachable (~271 g/day
// minimum) on three separate runs, and the picker said nothing.
//
// curatedShelves is mocked to plain eligibility-intersection so this file
// runs on synthetic meals without src/data/curated_meals.ts. The REAL data
// path is covered by basketRepro.real.test.ts.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../curatedShelves', () => ({
  emptyFilter: () => ({}),
  mealsForSlots: (slots: string[], all: any[]) =>
    all.filter((m) => m.eligible_slots.some((s: string) => slots.includes(s))),
  SHELF_SLOTS: {
    breakfast: ['breakfast'],
    lunch: ['lunch'],
    dinner: ['dinner'],
    snacks: ['snack', 'morning_snack', 'afternoon_snack', 'evening_snack'],
    dessert: ['dessert'],
  },
}));

import { assessBasket, __internals, Targets } from '../mealFeasibility';
import {
  runBasketCheck,
  resolveBasketTargets,
  normalizeSelectedKeys,
  buildTabs,
  buildSlotSpecs,
} from '../basketCheck';
import type { GoalsProfile } from '../goalsProfile';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const meal = (
  slug: string,
  slots: string[],
  kcal: number,
  p: number,
  c: number,
  f: number,
  fib: number
): any => ({
  slug,
  display_name: slug,
  eligible_slots: slots,
  plates: [
    {
      id: 'hero',
      plate_macros: { kcal, protein_g: p, carbs_g: c, fat_g: f, fiber_g: fib },
    },
  ],
  methods: [{ time_active_minutes: 5 }],
});

// Three calorie-dense breakfasts, all breakfast+brunch eligible. The cheapest
// carb floor is big_oats: 108 × 0.7 = 75.6 g — two servings lock 151.2 g,
// the arithmetic from the report. Mains are carby (52.5 g floors each), so
// the component-wise floor on a base day is 151.2 + 52.5 + 52.5 + 6.3 =
// 262.5 g — over the 254.1 daily-equivalent ceiling, mirroring the ~271 the
// generating AI kept landing on.
const LOCK_MEALS = [
  meal('big_oats', ['breakfast', 'brunch'], 720, 42, 108, 16, 9),
  meal('pancake_stack', ['breakfast', 'brunch'], 880, 52, 118, 24, 7),
  meal('banana_bulk', ['breakfast', 'brunch', 'snack'], 1249, 60, 158, 42, 12),
  meal('teriyaki_rice_bowl', ['lunch', 'dinner'], 680, 42, 78, 18, 5),
  meal('pasta_bake', ['lunch', 'dinner'], 720, 45, 82, 20, 6),
  meal('greek_yogurt_snack', ['snack'], 170, 17, 9, 6, 0),
  meal('protein_shake', ['snack', 'breakfast', 'brunch'], 250, 35, 16, 5, 0),
  meal('greek_yoghurt_bowl', ['breakfast', 'brunch'], 320, 28, 30, 8, 4),
  meal('protein_mousse', ['dessert'], 320, 25, 30, 9, 2),
  meal('mug_cake', ['dessert'], 380, 22, 44, 10, 3),
];

const LOCK_KEYS = [
  'breakfast|big_oats',
  'breakfast|pancake_stack',
  'breakfast|banana_bulk',
  'brunch|big_oats',
  'brunch|pancake_stack',
  'brunch|banana_bulk',
  'lunch|teriyaki_rice_bowl',
  'dinner|pasta_bake',
  'snack|greek_yogurt_snack',
  'dessert|protein_mousse',
];

// Answers + profile reconstructed to yield the EXACT reported targets via
// the phase-aware path: kcal 2337 (band 2220–2454), protein 180 (floor 162),
// carbs 231 (weekly band 208–254), fat 77.
//   male 31 / 186 cm / activity moderate → BMR 1830.5 → TDEE 2837
//   cut (consistent trainee, BF ≥ 20, goal weight below current) → −500
//   protein: max(30% split = 175, 2.2 g/kg × 81.8 = 180) = 180
//   carbs: (2337 − 720) / 7 = 231 · fat: 77 (high_protein split remainder)
const ANSWERS: any = {
  gender: 'male',
  age: 31,
  height: 186,
  weight: 81.8,
  activityLevel: 'moderate',
  goal: 'lose_weight',
  targetRatePercentage: 0.5,
  dietType: 'high_protein',
  mealsPerDay: 4,
  snackFrequency: '1',
  dessertFrequency: 'few_per_week',
  allergies: [],
};

const PROFILE: GoalsProfile = {
  currentWeightKg: 81.8,
  currentBodyFatPct: 22,
  goalWeightKg: 76,
  trainingState: 'consistent',
};

// ---------------------------------------------------------------------------
// Target resolution — the root cause in numbers
// ---------------------------------------------------------------------------

describe('resolveBasketTargets', () => {
  it('phase-aware path reproduces the reported cut targets exactly', () => {
    const t = resolveBasketTargets(ANSWERS, PROFILE)!;
    expect(t).not.toBeNull();
    expect(t.kcal).toBe(2337);
    expect(t.protein_g).toBe(180);
    expect(t.carbs_g).toBe(231);
    expect(t.fat_g).toBe(77);
    // The bands from the report, as the engine computes them:
    expect(Math.round(t.kcal * 0.95)).toBe(2220);
    expect(Math.round(t.protein_g * 0.9)).toBe(162);
    expect(Math.round((t.carbs_g as number) * 0.9)).toBe(208);
    expect(Math.round((t.carbs_g as number) * 1.1)).toBe(254);
  });

  it('without a goal weight the questionnaire path yields maintenance-level ceilings ~50 g/day looser', () => {
    const maintain = resolveBasketTargets({ ...ANSWERS, goal: 'maintain' }, null)!;
    expect(maintain.kcal).toBe(2837); // TDEE — no cut applied
    expect(maintain.carbs_g).toBe(284); // ceiling 312 vs the plan's real 254
  });
});

// ---------------------------------------------------------------------------
// The reported basket
// ---------------------------------------------------------------------------

describe('the reported basket (breakfast + brunch locked on the same three calorie bombs)', () => {
  it('fires the heads-up on the targets the plan is actually built to', () => {
    const { targets, tabs, verdict } = runBasketCheck({
      answers: ANSWERS,
      goalsProfile: PROFILE,
      selectedKeys: LOCK_KEYS,
      allMeals: LOCK_MEALS,
    });
    // Structure parity: mealsPerDay 4 grants breakfast AND brunch.
    expect(tabs.some((t) => t.kind === 'exotic' && t.slot === 'brunch')).toBe(true);
    expect(targets!.carbs_g).toBe(231);

    expect(verdict).not.toBeNull();
    expect(verdict!.feasible).toBe(false);
    const carbFail = verdict!.failures.find(
      (f) => f.axis === 'carbs' && f.direction === 'ceiling'
    );
    expect(carbFail).toBeDefined();
    // Floors: (151.2 + 52.5 + 52.5 + 6.3) × 4 base days + (… + 21) × 3
    // dessert days = 1900.5 weekly vs ceiling 1778.7 → gap ≈ 17.4 g/day.
    expect(carbFail!.gap).toBeGreaterThan(10);
    // And the engine can certify real one-tap fixes: a low-carb breakfast
    // pick breaks the lock by lowering the per-occurrence floor.
    expect(verdict!.fixes.length).toBeGreaterThan(0);
  });

  it('silently passes on questionnaire-derived targets — the pre-fix behaviour that let it through', () => {
    // Same basket, same structure; only the target resolution differs (no
    // goal weight → computeMacros, maintenance-adjacent). This is why the
    // saved basket produced three provably-broken plans without a word.
    const { verdict } = runBasketCheck({
      answers: { ...ANSWERS, goal: 'maintain' },
      goalsProfile: null,
      selectedKeys: LOCK_KEYS,
      allMeals: LOCK_MEALS,
    });
    expect(verdict).not.toBeNull();
    expect(verdict!.feasible).toBe(true);
  });

  it('with picks scoped to breakfast only, brunch is modelled from fillers — silent, matching buildFrames', () => {
    // If the stored picks never reached the brunch slot, buildFrames would
    // fill the brunch frame from universal fillers too — plan and check
    // agree, and the check correctly stays quiet.
    const bfOnly = LOCK_KEYS.filter((k) => !k.startsWith('brunch|'));
    const { verdict } = runBasketCheck({
      answers: ANSWERS,
      goalsProfile: PROFILE,
      selectedKeys: bfOnly,
      allMeals: LOCK_MEALS,
    });
    expect(verdict).not.toBeNull();
    expect(verdict!.feasible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Engine soundness — the weekly minimum must never exceed the reachable floor
// ---------------------------------------------------------------------------

describe('weekly-minimum bound soundness', () => {
  it('never exceeds the reachable component-wise floor', () => {
    // One occurrence holds a low-DENSITY giant (banana-bulk shape: cheap
    // carbs per kcal, huge minimum serve) next to a small higher-density
    // option. True floor uses the small option: 108×0.7 + 30×0.7 = 96.6 g.
    // The previous density-greedy locked the giant's floor and reported
    // 131.6 g — 35 g above what the plan can actually reach — so the engine
    // could claim hard infeasibility for feasible baskets.
    const X = { kcal: 1249, p: 60, c: 158, f: 42, fib: 12, sMin: 0.7, sMax: 1.5 };
    const Y = { kcal: 720, p: 42, c: 108, f: 16, fib: 9, sMin: 0.7, sMax: 1.5 };
    const M = { kcal: 560, p: 48, c: 30, f: 22, fib: 6, sMin: 0.7, sMax: 1.5 };
    const day = [{ options: [X, Y] }, { options: [M] }];
    const min = __internals.minAxisAtKcal(day as any, (o: any) => o.c, 800);
    expect(min).toBeCloseTo(96.6, 1);
  });

  it('regression: a feasible basket with lean mains no longer false-fires', () => {
    // Same doubled breakfast+brunch lock, but lean mains (21 g floors): the
    // true weekly floor is 199.5×4 + 220.5×3 = 1459.5 g — comfortably under
    // the 1778.7 ceiling, so a real plan CAN land the band. The old greedy
    // modelled 278.5 g/day here and fired. Sound bound: quiet.
    const leanMeals = [
      ...LOCK_MEALS.filter((m) => !['teriyaki_rice_bowl', 'pasta_bake'].includes(m.slug)),
      meal('butter_chicken', ['lunch', 'dinner'], 620, 45, 38, 28, 5),
      meal('beef_stew', ['lunch', 'dinner'], 560, 48, 30, 22, 6),
    ];
    const keys = [
      ...LOCK_KEYS.filter((k) => !k.includes('teriyaki') && !k.includes('pasta')),
      'lunch|butter_chicken',
      'dinner|beef_stew',
    ];
    const { verdict } = runBasketCheck({
      answers: ANSWERS,
      goalsProfile: PROFILE,
      selectedKeys: keys,
      allMeals: leanMeals,
    });
    expect(verdict).not.toBeNull();
    expect(verdict!.feasible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sub-slot snack picks — the SLOT_FOLD mirror
// ---------------------------------------------------------------------------

describe('snack sub-slot picks', () => {
  it('normalizeSelectedKeys folds morning/afternoon/evening_snack into snack|', () => {
    expect(
      normalizeSelectedKeys([
        'morning_snack|banana_bulk',
        'afternoon_snack|greek_yogurt_snack:hero',
        'evening_snack|mixed_nuts',
        'snack|tuna_pouch',
        'breakfast|big_oats',
        'bare_legacy_slug',
      ]).sort()
    ).toEqual(
      [
        'snack|banana_bulk',
        'snack|greek_yogurt_snack:hero',
        'snack|mixed_nuts',
        'snack|tuna_pouch',
        'breakfast|big_oats',
        'bare_legacy_slug',
      ].sort()
    );
  });

  it('a sub-slot pick counts toward the verdict after folding (it was invisible before)', () => {
    // banana_bulk picked as the ONLY snack, stored under morning_snack (the
    // slot buildFrames folds into the snack frame — the plan schedules it).
    // Unfolded, the engine sees an empty snack slot and models cheap fillers
    // instead: 6.3 g floor vs banana_bulk's 110.6 g. The fold flips the
    // verdict from silent to firing, exactly matching what the plan gets.
    const keys = [
      ...LOCK_KEYS.filter((k) => k !== 'snack|greek_yogurt_snack' && !k.startsWith('brunch|')),
      'morning_snack|banana_bulk',
    ];
    const targets = resolveBasketTargets(ANSWERS, PROFILE)!;
    const tabs = buildTabs(4, '1', 'few_per_week', LOCK_MEALS);
    const slots = buildSlotSpecs(tabs, '1', 'few_per_week', targets.kcal);

    const unfolded = assessBasket({
      slots,
      selectedKeys: keys,
      allMeals: LOCK_MEALS,
      targets,
    });
    const folded = assessBasket({
      slots,
      selectedKeys: normalizeSelectedKeys(keys),
      allMeals: LOCK_MEALS,
      targets,
    });
    expect(unfolded!.feasible).toBe(true); // the blind spot
    expect(folded!.feasible).toBe(false); // what the plan actually faces
    expect(
      folded!.failures.some((f) => f.axis === 'carbs' && f.direction === 'ceiling')
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Filler pools honour the diet filter (parity with buildFrames' passesDiet)
// ---------------------------------------------------------------------------

describe('filler diet filtering', () => {
  it('avoid list removes filler rescues the plan would never contain', () => {
    const targets: Targets = { kcal: 2337, protein_g: 180, carbs_g: 231, fat_g: 77, fiber_g: 33 };
    const bfOnly = LOCK_KEYS.filter((k) => !k.startsWith('brunch|'));
    const tabs = buildTabs(4, '1', 'few_per_week', LOCK_MEALS);
    const slots = buildSlotSpecs(tabs, '1', 'few_per_week', targets.kcal);

    // Unfiltered: brunch falls back to cheap fillers (shake, yoghurt bowl) —
    // feasible. With those on the avoid list the plan's brunch pool is the
    // protein-density fallback: the same calorie-dense breakfasts — the lock
    // re-forms and the engine now models it.
    const open = assessBasket({ slots, selectedKeys: bfOnly, allMeals: LOCK_MEALS, targets });
    const avoided = assessBasket({
      slots,
      selectedKeys: bfOnly,
      allMeals: LOCK_MEALS,
      targets,
      avoid: ['shake', 'yoghurt'],
    });
    expect(open!.feasible).toBe(true);
    expect(avoided!.feasible).toBe(false);
  });
});