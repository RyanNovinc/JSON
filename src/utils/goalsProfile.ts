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

// PeakLeanness was REMOVED, 24 Aug 2026, with peakWeightKg and the regain
// credit both fed. Its job was to estimate prior lean mass so fast regain could
// be separated from slow novel growth; the whole lean gap is now novel tissue
// at one capped rate. See the regain-removal note in roadmap.ts for why, and
// what it costs. trainingState 'returning' still carries the recognition:
// derivePhase rule 1 routes it to a recomp and deriveExperienceTier maps it to
// 'intermediate'. Muscle memory stays recognised without being quantified.

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
export type BodyFatSource = 'dxa' | 'scale' | 'calipers' | 'reported' | 'visual' | 'tape';

/**
 * Sources precise enough for a body-fat reading to END A PHASE.
 *
 * ── WHY 'reported' HAD TO BE SPLIT, 19 Aug 2026 ────────────────────────────
 *
 * 'reported' meant "the user typed a number from their own scan, scale or
 * calipers", which put a DXA result and a bathroom scale in the same bucket —
 * so the app could not tell a ±1-2 point measurement from a ±4-8 point one.
 * That is the difference between a reading that can end a phase and one that
 * cannot, and it was invisible.
 *
 * ONLY DXA QUALIFIES. Consumer foot-to-foot BIA has limits of agreement against
 * DXA of roughly ±4-8 percentage points and is worst exactly where change
 * detection matters; tape carries ±3-4; an untrained self-estimate from a
 * picture chart is worse still. A phase moving someone 18% to 15% is about
 * 2.4 kg of fat, which sits at the edge of DXA's own least significant change
 * (1.0-1.5 kg consecutive-day) and entirely below everything else's noise
 * floor.
 *
 * 'reported' SURVIVES as the legacy value and is deliberately NOT treated as
 * precise. Every profile written before this split used it, and there is no way
 * to know retrospectively which device produced those numbers — so they keep
 * being displayed and stop being trusted, which is the safe direction.
 */
export const PRECISE_BODY_FAT_SOURCES: readonly BodyFatSource[] = ['dxa'];

/** Whether a reading from this source may contribute to ending a phase. */
export const isPreciseBodyFatSource = (source?: BodyFatSource): boolean =>
  source != null && PRECISE_BODY_FAT_SOURCES.includes(source);

/**
 * How hard a user wants to push a fat-loss phase.
 *
 * Two values rather than three rates, because the third rate is not always
 * offered — a lean user may only have one option, and a preference has to mean
 * something in that case too. 'faster' then simply resolves to the fastest
 * thing available, which may be the same as 'steady'.
 */
export type CutPace = 'steady' | 'faster';

/**
 * Which half of the journey the user wants to do FIRST, when they need both.
 *
 * A genuine preference rather than a performance setting. Modelled both ways
 * across three starting points and the totals differ by about half a month:
 * 90 kg @25% to 90 @14% is 31.1 months cutting first against 30.5 building
 * first; 80 kg @18% to 85 @14% is 15.2 against 15.1. Same muscle, same
 * finish. What differs is the two years in between — building first parks a
 * 25% starter at roughly 24% for the whole build and leaves one short cut at
 * the end, cutting first has them lean inside five months and never dieting
 * again.
 *
 * The choice only EXISTS when the user is above their goal body fat AND needs
 * muscle. Leaner than goal means there is nothing to cut; no lean gap means a
 * single cut (isRevealOnly). Callers should hide the picker in both cases.
 *
 * Two weak thumbs on the scale for cut_first, which is why it is the default
 * where a choice exists: Galgani 2025 found a surplus started fatter deposits
 * more fat per unit of surplus, and cutting first puts the diet at the start
 * rather than two years in when motivation is lowest.
 */
