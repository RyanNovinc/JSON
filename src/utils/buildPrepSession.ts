/**
 * buildPrepSession — projects a generated weekly meal plan into a deterministic
 * "Meal-Prep Session". Pure function, no AI, no I/O: it groups the plan's meals
 * by curated slug + plate, classifies each group by its `meal_prep` metadata
 * (plate-level overriding meal-level), and sorts the cook-ahead / prep-ahead
 * work longest-first.
 *
 * Meals with no curated linkage (invented / manual / legacy) can't be classified
 * from metadata, so they fall to the quiet "Make fresh" list by name. A plan with
 * ZERO curated linkage is flagged `isLegacyPlan` so the screen can show a
 * "regenerate to use prep" line instead of an empty cook-ahead.
 *
 * Servings note: `cookServings` (what we deep-link into the cook flow) is the
 * rounded SUM of per-eating scale factors across the group, NOT the occurrence
 * count — this is a bulking app, scale factors run >1, so occurrences would
 * undershoot. The builder stays UI-agnostic and does NOT clamp to the cook
 * flow's portion range; that clamp belongs at the deep-link boundary (the
 * RecipeDetail `servings` route param), because the bound is a UI constant, not
 * a property of the recipe. (min_scale/max_scale are NOT the right bound — they
 * cap a single serving's scale, a different unit from a portion count.)
 */

import type {
  SimplifiedMealPlan,
} from '../types/nutrition';
import type {
  CuratedMeal,
  Plate,
  CookingMethod,
  RecipeStep,
  MealPrep,
  MealPrepStrategy,
  EquipmentType,
} from '../types/curated_meals';
import { CURATED_MEALS } from '../data/curated_meals';
import { resolveMealInstructions } from './resolveMealIngredients';

export type PrepStrategy = MealPrepStrategy; // 'full' | 'partial' | 'none'

/** New freshness-aware item format for meal-prep session UI */
export interface PrepSessionItem {
  curated_meal_slug: string;
  plate_id: string;
  display_name: string;
  total_servings: number;
  dates_eaten: string[]; // YYYY-MM-DD
  meal_prep: {
    strategy: 'full' | 'partial' | 'none';
    prep_note?: string;
    storage?: {
      fridge_days?: number;
      freeze_months?: number;
    };
  };
  freshness?: {
    fridge_days: number;        // resolved or default 4
    fridge_dates: string[];     // eat dates with offset < fridge_days
    freeze_dates: string[];     // eat dates with offset >= fridge_days
    freeze_servings: number;
    freeze_note?: string;       // e.g. "Freeze 3 portions on cook day —
                               //  thaw overnight before Jun 18, Jun 19, Jun 20"
  };
}

/** New freshness-aware session format */
export interface PrepSessionWithFreshness {
  sessionDate: string; // YYYY-MM-DD
  items: PrepSessionItem[];
}

/** A batch of identical meal (same slug + plate) to cook or prep ahead. */
export interface PrepGroup {
  /** `${slug}::${plateId}` — stable, used as the AsyncStorage completion key. */
  key: string;
  slug: string;
  plateId: string;
  meal: CuratedMeal;
  plate: Plate;
  method: CookingMethod;
  displayName: string;
  /** How many plan meals map here. The human "covers N meals" count for the card. */
  occurrences: number;
  /** round(Σ scale_factor over occurrences), min 1. The value deep-linked into the cook flow. */
  cookServings: number;
  strategy: PrepStrategy;
  prepNote?: string;
  prepAheadSummary?: string;
  dayOfSummary?: string;
  reason?: string;
  storage?: { fridge_days?: number; freeze_months?: number };
  /** method.time_total_minutes — used for longest-first ordering ONLY. */
  sortMinutes: number;
  /** method.time_active_minutes — one cook session's hands-on time. Feeds the payoff sum. */
  activeMinutes: number;
  /** 'full': all steps. 'partial': the method's base instructions (default boundary). */
  prepAheadSteps: RecipeStep[];
  /** 'partial': the plate's additional_instructions (assembled fresh). Empty for 'full'. */
  dayOfSteps: RecipeStep[];
}

/**
 * A line in the quiet "Make fresh" list. Covers both curated meals classified
 * 'none' (linked) and meals with no curated slug (unlinked / invented / legacy).
 * Deliberately lighter than PrepGroup: a PrepGroup mandates a resolved
 * CuratedMeal/Plate/Method, which unlinked meals don't have, and the Make-Fresh
 * list only needs a name + count.
 */
export interface MakeFreshItem {
  key: string;
  displayName: string;
  occurrences: number;
  /** true = a curated meal classified 'none'; false = no curated linkage. */
  linked: boolean;
  slug?: string;
  plateId?: string;
  reason?: string;
}

