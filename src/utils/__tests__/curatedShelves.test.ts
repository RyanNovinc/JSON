// curatedShelves.test.ts — self-contained assertion runner (no test framework).
import {
  MealLike, FilterState, emptyFilter,
  mealBadge, mealDensity, densityUnavailable,
  isMealPicked, pickedMealCount,
  coreShelfStatus, exoticShelfStatus,
  mealTimeBucket, mealEquipment, passesFilter,
  mealsForCoreShelf, mealsForSlots,
  trailingCardState, equipmentChipCounts,
  SHELF_CARD_CAP,
} from './curatedShelves';

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; }
  else { fail++; console.log('  FAIL:', name); }
}
function eq<T>(name: string, got: T, want: T) {
  check(`${name} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`,
    JSON.stringify(got) === JSON.stringify(want));
}

// ---------------------------------------------------------------------------
// Fixtures mirroring the REAL current catalogue shape (no new fields).
// ---------------------------------------------------------------------------

const pulledPork: MealLike = {
  slug: 'pulled_pork', display_name: 'Slow-Cooked BBQ Pulled Pork',
 
  eligible_slots: ['lunch', 'dinner', 'second_lunch', 'early_dinner'],
  methods: [{ equipment_required: ['slow_cooker', 'stovetop'], time_active_minutes: 30, time_total_minutes: 510 }],
  plates: [
    { id: 'sandwich', display_name: 'BBQ Pulled Pork Burger', plate_macros: { kcal: 1210 } },
    { id: 'bowl', display_name: 'Pulled Pork Rice Bowl', plate_macros: { kcal: 1330 } },
    { id: 'tacos', display_name: 'Pulled Pork Tacos', plate_macros: { kcal: 1155 } },
    { id: 'mac_cheese', display_name: 'Mac & Cheese Stack', plate_macros: { kcal: 1907 }, is_stunt_plate: true },
  ],
};

const butterChicken: MealLike = {
  slug: 'butter_chicken', display_name: 'Butter Chicken',
  eligible_slots: ['lunch', 'dinner', 'second_lunch', 'early_dinner'],
  methods: [{ equipment_required: ['slow_cooker', 'stovetop'], time_active_minutes: 20, time_total_minutes: 240 }],
  plates: [{ id: 'standard', display_name: 'Butter Chicken with Basmati Rice', plate_macros: { kcal: 720 } }],
};

const bananaBulk: MealLike = {
  slug: 'banana_bulk', display_name: 'Banana Bulk',
  // expanded eligibility — smoothie across multiple slots
  eligible_slots: ['breakfast', 'post_workout', 'afternoon_snack'],
  methods: [{ equipment_required: ['blender'], time_active_minutes: 4, time_total_minutes: 5 }],
  plates: [{ id: 'standard', display_name: 'Banana Bulk', plate_macros: { kcal: 1302 } }],
};

const lambShanks: MealLike = {
  slug: 'lamb_shanks', display_name: 'Red Wine–Braised Lamb Shanks',
  eligible_slots: ['dinner', 'early_dinner'],
  methods: [{ equipment_required: ['slow_cooker', 'stovetop'], time_active_minutes: 25, time_total_minutes: 505 }],
  plates: [{ id: 'mash', display_name: 'Lamb Shank on Creamy Mash', plate_macros: { kcal: 1417 } }],
};

// ---------------------------------------------------------------------------
// Fast-assembly fixtures WITH the new fields (the future catalogue).
// ---------------------------------------------------------------------------

const tunaRice: MealLike = {
  slug: 'tuna_rice', display_name: 'Tuna & Rice',
  eligible_slots: ['lunch', 'second_lunch'],
  methods: [{ equipment_required: ['microwave'], time_active_minutes: 5, time_total_minutes: 5 }],
  plates: [{ id: 'standard', display_name: 'Tuna & Rice', plate_macros: { kcal: 780 }, plate_finished_weight_g: 420 }],
};

const cottageCheeseBowl: MealLike = {
  slug: 'cottage_cheese_bowl', display_name: 'Cottage Cheese & Almonds',
  eligible_slots: ['morning_snack', 'afternoon_snack'],
  methods: [{ equipment_required: ['no_cook'], time_active_minutes: 3, time_total_minutes: 3 }],
  plates: [{ id: 'standard', display_name: 'Cottage Cheese & Almonds', plate_macros: { kcal: 410 }, plate_finished_weight_g: 300 }],
};

