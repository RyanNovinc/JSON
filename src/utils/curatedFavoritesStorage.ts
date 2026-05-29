// src/utils/curatedFavoritesStorage.ts
//
// Standalone store for the user's "Foods you like" taste profile:
//   - curated meal SLUGS tapped in the picker grid
//   - liked CUISINES (broad, from the CuisineType master list)
//   - foods to AVOID (free text, comma-separated -> array)
//   - specific liked DISHES not in the catalogue (free text -> array)
//
// Independent of the questionnaire draft and of legacy @nutrition_favorites.
// Optional: the user can change any of this any time without re-running the
// core flow. The meal-plan prompt builder reads this key directly.
//
// Slugs resolve against https://json.fit/curated-meals/instructions.md (exact
// recipes). Cuisines / avoid / dishes feed the AI's general knowledge as
// plain text — no slug, no DB lookup.
//
// BACKWARD COMPAT: an earlier version stored a bare string[] of slugs. load()
// detects that shape and migrates it into the object form in memory, so old
// saves keep working.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nutrition_curated_favorites';

export interface CuratedFavorites {
  slugs: string[];
  cuisines: string[];
  avoid: string[];
  likedDishes: string[];
}

const EMPTY: CuratedFavorites = {
  slugs: [],
  cuisines: [],
  avoid: [],
  likedDishes: [],
};

const cleanStrings = (v: any): string[] =>
  Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim().length > 0) : [];

export async function loadCuratedFavorites(): Promise<CuratedFavorites> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw);

    // Legacy shape: a bare array of slugs.
    if (Array.isArray(parsed)) {
      return { ...EMPTY, slugs: cleanStrings(parsed) };
    }

    // Current object shape.
    return {
      slugs: cleanStrings(parsed?.slugs),
      cuisines: cleanStrings(parsed?.cuisines),
      avoid: cleanStrings(parsed?.avoid),
      likedDishes: cleanStrings(parsed?.likedDishes),
    };
  } catch (e) {
    console.error('loadCuratedFavorites failed', e);
    return { ...EMPTY };
  }
}

export async function saveCuratedFavorites(fav: CuratedFavorites): Promise<void> {
  try {
    const payload: CuratedFavorites = {
      slugs: Array.from(new Set(cleanStrings(fav.slugs))),
      cuisines: Array.from(new Set(cleanStrings(fav.cuisines))),
      avoid: Array.from(new Set(cleanStrings(fav.avoid))),
      likedDishes: Array.from(new Set(cleanStrings(fav.likedDishes))),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('saveCuratedFavorites failed', e);
  }
}

export async function clearCuratedFavorites(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.error('clearCuratedFavorites failed', e);
  }
}

// True if the user has provided ANY taste-profile signal. Used by the Summary
// card to show a count / "set" state.
export function favoritesCount(fav: CuratedFavorites): number {
  return (
    fav.slugs.length + fav.cuisines.length + fav.avoid.length + fav.likedDishes.length
  );
}