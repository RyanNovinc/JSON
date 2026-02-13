export interface WorkoutProgram {
  routine_name: string;
  description?: string;
  days_per_week: number;
  blocks: Array<{
    block_name: string;
    weeks: string;
    structure?: string;
    days: Array<{
      day_name: string;
      estimated_duration?: number;
      exercises: Array<{
        exercise: string;
        sets: number;
        reps: string;
        reps_weekly?: { [week: string]: string };
        rest: number;
        restQuick?: number;
        notes?: string;
        alternatives?: string[];
      }>;
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