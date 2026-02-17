import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, NutritionCompletionStatus } from '../utils/storage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface QuestionnairCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  navigationTarget: string;
  completionKey: keyof NutritionCompletionStatus;
}

const questionnaires: QuestionnairCard[] = [
  {
    id: 'nutrition',
    title: 'Nutrition Goals',
    subtitle: 'Set your macro targets',
    description: 'Calculate BMR, TDEE & macro targets',
    icon: 'nutrition-outline',
    navigationTarget: 'NutritionQuestionnaire',
    completionKey: 'nutritionGoals',
  },
  {
    id: 'budget',
    title: 'Budget Cooking',
    subtitle: 'Meal planning preferences',
    description: 'Budget, cooking style & preferences',
    icon: 'restaurant-outline',
    navigationTarget: 'BudgetCookingQuestionnaire',
    completionKey: 'budgetCooking',
  },
  {
    id: 'sleep',
    title: 'Sleep Optimization',
    subtitle: 'Meal timing & sleep',
    description: 'Optimize meal timing for better sleep',
    icon: 'moon-outline',
    navigationTarget: 'SleepOptimizationScreen',
    completionKey: 'sleepOptimization',
  },
  {
    id: 'fridgePantry',
    title: 'My Fridge & Pantry',
    subtitle: 'Existing ingredients',
    description: 'Add ingredients you already have',
    icon: 'storefront-outline',
    navigationTarget: 'FridgePantryQuestionnaire',
    completionKey: 'fridgePantry',
  },
  {
    id: 'favorites',
    title: 'Favorite Meals',
    subtitle: 'Manage saved meals',
    description: 'View and manage your saved meals',
    icon: 'heart-outline',
    navigationTarget: 'FavoriteMeals',
    completionKey: 'favoriteMeals',
  },
];