export interface PrepSession {
  /** strategy 'full' — cook everything ahead. Longest cook first. */
  cookAhead: PrepGroup[];
  /** strategy 'partial' — cook components ahead, finish fresh. Longest cook first. */
  prepAhead: PrepGroup[];
  /** strategy 'none' + all unlinked meals. Sorted by name. */
  makeFresh: MakeFreshItem[];
  totals: {
    /** Σ occurrences across cookAhead + prepAhead — the meals the prep "covers". */
    mealCount: number;
    /** Days the plan spans. */
    dayCount: number;
    /** Σ time_active_minutes across cookAhead + prepAhead. The payoff "~T min". NOT total time. */
    activeMinutes: number;
    /** # of plan meal instances that resolved to a curated meal (incl. 'none'). */
    curatedCount: number;
    /** true when curatedCount === 0 → screen shows "this plan predates prep support". */
    isLegacyPlan: boolean;
    /** Union of method equipment across cookAhead + prepAhead. Sorted for determinism. */
    equipment: EquipmentType[];
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Helper to resolve curated meal by slug - mirrors MealPlanDayScreen usage */
function getCuratedMealBySlug(slug: string, curated: Record<string, CuratedMeal> = CURATED_MEALS): CuratedMeal | null {
  return curated[slug] || null;
}

/** Helper to resolve plate from meal and plate_id - mirrors existing logic */
function getPlateFromMeal(meal: CuratedMeal, plateId: string): Plate | null {
  return meal.plates.find(p => p.id === plateId) || meal.plates[0] || null;
}

/** Helper to calculate days between two dates */
function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function sanitizeScale(n: unknown): number {
  return typeof n === 'number' && isFinite(n) && n > 0 ? n : 1;
}

function numOr(n: unknown, fallback: number): number {
  return typeof n === 'number' && isFinite(n) ? n : fallback;
}

/** Mirror RecipeDetailScreen: select by plate_id, else fall back to the first plate. */
function resolvePlate(meal: CuratedMeal, plateId: unknown): Plate {
  if (typeof plateId === 'string') {
    const found = meal.plates.find((p) => p.id === plateId);
    if (found) return found;
  }
  return meal.plates[0];
}

function unionEquipment(groups: PrepGroup[]): EquipmentType[] {
  const set = new Set<EquipmentType>();
  for (const g of groups) {
    const eq = g.method.equipment_required;
    if (Array.isArray(eq)) for (const e of eq) set.add(e);
  }
  return Array.from(set).sort();
}

interface Acc {
  meal: CuratedMeal;
  plate: Plate;
  method: CookingMethod;
  strategy: PrepStrategy;
  mp?: MealPrep;
  occurrences: number;
  scaleSum: number;
}

function toPrepGroup(key: string, acc: Acc): PrepGroup {
  const { meal, plate, method, strategy, mp, occurrences, scaleSum } = acc;
  // Base steps via the single resolver path: legacy → method.instructions;
  // template meals → the default variant's steps for this method.
  const resolvedBase = resolveMealInstructions(meal, method.id);
  const baseSteps = Array.isArray(resolvedBase) ? resolvedBase : [];
  const plateSteps = Array.isArray(plate.additional_instructions) ? plate.additional_instructions : [];

  let prepAheadSteps: RecipeStep[];
  let dayOfSteps: RecipeStep[];
  if (strategy === 'full') {
    // Cook everything ahead; nothing left for the day of.
    prepAheadSteps = [...baseSteps, ...plateSteps];
    dayOfSteps = [];
  } else {
    // 'partial' default boundary: base cooked ahead, plate assembled fresh.
    // (The *_step_ids overrides are inert until RecipeStep gains an id.)
    prepAheadSteps = baseSteps;
    dayOfSteps = plateSteps;
  }

  return {
    key,
    slug: meal.slug,
    plateId: plate.id,
    meal,
    plate,
    method,
    displayName: plate.display_name || meal.display_name,
    occurrences,
    cookServings: Math.max(1, Math.round(scaleSum)),
    strategy,
    prepNote: mp?.prep_note,
    prepAheadSummary: mp?.prep_ahead_summary,
    dayOfSummary: mp?.day_of_summary,
    reason: mp?.reason,
    storage: mp?.storage,
    sortMinutes: numOr(method.time_total_minutes, 0),
    activeMinutes: numOr(method.time_active_minutes, 0),
    prepAheadSteps,
    dayOfSteps,
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

/** New freshness-aware buildPrepSession that returns PrepSessionItem format */
export function buildPrepSessionWithFreshness(
  plan: SimplifiedMealPlan,
  curated: Record<string, CuratedMeal> = CURATED_MEALS,
): PrepSessionWithFreshness | null {
  const dailyMeals = plan?.dailyMeals;
  if (!dailyMeals || typeof dailyMeals !== 'object') return null;

  const dateKeys = Object.keys(dailyMeals).sort();
  if (dateKeys.length === 0) return null;

  // Find earliest date with actual meals for session date
  let sessionDate = dateKeys[0];
  for (const dateKey of dateKeys) {
    const dayData = dailyMeals[dateKey];
    if (dayData?.meals && Array.isArray(dayData.meals) && dayData.meals.length > 0) {
      // Check if any meals have curated_meal_slug (are eligible for prep)
      const hasCuratedMeals = dayData.meals.some(meal => meal.curated_meal_slug);
      if (hasCuratedMeals) {
        sessionDate = dateKey;
        break;
      }
    }
  }

  // Group servings by curated_meal_slug + plate_id
  const mealGroups: { [key: string]: { dates: string[]; meal: any; servings: number } } = {};

  for (const dateKey of dateKeys) {
    const dayData = dailyMeals[dateKey];
    if (!dayData?.meals || !Array.isArray(dayData.meals)) continue;

    for (const serving of dayData.meals) {
      if (serving.curated_meal_slug) {
        const groupKey = `${serving.curated_meal_slug}_${serving.plate_id || 'standard'}`;
        if (!mealGroups[groupKey]) {
          mealGroups[groupKey] = { dates: [], meal: serving, servings: 0 };
        }
        mealGroups[groupKey].dates.push(dateKey);
        mealGroups[groupKey].servings += 1; // Count number of meal instances
      }
    }
  }

  const items: PrepSessionItem[] = [];

  for (const [groupKey, group] of Object.entries(mealGroups)) {
    const { dates, meal, servings } = group;
    const curatedMeal = getCuratedMealBySlug(meal.curated_meal_slug, curated);
    if (!curatedMeal) continue;

    const plateId = meal.plate_id || 'standard';
    const plate = getPlateFromMeal(curatedMeal, plateId);
    if (!plate) continue;

    // Resolve storage config: plate-level overrides meal-level
    const storage = plate.meal_prep?.storage ?? curatedMeal.meal_prep?.storage;
    const strategy = plate.meal_prep?.strategy ?? curatedMeal.meal_prep?.strategy ?? 'none';
    const prepNote = plate.meal_prep?.prep_note ?? curatedMeal.meal_prep?.prep_note;

    // Skip 'none' strategy meals
    if (strategy === 'none') continue;

    // Compute freshness for 'full' and 'partial' strategies
    const fridgeDays = storage?.fridge_days ?? 4;
    const fridgeDates: string[] = [];
    const freezeDates: string[] = [];

    for (const eatDate of dates) {
      const offset = daysBetween(sessionDate, eatDate);
      if (offset < fridgeDays) {
        fridgeDates.push(eatDate);
      } else {
        freezeDates.push(eatDate);
      }
    }

    const freezeServings = freezeDates.length;
    let freezeNote: string | undefined;
    if (freezeDates.length > 0) {
      const formattedDates = freezeDates
        .map(date => {
          const d = new Date(date);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        })
        .join(', ');
      freezeNote = `Freeze ${freezeServings} portions on cook day — thaw overnight before ${formattedDates}`;
    }

    const item: PrepSessionItem = {
      curated_meal_slug: meal.curated_meal_slug,
      plate_id: plateId,
      display_name: plate.display_name || curatedMeal.display_name,
      total_servings: servings,
      dates_eaten: dates.sort(),
      meal_prep: {
        strategy,
        prep_note: prepNote,
        storage
      },
      freshness: {
        fridge_days: fridgeDays,
        fridge_dates: fridgeDates.sort(),
        freeze_dates: freezeDates.sort(),
        freeze_servings: freezeServings,
        freeze_note: freezeNote
      }
    };

    items.push(item);
  }

  return {
    sessionDate,
    items
  };
}

export function buildPrepSession(
  plan: SimplifiedMealPlan,
  curated: Record<string, CuratedMeal> = CURATED_MEALS,
): PrepSession {
  const empty: PrepSession = {
    cookAhead: [],
    prepAhead: [],
    makeFresh: [],
    totals: {
      mealCount: 0,
      dayCount: 0,
      activeMinutes: 0,
      curatedCount: 0,
      isLegacyPlan: true,
      equipment: [],
    },
  };

  const dailyMeals = plan?.dailyMeals;
  if (!dailyMeals || typeof dailyMeals !== 'object') return empty;

  const dayKeys = Object.keys(dailyMeals);
  const dayCount = dayKeys.length;

  const groups = new Map<string, Acc>();
  const freshCurated = new Map<string, MakeFreshItem>(); // curated meals classified 'none'
  const freshUnlinked = new Map<string, MakeFreshItem>(); // no curated linkage, keyed by name
  let curatedCount = 0;

  for (const dateKey of dayKeys) {
    const dayMeals = dailyMeals[dateKey]?.meals;
    if (!Array.isArray(dayMeals)) continue;

    for (const meal of dayMeals) {
      const slug = typeof meal?.curated_meal_slug === 'string' ? meal.curated_meal_slug : undefined;
      const curatedMeal = slug ? curated[slug] : undefined;

      const linked =
        !!slug &&
        !!curatedMeal &&
        Array.isArray(curatedMeal.plates) &&
        curatedMeal.plates.length > 0 &&
        Array.isArray(curatedMeal.methods) &&
        curatedMeal.methods.length > 0;

      if (!linked) {
        // Unlinked: invented / manual / legacy. Surface by name in Make Fresh.
        const name = (meal?.name || 'Untitled meal').trim() || 'Untitled meal';
        const k = `unlinked::${name.toLowerCase()}`;
        const existing = freshUnlinked.get(k);
        if (existing) existing.occurrences += 1;
        else freshUnlinked.set(k, { key: k, displayName: name, occurrences: 1, linked: false });
        continue;
      }

      // From here on curatedMeal is a valid, fully-populated CuratedMeal.
      const cm = curatedMeal as CuratedMeal;
      curatedCount += 1;

      const plate = resolvePlate(cm, meal.plate_id);
      const method = cm.methods[0];
      const mp = plate.meal_prep
        ? { ...cm.meal_prep, ...plate.meal_prep } as MealPrep
        : cm.meal_prep;
      const strategy: PrepStrategy = mp?.strategy ?? 'none';
      const k = `${cm.slug}::${plate.id}`;

      if (strategy === 'none') {
        const existing = freshCurated.get(k);
        if (existing) existing.occurrences += 1;
        else
          freshCurated.set(k, {
            key: k,
            displayName: plate.display_name || cm.display_name,
            occurrences: 1,
            linked: true,
            slug: cm.slug,
            plateId: plate.id,
            reason: mp?.reason,
          });
        continue;
      }

      const acc = groups.get(k);
      if (acc) {
        acc.occurrences += 1;
        acc.scaleSum += sanitizeScale(meal.scale_factor);
      } else {
        groups.set(k, {
          meal: cm,
          plate,
          method,
          strategy,
          mp,
          occurrences: 1,
          scaleSum: sanitizeScale(meal.scale_factor),
        });
      }
    }
  }

  const cookAhead: PrepGroup[] = [];
  const prepAhead: PrepGroup[] = [];
  for (const [key, acc] of groups) {
    const grp = toPrepGroup(key, acc);
    if (acc.strategy === 'full') cookAhead.push(grp);
    else prepAhead.push(grp); // 'partial'
  }

  const byLongestFirst = (a: PrepGroup, b: PrepGroup): number =>
    b.sortMinutes - a.sortMinutes || a.displayName.localeCompare(b.displayName);
  cookAhead.sort(byLongestFirst);
  prepAhead.sort(byLongestFirst);

  const makeFresh: MakeFreshItem[] = [...freshCurated.values(), ...freshUnlinked.values()].sort(
    (a, b) => a.displayName.localeCompare(b.displayName),
  );

  const prepGroups = [...cookAhead, ...prepAhead];
  const mealCount = prepGroups.reduce((s, g) => s + g.occurrences, 0);
  const activeMinutes = prepGroups.reduce((s, g) => s + g.activeMinutes, 0);

  return {
    cookAhead,
    prepAhead,
    makeFresh,
    totals: {
      mealCount,
      dayCount,
      activeMinutes,
      curatedCount,
      isLegacyPlan: curatedCount === 0,
      equipment: unionEquipment(prepGroups),
    },
  };
}

/** Helper for day view: returns map of meals to freeze dates */
export function buildFreshnessIndex(plan: SimplifiedMealPlan): Map<string, Set<string>> {
  const session = buildPrepSessionWithFreshness(plan);
  const index = new Map<string, Set<string>>();

  if (!session) return index;

  for (const item of session.items) {
    const key = `${item.curated_meal_slug}_${item.plate_id}`;
    const freezeDatesSet = new Set(item.freshness?.freeze_dates || []);
    index.set(key, freezeDatesSet);
  }

  return index;
}