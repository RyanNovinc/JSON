// src/utils/basketCheck.ts
//
// ONE home for everything the pick-time feasibility check depends on:
//
//   - the tab / slot-structure derivation (buildTabs, tabSlot, slotsForTab)
//   - the scoped-key format picks are stored and assessed under
//   - target resolution (SAME order as assembleMealPlanPromptV2)
//   - SlotSpec assembly for the engine
//   - runBasketCheck(), the one-call wrapper
//
// WHY THIS FILE EXISTS. This logic used to live inside
// CuratedFavoritesScreen.tsx, which meant the day-shape the feasibility
// engine tested was a second, hand-maintained copy of the day-shape
// mealPlanPromptV2.ts builds plans to — three "keep in lockstep" comments
// and no way to test the screen's copy without a device build. Everything
// here is pure and jest-testable; the screen is now a thin consumer, and a
// test that exercises this module exercises EXACTLY what the screen runs.
//
// PARITY CONTRACT with mealPlanPromptV2.ts (structureSlots / buildFrames /
// snackOccurrences / dessertOccurrences / deriveTargets):
//   - core slots by mealsPerDay: 1→dinner · 2→lunch,dinner · 3+→bf,lunch,dinner
//   - extras beyond 3 fill from EXOTIC_FILL_ORDER, gated on eligibility
//   - snack occurrences: '2'→14/wk · '3+'→21/wk · 'ai_decide'→(kcal≥2800?14:7)
//     · otherwise 7/wk when the frequency is set and not '0'
//   - dessert occurrences: every_night 7 · most_nights 5 · few_per_week 3 ·
//     once_per_week 1 · ai_decide 3
//   - morning/afternoon/evening_snack picks FOLD into the snack slot
//     (mirrors SLOT_FOLD — without the fold, picks stored under those slots
//     bind to no SlotSpec and are invisible to the check)
//   - macro resolution: computeMacrosPhaseAware when GoalsProfile has a
//     goalWeightKg, else computeMacros — the builder's exact gate
// The long-term move is for mealPlanPromptV2.ts to import its structure
// derivation FROM here so the parity contract becomes a single function;
// until then, changes to either side must touch both.

import { CuratedMeal } from '../types/curated_meals';
import {
  CoreShelf,
  MealSlot,
  SHELF_SLOTS,
  emptyFilter,
  mealsForSlots,
} from './curatedShelves';
import {
  assessBasket,
  BasketVerdict,
  SlotSpec,
  Targets,
} from './mealFeasibility';
import { computeMacros, computeMacrosPhaseAware } from './nutritionMacros';
import type { GoalsProfile } from './goalsProfile';
import type { PlanSlot } from './curatedFavoritesStorage';

// =============================================================================
// Tab model — the structure derivation (moved verbatim from the screen)
// =============================================================================

export type TabKey =
  | { kind: 'core'; shelf: CoreShelf }
  | { kind: 'exotic'; slot: MealSlot };

const SHELF_LABEL: Record<CoreShelf, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  dessert: 'Dessert',
};
const SLOT_LABEL: Partial<Record<MealSlot, string>> = {
  brunch: 'Brunch',
  second_lunch: 'Second lunch',
  early_dinner: 'Early dinner',
  morning_snack: 'Morning snack',
  afternoon_snack: 'Afternoon snack',
  evening_snack: 'Evening snack',
  pre_workout: 'Pre-workout',
  post_workout: 'Post-workout',
};

export const EXOTIC_FILL_ORDER: MealSlot[] = [
  'brunch',
  'second_lunch',
  'early_dinner',
  'pre_workout',
  'post_workout',
];

export function tabLabel(t: TabKey): string {
  if (t.kind === 'core') return SHELF_LABEL[t.shelf];
  return SLOT_LABEL[t.slot] ?? String(t.slot);
}
export function tabId(t: TabKey): string {
  return t.kind === 'core' ? `core:${t.shelf}` : `exotic:${t.slot}`;
}

/** Canonical PlanSlot for a tab — the scope picks are stored under, and the
 *  SlotSpec.id the feasibility engine matches scoped keys against. */
export function tabSlot(t: TabKey): PlanSlot {
  if (t.kind === 'core') return (t.shelf === 'snacks' ? 'snack' : t.shelf) as PlanSlot;
  return t.slot as PlanSlot;
}

/** Selection-state keys are slot-scoped: `${slot}|${slug}` or
 *  `${slot}|${slug}:${plateId}`. Same format the engine consumes. */
export const scopeKey = (slot: PlanSlot, key: string) => `${slot}|${key}`;
export function unscopeKey(scoped: string): { slot: PlanSlot; key: string } {
  const i = scoped.indexOf('|');
  return { slot: scoped.slice(0, i) as PlanSlot, key: scoped.slice(i + 1) };
}

