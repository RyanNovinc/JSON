// utils/curatedShelves.ts
//
// Pure, framework-free logic for the "Foods you like" redesign (Direction A).
// Wired to the REAL types in src/types/curated_meals.ts:
//   - equipment lives on CookingMethod.equipment_required (NOT method.equipment)
//   - plates may ALSO carry equipment_required (assembly-only kit)
//   - MealSlot includes 'snack' + granular snack slots + evening_snack
//   - EquipmentType extended with 'no_cook' (authoring decision)
//   - plate_finished_weight_g is NEW/optional (density; may be absent)
//
// Tolerates missing fields throughout (catalogue is mid-authoring).

import { MealSlot, EquipmentType, CuratedMeal, Plate, CookingMethod } from '../types/curated_meals';

// Re-export types needed by the screen
export { MealSlot, EquipmentType };

type PartialPlate = Omit<Partial<CuratedMeal['plates'][number]>, 'plate_macros'> & {
  plate_macros?: Partial<CuratedMeal['plates'][number]['plate_macros']>;
};
export type MealLike = {
  slug: string;
  display_name?: string;
  eligible_slots?: CuratedMeal['eligible_slots'];
  methods?: Array<Partial<CuratedMeal['methods'][number]>>;
  plates?: PartialPlate[];
} & Partial<Omit<CuratedMeal, 'slug' | 'display_name' | 'eligible_slots' | 'methods' | 'plates'>>;

// Order tuned for the bulker audience: no/low-effort kit first.
export const EQUIPMENT_ORDER: EquipmentType[] = [
  'no_cook', 'microwave', 'blender', 'stovetop', 'air_fryer', 'slow_cooker',
  'rice_cooker', 'oven', 'pressure_cooker', 'grill', 'food_processor', 'freezer',
];

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  no_cook: 'No-cook', microwave: 'Microwave', blender: 'Blender',
  stovetop: 'Stovetop', air_fryer: 'Air fryer', slow_cooker: 'Slow cooker',
  rice_cooker: 'Rice cooker', oven: 'Oven', pressure_cooker: 'Pressure cooker',
  grill: 'Grill', food_processor: 'Food processor', freezer: 'Freezer',
};

export type CoreShelf = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'dessert';
export type TimeBucket = 'quick' | 'medium' | 'involved';
export type ShelfStatus = 'empty' | 'lean' | 'ready';
export type SortMode = 'default' | 'density';
export type BadgeKind = 'set_and_forget' | 'fast' | 'none';


// ---- Tunable constants ----
export const LEAN_THRESHOLDS: Record<CoreShelf, number> = {
  breakfast: 3, lunch: 3, dinner: 3, snacks: 2, dessert: 1,
};
export const SET_AND_FORGET_MIN = 120;
export const FAST_ACTIVE_MAX = 15;
export const SHELF_CARD_CAP = 8;

// ---- Slot -> shelf mapping (real slot values) ----
export const SHELF_SLOTS: Record<CoreShelf, MealSlot[]> = {
  breakfast: ['breakfast', 'brunch'],
  lunch:     ['lunch', 'second_lunch'],
  dinner:    ['dinner', 'early_dinner'],
  snacks:    ['snack', 'morning_snack', 'afternoon_snack', 'evening_snack'],
  dessert:   ['dessert'],
};

// pre_workout / post_workout are NOT snacks — they're exotic opt-in shelves.
export const EXOTIC_SLOTS: MealSlot[] = [
  'brunch', 'second_lunch', 'early_dinner',
  'morning_snack', 'afternoon_snack', 'evening_snack',
  'pre_workout', 'post_workout',
];

// ---- Badge ----
export function mealBadge(meal: MealLike): BadgeKind {
  const m = meal.methods?.[0];
  const total = m?.time_total_minutes ?? 0;
  const active = m?.time_active_minutes ?? 0;
  if (total >= SET_AND_FORGET_MIN) return 'set_and_forget';
  if (active > 0 && active <= FAST_ACTIVE_MAX) return 'fast';
  return 'none';
}

// ---- Density ----
export function mealDensity(meal: MealLike): number {
  const p = meal.plates?.[0];
  const kcal = p?.plate_macros?.kcal ?? 0;
  const g = p?.plate_finished_weight_g ?? 0;
  return g > 0 ? kcal / g : 0;
}
export function densityUnavailable(meals: MealLike[]): boolean {
  return meals.every((m) => mealDensity(m) === 0);
}

