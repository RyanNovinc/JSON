// src/utils/questionnaireStorage.ts
//
// Draft/final split — the nutrition-side pattern (see
// nutritionQuestionnaireStorage.ts) mirrored for workout.
//
// fitness_goals_questionnaire_results predates GoalsProfile and is also
// written directly by an old, now-unreachable questionnaire screen
// (FitnessGoalsQuestionnaireScreen) with a different field shape. Reading
// it for "has the user completed Q1–Q7" let stale/legacy data satisfy the
// completeness check for users who'd never touched the current flow,
// which is what caused GoalsIntake to teleport straight to
// QuestionnaireSummary after a fresh intake. @workout_questionnaire_answers
// below is a dedicated key that ONLY this module's writers ever touch, so
// completeness here always reflects genuine Q1–Q7 answers.
//
// The legacy fitness_goals_questionnaire_results / equipment_preferences
// keys are still dual-written on every save so PromptReadyScreen,
// WorkoutGeneratorStep1New, and the (unreachable) legacy questionnaire
// chain keep reading exactly what they did before — this module is
// additive on top of them, not a replacement.
//
// Anything that touches questionnaire answers (Q1–Q7, Refinements,
// Summary, CreateChooser, PromptReady) should go through this module
// rather than calling WorkoutStorage directly.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutStorage } from './storage';

const DRAFT_KEY = '@workout_questionnaire_answers';

export interface QuestionnaireAnswers {
  // Required (set in Q3–Q7)
  // No longer collected — Q1 left the flow on 9 Aug 2026. Kept optional for
  // profiles saved before that, which prompt assembly still reads.
  primaryGoal?: string;
  totalTrainingDays?: number;
  programDuration?: string;
  selectedEquipment?: string[];
  volumePreference?: string;
  sessionStyle?: string;
  // No longer collected — training experience now lives on GoalsProfile
  // (trainingState) and is derived via deriveExperienceTier. Kept optional
  // here only for backward compatibility with old saved answers and the
  // now-unreachable Q2 screen; not required and not read by prompt assembly.
  trainingExperience?: string;

  // Refinements (all optional)
  priorityMuscleGroups?: string[];
  auxiliaryMuscles?: string[];
  movementLimitations?: string[];
  gender?: string;
  includeDirectCore?: boolean;

  // Metadata
  lastUpdatedAt?: string;
}

/**
 * Load the persisted questionnaire answers from the draft key, or null
 * if none have been saved (or the draft is empty).
 */
export async function loadQuestionnaireAnswers(): Promise<QuestionnaireAnswers | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
      return null;
    }
    return data as QuestionnaireAnswers;
  } catch (e) {
    console.error('loadQuestionnaireAnswers failed', e);
    return null;
  }
}

/**
 * True only if every required Q3–Q7 field is set. Refinements don't count —
 * they're optional.
 *
 * Two fields are deliberately NOT required:
 *   - trainingExperience: Q2 left the flow when GoalsProfile.trainingState
 *     became the source of truth (see deriveExperienceTier).
 *   - primaryGoal: Q1 left the flow on 9 Aug 2026. The roadmap decides whether
 *     the user is gaining or losing, and the phase context already varies
 *     volume, RIR and cardio as they move through it — so a static,
 *     program-wide emphasis answered once at step 1 was the wrong scope for a
 *     plan that periodises. assemblePlanningPrompt defaults it to
 *     'build_muscle', and every branch that reads it still works.
 *
 * Gating on either would make the questionnaire permanently incomplete for
 * anyone who filled it in after the screen was removed.
 */
export async function hasCompleteQuestionnaire(): Promise<boolean> {
  const a = await loadQuestionnaireAnswers();
  if (!a) return false;
  return Boolean(
    a.totalTrainingDays &&
      a.programDuration &&
      a.selectedEquipment &&
      a.selectedEquipment.length > 0 &&
      a.volumePreference &&
      a.sessionStyle,
  );
}

/**
 * Save the full answers object to the draft key, and dual-write to the
 * two legacy keys so existing readers (PromptReadyScreen,
 * WorkoutGeneratorStep1New, the legacy questionnaire chain) keep working
 * unchanged. Stamps lastUpdatedAt.
 */
export async function saveQuestionnaireAnswers(
  answers: QuestionnaireAnswers,
): Promise<void> {
  const stamped: QuestionnaireAnswers = {
    ...answers,
    lastUpdatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(stamped));
  await WorkoutStorage.saveFitnessGoalsResults(stamped);
  await WorkoutStorage.saveEquipmentPreferencesResults(stamped);
}

/**
 * Patch a single field on the stored answers, leaving everything else
 * intact. Used by Q1–Q7 + Refinements when they're in edit mode.
 */
export async function updateQuestionnaireField<
  K extends keyof QuestionnaireAnswers,
>(field: K, value: QuestionnaireAnswers[K]): Promise<void> {
  const existing = (await loadQuestionnaireAnswers()) ?? {};
  await saveQuestionnaireAnswers({ ...existing, [field]: value });
}

/**
 * Wipe all questionnaire data — the draft key and both legacy keys
 * (written as empty objects, since WorkoutStorage has no low-level
 * delete; loadQuestionnaireAnswers treats those as null too).
 */
export async function clearQuestionnaireAnswers(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY);
  await WorkoutStorage.saveFitnessGoalsResults({});
  await WorkoutStorage.saveEquipmentPreferencesResults({});
}