import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import MealRatingBadges from '../components/MealRatingBadges';
import { MealRating, MealTag } from '../types/nutrition';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function MealRatingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const { currentMealPlan, getMealHistory } = useMealPlanning();

  const [filterRating, setFilterRating] = useState<number | null>(null);

  if (!currentMealPlan) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meal Ratings</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Ratings Yet</Text>
          <Text style={styles.emptyDescription}>
            Start cooking meals and rate them to see your history here.
          </Text>
        </View>
      </View>
    );
  }

  // Get all meals with ratings from the current plan
  const mealsWithRatings = currentMealPlan.days
    .flatMap(day => day.meals)
    .filter(meal => meal.rating)
    .sort((a, b) => 
      new Date(b.rating?.createdAt || '').getTime() - new Date(a.rating?.createdAt || '').getTime()
    );

  // Filter by rating if selected
  const filteredMeals = filterRating 
    ? mealsWithRatings.filter(meal => meal.rating?.rating === filterRating)
    : mealsWithRatings;

  // Calculate statistics
  const totalRated = mealsWithRatings.length;
  const averageRating = totalRated > 0 
    ? mealsWithRatings.reduce((sum, meal) => sum + (meal.rating?.rating || 0), 0) / totalRated
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: mealsWithRatings.filter(meal => meal.rating?.rating === rating).length,
    percentage: totalRated > 0 ? (mealsWithRatings.filter(meal => meal.rating?.rating === rating).length / totalRated) * 100 : 0,
  }));

  // Get most common tags from highly rated meals (4+ stars)
  const topTags = mealsWithRatings
    .filter(meal => (meal.rating?.rating || 0) >= 4)
    .flatMap(meal => meal.tags)
    .reduce((acc: Record<string, number>, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

  const sortedTags = Object.entries(topTags)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag, count]) => ({ tag: tag as MealTag, count }));

  const RatingFilterButton = ({ rating }: { rating: number }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterRating === rating && { backgroundColor: themeColor }
      ]}
      onPress={() => setFilterRating(filterRating === rating ? null : rating)}
    >
      <View style={styles.filterButtonContent}>
        <Ionicons
          name="star"
          size={16}
          color={filterRating === rating ? '#0a0a0b' : '#f59e0b'}
        />
        <Text style={[
          styles.filterButtonText,
          filterRating === rating && { color: '#0a0a0b' }
        ]}>
          {rating}+
        </Text>
      </View>
    </TouchableOpacity>
  );

  const RatedMealCard = ({ meal }: { meal: typeof mealsWithRatings[0] }) => (
    <TouchableOpacity
      style={styles.mealCard}
      onPress={() => navigation.navigate('MealDetail' as any, { meal })}
      activeOpacity={0.8}
    >
      <View style={styles.mealCardHeader}>
        <Text style={styles.mealName}>{meal.name}</Text>
        <Text style={styles.mealDate}>
          {new Date(meal.rating?.createdAt || '').toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.mealDescription} numberOfLines={2}>
        {meal.description}
      </Text>

      <View style={styles.ratingSection}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= (meal.rating?.rating || 0) ? 'star' : 'star-outline'}
              size={16}
              color={star <= (meal.rating?.rating || 0) ? '#f59e0b' : '#3f3f46'}
            />
          ))}
        </View>
        <Text style={styles.ratingText}>
          {meal.rating?.rating}/5
        </Text>
      </View>

      {meal.rating?.feedback && (
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackText}>{meal.rating.feedback}</Text>
        </View>
      )}

      <MealRatingBadges 
        tags={meal.tags} 
        compact={true}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Ratings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistics */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Rating Stats</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: themeColor }]}>
                {totalRated}
              </Text>
              <Text style={styles.statLabel}>Meals Rated</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                {averageRating.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Average Rating</Text>
            </View>
          </View>

          {/* Rating Distribution */}
          <View style={styles.distributionSection}>
            <Text style={styles.distributionTitle}>Rating Distribution</Text>
            {ratingDistribution.map(({ rating, count, percentage }) => (
              <View key={rating} style={styles.distributionRow}>
                <View style={styles.distributionLeft}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.distributionRating}>{rating}</Text>
                </View>
                <View style={styles.distributionBar}>
                  <View
                    style={[
                      styles.distributionFill,
                      { width: `${percentage}%`, backgroundColor: themeColor }
                    ]}
                  />
                </View>
                <Text style={styles.distributionCount}>{count}</Text>
              </View>
            ))}
          </View>

          {/* Top Tags */}
          {sortedTags.length > 0 && (
            <View style={styles.topTagsSection}>
              <Text style={styles.topTagsTitle}>Your Favorite Meal Types</Text>
              <View style={styles.topTagsList}>
                {sortedTags.map(({ tag, count }) => (
                  <View key={tag} style={[styles.topTag, { borderColor: themeColor }]}>
                    <Text style={[styles.topTagText, { color: themeColor }]}>
                      {tag.replace('_', ' ')}
                    </Text>
                    <Text style={styles.topTagCount}>({count})</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Filter Buttons */}
        {totalRated > 0 && (
          <View style={styles.filtersSection}>
            <Text style={styles.filtersTitle}>Filter by Rating</Text>
            <View style={styles.filtersRow}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  !filterRating && { backgroundColor: themeColor }
                ]}
                onPress={() => setFilterRating(null)}
              >
                <Text style={[
                  styles.filterButtonText,
                  !filterRating && { color: '#0a0a0b' }
                ]}>
                  All
                </Text>
              </TouchableOpacity>
              {[5, 4, 3, 2, 1].map(rating => (
                <RatingFilterButton key={rating} rating={rating} />
              ))}
            </View>
          </View>
        )}

        {/* Rated Meals List */}
        {filteredMeals.length > 0 && (
          <View style={styles.mealsSection}>
            <Text style={styles.mealsTitle}>
              {filterRating 
                ? `${filterRating}-Star Meals (${filteredMeals.length})`
                : `Recent Ratings (${filteredMeals.length})`
              }
            </Text>
            
            <View style={styles.mealsList}>
              {filteredMeals.map((meal) => (
                <RatedMealCard key={meal.id} meal={meal} />
              ))}
            </View>
          </View>
        )}

        {filteredMeals.length === 0 && filterRating && (
          <View style={styles.noResultsState}>
            <Ionicons name="search" size={48} color="#3f3f46" />
            <Text style={styles.noResultsTitle}>No {filterRating}-Star Meals</Text>
            <Text style={styles.noResultsDescription}>
              Try a different rating filter or cook more meals!
            </Text>
          </View>
        )}

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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
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
  distributionSection: {
    marginBottom: 24,
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  distributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 32,
  },
  distributionRating: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  distributionBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#27272a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: 12,
    color: '#71717a',
    minWidth: 24,
    textAlign: 'right',
  },
  topTagsSection: {
    marginBottom: 8,
  },
  topTagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  topTagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topTag: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  topTagText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  topTagCount: {
    fontSize: 10,
    color: '#71717a',
  },
  filtersSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  mealsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mealsTitle: {
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  mealDate: {
    fontSize: 12,
    color: '#71717a',
  },
  mealDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
    marginBottom: 12,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  feedbackSection: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontStyle: 'italic',
    lineHeight: 16,
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
  noResultsState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsDescription: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});