const proteinOats: MealLike = {
  slug: 'protein_oats', display_name: 'Protein Oats',
  eligible_slots: ['breakfast', 'morning_snack'],
  methods: [{ equipment_required: ['microwave'], time_active_minutes: 3, time_total_minutes: 3 }],
  plates: [{ id: 'standard', display_name: 'Protein Oats', plate_macros: { kcal: 680 }, plate_finished_weight_g: 350 }],
};

// A meal with NO methods / NO slots (data-bug resilience).
const brokenMeal: MealLike = {
  slug: 'broken', display_name: 'Broken Meal', plates: [{ id: 'standard' }],
};

const CURRENT_19_SHAPE = [pulledPork, butterChicken, bananaBulk, lambShanks];
const FUTURE = [tunaRice, cottageCheeseBowl, proteinOats];
const ALL = [...CURRENT_19_SHAPE, ...FUTURE];

console.log('\n=== Badge logic ===');
eq('pulled pork -> set_and_forget (510 total)', mealBadge(pulledPork), 'set_and_forget');
eq('lamb shanks -> set_and_forget (505 total)', mealBadge(lambShanks), 'set_and_forget');
eq('banana smoothie -> fast (4 active)', mealBadge(bananaBulk), 'fast');
eq('tuna rice -> fast (5 active)', mealBadge(tunaRice), 'fast');
eq('butter chicken -> set_and_forget (240 total beats 20 active)', mealBadge(butterChicken), 'set_and_forget');
eq('broken meal -> none (no methods, active 0 not treated as fast)', mealBadge(brokenMeal), 'none');

console.log('\n=== Density + degradation ===');
eq('tuna rice density ~1.857', Number(mealDensity(tunaRice).toFixed(3)), 1.857);
eq('pulled pork density 0 (no finished weight authored)', mealDensity(pulledPork), 0);
check('CURRENT 19-shape: density unavailable everywhere (toggle hides)', densityUnavailable(CURRENT_19_SHAPE) === true);
check('FUTURE meals: density available', densityUnavailable(FUTURE) === false);
check('mixed shelf with >=1 weight: density available', densityUnavailable([pulledPork, tunaRice]) === false);

console.log('\n=== Selection counting (distinct meals, not plate-keys) ===');
const sel1 = new Set<string>(['pulled_pork:sandwich', 'pulled_pork:bowl']);
check('pulled pork picked via plate-key', isMealPicked(pulledPork, sel1) === true);
eq('two plate-keys of one meal = 1 distinct meal', pickedMealCount([pulledPork], sel1), 1);
const sel2 = new Set<string>(['banana_bulk']); // bare slug (single-plate)
check('banana picked via bare slug', isMealPicked(bananaBulk, sel2) === true);

console.log('\n=== Core shelf status (3/3/3/2 thresholds) ===');
// Lunch shelf: pulled_pork, butter_chicken, tuna_rice eligible.
const lunchMeals = mealsForCoreShelf('lunch', ALL, emptyFilter(), 'default');
eq('lunch shelf size (pp, bc, tuna)', lunchMeals.length, 3);
eq('lunch empty when nothing picked',
  coreShelfStatus('lunch', lunchMeals, new Set()).status, 'empty');
eq('lunch lean at 2 picks (needs 1 more)',
  coreShelfStatus('lunch', lunchMeals, new Set(['pulled_pork:bowl', 'tuna_rice'])).needed, 1);
eq('lunch ready at 3 picks',
  coreShelfStatus('lunch', lunchMeals, new Set(['pulled_pork', 'butter_chicken', 'tuna_rice'])).status, 'ready');
// Snacks threshold is 2.
const snackMeals = mealsForCoreShelf('snacks', ALL, emptyFilter(), 'default');
eq('snacks lean at 1 pick (threshold 2, needs 1)',
  coreShelfStatus('snacks', snackMeals, new Set(['cottage_cheese_bowl'])).needed, 1);

console.log('\n=== Exotic shelf status (two-state, no lean) ===');
const preWorkout = mealsForSlots(['pre_workout'], ALL, emptyFilter(), 'default');
eq('pre_workout empty at 0', exoticShelfStatus(preWorkout, new Set()).status, 'empty');
eq('post_workout ready at 1 (banana eligible)',
  exoticShelfStatus(mealsForSlots(['post_workout'], ALL, emptyFilter(), 'default'),
    new Set(['banana_bulk'])).status, 'ready');

