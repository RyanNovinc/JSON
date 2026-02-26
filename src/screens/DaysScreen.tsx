import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';

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
  estimated_duration?: number; // minutes
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
    duration: number; // minutes
    totalVolume: number; // kg
    date: string;
  };
}

function DayCard({ day, onPress, onLongPress, isCompleted, currentWeek, completionStats, themeColor, blockName, refreshTrigger }: DayCardProps) {
  const [modifiedExercises, setModifiedExercises] = useState<Exercise[]>(day.exercises || []);
  const [dynamicExercises, setDynamicExercises] = useState<Exercise[]>([]);
  const [customizedDuration, setCustomizedDuration] = useState<number | undefined>(day.estimated_duration);
  
  // Total exercise count including dynamic exercises
  const exerciseCount = (modifiedExercises?.length || 0) + (dynamicExercises?.length || 0);

  // Load week-specific customizations (exercise order and duration)
  const loadWeekCustomizations = async () => {
    try {
      const customizationKey = `day_customization_${blockName}_${day.day_name || 'unknown'}_week${currentWeek}`;
      const savedCustomization = await AsyncStorage.getItem(customizationKey);
      if (savedCustomization) {
        const customizationData = JSON.parse(savedCustomization);
        
        // PRIORITY: Use customized exercises, ignore any dynamic exercises when customization exists
        if (customizationData.exercises) {
          setModifiedExercises(customizationData.exercises);
        }
        
        // Update duration with customized value
        if (customizationData.estimated_duration !== undefined) {
          setCustomizedDuration(customizationData.estimated_duration);
        }
        
        // Don't load dynamic exercises when customization exists
        setDynamicExercises([]);
        return; // Early return to skip dynamic loading
      } else {
        // No customization, use original data and load dynamic exercises
        setModifiedExercises(day.exercises || []);
        setCustomizedDuration(day.estimated_duration);
        // Dynamic exercises will be loaded separately
      }
    } catch (error) {
      setModifiedExercises(day.exercises || []);
      setCustomizedDuration(day.estimated_duration);
    }
  };

  // Load dynamic exercises that were added during workout (only if no customization)
  const loadDynamicExercises = async () => {
    // Check if customization exists first
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
    
    // Only load dynamic exercises if no customization exists
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

  // Load saved sets data to get actual number of sets
  const loadSetsData = async () => {
    try {
      const savedKey = `workout_${blockName}_${day.day_name || 'unknown'}_week${currentWeek}_sets`;
      const savedData = await AsyncStorage.getItem(savedKey);
      if (savedData) {
        const savedSetsData = JSON.parse(savedData);
        // Update exercises with actual number of sets
        const updatedExercises = (day.exercises || []).map((exercise, index) => {
          if (savedSetsData[index] && savedSetsData[index].length > 0) {
            return {
              ...exercise,
              sets: savedSetsData[index].length // Use actual number of sets
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
  
  // Include both original day exercises and dynamic exercises
  const allExercises = [...(modifiedExercises || []), ...(dynamicExercises || [])];
  
  // Calculate duration based on actual exercises (ignore stored duration for dynamic calculation)
  const estimatedDuration = (() => {
    // If no exercises, return 0
    if (exerciseCount === 0) {
      return 0;
    }

    // Use customized duration if available, otherwise use original day duration
    if (customizedDuration !== undefined) {
      return customizedDuration;
    }
    
    // Use stored duration if available and day has original exercises
    if (day.estimated_duration && (day.exercises?.length || 0) > 0) {
      return day.estimated_duration;
    }
    
    // Calculate based on actual rest times and exercise complexity for all exercises
    const totalRestTime = allExercises.reduce((total, ex) => {
      const sets = ex.sets;
      const restPerSet = (ex.rest || 120) / 60; // convert to minutes
      return total + (sets * restPerSet);
    }, 0);
    
    // Estimate exercise execution time (compound vs isolation)
    const executionTime = allExercises.reduce((total, ex) => {
      const name = (ex.exercise || '').toLowerCase();
      const isCompound = name.includes('squat') || name.includes('deadlift') || 
                        name.includes('press') || name.includes('row') || 
                        name.includes('pull up') || name.includes('chin up');
      const timePerSet = isCompound ? 1.5 : 1; // minutes per set
      return total + (ex.sets * timePerSet);
    }, 0);
    
    // Add warmup and setup time
    const warmupTime = 5;
    const setupTime = exerciseCount * 0.5; // 30 seconds setup per exercise
    
    return Math.round(totalRestTime + executionTime + warmupTime + setupTime);
  })();
  
  // Categorize exercises by type for better preview
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
      exercisesByType.cardio.push(ex.exercise || ex.activity || 'Unknown Cardio');
    } else {
      exercisesByType.compound.push(ex.exercise || 'Unknown Exercise'); // default to compound
    }
  });
  
  // Get day type color
  const getDayTypeColor = (dayName: string) => {
    const name = (dayName || '').toLowerCase();
    if (name.includes('push') || name.includes('chest') || name.includes('shoulder')) return '#f59e0b';
    if (name.includes('pull') || name.includes('back') || name.includes('bicep')) return '#10b981';
    if (name.includes('legs') || name.includes('lower') || name.includes('glute')) return '#a855f7';
    if (name.includes('upper')) return themeColor;
    if (name.includes('full') || name.includes('total')) return '#ef4444';
    return themeColor; // default to theme color instead of gray
  };
  
  const dayColor = getDayTypeColor(day.day_name || '');
  
  if (isCompleted && completionStats) {
    // Minimal completed card
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
  
  // Regular uncompleted card with full details
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
  
  
  // Use local state for the block to enable immediate updates
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
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Calculate total weeks for this block
  const totalWeeks = localBlock.weeks.includes('-') 
    ? parseInt(localBlock.weeks.split('-')[1]) - parseInt(localBlock.weeks.split('-')[0]) + 1 
    : 1;
  
  // Calculate visible weeks based on screen width
  const screenWidth = Dimensions.get('window').width;
  const weekTabWidth = 36;
  const weekTabGap = 8;
  const maxVisibleWeeks = Math.floor((screenWidth - 120) / (weekTabWidth + weekTabGap)); // 120px for nav buttons and padding

  // Find first incomplete week
  const findFirstIncompleteWeek = async () => {
    for (let week = 1; week <= totalWeeks; week++) {
      const weekKey = `completed_${localBlock.block_name}_week${week}`;
      const weekCompleted = await AsyncStorage.getItem(weekKey);
      
      if (!weekCompleted) {
        return week;
      }
      
      const completedSet = new Set(JSON.parse(weekCompleted));
      // Check if all days in this week are completed
      const allDaysCompleted = localBlock.days.every(day => 
        completedSet.has(`${day.day_name || 'unknown'}_week${week}`)
      );
      
      if (!allDaysCompleted) {
        return week;
      }
    }
    return totalWeeks; // If all weeks are complete, return the last week
  };
  
  // Initial load - determine which week to show
  const initializeWeek = async () => {
    // If initialWeek is passed from "Today" button, use that and skip other logic
    if (initialWeek) {
      setCurrentWeek(initialWeek);
      
      // Check if there's a bookmark for this block
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
        // If bookmarked, save the bookmarked week and go to it
        setBookmarkedWeek(week);
        setCurrentWeek(week);
      } else {
        // If not bookmarked, find first incomplete week
        setBookmarkedWeek(null);
        const incompleteWeek = await findFirstIncompleteWeek();
        setCurrentWeek(incompleteWeek);
      }
    } else {
      // No bookmark saved, find first incomplete week
      setBookmarkedWeek(null);
      const incompleteWeek = await findFirstIncompleteWeek();
      setCurrentWeek(incompleteWeek);
    }
  };
  
  // Initial load
  useEffect(() => {
    initializeWeek();
    reloadBlockData(); // Load manual days on initial load
  }, []);
  
  // Function to reload block data from storage
  const reloadBlockData = async () => {
    try {
      // Load manual days and merge with original block structure
      const manualDaysKey = `manual_days_${localBlock.block_name}`;
      const manualDaysData = await AsyncStorage.getItem(manualDaysKey);
      
      if (manualDaysData) {
        const manualDays = JSON.parse(manualDaysData);
        console.log(`✅ Found ${manualDays.length} manual days for ${localBlock.block_name}`);
        
        // Merge original days with manual days
        const mergedDays = [...block.days, ...manualDays];
        const updatedBlock = {
          ...localBlock,
          days: mergedDays
        };
        
        setLocalBlock(updatedBlock);
        console.log(`✅ Merged ${block.days.length} original + ${manualDays.length} manual = ${mergedDays.length} total days`);
      } else {
        console.log('⚠️ No manual days found, keeping original block structure');
      }
      return;
      
      const routineData = await AsyncStorage.getItem('routine_1772009535369');
      if (routineData) {
        const routine = JSON.parse(routineData);
        
        if (routine.data && typeof routine.data === 'object') {
          // Convert routine.data object properties to days array
          // Filter out non-day properties (like id, routine_name, etc.)
          const dayObjects = Object.entries(routine.data)
            .filter(([key, value]) => 
              // Only include properties that look like workout days
              value && 
              typeof value === 'object' && 
              value.day_name && 
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

  // Reload data when screen comes into focus (after workout completion)
  useFocusEffect(
    useCallback(() => {
      reloadBlockData(); // Reload block data to get any new days
      loadCompletedWorkouts();
      loadCompletionStats();
      // Trigger refresh for DayCards to reload modified exercises
      setRefreshTrigger(prev => prev + 1);
    }, [currentWeek])
  );

  useEffect(() => {
    loadCompletedWorkouts();
    loadCompletionStats();
  }, [currentWeek]);
  
  useEffect(() => {
    // Auto-scroll to current week when it changes
    if (scrollViewRef.current && totalWeeks > maxVisibleWeeks) {
      const scrollToX = Math.max(0, (currentWeek - Math.floor(maxVisibleWeeks / 2) - 1) * (weekTabWidth + weekTabGap));
      scrollViewRef.current.scrollTo({ x: scrollToX, animated: true });
    }
  }, [currentWeek, totalWeeks, maxVisibleWeeks]);

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
      
      // Don't update the bookmark week when navigating
      // The bookmark should stay on its original week
    } catch (error) {
      console.error('Failed to save current week:', error);
    }
  };
  
  const toggleBookmark = async () => {
    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);
    
    const bookmarkKey = `bookmark_${localBlock.block_name}`;
    if (newBookmarkState) {
      // Save bookmark with current week
      setBookmarkedWeek(currentWeek);
      await AsyncStorage.setItem(bookmarkKey, JSON.stringify({
        week: currentWeek,
        isBookmarked: true
      }));
    } else {
      // Clear bookmark
      setBookmarkedWeek(null);
      await AsyncStorage.setItem(bookmarkKey, JSON.stringify({
        week: currentWeek,
        isBookmarked: false
      }));
    }
  };

  const loadCompletedWorkouts = async () => {
    try {
      const key = `completed_${localBlock.block_name}_week${currentWeek}`;
      console.log('Loading completed workouts with key:', key);
      const completed = await AsyncStorage.getItem(key);
      if (completed) {
        const parsedCompleted = JSON.parse(completed);
        console.log('Found completed workouts:', parsedCompleted);
        setCompletedWorkouts(new Set(parsedCompleted));
      } else {
        console.log('No completed workouts found for this week');
        setCompletedWorkouts(new Set());
      }
    } catch (error) {
      console.error('Failed to load completed workouts:', error);
    }
  };

  const getWorkoutKey = (dayName: string, week: number) => `${dayName}_week${week}`;

  const loadCompletionStats = async () => {
    try {
      const stats = await AsyncStorage.getItem(`completionStats_${localBlock.block_name}_week${currentWeek}`);
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
      // Navigate to review screen for completed workouts
      navigation.navigate('WorkoutReview' as any, {
        day,
        blockName: localBlock.block_name,
        completionStats: stats,
        currentWeek
      });
    } else {
      // Navigate to workout log for new workouts
      // Add mock previous data for demonstration
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
        currentWeek: currentWeek,  // Pass the current week
        block: block,  // Pass the full block data for completion detection
        routineName: routineName  // Pass routine name for exercise preferences
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
      // Use custom modal for Android
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
    
    // Load current customizations for this specific week
    try {
      const customizationKey = `day_customization_${localBlock.block_name}_${day.day_name}_week${currentWeek}`;
      const savedCustomization = await AsyncStorage.getItem(customizationKey);
      
      if (savedCustomization) {
        const customizationData = JSON.parse(savedCustomization);
        console.log(`📋 Loading modal with customization for ${day.day_name} week ${currentWeek}`);
        
        // Use customized exercises and duration
        setExerciseList([...(customizationData.exercises || day.exercises)]);
        setEditedDuration(customizationData.estimated_duration?.toString() || day.estimated_duration?.toString() || '');
      } else {
        // No customization, use original data
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
      // Update the day with new exercise order and duration
      const updatedDay = {
        ...selectedDay,
        exercises: exerciseList,
        estimated_duration: editedDuration ? parseInt(editedDuration) : undefined
      };

      // Update the local block immediately for UI
      const updatedBlock = {
        ...localBlock,
        days: localBlock.days.map(d => 
          d.day_name === selectedDay.day_name ? updatedDay : d
        )
      };

      setLocalBlock(updatedBlock);

      // Save week-specific exercise customizations
      const customizationKey = `day_customization_${localBlock.block_name}_${selectedDay.day_name}_week${currentWeek}`;
      const customizationData = {
        exercises: exerciseList,
        estimated_duration: editedDuration ? parseInt(editedDuration) : undefined,
        customizedAt: new Date().toISOString(),
        week: currentWeek
      };
      
      await AsyncStorage.setItem(customizationKey, JSON.stringify(customizationData));

      // Check if this is a manual day (not in original block)
      const isManualDay = !block.days.some(originalDay => originalDay.day_name === selectedDay.day_name);
      
      if (isManualDay) {
        // Also save to manual days storage for manual days
        const manualDaysKey = `manual_days_${localBlock.block_name}`;
        const existingManualDays = await AsyncStorage.getItem(manualDaysKey);
        const manualDaysArray = existingManualDays ? JSON.parse(existingManualDays) : [];
        
        // Update the specific manual day
        const updatedManualDays = manualDaysArray.map((day: Day) => 
          day.day_name === selectedDay.day_name ? updatedDay : day
        );
        
        await AsyncStorage.setItem(manualDaysKey, JSON.stringify(updatedManualDays));
      }

      // Trigger a refresh of the day cards to show updated data
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

  // Create a more vibrant version of theme color for buttons
  const vibrantThemeColor = themeColor === '#10b981' ? '#059669' : 
                           themeColor === '#3b82f6' ? '#2563eb' : 
                           themeColor === '#8b5cf6' ? '#7c3aed' : 
                           themeColor === '#f59e0b' ? '#d97706' : 
                           themeColor === '#ef4444' ? '#dc2626' : 
                           themeColor;

  const createNewDay = async (dayName: string) => {
    let debugLog = '';
    
    try {
      debugLog += `🚀 STARTING DAY CREATION: "${dayName}"\n\n`;
      
      // Create new day object
      const newDay: Day = {
        day_name: dayName,
        exercises: [] // Start with empty exercises array
      };
      debugLog += `📝 Created day object: ${JSON.stringify(newDay)}\n\n`;

      // Add the new day to the block
      const updatedBlock = {
        ...localBlock,
        days: [...localBlock.days, newDay]
      };
      debugLog += `📦 Updated local block - now has ${updatedBlock.days.length} days\n`;
      debugLog += `📦 Day names: [${updatedBlock.days.map(d => d.day_name).join(', ')}]\n\n`;

      // Update local state immediately for instant UI update
      setLocalBlock(updatedBlock);
      debugLog += `✅ Updated local state\n\n`;
      
      // Now save to storage using correct structure
      const routineData = await AsyncStorage.getItem('routine_1772009535369');
      if (routineData) {
        const routine = JSON.parse(routineData);
        debugLog += `💾 STORAGE ANALYSIS:\n`;
        debugLog += `- Keys: ${Object.keys(routine).join(', ')}\n`;
        debugLog += `- Has blocks: ${!!routine.blocks} (${typeof routine.blocks})\n`;
        debugLog += `- Has days: ${!!routine.days} (${typeof routine.days})\n`;
        debugLog += `- Has data: ${!!routine.data} (${typeof routine.data})\n`;
        debugLog += `- Is array: ${Array.isArray(routine)}\n`;
        
        if (routine.data) {
          debugLog += `- Data keys: ${Object.keys(routine.data).join(', ')}\n`;
        }
        debugLog += `\n`;
        
        // Based on the JSON structure you showed, the routine IS the block
        // So we need to update the routine's own days array
        if (Array.isArray(routine)) {
          // Routine is an array of days
          const updatedRoutine = [...routine, newDay];
          await AsyncStorage.setItem('routine_1772009535369', JSON.stringify(updatedRoutine));
          debugLog += `✅ SAVED: Routine as array - ${updatedRoutine.length} total days\n`;
          
        } else if (routine.hasOwnProperty('Push') || routine.hasOwnProperty('Pull') || routine.hasOwnProperty('Legs')) {
          // Routine has day objects as properties (like the JSON you showed)
          const updatedRoutine = {
            ...routine,
            [newDay.day_name]: newDay
          };
          await AsyncStorage.setItem('routine_1772009535369', JSON.stringify(updatedRoutine));
          debugLog += `✅ SAVED: Routine as object with day properties\n`;
          debugLog += `✅ New keys: ${Object.keys(updatedRoutine).join(', ')}\n`;
          
        } else if (routine.data && typeof routine.data === 'object') {
          // Save manual days to a separate storage key to avoid corruption
          const manualDaysKey = `manual_days_${localBlock.block_name}`;
          try {
            const existingManualDays = await AsyncStorage.getItem(manualDaysKey);
            const manualDaysArray = existingManualDays ? JSON.parse(existingManualDays) : [];
            
            // Add the new day to manual days
            const updatedManualDays = [...manualDaysArray, newDay];
            await AsyncStorage.setItem(manualDaysKey, JSON.stringify(updatedManualDays));
            
            debugLog += `✅ SAVED: Manual day to separate storage\n`;
            debugLog += `✅ Manual days key: ${manualDaysKey}\n`;
            debugLog += `✅ Total manual days: ${updatedManualDays.length}\n`;
          } catch (error) {
            debugLog += `❌ FAILED to save manual day: ${error.message}\n`;
          }
          
        } else {
          debugLog += `❌ UNKNOWN STRUCTURE - NO SAVE ATTEMPTED\n`;
          
          // Show detailed debug info
          console.log('=== DAY CREATION DEBUG LOG ===');
          console.log(debugLog);
          console.log('=== END DEBUG LOG ===');
          return;
        }
        
        debugLog += `\n🎉 SUCCESS: Day "${dayName}" created and saved!`;
        
        console.log('=== DAY CREATION DEBUG LOG ===');
        console.log(debugLog);
        console.log('=== END DEBUG LOG ===');
        
        // Save to state for viewing
      } else {
        debugLog += `❌ NO ROUTINE DATA IN STORAGE\n`;
        
        console.log('=== DAY CREATION DEBUG LOG ===');
        console.log(debugLog);
        console.log('=== END DEBUG LOG ===');
      }
    } catch (error) {
      debugLog += `\n💥 ERROR: ${error}\n`;
      debugLog += `💥 Stack: ${error.stack}\n`;
      
      console.log('=== DAY CREATION ERROR LOG ===');
      console.log(debugLog);
      console.log('=== END ERROR LOG ===');
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
          <Text style={styles.title} numberOfLines={1}>{localBlock.block_name}</Text>
        </View>
      </View>

      <FlatList
        data={localBlock.days}
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
          animationType="slide"
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
    paddingRight: 40, // Compensate for back button to center title
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#71717a',
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
    paddingBottom: 34, // Safe area
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
});