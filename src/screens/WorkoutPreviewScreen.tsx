import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { TouchableOpacity as GHTouchable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutRoutine } from '../utils/storage';
import { useWorkoutRoutines } from '../contexts/WorkoutRoutineContext';
import { resolveExerciseImagePair } from '../utils/exerciseImages';

/**
 * WorkoutPreviewScreen — opens when a user taps a saved workout in Library.
 *
 * Leads with a full-bleed 16:9 hero of the featured exercise and gives every
 * exercise row a thumbnail. The hero image cycles between the exercise's start
 * and end frames exactly like WorkoutLogScreen: a SINGLE <Image> whose source
 * is swapped every second (hard cut, no cross-fade). Structure, parsing,
 * expansion behaviour and the "Start using this plan" CTA are unchanged.
 *
 * ── Hero treatment (mirrors WorkoutLogScreen) ───────────────────────────────
 *  - media container is absolute-fill with a top padding, so the figure drops
 *    below the status bar / Dynamic Island while the back button stays at top
 *    (same idea as fullScreenMediaContainer: { paddingTop: 45 }).
 *  - hero background is #000, image is width/height:100% + resizeMode:contain,
 *    so the contain letterbox is the SAME black as the frame → seamless.
 *
 * ── Exercise images ─────────────────────────────────────────────────────────
 * Wired to the SAME resolver the workout session uses: resolveExerciseImagePair
 * from utils/exerciseImages, themed by isPinkTheme ('pink' | 'blue') exactly
 * like WorkoutLogScreenAdapter. Anything the resolver returns null for — or any
 * image that fails to load — falls back to a barbell tile automatically.
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
 */

type ImagePair = { start: any; end: any } | null;
type ImagePairResolver = (
  exercise: { exercise?: string; name?: string },
) => Promise<ImagePair>;

type RouteParams = {
  WorkoutPreview: {
    routine: WorkoutRoutine;
    /** Optional override — wins over the built-in themed resolver if provided. */
    resolveExerciseImagePair?: ImagePairResolver;
  };
};

const DEFAULT_VISIBLE_EXERCISES = 4;

/** Accept either a remote URL string or a local require()'d asset. */
const srcOf = (img: any) => (typeof img === 'string' ? { uri: img } : img);

