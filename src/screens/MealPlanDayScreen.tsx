import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  
  SafeAreaView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';

type MealPlanDayScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPlanDay'>;
type MealPlanDayScreenRouteProp = RouteProp<RootStackParamList, 'MealPlanDay'>;

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

interface MealCardProps {
  meal: Meal;
  onPress: () => void;
  onLongPress: () => void;
  themeColor: string;
  mealIcon: string;
  mealColor: string;
  isCompleted: boolean;
}

function MealCard({ meal, onPress, onLongPress, themeColor, mealIcon, mealColor, isCompleted }: MealCardProps) {
  const totalTime = meal.total_time || (meal.prep_time || 0) + (meal.cook_time || 0);
  
  return (
    <TouchableOpacity 
      style={[
        styles.mealCard, 
        { borderLeftColor: mealColor },
        isCompleted && styles.mealCardCompleted
      ]}
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleRow}>
          <View style={[styles.mealIconContainer, { backgroundColor: mealColor + '20' }]}>
            <Ionicons name={mealIcon as any} size={20} color={mealColor} />
          </View>
          <View style={styles.mealTitleContainer}>
            <Text style={styles.mealName}>{meal.meal_name}</Text>
            <View style={styles.mealSubInfo}>
              <Text style={[styles.mealType, { color: mealColor }]}>
                {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
              </Text>
              {meal.recommended_time && (
                <Text style={styles.mealTime}> • {meal.recommended_time}</Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: '#22c55e' }]}>
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={themeColor} />
        </View>
      </View>

      {/* Calories and Macros in one clean row */}
      <View style={styles.nutritionRow}>
        {meal.calories && (
          <Text style={[styles.caloriesText, { color: mealColor }]}>{meal.calories} cal</Text>
        )}
        {meal.macros && (
          <View style={styles.macrosInline}>
            <Text style={styles.macroInlineText}>P: {Math.round(meal.macros.protein)}g</Text>
            <Text style={styles.macroInlineText}>C: {Math.round(meal.macros.carbs)}g</Text>
            <Text style={styles.macroInlineText}>F: {Math.round(meal.macros.fat)}g</Text>
          </View>
        )}
      </View>

    </TouchableOpacity>
  );
}

