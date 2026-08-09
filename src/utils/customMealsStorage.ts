// src/utils/customMealsStorage.ts
//
// Store + image handling for user-created meals ("Your meals").
//
// Storage: ONE AsyncStorage key holding CustomMeal[] (lean, editable).
// Views: toCustomMealView() fabricates the CuratedMeal shape — one
// 'standard' plate carrying the user's per-serving macros, one 'standard'
// method carrying the steps — so every existing consumer (picker,
// feasibility, plan rendering, prompt builder) works through the same code
// paths. Design notes live in src/types/custom_meals.ts.
//
// Images: mirror of WeightTracker's progress-photo pattern —
// expo-image-picker hands back a URI inside the app's cache; we copy it
// into <documentDirectory>/custom-meals/ so it survives cache eviction,
// and delete it when the meal (or just its photo) is removed. Same guarded
// expo-file-system/legacy require as WeightTrackerScreen.
//
// Deleting a meal also prunes its picks from curated favorites so the
// picker/feasibility never resolve a dangling slug. Saved plans that
// reference a deleted custom slug keep working — plan entries carry their
// own name/macros; only the image lookup falls back to the monogram tile.
//
// WRITE SAFETY (6 Aug):
//   - ALL mutations run through a single promise chain (runExclusive). Both
//     mutators do read-modify-write on one shared key, so two overlapping
//     calls — a save landing while a delete is still in flight — would build
//     the second write from a stale read and silently drop the first.
//   - upsert/remove return a boolean. They used to return void while
//     swallowing their own errors, so a failed write was indistinguishable
//     from a successful one and the calling screen closed as if the meal
//     had saved.
//   - Every write is read back and compared before it reports success. Note
//     what this does and does not prove: on iOS small values are held in a
//     native in-memory dictionary, so a matching read-back confirms the
//     round trip and catches a clobber, but it is NOT proof the bytes hit
//     disk. Real write failures (Android's 6MB SQLite ceiling, which raises
//     "database or disk is full") surface as a throw from setItem instead.
//   - A write NEVER proceeds from an unreadable store. loadCustomMeals()
//     returns [] on a parse failure, and building the next array from that
//     read would turn one corrupt blob into a full wipe.
//   - When a read drops records (corrupt JSON, or entries that fail
//     isUsableRecord), the raw string is copied to a backup key before the
//     store is overwritten. The backup is written ONCE and never replaced:
//     the first quarantine is the copy taken closest to the good state.
//   - The replaced image is deleted AFTER the record is written, not
//     before. The old order could delete a live photo when the write then
//     failed.
//   - A schema version is stored under its own key so a future change to
//     CustomMeal has a migration hook. It is stamped on write and read by
//     inspectCustomMealStore; nothing branches on it yet.

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CustomMeal,
  CustomMealView,
  CUSTOM_MEAL_SLUG_PREFIX,
} from '../types/custom_meals';
import { CookingMethod, Plate } from '../types/curated_meals';
import {
  loadCuratedFavoritesV2,
  saveCuratedFavoritesV2,
} from './curatedFavoritesStorage';

const KEY = '@custom_meals';
const BACKUP_KEY = '@custom_meals_backup';
const SCHEMA_KEY = '@custom_meals_schema';
const SCHEMA_VERSION = '1';

/**
 * Serialises every mutation onto one chain. Reads stay unqueued — they are
 * snapshots and a stale one is harmless — but read-modify-write mutations
 * must not interleave, or the later write silently discards the earlier.
 * Failures do not poison the chain: the next operation runs regardless.
 */
let writeChain: Promise<unknown> = Promise.resolve();

function runExclusive<T>(op: () => Promise<T>): Promise<T> {
  const run = writeChain.then(op, op);
  writeChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

// expo-file-system moved its classic API behind /legacy in newer SDKs
// (same guarded require as WeightTrackerScreen).
let FileSystem: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  FileSystem = require('expo-file-system/legacy');
} catch (e) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    FileSystem = require('expo-file-system');
  } catch (e2) {
    FileSystem = null;
  }
}

