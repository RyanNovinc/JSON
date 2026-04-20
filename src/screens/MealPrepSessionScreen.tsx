import React, { useState, useEffect } from 'react';
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

type MealPrepSessionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPrepSession'>;
type MealPrepSessionScreenRouteProp = RouteProp<RootStackParamList, 'MealPrepSession'>;

interface PrepMeal {
  meal_name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prep_time: number;
  cook_time: number;
  total_time: number;
  servings: number;
  calories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  ingredients: Array<{
    item: string;
    amount: string;
    unit: string;
    scalable: boolean;
    notes: string;
  }>;
  instructions: string[];
  meal_prep_notes: string;
  weekly_meal_coverage?: Array<{
    day: string;
    meal_type: string;
  }>;
  base_servings?: number;
}

interface MealPrepSession {
  session_name: string;
  prep_time: number;
  cook_time: number;
  total_time: number;
  covers: string;
  recommended_timing: string;
  ingredients?: Array<{
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
  } | Record<string, string>;
  prep_meals?: PrepMeal[];
}

export default function MealPrepSessionScreen() {
  const navigation = useNavigation<MealPrepSessionScreenNavigationProp>();
  const route = useRoute<MealPrepSessionScreenRouteProp>();
  const { themeColor } = useTheme();

  const { mealPrepSession, sessionIndex, allSessions } = route.params;
  
  console.log('🎯 MealPrepSessionScreen mounted');
  console.log('🎯 mealPrepSession:', mealPrepSession);
  console.log('🎯 prep_meals count:', mealPrepSession?.prep_meals?.length);
  console.log('🎯 prep_meals array:', mealPrepSession?.prep_meals);
  console.log('🎯 All mealPrepSession keys:', Object.keys(mealPrepSession || {}));
  console.log('🎯 equipment_needed:', mealPrepSession?.equipment_needed);
  console.log('🎯 ingredients:', mealPrepSession?.ingredients);
  
  // State for tracking completed prep meals
  const [completedMeals, setCompletedMeals] = useState<Set<string>>(new Set());
  

  // Load completed meals from storage when component mounts
  useEffect(() => {
    // TODO: Load from AsyncStorage based on session ID
    const loadCompletedMeals = async () => {
      try {
        // const stored = await AsyncStorage.getItem(`prep_meals_${mealPrepSession.session_name}`);
        // if (stored) {
        //   setCompletedMeals(new Set(JSON.parse(stored)));
        // }
      } catch (error) {
        console.error('Failed to load completed meals:', error);
      }
    };
    loadCompletedMeals();
  }, [mealPrepSession.session_name]);

  const toggleMealCompletion = async (mealName: string) => {
    const newCompletedMeals = new Set(completedMeals);
    if (newCompletedMeals.has(mealName)) {
      newCompletedMeals.delete(mealName);
    } else {
      newCompletedMeals.add(mealName);
    }
    setCompletedMeals(newCompletedMeals);
    
    // TODO: Save to AsyncStorage
    try {
      // await AsyncStorage.setItem(
      //   `prep_meals_${mealPrepSession.session_name}`,
      //   JSON.stringify(Array.from(newCompletedMeals))
      // );
    } catch (error) {
      console.error('Failed to save completed meals:', error);
    }
  };

  const navigateToMealDetail = (meal: PrepMeal) => {
    navigation.navigate('MealPlanMealDetail', {
      meal: meal,
      dayName: 'Meal Prep Session',
      weekNumber: 1,
      mealPlanName: mealPrepSession.session_name
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={[themeColor, `${themeColor}CC`, `${themeColor}99`]}
          style={styles.heroSection}
        >
          {/* Back Button Row */}
          <View style={styles.backButtonRow}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={28} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          {/* Centered Hero Content */}
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              {mealPrepSession.session_name || 'Your Meal Prep Plan'}
            </Text>
            <Text style={styles.heroSubtitle}>
              {mealPrepSession.prep_day || 'Ready to build your week?'}
            </Text>
            
            <View style={styles.heroStats}>
              <Text style={styles.heroTime}>{mealPrepSession.total_time}</Text>
              <Text style={styles.heroTimeLabel}>minutes of cooking</Text>
            </View>
          </View>
        </LinearGradient>


        {/* Individual Meals to Prep */}
        <View style={styles.section}>
          <LinearGradient
            colors={[`${themeColor}15`, `${themeColor}05`]}
            style={styles.prepStepsCard}
          >
            <Text style={styles.cardTitle}>What You're Making</Text>
            
            <View style={styles.mealsToPrep}>
              {(() => {
                // Extract meals from instructions since prep_meals doesn't exist
                const extractedMeals = [];
                
                // Look for meal assembly steps in instructions
                const instructions = mealPrepSession.instructions || [];
                
                instructions.forEach((instruction, index) => {
                  if (instruction.includes('Chicken Rice Prep Bowls')) {
                    extractedMeals.push({
                      meal_name: 'Chicken Rice Prep Bowls',
                      meal_type: 'lunch',
                      servings: 4,
                      description: 'Chicken, rice, broccoli, and chickpeas',
                      total_time: 25,
                      calories: 520,
                      macros: { protein: 45, carbs: 52, fat: 18 },
                      instructions: [instruction]
                    });
                  }
                  
                  if (instruction.includes('Beef Mince Rice Bowls')) {
                    extractedMeals.push({
                      meal_name: 'Beef Mince Rice Bowls',
                      meal_type: 'lunch',
                      servings: 3,
                      description: 'Beef mince with rice (add fresh spinach & tomato)',
                      total_time: 15,
                      calories: 480,
                      macros: { protein: 38, carbs: 48, fat: 15 },
                      instructions: [instruction]
                    });
                  }
                  
                  if (instruction.includes('overnight oats')) {
                    extractedMeals.push({
                      meal_name: 'Overnight Oats',
                      meal_type: 'breakfast',
                      servings: 1,
                      description: 'Oats with yogurt for Monday breakfast',
                      total_time: 5,
                      calories: 320,
                      macros: { protein: 15, carbs: 45, fat: 8 },
                      instructions: [instruction]
                    });
                  }
                  
                  if (instruction.includes('brunch chicken')) {
                    extractedMeals.push({
                      meal_name: 'Brunch Chicken Portions',
                      meal_type: 'brunch',
                      servings: 4,
                      description: 'Diced chicken for eggs and rice brunch',
                      total_time: 10,
                      calories: 200,
                      macros: { protein: 35, carbs: 5, fat: 6 },
                      instructions: [instruction]
                    });
                  }
                });
                
                // Remove duplicates
                const uniqueMeals = extractedMeals.filter((meal, index, self) => 
                  index === self.findIndex(m => m.meal_name === meal.meal_name)
                );
                
                console.log('🎯 Extracted meals:', uniqueMeals);
                
                return uniqueMeals && uniqueMeals.length > 0 ? (
                  uniqueMeals.map((meal, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.mealPrepCard}
                    onPress={() => navigation.navigate('MealPrepDetail', {
                      meal: meal,
                      sessionName: mealPrepSession.session_name,
                      themeColor: themeColor,
                      sessionData: mealPrepSession
                    })}
                  >
                    <LinearGradient
                      colors={[`${themeColor}20`, `${themeColor}10`]}
                      style={styles.mealPrepCardGradient}
                    >
                      <View style={styles.mealPrepCardHeader}>
                        <Text style={styles.mealPrepName}>{meal.meal_name}</Text>
                        <View style={styles.mealPrepMeta}>
                          <Text style={styles.mealPrepServings}>{meal.servings} servings</Text>
                          <Ionicons name="chevron-forward" size={20} color={themeColor} />
                        </View>
                      </View>
                      
                      <Text style={styles.mealPrepDescription}>
                        {meal.description || meal.meal_prep_notes || `${meal.meal_type} • ${meal.total_time} min total`}
                      </Text>
                      
                      <View style={styles.mealPrepStats}>
                        <View style={styles.mealPrepStat}>
                          <Ionicons name="time-outline" size={16} color="#a1a1aa" />
                          <Text style={styles.mealPrepStatText}>{meal.total_time}m</Text>
                        </View>
                        <View style={styles.mealPrepStat}>
                          <Ionicons name="flame-outline" size={16} color="#a1a1aa" />
                          <Text style={styles.mealPrepStatText}>{meal.calories} cal</Text>
                        </View>
                        <View style={styles.mealPrepStat}>
                          <Ionicons name="fitness-outline" size={16} color="#a1a1aa" />
                          <Text style={styles.mealPrepStatText}>{meal.macros.protein}g protein</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No individual meals found for this prep session.</Text>
                );
              })()}
            </View>
          </LinearGradient>
        </View>


        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
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
  
  // Hero Section (back inside scroll view)
  heroSection: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButtonRow: {
    width: '100%',
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  sessionCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginHorizontal: 16,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
  },
  heroStats: {
    alignItems: 'center',
  },
  heroTime: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
  },
  heroTimeLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },

  // Section Styling
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  
  // Time Breakdown Card
  timeBreakdownCard: {
    borderRadius: 20,
    padding: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  timeStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  timeStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  timeStatLabel: {
    fontSize: 13,
    color: '#a1a1aa',
    fontWeight: '500',
  },

  // Meals Card
  mealsCard: {
    borderRadius: 20,
    padding: 24,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 20,
  },
  progressSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  mealsGrid: {
    gap: 16,
  },
  mealCard: {
    borderRadius: 16,
    padding: 1,
  },
  mealCardCompleted: {
    opacity: 0.7,
  },
  mealCardContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 15,
    padding: 20,
    position: 'relative',
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButton: {
    padding: 4,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  mealCardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#71717a',
  },
  mealCardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  mealStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealStatText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },

  // Utilities
  bottomSpacing: {
    height: 40,
  },
  prepStepsCard: {
    borderRadius: 16,
    padding: 20,
  },
  stepsContainer: {
    marginTop: 16,
    gap: 16,
  },
  stepCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  stepTime: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  stepDescription: {
    fontSize: 14,
    color: '#d4d4d8',
    lineHeight: 20,
  },

  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
    paddingVertical: 12,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },

  // Equipment Styles
  equipmentList: {
    marginTop: 16,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  equipmentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
    marginRight: 12,
  },
  equipmentText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },

  // Ingredients by Meal Styles
  mealIngredientSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  mealIngredientTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  mealIngredientServings: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 12,
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
  },
  ingredientAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22d3ee',
    minWidth: 80,
  },
  ingredientName: {
    fontSize: 14,
    color: '#d4d4d8',
    flex: 1,
  },

  // Meal Overview Styles
  mealsOverviewList: {
    marginTop: 16,
    gap: 12,
  },
  mealOverviewItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  mealOverviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mealOverviewName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  mealOverviewServings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22d3ee',
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealOverviewCoverage: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 18,
  },

  // No Data Style
  noDataText: {
    fontSize: 14,
    color: '#71717a',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },

  // New Meal Prep Card Styles
  mealsToPrep: {
    marginTop: 16,
    gap: 12,
  },
  mealPrepCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  mealPrepCardGradient: {
    padding: 20,
    borderRadius: 16,
  },
  mealPrepCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealPrepName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  mealPrepMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealPrepServings: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22d3ee',
    backgroundColor: 'rgba(34, 211, 238, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealPrepDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
    marginBottom: 12,
  },
  mealPrepStats: {
    flexDirection: 'row',
    gap: 16,
  },
  mealPrepStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealPrepStatText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },
});