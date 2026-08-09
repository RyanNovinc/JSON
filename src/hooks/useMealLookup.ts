// src/hooks/useMealLookup.ts
//
// One slug → meal lookup covering BOTH curated meals and the user's own.
//
// Why this exists: the AI emits a custom pick into a plan using the same
// `curated_meal_slug` field as a curated one, set to the meal's `custom_` slug.
// Every resolver in the app was built against the static CURATED_MEALS map, so
// those entries resolved to nothing — the prep session dropped them into "make
// fresh" by name, and their photos, ingredients and prep behaviour were lost.
//
// buildPrepSession already takes the lookup as a parameter, so the fix is to
// hand it a merged map rather than to change the engine. The merge is
// deliberately custom-last: a user meal's slug is prefixed, so a collision with
// a curated slug shouldn't be possible, and if one ever happens the user's own
// meal should win on their own device.
//
// Async by necessity — custom meals live in AsyncStorage while CURATED_MEALS is
// a static import. Callers get CURATED_MEALS immediately and the merged map on
// the next render, so nothing has to wait on storage to show something.

import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { CuratedMeal } from '../types/curated_meals';
import { CURATED_MEALS } from '../data/curated_meals';
import { loadCustomMealViews } from '../utils/customMealsStorage';

export type MealLookup = Record<string, CuratedMeal>;

/** Merge the user's meals over the curated set. Pure — takes what it's given. */
export function mergeMealLookup(customViews: CuratedMeal[]): MealLookup {
  const merged: MealLookup = { ...CURATED_MEALS };
  for (const view of customViews) {
    if (view?.slug) merged[view.slug] = view;
  }
  return merged;
}

/** Load the merged lookup once, outside React. */
export async function loadMealLookup(): Promise<MealLookup> {
  try {
    const views = await loadCustomMealViews();
    return mergeMealLookup(views as unknown as CuratedMeal[]);
  } catch {
    // A failed custom-meal read must not take the curated meals down with it.
    return { ...CURATED_MEALS };
  }
}

/**
 * The merged lookup, refreshed whenever the screen regains focus — a meal
 * created or edited while this screen was backgrounded is picked up on return.
 *
 * `ready` is false only until the first load resolves; `meals` is usable from
 * the very first render.
 */
export function useMealLookup(): { meals: MealLookup; ready: boolean } {
  const [meals, setMeals] = useState<MealLookup>(() => ({ ...CURATED_MEALS }));
  const [ready, setReady] = useState(false);

  const load = useCallback(async (isCancelled: () => boolean) => {
    const merged = await loadMealLookup();
    if (isCancelled()) return;
    setMeals(merged);
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      load(() => cancelled);
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  return { meals, ready };
}