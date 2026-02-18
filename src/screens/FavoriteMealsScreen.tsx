import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import MealRatingBadges from '../components/MealRatingBadges';
import { FavoriteMeal, MealType } from '../types/nutrition';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function FavoriteMealsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  const { getFavoriteMeals, removeFromFavorites } = useMealPlanning();

  const favoriteMeals = getFavoriteMeals();

  if (favoriteMeals.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorite Meals</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddMeal' as any)} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyDescription}>
            Heart meals you love to see them here. Your favorites help AI generate better meal plans for you.
          </Text>
        </View>
      </View>
    );
  }

  // Sort favorites by most recently added
  const sortedFavorites = [...favoriteMeals].sort((a, b) => {
    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
  });

  const removeFavorite = (favorite: FavoriteMeal) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${favorite.meal.name}" from your favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromFavorites(favorite.mealId);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove favorite');
            }
          }
        }
      ]
    );
  };


  const getMealTypeIcon = (type: MealType) => {
    switch (type) {
      case 'breakfast': return 'sunny';
      case 'lunch': return 'restaurant';
      case 'dinner': return 'moon';
      case 'snack': return 'nutrition';
    }
  };

  const FavoriteMealCard = ({ favorite }: { favorite: FavoriteMeal }) => (
    <TouchableOpacity
      style={styles.mealCard}
      onPress={() => navigation.navigate('MealDetail' as any, { meal: favorite.meal })}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <View style={styles.mealIconContainer}>
          <Ionicons
            name={getMealTypeIcon(favorite.meal.type || 'breakfast')}
            size={24}
            color={themeColor}
          />
        </View>
        
        <View style={styles.mealInfo}>
          <View style={styles.mealTitleRow}>
            <Text style={styles.mealName}>{favorite.meal.name}</Text>
            <TouchableOpacity
              onPress={() => removeFavorite(favorite)}
              style={styles.removeButton}
            >
              <Ionicons name="heart" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.mealType, { color: themeColor }]}>
            {favorite.meal.type ? favorite.meal.type.charAt(0).toUpperCase() + favorite.meal.type.slice(1) : 'Meal'}
          </Text>
          
          <View style={styles.nutritionRow}>
            <Text style={[styles.caloriesText, { color: themeColor }]}>
              {favorite.meal.nutritionInfo?.calories || 0} cal
            </Text>
            <View style={styles.macroStats}>
              <Text style={styles.macroText}>P: {favorite.meal.nutritionInfo?.protein || 0}g</Text>
              <Text style={styles.macroText}>C: {favorite.meal.nutritionInfo?.carbs || 0}g</Text>
              <Text style={styles.macroText}>F: {favorite.meal.nutritionInfo?.fat || 0}g</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.chevronContainer}>
          <Ionicons name="chevron-forward" size={20} color="#71717a" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorite Meals</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddMeal' as any)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meals List */}
        <View style={styles.mealsSection}>
          <Text style={styles.sectionTitle}>
            {sortedFavorites.length} Favorite{sortedFavorites.length !== 1 ? 's' : ''}
          </Text>

          <View style={styles.mealsList}>
            {sortedFavorites.map((favorite) => (
              <FavoriteMealCard key={favorite.mealId} favorite={favorite} />
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  addButton: {
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
  mealsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  mealsList: {
    gap: 12,
  },
  mealCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mealIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealInfo: {
    flex: 1,
    gap: 4,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  mealType: {
    fontSize: 14,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  caloriesText: {
    fontSize: 16,
    fontWeight: '600',
  },
  macroStats: {
    flexDirection: 'row',
    gap: 12,
  },
  macroText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  chevronContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPadding: {
    height: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
  },
});