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
//   k = ln(2)   — the halving rule. Multiple independent sources state the
//                 annual rate of gain roughly halves each year after the
//                 first. [B]
//   L           — lifetime headroom above an untrained baseline, computed per
//                 person from FFMI rather than assumed. [B]
//
//   cumulative(t) = L × (1 − e^(−k·t))
//
// CROSS-CHECK, and the reason to trust this shape. With L ≈ 20 kg it predicts
// 10.0 kg in year one, 5.0 in year two, 2.5 in year three, 1.25 in year four,
// approaching 20 kg lifetime. Published figures: beginners 7-11 kg in a first
// productive year, intermediates 3-5, advanced 1-2, lifetime 18-23 kg above
// untrained. Every band matches, and none were fitted — they fall out of the
// halving rule and the headroom. Short-term trials agree at the low end:
// resistance training produces ~1.6 kg of fat-free mass across typical 8-24
// week interventions (Morton 2018 puts RT alone at ~1.1 kg over ~13 weeks),
// and DEXA-measured natural lifters rarely exceed 0.23 kg/week.
//
// Second cross-check: L computed from FFMI lands inside the published lifetime
// range independently. At 185 cm, (25 − 19) × 1.85² = 20.5 kg against a stated
// 18-23 kg. Two unrelated methods, same answer.

/** [B] The halving rule: the annual rate of gain roughly halves each year. */
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

/**
 * Years of training needed to add `gapKg` of lean mass. Returns [lo, hi], or
 * null when the gap exceeds what remains of this frame's headroom — which is a
 * real answer, not an error.
 *
 *   t₁ = −ln( e^(−k·t₀) − gap/L ) / k
 *
 * [B] The ±35% spread is the individual variation the rate literature reports
 * (30-40%), applied to the RATE, so a faster rate shortens the time.
 */
export function yearsToBuild(gapKg: number, profile: GoalsProfile): [number, number] | null {
  const { heightCm, sex } = profile;
  if (heightCm == null || gapKg <= 0) return null;
  const L = lifetimeHeadroomKg(heightCm, sex);
  if (L <= 0) return null;

  const t0 = positionOnCurve(profile, L);
  const remaining = L * Math.exp(-GAIN_DECAY_K * t0);
  if (gapKg >= remaining) return null;

  const t1 = -Math.log(Math.exp(-GAIN_DECAY_K * t0) - gapKg / L) / GAIN_DECAY_K;
  const mid = t1 - t0;
  return [round1(mid / 1.35), round1(mid / 0.65)];
}

/** Gain available over the next twelve months from the user's position, kg/yr. */
export function leanGainKgPerYear(profile: GoalsProfile): [number, number] | null {
  const { heightCm, sex } = profile;
  if (heightCm == null) return null;
  const L = lifetimeHeadroomKg(heightCm, sex);
  const t0 = positionOnCurve(profile, L);
  const next = L * (Math.exp(-GAIN_DECAY_K * t0) - Math.exp(-GAIN_DECAY_K * (t0 + 1)));
  // Floored to one decimal, not rounded: rounding 11.96 up to 12.0 would put
  // the returned figure ABOVE the ceiling it exists to enforce.
  const ceiling = Math.floor(MAX_LEAN_GAIN_KG_PER_WEEK * 52 * 10) / 10;
  return [round1(next * 0.65), Math.min(round1(next * 1.35), ceiling)];
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

/** [B] Lean mass surrendered per trimming phase, as a fraction of the gain. */
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
 * gain rate and the band width. There is deliberately no "surplus fraction"
 * constant, because no source supports one.
 */
export function deriveRoadmap(
  profile: GoalsProfile,
  route: RoutePreference = 'balanced',
): Roadmap | null {
  const { currentWeightKg, currentBodyFatPct, goalWeightKg, goalBodyFatPct, sex, heightCm } =
    profile;
  if (!goalWeightKg || goalBodyFatPct == null) return null;

  const leanTargetKg = round1(leanMassKg(goalWeightKg, goalBodyFatPct));
  const { floor, ceiling, cycles } = bandFor(route, sex);

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
          estMonths: REVEAL_MONTHS,
          repeats: 1,
        },
      ],
      estYears: [round1(REVEAL_MONTHS[0] / 12), round1(REVEAL_MONTHS[1] / 12)],
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

  // Novel tissue is walked down the curve from the user's MEASURED position.
  // Regain runs at a multiple of that rate. Trims add time without adding
  // muscle, so they scale with the cycle count rather than the gap — plus one
  // when the journey OPENS on a trim, which is a trim the cycles don't count.
  const trimYears = (cycles + (opener.kind === 'trim' ? 1 : 0)) * 0.16; // [B] ~2 months per trim
  const novelYears = yearsToBuild(novelKg > 0 ? novelKg : (gapKg ?? 0), profile);
  const regainRate = leanGainKgPerYear(profile);
  const regainLo = regainRate && regainKg > 0 ? regainKg / (regainRate[1] * REGAIN_MULTIPLIER) : 0;
  const regainHi = regainRate && regainKg > 0 ? regainKg / (regainRate[0] * REGAIN_MULTIPLIER) : 0;

  const estYears: [number, number] = novelYears
    ? [
        Math.max(0.5, round1(novelYears[0] + regainLo + trimYears)),
        Math.max(1, round1(novelYears[1] + regainHi + trimYears + 0.5)),
      ]
    : [1, 12];

  // Exit criteria are PER KIND: a recomp holds weight down to the ceiling, a
  // trim cuts to the floor, a build runs back up to the ceiling, the reveal
  // ends at the goal. (The old opener read `aboveBand ? ceiling : ceiling` —
  // a ternary that could not branch.)
  const phases: RoadmapPhase[] = [];

  phases.push({
    kind: opener.kind,
    index: 1,
    exitBodyFatPct: opener.exit,
    estMonths: opener.kind === 'trim' ? [1, 3] : [4, 7],
    repeats: 1,
  });

  // The middle blocks are COLLAPSED totals, not a literal alternation — a
  // losing user enters the band from above, so their cycles run build-first.
  if (opener.kind === 'trim') {
    phases.push({ kind: 'build', index: 2, exitBodyFatPct: ceiling, estMonths: [4, 9], repeats: cycles });
    phases.push({ kind: 'trim', index: 3, exitBodyFatPct: floor, estMonths: [1, 3], repeats: cycles });
  } else {
    phases.push({ kind: 'trim', index: 2, exitBodyFatPct: floor, estMonths: [1, 3], repeats: cycles });
    phases.push({ kind: 'build', index: 3, exitBodyFatPct: ceiling, estMonths: [4, 9], repeats: cycles });
  }

  phases.push({
    kind: 'reveal',
    index: cycles * 2 + 2,
    exitBodyFatPct: goalBodyFatPct,
    estMonths: REVEAL_MONTHS,
    repeats: 1,
  });

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