const IMAGE_DIR: string | null = FileSystem?.documentDirectory
  ? `${FileSystem.documentDirectory}custom-meals/`
  : null;

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

export function newCustomMealSlug(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${CUSTOM_MEAL_SLUG_PREFIX}${Date.now().toString(36)}_${rand}`;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Light read-side guard: keep only records that can safely reach the view
 * converter and the feasibility engine. We trust our own writes; this is
 * corruption insurance, not a validator.
 */
const isUsableRecord = (m: any): m is CustomMeal =>
  !!m &&
  typeof m.slug === 'string' &&
  m.slug.startsWith(CUSTOM_MEAL_SLUG_PREFIX) &&
  typeof m.display_name === 'string' &&
  m.display_name.trim().length > 0 &&
  !!m.macros &&
  typeof m.macros.kcal === 'number' &&
  Array.isArray(m.eligible_slots) &&
  m.eligible_slots.length > 0;

interface StoreRead {
  meals: CustomMeal[];
  /** Raw stored string, kept so a lossy read can be quarantined before overwrite. */
  raw: string | null;
  /** False when the key could not be read at all — never write over this. */
  readable: boolean;
  /** True when the read discarded something that was actually stored. */
  lossy: boolean;
}

async function readStore(): Promise<StoreRead> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(KEY);
  } catch (e) {
    console.error('customMeals: store unreadable', e);
    return { meals: [], raw: null, readable: false, lossy: false };
  }
  if (raw == null) return { meals: [], raw: null, readable: true, lossy: false };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { meals: [], raw, readable: true, lossy: true };
    }
    const meals = parsed.filter(isUsableRecord);
    return { meals, raw, readable: true, lossy: meals.length !== parsed.length };
  } catch (e) {
    console.error('customMeals: store did not parse', e);
    return { meals: [], raw, readable: true, lossy: true };
  }
}

/**
 * Copy the current raw store aside before a lossy overwrite. Written once
 * and never replaced — a later quarantine would be a copy of an already
 * damaged store, and the first one is closest to the good state. Best
 * effort: failing to back up is not a reason to block the user's save.
 */
async function quarantineStore(raw: string): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(BACKUP_KEY);
    if (existing != null) return;
    await AsyncStorage.setItem(BACKUP_KEY, raw);
    console.warn('customMeals: lossy read, previous store copied to', BACKUP_KEY);
  } catch (e) {
    console.error('customMeals: quarantine failed', e);
  }
}

/**
 * Write the array, then read it back and compare. The comparison catches a
 * concurrent clobber and a native no-op; it does not prove durability (see
 * the WRITE SAFETY note at the top). A genuine out-of-space failure throws
 * from setItem and is caught here.
 */
async function writeStoreVerified(meals: CustomMeal[]): Promise<boolean> {
  const payload = JSON.stringify(meals);
  try {
    await AsyncStorage.setItem(KEY, payload);
  } catch (e) {
    console.error('customMeals: setItem failed', e);
    return false;
  }
  try {
    const back = await AsyncStorage.getItem(KEY);
    if (back !== payload) {
      console.error('customMeals: write did not verify');
      return false;
    }
  } catch (e) {
    console.error('customMeals: verification read failed', e);
    return false;
  }
  try {
    await AsyncStorage.setItem(SCHEMA_KEY, SCHEMA_VERSION);
  } catch (e) {
    // Non-fatal: the records are already written. Only the migration hook
    // is missing, and a reader with no version can assume version 1.
  }
  return true;
}

export async function loadCustomMeals(): Promise<CustomMeal[]> {
  const store = await readStore();
  return store.meals;
}

/**
 * Create or update by slug. Preserves created_at on update, stamps
 * updated_at, and deletes the previous image file if the photo was
 * replaced or removed in an edit.
 *
 * Returns true only when the record is confirmed present in storage.
 * Callers must not treat a save as done without checking this.
 */
export async function upsertCustomMeal(meal: CustomMeal): Promise<boolean> {
  return runExclusive(() => upsertCustomMealInner(meal));
}

async function upsertCustomMealInner(meal: CustomMeal): Promise<boolean> {
  try {
    const store = await readStore();
    if (!store.readable) {
      // Writing now would replace an unknown store with a single record.
      return false;
    }
    if (store.lossy && store.raw) {
      await quarantineStore(store.raw);
    }

    const meals = store.meals;
    const now = new Date().toISOString();
    const idx = meals.findIndex((m) => m.slug === meal.slug);

    // Held until the write succeeds — deleting it first can strand a live
    // record pointing at a file that no longer exists.
    let replacedImage: string | undefined;

    if (idx === -1) {
      meals.push({ ...meal, created_at: meal.created_at || now, updated_at: now });
    } else {
      const prev = meals[idx];
      if (prev.image_uri && prev.image_uri !== meal.image_uri) {
        replacedImage = prev.image_uri;
      }
      meals[idx] = { ...meal, created_at: prev.created_at, updated_at: now };
    }

    const ok = await writeStoreVerified(meals);
    if (!ok) return false;

    if (replacedImage) {
      await deleteCustomMealImage(replacedImage);
    }
    return true;
  } catch (e) {
    console.error('upsertCustomMeal failed', e);
    return false;
  }
}

/**
 * Delete the meal, its image file, and any curated-favorites picks that
 * point at it (so the picker and feasibility engine never see a slug that
 * no longer resolves). Returns true when the removal is confirmed.
 *
 * Note: saveCuratedFavoritesV2 rebuilds the legacy slug mirror from picks,
 * which drops mirror-only slugs that were never hydrated into picks. The
 * picker itself does the same on every save, and anyone who created a
 * custom meal has run the current picker, so this is consistent with app
 * behaviour.
 */
export async function removeCustomMeal(slug: string): Promise<boolean> {
  return runExclusive(() => removeCustomMealInner(slug));
}

async function removeCustomMealInner(slug: string): Promise<boolean> {
  try {
    const store = await readStore();
    if (!store.readable) return false;
    if (store.lossy && store.raw) {
      await quarantineStore(store.raw);
    }

    const target = store.meals.find((m) => m.slug === slug);
    const next = store.meals.filter((m) => m.slug !== slug);

    const ok = await writeStoreVerified(next);
    if (!ok) return false;

    if (target?.image_uri) {
      await deleteCustomMealImage(target.image_uri);
    }

    // Favorites pruning is deliberately after the meal is gone: if this
    // fails the picker just holds a stale pick, which the merge already
    // tolerates, whereas pruning first could orphan a pick for a meal that
    // never got deleted.
    try {
      const fav = await loadCuratedFavoritesV2();
      if (fav.picks.some((p) => p.slug === slug) || fav.slugs.includes(slug)) {
        await saveCuratedFavoritesV2({
          picks: fav.picks.filter((p) => p.slug !== slug),
          cuisines: fav.cuisines,
          avoid: fav.avoid,
          likedDishes: fav.likedDishes,
        });
      }
    } catch (e) {
      console.error('removeCustomMeal: favorites prune failed', e);
    }

    return true;
  } catch (e) {
    console.error('removeCustomMeal failed', e);
    return false;
  }
}

/**
 * Diagnostic for the store's health. Not used in normal flow — call it from
 * a debug screen or a console when a save is in question.
 */
export async function inspectCustomMealStore(): Promise<{
  readable: boolean;
  lossy: boolean;
  usableCount: number;
  rawBytes: number;
  hasBackup: boolean;
  schemaVersion: string | null;
}> {
  const store = await readStore();
  let hasBackup = false;
  let schemaVersion: string | null = null;
  try {
    hasBackup = (await AsyncStorage.getItem(BACKUP_KEY)) != null;
    schemaVersion = await AsyncStorage.getItem(SCHEMA_KEY);
  } catch (e) {
    hasBackup = false;
  }
  return {
    readable: store.readable,
    lossy: store.lossy,
    usableCount: store.meals.length,
    rawBytes: store.raw ? store.raw.length : 0,
    hasBackup,
    schemaVersion,
  };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

async function ensureImageDir(): Promise<boolean> {
  if (!FileSystem || !IMAGE_DIR) return false;
  try {
    const info = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    }
    return true;
  } catch (e) {
    console.error('ensureImageDir failed', e);
    return false;
  }
}

/**
 * Copy a picked image (cache URI from expo-image-picker) into permanent
 * storage. Returns the permanent file URI, or null on failure — the meal
 * saves fine without an image, so callers treat null as "no photo".
 */
export async function importCustomMealImage(
  sourceUri: string,
  slug: string
): Promise<string | null> {
  if (!(await ensureImageDir())) return null;
  try {
    const rawExt = sourceUri.includes('.')
      ? sourceUri.slice(sourceUri.lastIndexOf('.') + 1).toLowerCase().split('?')[0]
      : 'jpg';
    const ext = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : 'jpg';
    const target = `${IMAGE_DIR}${slug}_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: sourceUri, to: target });
    const info = await FileSystem.getInfoAsync(target);
    return info?.exists ? target : null;
  } catch (e) {
    console.error('importCustomMealImage failed', e);
    return null;
  }
}

