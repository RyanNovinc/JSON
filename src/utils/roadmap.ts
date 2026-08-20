// src/utils/roadmap.ts
//
// The phase ROADMAP model. Pure functions, no storage, no React.
//
// derivePhase (goalsProfile.ts) answers "what phase is this person in right
// now". This module answers the question that one cannot: "what is the whole
// sequence from here to their goal, and is that goal even reachable". Every
// consumer — the route screen, both prompt builders, the stored snapshot —
// reads from here, so a constant is defined once and only once.
//
// ── CONFIDENCE ─────────────────────────────────────────────────────────────
// Constants below are tagged with the grading scheme already used across the
// json.fit references docs:
//
//   [A] Well-supported — RCT or meta-analytic evidence
//   [B] Practitioner extrapolation — reasoned, not directly validated
//   [C] Contested / unsettled
//
// Anything [B] or [C] MUST reach the user as a range with an "estimate"
// label. The research return was explicit that the scheduling parameters in
// particular have no trial evidence, and a precise-looking number would
// misrepresent that.

import type {
  GoalsProfile,
  Sex,
  RoutePreference,
  DerivedPhase,
  PhaseOrder,
} from './goalsProfile';
import { derivePhase, isRevealOnly, defaultPhaseOrder } from './goalsProfile';
import { FAT_PER_LEAN_KG } from './syntheticNutritionAnswers';
import { bandFor, leanStopFor } from './operatingBands';

// ---------------------------------------------------------------------------
// Body composition arithmetic (definitional — no citation needed)
// ---------------------------------------------------------------------------

export const leanMassKg = (weightKg: number, bodyFatPct: number): number =>
  weightKg * (1 - bodyFatPct / 100);

export const weightAtBodyFat = (leanKg: number, bodyFatPct: number): number =>
  leanKg / (1 - bodyFatPct / 100);

// ---------------------------------------------------------------------------
// FFMI and goal plausibility
// ---------------------------------------------------------------------------

/**
 * Height-normalised fat-free mass index, using the Kouri correction:
 *   FFMI_norm = FFM / height_m² + 6.3 × (1.80 − height_m)
 *
 * [B] Kouri 1995 (PMID 7496846) observed drug-free athletes extending to a
 * limit around 25.0. That is the upper edge of ONE cross-sectional sample of
 * ~74 non-users with self-reported drug status — a descriptive bound, not a
 * validated biological ceiling. Documented outliers exceed it naturally,
 * which is why classify() has a genuine grey zone rather than a hard wall.
 */
export function ffmiNormalised(leanKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return leanKg / (m * m) + 6.3 * (1.8 - m);
}

export type Plausibility = 'reachable' | 'borderline' | 'beyond';

/** [B] Grey zone is ±1 FFMI. Treat the boundaries as soft. */
const FFMI_LIMITS: Record<'male' | 'female', { ok: number; edge: number }> = {
  male: { ok: 24, edge: 25.5 },
  female: { ok: 21, edge: 22 },
};

const limitsFor = (sex?: Sex) =>
  FFMI_LIMITS[sex === 'female' ? 'female' : 'male'];

/** Exported for the frame gauge on RouteScreen: the same boundaries
 *  classifyGoal decides with, so the picture and the verdict cannot drift. */
export const ffmiLimitsFor = limitsFor;

export function classifyGoal(
  leanTargetKg: number,
  heightCm: number,
  sex?: Sex,
): { plausibility: Plausibility; ffmi: number } {
  const ffmi = ffmiNormalised(leanTargetKg, heightCm);
  const { ok, edge } = limitsFor(sex);
  return {
    ffmi,
    plausibility: ffmi <= ok ? 'reachable' : ffmi <= edge ? 'borderline' : 'beyond',
  };
}

// ---------------------------------------------------------------------------
// Physique targets — the "I don't know what to aim for" generator
// ---------------------------------------------------------------------------

export interface PhysiqueTarget {
  id: 'lean' | 'athletic' | 'maximal';
  name: string;
  description: string;
  goalWeightKg: number;
  goalBodyFatPct: number;
}

/**
 * [B] Turns a look into numbers. FFMI × height² gives the lean mass a
 * physique implies; the body-fat choice turns that into a scale weight.
 *
 * Female figures scale the FFMI by 0.86 and shift body fat up by 9 points —
 * both practitioner conventions rather than measured constants, and both
 * thinner evidence than the male values.
 */
export function physiqueTargets(heightCm: number, sex?: Sex): PhysiqueTarget[] {
  const m = heightCm / 100;
  const female = sex === 'female';
  const scale = female ? 0.86 : 1;
  const bfShift = female ? 9 : 0;

  const defs: Array<Omit<PhysiqueTarget, 'goalWeightKg' | 'goalBodyFatPct'> & {
    ffmi: number;
    bf: number;
  }> = [
    {
      id: 'lean',
      name: 'Lean and defined',
      description: 'Visible abs year round. Athletic rather than big.',
      ffmi: 21,
      bf: 12,
    },
    {
      id: 'athletic',
      name: 'Athletic and strong',
      description: 'Noticeably muscular, still lean. The common target.',
      ffmi: 22.5,
      bf: 14,
    },
    {
      id: 'maximal',
      name: 'As big as I can naturally get',
      description: 'Near the drug-free ceiling. Years of work.',
      ffmi: 24,
      bf: 15,
    },
  ];

  return defs.map(({ ffmi, bf, ...rest }) => {
    const goalBodyFatPct = bf + bfShift;
    const lean = ffmi * scale * m * m;
    return {
      ...rest,
      goalBodyFatPct,
      goalWeightKg: Math.round(weightAtBodyFat(lean, goalBodyFatPct) * 10) / 10,
    };
  });
}

// ---------------------------------------------------------------------------
// Body fat estimation, for users who don't have a reading
// ---------------------------------------------------------------------------

export interface BodyFatTier {
  /** 0 = leanest, 1 = heaviest. Drives the parametric figure. */
  t: number;
  male: [number, number];
  female: [number, number];
  description: string;
}

/**
 * [B] Visual-estimation bands. Descriptions are deliberately about the
 * MIDSECTION rather than body type: it is the property that tracks body fat
 * and the one anyone can check in a mirror. Female bands run 8–10 points
 * higher for the same appearance.
 *
 * Accuracy is roughly ±3–5 points, which is comparable to consumer BIA
 * (±3–10 vs DEXA per the lean-mass-targets references). Since the app applies
 * body-fat thresholds to TRENDS rather than single readings, an estimate here
 * is not materially worse than a smart-scale number.
 */
export const BODY_FAT_TIERS: BodyFatTier[] = [
  { t: 0.0, male: [8, 11], female: [16, 19], description: 'Abs clearly defined, veins visible on arms' },
  { t: 0.18, male: [12, 15], female: [20, 23], description: 'Abs visible in normal light, defined but not shredded' },
  { t: 0.38, male: [16, 19], female: [24, 27], description: 'Flat stomach, abs only when flexed' },
  { t: 0.58, male: [20, 23], female: [28, 31], description: 'Softer midsection, no ab definition' },
  { t: 0.78, male: [24, 29], female: [32, 37], description: 'Noticeable belly, softer chest and arms' },
  { t: 1.0, male: [30, 35], female: [38, 43], description: 'Belly clearly rounded, little definition anywhere' },
];

export function tierRange(tier: BodyFatTier, sex?: Sex): [number, number] {
  return sex === 'female' ? tier.female : tier.male;
}

export function bodyFatFromTier(tier: BodyFatTier, sex?: Sex): number {
  const [lo, hi] = tierRange(tier, sex);
  return Math.round((lo + hi) / 2);
}

/**
 * [B] US Navy circumference method. More accurate than the tier picker
 * (roughly ±3–4 points) and better than most smart scales, at the cost of a
 * tape measure. Returns undefined rather than a nonsense number when the
 * inputs can't produce one.
 */
