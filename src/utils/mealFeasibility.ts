// src/utils/mealFeasibility.ts
//
// Basket feasibility engine + certified-fix search.
//
// Answers ONE question at Save time: given the user's picks, their slot
// structure, and the downstream system's two levers (independent per-meal
// scaling within [min_scale, max_scale]; capped single-ingredient top-ups),
// is the macro target reachable at all? Binary reachability — landing the
// exact numbers is the generation-time job, not this file's.
//
// Design rules this encodes (locked):
// - Runs ONCE per Save. Never while picking. Never blocks.
// - Fires only on HARD infeasibility: unreachable even at max scale + full
//   top-up caps. No soft "leans on top-ups" tier.
// - Empty slots are bounded by a real filler pool (quick/simple eligible
//   meals), not treated as free variables.
// - Certification is brute force: a fix is only claimed if hypothetically
//   adding that exact plate flips the verdict green. Adding an option is
//   monotone (it can only expand the feasible region), so certificates are
//   sound within the model.
// - Floors checked for protein + calories (adders can't always rescue them);
//   ceilings checked for calories (daily) and fat/carbs (weekly average) —
//   the can't-subtract failure mode. Fiber checked as a floor with its cap.
//
// All functions are pure. `__internals` is exported for the unit tests in
// the validation plan (engine-vs-exhaustive, fire-rate Monte Carlo).

import { CuratedMeal } from '../types/curated_meals';
import {
  MealSlot,
  emptyFilter,
  mealsForSlots,
} from './curatedShelves';

// ---------------------------------------------------------------------------
// Tunables (design constants from the adjuster spec — keep in sync with the
// generation prompt's adjuster table)
// ---------------------------------------------------------------------------

export const ADJ_KCAL_UP_CAP = 720; // max daily kcal addable from adjusters
// derivation: protein_shake 250 + mixed_nuts 250 + protein_bar 220 = 720
export const ADJ_PROTEIN_CAP = 80;  // max daily protein addable from adjusters  
// derivation: protein_shake 35 + tuna_pouch 25 + protein_bar 20 = 80
export const ADJ_FIBER_CAP = 15;    // max daily fiber addable from adjusters
// derivation: steamed_mixed_veg 5 + berries 5 + protein_bar 5 = 15

const KCAL_TOL = 0.05;   // daily ±5%
const PROTEIN_TOL = 0.10; // daily ±10% (floor = 0.90 × target)
const WEEKLY_TOL = 0.10;  // carbs/fat ±10% weekly average
const FIBER_FLOOR = 0.80; // ≥80% of fiber target daily

const DEFAULT_S_MIN = 0.7;
const DEFAULT_S_MAX = 1.5;
// Empty-slot pool = quick/simple eligible meals. 20, not 15: this must equal
// FILLER_MAX_ACTIVE_MINUTES in mealPlanPromptV2.ts or the engine models a
// smaller rescue pool than the plan actually gets (found drifted at 15/20).
const FILLER_MAX_MINUTES = 20;
const MAX_FIXES = 3;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface Targets {
  kcal: number;
  protein_g: number;
  fiber_g?: number; // optional — fiber check skipped if absent
  carbs_g?: number; // optional — weekly carb ceiling skipped if absent
  fat_g?: number;   // optional — weekly fat ceiling skipped if absent
}

export type FailAxis = 'protein' | 'calories' | 'fat' | 'carbs' | 'fiber';
export type FailDirection = 'floor' | 'ceiling';

export interface Failure {
  axis: FailAxis;
  direction: FailDirection;
  /** Daily-equivalent gap in the axis's own unit (g, or kcal for calories). */
  gap: number;
}

export interface CertifiedFix {
  slug: string;
  plateId: string;
  /** SlotSpec.id the fix was certified in — apply the pick into this slot. */
  slot: string;
  /** Tab/slot the fix was certified in (display label, e.g. "Breakfast"). */
  slotLabel: string;
  name: string;
  imageFilename?: string;
}

export interface BasketVerdict {
  feasible: boolean;
  /** Worst failure first. Empty when feasible. */
  failures: Failure[];
  /** Up to 3 single additions, each individually proven to flip the verdict. */
  fixes: CertifiedFix[];
  /** True when failures exist but no single addition certifies (red copy). */
  unfixableBySingleAdd: boolean;
}