export type PhaseOrder = 'cut_first' | 'build_first';


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

  /**
   * How fast this user likes to cut. A PREFERENCE, deliberately, not a rate.
   *
   * Storing a rate froze it. Someone who picked 1%/wk at 25% body fat and comes
   * back to a cut at 14% has a much smaller fat store, and Alpert's limit on
   * how fast that store can release energy scales with fat mass — so the rate
   * they chose may be one their body can no longer supply without taking the
   * difference from muscle.
   *
   * A preference survives that. `resolveCutRate` turns it into an actual rate
   * against whatever ceiling they have at the time, so "faster" means the
   * fastest still available to them rather than a number set once.
   */
  cutPace?: CutPace;

  /** Chosen route through the body-fat band. See RoutePreference. */
  routePreference?: RoutePreference;

  /**
   * Cut first or build first. See PhaseOrder. Absent means "not asked", and
   * deriveRoadmap falls back to defaultPhaseOrder rather than assuming.
   *
   * NARROWED, 20 Aug 2026, and then RESTORED as a real input the same day. For
   * a few hours preBuildBf did both jobs — the bottom of the range and the
   * depth of the opening cut — and build-first was expressed by parking the
   * bottom at current body fat. That cannot survive the range screen: someone
   * who sets 13 to 16 and then chooses to build first must keep 13 as the depth
   * their mid-build trims return to, not have it dragged up to 20.
   *
   * So the two are orthogonal now. This owns ONE thing: whether there is an
   * opening cut before the build. The range owns everything else, including
   * where the rail returns them to.
   */
  phaseOrder?: PhaseOrder;

  /**
   * THE DIAL: body fat percentage at the bottom of the opening cut, i.e. how
   * much of the cutting the user wants done BEFORE they start building.
   *
   * ── WHY THIS IS ONE NUMBER AND NOT A RANGE, 20 Aug 2026 ──────────────────
   *
   * The screen used to ask for a band, a floor and a ceiling to cycle between.
   * They are not two choices. Total lean gain is fixed by the goal and the fat
   * a build adds is fixed by FAT_PER_LEAN_KG, so
   *
   *     fat at the peak = fat at the trough + FAT_PER_LEAN × leanGap
   *
   * Move the trough a kilo and the peak moves a kilo. One degree of freedom,
   * two readouts. deriveRoadmap already encoded this as
   * `preBuildFat = goalFat − fatFromBuild`; the only thing the user was really
   * setting was the clamp underneath it.
   *
   * The duration does not move either, which is why the screen can show a
   * fixed timeline while the shape changes: opening cut plus terminal cut
   * comes to (nowFat + fatAdded − goalFat) / rate, and the trough cancels out.
   *
   * PHASE ORDER IS THE TWO ENDS OF THIS DIAL. At currentBodyFatPct there is no
   * opening cut, which is build_first; at the band floor the whole cut happens
   * up front, which is cut_first. Everything between was unreachable before
   * this field existed, and "cut to 16% first rather than 12%" is the most
   * commonly wanted plan in that gap.
   *
   * Bounds and default come from `preBuildBfRange` in roadmap.ts, which is the
   * single definition so the screen and the engine cannot drift. Out-of-range
   * values are clamped rather than rejected, because the range moves whenever
   * the user edits their weight, body fat or goal, and a stale dial must
   * degrade instead of blocking a plan.
   */
  preBuildBf?: number;

  /**
   * THE TOP OF THAT RANGE: the body fat the plan will not let a build drift
   * past before it stops to trim back to `preBuildBf`.
   *
   * ── WHY THIS EXISTS, 20 Aug 2026 ─────────────────────────────────────────
   *
   * It was already being chosen, just not by the user. The ceiling came from
   * `bandFor(routePreference, sex)`, and the route picker was removed from the
   * UI on 17 Aug when the three bands stopped producing different plans — so
   * whether someone was held inside a range or left to drift was decided by a
   * field they had no way to set, and most profiles silently carried the
   * balanced 18.
   *
   * It is a REAL second choice, not a readout. An earlier version of this
   * design argued floor and ceiling were one degree of freedom, which holds
   * only while nothing interrupts the build. Once the rail exists, the ceiling
   * converts drift into cuts: the same person at the same floor gets one long
   * build and one cut, or several shorter builds and several cuts, and neither
   * is faster. That is a preference with a cost on both sides.
   *
   * Bounds come from `operatingRangeFor` in roadmap.ts, which is the single
   * definition. The only hard rule is width: see MIN_RANGE_WIDTH_PCT. There is
   * deliberately NO upper clamp — a ceiling above where the build tops out
   * simply never fires, and the honest answer is to allow it and say so rather
   * than refuse a number the user asked for.
   *
   * Named `ceilingBf` while the floor is still `preBuildBf`, which is
   * inconsistent and deliberate: preBuildBf is already persisted on real
   * profiles, and renaming it buys a migration and nothing else.
   */
  ceilingBf?: number;

  /**
   * THE OPENING BULK: the body fat a user wants to grow UP TO before their
   * first cut, on the "grow now, up to a limit" route.
   *
   * ── WHY IT IS A THIRD FIELD AND NOT A SETTING OF THE OTHER TWO ───────────
   *
   * `phaseOrder` owns whether there is a CUT before the building starts, and
   * the range owns where every cut afterwards lands. Neither can express "grow
   * from where I am up to 24%, and only then start cutting back", which is what
   * most people mean by a bulk: no opening cut, but a first leg that runs past
   * the top of the range they intend to live in afterwards.
   *
   * Two levers make every plan in this app — is there a cut first, and is there
   * a ceiling that interrupts. Stay lean is both. Grow now and cut at the end
   * is neither. This is the third corner: a ceiling, no opening cut, and a
   * FIRST ceiling that differs from the one that follows it.
   *
   * WHAT IT IS NOT: a second ceiling. It applies to the opening leg only. Once
   * the first cut has happened, `ceilingBf` governs, because the question the
   * user answered second was "where do you sit after that cut".
   *
   * IGNORED when `phaseOrder` is cut_first and there is fat to shed, because
   * the two answers contradict each other and the opening cut is the one the
   * user asked for more recently in the flow. Also ignored when it sits at or
   * below current body fat, where it can never fire.
   */
  bulkToBf?: number;


  /** Provenance of currentBodyFatPct. See BodyFatSource. Decides whether the
   *  reading can end a phase, not just how it is displayed. */
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