export default function WorkoutPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'WorkoutPreview'>>();
  const insets = useSafeAreaInsets();
  const { themeColor, isPinkTheme } = useTheme();

  // Home-screen routine list lives in this context. saveRoutine is the SAME
  // writer SamplePlanDetailScreen uses to import a plan — it makes the plan
  // the active/current plan on the home screen.
  const { saveRoutine } = useWorkoutRoutines();

  const { routine } = route.params;
  const data = routine.data || {};

  // Image resolution — same path WorkoutLogScreenAdapter uses: the shared
  // resolveExerciseImagePair(exercise, theme), themed by isPinkTheme. An
  // optional route-param override still wins if one is passed in.
  const imageTheme: 'pink' | 'blue' = isPinkTheme ? 'pink' : 'blue';
  const overrideResolver = route.params?.resolveExerciseImagePair ?? null;

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

  // ===== Expansion state =====
  // Day-level: which day sections are open. Default: first training day open.
  const [openDays, setOpenDays] = useState<Set<string>>(() => {
    for (let bi = 0; bi < blocks.length; bi++) {
      const days = Array.isArray(blocks[bi].days) ? blocks[bi].days : [];
      for (let di = 0; di < days.length; di++) {
        if (Array.isArray(days[di].exercises) && days[di].exercises.length > 0) {
          return new Set([`${bi}-${di}`]);
        }
      }
    }
    return new Set();
  });

  // Exercise-level: which exercises within each day are expanded for detail
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  // "+ N more" state: which days have their hidden exercises revealed
  const [showAllExercises, setShowAllExercises] = useState<Set<string>>(new Set());

  const toggleDay = (key: string) => {
    setOpenDays(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleExercise = (key: string) => {
    setExpandedExercises(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleShowAll = (key: string) => {
    setShowAllExercises(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ===== Format weekly progression strings =====
  // e.g. { "1": "8, 7, 6", "2": "7, 6, 5" } → "W1: 8, 7, 6 · W2: 7, 6, 5"
  const formatWeekly = (obj: any): string => {
    if (!obj || typeof obj !== 'object') return '';
    return Object.entries(obj)
      .map(([week, reps]) => `W${week}: ${reps}`)
      .join(' · ');
  };

  // ===== Exercise imagery =====
  // Featured exercise = first exercise of the first training day → drives the hero.
  const featured = useMemo<string | null>(() => {
    for (const b of blocks) {
      const days = Array.isArray(b.days) ? b.days : [];
      for (const d of days) {
        const exs = Array.isArray(d.exercises) ? d.exercises : [];
        if (exs.length) return exs[0].exercise || exs[0].name || null;
      }
    }
    return null;
  }, [blocks]);

  // Pre-load every exercise's start/end pair once (keyed by name), mirroring the
  // log screen's miniCardImages map. Thumbnails use `.start`; the hero uses both.
  const [imagesByName, setImagesByName] = useState<Record<string, ImagePair>>({});
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const names = new Set<string>();
      blocks.forEach((b) =>
        (Array.isArray(b.days) ? b.days : []).forEach((d: any) =>
          (Array.isArray(d.exercises) ? d.exercises : []).forEach((ex: any) => {
            const n = ex.exercise || ex.name;
            if (n) names.add(n);
          }),
        ),
      );

      const map: Record<string, ImagePair> = {};
      await Promise.all(
        [...names].map(async (n) => {
          try {
            map[n] = overrideResolver
              ? await overrideResolver({ exercise: n, name: n })
              : await resolveExerciseImagePair({ exercise: n, name: n } as any, imageTheme);
          } catch {
            map[n] = null;
          }
        }),
      );

      if (!cancelled) setImagesByName(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [blocks, imageTheme, overrideResolver]);

  const heroPair = featured ? imagesByName[featured] : null;

  // Hero image cycling — a SINGLE image whose source swaps between the start and
  // end frames every second. This is exactly how WorkoutLogScreen animates its
  // exercise image (startImageCycling → setImageCache): a hard cut, not a fade.
  // If the frame fails to load, we fall back to the barbell tile.
  const [heroFrame, setHeroFrame] = useState<any>(null);
  const [heroFailed, setHeroFailed] = useState(false);
  const heroPhaseRef = useRef<'start' | 'end'>('start');

  useEffect(() => {
    setHeroFailed(false);
    heroPhaseRef.current = 'start';

    const start = heroPair?.start ?? null;
    const end = heroPair?.end ?? null;
    setHeroFrame(start);

    if (!start || !end) return; // single frame (or none) — nothing to cycle

    const id = setInterval(() => {
      heroPhaseRef.current = heroPhaseRef.current === 'start' ? 'end' : 'start';
      setHeroFrame(heroPhaseRef.current === 'start' ? start : end);
    }, 1000);

    return () => clearInterval(id);
  }, [heroPair?.start, heroPair?.end]);

  // ===== CTA: Make this the user's active plan =====
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================
            Hero — featured exercise, cycling start/end frames.
            Mirrors WorkoutLogScreen: single swapping <Image>, #000 behind it
            so the contain letterbox matches the frame's black, and a top
            padding to drop the figure below the status bar.
            ============================================================ */}
        <View style={styles.hero}>
          <View style={[styles.heroMedia, { paddingTop: insets.top }]}>
            {heroFrame && !heroFailed ? (
              <Image
                source={srcOf(heroFrame)}
                style={styles.heroImg}
                resizeMode="contain"
                onError={() => setHeroFailed(true)}
              />
            ) : (
              <View style={styles.heroPlaceholder}>
                <Ionicons name="barbell-outline" size={58} color="#3a3a44" />
              </View>
            )}

            {/* Subtle dark wash so the back button stays legible over the image */}
            <View style={styles.heroOverlay} />
          </View>

          {/* Overlaid header — back button (stays at the top, above the padding) */}
          <View style={[styles.heroHeader, { paddingTop: insets.top + 6 }]}>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================
            Body
            ============================================================ */}
        <View style={styles.body}>
          {/* Saved pill */}
          <View style={styles.pillRow}>
            <View style={[
              styles.savedPill,
              { borderColor: themeColor + '40', backgroundColor: themeColor + '15' },
            ]}>
              <View style={[styles.savedDot, { backgroundColor: themeColor }]} />
              <Text style={[styles.savedPillText, { color: themeColor }]}>SAVED WORKOUT</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{planName}</Text>

          {/* Stat grid: days/week · weeks · blocks */}
          <View style={styles.statGrid}>
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: themeColor }]}>{daysPerWeek || '—'}</Text>
              <Text style={styles.statLabel}>days/week</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: themeColor }]}>{weeksLabel || '—'}</Text>
              <Text style={styles.statLabel}>program</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={[styles.statValue, { color: themeColor }]}>{blocks.length || '—'}</Text>
              <Text style={styles.statLabel}>{blocks.length === 1 ? 'block' : 'blocks'}</Text>
            </View>
          </View>

          {/* About section */}
          {description.length > 0 && (
            <View style={styles.aboutBlock}>
              <Text style={[styles.sectionEyebrow, { color: themeColor }]}>ABOUT</Text>
              <Text style={styles.aboutText}>{description}</Text>
            </View>
          )}

          {/* Day sections per block */}
          <View style={styles.daysSection}>
            {blocks.map((block, blockIndex) => {
              const days = Array.isArray(block.days) ? block.days : [];
              return (
                <View key={`block-${blockIndex}`}>
                  {/* Block header — only shown when >1 block */}
                  {blocks.length > 1 && (
                    <Text style={styles.blockHeader}>
                      {(block.block_name || `Block ${blockIndex + 1}`).toUpperCase()}
                    </Text>
                  )}

                  {days.map((day: any, dayIndex: number) => {
                    const dayKey = `${blockIndex}-${dayIndex}`;
                    const isOpen = openDays.has(dayKey);
                    const exercises = Array.isArray(day.exercises) ? day.exercises : [];
                    const isRestDay = exercises.length === 0;
                    const duration = day.estimated_duration;

                    // Visible exercise count: 4 by default, all when expanded
                    const showAll = showAllExercises.has(dayKey);
                    const visibleCount = showAll
                      ? exercises.length
                      : Math.min(DEFAULT_VISIBLE_EXERCISES, exercises.length);
                    const visibleExercises = exercises.slice(0, visibleCount);
                    const hiddenCount = exercises.length - visibleCount;

                    return (
                      <View key={dayKey} style={styles.dayBlock}>
                        {/* Day header — tappable to toggle open */}
                        <TouchableOpacity
                          style={styles.dayHeader}
                          onPress={() => !isRestDay && toggleDay(dayKey)}
                          activeOpacity={isRestDay ? 1 : 0.6}
                          disabled={isRestDay}
                        >
                          {!isRestDay && (
                            <Ionicons
                              name={isOpen ? 'chevron-down' : 'chevron-forward'}
                              size={14}
                              color={themeColor}
                              style={{ marginRight: 8 }}
                            />
                          )}
                          <Text style={[
                            styles.dayName,
                            { color: isRestDay ? '#52525b' : themeColor },
                          ]}>
                            {(day.day_name || `Day ${dayIndex + 1}`).toUpperCase()}
                          </Text>
                          {!isRestDay && duration > 0 && (
                            <Text style={styles.dayDuration}>~{duration} min</Text>
                          )}
                          {isRestDay && (
                            <Text style={styles.restLabel}>rest</Text>
                          )}
                        </TouchableOpacity>

                        {/* Exercise list — only when day is open */}
                        {isOpen && !isRestDay && (
                          <View style={styles.exerciseList}>
                            {visibleExercises.map((ex: any, exIndex: number) => {
                              const exKey = `${dayKey}-${exIndex}`;
                              const isExpanded = expandedExercises.has(exKey);
                              const exName = ex.exercise || ex.name || 'Exercise';
                              const setsReps = ex.sets && ex.reps
                                ? `${ex.sets} × ${ex.reps}`
                                : (ex.sets || ex.reps || '');

                              const primary = Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : [];
                              const secondary = Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [];
                              const muscles = [...primary, ...secondary];
                              const muscleSubtitle = primary.join(' · ');
                              const repsWeekly = formatWeekly(ex.reps_weekly);
                              const rirWeekly = formatWeekly(ex.rir_weekly);
                              const hasDetail = ex.rest || muscles.length || repsWeekly || rirWeekly || ex.notes;

                              const isLast = exIndex === visibleExercises.length - 1 && hiddenCount === 0;
                              const thumb = imagesByName[exName]?.start || ex.imageUrl || null;

                              return (
                                <View
                                  key={exKey}
                                  style={[
                                    styles.exerciseRow,
                                    isLast && { borderBottomWidth: 0 },
                                  ]}
                                >
                                  <TouchableOpacity
                                    style={styles.exerciseHeader}
                                    onPress={() => hasDetail && toggleExercise(exKey)}
                                    activeOpacity={hasDetail ? 0.6 : 1}
                                    disabled={!hasDetail}
                                  >
                                    {/* Thumbnail (image-over-icon, self-healing fallback) */}
                                    <ExerciseThumb uri={thumb} themeColor={themeColor} />

                                    {/* Name + muscle subtitle */}
                                    <View style={styles.exTextWrap}>
                                      <Text style={styles.exerciseName} numberOfLines={1}>
                                        {exName}
                                      </Text>
                                      {muscleSubtitle.length > 0 && (
                                        <Text style={styles.exMuscle} numberOfLines={1}>
                                          {muscleSubtitle}
                                        </Text>
                                      )}
                                    </View>

                                    <Text style={styles.exerciseSetsReps}>{setsReps}</Text>
                                    {hasDetail && (
                                      <Ionicons
                                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                                        size={14}
                                        color={isExpanded ? themeColor : '#52525b'}
                                        style={{ marginLeft: 10 }}
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
                                          <Text style={styles.detailValue}>
                                            {muscles.join(', ')}
                                          </Text>
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

                            {/* "+ N more" toggle */}
                            {hiddenCount > 0 && (
                              <TouchableOpacity
                                style={styles.toggleMore}
                                onPress={() => toggleShowAll(dayKey)}
                                activeOpacity={0.6}
                              >
                                <Text style={styles.toggleMoreText}>
                                  + {hiddenCount} more exercise{hiddenCount === 1 ? '' : 's'} ▾
                                </Text>
                              </TouchableOpacity>
                            )}

                            {/* Show "Show less" when all are visible and there were hidden ones */}
                            {showAll && exercises.length > DEFAULT_VISIBLE_EXERCISES && (
                              <TouchableOpacity
                                style={styles.toggleMore}
                                onPress={() => toggleShowAll(dayKey)}
                                activeOpacity={0.6}
                              >
                                <Text style={styles.toggleMoreText}>Show less ▴</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>

          {/* Empty state if no blocks/data */}
          {blocks.length === 0 && (
            <View style={styles.emptyDataBlock}>
              <Ionicons name="alert-circle-outline" size={32} color="#71717a" />
              <Text style={styles.emptyDataText}>
                This workout doesn't have detailed plan data. You can still start using it.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ============================================================
          Sticky CTA — "Start using this plan"
          ============================================================ */}
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

// ── Exercise thumbnail ───────────────────────────────────────────────────────
// Barbell icon sits underneath; the image paints over it on success. If the
// image is missing or fails to load, the icon is what's left — no flicker, no
// broken-image box.
function ExerciseThumb({ uri, themeColor }: { uri: any; themeColor: string }) {
  const [failed, setFailed] = useState(false);

  // Reset failure state if the source changes (e.g. images resolve in late).
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View style={[
      styles.exThumb,
      { borderColor: themeColor + '2A', backgroundColor: themeColor + '12' },
    ]}>
      <Ionicons name="barbell-outline" size={22} color={themeColor} />
      {uri && !failed ? (
        <Image
          source={srcOf(uri)}
          style={styles.exThumbImg}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ===== Scroll =====
  scroll: { flex: 1, backgroundColor: '#000' },
  body: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  // ===== Hero =====
  // #000 background (matches the exercise frame's black) so the contain
  // letterbox is invisible — same trick WorkoutLogScreen relies on.
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroMedia: {
    ...StyleSheet.absoluteFillObject,
    // paddingTop is set inline (= insets.top) to drop the figure below the
    // status bar / Dynamic Island, mirroring fullScreenMediaContainer.
  },
  heroImg: {
    width: '100%',
    height: '100%',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  heroHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ===== Saved pill =====
  pillRow: {
    alignItems: 'center',
    marginBottom: 22,
  },
  savedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  savedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  savedPillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  // ===== Title =====
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 24,
  },

  // ===== Stat grid =====
  statGrid: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statLabel: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 6,
    letterSpacing: 0.2,
  },

  // ===== About =====
  aboutBlock: {
    marginBottom: 24,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 21,
  },

  // ===== Day sections =====
  daysSection: {
    marginBottom: 16,
  },
  blockHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#71717a',
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 4,
  },
  dayBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    flex: 1,
  },
  dayDuration: {
    fontSize: 11,
    color: '#71717a',
    letterSpacing: 0.3,
  },
  restLabel: {
    fontSize: 11,
    color: '#52525b',
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },

  // ===== Exercise list =====
  exerciseList: {
    paddingLeft: 8,
    paddingBottom: 8,
  },
  exerciseRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  exThumb: {
    width: 46,
    height: 46,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  exThumbImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  exTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  exMuscle: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  exerciseSetsReps: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },

  // ===== Exercise detail (expanded view) =====
  exerciseDetail: {
    paddingTop: 10,
    paddingBottom: 14,
    paddingLeft: 58,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f1f23',
    borderStyle: 'dashed',
    marginTop: 0,
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

  // ===== "+ N more" toggle =====
  toggleMore: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  toggleMoreText: {
    fontSize: 11,
    color: '#52525b',
    letterSpacing: 0.5,
  },

  // ===== Empty data state =====
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

  // ===== Sticky CTA =====
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