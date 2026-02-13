import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';

type MealPlanWeeksScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPlanWeeks'>;
type MealPlanWeeksScreenRouteProp = RouteProp<RootStackParamList, 'MealPlanWeeks'>;

interface MealPrepSession {
  session_name: string;
  prep_time: number;
  cook_time: number;
  total_time: number;
  covers: string;
  recommended_timing: string;
  ingredients: Array<{
    item: string;
    amount: string;
    unit: string;
    scalable: boolean;
    notes: string;
  }>;
  equipment_needed: string[];
  instructions: string[];
  storage_guidelines: {
    proteins: string;
    grains: string;
    vegetables: string;
  };
}

interface Week {
  week_number: number;
  meal_prep_session?: MealPrepSession;
  days: any[];
}

interface WeekCardProps {
  week: Week;
  onPress: () => void;
  themeColor: string;
  isActive?: boolean;
  mealPlanName: string;
  dateRange?: string;
}

function WeekCard({ week, onPress, isActive, mealPlanName, themeColor, dateRange }: WeekCardProps) {
  const dayCount = week.days.length;
  
  // Count unique meals for stats
  const meals = new Set<string>();
  const totalMeals = week.days.reduce((total, day) => {
    day.meals?.forEach((meal: any) => {
      meals.add(meal.meal_name);
    });
    return total + (day.meals?.length || 0);
  }, 0);

  // Check if week has meal prep session
  const hasMealPrep = !!week.meal_prep_session;
  
  // Use theme color for active week, gray for others
  const weekColor = isActive ? themeColor : '#6b7280';
  
  return (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: weekColor }]} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.weekName}>
            Week {week.week_number}
            {dateRange && (
              <Text style={styles.weekDateRange}> • {dateRange}</Text>
            )}
          </Text>
          {isActive && (
            <View style={[styles.weekBadge, { backgroundColor: weekColor + '20' }]}>
              <Text style={[styles.weekText, { color: weekColor }]}>
                CURRENT
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="chevron-forward" size={24} color={isActive ? themeColor : "#6b7280"} />
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="restaurant-outline" size={16} color="#71717a" />
              <Text style={styles.statText}>{totalMeals} meals planned</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="nutrition-outline" size={16} color="#71717a" />
              <Text style={styles.statText}>{Array.from(meals).length} unique recipes</Text>
            </View>
          </View>
          {hasMealPrep && (
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Ionicons name="list-outline" size={16} color={weekColor} />
                <Text style={[styles.statText, { color: weekColor }]}>
                  {week.meal_prep_session?.total_time}min meal prep session
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// No scaling - meal plans are used exactly as designed

export default function MealPlanWeeksScreen() {
  const navigation = useNavigation<MealPlanWeeksScreenNavigationProp>();
  const route = useRoute<MealPlanWeeksScreenRouteProp>();
  const { themeColor } = useTheme();

  const { mealPlan } = route.params;
  
  console.log('🍽️ MealPlanWeeksScreen: Using meal plan exactly as designed (no scaling)');
  
  // Use meal plan exactly as designed - no scaling
  const originalWeeks: Week[] = mealPlan.data?.weeks || [];
  
  // Redistribute days across calendar weeks for proper Sunday boundaries
  const getCalendarAlignedWeeks = (): Week[] => {
    // Flatten all days from all weeks
    const allDays = originalWeeks.flatMap(week => week.days);
    const totalDays = allDays.length;
    
    if (totalDays === 0) return [];
    
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days for each calendar week
    const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek; // Days from today until Sunday
    let remainingDays = totalDays - week1Days;
    
    const calendarWeeks: Week[] = [];
    
    // Week 1: From today until Sunday - preserve meal prep session from original Week 1
    const week1 = {
      week_number: 1,
      days: allDays.slice(0, week1Days),
      meal_prep_session: originalWeeks[0]?.meal_prep_session
    };
    calendarWeeks.push(week1);
    
    // Additional weeks: Full Monday-Sunday weeks, plus partial final week if needed
    let weekNumber = 2;
    let dayIndex = week1Days;
    
    while (remainingDays > 0) {
      const daysThisWeek = Math.min(7, remainingDays);
      const originalWeekIndex = weekNumber - 1; // Map to original week index
      
      calendarWeeks.push({
        week_number: weekNumber,
        days: allDays.slice(dayIndex, dayIndex + daysThisWeek),
        meal_prep_session: originalWeeks[originalWeekIndex]?.meal_prep_session
      });
      
      dayIndex += daysThisWeek;
      remainingDays -= daysThisWeek;
      weekNumber++;
    }
    
    return calendarWeeks;
  };
  
  const weeks: Week[] = getCalendarAlignedWeeks();

  // Calculate the meal plan start date - starts from today
  const getMealPlanStartDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };
  
  const mealPlanStartDate = getMealPlanStartDate();

  // Function to calculate week date ranges
  const getWeekDateRange = (weekNumber: number, week: Week) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (weekNumber === 1) {
      // Week 1: From today for the number of days in this week
      const weekStartDate = new Date(today);
      const weekEndDate = new Date(today);
      weekEndDate.setDate(today.getDate() + week.days.length - 1);
      
      const startMonth = weekStartDate.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = weekEndDate.toLocaleDateString('en-US', { month: 'short' });
      const startDay = weekStartDate.getDate();
      const endDay = weekEndDate.getDate();
      
      if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}`;
      } else {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
      }
    } else {
      // Week 2+: Calculate based on position and actual days in the week
      const currentDayOfWeek = today.getDay();
      const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
      
      // Calculate start date of this week
      let weekStartOffset = week1Days; // Days after today that Week 2 starts
      for (let i = 2; i < weekNumber; i++) {
        weekStartOffset += 7; // Add 7 days for each full week
      }
      
      const weekStartDate = new Date(today);
      weekStartDate.setDate(today.getDate() + weekStartOffset);
      
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + week.days.length - 1);
      
      const startMonth = weekStartDate.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = weekEndDate.toLocaleDateString('en-US', { month: 'short' });
      const startDay = weekStartDate.getDate();
      const endDay = weekEndDate.getDate();
      
      if (startMonth === endMonth) {
        return `${startMonth} ${startDay}-${endDay}`;
      } else {
        return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
      }
    }
  };

  // Function to check if a week contains today's date
  const isCurrentWeek = (weekNumber: number, week: Week) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Week 1 always starts from today, so it's always current
    if (weekNumber === 1) {
      return true;
    }
    
    // For other weeks, check if today falls within their date range
    const currentDayOfWeek = today.getDay();
    const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
    
    // Calculate start date of this week
    let weekStartOffset = week1Days; // Days after today that Week 2 starts
    for (let i = 2; i < weekNumber; i++) {
      weekStartOffset += 7; // Add 7 days for each full week
    }
    
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() + weekStartOffset);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + week.days.length - 1);
    
    return today >= weekStartDate && today <= weekEndDate;
  };

  const handleWeekPress = (week: Week) => {
    navigation.navigate('MealPlanDays', {
      week,
      mealPlanName: mealPlan.name,
      mealPrepSession: week.meal_prep_session,
    });
  };


  const renderWeek = ({ item: week, index }: { item: Week; index: number }) => {
    const dateRange = getWeekDateRange(week.week_number, week);
    const isActive = isCurrentWeek(week.week_number, week);
    
    return (
      <WeekCard
        week={week}
        onPress={() => handleWeekPress(week)}
        themeColor={themeColor}
        isActive={isActive}
        mealPlanName={mealPlan.name}
        dateRange={dateRange}
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
          <Text style={styles.title}>{mealPlan.name}</Text>
          <Text style={styles.subtitle}>{weeks.length} week meal plan</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {weeks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Weeks Found</Text>
          <Text style={styles.emptyDescription}>
            This meal plan doesn't have any weeks configured.
          </Text>
        </View>
      ) : (
        <FlatList
          data={weeks}
          renderItem={renderWeek}
          keyExtractor={(week) => week.week_number.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
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
  weekName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  weekDateRange: {
    fontSize: 14,
    fontWeight: '400',
    color: '#71717a',
  },
  weekBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  weekText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statsContainer: {
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  weekBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  weekBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 15,
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#3f3f46',
    minHeight: 50,
  },
  modalButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 50,
  },
  modalButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  modalButtonTextPrimary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});