import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { MealTag, MealRating } from '../types/nutrition';

interface MealRatingBadgesProps {
  tags: MealTag[];
  rating?: MealRating | null;
  showRatingStars?: boolean;
  compact?: boolean;
}

export const MealRatingBadges: React.FC<MealRatingBadgesProps> = ({
  tags,
  rating,
  showRatingStars = false,
  compact = false,
}) => {
  const { themeColor } = useTheme();

  const getTagConfig = (tag: MealTag) => {
    const configs = {
      easy: {
        icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
        color: '#22c55e',
        label: 'Easy',
        description: 'Simple to prepare',
      },
      delicious: {
        icon: 'star' as keyof typeof Ionicons.glyphMap,
        color: '#f59e0b',
        label: 'Delicious',
        description: 'Highly rated for taste',
      },
      meal_prep: {
        icon: 'archive' as keyof typeof Ionicons.glyphMap,
        color: '#a855f7',
        label: 'Meal Prep',
        description: 'Great for batch cooking',
      },
      quick: {
        icon: 'time' as keyof typeof Ionicons.glyphMap,
        color: '#06b6d4',
        label: 'Quick',
        description: 'Ready in under 30 minutes',
      },
      budget_friendly: {
        icon: 'cash' as keyof typeof Ionicons.glyphMap,
        color: '#65a30d',
        label: 'Budget Friendly',
        description: 'Cost-effective ingredients',
      },
      high_protein: {
        icon: 'fitness' as keyof typeof Ionicons.glyphMap,
        color: '#dc2626',
        label: 'High Protein',
        description: '25g+ protein per serving',
      },
      low_carb: {
        icon: 'leaf' as keyof typeof Ionicons.glyphMap,
        color: '#16a34a',
        label: 'Low Carb',
        description: 'Under 20g net carbs',
      },
      vegetarian: {
        icon: 'leaf-outline' as keyof typeof Ionicons.glyphMap,
        color: '#84cc16',
        label: 'Vegetarian',
        description: 'No meat or fish',
      },
      vegan: {
        icon: 'leaf' as keyof typeof Ionicons.glyphMap,
        color: '#22c55e',
        label: 'Vegan',
        description: 'Plant-based only',
      },
      gluten_free: {
        icon: 'medical' as keyof typeof Ionicons.glyphMap,
        color: '#f97316',
        label: 'Gluten Free',
        description: 'No gluten ingredients',
      },
    };

    return configs[tag] || {
      icon: 'checkmark' as keyof typeof Ionicons.glyphMap,
      color: themeColor,
      label: tag ? tag.replace('_', ' ') : 'Unknown',
      description: '',
    };
  };

  const renderRatingStars = () => {
    if (!rating || !showRatingStars) return null;

    return (
      <View style={styles.ratingContainer}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= rating.rating ? 'star' : 'star-outline'}
              size={compact ? 12 : 16}
              color={star <= rating.rating ? '#f59e0b' : '#3f3f46'}
            />
          ))}
        </View>
        {!compact && rating.feedback && (
          <Text style={styles.ratingFeedback} numberOfLines={2}>
            {rating.feedback}
          </Text>
        )}
      </View>
    );
  };

  const renderTags = () => {
    if (tags.length === 0) return null;

    return (
      <View style={[styles.tagsContainer, compact && styles.tagsContainerCompact]}>
        {tags.slice(0, compact ? 3 : tags.length).map((tag, index) => {
          const config = getTagConfig(tag);
          
          return (
            <View
              key={index}
              style={[
                styles.tagBadge,
                compact && styles.tagBadgeCompact,
                { borderColor: config.color, backgroundColor: `${config.color}15` }
              ]}
            >
              <Ionicons 
                name={config.icon} 
                size={compact ? 10 : 12} 
                color={config.color} 
              />
              <Text style={[
                styles.tagText,
                compact && styles.tagTextCompact,
                { color: config.color }
              ]}>
                {config.label}
              </Text>
            </View>
          );
        })}
        
        {compact && tags.length > 3 && (
          <View style={[styles.tagBadge, styles.tagBadgeCompact, { borderColor: '#71717a' }]}>
            <Text style={[styles.tagText, styles.tagTextCompact, { color: '#71717a' }]}>
              +{tags.length - 3}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {renderTags()}
      {renderRatingStars()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  containerCompact: {
    gap: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagsContainerCompact: {
    gap: 4,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  tagBadgeCompact: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  tagTextCompact: {
    fontSize: 9,
    fontWeight: '600',
  },
  ratingContainer: {
    gap: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingFeedback: {
    fontSize: 12,
    color: '#71717a',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

export default MealRatingBadges;