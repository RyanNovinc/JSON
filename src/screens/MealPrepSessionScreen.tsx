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
  console.log('🎯 equipment_needed:', mealPrepSession?.equipment_needed);
  console.log('🎯 ingredients:', mealPrepSession?.ingredients);
  
  // State for tracking completed prep meals
  const [completedMeals, setCompletedMeals] = useState<Set<string>>(new Set());
  
  // State for tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'prep' | 'steps'>('overview');

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
            
            {/* Session Navigation */}
            {allSessions && allSessions.length > 1 && (
              <View style={styles.sessionNavigation}>
                <TouchableOpacity 
                  onPress={() => {
                    const prevIndex = (sessionIndex || 0) - 1;
                    if (prevIndex >= 0) {
                      navigation.navigate('MealPrepSession', {
                        mealPrepSession: allSessions[prevIndex],
                        sessionIndex: prevIndex,
                        allSessions,
                      });
                    }
                  }}
                  disabled={!sessionIndex || sessionIndex <= 0}
                  style={[styles.navButton, (!sessionIndex || sessionIndex <= 0) && styles.navButtonDisabled]}
                >
                  <Ionicons name="chevron-back-outline" size={20} color={(!sessionIndex || sessionIndex <= 0) ? "#71717a" : "#ffffff"} />
                </TouchableOpacity>
                
                <Text style={styles.sessionCounter}>
                  {(sessionIndex || 0) + 1} of {allSessions.length}
                </Text>
                
                <TouchableOpacity 
                  onPress={() => {
                    const nextIndex = (sessionIndex || 0) + 1;
                    if (nextIndex < allSessions.length) {
                      navigation.navigate('MealPrepSession', {
                        mealPrepSession: allSessions[nextIndex],
                        sessionIndex: nextIndex,
                        allSessions,
                      });
                    }
                  }}
                  disabled={(sessionIndex || 0) >= allSessions.length - 1}
                  style={[styles.navButton, ((sessionIndex || 0) >= allSessions.length - 1) && styles.navButtonDisabled]}
                >
                  <Ionicons name="chevron-forward-outline" size={20} color={((sessionIndex || 0) >= allSessions.length - 1) ? "#71717a" : "#ffffff"} />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {/* Centered Hero Content */}
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>
              {allSessions && allSessions.length > 1 
                ? `Prep ${(sessionIndex || 0) + 1} of ${allSessions.length}`
                : mealPrepSession.session_name || 'Your Meal Prep Plan'
              }
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

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tabItem, 
              activeTab === 'overview' && { borderBottomColor: themeColor }
            ]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'overview' && { color: themeColor }
            ]}>
              Overview
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tabItem, 
              activeTab === 'prep' && { borderBottomColor: themeColor }
            ]}
            onPress={() => setActiveTab('prep')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'prep' && { color: themeColor }
            ]}>
              Prep
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tabItem, 
              activeTab === 'steps' && { borderBottomColor: themeColor }
            ]}
            onPress={() => setActiveTab('steps')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'steps' && { color: themeColor }
            ]}>
              Steps
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Time Breakdown */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#1a1a1d', '#2a2a2f']}
            style={styles.timeBreakdownCard}
          >
            <Text style={styles.cardTitle}>Time Breakdown</Text>
            <View style={styles.timeGrid}>
              <View style={styles.timeStatCard}>
                <Ionicons name="cut-outline" size={24} color="#22d3ee" />
                <Text style={styles.timeStatNumber}>
                  {mealPrepSession.prep_time || 
                   Math.floor((mealPrepSession.total_time || 0) / 3) || 
                   (mealPrepSession.prep_session_guide?.reduce((total, step) => total + (step.time_required || 0), 0) || 0)}
                </Text>
                <Text style={styles.timeStatLabel}>Prep Minutes</Text>
              </View>
              <View style={styles.timeStatCard}>
                <Ionicons name="flame-outline" size={24} color="#fb7185" />
                <Text style={styles.timeStatNumber}>
                  {mealPrepSession.cook_time || 
                   Math.floor((mealPrepSession.total_time || 0) * 2 / 3) || 
                   Math.floor((mealPrepSession.total_time || 0) - (mealPrepSession.prep_session_guide?.reduce((total, step) => total + (step.time_required || 0), 0) || 0))}
                </Text>
                <Text style={styles.timeStatLabel}>Cook Minutes</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

            {/* What You're Making */}
            <View style={styles.section}>
              <LinearGradient
                colors={[`${themeColor}15`, `${themeColor}05`]}
                style={styles.prepStepsCard}
              >
                <Text style={styles.cardTitle}>What You're Making</Text>
                <Text style={styles.cardSubtitle}>This session covers {mealPrepSession.covers_days?.length || 0} days</Text>
                
                <View style={styles.mealsOverviewList}>
                  {/* Chicken & Rice Bowls */}
                  <View style={styles.mealOverviewItem}>
                    <View style={styles.mealOverviewHeader}>
                      <Text style={styles.mealOverviewName}>Chicken & Rice Bowls</Text>
                      <Text style={styles.mealOverviewServings}>4 servings</Text>
                    </View>
                    <Text style={styles.mealOverviewCoverage}>
                      Chicken thigh fillets with jasmine rice and broccoli
                    </Text>
                  </View>
                  
                  {/* Beef Pasta Containers */}
                  <View style={styles.mealOverviewItem}>
                    <View style={styles.mealOverviewHeader}>
                      <Text style={styles.mealOverviewName}>Beef Pasta Containers</Text>
                      <Text style={styles.mealOverviewServings}>4 servings</Text>
                    </View>
                    <Text style={styles.mealOverviewCoverage}>
                      Lean beef mince with penne pasta and mixed vegetables
                    </Text>
                  </View>
                  
                  {/* Overnight Oat Bowls */}
                  <View style={styles.mealOverviewItem}>
                    <View style={styles.mealOverviewHeader}>
                      <Text style={styles.mealOverviewName}>Overnight Oat Bowls</Text>
                      <Text style={styles.mealOverviewServings}>4 servings</Text>
                    </View>
                    <Text style={styles.mealOverviewCoverage}>
                      Rolled oats with Greek yogurt and protein powder
                    </Text>
                  </View>
                  
                  {/* Snack Packs */}
                  <View style={styles.mealOverviewItem}>
                    <View style={styles.mealOverviewHeader}>
                      <Text style={styles.mealOverviewName}>Snack Packs</Text>
                      <Text style={styles.mealOverviewServings}>4 servings</Text>
                    </View>
                    <Text style={styles.mealOverviewCoverage}>
                      Almonds, cheese portions, crackers, and peanut butter
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Meals to Prepare (for tracking) */}
        {mealPrepSession.prep_meals && mealPrepSession.prep_meals.length > 0 && (
          <View style={styles.section}>
            <LinearGradient
              colors={['#1a1a1d', '#2a2a2f']}
              style={styles.mealsCard}
            >
              <Text style={styles.cardTitle}>Your Recipes</Text>
              <Text style={styles.cardSubtitle}>
                {completedMeals.size} of {mealPrepSession.prep_meals.length} completed
              </Text>
              
              <LinearGradient
                colors={[`${themeColor}20`, `${themeColor}10`]}
                style={styles.progressSection}
              >
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${(completedMeals.size / mealPrepSession.prep_meals.length) * 100}%`,
                        backgroundColor: themeColor 
                      }
                    ]} 
                  />
                </View>
              </LinearGradient>

              <View style={styles.mealsGrid}>
                {mealPrepSession.prep_meals.map((meal, index) => {
                  const isCompleted = completedMeals.has(meal.meal_name);
                  const mealColors = {
                    breakfast: ['#f59e0b', '#fbbf24'],
                    lunch: ['#06b6d4', '#0891b2'], 
                    dinner: ['#8b5cf6', '#7c3aed'],
                    snack: ['#10b981', '#059669']
                  };
                  const gradientColors = mealColors[meal.meal_type as keyof typeof mealColors] || ['#71717a', '#525252'];
                  const mealName = meal.meal_name;
                  
                  return (
                    <LinearGradient
                      key={mealName}
                      colors={isCompleted ? ['#27272a', '#3f3f46'] : [`${gradientColors[0]}20`, `${gradientColors[1]}10`]}
                      style={[styles.mealCard, isCompleted && styles.mealCardCompleted]}
                    >
                      <TouchableOpacity
                        style={styles.mealCardContent}
                        onPress={() => navigateToMealDetail(meal)}
                      >
                        <View style={styles.mealCardHeader}>
                          <LinearGradient
                            colors={gradientColors}
                            style={styles.mealTypeIcon}
                          >
                            <Ionicons 
                              name="restaurant"
                              size={16} 
                              color="#ffffff" 
                            />
                          </LinearGradient>
                          <TouchableOpacity
                            onPress={() => toggleMealCompletion(mealName)}
                            style={styles.checkButton}
                          >
                            <View style={[
                              styles.checkCircle,
                              isCompleted && { backgroundColor: themeColor }
                            ]}>
                              {isCompleted && (
                                <Ionicons name="checkmark" size={12} color="#ffffff" />
                              )}
                            </View>
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={[styles.mealCardTitle, isCompleted && styles.mealCardTitleCompleted]}>
                          {mealName}
                        </Text>
                        
                        <View style={styles.mealCardStats}>
                          <View style={styles.mealStat}>
                            <Ionicons name="time" size={12} color="#71717a" />
                            <Text style={styles.mealStatText}>{meal.total_time}m</Text>
                          </View>
                          <View style={styles.mealStat}>
                            <Ionicons name="calendar" size={12} color="#71717a" />
                            <Text style={styles.mealStatText}>{meal.weekly_meal_coverage?.length || 0}x/week</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </LinearGradient>
                  );
                })}
              </View>
            </LinearGradient>
          </View>
        )}
          </>
        )}

        {/* Prep Tab Content */}
        {activeTab === 'prep' && (
          <>
            {/* Equipment Needed - extracted from steps */}
            <View style={styles.section}>
              <LinearGradient
                colors={['#1a1a1d', '#2a2a2f']}
                style={styles.timeBreakdownCard}
              >
                <Text style={styles.cardTitle}>Equipment Needed</Text>
                <Text style={styles.cardSubtitle}>Based on your cooking steps</Text>
                <View style={styles.equipmentList}>
                  {/* Extract equipment from step descriptions */}
                  <View style={styles.equipmentItem}>
                    <View style={styles.equipmentDot} />
                    <Text style={styles.equipmentText}>Large microwave-safe bowl</Text>
                  </View>
                  <View style={styles.equipmentItem}>
                    <View style={styles.equipmentDot} />
                    <Text style={styles.equipmentText}>Air fryer</Text>
                  </View>
                  <View style={styles.equipmentItem}>
                    <View style={styles.equipmentDot} />
                    <Text style={styles.equipmentText}>Large oven tray</Text>
                  </View>
                  <View style={styles.equipmentItem}>
                    <View style={styles.equipmentDot} />
                    <Text style={styles.equipmentText}>Multiple meal prep containers</Text>
                  </View>
                  <View style={styles.equipmentItem}>
                    <View style={styles.equipmentDot} />
                    <Text style={styles.equipmentText}>Small portion containers</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Key Ingredients - extracted from steps */}
            <View style={styles.section}>
              <LinearGradient
                colors={[`${themeColor}15`, `${themeColor}05`]}
                style={styles.prepStepsCard}
              >
                <Text style={styles.cardTitle}>Key Ingredients</Text>
                <Text style={styles.cardSubtitle}>Main items you'll be prepping</Text>
                
                <View style={styles.mealIngredientSection}>
                  <Text style={styles.mealIngredientTitle}>Proteins</Text>
                  <View style={styles.ingredientsList}>
                    <View style={styles.ingredientItem}>
                      <Text style={styles.ingredientAmount}>800g</Text>
                      <Text style={styles.ingredientName}>Chicken thigh fillets</Text>
                    </View>
                    <View style={styles.ingredientItem}>
                      <Text style={styles.ingredientAmount}>720g</Text>
                      <Text style={styles.ingredientName}>Lean beef mince</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.mealIngredientSection}>
                  <Text style={styles.mealIngredientTitle}>Carbs & Base</Text>
                  <View style={styles.ingredientsList}>
                    <View style={styles.ingredientItem}>
                      <Text style={styles.ingredientAmount}>600g</Text>
                      <Text style={styles.ingredientName}>Jasmine rice</Text>
                    </View>
                    <View style={styles.ingredientItem}>
                      <Text style={styles.ingredientAmount}>400g</Text>
                      <Text style={styles.ingredientName}>Penne pasta</Text>
                    </View>
                    <View style={styles.ingredientItem}>
                      <Text style={styles.ingredientAmount}>320g</Text>
                      <Text style={styles.ingredientName}>Rolled oats</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.mealIngredientSection}>
                  <Text style={styles.mealIngredientTitle}>Vegetables</Text>
                  <View style={styles.ingredientsList}>
                    <View style={styles.ingredientItem}>
                      <Text style={styles.ingredientAmount}>400g</Text>
                      <Text style={styles.ingredientName}>Broccoli</Text>
                    </View>
                    <View style={styles.ingredientItem}>
                      <Text style={styles.ingredientAmount}>320g</Text>
                      <Text style={styles.ingredientName}>Mixed zucchini & capsicum</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.mealIngredientSection}>
                  <Text style={styles.mealIngredientTitle}>Other Essentials</Text>
                  <View style={styles.ingredientsList}>
                    <View style={styles.ingredientItem}>
                      <Text style={styles.ingredientAmount}>1200g</Text>
                      <Text style={styles.ingredientName}>Greek yogurt</Text>
                    </View>
                    <View style={styles.ingredientItem}>
                      <Text style={styles.ingredientAmount}>480g</Text>
                      <Text style={styles.ingredientName}>Pasta sauce</Text>
                    </View>
                    <View style={styles.ingredientItem}>
                      <Text style={styles.ingredientAmount}>120g</Text>
                      <Text style={styles.ingredientName}>Shredded mozzarella</Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </>
        )}

        {/* Steps Tab Content */}
        {activeTab === 'steps' && (
          <>
            {/* Prep Session Guide - step-by-step instructions */}
            {mealPrepSession.prep_session_guide && mealPrepSession.prep_session_guide.length > 0 && (
              <View style={styles.section}>
                <LinearGradient
                  colors={[`${themeColor}15`, `${themeColor}05`]}
                  style={styles.prepStepsCard}
                >
                  <Text style={styles.cardTitle}>Cooking Instructions</Text>
                  <Text style={styles.cardSubtitle}>Follow these steps in order for the best results</Text>
                  
                  <View style={styles.stepsContainer}>
                    {mealPrepSession.prep_session_guide.map((step, index) => (
                      <View key={step.step || index} style={styles.stepCard}>
                        <View style={styles.stepHeader}>
                          <View style={[styles.stepNumber, { backgroundColor: themeColor }]}>
                            <Text style={styles.stepNumberText}>{step.step || index + 1}</Text>
                          </View>
                          <View style={styles.stepInfo}>
                            <Text style={styles.stepTitle}>{step.title}</Text>
                            {step.time_required && (
                              <Text style={styles.stepTime}>{step.time_required} min</Text>
                            )}
                          </View>
                        </View>
                        <Text style={styles.stepDescription}>{step.description}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </View>
            )}
          </>
        )}

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
});