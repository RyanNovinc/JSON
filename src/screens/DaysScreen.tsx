import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
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
import { styles } from './DaysScreen.styles';
import DayRow from './DayRow';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Slug, ExtendedBodyPart } from 'react-native-body-highlighter';
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
const MUSCLE_TO_SLUG: { [key: string]: Slug | null } = {
  'chest': 'chest',
  'core': 'abs',
  'upper back': 'trapezius',
  'lats': 'upper-back',
  'traps': 'trapezius',
  'lower back': 'lower-back',
  'front delts': 'deltoids',
  'side delts': 'deltoids',
  'rear delts': 'deltoids',
  'biceps': 'biceps',
  'triceps': 'triceps',
  'forearms': 'forearm',
  'quads': 'quadriceps',
  'hamstrings': 'hamstring',
  'glutes': 'gluteal',
  'calves': 'calves',
  'neck': 'neck',
  'obliques': 'obliques',
  'hip adductors': 'adductors',
  'hip abductors': 'gluteal',
  'shins': null,
  'serratus': null,
};

const setsToIntensity = (sets: number): number => {
  if (sets >= 1) return 1;
  return 0;
};

const buildHighlighterData = (weeklyVolume: { [key: string]: number }): ExtendedBodyPart[] => {
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

  return Object.entries(slugVolume)
    .map(([slug, totalSets]) => ({
      slug: slug as Slug,
      intensity: setsToIntensity(totalSets!),
    }))
    .sort((a, b) => {
      const aIdx = SLUG_RENDER_ORDER.indexOf(a.slug);
      const bIdx = SLUG_RENDER_ORDER.indexOf(b.slug);
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
  const scrollViewRef = useRef<ScrollView>(null);

  // Memoized volume calculation
  const weeklyVolume = useMemo(
    () => calculateWeeklyVolume(localBlock),
    [localBlock]
  );

  const muscleHighlighterData = useMemo(
    () => buildHighlighterData(weeklyVolume),
    [weeklyVolume]
  );

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

        let workoutKeys: string[] = [];
        if (Array.isArray(parsedCompleted)) {
          workoutKeys = parsedCompleted
            .filter(item => typeof item === 'string')
            .filter(item => item.includes('_week'));

          if (workoutKeys.length === 0 && parsedCompleted.length > 0) {
            console.warn('🔍 [LOAD-COMPLETION] Found corrupted completion data - resetting');
            workoutKeys = [];
          }
        }

        setCompletedWorkouts(new Set(workoutKeys));
        setRefreshTrigger(prev => prev + 1);

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
    const workoutKey = getWorkoutKey(dayName, currentWeek);
    return completedWorkouts.has(workoutKey);
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

  // ── Derived UI data ─────────────────────────────────────────────

  const visibleDays = localBlock.days.filter(day => {
    const isRestDay = day.day_name && day.day_name.toUpperCase().includes('REST');
    return showRestDays || !isRestDay;
  });

  // Workout days (non-rest) for completion counting
  const workoutDays = localBlock.days.filter(day => {
    const isRestDay = day.day_name && day.day_name.toUpperCase().includes('REST');
    return !isRestDay;
  });
  const completedCount = workoutDays.filter(day => isWorkoutCompleted(day.day_name || 'unknown')).length;
  const totalWorkoutCount = workoutDays.length;

  // Find the next incomplete non-rest day (becomes the NEXT UP hero)
  const nextUpDay = workoutDays.find(day => !isWorkoutCompleted(day.day_name || 'unknown'));
  const nextUpDayName = nextUpDay?.day_name;

  // Block phase label
  const blockPhaseLabel = (() => {
    const name = localBlock.block_name || '';
    const phase = name.includes('Hypertrophy')
      ? 'HYPERTROPHY'
      : name.includes('Strength')
        ? 'STRENGTH'
        : 'TRAINING';
    const letter = name.split(' ')[1] || 'A';
    return `BLOCK ${letter} · ${phase}`;
  })();

  // Filter days for the FlatList — exclude the NEXT UP day from the list (rendered separately)
  const listDays = visibleDays.filter(day => day.day_name !== nextUpDayName);

  // For pending day rows we need a 1-based position within the workout days (not visibleDays)
  // so the index badge is stable regardless of rest-toggle state.
  const dayPositionMap = useMemo(() => {
    const map = new Map<string, number>();
    workoutDays.forEach((day, idx) => {
      map.set(day.day_name || 'unknown', idx + 1);
    });
    return map;
  }, [workoutDays]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerLabel}>{blockPhaseLabel}</Text>

        <TouchableOpacity
          style={styles.restToggleButton}
          onPress={() => {
            const newValue = !showRestDays;
            setShowRestDays(newValue);
            saveRestDayPreference(newValue);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showRestDays ? 'bed' : 'bed-outline'}
            size={16}
            color={showRestDays ? themeColor : '#9898a4'}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={listDays}
        keyExtractor={(item, index) => `${item.day_name}-${index}`}
        ListHeaderComponent={() => (
          <>
            {/* Title block */}
            <View style={styles.titleBlock}>
              <View style={styles.titleRow}>
                <Text style={styles.weekTitle}>Week {currentWeek}</Text>
                <TouchableOpacity
                  style={styles.bookmarkButton}
                  onPress={toggleBookmark}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isBookmarked && currentWeek === bookmarkedWeek ? 'bookmark' : 'bookmark-outline'}
                    size={18}
                    color={isBookmarked && currentWeek === bookmarkedWeek ? '#f7b220' : '#55555f'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.weekSubtitleRow}>
                <Text style={styles.weekSubtitle}>
                  {completedCount} OF {totalWorkoutCount} COMPLETE THIS WEEK
                </Text>
                {isBookmarked && bookmarkedWeek && (
                  <View style={styles.bookmarkPill}>
                    <Ionicons name="bookmark" size={9} color="#f7b220" />
                    <Text style={styles.bookmarkPillText}>WEEK {bookmarkedWeek}</Text>
                  </View>
                )}
              </View>

              {/* Progress bar */}
              <View style={styles.weekProgressTrack}>
                <View
                  style={[
                    styles.weekProgressFill,
                    {
                      width: totalWorkoutCount > 0
                        ? `${(completedCount / totalWorkoutCount) * 100}%`
                        : '0%',
                      backgroundColor: themeColor,
                    },
                  ]}
                />
              </View>

              {/* Week pager */}
              <View style={styles.weekPagerRow}>
                <View style={styles.weekPagerLeft}>
                  <TouchableOpacity
                    style={[styles.weekPagerButton, currentWeek === 1 && styles.weekPagerButtonDisabled]}
                    onPress={() => currentWeek > 1 && saveCurrentWeek(currentWeek - 1)}
                    disabled={currentWeek === 1}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={13} color={currentWeek === 1 ? '#3a3a44' : '#9898a4'} />
                  </TouchableOpacity>
                  <Text style={styles.weekPagerLabel}>WEEK {currentWeek}/{totalWeeks}</Text>
                  <TouchableOpacity
                    style={[styles.weekPagerButton, currentWeek === totalWeeks && styles.weekPagerButtonDisabled]}
                    onPress={() => currentWeek < totalWeeks && saveCurrentWeek(currentWeek + 1)}
                    disabled={currentWeek === totalWeeks}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-forward" size={13} color={currentWeek === totalWeeks ? '#3a3a44' : '#fff'} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.volumeButton}
                  onPress={() => {
                    const allExercises = (localBlock.days || []).flatMap((day: any) =>
                      (day.exercises || []).map((ex: any) => ({
                        ...ex,
                        sets: ex.sets || 3,
                      }))
                    );

                    navigation.navigate('WeekVolumeScreen', {
                      exercises: allExercises,
                      blockName: localBlock.name || 'Block',
                      weekNumber: currentWeek,
                      themeColor: themeColor,
                    });
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="barbell-outline" size={12} color={themeColor} />
                  <Text style={[styles.volumeButtonText, { color: themeColor }]}>VOLUME</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* NEXT UP hero */}
            {nextUpDay && (
              <>
                <Text style={[styles.sectionLabel, styles.sectionLabelAccent, { color: themeColor }]}>
                  NEXT UP
                </Text>
                <DayRow
                  day={nextUpDay}
                  dayNumber={dayPositionMap.get(nextUpDay.day_name || 'unknown') || 1}
                  onPress={() => handleDayPress(nextUpDay)}
                  onLongPress={() => handleDayLongPress(nextUpDay)}
                  isCompleted={false}
                  isNextUp={true}
                  currentWeek={currentWeek}
                  themeColor={themeColor}
                  blockName={localBlock.block_name}
                  refreshTrigger={refreshTrigger}
                />
              </>
            )}

            {/* THIS WEEK label — only show when there are more days */}
            {listDays.length > 0 && (
              <Text style={[styles.sectionLabel, styles.sectionLabelMuted]}>
                {nextUpDay ? 'THIS WEEK' : 'WORKOUTS'}
              </Text>
            )}
          </>
        )}
        renderItem={({ item }) => (
          <DayRow
            day={item}
            dayNumber={dayPositionMap.get(item.day_name || 'unknown') || 1}
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
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={themeColor} />
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
                <Ionicons name="close" size={20} color="#9898a4" />
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
                              color={index === 0 ? '#3f3f46' : themeColor}
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
                              color={index === exerciseList.length - 1 ? '#3f3f46' : themeColor}
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
                <Ionicons name="checkmark" size={18} color="#000" />
                <Text style={styles.modalCreateText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}