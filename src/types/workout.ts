// Union type for all exercise types
export type Exercise = StrengthExercise | CardioExercise | StretchExercise | CircuitExercise | SportExercise;

// Type 1: Strength (gym work — the current rigid structure, enhanced)
export interface StrengthExercise {
  type: 'strength';
  exercise: string;                // Freeform name, e.g., "Barbell Back Squat"
  sets: number;
  reps: string;                    // e.g., "8-12"
  rest: number;                    // seconds (optimal rest)
  restQuick?: number;              // seconds (quick mode rest)
  reps_weekly?: { [week: string]: string };
  sets_weekly?: { [week: string]: number };
  notes?: string;
  alternatives?: Array<{
    exercise: string;
    primaryMuscles: string[];
    secondaryMuscles: string[];
  }>;
  primaryMuscles: string[];        // REQUIRED — from the muscle taxonomy
  secondaryMuscles: string[];      // REQUIRED — from the muscle taxonomy
  superset_group?: string;         // Optional — groups exercises for automatic superset linking
}

// Type 2: Cardio (progressive tracking with structured numeric fields)
export interface CardioExercise {
  type: 'cardio';
  activity: string;                // e.g., "Treadmill Run", "Stationary Bike", "Rowing Machine"
  duration_minutes: number;
  distance_value?: number;         // e.g., 5
  distance_unit?: 'km' | 'miles';  // e.g., "km"
  target_intensity?: string;       // e.g., "Zone 2", "Conversational pace", "80% MHR"
  cardio_mode?: string;            // e.g., "steady_state", "intervals", "HIIT"
  progression_weekly?: { [week: string]: string };  // e.g., {"1": "20 min easy", "4": "30 min moderate"}
  notes?: string;                  // interval breakdowns, RPE guidance, etc.
}

// Type 3: Stretch (structured, time-based — each movement tracked individually)
export interface StretchExercise {
  type: 'stretch';
  exercise: string;                // e.g., "Pigeon Stretch", "Hamstring Hold"
  hold_seconds: number;            // e.g., 45
  sets: number;                    // e.g., 2
  per_side: boolean;               // true = do each side, false = bilateral
  notes?: string;
  primaryMuscles: string[];        // from the muscle taxonomy
}

// Type 4: Circuit (logged as a completed unit, not individual exercises)
export interface CircuitExercise {
  type: 'circuit';
  circuit_name: string;            // e.g., "Core Finisher Circuit"
  rounds: number;                  // e.g., 4
  work_seconds: number;            // e.g., 40
  rest_seconds: number;            // e.g., 20
  exercises: Array<{
    exercise: string;
    notes?: string;
  }>;
  notes?: string;                  // overall circuit notes
}

// Type 5: Sport/Social (just a placeholder — track attendance only)
export interface SportExercise {
  type: 'sport';
  activity: string;                // e.g., "Basketball", "Rock Climbing", "Soccer"
  duration_minutes?: number;       // e.g., 60
  notes?: string;
}

export interface WorkoutProgram {
  routine_name: string;
  description?: string;
  days_per_week: number;
  blocks: Array<{
    block_name: string;
    weeks: string;                  // e.g., "1-4"
    structure?: string;             // e.g., "Push Pull Legs"
    deload_weeks?: number[];        // e.g., [4] means week 4 of this block is a deload
    deload_guidance?: {
      weight_percentage: number;    // e.g., 60 for 60% of previous week
      rep_range: string;            // e.g., "8-10" — typically Week 1 reps
      notes: string;                // e.g., "Use 60% of Week 3 weight. Focus on form and recovery."
    };
    days: Array<{
      day_name: string;
      estimated_duration?: number;  // minutes
      exercises: Array<Exercise>;   // Uses the Exercise union type above
    }>;
  }>;
  id?: string;
}

export interface SampleWorkout {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Custom';
  focus: string;
  program: WorkoutProgram;
  detailInfo: {
    overview: string;
    highlights: string[];
    targetMuscles: string;
    restPeriods: string;
    progression: string;
    equipment: string;
  };
}