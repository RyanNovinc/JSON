import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  
  Alert,
  Modal,
  TextInput,
  Linking,
  Share,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import { Meal, MealTag } from '../types/nutrition';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function MealDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { themeColor, themeColorLight } = useTheme();
  const {
    addToFavorites,
    removeFromFavorites,
    getFavoriteMeals,
    rateMeal,
    addMealToHistory,
  } = useMealPlanning();

  const meal = route.params?.meal as Meal;
  
  const [isFavorite, setIsFavorite] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showCookedModal, setShowCookedModal] = useState(false);
  const [modifications, setModifications] = useState('');

  useEffect(() => {
    if (meal) {
      const favorites = getFavoriteMeals();
      setIsFavorite(favorites.some(fav => fav.mealId === meal.id));
    }
  }, [meal]);

  if (!meal) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Meal not found</Text>
      </View>
    );
  }

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await removeFromFavorites(meal.id);
        setIsFavorite(false);
        Alert.alert('Removed', 'Meal removed from favorites');
      } else {
        await addToFavorites(meal);
        setIsFavorite(true);
        Alert.alert('Added', 'Meal added to favorites');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorites');
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating');
      return;
    }

    try {
      await rateMeal(meal.id, rating, feedback);
      setShowRatingModal(false);
      setRating(0);
      setFeedback('');
      Alert.alert('Thanks!', 'Your rating has been saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save rating');
    }
  };

  const markAsCooked = async () => {
    try {
      await addMealToHistory(meal.id, modifications);
      setShowCookedModal(false);
      setModifications('');
      Alert.alert('Great!', 'Meal added to your cooking history');
    } catch (error) {
      Alert.alert('Error', 'Failed to save cooking record');
    }
  };

  const searchYouTube = () => {
    const searchQuery = meal.youtubeSearchQuery || encodeURIComponent(meal.name + ' recipe');
    const youtubeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    
    Alert.alert(
      'YouTube Recipe Search',
      'This will search for cooking videos. Note: Videos are found using AI and may not match exactly.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Search', onPress: () => Linking.openURL(youtubeUrl) },
      ]
    );
  };

  const shareMeal = async () => {
    try {
      const mealName = meal.name || meal.meal_name || 'Recipe';
      const description = meal.description || `A delicious ${meal.meal_type || meal.type || 'meal'} recipe.`;
      const ingredients = meal.ingredients?.map(ing => `• ${ing.amount} ${ing.unit} ${ing.name || ing.item}`).join('\n') || 'No ingredients listed';
      const instructions = meal.instructions?.map((inst, index) => `${inst.step || (index + 1)}. ${inst.instruction || inst}`).join('\n') || 'No instructions provided';
      const calories = meal.nutritionInfo?.calories || meal.calories || 0;
      const protein = meal.nutritionInfo?.protein || meal.macros?.protein || 0;
      
      const shareContent = `${mealName}\n\n${description}\n\nIngredients:\n${ingredients}\n\nInstructions:\n${instructions}\n\n${calories} calories | ${protein}g protein`;
      
      await Share.share({
        message: shareContent,
        title: mealName,
      });
    } catch (error) {
      console.error('Error sharing meal:', error);
    }
  };

  const getTagIcon = (tag: MealTag): keyof typeof Ionicons.glyphMap => {
    switch (tag) {
      case 'easy': return 'checkmark-circle';
      case 'delicious': return 'star';
      case 'meal_prep': return 'archive';
      case 'quick': return 'time';
      case 'budget_friendly': return 'cash';
      case 'high_protein': return 'fitness';
      case 'low_carb': return 'leaf';
      case 'vegetarian': return 'leaf-outline';
      case 'vegan': return 'leaf';
      case 'gluten_free': return 'medical';
      default: return 'checkmark';
    }
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return themeColor;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={shareMeal} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleFavorite} style={styles.headerButton}>
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              size={24} 
              color={isFavorite ? "#ef4444" : "#ffffff"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meal Header */}
        <View style={styles.mealHeaderSection}>
          <Text style={styles.mealName}>{meal.name || meal.meal_name}</Text>
          {meal.tags && meal.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {meal.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: `${themeColor}20`, borderColor: themeColor }]}>
                  <Text style={[styles.tagText, { color: themeColor }]}>{tag ? tag.replace('_', ' ') : 'Unknown'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsCard}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#71717a" />
            <Text style={styles.statLabel}>{(meal.prepTime || meal.prep_time || 0) + (meal.cookTime || meal.cook_time || 0)} min</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: themeColor }]}>{meal.nutritionInfo?.calories || meal.calories || 0}</Text>
            <Text style={styles.statLabel}>cal</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.macroRow}>
            <Text style={styles.macroStat}>P: {meal.nutritionInfo?.protein || meal.macros?.protein || 0}g</Text>
            <Text style={styles.macroStat}>C: {(meal.nutritionInfo?.carbs || meal.macros?.carbs || 0)}g</Text>
            <Text style={styles.macroStat}>F: {(meal.nutritionInfo?.fat || meal.macros?.fat || 0)}g</Text>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.ingredientsCard}>
          <Text style={styles.cardTitle}>Ingredients</Text>
          <View style={styles.ingredientsList}>
            {meal.ingredients?.map((ingredient, index) => {
              let displayText = '';
              
              if (typeof ingredient === 'string') {
                displayText = ingredient;
              } else {
                // For structured ingredients, format them nicely
                const amount = ingredient.amount && ingredient.amount !== 1 ? ingredient.amount : '';
                const unit = ingredient.unit && ingredient.unit !== 'item' ? ingredient.unit : '';
                const name = ingredient.name || ingredient.item || '';
                
                // Clean formatting - only show amount/unit if they're meaningful
                if (amount && unit && unit !== 'item') {
                  displayText = `${amount} ${unit} ${name}`.trim();
                } else if (amount && unit === 'item') {
                  displayText = amount > 1 ? `${amount} ${name}` : name;
                } else {
                  displayText = name;
                }
              }
              
              return (
                <View key={ingredient.id || index} style={styles.ingredientRow}>
                  <View style={styles.ingredientBullet} />
                  <View style={styles.ingredientContent}>
                    <Text style={styles.ingredientText}>{displayText}</Text>
                  </View>
                </View>
              );
            }) || []}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.cardTitle}>Instructions</Text>
          <View style={styles.instructionsList}>
            {meal.instructions?.map((instruction, index) => {
              const displayText = typeof instruction === 'string' 
                ? instruction 
                : instruction.instruction || instruction;
              
              return (
                <View key={instruction.step || index} style={styles.instructionRow}>
                  <View style={[styles.stepCircle, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepNumber}>{instruction.step || (index + 1)}</Text>
                  </View>
                  <View style={styles.instructionContent}>
                    <Text style={styles.instructionText}>{displayText}</Text>
                  </View>
                </View>
              );
            }) || []}
          </View>
        </View>

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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  mealInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  mealHeader: {
    marginBottom: 12,
  },
  mealName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 34,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  timingCard: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
  },
  timingItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  timingLabel: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '600',
  },
  timingValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  nutritionCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  nutritionItem: {
    width: '30%',
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#71717a',
  },
  ingredientsCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
  },
  ingredientsList: {
    gap: 12,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#27272a',
    borderRadius: 8,
  },
  ingredientAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    minWidth: 80,
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 12,
  },
  ingredientCost: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '600',
  },
  ingredientNotes: {
    fontSize: 11,
    color: '#71717a',
    fontStyle: 'italic',
    marginTop: 2,
  },
  optionalText: {
    fontSize: 10,
    color: '#71717a',
    fontStyle: 'italic',
    marginLeft: 8,
  },
  instructionsCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22d3ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  instructionContent: {
    flex: 1,
  },
  instructionText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
    marginBottom: 4,
  },
  instructionMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  instructionMetaText: {
    fontSize: 12,
    color: '#71717a',
  },
  actionsCard: {
    marginHorizontal: 20,
    marginBottom: 40,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22d3ee',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  feedbackInput: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 16,
    fontSize: 14,
    color: '#ffffff',
    width: '100%',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#22d3ee',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  errorText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 100,
  },
  mealHeaderSection: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginHorizontal: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickStatsCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#27272a',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroStat: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 12,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#71717a',
    marginTop: 6,
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffff',
  },
  ingredientAmount: {
    color: '#ffffff',
    fontWeight: '600',
  },
  ingredientName: {
    color: '#ffffff',
    fontWeight: '400',
  },
  optionalText: {
    color: '#71717a',
    fontStyle: 'italic',
    fontSize: 13,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 16,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  instructionContent: {
    flex: 1,
  },
  instructionText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 22,
    fontWeight: '400',
  },
});