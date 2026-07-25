import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, WorkoutRoutine } from '../utils/storage';
import SavedSegmentedControl from '../components/SavedSegmentedControl';
import { dedupeByKey, getWeeksLabel } from '../utils/savedItems';
import {
  FavoriteExercise,
  loadFavoriteExercises,
  saveFavoriteExercises,
} from '../utils/favoriteExercises';

type Segment = 'workouts' | 'exercises';

const getCategoryIcon = (
  category: 'gym' | 'bodyweight' | 'flexibility' | 'cardio' | 'custom'
): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case 'gym': return 'barbell';
    case 'bodyweight': return 'body';
    case 'flexibility': return 'leaf';
    case 'cardio': return 'heart';
    case 'custom': return 'add-circle';
    default: return 'barbell';
  }
};

/**
 * SavedWorkoutsScreen — the Workouts tab's saved content, reached from the
 * "Saved" pill in HomeScreen's title row.
 *
 *   - Workouts: saved routines, mini stat grid card (lifted from the old
 *     Library tab). Tap → WorkoutPreview, ••• or long-press → confirm remove.
 *   - Exercises: favourite exercises, same store and card as
 *     FavoriteExercisesScreen but always in browse mode — tap opens
 *     ExerciseDetail, never returns a selection. (FavoriteExercisesScreen
 *     stays live for the workout flow's selectionMode.)
 */