export function navyBodyFat(args: {
  sex?: Sex;
  waistCm: number;
  neckCm: number;
  heightCm: number;
  hipCm?: number;
}): number | undefined {
  const { sex, waistCm, neckCm, heightCm, hipCm } = args;
  if (!(waistCm > 0 && neckCm > 0 && heightCm > 0)) return undefined;

  if (sex === 'female') {
    if (!hipCm || hipCm <= 0) return undefined;
    const sum = waistCm + hipCm - neckCm;
    if (sum <= 0) return undefined;
    const v =
      495 /
        (1.29579 - 0.35004 * Math.log10(sum) + 0.221 * Math.log10(heightCm)) -
      450;
    return round1(v);
  }

  if (waistCm <= neckCm) return undefined;
  const v =
    495 /
      (1.0324 -
        0.19077 * Math.log10(waistCm - neckCm) +
        0.15456 * Math.log10(heightCm)) -
    450;
  return round1(v);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// The operating band
// ---------------------------------------------------------------------------

// The bands MOVED to operatingBands.ts (a leaf module) when derivePhase
// became band-aware: goalsProfile.ts needs the values, this file imports
// goalsProfile, and the value import back the other way would have been a
// runtime cycle under Metro. Re-exported here so every existing importer of
// this module keeps working unchanged.
export { OPERATING_BANDS, bandFor } from './operatingBands';

// ---------------------------------------------------------------------------
// Rate of muscle gain
// ---------------------------------------------------------------------------

// ── Rate of muscle gain ────────────────────────────────────────────────────
//
// REWRITTEN 9 Aug 2026. The previous version asked trainingState, mapped it to
// an assumed number of training years, and read a rate off a decay curve at
// that point. That inferred how much muscle someone had ALREADY BUILT from a
// four-option dropdown, and it was wrong by years: a lifter who trained for a
// while and then detrained was handed an intermediate's slow rate despite
// carrying an untrained person's muscle mass.
//
// The rate is now derived from what the body measures. Two constants do all
// the work, and every published magnitude falls out of them:
//
//   k = ln(2)   — the rate of gain halves each training year. AN ASSUMPTION,
//                 not a finding. See the honesty note below. [B]
//   L           — lifetime headroom above an untrained baseline, computed per
//                 person from FFMI rather than assumed. [B]
//
//   cumulative(t) = L × (1 − e^(−k·t))
//
// HONESTY NOTE (13 Aug 2026, after an external review).
//
// This block used to claim the published year-by-year bands — beginners 7-11 kg
// in a first productive year, intermediates 3-5, advanced 1-2 — CORROBORATED
// the halving rule, because the curve reproduces them. That reasoning is
// circular. Those bands are coaching models (McDonald, Aragon), and each tier
// was authored at roughly half the previous one. Reproducing them is not
// independent confirmation; it is recovering the assumption they were built on.
//
// What can honestly be said: no multi-year longitudinal study tracks natural
// lifters lean mass with gold-standard measurement, so no measured curve
// exists to fit. What we have is two well-anchored ENDPOINTS — a fast novice
// first year, and an asymptote at the FFMI ceiling — plus the universal
// observation of diminishing returns in between. An exponential is a
// reasonable interpolation between those endpoints. It is not a measured
// trajectory, and ln(2) is not uniquely correct: any decay constant matching
// the same endpoints would do.
//
// The one genuinely independent cross-check survives: L computed from FFMI
// lands inside the published lifetime range without being fitted to it. At
// 185 cm, (25 − 19) × 1.85² = 20.5 kg against a stated 18-23 kg. Short-term
// trials agree at the low end (Morton 2018 puts RT alone at ~1.1 kg over ~13
// weeks), and DEXA-measured natural lifters rarely exceed 0.23 kg/week.

/**
 * [B] ASSUMPTION, not a citation. The decay constant that makes the annual rate
 * halve each training year. Chosen because it interpolates between the two
 * anchored endpoints (novice first-year gain, FFMI ceiling asymptote), not
 * because any study measured a halving period. See the honesty note above.
 */
export const GAIN_DECAY_K = Math.LN2;

/**
 * [B] Untrained population baseline, normalised FFMI. Schutz et al. put the
 * general population at about 19 for men and 16 for women. Someone at or below
 * this has effectively no muscle banked, whatever their gym history says.
 */
export const FFMI_UNTRAINED: Record<'male' | 'female', number> = {
  male: 19,
  female: 16,
};

/**
 * [B] The natural ceiling used for HEADROOM. Deliberately NOT the same as the
 * classification band above: classifyGoal treats 24 as "reachable" and 25.5 as
 * the outer edge of "borderline", which are decision boundaries with a grey
 * zone either side. The headroom calculation needs the single best estimate of
 * the limit itself, which Kouri puts at 25 for men. Reusing the 25.5 edge here
 * inflated every user's lifetime headroom by ~1.7 kg and shortened every
 * timeline accordingly.
 */
export const FFMI_CEILING: Record<'male' | 'female', number> = {
  male: 25,
  female: 21.5,
};

/**
 * [A] Observed upper bound on lean gain. DEXA-measured natural lifters rarely
 * exceed 0.23 kg/week; faster apparent gains are glycogen, water or fat. Used
 * to cap the optimistic end of the range, which the ±35% spread can otherwise
 * push past anything anyone has actually measured.
 */
export const MAX_LEAN_GAIN_KG_PER_WEEK = 0.23;

/** The four self-reported training states, as collected by the route flow. */
type TrainingState = NonNullable<GoalsProfile['trainingState']>;

/**
 * [B] Per-state cap on the annual NOVEL-tissue rate, as a fraction of
 * LIFETIME headroom L — never of remaining headroom, and never a flat kg
 * figure. Combined with the curve as min(curve rate, fraction × L): two
 * upper bounds from independent sources (how much room the frame has left;
 * what the user's demonstrated progress allows), combined as their minimum,
 * so state can only ever SLOW a rate and self-report noise cannot produce an
 * under-predicted timeline.
 *
 * Why this form and not the two obvious alternatives:
 *
 *   A flat kg cap (the withdrawn first draft: 5.5 / 2.0) is a male-derived
 *   constant in a model that is otherwise entirely per-person — it
 *   constrained 51% of a 190 cm man's novice rate but 83% of a 155 cm
 *   woman's, against the equal-relative-hypertrophy finding (Roberts 2020;
 *   Refalo 2025, PMID 40028215) this model already encodes through L.
 *
 *   A fraction of REMAINING headroom collapses the combination: the curve
 *   rate is (1 − e^(−k)) × remaining, so min of two multiples of the same
 *   variable just replaces the decay constant — state becomes the single
 *   authority and FFMI position stops informing the rate at all. L is
 *   constant within a person, so a fraction of L stays an absolute cap
 *   inside the min() while scaling across bodies and sexes.
 *
 * The fractions are the coaching tier tops (year-2 ≈ 5.5 kg/yr, year-4+ ≈
 * 2 kg/yr — McDonald/Aragon models, coaching sources) divided by the
 * reference male L at the 1.8 m Kouri anchor: 6 FFMI points × 1.8² =
 * 19.44 kg. The bite is therefore uniform: every capped state runs at the
 * same fraction of that person's own novice rate (consistent: 2 × 0.28 =
 * 56%) at every height and both sexes.
 *
 * `new` carries no cap — the curve's novice output IS the year-1 band, so a
 * state cap adds nothing. `returning` caps its NOVEL portion at the
 * intermediate fraction; the regain portion is exempt (see the regain-rate
 * comment in deriveRoadmap). Position-matched users pass UNDER their own cap
 * (0.28 L sits above the curve's year-2 rate of 0.25 L; 0.10 L above the
 * year-4 rate of 0.0625 L), so the cap binds only when the reported state
 * and the FFMI position disagree — which, with FFMI_UNTRAINED being a
 * population median that clamps `built` to zero for roughly half of
 * untrained men, is the common path for consistent and advanced reporters,
 * not an edge case.
 */
export const STATE_RATE_CAP_FRACTION_OF_HEADROOM: Record<TrainingState, number | null> = {
  new: null,
  consistent: 0.28,
  returning: 0.28,
  advanced: 0.1,
};

/**
 * [B] Individual-variation spread applied to the rate: ±35% as the base (the
 * 30-40% the rate literature reports), widened to ±50% when the reported
 * training state and the FFMI-implied position disagree by two tiers — two
 * estimators disagreeing by 2×+ means the model knows less, and the interval
 * should say so. The 0.50 magnitude is an assumption; the direction is the
 * defensible part. See spreadFor for the exemptions.
 */
export const RATE_SPREAD = 0.35;
export const RATE_SPREAD_ON_CONFLICT = 0.5;

// ---------------------------------------------------------------------------
// Fat loss
//
// The gain side of this file has been sourced since it was written; the loss
// side never was, which is why every phase duration below used to be a literal
// tuple. These are the two numbers that make trim, reveal and recomp durations
// derivable instead of assumed.
// ---------------------------------------------------------------------------

/**
 * [A] Weekly fat loss as a fraction of bodyweight, [slow, fast].
 *
 * Garthe et al. 2011 randomised elite athletes to 0.7%/wk vs 1.4%/wk. Both
 * groups lost the same total weight, but the slow group lost 31% of their fat
 * mass and GAINED lean mass, while the fast group lost 21% and gained none.
 * The 0.5-1% range is the consensus that follows, and the slow bound is the
 * one where the loss is essentially all fat — which is why the slow bound
 * produces the LONG duration here rather than a worse outcome.
 */
export const FAT_LOSS_FRACTION_BW_PER_WEEK: [number, number] = [0.005, 0.01];

/**
 * [A] Murphy & Koehler, Scand J Med Sci Sports 2022;32(1):125-137. Their
 * meta-regression found an energy deficit of ~500 kcal/day PREVENTED gains in
 * lean mass under resistance training.
 *
 * This is what makes a recomp bounded rather than wishful: a recomp is defined
 * by gaining lean while losing fat, so it cannot run a deficit at or above
 * this without stopping being a recomp.
 */
export const RECOMP_DEFICIT_CEILING_KCAL_PER_DAY = 500;

/** [B] Energy density of adipose tissue. The conventional 7700 kcal/kg. */
const KCAL_PER_KG_FAT = 7700;

/**
 * [B] Energy density of lean tissue, ~1800 kcal/kg.
 *
 * Lean mass is mostly water, so a kilo of it carries roughly a quarter of the
 * energy a kilo of fat does. Charging every kilo of weight lost at the FAT
 * density — which this file did until 13 Aug 2026 — overstates the implied
 * deficit, which then overstates how much that deficit suppresses lean gain.
 * The error was conservative and second-order, but the weekly loop is now the
 * one place this arithmetic lives, so it is worth being right here.
 */
const KCAL_PER_KG_LEAN = 1800;

/**
 * [B] How long ONE growth block runs before trimming back, in months, by route.
 *
 * This is what the route now means. It used to hand out a fixed cycle COUNT,
 * which made the number of phases independent of how far the user was going: a
 * 3 kg gap and a 30 kg gap both got four cycles.
 *
 * A block does not end because body fat hits the ceiling. Checked against the
 * researched gain composition — Garthe 2013 gives roughly 0.2 kg of fat per kg
 * of lean at a cautious rate and about 0.5 at a deliberate one — a 67 kg-lean
 * user on the balanced band can add THIRTY kilos of lean before body fat
 * touches 18%. The ceiling is almost never the binding constraint, and deriving
 * block length from it produces one multi-year build with no trims at all.
 *
 * What actually ends a bulk is appetite, adherence and wanting to look decent
 * at some point. No study measures that, so these are planning assumptions —
 * but they are the honest place for the assumption to live, and the route
 * picker is the user telling us which one they want.
 *
 * [B] ASSUMPTION, confirmed as such by external review 13 Aug 2026. There is
 * no controlled evidence that more frequent shorter growth blocks build more
 * or less muscle over years than fewer longer ones at matched total surplus.
 * These lengths are therefore a PREFERENCE, not an accuracy lever: they change
 * how the same total build time is divided up, and they must never be allowed
 * to change the total itself.
 */
const BUILD_BLOCK_MONTHS: Record<RoutePreference, number> = {
  lean: 4,
  balanced: 7,
  roomy: 11,
};

/**
 * A journey with more blocks than this is a chart nobody can read. Twelve
 * rather than eight because the cap does not shorten the journey, it lengthens
 * each block: at eight, a 25 kg gap produced fifteen month bulks, which is the
 * same absurdity that killed the first attempt at deriving these.
 */
const MAX_CYCLES = 12;

/**
 * Fat kilos a recomp can shed per week, [slow, fast]. The fast bound sits at
 * the deficit ceiling itself, where the lean side is stalling, so it is a hard
 * limit rather than a target; the slow bound is half of it.
 */
const RECOMP_FAT_KG_PER_WEEK: [number, number] = [
  (RECOMP_DEFICIT_CEILING_KCAL_PER_DAY * 0.5 * 7) / KCAL_PER_KG_FAT,
  (RECOMP_DEFICIT_CEILING_KCAL_PER_DAY * 7) / KCAL_PER_KG_FAT,
];

/**
 * [B] Fraction of WEIGHT lost that comes off the lean side, as a function of
 * how fast the weight is coming off.
 *
 * Replaces LEAN_LOSS_PER_CUT's unit error. The literature expresses this as a
 * fraction of weight lost, and it is highly modifiable: 20-35% in sedentary
 * dieters, but near zero — or negative — with high protein and resistance
 * training, which this app assumes throughout.
 *
 * Anchored on Garthe 2011 directly. The FAST group lost at 1.4%/wk — faster
 * than the fast bound this model ever uses — and their LBM changed by −0.2%.
 * Against roughly 4 kg of weight lost that is a lean fraction near 3%.
 *
 * The first version of this ramped to 0.20 at the fast bound, which is harsher
 * than trained athletes showed at a HIGHER rate: an over-correction from the
 * old "every kilo lost is fat" assumption straight past the evidence. External
 * review caught it. 0.10 is the recommended default under high protein plus
 * resistance training, which this app prescribes throughout, and it stays
 * conservative against users who do not hit their protein target.
 *
 * Rate is a legitimate proxy for deficit here rather than a separate axis,
 * because inside the loop deficit IS bodyweight × rate × energy density.
 */
const LEAN_FRACTION_AT_FAST_BOUND = 0.1;

function leanFractionOfLoss(rateFraction: number): number {
  const [slow, fast] = FAT_LOSS_FRACTION_BW_PER_WEEK;
  if (fast <= slow) return 0;
  const t = Math.min(1, Math.max(0, (rateFraction - slow) / (fast - slow)));
  return LEAN_FRACTION_AT_FAST_BOUND * t;
}

/**
 * Daily energy deficit implied by a week's tissue LOSS, kcal — d₀, the loss
 * side only.
 *
 * Charged PER COMPARTMENT. Fat and lean carry very different energy, so
 * applying the fat density to the whole loss inflates the deficit and, through
 * leanGainFactor, the suppression that follows from it.
 *
 * This is deliberately NOT the full dietary deficit: energy banked by any
 * concurrent lean GAIN is credited where the gain is solved (simulateLoss),
 * because the two define each other. Callers wanting the true dietary deficit
 * must subtract gain × KCAL_PER_KG_LEAN / 7, which is the same subtraction
 * the recomp closed form makes.
 */
function deficitKcalPerDay(fatLossKg: number, leanLossKg: number): number {
  return (fatLossKg * KCAL_PER_KG_FAT + leanLossKg * KCAL_PER_KG_LEAN) / 7;
}

/**
 * [A→B] How much of the surplus-rate lean gain survives an energy deficit.
 *
 * Murphy & Koehler 2022 found a deficit of about 500 kcal/day PREVENTED gains
 * in lean mass under resistance training, with losses scaling as the deficit
 * grew. The zero point is theirs; the linear ramp between is the assumption.
 *
 * This is the coupling the model used to be missing. A cut and a recomp are
 * not a fat clock and a lean clock running independently — the deficit driving
 * one is the same variable suppressing the other.
 */
function leanGainFactor(deficitKcalDay: number): number {
  return Math.min(1, Math.max(0, 1 - deficitKcalDay / RECOMP_DEFICIT_CEILING_KCAL_PER_DAY));
}

/** Safety rail: no plan runs twenty years, and no loop should hang. */
const MAX_SIM_WEEKS = 1040;

interface SimResult {
  weeks: number;
  leanKg: number;
  fatKg: number;
}

/**
 * Week-by-week partition of a fat-loss phase.
 *
 * Each week: the chosen rate sets total weight loss, that loss is split into
 * fat and lean, the implied deficit discounts whatever lean gain training
 * would otherwise produce, and both compartments are updated. Runs until the
 * body fat target is met, or the goal weight if one is supplied.
 *
 * This one loop replaces three formulas that could disagree — the closed-form
 * cut, the total-weight cut, and the recomp's separate clocks.
 *
 * Returns null when the targets are NOT REACHED — and only then:
 *
 *   invalid entry state  — nothing to simulate.
 *   fat exhausted        — the weight target sits below what this lean mass
 *                          can weigh at any body fat, so arriving would need
 *                          negative fat. The 13 Aug version returned a
 *                          duration here, for a state the user never reaches.
 *   MAX_SIM_WEEKS hit    — the pathological-input rail. Also used to return
 *                          a "result": 1040 weeks, rounding to a 239-month
 *                          phase card.
 *
 * A profile that already satisfies the targets is the opposite of unreached:
 * that returns { weeks: 0 }, so callers can tell "no phase needed" apart from
 * "cannot compute". (Unreachable through monthsToCut today, which guards
 * fromBfPct <= toBfPct, but the contract should not depend on the caller's
 * guard.)
 *
 * Exported for the test file only. App code goes through monthsToCut,
 * monthsToLoseWeight and monthsToRecomp.
 */
export function simulateLoss(opts: {
  leanKg: number;
  fatKg: number;
  targetBfPct: number;
  /** Optional: also require reaching this weight, whichever takes longer. */
  targetWeightKg?: number;
  rateFraction: number;
  /** Lean the user would add per week at maintenance, from the gain curve. */
  weeklyGainKg: number;
}): SimResult | null {
  let { leanKg, fatKg } = opts;
  const { targetBfPct, targetWeightKg, rateFraction, weeklyGainKg } = opts;
  if (leanKg <= 0 || fatKg <= 0) return null;

  const leanShare = leanFractionOfLoss(rateFraction);

  // Feasibility, before any simulation. Walking to the weight target removes
  // leanShare of every kilo from the lean side, so the lean mass ON ARRIVAL
  // at targetWeightKg is known in advance — and the gain credit only raises
  // it. If that lean alone meets or exceeds the target weight, the fat there
  // is zero or negative: the loop would exhaust fat first and never arrive.
  // Say so now instead of simulating the failure (the in-loop check below
  // remains the backstop for the cases this optimistic bound lets through).
  if (targetWeightKg != null) {
    const leanAtTarget = leanKg - leanShare * (leanKg + fatKg - targetWeightKg);
    if (targetWeightKg - leanAtTarget <= 0) return null;
  }

  let weeks = 0;

  const met = () => {
    const w = leanKg + fatKg;
    const bfOk = (fatKg / w) * 100 <= targetBfPct;
    const wtOk = targetWeightKg == null || w <= targetWeightKg;
    return bfOk && wtOk;
  };

  if (met()) return { weeks: 0, leanKg, fatKg };

  while (weeks < MAX_SIM_WEEKS) {
    const w = leanKg + fatKg;
    const loss = w * rateFraction;
    const leanLoss = loss * leanShare;
    const fatLoss = loss - leanLoss;

    // The gain and the deficit define each other: building lean ABSORBS
    // energy, so the dietary deficit is the tissue-loss energy MINUS what the
    // gain banks — the same subtraction the recomp closed form makes. Until
    // 13 Aug this loop charged only the loss side, which was the exact
    // inconsistency the recomp fix existed to remove, surviving one function
    // over. The circularity (gain needs d, d needs gain) is linear, so it
    // solves exactly rather than by iteration:
    //
    //   d    = d₀ − gain × KCAL_LEAN / 7        d₀ = loss-side deficit
    //   gain = g × (1 − d / CEILING)            inside the [0, g] clamp
    //   ⇒ gain = g × (1 − d₀/CEILING) / (1 − g × KCAL_LEAN / (7 × CEILING))
    //
    // Both clamps survive the algebra: d₀ at or past the ceiling drives the
    // interior solution to or below zero (gain 0, factor 0 — consistent), and
    // a tiny d₀ pushes it past g, where the physical ceiling is "no deficit,
    // full rate" — hence the outer min against g.
    const d0 = deficitKcalPerDay(fatLoss, leanLoss);
    const denom =
      1 -
      (weeklyGainKg * KCAL_PER_KG_LEAN) /
        (7 * RECOMP_DEFICIT_CEILING_KCAL_PER_DAY);
    const gain = Math.min(
      weeklyGainKg,
      Math.max(0, (weeklyGainKg * leanGainFactor(d0)) / denom),
    );

    fatKg -= fatLoss;
    leanKg += gain - leanLoss;
    weeks += 1;

    if (fatKg <= 0) return null;
    if (met()) return { weeks, leanKg, fatKg };
  }
  return null;
}

/** Weekly lean gain at maintenance, from the curve. Zero when unknowable. */
function weeklyGainKgFor(profile: GoalsProfile): number {
  const rate = leanGainKgPerYear(profile);
  if (!rate) return 0;
  return (rate[0] + rate[1]) / 2 / 52;
}

export function fatMassKg(weightKg: number, bodyFatPct: number): number {
  return weightKg * (bodyFatPct / 100);
}

/**
 * Fat that must come off to move from one body fat percentage to another while
 * HOLDING lean mass. Exact rather than approximate: with lean L fixed,
 * weight = L / (1 - bf), so fat = L × bf / (1 - bf).
 */
export function fatToLoseKg(leanKg: number, fromBfPct: number, toBfPct: number): number {
  const a = fromBfPct / 100;
  const b = toBfPct / 100;
  if (a <= b || a >= 1 || b >= 1) return 0;
  return leanKg * (a / (1 - a) - b / (1 - b));
}

/**
 * [A] Months to cut from one body fat percentage to another, [lo, hi].
 *
 * Now a week-by-week simulation rather than a closed form. The old version
 * divided fat-to-lose by bodyweight x rate, which silently assumed every kilo
 * lost was fat — but Garthe's rate is BODYWEIGHT per week, not fat per week.
 * At the slow bound that was nearly right, because almost all of the loss is
 * fat there. At the fast bound it understated the time, since some of the
 * weight coming off is lean.
 *
 * The fast rate gives the short duration and the slow rate the long one, so
 * the range spans the same evidence Garthe covers rather than an invented
 * spread.
 *
 * The profile argument is needed because the simulation credits whatever lean
 * gain survives the deficit, which depends on where the user sits on the curve.
 */
export function monthsToCut(
  leanKg: number,
  fromBfPct: number,
  toBfPct: number,
  profile?: GoalsProfile,
  targetWeightKg?: number,
): [number, number] | null {
  if (leanKg <= 0 || fromBfPct <= toBfPct) return null;
  const startW = leanKg / (1 - fromBfPct / 100);
  const fatKg = startW - leanKg;
  const weeklyGainKg = profile ? weeklyGainKgFor(profile) : 0;
  const [slow, fast] = FAT_LOSS_FRACTION_BW_PER_WEEK;

  const run = (rateFraction: number) =>
    simulateLoss({ leanKg, fatKg, targetBfPct: toBfPct, targetWeightKg, rateFraction, weeklyGainKg });

  const quick = run(fast);
  const slowRun = run(slow);
  if (!quick || !slowRun) return null;
  return [round1(quick.weeks / 4.345), round1(slowRun.weeks / 4.345)];
}

/**
 * Months to reach a goal WEIGHT as well as a goal body fat, [lo, hi].
 *
 * Thin wrapper: same simulation, with the weight target as an extra stopping
 * condition. Used where cutting to the goal body fat on current lean would
 * still leave the user above the weight they asked for, so lean has to come
 * off too and the phase is longer than the fat alone implies.
 *
 * Returns null — not a duration — when the goal weight sits below what this
 * lean mass can weigh at any body fat. Since 13 Aug that is a real answer:
 * the loop refuses to simulate through negative fat, where the previous
 * version reported the weeks it took to fail.
 */
export function monthsToLoseWeight(
  leanKg: number,
  fromBfPct: number,
  toBfPct: number,
  targetWeightKg: number,
  profile?: GoalsProfile,
): [number, number] | null {
  return monthsToCut(leanKg, fromBfPct, toBfPct, profile, targetWeightKg);
}

/**
 * Months to hold weight while body fat falls from one percentage to another.
 *
 * DERIVED, not assumed. A recomp is weight-neutral, so the weekly fat loss f
 * must equal the weekly lean gain l. The deficit that produces f also
 * suppresses l, by Murphy & Koehler's ~500 kcal/day zero point:
 *
 *   l = g × (1 − d/500),  and weight-neutral means f = l
 *   d = (f × 7700 − l × 1800) / 7      ← building lean ABSORBS energy
 *   ⇒ f = g / (1 + g × (7700 − 1800) / (7 × 500))
 *
 * The subtraction was missing until 13 Aug 2026: charging the full fat energy
 * to the dietary deficit while ignoring what building the lean costs
 * overstated the deficit by about 23%, which overstated suppression and made
 * every recomp longer than it should be.
 *
 * where g is the user's maintenance lean-gain rate from the curve. So the
 * recomp rate falls out of the two constants rather than being picked.
 *
 * This replaces the old "two independent clocks, take the longer" version.
 * Those clocks were never independent: the deficit driving the fat clock is
 * the same variable slowing the lean clock, which is why running the lean side
 * at full surplus rate during a deficit was wrong.
 */
export function monthsToRecomp(
  profile: GoalsProfile,
  weightKg: number,
  fromBfPct: number,
  toBfPct: number,
): [number, number] | null {
  const swingKg = (weightKg * (fromBfPct - toBfPct)) / 100;
  if (swingKg <= 0) return null;

  const rate = leanGainKgPerYear(profile);
  if (!rate || rate[1] <= 0) return null;

  const perWeek = (annualKg: number) => {
    const g = annualKg / 52;
    if (g <= 0) return null;
    return (
      g /
      (1 +
        (g * (KCAL_PER_KG_FAT - KCAL_PER_KG_LEAN)) /
          (7 * RECOMP_DEFICIT_CEILING_KCAL_PER_DAY))
    );
  };

  const fast = perWeek(rate[1]);
  const slow = perWeek(rate[0]);
  if (!fast || !slow) return null;

  return [round1(swingKg / fast / 4.345), round1(swingKg / slow / 4.345)];
}

/**
 * Months to add a given amount of lean mass, [lo, hi].
 *
 * Thin wrapper over yearsToBuild so the phase durations and the whole-journey
 * estimate cannot drift apart. Falls back to the flat annual rate when the gap
 * exceeds remaining headroom, which yearsToBuild reports as null.
 */
export function monthsToBuildLean(
  gapKg: number,
  profile: GoalsProfile,
): [number, number] | null {
  if (gapKg <= 0) return null;
  const years = yearsToBuild(gapKg, profile);
  if (years) return [round1(years[0] * 12), round1(years[1] * 12)];
  const rate = leanGainKgPerYear(profile);
  if (!rate || rate[0] <= 0) return null;
  return [round1((gapKg / rate[1]) * 12), round1((gapKg / rate[0]) * 12)];
}

const ceilingFor = (sex?: Sex) => FFMI_CEILING[sex === 'female' ? 'female' : 'male'];
const baselineFor = (sex?: Sex) => FFMI_UNTRAINED[sex === 'female' ? 'female' : 'male'];

/** Lean mass in kg corresponding to a normalised FFMI at a given height. */
export function leanAtNormalisedFfmi(ffmiNorm: number, heightCm: number): number {
  const m = heightCm / 100;
  return (ffmiNorm - 6.3 * (1.8 - m)) * m * m;
}

/**
 * Lifetime muscle headroom above an untrained baseline, in kg.
 *
 * [B] Derived rather than assumed: (ceiling − baseline) × height². Deriving it
 * also removes the need for a separate female rate multiplier — a smaller
 * baseline-to-ceiling span produces a smaller L and therefore a slower curve,
 * with no fudge factor. The female constants remain the weakest part of this
 * model; the ceiling in particular is extrapolated from a male sample.
 */
export function lifetimeHeadroomKg(heightCm: number, sex?: Sex): number {
  return (
    leanAtNormalisedFfmi(ceilingFor(sex), heightCm) -
    leanAtNormalisedFfmi(baselineFor(sex), heightCm)
  );
}

/** Muscle already built above the untrained baseline. Clamped at zero. */
export function muscleBuiltKg(profile: GoalsProfile): number | undefined {
  const { currentWeightKg, currentBodyFatPct, heightCm, sex } = profile;
  if (currentBodyFatPct == null || heightCm == null) return undefined;
  const leanNow = leanMassKg(currentWeightKg, currentBodyFatPct);
  return Math.max(0, leanNow - leanAtNormalisedFfmi(baselineFor(sex), heightCm));
}

/** Where the user sits on the curve, in training-years-equivalent. */
function positionOnCurve(profile: GoalsProfile, L: number): number {
  const built = Math.min(muscleBuiltKg(profile) ?? 0, L * 0.999);
  return -Math.log(Math.max(1e-6, 1 - built / L)) / GAIN_DECAY_K;
}

/** The per-person state cap in kg/yr: fraction × L. Null when uncapped or unknowable. */
export function stateCapKgPerYear(profile: GoalsProfile): number | null {
  const { heightCm, sex, trainingState } = profile;
  if (heightCm == null || trainingState == null) return null;
  const fraction = STATE_RATE_CAP_FRACTION_OF_HEADROOM[trainingState];
  if (fraction == null) return null;
  const L = lifetimeHeadroomKg(heightCm, sex);
  return L > 0 ? fraction * L : null;
}

/** FFMI-implied tier from curve position: 0 new-shaped, 1 consistent-shaped, 2 advanced-shaped. */
const positionTier = (t0: number): number => (t0 < 1 ? 0 : t0 <= 3 ? 1 : 2);

const STATE_TIER: Record<TrainingState, number | null> = {
  new: 0,
  consistent: 1,
  returning: null, // exempt — "trained before, had time off" fits any position
  advanced: 2,
};

/**
 * The rate spread for this profile. Base ±35%; ±50% on a two-tier
 * disagreement between reported state and FFMI-implied position (the
 * advanced reporter with novice-level built, or the muscular novice). A
 * one-tier gap is noise — self-report and body-fat measurement error easily
 * span an adjacent tier — and changes nothing. Falls back to the base
 * whenever the position cannot be assessed (missing height or body fat),
 * because a conflict cannot be measured against a missing estimator, and for
 * `returning`, which has no expected position to disagree with.
 */
export function spreadFor(profile: GoalsProfile): number {
  const { heightCm, currentBodyFatPct, trainingState } = profile;
  if (heightCm == null || currentBodyFatPct == null || trainingState == null) return RATE_SPREAD;
  const stateTier = STATE_TIER[trainingState];
  if (stateTier == null) return RATE_SPREAD;
  const L = lifetimeHeadroomKg(heightCm, profile.sex);
  if (L <= 0) return RATE_SPREAD;
  const gap = Math.abs(stateTier - positionTier(positionOnCurve(profile, L)));
  return gap >= 2 ? RATE_SPREAD_ON_CONFLICT : RATE_SPREAD;
}

/**
 * Years of training needed to add `gapKg` of lean mass. Returns [lo, hi], or
 * null when the gap exceeds what remains of this frame's headroom — which is a
 * real answer, not an error.
 *
 * Piecewise since the trainingState cap: while the curve rate at the user's
 * position exceeds the cap, growth runs LINEARLY at the cap; once remaining
 * headroom decays to cap / (1 − e^(−k)) the curve dips under the cap and the
 * original exponential takes over:
 *
 *   t₁ = −ln( e^(−k·t₀) − gap/L ) / k        (uncapped, or past the crossover)
 *
 * [B] The spread comes from spreadFor — individual variation applied to the
 * RATE, so a faster rate shortens the time — widened on a state/position
 * conflict.
 */
export function yearsToBuild(gapKg: number, profile: GoalsProfile): [number, number] | null {
  const { heightCm, sex } = profile;
  if (heightCm == null || gapKg <= 0) return null;
  const L = lifetimeHeadroomKg(heightCm, sex);
  if (L <= 0) return null;

  const t0 = positionOnCurve(profile, L);
  const remaining = L * Math.exp(-GAIN_DECAY_K * t0);
  if (gapKg >= remaining) return null;

  const annualFraction = 1 - Math.exp(-GAIN_DECAY_K); // curve rate = this × remaining
  const cap = stateCapKgPerYear(profile);

  let mid: number;
  if (cap != null && remaining * annualFraction > cap) {
    // Linear leg at the cap, down to the crossover where the curve dips
    // under it. gapKg < remaining guarantees rest < crossover, so the log
    // argument stays positive.
    const crossover = cap / annualFraction;
    const linearKg = remaining - crossover;
    if (gapKg <= linearKg) {
      mid = gapKg / cap;
    } else {
      const rest = gapKg - linearKg;
      mid = linearKg / cap + Math.log(crossover / (crossover - rest)) / GAIN_DECAY_K;
    }
  } else {
    const t1 = -Math.log(Math.exp(-GAIN_DECAY_K * t0) - gapKg / L) / GAIN_DECAY_K;
    mid = t1 - t0;
  }

  const s = spreadFor(profile);
  return [round1(mid / (1 + s)), round1(mid / (1 - s))];
}

/**
 * PRE-CAP curve rate, [lo, hi] kg/yr, exactly as the model computed it before
 * the trainingState cap existed: base spread, DEXA-capped upper bound, no
 * state involvement. Internal, with ONE deliberate consumer besides the
 * capped function below: the muscle-memory regain rate in deriveRoadmap,
 * which is exempt from the state cap (see the comment there). Everything
 * novel reads leanGainKgPerYear instead.
 */
function curveGainKgPerYear(profile: GoalsProfile): [number, number] | null {
  const { heightCm, sex } = profile;
  if (heightCm == null) return null;
  const L = lifetimeHeadroomKg(heightCm, sex);
  const t0 = positionOnCurve(profile, L);
  const next = L * (Math.exp(-GAIN_DECAY_K * t0) - Math.exp(-GAIN_DECAY_K * (t0 + 1)));
  // Floored to one decimal, not rounded: rounding 11.96 up to 12.0 would put
  // the returned figure ABOVE the ceiling it exists to enforce.
  const ceiling = Math.floor(MAX_LEAN_GAIN_KG_PER_WEEK * 52 * 10) / 10;
  return [round1(next * (1 - RATE_SPREAD)), Math.min(round1(next * (1 + RATE_SPREAD)), ceiling)];
}

/**
 * Gain available over the next twelve months from the user's position, kg/yr.
 *
 * min(curve rate, state cap): the curve is an upper bound from how much room
 * the frame has left, the state cap an upper bound from the user's
 * demonstrated progress, and two upper bounds from independent sources
 * combine as their minimum. State can therefore only ever SLOW a rate —
 * self-report noise cannot produce an under-predicted timeline. The spread
 * widens on a two-tier state/position conflict (spreadFor), which is also
 * how the muscular novice is handled: rate stays headroom-bounded, interval
 * widens.
 */
export function leanGainKgPerYear(profile: GoalsProfile): [number, number] | null {
  const { heightCm, sex } = profile;
  if (heightCm == null) return null;
  const L = lifetimeHeadroomKg(heightCm, sex);
  const t0 = positionOnCurve(profile, L);
  const next = L * (Math.exp(-GAIN_DECAY_K * t0) - Math.exp(-GAIN_DECAY_K * (t0 + 1)));
  const cap = stateCapKgPerYear(profile);
  const mid = cap != null ? Math.min(next, cap) : next;
  const s = spreadFor(profile);
  // Floored to one decimal, not rounded: rounding 11.96 up to 12.0 would put
  // the returned figure ABOVE the ceiling it exists to enforce.
  const ceiling = Math.floor(MAX_LEAN_GAIN_KG_PER_WEEK * 52 * 10) / 10;
  return [round1(mid * (1 - s)), Math.min(round1(mid * (1 + s)), ceiling)];
}

/**
 * [B] Regain runs far faster than novel tissue. The muscle-memory OBSERVATION
 * is reasonably supported (Seaborne 2018, Cumming 2024); the mechanism is
 * contested, and no study quantifies a regain multiplier — 4× is a planning
 * assumption, labelled as such.
 */
export const REGAIN_MULTIPLIER = 4;

/**
 * Splits the lean-mass gap into the portion that is regain and the portion
 * that is new tissue, using a previous training peak if one is known.
 * peakLeanness is coarse on purpose: nobody recalls their old body fat.
 */
export function splitGap(profile: GoalsProfile, gapKg: number): {
  regainKg: number;
  novelKg: number;
} {
  const { peakWeightKg, peakLeanness, currentWeightKg, currentBodyFatPct } = profile;
  if (!peakWeightKg || currentBodyFatPct == null) {
    return { regainKg: 0, novelKg: gapKg };
  }
  // [B] Assumed body fat at their peak, relative to now.
  const shift = peakLeanness === 'lean' ? -4 : peakLeanness === 'soft' ? +4 : 0;
  const peakBf = Math.min(50, Math.max(4, currentBodyFatPct + shift));
  const leanThen = leanMassKg(peakWeightKg, peakBf);
  const leanNow = leanMassKg(currentWeightKg, currentBodyFatPct);
  const regainKg = Math.max(0, Math.min(gapKg, round1(leanThen - leanNow)));
  return { regainKg, novelKg: round1(gapKg - regainKg) };
}

/**
 * [B] SUPERSEDED for duration purposes, 13 Aug 2026. Kept because other
 * consumers may still read it; nothing in deriveRoadmap does.
 *
 * The unit was wrong: no source expresses cut-phase lean loss as a fraction of
 * PRIOR GAIN. The literature expresses fat-free mass lost as a fraction of
 * WEIGHT LOST, which is what `leanFractionOfLoss` now implements inside the
 * weekly partition loop, scaled by how fast the weight is coming off.
 *
 * Delete this once no consumer reads it.
 */
export const LEAN_LOSS_PER_CUT = 0.05;

// ---------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------

export type RoadmapPhaseKind = 'recomp' | 'build' | 'trim' | 'reveal';

export interface RoadmapPhase {
  kind: RoadmapPhaseKind;
  /** 1-based position in the sequence. */
  index: number;
  /** Body fat this phase ends at — phases end on a NUMBER, never a date. */
  exitBodyFatPct: number;
  /**
   * Scale weight the user should be at when this phase ends, kg.
   *
   * ADDED 18 Aug 2026 because exitBodyFatPct IS NOT MEASURABLE AT HOME. An
   * independent measurement review put consumer foot-to-foot BIA body fat at
   * ±4-8 percentage points against DXA, worst exactly where change detection
   * matters, and moving with hydration, last meal and recent exercise. Even
   * DXA's least significant change is 1.0-1.5 kg of fat consecutive-day. A
   * phase moving someone 18% to 15% is ~2.4 kg of fat: at the edge of DXA and
   * entirely below a smart scale's noise floor.
   *
   * Day-to-day bodyweight noise is about 0.53% of bodyweight by contrast
   * (Vasey 2023), so a smoothed weight trend CAN resolve what these phases
   * target. phaseTransition detects on this, not on the body fat.
   *
   * Computed from the lean mass the model carries at that point, so it already
   * accounts for the muscle a build adds. Undefined only on the degraded path
   * where body fat is unknown and no composition can be tracked at all.
   */
  exitWeightKg?: number;
  /**
   * The rate this phase is PRESCRIBED at, as a percentage of bodyweight per
   * week. Negative for a cut, positive for a build.
   *
   * ADDED 18 Aug 2026 because a weight target on its own is dangerous advice.
   * "Get to 76.7 kg" can be satisfied by crash dieting there in six weeks, and
   * half of what comes off that way is the muscle the plan exists to protect.
   * Garthe 2011 is the whole reason the rate band is 0.5-1%/week: her slow group
   * GAINED lean while losing fat, her fast group merely held it.
   *
   * So the weight is where the plan LANDS, and this is how it has to get there.
   * phaseTransition compares the measured trend slope against this, and a user
   * who arrives far too fast is reported separately from one who arrives.
   */
  targetRatePctPerWeek?: number;
  /**
   * True when this phase is too short for its own outcome to be measured — see
   * MIN_DETECTABLE_PHASE_MONTHS.
   *
   * These are NOT miscalculations and must not be restructured away. A build of
   * eleven days means the user needs almost no muscle, which is a true fact
   * about their goal and worth telling them. What is wrong is only the pretence
   * that FINISHING it can be detected: it is over before a scale can say
   * whether it worked. So the phase stands and phaseTransition declines to
   * detect it, exactly as it declines on a recomp — time-box it and let the
   * user confirm.
   *
   * Measured across the full sweep: 27.8% of builds, 3.9% of reveals and 1.4%
   * of trims. Builds dominate because a small lean gap produces a genuinely
   * tiny build.
   */
  belowDetectionThreshold?: boolean;
  /** Estimated duration in months, [lo, hi]. Always a range. */
  estMonths: [number, number];
  /** How many times this phase repeats (build/trim cycles collapse). */
  repeats: number;
}

export interface Roadmap {
  leanNowKg?: number;
  leanTargetKg: number;
  gapKg?: number;
  regainKg?: number;
  novelKg?: number;
  ffmi?: number;
  plausibility?: Plausibility;
  band: { floor: number; ceiling: number };
  phases: RoadmapPhase[];
  /** Whole-journey estimate in years, [lo, hi]. */
  estYears: [number, number];
  /** Route the plan was built for. */
  route: RoutePreference;
}

/** [B] Duration of the terminal cut to the goal body fat, months. */
/**
 * [B] Shortest phase whose outcome a home scale can resolve, in months.
 *
 * Three weeks. DERIVED, not measured: with day-to-day bodyweight noise around
 * 0.53% (Vasey 2023) the standard error of a fitted slope over N daily weights
 * is σ√(12/(N(N²−1))), which needs about 15 days to separate a 0.5%/week trend
 * from zero — and that assumes independent residuals, which daily weights are
 * not. Inflating for autocorrelation and the ~0.35% within-week rhythm lands at
 * 3-4 weeks. No primary study gives an "N days to detect X" figure; this is
 * arithmetic on top of the noise estimate, and it is a floor on NONSENSE rather
 * than a claim of statistical adequacy.
 */
export const MIN_DETECTABLE_PHASE_MONTHS = 0.75;

/**
 * [B] THE NARROWEST OPERATING RANGE THE APP WILL PLAN, in percentage points.
 *
 * Was MIN_RAIL_DROP_PCT = 1.5, a silent behaviour: a range narrower than this
 * made the ceiling rail stand down, so the user asked for a tight range and got
 * a long drift with no explanation. It is now a LIMIT the range control
 * enforces, and the rail keeps the same test as a backstop.
 *
 * RAISED TO 2 ON MEASUREMENT, not on argument. Same lifter, floor 13, widening
 * the range, counting phases too short to read on a bathroom scale:
 *
 *   width 0.5  ->  10 cuts, 20 phases, 10 unmeasurable
 *   width 1    ->   6 cuts, 11 phases,  5 unmeasurable
 *   width 1.5  ->   4 cuts,  7 phases,  3 unmeasurable
 *   width 2    ->   4 cuts,  7 phases,  1 unmeasurable
 *   width 2.5  ->   3 cuts,  5 phases,  0 unmeasurable
 *
 * At 2 the only phase under MIN_DETECTABLE_PHASE_MONTHS is the terminal cut,
 * which is short at every width and not caused by the range. Below 2 the range
 * itself starts manufacturing phases nobody can verify.
 *
 * THE PRINCIPLE UNDERNEATH, worth keeping: the bottom of the range is a promise
 * the user made and it holds everywhere, including mid-build. The top was never
 * a promise, only a rail, so where it cannot do useful work it stands down and
 * the terminal cut takes the fat.
 */
export const MIN_RANGE_WIDTH_PCT = 2;

/**
 * [B] How wide the suggested range is, in percentage points. A CONVENTION and
 * must never be presented as a finding: it matches the width of the app's own
 * lean band, and it is the tightest width that produced no range-driven
 * unmeasurable phases in the table above. No trial has compared band widths in
 * trained lifters — ICECAP found intermittent and continuous restriction
 * identical on everything but appetite.
 */
export const SUGGESTED_RANGE_WIDTH_PCT = 3;

/**
 * [B] Lean mass left to gain, in kg, below which the ceiling rail stops
 * bothering to interrupt a build.
 *
 * NOT A PREFERENCE — a correctness guard. When a build ends exactly on the
 * ceiling, the solved step leaves a rounding crumb of lean behind, `left` sits
 * a hair above zero, and the rail dutifully inserts a trim and a rebuild for
 * it. Measured cost: the plan then finishes at the BOTTOM of the range instead
 * of the goal, because the terminal cut only fires on an overshoot — a user
 * asking for 18% ended at 14.1%. One thousand profiles in the sweep.
 *
 * Half a kilo of lean is months of building at the capped rate, so anything
 * under it cannot support a phase either way.
 */
export const TRIM_REMAINDER_MIN_KG = 0.5;

const REVEAL_MONTHS: [number, number] = [3, 5];

/**
 * Does the cut-first / build-first choice actually mean anything for this user?
 *
 * Derives both and compares the phase sequence, rather than re-deriving the
 * "is there fat to shed before building" test in the UI where it would drift.
 * False in the two cases where the answer is forced: already leaner than the
 * goal (nothing to cut) and no lean gap (a single cut, isRevealOnly). Callers
 * should hide the picker when this is false rather than offer two buttons that
 * do the same thing.
 */
export function phaseOrderMatters(profile: GoalsProfile, route?: RoutePreference): boolean {
  const a = deriveRoadmap({ ...profile, preBuildBf: undefined, phaseOrder: 'cut_first' }, route);
  const b = deriveRoadmap({ ...profile, preBuildBf: undefined, phaseOrder: 'build_first' }, route);
  if (!a || !b) return false;
  const sig = (r: Roadmap) => r.phases.map((ph) => `${ph.kind}:${ph.exitBodyFatPct}`).join('|');
  return sig(a) !== sig(b);
}

/**
 * THE OPERATING RANGE: the body fat range a user cycles within while building,
 * and the SINGLE DEFINITION of its bounds, its defaults and its one hard rule.
 *
 * Exported for the same reason phaseOrderMatters was: the screen and the plan
 * must not be able to disagree. The control renders nothing when this returns
 * null, clamps to what it returns, and reads `suggestedTop` for its suggestion.
 *
 * ── THE TWO ENDS ARE NOT SYMMETRICAL ────────────────────────────────────────
 *
 * BOTTOM has a hard stop, `leanStop`, because the lean end has measured
 * consequences (see leanStopFor). It also cannot exceed current body fat: a
 * bottom above where the user is standing means no opening cut at all, which is
 * the build-first plan and is reached by putting the bottom at the top of its
 * travel rather than by a separate picker.
 *
 * TOP has NO upper clamp, deliberately. Above the point the build tops out, a
 * ceiling never fires and the plan is identical to having none — so the honest
 * behaviour is to accept the number and let the screen say it never comes into
 * play, rather than refusing a value the user asked for. An earlier version
 * clamped it to the natural peak and that was the wrong call.
 *
 * The ONE hard rule is width: MIN_RANGE_WIDTH_PCT, measured rather than
 * argued.
 *
 * ── DEFAULTS PRESERVE THE OLD PLAN ──────────────────────────────────────────
 *
 * `bottom` defaults to the depth at which the fat the build adds lands the user
 * exactly on their goal, floored by the lean stop — the figure deriveRoadmap
 * computed inline before any of this existed — or to current body fat for a
 * profile carrying phaseOrder 'build_first'. `top` defaults to the suggestion.
 * So an untouched profile plans as it did, and phaseOrder survives only as the
 * seed for that default; nothing writes it any more.
 *
 * Returns null where there is no range to set: no measured body fat, no goal,
 * or nothing to build (isRevealOnly, or a non-positive lean gap).
 */
export interface OperatingRange {
  /** Leanest the bottom may go. Sex-based, see leanStopFor. */
  leanStop: number;
  /** Highest the bottom may go: current body fat, i.e. no opening cut. */
  topStop: number;
  /** Narrowest permitted top minus bottom. */
  minWidth: number;
  /** Resolved bottom, stored value clamped, else the default. */
  bottom: number;
  /** Resolved top, stored value floored by the width rule, else the suggestion. */
  top: number;
  /**
   * THE SUGGESTED RANGE, BOTH ENDS. `suggestedBottom` is the depth the plan
   * would pick on its own — where the fat the build adds lands the user on
   * their goal — and `suggestedTop` is that plus SUGGESTED_RANGE_WIDTH_PCT.
   *
   * The top used to be derived from the user's CURRENT bottom, which made the
   * suggestion follow them around: a user who had nudged the bottom to 15.5 was
   * offered "the suggested 15.5 to 18.5", anchored to a number they had picked
   * arbitrarily. A recommendation that inherits half of what it is recommending
   * against is not a recommendation.
   */
  suggestedBottom: number;
  suggestedTop: number;
}

/**
 * The bottom of the range, resolved for ANY profile that has a build ahead of
 * it — including the ones with no range to choose.
 *
 * SEPARATE FROM operatingRangeFor ON PURPOSE. The range screen is skipped for a
 * user whose goal body fat is above where they stand, but deriveRoadmap still
 * needs a depth for that user, and the sweep proved what happens without one:
 * falling back to the band floor made mid-build trims 2 points deeper than the
 * plan they had before, on 17k profiles.
 */
function resolveBottom(
  profile: GoalsProfile,
  route: RoutePreference,
): { bottom: number; defaultBottom: number; leanStop: number; topStop: number } | null {
  const { currentWeightKg, currentBodyFatPct, goalWeightKg, goalBodyFatPct, sex } = profile;
  if (currentBodyFatPct == null || !goalWeightKg || goalBodyFatPct == null) return null;
  if (isRevealOnly(profile)) return null;

  const leanNow = round1(leanMassKg(currentWeightKg, currentBodyFatPct));
  const gapKg = round1(round1(leanMassKg(goalWeightKg, goalBodyFatPct)) - leanNow);
  if (!(gapKg > 0)) return null;

  const leanStop = leanStopFor(sex);
  const topStop = round1(currentBodyFatPct);

  // The same two lines deriveRoadmap sizes a build's fat cost from, so the
  // default bottom cannot disagree with the plan it is the default for.
  const phase1 = derivePhase({ ...profile, routePreference: route });
  const fatPerLean = phase1 === 'bulk' ? FAT_PER_LEAN_KG.bulk : FAT_PER_LEAN_KG.lean_bulk;

  const goalFat = goalWeightKg * (goalBodyFatPct / 100);
  const preBuildFat = Math.max(0, goalFat - gapKg * fatPerLean);
  const computed = Math.max(leanStop, round1((preBuildFat / (leanNow + preBuildFat)) * 100));
  // THE BOTTOM NO LONGER ENCODES THE ORDER, 20 Aug 2026. It used to park at
  // current body fat for a stored 'build_first', which was the only way to say
  // "no opening cut" while one field did both jobs. It cannot survive the range
  // screen: a user who sets 13 to 16 and then chooses to build first must keep
  // 13 as the depth their mid-build trims return to, not have it dragged up to
  // 20. phaseOrder is a real input again and owns the opening cut alone.
  const defaultBottom = Math.min(computed, topStop);

  // UPPER BOUND IS max(leanStop, topStop), NOT topStop. Someone already leaner
  // than the stop — 10% against a stop of 12 — would otherwise have the bottom
  // clamped DOWN to 10, and every mid-build trim would then take them to 10 for
  // years because the bottom is also the trim target. The stop has to win in
  // that direction: they are welcome to be leaner than it today, but the plan
  // will not keep putting them there. Caught by the sweep, 2,604 profiles.
  const bottom = Math.min(
    Math.max(round1(profile.preBuildBf ?? defaultBottom), leanStop),
    Math.max(leanStop, topStop),
  );
  return {
    bottom,
    // Pre-clamped against the same bounds as `bottom`, so the suggestion is
    // always a value the control could actually be set to.
    defaultBottom: Math.min(
      Math.max(round1(defaultBottom), leanStop),
      Math.max(leanStop, topStop),
    ),
    leanStop,
    topStop,
  };
}

export function operatingRangeFor(
  profile: GoalsProfile,
  route: RoutePreference = 'balanced',
): OperatingRange | null {
  const base = resolveBottom(profile, route);
  if (!base) return null;

  // NOTHING TO SHED MEANS NO RANGE TO CHOOSE. A user at or under their goal body
  // fat is asking to get FATTER, and cycling them is wrong rather than merely
  // unnecessary: with a suggested top three points above today, the rail fires
  // and trims them back to today's leanness on the way to a goal they set
  // HIGHER than that, and the plan then ends below the goal because the
  // terminal cut never triggers. One build, no range. Same rule that hides the
  // order picker for "already leaner than goal".
  const { currentBodyFatPct, goalBodyFatPct } = profile;
  if (currentBodyFatPct == null || goalBodyFatPct == null) return null;
  if (currentBodyFatPct <= goalBodyFatPct) return null;

  // THE TOP CAN NEVER SIT BELOW THE GOAL BODY FAT, and this is a hard rule
  // rather than a default. A ceiling under the finish line is incoherent: the
  // rail fires before the build reaches the goal, trims back to the bottom, and
  // the plan ends BELOW the goal with no terminal cut because the reveal only
  // triggers on an overshoot. Measured at 1,436 profiles, all of them a
  // suggested top of bottom+3 landing under a goal the user set higher.
  const floorForTop = Math.max(
    round1(base.bottom + MIN_RANGE_WIDTH_PCT),
    round1(goalBodyFatPct),
  );
  const suggestedBottom = base.defaultBottom;
  const suggestedTop = Math.max(
    round1(suggestedBottom + SUGGESTED_RANGE_WIDTH_PCT),
    round1(suggestedBottom + MIN_RANGE_WIDTH_PCT),
    round1(goalBodyFatPct),
  );

  // THE DEFAULT TOP IS THE OLD BAND CEILING, NOT THE SUGGESTION, and the
  // difference matters. `suggestedTop` is what the range screen offers and the
  // user accepts; this is what a profile that has never answered gets. Making
  // the suggestion the default would silently re-plan a quarter of existing
  // profiles onto a tighter band nobody asked for, which is the same fault the
  // route preference had. Measured across 39,672 profiles: default = suggestion
  // moves 26.1% of plans and 1.34 -> 1.37 average cuts; default = band ceiling
  // moves only what the floor change moves.
  // THE WIDTH AND GOAL RULES APPLY TO A CHOSEN TOP, NOT TO THE FALLBACK.
  // Raising the fallback to satisfy them switches the rail ON for users who
  // never asked for a range — 9,928 lean and balanced profiles that previously
  // drifted with one cut and would suddenly cycle. The old code let a fallback
  // too close to the bottom stand down instead, and planBuild's own
  // MIN_RANGE_WIDTH_PCT test still does exactly that, so the fallback is passed
  // through raw and the rail decides.
  const top =
    profile.ceilingBf != null
      ? Math.max(round1(profile.ceilingBf), floorForTop)
      : bandFor(route, profile.sex).ceiling;
  return {
    leanStop: base.leanStop,
    topStop: base.topStop,
    minWidth: MIN_RANGE_WIDTH_PCT,
    bottom: base.bottom,
    top,
    suggestedBottom,
    suggestedTop,
  };
}

/**
 * The bottom of the range, in the shape the current RouteScreen dial reads.
 *
 * KEPT AS A WRAPPER so the shipped screen keeps compiling and behaving while
 * the range control is built. It has one consumer and should go with it.
 */
export function preBuildBfRange(
  profile: GoalsProfile,
  route: RoutePreference = 'balanced',
): { lo: number; hi: number; defaultBf: number } | null {
  const r = resolveBottom(profile, route);
  if (!r) return null;
  if (r.topStop - r.leanStop < 0.5) return null;
  return { lo: r.leanStop, hi: r.topStop, defaultBf: r.bottom };
}

/**
 * Builds the full phase sequence from a profile.
 *
 * THE OPENING PHASE IS derivePhase'S ANSWER (D0, 9 Aug 2026), mapped into
 * roadmap vocabulary. derivePhase is the single authority on the current
 * phase — it holds the rules a band comparison alone cannot express: the
 * losing direction (a user going 90 → 80 kg opens with a trim, not a hold),
 * the newbie/returner recomp window, and the goal-body-fat-only cut. An
 * earlier opener here decided from the band alone and disagreed with the
 * badge on the nutrition summary for the same profile at the same moment.
 * derivePhase is itself band-aware now, so "gaining from above the band →
 * recomp" still holds — it just holds in ONE place.
 *
 * lean-mass-targets.md HARD RULE 4 is applied here: when current lean mass
 * already meets the target and body fat sits above goal, the muscle is built
 * and only needs revealing — the roadmap is a single terminal cut, not build
 * cycles the user doesn't need.
 *
 * Durations are EMERGENT, not configured. Time in each phase falls out of the
 * gain rate, the fat loss rate and the band width. There is deliberately no
 * "surplus fraction" constant, because no source supports one. The literal
 * tuples that used to sit here survive only as fallbacks for a profile with no
 * measured body fat, where there is no gap to compute a duration from.
 */
export function deriveRoadmap(
  profile: GoalsProfile,
  route: RoutePreference = 'balanced',
): Roadmap | null {
  const { currentWeightKg, currentBodyFatPct, goalWeightKg, goalBodyFatPct, sex, heightCm } =
    profile;
  if (!goalWeightKg || goalBodyFatPct == null) return null;

  const leanTargetKg = round1(leanMassKg(goalWeightKg, goalBodyFatPct));
  // ── THE BAND IS THE USER'S NOW, 20 Aug 2026 ──────────────────────────────
  //
  // Both edges came from `bandFor(route, sex)` until today, which meant the
  // route preference decided whether someone was held inside a range or left to
  // drift — and the route picker was removed from the UI on 17 Aug, so that was
  // a field nobody could set. operatingRangeFor resolves both edges from the
  // profile, falling back to the same defaults, so an untouched profile is
  // unchanged.
  //
  // bandFor SURVIVES as the fallback for the degraded paths this function still
  // has to serve: no measured body fat, no lean gap, or reveal-only, where
  // there is no range to set and operatingRangeFor correctly returns null.
  const bands = bandFor(route, sex);
  const range = operatingRangeFor(profile, route);
  const base = resolveBottom(profile, route);
  const floor = base ? base.bottom : bands.floor;
  const ceiling = range ? range.top : bands.ceiling;

  const leanNowKg =
    currentBodyFatPct != null ? round1(leanMassKg(currentWeightKg, currentBodyFatPct)) : undefined;
  const gapKg = leanNowKg != null ? round1(leanTargetKg - leanNowKg) : undefined;

  const classified =
    heightCm != null ? classifyGoal(leanTargetKg, heightCm, sex) : undefined;

  // ── lean-mass-targets.md HARD RULE 4 ─────────────────────────────────────
  // "If current lean mass is already at or above target lean mass and
  // body-fat is above goal, the correct phase is a CUT, not a bulk — the user
  // already has the muscle and needs to reveal it." Nothing to build means
  // nothing to split, walk down the curve, or cycle for.
  //
  // The TEST now lives in goalsProfile as `isRevealOnly`, shared with
  // derivePhase rule 0. This branch returns before the derivePhase call
  // further down, so while the condition was written out here the two
  // functions could — and did — answer differently for the same profile: any
  // goal weight at or under leanNow / (1 - goalBF) produced a "reveal" card
  // beside a "recomp" plan. One definition, two callers, no drift.
  if (isRevealOnly(profile)) {
    // The branch's premise is "the muscle is already built, just reveal it",
    // and its duration used to be monthsToCut, which holds lean mass constant.
    // That contradicts the goal WEIGHT whenever the lean surplus is part of
    // what the user asked to lose: an 80 kg woman at 26% aiming for 62 kg at
    // 22% was told 1.2 to 2.4 months for a cut that lands at 76 kg, because
    // the 10.8 kg of lean she has to shed was never counted.
    //
    // So when cutting to the goal body fat on current lean would still leave
    // her above her goal weight, the phase is measured on total weight instead.
    // The exit body fat is unchanged and still honest; only the clock moves.
    const revealEndKg =
      leanNowKg != null ? leanNowKg / (1 - goalBodyFatPct / 100) : null;
    const mustShedLean = revealEndKg != null && revealEndKg > goalWeightKg;

    // KNOWN GAP (13 Aug): the mustShedLean call can now return null for a
    // goal weight below what this lean mass can weigh — the loop refuses to
    // simulate through negative fat. The ?? fallback then shows REVEAL_MONTHS
    // for a goal that is not reachable by cutting at all, which is masking,
    // not timing. There is nowhere honest to surface it yet: plausibility
    // only measures too-much-lean. Needs its own verdict when plausibility
    // grows a low side.
    const revealOnly =
      (mustShedLean
        ? monthsToLoseWeight(leanNowKg!, currentBodyFatPct!, goalBodyFatPct, goalWeightKg, profile)
        : currentBodyFatPct != null && leanNowKg != null
          ? monthsToCut(leanNowKg, currentBodyFatPct, goalBodyFatPct, profile)
          : null) ?? REVEAL_MONTHS;

    return {
      leanNowKg,
      leanTargetKg,
      gapKg,
      regainKg: 0,
      novelKg: 0,
      ffmi: classified?.ffmi,
      plausibility: classified?.plausibility,
      band: { floor, ceiling },
      phases: [
        {
          kind: 'reveal',
          index: 1,
          exitBodyFatPct: goalBodyFatPct,
          // Lean is held through a reveal by definition — the whole premise of
          // this branch is that the muscle is already there — so the weight it
          // ends at is that lean mass at the goal body fat. Where the goal
          // weight is lower still (mustShedLean above), the goal weight wins,
          // because that is what the user asked to see on the scale.
          exitWeightKg:
            leanNowKg != null
              ? round1(Math.min(leanNowKg / (1 - goalBodyFatPct / 100), goalWeightKg))
              : round1(goalWeightKg),
          estMonths: revealOnly,
          repeats: 1,
        },
      ],
      estYears: [round1(revealOnly[0] / 12), round1(revealOnly[1] / 12)],
      route,
    };
  }

  const { regainKg, novelKg } =
    gapKg != null ? splitGap(profile, gapKg) : { regainKg: 0, novelKg: 0 };

  // ── The build's fat cost comes from the SURPLUS, not the band ────────────
  //
  // This is the correction of 17 Aug 2026. Every build used to run floor ->
  // ceiling, which meant the BAND decided how much fat a build added. Measured
  // on a 90 kg male at 25% aiming for 90 kg at 14%, that implied 2.65 kg of fat
  // per kg of lean on the balanced route (1.94 lean, 1.05 roomy) against the
  // 0.2 the nutrition side actually prescribes — so the roadmap was drawing a
  // plan the macros would never produce. The user ate a lean-bulk surplus,
  // never reached the ceiling, and the four scheduled trims never fired.
  //
  // FAT_PER_LEAN_KG is now imported rather than re-typed, so the two modules
  // cannot drift. syntheticNutritionAnswers is a runtime leaf (types only from
  // goalsProfile), which is what makes importing it here safe under Metro.
  //
  // What this does NOT claim: that one long build beats several short ones. No
  // trial has compared them. The claim is only that the fat a build adds should
  // come from what the user is told to eat.
  const phase1 = derivePhase({ ...profile, routePreference: route });
  const fatPerLean =
    phase1 === 'bulk' ? FAT_PER_LEAN_KG.bulk : FAT_PER_LEAN_KG.lean_bulk;

  const bfOf = (lean: number, fat: number) => (fat / (lean + fat)) * 100;
  const fatAt = (lean: number, bfPct: number) =>
    (lean * (bfPct / 100)) / (1 - bfPct / 100);

  /**
   * Adds `leanToGain` while the surplus adds fat alongside it, inserting a trim
   * whenever body fat would cross the ceiling.
   *
   * The rail almost never fires on a lean bulk: at 0.2 the tissue being added
   * is ~17% fat, so body fat asymptotes toward 16.7% and an 18% ceiling is
   * unreachable from below. It exists for the roomy route (0.5, asymptote 33%)
   * and for anyone starting near the ceiling — the cycling behaviour survives
   * exactly where it is genuinely needed and disappears where it was invented.
   *
   * `trimTo` IS THE USER'S DIAL, not the band floor (20 Aug 2026). A mid-build
   * trim is still a cut, and sending someone who said "never below 16%" down to
   * a 12% floor because the ceiling happened to be crossed would break the one
   * promise the screen makes. The floor survives as the dial's lower bound, so
   * it still binds — it just binds in one place instead of two.
   */
  function planBuild(lean0: number, fat0: number, leanToGain: number, trimTo: number) {
    const segs: Array<{ kind: RoadmapPhaseKind; exit: number; lean: number; from: number }> = [];
    let lean = lean0;
    let fat = fat0;
    let left = leanToGain;
    const c = ceiling / 100;
    // Solving bf(lean + L, fat + fpl*L) = ceiling for L. A non-positive
    // denominator means the added tissue is leaner than the ceiling, so the
    // ceiling is never reached however much is added.
    const denom = fatPerLean - c * (1 + fatPerLean);
    // See MIN_RANGE_WIDTH_PCT. A trim that recovers a tenth of a point is not a
    // phase, so the rail stands down rather than shredding the build into
    // pieces nobody could measure.
    const railWorthIt = ceiling - trimTo >= MIN_RANGE_WIDTH_PCT;
    for (let guard = 0; left > 1e-6 && guard < MAX_CYCLES; guard++) {
      const room = denom > 1e-9 && railWorthIt ? (c * (lean + fat) - fat) / denom : Infinity;
      const room2 = Math.min(left, room > 1e-6 ? room : left);
      // Take the whole remainder rather than stopping short of it, when what
      // would be left over is too small to be worth a trim and a rebuild. See
      // TRIM_REMAINDER_MIN_KG — without this a build that lands exactly on the
      // ceiling gets an extra cut for a rounding crumb.
      const step = left - room2 <= TRIM_REMAINDER_MIN_KG ? left : room2;
      const from = bfOf(lean, fat);
      lean += step;
      fat += step * fatPerLean;
      left -= step;
      segs.push({ kind: 'build', exit: round1(bfOf(lean, fat)), lean: step, from });
      if (left > 1e-6) {
        const fromTrim = bfOf(lean, fat);
        fat = fatAt(lean, trimTo);
        segs.push({ kind: 'trim', exit: round1(trimTo), lean: 0, from: fromTrim });
      }
    }
    return { segs, lean, fat };
  }

  // NOVEL only. Sizing this from the whole gap and THEN adding the regain
  // months below charges the regained kilos twice, which made a returning
  // lifter with a peak slower than a consistent one without — backwards, and
  // exactly what the regain credit exists to prevent.
  const totalBuildMonths: [number, number] | null =
    novelKg > 0 ? monthsToBuildLean(novelKg, profile) : [0, 0];
  const regainRate = curveGainKgPerYear(profile);
  const regainLo = regainRate && regainKg > 0 ? (regainKg / (regainRate[1] * REGAIN_MULTIPLIER)) * 12 : 0;
  const regainHi = regainRate && regainKg > 0 ? (regainKg / (regainRate[0] * REGAIN_MULTIPLIER)) * 12 : 0;
  const buildBudget: [number, number] = totalBuildMonths
    ? [totalBuildMonths[0] + regainLo, totalBuildMonths[1] + regainHi]
    : [4, 9];

  const phases: RoadmapPhase[] = [];
  const WEEKS_PER_MONTH = 4.345;

  /** Prescribed %BW/week for a leg running from `fromKg` to `toKg`. */
  const rateFor = (
    fromKg: number | undefined,
    toKg: number | undefined,
    months: [number, number],
  ): number | undefined => {
    if (fromKg == null || toKg == null || fromKg <= 0) return undefined;
    const weeks = ((months[0] + months[1]) / 2) * WEEKS_PER_MONTH;
    if (!(weeks > 0)) return undefined;
    return Math.round((((toKg - fromKg) / weeks / fromKg) * 100) * 100) / 100;
  };

  const push = (
    kind: RoadmapPhaseKind,
    exit: number,
    months: [number, number],
    exitWeightKg?: number,
    fromWeightKg?: number,
  ) =>
    phases.push({
      kind,
      index: phases.length + 1,
      exitBodyFatPct: exit,
      exitWeightKg: exitWeightKg == null ? undefined : round1(exitWeightKg),
      targetRatePctPerWeek: rateFor(fromWeightKg, exitWeightKg, months),
      belowDetectionThreshold:
        (months[0] + months[1]) / 2 < MIN_DETECTABLE_PHASE_MONTHS ? true : undefined,
      estMonths: months,
      repeats: 1,
    });

  const buildMonthsFor = (leanShare: number): [number, number] =>
    gapKg && gapKg > 0
      ? [round1((buildBudget[0] * leanShare) / gapKg), round1((buildBudget[1] * leanShare) / gapKg)]
      : buildBudget;

  if (leanNowKg == null || currentBodyFatPct == null || gapKg == null || gapKg <= 0) {
    // Degraded path: no measured body fat, or nothing to build. Keep the old
    // literal so a profile without a reading still renders a plan.
    // TWO CASES REACH HERE and only one of them can be given a scale target.
    // With a known lean mass (the "nothing left to build" case) the weight at
    // the ceiling is derivable. Without a measured body fat there is no lean
    // mass and no honest target, so this stays undefined and phaseTransition
    // must decline to detect rather than guess.
    push(
      'build',
      ceiling,
      buildBudget,
      leanNowKg != null ? leanNowKg / (1 - ceiling / 100) : undefined,
    );
  } else {
    const nowFat = currentWeightKg - leanNowKg;
    const goalFat = goalWeightKg * (goalBodyFatPct / 100);
    const fatFromBuild = gapKg * fatPerLean;

    // `floor` IS the bottom of the user's range, resolved above, and it is the
    // deepest any cut in this plan may go — opening or mid-build. That is what
    // stops the ceiling rail taking someone who set 16% down to 12% because the
    // build happened to cross the top.
    //
    // The old inline computation of this depth ("wherever the fat the build adds
    // lands you exactly on your goal", clamped up to the band floor because a
    // large lean gap otherwise asks for a cut to 0%) now lives in
    // operatingRangeFor as the DEFAULT bottom, so it still governs every profile
    // that has not set one.
    const trimTo = floor;

    // THE ORDER OWNS THE OPENING CUT, THE RANGE OWNS EVERYTHING ELSE. These are
    // orthogonal and used not to be: build-first was expressed by moving the
    // bottom, which also moved every mid-build trim with it. Now a build-first
    // user keeps the range they set — the rail still returns them to their own
    // bottom whenever the build crosses their top — they simply do not cut into
    // it before starting.
    const order: PhaseOrder = profile.phaseOrder ?? defaultPhaseOrder(profile);
    const needsCut = order === 'cut_first' && currentBodyFatPct > floor + 0.2;

    if (!needsCut) {
      const { segs, lean, fat } = planBuild(leanNowKg, nowFat, gapKg, trimTo);
      // Walked rather than mapped, so every segment can carry the scale weight
      // it ends at — the figure transition detection actually uses.
      let wLean = leanNowKg;
      let wFat = nowFat;
      segs.forEach((sg) => {
        // The weight the leg STARTS at, so targetRatePctPerWeek is populated
        // here too. It was omitted while this branch only served users with
        // nothing to cut; build_first now lands here as a dial at the top, and
        // a build with no prescribed rate would have been a silent regression.
        const wBefore = wLean + wFat;
        if (sg.kind === 'build') {
          wLean += sg.lean;
          wFat += sg.lean * fatPerLean;
          push('build', sg.exit, buildMonthsFor(sg.lean), wLean + wFat, wBefore);
        } else {
          wFat = fatAt(wLean, sg.exit);
          push(
            'trim',
            sg.exit,
            monthsToCut(leanNowKg + gapKg, sg.from, sg.exit, profile) ?? [1, 3],
            wLean + wFat,
            wBefore,
          );
        }
      });
      const endBf = bfOf(lean, fat);
      if (endBf > goalBodyFatPct + 0.2) {
        push(
          'reveal',
          goalBodyFatPct,
          monthsToCut(lean, endBf, goalBodyFatPct, profile) ?? REVEAL_MONTHS,
          lean + fatAt(lean, goalBodyFatPct),
        );
      }
    } else {
      // ── The cycles ────────────────────────────────────────────────────────
      //
      // ONE LOOP FOR BOTH ORDERS AND EVERY CYCLE COUNT. cycles === 1 reproduces
      // the single-pass plan exactly: the one trim removes the whole of fatOut,
      // landing on preBuildFat, and the one build puts the rest back — so the
      // untouched-profile default is byte-identical to what shipped before
      // chunking existed.
      //
      // Splitting is FREE. Total fat removed and total lean added are both
      // fixed, so N only changes the path, never the duration — measured at
      // 15.8 to 16.1 months across N of 1 to 4 on the same lifter. What it buys
      // is a smaller excursion: 6.7 kg below goal weight at N=1 against 1.7 at
      // N=4.
      // ── ONE CUT AND ONE BUILD ─────────────────────────────────────────────
      //
      // A `cutStyle` option offering to split this into several short cuts was
      // built on 18 Aug and REMOVED the same day. It was justified on weight
      // excursion — chunking keeps you nearer your goal WEIGHT — and that was
      // the wrong axis. Measured on mean body fat it is worse in every profile
      // tested: 18.5% against 14.9% for a fat starter with a small lean gap,
      // 15.0% against 14.9% for a lean starter with a large one, with four to
      // five cuts instead of one and no time saved. It kept you near your goal
      // weight by keeping you FATTER for longer.
      //
      // The evidence never covered it either: MATADOR and ICECAP chunk a
      // DEFICIT against maintenance blocks. Nobody has tested alternating a
      // deficit with a SURPLUS. Do not reintroduce this without a measurement
      // on mean body fat, not on weight.
      //
      // NOTE this is not the same thing as the ceiling rail in planBuild below,
      // which DOES still produce mid-build trims. Those are forced arithmetic —
      // at 0.5 kg of fat per kg of lean you cannot add 16 kg of muscle without
      // body fat crossing 18% somewhere — and they are correct.
      const fatOut = nowFat - goalFat + fatFromBuild;
      const leanPer = gapKg;
      const fatPer = fatOut;

      let lean = leanNowKg;
      let fat = nowFat;

      const doTrim = () => {
        const from = bfOf(lean, fat);
        fat = Math.max(0, fat - fatPer);
        // Clamped at the DIAL, never at the goal. A cut must be allowed to go
        // BELOW the goal body fat, because the build that follows puts fat back
        // on — clamping to the goal instead made the single-cycle cut stop at
        // 14% when it needed 13.6%, then need a third phase to finish.
        //
        // The clamp used to be the band floor, which is the dial's lower bound,
        // so for a profile with no dial set this is the same number it always
        // was. Raising the dial shortens this cut and leaves the rest to the
        // terminal reveal, which is the entire point of the control.
        const exit = Math.max(trimTo, round1(bfOf(lean, fat)));
        const wBefore = lean + fatAt(lean, from);
        fat = fatAt(lean, exit);
        push('trim', exit, monthsToCut(lean, from, exit, profile) ?? [1, 3], lean + fat, wBefore);
      };

      const doBuild = () => {
        const { segs } = planBuild(lean, fat, leanPer, trimTo);
        segs.forEach((sg) => {
          const from = bfOf(lean, fat);
          const wBefore = lean + fat;
          if (sg.kind === 'build') {
            lean += sg.lean;
            fat += sg.lean * fatPerLean;
            push('build', sg.exit, buildMonthsFor(sg.lean), lean + fat, wBefore);
          } else {
            fat = fatAt(lean, sg.exit);
            push('trim', sg.exit, monthsToCut(lean, from, sg.exit, profile) ?? [1, 3], lean + fat, wBefore);
          }
        });
      };

      // ONE ORDER HERE, because build_first is no longer a branch — it is the
      // dial parked at current body fat, which makes needsCut false and sends
      // that user to the no-cut path above with an identical result: the same
      // build segments, then a terminal cut landing on the goal. Reaching this
      // point at all means there is fat to shed before the build starts.
      doTrim();
      doBuild();

      // Anything the cycles could not shed — a floor clamp above, or a build
      // that overshot — comes off here.
      const endBf = bfOf(lean, fat);
      if (endBf > goalBodyFatPct + 0.2) {
        push(
          'reveal',
          goalBodyFatPct,
          monthsToCut(lean, endBf, goalBodyFatPct, profile) ?? REVEAL_MONTHS,
          lean + fatAt(lean, goalBodyFatPct),
        );
      }

      // A trim that lands the user ON their goal is the reveal, semantically:
      // it is the phase that shows the physique rather than one that makes room
      // for more building. Build-first always ends this way.
      const tail = phases[phases.length - 1];
      // ONLY when it lands ON the goal, not merely at or under it. The looser
      // test renamed a trim that OVERSHOT — cycles ending at 10% against a 14%
      // goal — and that erased a meaningful distinction: a roadmap with no
      // terminal reveal is one where the user needs no final cut, and calling
      // the overshooting trim a reveal made the two indistinguishable.
      if (tail && tail.kind === 'trim' && Math.abs(tail.exitBodyFatPct - goalBodyFatPct) <= 0.2) {
        tail.kind = 'reveal';
      }

      // Every cut rounds its exit to a tenth and resets fat mass to match, so a
      // four-cycle plan accumulates about a tenth of a point of drift and ends
      // reading 14.1% for a 14% goal. Too small for the reveal above to fire,
      // and far too small to be real — the plan is CONSTRUCTED to land on the
      // goal, so the last phase says so rather than showing the rounding.
      if (tail && Math.abs(tail.exitBodyFatPct - goalBodyFatPct) <= 0.5) {
        tail.exitBodyFatPct = goalBodyFatPct;
        // The weight has to follow the snap or the two disagree, and the weight
        // is the one detection reads.
        tail.exitWeightKg = round1(lean + fatAt(lean, goalBodyFatPct));
      }
    }
  }

  const summedMonths = phases.reduce<[number, number]>(
    (acc, ph) => [acc[0] + ph.estMonths[0] * ph.repeats, acc[1] + ph.estMonths[1] * ph.repeats],
    [0, 0],
  );
  const estYears: [number, number] = [
    Math.max(0.1, round1(summedMonths[0] / 12)),
    Math.max(0.2, round1(summedMonths[1] / 12)),
  ];

  return {
    leanNowKg,
    leanTargetKg,
    gapKg,
    regainKg: gapKg != null ? regainKg : undefined,
    novelKg: gapKg != null ? novelKg : undefined,
    ffmi: classified?.ffmi,
    plausibility: classified?.plausibility,
    band: { floor, ceiling },
    phases,
    estYears,
    route,
  };
}