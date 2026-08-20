// src/utils/routeZones.ts
//
// The frame gauge's ZONES: one place that decides which region of the curve a
// goal weight falls in, and what sentence the user reads about it.
//
// WHY THIS EXISTS. The gauge draws six visually distinct regions and the
// verdict line underneath used to know about three of them (the three
// Plausibility states). Dragging across a visible shading boundary therefore
// often changed nothing on screen, which made the picture unreadable while
// moving. The picture and the sentence now come from the same function, so
// they cannot disagree.
//
// WHAT THE COPY IS ALLOWED TO CLAIM. Each line names the population it is
// comparing the user against and nothing else. It does not say a target is
// unhealthy, unflattering, or impossible — those are three different claims
// needing three kinds of evidence, and this app has none of them. The
// strongest available statement is that nothing that size has been recorded
// in a drug-free sample, and even that rests on a [B] graded constant, so the
// word "estimate" appears in the copy rather than being implied.
//
// The rated band renders for male and unknown sex ONLY, matching the existing
// guard on the sweet spot marks: the attractiveness literature behind
// ATTRACTIVE_NFFMI_RANGE is male body composition, and drawing it for a female
// user would claim evidence that does not exist.

import type { Sex } from './goalsProfile';
import { ffmiLimitsFor, ffmiNormalised, leanAtNormalisedFfmi, weightAtBodyFat } from './roadmap';
import {
  ATTRACTIVE_NFFMI_RANGE,
  ATTRACTIVE_NFFMI_STRETCH,
  sweetSpotApplies,
} from './attractivenessTargets';

/** Ordered lean-to-heavy. Keys match the fills the gauge paints. */
export type FrameZoneKey = 'under' | 'rated' | 'stretch' | 'ok' | 'grey' | 'beyond';

/** Semantic tone. The screen maps these to themeColor and the app palette so
 *  this module stays free of colour literals. */
export type FrameZoneTone = 'neutral' | 'rated' | 'good' | 'caution' | 'stop';

export interface FrameZone {
  key: FrameZoneKey;
  tone: FrameZoneTone;
  /** The single line under the gauge. Never more than one clause. */
  label: string;
  /** Normalised FFMI of the goal, for callers that want to show it. */
  nffmi: number;
  /** False past the ceiling: putting a timeline on something nobody has
   *  recorded would be inventing one. */
  showYears: boolean;
}

/** The weights, at this height and goal body fat, where each region begins.
 *  The gauge draws from these so the fills and the verdict share one source. */
export interface FrameLandmarks {
  /** Undefined when the rated band does not apply — do not draw it. */
  ratedLoKg?: number;
  ratedHiKg?: number;
  stretchKg?: number;
  /** Upper edge of "reachable" (ffmiLimitsFor().ok). */
  okKg: number;
  /** Outer edge of "borderline" (ffmiLimitsFor().edge). */
  edgeKg: number;
  ratedApplies: boolean;
}

/**
 * The rated band is drawn only for male and unknown sex, and only when the
 * chosen goal body fat is inside (or within a point of) the researched body
 * fat range. At 17%+ the leanness half of the joint optimum is not met, and a
 * band labelled "rated best" there would misstate the research.
 */
export function ratedBandApplies(bodyFatPct: number, sex?: Sex): boolean {
  return sex !== 'female' && sweetSpotApplies(bodyFatPct);
}

export function frameLandmarks(
  heightCm: number,
  goalBodyFatPct: number,
  sex?: Sex,
): FrameLandmarks {
  const { ok, edge } = ffmiLimitsFor(sex);
  const atN = (n: number) =>
    weightAtBodyFat(leanAtNormalisedFfmi(n, heightCm), goalBodyFatPct);

  const ratedApplies = ratedBandApplies(goalBodyFatPct, sex);

  return {
    ratedApplies,
    ratedLoKg: ratedApplies ? atN(ATTRACTIVE_NFFMI_RANGE[0]) : undefined,
    ratedHiKg: ratedApplies ? atN(ATTRACTIVE_NFFMI_RANGE[1]) : undefined,
    stretchKg: ratedApplies ? atN(ATTRACTIVE_NFFMI_STRETCH) : undefined,
    okKg: atN(ok),
    edgeKg: atN(edge),
  };
}

/**
 * Which region a goal lands in, and the sentence for it.
 *
 * When the rated band does not apply, the three lean regions collapse into one
 * 'ok' zone: without a band on screen there is nothing for "smaller than the
 * rated build" to point at, and a sentence describing a region the user cannot
 * see is worse than no sentence.
 */
export function frameZoneFor(
  leanTargetKg: number,
  heightCm: number,
  goalBodyFatPct: number,
  sex?: Sex,
): FrameZone {
  const nffmi = ffmiNormalised(leanTargetKg, heightCm);
  const { ok, edge } = ffmiLimitsFor(sex);
  const rated = ratedBandApplies(goalBodyFatPct, sex);

  if (nffmi > edge) {
    return {
      key: 'beyond',
      tone: 'stop',
      label: 'Past the estimated natural ceiling',
      nffmi,
      showYears: false,
    };
  }

  if (nffmi > ok) {
    return {
      key: 'grey',
      tone: 'caution',
      label: 'Only a handful of drug-free lifters get this big',
      nffmi,
      showYears: true,
    };
  }

  if (!rated) {
    return {
      key: 'ok',
      tone: 'good',
      label: 'In range for a drug-free lifter',
      nffmi,
      showYears: true,
    };
  }

  if (nffmi < ATTRACTIVE_NFFMI_RANGE[0]) {
    return {
      key: 'under',
      tone: 'neutral',
      label: 'Smaller than the build people rated best',
      nffmi,
      showYears: true,
    };
  }

  if (nffmi <= ATTRACTIVE_NFFMI_RANGE[1]) {
    return {
      key: 'rated',
      tone: 'rated',
      label: 'The build people rated best',
      nffmi,
      showYears: true,
    };
  }

  if (nffmi <= ATTRACTIVE_NFFMI_STRETCH) {
    return {
      key: 'stretch',
      tone: 'neutral',
      label: 'Bigger than people rated best',
      nffmi,
      showYears: true,
    };
  }

  return {
    key: 'ok',
    tone: 'good',
    label: 'Seriously big, and still reachable naturally',
    nffmi,
    showYears: true,
  };
}

/**
 * Which landmark the user tapped, for opening the right evidence sheet.
 * Returned as a discriminant rather than a component so the sheet stays a
 * presentation concern.
 */
export type EvidenceTopic = 'rated' | 'ceiling' | 'lean-stop' | 'range-width';

/**
 * The topic a zone's verdict line should open when tapped. Zones that talk
 * about the rated band open that; everything else opens the ceiling.
 *
 * `lean-stop` and `range-width` are NOT reachable from a zone — they belong to
 * the two limits on the range screen, which are properties of the control
 * rather than of where a goal lands on the frame gauge. They live in this union
 * so that every claim in the flow opens the same sheet with the same two
 * levels, rather than the range screen growing a second explanation mechanism
 * beside this one.
 */
export function evidenceTopicFor(key: FrameZoneKey): EvidenceTopic {
  return key === 'under' || key === 'rated' || key === 'stretch' ? 'rated' : 'ceiling';
}