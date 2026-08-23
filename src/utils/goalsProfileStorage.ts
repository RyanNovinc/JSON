import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoalsProfile, TrainingState, Sex, RoutePreference, BodyFatSource, ActivityLevel } from './goalsProfile';

const KEY = '@goals_profile';

// ── Plausible ranges ────────────────────────────────────────────────────────
// GoalsIntakeScreen validates these at the input, but that only protects data
// written AFTER that fix shipped, and only through that one screen. A real
// stored profile came back with currentBodyFatPct: 183 — the user's height,
// typed into a four-character body-fat box that accepted anything.
//
// That number is not inert. computeMacrosPhaseAware uses body fat to cap the
// cutting deficit, and derivePhase uses goal weight for direction, so a typo
// here silently rewrites someone's calorie target for every plan they generate.
// Worse, it fails quietly: 183 happens to trip the ">= 20% body fat" branch, so
// the profile still produces a plausible-looking cut and nothing ever errors.
//
// So the guard lives HERE, at the storage boundary, where it covers every
// reader and writer including ones that don't exist yet. Ranges are generous on
// purpose: the job is to reject a value that cannot describe a human, not to
// police who is allowed to use the app.
export const BODY_FAT_MIN = 3;
export const BODY_FAT_MAX = 60;
export const WEIGHT_KG_MIN = 30;
export const WEIGHT_KG_MAX = 300;

// Same principle for the shared intake fields. These are plausibility guards,
// not eligibility rules — the floor on age exists so that a mistyped "1" or a
// height entered into the age box gets rejected, not to decide who may use the
// app. Whether the app should PLAN a calorie deficit for a young teenager is a
// separate product decision and does not belong in a sanitiser.
export const HEIGHT_CM_MIN = 120;
export const HEIGHT_CM_MAX = 250;
export const AGE_MIN = 13;
export const AGE_MAX = 100;

const TRAINING_STATES: TrainingState[] = ['new', 'returning', 'consistent', 'advanced'];
const SEXES: Sex[] = ['male', 'female', 'prefer_not_to_say'];
const ROUTE_PREFERENCES: RoutePreference[] = ['lean', 'balanced', 'roomy'];
const BODY_FAT_SOURCES: BodyFatSource[] = ['reported', 'visual', 'tape'];
const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'heavy', 'extreme'];

const inRange = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/**
 * Drop any field that cannot be true, leaving the rest intact.
 *
 * Optional fields are dropped rather than clamped. Clamping 183% down to 60%
 * would invent a body fat reading the user never gave and keep steering their
 * macros with it; dropping it makes the app fall back to the same behaviour as
 * someone who left the field blank, which is a state it already handles well.
 *
 * currentWeightKg is required, so an impossible value is zeroed instead —
 * hasGoalsProfile() already treats `currentWeightKg > 0` as the completeness
 * gate, so this routes the user back through intake rather than silently
 * planning around a bad number.
 *
 * Returns the profile plus whether anything changed, so callers can decide
 * whether the repair is worth persisting.
 */
