// src/utils/routeCompletion.ts
//
// Whether the user has actually been through the route flow.
//
// DERIVED, NOT STORED. Nothing in the app records "route completed": lockIn
// writes routePreference onto the profile and appends a roadmap snapshot, and
// neither is ever read as a flag. Adding one would mean a new profile field, a
// migration for everyone who already finished, and a second source of truth
// that can disagree with the answers.
//
// Instead this asks the only question that matters: is every value the flow
// sets present. That is true exactly when someone has been through it, it needs
// no migration, and it self heals — clear a field in Goals and stats and the
// route correctly stops counting as complete.
//
// routePreference is the closest thing to a signature. It is optional on the
// profile and nothing else in the app writes it, so its presence means the user
// reached the route beat and chose.
//
// ── BEAT NUMBERS ARE PART OF RouteScreen'S ORDER ─────────────────────────────
// The numbers below are navigation targets, not labels. When the beats were
// reordered on 13 Aug 2026 this file was not updated, so height sent the user
// to the sex beat, sex to body fat, and every goal beat landed two short. There
// is no test that can catch that, because nothing here type-checks against the
// flow. If you change the order in RouteScreen, change it here, and in
// RouteSummaryScreen's row list.
//
// Current order:
//   1 weight · 2 sex · 3 body fat · 4 height · 5 training state
//   6 previous peak (returning lifters only) · 7 goal weight
//   8 goal body fat · 9 route · 10 summary

import type { GoalsProfile } from './goalsProfile';

/** The first beat after the last question. Reaching it means nothing is left. */
const DONE_BEAT = 10;

/**
 * The fields the beats set, in beat order.
 *
 * trainingState is deliberately ABSENT, and it is the one gap here. The field
 * is non-optional on GoalsProfile and the storage create path defaults it to
 * 'new', so a profile cannot express "not answered yet" — an unanswered user
 * and a genuine beginner are identical on disk. RouteScreen tracks that with
 * its own in-memory flag, which cannot be recovered from the profile later.
 * Checking it here would report every beginner's route as unfinished forever.
 */
export function missingRouteFields(profile: GoalsProfile | null): string[] {
  if (!profile) return ['everything'];
  const missing: string[] = [];
  if (!profile.currentWeightKg || profile.currentWeightKg <= 0) missing.push('weight');
  if (profile.sex == null) missing.push('sex');
  if (profile.currentBodyFatPct == null) missing.push('body fat');
  if (profile.heightCm == null) missing.push('height');
  // The previous peak is NOT a completeness requirement, and the reason is the
  // skip. A returning lifter who does not remember their peak can clear both
  // fields deliberately — that is the honest answer, and splitGap handles it by
  // treating the whole gap as novel tissue.
  //
  // Requiring peakLeanness here meant using the skip guaranteed the route was
  // never complete, which is the exact opposite of what a skip is for: it
  // locked those users out of creating a plan, permanently and silently.
  //
  // Unanswered and answered-as-unknown are indistinguishable on the profile,
  // so this cannot be checked here at all — the same reason trainingState is
  // absent from this list.
  if (profile.goalWeightKg == null) missing.push('goal weight');
  if (profile.goalBodyFatPct == null) missing.push('goal body fat');
  if (profile.routePreference == null) missing.push('route');
  return missing;
}

export function isRouteComplete(profile: GoalsProfile | null): boolean {
  return missingRouteFields(profile).length === 0;
}

/**
 * The beat to resume at when a route is started but unfinished: the first one
 * whose answer is missing. Sending a half finished user back to beat 1 makes
 * them re-answer things they already gave.
 */
export function firstUnansweredBeat(profile: GoalsProfile | null): number {
  if (!profile) return 1;
  if (!profile.currentWeightKg || profile.currentWeightKg <= 0) return 1;
  if (profile.sex == null) return 2;
  if (profile.currentBodyFatPct == null) return 3;
  if (profile.heightCm == null) return 4;
  // Resume AT the peak beat for a returning lifter who has not answered it, so
  // an interrupted user lands on the question rather than past it — but it is
  // not a completeness requirement (see missingRouteFields), so someone who
  // skipped it deliberately is not sent back here by isRouteComplete.
  if (
    profile.trainingState === 'returning' &&
    profile.peakWeightKg == null &&
    profile.peakLeanness == null &&
    profile.goalWeightKg == null
  ) {
    return 6;
  }
  if (profile.goalWeightKg == null) return 7;
  if (profile.goalBodyFatPct == null) return 8;
  if (profile.routePreference == null) return 9;
  return DONE_BEAT;
}