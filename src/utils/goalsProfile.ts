export type TrainingState = 'new' | 'consistent' | 'returning' | 'advanced';
export type DerivedPhase = 'cut' | 'recomp' | 'lean_bulk' | 'bulk' | 'maintain';
export type DerivedExperienceTier = 'beginner' | 'intermediate' | 'advanced';

/**
 * Named `sex` rather than `gender` deliberately. Every downstream use is
 * physiological — Mifflin-St Jeor BMR, muscle-gain rate scaling, body-fat
 * operating bands, and the FFMI ceiling all key off sex, not identity. The
 * distinct name also keeps this field separable from the three EXISTING
 * `gender` fields scattered across the nutrition draft, the finalized
 * formData, and QuestionnaireAnswers, which have to be consolidated onto
 * this one later.
 *
 * 'prefer_not_to_say' is carried through from the nutrition questionnaire's
 * existing vocabulary so that migration is lossless. computeMacros already
 * handles it by averaging the male and female BMR formulas.
 */
export type Sex = 'male' | 'female' | 'prefer_not_to_say';

/**
 * How the user looked at their previous training peak. Deliberately coarse:
 * nobody remembers their body fat from four years ago, but everyone can say
 * whether they were lean, average, or soft. Combined with peakWeightKg this
 * is enough to estimate prior lean mass, which separates fast regain from
 * slow novel growth.
 */
export type PeakLeanness = 'lean' | 'average' | 'soft';

/**
 * Which body-fat operating band the user wants to cycle within on the way to
 * their goal. Narrower means they stay presentable throughout at the cost of
 * more frequent cuts; wider means longer uninterrupted building phases.
 */
export type RoutePreference = 'lean' | 'balanced' | 'roomy';

/**
 * Day-to-day activity outside training, feeding the TDEE multiplier.
 *
 * Moved onto the profile because it is a FACT ABOUT THE PERSON, not a food
 * preference — it sat oddly in a questionnaire otherwise about diet, budget
 * and shopping, and it does not change between plans. The workout side has a
 * legitimate claim on it too: recovery capacity and sensible training volume
 * both depend on what someone does with the other twenty-three hours.
 *
 * Values match the existing ACTIVITY_MULTIPLIERS keys in nutritionMacros.ts
 * exactly, so seeding the nutrition draft from the profile is a straight copy
 * with no mapping layer to drift.
 */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'heavy' | 'extreme';

/**
 * How currentBodyFatPct was arrived at. Stored because the number alone hides
 * its own reliability: a tier picked from a description and a DEXA scan are
 * both "20%", but only one should be trusted when the app later compares two
 * readings to decide whether the user has actually made progress. Without
 * this, a user who switches from an estimate to a real scan would look like
 * they had gained or lost several points overnight.
 *
 *   reported — the user typed a number from their own scan, scale or calipers
 *   visual   — chosen from the descriptive tier picker (±3-5 points)
 *   tape     — computed from circumference measurements (±3-4 points)
 */
export type BodyFatSource = 'reported' | 'visual' | 'tape';

export interface GoalsProfile {
  currentWeightKg: number;
  currentBodyFatPct?: number;
  goalWeightKg?: number;
  goalBodyFatPct?: number;
  trainingState: TrainingState;

  // ── Shared intake fields ─────────────────────────────────────────────────
  // All optional, so every profile written before these existed stays valid
  // and every consumer has to handle their absence. Anything that only
  // improves an estimate must degrade gracefully rather than block a plan:
  // without heightCm there is no FFMI plausibility check, but the plan still
  // generates.
  sex?: Sex;
  ageYears?: number;
  heightCm?: number;

  /** Bodyweight at their previous training peak, if they had one. */
  peakWeightKg?: number;
  /** How lean they were at that peak — see PeakLeanness. */
  peakLeanness?: PeakLeanness;

  /** Chosen route through the body-fat band. See RoutePreference. */
  routePreference?: RoutePreference;

  /** Provenance of currentBodyFatPct. See BodyFatSource. */
  bodyFatSource?: BodyFatSource;

  /** Day-to-day activity outside training. See ActivityLevel. */
  activityLevel?: ActivityLevel;
}

export interface VolumeTierInfo {
  tier: 'low' | 'moderate' | 'high';
  landmark: string;
  rationale: string;
}

// Both thresholds derivePhase branches on live in operatingBands.ts — a leaf
// module, so this value import cannot cycle with roadmap.ts (which imports
// this file). recompEntryBfFor is the rule-1 window (15 male / 24 female);
// bandFor is the route- and sex-aware operating band that rule 3 reads.
import { bandFor, recompEntryBfFor } from './operatingBands';

