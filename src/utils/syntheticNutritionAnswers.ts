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
 * ── RAISED FROM 0.2 / 0.5 ON 18 AUG 2026, AND WHY ───────────────────────────
 *
 * The old lean_bulk figure of 0.2 was attributed to Garthe 2013 and that
 * attribution was WRONG. Garthe's counselling group — the arm that actually ran
 * a prescribed surplus (544 ± 31 kcal/day, 2.4 g/kg protein, 4 resistance
 * sessions a week) — gained roughly +1.7 kg lean against +1.1 kg fat, which is
 * about 0.65. The 0.17 that matched our old number belongs to the AD-LIBITUM
 * arm, which was given no surplus at all. For a training-free floor, Bouchard's
 * 1990 twin overfeeding ran 2:1 fat to lean.
 *
 * Partial defence for the old number, recorded so nobody re-derives it: the app
 * sizes its surplus from the CAPPED lean-gain rate, which for an intermediate
 * is roughly 200 kcal/day — about 40% of Garthe's. A smaller surplus should
 * partition better. But no trial has measured partitioning at a surplus that
 * small, so 0.2 was an extrapolation BELOW THE TESTED RANGE presented as a
 * measurement.
 *
 * DIRECTION OF ERROR DECIDES THE NEW VALUES. Understating fat gain means users
 * finish a build fatter than the plan promised and need a longer cut than it
 * scheduled — the failure that costs trust. Overstating only makes the plan
 * slightly conservative. So these sit at the measured figure rather than under
 * it.
 *
 * WHAT THIS CHANGES DOWNSTREAM, measured rather than assumed: total plan length
 * moves about 9% (a 90 kg lifter at 25% aiming for 85 kg at 14% goes 15.9 to
 * 16.7 months). But the SHAPE changes for lean users with a large lean gap. At
 * 0.2 body fat asymptotes at 16.7%, so an 18% ceiling could never be reached
 * from below and deriveRoadmap's ceiling rail was effectively dead code. At 0.5
 * the asymptote is 33%, so the rail fires and cut/build CYCLING reappears for
 * exactly the population that does it in practice.
 */
export const FAT_PER_LEAN_KG: Record<'lean_bulk' | 'bulk', number> = {
  lean_bulk: 0.5,
  bulk: 0.65,
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
  /**
   * The cut rate already resolved against this user's CURRENT fat-mass
   * ceiling, as a percentage. Supplied by the caller because resolving it
   * needs lossRate, and importing that here would cost this module its
   * runtime-leaf property.
   *
   * When absent the fallback below applies, which is the slow bound and safe
   * for almost everyone — the exception being a very lean user, whose ceiling
   * the caller is expected to have checked.
   */
  cutRatePct?: number;
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

  // A CUT rate resolved against the user's current ceiling always wins over
  // the constant. The constant is 0.5%/wk, which a lean enough user cannot
  // sustain either — see the Alpert limit in lossRate.
  if (phase === 'cut' && inputs?.cutRatePct != null && inputs.cutRatePct > 0) {
    out.targetRatePercentage = inputs.cutRatePct;
  }

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