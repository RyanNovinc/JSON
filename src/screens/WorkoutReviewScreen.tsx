import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Modal,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkoutStorage, WorkoutHistory } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';
import { navigate } from '../utils/navigationRef';

type WorkoutReviewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'WorkoutReview'>;
type WorkoutReviewScreenRouteProp = RouteProp<RootStackParamList, 'WorkoutReview'>;

interface Exercise {
  exercise: string;
  sets: number;
  reps: string;
  rest?: number;
  notes?: string;
  alternatives?: string[];
}

interface Day {
  day_name: string;
  exercises: Exercise[];
}

interface CompletionStats {
  duration: number;
  totalVolume: number;
  date: string;
}

export default function WorkoutReviewScreen() {
  const { themeColor } = useTheme();
  const { activeWorkout } = useActiveWorkout();
  const navigation = useNavigation<WorkoutReviewScreenNavigationProp>();
  const route = useRoute<WorkoutReviewScreenRouteProp>();
  const { day, blockName, completionStats, currentWeek } = route.params;

  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory[]>([]);
  const [showRedoModal, setShowRedoModal] = useState(false);
  const [showActiveWorkoutModal, setShowActiveWorkoutModal] = useState(false);

  useEffect(() => {
    loadWorkoutHistory();
  }, []);

  const loadWorkoutHistory = async () => {
    const history = await WorkoutStorage.loadWorkoutHistory();
    const currentDate = new Date(completionStats.date).toISOString().split('T')[0];

    const relevantHistory = history.filter(entry =>
      entry.dayName === day.day_name &&
      entry.date === currentDate &&
      entry.routineName === blockName
    );

    setWorkoutHistory(relevantHistory);
  };

  const handleRedo = () => {
    if (activeWorkout) {
      const currentWorkoutMatches = activeWorkout.routeParams?.day?.day_name === day?.day_name &&
                                   activeWorkout.routeParams?.blockName === blockName;

      if (!currentWorkoutMatches) {
        setShowActiveWorkoutModal(true);
        return;
      }
    }

    setShowRedoModal(true);
  };

  const handleConfirmRedo = async () => {
    const completedKey = `completed_${blockName}_week${currentWeek.toString()}`;
    const completed = await AsyncStorage.getItem(completedKey);
    if (completed) {
      const completedSet = new Set(JSON.parse(completed));
      completedSet.delete(`${day.day_name}_week${currentWeek.toString()}`);
      await AsyncStorage.setItem(completedKey, JSON.stringify(Array.from(completedSet)));
    }

    const statsKey = `completionStats_${blockName}_week${currentWeek.toString()}`;
    const existingStats = await AsyncStorage.getItem(statsKey);
    if (existingStats) {
      const statsMap = new Map(JSON.parse(existingStats));
      statsMap.delete(`${day.day_name}_week${currentWeek.toString()}`);
      await AsyncStorage.setItem(statsKey, JSON.stringify(Array.from(statsMap)));
    }

    navigation.replace('WorkoutLog' as any, { day, blockName });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${month} ${day}, ${year} · ${hour12}:${mins} ${period}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatVolume = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
    return Math.round(kg).toLocaleString();
  };

  const getExerciseHistory = (exerciseName: string) => {
    return workoutHistory.find(h =>
      h.exerciseName === exerciseName ||
      day.exercises.find(e => e.exercise === exerciseName)?.alternatives?.includes(h.exerciseName)
    );
  };

  const completedCount = day.exercises.filter(e => getExerciseHistory(e.exercise)).length;
  const totalExercises = day.exercises.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerLabel}>REVIEW</Text>

        <TouchableOpacity
          style={styles.redoButton}
          onPress={handleRedo}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={14} color={themeColor} />
          <Text style={[styles.redoButtonText, { color: themeColor }]}>Redo</Text>
        </TouchableOpacity>
      </View>

      {/* Title + completed badge */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{day.day_name}</Text>
        <View style={styles.subtitleRow}>
          <View style={[styles.completedDot, { backgroundColor: themeColor }]} />
          <Text style={styles.subtitleText}>
            COMPLETED · {completedCount}/{totalExercises} EXERCISES
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Stats card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: hexA(themeColor, 0.04),
              borderColor: hexA(themeColor, 0.22),
            },
          ]}
        >
          <Text style={styles.heroDate}>{formatDate(completionStats.date)}</Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {formatDuration(completionStats.duration)}
              </Text>
              <Text style={styles.heroStatLabel}>DURATION</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {formatVolume(completionStats.totalVolume)} kg
              </Text>
              <Text style={styles.heroStatLabel}>VOLUME LIFTED</Text>
            </View>
          </View>
        </View>

        {/* Exercises section header */}
        <Text style={styles.sectionLabel}>EXERCISES</Text>

        {/* Exercises list */}
        <View style={styles.exercisesList}>
          {day.exercises.map((exercise, index) => {
            const history = getExerciseHistory(exercise.exercise);
            const exerciseName = history?.exerciseName || exercise.exercise;
            const wasSkipped = !history;

            return (
              <View
                key={index}
                style={[
                  styles.exerciseCard,
                  wasSkipped && styles.exerciseCardSkipped,
                ]}
              >
                <View style={styles.exerciseHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={[
                        styles.exerciseName,
                        wasSkipped && styles.exerciseNameSkipped,
                      ]}
                      numberOfLines={2}
                    >
                      {exerciseName}
                    </Text>
                    {!wasSkipped && history && (
                      <Text style={styles.exerciseMeta}>
                        {history.sets.length} SET{history.sets.length !== 1 ? 'S' : ''}
                        {' · '}
                        {history.sets.reduce((sum, s) => sum + (parseInt(String(s.reps), 10) || 0), 0)} TOTAL REPS
                      </Text>
                    )}
                  </View>

                  {wasSkipped ? (
                    <View style={styles.skippedBadge}>
                      <Text style={styles.skippedBadgeText}>SKIPPED</Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.completedBadge,
                        { backgroundColor: hexA(themeColor, 0.12) },
                      ]}
                    >
                      <Ionicons name="checkmark" size={14} color={themeColor} />
                    </View>
                  )}
                </View>

                {history && history.sets.length > 0 && (
                  <View style={styles.setsTable}>
                    <View style={styles.setsTableHeader}>
                      <Text style={[styles.setsTableHeaderCell, { width: 36 }]}>SET</Text>
                      <Text style={[styles.setsTableHeaderCell, { flex: 1 }]}>KG</Text>
                      <Text style={[styles.setsTableHeaderCell, { flex: 1 }]}>REPS</Text>
                    </View>

                    {history.sets.map((set, setIndex) => (
                      <View key={setIndex}>
                        <View style={styles.setRow}>
                          <Text style={[styles.setNum, { width: 36 }]}>
                            {set.setNumber}
                          </Text>
                          <Text style={[styles.setValue, { flex: 1, color: themeColor }]}>
                            {set.weight}
                          </Text>
                          <Text style={[styles.setValue, { flex: 1 }]}>
                            {set.reps}
                          </Text>
                        </View>

                        {set.drops && set.drops.length > 0 && (
                          <View style={styles.dropSetsContainer}>
                            {set.drops.map((drop, dropIndex) => (
                              <View key={dropIndex} style={styles.dropSetRow}>
                                <Text style={[styles.dropSetLabel, { width: 36 }]}>
                                  ↳
                                </Text>
                                <Text style={[styles.dropSetValue, { flex: 1, color: hexA(themeColor, 0.7) }]}>
                                  {drop.weight}
                                </Text>
                                <Text style={[styles.dropSetValue, { flex: 1 }]}>
                                  {drop.reps}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Active Workout Warning Modal */}
      <Modal
        visible={showActiveWorkoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActiveWorkoutModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowActiveWorkoutModal(false)}
          />

          <View style={styles.modalSheet}>
            <View style={styles.modalIconWrap}>
              <View style={styles.modalIconCircleWarning}>
                <Ionicons name="warning" size={26} color="#f7b220" />
              </View>
            </View>

            <Text style={styles.modalTitle}>Workout in progress</Text>
            <Text style={styles.modalSubtitle}>
              You already have an active workout: {activeWorkout?.dayName}
            </Text>

            <View style={styles.modalButtonsCol}>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, { backgroundColor: themeColor }]}
                onPress={() => {
                  setShowActiveWorkoutModal(false);
                  navigate('WorkoutLog', activeWorkout!.routeParams);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.modalPrimaryText}>Go to active workout</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setShowActiveWorkoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Redo Confirmation Modal */}
      <Modal
        visible={showRedoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRedoModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowRedoModal(false)}
          />

          <View style={styles.modalSheet}>
            <View style={styles.modalIconWrap}>
              <View
                style={[
                  styles.modalIconCircle,
                  {
                    backgroundColor: hexA(themeColor, 0.08),
                    borderColor: hexA(themeColor, 0.3),
                  },
                ]}
              >
                <Ionicons name="refresh" size={26} color={themeColor} />
              </View>
            </View>

            <Text style={styles.modalTitle}>Start fresh?</Text>
            <Text style={styles.modalSubtitle}>
              This will clear your previous data for {day.day_name} and start a new session.
            </Text>

            <View style={styles.modalButtonsCol}>
              <TouchableOpacity
                style={[styles.modalPrimaryButton, { backgroundColor: themeColor }]}
                onPress={handleConfirmRedo}
                activeOpacity={0.85}
              >
                <Text style={styles.modalPrimaryText}>Start fresh</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => setShowRedoModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSecondaryText}>Keep data</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    color: '#9898a4',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },
  redoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  redoButtonText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },

  // Title block
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  title: {
    color: '#f0f0f2',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: 'Outfit-Bold',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  completedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subtitleText: {
    color: '#9898a4',
    fontSize: 10,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },

  scrollView: {
    flex: 1,
  },

  // Hero stats card
  heroCard: {
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  heroDate: {
    color: '#9898a4',
    fontSize: 11,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  heroStat: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatValue: {
    color: '#f0f0f2',
    fontSize: 26,
    fontWeight: '600',
    letterSpacing: -0.5,
    fontFamily: 'Outfit-SemiBold',
  },
  heroStatLabel: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    marginTop: 4,
    fontFamily: 'DMMono-Regular',
  },
  heroDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // Section label
  sectionLabel: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: 'DMMono-Medium',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 10,
  },

  // Exercises list
  exercisesList: {
    paddingHorizontal: 16,
  },
  exerciseCard: {
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    marginBottom: 8,
  },
  exerciseCardSkipped: {
    opacity: 0.55,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  exerciseName: {
    color: '#f0f0f2',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    fontFamily: 'Outfit-SemiBold',
  },
  exerciseNameSkipped: {
    color: '#9898a4',
  },
  exerciseMeta: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.3,
    marginTop: 3,
    fontFamily: 'DMMono-Regular',
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skippedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  skippedBadgeText: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },

  // Sets table
  setsTable: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  setsTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  setsTableHeaderCell: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Regular',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  setNum: {
    color: '#55555f',
    fontSize: 13,
    fontFamily: 'DMMono-Medium',
  },
  setValue: {
    color: '#f0f0f2',
    fontSize: 14,
    fontFamily: 'DMMono-Medium',
  },

  // Drop sets
  dropSetsContainer: {
    paddingLeft: 8,
  },
  dropSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  dropSetLabel: {
    color: '#3a3a44',
    fontSize: 12,
    fontFamily: 'DMMono-Regular',
  },
  dropSetValue: {
    color: '#9898a4',
    fontSize: 13,
    fontFamily: 'DMMono-Regular',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0a0a0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 20,
    alignItems: 'center',
  },
  modalIconWrap: {
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIconCircleWarning: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,178,32,0.08)',
    borderColor: 'rgba(247,178,32,0.3)',
  },
  modalTitle: {
    color: '#f0f0f2',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
    fontFamily: 'Outfit-SemiBold',
  },
  modalSubtitle: {
    color: '#9898a4',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 8,
    fontFamily: 'Outfit-Regular',
  },
  modalButtonsCol: {
    width: '100%',
    marginTop: 22,
    gap: 8,
  },
  modalPrimaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  modalSecondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryText: {
    color: '#9898a4',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },
});