export default function NutritionDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const [completionStatus, setCompletionStatus] = useState<NutritionCompletionStatus>({
    nutritionGoals: false,
    budgetCooking: false,
    sleepOptimization: false,
    fridgePantry: false,
    favoriteMeals: false,
  });
  const [fridgePantryCount, setFridgePantryCount] = useState<number>(0);
  const [useFridgePantry, setUseFridgePantry] = useState<boolean>(false);
  const [fridgePantryPreferences, setFridgePantryPreferences] = useState<any>(null);

  useEffect(() => {
    loadCompletionStatus();
    loadFridgePantryCount();
    loadUseFridgePantryToggle();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFridgePantryCount();
      loadUseFridgePantryToggle();
    }, [])
  );

  const loadCompletionStatus = async () => {
    try {
      const status = await WorkoutStorage.loadNutritionCompletionStatus();
      setCompletionStatus(status);
    } catch (error) {
      console.error('Failed to load completion status:', error);
    }
  };

  const loadFridgePantryCount = async () => {
    try {
      const results = await WorkoutStorage.loadFridgePantryResults();
      if (results && results.formData.ingredients) {
        setFridgePantryCount(results.formData.ingredients.length);
      }
      if (results && results.formData.preferences) {
        setFridgePantryPreferences(results.formData.preferences);
      }
    } catch (error) {
      console.error('Failed to load fridge pantry count:', error);
    }
  };

  const loadUseFridgePantryToggle = async () => {
    try {
      const results = await WorkoutStorage.loadFridgePantryResults();
      if (results && results.formData) {
        setUseFridgePantry(results.formData.wantToUseExistingIngredients || false);
      }
    } catch (error) {
      console.error('Failed to load fridge pantry toggle:', error);
    }
  };

  const handleToggleFridgePantry = async (value: boolean) => {
    try {
      setUseFridgePantry(value);
      
      const results = await WorkoutStorage.loadFridgePantryResults();
      if (results) {
        const updatedResults = {
          ...results,
          formData: {
            ...results.formData,
            wantToUseExistingIngredients: value,
          },
        };
        await WorkoutStorage.saveFridgePantryResults(updatedResults);
      }
    } catch (error) {
      console.error('Failed to save fridge pantry toggle:', error);
    }
  };

  const handlePreferencesSave = async (newPreferences: any) => {
    setFridgePantryPreferences(newPreferences);
    // Reload data to ensure consistency
    await loadFridgePantryCount();
    await loadUseFridgePantryToggle();
  };

  const getFridgePantryDisplayText = () => {
    if (!useFridgePantry) return 'Off';
    
    if (!fridgePantryPreferences) return 'Set up';
    
    switch (fridgePantryPreferences.primaryApproach) {
      case 'maximize':
        return 'Maximize inventory';
      case 'expiry':
        return 'Expiry focused';
      case 'ai-led':
        return 'AI-led planning';
      default:
        return 'Set up';
    }
  };

  const handleQuestionnairePress = (questionnaire: QuestionnairCard) => {
    navigation.navigate(questionnaire.navigationTarget as any);
  };

  const renderQuestionnaireCard = (questionnaire: QuestionnairCard, index: number) => {
    const isCompleted = completionStatus[questionnaire.completionKey];
    const isFavorites = questionnaire.id === 'favorites';
    const isFridgePantry = questionnaire.id === 'fridgePantry';

    return (
      <TouchableOpacity
        key={questionnaire.id}
        style={[styles.card, { 
          borderColor: isFridgePantry && isCompleted ? (useFridgePantry ? themeColor : '#71717a') : themeColor, 
          shadowColor: isFridgePantry && isCompleted ? (useFridgePantry ? themeColor : '#71717a') : themeColor 
        }]}
        activeOpacity={0.8}
        onPress={() => handleQuestionnairePress(questionnaire)}
      >
        {/* Completion Status Indicator - Hide for favorites and fridgePantry */}
        {!isFavorites && !isFridgePantry && (
          <View style={styles.statusContainer}>
            {isCompleted ? (
              <View style={[styles.statusBadge, { backgroundColor: themeColor }]}>
                <Ionicons name="checkmark" size={16} color="#0a0a0b" />
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.statusBadgeIncomplete]}>
                <Text style={styles.statusNumber}>{index + 1}</Text>
              </View>
            )}
          </View>
        )}

        {/* Fridge Pantry Item Count */}
        {isFridgePantry && fridgePantryCount > 0 && (
          <View style={[styles.itemCountContainer, { backgroundColor: useFridgePantry ? themeColor : '#71717a' }]}>
            <Text style={[styles.itemCountText, { color: useFridgePantry ? '#0a0a0b' : '#ffffff' }]}>{fridgePantryCount}</Text>
          </View>
        )}

        {/* Card Content */}
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={questionnaire.icon as any} 
              size={32} 
              color={isFridgePantry && isCompleted ? (useFridgePantry ? themeColor : '#71717a') : themeColor}
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { textShadowColor: themeColorLight }]}>
              {questionnaire.title}
            </Text>
            <Text style={styles.cardSubtitle}>
              {questionnaire.subtitle}
            </Text>
            <Text style={[styles.cardDescription, { color: isFavorites ? themeColor : (isFridgePantry && isCompleted ? (useFridgePantry ? themeColor : '#71717a') : isCompleted ? themeColor : '#71717a') }]}>
              {isFavorites ? questionnaire.description : (isFridgePantry && isCompleted ? getFridgePantryDisplayText() : isCompleted ? 'Completed' : questionnaire.description)}
            </Text>
            
            {/* Toggle for Fridge & Pantry */}
            {isFridgePantry && isCompleted && (
              <View style={styles.toggleContainer}>
                <Text style={styles.toggleLabel}>Include in meal planning</Text>
                <Switch
                  value={useFridgePantry}
                  onValueChange={handleToggleFridgePantry}
                  trackColor={{ false: '#27272a', true: themeColor + '40' }}
                  thumbColor={useFridgePantry ? themeColor : '#71717a'}
                  ios_backgroundColor="#27272a"
                />
              </View>
            )}
          </View>

          {/* Chevron */}
          <View style={styles.chevronContainer}>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={isFridgePantry && isCompleted ? (useFridgePantry ? themeColor : '#71717a') : isCompleted ? themeColor : '#71717a'} 
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Only count actual questionnaires (exclude favoriteMeals)
  const completedCount = [
    completionStatus.nutritionGoals,
    completionStatus.budgetCooking, 
    completionStatus.sleepOptimization
  ].filter(Boolean).length;

  const totalQuestionnaires = 3; // Only 3 actual questionnaires

  return (
    <SafeAreaView style={styles.container}>
      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={themeColor} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Nutrition Setup</Text>
            <Text style={styles.headerSubtitle}>
              {completedCount}/{totalQuestionnaires} questionnaires completed
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: themeColor,
                  width: `${(completedCount / totalQuestionnaires) * 100}%`
                }
              ]} 
            />
          </View>
        </View>

        {/* Questionnaire Cards */}
        <View style={styles.cardsContainer}>
          {questionnaires.map((questionnaire, index) => 
            renderQuestionnaireCard(questionnaire, index)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#71717a',
  },
  progressContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#27272a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
  },
  statusContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0a0a0b',
  },
  statusBadgeIncomplete: {
    backgroundColor: '#27272a',
  },
  statusNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#71717a',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textShadowOffset: { width: 0, height: 1 },
    textShadowOpacity: 0.5,
    textShadowRadius: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '500',
  },
  chevronContainer: {
    marginLeft: 12,
  },
  itemCountContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0a0a0b',
    zIndex: 10,
  },
  itemCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    flex: 1,
  },
});