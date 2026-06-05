/**
 * Tests for buildPrepSession. Self-contained: no test-framework import, so it
 * transpiles and runs under plain node. Fixtures are fully typed (real
 * MealSlugs, complete CuratedMeal/Plate/CookingMethod objects) so this file
 * also passes the project's real `tsc`.
 *
 * Run: transpile to JS (with a stub for ../data/curated_meals) and `node` it.
 */

import { buildPrepSession } from './buildPrepSession';
import type {
  CuratedMeal,
  Plate,
  CookingMethod,
  RecipeStep,
  MealPrep,
  EquipmentType,
} from '../types/curated_meals';
import type {
  SimplifiedMeal,
  SimplifiedMealPlan,
  SimplifiedMealPlanDay,
} from '../types/nutrition';

// --- tiny assert harness ---------------------------------------------------
let passed = 0;
let failed = 0;
function check(label: string, cond: boolean): void {
  if (cond) passed += 1;
  else {
    failed += 1;
    console.error('  FAIL: ' + label);
  }
}
function eq(label: string, got: unknown, want: unknown): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  check(`${label} (got ${g}, want ${w})`, g === w);
}

// --- typed fixture builders ------------------------------------------------
function step(summary: string): RecipeStep {
  return { summary, substeps: [summary] };
}
function makeMethod(
  id: string,
  total: number,
  active: number,
  steps: RecipeStep[],
  equipment: EquipmentType[] = ['stovetop'],
): CookingMethod {
  return {
    id,
    display_name: id,
    equipment_required: equipment,
    time_active_minutes: active,
    time_total_minutes: total,
    skill_min: 2,
    shortcut_level: 'scratch',
    ingredients: [],
    instructions: steps,
  };
}
function makePlate(
  id: string,
  opts: { display_name?: string; additional?: RecipeStep[]; meal_prep?: MealPrep } = {},
): Plate {
  return {
    id,
    display_name: opts.display_name ?? id,
    description: '',
    base_serving_multiplier: 1,
    additional_ingredients: [],
    additional_instructions: opts.additional ?? [],
    assembly_time_minutes: 0,
    plate_macros: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
    ...(opts.meal_prep ? { meal_prep: opts.meal_prep } : {}),
  };
}
function makeMeal(
  slug: CuratedMeal['slug'],
  plates: Plate[],
  methods: CookingMethod[],
  meal_prep?: MealPrep,
): CuratedMeal {
  return {
    slug,
    display_name: String(slug),
    cuisine: 'australian',
    primary_protein: 'beef',
    produces_servings: 1,
    eligible_slots: ['dinner'],
    min_scale: 0.5,
    max_scale: 1.5,
    contains_allergens: [],
    plates,
    methods,
    // opaque ingredient id — fixture placeholder (double-cast keeps tsc happy
    // without importing the IngredientId union).
    flex_ingredient_id: 'fixture_flex' as unknown as CuratedMeal['flex_ingredient_id'],
    ...(meal_prep ? { meal_prep } : {}),
  };
}
function planMeal(
  name: string,
  opts: { slug?: string; plateId?: string; scale?: number } = {},
): SimplifiedMeal {
  const m: SimplifiedMeal = {
    id: name + ':' + Math.random().toString(36).slice(2),
    name,
    type: 'lunch',
    time: '12:00 PM',
    calories: 0,
    macros: { protein: 0, carbs: 0, fat: 0 },
    ingredients: [],
    instructions: [],
    tags: [],
    isOriginal: true,
  };
  if (opts.slug !== undefined) m.curated_meal_slug = opts.slug;
  if (opts.plateId !== undefined) m.plate_id = opts.plateId;
  if ('scale' in opts) m.scale_factor = opts.scale; // allow 0 / -2 / NaN through
  return m;
}
function day(date: string, meals: SimplifiedMeal[]): SimplifiedMealPlanDay {
  return { date, dayName: 'X', meals };
}
function makePlan(dailyMeals: SimplifiedMealPlan['dailyMeals']): SimplifiedMealPlan {
  return {
    id: 'p',
    name: 'Test',
    startDate: '2026-01-01',
    endDate: '2026-01-03',
    dailyMeals,
    metadata: { generatedAt: '', totalCost: 0, duration: Object.keys(dailyMeals).length },
  };
}

