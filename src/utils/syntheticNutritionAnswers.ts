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

// Synthetic N1 (goal) and N2 (rate) answers per phase.
// Persisted before navigating to N3 so hasCompleteNutritionAnswers() can
// reach `true` even though those screens were skipped.
const PHASE_SYNTH: Record<DerivedPhase, SyntheticNutritionAnswers> = {
  cut:       { goal: 'lose_weight', targetRatePercentage: 0.5  },
  recomp:    { goal: 'maintain' },
  lean_bulk: { goal: 'gain_weight', targetRatePercentage: 0.25 },
  bulk:      { goal: 'gain_weight', targetRatePercentage: 0.5  },
  maintain:  { goal: 'maintain' },
};

// Used when derivePhase hands back something outside the union. 'maintain'
// is the only safe default: it needs no rate, so hasCompleteNutritionAnswers
// can still be satisfied and the summary still renders.
const FALLBACK: SyntheticNutritionAnswers = { goal: 'maintain' };

export function deriveSyntheticNutritionAnswers(
  phase: DerivedPhase
): SyntheticNutritionAnswers {
  const match = PHASE_SYNTH[phase];
  if (!match) {
    console.warn(
      `[syntheticNutritionAnswers] unmapped phase ${String(phase)}, defaulting to maintain`
    );
    return { ...FALLBACK };
  }
  return { ...match };
}