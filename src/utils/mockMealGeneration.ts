import { MealPlan, Meal, MealType, MealPlanRequest, GroceryItem, FoodCategory } from '../types/nutrition';

// Mock meal database with variety of meals
const MOCK_MEALS: Meal[] = [
  // Breakfast meals
  {
    id: 'breakfast_1',
    type: 'breakfast',
    name: 'Protein Overnight Oats',
    description: 'High-protein overnight oats with berries, Greek yogurt, and chia seeds',
    time: '07:30',
    ingredients: [
      { id: '1', name: 'Rolled oats', amount: 0.5, unit: 'cup', category: 'grains', estimatedCost: 0.50, isOptional: false },
      { id: '2', name: 'Greek yogurt', amount: 0.5, unit: 'cup', category: 'dairy', estimatedCost: 1.00, isOptional: false },
      { id: '3', name: 'Protein powder', amount: 1, unit: 'scoop', category: 'protein', estimatedCost: 1.50, isOptional: true },
      { id: '4', name: 'Mixed berries', amount: 0.5, unit: 'cup', category: 'fruits', estimatedCost: 2.00, isOptional: false },
      { id: '5', name: 'Chia seeds', amount: 1, unit: 'tbsp', category: 'pantry', estimatedCost: 0.30, isOptional: false },
    ],
    instructions: [
      { step: 1, instruction: 'Mix oats, yogurt, and protein powder in a jar' },
      { step: 2, instruction: 'Add chia seeds and stir well' },
      { step: 3, instruction: 'Top with berries and refrigerate overnight' },
      { step: 4, instruction: 'Enjoy cold the next morning' },
    ],
    nutritionInfo: {
      calories: 420,
      protein: 30,
      carbs: 45,
      fat: 12,
      fiber: 10,
      sugar: 18,
      sodium: 120,
    },
    difficulty: 'easy',
    prepTime: 5,
    cookTime: 0,
    servings: 1,
    youtubeSearchQuery: 'protein overnight oats recipe',
    tags: ['easy', 'meal_prep', 'high_protein', 'quick'],
    isFavorite: false,
  },
  {
    id: 'breakfast_2',
    type: 'breakfast',
    name: 'Avocado Toast with Eggs',
    description: 'Whole grain toast topped with mashed avocado and poached eggs',
    time: '08:00',
    ingredients: [
      { id: '6', name: 'Whole grain bread', amount: 2, unit: 'slices', category: 'grains', estimatedCost: 0.80, isOptional: false },
      { id: '7', name: 'Avocado', amount: 1, unit: 'medium', category: 'fruits', estimatedCost: 1.50, isOptional: false },
      { id: '8', name: 'Eggs', amount: 2, unit: 'large', category: 'protein', estimatedCost: 1.00, isOptional: false },
      { id: '9', name: 'Sea salt', amount: 0.25, unit: 'tsp', category: 'spices', estimatedCost: 0.05, isOptional: false },
      { id: '10', name: 'Black pepper', amount: 0.25, unit: 'tsp', category: 'spices', estimatedCost: 0.05, isOptional: false },
    ],
    instructions: [
      { step: 1, instruction: 'Toast the bread slices until golden brown', duration: 3 },
      { step: 2, instruction: 'Mash avocado with salt and pepper' },
      { step: 3, instruction: 'Poach eggs in simmering water', duration: 4 },
      { step: 4, instruction: 'Spread avocado on toast and top with eggs' },
    ],
    nutritionInfo: {
      calories: 380,
      protein: 18,
      carbs: 35,
      fat: 22,
      fiber: 12,
      sugar: 3,
      sodium: 420,
    },
    difficulty: 'medium',
    prepTime: 5,
    cookTime: 8,
    servings: 1,
    youtubeSearchQuery: 'avocado toast poached eggs',
    tags: ['delicious', 'healthy', 'vegetarian'],
    isFavorite: false,
  },
  // Lunch meals
  {
    id: 'lunch_1',
    type: 'lunch',
    name: 'Grilled Chicken Quinoa Bowl',
    description: 'Balanced bowl with grilled chicken, quinoa, roasted vegetables, and tahini dressing',
    time: '13:00',
    ingredients: [
      { id: '11', name: 'Chicken breast', amount: 150, unit: 'g', category: 'protein', estimatedCost: 3.00, isOptional: false },
      { id: '12', name: 'Quinoa', amount: 0.5, unit: 'cup', category: 'grains', estimatedCost: 1.00, isOptional: false },
      { id: '13', name: 'Bell peppers', amount: 1, unit: 'cup', category: 'vegetables', estimatedCost: 1.50, isOptional: false },
      { id: '14', name: 'Zucchini', amount: 1, unit: 'medium', category: 'vegetables', estimatedCost: 1.00, isOptional: false },
      { id: '15', name: 'Olive oil', amount: 2, unit: 'tbsp', category: 'pantry', estimatedCost: 0.40, isOptional: false },
      { id: '16', name: 'Tahini', amount: 2, unit: 'tbsp', category: 'pantry', estimatedCost: 0.60, isOptional: false },
    ],
    instructions: [
      { step: 1, instruction: 'Cook quinoa according to package instructions', duration: 15 },
      { step: 2, instruction: 'Season and grill chicken breast', duration: 8, temperature: 200 },
      { step: 3, instruction: 'Roast vegetables with olive oil', duration: 20, temperature: 200 },
      { step: 4, instruction: 'Prepare tahini dressing with lemon and water' },
      { step: 5, instruction: 'Combine all ingredients in bowl and serve' },
    ],
    nutritionInfo: {
      calories: 520,
      protein: 35,
      carbs: 42,
      fat: 18,
      fiber: 8,
      sugar: 12,
      sodium: 280,
    },
    difficulty: 'medium',
    prepTime: 10,
    cookTime: 25,
    servings: 1,
    youtubeSearchQuery: 'grilled chicken quinoa bowl recipe',
    tags: ['delicious', 'high_protein', 'balanced', 'gluten_free'],
    isFavorite: false,
  },
  {
    id: 'lunch_2',
    type: 'lunch',
    name: 'Mediterranean Chickpea Salad',
    description: 'Fresh salad with chickpeas, cucumber, tomatoes, and feta cheese',
    time: '12:30',
    ingredients: [
      { id: '17', name: 'Canned chickpeas', amount: 1, unit: 'cup', category: 'protein', estimatedCost: 1.20, isOptional: false },
      { id: '18', name: 'Cucumber', amount: 1, unit: 'medium', category: 'vegetables', estimatedCost: 0.80, isOptional: false },
      { id: '19', name: 'Cherry tomatoes', amount: 1, unit: 'cup', category: 'vegetables', estimatedCost: 1.50, isOptional: false },
      { id: '20', name: 'Feta cheese', amount: 50, unit: 'g', category: 'dairy', estimatedCost: 1.80, isOptional: false },
      { id: '21', name: 'Red onion', amount: 0.25, unit: 'cup', category: 'vegetables', estimatedCost: 0.30, isOptional: false },
      { id: '22', name: 'Olive oil', amount: 2, unit: 'tbsp', category: 'pantry', estimatedCost: 0.40, isOptional: false },
    ],
    instructions: [
      { step: 1, instruction: 'Drain and rinse chickpeas' },
      { step: 2, instruction: 'Dice cucumber, tomatoes, and red onion' },
      { step: 3, instruction: 'Combine all vegetables in a large bowl' },
      { step: 4, instruction: 'Add feta cheese and drizzle with olive oil' },
      { step: 5, instruction: 'Season with salt, pepper, and herbs' },
    ],
    nutritionInfo: {
      calories: 380,
      protein: 18,
      carbs: 35,
      fat: 20,
      fiber: 12,
      sugar: 15,
      sodium: 650,
    },
    difficulty: 'easy',
    prepTime: 10,
    cookTime: 0,
    servings: 1,
    youtubeSearchQuery: 'Mediterranean chickpea salad',
    tags: ['easy', 'vegetarian', 'quick', 'budget_friendly'],
    isFavorite: false,
  },
  // Dinner meals
  {
    id: 'dinner_1',
    type: 'dinner',
    name: 'Baked Salmon with Sweet Potato',
    description: 'Herb-crusted salmon fillet with roasted sweet potato and asparagus',
    time: '19:00',
    ingredients: [
      { id: '23', name: 'Salmon fillet', amount: 150, unit: 'g', category: 'protein', estimatedCost: 4.50, isOptional: false },
      { id: '24', name: 'Sweet potato', amount: 1, unit: 'medium', category: 'vegetables', estimatedCost: 1.00, isOptional: false },
      { id: '25', name: 'Asparagus', amount: 200, unit: 'g', category: 'vegetables', estimatedCost: 2.00, isOptional: false },
      { id: '26', name: 'Fresh dill', amount: 1, unit: 'tbsp', category: 'spices', estimatedCost: 0.50, isOptional: false },
      { id: '27', name: 'Lemon', amount: 0.5, unit: 'piece', category: 'fruits', estimatedCost: 0.30, isOptional: false },
      { id: '28', name: 'Olive oil', amount: 1, unit: 'tbsp', category: 'pantry', estimatedCost: 0.20, isOptional: false },
    ],
    instructions: [
      { step: 1, instruction: 'Preheat oven to 200°C', temperature: 200 },
      { step: 2, instruction: 'Cut sweet potato into wedges and toss with oil' },
      { step: 3, instruction: 'Roast sweet potato for 15 minutes', duration: 15, temperature: 200 },
      { step: 4, instruction: 'Season salmon with herbs and lemon' },
      { step: 5, instruction: 'Add salmon and asparagus to oven', duration: 12, temperature: 200 },
      { step: 6, instruction: 'Serve hot with lemon wedges' },
    ],
    nutritionInfo: {
      calories: 450,
      protein: 32,
      carbs: 35,
      fat: 20,
      fiber: 6,
      sugar: 8,
      sodium: 320,
    },
    difficulty: 'medium',
    prepTime: 10,
    cookTime: 27,
    servings: 1,
    youtubeSearchQuery: 'baked salmon sweet potato recipe',
    tags: ['delicious', 'high_protein', 'omega_3', 'gluten_free'],
    isFavorite: false,
  },
  // Snack meals
  {
    id: 'snack_1',
    type: 'snack',
    name: 'Greek Yogurt Parfait',
    description: 'Layered Greek yogurt with granola and fresh berries',
    time: '15:30',
    ingredients: [
      { id: '29', name: 'Greek yogurt', amount: 0.75, unit: 'cup', category: 'dairy', estimatedCost: 1.20, isOptional: false },
      { id: '30', name: 'Granola', amount: 0.25, unit: 'cup', category: 'grains', estimatedCost: 0.80, isOptional: false },
      { id: '31', name: 'Mixed berries', amount: 0.5, unit: 'cup', category: 'fruits', estimatedCost: 1.50, isOptional: false },
      { id: '32', name: 'Honey', amount: 1, unit: 'tsp', category: 'pantry', estimatedCost: 0.20, isOptional: true },
    ],
    instructions: [
      { step: 1, instruction: 'Layer yogurt in bottom of glass or bowl' },
      { step: 2, instruction: 'Add a layer of berries' },
      { step: 3, instruction: 'Sprinkle granola on top' },
      { step: 4, instruction: 'Drizzle with honey if desired' },
    ],
    nutritionInfo: {
      calories: 280,
      protein: 20,
      carbs: 35,
      fat: 8,
      fiber: 5,
      sugar: 25,
      sodium: 100,
    },
    difficulty: 'easy',
    prepTime: 3,
    cookTime: 0,
    servings: 1,
    youtubeSearchQuery: 'Greek yogurt parfait recipe',
    tags: ['easy', 'quick', 'high_protein', 'vegetarian'],
    isFavorite: false,
  },
];

