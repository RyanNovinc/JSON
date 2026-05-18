import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { TouchableOpacity as GHTouchable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, WorkoutRoutine } from '../utils/storage';

/**
 * WorkoutPreviewScreen — opens when a user taps a saved workout in Library.
 *
 * Mirrors the JSON.fit shared workout web view:
 *   - Title + saved pill + 3-stat grid
 *   - Collapsible day sections (first day open by default)
 *   - Each exercise row expandable to show Rest / Targets /
 *     Reps weekly / RIR weekly / Notes
 *   - "+ N more exercises" toggle when a day has >4 exercises
 *   - Sticky "Start using this plan" CTA at the bottom
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

type RouteParams = {
  WorkoutPreview: { routine: WorkoutRoutine };
};

const DEFAULT_VISIBLE_EXERCISES = 4;

export default function WorkoutPreviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'WorkoutPreview'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

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
              await WorkoutStorage.addMyRoutine(routine);
              navigation.goBack();
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
      {/* ============================================================
          Header bar — back button only
          ============================================================ */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 4 }]}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }, // room for sticky CTA
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================================
            Saved pill
            ============================================================ */}
        <View style={styles.pillRow}>
          <View style={[
            styles.savedPill,
            { borderColor: themeColor + '40', backgroundColor: themeColor + '15' },
          ]}>
            <View style={[styles.savedDot, { backgroundColor: themeColor }]} />
            <Text style={[styles.savedPillText, { color: themeColor }]}>SAVED WORKOUT</Text>
          </View>
        </View>

        {/* ============================================================
            Title
            ============================================================ */}
        <Text style={styles.title}>{planName}</Text>

        {/* ============================================================
            Stat grid: days/week · weeks · blocks
            ============================================================ */}
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

        {/* ============================================================
            About section
            ============================================================ */}
        {description.length > 0 && (
          <View style={styles.aboutBlock}>
            <Text style={[styles.sectionEyebrow, { color: themeColor }]}>ABOUT</Text>
            <Text style={styles.aboutText}>{description}</Text>
          </View>
        )}

        {/* ============================================================
            Day sections per block
            ============================================================ */}
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

                            const muscles = [
                              ...(Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : []),
                              ...(Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : []),
                            ];
                            const repsWeekly = formatWeekly(ex.reps_weekly);
                            const rirWeekly = formatWeekly(ex.rir_weekly);
                            const hasDetail = ex.rest || muscles.length || repsWeekly || rirWeekly || ex.notes;

                            const isLast = exIndex === visibleExercises.length - 1 && hiddenCount === 0;

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
                                  <Text style={styles.exerciseName} numberOfLines={1}>
                                    {exName}
                                  </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },

  // ===== Header bar =====
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  // ===== Scroll =====
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    paddingLeft: 22,
    paddingBottom: 8,
  },
  exerciseRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1f1f23',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
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