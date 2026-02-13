import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';

type MealPlanDaysScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPlanDays'>;
type MealPlanDaysScreenRouteProp = RouteProp<RootStackParamList, 'MealPlanDays'>;

interface Meal {
  meal_name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prep_time?: number;
  cook_time?: number;
  total_time?: number;
  servings?: number;
  calories?: number;
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
  };
  ingredients: Array<{
    item: string;
    amount: string;
    unit: string;
    notes?: string;
  }>;
  instructions: string[];
  notes?: string;
  tags?: string[];
}

interface Day {
  day_name: string;
  day_number: number;
  meals: Meal[];
}

interface DayCardProps {
  day: Day;
  onPress: () => void;
  themeColor: string;
  isCompleted?: boolean;
  dayDate?: string;
  dayName?: string;
  isToday?: boolean;
  mealPlanning: any; // Add meal planning context
}

function DayCard({ day, onPress, themeColor, isCompleted, dayDate, dayName, isToday, mealPlanning }: DayCardProps) {
  const mealCount = day.meals.length;

  // Generate meal IDs and check completion status (must match MealPlanDayScreen)
  const generateMealId = (meal: Meal, index: number) => {
    // Use a combination of meal name, type, and index for uniqueness
    const cleanName = meal.meal_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${cleanName}_${meal.meal_type}_${index}`;
  };

  // Use a simple date format for now - this should match the format used in MealPlanDayScreen
  const dayDateString = new Date().toISOString().split('T')[0];
  
  const completedMealsCount = day.meals.filter((meal, index) => {
    const mealId = generateMealId(meal, index);
    return mealPlanning.isMealCompleted(mealId, dayDateString);
  }).length;
  
  const progressPercentage = mealCount > 0 ? (completedMealsCount / mealCount) * 100 : 0;
  
  // Use daily totals from scaled data, fallback to calculation if not available
  const totalCalories = day.daily_totals?.calories || day.meals.reduce((total, meal) => {
    return total + (meal.calories || 0);
  }, 0);

  // Use daily totals from scaled data, fallback to calculation if not available
  const totalMacros = day.daily_totals ? {
    protein: day.daily_totals.protein,
    carbs: day.daily_totals.carbs,
    fat: day.daily_totals.fat,
    fiber: day.daily_totals.fiber || 0,
  } : day.meals.reduce((totals, meal) => {
    if (meal.macros) {
      return {
        protein: totals.protein + meal.macros.protein,
        carbs: totals.carbs + meal.macros.carbs,
        fat: totals.fat + meal.macros.fat,
        fiber: totals.fiber + (meal.macros.fiber || 0),
      };
    }
    return totals;
  }, { protein: 0, carbs: 0, fat: 0, fiber: 0 });

  // Calculate total prep time
  const totalPrepTime = day.meals.reduce((total, meal) => {
    return total + (meal.total_time || meal.prep_time || 0);
  }, 0);

  // Get meal type distribution
  const mealTypes = day.meals.map(meal => meal.meal_type);
  const hasBreakfast = mealTypes.includes('breakfast');
  const hasLunch = mealTypes.includes('lunch');
  const hasDinner = mealTypes.includes('dinner');
  const snackCount = mealTypes.filter(type => type === 'snack').length;

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          borderLeftColor: isToday ? themeColor : '#3f3f46',
          backgroundColor: '#18181b' 
        }
      ]} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.dayName}>
            {dayName || day.day_name}
            {dayDate && <Text style={styles.dayDate}> • {dayDate}</Text>}
          </Text>
          {isToday && (
            <View style={[
              styles.mealBadge, 
              { backgroundColor: themeColor + '20' }
            ]}>
              <Text style={[
                styles.mealText, 
                { color: themeColor }
              ]}>
                TODAY
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color={isToday ? themeColor : "#6b7280"} 
          />
        </View>
      </View>
      
      <View style={styles.cardBody}>
        {/* Meal Types Row */}
        <View style={styles.mealTypesRow}>
          {hasBreakfast && (
            <View style={styles.mealTypeChip}>
              <Ionicons name="sunny" size={12} color="#f59e0b" />
              <Text style={styles.mealTypeText}>Breakfast</Text>
            </View>
          )}
          {hasLunch && (
            <View style={styles.mealTypeChip}>
              <Ionicons name="partly-sunny" size={12} color="#06b6d4" />
              <Text style={styles.mealTypeText}>Lunch</Text>
            </View>
          )}
          {hasDinner && (
            <View style={styles.mealTypeChip}>
              <Ionicons name="moon" size={12} color="#8b5cf6" />
              <Text style={styles.mealTypeText}>Dinner</Text>
            </View>
          )}
          {snackCount > 0 && (
            <View style={styles.mealTypeChip}>
              <Ionicons name="nutrition" size={12} color="#10b981" />
              <Text style={styles.mealTypeText}>{snackCount} snack{snackCount > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flash-outline" size={16} color="#71717a" />
            <Text style={styles.statText}>{totalCalories} cal</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#71717a" />
            <Text style={styles.statText}>{totalPrepTime}min prep</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="fitness-outline" size={16} color="#71717a" />
            <Text style={styles.statText}>{Math.round(totalMacros.protein)}g protein</Text>
          </View>
        </View>

        {/* Progress Tracking */}
        {mealCount > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Meal Progress</Text>
              <Text style={styles.progressText}>
                {completedMealsCount}/{mealCount} completed
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
            </View>
          </View>
        )}

        {/* Macros Preview */}
        {totalCalories > 0 && (
          <View style={styles.macrosPreview}>
            <Text style={styles.macrosTitle}>Daily Macros</Text>
            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.macroText}>P: {Math.round(totalMacros.protein)}g</Text>
              </View>
              <View style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.macroText}>C: {Math.round(totalMacros.carbs)}g</Text>
              </View>
              <View style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.macroText}>F: {Math.round(totalMacros.fat)}g</Text>
              </View>
              {totalMacros.fiber > 0 && (
                <View style={styles.macroItem}>
                  <View style={[styles.macroDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.macroText}>Fiber: {Math.round(totalMacros.fiber)}g</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MealPlanDaysScreen() {
  const navigation = useNavigation<MealPlanDaysScreenNavigationProp>();
  const route = useRoute<MealPlanDaysScreenRouteProp>();
  const { themeColor } = useTheme();
  const mealPlanning = useMealPlanning();

  const { week, mealPlanName, mealPrepSession } = route.params;
  
  // State for tracking meal prep completion
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  
  // Debug: Log the meal prep session and calorie data
  console.log('🔍 MealPlanDaysScreen received data:');
  console.log('Week data:', week);
  console.log('First day calories:', week?.days?.[0]?.daily_totals?.calories);
  console.log('First meal calories:', week?.days?.[0]?.meals?.[0]?.calories);
  console.log('DEBUG: mealPrepSession:', mealPrepSession);
  console.log('DEBUG: week.meal_prep_session:', week?.meal_prep_session);
  
  // Load completed meals when component mounts
  useEffect(() => {
    if (mealPrepSession?.prep_meals) {
      // TODO: Load from AsyncStorage
      const loadCompletedMeals = async () => {
        try {
          // const stored = await AsyncStorage.getItem(`prep_meals_${mealPrepSession.session_name}`);
          // if (stored) {
          //   setCompletedTasks(new Set(JSON.parse(stored)));
          // }
        } catch (error) {
          console.error('Failed to load completed meals:', error);
        }
      };
      loadCompletedMeals();
    }
  }, [mealPrepSession]);
  
  // Days are already properly redistributed by MealPlanWeeksScreen
  const days: Day[] = week.days || [];

  // Calculate the meal plan start date - starts from today (same as MealPlanWeeksScreen)
  const getMealPlanStartDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getDayDate = (dayIndex: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the date for this specific day
    const dayDate = new Date(today);
    
    if (week.week_number === 1) {
      // Week 1: Start from today
      dayDate.setDate(today.getDate() + dayIndex);
    } else {
      // Week 2+: Calculate based on week start offset
      const currentDayOfWeek = today.getDay();
      const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
      
      // Calculate start date of this week
      let weekStartOffset = week1Days; // Days after today that Week 2 starts
      for (let i = 2; i < week.week_number; i++) {
        weekStartOffset += 7; // Add 7 days for each full week
      }
      
      dayDate.setDate(today.getDate() + weekStartOffset + dayIndex);
    }
    
    const month = dayDate.toLocaleDateString('en-US', { month: 'short' });
    const day = dayDate.getDate();
    
    return `${month} ${day}`;
  };

  const getDayName = (dayIndex: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the actual day name based on the date
    const dayDate = new Date(today);
    
    if (week.week_number === 1) {
      // Week 1: Start from today
      dayDate.setDate(today.getDate() + dayIndex);
    } else {
      // Week 2+: Calculate based on week start offset
      const currentDayOfWeek = today.getDay();
      const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
      
      // Calculate start date of this week
      let weekStartOffset = week1Days; // Days after today that Week 2 starts
      for (let i = 2; i < week.week_number; i++) {
        weekStartOffset += 7; // Add 7 days for each full week
      }
      
      dayDate.setDate(today.getDate() + weekStartOffset + dayIndex);
    }
    
    return dayDate.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const isToday = (dayIndex: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the date for this day using the same logic as getDayDate
    const dayDate = new Date(today);
    
    if (week.week_number === 1) {
      // Week 1: Start from today
      dayDate.setDate(today.getDate() + dayIndex);
    } else {
      // Week 2+: Calculate based on week start offset
      const currentDayOfWeek = today.getDay();
      const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
      
      // Calculate start date of this week
      let weekStartOffset = week1Days; // Days after today that Week 2 starts
      for (let i = 2; i < week.week_number; i++) {
        weekStartOffset += 7; // Add 7 days for each full week
      }
      
      dayDate.setDate(today.getDate() + weekStartOffset + dayIndex);
    }
    
    // Compare just the date parts (ignore time)
    return today.toDateString() === dayDate.toDateString();
  };

  const handleDayPress = (day: Day, index: number) => {
    navigation.navigate('MealPlanDay', {
      day,
      weekNumber: week.week_number,
      mealPlanName,
      dayIndex: index,
      calculatedDayName: getDayName(index),
    });
  };

  const renderDay = ({ item: day, index }: { item: Day; index: number }) => {
    return (
      <DayCard
        day={day}
        onPress={() => handleDayPress(day, index)}
        themeColor={themeColor}
        isCompleted={false} // TODO: Track completion status
        dayDate={getDayDate(index)}
        dayName={getDayName(index)}
        isToday={isToday(index)}
        mealPlanning={mealPlanning}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{mealPlanName}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {days.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Days Found</Text>
          <Text style={styles.emptyDescription}>
            This week doesn't have any days configured.
          </Text>
        </View>
      ) : (
        <FlatList
          data={days}
          renderItem={renderDay}
          keyExtractor={(day, index) => `${week.week_number}-${index}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            mealPrepSession ? (
              <View style={styles.mealPrepContainer}>
                <TouchableOpacity 
                  style={[styles.mealPrepCard, { backgroundColor: `${themeColor}10` }]}
                  onPress={() => {
                    navigation.navigate('MealPrepSession', {
                      mealPrepSession: mealPrepSession
                    });
                  }}
                >
                  <View style={styles.mealPrepContent}>
                    <View style={[styles.mealPrepIcon, { backgroundColor: themeColor }]}>
                      <Ionicons name="list" size={20} color="#ffffff" />
                    </View>
                    <View style={styles.mealPrepText}>
                      <Text style={styles.mealPrepTitle}>Weekly Meal Prep</Text>
                      <Text style={styles.mealPrepSubtitle}>
                        {mealPrepSession.total_time} min • {mealPrepSession.prep_meals?.length || 0} recipes
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={themeColor} />
                  </View>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1f',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 44,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 2,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  cardTitle: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: '400',
    color: '#71717a',
  },
  mealBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22c55e',
    letterSpacing: 0.5,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mealTypesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  mealTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(113, 113, 122, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  mealTypeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#d4d4d8',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: '#71717a',
    marginLeft: 4,
  },
  macrosPreview: {
    backgroundColor: 'rgba(39, 39, 42, 0.5)',
    borderRadius: 8,
    padding: 12,
  },
  macrosTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 8,
  },
  macrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d4d4d8',
  },
  progressSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(39, 39, 42, 0.5)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  progressText: {
    fontSize: 11,
    color: '#71717a',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(39, 39, 42, 0.8)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
  },
  mealPrepContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mealPrepCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mealPrepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealPrepTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealPrepName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  
  // Simple Meal Prep Card
  mealPrepContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mealPrepCard: {
    borderRadius: 16,
    padding: 20,
  },
  mealPrepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealPrepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  mealPrepText: {
    flex: 1,
  },
  mealPrepTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  mealPrepSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
  },
});

export { DayCard };