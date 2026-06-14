import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CURATED_MEALS } from '../data/curated_meals';
import { getMealImage } from '../assets/mealImages';

/**
 * MealCycleHero — the full-bleed 2×2 meal photo mosaic at the top of the
 * onboarding fork. The four tiles slowly cross-fade, one at a time, to other
 * meals from the curated library, so the screen feels alive and shows breadth.
 *
 *  - Photos resolve from CURATED_MEALS the same way MealPlanPreviewScreen does
 *    (plate image_filename → getMealImage; falls back to a photo URL, then a
 *    dark tile if a meal has no usable image).
 *  - The cross-fade is opacity-only (no movement/scale) on the native driver.
 *  - Respects Reduce Motion: if it's on, four static tiles render and nothing
 *    animates.
 *  - `children` render inside the bottom scrim — the logo + headline live there.
 *
 * To hand-pick which meals appear, fill FEATURED_SLUGS with curated slugs.
 * Left empty, it uses every curated meal that has a usable photo (shuffled),
 * so the strongest-looking ones can be curated in later without code changes.
 */

// e.g. ['baked_oats', 'chilli_con_carne', 'chicken_and_rice', ...]
const FEATURED_SLUGS: string[] = [];

const SWAP_MS = 2600; // gap between one tile changing
const FADE_MS = 700; // cross-fade duration
const MIN_FOR_MOTION = 6; // need a few spares to cycle without repeats

type MealImg = { local: any | null; uri: string | null };

const FALLBACK: MealImg = { local: null, uri: null };

// --- snack filter -----------------------------------------------------------
// Keep snacks (beef jerky, nuts, bars, etc.) OUT of the hero — they look
// low-rent on the splash. Smoothies stay even if your data files them under a
// snack-ish category.
//
// A meal is treated as a snack when its category/type matches SNACK_HINTS, but
// nothing whose name or slug looks like a smoothie is ever dropped. If a stray
// snack slips through (e.g. its category isn't set), add its slug to
// EXCLUDE_SLUGS. NOTE: mealCategory() guesses at the field name — if none of
// these match your data, tell me the real field and I'll point it there.
const SNACK_HINTS = ['snack']; // category/type values treated as snacks
const KEEP_HINTS = ['smoothie', 'shake']; // never dropped, even if a "snack"
const EXCLUDE_SLUGS: string[] = []; // hard-exclude specific slugs

function mealCategory(cm: any): string {
  const v =
    cm?.category ??
    cm?.meal_category ??
    cm?.type ??
    cm?.meal_type ??
    cm?.classification ??
    '';
  return String(v).toLowerCase();
}

function isExcluded(slug: string, cm: any): boolean {
  if (EXCLUDE_SLUGS.indexOf(slug) !== -1) return true;
  const hay = `${slug} ${String(cm?.name ?? cm?.title ?? '')}`.toLowerCase();
  if (KEEP_HINTS.some((k) => hay.indexOf(k) !== -1)) return false; // keep smoothies
  const cat = mealCategory(cm);
  return SNACK_HINTS.some((h) => cat.indexOf(h) !== -1);
}

// Mirrors MealPlanPreviewScreen.resolveMealImage: prefer the plate image, then
// the meal's own image_filename, then any remote URL. Returns null if there's
// no usable photo so we can skip that meal in the rotation.
function resolveMeal(cm: any): MealImg | null {
  if (!cm) return null;
  const plates = Array.isArray(cm.plates) ? cm.plates : [];
  const plate = plates[0] || null;
  const imageFilename = plate?.image_filename || cm.image_filename || null;
  const local = imageFilename ? getMealImage(imageFilename) : null;
  const uri = cm.photo_url || cm.image_url || cm.image || null;
  if (!local && !uri) return null;
  return { local, uri };
}

function buildPool(): MealImg[] {
  const slugs = FEATURED_SLUGS.length
    ? FEATURED_SLUGS
    : Object.keys((CURATED_MEALS as any) || {});
  const pool: MealImg[] = [];
  for (const slug of slugs) {
    const cm: any = (CURATED_MEALS as any)?.[slug];
    if (!cm) continue;
    if (isExcluded(slug, cm)) continue; // drop snacks (smoothies kept)
    const m = resolveMeal(cm);
    if (m) pool.push(m);
  }
  // Shuffle so it isn't the same meals on every launch.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i];
    pool[i] = pool[j];
    pool[j] = t;
  }
  return pool;
}