// Function to generate personalized meal plan
export function generateMockMealPlan(request: MealPlanRequest): MealPlan {
  const { userProfile, startDate, durationWeeks, useFavorites, favoriteIds = [] } = request;
  
  const startDateObj = new Date(startDate);
  const endDate = new Date(startDateObj);
  endDate.setDate(endDate.getDate() + (durationWeeks * 7) - 1);

  // Filter meals based on user preferences
  let availableMeals = [...MOCK_MEALS];
  
  // Apply dietary restrictions
  if (userProfile.preferences.dietaryRestrictions.length > 0) {
    const restrictions = userProfile.preferences.dietaryRestrictions;
    
    availableMeals = availableMeals.filter(meal => {
      // Check if meal meets dietary restrictions
      for (const restriction of restrictions) {
        if (restriction.type === 'vegetarian') {
          // Remove meals with meat/fish
          const hasMeat = meal.ingredients.some(ing => 
            ing && ing.name && ['chicken', 'salmon', 'beef', 'pork', 'fish'].some(meat => 
              ing.name.toLowerCase().includes(meat)
            )
          );
          if (hasMeat) return false;
        }
        
        if (restriction.type === 'vegan') {
          // Remove meals with any animal products
          const hasAnimalProduct = meal.ingredients.some(ing => 
            ing && ing.name && ['chicken', 'salmon', 'eggs', 'cheese', 'yogurt', 'milk', 'honey'].some(animal => 
              ing.name.toLowerCase().includes(animal)
            )
          );
          if (hasAnimalProduct) return false;
        }
        
        if (restriction.type === 'gluten_free') {
          // Remove meals with gluten
          const hasGluten = meal.ingredients.some(ing => 
            ing && ing.name && ['bread', 'pasta', 'flour', 'wheat'].some(gluten => 
              ing.name.toLowerCase().includes(gluten)
            )
          );
          if (hasGluten && !meal.tags.includes('gluten_free')) return false;
        }
      }
      return true;
    });
  }
  
  // Prioritize user's favorite meals if requested
  let mealPool = availableMeals;
  if (useFavorites && favoriteIds.length > 0) {
    const favoriteMeals = availableMeals.filter(meal => favoriteIds.includes(meal.id));
    // Mix favorites with other meals (70% favorites, 30% others)
    mealPool = [
      ...favoriteMeals,
      ...favoriteMeals,
      ...favoriteMeals.slice(0, Math.ceil(favoriteMeals.length * 0.4)),
      ...availableMeals.filter(meal => !favoriteIds.includes(meal.id)).slice(0, 5)
    ];
  }

  // Adjust meal timing based on user schedule
  const adjustMealTiming = (meal: Meal, mealIndex: number): Meal => {
    const wakeTime = userProfile.schedule.wakeTime;
    const bedTime = userProfile.schedule.bedTime;
    
    const wakeHour = parseInt(wakeTime.split(':')[0]);
    const bedHour = parseInt(bedTime.split(':')[0]);
    
    let mealTime: string;
    switch (meal.type) {
      case 'breakfast':
        mealTime = `${String(wakeHour + 1).padStart(2, '0')}:00`;
        break;
      case 'lunch':
        const lunchHour = wakeHour + 5;
        mealTime = `${String(Math.min(lunchHour, 14)).padStart(2, '0')}:00`;
        break;
      case 'dinner':
        const dinnerHour = Math.min(bedHour - 2, 20);
        mealTime = `${String(dinnerHour).padStart(2, '0')}:00`;
        break;
      case 'snack':
        const snackHour = wakeHour + 8;
        mealTime = `${String(Math.min(snackHour, 16)).padStart(2, '0')}:00`;
        break;
      default:
        mealTime = meal.time;
    }
    
    return { ...meal, time: mealTime };
  };

  // Generate daily meal plans
  const days: any[] = [];
  const mealsPerDay = userProfile.schedule.mainMealsPerDay + userProfile.schedule.snacksPerDay;
  
  for (let i = 0; i < durationWeeks * 7; i++) {
    const date = new Date(startDateObj);
    date.setDate(date.getDate() + i);
    
    // Select meals for this day
    const dayMeals: Meal[] = [];
    const mealTypes: MealType[] = [];
    
    // Always include breakfast if main meals >= 1
    if (userProfile.schedule.mainMealsPerDay >= 1) {
      mealTypes.push('breakfast');
    }
    
    // Add lunch if main meals >= 2
    if (userProfile.schedule.mainMealsPerDay >= 2) {
      mealTypes.push('lunch');
    }
    
    // Add dinner if main meals >= 3
    if (userProfile.schedule.mainMealsPerDay >= 3) {
      mealTypes.push('dinner');
    }
    
    // Add snacks based on snacks per day
    for (let s = 0; s < userProfile.schedule.snacksPerDay; s++) {
      mealTypes.push('snack');
    }
    
    // Select meals for each type
    mealTypes.forEach((type, index) => {
      const typeOptions = mealPool.filter(meal => meal.type === type);
      if (typeOptions.length > 0) {
        const selectedMeal = typeOptions[i % typeOptions.length]; // Rotate through options
        const adjustedMeal = adjustMealTiming(selectedMeal, index);
        
        // Generate unique ID for this meal instance
        const mealInstance = {
          ...adjustedMeal,
          id: `${adjustedMeal.id}_${date.toISOString().split('T')[0]}_${index}`,
        };
        
        dayMeals.push(mealInstance);
      }
    });
    
    // Calculate daily totals
    const totalCalories = dayMeals.reduce((sum, meal) => sum + meal.nutritionInfo.calories, 0);
    const totalMacros = {
      protein: dayMeals.reduce((sum, meal) => sum + meal.nutritionInfo.protein, 0),
      carbs: dayMeals.reduce((sum, meal) => sum + meal.nutritionInfo.carbs, 0),
      fat: dayMeals.reduce((sum, meal) => sum + meal.nutritionInfo.fat, 0),
    };
    
    days.push({
      date: date.toISOString().split('T')[0],
      meals: dayMeals,
      totalCalories,
      totalMacros,
    });
  }

  // Generate grocery list
  const ingredientMap = new Map<string, GroceryItem>();
  
  days.forEach(day => {
    day.meals.forEach((meal: Meal) => {
      meal.ingredients.forEach(ingredient => {
        if (!ingredient || !ingredient.name) return;
        const key = ingredient.name.toLowerCase();
        
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!;
          existing.amount += ingredient.amount;
          existing.estimatedCost += ingredient.estimatedCost;
        } else {
          ingredientMap.set(key, {
            id: `grocery_${ingredient.id}_${Math.random()}`,
            name: ingredient.name,
            category: ingredient.category,
            amount: ingredient.amount,
            unit: ingredient.unit,
            estimatedCost: ingredient.estimatedCost,
            isPurchased: false,
            isFromInventory: false,
          });
        }
      });
    });
  });

  const groceryItems = Array.from(ingredientMap.values());
  const totalCost = groceryItems.reduce((sum, item) => sum + item.estimatedCost, 0);

  // Apply budget considerations
  const isOverBudget = totalCost > userProfile.budget.weeklyAmount * durationWeeks;
  if (isOverBudget && userProfile.preferences.cookingLevel === 'minimal') {
    // Suggest more budget-friendly alternatives
    groceryItems.forEach(item => {
      if (item.category === 'protein' && item.estimatedCost > 3) {
        item.notes = 'Consider cheaper protein alternatives like eggs or beans';
      }
    });
  }

  const groceryList = {
    id: Date.now().toString(),
    mealPlanId: Date.now().toString(),
    items: groceryItems,
    totalCost,
    currency: userProfile.budget.currency,
    generatedAt: new Date().toISOString(),
  };

  return {
    id: Date.now().toString(),
    userId: userProfile.id,
    startDate,
    endDate: endDate.toISOString().split('T')[0],
    days,
    groceryList,
    totalCost,
    generatedAt: new Date().toISOString(),
  };
}

