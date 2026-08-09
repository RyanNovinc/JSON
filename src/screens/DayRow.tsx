import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
// expo-image, not RN's Image: these frames are require()'d bundled modules and
// expo-image's memory-disk cache + recyclingKey are what stop a tile painting a
// stale bitmap if the list is ever reordered.
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './DaysScreen.styles';
import { resolveExerciseImagePair } from '../utils/exerciseImages';

// The thumbnail strip sizes itself from the screen rather than using a fixed
// count. Every term below is known before the first frame, so the row never has
// to be measured — an onLayout pass here would reintroduce the very layout shift
// that the reserved-height work removed.
//
//   inner width = screen − listContent padding (16 each side)
//                        − nextUpCard padding  (16 each side)
//
// Tiles get a COMPUTED FIXED width, deliberately not flex: 1. With flex, a day
// where only two exercises resolve to images would stretch those two across the
// whole row. Fixed width means two tiles render at the size five would, and the
// remaining space simply stays empty.
const HERO_LIST_PADDING = 16;
const HERO_CARD_PADDING = 16;
const HERO_TILE_GAP = 6;
const HERO_TILE_MIN = 56;

function heroStripMetrics(screenWidth: number) {
  const inner = screenWidth - HERO_LIST_PADDING * 2 - HERO_CARD_PADDING * 2;
  const slots = Math.max(2, Math.floor((inner + HERO_TILE_GAP) / (HERO_TILE_MIN + HERO_TILE_GAP)));
  const tile = Math.floor((inner - HERO_TILE_GAP * (slots - 1)) / slots);
  return { slots, tile };
}

// ── Helper ────────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Types ─────────────────────────────────────────────────────────

interface Exercise {
  exercise: string;
  sets: number;
  reps: string;
  rest?: number;
  restQuick?: number;
  notes?: string;
  alternatives?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
}

interface Day {
  day_name: string;
  estimated_duration?: number;
  exercises: Exercise[];
}

interface CompletionStats {
  duration: number;
  totalVolume: number;
  date: string;
}

interface DayRowProps {
  day: Day;
  dayNumber: number;                 // 1-based position in the week (used as the index badge for pending rows)
  onPress: () => void;
  onLongPress?: () => void;
  isCompleted?: boolean;
  isNextUp?: boolean;                // hero variant — only one day per screen
  weekPosition?: number;             // 1-based position in the FULL week incl. rest days (hero badge only)
  weekLength?: number;               // number of days in the week (hero badge only); badge is omitted without both
  isPinkTheme?: boolean;             // picks the pink vs blue frame set for the hero thumbnails
  currentWeek: number;
  themeColor: string;
  blockName: string;
  refreshTrigger?: number;
  completionStats?: CompletionStats;
  globalUnit?: string;
}

// ── Component ─────────────────────────────────────────────────────