/**
 * The screen describes its visible tabs in this shape. `mealSlots` is the
 * list of MealSlot keys the tab draws from (same values passed to
 * mealsForSlots today). `perDay` is occurrences per day on days the slot
 * occurs; `weeklyOccurrences` is total per week (dessert < 7 ⇒ its own
 * day-type). `borrowGroup` marks interchangeable slots (lunch+dinner).
 */
export interface SlotSpec {
  id: string;
  label: string;
  mealSlots: MealSlot[];
  perDay: number;
  weeklyOccurrences: number;
  borrowGroup?: 'main';
}

export interface AssessArgs {
  slots: SlotSpec[];
  /**
   * V2 (slot-scoped): `${slotId}|${key}` where key is a bare slug or
   * `${slug}:${plateId}` and slotId matches a SlotSpec.id. Legacy bare keys
   * (no '|') are also accepted and resolve by eligibility, the V1 behaviour.
   */
  selectedKeys: string[];
  allMeals: CuratedMeal[];
  targets: Targets;
  allergies?: string[];
  avoid?: string[];
}

// ---------------------------------------------------------------------------
// Option extraction
// ---------------------------------------------------------------------------

interface Opt {
  kcal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
  sMin: number;
  sMax: number;
}

// Single choke point for plate-macro field names. If your Plate type names
// these differently, fix it HERE only. (Verified against butter_chicken.md:
// kcal / protein / carbs / fat / fiber, snake_case with _g suffix.)
function plateToOpt(meal: CuratedMeal, plate: any): Opt | null {
  const pm: any = plate?.plate_macros;
  if (!pm || !pm.kcal) return null;
  return {
    kcal: pm.kcal,
    p: pm.protein_g ?? 0,
    c: pm.carbs_g ?? 0,
    f: pm.fat_g ?? 0,
    fib: pm.fiber_g ?? 0,
    sMin: (meal as any).min_scale ?? DEFAULT_S_MIN,
    sMax: (meal as any).max_scale ?? DEFAULT_S_MAX,
  };
}

function nonStuntPlates(meal: CuratedMeal): any[] {
  return (meal.plates ?? []).filter((p: any) => !p.is_stunt_plate);
}

/** selectedKeys may be scoped (`slot|key`, V2) or bare (`key`, legacy). */
function splitScopedKeys(selectedKeys: string[]): {
  legacy: Set<string>;
  bySlot: Map<string, Set<string>>;
} {
  const legacy = new Set<string>();
  const bySlot = new Map<string, Set<string>>();
  for (const raw of selectedKeys) {
    const i = raw.indexOf('|');
    if (i === -1) {
      legacy.add(raw);
    } else {
      const slot = raw.slice(0, i);
      const key = raw.slice(i + 1);
      if (!bySlot.has(slot)) bySlot.set(slot, new Set());
      bySlot.get(slot)!.add(key);
    }
  }
  return { legacy, bySlot };
}

/**
 * Resolve the user's selected keys into options for one slot spec. Scoped
 * keys bind to the spec whose id matches their slot; legacy bare keys fall
 * back to eligibility membership (the V1 behaviour). Lunch↔dinner borrowing
 * is applied later in buildWeek via borrowGroup, not here.
 */
function optionsForSlot(
  spec: SlotSpec,
  selectedKeys: string[],
  allMeals: CuratedMeal[]
): Opt[] {
  const eligible = mealsForSlots(spec.mealSlots, allMeals, emptyFilter(), 'default');
  const { legacy, bySlot } = splitScopedKeys(selectedKeys);
  const scoped = bySlot.get(spec.id);
  const selected = new Set<string>([...legacy, ...(scoped ?? [])]);
  const opts: Opt[] = [];
  for (const meal of eligible) {
    if (selected.has(meal.slug)) {
      // Bare slug = AI may choose among non-stunt plates.
      for (const plate of nonStuntPlates(meal)) {
        const o = plateToOpt(meal, plate);
        if (o) opts.push(o);
      }
    }
    for (const plate of meal.plates ?? []) {
      if (selected.has(`${meal.slug}:${(plate as any).id}`)) {
        const o = plateToOpt(meal, plate);
        if (o) opts.push(o);
      }
    }
  }
  return opts;
}

