// src/utils/lossRate.ts
//
// WHICH RATE OF LOSS THIS PERSON MAY CHOOSE.
//
// The screen this feeds asks a cutting user how fast they want to lose. The
// reason it needs a calculator behind it rather than two fixed buttons is that
// THE FAST OPTION IS NOT AVAILABLE TO EVERYONE, and whether it is available
// depends on how much fat they are carrying.
//
// ── THE CEILING ──────────────────────────────────────────────────────────────
//
// Alpert 2005 (J Theor Biol 233(1):1-13, PMID 15615615) derived a limit on how
// fast the human fat store can release energy: 290 ± 25 kJ per kg of fat per
// day, from underfed subjects at moderate activity. Past that limit the deficit
// is made up from fat-free mass instead — the paper's own words are that a
// restriction exceeding the fat store's capacity results in an immediate
// decrease in FFM.
//
// So the maximum honest deficit scales with FAT MASS, and a lean person simply
// cannot run the same rate as a heavy one. Worked, at 1% of bodyweight per week:
//
//   90 kg at 25%  needs  990 kcal/day, ceiling 1091  → available
//   75 kg at 18%  needs  825 kcal/day, ceiling  655  → NOT available
//   75 kg at 12%  needs  825 kcal/day, ceiling  437  → NOT available
//
// Two fixed buttons would offer the middle user something their body cannot do.
//
// ── WHICH FIGURE ─────────────────────────────────────────────────────────────
//
// Alpert's published 290 kJ/kg/day is ~69 kcal/kg/day (the "31 kcal per pound"
// widely quoted). A lower figure of roughly 22 kcal/lb (~48 kcal/kg) also
// circulates, usually attributed to Alpert himself having spotted a
// miscalculation and died before republishing.
//
// THAT ATTRIBUTION IS FOLKLORE — an independent review on 18 Aug 2026 traced it
// and found it only on calculator and blog pages, with no erratum, letter,
// archival record or any primary source behind it. It is repeated confidently
// everywhere and originates nowhere.
//
// The lower number is KEPT anyway, and the reason is the direction of error
// rather than the citation. See below.
//
// This file uses the CORRECTED, lower figure. The direction of error decides
// it: offering a rate that is too fast costs lean tissue the user came here to
// keep, while offering one that is too slow costs them time they can choose to
// spend. It is also a theoretical model rather than a measured limit, which is
// a second reason to sit under it rather than on it.
//
// ── WHAT THIS DOES NOT DO ────────────────────────────────────────────────────
//
// It does not ask a rate for a BULK. Muscle-gain rate is capped by the FFMI
// curve and cannot be chosen — a larger surplus buys more FAT alongside the
// same muscle, and that trade is already the route picker (lean / balanced /
// roomy IS "how much fat am I willing to carry while building"). Asking again
// here would duplicate it and imply gains can be bought with food.
//
// It does not ask for a RECOMP either: weight is held, so there is no rate of
// loss to pick.

import type { GoalsProfile, DerivedPhase, CutPace } from './goalsProfile';
import { FAT_LOSS_FRACTION_BW_PER_WEEK } from './roadmap';

/**
 * [B] Energy the fat store can release per kg of fat per day, kcal.
 *
 * 48.5 kcal/kg rather than Alpert's published ~69. NOT because a correction
 * exists — see the header, it does not — but because the direction of error
 * decides it: too fast a rate costs lean tissue the user came here to keep,
 * while too slow costs them time they can choose to spend. The model is
 * theoretical and, as far as the same review could establish, has never been
 * tested as a fat-loss speed limit in a controlled trial, which is a second
 * reason to sit under it rather than on it.
 *
 * So this is a DELIBERATELY CONSERVATIVE CHOICE labelled as one, not a measured
 * value. Do not "correct" it upward to 69 on the grounds that 69 is the
 * published number: 69 is published, and the gate matters most for the leanest
 * users, where being wrong costs muscle.
 */
