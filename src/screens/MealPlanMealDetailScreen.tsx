import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { Meal, MealType, MealTag, NutritionInfo, Ingredient, CookingInstruction } from '../types/nutrition';

type MealPlanMealDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPlanMealDetail'>;
type MealPlanMealDetailScreenRouteProp = RouteProp<RootStackParamList, 'MealPlanMealDetail'>;

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

export default function MealPlanMealDetailScreen() {
  const navigation = useNavigation<MealPlanMealDetailScreenNavigationProp>();
  const route = useRoute<MealPlanMealDetailScreenRouteProp>();
  const { themeColor } = useTheme();
  const { addToFavorites, removeFromFavorites, getFavoriteMeals } = useMealPlanning();
  const [activeTab, setActiveTab] = useState<'macros' | 'ingredients' | 'instructions'>('macros');
  const [isFavorite, setIsFavorite] = useState(false);

  const { meal, dayName, weekNumber, mealPlanName } = route.params;
  
  // Calculate recommended servings based on meal plan usage
  const recommendedServings = meal.times_used || meal.base_servings || meal.servings || 1;
  const [targetServings, setTargetServings] = useState(recommendedServings);
  
  // Check if this is a meal prep recipe
  const isMealPrepRecipe = meal.weekly_meal_coverage || meal.base_servings || dayName === 'Meal Prep Session';
  
  // Calculate multiplier from target servings
  const originalServings = meal.base_servings || meal.servings || 1;
  const servingMultiplier = targetServings / originalServings;

  // Check if meal is already in favorites on load
  React.useEffect(() => {
    const favoriteMeals = getFavoriteMeals();
    const isAlreadyFavorite = favoriteMeals.some(fav => fav.meal.name === meal.meal_name);
    setIsFavorite(isAlreadyFavorite);
  }, [meal.meal_name, getFavoriteMeals]);

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

  const convertMealPlanMealToNutritionMeal = (mealPlanMeal: any): Meal => {
    const mealId = `meal_${mealPlanMeal.meal_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    
    // Convert ingredients
    const ingredients: Ingredient[] = (mealPlanMeal.ingredients || []).map((ing: any, index: number) => ({
      id: `ingredient_${index}_${mealId}`,
      name: ing.item,
      amount: parseFloat(ing.amount) || 1,
      unit: ing.unit || '',
      category: 'other' as const,
      estimatedCost: 0,
      isOptional: false,
    }));

    // Convert instructions
    const instructions: CookingInstruction[] = (mealPlanMeal.instructions || []).map((instruction: string, index: number) => ({
      step: index + 1,
      instruction: instruction,
    }));

    // Convert nutrition info
    const nutritionInfo: NutritionInfo = {
      calories: mealPlanMeal.calories || 0,
      protein: mealPlanMeal.macros?.protein || 0,
      carbs: mealPlanMeal.macros?.carbs || 0,
      fat: mealPlanMeal.macros?.fat || 0,
      fiber: mealPlanMeal.macros?.fiber || 0,
      sugar: 0,
      sodium: 0,
    };

    // Convert tags
    const tags: MealTag[] = (mealPlanMeal.tags || []).filter((tag: string) => 
      ['easy', 'delicious', 'meal_prep', 'quick', 'budget_friendly', 'high_protein', 'low_carb', 'vegetarian', 'vegan', 'gluten_free'].includes(tag)
    );

    return {
      id: mealId,
      type: (mealPlanMeal.meal_type || 'breakfast') as MealType,
      name: mealPlanMeal.meal_name,
      description: mealPlanMeal.notes || `Delicious ${mealPlanMeal.meal_type || 'meal'} recipe`,
      time: '12:00', // Default time
      ingredients,
      instructions,
      nutritionInfo,
      difficulty: 'easy' as const,
      prepTime: mealPlanMeal.prep_time || 0,
      cookTime: mealPlanMeal.cook_time || 0,
      servings: mealPlanMeal.servings || 1,
      tags,
      isFavorite: true,
    };
  };

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        // Find the favorite meal by name and remove it
        const favoriteMeals = getFavoriteMeals();
        const favoriteToRemove = favoriteMeals.find(fav => fav.meal.name === meal.meal_name);
        if (favoriteToRemove) {
          await removeFromFavorites(favoriteToRemove.mealId);
        }
        setIsFavorite(false);
      } else {
        // Convert and add to favorites
        const nutritionMeal = convertMealPlanMealToNutritionMeal(meal);
        await addToFavorites(nutritionMeal);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const totalTime = meal.total_time || (meal.prep_time || 0) + (meal.cook_time || 0);
  const mealColor = getMealColor(meal.meal_type || 'breakfast');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title} numberOfLines={1}>{meal.meal_name}</Text>
          <Text style={styles.subtitle}>
            {meal.meal_type ? meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1) : 'Meal'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleToggleFavorite} style={styles.favoriteButton}>
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={24} 
            color={isFavorite ? "#ef4444" : themeColor} 
          />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'macros' && { borderBottomColor: themeColor }]}
          onPress={() => setActiveTab('macros')}
        >
          <Text style={[styles.tabText, activeTab === 'macros' && { color: themeColor }]}>
            Macros
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ingredients' && { borderBottomColor: themeColor }]}
          onPress={() => setActiveTab('ingredients')}
        >
          <Text style={[styles.tabText, activeTab === 'ingredients' && { color: themeColor }]}>
            Ingredients
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'instructions' && { borderBottomColor: themeColor }]}
          onPress={() => setActiveTab('instructions')}
        >
          <Text style={[styles.tabText, activeTab === 'instructions' && { color: themeColor }]}>
            Instructions
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'macros' && meal.macros && (
          <>
            <View style={styles.modernNutritionCard}>
              <View style={styles.modernMacrosGrid}>
                <View style={styles.modernMacroItem}>
                  <Text style={[styles.modernMacroValue, { color: '#ef4444' }]}>
                    {Math.round(meal.macros.protein)}g
                  </Text>
                  <Text style={styles.modernMacroLabel}>Protein</Text>
                </View>
                <View style={styles.modernMacroItem}>
                  <Text style={[styles.modernMacroValue, { color: '#3b82f6' }]}>
                    {Math.round(meal.macros.carbs)}g
                  </Text>
                  <Text style={styles.modernMacroLabel}>Carbs</Text>
                </View>
                <View style={styles.modernMacroItem}>
                  <Text style={[styles.modernMacroValue, { color: '#10b981' }]}>
                    {Math.round(meal.macros.fat)}g
                  </Text>
                  <Text style={styles.modernMacroLabel}>Fat</Text>
                </View>
                <View style={styles.modernMacroItem}>
                  <Text style={[styles.modernMacroValue, { color: '#f59e0b' }]}>
                    {meal.calories || 0}
                  </Text>
                  <Text style={styles.modernMacroLabel}>Calories</Text>
                </View>
              </View>
            </View>

            {/* Estimated Time */}
            <View style={styles.timeCard}>
              <Text style={styles.timeValue}>{totalTime} minutes</Text>
              <Text style={styles.timeLabel}>Estimated time to make</Text>
            </View>
          </>
        )}

        {activeTab === 'ingredients' && (
          <>
            <View style={styles.ingredientsCard}>
              <Text style={styles.sectionTitle}>
                Ingredients {isMealPrepRecipe && targetServings !== originalServings ? 
                  `(${targetServings} servings)` : 
                  meal.servings && `(${meal.servings} serving${meal.servings > 1 ? 's' : ''})`
                }
              </Text>
              {(meal.ingredients || []).map((ingredient, index) => {
                const scaledAmount = isMealPrepRecipe && servingMultiplier !== 1 ? 
                  (parseFloat(ingredient.amount) * servingMultiplier).toFixed(1) : 
                  ingredient.amount;
                
                return (
                  <View key={index} style={styles.ingredientItem}>
                    <View style={styles.ingredientDot} />
                    <View style={styles.ingredientContent}>
                      <Text style={styles.ingredientText}>
                        <Text style={styles.ingredientAmount}>{scaledAmount} {ingredient.unit}</Text>
                        <Text style={styles.ingredientName}> {ingredient.item}</Text>
                      </Text>
                      {ingredient.notes && (
                        <Text style={styles.ingredientNotes}>
                          ({isMealPrepRecipe && servingMultiplier !== 1 ? 
                            ingredient.notes
                              .replace(/Total for all \d+ servings/g, `Total for all ${Math.round((meal.base_servings || meal.servings) * servingMultiplier)} servings`)
                              .replace(/For \d+ servings/g, `For ${Math.round((meal.base_servings || meal.servings) * servingMultiplier)} servings`)
                              .replace(/\((\d+)\s*jars?\)/g, (match, num) => `(${Math.round(parseInt(num) * servingMultiplier)} jar${Math.round(parseInt(num) * servingMultiplier) === 1 ? '' : 's'})`)
                              .replace(/(\d+)\s*per\s*jar/g, (match, num) => `${(parseFloat(num) / servingMultiplier).toFixed(0)}g per jar`)
                              .replace(/(\d+)\s*per\s*pack/g, (match, num) => `${(parseFloat(num) / servingMultiplier).toFixed(0)}g per pack`)
                              .replace(/(\d+)\s*per\s*serving/g, (match, num) => `${(parseFloat(num)).toFixed(0)}g per serving`)
                              .replace(/\((\d+)\s*servings?\)/g, (match, num) => `(${targetServings} serving${targetServings === 1 ? '' : 's'})`)
                              .replace(/(\d+)g\s*per\s*serving\s*\((\d+)\s*servings?\)/g, (match, perServing, servings) => `${parseFloat(perServing)}g per serving (${targetServings} serving${targetServings === 1 ? '' : 's'})`) : 
                            ingredient.notes
                          })
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Equipment Needed Section */}
            {(meal as any).equipment_needed && (meal as any).equipment_needed.length > 0 && (
              <View style={styles.equipmentCard}>
                <Text style={styles.sectionTitle}>Equipment Needed</Text>
                {((meal as any).equipment_needed || []).map((equipment: string, index: number) => (
                  <View key={index} style={styles.equipmentItem}>
                    <View style={styles.equipmentIcon}>
                      <Ionicons name="hammer-outline" size={16} color={themeColor} />
                    </View>
                    <Text style={styles.equipmentText}>{equipment}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'instructions' && (
          <View style={styles.instructionsCard}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            {(meal.instructions || []).map((instruction, index) => {
              // Scale numbers in instructions when servings are adjusted
              const scaledInstruction = isMealPrepRecipe && servingMultiplier !== 1 ? 
                instruction
                  .replace(/(\d+)\s*jars?/g, (match, num) => `${Math.round(parseInt(num) * servingMultiplier)} jar${Math.round(parseInt(num) * servingMultiplier) === 1 ? '' : 's'}`)
                  .replace(/(\d+)\s*servings?/g, (match, num) => `${Math.round(parseInt(num) * servingMultiplier)} serving${Math.round(parseInt(num) * servingMultiplier) === 1 ? '' : 's'}`)
                  .replace(/(\d+)\s*containers?/g, (match, num) => `${Math.round(parseInt(num) * servingMultiplier)} container${Math.round(parseInt(num) * servingMultiplier) === 1 ? '' : 's'}`)
                  .replace(/(\d+)\s*packs?/g, (match, num) => `${Math.round(parseInt(num) * servingMultiplier)} pack${Math.round(parseInt(num) * servingMultiplier) === 1 ? '' : 's'}`)
                  .replace(/(\d+)\s*eggs?/g, (match, num) => `${Math.round(parseInt(num) * servingMultiplier)} egg${Math.round(parseInt(num) * servingMultiplier) === 1 ? '' : 's'}`)
                : instruction;
              
              return (
                <View key={index} style={styles.instructionItem}>
                  <View style={[styles.stepNumber, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.instructionText}>{scaledInstruction}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1f',
    backgroundColor: '#0a0a0b',
    minHeight: 80,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'center',
    minHeight: 44,
  },
  favoriteButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#0a0a0b',
    minHeight: 60,
    justifyContent: 'center',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    minHeight: 50,
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mealHeader: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  mealHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  mealIconLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mealHeaderText: {
    flex: 1,
  },
  mealName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  timingCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timingItem: {
    alignItems: 'center',
    flex: 1,
  },
  timingLabel: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  timingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 2,
  },
  nutritionCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroCard: {
    backgroundColor: '#0a0a0b',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 12,
    flex: 1,
    minWidth: '40%',
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  macroLabel: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
  },
  tagsCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ingredientsCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#71717a',
    marginTop: 8,
    marginRight: 12,
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
  },
  ingredientAmount: {
    fontWeight: '600',
    color: '#f59e0b',
  },
  ingredientName: {
    fontWeight: '400',
  },
  ingredientNotes: {
    fontSize: 14,
    color: '#71717a',
    fontStyle: 'italic',
    marginTop: 2,
  },
  instructionsCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  instructionText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    flex: 1,
  },
  notesCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  notesText: {
    fontSize: 16,
    color: '#d4d4d8',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 20,
  },
  equipmentCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  equipmentIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  equipmentText: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 24,
    flex: 1,
  },
  // Meal Prep specific styles
  servingCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  servingAdjuster: {
    marginTop: 8,
  },
  servingDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 16,
    lineHeight: 20,
  },
  servingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  servingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingDisplay: {
    alignItems: 'center',
    minWidth: 80,
  },
  servingNumber: {
    fontSize: 32,
    fontWeight: '700',
  },
  servingLabel: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 4,
  },
  coverageCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  coverageDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 12,
    lineHeight: 20,
  },
  coverageList: {
    gap: 8,
  },
  coverageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#27272a',
    borderRadius: 8,
  },
  coverageText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    marginLeft: 8,
  },
  extraServingsNote: {
    fontSize: 12,
    color: '#71717a',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  scalingNote: {
    fontSize: 12,
    color: '#71717a',
    fontStyle: 'italic',
    marginBottom: 12,
    textAlign: 'center',
  },
  weeklyRecommendationCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  recommendationContent: {
    gap: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    flex: 1,
  },
  recommendationCount: {
    fontSize: 16,
    fontWeight: '700',
  },
  recommendationSubtext: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 18,
  },

  // Subtle Tags Styles
  subtleTagChip: {
    backgroundColor: 'rgba(113, 113, 122, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  subtleTagText: {
    fontSize: 11,
    color: '#a1a1aa',
    fontWeight: '500',
  },

  // New Redesigned Overview Styles
  statsCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#27272a',
    marginHorizontal: 20,
  },
  integratedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  modernTagChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 6,
  },
  modernTagText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  modernNutritionCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  modernNutritionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  modernMacrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modernMacroItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modernMacroValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modernMacroLabel: {
    fontSize: 13,
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 14,
    color: '#71717a',
  },
});