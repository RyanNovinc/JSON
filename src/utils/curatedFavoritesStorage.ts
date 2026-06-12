// src/utils/curatedFavoritesStorage.ts
//
// Standalone store for the user's "Foods you like" taste profile.
//
// V2 (slot-scoped picks):
//   - picks: Array<{ slot, slug, plate_id? }> — the tab the user was on at
//     tap time IS the slot. Picking Butter Chicken under Lunch says nothing
//     about Dinner; the same meal can be picked independently in both.
//   - slugs: kept as a LEGACY MIRROR — the unique BASE slugs derived from
//     picks — so the live prompt builder (which reads `slugs` and expects
//     bare slugs it can resolve against json.fit) keeps working unchanged
//     until the builder rebuild ships. Never write plate-composite keys
//     ("slug:plateId") into this array.
//   - cuisines / avoid / likedDishes unchanged (free-text taste context).
//
// Lunch↔dinner interchangeability is a SCHEDULING-time relaxation granted in
// the prompt (and the feasibility engine's borrow group) — it is not encoded
// here. Storage records what the user actually said, per slot.
//
// BACKWARD COMPAT (read): three shapes can exist on disk —
//   1. bare string[] of slugs        (oldest)
//   2. { slugs, cuisines, ... }      (V1 object)
//   3. { version: 2, picks, slugs, cuisines, ... }
// loadCuratedFavoritesV2 normalises all three. V1 shapes return picks: [];
// the picker screen hydrates legacy slugs into every eligible tab once, and
// the user prunes. Composite keys that leaked into V1 `slugs` (an interim
// screen build wrote plate keys there) are normalised to base slugs on read.
//
// BACKWARD COMPAT (write): saveCuratedFavorites (V1 signature) still works
// for old callers — it read-modify-writes, reconciling stored picks against
// the new slug set (picks whose slug was removed are dropped; picks are
// otherwise preserved).

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@nutrition_curated_favorites';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanSlot =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'dessert'
  | 'brunch'
  | 'second_lunch'
  | 'early_dinner'
  | 'pre_workout'
  | 'post_workout'
  | 'morning_snack'
  | 'afternoon_snack'
  | 'evening_snack';

export interface SlotPick {
  /** Tab context at tap time. */
  slot: PlanSlot;
  slug: string;
  /** Absent = bare-slug pick: the AI may choose among the meal's plates. */
  plate_id?: string;
}

/** V1 view — what legacy callers (summary card, live prompt builder) read. */
export interface CuratedFavorites {
  slugs: string[];
  cuisines: string[];
  avoid: string[];
  likedDishes: string[];
}

export interface CuratedFavoritesV2 extends CuratedFavorites {
  version: 2;
  picks: SlotPick[];
}

const EMPTY_V2: CuratedFavoritesV2 = {
  version: 2,
  picks: [],
  slugs: [],
  cuisines: [],
  avoid: [],
  likedDishes: [],
};

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const cleanStrings = (v: any): string[] =>
  Array.isArray(v)
    ? v.filter((s) => typeof s === 'string' && s.trim().length > 0)
    : [];

/** "slug:plateId" → "slug"; bare slugs pass through. */
const baseSlug = (s: string): string => {
  const i = s.indexOf(':');
  return i === -1 ? s : s.slice(0, i);
};

const uniqueBaseSlugs = (slugs: string[]): string[] =>
  Array.from(new Set(slugs.map(baseSlug)));

