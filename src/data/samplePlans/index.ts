import foundationsData from './foundations.json';
import builderData from './builder.json';
import massData from './mass.json';

export interface SamplePlan {
  id: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  image?: any; // optional hero image (require(...) asset or { uri })
  raw: any; // the full workout JSON (the importable payload)
  summary: {
    routine_name: string;
    weeks: number;
    daysPerWeek: number;
    split: string;
    exerciseCount: number;
    days: Array<{
      day_name: string;
      exerciseCount: number;
    }>;
  };
}

// blocks[0].weeks is a STRING like "1-4" — parse to the week count (4).
function parseWeeks(weeksString: string): number {
  if (!weeksString) return 1;
  if (weeksString.includes('-')) {
    const parts = weeksString.split('-');
    return parseInt(parts[1], 10) || 1;
  }
  return parseInt(weeksString, 10) || 1;
}

// A "training day" is any day in the block that actually has exercises.
// We do NOT rely on a `type` field on the days[] entries — in the plan JSON
// the type lives on weekly_schedule, while days[] entries only carry
// day_name + exercises. REST DAY entries have an empty exercises array.
function isTrainingDay(day: any): boolean {
  const name = (day?.day_name || '').toLowerCase();
  if (name.includes('rest')) return false;
  return Array.isArray(day?.exercises) && day.exercises.length > 0;
}

function computeSummary(raw: any, explicitSplit: string): SamplePlan['summary'] {
  const firstBlock = raw.blocks?.[0];
  const trainingDays = (firstBlock?.days || []).filter(isTrainingDay);

  return {
    routine_name: raw.routine_name || 'Unknown Program',
    weeks: parseWeeks(firstBlock?.weeks),
    daysPerWeek: raw.days_per_week || trainingDays.length,
    split: explicitSplit,
    exerciseCount: trainingDays.reduce(
      (total: number, day: any) => total + (day.exercises?.length || 0),
      0
    ),
    days: trainingDays.map((day: any) => ({
      day_name: day.day_name,
      exerciseCount: day.exercises?.length || 0,
    })),
  };
}

export const SAMPLE_PLANS: SamplePlan[] = [
  {
    id: 'foundations',
    level: 'BEGINNER',
    raw: foundationsData,
    summary: computeSummary(foundationsData, 'Full Body'),
  },
  {
    id: 'builder',
    level: 'INTERMEDIATE',
    raw: builderData,
    summary: computeSummary(builderData, 'Upper/Lower'),
  },
  {
    id: 'mass',
    level: 'ADVANCED',
    raw: massData,
    summary: computeSummary(massData, 'Push/Pull/Legs'),
  },
];