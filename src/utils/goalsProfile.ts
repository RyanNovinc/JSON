export type TrainingState = 'new' | 'consistent' | 'returning' | 'advanced';
export type DerivedPhase = 'cut' | 'recomp' | 'lean_bulk' | 'bulk' | 'maintain';

export interface GoalsProfile {
  currentWeightKg: number;
  currentBodyFatPct?: number;
  goalWeightKg?: number;
  goalBodyFatPct?: number;
  trainingState: TrainingState;
}

export interface VolumeTierInfo {
  tier: 'low' | 'moderate' | 'high';
  landmark: string;
  rationale: string;
}

// Body-fat thresholds (percentage points).
// Using a single set of thresholds since gender is not stored in GoalsProfile.
// These match the "≳15% men" / "≲12–15%" language in the build plan,
// taking the conservative (lower) bound so the rules err toward recomp
// rather than prematurely prescribing a cut.
const BF_ELEVATED = 15; // ≥15% → newbie/returner recomp window; cut signal for experienced
const BF_HIGH = 20;     // ≥20% → unambiguous cut signal regardless of training state
const BF_LOW = 15;      // <15% → lean enough to support a proper bulk

type Direction = 'gain' | 'lose' | 'maintain' | 'unknown';

function deriveDirection(profile: GoalsProfile): Direction {
  if (profile.goalWeightKg == null) return 'unknown';
  const diff = profile.goalWeightKg - profile.currentWeightKg;
  if (diff > 1) return 'gain';
  if (diff < -1) return 'lose';
  return 'maintain';
}

/**
 * Derives the recommended training/nutrition phase from a GoalsProfile.
 *
 * Rules (in priority order):
 * 1. New or returning trainee + elevated BF (≥15%) → recomp.
 *    Muscle-memory / newbie-gains window enables simultaneous fat loss + muscle gain.
 *    This is the "no cut-first mandate" rule — never prescribe cutting before building
 *    for someone in the newbie-gains window.
 * 2. Experienced trainee + high BF (≥20%) + leanness is priority → cut.
 * 3. Experienced trainee + elevated BF (≥15%) + leanness is priority → cut.
 * 4. Low BF (<15%) + gaining direction → lean_bulk.
 * 5. Fallback: direction implied by goal weight (gain→bulk, lose→cut, maintain→maintain).
 * 6. No goal weight set → maintain (conservative default).
 *
 * The returned phase is a recommendation; the user can always override it in the UI.
 */
export function derivePhase(profile: GoalsProfile): DerivedPhase {
  const { trainingState, currentBodyFatPct, goalBodyFatPct } = profile;
  const direction = deriveDirection(profile);

  const isNewOrReturning = trainingState === 'new' || trainingState === 'returning';
  const bfKnown = currentBodyFatPct != null;
  const hasElevatedBF = bfKnown && currentBodyFatPct! >= BF_ELEVATED;
  const hasHighBF = bfKnown && currentBodyFatPct! >= BF_HIGH;
  const hasLowBF = bfKnown && currentBodyFatPct! < BF_LOW;

  // "Leanness is priority" = goal is to lose fat, either via an explicit
  // lower goal weight or a significantly lower goal body-fat target.
  const leanessIsPriority =
    direction === 'lose' ||
    (bfKnown && goalBodyFatPct != null && goalBodyFatPct < currentBodyFatPct! - 3);

  // Rule 1 — newbie/returner recomp window (no cut-first mandate)
  if (isNewOrReturning && hasElevatedBF) return 'recomp';

  // Rule 2 — experienced trainee, clearly too much fat, leanness is goal
  if (hasHighBF && leanessIsPriority) return 'cut';

  // Rule 3 — experienced trainee, elevated BF, wants to lean out
  if (hasElevatedBF && leanessIsPriority) return 'cut';

  // Rule 4 — lean enough to support a controlled surplus
  if (hasLowBF && direction === 'gain') return 'lean_bulk';

  // Rule 5 — fallback to goal-weight direction
  if (direction === 'gain') return 'bulk';
  if (direction === 'lose') return 'cut';
  if (direction === 'maintain') return 'maintain';

  // Rule 6 — no goal weight, unknown direction
  return 'maintain';
}

/**
 * Computes the target lean mass in kg.
 *
 * Formula: goalWeightKg × (1 − goalBodyFatPct / 100)
 *
 * This is the lean-mass number the user is trying to reach, not a scale-weight
 * target. To end at goalWeight + goalBodyFatPct, a bulk must overshoot goalWeight
 * (accumulating fat alongside muscle), then a cut strips the fat back down.
 */
export function computeTargetLeanMass(profile: GoalsProfile): number | undefined {
  const { goalWeightKg, goalBodyFatPct } = profile;
  if (goalWeightKg == null || goalBodyFatPct == null) return undefined;
  return goalWeightKg * (1 - goalBodyFatPct / 100);
}

/**
 * Maps a derived phase to its recommended volume tier against the
 * MEV / MAV / MRV landmarks from volume-landmarks.md.
 *
 * - bulk / lean_bulk → MAV→MRV  (surplus maximises recovery; drive adaptation)
 * - recomp          → MAV       (balance stimulus and recovery at maintenance)
 * - maintain        → MEV→MAV   (maintenance stimulus; keep flexibility)
 * - cut             → MEV→MAV   (recovery compromised; bias toward MEV)
 */
export function phaseToVolumeTier(phase: DerivedPhase): VolumeTierInfo {
  switch (phase) {
    case 'bulk':
    case 'lean_bulk':
      return {
        tier: 'high',
        landmark: 'MAV→MRV',
        rationale:
          'Recovery is maximized in a calorie surplus; bias toward higher volume to drive adaptation.',
      };
    case 'recomp':
      return {
        tier: 'moderate',
        landmark: 'MAV',
        rationale: 'Balance training stimulus and recovery at maintenance calories.',
      };
    case 'maintain':
      return {
        tier: 'moderate',
        landmark: 'MEV→MAV',
        rationale:
          'A maintenance stimulus is sufficient; work anywhere in the MEV–MAV window.',
      };
    case 'cut':
      return {
        tier: 'low',
        landmark: 'MEV→MAV',
        rationale:
          'Recovery is compromised in a deficit; goal shifts from growth to muscle retention — bias toward MEV.',
      };
  }
}
