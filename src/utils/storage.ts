import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkoutRoutine {
  id: string;
  name: string;
  days: number;
  blocks: number;
  data?: any;
}

export interface WorkoutHistory {
  id: string;
  routineName: string;
  dayName: string;
  exerciseName: string;
  date: string;
  sets: {
    setNumber: number;
    weight: string;
    reps: string;
    completed: boolean;
    drops?: {
      weight: string;
      reps: string;
      completed?: boolean;
    }[];
  }[];
}

export interface FeedbackEntry {
  id: string;
  feedback: 'positive' | 'negative';
  timestamp: string;
  programId?: string;
  details?: string;
}

const STORAGE_KEYS = {
  ROUTINES: 'workout_routines',
  HISTORY: 'workout_history',
  CURRENT_WORKOUT: 'current_workout_progress',
  FEEDBACK: 'import_feedback',
};

export class WorkoutStorage {
  // Routine management
  static async saveRoutines(routines: WorkoutRoutine[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
    } catch (error) {
      console.error('Failed to save routines:', error);
    }
  }

  static async loadRoutines(): Promise<WorkoutRoutine[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load routines:', error);
      return [];
    }
  }

  static async addRoutine(routine: WorkoutRoutine): Promise<void> {
    const routines = await this.loadRoutines();
    routines.push(routine);
    await this.saveRoutines(routines);
  }

  static async removeRoutine(routineId: string): Promise<void> {
    const routines = await this.loadRoutines();
    const filtered = routines.filter(r => r.id !== routineId);
    await this.saveRoutines(filtered);
  }

  // Workout history management
  static async saveWorkoutHistory(history: WorkoutHistory[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save workout history:', error);
    }
  }

  static async loadWorkoutHistory(): Promise<WorkoutHistory[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load workout history:', error);
      return [];
    }
  }

  static async addWorkoutEntry(entry: WorkoutHistory): Promise<void> {
    const history = await this.loadWorkoutHistory();
    history.push(entry);
    await this.saveWorkoutHistory(history);
  }

  static async getExerciseHistory(exerciseName: string): Promise<WorkoutHistory[]> {
    const history = await this.loadWorkoutHistory();
    return history.filter(entry => entry.exerciseName === exerciseName);
  }

  // Current workout progress (for resuming sessions)
  static async saveCurrentWorkout(workoutData: any): Promise<void> {
    try {
      const dataWithTimestamp = {
        ...workoutData,
        savedAt: Date.now()
      };
      const workoutKey = `${STORAGE_KEYS.CURRENT_WORKOUT}_${workoutData.day?.day_name}_${workoutData.blockName}`;
      await AsyncStorage.setItem(workoutKey, JSON.stringify(dataWithTimestamp));
    } catch (error) {
      console.error('Failed to save current workout:', error);
    }
  }

  static async loadCurrentWorkout(dayName?: string, blockName?: string): Promise<any> {
    try {
      if (dayName && blockName) {
        const workoutKey = `${STORAGE_KEYS.CURRENT_WORKOUT}_${dayName}_${blockName}`;
        const data = await AsyncStorage.getItem(workoutKey);
        return data ? JSON.parse(data) : null;
      } else {
        // Fallback to old key for backwards compatibility
        const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_WORKOUT);
        return data ? JSON.parse(data) : null;
      }
    } catch (error) {
      console.error('Failed to load current workout:', error);
      return null;
    }
  }

  static async clearCurrentWorkout(dayName?: string, blockName?: string): Promise<void> {
    try {
      if (dayName && blockName) {
        const workoutKey = `${STORAGE_KEYS.CURRENT_WORKOUT}_${dayName}_${blockName}`;
        await AsyncStorage.removeItem(workoutKey);
      } else {
        // Clear old key for backwards compatibility
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_WORKOUT);
      }
    } catch (error) {
      console.error('Failed to clear current workout:', error);
    }
  }

  // Feedback management
  static async saveFeedback(feedback: FeedbackEntry): Promise<void> {
    try {
      const existingFeedback = await this.loadFeedback();
      
      // Check if feedback already exists for this program to avoid duplicates
      if (feedback.programId) {
        const existingEntry = existingFeedback.find(f => f.programId === feedback.programId);
        if (existingEntry) {
          return; // Don't save duplicate feedback for same program
        }
      }
      
      existingFeedback.push(feedback);
      await AsyncStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(existingFeedback));
    } catch (error) {
      console.error('Failed to save feedback:', error);
    }
  }

  static async loadFeedback(): Promise<FeedbackEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.FEEDBACK);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load feedback:', error);
      return [];
    }
  }

  // TODO: Future enhancement - sync feedback to analytics endpoint
  // static async syncFeedbackToServer(): Promise<void> {
  //   const feedback = await this.loadFeedback();
  //   const unsynced = feedback.filter(f => !f.synced);
  //   
  //   for (const entry of unsynced) {
  //     try {
  //       await fetch('/api/feedback', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify(entry)
  //       });
  //       entry.synced = true;
  //     } catch (error) {
  //       console.error('Failed to sync feedback entry:', entry.id);
  //     }
  //   }
  //   
  //   await AsyncStorage.setItem(STORAGE_KEYS.FEEDBACK, JSON.stringify(feedback));
  // }

  static async hasFeedbackForProgram(programId: string): Promise<boolean> {
    try {
      const feedback = await this.loadFeedback();
      return feedback.some(f => f.programId === programId);
    } catch (error) {
      console.error('Failed to check feedback for program:', error);
      return false;
    }
  }

  // Utility methods
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ROUTINES,
        STORAGE_KEYS.HISTORY,
        STORAGE_KEYS.CURRENT_WORKOUT,
        STORAGE_KEYS.FEEDBACK,
      ]);
    } catch (error) {
      console.error('Failed to clear all data:', error);
    }
  }
}