/** Empty-slot pool: quick/simple eligible meals, non-stunt plates. */
// Keep in lockstep with mealPlanPromptV2.ts — the engine must model the SAME
// filler set the prompt will actually offer, or verdicts drift from reality.
const DEFAULT_FILLER_SLUGS: string[] = [
  'greek_yoghurt_bowl',
  'hard_boiled_eggs',
  'protein_shake',
  'overnight_oats',
  'edamame',
  'mixed_nuts',
  'banana_snack',
  'greek_yogurt_snack',
  'tuna_pouch',
];
const FALLBACK_UF_PLATES = 6;

/** Lowercased allergen/avoid lists, applied to FILLER options only — picked
 *  options are never filtered (self-selection is the filter), exactly like
 *  buildFrames' passesDiet in mealPlanPromptV2.ts. Without this the engine
 *  models rescue meals an allergic user's plan will never contain. */
interface DietFilter {
  allergies: string[];
  avoid: string[];
}

function passesDiet(meal: CuratedMeal, diet: DietFilter): boolean {
  const mealAllergens = String((meal as any).contains_allergens ?? '').toLowerCase();
  if (diet.allergies.some((a) => a && mealAllergens.includes(a))) return false;
  const nameLc = meal.display_name.toLowerCase();
  if (diet.avoid.some((a) => a && nameLc.includes(a))) return false;
  return true;
}

function fillerOptionsForSlot(
  spec: SlotSpec,
  allMeals: CuratedMeal[],
  diet: DietFilter
): Opt[] {
  const eligible = mealsForSlots(spec.mealSlots, allMeals, emptyFilter(), 'default');
  // Tier 1: authored filler pool, gated on HANDS-ON time (overnight oats is
  // 5 min active / 245 total and belongs in the pool).
  const opts: Opt[] = [];
  for (const meal of eligible) {
    const isFiller =
      (meal as any).universal_filler === true ||
      DEFAULT_FILLER_SLUGS.includes(meal.slug as string);
    if (!isFiller) continue;
    if (!passesDiet(meal, diet)) continue;
    const m0: any = (meal as any).methods?.[0];
    const active = m0?.time_active_minutes ?? m0?.time_total_minutes ?? 0;
    if (active > FILLER_MAX_MINUTES) continue;
    for (const plate of nonStuntPlates(meal)) {
      const o = plateToOpt(meal, plate);
      if (o) opts.push(o);
    }
  }
  if (opts.length > 0) return opts;
  // Tier 2 (mains, dessert): top eligible plates by protein density — the
  // prompt builder inlines the same fallback as UF rows, so an uncovered
  // lunch/dinner is still assessable instead of skipping the whole check.
  const candidates: Opt[] = [];
  for (const meal of eligible) {
    if (!passesDiet(meal, diet)) continue;
    for (const plate of nonStuntPlates(meal)) {
      const o = plateToOpt(meal, plate);
      if (o) candidates.push(o);
    }
  }
  candidates.sort((x, y) => y.p / y.kcal - x.p / x.kcal);
  return candidates.slice(0, FALLBACK_UF_PLATES);
}

// ---------------------------------------------------------------------------
// Day-type construction
// ---------------------------------------------------------------------------

interface Occ {
  options: Opt[];
}
type DayType = Occ[];

interface WeekModel {
  /** [dayType, daysPerWeek] — e.g. [base, 6], [base+dessert, 1]. */
  dayTypes: [DayType, number][];
}

const NO_DIET: DietFilter = { allergies: [], avoid: [] };

function buildWeek(
  slots: SlotSpec[],
  selectedKeys: string[],
  allMeals: CuratedMeal[],
  injected?: { slotId: string; opt: Opt },
  diet: DietFilter = NO_DIET
): WeekModel | null {
  // Resolve options per slot, with lunch/dinner borrowing.
  const perSlot = new Map<string, Opt[]>();
  for (const spec of slots) {
    let opts = optionsForSlot(spec, selectedKeys, allMeals);
    if (injected && injected.slotId === spec.id) opts = [...opts, injected.opt];
    perSlot.set(spec.id, opts);
  }
  // Borrow: main-group slots share their unions.
  const mainIds = slots.filter((s) => s.borrowGroup === 'main').map((s) => s.id);
  if (mainIds.length > 1) {
    const union: Opt[] = mainIds.flatMap((id) => perSlot.get(id) ?? []);
    if (union.length > 0) for (const id of mainIds) perSlot.set(id, union);
  }
  // Empty slots fall back to the filler pool.
  for (const spec of slots) {
    if ((perSlot.get(spec.id) ?? []).length === 0) {
      const fillers = fillerOptionsForSlot(spec, allMeals, diet);
      if (fillers.length === 0) return null; // can't model this slot — skip check
      perSlot.set(spec.id, fillers);
    }
  }

  const daily = slots.filter((s) => s.weeklyOccurrences >= 7);
  const capped = slots.filter(
    (s) => s.weeklyOccurrences > 0 && s.weeklyOccurrences < 7
  );

  const base: DayType = [];
  for (const spec of daily) {
    const perDay = Math.max(1, Math.round(spec.weeklyOccurrences / 7));
    for (let i = 0; i < perDay; i++) base.push({ options: perSlot.get(spec.id)! });
  }
  if (base.length === 0) return null;

  // One extra day-type per capped slot (dessert is the realistic case; if
  // several capped slots exist they're modeled on the same heavy day —
  // conservative and simple).
  if (capped.length === 0) return { dayTypes: [[base, 7]] };
  const heavyDays = Math.max(...capped.map((s) => s.weeklyOccurrences));
  const heavy: DayType = [
    ...base,
    ...capped.map((s) => ({ options: perSlot.get(s.id)! })),
  ];
  return {
    dayTypes: [
      [base, 7 - heavyDays],
      [heavy, heavyDays],
    ],
  };
}

