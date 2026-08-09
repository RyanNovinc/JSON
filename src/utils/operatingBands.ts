// src/utils/operatingBands.ts
//
// The body-fat operating bands and the recomp-window entry thresholds.
//
// A LEAF module — imports nothing but types — for the same reason
// syntheticNutritionAnswers is one: derivePhase (goalsProfile.ts) now reads
// the bands, and roadmap.ts imports goalsProfile, so leaving the bands in
// roadmap.ts would create a runtime import cycle under Metro. It also keeps
// the "a constant is defined once" rule: this is the ONLY copy of the bands;
// roadmap.ts re-exports them so its existing importers are unchanged.

import type { Sex, RoutePreference } from './goalsProfile';

/**
 * [C] The body-fat range within which gaining and trimming phases cycle.
 * Practitioner consensus only — no trial establishes any of these thresholds
 * as optimal, and no study shows a wider band produces more muscle per unit
 * time than a narrow one.
 *
 * The ceiling is capped at 18% (men) because running a surplus above that
 * mostly adds fat and lengthens the eventual cut. It is NOT capped because
 * body fat impairs muscle gain — phase-selection.md's no-cut-first rule
 * stands, and this is cycle management, not physiology.
 */
export const OPERATING_BANDS: Record<
  RoutePreference,
  { male: [number, number]; female: [number, number]; cycles: number }
> = {
  lean: { male: [12, 15], female: [20, 24], cycles: 6 },
  balanced: { male: [12, 18], female: [20, 27], cycles: 4 },
  roomy: { male: [14, 18], female: [22, 27], cycles: 3 },
};

export function bandFor(
  route: RoutePreference,
  sex?: Sex,
): { floor: number; ceiling: number; cycles: number } {
  const b = OPERATING_BANDS[route];
  const [floor, ceiling] = sex === 'female' ? b.female : b.male;
  return { floor, ceiling, cycles: b.cycles };
}

/**
 * [B] Body fat at or above which a NEW or RETURNING trainee is routed to a
 * recomp — derivePhase rule 1, the muscle-memory / newbie-gains window.
 *
 * Male 15 matches the "≳15% men" build-plan language, taking the conservative
 * (lower) bound so the rules err toward restraint rather than prematurely
 * prescribing an aggressive surplus.
 *
 * Female 24 is supported by two INDEPENDENT derivations that agree, which is
 * worth more than either alone:
 *   - the +9-point convention already used by BODY_FAT_TIERS and
 *     physiqueTargets (15 + 9 = 24), and
 *   - band proportion: 15 sits at 50% of the male balanced band (12–18), and
 *     50% of the female balanced band (20–27) is 23.5 ≈ 24.
 * A flat 15 for everyone swept lean women into the recomp window — 22% on a
 * woman reads like ~13% on a man.
 */
export const RECOMP_ENTRY_BF: Record<'male' | 'female', number> = {
  male: 15,
  female: 24,
};

/**
 * 'prefer_not_to_say' and unknown take the MALE (lower) threshold, so the
 * recomp window fires earlier rather than later. Erring toward recomp is the
 * safe direction, and it is consistent with how computeMacrosPhaseAware
 * handles the same case — by refusing to guess in the risky direction.
 */
export const recompEntryBfFor = (sex?: Sex): number =>
  RECOMP_ENTRY_BF[sex === 'female' ? 'female' : 'male'];