/**
 * Matches roadmap.ts's private `round1` exactly. Duplicated rather than
 * imported ON PURPOSE: roadmap.ts imports this file, so importing back would
 * be a runtime cycle under Metro — the same reason the bands live in their own
 * leaf module. It is three characters of arithmetic; the cycle is not worth it.
 */
const round1 = (n: number) => Math.round(n * 10) / 10;

type Direction = 'gain' | 'lose' | 'maintain' | 'unknown';

function deriveDirection(profile: GoalsProfile): Direction {
  if (profile.goalWeightKg == null) return 'unknown';
  const diff = profile.goalWeightKg - profile.currentWeightKg;
  if (diff > 1) return 'gain';
  if (diff < -1) return 'lose';
  return 'maintain';
}

/**
 * lean-mass-targets.md HARD RULE 4, as a predicate: the user already has the
 * lean mass their goal implies, and only fat stands between them and it.
 *
 * THE SINGLE DEFINITION of that test, and the reason it is exported.
 * deriveRoadmap used to make the same call inline and return BEFORE it ever
 * consulted derivePhase, so for any goal weight at or under
 * leanNow / (1 − goalBF) the roadmap card said "reveal" while both prompt
 * builders, reading derivePhase, said "recomp". Same profile, same moment —
 * the D0 failure at a second site. Two callers, one definition, no drift.
 *
 * WHY THIS BEATS THE OTHER FIX. The alternative was to let rule 1 win and give
 * these users a recomp, on the grounds that a novice at elevated body fat is
 * the population recomp suits best. That is true about the POPULATION and
 * wrong about the REQUEST: a recomp is weight-neutral by construction, so it
 * cannot deliver a goal weight below the one the user is standing on. Someone
 * at 80 kg and 20% asking for 74.4 kg at 14% needs 64 kg of lean and already
 * has 64 kg. Handing them a recomp holds them at 80 kg and misses the target
 * they actually set.
 *
 * The "no cut-first mandate" rule is untouched by this. That rule forbids
 * requiring a cut BEFORE a build; here there is no build to gate, so nothing
 * is being made a prerequisite for anything.
 *
 * Worth knowing rather than correcting: a novice will very likely add lean
 * DURING this cut anyway (the roadmap's own partition loop credits it), so
 * they tend to finish slightly leaner and slightly heavier than the arithmetic
 * promised. That is a better outcome than planned, not a defect.
 *
 * The rounding is deliberately identical to deriveRoadmap's — round1 on each
 * lean figure and again on the difference — so the two cannot disagree at the
 * boundary over a few grams.
 */