// Function to get meal recommendations based on user's previous ratings
export function getMealRecommendations(userProfile: any, ratedMeals: any[]): Meal[] {
  const highRatedTags = ratedMeals
    .filter(meal => meal.rating?.rating >= 4)
    .flatMap(meal => meal.tags)
    .reduce((acc: Record<string, number>, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

  const recommendedMeals = MOCK_MEALS.filter(meal => {
    return meal.tags.some(tag => highRatedTags[tag] > 0);
  });

  return recommendedMeals.slice(0, 5);
}

// Function to generate meal suggestions for specific dietary goals
export function generateGoalBasedMeals(goal: string): Meal[] {
  switch (goal) {
    case 'weight_loss':
      return MOCK_MEALS.filter(meal => 
        meal.nutritionInfo.calories < 400 && 
        meal.nutritionInfo.protein > 20
      );
    case 'muscle_gain':
      return MOCK_MEALS.filter(meal => 
        meal.nutritionInfo.protein > 25 && 
        meal.tags.includes('high_protein')
      );
    case 'quick_meals':
      return MOCK_MEALS.filter(meal => 
        meal.prepTime + meal.cookTime <= 15 && 
        meal.tags.includes('quick')
      );
    default:
      return MOCK_MEALS.slice(0, 8);
  }
}