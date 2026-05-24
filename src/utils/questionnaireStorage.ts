// src/utils/questionnaireStorage.ts
//
// Thin wrapper around WorkoutStorage that treats the two legacy
// questionnaire data keys (fitness_goals_questionnaire_results and
// equipment_preferences_questionnaire_results) as a single logical
// store.
//
// Refinements writes the full merged answers object into BOTH keys
// (which is why this duplication exists — it's load-bearing, since
// other code reads from either key). Centralising the two-key write
// here means screens just call saveQuestionnaireAnswers() and the
// duplication stays correct.
//
// Anything that touches questionnaire answers (Q1–Q7, Refinements,
// Summary, CreateChooser, PromptReady) should go through this module
// rather than calling WorkoutStorage directly.

import { WorkoutStorage } from './storage';

export interface QuestionnaireAnswers {
  // Required (set in Q1–Q7)
  primaryGoal?: string;
  trainingExperience?: string;
  totalTrainingDays?: number;
  programDuration?: string;
  selectedEquipment?: string[];
  volumePreference?: string;
  sessionStyle?: string;

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
 * Load the persisted questionnaire answers, or null if none have been
 * saved (or all keys are empty).
 */
export async function loadQuestionnaireAnswers(): Promise<QuestionnaireAnswers | null> {
  const data = await WorkoutStorage.loadFitnessGoalsResults();
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return null;
  }
  return data as QuestionnaireAnswers;
}

/**
 * True only if every required Q1–Q7 field is set. Refinements don't
 * count — they're optional.
 */
export async function hasCompleteQuestionnaire(): Promise<boolean> {
  const a = await loadQuestionnaireAnswers();
  if (!a) return false;
  return Boolean(
    a.primaryGoal &&
      a.trainingExperience &&
      a.totalTrainingDays &&
      a.programDuration &&
      a.selectedEquipment &&
      a.selectedEquipment.length > 0 &&
      a.volumePreference &&
      a.sessionStyle,
  );
}

/**
 * Save the full answers object. Writes to BOTH legacy keys to keep
 * downstream readers happy. Stamps lastUpdatedAt.
 */
export async function saveQuestionnaireAnswers(
  answers: QuestionnaireAnswers,
): Promise<void> {
  const stamped: QuestionnaireAnswers = {
    ...answers,
    lastUpdatedAt: new Date().toISOString(),
  };
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
 * Wipe all questionnaire data. We don't have a low-level delete on
 * WorkoutStorage so we write empty objects — loadQuestionnaireAnswers
 * treats those as null.
 */
export async function clearQuestionnaireAnswers(): Promise<void> {
  await WorkoutStorage.saveFitnessGoalsResults({});
  await WorkoutStorage.saveEquipmentPreferencesResults({});
}