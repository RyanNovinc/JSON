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
 * The body-fat range within which gaining and trimming phases cycle.
 *
 * ── WHAT EACH NUMBER RESTS ON, reviewed 17 Aug 2026 ─────────────────────────
 *
 * CEILINGS — [B] convention. There is no partitioning ceiling at any value.
 *
 * TWO SOURCES, AND THEY ARE NOT OF EQUAL STANDING. An independent review on
 * 18 Aug 2026 caught this file citing them as though they were.
 *
 * PEER REVIEWED — Galgani et al. 2025, J Clin Endocrinol Metab 110(12):e4038,
 * doi 10.1210/clinem/dgaf247. 34 men, 8 weeks at 140% of measured maintenance,
 * DXA: baseline body fat did NOT significantly predict fat-free mass gain
 * (r = 0.26, p = .139), while it DID predict fat gain (r = 0.59). This claim
 * stands on that paper alone and does not need the one below.
 *
 * NOT A PAPER — Trexler and Nuckols pooled participant data from seven
 * longitudinal resistance-training studies spanning under 5% to over 50%
 * baseline body fat and reported virtually no effect on fat-free mass gains
 * (slope 0.0045, p = 0.797), with the one significant relationship pointing the
 * OPPOSITE way to the hypothesis. That analysis lives in MASS / Stronger by
 * Science and is NOT indexed. It is an informed practitioner argument that
 * happens to agree with Galgani. Cite it as that, never as published evidence.
 *
 * Hall's 2007 paper carries a referee's note saying that once the anorexic
 * subjects were removed there was insufficient evidence of a relationship.
 *
 * So the ceiling is NOT "above here you stop building muscle efficiently".
 * The two honest reasons that survive: every point above the floor is fat a
 * later trim has to remove, which is calendar time; and users have a leanness
 * they will live at. Both are cycle management. Neither is physiology.
 *
 * FLOORS (male) — [B] preference plus margin. The real binding constraint at
 * the lean end is not here at all: it is the Alpert fat-mass transfer gate in
 * lossRate.ts, which refuses fast cuts well above 12% because a small fat mass
 * cannot supply a normal deficit without the difference coming off lean
 * tissue. Floor and cut-rate gate are the same constraint seen twice.
 *
 * WIDTHS — [B] preference. No controlled evidence favours deep-and-rare over
 * shallow-and-frequent at matched deficit. The nearest trial (ICECAP, Peos
 * 2021, 61 resistance-trained adults) found intermittent and continuous
 * restriction identical on strength, hormones, sleep and fat-free mass — but
 * the intermittent arm reported lower hunger and greater satisfaction. So if
 * anything the narrow band is the easier one to live with.
 *
 * ── FEMALE FLOORS RAISED 2 POINTS, 17 Aug 2026 ─────────────────────────────
 *
 * Were 20 / 20 / 22, derived by the +9 convention. The convention itself is
 * corroborated — Mursu and Hulmi measured off-season DXA in drug-tested IFBB
 * physique athletes at 14.9% (male) and 23.4% (female), a gap of 8.5 points —
 * but +9 applied to a male floor of 12 lands women at 20, and that is the
 * problem.
 *
 * Roughly 20% is the classic figure for MAINTAINING menstrual function, and
 * 23% is where menstrual RECOVERY is documented in clinical populations. A
 * floor of 20 therefore asked women to return, repeatedly and by design, to
 * the edge of that line. In the same Finnish cohort, 27% of female physique
 * athletes had amenorrhea against zero gym enthusiasts, and it tracked BODY
 * FAT PERCENTAGE rather than energy availability — so it is not a problem the
 * deficit cap already solves.
 *
 * Floors only. Ceilings stay where they are: they carry no evidence in either
 * direction, and raising them would just add fat a later trim has to remove.
 * The bands are correspondingly narrower for women, which ICECAP suggests is
 * the easier side to err on.
 *
 * Caveats, stated because the change rests on them: cross-sectional,
 * self-reported menstrual status, 22 women in that subgroup, one national
 * cohort. This is a margin-of-safety decision, not a demonstrated threshold.
 */
export const OPERATING_BANDS: Record<
  RoutePreference,
  { male: [number, number]; female: [number, number]; cycles: number }
> = {
  lean: { male: [12, 15], female: [22, 24], cycles: 6 },
  balanced: { male: [12, 18], female: [22, 27], cycles: 4 },
  roomy: { male: [14, 18], female: [24, 27], cycles: 3 },
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
 * THE LEANEST BODY FAT THE APP WILL PLAN A USER DOWN TO, by sex.
 *
 * Derived from the bands rather than typed again: it is the lowest floor any
 * route offers, so it cannot drift from them. Male 12, female 22.
 *
 * ── WHY THIS IS NOT THE ALPERT GATE, 20 Aug 2026 ────────────────────────────
 *
 * The header above says the real constraint at the lean end is the fat-mass
 * transfer gate in lossRate.ts. That is true about the CONSTRAINT and turns out
 * to be useless as a STOP, because the gate solves in closed form and the
 * bodyweight cancels:
 *
 *   deficit needed = w × rate × 7700 / 7
 *   ceiling        = w × (bf/100) × 48.5
 *
 * Setting them equal gives bf = 100 × (rate × 7700 / 7) / 48.5, with no w in
 * it. At the app's slow bound of 0.5%/wk that is 11.34% for every person alive;
 * at 1%/wk it is 22.68%, which is why the fast option disappears for lean
 * users.
 *
 * Two consequences. It is SEX BLIND, so using it as the stop would take women
 * from 22 to 11.34 and throw away the menstrual-function margin this file
 * raised the female floors for. And for men it buys 0.66 of a point against the
 * 12 already here. So the gate belongs in the EXPLANATION shown when someone
 * reaches the stop, and the stop itself stays sex-based.
 *
 * roadmap.ts cannot import lossRate.ts to ask anyway: lossRate imports
 * FAT_LOSS_FRACTION_BW_PER_WEEK from roadmap, so the dependency only runs one
 * way and reversing it is a Metro cycle.
 */
export const leanStopFor = (sex?: Sex): number =>
  Math.min(
    ...(Object.keys(OPERATING_BANDS) as RoutePreference[]).map(
      (r) => bandFor(r, sex).floor,
    ),
  );

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