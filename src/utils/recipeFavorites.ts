import AsyncStorage from '@react-native-async-storage/async-storage';
import RobustStorage from './robustStorage';

// ============================================================================
// Recipe favourites — browse-time "heart this recipe to find it later".
//
// IMPORTANT: this is deliberately SEPARATE from `curatedFavoritesStorage`,
// which backs the questionnaire's food-preference picker. Mixing the two would
// mean hearting a recipe while browsing silently changes the inputs to plan
// generation. Keep them apart.
//
// Storage shape: a JSON string[] of CuratedMeal slugs, newest-first.
// We store slugs only (not denormalised meal data) so the Library always reads
// fresh meal details from CURATED_MEALS — no stale copies.
//
// Follows the same RobustStorage-with-AsyncStorage-fallback pattern used by
// favoriteExercises elsewhere in the app.
// ============================================================================

const STORAGE_KEY = 'recipeFavorites';

async function readRaw(): Promise<string[]> {
  try {
    const raw =
      (await RobustStorage.getItem(STORAGE_KEY, true)) ??
      (await AsyncStorage.getItem(STORAGE_KEY));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch (error) {
    console.error('Failed to load recipe favourites:', error);
    return [];
  }
}

async function writeRaw(slugs: string[]): Promise<void> {
  const json = JSON.stringify(slugs);
  const ok = await RobustStorage.setItem(STORAGE_KEY, json, true);
  if (!ok) await AsyncStorage.setItem(STORAGE_KEY, json);
}

/** All favourited slugs, newest-first. */
export async function loadFavoriteSlugs(): Promise<string[]> {
  return readRaw();
}

/** Is this slug currently favourited? */
export async function isRecipeFavorite(slug: string): Promise<boolean> {
  const all = await readRaw();
  return all.includes(slug);
}

/** Add a slug (no-op if already present). Returns the updated list. */
export async function addRecipeFavorite(slug: string): Promise<string[]> {
  const all = await readRaw();
  if (!all.includes(slug)) all.unshift(slug); // newest-first
  await writeRaw(all);
  return all;
}

/** Remove a slug. Returns the updated list. */
export async function removeRecipeFavorite(slug: string): Promise<string[]> {
  const all = (await readRaw()).filter((s) => s !== slug);
  await writeRaw(all);
  return all;
}

/** Toggle a slug. Returns the NEW favourited state (true = now saved). */
export async function toggleRecipeFavorite(slug: string): Promise<boolean> {
  const all = await readRaw();
  if (all.includes(slug)) {
    await writeRaw(all.filter((s) => s !== slug));
    return false;
  }
  all.unshift(slug);
  await writeRaw(all);
  return true;
}

export const RecipeFavorites = {
  loadFavoriteSlugs,
  isRecipeFavorite,
  addRecipeFavorite,
  removeRecipeFavorite,
  toggleRecipeFavorite,
};

export default RecipeFavorites;