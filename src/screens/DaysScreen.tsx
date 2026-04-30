import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
  Modal,
  TextInput,
  Button,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BodyHighlighter, { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';
import { RootStackParamList } from '../navigation/AppNavigator';
import AsyncStorageDebugger from '../utils/asyncStorageDebug';
import RobustStorage from '../utils/robustStorage';
import { useTheme } from '../contexts/ThemeContext';

const SECONDARY_MUSCLE_WEIGHT = 0.5;

const getMuscleContributions = (exercise: any): Array<{muscle: string, weight: number}> => {
  const muscleMapping: { [key: string]: string } = {
    'Chest': 'chest',
    'Upper Back': 'upper back',
    'Lats': 'lats',
    'Traps': 'traps',
    'Front Delts': 'front delts',
    'Side Delts': 'side delts',
    'Rear Delts': 'rear delts',
    'Biceps': 'biceps',
    'Triceps': 'triceps',
    'Forearms': 'forearms',
    'Quads': 'quads',
    'Hamstrings': 'hamstrings',
    'Glutes': 'glutes',
    'Calves': 'calves',
    'Core': 'core',
    'Abs': 'core',
    'Abdominals': 'core',
    'Abs (Upper)': 'core',
    'Abs (Lower)': 'core',
    'Neck': 'neck',
    'Lower Back': 'lower back',
    'Obliques': 'obliques',
    'Serratus Anterior': 'serratus',
    'Hip Abductors': 'hip abductors',
    'Hip Adductors': 'hip adductors',
    'Shins': 'shins',
    'Tibialis': 'shins',
    'Tibialis Anterior': 'shins',
  };

  const contributions: Array<{muscle: string, weight: number}> = [];

  (exercise.primaryMuscles || []).forEach((muscle: string) => {
    const mapped = muscleMapping[muscle];
    if (mapped) contributions.push({ muscle: mapped, weight: 1.0 });
  });

  (exercise.secondaryMuscles || []).forEach((muscle: string) => {
    const mapped = muscleMapping[muscle];
    if (mapped) contributions.push({ muscle: mapped, weight: SECONDARY_MUSCLE_WEIGHT });
  });

  return contributions;
};

// Deterministic render order for body highlighter slugs.
// Larger regions render FIRST so smaller specific regions paint on top of them.
// Critical: 'upper-back' must come before 'trapezius' so traps don't get obscured.
const SLUG_RENDER_ORDER: Slug[] = [
  'upper-back',  // large back region - render first
  'lower-back',  // large back region
  'trapezius',   // sits on top of upper-back area - render after
  'chest',
  'abs',
  'obliques',
  'deltoids',
  'biceps',
  'triceps',
  'forearm',
  'quadriceps',
  'hamstring',
  'gluteal',
  'adductors',
  'calves',
  'tibialis',
  'neck',
];

// Map our muscle groups to body highlighter muscle slugs.
// Hoisted out of component since it's a pure constant.
const MUSCLE_TO_SLUG: { [key: string]: Slug | null } = {
  // Core torso
  'chest': 'chest',
  'core': 'abs',

  // Back regions
  'upper back': 'trapezius',
  'lats': 'upper-back',
  'traps': 'trapezius',
  'lower back': 'lower-back',

  // Shoulders (library only has 'deltoids' - no front/back variants)
  'front delts': 'deltoids',
  'side delts': 'deltoids',
  'rear delts': 'deltoids',

  // Arms
  'biceps': 'biceps',
  'triceps': 'triceps',
  'forearms': 'forearm',

  // Legs
  'quads': 'quadriceps',
  'hamstrings': 'hamstring',
  'glutes': 'gluteal',
  'calves': 'calves',

  // Other
  'neck': 'neck',
  'obliques': 'obliques',

  // Unsupported by library
  'hip adductors': 'adductors',
  'hip abductors': null,
  'shins': null,
  'serratus': null,
};

const setsToIntensity = (sets: number): number => {
  if (sets >= 10) return 2;
  if (sets >= 1) return 1;
  return 0;
};

// Pure function: convert weekly volume map to body highlighter data array.
// 1. Aggregates volume by slug (so 'upper back' + 'lats' both feed 'upper-back')
// 2. Sorts in deterministic render order to prevent overlap-painting bugs
const buildHighlighterData = (weeklyVolume: { [key: string]: number }): ExtendedBodyPart[] => {
  // Aggregate volume by slug
  const slugVolume: Partial<Record<Slug, number>> = {};

  Object.entries(weeklyVolume).forEach(([muscle, volume]) => {
    if (volume > 0) {
      const slug = MUSCLE_TO_SLUG[muscle];
      if (slug) {
        slugVolume[slug] = (slugVolume[slug] || 0) + volume;
      }
    }
  });

  console.log('🔧 AGGREGATED SLUG VOLUMES:', slugVolume);
  console.log('🔧 Verification - upper-back total:', slugVolume['upper-back'], '(expected: upper back + lats)');

  // Build array, then sort by deterministic render order
  return Object.entries(slugVolume)
    .map(([slug, totalSets]) => ({
      slug: slug as Slug,
      intensity: setsToIntensity(totalSets!),
    }))
    .sort((a, b) => {
      const aIdx = SLUG_RENDER_ORDER.indexOf(a.slug);
      const bIdx = SLUG_RENDER_ORDER.indexOf(b.slug);
      // Unknown slugs go to the end
      const aRank = aIdx === -1 ? 999 : aIdx;
      const bRank = bIdx === -1 ? 999 : bIdx;
      return aRank - bRank;
    });
};

const calculateWeeklyVolume = (block: any): { [muscle: string]: number } => {
  const volumeMap: { [muscle: string]: number } = {};
  const allPrimaryMuscles = new Set<string>();
  const allSecondaryMuscles = new Set<string>();

  (block.days || []).forEach((day: any) => {
    if (day.exercises) {
      day.exercises.forEach((exercise: any) => {
        (exercise.primaryMuscles || []).forEach((muscle: string) => allPrimaryMuscles.add(muscle));
        (exercise.secondaryMuscles || []).forEach((muscle: string) => allSecondaryMuscles.add(muscle));

        const setsForWeek1 = exercise.sets_weekly?.['1'] ?? exercise.sets ?? 0;
        const contributions = getMuscleContributions(exercise);
        contributions.forEach(({ muscle, weight }) => {
          if (!volumeMap[muscle]) volumeMap[muscle] = 0;
          volumeMap[muscle] += setsForWeek1 * weight;
        });
      });
    }
  });

  console.log('🔍 DISCOVERED PRIMARY MUSCLES:', Array.from(allPrimaryMuscles).sort());
  console.log('🔍 DISCOVERED SECONDARY MUSCLES:', Array.from(allSecondaryMuscles).sort());

  Object.keys(volumeMap).forEach(k => {
    volumeMap[k] = Math.round(volumeMap[k] * 10) / 10;
  });

  return volumeMap;
};

type DaysScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Days'>;
type DaysScreenRouteProp = RouteProp<RootStackParamList, 'Days'>;

interface Exercise {
  exercise: string;
  sets: number;
  reps: string;
  rest?: number;
  restQuick?: number;
  notes?: string;
  alternatives?: string[];
}

interface Day {
  day_name: string;
  estimated_duration?: number;
  exercises: Exercise[];
}

interface DayCardProps {
  day: Day;
  onPress: () => void;
  onLongPress?: () => void;
  isCompleted?: boolean;
  currentWeek: number;
  themeColor: string;
  blockName: string;
  refreshTrigger?: number;
  completionStats?: {
    duration: number;
    totalVolume: number;
    date: string;
  };
}

function DayCard({ day, onPress, onLongPress, isCompleted, currentWeek, completionStats, themeColor, blockName, refreshTrigger }: DayCardProps) {
  const [modifiedExercises, setModifiedExercises] = useState<Exercise[]>(day.exercises || []);
  const [dynamicExercises, setDynamicExercises] = useState<Exercise[]>([]);
  const [customizedDuration, setCustomizedDuration] = useState<number | undefined>(day.estimated_duration);

  const exerciseCount = (modifiedExercises?.length || 0) + (dynamicExercises?.length || 0);

  const loadWeekCustomizations = async () => {
    try {
      const customizationKey = `day_customization_${blockName}_${day.day_name || 'unknown'}_week${currentWeek}`;
      const savedCustomization = await AsyncStorage.getItem(customizationKey);
      if (savedCustomization) {
        const customizationData = JSON.parse(savedCustomization);

        if (customizationData.exercises) {
          setModifiedExercises(customizationData.exercises);
        }

        if (customizationData.estimated_duration !== undefined) {
          setCustomizedDuration(customizationData.estimated_duration);
        }

        setDynamicExercises([]);
        return;
      } else {
        setModifiedExercises(day.exercises || []);
        setCustomizedDuration(day.estimated_duration);
      }
    } catch (error) {
      setModifiedExercises(day.exercises || []);
      setCustomizedDuration(day.estimated_duration);
    }
  };

  const loadDynamicExercises = async () => {
    const customizationKey = `day_customization_${blockName}_${day.day_name || 'unknown'}_week${currentWeek}`;
    try {
      const savedCustomization = await AsyncStorage.getItem(customizationKey);
      if (savedCustomization) {
        setDynamicExercises([]);
        return;
      }
    } catch (error) {
      // Continue to load dynamic exercises if customization check fails
    }

    try {
      const dynamicKey = `workout_${blockName}_${day.day_name || 'unknown'}_week${currentWeek}_exercises`;
      const savedDynamic = await AsyncStorage.getItem(dynamicKey);
      if (savedDynamic) {
        const parsedDynamic = JSON.parse(savedDynamic);
        setDynamicExercises(parsedDynamic);
      } else {
        setDynamicExercises([]);
      }
    } catch (error) {
      setDynamicExercises([]);
    }
  };

  const loadSetsData = async () => {
    try {
      const savedKey = `workout_${blockName}_${day.day_name || 'unknown'}_week${currentWeek}_sets`;
      const savedData = await AsyncStorage.getItem(savedKey);
      if (savedData) {
        const savedSetsData = JSON.parse(savedData);
        const updatedExercises = (day.exercises || []).map((exercise, index) => {
          if (savedSetsData[index] && savedSetsData[index].length > 0) {
            return {
              ...exercise,
              sets: savedSetsData[index].length
            };
          }
          return exercise;
        });
        setModifiedExercises(updatedExercises);
      }
    } catch (error) {
      // Use template data if no saved sets
    }
  };

  useEffect(() => {
    loadWeekCustomizations();
    loadSetsData();
    loadDynamicExercises();
  }, [blockName, day.day_name, currentWeek, refreshTrigger]);

  const allExercises = [...(modifiedExercises || []), ...(dynamicExercises || [])];

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

  const exercisesByType = {
    compound: [] as string[],
    isolation: [] as string[],
    cardio: [] as string[]
  };

  allExercises.forEach(ex => {
    const name = (ex.exercise || '').toLowerCase();
    if (name.includes('squat') || name.includes('deadlift') || name.includes('press') ||
        name.includes('row') || name.includes('pull up') || name.includes('chin up')) {
      exercisesByType.compound.push(ex.exercise || 'Unknown Exercise');
    } else if (name.includes('curl') || name.includes('extension') || name.includes('fly') ||
              name.includes('raise') || name.includes('isolation')) {
      exercisesByType.isolation.push(ex.exercise || 'Unknown Exercise');
    } else if (name.includes('cardio') || name.includes('run') || name.includes('bike')) {
      exercisesByType.cardio.push(ex.exercise || (ex as any).activity || 'Unknown Cardio');
    } else {
      exercisesByType.compound.push(ex.exercise || 'Unknown Exercise');
    }
  });

  const getDayTypeColor = (dayName: string) => {
    const name = (dayName || '').toLowerCase();
    if (name.includes('push') || name.includes('chest') || name.includes('shoulder')) return '#f59e0b';
    if (name.includes('pull') || name.includes('back') || name.includes('bicep')) return '#10b981';
    if (name.includes('legs') || name.includes('lower') || name.includes('glute')) return '#a855f7';
    if (name.includes('upper')) return themeColor;
    if (name.includes('full') || name.includes('total')) return '#ef4444';
    return themeColor;
  };

  const dayColor = getDayTypeColor(day.day_name || '');

  if (isCompleted && completionStats) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          styles.cardCompleted,
          { borderLeftColor: '#10b981' }
        ]}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <View style={styles.completedCardContent}>
          <View style={styles.completedHeader}>
            <View style={styles.completedTitleContainer}>
              <Text style={styles.dayNameCompleted} numberOfLines={2}>
                {day.day_name || 'Untitled Day'}
              </Text>
            </View>
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark" size={12} color="#0a0a0b" />
              <Text style={styles.completedBadgeText}>DONE</Text>
            </View>
          </View>
          <View style={styles.completedStatsRow}>
            <View style={styles.completedStat}>
              <Text style={styles.completedStatValue}>{completionStats.duration}</Text>
              <Text style={styles.completedStatLabel}>MIN</Text>
            </View>
            <View style={styles.completedStatDivider} />
            <View style={styles.completedStat}>
              <Text style={styles.completedStatValue}>{completionStats.totalVolume.toFixed(0)}</Text>
              <Text style={styles.completedStatLabel}>KG</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (exerciseCount === 0 && day.day_name && day.day_name.toUpperCase().includes('REST')) {
    return (
      <View style={[styles.restDayCard, { borderLeftColor: '#6b7280' }]}>
        <View style={styles.restDayContent}>
          <Ionicons name="bed-outline" size={24} color="#6b7280" />
          <Text style={styles.restDayTitle}>{day.day_name}</Text>
          <Text style={styles.restDaySubtitle}>Recovery & Rest</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderLeftColor: dayColor }
      ]}
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.dayName}>{day.day_name || 'Untitled Day'}</Text>
          {exerciseCount > 0 && (
            <View style={[styles.dayBadge, { backgroundColor: dayColor + '20' }]}>
              <Text style={[styles.dayBadgeText, { color: dayColor }]}>
                {estimatedDuration} min estimated
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.startButton, { backgroundColor: themeColor + '20' }]}>
          <Ionicons name="play" size={16} color={themeColor} />
          <Text style={[styles.startButtonText, { color: themeColor }]}>START</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="barbell-outline" size={16} color="#71717a" />
            <Text style={styles.statText}>{exerciseCount} exercises</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="fitness-outline" size={16} color="#71717a" />
            <Text style={styles.statText}>{exercisesByType.compound.length} compound</Text>
          </View>
        </View>

        <View style={styles.exerciseGrid}>
          {allExercises.slice(0, 6).map((exercise, index) => (
            <View key={index} style={styles.exerciseChip}>
              <Text style={styles.exerciseChipText} numberOfLines={1}>
                {exercise.exercise}
              </Text>
              <Text style={[styles.exerciseChipSets, { color: themeColor }]}>{exercise.sets}×{exercise.reps}</Text>
            </View>
          ))}
          {exerciseCount > 6 && (
            <View style={[styles.exerciseChip, styles.moreChip]}>
              <Text style={styles.moreChipText}>+{exerciseCount - 6} more</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function DaysScreen() {
  const navigation = useNavigation<DaysScreenNavigationProp>();
  const route = useRoute<DaysScreenRouteProp>();
  const { themeColor } = useTheme();
  const { block, routineName, initialWeek } = route.params;

  const [localBlock, setLocalBlock] = useState(block);

  const [currentWeek, setCurrentWeek] = useState(1);
  const [completedWorkouts, setCompletedWorkouts] = useState<Set<string>>(new Set());
  const [completionStats, setCompletionStats] = useState<Map<string, any>>(new Map());
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkedWeek, setBookmarkedWeek] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAddDayModal, setShowAddDayModal] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);
  const [exerciseList, setExerciseList] = useState<Exercise[]>([]);
  const [editedDuration, setEditedDuration] = useState('');
  const [showRestDays, setShowRestDays] = useState(true);
  const [showVolumeOverview, setShowVolumeOverview] = useState(false);
  const [bodyViewSide, setBodyViewSide] = useState<'front' | 'back'>('front');
  const scrollViewRef = useRef<ScrollView>(null);

  // Memoized volume calculation - only recomputes when localBlock actually changes.
  // This prevents the body highlighter data from being rebuilt on every render,
  // which was causing inconsistent rendering due to non-deterministic timing.
  const weeklyVolume = useMemo(
    () => calculateWeeklyVolume(localBlock),
    [localBlock]
  );

  const muscleHighlighterData = useMemo(
    () => buildHighlighterData(weeklyVolume),
    [weeklyVolume]
  );

  // Sorted muscle list for the volume grid (separate from highlighter sort).
  const sortedMuscles = useMemo(
    () => Object.entries(weeklyVolume)
      .sort(([, a], [, b]) => b - a)
      .filter(([, sets]) => sets > 0),
    [weeklyVolume]
  );

  const maxVolume = useMemo(
    () => sortedMuscles.length > 0 ? Math.max(...sortedMuscles.map(([, sets]) => sets)) : 0,
    [sortedMuscles]
  );

  const totalWeeks = localBlock.weeks.includes('-')
    ? parseInt(localBlock.weeks.split('-')[1]) - parseInt(localBlock.weeks.split('-')[0]) + 1
    : 1;

  const screenWidth = Dimensions.get('window').width;
  const weekTabWidth = 36;
  const weekTabGap = 8;
  const maxVisibleWeeks = Math.floor((screenWidth - 120) / (weekTabWidth + weekTabGap));

  const findFirstIncompleteWeek = async () => {
    for (let week = 1; week <= totalWeeks; week++) {
      const weekKey = `completed_${localBlock.block_name}_week${week.toString()}`;
      const weekCompleted = await AsyncStorage.getItem(weekKey);

      if (!weekCompleted) {
        return week;
      }

      const parsed = JSON.parse(weekCompleted);
      const completedSet = new Set(Array.isArray(parsed) ? parsed : []);
      const allDaysCompleted = localBlock.days.every(day =>
        completedSet.has(`${day.day_name || 'unknown'}_week${week}`)
      );

      if (!allDaysCompleted) {
        return week;
      }
    }
    return totalWeeks;
  };

  const initializeWeek = async () => {
    if (initialWeek) {
      setCurrentWeek(initialWeek);

      const bookmarkKey = `bookmark_${localBlock.block_name}`;
      const savedBookmark = await AsyncStorage.getItem(bookmarkKey);
      if (savedBookmark) {
        const { week, isBookmarked: bookmarked } = JSON.parse(savedBookmark);
        setIsBookmarked(bookmarked);
        setBookmarkedWeek(bookmarked ? week : null);
      }
      return;
    }

    const bookmarkKey = `bookmark_${localBlock.block_name}`;
    const savedBookmark = await AsyncStorage.getItem(bookmarkKey);

    if (savedBookmark) {
      const { week, isBookmarked: bookmarked } = JSON.parse(savedBookmark);
      setIsBookmarked(bookmarked);

      if (bookmarked) {
        setBookmarkedWeek(week);
        setCurrentWeek(week);
      } else {
        setBookmarkedWeek(null);
        const incompleteWeek = await findFirstIncompleteWeek();
        setCurrentWeek(incompleteWeek);
      }
    } else {
      setBookmarkedWeek(null);
      const incompleteWeek = await findFirstIncompleteWeek();
      setCurrentWeek(incompleteWeek);
    }
  };

  useEffect(() => {
    initializeWeek();
    reloadBlockData();
  }, []);

  const reloadBlockData = async () => {
    try {
      const manualDaysKey = `manual_days_${localBlock.block_name}`;
      const manualDaysData = await AsyncStorage.getItem(manualDaysKey);

      if (manualDaysData) {
        const manualDays = JSON.parse(manualDaysData);
        const mergedDays = [...block.days, ...manualDays];
        const updatedBlock = {
          ...localBlock,
          days: mergedDays
        };

        setLocalBlock(updatedBlock);
      }
      return;

      const routineData = await AsyncStorage.getItem('routine_1772009535369');
      if (routineData) {
        const routine = JSON.parse(routineData);

        if (routine.data && typeof routine.data === 'object') {
          const dayObjects = Object.entries(routine.data)
            .filter(([key, value]) =>
              value &&
              typeof value === 'object' &&
              (value as any).day_name &&
              !['id', 'routine_name', 'description', 'days_per_week', 'blocks', 'programId'].includes(key)
            )
            .map(([key, value]) => value);

          if (dayObjects.length > 0) {
            const updatedBlock = {
              ...localBlock,
              days: dayObjects
            };
            console.log('✅ Reloaded from routine.data - converted object to array:', dayObjects.length, 'days');
            setLocalBlock(updatedBlock);
          }
        }
      }
    } catch (error) {
      console.error('Failed to reload block data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      reloadBlockData();
      loadCompletedWorkouts();
      loadCompletionStats();
      setRefreshTrigger(prev => prev + 1);
    }, [currentWeek])
  );

  useEffect(() => {
    loadCompletedWorkouts();
    loadCompletionStats();
  }, [currentWeek]);

  useEffect(() => {
    if (scrollViewRef.current && totalWeeks > maxVisibleWeeks) {
      const scrollToX = Math.max(0, (currentWeek - Math.floor(maxVisibleWeeks / 2) - 1) * (weekTabWidth + weekTabGap));
      scrollViewRef.current.scrollTo({ x: scrollToX, animated: true });
    }
  }, [currentWeek, totalWeeks, maxVisibleWeeks]);

  useEffect(() => {
    loadRestDayPreference();
  }, []);

  const loadRestDayPreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem('showRestDays');
      if (savedPreference !== null) {
        setShowRestDays(JSON.parse(savedPreference));
      }
    } catch (error) {
      console.log('Error loading rest day preference:', error);
    }
  };

  const saveRestDayPreference = async (value: boolean) => {
    try {
      await AsyncStorage.setItem('showRestDays', JSON.stringify(value));
    } catch (error) {
      console.log('Error saving rest day preference:', error);
    }
  };

  const loadCurrentWeek = async () => {
    try {
      const savedWeek = await AsyncStorage.getItem(`currentWeek_${localBlock.block_name}`);
      if (savedWeek) {
        setCurrentWeek(parseInt(savedWeek));
      }
    } catch (error) {
      console.error('Failed to load current week:', error);
    }
  };

  const saveCurrentWeek = async (week: number) => {
    try {
      await AsyncStorage.setItem(`currentWeek_${localBlock.block_name}`, week.toString());
      setCurrentWeek(week);
    } catch (error) {
      console.error('Failed to save current week:', error);
    }
  };

  const toggleBookmark = async () => {
    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);

    const bookmarkKey = `bookmark_${localBlock.block_name}`;
    if (newBookmarkState) {
      setBookmarkedWeek(currentWeek);
      await AsyncStorage.setItem(bookmarkKey, JSON.stringify({
        week: currentWeek,
        isBookmarked: true
      }));
    } else {
      setBookmarkedWeek(null);
      await AsyncStorage.setItem(bookmarkKey, JSON.stringify({
        week: currentWeek,
        isBookmarked: false
      }));
    }
  };

  const loadCompletedWorkouts = async () => {
    try {
      const key = `completed_${localBlock.block_name}_week${currentWeek.toString()}`;
      console.log('🔍 [LOAD-COMPLETION] Loading completed workouts with ROBUST STORAGE...');
      console.log('🔍 [LOAD-COMPLETION] Key:', key);
      console.log('🔍 [LOAD-COMPLETION] Block name:', localBlock.block_name);
      console.log('🔍 [LOAD-COMPLETION] Current week:', currentWeek);

      const healthCheck = await RobustStorage.healthCheck();
      console.log('🔍 [LOAD-COMPLETION] Storage health check:', healthCheck);

      if (healthCheck.repaired > 0) {
        console.log(`🔍 [LOAD-COMPLETION] 🔧 Auto-repaired ${healthCheck.repaired} corrupted entries`);
      }

      const stats = await RobustStorage.getStats();
      console.log('🔍 [LOAD-COMPLETION] Storage stats:', stats);

      let completed = await RobustStorage.getItem(key, true);
      let dataSource = 'robust';

      if (!completed) {
        console.log('🔍 [LOAD-COMPLETION] No data in robust storage, checking legacy storage...');
        completed = await AsyncStorageDebugger.getItem(key);
        dataSource = 'legacy';

        if (!completed) {
          console.log('🔍 [LOAD-COMPLETION] Checking emergency backup keys...');
          const emergencyKeys = [
            `${key}_emergency`,
            `workout_completion_${localBlock.block_name.replace(/[^a-zA-Z0-9]/g, '_')}_week${currentWeek.toString()}`,
          ];

          for (const emergencyKey of emergencyKeys) {
            const emergencyData = await AsyncStorage.getItem(emergencyKey);
            if (emergencyData) {
              completed = emergencyData;
              dataSource = `emergency:${emergencyKey}`;
              console.log(`🔍 [LOAD-COMPLETION] Found data in emergency key: ${emergencyKey}`);

              await RobustStorage.setItem(key, emergencyData, true);
              console.log('🔍 [LOAD-COMPLETION] 🔄 Migrated emergency data to robust storage');
              break;
            }
          }

          if (!completed) {
            console.log('🔍 [LOAD-COMPLETION] Scanning for timestamped backup keys...');
            try {
              const allKeys = await AsyncStorage.getAllKeys();
              const backupKeys = allKeys.filter(k => k.startsWith('completion_backup_'));

              if (backupKeys.length > 0) {
                backupKeys.sort((a, b) => {
                  const timestampA = parseInt(a.split('completion_backup_')[1]) || 0;
                  const timestampB = parseInt(b.split('completion_backup_')[1]) || 0;
                  return timestampB - timestampA;
                });

                for (const backupKey of backupKeys) {
                  const backupData = await AsyncStorage.getItem(backupKey);
                  if (backupData) {
                    try {
                      const parsed = JSON.parse(backupData);
                      const workoutKey = getWorkoutKey(localBlock.block_name, currentWeek);
                      if (Array.isArray(parsed) && parsed.some(item => item.includes(workoutKey.split('_week')[0]))) {
                        completed = backupData;
                        dataSource = `timestamped-backup:${backupKey}`;
                        console.log(`🔍 [LOAD-COMPLETION] Found relevant data in backup: ${backupKey}`);

                        await RobustStorage.setItem(key, backupData, true);
                        console.log('🔍 [LOAD-COMPLETION] 🔄 Migrated backup data to robust storage');
                        break;
                      }
                    } catch (parseError) {
                      console.log(`🔍 [LOAD-COMPLETION] Could not parse backup ${backupKey}:`, parseError);
                    }
                  }
                }
              }
            } catch (scanError) {
              console.log('🔍 [LOAD-COMPLETION] Error scanning backup keys:', scanError);
            }
          }

          if (!completed) {
            console.log('🔐 [PRODUCTION-RECOVERY] Checking redundant storage formats...');
            try {
              const individualKey = `workout_done_${localBlock.block_name}_${localBlock.days.find(d => d.day_name)?.day_name || 'unknown'}_week${currentWeek.toString()}`;
              const individualData = await AsyncStorage.getItem(individualKey);
              if (individualData) {
                const parsed = JSON.parse(individualData);
                if (parsed.completed) {
                  const reconstructedArray = [`${parsed.dayName}_week${parsed.week}`];
                  completed = JSON.stringify(reconstructedArray);
                  dataSource = 'individual-marker';
                  console.log('🔐 [PRODUCTION-RECOVERY] Recovered from individual marker:', individualKey);
                }
              }

              if (!completed) {
                const simpleKey = `simple_completed_${localBlock.block_name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const simpleData = await AsyncStorage.getItem(simpleKey);
                if (simpleData) {
                  completed = simpleData;
                  dataSource = 'simple-list';
                  console.log('🔐 [PRODUCTION-RECOVERY] Recovered from simple list:', simpleKey);
                }
              }

              if (!completed) {
                const today = new Date();
                for (let daysBack = 0; daysBack < 7; daysBack++) {
                  const checkDate = new Date(today.getTime() - (daysBack * 24 * 60 * 60 * 1000));
                  const dateKey = `completion_log_${checkDate.toISOString().split('T')[0]}`;
                  const logData = await AsyncStorage.getItem(dateKey);
                  if (logData) {
                    const logs = JSON.parse(logData);
                    const relevantLogs = logs.filter((log: any) =>
                      log.blockName === localBlock.block_name &&
                      log.week === currentWeek
                    );
                    if (relevantLogs.length > 0) {
                      const completedWorkouts = relevantLogs.map((log: any) => log.workoutKey);
                      completed = JSON.stringify(completedWorkouts);
                      dataSource = `daily-log:${dateKey}`;
                      console.log('🔐 [PRODUCTION-RECOVERY] Recovered from daily log:', dateKey);
                      break;
                    }
                  }
                }
              }

              if (completed) {
                await RobustStorage.setItem(key, completed, true);
                console.log('🔐 [PRODUCTION-RECOVERY] 🔄 Migrated recovered data to main storage');
              }

            } catch (recoveryError) {
              console.log('🔐 [PRODUCTION-RECOVERY] Error during recovery:', recoveryError);
            }
          }
        } else if (completed) {
          console.log('🔍 [LOAD-COMPLETION] 🔄 Migrating legacy data to robust storage...');
          await RobustStorage.setItem(key, completed, true);
        }
      }

      if (completed) {
        const parsedCompleted = JSON.parse(completed);
        console.log(`🔍 [LOAD-COMPLETION] Found completed workouts (${dataSource}):`, parsedCompleted);
        const validArray = Array.isArray(parsedCompleted) ? parsedCompleted : [];
        setCompletedWorkouts(new Set(validArray));

        if (dataSource !== 'robust') {
          setTimeout(async () => {
            const verification = await RobustStorage.getItem(key, true);
            if (verification) {
              console.log('🔍 [LOAD-COMPLETION] ✅ Data successfully migrated to robust storage');
            } else {
              console.error('🔍 [LOAD-COMPLETION] ❌ Failed to migrate data to robust storage');
            }
          }, 1000);
        }
      } else {
        console.log('🔍 [LOAD-COMPLETION] No completed workouts found for this week (checked all sources)');
        setCompletedWorkouts(new Set());
      }

      AsyncStorageDebugger.printSummary();

    } catch (error) {
      console.error('🔍 [LOAD-COMPLETION] Failed to load completed workouts:', error);
      setCompletedWorkouts(new Set());
    }
  };

  const getWorkoutKey = (dayName: string, week: number) => `${dayName}_week${week.toString()}`;

  const loadCompletionStats = async () => {
    try {
      const stats = await AsyncStorage.getItem(`completionStats_${localBlock.block_name}_week${currentWeek.toString()}`);
      if (stats) {
        setCompletionStats(new Map(JSON.parse(stats)));
      }
    } catch (error) {
      console.error('Failed to load completion stats:', error);
    }
  };

  const isWorkoutCompleted = (dayName: string) => {
    return completedWorkouts.has(getWorkoutKey(dayName, currentWeek));
  };

  const getCompletionStats = (dayName: string) => {
    return completionStats.get(getWorkoutKey(dayName, currentWeek));
  };

  const handleDayPress = (day: Day) => {
    const isCompleted = isWorkoutCompleted(day.day_name || 'unknown');
    const stats = getCompletionStats(day.day_name || 'unknown');

    if (isCompleted && stats) {
      navigation.navigate('WorkoutReview' as any, {
        day,
        blockName: localBlock.block_name,
        completionStats: stats,
        currentWeek
      });
    } else {
      const dayWithPrevious = {
        ...day,
        exercises: day.exercises.map((ex, index) => ({
          ...ex,
          previous: index % 2 === 0 ? { weight: 50 + index * 5, reps: 10 } : null
        }))
      };

      navigation.navigate('WorkoutLog' as any, {
        day: dayWithPrevious,
        blockName: localBlock.block_name,
        currentWeek: currentWeek,
        block: block,
        routineName: routineName
      });
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAddDay = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Add New Day',
        'Enter a name for this workout day:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create',
            onPress: (text) => {
              if (text && text.trim()) {
                createNewDay(text.trim());
              }
            }
          }
        ],
        'plain-text'
      );
    } else {
      setNewDayName('');
      setShowAddDayModal(true);
    }
  };

  const handleCreateDay = () => {
    if (newDayName.trim()) {
      createNewDay(newDayName.trim());
      setShowAddDayModal(false);
      setNewDayName('');
    }
  };

  const handleDayLongPress = async (day: Day) => {
    setSelectedDay(day);

    try {
      const customizationKey = `day_customization_${localBlock.block_name}_${day.day_name}_week${currentWeek}`;
      const savedCustomization = await AsyncStorage.getItem(customizationKey);

      if (savedCustomization) {
        const customizationData = JSON.parse(savedCustomization);

        setExerciseList([...(customizationData.exercises || day.exercises)]);
        setEditedDuration(customizationData.estimated_duration?.toString() || day.estimated_duration?.toString() || '');
      } else {
        setExerciseList([...day.exercises]);
        setEditedDuration(day.estimated_duration?.toString() || '');
      }
    } catch (error) {
      console.log('Error loading customizations for modal, using original data');
      setExerciseList([...day.exercises]);
      setEditedDuration(day.estimated_duration?.toString() || '');
    }

    setShowExerciseModal(true);
  };

  const handleSaveExerciseChanges = async () => {
    if (!selectedDay) return;

    try {
      const updatedDay = {
        ...selectedDay,
        exercises: exerciseList,
        estimated_duration: editedDuration ? parseInt(editedDuration) : undefined
      };

      const updatedBlock = {
        ...localBlock,
        days: localBlock.days.map(d =>
          d.day_name === selectedDay.day_name ? updatedDay : d
        )
      };

      setLocalBlock(updatedBlock);

      const customizationKey = `day_customization_${localBlock.block_name}_${selectedDay.day_name}_week${currentWeek}`;
      const customizationData = {
        exercises: exerciseList,
        estimated_duration: editedDuration ? parseInt(editedDuration) : undefined,
        customizedAt: new Date().toISOString(),
        week: currentWeek
      };

      await AsyncStorage.setItem(customizationKey, JSON.stringify(customizationData));

      const isManualDay = !block.days.some(originalDay => originalDay.day_name === selectedDay.day_name);

      if (isManualDay) {
        const manualDaysKey = `manual_days_${localBlock.block_name}`;
        const existingManualDays = await AsyncStorage.getItem(manualDaysKey);
        const manualDaysArray = existingManualDays ? JSON.parse(existingManualDays) : [];

        const updatedManualDays = manualDaysArray.map((day: Day) =>
          day.day_name === selectedDay.day_name ? updatedDay : day
        );

        await AsyncStorage.setItem(manualDaysKey, JSON.stringify(updatedManualDays));
      }

      setRefreshTrigger(prev => prev + 1);

      setShowExerciseModal(false);
      setSelectedDay(null);
    } catch (error) {
      console.error('Error saving exercise changes:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    const newList = [...exerciseList];
    const [removed] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, removed);
    setExerciseList(newList);
  };

  const vibrantThemeColor = themeColor === '#10b981' ? '#059669' :
                           themeColor === '#3b82f6' ? '#2563eb' :
                           themeColor === '#8b5cf6' ? '#7c3aed' :
                           themeColor === '#f59e0b' ? '#d97706' :
                           themeColor === '#ef4444' ? '#dc2626' :
                           themeColor;

  const createNewDay = async (dayName: string) => {
    try {
      const newDay: Day = {
        day_name: dayName,
        exercises: []
      };

      const updatedBlock = {
        ...localBlock,
        days: [...localBlock.days, newDay]
      };

      setLocalBlock(updatedBlock);

      const manualDaysKey = `manual_days_${localBlock.block_name}`;
      try {
        const existingManualDays = await AsyncStorage.getItem(manualDaysKey);
        const manualDaysArray = existingManualDays ? JSON.parse(existingManualDays) : [];

        const updatedManualDays = [...manualDaysArray, newDay];
        await AsyncStorage.setItem(manualDaysKey, JSON.stringify(updatedManualDays));

      } catch (error) {
        console.error('Failed to save manual day:', error);
      }

    } catch (error) {
      console.error('Error creating new day:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.blockLabel}>BLOCK {localBlock.block_name.split(' ')[1] || 'A'}</Text>
          <Text style={styles.blockPhase}>{localBlock.block_name.includes('Hypertrophy') ? 'Hypertrophy' : localBlock.block_name.includes('Strength') ? 'Strength' : 'Training'}</Text>
        </View>

        <TouchableOpacity
          style={styles.restToggle}
          onPress={() => {
            const newValue = !showRestDays;
            setShowRestDays(newValue);
            saveRestDayPreference(newValue);
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.restToggleTrack, { backgroundColor: showRestDays ? themeColor : '#3f3f46' }]}>
            <View style={[styles.restToggleThumb, {
              transform: [{ translateX: showRestDays ? 14 : 0 }],
              backgroundColor: '#ffffff'
            }]} />
          </View>
          <Text style={styles.restToggleLabel}>Rest</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={localBlock.days.filter(day => {
          const isRestDay = day.day_name && day.day_name.toUpperCase().includes('REST');
          return showRestDays || !isRestDay;
        })}
        keyExtractor={(item, index) => `${item.day_name}-${index}`}
        ListHeaderComponent={() => (
          <View style={styles.weekNavigationContainer}>
            <View style={styles.weekNavigation}>
              <TouchableOpacity
                style={[styles.weekNavButton, currentWeek === 1 && styles.weekNavButtonDisabled]}
                onPress={() => currentWeek > 1 && saveCurrentWeek(currentWeek - 1)}
                disabled={currentWeek === 1}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={currentWeek === 1 ? "#3f3f46" : "#71717a"}
                />
              </TouchableOpacity>

              <View style={styles.weekDisplay}>
                <View style={styles.weekHeader}>
                  <Text style={styles.weekLabel}>Week</Text>
                  <TouchableOpacity
                    style={styles.bookmarkButton}
                    onPress={toggleBookmark}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isBookmarked && currentWeek === bookmarkedWeek ? "bookmark" : "bookmark-outline"}
                      size={16}
                      color={isBookmarked && currentWeek === bookmarkedWeek ? "#f59e0b" : "#71717a"}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.weekNumberContainer}>
                  <Text style={[styles.weekNumber, { color: themeColor }]}>{currentWeek}</Text>
                  <Text style={[styles.weekTotal, { color: themeColor }]}>/ {totalWeeks}</Text>
                </View>
                <View style={styles.weekProgress}>
                  <View
                    style={[
                      styles.weekProgressFill,
                      {
                        width: `${(currentWeek / totalWeeks) * 100}%`,
                        backgroundColor: themeColor
                      }
                    ]}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.weekNavButton, currentWeek === totalWeeks && styles.weekNavButtonDisabled]}
                onPress={() => currentWeek < totalWeeks && saveCurrentWeek(currentWeek + 1)}
                disabled={currentWeek === totalWeeks}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={currentWeek === totalWeeks ? "#3f3f46" : "#71717a"}
                />
              </TouchableOpacity>
            </View>
            {isBookmarked && bookmarkedWeek && (
              <View style={styles.bookmarkIndicator}>
                <Ionicons name="bookmark" size={10} color="#f59e0b" />
                <Text style={styles.bookmarkText}>Bookmarked - Always opens to Week {bookmarkedWeek}</Text>
              </View>
            )}

            {/* Volume Overview Section */}
            <TouchableOpacity
              style={styles.volumeToggle}
              onPress={() => setShowVolumeOverview(!showVolumeOverview)}
              activeOpacity={0.7}
            >
              <View style={styles.volumeToggleContent}>
                <Ionicons name="barbell-outline" size={16} color={themeColor} />
                <Text style={[styles.volumeToggleText, { color: themeColor }]}>
                  Week Volume
                </Text>
                <Ionicons
                  name={showVolumeOverview ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={themeColor}
                />
              </View>
            </TouchableOpacity>

            {showVolumeOverview && (
              <View style={styles.volumeOverview}>
                {sortedMuscles.length === 0 ? (
                  <Text style={styles.volumeEmptyText}>
                    No exercises found for volume calculation
                  </Text>
                ) : (
                  <View style={styles.volumeContent}>
                    {/* Body Diagram */}
                    <View style={styles.bodyDiagramContainer}>
                      <View style={styles.bodyDiagramHeader}>
                        <Text style={styles.bodyDiagramTitle}>Training Heatmap</Text>

                        <TouchableOpacity
                          style={styles.bodyFlipIcon}
                          onPress={() => setBodyViewSide(bodyViewSide === 'front' ? 'back' : 'front')}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="sync-outline"
                            size={20}
                            color={themeColor}
                          />
                        </TouchableOpacity>
                      </View>

                      <BodyHighlighter
                        data={muscleHighlighterData}
                        colors={[themeColor, themeColor + '80']}
                        side={bodyViewSide}
                        scale={0.9}
                        border="#27272a"
                      />
                    </View>

                    {/* Detailed Breakdown */}
                    <View style={styles.volumeGrid}>
                      {sortedMuscles.map(([muscle, sets]) => {
                        const intensity = Math.max(0.2, sets / maxVolume);
                        return (
                          <View key={muscle} style={styles.volumeItem}>
                            <View
                              style={[
                                styles.volumeBar,
                                {
                                  backgroundColor: `${themeColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
                                  borderColor: themeColor,
                                }
                              ]}
                            />
                            <Text style={styles.volumeNumber}>{sets}</Text>
                            <Text style={styles.volumeMuscle} numberOfLines={1}>
                              {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <DayCard
            day={item}
            onPress={() => handleDayPress(item)}
            onLongPress={() => handleDayLongPress(item)}
            isCompleted={isWorkoutCompleted(item.day_name)}
            currentWeek={currentWeek}
            completionStats={getCompletionStats(item.day_name)}
            themeColor={themeColor}
            blockName={localBlock.block_name}
            refreshTrigger={refreshTrigger}
          />
        )}
        ListFooterComponent={() => (
          <TouchableOpacity
            style={[styles.addDayButton, { borderColor: themeColor }]}
            onPress={() => handleAddDay()}
          >
            <Ionicons name="add-circle-outline" size={24} color={themeColor} />
            <Text style={[styles.addDayText, { color: themeColor }]}>Add Day</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Day Modal - Android Only */}
      {Platform.OS === 'android' && (
        <Modal
          visible={showAddDayModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAddDayModal(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.title}>Add New Day</Text>

              <TextInput
                style={styles.input}
                value={newDayName}
                onChangeText={setNewDayName}
                placeholder="Enter day name..."
                placeholderTextColor="#888"
                autoFocus={true}
                maxLength={30}
              />

              <View style={styles.buttonContainer}>
                <View style={styles.buttonWrapper}>
                  <Button
                    title="Cancel"
                    color="#666"
                    onPress={() => setShowAddDayModal(false)}
                  />
                </View>
                <View style={styles.buttonWrapper}>
                  <Button
                    title="Create"
                    color={themeColor}
                    onPress={handleCreateDay}
                    disabled={!newDayName.trim()}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Exercise Management Modal */}
      <Modal
        visible={showExerciseModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setShowExerciseModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Day</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowExerciseModal(false)}
              >
                <Ionicons name="close" size={24} color="#71717a" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {selectedDay && (
                <>
                  <Text style={styles.modalSubtitle}>
                    Customize the exercise order and estimated duration for {selectedDay.day_name}
                  </Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Duration (minutes)</Text>
                    <TextInput
                      style={[styles.modalInput, { borderColor: themeColor }]}
                      value={editedDuration}
                      onChangeText={setEditedDuration}
                      placeholder="Enter duration..."
                      placeholderTextColor="#71717a"
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>

                  <View style={styles.exerciseListContainer}>
                    <Text style={styles.exerciseListLabel}>Exercise Order</Text>
                    {exerciseList.map((exercise, index) => (
                      <View key={index} style={styles.exerciseItem}>
                        <TouchableOpacity
                          style={styles.dragHandle}
                          onPress={() => {
                            if (index > 0) {
                              moveExercise(index, index - 1);
                            }
                          }}
                        >
                          <Ionicons name="reorder-two" size={20} color="#71717a" />
                        </TouchableOpacity>

                        <View style={styles.exerciseContent}>
                          <Text style={styles.exerciseName}>{exercise.exercise}</Text>
                        </View>

                        <View style={styles.moveButtons}>
                          <TouchableOpacity
                            style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                            onPress={() => index > 0 && moveExercise(index, index - 1)}
                            disabled={index === 0}
                          >
                            <Ionicons
                              name="chevron-up"
                              size={16}
                              color={index === 0 ? "#3f3f46" : themeColor}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.moveButton, index === exerciseList.length - 1 && styles.moveButtonDisabled]}
                            onPress={() => index < exerciseList.length - 1 && moveExercise(index, index + 1)}
                            disabled={index === exerciseList.length - 1}
                          >
                            <Ionicons
                              name="chevron-down"
                              size={16}
                              color={index === exerciseList.length - 1 ? "#3f3f46" : themeColor}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowExerciseModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, { backgroundColor: themeColor }]}
                onPress={handleSaveExerciseChanges}
              >
                <Ionicons name="checkmark" size={20} color="#ffffff" />
                <Text style={styles.modalCreateText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  blockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  blockPhase: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    borderLeftWidth: 4,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardCompleted: {
    backgroundColor: '#0d1611',
    borderColor: '#10b98120',
    padding: 18,
  },
  completedCardContent: {
    alignItems: 'center',
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  completedTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
  },
  completedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  completedStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  completedStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  completedStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717a',
    letterSpacing: 0.5,
  },
  completedStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#27272a',
  },
  redoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    flex: 1,
  },
  dayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 26,
  },
  dayNameCompleted: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 22,
    textAlign: 'center',
  },
  checkIcon: {
    marginLeft: 8,
  },
  completionInfo: {
    marginBottom: 4,
  },
  completionInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 2,
  },
  completionDate: {
    fontSize: 12,
    color: '#71717a',
  },
  dayBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  completedButton: {
    backgroundColor: '#27272a',
  },
  completedButtonText: {
    color: '#71717a',
  },
  weekNavigationContainer: {
    marginBottom: 16,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    marginHorizontal: 16,
  },
  weekNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#27272a',
  },
  weekNavButtonDisabled: {
    backgroundColor: '#18181b',
  },
  weekDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  weekLabel: {
    fontSize: 11,
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  bookmarkButton: {
    padding: 2,
  },
  bookmarkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  bookmarkText: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '500',
  },
  weekNumberContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  weekNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  weekTotal: {
    fontSize: 16,
    color: '#71717a',
    marginLeft: 4,
  },
  weekProgress: {
    width: 120,
    height: 4,
    backgroundColor: '#27272a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  weekProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  completionStats: {
    backgroundColor: '#10b98110',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#10b98130',
  },
  completionStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  completionStatsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  completionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  completionStat: {
    alignItems: 'center',
  },
  completionStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  completionStatLabel: {
    fontSize: 10,
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exerciseChip: {
    backgroundColor: '#0a0a0b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#27272a',
    minWidth: 100,
    maxWidth: '48%',
  },
  exerciseChipText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 2,
  },
  exerciseChipSets: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreChip: {
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  moreChipText: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
  },
  addDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: 'transparent',
    gap: 8,
  },
  addDayText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Dark Modal Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 40,
  },
  modal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#0a0a0b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  buttonWrapper: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // New Modal Styles
  newModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  newModalBackdrop: {
    flex: 1,
  },
  newModalContainer: {
    backgroundColor: '#0a0a0b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
    maxHeight: '85%',
  },
  newModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#3f3f46',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  newModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  newModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  newModalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  newModalContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  newModalIconWrapper: {
    marginBottom: 24,
  },
  newModalIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newModalDescription: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  newInputSection: {
    width: '100%',
  },
  newInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  newModalInput: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 17,
    color: '#ffffff',
    marginBottom: 8,
  },
  newCharacterCount: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'right',
    marginBottom: 16,
  },
  newModalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
  },
  newCancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    paddingVertical: 30,
    paddingHorizontal: 25,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  newCreateButton: {
    flex: 2,
    paddingVertical: 30,
    paddingHorizontal: 25,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  newCancelText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  newCreateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#0a0a0b',
    borderRadius: 24,
    height: '80%',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    flex: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#3f3f46',
    borderRadius: 2,
    position: 'absolute',
    top: 8,
    left: '50%',
    marginLeft: -18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#ffffff',
    borderWidth: 2,
    marginBottom: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  modalCreateButton: {
    flex: 2.2,
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a1a1aa',
    textAlign: 'center',
    flexShrink: 1,
  },
  modalCreateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    flexShrink: 1,
  },

  // Exercise modal specific styles
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flex: 1,
  },
  exerciseListContainer: {
    marginTop: 24,
  },
  exerciseListLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    minHeight: 60,
  },
  dragHandle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  moveButtons: {
    flexDirection: 'column',
    gap: 2,
  },
  moveButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 6,
  },
  moveButtonDisabled: {
    backgroundColor: '#18181b',
  },
  restDayName: {
    color: '#6b7280',
  },
  restDayCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    borderLeftWidth: 4,
    padding: 20,
    marginBottom: 20,
  },
  restDayContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  restDayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 4,
  },
  restDaySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  },
  restToggle: {
    alignItems: 'center',
    gap: 4,
  },
  restToggleTrack: {
    width: 32,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  restToggleThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  restToggleLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Volume Overview Styles
  volumeToggle: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#18181b',
  },
  volumeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  volumeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  volumeOverview: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  volumeContent: {
    gap: 24,
  },
  bodyDiagramContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#0f0f10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  bodyDiagramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  bodyDiagramTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  bodyFlipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  volumeItem: {
    alignItems: 'center',
    minWidth: 60,
    maxWidth: 80,
    gap: 4,
    flex: 1,
    flexBasis: '22%',
  },
  volumeBar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  volumeMuscle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#a1a1aa',
    textAlign: 'center',
  },
  volumeEmptyText: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});