export const FAT_ENERGY_RELEASE_KCAL_PER_KG_PER_DAY = 48.5;

/** [B] Energy density of adipose tissue. Same 7700 the roadmap uses. */
const KCAL_PER_KG_FAT = 7700;

/**
 * Rates offered, fastest last. The outer two are the bounds Garthe's trial
 * covers and that the roadmap already models; the middle one exists because a
 * two-option screen forces a bigger jump than the evidence requires.
 */
const CANDIDATE_RATES = [0.005, 0.0075, 0.01] as const;

/**
 * [B] A rate slower than the roadmap's slow bound, offered ONLY to someone whose
 * fat mass cannot support even that. Not a recommendation anyone else should
 * see — for a very lean user it is the difference between a rate they can hold
 * and one that eats muscle from the first week.
 */
const SUB_FLOOR_RATE = 0.0035;

export interface RateOption {
  /** Fraction of bodyweight per week, e.g. 0.005. */
  rate: number;
  /** The same as a percentage, for display. */
  ratePct: number;
  kgPerWeek: number;
  /** Daily deficit this rate implies, kcal. */
  deficitKcalPerDay: number;
  /**
   * Roughly what share of the weight lost comes off the lean side at this rate.
   * Mirrors the roadmap's own leanFractionOfLoss so the screen and the timeline
   * cannot disagree about what a faster rate costs.
   */
  leanFractionOfLoss: number;
  recommended: boolean;
}

export type RateApplicability =
  | { applicable: true; options: RateOption[]; ceilingKcalPerDay: number; constrained: boolean }
  | { applicable: false; reason: string };

/**
 * The roadmap's own lean-loss ramp, reproduced here because it is not exported.
 * If that ever changes, this must change with it — the whole point is that the
 * screen quotes the same cost the timeline is computed from.
 */
function leanFractionAt(rate: number): number {
  const [slow, fast] = FAT_LOSS_FRACTION_BW_PER_WEEK;
  if (fast <= slow) return 0;
  const t = Math.min(1, Math.max(0, (rate - slow) / (fast - slow)));
  return 0.1 * t;
}

/** Fat mass in kg, or null when body fat is unknown. */
export function fatMassKg(profile: GoalsProfile): number | null {
  const { currentWeightKg, currentBodyFatPct } = profile;
  if (!currentWeightKg || currentBodyFatPct == null) return null;
  return (currentWeightKg * currentBodyFatPct) / 100;
}

/**
 * The largest daily deficit this person's fat store can supply, kcal.
 * Null when body fat is unknown — the ceiling cannot be guessed from weight
 * alone, because two people at the same weight can differ twofold in fat mass.
 */
export function maxDailyDeficitKcal(profile: GoalsProfile): number | null {
  const fat = fatMassKg(profile);
  if (fat == null || fat <= 0) return null;
  return fat * FAT_ENERGY_RELEASE_KCAL_PER_KG_PER_DAY;
}

/** Daily deficit a given weekly rate implies for this bodyweight, kcal. */
export function deficitForRate(weightKg: number, rate: number): number {
  return (weightKg * rate * KCAL_PER_KG_FAT) / 7;
}

/**
 * Which rates this user may be offered, and which one is recommended.
 *
 * RECOMMENDS THE SLOWEST AVAILABLE, always. Not a hedge: in Garthe 2011 the
 * slow group (0.7%/wk) GAINED lean mass while losing fat, and the fast group
 * (1.4%/wk) merely held it. The faster option exists because the user's time is
 * theirs to spend, not because it is the better choice.
 */