// --- the curated catalogue used by every test ------------------------------
const CURATED: Record<string, CuratedMeal> = {
  butter_chicken: makeMeal(
    'butter_chicken',
    [makePlate('standard', { display_name: 'Butter Chicken' })],
    [makeMethod('stovetop', 45, 30, [step('Cook the curry')], ['stovetop'])],
    { strategy: 'full', prep_note: 'Cook the curry, store, reheat', storage: { fridge_days: 4, freeze_months: 3 } },
  ),
  beef_stew: makeMeal(
    'beef_stew',
    [makePlate('standard', { display_name: 'Beef Stew' })],
    [makeMethod('slow_cooker', 480, 20, [step('Brown beef'), step('Slow cook')], ['slow_cooker'])],
    { strategy: 'full', prep_note: 'Slow cook, store', storage: { fridge_days: 4, freeze_months: 3 } },
  ),
  chicken_shawarma: makeMeal(
    'chicken_shawarma',
    [
      makePlate('wrap', {
        display_name: 'Chicken Shawarma Wrap',
        additional: [step('Warm the flatbread'), step('Build with salad + sauce')],
      }),
    ],
    [makeMethod('oven', 60, 20, [step('Marinate'), step('Roast the chicken')], ['oven'])],
    { strategy: 'partial', prep_note: 'Cook the chicken; build the wrap fresh', storage: { fridge_days: 4 } },
  ),
  greek_yoghurt_bowl: makeMeal(
    'greek_yoghurt_bowl',
    [makePlate('standard', { display_name: 'Greek Yoghurt Bowl' })],
    [makeMethod('no_cook', 5, 5, [step('Combine')], ['no_cook'])],
    { strategy: 'none', reason: 'Best fresh — yoghurt weeps if pre-mixed' },
  ),
  // meal-level 'full'; the 'tacos' plate OVERRIDES to 'none'; the 'bowl' plate inherits 'full'.
  pulled_pork: makeMeal(
    'pulled_pork',
    [
      makePlate('bowl', { display_name: 'Pulled Pork Bowl' }),
      makePlate('tacos', {
        display_name: 'Pulled Pork Tacos',
        meal_prep: { strategy: 'none', reason: 'Assemble tacos fresh' },
      }),
    ],
    [makeMethod('slow_cooker', 510, 25, [step('Rub'), step('Slow cook 8h'), step('Shred')], ['slow_cooker'])],
    { strategy: 'full', prep_note: 'Slow cook the pork, store', storage: { fridge_days: 4, freeze_months: 3 } },
  ),
};

// ===========================================================================
// PLAN A — the big mixed plan exercising grouping, override, fallback, fresh
// ===========================================================================
const planA = makePlan({
  '2026-01-01': day('2026-01-01', [
    planMeal('Butter Chicken', { slug: 'butter_chicken', plateId: 'standard', scale: 1.5 }),
    planMeal('Chicken Shawarma Wrap', { slug: 'chicken_shawarma', plateId: 'wrap', scale: 1.4 }),
    planMeal('Greek Yoghurt Bowl', { slug: 'greek_yoghurt_bowl', plateId: 'standard', scale: 1 }),
    planMeal('Mystery Smoothie'), // no slug → unlinked
  ]),
  '2026-01-02': day('2026-01-02', [
    planMeal('Butter Chicken', { slug: 'butter_chicken', plateId: 'standard', scale: 1.5 }),
    planMeal('Chicken Shawarma Wrap', { slug: 'chicken_shawarma', plateId: 'wrap', scale: 1.5 }),
    planMeal('Pulled Pork Bowl', { slug: 'pulled_pork', plateId: 'bowl', scale: 1 }), // inherits full
    planMeal('Pulled Pork Tacos', { slug: 'pulled_pork', plateId: 'tacos', scale: 1 }), // override → none
    planMeal('Mystery Smoothie'), // unlinked (2nd)
    planMeal('Beef Stew', { slug: 'beef_stew', plateId: 'standard', scale: 1 }),
  ]),
  '2026-01-03': day('2026-01-03', [
    planMeal('Butter Chicken', { slug: 'butter_chicken', plateId: 'standard', scale: 1.4 }),
    planMeal('Greek Yoghurt Bowl', { slug: 'greek_yoghurt_bowl', plateId: 'standard', scale: 1 }),
    planMeal('Ghost Meal', { slug: 'nonexistent_xyz', scale: 1 }), // slug not in catalogue → unlinked
    planMeal('Butter Chicken', { slug: 'butter_chicken', plateId: 'totally_made_up', scale: 1 }), // bad plate → fallback to 'standard'
  ]),
});

