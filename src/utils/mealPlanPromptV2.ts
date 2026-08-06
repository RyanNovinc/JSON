// src/utils/mealPlanPromptV2.ts
//
// V2 MEAL-PLAN GENERATION PROMPT BUILDER
// ======================================
// Replaces the legacy builders (dynamicMealPlanningPrompt.ts /
// mealPlanningPrompt.ts). Organising principle: THE APP PLANS, THE AI
// SCHEDULES AND ADDS. Every number that can be computed app-side is computed
// here and inlined as an absolute number. The external model's whole job:
// choose an option per occurrence, choose a scale, add the column, patch
// gaps from a fixed table.
//
// What changed vs the legacy builder:
// - PER-MEAL FETCHES ABOLISHED. Options are serialised from local
//   CURATED_MEALS (~1 table row per plate). One tiny fetch survives at the
//   top — the v2 instructions file — as capability gate + hotfix channel.
//   Review/JSON files stay fetched at stage transitions.
// - READS V2 SLOT-SCOPED PICKS. favorites.picks → per-slot frames, so plans
//   are slot-faithful. Lunch↔dinner borrowing is demoted from standing rule
//   to tool. Legacy slug-only saves hydrate into every eligible frame.
// - EQUIPMENT REMOVED END-TO-END. Curated picks are never equipment-checked
//   (self-selection is the filter); inventions assume a standard kitchen.
//   This also kills the live reviewer bug that swapped out picked smoothies.
// - TOLERANCES UNIFIED: kcal ±5% DAILY, protein ±10% daily, fiber ≥80%
//   daily, carbs/fat ±10% weekly average. Stated as absolute numbers.
// - PURE FUNCTION: buildMealPlanPrompt(answers, macros, favorites, sleep?)
//   reads NO storage — snapshot-testable. assembleMealPlanPromptV2() is the
//   thin async wrapper that loads and passes; wire it in wherever
//   assembleDynamicMealPlanningPrompt (or assembleMealPlanningPrompt) is
//   called today, then delete both legacy builders and the in-app
//   review/JSON prompts once the /prompts/v2/ files are live on json.fit.
//
// SERVER FILES THIS EXPECTS (upload before shipping; v1 URLs freeze forever):
//   https://json.fit/prompts/v2/instructions.md        (capability gate, ~500 words)
//   https://json.fit/prompts/v2/meal-review-prompt.md  (review, daily ±5% kcal)
//   https://json.fit/prompts/v2/meal-json-prompt.md    (conversion)
//
// OPTIONAL DATA PASS: add `universal_filler?: boolean` to CuratedMeal and tag
// the simple crowd-pleasers. Until then DEFAULT_FILLER_SLUGS below is the
// filler pool, so nothing blocks on the audit.
//
// FIELD-NAME CHOKE POINTS (fix here only if your repo differs):
//   - sniffMacros(): MacroResults field names
//   - answers.weight (kg), answers.startDate (token or ISO), budgetMin/Max

import { CuratedMeal, MealSlot, Plate } from '../types/curated_meals';
import { CURATED_MEALS } from '../data/curated_meals';
import { loadCustomMealViews } from './customMealsStorage';
import { INGREDIENTS } from '../data/ingredients';
import { resolveBaseIngredients } from './resolveMealIngredients';
import {
  CuratedFavoritesV2,
  PlanSlot,
  loadCuratedFavoritesV2,
} from './curatedFavoritesStorage';
import {
  NutritionAnswers,
  resolveNutritionAnswers,
} from './nutritionQuestionnaireStorage';
import { computeMacros, computeMacrosPhaseAware } from './nutritionMacros';
import { WorkoutStorage } from './storage';
import { loadGoalsProfile } from './goalsProfileStorage';
import { derivePhase } from './goalsProfile';
import type { DerivedPhase } from './goalsProfile';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const PROMPT_VERSION = 'v2';

// Cache-buster appended to every json.fit URL in the assembled prompt so that
// updating a server file yields a URL nothing has cached. Bump on each edit.
// Single definition lives in ../data/promptCacheVersion.ts — three hand-kept
// copies is how one of them silently went stale.
import { PROMPT_CACHE_VERSION } from '../data/promptCacheVersion';

const INSTRUCTIONS_URL = `https://json.fit/prompts/v2/instructions.md?v=${PROMPT_CACHE_VERSION}`;
const REVIEW_URL = `https://json.fit/prompts/v2/meal-review-prompt.md?v=${PROMPT_CACHE_VERSION}`;
const JSON_URL = `https://json.fit/prompts/v2/meal-json-prompt.md?v=${PROMPT_CACHE_VERSION}`;

const FETCH_FAIL_MESSAGE =
  "This prompt needs to fetch files from json.fit, but fetching isn't working in your AI. To use JSON.fit:\n" +
  '- Use Claude.ai with web search enabled in the message composer\n' +
  '- Or ChatGPT with browsing enabled\n' +
  'Then paste this prompt again.';

// Tolerances (the single statement of truth — review file must match).
const KCAL_TOL = 0.05; // daily
const PROTEIN_TOL = 0.1; // daily
const CF_TOL = 0.1; // carbs/fat, weekly average
const FIBER_FLOOR_PCT = 0.8; // daily
const PROTEIN_FLOOR_G_PER_KG = 0.4; // per main meal

const STUNT_CAP = 1;
const MAX_ADJUSTERS_PER_DAY = 3;
// Hands-on time gate for tier-1 fillers (ACTIVE minutes — overnight oats is
// 5 min active / 245 total and absolutely belongs in the pool).
const FILLER_MAX_ACTIVE_MINUTES = 20;
// When a frame has no picks and no tier-1 fillers (mains, dessert), inline
// the top eligible plates by protein density as UF rows instead — a
// delegated slot still produces curated references, never a blank table.
const FALLBACK_UF_PLATES = 6;

// Fallback filler pool until `universal_filler` is authored on the data.
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

// Fixed adjuster table — near-pure macro dials with exact per-unit macros.
// Emitted as STANDALONE plan entries (a shake next to breakfast), never
// attached to meals. Where one exists as a curated snack, the AI emits the
// curated reference instead of an invented entry.
interface Adjuster {
  id: string;
  unit: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
  axis: string;
  maxPerDay: number;
  curatedRef?: string; // slug to emit as curated reference
}
const ADJUSTERS: Adjuster[] = [
  { id: 'protein_shake',     unit: '1 serving',    kcal: 250, p: 35,  c: 16, f: 5,  fib: 0, axis: 'protein',     maxPerDay: 2, curatedRef: 'protein_shake' },
  { id: 'greek_yogurt_snack', unit: '1 serving',   kcal: 170, p: 17,  c: 9,  f: 6,  fib: 0, axis: 'protein',     maxPerDay: 1, curatedRef: 'greek_yogurt_snack' },
  { id: 'tuna_pouch',        unit: '1 serving',    kcal: 110, p: 25,  c: 0,  f: 1,  fib: 0, axis: 'protein',     maxPerDay: 1, curatedRef: 'tuna_pouch' },
  { id: 'beef_jerky',        unit: '1 serving',    kcal: 115, p: 14,  c: 5,  f: 3,  fib: 0, axis: 'protein',     maxPerDay: 1, curatedRef: 'beef_jerky' },
  { id: 'hard_boiled_eggs',  unit: '1 serving',    kcal: 140, p: 12,  c: 1,  f: 10, fib: 0, axis: 'protein',     maxPerDay: 1, curatedRef: 'hard_boiled_eggs' },
  { id: 'protein_bar',       unit: '1 serving',    kcal: 220, p: 20,  c: 22, f: 7,  fib: 5, axis: 'protein',     maxPerDay: 1, curatedRef: 'protein_bar' },
  { id: 'cheese_snack',      unit: '1 serving',    kcal: 115, p: 7,   c: 1,  f: 9,  fib: 0, axis: 'protein+fat', maxPerDay: 1, curatedRef: 'cheese_snack' },
  { id: 'mixed_nuts',        unit: '1 serving',    kcal: 250, p: 9,   c: 9,  f: 22, fib: 3, axis: 'fat',         maxPerDay: 1, curatedRef: 'mixed_nuts' },
  { id: 'banana_snack',      unit: '1 serving',    kcal: 105, p: 1,   c: 27, f: 0,  fib: 3, axis: 'carbs',       maxPerDay: 2, curatedRef: 'banana_snack' },
  { id: 'steamed_rice',      unit: '1 serving',    kcal: 195, p: 4,   c: 42, f: 0,  fib: 1, axis: 'carbs',       maxPerDay: 2, curatedRef: 'steamed_rice' },
  { id: 'steamed_mixed_veg', unit: '1 serving',    kcal: 65,  p: 4,   c: 11, f: 1,  fib: 5, axis: 'fibre',       maxPerDay: 2, curatedRef: 'steamed_mixed_veg' },
  { id: 'baked_potato',      unit: '1 serving',    kcal: 140, p: 3,   c: 31, f: 0,  fib: 3, axis: 'carbs',       maxPerDay: 2, curatedRef: 'baked_potato' },
  { id: 'berries',           unit: '1 serving',    kcal: 80,  p: 1,   c: 18, f: 0,  fib: 5, axis: 'fibre',       maxPerDay: 2, curatedRef: 'berries' },
];