export default function SavedWorkoutsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [segment, setSegment] = useState<Segment>('workouts');
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutRoutine[]>([]);
  const [favoriteExercises, setFavoriteExercises] = useState<FavoriteExercise[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSaved = useCallback(async () => {
    try {
      const [workouts, exercises] = await Promise.all([
        WorkoutStorage.loadMyRoutines(),
        loadFavoriteExercises(),
      ]);

      // De-dupe on fingerprint||id so a routine that exists twice in storage
      // only renders once (and never collides on a React key).
      setSavedWorkouts(
        dedupeByKey(Array.isArray(workouts) ? workouts : [], (r) => r.fingerprint || r.id || '')
      );
      setFavoriteExercises(exercises);
    } catch (error) {
      console.error('Failed to load saved workouts:', error);
      setSavedWorkouts([]);
      setFavoriteExercises([]);
    }
  }, []);

  // Reload on focus so hearts stay in sync with HomeScreen when the user
  // navigates back and forth.
  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSaved();
    } finally {
      setRefreshing(false);
    }
  }, [loadSaved]);

  // Tap a saved workout → preview screen
  const openWorkout = (routine: WorkoutRoutine) => {
    navigation.navigate('WorkoutPreview' as any, { routine });
  };

  const removeWorkout = (routine: WorkoutRoutine) => {
    Alert.alert(
      'Remove from saved?',
      `"${routine.name}" will be removed from your saved workouts. Your current workout plan won't be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const id = routine.fingerprint || routine.id;
              await WorkoutStorage.removeMyRoutine(id);
              await loadSaved();
            } catch (error) {
              console.error('Failed to remove workout:', error);
              Alert.alert('Error', 'Could not remove. Please try again.');
            }
          },
        },
      ]
    );
  };

  const removeExercise = (exercise: FavoriteExercise) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${exercise.name}" from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const updated = favoriteExercises.filter((e) => e.id !== exercise.id);
              setFavoriteExercises(updated);
              await saveFavoriteExercises(updated);
            } catch (error) {
              console.error('Failed to remove exercise:', error);
              Alert.alert('Error', 'Failed to remove favorite');
            }
          },
        },
      ]
    );
  };

  // Sort favourites by most recently added, matching FavoriteExercisesScreen.
  const sortedExercises = [...favoriteExercises].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  );

  const hasItems =
    segment === 'workouts' ? savedWorkouts.length > 0 : sortedExercises.length > 0;

  return (
    <View style={styles.container}>
      {/* Header — back chevron + title */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved</Text>
        {/* Balances the back button so the title stays optically centred */}
        <View style={styles.headerSpacer} />
      </View>

      <SavedSegmentedControl
        segments={[
          { key: 'workouts', label: 'Workouts', count: savedWorkouts.length },
          { key: 'exercises', label: 'Exercises', count: sortedExercises.length },
        ]}
        value={segment}
        onChange={(key) => setSegment(key as Segment)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={hasItems ? styles.scrollContent : styles.emptyScrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColor}
            colors={[themeColor]}
          />
        }
      >
        {!hasItems ? (
          <View style={styles.emptyHero}>
            <View style={[styles.emptyIcon, { borderColor: themeColor }]}>
              <Ionicons
                name={segment === 'workouts' ? 'barbell-outline' : 'heart-outline'}
                size={36}
                color={themeColor}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {segment === 'workouts' ? 'No saved workouts yet' : 'No saved exercises yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {segment === 'workouts'
                ? 'Tap the ••• on any workout plan and choose Save to keep it here.'
                : 'Tap the heart on any exercise to save it here.'}
            </Text>
          </View>
        ) : segment === 'workouts' ? (
          // ================= WORKOUTS — mini stat grid cards =================
          savedWorkouts.map((routine, index) => {
            const weeksLabel = getWeeksLabel(routine);
            const blocksCount = routine.blocks || routine.data?.blocks?.length || 0;
            return (
              <View key={`workout-${routine.id}-${index}`} style={styles.statCard}>
                {/* Visible remove affordance — same confirm Alert the
                    long-press triggers. Long-press still works. */}
                <TouchableOpacity
                  style={styles.cardMenuBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeWorkout(routine);
                  }}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${routine.name} from saved`}
                >
                  <Ionicons name="ellipsis-horizontal" size={16} color="#a1a1aa" />
                </TouchableOpacity>

                <Pressable
                  onPress={() => openWorkout(routine)}
                  onLongPress={() => removeWorkout(routine)}
                  delayLongPress={600}
                >
                  <View style={styles.cardTitleRow}>
                    <Ionicons name="barbell" size={17} color={themeColor} />
                    <Text style={styles.cardTitle} numberOfLines={1}>{routine.name}</Text>
                  </View>
                  <View style={styles.miniStatGrid}>
                    <View style={styles.miniStatCell}>
                      <Text style={[styles.miniStatValue, { color: themeColor }]}>
                        {routine.days || '—'}
                      </Text>
                      <Text style={styles.miniStatLabel}>days/wk</Text>
                    </View>
                    <View style={styles.miniStatDivider} />
                    <View style={styles.miniStatCell}>
                      <Text style={[styles.miniStatValue, { color: themeColor }]}>
                        {weeksLabel}
                      </Text>
                      <Text style={styles.miniStatLabel}>program</Text>
                    </View>
                    <View style={styles.miniStatDivider} />
                    <View style={styles.miniStatCell}>
                      <Text style={[styles.miniStatValue, { color: themeColor }]}>
                        {blocksCount || '—'}
                      </Text>
                      <Text style={styles.miniStatLabel}>
                        {blocksCount === 1 ? 'block' : 'blocks'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          })
        ) : (
          // ================= EXERCISES — favourite exercise cards =================
          sortedExercises.map((exercise) => {
            const primaryMuscles = Array.isArray(exercise.primaryMuscles)
              ? exercise.primaryMuscles
              : [];
            const muscleGroups = Array.isArray(exercise.muscleGroups)
              ? exercise.muscleGroups
              : [];
            const displayMuscles =
              primaryMuscles.length > 0
                ? primaryMuscles
                : muscleGroups.filter((group) => group !== 'Custom');
            const visibleMuscles = displayMuscles.slice(0, 3);
            const remainingCount = displayMuscles.length - 3;

            return (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ExerciseDetail' as any, { exercise })}
              >
                <View style={styles.exerciseCardHeader}>
                  <Text style={styles.exerciseName} numberOfLines={2}>{exercise.name}</Text>
                  <TouchableOpacity
                    onPress={() => removeExercise(exercise)}
                    style={styles.heartButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${exercise.name} from favourites`}
                  >
                    <Ionicons name="heart" size={20} color={themeColor} />
                  </TouchableOpacity>
                </View>

                <View style={styles.exerciseCardContent}>
                  <View style={styles.exerciseIconContainer}>
                    <Ionicons
                      name={getCategoryIcon(exercise.category)}
                      size={20}
                      color={themeColor}
                    />
                  </View>

                  <View style={styles.exerciseDetails}>
                    <Text style={[styles.exerciseCategory, { color: themeColor }]}>
                      {exercise.category === 'custom' && exercise.customCategory
                        ? exercise.customCategory
                        : exercise.category
                          ? exercise.category.charAt(0).toUpperCase() + exercise.category.slice(1)
                          : 'Unknown'}
                    </Text>
                    <Text style={styles.exerciseMuscles} numberOfLines={1}>
                      {visibleMuscles.join(', ')}
                      {remainingCount > 0 ? ` +${remainingCount}` : ''}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color="#71717a" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },

  // ===== Header =====
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 48,
  },
  emptyScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },

  // ===== Stat card (workouts) =====
  statCard: {
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginBottom: 12,
    position: 'relative',
  },
  cardMenuBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingRight: 28,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },

  // ===== Mini stat grid (inside each card) =====
  miniStatGrid: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  miniStatCell: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 2,
  },
  miniStatValue: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  miniStatLabel: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 4,
    letterSpacing: 0.2,
  },

  // ===== Favourite exercise card =====
  exerciseCard: {
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  heartButton: {
    padding: 4,
    flexShrink: 0,
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  exerciseIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseDetails: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  exerciseCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseMuscles: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },

  // ===== Empty state =====
  emptyHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: 'rgba(34, 211, 238, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyBody: {
    fontSize: 13,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
});
