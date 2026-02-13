import { WorkoutStorage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const generateUserMealPlanPrompt = async () => {
  try {
    // Load all questionnaire data
    const nutritionResults = await WorkoutStorage.loadNutritionResults();
    const budgetCookingResults = await WorkoutStorage.loadBudgetCookingResults();
    const sleepResults = await WorkoutStorage.loadSleepOptimizationResults();

    console.log('Debug - nutritionResults:', JSON.stringify(nutritionResults, null, 2));
    console.log('Debug - budgetCookingResults:', JSON.stringify(budgetCookingResults, null, 2));
    
    // Also debug the individual components
    if (nutritionResults) {
      console.log('Debug - nutritionResults.formData:', JSON.stringify(nutritionResults.formData, null, 2));
      console.log('Debug - nutritionResults.macroResults:', JSON.stringify(nutritionResults.macroResults, null, 2));
    }

    if (!nutritionResults || !budgetCookingResults) {
      throw new Error('Please complete the Nutrition Goals and Budget & Cooking questionnaires first.');
    }

    const nutritionData = nutritionResults;
    const budgetData = budgetCookingResults.formData;
    const sleepData = sleepResults?.results;

    // Ensure formData exists - this might be the core issue
    if (!nutritionData.formData) {
      console.log('Debug - nutritionData.formData is missing, creating empty object');
      nutritionData.formData = {};
    }

    // Check if nutrition data has the required macroResults
    if (!nutritionData.macroResults || !nutritionData.macroResults.calories) {
      // Try to get data from user profile as fallback
      const userProfileData = await AsyncStorage.getItem('@nutrition_user_profile');
      const userProfile = userProfileData ? JSON.parse(userProfileData) : null;
      console.log('Debug - userProfile fallback:', JSON.stringify(userProfile, null, 2));
      
      if (userProfile?.macros?.calories) {
        // Use user profile data as fallback
        nutritionData.macroResults = {
          calories: userProfile.macros.calories,
          protein: userProfile.macros.protein,
          carbs: userProfile.macros.carbs,
          fat: userProfile.macros.fat,
          bmr: 0, // Will be calculated if needed
          tdee: 0, // Will be calculated if needed
        };
        
        // Also populate form data from user profile if missing
        if (!nutritionData.formData || !nutritionData.formData.goal) {
          nutritionData.formData = {
            goal: userProfile.goal || userProfile.goals?.primaryGoal || 'maintain',
            rate: userProfile.goal === 'maintain' ? 'maintain' : 
                  userProfile.goal === 'lose_weight' ? `${userProfile.targetRate || 0.5} kg/week loss` :
                  userProfile.goal === 'gain_weight' ? `${userProfile.targetRate || 0.5} kg/week gain` :
                  'maintain',
            gender: userProfile.gender || 'Not specified',
            age: userProfile.age?.toString() || 'Not specified',
            height: userProfile.height?.toString() || 'Not specified',
            weight: userProfile.weight?.toString() || userProfile.currentWeight?.toString() || 'Not specified',
            activityLevel: userProfile.activityLevel || 'moderate',
            dietType: userProfile.dietType || 'balanced',
            jobType: 'Not specified',
            ...nutritionData.formData, // Keep any existing form data
          };
        }
        console.log('Debug - Using user profile data as fallback');
      } else if (userProfile) {
        // User profile exists but doesn't have macro data - still try to use what we have
        console.log('Debug - User profile exists but missing macros, creating mock data');
        
        // Create basic macro data based on available info
        let estimatedCalories = 2000; // Default fallback
        if (userProfile.age && userProfile.gender && userProfile.height && userProfile.weight) {
          // Basic BMR calculation
          let bmr = 0;
          const age = Number(userProfile.age);
          const height = Number(userProfile.height);
          const weight = Number(userProfile.weight) || Number(userProfile.currentWeight);
          
          if (userProfile.gender === 'male') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
          } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
          }
          
          estimatedCalories = Math.round(bmr * 1.55); // Moderate activity level
        }
        
        nutritionData.macroResults = {
          calories: estimatedCalories,
          protein: Math.round(estimatedCalories * 0.25 / 4), // 25% protein
          carbs: Math.round(estimatedCalories * 0.45 / 4),   // 45% carbs
          fat: Math.round(estimatedCalories * 0.30 / 9),     // 30% fat
          bmr: 0,
          tdee: estimatedCalories,
        };
        
        nutritionData.formData = {
          goal: userProfile.goal || userProfile.goals?.primaryGoal || 'maintain',
          rate: userProfile.goal === 'maintain' ? 'maintain' : 
                userProfile.goal === 'lose_weight' ? `${userProfile.targetRate || 0.5} kg/week loss` :
                userProfile.goal === 'gain_weight' ? `${userProfile.targetRate || 0.5} kg/week gain` :
                'maintain',
          gender: userProfile.gender || 'Not specified',
          age: userProfile.age?.toString() || 'Not specified',
          height: userProfile.height?.toString() || 'Not specified',
          weight: (userProfile.weight || userProfile.currentWeight)?.toString() || 'Not specified',
          activityLevel: userProfile.activityLevel || 'moderate',
          dietType: userProfile.dietType || 'balanced',
          jobType: 'Not specified',
        };
      } else {
        throw new Error('Nutrition questionnaire appears incomplete. Please complete the Nutrition Goals questionnaire again.');
      }
    }

    // Helper function to get personality description
    const getPersonalityDescription = (value: number, scale: any) => {
      const description = scale.descriptions[value] || 'Unknown';
      return `${description} (${value}/5 - between "${scale.left}" and "${scale.right}")`;
    };

    // Final debug before generating prompt
    console.log('Debug - Final nutritionData.formData:', JSON.stringify(nutritionData.formData, null, 2));
    console.log('Debug - Final nutritionData.macroResults:', JSON.stringify(nutritionData.macroResults, null, 2));
    console.log('Debug - Final budgetData:', JSON.stringify(budgetData, null, 2));

    // Get current date for meal planning
    const today = new Date();
    const startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000)); // Start tomorrow
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-AU', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    // Generate the prompt
    const prompt = `I'm using a nutrition planning app called JSON.fit and need help creating a personalized meal plan.

**CRITICAL INSTRUCTIONS:**
1. **VERIFY ALL NUTRITION DATA** - Use reliable sources like USDA database or Cronometer to verify calories and macros for each meal
2. **BUDGET CONSTRAINT** - ${budgetData.weeklyBudget === 'custom' ? 
  `Stay within $${budgetData.customBudgetAmount || '0'}/week budget - choose cost-effective ingredients and avoid expensive items` :
  budgetData.weeklyBudget === 'very_tight' ? 
  'Very tight budget - every dollar counts, prioritize the most affordable ingredients and avoid any expensive items' :
  budgetData.weeklyBudget === 'budget_conscious' ?
  'Budget conscious - value and cost-effectiveness are important, choose affordable options when possible' :
  budgetData.weeklyBudget === 'moderate' ?
  'Moderate budget - balanced approach to cost and quality, some flexibility but still cost-aware' :
  budgetData.weeklyBudget === 'comfortable' ?
  'Comfortable budget - quality valued over strict cost savings, can include some premium ingredients' :
  'Generous budget - cost is not a constraint, focus on quality and variety'
}
3. **MEAL PREP FOCUSED** - ${budgetData.planningStyle === 1 ? 
  'I want to meal prep everything - batch cook all proteins, same meals multiple days, cook once per week' :
  budgetData.planningStyle === 2 ?
  'I want to meal prep as much as possible - batch cook proteins, repeat meals multiple days, minimize daily cooking - this means I want REPEATED meals and batch cooking, NOT 21 different meals' :
  budgetData.planningStyle === 3 ?
  'I like some meal prep but also some fresh cooking - batch cook 1-2 items but vary the rest' :
  budgetData.planningStyle === 4 ?
  'I prefer mostly fresh cooking - minimal meal prep, enjoys cooking most meals daily' :
  'I prefer cooking fresh meals daily - no meal prep, enjoys daily cooking variety and spontaneous meal choices'
}
4. **INCLUDE DETAILED GROCERY LIST** - Organize by categories (Proteins, Dairy, Produce, etc.) with exact quantities, units, and estimated prices from ${budgetData.groceryStore}
5. **SPECIFIC DATES** - Start the meal plan on ${formatDate(startDate)} and use actual calendar dates
6. **SHOW CALCULATIONS** - For each meal, briefly explain how you arrived at the calorie/macro numbers

NUTRITION TARGETS:
- Daily calories: ${nutritionData.macroResults.calories}
- Protein: ${nutritionData.macroResults.protein}g | Carbs: ${nutritionData.macroResults.carbs}g | Fat: ${nutritionData.macroResults.fat}g
- ${budgetData.mealsPerDay} meals per day
- Plan duration: ${budgetData.planDuration} days
- Snacking style: ${budgetData.snackingStyle}
- Goal: ${nutritionData.formData?.goal || 'Not specified'} at ${nutritionData.formData?.rate || 'standard'} rate

PERSONAL INFO:
- Gender: ${nutritionData.formData?.gender || 'Not specified'}
- Age: ${nutritionData.formData?.age || 'Not specified'}
- Activity level: ${nutritionData.formData?.activityLevel || 'moderate'}
- Job type: ${nutritionData.formData?.jobType || 'Not specified'}

DIETARY REQUIREMENTS:
- Allergies: ${budgetData.allergies?.length ? budgetData.allergies.join(', ') : 'None'}
- Avoid foods: ${budgetData.avoidFoods?.length ? budgetData.avoidFoods.join(', ') : 'None'}
- Eating challenges: ${budgetData.eatingChallenges?.length ? budgetData.eatingChallenges.join(', ') : 'None'}
${sleepData ? `- Sleep schedule: ${sleepData.bedtime} - ${sleepData.wakeTime}` : ''}
${sleepData ? `- Meal timing preferences: ${sleepData.mealTiming}` : ''}

MEAL PREFERENCES:
${budgetData.mealPreferences === 'include_favorites' ? 
  `- User wants to include their favorite meals in the plan${budgetData.selectedFavorites?.length ? `\n- Selected favorite meals: ${budgetData.selectedFavorites.join(', ')} (these are meal IDs - you can use these as inspiration for meal types/names to include)` : ''}${budgetData.customMealRequests ? `\n- Custom requests: ${budgetData.customMealRequests}` : ''}` :
  '- User wants AI to suggest all meals based on their profile and preferences'
}

COOKING PREFERENCES:
${budgetData.planningStyle === 1 ? 
  '- User wants to meal prep everything - batch cook all proteins, same meals multiple days, cook once per week' :
  budgetData.planningStyle === 2 ?
  '- User wants to meal prep as much as possible - batch cook proteins, repeat meals multiple days, minimize daily cooking' :
  budgetData.planningStyle === 3 ?
  '- User likes some meal prep but also some fresh cooking - batch cook 1-2 items but vary the rest' :
  budgetData.planningStyle === 4 ?
  '- User prefers mostly fresh cooking - minimal meal prep, enjoys cooking most meals daily' :
  '- User prefers cooking fresh meals daily - no meal prep, enjoys daily cooking variety and spontaneous meal choices'
}

AVAILABLE COOKING EQUIPMENT:
${budgetData.cookingEquipment?.length ? 
  `- Available equipment: ${budgetData.cookingEquipment.join(', ')}
