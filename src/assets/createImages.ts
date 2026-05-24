// ============================================================================
// Create chooser image registry
// Theme-neutral — single image per category (workout vs nutrition).
// ============================================================================

const CREATE_IMAGES: Record<string, any> = {
  workout: require('./create/workout.png'),
  nutrition: require('./create/nutrition.png'),
};

export function getCreateImage(type: 'workout' | 'nutrition'): any {
  return CREATE_IMAGES[type];
}