import { WorkoutRoutine } from '../utils/storage';
import { SAMPLE_PLANS } from '../data/samplePlans';

// Use the intermediate sample plan (builder) for the onboarding example
const builderPlan = SAMPLE_PLANS.find(plan => plan.id === 'builder');

if (!builderPlan) {
  throw new Error('Builder sample plan not found');
}

// Wrapped for screen consumption (similar to exampleMealPlan structure)
export const exampleWorkout: WorkoutRoutine = {
  id: builderPlan.raw.id || 'sample_builder_plan',
  name: builderPlan.raw.routine_name,
  days: builderPlan.raw.days_per_week,
  blocks: builderPlan.raw.blocks.length,
  data: builderPlan.raw,
  fingerprint: "sample_builder_plan_fingerprint",
  createdAt: Date.now()
};