export function rateOptionsFor(
  profile: GoalsProfile,
  phase: DerivedPhase,
): RateApplicability {
  if (phase !== 'cut') {
    return {
      applicable: false,
      reason:
        phase === 'recomp' || phase === 'maintain'
          ? 'Weight is held in this phase, so there is no rate of loss to choose.'
          : 'Muscle is gained at a rate the body sets, not one you pick. How much fat you carry while building is the route choice.',
    };
  }

  const weightKg = profile.currentWeightKg;
  if (!weightKg) return { applicable: false, reason: 'No current weight on file.' };

  const ceiling = maxDailyDeficitKcal(profile);

  // No body fat means no ceiling, so nothing can be verified as safe. Offer the
  // slow rate alone rather than guessing — the same degrade-gracefully rule the
  // rest of the app follows when a measurement is missing.
  if (ceiling == null) {
    const rate = FAT_LOSS_FRACTION_BW_PER_WEEK[0];
    return {
      applicable: true,
      ceilingKcalPerDay: 0,
      constrained: true,
      options: [
        {
          rate,
          ratePct: rate * 100,
          kgPerWeek: weightKg * rate,
          deficitKcalPerDay: deficitForRate(weightKg, rate),
          leanFractionOfLoss: leanFractionAt(rate),
          recommended: true,
        },
      ],
    };
  }

  const build = (rate: number, recommended: boolean): RateOption => ({
    rate,
    ratePct: rate * 100,
    kgPerWeek: weightKg * rate,
    deficitKcalPerDay: deficitForRate(weightKg, rate),
    leanFractionOfLoss: leanFractionAt(rate),
    recommended,
  });

  const affordable = CANDIDATE_RATES.filter(
    (rate) => deficitForRate(weightKg, rate) <= ceiling,
  );

  // Lean enough that even the roadmap's slow bound exceeds what their fat can
  // supply. They still get an option — a slower one — because the alternative
  // is a screen that tells them they may not cut, which is both wrong and
  // unhelpful when their goal says otherwise.
  if (affordable.length === 0) {
    return {
      applicable: true,
      ceilingKcalPerDay: ceiling,
      constrained: true,
      options: [build(SUB_FLOOR_RATE, true)],
    };
  }

  return {
    applicable: true,
    ceilingKcalPerDay: ceiling,
    // Flagged when the fastest rate the app models is off the table, so the
    // screen can say WHY there is only one button rather than looking broken.
    constrained: affordable.length < CANDIDATE_RATES.length,
    options: affordable.map((rate, i) => build(rate, i === 0)),
  };
}

/**
 * The actual rate to use for this user, right now, given their stored
 * preference.
 *
 * THE POINT OF THIS FUNCTION. `rateOptionsFor` decides what a body can
 * currently supply; the preference says which end of that the user wants. Kept
 * apart because the first changes as they lean out and the second does not.
 *
 * Resolved fresh every time rather than read from a stored number, so a
 * 'faster' choice made at 25% body fat cannot hand someone at 14% a rate their
 * fat store cannot supply. If only one rate is available, both preferences
 * return it — which is correct rather than a degradation: there is one honest
 * answer and the user gets it either way.
 *
 * Returns null for phases that have no rate to pick.
 */
export function resolveCutRate(
  profile: GoalsProfile,
  phase: DerivedPhase,
  pace: CutPace = 'steady',
): number | null {
  const result = rateOptionsFor(profile, phase);
  if (!result.applicable || result.options.length === 0) return null;

  if (pace === 'faster') {
    return result.options[result.options.length - 1].rate;
  }
  // 'steady' is the recommended option, which rateOptionsFor always places
  // first and always marks — the slowest available. Garthe's slow group gained
  // lean mass while losing fat; the fast group merely held it.
  const recommended = result.options.find((o) => o.recommended);
  return (recommended ?? result.options[0]).rate;
}

/** The same as a percentage, for storing in `targetRatePercentage`. */
export function resolveCutRatePct(
  profile: GoalsProfile,
  phase: DerivedPhase,
  pace: CutPace = 'steady',
): number | null {
  const rate = resolveCutRate(profile, phase, pace);
  return rate == null ? null : Number((rate * 100).toFixed(2));
}