import AsyncStorage from '@react-native-async-storage/async-storage';
import RobustStorage from './robustStorage';

/**
 * Favourite-exercise persistence, shared by the Exercises segment of
 * SavedWorkoutsScreen.
 *
 * The store is a single `favoriteExercises` key holding a JSON array. It
 * predates WorkoutStorage and is read/written directly through RobustStorage
 * with a legacy AsyncStorage fallback — FavoriteExercisesScreen (still live for
 * the workout flow's selectionMode) keeps its own inline copy of this logic, so
 * the read/write contract here must stay byte-compatible with it: same key,
 * same JSON array shape, same `useRobust = true` flag.
 */

export interface FavoriteExercise {
  id: string;
  name: string;
  category: 'gym' | 'bodyweight' | 'flexibility' | 'cardio' | 'custom';
  customCategory?: string;
  muscleGroups: string[]; // Legacy field for backward compatibility
  primaryMuscles?: string[]; // New field for primary target muscles
  secondaryMuscles?: string[]; // New field for secondary involvement
  instructions?: string;
  notes?: string;
  addedAt: string;
  // Activity metrics to match meal format
  estimatedCalories?: number;
  duration?: number; // minutes
  intensity?: 'low' | 'moderate' | 'high';
}

const STORAGE_KEY = 'favoriteExercises';

// Entries written by older builds can be missing an id, or share one. Either
// case breaks React keys, so repair them on read (and write the repair back).
function withUniqueIds(exercises: FavoriteExercise[]): FavoriteExercise[] {
  const seenIds = new Set<string>();
  return exercises.map((exercise, index) => {
    const hasValidId =
      exercise.id && typeof exercise.id === 'string' && exercise.id.length > 0;
    const needsNewId = !hasValidId || seenIds.has(exercise.id);
    if (needsNewId) {
      const newId = `exercise_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(
        `🏋️ [FAVORITES] Fixed id for exercise "${exercise.name}": ${exercise.id} -> ${newId}`
      );
      seenIds.add(newId);
      return { ...exercise, id: newId };
    }
    seenIds.add(exercise.id);
    return exercise;
  });
}

export async function loadFavoriteExercises(): Promise<FavoriteExercise[]> {
  try {
    let savedData = await RobustStorage.getItem(STORAGE_KEY, true);

    if (!savedData) {
      // Fallback to legacy storage, then migrate it forward.
      savedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedData) {
        console.log('🏋️ [FAVORITES] 🔄 Migrating legacy data to robust storage...');
        await RobustStorage.setItem(STORAGE_KEY, savedData, true);
      }
    }

    if (!savedData) return [];

    const parsed = JSON.parse(savedData);
    if (!Array.isArray(parsed)) {
      console.warn('⚠️ [FAVORITES] Favourite exercises data is corrupted, treating as empty');
      return [];
    }

    const repaired = withUniqueIds(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(repaired)) {
      console.log('🏋️ [FAVORITES] 🧹 Saving cleaned exercise data back to robust storage');
      await RobustStorage.setItem(STORAGE_KEY, JSON.stringify(repaired), true);
    }
    return repaired;
  } catch (error) {
    console.error('🏋️ [FAVORITES] Failed to load favourite exercises:', error);
    return [];
  }
}

export async function saveFavoriteExercises(exercises: FavoriteExercise[]): Promise<void> {
  try {
    const saveSuccess = await RobustStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(exercises),
      true
    );
    if (!saveSuccess) {
      console.error('🏋️ [FAVORITES] ❌ Robust save failed, trying emergency fallback...');
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
    }
  } catch (error) {
    console.error('🏋️ [FAVORITES] Failed to save favourite exercises:', error);
  }
}