export function buildTabs(
  mealsPerDay: number | undefined,
  snackFrequency: string | undefined,
  dessertFrequency: string | undefined,
  allMeals: CuratedMeal[]
): TabKey[] {
  if (mealsPerDay == null) {
    const tabs: TabKey[] = [
      { kind: 'core', shelf: 'breakfast' },
      { kind: 'core', shelf: 'lunch' },
      { kind: 'core', shelf: 'dinner' },
    ];
    // Same gate as the mealsPerDay-known branch below, and the same gate the
    // parity contract states: a snack slot exists only when the frequency is
    // SET and not '0'.
    //
    // This used to be `snackFrequency !== '0'`, which let an UNDEFINED
    // frequency through. mealsPerDay and snackFrequency both come from the
    // budget/cooking questionnaire, so undefined here almost always means that
    // questionnaire was never completed — and the consequence was two-sided.
    // The screen offered a Snacks tab whose picks snackOccurrences(undefined)
    // then scored as 0 occurrences and silently dropped from the plan; and
    // buildSlotSpecs gave the engine a snack slot at 7 weekly occurrences,
    // so the feasibility check was modelling a day the plan never builds.
    //
    // Fixing it here rather than making the builder treat undefined as
    // 'ai_decide' is deliberate: that would push 7 to 14 snack occurrences into
    // the plans of everyone with an incomplete questionnaire, who never asked
    // for snacks. Showing one tab fewer costs nothing by comparison.
    if (snackFrequency && snackFrequency !== '0') {
      tabs.push({ kind: 'core', shelf: 'snacks' });
    }
    return tabs;
  }
  const coreByCount: Record<number, CoreShelf[]> = {
    1: ['dinner'],
    2: ['lunch', 'dinner'],
    3: ['breakfast', 'lunch', 'dinner'],
    4: ['breakfast', 'lunch', 'dinner'],
    5: ['breakfast', 'lunch', 'dinner'],
    6: ['breakfast', 'lunch', 'dinner'],
  };
  const coreShelves = coreByCount[mealsPerDay] ?? ['breakfast', 'lunch', 'dinner'];
  const tabs: TabKey[] = coreShelves.map((shelf) => ({ kind: 'core', shelf }));

  const extraNeeded = Math.max(0, mealsPerDay - 3);
  if (extraNeeded > 0) {
    let added = 0;
    for (const slot of EXOTIC_FILL_ORDER) {
      if (added >= extraNeeded) break;
      const eligible = mealsForSlots([slot], allMeals, emptyFilter(), 'default');
      if (eligible.length > 0) {
        tabs.push({ kind: 'exotic', slot });
        added += 1;
      }
    }
  }
  if (snackFrequency && snackFrequency !== '0') {
    tabs.push({ kind: 'core', shelf: 'snacks' });
  }
  if (dessertFrequency && dessertFrequency !== '0') {
    tabs.push({ kind: 'core', shelf: 'dessert' });
  }
  return tabs;
}

export function slotsForTab(tab: TabKey): MealSlot[] {
  return tab.kind === 'core' ? SHELF_SLOTS[tab.shelf] : [tab.slot];
}

// =============================================================================
// Targets — SAME resolution order as assembleMealPlanPromptV2
// =============================================================================

/**
 * Phase-aware when the profile can supply a direction (a goal weight),
 * questionnaire-derived otherwise. This is the builder's exact gate; drift
 * here is the bug that let the reported basket through — the screen tested
 * against questionnaire-derived (maintenance-level) carb/calorie ceilings
 * while the plan was built to phase-aware cut ceilings ~50 g/day lower.
 */
export function resolveBasketTargets(
  answers: any,
  goalsProfile: GoalsProfile | null
): Targets | null {
  try {
    const r: any =
      (goalsProfile && goalsProfile.goalWeightKg != null
        ? computeMacrosPhaseAware(answers, goalsProfile)
        : null) ?? computeMacros(answers);
    if (!r) return null;
    const kcal = r.calories ?? r.targetCalories ?? r.kcal ?? r.dailyCalories;
    const protein = r.protein ?? r.proteinTarget ?? r.protein_g ?? r.proteinGrams;
    if (!kcal || !protein) return null;
    return {
      kcal,
      protein_g: protein,
      carbs_g: r.carbs ?? r.carbsTarget ?? r.carbs_g,
      fat_g: r.fat ?? r.fatTarget ?? r.fat_g,
      fiber_g: r.fiber ?? r.fiberTarget ?? r.fiber_g ?? Math.round((kcal * 14) / 1000),
    };
  } catch {
    return null; // no targets → feasibility check silently skipped
  }
}

// =============================================================================
// SlotSpecs — the day shape the engine models
// =============================================================================