export default function MealPlanDayScreen() {
  const navigation = useNavigation<MealPlanDayScreenNavigationProp>();
  const route = useRoute<MealPlanDayScreenRouteProp>();
  const { themeColor } = useTheme();
  const { markMealCompleted, isMealCompleted, getDailyCompletionProgress } = useMealPlanning();

  const { day, weekNumber, mealPlanName, dayIndex, calculatedDayName } = route.params;
  const meals = day.meals || [];

  // Generate a date string for this day using the same logic as other screens
  const getDayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const getDayDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate the date for this specific day using the same logic as MealPlanDaysScreen
    const dayDate = new Date(today);
    
    if (weekNumber === 1) {
      // Week 1: Start from today
      dayDate.setDate(today.getDate() + dayIndex);
    } else {
      // Week 2+: Calculate based on week start offset
      const currentDayOfWeek = today.getDay();
      const week1Days = currentDayOfWeek === 0 ? 1 : 8 - currentDayOfWeek;
      
      // Calculate start date of this week
      let weekStartOffset = week1Days; // Days after today that Week 2 starts
      for (let i = 2; i < weekNumber; i++) {
        weekStartOffset += 7; // Add 7 days for each full week
      }
      
      dayDate.setDate(today.getDate() + weekStartOffset + dayIndex);
    }
    
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    };
    return dayDate.toLocaleDateString('en-US', options);
  };

  const dayDateString = getDayDateString();

  // Generate a unique ID for meals since the current interface doesn't have one
  const generateMealId = (meal: Meal, globalIndex: number) => {
    // Use a combination of meal name, type, and index for uniqueness
    const cleanName = meal.meal_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${cleanName}_${meal.meal_type}_${globalIndex}`;
  };

  // Handle long press to toggle completion
  const handleMealLongPress = async (meal: Meal, index: number) => {
    const mealId = generateMealId(meal, index);
    const isCurrentlyCompleted = isMealCompleted(mealId, dayDateString);
    
    console.log('Long press:', { 
      mealName: meal.meal_name, 
      mealId, 
      index, 
      dayDateString, 
      isCurrentlyCompleted,
      toggleTo: !isCurrentlyCompleted
    });
    
    try {
      await markMealCompleted(mealId, dayDateString, !isCurrentlyCompleted);
      console.log('Meal completion updated successfully');
    } catch (error) {
      console.error('Failed to toggle meal completion:', error);
    }
  };

  // Calculate daily totals
  const dailyTotals = meals.reduce((totals, meal) => {
    return {
      calories: totals.calories + (meal.calories || 0),
      protein: totals.protein + (meal.macros?.protein || 0),
      carbs: totals.carbs + (meal.macros?.carbs || 0),
      fat: totals.fat + (meal.macros?.fat || 0),
      fiber: totals.fiber + (meal.macros?.fiber || 0),
      prepTime: totals.prepTime + (meal.total_time || meal.prep_time || 0),
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, prepTime: 0 });

  // Calculate completion progress
  const completedMealsCount = meals.filter((meal, index) => {
    const mealId = generateMealId(meal, index);
    const isCompleted = isMealCompleted(mealId, dayDateString);
    console.log('Progress check:', { 
      mealName: meal.meal_name, 
      mealId, 
      index, 
      isCompleted 
    });
    return isCompleted;
  }).length;
  
  // Calculate nutrition from completed meals only
  const completedNutrition = meals.reduce((totals, meal, index) => {
    const mealId = generateMealId(meal, index);
    const isCompleted = isMealCompleted(mealId, dayDateString);
    
    if (isCompleted) {
      return {
        calories: totals.calories + (meal.calories || 0),
        protein: totals.protein + (meal.macros?.protein || 0),
        carbs: totals.carbs + (meal.macros?.carbs || 0),
        fat: totals.fat + (meal.macros?.fat || 0),
      };
    }
    return totals;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  
  const progressPercentage = meals.length > 0 ? (completedMealsCount / meals.length) * 100 : 0;
  
  console.log('Progress summary:', {
    completedMealsCount,
    totalMeals: meals.length,
    progressPercentage
  });

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'sunny';
      case 'lunch': return 'partly-sunny';
      case 'dinner': return 'moon';
      case 'snack': return 'nutrition';
      default: return 'restaurant';
    }
  };

  const getMealColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '#f59e0b';
      case 'lunch': return '#06b6d4';
      case 'dinner': return '#8b5cf6';
      case 'snack': return '#10b981';
      default: return '#71717a';
    }
  };

  const handleMealPress = (meal: Meal) => {
    navigation.navigate('MealPlanMealDetail', {
      meal,
      dayName: calculatedDayName,
      weekNumber,
      mealPlanName,
    });
  };

  // Helper function to convert time string to minutes for sorting
  const timeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    try {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = (hours % 12) * 60 + minutes;
      if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
      if (period === 'AM' && hours === 12) totalMinutes = minutes;
      return totalMinutes;
    } catch {
      return 0;
    }
  };

  // Sort meals chronologically by recommended_time, fallback to meal type order
  const mealTypeOrder = { 'breakfast': 0, 'snack': 1, 'lunch': 2, 'dinner': 3 };
  const sortedMeals = meals.sort((a, b) => {
    const timeA = a.recommended_time ? timeToMinutes(a.recommended_time) : mealTypeOrder[a.meal_type] * 360; // 6-hour gaps as fallback
    const timeB = b.recommended_time ? timeToMinutes(b.recommended_time) : mealTypeOrder[b.meal_type] * 360;
    return timeA - timeB;
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Compact Header */}
        <View style={styles.compactHeader}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.dayTitle}>{calculatedDayName.split(',')[0]}</Text>
            <Text style={styles.dateSubtitle}>{getDayDate().split(' ').slice(1).join(' ')}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        {/* Compact Progress Card */}
        <View style={styles.section}>
          <View style={[styles.modernProgressCard, { borderColor: `${themeColor}20` }]}>
            {/* Progress Header */}
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.modernProgressTitle}>Today's Progress</Text>
                <Text style={styles.modernProgressSubtitle}>
                  {completedMealsCount} of {meals.length} meals completed
                </Text>
              </View>
              <View style={[styles.percentageCircle, { borderColor: themeColor }]}>
                <Text style={[styles.percentageText, { color: themeColor }]}>
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
            </View>
            
            {/* Modern Progress Bar */}
            <View style={styles.modernProgressBarContainer}>
              <View style={[
                styles.modernProgressBar, 
                { 
                  width: `${progressPercentage}%`, 
                  backgroundColor: themeColor,
                  shadowColor: themeColor
                }
              ]} />
            </View>
            
            {/* Remaining Nutrition Grid */}
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#ef4444' }]}>
                  {Math.max(0, Math.round(dailyTotals.protein - completedNutrition.protein))}g
                </Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#3b82f6' }]}>
                  {Math.max(0, Math.round(dailyTotals.carbs - completedNutrition.carbs))}g
                </Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#f59e0b' }]}>
                  {Math.max(0, Math.round(dailyTotals.fat - completedNutrition.fat))}g
                </Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#22c55e' }]}>
                  {Math.max(0, Math.round(dailyTotals.calories - completedNutrition.calories))}
                </Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sequential Meals Timeline */}
        <View style={styles.mealSection}>
          <View style={styles.mealSectionHeader}>
            <Ionicons name="time" size={20} color={themeColor} />
            <Text style={[styles.mealSectionTitle, { color: themeColor }]}>Your Daily Timeline</Text>
            <Text style={styles.mealCount}>{meals.length} meal{meals.length > 1 ? 's' : ''}</Text>
          </View>
          
          {sortedMeals.map((meal, index) => {
            const mealId = generateMealId(meal, index);
            const isCompleted = isMealCompleted(mealId, dayDateString);
            
            return (
              <MealCard
                key={index}
                meal={meal}
                onPress={() => handleMealPress(meal)}
                onLongPress={() => handleMealLongPress(meal, index)}
                themeColor={themeColor}
                mealIcon={getMealIcon(meal.meal_type)}
                mealColor={getMealColor(meal.meal_type)}
                isCompleted={isCompleted}
              />
            );
          })}
        </View>

        {meals.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#3f3f46" />
            <Text style={styles.emptyTitle}>No Meals Planned</Text>
            <Text style={styles.emptyDescription}>
              This day doesn't have any meals configured.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  scrollContent: {
    flex: 1,
  },
  
  // Compact Header
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1f',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  dayTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  dateSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Section Styling
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  
  // Compact Progress Card
  compactProgressCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  progressSubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#27272a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  compactMacrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactMacro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactMacroText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#d4d4d8',
  },
  caloriesSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  caloriesMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  caloriesValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  caloriesLabel: {
    fontSize: 14,
    color: '#71717a',
    marginLeft: 4,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  bottomStats: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  bottomStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomStatText: {
    fontSize: 12,
    color: '#71717a',
  },
  mealSection: {
    marginBottom: 20,
  },
  mealSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  mealSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  mealCount: {
    fontSize: 12,
    color: '#71717a',
    marginLeft: 'auto',
  },
  mealCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealCardCompleted: {
    opacity: 0.7,
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: '#22c55e',
    borderWidth: 1,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mealTitleContainer: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  mealSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  mealType: {
    fontSize: 12,
    fontWeight: '500',
  },
  mealTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
  },
  timingReason: {
    fontSize: 11,
    color: '#a1a1aa',
    fontStyle: 'italic',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 39, 42, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#d4d4d8',
  },
  macrosBar: {
    marginBottom: 8,
  },
  macrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  macroChip: {
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
    fontSize: 11,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: 'rgba(113, 113, 122, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  moreTagsText: {
    fontSize: 10,
    color: '#71717a',
    fontStyle: 'italic',
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

  // New simplified nutrition styles
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  caloriesText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f59e0b',
  },
  macrosInline: {
    flexDirection: 'row',
    gap: 12,
  },
  macroInlineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a1a1aa',
  },

  // Modern Progress Card Styles
  modernProgressCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.8)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modernProgressTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  modernProgressSubtitle: {
    fontSize: 15,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  percentageCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  modernProgressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  modernProgressBar: {
    height: '100%',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});