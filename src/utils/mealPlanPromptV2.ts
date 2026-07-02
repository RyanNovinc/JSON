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
import {
  CuratedFavoritesV2,
  PlanSlot,
  loadCuratedFavoritesV2,
} from './curatedFavoritesStorage';
import {
  NutritionAnswers,
  loadNutritionAnswers,
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

const INSTRUCTIONS_URL = 'https://json.fit/prompts/v2/instructions.md';
const REVIEW_URL = 'https://json.fit/prompts/v2/meal-review-prompt.md';

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
  if (frames.some((f) => f.slot === 'dessert')) lines.push('Dessert: after dinner');
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

const iso = (d: Date) => d.toISOString().slice(0, 10);
const pretty = (d: Date) =>
  d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function optionRow(o: PlanOption): string {
  const name = `${o.name}${o.stunt ? ' (stunt)' : ''}${o.filler ? ' (UF)' : ''}`;
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
  if (f.borrowableWith)
    notes.push(
      `May borrow from ${SLOT_LABEL[f.borrowableWith]} when it helps reuse a batch or hit the day's targets.`
    );
  const realOpts = f.options.filter((o) => !o.filler).length;
  if (realOpts > 0 && realOpts * 2 <= f.occurrencesPerWeek)
    notes.push(
      `With ${realOpts} option${realOpts === 1 ? '' : 's'} for ${f.occurrencesPerWeek} occurrences, repetition is expected and correct — vary the scale day to day rather than inventing variety.`
    );
  return [head, table, ...notes.map((s) => `> ${s}`)].join('\n');
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
  const fetchRefs = ['- https://json.fit/phase-selection.md (phase selection rationale)'];
  if (hasLeanMassTargets) {
    fetchRefs.push('- https://json.fit/lean-mass-targets.md (lean mass targets)');
  }
  lines.push('**Phase references (fetch for context — do not show these URLs to the user):**\n' + fetchRefs.join('\n'));

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
  const frames = buildFrames(answers, favorites, targets, Object.values(CURATED_MEALS));
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
      '4. Batch meals (serves > 1): if you schedule one, schedule its full batch within the week, or state "freeze N portions" in the prep notes. Place fridge-eaten servings on consecutive days starting at the cook; any serving more than 4 days after the cook must be a frozen portion with a thaw note ("freeze N portions; thaw overnight before day X"). Rotate its plates.',
      `5. Maximum ${STUNT_CAP} stunt plate this week. Dessert appears exactly ${dessertOcc} time(s) \u2014 never more, never as "optional".`,
      `6. Adjusters (table below) are standalone items used to close a day\u2019s gaps. Maximum ${MAX_ADJUSTERS_PER_DAY} per day.`,
      '7. Fallback order when a day misses target: rescale \u2192 adjusters \u2192 swap option within the slot \u2192 universal fillers (marked UF) for uncovered occurrences \u2192 only if all else fails, invent a simple meal and say so in the plan notes.',
      '8. Curated options are output as references (slug + plate_id + scale_factor) \u2014 never rewrite them as recipes. Slugs and plate_ids are verbatim lookup keys; copy them exactly.',
    ].join('\n')
  );

  const mealVariety: string = (a.mealVariety as string) ?? 'balanced';
  const varietyDirective =
    mealVariety === 'convenience'
      ? 'VARIETY — Convenience. Repeat meals aggressively to minimise cooking and shopping. Reuse the same mains across multiple days via batching, and keep adjusters consistent day to day. Repetition is desired here, not a flaw.'
      : mealVariety === 'variety'
      ? 'VARIETY — High. Maximise day to day variety: rotate the main options across more days and vary the adjusters and produce daily. Accept more cooking and shopping to avoid repetition.'
      : 'VARIETY — Balanced. Use roughly two to three distinct mains per slot across the week, and rotate the adjusters and produce so the same top-up doesn’t appear every single day. Still batch where it genuinely helps.';
  parts.push(varietyDirective);

  if (opts?.derivedPhase) {
    parts.push(phaseContextBlock(opts.derivedPhase, macros, duration, opts?.hasLeanMassTargets));
  }

  const targetLines = [
    '## Your daily targets (absolute numbers — already computed)',
    `- Calories: ${n5(targets.kcalLo)}\u2013${n5(targets.kcalHi)} kcal EVERY day`,
    `- Protein: ${targets.pLo}\u2013${targets.pHi} g EVERY day; every main meal \u2265 ${targets.pFloor} g`,
    `- Fibre: \u2265 ${targets.fibMin} g every day`,
    `- Weekly averages: carbs ${targets.cLo}\u2013${targets.cHi} g, fat ${targets.fLo}\u2013${targets.fHi} g`,
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

  parts.push(
    [
      '## Build procedure',
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

  parts.push(
    [
      '## Grocery list',
      `Location & store: ${a.groceryStore ?? 'local supermarket'} in ${a.city ?? ''} ${a.country ?? ''}`.trim() + `. Weekly budget: ${budget}.`,
      'Include every ingredient across the plan (curated meals included, from your knowledge of those recipes), organised by shopping category, with quantity, unit, and a realistic estimated price for that store. Notes only for items bought outside the main store. Give a total as a range: low = sum of items, high = low \u00d7 1.10 rounded up, with the currency symbol.',
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
      'Present the full plan in chat: each day with dates and times, the per-day arithmetic line, prep notes, then the grocery list. Present only the final clean version \u2014 no working, no drafts.',
      '',
      '## END YOUR RESPONSE WITH THIS EXACT CALLOUT',
      '',
      'The VERY LAST thing in your response must be this callout, formatted as a code block (triple backticks, no language identifier). Do not add anything after it. Reproduce it verbatim:',
      '',
      '```',
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

export function buildReviewLauncher(t: PromptTargets): string {
  return `Review the meal plan above as a quality gate.
Fetch ${REVIEW_URL} and follow it exactly.
Verify against these targets (authoritative \u2014 use these, not numbers recalled from earlier):
- Calories: ${t.kcalLo}\u2013${t.kcalHi} kcal every day
- Protein: ${t.pLo}\u2013${t.pHi} g every day (each main meal \u2265 ${t.pFloor} g)
- Fibre: \u2265 ${t.fibMin} g every day
- Weekly averages: carbs ${t.cLo}\u2013${t.cHi} g, fat ${t.fLo}\u2013${t.fHi} g`;
}

// ---------------------------------------------------------------------------
// Async wrapper — the only storage-touching entry point. Wire THIS in where
// assembleDynamicMealPlanningPrompt / assembleMealPlanningPrompt is called.
// ---------------------------------------------------------------------------

export async function assembleMealPlanPromptV2(opts?: BuildOpts): Promise<string> {
  const answers = await loadNutritionAnswers();
  if (!answers) {
    throw new Error('Please complete the nutrition questionnaire first.');
  }

  // Phase-aware path: load GoalsProfile and use research-based macro targets
  // when available. Falls back to questionnaire-derived macros for users who
  // haven't completed GoalsIntake (backwards compatible).
  let macros: any = null;
  let derivedPhase: DerivedPhase | undefined;
  let profileWeightKg: number | undefined;

  const profile = await loadGoalsProfile();
  let hasLeanMassTargets: boolean | undefined;
  if (profile) {
    macros = computeMacrosPhaseAware(answers as NutritionAnswers, profile);
    if (macros) {
      derivedPhase = derivePhase(profile);
      profileWeightKg = profile.currentWeightKg;
      hasLeanMassTargets = profile.goalWeightKg != null || profile.goalBodyFatPct != null;
    }
  }

  // Fallback 1: questionnaire-derived macros (N1/N2 self-diagnosis path)
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
    derivedPhase,
    profileWeightKg,
    hasLeanMassTargets,
  });
}

export async function buildReviewLauncherFromStorage(): Promise<string> {
  const answers = await loadNutritionAnswers();
  if (!answers) throw new Error('Please complete the nutrition questionnaire first.');

  let macros: any = null;
  let profileWeightKg: number | undefined;

  const profile = await loadGoalsProfile();
  if (profile) {
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
  return buildReviewLauncher(targets);
}