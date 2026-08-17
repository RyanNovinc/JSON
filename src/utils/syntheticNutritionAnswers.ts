// src/utils/syntheticNutritionAnswers.ts
//
// The phase -> synthetic N1/N2 answer mapping, extracted out of
// questionnaireRouting so that nutritionQuestionnaireStorage can use it
// without creating an import cycle (questionnaireRouting imports
// nutritionQuestionnaireStorage).
//
// This module imports TYPES ONLY from goalsProfile, so it is a leaf at
// runtime and safe to pull into any storage or screen module.
//
// Two behaviours matter here and are the reason this is its own file:
//
//  1. deriveSyntheticNutritionAnswers ALWAYS returns an object. It used to
//     return PHASE_SYNTH[phase] directly, so any DerivedPhase value that
//     wasn't a key (or a derivePhase that returned undefined) produced
//     `undefined`. Callers then did saveNutritionAnswers(undefined), which
//     fails silently inside that function's try/catch because
//     JSON.stringify(undefined) is not a string, and passed
//     `answersSoFar: undefined` down the flow. The goal was gone from that
//     point on, and finalizeNutrition later wrote `goal: ''`.
//
//  2. It returns a FRESH object each call. PHASE_SYNTH entries are
//     module-level and were previously handed straight to
//     navigation.navigate as `answersSoFar`, so any screen that mutated
//     that param in place corrupted the mapping for the rest of the session.

import type { DerivedPhase } from './goalsProfile';

export interface SyntheticNutritionAnswers {
  goal: 'lose_weight' | 'gain_weight' | 'maintain';
  targetRatePercentage?: number;
}

/**
 * [B] Fat gained per kg of lean gained, by how deliberate the surplus is.
 *
 * Garthe 2013 puts this near 0.2 at cautious rates and around 0.5 at
 * deliberate ones. A lean bulk aims at the cautious end; a full bulk is the
 * user having accepted the faster, softer version on the roomy route.
 */
const FAT_PER_LEAN_KG: Record<'lean_bulk' | 'bulk', number> = {
  lean_bulk: 0.2,
  bulk: 0.5,
};

/**
 * Fallback rates, used only when the caller cannot supply a lean-gain rate.
 *
 * ── WHY THE BULK FIGURE MOVED, 17 Aug 2026 ───────────────────────────────
 *
 * It was 0.5%/wk of bodyweight, which is the top of the conventional bulking
 * range and reasonable for a NOVICE. Applied to everyone it prescribes weight
 * the body cannot put on as muscle:
 *
 *   75 kg at 0.5%/wk  = 375 g/week.
 *   The DEXA ceiling on lean gain is 230 g/week, and that is a novice at full
 *   tilt — so 145 g is fat before anything goes wrong.
 *   For an intermediate whose roadmap-capped rate is ~110 g/week, the same
 *   0.5% means 265 g of fat against 110 g of muscle. Nearly 2.5 to 1.
 *
 * The nutrition side was asking for gain the training side already says
 * cannot mostly be muscle — and the roadmap then schedules a trim to take the
 * difference back off.
 *
 * 0.35% is the compromise a single constant can honestly make. The real fix
 * is the derived path below, which uses the lifter's OWN capped gain rate;
 * these values exist for callers that do not have a profile to hand.
 */
const PHASE_SYNTH: Record<DerivedPhase, SyntheticNutritionAnswers> = {
  cut:       { goal: 'lose_weight', targetRatePercentage: 0.5  },
  recomp:    { goal: 'maintain' },
  lean_bulk: { goal: 'gain_weight', targetRatePercentage: 0.25 },
  bulk:      { goal: 'gain_weight', targetRatePercentage: 0.35 },
  maintain:  { goal: 'maintain' },
};

// Used when derivePhase hands back something outside the union. 'maintain'
// is the only safe default: it needs no rate, so hasCompleteNutritionAnswers
// can still be satisfied and the summary still renders.
const FALLBACK: SyntheticNutritionAnswers = { goal: 'maintain' };

/**
 * What the caller may supply so the gain rate can be DERIVED rather than
 * assumed. Both fields or neither — a rate needs a numerator and a
 * denominator.
 *
 * Deliberately plain numbers rather than a GoalsProfile: this module is a
 * runtime leaf (types only from goalsProfile), which is what lets storage and
 * screens import it without a cycle. Taking a profile would mean importing
 * roadmap to compute the rate, and the cycle risk is exactly what put this
 * file here in the first place.
 */
export interface GainRateInputs {
  /** The lifter's own capped lean-gain rate, kg per week. */
  leanGainKgPerWeek?: number;
  currentWeightKg?: number;
}

export function deriveSyntheticNutritionAnswers(
  phase: DerivedPhase,
  inputs?: GainRateInputs,
): SyntheticNutritionAnswers {
  const match = PHASE_SYNTH[phase];
  if (!match) {
    console.warn(
      `[syntheticNutritionAnswers] unmapped phase ${String(phase)}, defaulting to maintain`
    );
    return { ...FALLBACK };
  }

  const out = { ...match };

  // Derive the gain rate from what this lifter can actually build, when the
  // caller knows it. Total weight gained is the lean they can add plus the fat
  // that comes with it at the ratio the phase implies — so the target follows
  // the ceiling instead of ignoring it.
  //
  // Only ever moves the rate DOWN, never up: the constants above are already
  // at the top of what is defensible, and a lifter whose derived rate exceeds
  // them is a novice whose ceiling is high, not a reason to prescribe more.
  if (
    (phase === 'lean_bulk' || phase === 'bulk') &&
    inputs?.leanGainKgPerWeek != null &&
    inputs.leanGainKgPerWeek > 0 &&
    inputs.currentWeightKg != null &&
    inputs.currentWeightKg > 0
  ) {
    const totalKgPerWeek = inputs.leanGainKgPerWeek * (1 + FAT_PER_LEAN_KG[phase]);
    const derivedPct = (totalKgPerWeek / inputs.currentWeightKg) * 100;
    out.targetRatePercentage = Math.min(
      match.targetRatePercentage ?? derivedPct,
      Number(derivedPct.toFixed(2)),
    );
  }

  return out;
}