// Minimum body-fat gap (percentage points) before a goal BF is treated as
// a meaningful leanness target rather than noise / rounding.
const BF_GOAL_MARGIN = 3;

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
 * THE SINGLE AUTHORITY on the current phase (D0, 9 Aug 2026). deriveRoadmap
 * calls this for its opening phase, and both prompt builders call it via
 * their phase-context blocks — so the route screen, the summary badges and
 * the generation prompts can no longer disagree about what phase the user is
 * in. Anything that needs "the current phase" must come through here.
 *
 * Guiding principle: the direction implied by the user's goal weight is an
 * explicit instruction and is never overridden into its OPPOSITE by a
 * body-fat comparison — a user asking to gain is never handed a cut. Body
 * fat decides how that instruction is staged: above the operating band it
 * defers the surplus behind a recomp (cycle management, not physiology — see
 * OPERATING_BANDS), and inside the band it sizes the surplus. The one rule
 * that runs before the direction check is rule 1, the newbie-gains window.
 *
 * Rules (in priority order):
 * 1. New or returning trainee + elevated BF → recomp.
 *    Muscle-memory / newbie-gains window enables simultaneous fat loss and
 *    muscle gain. This is the "no cut-first mandate" rule. It runs BEFORE any
 *    direction check on purpose: a user who has not set a goal weight yet is
 *    still in that window, and an earlier version of this function returned
 *    'maintain' for them because the unknown-direction fallback sat on top.
 *    The threshold is sex-aware (15 male / 24 female — see RECOMP_ENTRY_BF);
 *    a flat 15 swept lean women into the window.
 * 2. Losing weight → cut.
 * 3. Gaining weight → recomp while ABOVE the operating band's ceiling (no
 *    surplus runs above the band the user chose — this is what kept the
 *    route screen saying "recomp" while the badge said "lean bulk");
 *    otherwise lean_bulk; bulk only when the user has opted into the roomier
 *    route AND their known body fat sits at or under that route's ceiling.
 *    Per phase-selection.md's decision matrix, the full surplus is gated on
 *    the user accepting faster gain, not on their body fat alone — body fat
 *    only decides whether that option is available.
 *    The band is route- and sex-aware, so the SAME body can derive a
 *    different phase under a different route. Intended, not a bug: the route
 *    is the user's declaration of the band they want to live in, and the
 *    phase follows the declared band. routePreference defaults to 'balanced'
 *    HERE, explicitly, for the majority who never reach the route picker.
 * 4. Wants a meaningfully lower body fat, with no gaining direction → recomp
 *    when holding weight (same scale weight, less fat, more muscle), otherwise
 *    cut. This is reachable with only a goal BODY FAT set and no goal weight.
 * 5. Nothing to act on → maintain.
 *
 * The returned phase is a recommendation. The user can override it in
 * Goals & Stats, and the override (where set) takes precedence over this.
 */
export function derivePhase(profile: GoalsProfile): DerivedPhase {
  const { trainingState, currentBodyFatPct, goalBodyFatPct, routePreference, sex } = profile;
  const direction = deriveDirection(profile);

  const isNewOrReturning = trainingState === 'new' || trainingState === 'returning';
  const bfKnown = currentBodyFatPct != null;
  const hasElevatedBF = bfKnown && currentBodyFatPct! >= recompEntryBfFor(sex);

  // Rule 3's band. The 'balanced' default is deliberate and explicit: most
  // users have not chosen a route when this first runs.
  const { ceiling } = bandFor(routePreference ?? 'balanced', sex);
  const aboveBand = bfKnown && currentBodyFatPct! > ceiling;
  const withinCeiling = bfKnown && currentBodyFatPct! <= ceiling;

  // A goal BF meaningfully below current BF, independent of scale weight.
  const wantsLowerBF =
    bfKnown &&
    goalBodyFatPct != null &&
    goalBodyFatPct < currentBodyFatPct! - BF_GOAL_MARGIN;

  // Rule 1 — newbie/returner recomp window (no cut-first mandate)
  if (isNewOrReturning && hasElevatedBF) return 'recomp';

  // Rule 2 — the user wants to weigh less
  if (direction === 'lose') return 'cut';

  // Rule 3 — gaining. Recomp above the band; inside it, a tight surplus
  // unless they asked for the roomier route. Unknown BF cannot confirm
  // either the band position or the bulk headroom, so it takes lean_bulk.
  if (direction === 'gain') {
    if (aboveBand) return 'recomp';
    return routePreference === 'roomy' && withinCeiling ? 'bulk' : 'lean_bulk';
  }

  // Rule 4 — a leanness target with no gaining direction
  if (wantsLowerBF) return direction === 'maintain' ? 'recomp' : 'cut';

  // Rule 5 — nothing to act on
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
 * Computes the user's current lean mass in kg, for comparison against
 * computeTargetLeanMass(). Returns undefined when current BF is unknown.
 */
export function computeCurrentLeanMass(profile: GoalsProfile): number | undefined {
  const { currentWeightKg, currentBodyFatPct } = profile;
  if (currentBodyFatPct == null) return undefined;
  return currentWeightKg * (1 - currentBodyFatPct / 100);
}

/**
 * Maps GoalsProfile.trainingState to the legacy experience-tier vocabulary
 * that workoutPrompt.ts / planningPrompt.ts key experience-dependent output
 * off (exercise-selection guidance, block-structure rules, RIR format tier).
 *
 * trainingState remains the single source of truth (captured once, edited
 * via Goals & Stats) — this is a pure compatibility shim so that output
 * survives workout Q2 (training experience) being removed from the visible
 * flow, without touching the downstream prompt-assembly code itself.
 *
 * 'returning' maps to 'intermediate', not 'beginner': a returning lifter
 * has prior training history and muscle memory, so treating them as a true
 * beginner would understate their capability.
 */
export function deriveExperienceTier(trainingState: TrainingState): DerivedExperienceTier {
  switch (trainingState) {
    case 'new':
      return 'beginner';
    case 'returning':
    case 'consistent':
      return 'intermediate';
    case 'advanced':
      return 'advanced';
  }
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