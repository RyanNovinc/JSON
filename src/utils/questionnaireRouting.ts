import { hasCompleteQuestionnaire, loadQuestionnaireAnswers } from './questionnaireStorage';
import { hasCompleteNutritionAnswers, loadNutritionAnswers } from './nutritionQuestionnaireStorage';

export async function startWorkoutFlow(
  navigation: any,
  extraParams: Record<string, any> = {}
): Promise<void> {
  if (await hasCompleteQuestionnaire()) {
    navigation.navigate('QuestionnaireSummary');
  } else {
    const saved = await loadQuestionnaireAnswers();
    navigation.navigate('Q1PrimaryGoal', { answersSoFar: saved || {}, ...extraParams });
  }
}

export async function startNutritionFlow(
  navigation: any,
  extraParams: Record<string, any> = {}
): Promise<void> {
  if (await hasCompleteNutritionAnswers()) {
    navigation.navigate('NutritionSummary');
  } else {
    const saved = await loadNutritionAnswers();
    navigation.navigate('N1Goal', { answersSoFar: saved || {}, ...extraParams });
  }
}