const cleanPicks = (v: any): SlotPick[] => {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: SlotPick[] = [];
  for (const p of v) {
    if (!p || typeof p.slot !== 'string' || typeof p.slug !== 'string') continue;
    if (!p.slot.trim() || !p.slug.trim()) continue;
    const plateId =
      typeof p.plate_id === 'string' && p.plate_id.trim().length > 0
        ? p.plate_id
        : undefined;
    const id = `${p.slot}|${p.slug}:${plateId ?? ''}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(
      plateId
        ? { slot: p.slot as PlanSlot, slug: p.slug, plate_id: plateId }
        : { slot: p.slot as PlanSlot, slug: p.slug }
    );
  }
  return out;
};

/** Derive the legacy mirror from picks (bare base slugs, unique). */
const mirrorSlugs = (picks: SlotPick[]): string[] =>
  Array.from(new Set(picks.map((p) => p.slug)));

// ---------------------------------------------------------------------------
// V2 API
// ---------------------------------------------------------------------------

export async function loadCuratedFavoritesV2(): Promise<CuratedFavoritesV2> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY_V2 };
    const parsed = JSON.parse(raw);

    // Oldest shape: a bare array of slugs.
    if (Array.isArray(parsed)) {
      return {
        ...EMPTY_V2,
        slugs: uniqueBaseSlugs(cleanStrings(parsed)),
      };
    }

    const picks = cleanPicks(parsed?.picks);
    const storedSlugs = uniqueBaseSlugs(cleanStrings(parsed?.slugs));
    return {
      version: 2,
      picks,
      // The mirror is the union: slugs derived from picks PLUS any stored
      // slugs beyond them. Extras can only come from V1-API saves (slot-less
      // additions) — they ride the mirror until the picker hydrates them.
      slugs: Array.from(new Set([...picks.map((p) => p.slug), ...storedSlugs])),
      cuisines: cleanStrings(parsed?.cuisines),
      avoid: cleanStrings(parsed?.avoid),
      likedDishes: cleanStrings(parsed?.likedDishes),
    };
  } catch (e) {
    console.error('loadCuratedFavoritesV2 failed', e);
    return { ...EMPTY_V2 };
  }
}

export async function saveCuratedFavoritesV2(input: {
  picks: SlotPick[];
  cuisines: string[];
  avoid: string[];
  likedDishes: string[];
}): Promise<void> {
  try {
    const picks = cleanPicks(input.picks);
    const payload: CuratedFavoritesV2 = {
      version: 2,
      picks,
      slugs: mirrorSlugs(picks),
      cuisines: Array.from(new Set(cleanStrings(input.cuisines))),
      avoid: Array.from(new Set(cleanStrings(input.avoid))),
      likedDishes: Array.from(new Set(cleanStrings(input.likedDishes))),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('saveCuratedFavoritesV2 failed', e);
  }
}

/**
 * Count of actual food picks. Use this for "N picks" UI — unlike
 * favoritesCount it never counts cuisines/avoid/likedDishes. Falls back to
 * the slug mirror for legacy data that predates slot-scoped picks.
 */
export function picksCount(fav: CuratedFavorites | CuratedFavoritesV2): number {
  const picks = (fav as CuratedFavoritesV2).picks;
  if (Array.isArray(picks) && picks.length > 0) return picks.length;
  return fav.slugs.length;
}

// ---------------------------------------------------------------------------
// V1 API — preserved for existing callers (prompt builder, older screens)
// ---------------------------------------------------------------------------

export async function loadCuratedFavorites(): Promise<CuratedFavorites> {
  const v2 = await loadCuratedFavoritesV2();
  return {
    slugs: v2.slugs,
    cuisines: v2.cuisines,
    avoid: v2.avoid,
    likedDishes: v2.likedDishes,
  };
}

export async function saveCuratedFavorites(fav: CuratedFavorites): Promise<void> {
  try {
    const current = await loadCuratedFavoritesV2();
    const slugs = uniqueBaseSlugs(cleanStrings(fav.slugs));
    const slugSet = new Set(slugs);
    const payload: CuratedFavoritesV2 = {
      version: 2,
      // Preserve slot detail where it still applies; drop picks whose meal
      // the caller removed. Slugs the caller ADDED have no slot context —
      // they ride the mirror only, and the picker hydrates them on next open.
      picks: current.picks.filter((p) => slugSet.has(p.slug)),
      slugs,
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

/**
 * True if the user has provided ANY taste-profile signal (legacy semantics:
 * counts all four arrays). Prefer picksCount() for "N picks" UI.
 */
export function favoritesCount(fav: CuratedFavorites): number {
  return (
    fav.slugs.length +
    fav.cuisines.length +
    fav.avoid.length +
    fav.likedDishes.length
  );
}