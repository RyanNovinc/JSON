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

type MealPrepDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPrepDetail'>;
type MealPrepDetailScreenRouteProp = RouteProp<RootStackParamList, 'MealPrepDetail'>;

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
}

export default function MealPrepDetailScreen() {
  const navigation = useNavigation<MealPrepDetailScreenNavigationProp>();
  const route = useRoute<MealPrepDetailScreenRouteProp>();
  
  const { meal, sessionName, themeColor, sessionData } = route.params;
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        return 'sunny-outline';
      case 'lunch':
        return 'restaurant-outline';
      case 'dinner':
        return 'moon-outline';
      case 'snack':
        return 'nutrition-outline';
      default:
        return 'restaurant-outline';
    }
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        return '#fbbf24';
      case 'lunch':
        return '#10b981';
      case 'dinner':
        return '#8b5cf6';
      case 'snack':
        return '#f97316';
      default:
        return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={[themeColor, `${themeColor}CC`, `${themeColor}99`]}
          style={styles.heroSection}
        >
          {/* Back Button */}
          <View style={styles.headerRow}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={28} color="#ffffff" />
            </TouchableOpacity>
            
            <View style={styles.mealTypeIndicator}>
              <View style={[styles.mealTypeIcon, { backgroundColor: getMealTypeColor(meal.meal_type) }]}>
                <Ionicons name={getMealTypeIcon(meal.meal_type)} size={20} color="#ffffff" />
              </View>
            </View>
          </View>
          
          {/* Meal Title */}
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{meal.meal_name}</Text>
            <Text style={styles.heroSubtitle}>{sessionName}</Text>
            
            <View style={styles.heroStats}>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{meal.servings}</Text>
                <Text style={styles.heroStatLabel}>servings</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{meal.total_time}</Text>
                <Text style={styles.heroStatLabel}>minutes</Text>
              </View>
              <View style={styles.heroStatItem}>
                <Text style={styles.heroStatValue}>{meal.calories}</Text>
                <Text style={styles.heroStatLabel}>calories</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tabItem, 
              activeTab === 'ingredients' && { borderBottomColor: themeColor }
            ]}
            onPress={() => setActiveTab('ingredients')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'ingredients' && { color: themeColor }
            ]}>
              Ingredients
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tabItem, 
              activeTab === 'instructions' && { borderBottomColor: themeColor }
            ]}
            onPress={() => setActiveTab('instructions')}
          >
            <Text style={[
              styles.tabText, 
              activeTab === 'instructions' && { color: themeColor }
            ]}>
              Instructions
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'ingredients' && (
          <>
        {/* Ingredients */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#1a1a1d', '#2a2a2f']}
            style={styles.ingredientsCard}
          >
            <Text style={styles.cardTitle}>Ingredients</Text>
            <Text style={styles.cardSubtitle}>For {meal.servings} servings</Text>
            
            <View style={styles.ingredientsList}>
              {(() => {
                // First try meal-specific ingredients
                if (meal.ingredients && meal.ingredients.length > 0) {
                  return meal.ingredients.map((ingredient, index) => (
                    <View key={index} style={styles.ingredientItem}>
                      <View style={styles.ingredientAmount}>
                        <Text style={styles.ingredientAmountText}>
                          {ingredient.amount} {ingredient.unit}
                        </Text>
                      </View>
                      <Text style={styles.ingredientName}>{ingredient.item}</Text>
                      {ingredient.notes && (
                        <Text style={styles.ingredientNotes}>({ingredient.notes})</Text>
                      )}
                    </View>
                  ));
                }
                
                // If no meal-specific ingredients, parse from the instruction
                const instruction = meal.instructions?.[0] || '';
                const parsedIngredients = [];
                
                // Simple ingredient parsing from instruction text
                if (instruction.includes('chicken')) {
                  parsedIngredients.push({ item: 'Chicken breast', amount: '200g', unit: 'per serving' });
                }
                if (instruction.includes('rice')) {
                  parsedIngredients.push({ item: 'White rice', amount: '230g', unit: 'cooked per container' });
                }
                if (instruction.includes('broccoli')) {
                  parsedIngredients.push({ item: 'Broccoli florets', amount: '100g', unit: 'per serving' });
                }
                if (instruction.includes('chickpeas')) {
                  parsedIngredients.push({ item: 'Chickpeas', amount: '100g', unit: 'drained per serving' });
                }
                if (instruction.includes('mince')) {
                  parsedIngredients.push({ item: 'Lean beef mince', amount: '200g', unit: 'per serving' });
                }
                if (instruction.includes('oats')) {
                  parsedIngredients.push({ item: 'Rolled oats', amount: '90g', unit: '' });
                  parsedIngredients.push({ item: 'Greek yogurt', amount: '180g', unit: '' });
                }
                
                if (parsedIngredients.length > 0) {
                  return parsedIngredients.map((ingredient, index) => (
                    <View key={index} style={styles.ingredientItem}>
                      <View style={styles.ingredientAmount}>
                        <Text style={styles.ingredientAmountText}>
                          {ingredient.amount} {ingredient.unit}
                        </Text>
                      </View>
                      <Text style={styles.ingredientName}>{ingredient.item}</Text>
                    </View>
                  ));
                }
                
                // Fallback
                return (
                  <View style={styles.ingredientItem}>
                    <Text style={styles.ingredientName}>
                      See batch cooking instructions for ingredient details.
                    </Text>
                  </View>
                );
              })()}
            </View>
          </LinearGradient>
        </View>

        {/* Equipment & Tools */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#1a1a1d', '#2a2a2f']}
            style={styles.equipmentCard}
          >
            <Text style={styles.cardTitle}>Equipment & Tools Needed</Text>
            
            <View style={styles.equipmentList}>
              {(() => {
                // Use the actual equipment from the session data
                const equipmentList = sessionData?.equipment_needed || [];
                
                if (equipmentList.length === 0) {
                  return (
                    <View style={styles.equipmentItem}>
                      <Text style={styles.equipmentText}>No specific equipment listed</Text>
                    </View>
                  );
                }
                
                return equipmentList.map((item: string, index: number) => (
                  <View key={index} style={styles.equipmentItem}>
                    <View style={styles.equipmentDot} />
                    <Text style={styles.equipmentText}>{item}</Text>
                  </View>
                ));
              })()}
            </View>
          </LinearGradient>
        </View>
          </>
        )}

        {/* Instructions Tab Content */}
        {activeTab === 'instructions' && (
          <>
        {/* Instructions */}
        <View style={styles.section}>
          <LinearGradient
            colors={[`${themeColor}15`, `${themeColor}05`]}
            style={styles.instructionsCard}
          >
            <Text style={styles.cardTitle}>Instructions</Text>
            <Text style={styles.cardSubtitle}>Step-by-step cooking guide</Text>
            
            <View style={styles.stepsContainer}>
              {(() => {
                const instructions = meal.instructions || [];
                const allSteps = [];
                
                instructions.forEach((instruction) => {
                  const cleanInstruction = instruction.replace(/^Step\s*\d+\s*[—–\-:]\s*/i, '').trim();
                  
                  // Split long instructions into steps by logical breaks
                  let steps = [];
                  
                  // First, split by sentences
                  const sentences = cleanInstruction.split(/\.\s+/);
                  
                  sentences.forEach(sentence => {
                    if (!sentence.trim()) return;
                    
                    // Check if sentence has "then" connectors for sequential actions
                    if (sentence.includes(' then ')) {
                      const thenParts = sentence.split(/,?\s+then\s+/);
                      thenParts.forEach(part => {
                        if (part.trim()) {
                          steps.push(part.trim() + (part.endsWith('.') ? '' : '.'));
                        }
                      });
                    }
                    // Check for comma-separated actions in assembly instructions
                    else if (sentence.includes('layer') || sentence.includes('add') || sentence.includes('container')) {
                      // Split on commas but be smart about it
                      const commaParts = sentence.split(/,\s+/);
                      if (commaParts.length > 2) {
                        commaParts.forEach(part => {
                          if (part.trim() && part.length > 5) {
                            steps.push(part.trim() + (part.endsWith('.') ? '' : '.'));
                          }
                        });
                      } else {
                        steps.push(sentence.trim() + (sentence.endsWith('.') ? '' : '.'));
                      }
                    }
                    // Regular sentence
                    else {
                      steps.push(sentence.trim() + (sentence.endsWith('.') ? '' : '.'));
                    }
                  });
                  
                  // If no steps were created, use the original instruction
                  if (steps.length === 0) {
                    steps.push(cleanInstruction);
                  }
                  
                  allSteps.push(...steps);
                });
                
                return allSteps.map((step, index) => (
                  <View key={index} style={styles.stepCard}>
                    <View style={styles.stepHeader}>
                      <View style={[styles.stepNumber, { backgroundColor: themeColor }]}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.stepDescription}>{step}</Text>
                    </View>
                  </View>
                ));
              })()}
            </View>
          </LinearGradient>
        </View>

        {/* Meal Prep Notes */}
        {meal.meal_prep_notes && (
          <View style={styles.section}>
            <LinearGradient
              colors={['#1a1a1d', '#2a2a2f']}
              style={styles.notesCard}
            >
              <Text style={styles.cardTitle}>Meal Prep Notes</Text>
              <Text style={styles.notesText}>{meal.meal_prep_notes}</Text>
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
  
  // Header Styles
  heroSection: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeIndicator: {
    alignItems: 'center',
  },
  mealTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 24,
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },

  // Section Styling
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  
  // Card Styles
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
  cardSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 16,
  },
  
  // Time Breakdown
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

  // Macros
  macrosCard: {
    borderRadius: 20,
    padding: 24,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  macroItem: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },

  // Ingredients
  ingredientsCard: {
    borderRadius: 20,
    padding: 24,
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  ingredientAmount: {
    minWidth: 80,
    marginRight: 12,
  },
  ingredientAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22d3ee',
  },
  ingredientName: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
    fontWeight: '500',
  },
  ingredientNotes: {
    fontSize: 12,
    color: '#a1a1aa',
    fontStyle: 'italic',
    marginLeft: 8,
  },

  // Instructions
  instructionsCard: {
    borderRadius: 20,
    padding: 24,
  },
  stepsContainer: {
    gap: 16,
  },
  stepCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepDescription: {
    fontSize: 14,
    color: '#d4d4d8',
    lineHeight: 20,
    flex: 1,
  },

  // Notes
  notesCard: {
    borderRadius: 20,
    padding: 24,
  },
  notesText: {
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
  equipmentCard: {
    borderRadius: 20,
    padding: 24,
  },
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

  // Utilities
  bottomSpacing: {
    height: 40,
  },
});