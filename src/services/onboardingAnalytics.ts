import { Analytics } from './analytics';

interface StepState {
  stepName: string;
  stepNumber: number;
  viewedAt: number;
}

let funnelStartMs = 0;
let completedSteps = 0;
let current: StepState | null = null;

export const OnboardingAnalytics = {
  isActive(): boolean {
    return funnelStartMs > 0;
  },

  started(isFirstSession: boolean) {
    funnelStartMs = Date.now();
    completedSteps = 0;
    current = null;
    Analytics.track('onboarding_started', { is_first_session: isFirstSession });
  },

  stepViewed(stepName: string, stepNumber: number) {
    current = { stepName, stepNumber, viewedAt: Date.now() };
    Analytics.track('onboarding_step_viewed', {
      step_name: stepName,
      step_number: stepNumber,
    });
  },

  stepCompleted() {
    if (!current) return;
    const timeOnStepMs = Date.now() - current.viewedAt;
    completedSteps += 1;
    Analytics.track('onboarding_step_completed', {
      step_name: current.stepName,
      step_number: current.stepNumber,
      time_on_step_ms: timeOnStepMs,
    });
    current = null;
  },

  completed() {
    const totalTimeMs = funnelStartMs > 0 ? Date.now() - funnelStartMs : 0;
    Analytics.track('onboarding_completed', {
      total_time_ms: totalTimeMs,
      steps_count: completedSteps,
    });
    funnelStartMs = 0;
    current = null;
  },

  abandoned() {
    if (!current) return;
    const timeOnStepMs = Date.now() - current.viewedAt;
    Analytics.track('onboarding_abandoned', {
      last_step_name: current.stepName,
      last_step_number: current.stepNumber,
      time_on_step_ms: timeOnStepMs,
    });
    funnelStartMs = 0;
    current = null;
  },

  intentChosen(intent: 'meals' | 'plan' | 'workout' | 'skipped') {
    Analytics.track('onboarding_intent_chosen', { intent });
  },
};