// ---- Selection counting (distinct meals, not plate-keys) ----
export function isMealPicked(meal: MealLike, selected: Set<string>): boolean {
  if (selected.has(meal.slug)) return true;
  const prefix = meal.slug + ':';
  for (const k of selected) if (k.startsWith(prefix)) return true;
  return false;
}
export function pickedMealCount(meals: MealLike[], selected: Set<string>): number {
  return meals.filter((m) => isMealPicked(m, selected)).length;
}

// ---- Shelf status ----
export interface ShelfStatusResult { status: ShelfStatus; picked: number; needed: number; }
export function coreShelfStatus(shelf: CoreShelf, shelfMeals: MealLike[], selected: Set<string>): ShelfStatusResult {
  const picked = pickedMealCount(shelfMeals, selected);
  const t = LEAN_THRESHOLDS[shelf];
  if (picked === 0) return { status: 'empty', picked, needed: t };
  if (picked < t) return { status: 'lean', picked, needed: t - picked };
  return { status: 'ready', picked, needed: 0 };
}
export function exoticShelfStatus(shelfMeals: MealLike[], selected: Set<string>): ShelfStatusResult {
  const picked = pickedMealCount(shelfMeals, selected);
  return picked === 0 ? { status: 'empty', picked, needed: 1 } : { status: 'ready', picked, needed: 0 };
}

// ---- Filtering: intersection across groups, union within group ----
export interface FilterState { equipment: Set<EquipmentType>; time: TimeBucket | null; }
export function emptyFilter(): FilterState { return { equipment: new Set(), time: null }; }

export function mealTimeBucket(meal: MealLike): TimeBucket {
  const active = meal.methods?.[0]?.time_active_minutes ?? 0;
  if (active <= 15) return 'quick';
  if (active <= 30) return 'medium';
  return 'involved';
}

// Equipment a meal can be made with = union of its methods' equipment_required.
// (Plate-level equipment_required is ADDITIVE kit for a specific plate; it does
// not make the meal "require" that kit, so it's excluded from the meal-level
// filterable set. A plate's own kit is enforced downstream at plan time.)
export function mealEquipment(meal: MealLike): Set<EquipmentType> {
  const s = new Set<EquipmentType>();
  meal.methods?.forEach((m) =>
    m.equipment_required?.forEach((e) => { if (EQUIPMENT_ORDER.includes(e)) s.add(e); })
  );
  return s;
}

export function passesFilter(meal: MealLike, f: FilterState): boolean {
  if (f.equipment.size > 0) {
    const me = mealEquipment(meal);
    let hit = false;
    for (const e of f.equipment) if (me.has(e)) { hit = true; break; }
    if (!hit) return false;
  }
  if (f.time && mealTimeBucket(meal) !== f.time) return false;
  return true;
}

function nameOf(m: MealLike): string {
  return m.plates?.[0]?.display_name || m.display_name || m.slug;
}
export function mealsForSlots<T extends MealLike>(slots: MealSlot[], all: T[], f: FilterState, sort: SortMode): T[] {
  let list = all.filter((m) => (m.eligible_slots ?? []).some((s) => slots.includes(s)) && passesFilter(m, f));
  if (sort === 'density') list = [...list].sort((a, b) => mealDensity(b) - mealDensity(a));
  else list = [...list].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  return list;
}
export function mealsForCoreShelf<T extends MealLike>(shelf: CoreShelf, all: T[], f: FilterState, sort: SortMode): T[] {
  return mealsForSlots(SHELF_SLOTS[shelf], all, f, sort);
}

// ---- Trailing card ----
export type TrailingCard =
  | { kind: 'all_picked'; total: number }
  | { kind: 'more'; more: number }
  | { kind: 'none' };
export function trailingCardState(shelfMeals: MealLike[], selected: Set<string>, expanded: boolean, cap: number = SHELF_CARD_CAP): TrailingCard {
  const total = shelfMeals.length;
  if (total > 0 && pickedMealCount(shelfMeals, selected) === total) return { kind: 'all_picked', total };
  if (expanded) return { kind: 'none' };
  const more = total - cap;
  if (more >= 2) return { kind: 'more', more };
  return { kind: 'none' };
}

// ---- Equipment chip counts (stable list incl. zeros; scoped to time filter) ----
export interface EquipmentChip { value: EquipmentType; count: number; disabled: boolean; }
export function equipmentChipCounts(all: MealLike[], f: FilterState): EquipmentChip[] {
  const timeOnly: FilterState = { equipment: new Set(), time: f.time };
  const pool = all.filter((m) => passesFilter(m, timeOnly));
  return EQUIPMENT_ORDER.map((value) => {
    const count = pool.filter((m) => mealEquipment(m).has(value)).length;
    return { value, count, disabled: count === 0 };
  });
}