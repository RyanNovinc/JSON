import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';

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
  isCompleted?: boolean;
  currentWeek: number;
  completionStats?: {
    duration: number; // minutes
    totalVolume: number; // kg
    date: string;
  };
}

function DayCard({ day, onPress, isCompleted, currentWeek, completionStats }: DayCardProps) {
  const exerciseCount = day.exercises.length;
  
  // Use duration from JSON if available, otherwise calculate estimate
  const estimatedDuration = day.estimated_duration || (() => {
    // Calculate based on actual rest times and exercise complexity
    const totalRestTime = day.exercises.reduce((total, ex) => {
      const sets = ex.sets;
      const restPerSet = (ex.rest || 120) / 60; // convert to minutes
      return total + (sets * restPerSet);
    }, 0);
    
    // Estimate exercise execution time (compound vs isolation)
    const executionTime = day.exercises.reduce((total, ex) => {
      const name = ex.exercise.toLowerCase();
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
  
  day.exercises.forEach(ex => {
    const name = ex.exercise.toLowerCase();
    if (name.includes('squat') || name.includes('deadlift') || name.includes('press') || 
        name.includes('row') || name.includes('pull up') || name.includes('chin up')) {
      exercisesByType.compound.push(ex.exercise);
    } else if (name.includes('curl') || name.includes('extension') || name.includes('fly') || 
              name.includes('raise') || name.includes('isolation')) {
      exercisesByType.isolation.push(ex.exercise);
    } else if (name.includes('cardio') || name.includes('run') || name.includes('bike')) {
      exercisesByType.cardio.push(ex.exercise);
    } else {
      exercisesByType.compound.push(ex.exercise); // default to compound
    }
  });
  
  // Get day type color
  const getDayTypeColor = (dayName: string) => {
    const name = dayName.toLowerCase();
    if (name.includes('push') || name.includes('chest') || name.includes('shoulder')) return '#f59e0b';
    if (name.includes('pull') || name.includes('back') || name.includes('bicep')) return '#10b981';
    if (name.includes('legs') || name.includes('lower') || name.includes('glute')) return '#a855f7';
    if (name.includes('upper')) return '#22d3ee';
    if (name.includes('full') || name.includes('total')) return '#ef4444';
    return '#6b7280'; // default
  };
  
  const dayColor = getDayTypeColor(day.day_name);
  
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
            <Text style={styles.dayNameCompleted}>
              {day.day_name}
            </Text>
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
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.dayName}>{day.day_name}</Text>
          <View style={[styles.dayBadge, { backgroundColor: dayColor + '20' }]}>
            <Text style={[styles.dayBadgeText, { color: dayColor }]}>
              {estimatedDuration} min estimated
            </Text>
          </View>
        </View>
        <View style={styles.startButton}>
          <Ionicons name="play" size={16} color="#22d3ee" />
          <Text style={styles.startButtonText}>START</Text>
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
          {day.exercises.slice(0, 6).map((exercise, index) => (
            <View key={index} style={styles.exerciseChip}>
              <Text style={styles.exerciseChipText} numberOfLines={1}>
                {exercise.exercise}
              </Text>
              <Text style={styles.exerciseChipSets}>{exercise.sets}×{exercise.reps}</Text>
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
  const { block, routineName } = route.params;
  
  const [currentWeek, setCurrentWeek] = useState(1);
  const [completedWorkouts, setCompletedWorkouts] = useState<Set<string>>(new Set());
  const [completionStats, setCompletionStats] = useState<Map<string, any>>(new Map());
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkedWeek, setBookmarkedWeek] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Calculate total weeks for this block
  const totalWeeks = block.weeks.includes('-') 
    ? parseInt(block.weeks.split('-')[1]) - parseInt(block.weeks.split('-')[0]) + 1 
    : 1;
  
  // Calculate visible weeks based on screen width
  const screenWidth = Dimensions.get('window').width;
  const weekTabWidth = 36;
  const weekTabGap = 8;
  const maxVisibleWeeks = Math.floor((screenWidth - 120) / (weekTabWidth + weekTabGap)); // 120px for nav buttons and padding

  // Find first incomplete week
  const findFirstIncompleteWeek = async () => {
    for (let week = 1; week <= totalWeeks; week++) {
      const weekKey = `completed_${block.block_name}_week${week}`;
      const weekCompleted = await AsyncStorage.getItem(weekKey);
      
      if (!weekCompleted) {
        return week;
      }
      
      const completedSet = new Set(JSON.parse(weekCompleted));
      // Check if all days in this week are completed
      const allDaysCompleted = block.days.every(day => 
        completedSet.has(`${day.day_name}_week${week}`)
      );
      
      if (!allDaysCompleted) {
        return week;
      }
    }
    return totalWeeks; // If all weeks are complete, return the last week
  };
  
  // Initial load - determine which week to show
  const initializeWeek = async () => {
    const bookmarkKey = `bookmark_${block.block_name}`;
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
  }, []);
  
  // Reload data when screen comes into focus (after workout completion)
  useFocusEffect(
    useCallback(() => {
      loadCompletedWorkouts();
      loadCompletionStats();
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
      const savedWeek = await AsyncStorage.getItem(`currentWeek_${block.block_name}`);
      if (savedWeek) {
        setCurrentWeek(parseInt(savedWeek));
      }
    } catch (error) {
      console.error('Failed to load current week:', error);
    }
  };

  const saveCurrentWeek = async (week: number) => {
    try {
      await AsyncStorage.setItem(`currentWeek_${block.block_name}`, week.toString());
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
    
    const bookmarkKey = `bookmark_${block.block_name}`;
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
      const key = `completed_${block.block_name}_week${currentWeek}`;
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
      const stats = await AsyncStorage.getItem(`completionStats_${block.block_name}_week${currentWeek}`);
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
    const isCompleted = isWorkoutCompleted(day.day_name);
    const stats = getCompletionStats(day.day_name);
    
    if (isCompleted && stats) {
      // Navigate to review screen for completed workouts
      navigation.navigate('WorkoutReview' as any, {
        day,
        blockName: block.block_name,
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
        blockName: block.block_name,
        currentWeek: currentWeek  // Pass the current week
      });
    }
  };

  const handleBack = () => {
    navigation.goBack();
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
          <Text style={styles.title} numberOfLines={1}>{block.block_name}</Text>
          <Text style={styles.subtitle}>
            {block.weeks.includes('-') ? 'Weeks' : 'Week'} {block.weeks}
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={block.days}
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
                  <Text style={styles.weekNumber}>{currentWeek}</Text>
                  <Text style={styles.weekTotal}>/ {totalWeeks}</Text>
                </View>
                <View style={styles.weekProgress}>
                  <View 
                    style={[
                      styles.weekProgressFill, 
                      { width: `${(currentWeek / totalWeeks) * 100}%` }
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
            isCompleted={isWorkoutCompleted(item.day_name)}
            currentWeek={currentWeek}
            completionStats={getCompletionStats(item.day_name)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 10,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 26,
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
    backgroundColor: '#22d3ee20',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22d3ee',
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
    color: '#22d3ee',
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
    backgroundColor: '#22d3ee',
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
    color: '#22d3ee',
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
});