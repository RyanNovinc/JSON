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

import type { GoalsProfile, Sex, RoutePreference, DerivedPhase } from './goalsProfile';
import { derivePhase } from './goalsProfile';
import { bandFor } from './operatingBands';

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
const REVEAL_MONTHS: [number, number] = [3, 5];

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
  // `cycles` is deliberately NOT destructured from bandFor any more: the band
  // still sets where trims start and stop, but how MANY of them there are is
  // derived from the gap further down.
  const { floor, ceiling } = bandFor(route, sex);

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
  if (
    gapKg != null &&
    gapKg <= 0 &&
    currentBodyFatPct != null &&
    currentBodyFatPct > goalBodyFatPct
  ) {
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

  // ── Phase 1: derivePhase's answer, mapped ────────────────────────────────
  // The route being PREVIEWED is passed through the profile, overriding any
  // stored routePreference — so scrubbing between routes on the route screen
  // previews each candidate route's own opener, not the stored one's.
  //
  // 'maintain' maps to build: it can only reach here with goal fields set
  // and a residual lean gap (a meaningful direction or leanness signal would
  // have derived something else), and a gap is closed by building.
  const phase1 = derivePhase({ ...profile, routePreference: route });
  const OPENERS: Record<DerivedPhase, { kind: RoadmapPhaseKind; exit: number }> = {
    recomp: { kind: 'recomp', exit: ceiling },
    cut: { kind: 'trim', exit: floor },
    lean_bulk: { kind: 'build', exit: ceiling },
    bulk: { kind: 'build', exit: ceiling },
    maintain: { kind: 'build', exit: ceiling },
  };
  const opener = OPENERS[phase1];

  /**
   * A phase has to have somewhere to go. Three corrections, all of the same
   * shape: derivePhase picks the opener from training state, direction and
   * body fat, and never consults the band, so the exit it implies can sit on
   * the wrong side of where the user actually is.
   *
   *   build at or above the ceiling  → no room to gain; trim to the floor
   *   recomp inside the band         → exit is the FLOOR, not the ceiling,
   *                                    or it reads as ending fatter
   *   recomp with the floor at or
   *   above the user                 → no room to lose; they are already lean,
   *                                    so build instead
   *
   * The last one is reachable from rule 4: a user at 11% wanting 7% gets a
   * recomp, and with the floor at 12 that phase would run 11 → 12 on a
   * duration that was never computed, because monthsToRecomp returns null on a
   * negative swing and the [4, 7] fallback takes over.
   */
  const resolvedOpener = ((): { kind: RoadmapPhaseKind; exit: number } => {
    let kind = opener.kind;
    let exit = opener.exit;
    if (currentBodyFatPct == null) return { kind, exit };

    if (kind === 'build' && currentBodyFatPct >= ceiling) {
      kind = 'trim';
      exit = floor;
    } else if (kind === 'recomp' && currentBodyFatPct <= ceiling) {
      exit = floor;
    }
    if (kind === 'recomp' && currentBodyFatPct <= exit) {
      kind = 'build';
      exit = ceiling;
    }
    // A trim for someone already leaner than the floor would run upward. Their
    // goal body fat is the only exit below them that means anything; if that is
    // not below them either, there is nothing to cut and they should build.
    if (kind === 'trim' && currentBodyFatPct <= exit) {
      exit = Math.min(exit, goalBodyFatPct);
      if (currentBodyFatPct <= exit) {
        kind = 'build';
        exit = ceiling;
      }
    }
    return { kind, exit };
  })();
  const openerKind = resolvedOpener.kind;
  const openerExit = resolvedOpener.exit;

  // ── Durations ────────────────────────────────────────────────────────────
  // These used to be five literal tuples sitting under a docstring claiming
  // durations were emergent. Every one is now computed from the gap it
  // actually covers, and estYears is the sum of them rather than a parallel
  // calculation that could contradict them.
  //
  // Each estMonths is ONE repetition. The middle blocks carry repeats, so the
  // journey total multiplies before summing.

  // Muscle-memory regain deliberately reads the PRE-CAP curve rate. The
  // state cap bounds demonstrated NOVEL progress; a returning lifter's
  // answer describes their past and observes nothing about their regain
  // speed, which is a different process (myonuclear retention — Seaborne,
  // Staron). This line keeps regain byte-identical to the pre-cap model; the
  // returning-vs-consistent test pins it. The DEXA cap's treatment here is
  // inherited unchanged — Q6's cap-vs-regain question stays open, neither
  // resolved nor worsened by the state cap.
  const regainRate = curveGainKgPerYear(profile);
  const regainLo = regainRate && regainKg > 0 ? regainKg / (regainRate[1] * REGAIN_MULTIPLIER) : 0;
  const regainHi = regainRate && regainKg > 0 ? regainKg / (regainRate[0] * REGAIN_MULTIPLIER) : 0;

  /**
   * Total months of BUILDING across the whole journey, novel growth plus
   * regain. Curve-aware, because yearsToBuild walks the gap down from the
   * user's measured position rather than applying a flat rate.
   */
  const totalBuildMonths: [number, number] | null = (() => {
    const novel = monthsToBuildLean(novelKg > 0 ? novelKg : (gapKg ?? 0), profile);
    if (!novel) return null;
    return [novel[0] + regainLo * 12, novel[1] + regainHi * 12];
  })();

  /**
   * The cycle count is DERIVED, not configured.
   *
   * Total build time divided by the block length the route asks for. So the
   * number of phases now scales with how far the user is actually going, and
   * — the point of the exercise — perBuild × cycles equals the total build
   * time exactly, which is what makes estYears the sum of the phases rather
   * than a second opinion about them.
   */
  const blockMonths = BUILD_BLOCK_MONTHS[route] ?? BUILD_BLOCK_MONTHS.balanced;
  const cycles = totalBuildMonths
    ? Math.min(
        MAX_CYCLES,
        Math.max(1, Math.round((totalBuildMonths[0] + totalBuildMonths[1]) / 2 / blockMonths)),
      )
    : 1;

  const perBuild: [number, number] = totalBuildMonths
    ? [round1(totalBuildMonths[0] / cycles), round1(totalBuildMonths[1] / cycles)]
    : [4, 9];

  // A cycle trim always runs the full band, ceiling down to floor, so its
  // duration is the same every repetition.
  const cycleTrim: [number, number] =
    leanNowKg != null ? monthsToCut(leanNowKg, ceiling, floor, profile) ?? [1, 3] : [1, 3];

  // The opener is measured from where the user actually is, not from the band.
  const openerMonths: [number, number] = (() => {
    if (currentBodyFatPct == null || leanNowKg == null) {
      return openerKind === 'trim' ? [1, 3] : [4, 7];
    }
    if (openerKind === 'trim') {
      return monthsToCut(leanNowKg, currentBodyFatPct, openerExit, profile) ?? [1, 3];
    }
    if (openerKind === 'recomp') {
      return monthsToRecomp(profile, currentWeightKg, currentBodyFatPct, openerExit) ?? [4, 7];
    }
    return perBuild;
  })();

  // Exit criteria are PER KIND: a recomp holds weight down to the ceiling, a
  // trim cuts to the floor, a build runs back up to the ceiling, the reveal
  // ends at the goal. (The old opener read `aboveBand ? ceiling : ceiling` —
  // a ternary that could not branch.)
  const phases: RoadmapPhase[] = [];

  phases.push({
    kind: openerKind,
    index: 1,
    exitBodyFatPct: openerExit,
    estMonths: openerMonths,
    repeats: 1,
  });

  // The middle blocks are COLLAPSED totals, not a literal alternation. Which
  // one runs first is decided by where the opener LEAVES the user, not by what
  // the opener was called: anyone standing at the floor has to build before
  // there is anything to trim. Keying this off `kind` was why a recomp ending
  // at the floor was followed by a trim from the floor to the floor.
  if (openerExit <= floor) {
    phases.push({ kind: 'build', index: 2, exitBodyFatPct: ceiling, estMonths: perBuild, repeats: cycles });
    phases.push({ kind: 'trim', index: 3, exitBodyFatPct: floor, estMonths: cycleTrim, repeats: cycles });
  } else {
    phases.push({ kind: 'trim', index: 2, exitBodyFatPct: floor, estMonths: cycleTrim, repeats: cycles });
    phases.push({ kind: 'build', index: 3, exitBodyFatPct: ceiling, estMonths: perBuild, repeats: cycles });
  }

  // The reveal starts wherever the phase before it ended, which differs by
  // branch: a journey whose cycles run build-first ends on a trim at the floor,
  // the other ends on a build at the ceiling.
  //
  // It is only pushed when there is something left to strip. A band floor BELOW
  // the user's goal body fat means the cycles already leave them leaner than
  // they asked to be, and appending a "cut" from 12% up to 13% — which is what
  // this did — is not a phase, it is a rounding artifact wearing a name. That
  // case only became reachable once the cycles started ordering themselves by
  // where the opener leaves the user.
  const revealFrom = phases[phases.length - 1].exitBodyFatPct;
  if (revealFrom > goalBodyFatPct) {
    const revealMonths: [number, number] =
      (leanNowKg != null ? monthsToCut(leanNowKg, revealFrom, goalBodyFatPct, profile) : null) ??
      REVEAL_MONTHS;

    phases.push({
      kind: 'reveal',
      index: cycles * 2 + 2,
      exitBodyFatPct: goalBodyFatPct,
      estMonths: revealMonths,
      repeats: 1,
    });
  }

  /**
   * ONE model. estYears is the phases added up, and nothing else.
   *
   * That is only possible because the cycle count is derived: perBuild is the
   * total build time divided by cycles, so perBuild x cycles reconstructs it
   * exactly. Every earlier version here was a second opinion about the same
   * journey — summing raw phases while builds carried a literal broke the
   * regain credit, and taking the max of the sum and the gap let the phase
   * cards add up to double the headline.
   */
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