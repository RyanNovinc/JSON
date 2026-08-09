// src/components/import/ImportHeroMeal.tsx
//
// Hero band for the meal plan import confirmation modal: up to three real photos
// pulled from the meals in the plan being imported.
//
// The resolution chain is copied from MealPlanDayScreen (:198-232) so the two
// screens can never disagree about which photo belongs to a meal:
//
//   meal.image_filename
//     -> plate.image_filename (matching plate_id, else first plate)
//     -> curated meal's image_filename
//     -> curated meal's photo_url (remote)
//     -> nothing, and this meal is skipped
//
// A meal with no curated_meal_slug has no lookup key into CURATED_MEALS and so
// resolves to nothing. That is deliberate: a wrong photo on the user's plan is
// worse than no photo. If FEWER than one photo resolves across the whole plan,
// the band falls back to a flat surface rather than rendering gaps.

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getMealImage } from '../../assets/mealImages';
import { CURATED_MEALS } from '../../data/curated_meals';

type Resolved = { key: string; local?: any; uri?: string };

/** Single meal -> a renderable image source, or null. Mirrors MealPlanDayScreen. */
function resolveMealImage(meal: any, index: number): Resolved | null {
  if (!meal) return null;

  let imageFilename: string | null = meal.image_filename || null;
  let uri: string | undefined = meal.photo_url || undefined;

  if (!imageFilename && !uri) {
    const slug = meal.curated_meal_slug || meal.slug || null;
    const cm = slug ? (CURATED_MEALS as any)[slug] : null;
    if (cm) {
      const plates = Array.isArray(cm.plates) ? cm.plates : [];
      const plateId = meal.plate_id || null;
      const plate =
        (plateId && plates.find((p: any) => p?.id === plateId)) || plates[0] || null;
      imageFilename = plate?.image_filename || cm.image_filename || null;
      uri = cm.photo_url || uri;
    }
  }

  const local = imageFilename ? getMealImage(imageFilename) : null;
  if (local) return { key: `${imageFilename}-${index}`, local };
  if (uri) return { key: `${uri}-${index}`, uri };
  return null;
}

/**
 * dailyMeals has been through a few shapes over the life of this app, so flatten
 * defensively rather than assuming one. Accepts: an array of days each holding a
 * `meals` array, an object keyed by day holding the same, or either shape holding
 * bare meal arrays.
 */
function flattenMeals(plan: any): any[] {
  const daily = plan?.dailyMeals;
  if (!daily) return [];

  const days: any[] = Array.isArray(daily) ? daily : Object.values(daily);

  return days.flatMap((day: any) => {
    if (Array.isArray(day)) return day;
    if (Array.isArray(day?.meals)) return day.meals;
    return [];
  });
}

interface Props {
  /** The parsed plan, straight from the import hook. */
  plan: any;
  themeColor: string;
  height?: number;
}

export default function ImportHeroMeal({ plan, themeColor, height = 132 }: Props) {
  const tiles = useMemo(() => {
    const meals = flattenMeals(plan);
    const seen = new Set<string>();
    const out: Resolved[] = [];

    for (let i = 0; i < meals.length && out.length < 3; i++) {
      const r = resolveMealImage(meals[i], i);
      if (!r) continue;
      // Dedupe by resolved asset, not by meal: a plan that repeats the same meal
      // across the week would otherwise show the same photo three times.
      const dedupeKey = r.local ? String(r.local) : String(r.uri);
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push(r);
    }
    return out;
  }, [plan]);

  if (tiles.length === 0) {
    return (
      <View style={[styles.band, styles.fallback, { height }]}>
        <Ionicons name="restaurant-outline" size={32} color={themeColor} />
      </View>
    );
  }

  return (
    <View style={[styles.band, { height }]}>
      {tiles.map((t) => (
        <View key={t.key} style={styles.tile}>
          <Image
            source={t.local ? t.local : { uri: t.uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#101210',
    overflow: 'hidden',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    flex: 1,
    height: '100%',
  },
});