export function buildSlotSpecs(
  tabs: TabKey[],
  snackFrequency: string | undefined,
  dessertFrequency: string | undefined,
  targetKcal: number | null | undefined
): SlotSpec[] {
  const snackPerDay =
    snackFrequency === '2' ? 2
    : snackFrequency === '3+' ? 3
    : snackFrequency === 'ai_decide' ? (targetKcal != null && targetKcal >= 2800 ? 2 : 1)
    : 1;
  const dessertWeekly =
    dessertFrequency === 'every_night' ? 7
    : dessertFrequency === 'most_nights' ? 5
    : dessertFrequency === 'few_per_week' ? 3
    : dessertFrequency === 'once_per_week' ? 1
    : dessertFrequency === 'ai_decide' ? 3
    : 0;
  return tabs.map((t) => {
    const isSnacks = t.kind === 'core' && t.shelf === 'snacks';
    const isDessert = t.kind === 'core' && t.shelf === 'dessert';
    const isMain =
      t.kind === 'core' && (t.shelf === 'lunch' || t.shelf === 'dinner');
    return {
      // tabSlot, not tabId: the engine matches scoped keys (`slot|key`)
      // against SlotSpec.id, and CertifiedFix.slot round-trips through it.
      id: tabSlot(t),
      label: tabLabel(t),
      mealSlots: slotsForTab(t),
      perDay: isSnacks ? snackPerDay : 1,
      weeklyOccurrences: isSnacks ? snackPerDay * 7 : isDessert ? dessertWeekly : 7,
      borrowGroup: isMain ? ('main' as const) : undefined,
    };
  });
}

// =============================================================================
// Key normalisation — mirror of the builder's SLOT_FOLD
// =============================================================================

/** Picks stored under snack-time sub-slots fold into the snack frame in
 *  buildFrames (SLOT_FOLD). The engine matches scoped keys against SlotSpec
 *  ids literally, and no spec has a sub-slot id — so without this fold a
 *  `morning_snack|slug` pick is INVISIBLE to the check while the plan still
 *  schedules it. Fold before assessing. */
const SNACK_FOLD: Record<string, string> = {
  morning_snack: 'snack',
  afternoon_snack: 'snack',
  evening_snack: 'snack',
};

export function normalizeSelectedKeys(selectedKeys: string[]): string[] {
  const out = new Set<string>();
  for (const raw of selectedKeys) {
    const i = raw.indexOf('|');
    if (i === -1) {
      out.add(raw); // legacy bare key — engine resolves by eligibility
      continue;
    }
    const slot = raw.slice(0, i);
    const folded = SNACK_FOLD[slot];
    out.add(folded ? `${folded}${raw.slice(i)}` : raw);
  }
  return Array.from(out);
}

// =============================================================================
// Selection hydration — storage → scoped keys (shared by screen + repro test)
// =============================================================================

/** V2 picks map straight in (including picks for slots the current structure
 *  doesn't show — they stay invisible but survive a round-trip). Mirror-only
 *  slugs — legacy data, or slugs added via the V1 API with no slot context —
 *  hydrate into every eligible tab once. This mirrors buildFrames' pick
 *  binding + mirror hydration, so what the check sees is what the plan gets. */
export function hydrateSelection(
  picks: { slot: PlanSlot; slug: string; plate_id?: string }[],
  mirrorSlugs: string[],
  tabs: TabKey[],
  allMeals: CuratedMeal[]
): Set<string> {
  const next = new Set<string>();
  const pickedSlugs = new Set<string>();
  for (const p of picks) {
    pickedSlugs.add(p.slug);
    next.add(scopeKey(p.slot, p.plate_id ? `${p.slug}:${p.plate_id}` : p.slug));
  }
  for (const slug of mirrorSlugs) {
    if (pickedSlugs.has(slug)) continue;
    for (const t of tabs) {
      const eligible = mealsForSlots(slotsForTab(t), allMeals, emptyFilter(), 'default');
      if (eligible.some((m) => m.slug === slug)) {
        next.add(scopeKey(tabSlot(t), slug));
      }
    }
  }
  return next;
}

// =============================================================================
// One-call wrapper — what the screen runs, and what the repro test runs
// =============================================================================

export interface BasketCheckInput {
  answers: any; // resolved NutritionAnswers (or answersSoFar param)
  goalsProfile: GoalsProfile | null;
  selectedKeys: string[]; // scoped `${slot}|${key}` (+ legacy bare keys)
  allMeals: CuratedMeal[];
  avoid?: string[];
}

export interface BasketCheckResult {
  targets: Targets | null;
  tabs: TabKey[];
  slotSpecs: SlotSpec[];
  /** null when targets are unresolvable or the structure isn't modelable —
   *  the check silently passes, matching the engine's never-block rule. */
  verdict: BasketVerdict | null;
}

export function runBasketCheck(input: BasketCheckInput): BasketCheckResult {
  const { answers, goalsProfile, selectedKeys, allMeals } = input;
  const targets = resolveBasketTargets(answers, goalsProfile);
  const tabs = buildTabs(
    answers?.mealsPerDay,
    answers?.snackFrequency,
    answers?.dessertFrequency,
    allMeals
  );
  const slotSpecs = buildSlotSpecs(
    tabs,
    answers?.snackFrequency,
    answers?.dessertFrequency,
    targets?.kcal ?? null
  );
  const verdict = targets
    ? assessBasket({
        slots: slotSpecs,
        selectedKeys: normalizeSelectedKeys(selectedKeys),
        allMeals,
        targets,
        allergies: answers?.allergies,
        avoid: input.avoid,
      })
    : null;
  return { targets, tabs, slotSpecs, verdict };
}