function TileFace({ meal }: { meal: MealImg }) {
  const m = meal || FALLBACK;
  return (
    <View style={styles.faceInner}>
      {m.local ? (
        <Image source={m.local} style={styles.img} resizeMode="cover" />
      ) : m.uri ? (
        <Image source={{ uri: m.uri }} style={styles.img} resizeMode="cover" />
      ) : (
        <View style={styles.imgFallback} />
      )}
    </View>
  );
}

interface Props {
  height: number;
  children?: React.ReactNode;
}

export default function MealCycleHero({ height, children }: Props) {
  const poolRef = useRef<MealImg[]>(buildPool());
  const pool = poolRef.current;

  const initial = (idx: number): MealImg => pool[idx] || FALLBACK;

  // Each tile cross-fades between two faces.
  const [faces, setFaces] = useState<MealImg[][]>(() => [
    [initial(0), initial(0)],
    [initial(1), initial(1)],
    [initial(2), initial(2)],
    [initial(3), initial(3)],
  ]);

  const anims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const visRef = useRef<number[]>([0, 0, 0, 0]); // which face is showing
  const shownRef = useRef<number[]>([0, 1, 2, 3]); // pool index per tile
  const ptrRef = useRef<number>(Math.min(4, pool.length));
  const rrRef = useRef<number>(0);

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(!!v);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (v: boolean) => setReduceMotion(!!v)
    );
    return () => {
      mounted = false;
      if (sub && typeof (sub as any).remove === 'function') (sub as any).remove();
    };
  }, []);

  const nextPoolIndex = useCallback((): number => {
    const shown = shownRef.current;
    for (let g = 0; g < pool.length; g++) {
      const cand = ptrRef.current % pool.length;
      ptrRef.current += 1;
      if (shown.indexOf(cand) === -1) return cand;
    }
    const c = ptrRef.current % pool.length;
    ptrRef.current += 1;
    return c;
  }, [pool.length]);

  useEffect(() => {
    if (reduceMotion) return;
    if (pool.length < MIN_FOR_MOTION) return;

    const id = setInterval(() => {
      const i = rrRef.current;
      rrRef.current = (rrRef.current + 1) % 4;

      const nextIdx = nextPoolIndex();
      const hidden = visRef.current[i] === 0 ? 1 : 0;

      // Put the next meal on the hidden face (opacity 0, so no flash), then
      // cross-fade to it.
      setFaces((prev) => {
        const copy = prev.map((p) => p.slice());
        copy[i][hidden] = pool[nextIdx] || FALLBACK;
        return copy;
      });
      shownRef.current[i] = nextIdx;

      requestAnimationFrame(() => {
        Animated.timing(anims[i], {
          toValue: hidden,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start(() => {
          visRef.current[i] = hidden;
        });
      });
    }, SWAP_MS);

    return () => clearInterval(id);
  }, [reduceMotion, pool, anims, nextPoolIndex]);

  const Tile = (i: number, extra?: object) => (
    <View style={[styles.cell, extra]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: anims[i].interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      >
        <TileFace meal={faces[i][0]} />
      </Animated.View>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { opacity: anims[i] }]}
      >
        <TileFace meal={faces[i][1]} />
      </Animated.View>
    </View>
  );

  return (
    <View style={[styles.hero, { height }]}>
      <View style={styles.grid}>
        <View style={[styles.gridRow, { marginBottom: 2 }]}>
          {Tile(0, { marginRight: 2 })}
          {Tile(1)}
        </View>
        <View style={styles.gridRow}>
          {Tile(2, { marginRight: 2 })}
          {Tile(3)}
        </View>
      </View>

      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
        style={styles.topFade}
        pointerEvents="none"
      />

      <LinearGradient
        colors={[
          'rgba(10,10,11,0)',
          'rgba(10,10,11,0.55)',
          'rgba(10,10,11,0.92)',
        ]}
        locations={[0, 0.5, 1]}
        style={styles.bottomFade}
        pointerEvents="box-none"
      >
        <View style={styles.scrimContent}>{children}</View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    backgroundColor: '#0a0a0b',
    overflow: 'hidden',
  },
  grid: {
    flex: 1,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#131316',
  },
  faceInner: {
    flex: 1,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgFallback: {
    flex: 1,
    backgroundColor: '#1a1a1e',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 200,
    justifyContent: 'flex-end',
  },
  scrimContent: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
});