// ---------------------------------------------------------------------------
// Per-day greedy bounds
// ---------------------------------------------------------------------------

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function kcalBounds(day: DayType): { lo: number; hi: number } {
  return {
    lo: sum(day.map((o) => Math.min(...o.options.map((x) => x.kcal * x.sMin)))),
    hi: sum(day.map((o) => Math.max(...o.options.map((x) => x.kcal * x.sMax)))),
  };
}

/**
 * Max achievable {axis} on this day at a calorie spend inside [kLo, kHi].
 * Per occurrence, take the best-density option for the axis; pour remaining
 * calories by density. Continuous-knapsack greedy — optimal for this shape.
 * Returns null if the day can't even reach kLo (caller handles via kcal check).
 */
function maxAxisAtKcal(
  day: DayType,
  axis: (o: Opt) => number,
  kLo: number,
  kHi: number
): number {
  const occ = day.map((o) => {
    let best = o.options[0];
    let bestRho = -1;
    for (const x of o.options) {
      const rho = axis(x) / x.kcal;
      if (rho > bestRho) { bestRho = rho; best = x; }
    }
    return { rho: bestRho, kMin: best.kcal * best.sMin, kMax: best.kcal * best.sMax };
  });
  let spend = sum(occ.map((o) => o.kMin));
  let val = sum(occ.map((o) => o.rho * o.kMin));
  const budget = Math.min(Math.max(spend, kLo), kHi);
  let remaining = budget - spend;
  if (remaining > 0) {
    for (const o of [...occ].sort((a, b) => b.rho - a.rho)) {
      const add = Math.min(remaining, o.kMax - o.kMin);
      if (add > 0) { val += o.rho * add; remaining -= add; }
      if (remaining <= 0) break;
    }
  }
  return val;
}

/**
 * SOUND lower bound on achievable {axis} while keeping calories ≥ kLo.
 *
 * The previous implementation was a mirror of the max greedy: pick the
 * min-density option per occurrence and lock ITS kcal·sMin. That is not a
 * lower bound — when a slot holds a low-density giant (banana bulk: cheap
 * carbs per kcal, huge minimum serve) next to a small higher-density option,
 * the greedy locked the giant's floor and reported a minimum ~35 g ABOVE what
 * the plan can actually reach, so the engine could claim hard infeasibility
 * for feasible baskets. The design brief is fire-only-on-certainty, so the
 * bound must never exceed the true minimum.
 *
 * New bound (each term provably ≤ the true minimum):
 *   floors  = Σ_occ min over options of axis·sMin
 *             (every occurrence serves SOME option at ≥ its own sMin)
 *   + pour  = max(0, kLo − Σ_occ max over options of kcal·sMin) · ρmin
 *             (calories a real day must still add beyond even the most
 *              generous reading of its floor spend, each costing at least
 *              the day's best density ρmin = min over ALL options of
 *              axis/kcal)
 *   and, taken together with the simple density bound ρmin · kLo:
 *   return max(floors + pour, ρmin · kLo)
 *
 * Proof sketch for floors+pour: write each occurrence's kcal as
 * kMin(chosen) + eᵢ with eᵢ ≥ 0. Then axis ≥ Σ floorᵢ + ρmin·Σeᵢ and
 * Σeᵢ ≥ kLo − Σ kMin(chosen) ≥ kLo − Σ maxKMinᵢ.
 *
 * This is exactly the "two servings of the cheapest option lock in N grams"
 * arithmetic: locked per-slot floors summed, which is the failure mode the
 * check exists to catch.
 */
