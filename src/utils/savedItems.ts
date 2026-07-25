import { WorkoutRoutine, MealPlan } from './storage';
import { CuratedMeal } from '../types/curated_meals';

/**
 * Pure helpers behind the two Saved screens (SavedWorkoutsScreen and
 * SavedNutritionScreen). Lifted verbatim out of the old LibraryScreen when the
 * Library tab was split into per-domain Saved screens — both screens render the
 * same card shapes, so the maths lives here rather than being copied twice.
 */

// Collapse a list so each logical item appears once. Saved workouts / meal
// plans can end up with two entries sharing the same id (e.g. a plan re-added
// through an older save path). Duplicate ids crash the list with a
// "two children with the same key" React error AND make items bleed between
// tabs as React reconciles non-unique keys. De-duping here is a defensive
// guard so the same plan only ever renders once regardless of what storage
// hands back.
export function dedupeByKey<T>(arr: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const k = keyFn(item);
    if (!k || seen.has(k)) return seen.has(k) ? false : (seen.add(k), true);
    seen.add(k);
    return true;
  });
}

// Mirrors the formatter in RecipeDetailScreen so the screens agree:
// 5 → "5m", 45 → "45m", 60 → "1h", 90 → "1h 30m", 510 → "8h 30m".
export function formatTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

// Pulls the headline summary for a favourite recipe card. Reads from the
// FIRST plate + FIRST method, exactly like NutritionHomeScreen.getCardSummary
// and RecipeDetailScreen — macros live on plates[0].plate_macros, NOT on the
// meal object, and time is methods[0].time_total_minutes.
export function getRecipeSummary(meal: CuratedMeal): {
  name: string;
  cuisine: string;
  kcal: number;
  protein: number;
  totalMinutes: number;
} {
  const firstPlate = meal.plates?.[0];
  const firstMethod = meal.methods?.[0];
  return {
    name: firstPlate?.display_name || meal.display_name,
    cuisine: meal.cuisine ?? '',
    kcal: firstPlate?.plate_macros?.kcal ?? 0,
    protein: firstPlate?.plate_macros?.protein_g ?? 0,
    totalMinutes: firstMethod?.time_total_minutes ?? 0,
  };
}

// Week-span helper: "1-4" → 4, "5" → 1. Same parsing as HomeScreen's
// resolveBlockPosition, so the saved card and the hero badge always agree.
export const spanOfWeeks = (w: any): number => {
  const s = String(w ?? '1');
  if (s.includes('-')) {
    const [lo, hi] = s.split('-').map((x: string) => parseInt(x, 10));
    return Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo ? hi - lo + 1 : 1;
  }
  return 1;
};

// Program weeks label — summed across ALL blocks (e.g. "12wk"), so it agrees
// with the home hero's WEEK N OF M badge.
export const getWeeksLabel = (routine: WorkoutRoutine): string => {
  const blocks = routine.data?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return '—';
  const total = blocks.reduce((t: number, b: any) => t + spanOfWeeks(b?.weeks), 0);
  return total > 0 ? `${total}wk` : '—';
};

// Average daily kcal + protein across a saved plan. Handles all three shapes a
// saved plan can take: SimplifiedMealPlan (data.dailyMeals, keyed by date),
// legacy data.days[], and legacy data.weeks[0].days[]. Keeps the saved card in
// lockstep with MealPlanPreviewScreen, which reads the same shapes — a saved
// plan stores dailyMeals, so the old days-only version always returned null
// here and the card showed "—".
export const getPlanDailyAverages = (
  plan: MealPlan
): { kcal: number; protein: number } | null => {
  const data: any = plan.data;
  let days: any[] | null = null;

  if (data?.dailyMeals && typeof data.dailyMeals === 'object') {
    days = Object.values(data.dailyMeals);
  } else if (data?.days?.length) {
    days = data.days;
  } else if (data?.weeks?.[0]?.days?.length) {
    days = data.weeks[0].days;
  }
  if (!days) return null;

  let kcal = 0;
  let protein = 0;
  let n = 0;
  for (const day of days) {
    if (!day?.meals?.length) continue;
    kcal += day.meals.reduce((t: number, m: any) => t + (m.calories || 0), 0);
    protein += day.meals.reduce((t: number, m: any) => t + (m.macros?.protein || 0), 0);
    n++;
  }
  if (n === 0 || kcal === 0) return null;
  return { kcal: Math.round(kcal / n / 10) * 10, protein: Math.round(protein / n) };
};
