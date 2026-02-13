import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import { Meal, MealType, MealPlanDay } from '../types/nutrition';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MealCalendarScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const { currentMealPlan, userProfile } = useMealPlanning();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  
  // Get the meal plan day for selected date
  const selectedDayMeals = selectedDate 
    ? currentMealPlan?.days.find(day => day.date === selectedDate)
    : null;

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days: Date[] = [];
    
    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(new Date(year, month, -firstDayOfWeek + i + 1));
    }
    
    // Add all days in the current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    // Add empty cells for days after the last day of the month
    const remainingCells = 42 - days.length; // 6 rows × 7 days = 42 cells
    for (let i = 1; i <= remainingCells; i++) {
      days.push(new Date(year, month + 1, i));
    }
    
    return days;
  };

  const getDayMeals = (dateStr: string): Meal[] => {
    return currentMealPlan?.days.find(day => day.date === dateStr)?.meals || [];
  };

  const getMealIcon = (mealType: MealType): keyof typeof Ionicons.glyphMap => {
    switch (mealType) {
      case 'breakfast': return 'sunny';
      case 'lunch': return 'restaurant';
      case 'dinner': return 'moon';
      case 'snack': return 'nutrition';
      default: return 'restaurant';
    }
  };

  const isDateInPlan = (dateStr: string): boolean => {
    if (!currentMealPlan) return false;
    const planStart = new Date(currentMealPlan.startDate);
    const planEnd = new Date(currentMealPlan.endDate);
    const checkDate = new Date(dateStr);
    return checkDate >= planStart && checkDate <= planEnd;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const selectDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Only allow selection of dates within the meal plan
    if (isDateInPlan(dateStr)) {
      setSelectedDate(dateStr);
      setShowDayModal(true);
    }
  };

  const CalendarDay = ({ date }: { date: Date }) => {
    const dateStr = date.toISOString().split('T')[0];
    const isToday = dateStr === today;
    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
    const isInPlan = isDateInPlan(dateStr);
    const meals = getDayMeals(dateStr);
    
    return (
      <TouchableOpacity
        style={[
          styles.dayCell,
          isToday && styles.todayCell,
          isInPlan && { borderColor: themeColorLight },
          !isCurrentMonth && styles.otherMonthCell,
        ]}
        onPress={() => selectDate(date)}
        disabled={!isInPlan}
        activeOpacity={isInPlan ? 0.7 : 1}
      >
        <Text style={[
          styles.dayNumber,
          isToday && { color: themeColor },
          !isCurrentMonth && styles.otherMonthText,
          !isInPlan && styles.disabledDayText,
        ]}>
          {date.getDate()}
        </Text>
        
        {isInPlan && meals.length > 0 && (
          <View style={styles.mealIndicators}>
            {meals.slice(0, 3).map((meal, index) => (
              <Ionicons
                key={index}
                name={getMealIcon(meal.type)}
                size={8}
                color={themeColor}
              />
            ))}
            {meals.length > 3 && (
              <Text style={[styles.moreIndicator, { color: themeColor }]}>
                +{meals.length - 3}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const MealSummary = ({ meal }: { meal: Meal }) => (
    <TouchableOpacity
      style={styles.mealSummary}
      onPress={() => {
        setShowDayModal(false);
        navigation.navigate('MealDetail' as any, { meal });
      }}
      activeOpacity={0.8}
    >
      <View style={styles.mealSummaryLeft}>
        <Ionicons
          name={getMealIcon(meal.type)}
          size={16}
          color={themeColor}
        />
        <Text style={styles.mealSummaryTime}>{meal.time}</Text>
        <Text style={styles.mealSummaryName}>{meal.name}</Text>
      </View>
      <Text style={styles.mealSummaryCalories}>
        {meal.nutritionInfo.calories} cal
      </Text>
    </TouchableOpacity>
  );

  if (!currentMealPlan) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meal Calendar</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Meal Plan</Text>
          <Text style={styles.emptyDescription}>
            Generate a meal plan to see your meals in calendar view.
          </Text>
        </View>
      </View>
    );
  }

  const days = getDaysInMonth(currentDate);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Calendar</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Month Navigation */}
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.monthButton}>
            <Ionicons name="chevron-back" size={24} color={themeColor} />
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          
          <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.monthButton}>
            <Ionicons name="chevron-forward" size={24} color={themeColor} />
          </TouchableOpacity>
        </View>

        {/* Plan Info */}
        <View style={styles.planInfo}>
          <Text style={styles.planInfoText}>
            Plan: {new Date(currentMealPlan.startDate).toLocaleDateString()} - {' '}
            {new Date(currentMealPlan.endDate).toLocaleDateString()}
          </Text>
          <Text style={styles.planInfoSubtext}>
            Tap on a highlighted day to see meals
          </Text>
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendar}>
          {/* Weekday Headers */}
          <View style={styles.weekdayHeader}>
            {WEEKDAYS.map(day => (
              <Text key={day} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Days */}
          <View style={styles.daysGrid}>
            {days.map((date, index) => (
              <CalendarDay key={index} date={date} />
            ))}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <Ionicons name="sunny" size={16} color={themeColor} />
              <Text style={styles.legendText}>Breakfast</Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="restaurant" size={16} color={themeColor} />
              <Text style={styles.legendText}>Lunch</Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="moon" size={16} color={themeColor} />
              <Text style={styles.legendText}>Dinner</Text>
            </View>
            <View style={styles.legendItem}>
              <Ionicons name="nutrition" size={16} color={themeColor} />
              <Text style={styles.legendText}>Snack</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal
        visible={showDayModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDayModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {selectedDayMeals && (
                <>
                  {/* Daily Macros Summary */}
                  <View style={styles.dailySummary}>
                    <Text style={styles.dailySummaryTitle}>Daily Totals</Text>
                    <View style={styles.macroRow}>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: themeColor }]}>
                          {Math.round(selectedDayMeals.totalCalories)}
                        </Text>
                        <Text style={styles.macroLabel}>Calories</Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: themeColor }]}>
                          {Math.round(selectedDayMeals.totalMacros.protein)}g
                        </Text>
                        <Text style={styles.macroLabel}>Protein</Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: themeColor }]}>
                          {Math.round(selectedDayMeals.totalMacros.carbs)}g
                        </Text>
                        <Text style={styles.macroLabel}>Carbs</Text>
                      </View>
                      <View style={styles.macroItem}>
                        <Text style={[styles.macroValue, { color: themeColor }]}>
                          {Math.round(selectedDayMeals.totalMacros.fat)}g
                        </Text>
                        <Text style={styles.macroLabel}>Fat</Text>
                      </View>
                    </View>
                  </View>

                  {/* Meals List */}
                  <View style={styles.mealsList}>
                    <Text style={styles.mealsListTitle}>Meals</Text>
                    {selectedDayMeals.meals.map((meal) => (
                      <MealSummary key={meal.id} meal={meal} />
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingTop: 50,
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
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  planInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  planInfoText: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 4,
  },
  planInfoSubtext: {
    fontSize: 12,
    color: '#52525b',
  },
  calendar: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingBottom: 16,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
    marginBottom: 4,
  },
  todayCell: {
    backgroundColor: '#18181b',
    borderColor: '#22d3ee',
  },
  otherMonthCell: {
    opacity: 0.3,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  otherMonthText: {
    color: '#52525b',
  },
  disabledDayText: {
    color: '#3f3f46',
  },
  mealIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreIndicator: {
    fontSize: 8,
    fontWeight: '600',
    color: '#22d3ee',
  },
  legend: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#71717a',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
  },
  dailySummary: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  dailySummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22d3ee',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#71717a',
  },
  mealsList: {
    padding: 20,
  },
  mealsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  mealSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  mealSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  mealSummaryTime: {
    fontSize: 12,
    color: '#71717a',
    minWidth: 40,
  },
  mealSummaryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  mealSummaryCalories: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
  },
});