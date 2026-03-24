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
 * ONLY return a date if today's actual date exists in the plan
 * Otherwise return null so we navigate to plan overview instead
 */
export const findBestTodayDate = (
  mealPlan: { dailyMeals?: Record<string, any> } | null
): string | null => {
  if (!mealPlan?.dailyMeals) {
    console.log('❌ No meal plan or daily meals found');
    return null;
  }

  const planDates = Object.keys(mealPlan.dailyMeals).sort();
  if (planDates.length === 0) {
    console.log('❌ No dates in meal plan');
    return null;
  }

  const actualToday = getTodayDateString();
  console.log('🔍 Today button: looking for today\'s date:', actualToday);
  console.log('🔍 Available plan dates:', planDates);
  
  // ONLY check if actual today exists in plan
  if (isDateInMealPlan(actualToday, mealPlan)) {
    console.log('✅ Found actual today in plan:', actualToday);
    return actualToday;
  }

  // If today's date doesn't exist, return null 
  // This will cause navigation to go to MealPlanDays screen instead
  console.log('❌ Today\'s date not found in plan, will navigate to plan overview');
  return null;
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