console.log('\n=== Multi-shelf membership (smoothie on breakfast AND snacks) ===');
const bMeals = mealsForCoreShelf('breakfast', ALL, emptyFilter(), 'default').map(m => m.slug);
const sMeals = mealsForCoreShelf('snacks', ALL, emptyFilter(), 'default').map(m => m.slug);
check('banana on breakfast shelf', bMeals.includes('banana_bulk'));
check('banana on snacks shelf', sMeals.includes('banana_bulk'));

console.log('\n=== Time buckets ===');
eq('banana quick (4)', mealTimeBucket(bananaBulk), 'quick');
eq('butter chicken medium (20)', mealTimeBucket(butterChicken), 'medium');
eq('lamb shanks involved (25 -> medium? check)', mealTimeBucket(lambShanks), 'medium');
// note: lamb shanks active 25 => medium by active-time rule. set&forget is a BADGE, not a time bucket.

console.log('\n=== Filtering: intersection across groups, union within ===');
const fSlow: FilterState = { equipment: new Set(['slow_cooker']), time: null };
check('slow_cooker filter passes pulled pork', passesFilter(pulledPork, fSlow));
check('slow_cooker filter rejects tuna (microwave)', !passesFilter(tunaRice, fSlow));
const fSlowOrMicro: FilterState = { equipment: new Set(['slow_cooker', 'microwave']), time: null };
check('union within group: slow OR micro passes pulled pork', passesFilter(pulledPork, fSlowOrMicro));
check('union within group: slow OR micro passes tuna', passesFilter(tunaRice, fSlowOrMicro));
const fQuickMicro: FilterState = { equipment: new Set(['microwave']), time: 'quick' };
check('intersection: micro AND quick passes tuna', passesFilter(tunaRice, fQuickMicro));
check('intersection: micro AND quick rejects pulled pork (slow + set&forget)', !passesFilter(pulledPork, fQuickMicro));

console.log('\n=== Equipment chip counts (stable 8, zeros muted) ===');
const chips = equipmentChipCounts(ALL, emptyFilter());
eq('always 11 chips', chips.length, 11);
const byVal = Object.fromEntries(chips.map(c => [c.value, c.count]));
eq('slow_cooker count', byVal['slow_cooker'], 3); // pp, bc, lamb
eq('blender count', byVal['blender'], 1);          // banana
eq('microwave count', byVal['microwave'], 2);      // tuna, oats
eq('air_fryer count 0 (none authored yet)', byVal['air_fryer'], 0);
check('air_fryer chip disabled', chips.find(c => c.value === 'air_fryer')!.disabled === true);
// counts respect the time filter context:
const chipsQuick = equipmentChipCounts(ALL, { equipment: new Set(), time: 'quick' });
const byValQ = Object.fromEntries(chipsQuick.map(c => [c.value, c.count]));
eq('under time=quick, slow_cooker drops to 0 (all slow are set&forget/medium)', byValQ['slow_cooker'], 0);
eq('under time=quick, blender stays 1 (banana is quick)', byValQ['blender'], 1);

console.log('\n=== Trailing card ===');
// Build a 10-meal slot to exercise the CAP=8 overflow.
const many: MealLike[] = Array.from({ length: 10 }, (_, i) => ({
  slug: `m${i}`, display_name: `Meal ${i}`, eligible_slots: ['lunch'],
  methods: [{ equipment_required: ['stovetop'], time_active_minutes: 10, time_total_minutes: 20 }],
  plates: [{ id: 'standard', plate_macros: { kcal: 800 } }],
}));
eq('collapsed, 10 meals, cap 8 -> "2 more"',
  trailingCardState(many, new Set(), false), { kind: 'more', more: 2 });
eq('expanded -> no trailing card',
  trailingCardState(many, new Set(), true), { kind: 'none' });
const nine = many.slice(0, 9);
eq('9 meals, cap 8 -> overflow 1 -> none (<=1 rule)',
  trailingCardState(nine, new Set(), false), { kind: 'none' });
const allPickedSel = new Set(many.map(m => m.slug));
eq('all picked -> all_picked card',
  trailingCardState(many, allPickedSel, false), { kind: 'all_picked', total: 10 });

console.log('\n=== Data-bug resilience ===');
eq('broken meal on no shelf', mealsForCoreShelf('lunch', [brokenMeal], emptyFilter(), 'default').length, 0);
check('broken meal empty equipment set', mealEquipment(brokenMeal).size === 0);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
if (fail > 0) process.exit(1);