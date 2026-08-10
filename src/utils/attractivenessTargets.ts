// src/utils/attractivenessTargets.ts
//
// The "sweet spot" constants behind the gold band on RouteScreen's frame
// gauge: the male body composition the attractiveness literature actually
// supports, sourced by the 9 Aug 2026 research run and graded in the same
// [A]/[B]/[C] scheme as every other constant in this app.
//
// The three findings that shape the display:
//   1. BAND, NOT POINT. The rated optimum is a broad plateau, not a sharp
//      peak, and it shifts with rater culture and mating context. A single
//      "ideal number" would claim precision the evidence does not carry.
//   2. Leanness carries more weight than added mass, and the two interact:
//      the peak is "lean AND moderately muscular", jointly.
//   3. The looksmaxing claim of "10 to 12% body fat for jaw definition" is
//      NOT supported: the only study manipulating MEASURED body fat in male
//      stimuli (DXA scans) put the peak at roughly 13 to 14%, single digit
//      body fat rated slightly WORSE, and no study ties any percentage to
//      facial definition. Do not surface 10 to 12% as an evidence claim.
//
// Primary sources (all peer reviewed; the popular claim appears only as the
// claim being evaluated):
//   - Xia et al. 2025, Personality and Individual Differences,
//     doi:10.1016/j.paid.2025.113240 — 283 raters, three countries, 15 real
//     male DXA scans (5.9 to 37.2% body fat): inverted U with the most
//     attractive bodies at ~13 to 14% body fat; consistent across countries.
//   - Brierley et al. 2016, PLOS ONE, doi:10.1371/journal.pone.0156722 —
//     factorial fat and muscle manipulation; joint optimum at lean plus
//     healthy muscle.
//   - Frederick and Haselton 2007, Pers Soc Psychol Bull,
//     doi:10.1177/0146167207303022 — muscularity inverted U ("toned" beats
//     "brawny").
//   - Sell, Lukaszewski and Townsley 2017, Proc R Soc B,
//     doi:10.1098/rspb.2017.1819 — strength cues dominate male bodily
//     attractiveness; tallness and leanness add to it.
//   - Pope et al. 2000, Am J Psychiatry, doi:10.1176/appi.ajp.157.8.1297 —
//     men overestimate the muscularity women prefer by roughly 13 to 14 kg;
//     FFMI anchors: ordinary ≈ 20, distinctly muscular ≈ 22.
//
// Grades: BF band [A-] (measured DXA evidence for the centre, WEIRD samples);
// FFMI band [B] (no measured FFMI attractiveness study exists — this is a
// practitioner extrapolation from FFMI calibrated instruments and the
// preference literature); band-not-point [A].
//
// Known limits of all of it: WEIRD raters dominate; morphs rather than
// measured composition behind most muscularity findings; FFMI does not
// capture shoulder to waist proportion, which in Western samples matters
// more than absolute mass. Attractiveness ratings of stripped down photo
// stimuli are not a promise about anyone's real life.

import { leanAtNormalisedFfmi, weightAtBodyFat } from './roadmap';

/** [A-] Male body fat band rated most attractive; centre of mass ~13%. */
export const ATTRACTIVE_BF_RANGE: [number, number] = [10, 15];
export const ATTRACTIVE_BF_CENTRE = 13;

/** [B] Muscularity band as NORMALISED FFMI (Kouri correction, same scale as
 *  the rest of the app). 20 to 22 is the evidence led band; 23 is the
 *  aspirational edge (men's own ideal runs higher than raters' preference,
 *  so anything past 22 is self image, not evidence). */
export const ATTRACTIVE_NFFMI_RANGE: [number, number] = [20, 22];
export const ATTRACTIVE_NFFMI_STRETCH = 23;

/**
 * The sweet spot as a WEIGHT band at a given height and body fat — the unit
 * the frame gauge draws in. Returns [loKg, hiKg], rounded to 0.1.
 *
 * The gauge draws this only when the chosen goal body fat sits inside (or
 * within a point of) ATTRACTIVE_BF_RANGE: at 17%+ the leanness half of the
 * joint optimum is not met, and drawing a "most attractive" band there would
 * misstate the research (leanness outweighs added mass).
 */
export function sweetSpotWeightRange(
  heightCm: number,
  bodyFatPct: number,
): [number, number] {
  const lo = weightAtBodyFat(
    leanAtNormalisedFfmi(ATTRACTIVE_NFFMI_RANGE[0], heightCm),
    bodyFatPct,
  );
  const hi = weightAtBodyFat(
    leanAtNormalisedFfmi(ATTRACTIVE_NFFMI_RANGE[1], heightCm),
    bodyFatPct,
  );
  return [Math.round(lo * 10) / 10, Math.round(hi * 10) / 10];
}

/** Whether the gauge should draw the sweet spot at this goal body fat. */
export function sweetSpotApplies(bodyFatPct: number): boolean {
  return (
    bodyFatPct >= ATTRACTIVE_BF_RANGE[0] - 1 &&
    bodyFatPct <= ATTRACTIVE_BF_RANGE[1] + 1
  );
}