export function isRevealOnly(profile: GoalsProfile): boolean {
  const { currentBodyFatPct, goalBodyFatPct } = profile;
  if (currentBodyFatPct == null || goalBodyFatPct == null) return false;

  const target = computeTargetLeanMass(profile);
  const current = computeCurrentLeanMass(profile);
  if (target == null || current == null) return false;

  return round1(round1(target) - round1(current)) <= 0 && currentBodyFatPct > goalBodyFatPct;
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
 * 0. The muscle is already built and only fat is in the way → cut.
 *    lean-mass-targets.md HARD RULE 4, shared with deriveRoadmap through
 *    isRevealOnly. It runs FIRST because deriveRoadmap's copy of it returns
 *    before that function reaches its derivePhase call, so any rule sitting
 *    above it here would produce an answer the roadmap has already ignored.
 *    This is the only rule that can return 'cut' for a user rule 1 would
 *    otherwise claim, and it is bounded to people whose own goal asks for no
 *    additional lean mass at all.
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

  // Rule 0 — the muscle is already built; only fat is in the way.
  // Narrow by construction: it needs BOTH goal fields, a known current body
  // fat, a lean target at or under current lean, and a body fat above goal.
  // Nobody GAINING can satisfy it — a heavier goal at a lower body fat always
  // implies MORE lean, never less — so it cannot swallow rule 3.
  if (isRevealOnly(profile)) return 'cut';

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
/**
 * The order to use when the user has not chosen one.
 *
 * Cut first whenever there is meaningfully more fat on them than the goal
 * allows — see PhaseOrder for the two reasons. BF_GOAL_MARGIN is reused so
 * that "barely above goal" is not treated as a fat-loss problem, matching how
 * rule 4 already decides what counts as a leanness target.
 */
export function defaultPhaseOrder(profile: GoalsProfile): PhaseOrder {
  const { currentBodyFatPct, goalBodyFatPct } = profile;
  if (currentBodyFatPct == null || goalBodyFatPct == null) return 'cut_first';
  return currentBodyFatPct > goalBodyFatPct + BF_GOAL_MARGIN ? 'cut_first' : 'build_first';
}

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
 * TRAINING VOLUME IS PHASE-INVARIANT. This function returns the same answer
 * for every phase, deliberately, and the parameter survives only so callers
 * do not all have to change at once.
 *
 * Rewritten 17 Aug 2026 after two rounds of evidence review took the old
 * mapping apart. Each of its four positions failed for a different reason.
 *
 * ── CUT no longer reduces ────────────────────────────────────────────────
 *
 * Roth et al. 2023 (Scand J Med Sci Sports, doi 10.1111/sms.14237) randomised
 * 38 resistance-trained males to five sets per exercise versus three — roughly
 * 20 vs 12 weekly quadriceps sets — for six weeks in a deficit. No group ×
 * time interaction. Crucially the authors measured the RATIONALE as well as
 * the outcome: contractility, stiffness, sleep and mood were unaffected
 * irrespective of volume, so "recovery is compromised in a deficit" was tested
 * directly and not supported.
 *
 * Read honestly, that trial is weaker than it first appears — whole-body lean
 * mass fell in BOTH arms, and both groups increased load throughout, so the
 * manipulated variable may have been swamped by an unmanipulated one. It
 * establishes that reducing does not help, not that dose is irrelevant. That
 * is enough to stop prescribing a reduction, which is all this needed.
 *
 * The direction of error settles it: under-stimulating during the phase whose
 * job is retaining tissue costs muscle that is slow to regain, while
 * over-stimulating costs fatigue and adherence, which recover.
 *
 * ── BULK no longer increases ─────────────────────────────────────────────
 *
 * This one survived a round longer than it should have. Pelland et al. 2026
 * (Sports Med 56(2):481-505) does show hypertrophy rising with volume — but
 * the mean weekly fractional set volume across its included studies is
 * 8.14 ± 6.23, which the authors themselves call relatively low. Programs here
 * target 12-20. Using a slope fitted where the data actually sit to justify
 * moving a user from 15 sets to 17 extrapolates into the region the same model
 * shows as a functional plateau, where the predicted gain is near zero and its
 * interval comfortably contains it.
 *
 * "A surplus improves recovery capacity" has no dose-response study
 * conditioning on energy balance either. Combining the two was stapling an
 * extrapolated slope to an unmeasured moderator.
 *
 * ── RECOMP collapsed into MAINTAIN ───────────────────────────────────────
 *
 * A recomp sits at maintenance calories by definition, so recovery is not
 * compromised relative to maintenance, and no training-side variable has been
 * shown to differ. The old split had recomp at MAV and maintain at MEV→MAV — a
 * distinction with nothing behind it.
 *
 * ── WHAT THE LANDMARKS ARE STILL FOR ─────────────────────────────────────
 *
 * Distribution, not individualisation. "Chest tolerates more direct work than
 * triceps" and "front delts get enough from pressing" are ordinal claims that
 * follow from muscle size and indirect loading, and they do not need MRV to be
 * a measured ceiling — which it is not. What does not survive is treating a
 * range endpoint as a threshold; those endpoints are conventions.
 *
 * ── KNOWN LOOSE END ──────────────────────────────────────────────────────
 *
 * The tier this returns still becomes the volume preference for users who did
 * not choose one, via TIER_TO_PREF in planningPrompt. That default is now
 * phase-independent, which is correct, but it should properly be keyed off
 * EXPERIENCE rather than routed through a phase function that no longer
 * branches. Until that moves, this function is the last place a phase touches
 * volume at all — and it now touches it identically in every case.
 */
export function phaseToVolumeTier(_phase: DerivedPhase): VolumeTierInfo {
  return {
    tier: 'moderate',
    landmark: 'MEV→MAV',
    rationale:
      'Volume does not change with the phase. Set it once at what the lifter can recover from and stick to, and hold it through cuts and builds alike — no trial has shown that reducing volume in a deficit protects muscle, and the case for raising it in a surplus rests on extrapolating past where the data sit.',
  };
}