// ---------------------------------------------------------------------------
// Slot structure (mirrors the picker's tab derivation — keep in lockstep)
// ---------------------------------------------------------------------------

const EXOTIC_FILL_ORDER: PlanSlot[] = [
  'brunch',
  'second_lunch',
  'early_dinner',
  'pre_workout',
  'post_workout',
];

// Picks under snack-time slots fold into the snack frame; everything else is
// its own slot. (Mirrors the picker's snacks shelf.)
const SLOT_FOLD: Partial<Record<PlanSlot, PlanSlot>> = {
  morning_snack: 'snack',
  afternoon_snack: 'snack',
  evening_snack: 'snack',
};

const SLOT_POOL: Record<string, MealSlot[]> = {
  breakfast: ['breakfast'],
  lunch: ['lunch'],
  dinner: ['dinner'],
  snack: ['snack', 'morning_snack', 'afternoon_snack', 'evening_snack'],
  dessert: ['dessert'],
  brunch: ['brunch'],
  second_lunch: ['second_lunch'],
  early_dinner: ['early_dinner'],
  pre_workout: ['pre_workout'],
  post_workout: ['post_workout'],
};

const SLOT_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
  dessert: 'Dessert',
  brunch: 'Brunch',
  second_lunch: 'Second lunch',
  early_dinner: 'Early dinner',
  pre_workout: 'Pre-workout',
  post_workout: 'Post-workout',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptTargets {
  kcal: number;
  kcalLo: number;
  kcalHi: number;
  protein: number;
  pLo: number;
  pHi: number;
  pFloor: number;
  fibMin: number;
  cLo: number;
  cHi: number;
  fLo: number;
  fHi: number;
}

interface PlanOption {
  key: string; // "slug:plate_id" — verbatim lookup key
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
  fib: number;
  sMin: number;
  sMax: number;
  serves: number;
  prep: 'full' | 'partial' | 'none';
  stunt: boolean;
  filler: boolean;
  /** User-created meal (custom_ slug) — macros are user-entered and authoritative. */
  custom: boolean;
}

interface SlotFrame {
  slot: PlanSlot;
  label: string;
  occurrencesPerWeek: number;
  perDay: number;
  options: PlanOption[];
  borrowableWith?: PlanSlot;
}

export interface BuildOpts {
  /** Axes the user accepted as short at Save time (e.g. ['protein']). */
  acceptedShortfall?: string[];
  /** Derived phase from GoalsProfile — injected by assembleMealPlanPromptV2. */
  derivedPhase?: DerivedPhase;
  /** GoalsProfile weight (kg) — preferred over answers.weight for tolerances. */
  profileWeightKg?: number;
  /** True when GoalsProfile has goalWeightKg or goalBodyFatPct — triggers lean-mass-targets.md fetch. */
  hasLeanMassTargets?: boolean;
  /**
   * User-created meals as CuratedMeal-shaped views — injected by the async
   * wrappers (assembleMealPlanPromptV2 / buildReviewLauncherFromStorage) so
   * this module's pure functions stay storage-free and snapshot-testable.
   */
  customMeals?: CuratedMeal[];
}