function minAxisAtKcal(day: DayType, axis: (o: Opt) => number, kLo: number): number {
  let floors = 0;
  let maxKMinSum = 0;
  let rhoMin = Number.POSITIVE_INFINITY;
  for (const o of day) {
    let axisFloor = Number.POSITIVE_INFINITY;
    let maxKMin = 0;
    for (const x of o.options) {
      axisFloor = Math.min(axisFloor, axis(x) * x.sMin);
      maxKMin = Math.max(maxKMin, x.kcal * x.sMin);
      rhoMin = Math.min(rhoMin, axis(x) / x.kcal);
    }
    if (!Number.isFinite(axisFloor)) return 0; // occurrence with no options — degenerate, claim nothing
    floors += axisFloor;
    maxKMinSum += maxKMin;
  }
  if (!Number.isFinite(rhoMin)) return 0;
  const pour = Math.max(0, kLo - maxKMinSum) * rhoMin;
  return Math.max(floors + pour, rhoMin * kLo);
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

function checkWeek(week: WeekModel, T: Targets): Failure[] {
  const failures: Failure[] = [];
  const kLo = (1 - KCAL_TOL) * T.kcal;
  const kHi = (1 + KCAL_TOL) * T.kcal;
  const pFloor = (1 - PROTEIN_TOL) * T.protein_g;

  let weeklyFatMin = 0;
  let weeklyCarbMin = 0;
  let worstKcalFloorGap = 0;
  let worstKcalCeilGap = 0;
  let worstProteinGap = 0;
  let worstFiberGap = 0;

  for (const [day, count] of week.dayTypes) {
    if (count <= 0 || day.length === 0) continue;
    const { lo, hi } = kcalBounds(day);

    if (lo > kHi) worstKcalCeilGap = Math.max(worstKcalCeilGap, lo - kHi);
    if (hi + ADJ_KCAL_UP_CAP < kLo)
      worstKcalFloorGap = Math.max(worstKcalFloorGap, kLo - hi - ADJ_KCAL_UP_CAP);

    const maxP = maxAxisAtKcal(day, (o) => o.p, kLo, kHi);
    if (maxP + ADJ_PROTEIN_CAP < pFloor)
      worstProteinGap = Math.max(worstProteinGap, pFloor - maxP - ADJ_PROTEIN_CAP);

    if (T.fiber_g) {
      const maxFib = maxAxisAtKcal(day, (o) => o.fib, kLo, kHi);
      const fibFloor = FIBER_FLOOR * T.fiber_g;
      if (maxFib + ADJ_FIBER_CAP < fibFloor)
        worstFiberGap = Math.max(worstFiberGap, fibFloor - maxFib - ADJ_FIBER_CAP);
    }

    weeklyFatMin += count * minAxisAtKcal(day, (o) => o.f, lo > kLo ? lo : kLo);
    weeklyCarbMin += count * minAxisAtKcal(day, (o) => o.c, lo > kLo ? lo : kLo);
  }

  if (worstProteinGap > 0)
    failures.push({ axis: 'protein', direction: 'floor', gap: worstProteinGap });
  if (worstKcalCeilGap > 0)
    failures.push({ axis: 'calories', direction: 'ceiling', gap: worstKcalCeilGap });
  if (worstKcalFloorGap > 0)
    failures.push({ axis: 'calories', direction: 'floor', gap: worstKcalFloorGap });
  if (T.fat_g) {
    const fatCeil = 7 * T.fat_g * (1 + WEEKLY_TOL);
    if (weeklyFatMin > fatCeil)
      failures.push({ axis: 'fat', direction: 'ceiling', gap: (weeklyFatMin - fatCeil) / 7 });
  }
  if (T.carbs_g) {
    const carbCeil = 7 * T.carbs_g * (1 + WEEKLY_TOL);
    if (weeklyCarbMin > carbCeil)
      failures.push({ axis: 'carbs', direction: 'ceiling', gap: (weeklyCarbMin - carbCeil) / 7 });
  }
  if (worstFiberGap > 0)
    failures.push({ axis: 'fiber', direction: 'floor', gap: worstFiberGap });

  // Worst-first: protein > calories > fat > carbs > fiber.
  const rank: Record<FailAxis, number> = { protein: 0, calories: 1, fat: 2, carbs: 3, fiber: 4 };
  failures.sort((a, b) => rank[a.axis] - rank[b.axis]);
  return failures;
}

/** Min positive slack across all checks — used to rank certified fixes. */
function feasibilityMargin(week: WeekModel, T: Targets): number {
  const kLo = (1 - KCAL_TOL) * T.kcal;
  const kHi = (1 + KCAL_TOL) * T.kcal;
  const pFloor = (1 - PROTEIN_TOL) * T.protein_g;
  let margin = Number.POSITIVE_INFINITY;
  for (const [day, count] of week.dayTypes) {
    if (count <= 0 || day.length === 0) continue;
    const { lo, hi } = kcalBounds(day);
    margin = Math.min(margin, kHi - lo, hi + ADJ_KCAL_UP_CAP - kLo);
    const maxP = maxAxisAtKcal(day, (o) => o.p, kLo, kHi);
    margin = Math.min(margin, maxP + ADJ_PROTEIN_CAP - pFloor);
  }
  return margin;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function assessBasket(args: AssessArgs): BasketVerdict | null {
  const { slots, selectedKeys, allMeals, targets } = args;
  if (!targets || !targets.kcal || !targets.protein_g) return null;
  const diet: DietFilter = {
    allergies: (args.allergies ?? []).map((a) => a.toLowerCase()),
    avoid: (args.avoid ?? []).map((a) => a.toLowerCase()),
  };
  const week = buildWeek(slots, selectedKeys, allMeals, undefined, diet);
  if (!week) return null; // structure not modelable — silently pass (never block)

  const failures = checkWeek(week, targets);
  if (failures.length === 0)
    return { feasible: true, failures: [], fixes: [], unfixableBySingleAdd: false };

  // --- Certified-fix search: brute force, per plate, per slot ---
  const picked = new Set(
    selectedKeys.map((raw) => {
      const k = raw.includes('|') ? raw.slice(raw.indexOf('|') + 1) : raw;
      return k.includes(':') ? k.split(':')[0] : k;
    })
  );
  const { allergies, avoid } = diet;

  const candidates: (CertifiedFix & { margin: number })[] = [];
  for (const spec of slots) {
    const eligible = mealsForSlots(spec.mealSlots, allMeals, emptyFilter(), 'default');
    for (const meal of eligible) {
      if (picked.has(meal.slug)) continue;
      const mealAllergens = String((meal as any).contains_allergens ?? '').toLowerCase();
      if (allergies.some((a) => a && mealAllergens.includes(a))) continue;
      const nameLc = meal.display_name.toLowerCase();
      if (avoid.some((a) => a && nameLc.includes(a))) continue;

      for (const plate of nonStuntPlates(meal)) {
        const opt = plateToOpt(meal, plate);
        if (!opt) continue;
        const hypo = buildWeek(slots, selectedKeys, allMeals, {
          slotId: spec.id,
          opt,
        }, diet);
        if (!hypo) continue;
        if (checkWeek(hypo, targets).length === 0) {
          candidates.push({
            slug: meal.slug,
            plateId: (plate as any).id,
            slot: spec.id,
            slotLabel: spec.label,
            name: meal.display_name,
            imageFilename:
              (plate as any).image_filename ?? (meal as any).image_filename,
            margin: feasibilityMargin(hypo, targets),
          });
        }
      }
    }
  }

  // Best plate per slug, ranked by post-fix margin.
  const bestBySlug = new Map<string, CertifiedFix & { margin: number }>();
  for (const c of candidates) {
    const cur = bestBySlug.get(c.slug);
    if (!cur || c.margin > cur.margin) bestBySlug.set(c.slug, c);
  }
  const fixes = [...bestBySlug.values()]
    .sort((a, b) => b.margin - a.margin)
    .slice(0, MAX_FIXES)
    .map(({ margin, ...fix }) => fix);

  return {
    feasible: false,
    failures,
    fixes,
    unfixableBySingleAdd: fixes.length === 0,
  };
}

// Exposed for the validation plan's unit tests (engine vs exhaustive,
// fire-rate Monte Carlo). Not for app code.
export const __internals = {
  buildWeek,
  checkWeek,
  kcalBounds,
  maxAxisAtKcal,
  minAxisAtKcal,
  feasibilityMargin,
};