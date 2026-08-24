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
//   1 weight · 2 sex · 3 body fat · 4 height
//   7 goal weight · 8 goal body fat · 9 route · 10 summary
//
// BEATS 5 AND 6 ARE DELIBERATE GAPS, 24 Aug 2026. 6 asked a returning lifter
// for their previous training peak, which fed the regain credit that has now
// been removed (see roadmap.ts). 5 asked trainingState and existed as the gate
// for 6, so it went too. The remaining beats keep their numbers rather than
// closing up, because 9 and 10 are referenced as literals in RouteScreen's
// write gates and in helpFor(9). Renumbering would touch every one of those for
// a cosmetic gain and is exactly the kind of change the note above records
// going wrong on 13 Aug.

import type { GoalsProfile } from './goalsProfile';

/** The first beat after the last question. Reaching it means nothing is left. */
const DONE_BEAT = 10;

/**
 * The fields the beats set, in beat order.
 *
 * trainingState is deliberately ABSENT. It used to be absent because the field
 * could not express "not answered yet"; since 24 Aug 2026 it is absent because
 * NOTHING ASKS IT. Every profile carries the storage create-path default, so
 * checking it here would be checking a constant.
 */
export function missingRouteFields(profile: GoalsProfile | null): string[] {
  if (!profile) return ['everything'];
  const missing: string[] = [];
  if (!profile.currentWeightKg || profile.currentWeightKg <= 0) missing.push('weight');
  if (profile.sex == null) missing.push('sex');
  if (profile.currentBodyFatPct == null) missing.push('body fat');
  if (profile.heightCm == null) missing.push('height');
  // Beats 5 and 6 were removed on 24 Aug 2026, so there is nothing to check
  // between height and goal weight. Worth keeping the lesson beat 6 left: the
  // peak was never a completeness requirement, because a returning lifter who
  // did not remember it could clear both fields deliberately, and requiring
  // them meant using the skip locked those users out of a plan permanently and
  // silently.
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
  // 5 and 6 no longer exist; the numbering skips them deliberately rather than
  // closing up.
  if (profile.goalWeightKg == null) return 7;
  if (profile.goalBodyFatPct == null) return 8;
  if (profile.routePreference == null) return 9;
  return DONE_BEAT;
}