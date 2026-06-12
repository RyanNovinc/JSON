/**
 * Test factory and seed helpers for persistence testing
 */

import { WorkoutHistory, WorkoutRoutine, MealPlan } from '../storage';
import { Program } from '../../data/programStorage';

// Factory: Create a WorkoutHistory entry
export function makeWorkoutHistory(overrides: Partial<WorkoutHistory> = {}): WorkoutHistory {
  return {
    id: `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    routineName: 'Test Routine',
    dayName: 'Day 1',
    exerciseName: 'Bench Press',
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    sets: [
      {
        setNumber: 1,
        weight: '135',
        reps: '10',
        completed: true,
        unit: 'lbs'
      }
    ],
    ...overrides
  };
}

// Factory: Create a Program
export function makeProgram(overrides: Partial<Program> = {}): Program {
  const id = `program_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    name: 'Test Program',
    createdAt: new Date().toISOString(),
    programDuration: '6_months',
    totalMesocycles: 3,
    currentMesocycle: 1,
    mesocycleRoadmap: [],
    mesocycleRoadmapText: 'Test roadmap',
    completedMesocycles: [],
    routineIds: [],
    ...overrides
  };
}

// Factory: Create a WorkoutRoutine
export function makeRoutine(overrides: Partial<WorkoutRoutine> = {}): WorkoutRoutine {
  const id = `routine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    name: 'Test Routine',
    days: 3,
    blocks: 4,
    data: {
      days: [
        {
          day_name: 'Day 1',
          exercises: [
            {
              exercise: 'Bench Press',
              sets: 3,
              reps: '8-12'
            }
          ]
        }
      ]
    },
    createdAt: Date.now(),
    ...overrides
  };
}

// Factory: Create a single set object
export function makeSet(overrides: {
  setNumber?: number;
  weight?: string;
  reps?: string;
  completed?: boolean;
  unit?: 'kg' | 'lbs';
} = {}) {
  return {
    setNumber: 1,
    weight: '135',
    reps: '10',
    completed: true,
    unit: 'lbs' as 'kg' | 'lbs',
    ...overrides
  };
}

// Seed helper: Create multiple workout history entries for an exercise
export function seedHistory(exerciseName: string, sessions: Array<{
  date?: string;
  sets: Array<{
    weight: string;
    reps: string;
    completed?: boolean;
  }>;
}>): WorkoutHistory[] {
  return sessions.map((session, index) => {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - (sessions.length - index - 1) * 2); // Space sessions 2 days apart
    
    return makeWorkoutHistory({
      exerciseName,
      date: session.date || baseDate.toISOString().split('T')[0],
      sets: session.sets.map((set, setIndex) => makeSet({
        setNumber: setIndex + 1,
        weight: set.weight,
        reps: set.reps,
        completed: set.completed ?? true
      }))
    });
  });
}

// Helper: Generate unique exercise names for testing
export function makeExerciseName(base: string = 'Exercise'): string {
  return `${base} ${Math.random().toString(36).substr(2, 6)}`;
}