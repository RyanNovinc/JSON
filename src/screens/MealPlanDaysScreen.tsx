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
  recommended_time?: string; // e.g., "7:45 AM", "12:30 PM"
  timing_reason?: string; // e.g., "Within your optimal morning window"
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
              <View style={styles.macroItem}>
                <View style={[styles.macroDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.macroText}>{Math.round(totalCalories)} cal</Text>
              </View>
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

  const { week, mealPlanName, mealPrepSession, allMealPrepSessions, groceryList } = route.params;
  
  // Helper function to group days by their prep session
  const groupDaysByPrepSession = () => {
    // For legacy format (single session) or when no allMealPrepSessions, show all days ungrouped
    if (!allMealPrepSessions || allMealPrepSessions.length === 0) {
      const allDays = (week.days || []).map((day, dayIndex) => ({ day, dayIndex }));
      return [{ session: null, days: allDays }];
    }

    console.log('🔍 Grouping days by prep session');
    console.log('allMealPrepSessions:', allMealPrepSessions);
    console.log('week.days:', week.days);

    const groups = [];
    const usedDayIndices = new Set();
    
    allMealPrepSessions.forEach(session => {
      console.log(`🔧 Processing session:`, session.session_name, 'covers_days:', session.covers_days);
      
      const sessionDays = [];
      const sessionDayNames = session.covers_days || [];
      
      week.days?.forEach((day, dayIndex) => {
        const dayName = day.day_name.split(' ')[0]; // Extract day name (e.g., "Monday" from "Monday 16 Feb")
        console.log(`🔧 Checking day ${dayName} against session days:`, sessionDayNames);
        
        if (sessionDayNames.some(sessionDay => sessionDay.toLowerCase().includes(dayName.toLowerCase()))) {
          sessionDays.push({ day, dayIndex });
          usedDayIndices.add(dayIndex);
          console.log(`✅ Day ${dayName} matched session ${session.session_name}`);
        }
      });
      
      if (sessionDays.length > 0) {
        groups.push({
          session,
          days: sessionDays
        });
      }
    });
    
    // Add any unmatched days to a general group
    const unmatchedDays = [];
    week.days?.forEach((day, dayIndex) => {
      if (!usedDayIndices.has(dayIndex)) {
        unmatchedDays.push({ day, dayIndex });
      }
    });
    
    if (unmatchedDays.length > 0) {
      groups.push({
        session: null,
        days: unmatchedDays
      });
    }
    
    console.log('🔧 Final groups:', groups);
    return groups;
  };

  const dayGroups = groupDaysByPrepSession();
  
  // State for tracking meal prep completion
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  
  // Debug: Log the meal prep session and calorie data
  console.log('🔍 MealPlanDaysScreen received data:');
  console.log('Week data:', week);
  console.log('Week days count:', week?.days?.length);
  console.log('First day calories:', week?.days?.[0]?.daily_totals?.calories);
  console.log('First meal calories:', week?.days?.[0]?.meals?.[0]?.calories);
  console.log('DEBUG: mealPrepSession:', mealPrepSession);
  console.log('DEBUG: allMealPrepSessions:', allMealPrepSessions);
  console.log('DEBUG: allMealPrepSessions length:', allMealPrepSessions?.length);
  console.log('DEBUG: dayGroups:', dayGroups);
  console.log('DEBUG: dayGroups length:', dayGroups?.length);
  
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
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Grocery List Section */}
          {groceryList && (
            <View style={styles.grocerySection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Shopping List</Text>
              </View>
              <TouchableOpacity 
                style={[styles.groceryCardFriendly, { backgroundColor: `${themeColor}15` }]}
                onPress={() => navigation.navigate('GroceryList', { groceryList })}
                activeOpacity={0.8}
              >
                <View style={styles.groceryFriendlyContent}>
                  <Text style={styles.groceryFriendlyMain}>
                    ${groceryList.total_estimated_cost} grocery trip
                  </Text>
                  <Text style={styles.groceryFriendlySubtext}>
                    Tap to see your shopping list
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={themeColor} />
              </TouchableOpacity>
            </View>
          )}

          {/* Prep Sessions Section */}
          {(allMealPrepSessions && allMealPrepSessions.length > 0) ? (
            <View style={styles.prepSessionsSection}>
              <Text style={styles.sectionTitle}>Meal Prep</Text>
              <Text style={styles.sectionSubtitle}>Your cooking schedule made simple</Text>
              
              {allMealPrepSessions.map((session, index) => (
                <TouchableOpacity 
                  key={session.session_number || index}
                  style={[styles.prepCardFriendly, { backgroundColor: `${themeColor}10` }]}
                  onPress={() => {
                    navigation.navigate('MealPrepSession', {
                      mealPrepSession: session,
                      sessionIndex: index,
                      allSessions: allMealPrepSessions,
                    });
                  }}
                >
                  <View style={styles.prepFriendlyContent}>
                    <View style={styles.prepFriendlyHeader}>
                      <Text style={styles.prepFriendlyTitle}>
                        {allMealPrepSessions.length > 1 ? `Prep ${index + 1}` : 'Meal Prep'}
                      </Text>
                      <Text style={styles.prepFriendlyTime}>
                        {session.total_time} min
                      </Text>
                    </View>
                    <Text style={styles.prepFriendlyWhen}>
                      {session.prep_day}
                    </Text>
                    <Text style={styles.prepFriendlyDays}>
                      For {session.covers_days?.slice(0, 2).join(' & ')} 
                      {session.covers_days?.length > 2 ? ` +${session.covers_days.length - 2} more days` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={themeColor} />
                </TouchableOpacity>
              ))}
            </View>
          ) : mealPrepSession ? (
            <View style={styles.prepSessionsSection}>
              <TouchableOpacity 
                style={[styles.mealPrepCard, { backgroundColor: `${themeColor}10`, marginBottom: 24 }]}
                onPress={() => {
                  navigation.navigate('MealPrepSession', {
                    mealPrepSession: mealPrepSession
                  });
                }}
              >
                <View style={styles.mealPrepContent}>
                  <View style={[styles.mealPrepIcon, { backgroundColor: themeColor }]}>
                    <Ionicons name="restaurant" size={20} color="#ffffff" />
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
          ) : null}

          {/* Days Grouped by Prep Session */}
          {dayGroups.map((group, groupIndex) => (
            <View key={groupIndex} style={styles.dayGroup}>
              {/* Only show group header if there are multiple sessions */}
              {group.session && allMealPrepSessions && allMealPrepSessions.length > 1 && (
                <View style={styles.dayGroupHeader}>
                  <View style={styles.dayGroupLine} />
                  <Text style={styles.dayGroupTitle}>
                    From Prep {allMealPrepSessions?.findIndex(s => s.session_number === group.session.session_number) + 1} ({group.session.prep_day})
                  </Text>
                  <View style={styles.dayGroupLine} />
                </View>
              )}
              
              {group.days.map(({ day, dayIndex }) => (
                <DayCard
                  key={`${week.week_number}-${dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day)}`}
                  day={day}
                  onPress={() => handleDayPress(day, dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day))}
                  themeColor={themeColor}
                  isCompleted={false}
                  dayDate={getDayDate(dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day))}
                  dayName={getDayName(dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day))}
                  isToday={isToday(dayIndex !== undefined ? dayIndex : group.days.findIndex(d => d.day === day))}
                  mealPlanning={mealPlanning}
                />
              ))}
            </View>
          ))}
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  grocerySection: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    marginBottom: 16,
  },
  groceryCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  groceryCardFriendly: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.3)',
  },
  groceryFriendlyContent: {
    flex: 1,
  },
  groceryFriendlyMain: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  groceryFriendlySubtext: {
    fontSize: 15,
    color: '#71717a',
    fontWeight: '500',
  },
  groceryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  groceryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(113, 113, 122, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  groceryInfo: {
    flex: 1,
  },
  groceryTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  grocerySubtext: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  groceryProgress: {
    alignItems: 'flex-end',
  },
  groceryProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
  },
  groceryCategoryPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  groceryCategoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
  },
  groceryItemsCount: {
    fontSize: 13,
    color: '#71717a',
  },
  prepSessionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.8,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 20,
    fontWeight: '500',
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  dayGroupLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3f3f46',
  },
  dayGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a1a1aa',
    marginHorizontal: 16,
  },
  mealPrepCoverage: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
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
    borderRadius: 20,
    padding: 24,
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.3)',
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
  prepCardFriendly: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  prepFriendlyContent: {
    flex: 1,
  },
  prepFriendlyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  prepFriendlyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  prepFriendlyTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  prepFriendlyWhen: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
    marginTop: 4,
  },
  prepFriendlyDays: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
    lineHeight: 20,
  },
});

export { DayCard };