export async function deleteCustomMealImage(
  uri: string | undefined | null
): Promise<void> {
  if (!uri || !FileSystem) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (e) {
    // Best-effort: an orphaned file is harmless.
  }
}

// ---------------------------------------------------------------------------
// View converter
// ---------------------------------------------------------------------------

const nonNeg = (n: any, fallback: number): number =>
  typeof n === 'number' && isFinite(n) && n >= 0 ? n : fallback;

/**
 * Fabricate the CuratedMeal shape from a lean CustomMeal. This is the ONLY
 * place the shape is built — every consumer goes through it.
 */
export function toCustomMealView(m: CustomMeal): CustomMealView {
  const active = nonNeg(m.time_active_minutes, 0);
  const total = Math.max(active, nonNeg(m.time_total_minutes, active));

  const plate: Plate = {
    id: 'standard',
    display_name: m.display_name,
    description: m.description ?? '',
    base_serving_multiplier: 1.0,
    additional_ingredients: [],
    additional_instructions: [],
    assembly_time_minutes: 0,
    plate_macros: { ...m.macros },
  };

  const method: CookingMethod = {
    id: 'standard',
    display_name: 'Standard',
    // Sentinel: the picker's No-cook chip means "no heat appliance in
    // equipment_required". A cooked custom meal declares 'stovetop' purely
    // so it does not wrongly surface under No-cook; an empty array means
    // genuinely no cooking.
    equipment_required: m.requires_cooking ? ['stovetop'] : [],
    time_active_minutes: active,
    time_total_minutes: total,
    skill_min: 1,
    shortcut_level: 'shortcut',
    // Free-text rows live on custom_ingredients — MealIngredient requires
    // library ingredient_ids, which custom meals deliberately don't have.
    ingredients: [],
    instructions: Array.isArray(m.steps) ? m.steps : [],
  };

  return {
    slug: m.slug,
    display_name: m.display_name,
    cuisine: m.cuisine,
    primary_protein: m.primary_protein,
    produces_servings: nonNeg(m.produces_servings, 1) || 1,
    eligible_slots: m.eligible_slots,
    min_scale: 1.0,
    max_scale: 1.0,
    contains_allergens: Array.isArray(m.contains_allergens)
      ? m.contains_allergens
      : [],
    plates: [plate],
    methods: [method],
    // No library flex ingredient exists for user meals. Nothing on the
    // custom path reads this — the prompt builder and grocery engine branch
    // on `custom` before they get here.
    flex_ingredient_id: '' as any,
    image_filename: undefined,
    custom: true,
    image_uri: m.image_uri,
    custom_ingredients: Array.isArray(m.ingredients) ? m.ingredients : [],
  };
}

export async function loadCustomMealViews(): Promise<CustomMealView[]> {
  const meals = await loadCustomMeals();
  return meals.map(toCustomMealView);
}