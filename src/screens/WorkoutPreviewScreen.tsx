import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { TouchableOpacity as GHTouchable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutRoutine } from '../utils/storage';
import { useWorkoutRoutines } from '../contexts/WorkoutRoutineContext';

/**
 * WorkoutPreviewScreen — opens when a user taps a saved workout in Library.
 *
 * Revamped layout (v2) — the workout twin of MealPlanPreviewScreen v2:
 *   - Hero mosaic: up to 4 TRAINING-DAY TILES (day name + exercise count) as
 *     a full-bleed grid at the top, with a flat scrim holding the overline
 *     ("SAVED WORKOUT · N DAYS/WEEK") and the plan title. The split IS the
 *     product for a program, the way photos are for a meal plan — and unlike
 *     exercise illustrations (contain-fit line art), typographic tiles always
 *     render clean with zero async work.
 *   - Floating back button pinned over the hero (stays put while scrolling).
 *   - Borderless 3-stat strip: program length · exercises/day · min/session.
 *     Days/week lives in the overline now.
 *   - Block tabs (only when >1 block) + day chips replace the accordion.
 *     One selectedBlock/selectedDay pair instead of an openDays Set; every
 *     day is one tap and exercises are always visible.
 *   - Exercise rows get a 44px thumbnail tile + primary-muscle meta line.
 *     Rows stay expandable for the full detail (REST / TARGETS / REPS / RIR /
 *     NOTES). The "+4 more" cap is GONE — with one day shown at a time the
 *     full list is the content, so we show it all.
 *   - Sticky "Start using this plan" CTA unchanged.
 *
 * EXERCISE IMAGES — one-line wire-up:
 *   Point `resolveExerciseImagePair` (below) at the SAME resolver the workout
 *   session screen passes to WorkoutLogScreen as its `resolveExerciseImagePair`
 *   prop. When non-null, every row thumb preloads that exercise's `start`
 *   image (exactly like WorkoutLogScreen's mini cards); until then rows render
 *   a barbell tile, which is the same fallback WorkoutLogScreen uses.
 *
 * Empty-data gate: if no blocks/days resolve, the hero/stats/chips are
 * suppressed entirely — plain header + empty state + CTA only.
 *
 * Expected data shape (from routine.data):
 *   {
 *     routine_name: string,
 *     description: string,
 *     days_per_week: number,
 *     blocks: [{
 *       block_name?: string,
 *       weeks?: string,        // e.g. "1-4"
 *       days: [{
 *         day_name: string,
 *         estimated_duration: number,
 *         exercises: [{
 *           exercise: string,
 *           sets: number,
 *           reps: string,
 *           rest: number,
 *           primaryMuscles: string[],
 *           secondaryMuscles: string[],
 *           reps_weekly?: { [week: string]: string },
 *           rir_weekly?: { [week: string]: string },
 *           notes?: string,
 *         }]
 *       }]
 *     }]
 *   }
 *
 * Has safe fallbacks for other data shapes — won't crash if fields missing.
 *
 * Import path is unchanged: saveRoutine from WorkoutRoutineContext is the
 * SAME writer SamplePlanDetailScreen uses, so the plan becomes the active
 * plan on the home screen (not just a Library copy).
 */

// ── Exercise image wire-up (optional) ─────────────────────────────
// Set this to the resolver used by WorkoutLogScreen, e.g.:
//   import { resolveExerciseImagePair } from '../utils/exerciseImages';
// Leave null and rows render the barbell tile fallback.
type ImagePairResolver = (ex: {
  exercise: string;
  name?: string;
}) => Promise<{ start: any; end: any } | null>;

const resolveExerciseImagePair: ImagePairResolver | null = null;

// ── Types ─────────────────────────────────────────────────────────

type RouteParams = {
  WorkoutPreview: { routine: WorkoutRoutine };
};

type PreviewDay = {
  key: string;
  label: string;
  duration: number;
  exercises: any[];
};

type PreviewBlock = {
  key: string;
  label: string;
  weeks: string | null;
  days: PreviewDay[];
};