console.log('PLAN A — mixed plan');
const a = buildPrepSession(planA, CURATED);

// multi-occurrence grouping + plate fallback (the bad-plate instance merges into 'standard')
eq('cookAhead has 3 groups', a.cookAhead.length, 3);
const bc = a.cookAhead.find((g) => g.slug === 'butter_chicken');
eq('butter_chicken plate resolved to standard', bc?.plateId, 'standard');
eq('butter_chicken grouped 4 occurrences (incl. bad-plate fallback)', bc?.occurrences, 4);

// cookServings = round(Σ scale_factor), NOT occurrences (1.5+1.5+1.4+1.0 = 5.4 → 5)
eq('butter_chicken cookServings = round(5.4) = 5', bc?.cookServings, 5);
eq('butter_chicken occurrences (display) still 4', bc?.occurrences, 4);

// longest-first ordering by total time
eq('cookAhead order longest-first', a.cookAhead.map((g) => g.slug), ['pulled_pork', 'beef_stew', 'butter_chicken']);
eq('cookAhead sortMinutes descending', a.cookAhead.map((g) => g.sortMinutes), [510, 480, 45]);

// full classification details
eq('butter_chicken strategy full', bc?.strategy, 'full');
eq('full prep note carried', bc?.prepNote, 'Cook the curry, store, reheat');
eq('full storage carried', bc?.storage, { fridge_days: 4, freeze_months: 3 });
eq('full → all steps prep-ahead, none day-of', [bc?.prepAheadSteps.length, bc?.dayOfSteps.length], [1, 0]);

// partial classification + default boundary (base ahead, plate fresh)
eq('prepAhead has 1 group', a.prepAhead.length, 1);
const sh = a.prepAhead[0];
eq('shawarma strategy partial', sh.strategy, 'partial');
eq('shawarma occurrences 2', sh.occurrences, 2);
eq('shawarma cookServings = round(2.9) = 3', sh.cookServings, 3);
eq('partial prep-ahead = method base steps (2)', sh.prepAheadSteps.map((s) => s.summary), ['Marinate', 'Roast the chicken']);
eq('partial day-of = plate steps (2)', sh.dayOfSteps.map((s) => s.summary), ['Warm the flatbread', 'Build with salad + sauce']);

// plate-level meal_prep OVERRIDE beats meal-level
const ppBowl = a.cookAhead.find((g) => g.slug === 'pulled_pork');
eq('pulled_pork BOWL inherited full → cookAhead', ppBowl?.plateId, 'bowl');
const ppTacos = a.makeFresh.find((m) => m.slug === 'pulled_pork' && m.plateId === 'tacos');
check('pulled_pork TACOS override none → makeFresh', !!ppTacos);
check('pulled_pork TACOS not in cookAhead/prepAhead', !a.cookAhead.concat(a.prepAhead).some((g) => g.plateId === 'tacos'));
eq('tacos override reason carried', ppTacos?.reason, 'Assemble tacos fresh');

// no-slug / bad-slug → make fresh by name, aggregated
const mystery = a.makeFresh.find((m) => m.displayName === 'Mystery Smoothie');
eq('unlinked Mystery Smoothie aggregated to 2', mystery?.occurrences, 2);
eq('unlinked is linked:false', mystery?.linked, false);
const ghost = a.makeFresh.find((m) => m.displayName === 'Ghost Meal');
eq('bad-slug Ghost Meal → unlinked', ghost?.linked, false);

