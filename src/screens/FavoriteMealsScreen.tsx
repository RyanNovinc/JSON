import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import MealRatingBadges from '../components/MealRatingBadges';
import { FavoriteMeal, MealType, MealTag } from '../types/nutrition';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function FavoriteMealsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const { getFavoriteMeals, removeFromFavorites, generateMealPlan, userProfile } = useMealPlanning();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'cooked' | 'name' | 'rating'>('recent');
  const [filterByType, setFilterByType] = useState<MealType | 'all'>('all');
  const [showSortModal, setShowSortModal] = useState(false);

  const favoriteMeals = getFavoriteMeals();

  if (favoriteMeals.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorite Meals</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyDescription}>
            Heart meals you love to see them here. Your favorites help AI generate better meal plans for you.
          </Text>
        </View>

        {/* Import Meal Section */}
        <View style={styles.importSection}>
          <TouchableOpacity
            style={[styles.importButton, { borderColor: themeColor }]}
            onPress={() => Alert.alert(
              'Import Custom Meal',
              'Paste JSON recipe data from AI tools or other sources to add custom meals to your favorites.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Import', onPress: () => Alert.alert('Coming Soon', 'JSON meal import feature will be available soon!') }
              ]
            )}
            activeOpacity={0.8}
          >
            <View style={styles.importIconContainer}>
              <Ionicons name="document-text" size={24} color={themeColor} />
            </View>
            <View style={styles.importTextContainer}>
              <Text style={[styles.importTitle, { color: themeColor }]}>Import Custom Meal</Text>
              <Text style={styles.importSubtitle}>Paste JSON recipe data</Text>
            </View>
            <Ionicons name="add-circle" size={20} color={themeColor} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Filter and search favorites
  let filteredFavorites = favoriteMeals.filter(favorite => {
    const matchesSearch = (favorite.meal.name || 'Untitled Recipe').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (favorite.meal.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterByType === 'all' || favorite.meal.type === filterByType;
    return matchesSearch && matchesType;
  });

  // Sort favorites
  filteredFavorites.sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      case 'cooked':
        return b.timesCooked - a.timesCooked;
      case 'name':
        return a.meal.name.localeCompare(b.meal.name);
      case 'rating':
        return (b.meal.rating?.rating || 0) - (a.meal.rating?.rating || 0);
      default:
        return 0;
    }
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


  // Calculate statistics
  const totalCookedTimes = favoriteMeals.reduce((sum, fav) => sum + fav.timesCooked, 0);
  const averageRating = favoriteMeals
    .filter(fav => fav.meal.rating)
    .reduce((sum, fav) => sum + (fav.meal.rating?.rating || 0), 0) / 
    Math.max(1, favoriteMeals.filter(fav => fav.meal.rating).length);

  const mealTypeStats = ['breakfast', 'lunch', 'dinner', 'snack'].map(type => ({
    type: type as MealType,
    count: favoriteMeals.filter(fav => fav.meal.type === type).length
  })).filter(stat => stat.count > 0);

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
      <View style={styles.mealHeader}>
        <View style={styles.mealTitleRow}>
          <Ionicons
            name={getMealTypeIcon(favorite.meal.type)}
            size={16}
            color={themeColor}
          />
          <Text style={styles.mealName}>{favorite.meal.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => removeFavorite(favorite)}
          style={styles.removeButton}
        >
          <Ionicons name="heart" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <Text style={styles.mealDescription} numberOfLines={2}>
        {favorite.meal.description}
      </Text>

      <View style={styles.mealStats}>
        <View style={styles.statRow}>
          <Ionicons name="restaurant-outline" size={14} color="#71717a" />
          <Text style={styles.statText}>
            Cooked {favorite.timesCooked} time{favorite.timesCooked !== 1 ? 's' : ''}
          </Text>
        </View>
        
        {favorite.lastCookedAt && (
          <View style={styles.statRow}>
            <Ionicons name="time-outline" size={14} color="#71717a" />
            <Text style={styles.statText}>
              Last: {new Date(favorite.lastCookedAt).toLocaleDateString()}
            </Text>
          </View>
        )}

        <View style={styles.statRow}>
          <Ionicons name="heart-outline" size={14} color="#71717a" />
          <Text style={styles.statText}>
            Added {new Date(favorite.addedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <MealRatingBadges 
        tags={favorite.meal.tags}
        rating={favorite.meal.rating}
        compact={true}
      />

      <View style={styles.mealFooter}>
        <Text style={styles.caloriesText}>
          {favorite.meal.nutritionInfo.calories} cal
        </Text>
        <Text style={styles.prepTimeText}>
          {favorite.meal.prepTime + favorite.meal.cookTime} min
        </Text>
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
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowSearchModal(true)} style={styles.headerButton}>
            <Ionicons name="search" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSortModal(true)} style={styles.headerButton}>
            <Ionicons name="options-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Favorites</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeColor }]}>
                {favoriteMeals.length}
              </Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                {averageRating.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>
                {totalCookedTimes}
              </Text>
              <Text style={styles.statLabel}>Times Cooked</Text>
            </View>
          </View>

          {/* Meal Type Distribution */}
          <View style={styles.typeDistribution}>
            <Text style={styles.distributionTitle}>By Meal Type</Text>
            <View style={styles.typeStats}>
              {mealTypeStats.map(({ type, count }) => (
                <View key={type} style={styles.typeStatItem}>
                  <Ionicons
                    name={getMealTypeIcon(type)}
                    size={16}
                    color={themeColor}
                  />
                  <Text style={styles.typeStatText}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                  <Text style={styles.typeStatCount}>{count}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Import Meal Section */}
        <View style={styles.importSection}>
          <TouchableOpacity
            style={[styles.importButton, { borderColor: themeColor }]}
            onPress={() => Alert.alert(
              'Import Custom Meal',
              'Paste JSON recipe data from AI tools or other sources to add custom meals to your favorites.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Import', onPress: () => Alert.alert('Coming Soon', 'JSON meal import feature will be available soon!') }
              ]
            )}
            activeOpacity={0.8}
          >
            <View style={styles.importIconContainer}>
              <Ionicons name="document-text" size={24} color={themeColor} />
            </View>
            <View style={styles.importTextContainer}>
              <Text style={[styles.importTitle, { color: themeColor }]}>Import Custom Meal</Text>
              <Text style={styles.importSubtitle}>Paste JSON recipe data</Text>
            </View>
            <Ionicons name="add-circle" size={20} color={themeColor} />
          </TouchableOpacity>
        </View>


        {/* Active Filters */}
        {(filterByType !== 'all' || searchQuery) && (
          <View style={styles.filtersActive}>
            <Text style={styles.filtersActiveTitle}>Active Filters:</Text>
            <View style={styles.activeFiltersRow}>
              {filterByType !== 'all' && (
                <View style={styles.activeFilter}>
                  <Text style={styles.activeFilterText}>
                    {filterByType.charAt(0).toUpperCase() + filterByType.slice(1)}
                  </Text>
                  <TouchableOpacity onPress={() => setFilterByType('all')}>
                    <Ionicons name="close" size={14} color="#71717a" />
                  </TouchableOpacity>
                </View>
              )}
              {searchQuery && (
                <View style={styles.activeFilter}>
                  <Text style={styles.activeFilterText}>
                    "{searchQuery}"
                  </Text>
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close" size={14} color="#71717a" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Meals List */}
        <View style={styles.mealsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filteredFavorites.length} Meal{filteredFavorites.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.sortIndicator}>
              Sorted by {sortBy === 'recent' ? 'Recently Added' : 
                       sortBy === 'cooked' ? 'Times Cooked' :
                       sortBy === 'name' ? 'Name' : 'Rating'}
            </Text>
          </View>

          <View style={styles.mealsList}>
            {filteredFavorites.map((favorite) => (
              <FavoriteMealCard key={favorite.mealId} favorite={favorite} />
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModalContainer}>
            <View style={styles.searchHeader}>
              <Text style={styles.searchTitle}>Search Favorites</Text>
              <TouchableOpacity
                onPress={() => setShowSearchModal(false)}
                style={styles.searchCloseButton}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#71717a" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or description..."
                placeholderTextColor="#71717a"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#71717a" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.searchFilters}>
              <Text style={styles.filtersLabel}>Filter by meal type:</Text>
              <View style={styles.typeFilters}>
                {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeFilter,
                      filterByType === type && { backgroundColor: themeColor }
                    ]}
                    onPress={() => setFilterByType(type)}
                  >
                    <Text style={[
                      styles.typeFilterText,
                      filterByType === type && { color: '#0a0a0b' }
                    ]}>
                      {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sortModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Favorites</Text>
              <TouchableOpacity
                onPress={() => setShowSortModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.sortOptions}>
              {([
                { key: 'recent', label: 'Recently Added', icon: 'time-outline' },
                { key: 'cooked', label: 'Times Cooked', icon: 'restaurant-outline' },
                { key: 'name', label: 'Name (A-Z)', icon: 'text-outline' },
                { key: 'rating', label: 'Rating', icon: 'star-outline' },
              ] as const).map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.sortOption,
                    sortBy === option.key && { backgroundColor: `${themeColor}20`, borderColor: themeColor }
                  ]}
                  onPress={() => {
                    setSortBy(option.key);
                    setShowSortModal(false);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={sortBy === option.key ? themeColor : '#71717a'}
                  />
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === option.key && { color: themeColor }
                  ]}>
                    {option.label}
                  </Text>
                  {sortBy === option.key && (
                    <Ionicons name="checkmark" size={20} color={themeColor} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#71717a',
  },
  typeDistribution: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingTop: 16,
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  typeStats: {
    gap: 8,
  },
  typeStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeStatText: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
  },
  typeStatCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    textAlign: 'center',
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filtersActive: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filtersActiveTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 8,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  activeFilterText: {
    fontSize: 12,
    color: '#ffffff',
  },
  mealsSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  sortIndicator: {
    fontSize: 12,
    color: '#71717a',
  },
  mealsList: {
    gap: 12,
  },
  mealCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  mealDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
    marginBottom: 12,
  },
  mealStats: {
    gap: 4,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: '#71717a',
  },
  mealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  caloriesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  prepTimeText: {
    fontSize: 12,
    color: '#71717a',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  searchModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    overflow: 'hidden',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  searchCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 8,
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#ffffff',
  },
  searchFilters: {
    padding: 20,
    paddingTop: 0,
  },
  filtersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  typeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeFilter: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  typeFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  sortModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    maxHeight: '60%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortOptions: {
    padding: 20,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  sortOptionText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  importSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  importIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  importTextContainer: {
    flex: 1,
  },
  importTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  importSubtitle: {
    fontSize: 12,
    color: '#71717a',
  },
});