export function sanitizeGoalsProfile(
  raw: GoalsProfile
): { profile: GoalsProfile; repaired: boolean } {
  const clean: GoalsProfile = { ...raw };
  let repaired = false;

  if (!inRange(clean.currentWeightKg, WEIGHT_KG_MIN, WEIGHT_KG_MAX)) {
    if (clean.currentWeightKg !== 0) repaired = true;
    clean.currentWeightKg = 0;
  }

  if (clean.currentBodyFatPct != null && !inRange(clean.currentBodyFatPct, BODY_FAT_MIN, BODY_FAT_MAX)) {
    delete clean.currentBodyFatPct;
    repaired = true;
  }

  if (clean.goalBodyFatPct != null && !inRange(clean.goalBodyFatPct, BODY_FAT_MIN, BODY_FAT_MAX)) {
    delete clean.goalBodyFatPct;
    repaired = true;
  }

  if (clean.goalWeightKg != null && !inRange(clean.goalWeightKg, WEIGHT_KG_MIN, WEIGHT_KG_MAX)) {
    delete clean.goalWeightKg;
    repaired = true;
  }

  if (!clean.trainingState || !TRAINING_STATES.includes(clean.trainingState)) {
    clean.trainingState = 'new';
    if (raw.trainingState !== 'new') repaired = true;
  }

  // ── Shared intake fields ───────────────────────────────────────────────────
  // All optional, so the rule is the same as currentBodyFatPct: an implausible
  // value is DROPPED, never clamped or defaulted. A dropped height means no
  // FFMI plausibility check, which is a state every consumer already has to
  // handle for profiles written before these fields existed. A clamped one
  // would invent a measurement the user never gave and quietly plan around it.

  if (clean.sex != null && !SEXES.includes(clean.sex)) {
    delete clean.sex;
    repaired = true;
  }

  if (clean.ageYears != null && !inRange(clean.ageYears, AGE_MIN, AGE_MAX)) {
    delete clean.ageYears;
    repaired = true;
  }

  if (clean.heightCm != null && !inRange(clean.heightCm, HEIGHT_CM_MIN, HEIGHT_CM_MAX)) {
    delete clean.heightCm;
    repaired = true;
  }

  // peakWeightKg and peakLeanness were validated here until 24 Aug 2026, when
  // the regain credit they fed was removed. Profiles written before that still
  // carry both keys; they are now unknown fields that no reader consults, and
  // the spread in sanitizeGoalsProfile carries them through untouched. That is
  // the same treatment legacy routePreference values get, and it costs nothing
  // — deleting them would mean a migration for two fields nothing reads.

  if (clean.routePreference != null && !ROUTE_PREFERENCES.includes(clean.routePreference)) {
    delete clean.routePreference;
    repaired = true;
  }

  if (clean.bodyFatSource != null && !BODY_FAT_SOURCES.includes(clean.bodyFatSource)) {
    delete clean.bodyFatSource;
    repaired = true;
  }

  if (clean.activityLevel != null && !ACTIVITY_LEVELS.includes(clean.activityLevel)) {
    delete clean.activityLevel;
    repaired = true;
  }

  // Provenance without a reading describes nothing. Same orphan rule the peak
  // fields used to follow — and note the reverse is fine: a body fat from before this
  // field existed simply has no source, which readers must handle anyway.
  if (clean.bodyFatSource != null && clean.currentBodyFatPct == null) {
    delete clean.bodyFatSource;
    repaired = true;
  }

  return { profile: clean, repaired };
}

export async function loadGoalsProfile(): Promise<GoalsProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;

    const { profile, repaired } = sanitizeGoalsProfile(JSON.parse(raw) as GoalsProfile);

    // Self-repair: a profile corrupted before the input validation existed gets
    // cleaned the first time it is read, so it stops poisoning macro derivation
    // without the user having to redo intake. Fire and forget — the caller
    // already has the clean copy in hand, so a failed write only means we try
    // again next load.
    if (repaired) {
      console.warn('[goalsProfile] repaired out-of-range fields on load', {
        before: JSON.parse(raw),
        after: profile,
      });
      AsyncStorage.setItem(KEY, JSON.stringify(profile)).catch(() => {});
    }

    return profile;
  } catch (e) {
    console.error('loadGoalsProfile failed', e);
    return null;
  }
}

export async function saveGoalsProfile(profile: GoalsProfile): Promise<void> {
  try {
    // Sanitise on the way in too, so a writer that skips the intake screen's
    // validation still can't put an impossible number into storage.
    const { profile: clean } = sanitizeGoalsProfile(profile);
    await AsyncStorage.setItem(KEY, JSON.stringify(clean));
  } catch (e) {
    console.error('saveGoalsProfile failed', e);
  }
}

// Falls back to a minimal default profile when none exists yet, so this
// also works as the create path for a user editing Goals & Stats before
// ever completing the onboarding gate.
export async function updateGoalsProfileField<K extends keyof GoalsProfile>(
  field: K,
  value: GoalsProfile[K]
): Promise<void> {
  const current = await loadGoalsProfile();
  const base: GoalsProfile = current ?? { currentWeightKg: 0, trainingState: 'new' };
  await saveGoalsProfile({ ...base, [field]: value });
}

export async function clearGoalsProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.error('clearGoalsProfile failed', e);
  }
}

// Returns true only when the minimum required fields are present.
// goalBodyFatPct, goalWeightKg, and currentBodyFatPct are all optional.
export async function hasGoalsProfile(): Promise<boolean> {
  const profile = await loadGoalsProfile();
  return profile != null && profile.currentWeightKg > 0 && !!profile.trainingState;
}