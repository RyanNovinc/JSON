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
// Storage shape: a JSON string[] of favourite entries, newest-first. Each entry
// is either:
//   - "slug::plateId"  → a specific plating of a recipe (current format), or
//   - "slug"           → a legacy whole-recipe favourite (pre plate support).
//
// We store identifiers only (not denormalised meal data) so consumers always
// read fresh details from CURATED_MEALS — no stale copies. Legacy bare-slug
// entries keep working: parseEntry leaves plateId undefined and consumers fall
// back to the recipe's first/default plate.
//
// Follows the same RobustStorage-with-AsyncStorage-fallback pattern used by
// favoriteExercises elsewhere in the app.
// ============================================================================

const STORAGE_KEY = 'recipeFavorites';
const SEP = '::';

export type FavoriteRef = { slug: string; plateId?: string };

function parseEntry(entry: string): FavoriteRef {
  const i = entry.indexOf(SEP);
  if (i === -1) return { slug: entry };
  return { slug: entry.slice(0, i), plateId: entry.slice(i + SEP.length) };
}

function makeEntry(slug: string, plateId?: string): string {
  return plateId ? `${slug}${SEP}${plateId}` : slug;
}

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

async function writeRaw(entries: string[]): Promise<void> {
  const json = JSON.stringify(entries);
  const ok = await RobustStorage.setItem(STORAGE_KEY, json, true);
  if (!ok) await AsyncStorage.setItem(STORAGE_KEY, json);
}

// ---------------------------------------------------------------------------
// Plate-aware API (current)
// ---------------------------------------------------------------------------

/** All favourites, parsed into {slug, plateId?}, newest-first. */
export async function loadFavorites(): Promise<FavoriteRef[]> {
  return (await readRaw()).map(parseEntry);
}

/** Is this exact plating favourited? (plateId omitted → matches a legacy bare slug). */
export async function isPlateFavorite(slug: string, plateId?: string): Promise<boolean> {
  return (await readRaw()).includes(makeEntry(slug, plateId));
}

/** Add a plating (no-op if already present). Returns updated entries. */
export async function addPlateFavorite(slug: string, plateId?: string): Promise<string[]> {
  const key = makeEntry(slug, plateId);
  const all = await readRaw();
  if (!all.includes(key)) all.unshift(key); // newest-first
  await writeRaw(all);
  return all;
}

/** Remove a plating. Returns updated entries. */
export async function removePlateFavorite(slug: string, plateId?: string): Promise<string[]> {
  const key = makeEntry(slug, plateId);
  const all = (await readRaw()).filter((e) => e !== key);
  await writeRaw(all);
  return all;
}

/** Toggle a plating. Returns the NEW favourited state (true = now saved). */
export async function togglePlateFavorite(slug: string, plateId?: string): Promise<boolean> {
  const key = makeEntry(slug, plateId);
  const all = await readRaw();
  if (all.includes(key)) {
    await writeRaw(all.filter((e) => e !== key));
    return false;
  }
  all.unshift(key);
  await writeRaw(all);
  return true;
}

// ---------------------------------------------------------------------------
// Legacy slug-only API (kept for back-compat with existing callers such as the
// Library screen, which lists one entry per favourited recipe).
// ---------------------------------------------------------------------------

/** Unique favourited slugs, newest-first (collapses multiple platings of a recipe). */
export async function loadFavoriteSlugs(): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of await readRaw()) {
    const { slug } = parseEntry(entry);
    if (!seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

/** Is this recipe favourited in ANY plating (or as a legacy bare slug)? */
export async function isRecipeFavorite(slug: string): Promise<boolean> {
  return (await readRaw()).some((entry) => parseEntry(entry).slug === slug);
}

/** Add a bare-slug (whole recipe) favourite. Returns updated entries. */
export async function addRecipeFavorite(slug: string): Promise<string[]> {
  return addPlateFavorite(slug, undefined);
}

/** Remove ALL favourites for a recipe (every plating + any legacy bare slug). */
export async function removeRecipeFavorite(slug: string): Promise<string[]> {
  const all = (await readRaw()).filter((entry) => parseEntry(entry).slug !== slug);
  await writeRaw(all);
  return all;
}

/** Toggle a bare-slug (whole recipe) favourite. Returns the NEW state. */
export async function toggleRecipeFavorite(slug: string): Promise<boolean> {
  return togglePlateFavorite(slug, undefined);
}

export const RecipeFavorites = {
  // plate-aware
  loadFavorites,
  isPlateFavorite,
  addPlateFavorite,
  removePlateFavorite,
  togglePlateFavorite,
  // legacy slug-only
  loadFavoriteSlugs,
  isRecipeFavorite,
  addRecipeFavorite,
  removeRecipeFavorite,
  toggleRecipeFavorite,
};

export default RecipeFavorites;