// curated 'none' is linked:true and in makeFresh
const greek = a.makeFresh.find((m) => m.slug === 'greek_yoghurt_bowl');
eq('greek none → linked:true', greek?.linked, true);
eq('greek aggregated to 2', greek?.occurrences, 2);

// makeFresh sorted by display name
eq('makeFresh sorted by name', a.makeFresh.map((m) => m.displayName), [
  'Ghost Meal',
  'Greek Yoghurt Bowl',
  'Mystery Smoothie',
  'Pulled Pork Tacos',
]);

// totals
eq('mealCount = Σ occurrences cook+prep (6+2)', a.totals.mealCount, 8);
eq('dayCount = 3', a.totals.dayCount, 3);
// active time, NOT total: pp25 + stew20 + bc30 + shawarma20 = 95 (total would be 1095)
eq('activeMinutes = Σ active (95), not total', a.totals.activeMinutes, 95);
eq('curatedCount = 11 linked instances', a.totals.curatedCount, 11);
eq('isLegacyPlan false', a.totals.isLegacyPlan, false);
eq('equipment union (sorted)', a.totals.equipment, ['oven', 'slow_cooker', 'stovetop']);

// ===========================================================================
// PLAN B — legacy plan: zero curated linkage
// ===========================================================================
console.log('PLAN B — legacy plan (no slugs)');
const planB = makePlan({
  '2026-01-01': day('2026-01-01', [planMeal('Toast'), planMeal('Scrambled Eggs')]),
});
const b = buildPrepSession(planB, CURATED);
eq('legacy cookAhead empty', b.cookAhead.length, 0);
eq('legacy prepAhead empty', b.prepAhead.length, 0);
eq('legacy curatedCount 0', b.totals.curatedCount, 0);
eq('legacy isLegacyPlan TRUE', b.totals.isLegacyPlan, true);
eq('legacy meals still listed in makeFresh', b.makeFresh.map((m) => m.displayName), ['Scrambled Eggs', 'Toast']);
eq('legacy mealCount 0', b.totals.mealCount, 0);
eq('legacy activeMinutes 0', b.totals.activeMinutes, 0);

// ===========================================================================
// PLAN C — scale_factor sanitization (0 / -2 / NaN / undefined → 1 each)
// ===========================================================================
console.log('PLAN C — scale sanitization');
const planC = makePlan({
  '2026-01-01': day('2026-01-01', [
    planMeal('Butter Chicken', { slug: 'butter_chicken', plateId: 'standard', scale: 0 }),
    planMeal('Butter Chicken', { slug: 'butter_chicken', plateId: 'standard', scale: -2 }),
    planMeal('Butter Chicken', { slug: 'butter_chicken', plateId: 'standard', scale: Number.NaN }),
    planMeal('Butter Chicken', { slug: 'butter_chicken', plateId: 'standard' }), // scale undefined
  ]),
});
const c = buildPrepSession(planC, CURATED);
eq('all 4 bad/absent scales grouped', c.cookAhead[0]?.occurrences, 4);
eq('each bad scale treated as 1 → cookServings 4', c.cookAhead[0]?.cookServings, 4);

// ===========================================================================
// PLAN D — empty + malformed guards
// ===========================================================================
console.log('PLAN D — empty / malformed guards');
const d = buildPrepSession(makePlan({}), CURATED);
eq('empty plan dayCount 0', d.totals.dayCount, 0);
eq('empty plan isLegacyPlan true', d.totals.isLegacyPlan, true);
eq('empty plan cookAhead empty', d.cookAhead.length, 0);

// missing dailyMeals entirely
const noDaily = buildPrepSession({ dailyMeals: undefined } as unknown as SimplifiedMealPlan, CURATED);
eq('missing dailyMeals → empty session', [noDaily.cookAhead.length, noDaily.totals.isLegacyPlan], [0, true]);

// a day whose meals array is missing
const badDay = buildPrepSession(
  makePlan({ '2026-01-01': { date: '2026-01-01', dayName: 'X', meals: undefined } as unknown as SimplifiedMealPlanDay }),
  CURATED,
);
eq('day with no meals array → no crash, empty', badDay.cookAhead.length, 0);

// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);