- IMPORTANT: Only suggest meals that can be made with the above equipment. Do not suggest oven recipes if no oven available, etc.` :
  '- No cooking equipment specified - assume basic stovetop and microwave access'
}
${budgetData.timeInvestment === 1 ? 
  '- User wants 5-minute meals only - microwave meals, no-cook options, absolute minimal prep work' :
  budgetData.timeInvestment === 2 ?
  '- User wants quick, simple meals - 10-15 minutes cooking time, minimal prep work, one-pot meals' :
  budgetData.timeInvestment === 3 ?
  '- User prefers moderate cooking times - 20-30 minute meals are ideal, comfortable with some prep' :
  budgetData.timeInvestment === 4 ?
  '- User enjoys spending time cooking - comfortable with 45-60 minute recipes and more involved preparations' :
  '- User loves long cooking sessions - happy spending 2+ hours, enjoys complex multi-step recipes'
}
${budgetData.varietySeeking === 1 ?
  '- User loves routine and repetition - identical meals all week is perfect, finds comfort in consistency' :
  budgetData.varietySeeking === 2 ?
  '- User is fine eating the same meals repeatedly - can have identical breakfast for a week, enjoys routine' :
  budgetData.varietySeeking === 3 ?
  '- User likes moderate variety - okay with some repeated meals but wants some different options too' :
  budgetData.varietySeeking === 4 ?
  '- User seeks variety but some repetition is okay - wants different meals most days but some repeats are fine' :
  '- User needs variety and gets bored easily - wants completely different meals every day, craves new experiences'
}
${budgetData.skillConfidence === 1 ?
  '- User is a complete kitchen beginner - stick to very basic techniques, pre-made components, familiar ingredients only' :
  budgetData.skillConfidence === 2 ?
  '- User is a cautious cook - stick to simple techniques, avoid complex recipes, use familiar ingredients' :
  budgetData.skillConfidence === 3 ?
  '- User has moderate cooking skills - can handle most standard recipes but avoid overly complex techniques' :
  budgetData.skillConfidence === 4 ?
  '- User is a confident cook - comfortable with most recipes, willing to try new techniques and ingredients' :
  '- User loves experimenting in the kitchen - excited by complex recipes, new techniques, and unusual ingredients'
}
${budgetData.cookingEnjoyment === 1 ?
  '- User avoids cooking whenever possible - prioritize convenience, takeout alternatives, minimal cleanup' :
  budgetData.cookingEnjoyment === 2 ?
  '- User sees cooking as a chore - prioritize convenience, minimal cleanup, simple preparation methods' :
  budgetData.cookingEnjoyment === 3 ?
  '- User has a neutral attitude toward cooking - willing to cook but values efficiency and practicality' :
  budgetData.cookingEnjoyment === 4 ?
  '- User enjoys cooking - finds it relaxing, comfortable with more involved recipes and techniques' :
  '- User is passionate about cooking - loves the process, excited by complex recipes, cooking is a favorite hobby'
}

LOCATION & BUDGET:
- Location: ${budgetData.city}, ${budgetData.country}
- Shop at: ${budgetData.groceryStore}
- Focus on ingredients commonly available at ${budgetData.country} supermarkets
- Budget level: ${budgetData.weeklyBudget === 'custom' ? 
  `Custom Budget - $${budgetData.customBudgetAmount || '0'}/week` :
  budgetData.weeklyBudget === 'very_tight' ? 
  'Very Tight Budget - Every dollar counts, prioritize affordability over all other factors' :
  budgetData.weeklyBudget === 'budget_conscious' ?
  'Budget Conscious - Value and cost-effectiveness are important considerations' :
  budgetData.weeklyBudget === 'moderate' ?
  'Moderate Spending - Balanced approach to cost and quality, some flexibility for variety' :
  budgetData.weeklyBudget === 'comfortable' ?
  'Comfortable Budget - Quality and convenience valued over strict cost savings' :
  'Generous Budget - Cost is not a primary constraint, quality and variety prioritized'
}

**MEAL PREP REQUIREMENTS** (based on my planning style):
${budgetData.planningStyle <= 2 ? `
- I want to meal prep! Give me 3-4 repeated meals max, not 21 different ones
- Focus on batch cooking 1-2 proteins for the week
- Same breakfast for multiple days is fine
- Provide a detailed meal prep session guide with exact quantities and containers needed
` : budgetData.planningStyle >= 4 ? `
- I prefer fresh, different meals each day
- Minimal meal prep, focus on quick daily cooking
- Provide shopping list organized by store sections for efficient daily/every-other-day shopping
` : `
- Moderate meal prep - some repeated meals, some variety
- 1-2 batch cooked items, but change up sides and seasonings
- 5-6 different meals max across the week
`}

Please create a detailed ${budgetData.planDuration}-day meal plan that:
1. **STARTS on ${formatDate(startDate)}** and uses actual calendar dates
2. **MATCHES my meal prep personality** - don't give me 21 meals if I'm a "Weekly Planner"
3. **SHOWS NUTRITION CALCULATIONS** - briefly explain how you got the calories/macros for each meal
4. **INCLUDES DETAILED RECIPES** - For each meal provide:
   - Complete ingredients list with exact quantities and units
   - Step-by-step cooking instructions (minimum 3-5 steps per recipe)
   - Prep time and cook time for each meal
   - Serving size information
5. **INCLUDES STRUCTURED MEAL PREP PLAN** - exactly what to prep, how much, and what containers to use
6. Uses ingredients available at ${budgetData.groceryStore} in ${budgetData.country}
7. Accounts for my dietary restrictions and cooking skill level
8. Hits macro targets within 5-10%

**FORMAT REQUIREMENTS:**
- Create the plan as a text document (not a formatted document)
- Use simple text formatting with headers, bullet points, and tables
- Make it fast to generate and easy to copy/edit
- Include a "Weekly Meal Prep" summary section showing total prep time and number of unique recipes
- Structure each meal as a complete recipe with ingredients and instructions

Focus on practical, batch-cookable meals that match my planning preferences.

**IMPORTANT - FEEDBACK WORKFLOW:**
After creating the initial meal plan:
1. Present the complete meal plan with a brief summary
2. Ask me to review the plan and provide feedback on:
   - Foods I don't like or want to substitute
   - Meals that seem too complex or too simple for my skill level
   - Any ingredients I want to avoid or swap out
   - Portion sizes or macro distribution adjustments
   - Meal prep timing or complexity concerns
3. **WAIT for my feedback before proceeding**
4. Make any requested adjustments to the meal plan
5. Only after I'm satisfied with the plan should you ask if I want the JSON conversion

**Do NOT automatically convert to JSON** - I need to approve the meal plan first.`;

    return prompt;

  } catch (error) {
    console.error('Error generating user meal plan prompt:', error);
    throw error;
  }
};