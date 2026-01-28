/**
 * Premium feature definitions and utilities
 * Define what features require JSON Pro access
 */

export enum PremiumFeature {
  UNLIMITED_WORKOUTS = 'unlimited_workouts',
  ADVANCED_ANALYTICS = 'advanced_analytics',
  CLOUD_SYNC = 'cloud_sync',
  CUSTOM_EXERCISES = 'custom_exercises',
  WORKOUT_TEMPLATES = 'workout_templates',
  PROGRESS_TRACKING = 'progress_tracking',
  EXPORT_DATA = 'export_data',
}

// Define which features require premium access
export const PREMIUM_FEATURES = {
  [PremiumFeature.UNLIMITED_WORKOUTS]: {
    name: 'Unlimited Workouts',
    description: 'Create unlimited custom workout routines',
    freeLimit: 3, // Free users can create 3 workouts
  },
  [PremiumFeature.ADVANCED_ANALYTICS]: {
    name: 'Advanced Analytics',
    description: 'Detailed progress tracking and insights',
    freeLimit: null, // Not available for free users
  },
  [PremiumFeature.CLOUD_SYNC]: {
    name: 'Cloud Sync',
    description: 'Sync your workouts across devices',
    freeLimit: null,
  },
  [PremiumFeature.CUSTOM_EXERCISES]: {
    name: 'Custom Exercises',
    description: 'Add your own custom exercises',
    freeLimit: 5, // Free users can add 5 custom exercises
  },
  [PremiumFeature.WORKOUT_TEMPLATES]: {
    name: 'Workout Templates',
    description: 'Save and reuse workout templates',
    freeLimit: 2,
  },
  [PremiumFeature.PROGRESS_TRACKING]: {
    name: 'Progress Tracking',
    description: 'Track your progress over time',
    freeLimit: null,
  },
  [PremiumFeature.EXPORT_DATA]: {
    name: 'Export Data',
    description: 'Export your workout data',
    freeLimit: null,
  },
};

/**
 * Check if a feature requires premium access
 */
export const isPremiumFeature = (feature: PremiumFeature): boolean => {
  return Object.values(PremiumFeature).includes(feature);
};

/**
 * Get the free limit for a feature (if any)
 */
export const getFeatureFreeLimit = (feature: PremiumFeature): number | null => {
  return PREMIUM_FEATURES[feature]?.freeLimit || null;
};

/**
 * Get feature information
 */
export const getFeatureInfo = (feature: PremiumFeature) => {
  return PREMIUM_FEATURES[feature];
};

/**
 * Check if user has exceeded free limit for a feature
 */
export const hasExceededFreeLimit = (
  feature: PremiumFeature,
  currentUsage: number
): boolean => {
  const limit = getFeatureFreeLimit(feature);
  if (limit === null) return true; // Feature not available for free
  return currentUsage >= limit;
};

/**
 * Get usage message for a feature
 */
export const getFeatureUsageMessage = (
  feature: PremiumFeature,
  currentUsage: number
): string => {
  const limit = getFeatureFreeLimit(feature);
  const featureInfo = getFeatureInfo(feature);
  
  if (limit === null) {
    return `${featureInfo.name} requires Pro access`;
  }
  
  if (currentUsage >= limit) {
    return `You've reached the limit of ${limit} for ${featureInfo.name}. Upgrade to Pro for unlimited access.`;
  }
  
  return `${currentUsage}/${limit} ${featureInfo.name} used`;
};