export default function WorkoutPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'WorkoutPreview'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const { saveRoutine } = useWorkoutRoutines();

  const { routine } = route.params;
  const data = routine.data || {};

  // ===== Parse top-level fields with safe fallbacks =====
  const planName: string = data.routine_name || data.name || routine.name || 'Untitled Plan';
  const description: string = data.description || '';
  const daysPerWeek: number = data.days_per_week || routine.days || 0;
  const blocks: any[] = Array.isArray(data.blocks) ? data.blocks : [];

  // Compute weeks label from first block's weeks field (e.g. "1-4" → "4wk")
  const weeksLabel = useMemo(() => {
    if (!blocks.length) return null;
    const w = blocks[0].weeks;
    if (typeof w === 'string') {
      const match = w.match(/(\d+)-?(\d+)?/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : start;
        return `${end - start + 1}wk`;
      }
    }
    return null;
  }, [blocks]);

  // Normalize blocks/days into a predictable structure.
  const parsedBlocks: PreviewBlock[] = useMemo(
    () =>
      blocks.map((block, bi) => ({
        key: `block-${bi}`,
        label: block.block_name || `Block ${bi + 1}`,
        weeks: typeof block.weeks === 'string' ? block.weeks : null,
        days: (Array.isArray(block.days) ? block.days : []).map(
          (day: any, di: number): PreviewDay => ({
            key: `${bi}-${di}`,
            label: day.day_name || day.dayName || `Day ${di + 1}`,
            duration: typeof day.estimated_duration === 'number' ? day.estimated_duration : 0,
            exercises: Array.isArray(day.exercises) ? day.exercises : [],
          })
        ),
      })),
    [blocks]
  );

  const hasData = parsedBlocks.some((b) => b.days.length > 0);

  // ===== Stats: program · avg exercises/training day · avg min/session =====
  const stats = useMemo(() => {
    let trainingDays = 0;
    let totalExercises = 0;
    let durationSum = 0;
    let durationDays = 0;
    for (const block of parsedBlocks) {
      for (const day of block.days) {
        if (!day.exercises.length) continue;
        trainingDays++;
        totalExercises += day.exercises.length;
        if (day.duration > 0) {
          durationSum += day.duration;
          durationDays++;
        }
      }
    }
    if (trainingDays === 0) return null;
    return {
      exPerDay: Math.round(totalExercises / trainingDays),
      minPerSession: durationDays > 0 ? Math.round(durationSum / durationDays) : null,
    };
  }, [parsedBlocks]);

  // ===== Hero mosaic: first 4 training days across the program =====
  const heroDays = useMemo(() => {
    const out: PreviewDay[] = [];
    for (const block of parsedBlocks) {
      for (const day of block.days) {
        if (!day.exercises.length) continue;
        out.push(day);
        if (out.length >= 4) return out;
      }
    }
    return out;
  }, [parsedBlocks]);

  const showHero = hasData && heroDays.length > 0;

  // ===== Selection: block tab + day chip =====
  // Default: first block that has a training day, first training day in it.
  const firstTraining = useMemo(() => {
    for (let bi = 0; bi < parsedBlocks.length; bi++) {
      const di = parsedBlocks[bi].days.findIndex((d) => d.exercises.length > 0);
      if (di >= 0) return { bi, di };
    }
    return { bi: 0, di: 0 };
  }, [parsedBlocks]);

  const [selectedBlock, setSelectedBlock] = useState<number>(firstTraining.bi);
  const [selectedDay, setSelectedDay] = useState<number>(firstTraining.di);

  const activeBlock: PreviewBlock | null =
    parsedBlocks[selectedBlock] ?? parsedBlocks[0] ?? null;
  const activeDay: PreviewDay | null =
    activeBlock?.days[selectedDay] ?? activeBlock?.days[0] ?? null;

  const selectBlock = (bi: number) => {
    setSelectedBlock(bi);
    const di = parsedBlocks[bi]?.days.findIndex((d) => d.exercises.length > 0) ?? 0;
    setSelectedDay(di >= 0 ? di : 0);
  };

  // ===== Exercise-level expansion (detail rows) =====
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const toggleExercise = (key: string) => {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ===== Exercise thumbnails (only when the resolver is wired) =====
  // Mirrors WorkoutLogScreen's mini-card preload: one `start` image per
  // unique exercise name across the whole program.
  const [thumbImages, setThumbImages] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!resolveExerciseImagePair) return;
    let cancelled = false;

    const load = async () => {
      const names = new Set<string>();
      parsedBlocks.forEach((b) =>
        b.days.forEach((d) =>
          d.exercises.forEach((ex: any) => {
            const n = ex.exercise || ex.name;
            if (n && typeof n === 'string') names.add(n);
          })
        )
      );

      const map = new Map<string, any>();
      await Promise.all(
        [...names].map(async (n) => {
          try {
            const pair = await resolveExerciseImagePair!({ exercise: n, name: n });
            if (pair?.start) map.set(n, pair.start);
          } catch (e) {
            // Non-fatal — barbell tile fallback
          }
        })
      );

      if (!cancelled) setThumbImages(map);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [parsedBlocks]);

  // ===== Format weekly progression strings =====
  // e.g. { "1": "8, 7, 6", "2": "7, 6, 5" } → "W1: 8, 7, 6 · W2: 7, 6, 5"
  const formatWeekly = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return '';
    return Object.entries(obj)
      .map(([week, reps]) => `W${week}: ${reps}`)
      .join(' · ');
  };

  const overline = `SAVED WORKOUT${
    daysPerWeek ? ` · ${daysPerWeek} DAYS/WEEK` : ''
  }`;

  // ===== CTA: Make this the user's active plan =====
  // Imports the plan onto the home screen via the workout-routine context —
  // exactly the path SamplePlanDetailScreen.handleImport uses.
  const handleStartUsing = () => {
    Alert.alert(
      'Start using this plan?',
      `"${planName}" will become your active workout. You can still find it here in Library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start using',
          onPress: async () => {
            try {
              await saveRoutine({
                id: Date.now().toString(),
                name: planName,
                days: daysPerWeek,
                blocks: blocks.length,
                data,
                programId: data.programId,
              });
              navigation.navigate('Main' as any);
            } catch (error) {
              console.error('Failed to set active plan:', error);
              Alert.alert('Error', 'Could not set as active. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Adaptive mosaic for 1–4 training-day tiles. gap:2 matches the meal hero.
  //
  // Unlike photos, tile TEXT collides with the chrome layered over the hero
  // (status bar + back button at the top, title scrim at the bottom). So text
  // is anchored to the safe band between them:
  //   - top-row tiles bottom-align their text (sits just above the seam)
  //   - bottom-row tiles top-align theirs (sits just below the seam)
  //   - full-height tiles (1–2 day layouts) centre within the safe band via
  //     explicit top/bottom padding
  const renderMosaic = () => {
    const tile = (day: PreviewDay, pos: 'top' | 'bottom' | 'full') => (
      <View
        key={day.key}
        style={[
          styles.heroTile,
          pos === 'top' && styles.heroTileTop,
          pos === 'bottom' && styles.heroTileBottom,
          pos === 'full' && [styles.heroTileFull, { paddingTop: insets.top + 48 }],
        ]}
      >
        <Text style={styles.heroTileName} numberOfLines={1}>
          {day.label.toUpperCase()}
        </Text>
        <Text style={styles.heroTileMeta}>
          {day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'}
        </Text>
      </View>
    );
    const p = heroDays;
    if (p.length === 1) {
      return <View style={styles.heroGrid}>{tile(p[0], 'full')}</View>;
    }
    if (p.length === 2) {
      return (
        <View style={styles.heroGrid}>
          <View style={styles.heroRow}>
            {tile(p[0], 'full')}
            {tile(p[1], 'full')}
          </View>
        </View>
      );
    }
    if (p.length === 3) {
      return (
        <View style={styles.heroGrid}>
          <View style={styles.heroRow}>{tile(p[0], 'top')}</View>
          <View style={styles.heroRow}>
            {tile(p[1], 'bottom')}
            {tile(p[2], 'bottom')}
          </View>
        </View>
      );
    }
    return (
      <View style={styles.heroGrid}>
        <View style={styles.heroRow}>
          {tile(p[0], 'top')}
          {tile(p[1], 'top')}
        </View>
        <View style={styles.heroRow}>
          {tile(p[2], 'bottom')}
          {tile(p[3], 'bottom')}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero mosaic with scrim title, OR plain header ─────────── */}
        {showHero ? (
          <View style={styles.hero}>
            {renderMosaic()}
            <View style={styles.heroOverlay}>
              <View style={styles.heroScrimSoft} />
              <View style={styles.heroScrim}>
                <Text style={[styles.overline, { color: themeColor }]}>{overline}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {planName}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.plainHeader, { paddingTop: insets.top + 56 }]}>
            <Text style={[styles.overline, { color: themeColor }]}>{overline}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {planName}
            </Text>
          </View>
        )}

        {hasData && (
          <>
            {/* ── Stat strip: program · exercises/day · min/session ──── */}
            <View style={styles.statRow}>
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {weeksLabel || '—'}
                </Text>
                <Text style={styles.statLabel}>program</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {stats ? stats.exPerDay : '—'}
                </Text>
                <Text style={styles.statLabel}>exercises / day</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={[styles.statValue, { color: themeColor }]}>
                  {stats?.minPerSession ? `~${stats.minPerSession}` : '—'}
                </Text>
                <Text style={styles.statLabel}>min / session</Text>
              </View>
            </View>

            {/* ── About ──────────────────────────────────────────────── */}
            {description.length > 0 && (
              <View style={styles.aboutBlock}>
                <Text style={[styles.sectionEyebrow, { color: themeColor }]}>ABOUT</Text>
                <Text style={styles.aboutText}>{description}</Text>
              </View>
            )}

            {/* ── Block tabs (only when >1 block) ────────────────────── */}
            {parsedBlocks.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.blockTabsScroll}
                contentContainerStyle={styles.blockTabsRow}
              >
                {parsedBlocks.map((block, bi) => {
                  const selected = bi === selectedBlock;
                  return (
                    <TouchableOpacity
                      key={block.key}
                      style={[
                        styles.blockTab,
                        selected && { borderBottomColor: themeColor },
                      ]}
                      onPress={() => selectBlock(bi)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.blockTabText,
                          selected && { color: themeColor },
                        ]}
                      >
                        {block.label.toUpperCase()}
                        {block.weeks ? ` · W${block.weeks}` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* ── Day chips (or a static label for single-day blocks) ── */}
            {activeBlock && activeBlock.days.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsRow}
              >
                {activeBlock.days.map((day, di) => {
                  const selected = di === selectedDay;
                  const rest = day.exercises.length === 0;
                  return (
                    <TouchableOpacity
                      key={day.key}
                      style={[
                        styles.dayChip,
                        selected && {
                          backgroundColor: themeColor,
                          borderColor: themeColor,
                        },
                        rest && !selected && styles.dayChipRest,
                      ]}
                      onPress={() => setSelectedDay(di)}
                      activeOpacity={0.7}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.dayChipText,
                          selected && styles.dayChipTextSelected,
                        ]}
                      >
                        {day.label.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              activeDay && (
                <View style={styles.singleDayRow}>
                  <Text style={[styles.singleDayLabel, { color: themeColor }]}>
                    {activeDay.label.toUpperCase()}
                  </Text>
                </View>
              )
            )}

            {/* ── Selected day's meta + exercise list ────────────────── */}
            {activeDay && activeDay.exercises.length > 0 ? (
              <>
                <View style={styles.dayMetaRow}>
                  <Text style={styles.dayMetaText}>
                    {activeDay.exercises.length} EXERCISE
                    {activeDay.exercises.length === 1 ? '' : 'S'}
                  </Text>
                  {activeDay.duration > 0 && (
                    <Text style={styles.dayMetaText}>~{activeDay.duration} MIN</Text>
                  )}
                </View>

                <View style={styles.exerciseList}>
                  {activeDay.exercises.map((ex: any, ei: number) => {
                    const exKey = `${selectedBlock}-${selectedDay}-${ei}`;
                    const isExpanded = expandedExercises.has(exKey);
                    const exName = ex.exercise || ex.name || 'Exercise';
                    const setsReps =
                      ex.sets && ex.reps
                        ? `${ex.sets} × ${ex.reps}`
                        : ex.sets || ex.reps || '';

                    const primary = Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : [];
                    const secondary = Array.isArray(ex.secondaryMuscles)
                      ? ex.secondaryMuscles
                      : [];
                    const muscles = [...primary, ...secondary];
                    const repsWeekly = formatWeekly(ex.reps_weekly);
                    const rirWeekly = formatWeekly(ex.rir_weekly);
                    const hasDetail = !!(
                      ex.rest != null ||
                      muscles.length ||
                      repsWeekly ||
                      rirWeekly ||
                      ex.notes
                    );

                    const isLast = ei === activeDay.exercises.length - 1;
                    const thumb = thumbImages.get(exName);

                    return (
                      <View
                        key={exKey}
                        style={[styles.exerciseRow, isLast && { borderBottomWidth: 0 }]}
                      >
                        <TouchableOpacity
                          style={styles.exerciseHeader}
                          onPress={() => hasDetail && toggleExercise(exKey)}
                          activeOpacity={hasDetail ? 0.6 : 1}
                          disabled={!hasDetail}
                        >
                          <View style={styles.exerciseThumb}>
                            {thumb ? (
                              <Image
                                source={thumb}
                                style={styles.exerciseThumbImg}
                                resizeMode="cover"
                              />
                            ) : (
                              <Ionicons name="barbell-outline" size={18} color="#52525b" />
                            )}
                          </View>

                          <View style={styles.exerciseInfo}>
                            <Text style={styles.exerciseName} numberOfLines={1}>
                              {exName}
                            </Text>
                            {primary.length > 0 && (
                              <Text style={styles.exerciseMuscles} numberOfLines={1}>
                                {primary.join(' · ')}
                              </Text>
                            )}
                          </View>

                          <Text style={styles.exerciseSetsReps}>{setsReps}</Text>
                          {hasDetail && (
                            <Ionicons
                              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                              size={12}
                              color={isExpanded ? themeColor : '#52525b'}
                              style={{ marginLeft: 8 }}
                            />
                          )}
                        </TouchableOpacity>

                        {/* Exercise detail — visible when expanded */}
                        {isExpanded && hasDetail && (
                          <View style={styles.exerciseDetail}>
                            {ex.rest != null && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>REST</Text>
                                <Text style={styles.detailValueMuted}>{ex.rest}s</Text>
                              </View>
                            )}
                            {muscles.length > 0 && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>TARGETS</Text>
                                <Text style={styles.detailValue}>{muscles.join(', ')}</Text>
                              </View>
                            )}
                            {repsWeekly && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>REPS</Text>
                                <Text style={styles.detailValueMuted}>{repsWeekly}</Text>
                              </View>
                            )}
                            {rirWeekly && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>RIR</Text>
                                <Text style={styles.detailValueMuted}>{rirWeekly}</Text>
                              </View>
                            )}
                            {ex.notes && (
                              <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>NOTES</Text>
                                <Text style={styles.detailValue}>{ex.notes}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              activeDay && (
                <View style={styles.restBlock}>
                  <Ionicons name="moon-outline" size={22} color="#52525b" />
                  <Text style={styles.restBlockText}>Rest day. Nothing scheduled.</Text>
                </View>
              )
            )}
          </>
        )}

        {/* ── Empty state if no blocks/data ──────────────────────────── */}
        {!hasData && (
          <View style={styles.emptyDataBlock}>
            <Ionicons name="alert-circle-outline" size={32} color="#71717a" />
            <Text style={styles.emptyDataText}>
              This workout doesn't have detailed plan data. You can still start using it.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating back button — pinned over the hero, above the scroll */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 4 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={22} color="#ffffff" />
      </TouchableOpacity>

      {/* Sticky CTA */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 12 }]}>
        <GHTouchable
          style={[styles.ctaButton, { backgroundColor: themeColor }]}
          onPress={handleStartUsing}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>Start using this plan</Text>
        </GHTouchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    // No horizontal padding here — the hero is full-bleed.
    // Inner sections carry their own paddingHorizontal.
  },

  // Floating back button
  backBtn: {
    position: 'absolute',
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero mosaic (training-day tiles)
  // 360 tall (vs 300 on the meal hero): text tiles need a safe band between
  // the status bar and the title scrim, which photos don't.
  hero: {
    height: 360,
    backgroundColor: '#131316',
  },
  heroGrid: {
    flex: 1,
    gap: 2,
  },
  heroRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 2,
  },
  heroTile: {
    flex: 1,
    backgroundColor: '#131316',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  // Top-row tiles: text hugs the bottom of the tile, clear of the status bar.
  heroTileTop: {
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  // Bottom-row tiles: text hugs the top of the tile, clear of the scrim.
  heroTileBottom: {
    justifyContent: 'flex-start',
    paddingTop: 12,
  },
  // Full-height tiles (1–2 day layouts): centre within the safe band.
  // paddingTop (insets.top + 48) is applied inline where insets are known.
  heroTileFull: {
    paddingBottom: 140,
  },
  heroTileName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fafafa',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  heroTileMeta: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Two flat layers fake a soft gradient without expo-linear-gradient.
  heroScrimSoft: {
    height: 26,
    backgroundColor: 'rgba(10, 10, 11, 0.55)',
  },
  heroScrim: {
    backgroundColor: 'rgba(10, 10, 11, 0.92)',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
  },

  // Plain header (no resolvable data)
  plainHeader: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },

  // Overline + title (shared by hero scrim and plain header)
  overline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
    lineHeight: 30, // bounded so the scrim's max height (2 lines) is known
  },

  // Stat strip
  statRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  // About
  aboutBlock: {
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 21,
  },

  // Block tabs (multi-block programs only)
  blockTabsScroll: {
    flexGrow: 0,
  },
  blockTabsRow: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 18,
  },
  blockTab: {
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  blockTabText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#71717a',
  },

  // Day chips
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    backgroundColor: '#131316',
    maxWidth: 220, // long generated day names truncate instead of dominating
  },
  dayChipRest: {
    opacity: 0.4,
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#a1a1aa',
  },
  dayChipTextSelected: {
    color: '#0a0a0b',
  },

  // Single-day label (chips would be pointless for one day)
  singleDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  singleDayLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  // Day meta row (count + duration for the selected day)
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  dayMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#52525b',
    letterSpacing: 0.8,
  },

  // Exercise list
  exerciseList: {
    paddingHorizontal: 18,
  },
  exerciseRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1c1c20',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
  },
  exerciseThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#131316',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
    flexShrink: 0,
  },
  exerciseThumbImg: {
    width: '100%',
    height: '100%',
  },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  exerciseMuscles: {
    fontSize: 10,
    color: '#5f5f68',
    letterSpacing: 0.4,
    marginTop: 3,
  },
  exerciseSetsReps: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },

  // Exercise detail (expanded view)
  exerciseDetail: {
    paddingTop: 2,
    paddingBottom: 14,
    paddingLeft: 56, // aligns with text column (thumb 44 + gap 12)
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#52525b',
    letterSpacing: 0.5,
    width: 64,
    paddingTop: 1,
  },
  detailValue: {
    fontSize: 12,
    color: '#a1a1aa',
    flex: 1,
    lineHeight: 18,
  },
  detailValueMuted: {
    fontSize: 11,
    color: '#71717a',
    flex: 1,
    lineHeight: 17,
  },

  // Rest day state
  restBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  restBlockText: {
    fontSize: 13,
    color: '#71717a',
  },

  // Empty data state
  emptyDataBlock: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyDataText: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 19,
  },

  // Sticky CTA
  ctaBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(10, 10, 11, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  ctaButton: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
  },
});