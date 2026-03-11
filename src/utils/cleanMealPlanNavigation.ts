import { NavigationProp } from '@react-navigation/native';

// Clean meal plan navigation utility
interface CleanMealPlanNavigationParams {
  targetDate: string; // Always YYYY-MM-DD format
  planId: string;
  planName: string;
  // Optional display helpers (derived from targetDate)
  dayName?: string;
  displayDate?: string;
}

interface MealPlanContext {
  id: string;
  name: string;
}

/**
 * Clean, unified navigation to a meal plan day
 * All date formatting and validation happens here
 */
export const navigateToMealDay = (
  navigation: NavigationProp<any>,
  targetDate: string,
  planContext: MealPlanContext
) => {
  try {
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      throw new Error(`Invalid date format: ${targetDate}. Expected YYYY-MM-DD`);
    }

    // Create date object and validate it's a real date
    const date = new Date(targetDate + 'T00:00:00.000Z'); // Use UTC to avoid timezone issues
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${targetDate}`);
    }

    // Generate display helpers
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const displayDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'UTC'
    });

    console.log('🚀 Clean navigation to:', {
      targetDate,
      dayName,
      displayDate,
      planContext
    });

    // Navigate with clean, consistent parameters
    navigation.navigate('MealPlanDay', {
      targetDate,
      planId: planContext.id,
      planName: planContext.name,
      dayName,
      displayDate
    } as CleanMealPlanNavigationParams);

  } catch (error) {
    console.error('❌ Failed to navigate to meal day:', error);
    throw error; // Re-throw so caller can handle
  }
};

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Check if a date exists in the meal plan
 */
export const isDateInMealPlan = (
  targetDate: string,
  mealPlan: { dailyMeals?: Record<string, any> } | null
): boolean => {
  return !!(mealPlan?.dailyMeals?.[targetDate]);
};

/**
 * Find the best date to navigate to for "Today" button
 * 1. Try actual today
 * 2. Try same day of week in the plan
 * 3. Fallback to first day of plan
 */
export const findBestTodayDate = (
  mealPlan: { dailyMeals?: Record<string, any> } | null
): string | null => {
  if (!mealPlan?.dailyMeals) {
    return null;
  }

  const planDates = Object.keys(mealPlan.dailyMeals).sort();
  if (planDates.length === 0) {
    return null;
  }

  const actualToday = getTodayDateString();
  
  // 1. Check if actual today exists in plan
  if (isDateInMealPlan(actualToday, mealPlan)) {
    console.log('✅ Found actual today in plan:', actualToday);
    return actualToday;
  }

  // 2. Find same day of week in plan
  const todayDayOfWeek = new Date(actualToday + 'T00:00:00.000Z').getUTCDay();
  
  for (const dateString of planDates) {
    const planDate = new Date(dateString + 'T00:00:00.000Z');
    if (planDate.getUTCDay() === todayDayOfWeek) {
      console.log('✅ Found matching day of week in plan:', dateString);
      return dateString;
    }
  }

  // 3. Fallback to first day
  console.log('🔄 Using first day as fallback:', planDates[0]);
  return planDates[0];
};

/**
 * Navigate to plan overview (list of days)
 */
export const navigateToMealPlanDays = (
  navigation: NavigationProp<any>,
  planContext: MealPlanContext
) => {
  console.log('🔄 Navigating to meal plan overview:', planContext);
  
  navigation.navigate('MealPlanDays', {
    planId: planContext.id,
    planName: planContext.name
  });
};