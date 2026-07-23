import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/**
 * Shared app-review state.
 *
 * Two prompt surfaces read this module:
 *  - the import feedback modal (legacy, `shouldPromptReview`)
 *  - the cook-mode completion screen (native StoreReview, `shouldPromptForCookReview`)
 *
 * They share `lastReviewPrompt` / `reviewPromptVersion`, so a prompt on either
 * surface silences BOTH for the cooldown — the point is to never spam a user who
 * has likely already rated.
 */

const KEYS = {
  importCount: 'importCount',
  lastReviewPrompt: 'lastReviewPrompt',
  reviewPromptVersion: 'reviewPromptVersion',
  /** Set once the user taps through to the store from any manual rate link. Never cleared. */
  ratingEngaged: 'ratingEngaged',
  cookCompletions: 'cookCompletions',
} as const;

const COOLDOWN_MS = 1000 * 60 * 60 * 24 * 120; // 120 days

const currentVersion = () => Constants.expoConfig?.version ?? '';

async function readNumber(key: string): Promise<number> {
  return Number(await AsyncStorage.getItem(key)) || 0;
}

/** True once the 120-day cooldown since the last prompt attempt has elapsed. */
async function cooldownElapsed(): Promise<boolean> {
  const last = await readNumber(KEYS.lastReviewPrompt);
  return Date.now() - last > COOLDOWN_MS;
}

/** True when we have not already prompted on this app version. */
async function isNewVersion(): Promise<boolean> {
  const promptedVer = await AsyncStorage.getItem(KEYS.reviewPromptVersion);
  return promptedVer !== currentVersion();
}

// ============================================================================
// Import surface (existing behaviour — unchanged)
// ============================================================================

export async function recordImport() {
  const count = await readNumber(KEYS.importCount);
  await AsyncStorage.setItem(KEYS.importCount, String(count + 1));
}

export async function shouldPromptReview() {
  const count = await readNumber(KEYS.importCount);
  const enoughUsage = count >= 3;
  const coolOff = await cooldownElapsed();
  const newVersion = await isNewVersion();
  return enoughUsage && coolOff && newVersion;
}

// ============================================================================
// Shared state
// ============================================================================

/**
 * Records that the user tapped through to the store from a manual rate link.
 * They have likely rated, so we never fire an automatic prompt again — this
 * flag is write-once and is never cleared.
 */
export async function markRatingEngaged() {
  await AsyncStorage.setItem(KEYS.ratingEngaged, 'true');
}

export async function hasRatingEngaged(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.ratingEngaged)) === 'true';
}

export async function incrementCookCompletions() {
  const count = await readNumber(KEYS.cookCompletions);
  await AsyncStorage.setItem(KEYS.cookCompletions, String(count + 1));
}

export async function getCookCompletions(): Promise<number> {
  return readNumber(KEYS.cookCompletions);
}

/**
 * Stamps a prompt ATTEMPT — the cooldown starts now.
 *
 * With the native review API we get no signal about whether the system actually
 * showed the dialog (iOS silently no-ops when its own quota is spent), so we
 * deliberately record the attempt rather than the display. Spending the cooldown
 * on an attempt that the OS swallowed is the safe failure mode; the alternative
 * would re-ask on every eligible completion.
 */
export async function markReviewAttempt() {
  await AsyncStorage.setItem(KEYS.lastReviewPrompt, String(Date.now()));
  await AsyncStorage.setItem(KEYS.reviewPromptVersion, currentVersion());
}

/** @deprecated Use {@link markReviewAttempt}. Kept for the import feedback flow. */
export const markReviewPrompted = markReviewAttempt;

// ============================================================================
// Cook-mode surface
// ============================================================================

/**
 * Gate for the native review prompt on the recipe completion screen.
 * All four conditions must hold:
 *  - the user has never tapped a manual rate link
 *  - they have finished cooking at least twice
 *  - the 120-day cooldown since the last prompt attempt has elapsed
 *  - we have not already prompted on this app version
 */
export async function shouldPromptForCookReview(): Promise<boolean> {
  if (await hasRatingEngaged()) return false;
  const completions = await readNumber(KEYS.cookCompletions);
  if (completions < 2) return false;
  if (!(await cooldownElapsed())) return false;
  return isNewVersion();
}