interface SleepDataLike {
  bedtime?: string;
  wakeTime?: string;
  optimizationLevel?: string;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const n0 = (x: number) => String(Math.round(x));
const n5 = (x: number) => String(Math.round(x / 5) * 5);

function sniffMacros(r: any): { kcal: number; protein: number; carbs: number; fat: number } | null {
  if (!r) return null;
  // First try computeMacros field names, then legacy fields
  const kcal = r.calories ?? r.targetCalories ?? r.kcal ?? r.dailyCalories;
  const protein = r.protein ?? r.proteinTarget ?? r.protein_g ?? r.proteinGrams;
  const carbs = r.carbs ?? r.carbsTarget ?? r.carbs_g ?? 0;
  const fat = r.fat ?? r.fatTarget ?? r.fat_g ?? 0;
  if (!kcal || !protein) return null;
  return {
    kcal,
    protein,
    carbs,
    fat,
  };
}

function fiberTarget(kcal: number): number {
  return Math.min(45, Math.max(25, Math.round((kcal / 1000) * 14)));
}

export function deriveTargets(macros: any, weightKg?: number): PromptTargets | null {
  const m = sniffMacros(macros);
  if (!m) return null;
  const fib = fiberTarget(m.kcal);
  const pFloor =
    weightKg && weightKg > 0
      ? Math.round(PROTEIN_FLOOR_G_PER_KG * weightKg)
      : Math.max(20, Math.round(m.protein * 0.18));
  return {
    kcal: Math.round(m.kcal),
    kcalLo: Math.round(m.kcal * (1 - KCAL_TOL)),
    kcalHi: Math.round(m.kcal * (1 + KCAL_TOL)),
    protein: Math.round(m.protein),
    pLo: Math.round(m.protein * (1 - PROTEIN_TOL)),
    pHi: Math.round(m.protein * (1 + PROTEIN_TOL)),
    pFloor,
    fibMin: Math.round(fib * FIBER_FLOOR_PCT),
    cLo: Math.round(m.carbs * (1 - CF_TOL)),
    cHi: Math.round(m.carbs * (1 + CF_TOL)),
    fLo: Math.round(m.fat * (1 - CF_TOL)),
    fHi: Math.round(m.fat * (1 + CF_TOL)),
  };
}

function eligibleMeals(slot: PlanSlot, all: CuratedMeal[]): CuratedMeal[] {
  const pool = SLOT_POOL[slot] ?? [slot as MealSlot];
  return all.filter((m) => m.eligible_slots.some((s) => pool.includes(s)));
}

function prepOf(meal: CuratedMeal, plate: Plate): 'full' | 'partial' | 'none' {
  return (plate.meal_prep?.strategy ?? meal.meal_prep?.strategy ?? 'none') as
    | 'full'
    | 'partial'
    | 'none';
}

function plateOption(meal: CuratedMeal, plate: Plate, filler = false): PlanOption | null {
  const pm = plate.plate_macros;
  if (!pm || !pm.kcal) return null;
  return {
    key: `${meal.slug}:${plate.id}`,
    name: plate.display_name || meal.display_name,
    kcal: pm.kcal,
    p: pm.protein_g ?? 0,
    c: pm.carbs_g ?? 0,
    f: pm.fat_g ?? 0,
    fib: pm.fiber_g ?? 0,
    sMin: meal.min_scale ?? 0.7,
    sMax: meal.max_scale ?? 1.5,
    serves: meal.produces_servings ?? 1,
    prep: prepOf(meal, plate),
    stunt: !!plate.is_stunt_plate,
    filler,
    custom: (meal as any).custom === true,
  };
}

// ---------------------------------------------------------------------------
// Occurrence + structure derivation (all ai_decide resolved app-side)
// ---------------------------------------------------------------------------

function snackOccurrences(freq: string | undefined, kcal: number): number {
  if (!freq || freq === '0') return 0;
  if (freq === '2') return 14;
  if (freq === '3+') return 21;
  if (freq === 'ai_decide') return kcal >= 2800 ? 14 : 7;
  return 7;
}

function dessertOccurrences(freq: string | undefined): number {
  switch (freq) {
    case 'every_night': return 7;
    case 'most_nights': return 5;
    case 'few_per_week': return 3;
    case 'once_per_week': return 1;
    case 'ai_decide': return 3;
    default: return 0;
  }
}

function structureSlots(answers: NutritionAnswers, all: CuratedMeal[]): PlanSlot[] {
  const mealsPerDay = (answers as any).mealsPerDay ?? 3;
  const core: PlanSlot[] =
    mealsPerDay === 1 ? ['dinner'] : mealsPerDay === 2 ? ['lunch', 'dinner'] : ['breakfast', 'lunch', 'dinner'];
  const slots: PlanSlot[] = [...core];
  let extra = Math.max(0, mealsPerDay - 3);
  for (const s of EXOTIC_FILL_ORDER) {
    if (extra <= 0) break;
    if (eligibleMeals(s, all).length > 0) {
      slots.push(s);
      extra -= 1;
    }
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Frames from V2 picks
// ---------------------------------------------------------------------------

function buildFrames(
  answers: NutritionAnswers,
  favorites: CuratedFavoritesV2,
  targets: PromptTargets,
  all: CuratedMeal[]
): SlotFrame[] {
  const bySlug = new Map(all.map((m) => [m.slug as string, m]));
  const snackOcc = snackOccurrences((answers as any).snackFrequency, targets.kcal);
  const dessertOcc = dessertOccurrences((answers as any).dessertFrequency);

  const slots: PlanSlot[] = structureSlots(answers, all);
  if (snackOcc > 0) slots.push('snack');
  if (dessertOcc > 0) slots.push('dessert');

  // Group picks by (folded) slot. Picks for slots outside this structure are
  // dropped — that food has no occurrence to fill this week.
  const picksBySlot = new Map<PlanSlot, { slug: string; plate_id?: string }[]>();
  const addPick = (slot: PlanSlot, slug: string, plate_id?: string) => {
    const folded = SLOT_FOLD[slot] ?? slot;
    if (!slots.includes(folded)) return;
    if (!picksBySlot.has(folded)) picksBySlot.set(folded, []);
    picksBySlot.get(folded)!.push({ slug, plate_id });
  };
  const pickedSlugs = new Set(favorites.picks.map((p) => p.slug));
  for (const p of favorites.picks) addPick(p.slot, p.slug, p.plate_id);
  // Mirror-only slugs — legacy data, or V1-API additions with no slot
  // context — hydrate into every eligible frame, like the picker does.
  for (const slug of favorites.slugs) {
    if (pickedSlugs.has(slug)) continue;
    const meal = bySlug.get(slug);
    if (!meal) continue;
    for (const s of slots) {
      if (eligibleMeals(s, all).some((m) => m.slug === meal.slug)) addPick(s, slug);
    }
  }

  // Resolve picks → options. Bare slug = every non-stunt plate of the meal;
  // plate pick = exactly that plate (stunt allowed — the user chose it; the
  // weekly stunt cap still applies via the rules).
  const frames: SlotFrame[] = slots.map((slot) => {
    const seen = new Set<string>();
    const options: PlanOption[] = [];
    for (const p of picksBySlot.get(slot) ?? []) {
      const meal = bySlug.get(p.slug);
      if (!meal) continue;
      const plates = p.plate_id
        ? (meal.plates ?? []).filter((pl) => pl.id === p.plate_id)
        : (meal.plates ?? []).filter((pl) => !pl.is_stunt_plate);
      for (const pl of plates) {
        const opt = plateOption(meal, pl);
        if (opt && !seen.has(opt.key)) {
          seen.add(opt.key);
          options.push(opt);
        }
      }
    }
    return {
      slot,
      label: SLOT_LABEL[slot] ?? slot,
      occurrencesPerWeek: slot === 'snack' ? snackOcc : slot === 'dessert' ? dessertOcc : 7,
      perDay: slot === 'snack' ? Math.max(1, Math.round(snackOcc / 7)) : 1,
      options,
      borrowableWith: slot === 'lunch' ? 'dinner' : slot === 'dinner' ? 'lunch' : undefined,
    };
  });

  // Uncovered frames get universal fillers (marked UF) — allergen/avoid
  // filtered, never stunt. Picked options are never filtered: the user
  // looked at the meal and chose it; self-selection is the filter.
  // Tier 1: the authored filler pool (universal_filler flag or the default
  // list), gated on hands-on time. Tier 2 (mains, dessert — the pool has no
  // entries there): top eligible plates by protein density, so a delegated
  // slot still emits curated references rather than a blank table.
  const allergies = ((answers as any).allergies ?? []).map((a: string) => a.toLowerCase());
  const avoid = (favorites.avoid ?? []).map((a) => a.toLowerCase());
  const passesDiet = (meal: CuratedMeal): boolean => {
    const mealAllergens = String(meal.contains_allergens ?? '').toLowerCase();
    if (allergies.some((a: string) => a && mealAllergens.includes(a))) return false;
    const nameLc = meal.display_name.toLowerCase();
    if (avoid.some((a) => a && nameLc.includes(a))) return false;
    return true;
  };
  const fillerPool = all.filter(
    (m) => (m as any).universal_filler === true || DEFAULT_FILLER_SLUGS.includes(m.slug as string)
  );
  for (const frame of frames) {
    if (frame.options.length > 0) continue;
    for (const meal of eligibleMeals(frame.slot, fillerPool)) {
      const active = meal.methods?.[0]?.time_active_minutes ?? meal.methods?.[0]?.time_total_minutes ?? 0;
      if (active > FILLER_MAX_ACTIVE_MINUTES) continue;
      if (!passesDiet(meal)) continue;
      for (const pl of (meal.plates ?? []).filter((p) => !p.is_stunt_plate)) {
        const opt = plateOption(meal, pl, true);
        if (opt) frame.options.push(opt);
      }
    }
    if (frame.options.length === 0) {
      const candidates: PlanOption[] = [];
      for (const meal of eligibleMeals(frame.slot, all)) {
        if (!passesDiet(meal)) continue;
        for (const pl of (meal.plates ?? []).filter((p) => !p.is_stunt_plate)) {
          const opt = plateOption(meal, pl, true);
          if (opt) candidates.push(opt);
        }
      }
      candidates.sort((x, y) => y.p / y.kcal - x.p / x.kcal);
      frame.options.push(...candidates.slice(0, FALLBACK_UF_PLATES));
    }
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Meal timing (computed app-side from sleep data; defaults otherwise)
// ---------------------------------------------------------------------------

function parseClock(s?: string): number | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function fmtClock(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(m / 60);
  const mm = Math.round((m % 60) / 15) * 15;
  const total = h24 * 60 + mm;
  const h = Math.floor((total % 1440) / 60);
  const minute = total % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${minute.toString().padStart(2, '0')} ${ap}`;
}

function mealTimes(
  frames: SlotFrame[],
  sleep?: SleepDataLike | null
): { first: string; last: string; lines: string[] } {
  const wake = parseClock(sleep?.wakeTime) ?? 7 * 60;
  let bed = parseClock(sleep?.bedtime) ?? 22 * 60 + 30;
  if (bed <= wake) bed += 1440; // crosses midnight
  const level = sleep?.optimizationLevel ?? 'moderate';
  const afterWake = level === 'maximum' ? 45 : level === 'minimal' ? 90 : 60;
  const beforeBed = level === 'maximum' ? 240 : level === 'minimal' ? 120 : 180;

  const first = wake + afterWake;
  const last = bed - beforeBed;

  const ORDER: PlanSlot[] = ['breakfast', 'brunch', 'lunch', 'second_lunch', 'early_dinner', 'dinner'];
  const timed = ORDER.filter((s) => frames.some((f) => f.slot === s));
  const lines: string[] = [];
  timed.forEach((slot, i) => {
    const t = timed.length === 1 ? last : first + ((last - first) * i) / (timed.length - 1);
    lines.push(`${SLOT_LABEL[slot]} ~${fmtClock(t)}`);
  });
  if (frames.some((f) => f.slot === 'pre_workout')) lines.push('Pre-workout: 45–60 min before training');
  if (frames.some((f) => f.slot === 'post_workout')) lines.push('Post-workout: within 60 min after training');
  if (frames.some((f) => f.slot === 'snack')) lines.push('Snacks: between the meals above');
  // Dessert used to be emitted as "Dessert: after dinner", which the prompt
  // then contradicted two lines earlier: the loop above places the LAST main
  // meal exactly on `last`, and `last` is the stated "last meal finished by"
  // cutoff. So the prompt asked for a meal after the final possible meal.
  //
  // Every observed run took the instruction literally, put dessert past the
  // cutoff, and the review step caught it and pulled dinner earlier — the same
  // repair, every time, for a contradiction generation was handed. Cheaper to
  // state the resolution here than to keep paying for it downstream.
  //
  // Dessert is typically once a week, so the shift is scoped to the day it
  // appears rather than moving dinner on all seven.
  if (frames.some((f) => f.slot === 'dessert')) {
    lines.push(
      `Dessert ~${fmtClock(last)} on the day it appears, with that day's dinner pulled back to ~${fmtClock(last - 30)} so both finish inside the window (other days keep the dinner time above)`
    );
  }
  return { first: fmtClock(first), last: fmtClock(last), lines };
}

// ---------------------------------------------------------------------------
// Start date (answers.startDate is a token or an ISO date)
// ---------------------------------------------------------------------------

function resolveStartDate(token?: string): Date {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
  if (!token || token === 'tomorrow') return tomorrow;
  if (token === 'today') return today;
  if (token === 'next_monday') {
    const d = new Date(today);
    const delta = ((8 - d.getDay()) % 7) || 7;
    d.setDate(d.getDate() + delta);
    return d;
  }
  const parsed = new Date(token);
  return isNaN(parsed.getTime()) ? tomorrow : parsed;
}

// LOCAL date parts, not toISOString(). toISOString() converts to UTC first, so
// for anyone east of UTC a local start date of Sat 1 Aug came out as
// "2026-07-31" — a Friday — while pretty() (which IS local) said Saturday. The
// prompt then handed the model two dates that disagreed, and following the ISO
// one shifts every day name in the plan by a day. Same class of bug in reverse
// for anyone west of UTC.
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const pretty = (d: Date) =>
  d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function optionRow(o: PlanOption): string {
  const name = `${o.name}${o.stunt ? ' (stunt)' : ''}${o.filler ? ' (UF)' : ''}${o.custom ? ' (user-created)' : ''}`;
  return `| ${name} | ${o.key} | ${n0(o.kcal)} | ${n0(o.p)} | ${n0(o.c)} | ${n0(o.f)} | ${n0(o.fib)} | ${o.sMin}–${o.sMax} | ${o.serves} | ${o.prep} |`;
}

function frameSection(f: SlotFrame): string {
  const perDay = f.perDay > 1 ? ` (${f.perDay}/day)` : '';
  const head = `### ${f.label} — ${f.occurrencesPerWeek}×/week${perDay}`;
  const table = [
    '| option | key | kcal | P | C | F | fib | scale | serves | prep |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...f.options.map(optionRow),
  ].join('\n');
  const notes: string[] = [];
  if (f.options.some((o) => o.filler))
    notes.push(
      'Rows marked (UF) were NOT picked by the user — use them only to cover occurrences their picks don\u2019t.'
    );
  if (f.options.some((o) => o.custom))
    notes.push(
      'Rows marked (user-created) are the user\u2019s OWN meals, typed into the app by them. Their macros are user-entered and authoritative: schedule them exactly as listed at the fixed scale shown, and never adjust their numbers, rename them, or substitute your own version of the dish.'
    );
  if (f.borrowableWith)
    notes.push(
      `May borrow from ${SLOT_LABEL[f.borrowableWith]} when it helps reuse a batch or hit the day's targets.`
    );
  // Count distinct MEALS, not plate rows — a single multi-plate meal is one
  // meal's worth of feasible options, and counting its plates would suppress
  // the repetition-permission note exactly where it's most needed.
  const realOpts = new Set(
    f.options.filter((o) => !o.filler).map((o) => o.key.split(':')[0])
  ).size;
  if (realOpts > 0 && realOpts * 2 <= f.occurrencesPerWeek)
    notes.push(
      `With ${realOpts} meal${realOpts === 1 ? '' : 's'} for ${f.occurrencesPerWeek} occurrences, repetition is expected and correct — vary the scale day to day rather than inventing variety.`
    );
  return [head, table, ...notes.map((s) => `> ${s}`)].join('\n');
}

// ---------------------------------------------------------------------------
// Ingredient tables
// ---------------------------------------------------------------------------
// WHY THIS EXISTS: the option tables carry macros only, so before this the
// grocery-list instruction told the model to work from "your knowledge of
// those recipes". It has no such knowledge — these 85 meals exist only in this
// repo, shortcut-by-default with jar sauces and recipe-base pouches. The model
// was reconstructing a plausible ingredient list from the meal's NAME, which
// meant the list the user shopped from did not match the list RecipeDetail
// showed them when they went to cook it, and every quantity was a guess.
//
// Ingredients are emitted GENERIC (no brands — `notes` in the ingredient
// library names Australian products, which would anchor the model to one
// market and defeat the localisation this is for). The model gets the
// ingredient, the amount, the unit, the shopping category and the typical pack
// size, and does the local part: find the equivalent product where the user
// lives, round to a pack size sold there, and price it.
//
// Emitted once per SLUG, not per plate — plates of one meal share a base.

interface PromptIngredientRow {
  id: string;
  name: string;
  amount: number;
  unit: string;
  category: string;
  packSize?: number;
}

function ingredientMeta(ingredientId: string) {
  return (INGREDIENTS as any)[ingredientId];
}

/** Prettified fallback so an unknown id still reads as a shopping item. */
function ingredientName(ingredientId: string): string {
  const meta = ingredientMeta(ingredientId);
  if (meta?.display_name) return meta.display_name;
  const words = String(ingredientId).split('_').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * `is_pantry_negligible` rows (salt, pepper, spray oil …) are excluded by the
 * ingredient library's own contract: it hides them from shopping lists and
 * macro totals while keeping them in cook steps. Nobody needs "buy salt" on a
 * weekly list.
 */
function promptIngredientRows(list: any[]): PromptIngredientRow[] {
  const rows: PromptIngredientRow[] = [];
  // An ingredient can legitimately appear twice in a resolved list (a sauce
  // variant re-listing something the base already has, e.g. brown sugar in the
  // scratch pulled pork). Emitting it twice reads as a data error in the table,
  // so amounts are summed onto the first row instead.
  const seen = new Map<string, PromptIngredientRow>();
  for (const ing of list ?? []) {
    const meta = ingredientMeta(ing.ingredient_id);
    if (meta?.is_pantry_negligible) continue;
    const amount = Number(ing.base_amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const id = String(ing.ingredient_id);
    const unit = String(ing.unit ?? meta?.canonical_unit ?? '');
    const key = `${id}|${unit}`;
    const existing = seen.get(key);
    if (existing) {
      existing.amount += amount;
      continue;
    }
    const row: PromptIngredientRow = {
      id,
      name: ingredientName(ing.ingredient_id),
      amount,
      unit,
      category: String(meta?.category ?? 'other'),
      packSize: Number.isFinite(Number(meta?.typical_pack_size))
        ? Number(meta.typical_pack_size)
        : undefined,
    };
    seen.set(key, row);
    rows.push(row);
  }
  return rows;
}

const amt = (x: number) => (Math.abs(x - Math.round(x)) < 0.005 ? String(Math.round(x)) : x.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

function ingredientsSection(frames: SlotFrame[], all?: CuratedMeal[]): string {
  // Resolve slugs against the same merged list the frames were built from, so
  // custom_ slugs land on their views rather than missing the static map.
  const bySlug = new Map(
    (all ?? (Object.values(CURATED_MEALS) as CuratedMeal[])).map((m) => [
      m.slug as string,
      m,
    ])
  );
  // Distinct slugs across every option the model can choose from, plus the
  // plate ids actually offered, so plate accompaniments are covered too.
  const platesBySlug = new Map<string, Set<string>>();
  const order: string[] = [];
  const addSlug = (slug: string, plateId?: string) => {
    if (!platesBySlug.has(slug)) {
      platesBySlug.set(slug, new Set());
      order.push(slug);
    }
    if (plateId) platesBySlug.get(slug)!.add(plateId);
  };

  for (const f of frames) {
    for (const o of f.options) {
      const [slug, plateId] = o.key.split(':');
      addSlug(slug, plateId);
    }
  }

  // Adjusters too. They live in their own table rather than in any slot frame,
  // so they were missing here — and a tuna pouch that lands six days a week is
  // a real line on the shop with no id for the app to match a price to.
  for (const a of ADJUSTERS) {
    if (a.curatedRef) addSlug(a.curatedRef, 'standard');
  }

  const blocks: string[] = [];
  for (const slug of order) {
    const meal: CuratedMeal | undefined = bySlug.get(slug);
    if (!meal) continue;

    // USER-CREATED meals: free-text rows the user typed, amounts PER SERVING,
    // no library ids, no pack data. Emitted so the grocery list can localise
    // and price them — and so the model never reconstructs them from the name.
    if ((meal as any).custom) {
      const rows = (((meal as any).custom_ingredients ?? []) as any[]).filter(
        (r) => r && typeof r.name === 'string' && r.name.trim().length > 0
      );
      const cServes = meal.produces_servings ?? 1;
      const lines: string[] = [
        `#### ${meal.display_name} — \`${slug}\`  (USER-CREATED · amounts are PER SERVING · one cook makes ${cServes} serving${cServes === 1 ? '' : 's'})`,
      ];
      if (rows.length > 0) {
        lines.push('| ingredient | amount | unit |', '|---|---|---|');
        for (const r of rows) {
          const a = Number(r.amount);
          const amountStr = Number.isFinite(a) && a > 0 ? amt(a) : '\u2014';
          const unitStr = String(r.unit ?? '').trim() || '\u2014';
          lines.push(`| ${String(r.name).trim()} | ${amountStr} | ${unitStr} |`);
        }
      } else {
        lines.push(
          'The user listed no ingredients for this meal. Do NOT invent a recipe for it \u2014 nothing goes on the grocery list for this meal.'
        );
      }
      blocks.push(lines.join('\n'));
      continue;
    }

    // Default (jar / shortcut) variant — what the app cooks unless the user
    // flips to from-scratch, so it is what they need to buy.
    const baseRows = promptIngredientRows(resolveBaseIngredients(meal));
    if (baseRows.length === 0) continue;

    const serves = meal.produces_servings ?? 1;
    const lines: string[] = [
      `#### ${meal.display_name} — \`${slug}\`  (base recipe makes ${serves} serving${serves === 1 ? '' : 's'})`,
      '| ingredient | id | amount | unit | category | typical pack |',
      '|---|---|---|---|---|---|',
      ...baseRows.map(
        (r) =>
          `| ${r.name} | ${r.id} | ${amt(r.amount)} | ${r.unit} | ${r.category} | ${r.packSize ?? '—'} |`
      ),
    ];

    // FROM-SCRATCH ALTERNATIVE.
    // 21 of the 85 meals ship a second sauce_variant. The user picks between
    // them IN THE APP, after import, so the plan is always built on the default
    // (jar) version — but the app rebuilds the shopping list when they switch,
    // and without these rows the swapped-in ingredients have no price at all.
    // Only the DIFFERENCE is emitted: what scratch needs that the default
    // didn't, which is a handful of pantry items per meal.
    const variants = (meal as any).sauce_variants ?? [];
    if (variants.length > 1) {
      const alt = variants.find((v: any) => !v.is_default);
      if (alt) {
        const defaultIds = new Set(baseRows.map((r) => r.id));
        const altRows = promptIngredientRows(
          resolveBaseIngredients(meal, { variantId: alt.id })
        ).filter((r) => !defaultIds.has(r.id));
        if (altRows.length > 0) {
          lines.push(
            `From-scratch version ALSO needs: ` +
              altRows
                .map(
                  (r) =>
                    `${r.name} [${r.id}] ${amt(r.amount)} ${r.unit} (${r.category}${r.packSize ? `, pack ${r.packSize}` : ''})`
                )
                .join('; ')
          );
        }
      }
    }

    for (const plateId of platesBySlug.get(slug) ?? []) {
      const plate = (meal.plates ?? []).find((p) => p.id === plateId);
      const addRows = promptIngredientRows(plate?.additional_ingredients ?? []);
      if (!plate || addRows.length === 0) continue;
      lines.push(
        `Plate \`${plateId}\` adds PER SERVING: ` +
          addRows
            .map(
              (r) =>
                `${r.name} [${r.id}] ${amt(r.amount)} ${r.unit} (${r.category}${r.packSize ? `, pack ${r.packSize}` : ''})`
            )
            .join('; ')
      );
    }
    blocks.push(lines.join('\n'));
  }

  if (blocks.length === 0) return '';

  return [
    '## Ingredients for the curated options',
    'Generic on purpose — no brands. Find the local equivalent of each item where the user shops.',
    '',
    'How to read these tables:',
    '- Base-recipe amounts are for the WHOLE base recipe, which makes the stated number of servings.',
    '- One serving of an option = (base amount ÷ servings made) × scale_factor.',
    '- "Plate adds PER SERVING" rows are already per serving — multiply by scale_factor only, never divide.',
    '- "typical pack" is the size this item is usually sold in, as a rounding hint. Use the pack size actually sold where the user shops.',
    '- "id" is the app\u2019s internal key for that ingredient. Carry it into the grocery list (see below) so the app can match your priced item to its own records.',
    '- Everyday seasonings (salt, pepper, oil spray) are omitted deliberately — do not add them to the list.',
    '- "From-scratch version ALSO needs" rows are the alternative the user can switch to in the app AFTER importing. They are NOT part of the plan you are building — the plan always uses the default version. Price them in the separate from-scratch section of the grocery list, never in the main list.',
    '- Tables marked USER-CREATED are the user\u2019s own meals: their amounts are already PER SERVING (multiply by scale_factor only — never divide by servings), their rows carry no id (so no brackets on the grocery list), and the ingredient list is exactly what the user typed. Localise and price those items like everything else, but never pad the list with ingredients the user did not write.',
    '',
    blocks.join('\n\n'),
  ].join('\n');
}

function adjusterSection(): string {
  const rows = ADJUSTERS.map(
    (a) =>
      `| ${a.id} | ${a.unit} | ${a.kcal} | ${a.p} | ${a.c} | ${a.f} | ${a.fib} | ${a.axis} | ${a.maxPerDay} |${a.curatedRef ? ` curated: \`${a.curatedRef}\`` : ''}`
  );
  return [
    '## Adjusters (standalone entries used to close a day\u2019s gaps)',
    '| id | unit | kcal | P | C | F | fib | axis | max/day |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
    `Routing: protein gap → protein_shake/greek_yogurt_snack/tuna_pouch; carb gap → steamed_rice/baked_potato/banana_snack; fat gap → mixed_nuts/cheese_snack; fibre gap → steamed_mixed_veg/berries. Maximum ${MAX_ADJUSTERS_PER_DAY} adjuster items per day.`,
    'Adjusters are independent of user snack preferences and always available to close daily gaps regardless of snack count.',
    'Output format: all adjusters have curated references — emit the curated slug, never invent entries.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Phase context block (injected into the prompt when GoalsProfile is present)
// ---------------------------------------------------------------------------

function phaseContextBlock(phase: DerivedPhase, macros: any, planDays: number, hasLeanMassTargets?: boolean): string {
  const PHASE_LABELS: Record<DerivedPhase, string> = {
    cut:       'Cut (fat loss)',
    recomp:    'Recomp (simultaneous fat loss + muscle gain)',
    lean_bulk: 'Lean bulk (controlled muscle gain)',
    bulk:      'Bulk (muscle gain)',
    maintain:  'Maintain (weight maintenance)',
  };

  const tdee: number = macros?.tdee ?? macros?.bmr ?? 0;
  const cal: number  = macros?.calories ?? macros?.kcal ?? 0;
  const delta = cal - tdee;

  let rationale: string;
  switch (phase) {
    case 'cut':
      rationale =
        `Calorie deficit: ${Math.abs(delta)} kcal/day below maintenance (${tdee} kcal). ` +
        `Deficit is capped at 500 kcal to protect lean mass. ` +
        `Protein is set at the upper research range (2.2 g/kg) to counter muscle loss.`;
      break;
    case 'recomp':
      rationale =
        `Near-maintenance calories (${Math.abs(delta)} kcal below ${tdee} kcal maintenance). ` +
        `Goal: simultaneous fat loss and muscle retention via high protein and consistent training. ` +
        `Protein target (2.0 g/kg) is the primary lever.`;
      break;
    case 'lean_bulk':
      rationale =
        `${Math.abs(delta)} kcal/day surplus above maintenance (${tdee} kcal → ${cal} kcal). ` +
        `Controlled gain to support hypertrophy while limiting fat accumulation. ` +
        `Note: a surplus this small can fall within TDEE estimation error (±10–15%); accurate calorie tracking is required for it to function as a true surplus.`;
      break;
    case 'bulk':
      rationale =
        `${Math.abs(delta)} kcal/day surplus above maintenance (${tdee} kcal → ${cal} kcal). ` +
        `Surplus is scaled to training experience — larger for new lifters, smaller for advanced, reflecting their respective muscle-gain rate ceilings. ` +
        `Note: a small surplus (especially at advanced level) can fall within TDEE estimation error (±10–15%); accurate calorie tracking is required for it to function as a true surplus.`;
      break;
    case 'maintain':
      rationale =
        `Calories set to maintenance (${cal} kcal). ` +
        `Goal: sustain current body weight while optimising composition through training.`;
      break;
  }

  const lines = [
    '## Phase context (context for the macro targets below — do not output this section in the plan)',
    `**Phase:** ${PHASE_LABELS[phase]}`,
    rationale,
  ];

  if (phase === 'cut' && planDays > 56) {
    lines.push(
      '',
      '> **Diet-break reminder:** This is a plan longer than 8 weeks on a deficit. After every 8–12 continuous weeks of a calorie deficit, schedule a 1–2 week maintenance break before resuming. This preserves metabolic rate and hormone balance. Mention this in the plan notes.'
    );
  }

  lines.push('');
  const fetchRefs = [`- https://json.fit/phase-selection.md?v=${PROMPT_CACHE_VERSION} (phase selection rationale)`];
  if (hasLeanMassTargets) {
    fetchRefs.push(`- https://json.fit/lean-mass-targets.md?v=${PROMPT_CACHE_VERSION} (lean mass targets)`);
  }
  lines.push('**Phase references (OPTIONAL background — fetch only if you want the reasoning behind these numbers. Every figure you need is already stated above, so skipping them costs nothing. Do not show these URLs to the user):**\n' + fetchRefs.join('\n'));

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// The prompt
// ---------------------------------------------------------------------------

export function buildMealPlanPrompt(
  answers: NutritionAnswers,
  macros: any,
  favorites: CuratedFavoritesV2,
  sleep?: SleepDataLike | null,
  opts?: BuildOpts
): string {
  const a: any = answers;
  const targets = deriveTargets(macros, opts?.profileWeightKg ?? a.weight);
  if (!targets) {
    throw new Error('Macro targets are missing — complete the nutrition questionnaire first.');
  }
  const allMeals: CuratedMeal[] = [
    ...(Object.values(CURATED_MEALS) as CuratedMeal[]),
    ...(opts?.customMeals ?? []),
  ];
  const frames = buildFrames(answers, favorites, targets, allMeals);
  const times = mealTimes(frames, sleep);
  const dessertOcc = frames.find((f) => f.slot === 'dessert')?.occurrencesPerWeek ?? 0;
  const start = resolveStartDate(a.startDate);
  const duration: number = a.planDuration ?? 7;

  const allergies: string[] = a.allergies ?? [];
  const avoid: string[] = favorites.avoid ?? [];
  const challenges: string[] = a.eatingChallenges ?? [];
  const cuisines: string[] = favorites.cuisines ?? [];
  const likedDishes: string[] = favorites.likedDishes ?? [];

  const budget =
    a.budgetMin != null && a.budgetMax != null
      ? `$${a.budgetMin}\u2013$${a.budgetMax}/week`
      : a.weeklyBudget
      ? String(a.weeklyBudget)
      : 'moderate';

  const shortfall = (opts?.acceptedShortfall ?? []).filter(Boolean);

  const parts: string[] = [];

  parts.push(
    `**FETCH CHECK:** Fetch ${INSTRUCTIONS_URL} now and follow it alongside this prompt. If the fetch fails for any reason, stop and reply only:\n"${FETCH_FAIL_MESSAGE}"`
  );

  parts.push(
    [
      '## PIPELINE FILES (do not show these URLs to the user)',
      '',
      'This is a 3-step flow. The files for the later steps are listed here so they are available to you when the time comes. **Do not fetch them now.** Fetch each one only when the flow reaches that step:',
      `- Step 2, quality check: ${REVIEW_URL}`,
      `- Step 3, file conversion: ${JSON_URL}`,
    ].join('\n')
  );

  // Opener callout — fires after the fetch check passes. Sets expectations
  // for the whole three-step flow so users don't bounce thinking the AI's
  // first response is the final deliverable.
  parts.push(
    [
      '## START YOUR RESPONSE WITH THIS EXACT CALLOUT',
      '',
      'The VERY FIRST thing in your response must be this callout, formatted as a code block (triple backticks, no language identifier). Do not add anything before it. Reproduce it verbatim:',
      '',
      '```',
      '🍽️ Creating your meal plan draft.',
      '',
      'This is the first of three steps:',
      '1. I\u2019ll write the draft below.',
      '2. You\u2019ll review it and reply "happy" \u2014 I\u2019ll run a quality check.',
      '3. Reply "happy" again after that, and I\u2019ll turn it into your file.',
      '```',
      '',
      'This callout tells the user what to expect from the whole flow so they don\u2019t get lost between steps. After the callout, continue with the meal plan work as normal.',
      '',
      '## FORMATTING RULES (CRITICAL)',
      '',
      'Code blocks (triple backticks) in YOUR CHAT RESPONSE are RESERVED for the opening callout above and the closing callout at the end. Do not use code blocks elsewhere in your visible response \u2014 not for meal names, not for example output, not for ingredient lists. Use **bold**, headers, tables, and bullet lists for the plan itself.',
      '',
      'Note: this rule applies to what you write in chat. Anything you fetch (such as the instructions file) is your own reference material and is not part of your visible response \u2014 the user never sees it.',
    ].join('\n')
  );

  parts.push(
    `I'm using JSON.fit. Build my ${duration}-day meal plan by SELECTING and SCALING from the options below. Do not search past chats; everything you need is here.`
  );

  parts.push(
    [
      '## How this works (binding rules)',
      '1. Each option below is an OPTION for its slot, not a promise of appearance. Fill every occurrence of a slot by choosing ONE option and a scale factor. Options may repeat across the week. If a slot has more options than occurrences, leave some out \u2014 that is correct, not an error.',
      '2. scale_factor multiplies that plate\u2019s macros uniformly. Use steps of 0.05 within the stated [min\u2013max]. Macros for a serving = plate macros \u00d7 scale_factor.',
      '3. Serve options in their listed slot by default. Lunch and dinner options MAY be swapped between those two slots when it helps reuse a batch or hit a day\u2019s targets. All other slots use only their own options.',
      '4. Batch meals (serves > 1): servings CONSUMED = the SUM OF THE SCALE FACTORS you schedule, not the number of placements. Six placements at 0.7 consume 4.2 servings, not 6. Cook ceil(sum \u00f7 serves) batches, and size the prep notes and every grocery quantity from the batches cooked \u2014 never from the placement count. State leftovers explicitly: (batches \u00d7 serves) \u2212 sum of scale factors. If you schedule a batch meal, consume it within the week or state "freeze N portions" in the prep notes. Place fridge-eaten servings on consecutive days starting at the cook; any serving more than 4 days after the cook must be a frozen portion with a thaw note ("freeze N portions; thaw overnight before day X"). Rotate its plates.',
      `5. Maximum ${STUNT_CAP} stunt plate this week. Dessert appears exactly ${dessertOcc} time(s) \u2014 never more, never as "optional".`,
      `6. Adjusters (table below) are standalone items used to close a day\u2019s gaps. Maximum ${MAX_ADJUSTERS_PER_DAY} per day.`,
      '7. Fallback order when a day misses target: rescale \u2192 adjusters \u2192 swap option within the slot \u2192 universal fillers (marked UF) for uncovered occurrences \u2192 only if all else fails, invent a simple meal and say so in the plan notes.',
      '8. Curated options are output as references (slug + plate_id + scale_factor) \u2014 never rewrite them as recipes. Slugs and plate_ids are verbatim lookup keys; copy them exactly.',
      '9. Options marked (user-created) are meals the user added themselves. Treat them like curated references (rule 8 applies verbatim, custom_ slugs included), with their scale fixed at 1.0 \u2014 their user-entered macros are authoritative, so never rescale, adjust, or reinterpret them.',
    ].join('\n')
  );

  const mealVariety: string = (a.mealVariety as string) ?? 'balanced';
  // Applies to every setting: variety never outranks the bands or the tables,
  // and never justifies inventing a meal.
  const varietyAlwaysApplies =
    'Variety is a preference, not a target to force: the daily calorie, protein and fibre bands and the option tables above always take precedence over this setting. Never invent a meal to create variety — repetition is always the correct response to too few feasible options; invention exists only as the final fallback for closing macro gaps (rule 7).';
  const varietySetting =
    mealVariety === 'convenience'
      ? 'VARIETY — Convenience. Repeat meals aggressively to minimise cooking and shopping. One meal per slot repeated all week is the ideal outcome, not a compromise. Reuse the same mains across multiple days via batching and keep adjusters consistent day to day.'
      : mealVariety === 'variety'
      ? 'VARIETY — High. Maximise day-to-day variety in every slot that has enough feasible options: rotate mains across more days and vary the adjusters and produce daily. Where a slot’s options can’t support rotation, repeat and say so in the Variety note rather than forcing it.'
      : 'VARIETY — Balanced. This applies to main slots only (lunch, dinner, and any extra main slots): aim for 2–3 distinct meals per main slot across the week. Distinct means distinct meal (slug) — different plates of the same meal count as one. Breakfast, snacks and dessert have no quota: rotate them when the user’s picks support it, repeat them when they don’t. Repetition in these slots is never a shortfall. Rotate which adjusters you use so the same top-up doesn’t appear every single day. Still batch where it genuinely helps.';
  parts.push(`${varietySetting} ${varietyAlwaysApplies}`);

  if (opts?.derivedPhase) {
    parts.push(phaseContextBlock(opts.derivedPhase, macros, duration, opts?.hasLeanMassTargets));
  }

  const targetLines = [
    '## Your daily targets (absolute numbers — already computed)',
    `- Calories: ${n5(targets.kcalLo)}\u2013${n5(targets.kcalHi)} kcal EVERY day`,
    `- Protein: ${targets.pLo}\u2013${targets.pHi} g EVERY day; every main meal \u2265 ${targets.pFloor} g`,
    `- Fibre: \u2265 ${targets.fibMin} g every day`,
    `- Weekly averages: carbs ${targets.cLo}\u2013${targets.cHi} g, fat ${targets.fLo}\u2013${targets.fHi} g`,
    '- The weekly carb and fat averages are SECONDARY to the daily calorie, protein and fibre bands. If the option set makes one of them unreachable without breaking a daily band, name the binding constraint in one line in the plan notes and move on. See the effort limit in the build procedure.',
    `- Meal times: first meal ~${times.first}, last meal finished by ~${times.last}. Suggested: ${times.lines.join('; ')}`,
    `- Plan dates: ${duration} days starting ${pretty(start)} (${iso(start)}). Use actual calendar dates.`,
  ];
  if (duration > 7)
    targetLines.push(
      '- Build one 7-day week from the structure below, then repeat the pattern for the remaining days (rotating options where there are several).'
    );
  if (shortfall.length)
    targetLines.push(
      `- The user has already accepted that their picks alone run short on: ${shortfall.join(', ')}. Close those gaps with adjusters and fillers as a matter of routine \u2014 do not flag it or ask about it.`
    );
  parts.push(targetLines.join('\n'));

  parts.push(['## Week structure', ...frames.map(frameSection)].join('\n\n'));

  parts.push(adjusterSection());

  // The tables have to live HERE, in the generation prompt, because there is no
  // second message: the user just replies "happy" and the model fetches the
  // review file itself. Anything the app tries to hand over at step 2 never
  // arrives. They are marked as step-2 material so they are not carried through
  // the planning work — the grocery list is still BUILT at the review step,
  // once the meals are settled.
  const ingredientTables = ingredientsSection(frames, allMeals);
  if (ingredientTables) {
    parts.push(
      [
        '## Ingredients \u2014 FOR STEP 2, NOT NOW',
        'You do NOT need this section to build the plan. It exists so the grocery list can be built at the quality-check step, once the meals are final. Skim past it now; come back to it then.',
        `Grocery context for step 2 \u2014 location & store: ${a.groceryStore ?? 'local supermarket'} in ${a.city ?? ''} ${a.country ?? ''}`.trim() +
          `. Weekly budget: ${budget}.`,
        '',
        ingredientTables,
      ].join('\n')
    );
  }

  parts.push(
    [
      '## Build procedure',
      'EFFORT LIMIT (read this before you start). You are SCHEDULING, not solving. Work forward one day at a time and commit. Specifically:',
      '  \u2022 Try at most THREE candidate shapes for a day. Take the best of the three and move on. Do not keep testing variants once one clears its bands.',
      '  \u2022 Do NOT write a solver, an optimiser, a search, or a scripted enumeration over meal combinations, scales, or week layouts. A code tool is for ARITHMETIC \u2014 summing a day, multiplying a scale \u2014 never for searching the option space.',
      '  \u2022 Do NOT try to prove a weekly average is unreachable. If two or three honest attempts cannot get carbs or fat into band without breaking a daily band, that IS the answer: name the constraint that blocks it in one line and move on. An exhaustive search costs the user minutes and tells them nothing the one line does not.',
      '  \u2022 Repetition is not a problem to optimise away. A slot with one option repeating all week is a correct outcome.',
      '',
      'Work one day at a time. For each day: place batch servings first, fill the remaining occurrences, then write the arithmetic line before moving on (compute with a code tool if available \u2014 never sum in your head):',
      '  Mon: baked_oats:standard 1.0 (520/38) + protein_shake:standard 1.0 (250/30) + butter_chicken:standard 0.9 (648/47) + pulled_pork:bowl 0.85 (1131/52) = 2549 kcal / 167 P',
      '(Illustrative format only \u2014 your options and numbers are in the tables above.)',
      'If a day lands outside its calorie or protein band, fix it per rule 7 and re-write the line. Do not present any day that fails its band.',
    ].join('\n')
  );

  parts.push(
    [
      '## Constraints — apply to UF rows and invented food only',
      `Allergies: ${allergies.length ? allergies.join(', ') : 'none'}. Avoid: ${avoid.length ? avoid.join(', ') : 'none'}.${challenges.length ? ` Eating challenges to accommodate: ${challenges.join(', ')}.` : ''}`,
      'Assume a standard kitchen; prefer no-cook or one-pan inventions, \u226420 min hands-on. The curated options above were chosen by the user \u2014 do not second-guess, equipment-check, or substitute them.',
    ].join('\n')
  );

  // Soft taste-context lives BEFORE the closing instruction so the closer
  // is always the dead-last thing the prompt tells the AI.
  if (cuisines.length || likedDishes.length) {
    parts.push(
      [
        '## Taste context (soft preferences)',
        `${cuisines.length ? `Cuisines they enjoy: ${cuisines.join(', ')}.` : ''} ${likedDishes.length ? `Liked dishes (build from your own knowledge if you use them as inventions): ${likedDishes.join(', ')}.` : ''}`.trim(),
      ].join('\n')
    );
  }

  // Closing callout — must be the dead-last instruction in the prompt so
  // the AI puts it dead-last in its response.
  parts.push(
    [
      '## Output',
      'Present the full plan in chat: each day with dates and times, the per-day arithmetic line, and prep notes. Do NOT write a grocery list \u2014 that happens at the quality-check step, once the meals are settled. Present only the final clean version \u2014 no working, no drafts.',
      'In the plan notes, include a short \u2018Variety\u2019 item: one line per main slot stating how many distinct meals were used against the variety setting. If a slot came in under the setting, name the binding constraint in that same line (e.g. \u2018Breakfast: 1 \u2014 other picks exceed the slot\u2019s calorie room; add a 500\u2013700 kcal breakfast pick to spread this\u2019). Report and move on \u2014 one line per slot maximum, no re-solving.',
      '',
      '### Finish with \u201cWhat I decided\u201d',
      'After the plan and prep notes, before the closing callout, write a short section headed \u201cWhat I decided\u201d. Five or six bullets, no more.',
      'This exists because the user is being asked to review something they did not watch you build. The plan itself is sixty-odd entries and reads as finished work \u2014 what they actually need to see are the JUDGEMENT CALLS you made on their behalf, because those are the only things they might want changed. Do not restate the plan or list its meals back.',
      'Cover, in plain language and only where it applies:',
      '  \u2022 Which of their picked meals you did NOT use, and why in a few words (too big for the calorie room, no slot left, allergen).',
      '  \u2022 Anything that repeats a lot, with the reason \u2014 e.g. \u201cbaked oats runs 7 days because it is the only breakfast that fits twice a day under your ceiling\u201d. Repetition the user did not ask for is the single most common thing they will want to change.',
      '  \u2022 How much cooking the week actually costs: how many batch sessions, on which days, and what gets frozen.',
      '  \u2022 Any target you could not hit, with the constraint that blocked it \u2014 one line, no re-derivation.',
      '  \u2022 Anything you had to invent or fill from a UF row rather than their own picks.',
      'End it with one sentence telling them what they can change and that saying so is enough \u2014 they do not need to know how the plan is built to ask for a different breakfast.',
      '',
      '## END YOUR RESPONSE WITH THIS EXACT CALLOUT',
      '',
      'The VERY LAST thing in your response must be this callout, formatted as a code block (triple backticks, no language identifier). Do not add anything after it. Reproduce it verbatim:',
      '',
      'If you know the user\u2019s first name, put it on its own line as the FIRST line inside the code block, followed by a colon (e.g. `Ryan:`). If you do not know it, omit that line entirely and start the block at the checkmark. Never write a placeholder, a bracket, or a guessed name. That first-name line is the ONLY part you may change \u2014 every line below it is reproduced verbatim.',
      '',
      '```',
      'Ryan:',
      '',
      '\u2705 Your meal plan draft is ready.',
      '',
      '\u25b6 Reply "happy" when you\u2019re done \u2014 I\u2019ll run a quality check on it.',
      '\u270f\ufe0f Want changes? Just tell me what to adjust.',
      '```',
      '',
      `When the user confirms they\u2019re satisfied (any reasonable confirmation \u2014 "happy", "looks good", "yes", "done", "ready" \u2014 accept it), fetch ${REVIEW_URL} and follow it. Don\u2019t mention URLs to the user.`,
    ].join('\n')
  );

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Review launcher — exact per-user numbers restated, zero duplicated rules.
// The fetched review file is the enforcement layer; this just points at it.
// ---------------------------------------------------------------------------

export interface ReviewLauncherExtras {
  /** Ingredient tables, as produced by ingredientsSection(). */
  ingredientTables?: string;
  /** Store, city, country and budget line for the grocery instruction. */
  groceryContext?: string;
}

/**
 * WHY THE GROCERY LIST LIVES HERE AND NOT IN THE GENERATION PROMPT.
 *
 * The ingredient tables are used for exactly one thing: writing the shopping
 * list. Nothing in meal SELECTION touches them — that runs entirely on the
 * macro columns. Carrying several hundred lines of ingredient data through the
 * whole planning-and-replanning grind, only to use it in the last step, is
 * dead weight at the point the model is working hardest. A live run showed the
 * cost: the model started confusing meals with each other partway through.
 *
 * By this step the plan is settled and sitting in the conversation, so the
 * model knows exactly which meals it used, and the tables arrive fresh rather
 * than thousands of tokens back. It also makes the review file's grocery check
 * real: it is building the list, not re-reading someone else's.
 */
export function buildReviewLauncher(
  t: PromptTargets,
  mealVariety: string = 'balanced',
  extras?: ReviewLauncherExtras
): string {
  const variety =
    mealVariety === 'convenience' || mealVariety === 'variety' ? mealVariety : 'balanced';

  const parts: string[] = [
    `Review the meal plan above as a quality gate, then build the grocery list.`,
    `Fetch ${REVIEW_URL} and follow it exactly.`,
    `Verify against these targets (authoritative \u2014 use these, not numbers recalled from earlier):`,
    `- Calories: ${t.kcalLo}\u2013${t.kcalHi} kcal every day`,
    `- Protein: ${t.pLo}\u2013${t.pHi} g every day (each main meal \u2265 ${t.pFloor} g)`,
    `- Fibre: \u2265 ${t.fibMin} g every day`,
    `- Variety setting: ${variety} (main slots only; the plan notes must carry a Variety item)`,
    `- Weekly averages: carbs ${t.cLo}\u2013${t.cHi} g, fat ${t.fLo}\u2013${t.fHi} g`,
  ];

  // Kept for callers that DO paste the launcher manually; the standard flow
  // never reaches this branch, which is why the tables also live in the
  // generation prompt.
  if (extras?.ingredientTables) {
    parts.push('');
    parts.push(extras.ingredientTables);
    parts.push('');
    parts.push(
      [
        '## Grocery list (build it now, after the checks)',
        extras.groceryContext ?? '',
        'The plan above is settled, so you know exactly which meals and scale factors were used. Build the list from the ingredient tables \u2014 they are the authoritative recipes for every curated option. Do NOT reconstruct a curated meal\u2019s ingredients from its name or from your own knowledge of the dish; these are specific recipes and your version will not match what the app shows the user when they cook it.',
        'Quantity arithmetic, per ingredient: for every occurrence in the FINAL plan, take (base amount \u00f7 servings the base recipe makes) \u00d7 that occurrence\u2019s scale_factor, and add plate PER-SERVING rows \u00d7 scale_factor. For multi-serving meals, size from the BATCHES cooked, not the placement count. Sum across the whole plan, then round UP to a pack size sold at their store. Compute with a code tool if available.',
        'Meals that appear in the tables but NOT in the final plan are not bought \u2014 skip them entirely.',
        'The items are generic so you can localise them: substitute the local equivalent product, use pack sizes actually sold there, and price in the local currency. Keep the ingredient recognisable \u2014 swap the product, not the recipe.',
        'Every grocery item that came from an ingredient table must carry that table\u2019s id in square brackets after the item name \u2014 e.g. "Chicken thigh [chicken_thigh]" or, once localised, "Chicken thigh fillets [chicken_thigh]". Keep the id EXACTLY as written even when you change the product name; it is how the app matches your priced item to its own records. Items with no id in any table simply have no bracket.',
        'Organise by the category given for each item (produce, meat_seafood, dairy_refrigerated, bakery, frozen, pantry_grains, condiments_supplements). Add ingredients for any invented meals or adjusters on top. Notes only for items bought outside the main store. Give a total as a range: low = sum of items, high = low \u00d7 1.10 rounded up, with the currency symbol.',
        '',
        'FROM-SCRATCH EXTRAS \u2014 a SECOND list, after the main one. Some meals have a from-scratch alternative the user can switch to in the app after importing. For every "From-scratch version ALSO needs" row belonging to a meal that IS in the final plan, give the item, its id in brackets, a pack size sold at their store, and a price \u2014 the same localising job as the main list. Head it "If you cook these from scratch" and give it its own subtotal. Do NOT add these to the main list or the main total: the user has not chosen to cook them that way and may never. This list exists so their shopping is still priced correctly if they do.',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Async wrapper — the only storage-touching entry point. Wire THIS in where
// assembleDynamicMealPlanningPrompt / assembleMealPlanningPrompt is called.
// ---------------------------------------------------------------------------

export async function assembleMealPlanPromptV2(opts?: BuildOpts): Promise<string> {
  const answers = await resolveNutritionAnswers();
  if (!answers) {
    throw new Error('Please complete the nutrition questionnaire first.');
  }

  // Phase-aware path: load GoalsProfile and use research-based macro targets
  // when available. Falls back to questionnaire-derived macros for users who
  // haven't completed GoalsIntake (backwards compatible).
  let macros: any = null;
  let derivedPhase: DerivedPhase | undefined;
  let profileWeightKg: number | undefined;

  // Phase-aware macros only apply when the profile can actually supply a
  // direction (a goal weight — see derivePhase). Without one, N1/N2 were
  // shown to the user as the fallback (see continueNutritionFlow), and
  // computeMacrosPhaseAware would silently derive 'maintain' regardless of
  // what they answered — the shown-but-ignored bug. In that case fall
  // through to computeMacros, which reads answers.goal/targetRatePercentage
  // directly and actually honors them.
  const profile = await loadGoalsProfile();
  let hasLeanMassTargets: boolean | undefined;
  if (profile && profile.goalWeightKg != null) {
    macros = computeMacrosPhaseAware(answers as NutritionAnswers, profile);
    if (macros) {
      derivedPhase = derivePhase(profile);
      profileWeightKg = profile.currentWeightKg;
      hasLeanMassTargets = profile.goalWeightKg != null || profile.goalBodyFatPct != null;
    }
  }

  // Fallback 1: questionnaire-derived macros (N1/N2 self-diagnosis path) —
  // also the path for a profile with no goal weight.
  if (!macros) {
    macros = computeMacros(answers as NutritionAnswers);
  }

  // Fallback 2: legacy finalized results (pre-V2 questionnaire completions)
  if (!macros) {
    const legacyResults = await WorkoutStorage.loadNutritionResults();
    if (legacyResults?.macroResults) {
      macros = legacyResults.macroResults;
    }
  }

  if (!macros) {
    throw new Error('Macro targets are missing — complete the nutrition questionnaire first.');
  }

  const favorites = await loadCuratedFavoritesV2();
  // User-created meals ride in as CuratedMeal-shaped views so the pure
  // builder can treat them as ordinary options.
  const customMeals = await loadCustomMealViews();
  let sleep: SleepDataLike | null = null;
  try {
    const sleepResults: any = await WorkoutStorage.loadSleepOptimizationResults();
    if (sleepResults?.formData?.bedtime) {
      sleep = {
        bedtime: sleepResults.formData.bedtime,
        wakeTime: sleepResults.formData.wakeTime,
        optimizationLevel: sleepResults.formData.optimizationLevel,
      };
    }
  } catch {
    sleep = null;
  }

  return buildMealPlanPrompt(answers as NutritionAnswers, macros, favorites, sleep, {
    ...opts,
    customMeals,
    derivedPhase,
    profileWeightKg,
    hasLeanMassTargets,
  });
}

export async function buildReviewLauncherFromStorage(): Promise<string> {
  const answers = await resolveNutritionAnswers();
  if (!answers) throw new Error('Please complete the nutrition questionnaire first.');

  let macros: any = null;
  let profileWeightKg: number | undefined;

  // Same gate as assembleMealPlanPromptV2 — only phase-aware when the
  // profile can supply a direction; otherwise honor the N1/N2 fallback.
  const profile = await loadGoalsProfile();
  if (profile && profile.goalWeightKg != null) {
    macros = computeMacrosPhaseAware(answers as NutritionAnswers, profile);
    if (macros) profileWeightKg = profile.currentWeightKg;
  }
  if (!macros) macros = computeMacros(answers as NutritionAnswers);
  if (!macros) {
    const legacyResults = await WorkoutStorage.loadNutritionResults();
    if (legacyResults?.macroResults) macros = legacyResults.macroResults;
  }

  const targets = deriveTargets(macros, profileWeightKg ?? (answers as any).weight);
  if (!targets) throw new Error('Macro targets are missing.');

  // The ingredient tables ride with the REVIEW step now, not generation.
  // Same frames the generation prompt was built from, so the tables cover
  // every option the plan could have used.
  const favorites = await loadCuratedFavoritesV2();
  const allMeals: CuratedMeal[] = [
    ...(Object.values(CURATED_MEALS) as CuratedMeal[]),
    ...(await loadCustomMealViews()),
  ];
  const frames = buildFrames(
    answers as NutritionAnswers,
    favorites,
    targets,
    allMeals
  );
  const a: any = answers;
  const budget =
    a.budgetMin != null && a.budgetMax != null
      ? `$${a.budgetMin}\u2013$${a.budgetMax}/week`
      : a.weeklyBudget
      ? String(a.weeklyBudget)
      : 'moderate';
  const groceryContext =
    `Location & store: ${a.groceryStore ?? 'local supermarket'} in ${a.city ?? ''} ${a.country ?? ''}`.trim() +
    `. Weekly budget: ${budget}.`;

  return buildReviewLauncher(targets, (answers as any).mealVariety ?? 'balanced', {
    ingredientTables: ingredientsSection(frames, allMeals),
    groceryContext,
  });
}