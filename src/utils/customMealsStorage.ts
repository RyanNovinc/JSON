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

export async function loadCustomMeals(): Promise<CustomMeal[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUsableRecord);
  } catch (e) {
    console.error('loadCustomMeals failed', e);
    return [];
  }
}

/**
 * Create or update by slug. Preserves created_at on update, stamps
 * updated_at, and deletes the previous image file if the photo was
 * replaced or removed in an edit.
 */
export async function upsertCustomMeal(meal: CustomMeal): Promise<void> {
  try {
    const meals = await loadCustomMeals();
    const now = new Date().toISOString();
    const idx = meals.findIndex((m) => m.slug === meal.slug);
    if (idx === -1) {
      meals.push({ ...meal, created_at: meal.created_at || now, updated_at: now });
    } else {
      const prev = meals[idx];
      if (prev.image_uri && prev.image_uri !== meal.image_uri) {
        await deleteCustomMealImage(prev.image_uri);
      }
      meals[idx] = { ...meal, created_at: prev.created_at, updated_at: now };
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(meals));
  } catch (e) {
    console.error('upsertCustomMeal failed', e);
  }
}

/**
 * Delete the meal, its image file, and any curated-favorites picks that
 * point at it (so the picker and feasibility engine never see a slug that
 * no longer resolves).
 *
 * Note: saveCuratedFavoritesV2 rebuilds the legacy slug mirror from picks,
 * which drops mirror-only slugs that were never hydrated into picks. The
 * picker itself does the same on every save, and anyone who created a
 * custom meal has run the current picker, so this is consistent with app
 * behaviour.
 */
export async function removeCustomMeal(slug: string): Promise<void> {
  try {
    const meals = await loadCustomMeals();
    const target = meals.find((m) => m.slug === slug);
    const next = meals.filter((m) => m.slug !== slug);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    if (target?.image_uri) {
      await deleteCustomMealImage(target.image_uri);
    }
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
    console.error('removeCustomMeal failed', e);
  }
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