export default function DayRow({
  day,
  dayNumber,
  onPress,
  onLongPress,
  isCompleted,
  isNextUp,
  weekPosition,
  weekLength,
  isPinkTheme,
  currentWeek,
  themeColor,
  blockName,
  refreshTrigger,
  completionStats,
  globalUnit = 'kg',
}: DayRowProps) {
  // Correct on the first render, so the strip's height is known before paint.
  const { width: screenWidth } = useWindowDimensions();
  const { slots: heroSlots, tile: heroTileSize } = heroStripMetrics(screenWidth);

  // ONE piece of state, committed ONCE. This used to be three useState hooks fed by
  // three independent async loaders (customizations, saved sets, dynamic exercises)
  // that raced: five setState calls across three unsynchronised AsyncStorage reads,
  // two of them writing the same field, so the winner depended on which read
  // returned first. On a fixed-height row that was invisible. On the hero card,
  // whose height depends on the exercise count and the thumbnail strip, every one
  // of those writes resized the card — the flashing on screen entry.
  const [dayData, setDayData] = useState<{
    exercises: Exercise[];
    dynamicExercises: Exercise[];
    duration: number | undefined;
  }>({
    exercises: day.exercises || [],
    dynamicExercises: [],
    duration: day.estimated_duration,
  });

  const modifiedExercises = dayData.exercises;
  const dynamicExercises = dayData.dynamicExercises;
  const customizedDuration = dayData.duration;

  const exerciseCount = (modifiedExercises?.length || 0) + (dynamicExercises?.length || 0);

  useEffect(() => {
    let cancelled = false;

    const loadDayData = async () => {
      const dayName = day.day_name || 'unknown';
      const customizationKey = `day_customization_${blockName}_${dayName}_week${currentWeek}`;
      const dynamicKey = `workout_${blockName}_${dayName}_week${currentWeek}_exercises`;
      const setsKey = `workout_${blockName}_${dayName}_week${currentWeek}_sets`;

      // One multiGet instead of three getItem calls, so there is a single bridge
      // round trip and no ordering to lose.
      let rawCustomization: string | null = null;
      let rawDynamic: string | null = null;
      let rawSets: string | null = null;

      try {
        const pairs = await AsyncStorage.multiGet([customizationKey, dynamicKey, setsKey]);
        const byKey = new Map(pairs);
        rawCustomization = byKey.get(customizationKey) ?? null;
        rawDynamic = byKey.get(dynamicKey) ?? null;
        rawSets = byKey.get(setsKey) ?? null;
      } catch (error) {
        // Fall through with the template values already in state.
        return;
      }

      let exercises: Exercise[] = day.exercises || [];
      let dynamic: Exercise[] = [];
      let duration: number | undefined = day.estimated_duration;

      if (rawCustomization) {
        // A customization wins outright. Saved set counts are deliberately NOT
        // overlaid here: a customized day can be reordered, so the saved sets
        // array's indices no longer line up with the exercise list.
        try {
          const customizationData = JSON.parse(rawCustomization);
          if (customizationData.exercises) exercises = customizationData.exercises;
          if (customizationData.estimated_duration !== undefined) {
            duration = customizationData.estimated_duration;
          }
        } catch (error) {
          // Corrupt customization: keep the template.
        }
      } else {
        if (rawSets) {
          try {
            const savedSetsData = JSON.parse(rawSets);
            exercises = (day.exercises || []).map((exercise, index) => (
              savedSetsData[index] && savedSetsData[index].length > 0
                ? { ...exercise, sets: savedSetsData[index].length }
                : exercise
            ));
          } catch (error) {
            // Corrupt sets data: keep the template.
          }
        }

        if (rawDynamic) {
          try {
            dynamic = JSON.parse(rawDynamic) || [];
          } catch (error) {
            dynamic = [];
          }
        }
      }

      if (!cancelled) {
        setDayData({ exercises, dynamicExercises: dynamic, duration });
      }
    };

    loadDayData();

    return () => {
      cancelled = true;
    };
  }, [blockName, day.day_name, currentWeek, refreshTrigger]);

  const allExercises = [...(modifiedExercises || []), ...(dynamicExercises || [])];

  // ── Hero-only derived data ───────────────────────────────────────
  // Everything below is gated on isNextUp. A week can have six of these rows and
  // only one hero; resolving images for all of them would be six wasted passes
  // over the image map per render of the screen.

  // Both hero derivations run off `day.exercises` — the PROP — not allExercises.
  // That is deliberate: the prop is correct on the very first frame, while
  // allExercises only settles once AsyncStorage commits. Keying off the latter
  // meant the muscle line and the thumbnail strip both recomputed after mount and
  // resized the card. The strip is a preview of the day, so template order is the
  // right thing to show anyway.
  const templateExercises = day.exercises || [];
  const exerciseNameKey = templateExercises.map((ex) => ex?.exercise || '').join('|');

  const heroMuscles = useMemo(() => {
    if (!isNextUp) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    templateExercises.forEach((ex) => {
      (ex?.primaryMuscles || []).forEach((muscle) => {
        if (muscle && !seen.has(muscle)) {
          seen.add(muscle);
          out.push(muscle);
        }
      });
    });
    return out.slice(0, 3);
  }, [isNextUp, exerciseNameKey]);

  const [heroThumbs, setHeroThumbs] = useState<any[]>([]);
  // Until the first resolve lands, the strip's slot is HELD OPEN at its full
  // height. resolveExerciseImagePair is a lookup in a static object with no I/O,
  // so that first pass settles on the mount microtask — the slot collapses (or
  // fills) before paint, and the card never changes height on screen.
  const [heroThumbsResolved, setHeroThumbsResolved] = useState(false);

  useEffect(() => {
    if (!isNextUp) {
      return;
    }

    let cancelled = false;

    (async () => {
      const theme = isPinkTheme ? 'pink' : 'blue';
      const found: any[] = [];

      // Walk the day in order and keep only what resolves. Coverage of the image
      // map is partial (an AI-generated plan can name anything), so a day with
      // six exercises may yield three tiles, one, or none — and none is a valid
      // outcome that hides the strip rather than filling it with placeholders.
      for (const exercise of templateExercises) {
        if (found.length >= heroSlots) break;
        const name = exercise?.exercise || '';
        if (!name) continue;
        try {
          const pair = await resolveExerciseImagePair({ exercise: name, name }, theme);
          if (pair?.start) found.push(pair.start);
        } catch (error) {
          // A single unresolvable exercise must not empty the whole strip.
        }
      }

      if (!cancelled) {
        setHeroThumbs(found);
        setHeroThumbsResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNextUp, isPinkTheme, exerciseNameKey, heroSlots]);

  const estimatedDuration = (() => {
    if (exerciseCount === 0) {
      return 0;
    }

    if (customizedDuration !== undefined) {
      return customizedDuration;
    }

    if (day.estimated_duration && (day.exercises?.length || 0) > 0) {
      return day.estimated_duration;
    }

    const totalRestTime = allExercises.reduce((total, ex) => {
      const sets = ex.sets;
      const restPerSet = (ex.rest || 120) / 60;
      return total + (sets * restPerSet);
    }, 0);

    const executionTime = allExercises.reduce((total, ex) => {
      const name = (ex.exercise || '').toLowerCase();
      const isCompound = name.includes('squat') || name.includes('deadlift') ||
                        name.includes('press') || name.includes('row') ||
                        name.includes('pull up') || name.includes('chin up');
      const timePerSet = isCompound ? 1.5 : 1;
      return total + (ex.sets * timePerSet);
    }, 0);

    const warmupTime = 5;
    const setupTime = exerciseCount * 0.5;

    return Math.round(totalRestTime + executionTime + warmupTime + setupTime);
  })();

  const isRestDay = exerciseCount === 0 && day.day_name && day.day_name.toUpperCase().includes('REST');

  // ── REST DAY ─────────────────────────────────────────────────────
  if (isRestDay) {
    return (
      <View style={styles.restRow}>
        <View style={styles.restIconWrap}>
          <Ionicons name="bed-outline" size={14} color="#55555f" />
        </View>
        <Text style={styles.restText}>Rest</Text>
        <Text style={styles.restDayNameText}>{day.day_name}</Text>
      </View>
    );
  }

  // ── NEXT-UP HERO CARD ────────────────────────────────────────────
  if (isNextUp) {
    // The "+N" chip occupies a slot, so when the resolved tiles already fill every
    // slot AND there is still more to count, one tile gives its place up to the
    // chip. Anything less than a full row keeps every tile it has.
    const stripIsFull = heroThumbs.length >= heroSlots;
    const tileCount = stripIsFull && exerciseCount > heroThumbs.length
      ? heroSlots - 1
      : heroThumbs.length;
    const visibleThumbs = heroThumbs.slice(0, tileCount);
    const hiddenExerciseCount = Math.max(0, exerciseCount - tileCount);

    return (
      <TouchableOpacity
        style={[
          styles.nextUpCard,
          {
            backgroundColor: hexA(themeColor, 0.06),
            borderColor: hexA(themeColor, 0.55),
          },
        ]}
        activeOpacity={0.9}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={800}
      >
        <View style={styles.nextUpEyebrowRow}>
          <Text style={[styles.nextUpEyebrow, { color: themeColor }]}>NEXT UP</Text>
          {!!weekPosition && !!weekLength && (
            <View style={styles.nextUpDayBadge}>
              <Text style={styles.nextUpDayBadgeText}>
                DAY {weekPosition} OF {weekLength}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.nextUpDayName} numberOfLines={2}>
          {day.day_name || 'Untitled Day'}
        </Text>

        <Text
          style={[styles.nextUpMuscles, styles.nextUpMusclesReserve]}
          numberOfLines={1}
        >
          {heroMuscles.join(' · ')}
        </Text>

        {exerciseCount > 0 && (heroThumbs.length > 0 || !heroThumbsResolved) && (
          <View style={[styles.nextUpThumbRow, { height: heroTileSize }]}>
            {visibleThumbs.map((source, index) => (
              <View
                key={`thumb-${index}`}
                style={[styles.nextUpThumb, { width: heroTileSize, height: heroTileSize }]}
              >
                <Image
                  recyclingKey={`${day.day_name || 'day'}-${index}`}
                  source={source}
                  style={styles.nextUpThumbImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={0}
                />
              </View>
            ))}
            {hiddenExerciseCount > 0 && (
              <View
                style={[styles.nextUpThumbMore, { width: heroTileSize, height: heroTileSize }]}
              >
                <Text style={styles.nextUpThumbMoreText}>+{hiddenExerciseCount}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.nextUpMetaRow}>
          <View style={styles.nextUpMetaItem}>
            <Ionicons name="barbell-outline" size={13} color="#71717a" />
            <Text style={styles.nextUpMetaText}>
              {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
            </Text>
          </View>
          {estimatedDuration > 0 && (
            <View style={styles.nextUpMetaItem}>
              <Ionicons name="time-outline" size={13} color="#71717a" />
              <Text style={styles.nextUpMetaText}>~{estimatedDuration} min</Text>
            </View>
          )}
        </View>

        <View style={[styles.nextUpStartButton, { backgroundColor: themeColor }]}>
          <Ionicons name="play" size={13} color="#000" />
          <Text style={styles.nextUpStartButtonText}>Start workout</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── COMPLETED ROW ────────────────────────────────────────────────
  if (isCompleted && completionStats) {
    return (
      <TouchableOpacity
        style={styles.doneRow}
        activeOpacity={0.7}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={800}
      >
        <Ionicons name="checkmark-circle" size={16} color={hexA(themeColor, 0.55)} />
        <Text style={styles.doneName} numberOfLines={1}>
          {day.day_name || 'Untitled Day'}
        </Text>
        <Text style={styles.doneMeta} numberOfLines={1}>
          {completionStats.duration} min · {completionStats.totalVolume.toFixed(0)} {globalUnit}
        </Text>
        <Ionicons name="chevron-forward" size={13} color="#2a2a32" />
      </TouchableOpacity>
    );
  }

  // ── PENDING DAY ROW ──────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={styles.dayRow}
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.dayRowStatus}>
        <Text style={styles.dayRowStatusNumber}>{dayNumber}</Text>
      </View>
      <View style={styles.dayRowContent}>
        <Text style={styles.dayRowName} numberOfLines={1}>
          {day.day_name || 'Untitled Day'}
        </Text>
        <Text style={styles.dayRowMeta} numberOfLines={1}>
          {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
          {estimatedDuration > 0 ? ` · ~${estimatedDuration} min` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#3a3a44" />
    </TouchableOpacity>
  );
}