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

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  navigationTarget: string;
  completionKey: keyof NutritionCompletionStatus;
}

const optionalTools: ToolCard[] = [
  {
    id: 'fridgePantry',
    title: 'My Fridge & Pantry',
    description: 'Add ingredients you already have',
    icon: 'storefront-outline',
    navigationTarget: 'FridgePantryQuestionnaire',
    completionKey: 'fridgePantry',
  },
  {
    id: 'favorites',
    title: 'Favorite Meals',
    description: 'View and manage your saved meals',
    icon: 'heart-outline',
    navigationTarget: 'FavoriteMeals',
    completionKey: 'favoriteMeals',
  },
];

export default function NutritionOptionalToolsScreen() {
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

  useFocusEffect(
    React.useCallback(() => {
      loadCompletionStatus();
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

  const handleToolPress = (tool: ToolCard) => {
    navigation.navigate(tool.navigationTarget as any);
  };

  const renderToolCard = (tool: ToolCard, index: number) => {
    const isCompleted = completionStatus[tool.completionKey];
    const isFavorites = tool.id === 'favorites';
    const isFridgePantry = tool.id === 'fridgePantry';
    
    return (
      <TouchableOpacity
        key={tool.id}
        style={[styles.card, { 
          borderColor: isFridgePantry && isCompleted ? (useFridgePantry ? themeColor : '#71717a') : themeColor, 
          shadowColor: isFridgePantry && isCompleted ? (useFridgePantry ? themeColor : '#71717a') : themeColor 
        }]}
        activeOpacity={0.8}
        onPress={() => handleToolPress(tool)}
      >
        {/* Fridge Pantry Item Count */}
        {isFridgePantry && fridgePantryCount > 0 && (
          <View style={[styles.itemCountContainer, { backgroundColor: useFridgePantry ? themeColor : '#71717a' }]}>
            <Text style={[styles.itemCountText, { color: useFridgePantry ? '#0a0a0b' : '#ffffff' }]}>{fridgePantryCount}</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={tool.icon as any} 
              size={32} 
              color={isFridgePantry && isCompleted ? (useFridgePantry ? themeColor : '#71717a') : themeColor}
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { textShadowColor: themeColorLight }]}>
              {tool.title}
            </Text>
            <Text style={[styles.cardDescription, { color: isFavorites ? themeColor : (isFridgePantry && isCompleted ? (useFridgePantry ? themeColor : '#71717a') : isCompleted ? themeColor : '#71717a') }]}>
              {isFavorites ? tool.description : (isFridgePantry && isCompleted ? getFridgePantryDisplayText() : isCompleted ? 'Completed' : tool.description)}
            </Text>
            
            {/* Toggle for Fridge & Pantry */}
            {isFridgePantry && (
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
          
          <View style={styles.arrowContainer}>
            {isFavorites || !isCompleted || (isFridgePantry && !isCompleted) ? (
              <Ionicons 
                name="chevron-forward" 
                size={24} 
                color="#71717a"
              />
            ) : (
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color={isFridgePantry && isCompleted ? (useFridgePantry ? themeColor : '#71717a') : themeColor}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColor} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile Tools</Text>
            <Text style={styles.headerSubtitle}>
              Manage your nutrition preferences
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.cardsContainer}>
          {optionalTools.map((tool, index) => 
            renderToolCard(tool, index)
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
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#71717a',
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
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
    paddingRight: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textShadowOpacity: 0.3,
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrowContainer: {
    marginLeft: 'auto',
  },
  placeholder: {
    width: 44,
    height: 44,
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