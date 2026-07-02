import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveQuestionnaireAnswers,
  loadQuestionnaireAnswers,
  hasCompleteQuestionnaire,
  QuestionnaireAnswers,
} from '../questionnaireStorage';

describe('Questionnaire Integration - Bug Fix Verification', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
  });

  it('should correctly save and validate a complete questionnaire with volumePreference', async () => {
    // This simulates what RefinementsScreen.handleGenerate would save
    const completeAnswers: QuestionnaireAnswers = {
      // Q1-Q7 required fields
      primaryGoal: 'build_muscle',
      trainingExperience: 'intermediate', 
      totalTrainingDays: 4,
      programDuration: '12_weeks',
      selectedEquipment: ['barbell', 'dumbbells'],
      volumePreference: '12-16', // This was missing before the fix!
      sessionStyle: 'moderate',
      // Optional refinements
      priorityMuscleGroups: ['chest'],
      auxiliaryMuscles: ['abs'],
      movementLimitations: [],
      gender: 'male',
      includeDirectCore: true,
    };

    // Save the complete answers
    await saveQuestionnaireAnswers(completeAnswers);

    // Verify the draft key and both legacy storage keys were written
    const setCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
    expect(setCalls.length).toBe(3);
    expect(setCalls[0][0]).toBe('@workout_questionnaire_answers');
    expect(setCalls[1][0]).toBe('fitness_goals_questionnaire_results');
    expect(setCalls[2][0]).toBe('equipment_preferences_questionnaire_results');

    // Verify volumePreference is in the saved data
    const savedData = JSON.parse(setCalls[0][1]);
    expect(savedData.volumePreference).toBe('12-16');

    // Mock the load to return what was saved
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

    // Verify hasCompleteQuestionnaire returns true
    const isComplete = await hasCompleteQuestionnaire();
    expect(isComplete).toBe(true);

    // Verify loaded data contains volumePreference
    const loaded = await loadQuestionnaireAnswers();
    expect(loaded?.volumePreference).toBe('12-16');
  });

  it('should fail validation if volumePreference is missing (the original bug)', async () => {
    // This simulates what was happening before the fix - volumePreference missing
    const buggyAnswers = {
      primaryGoal: 'build_muscle',
      trainingExperience: 'intermediate',
      totalTrainingDays: 4,
      programDuration: '12_weeks',
      selectedEquipment: ['barbell', 'dumbbells'],
      // volumePreference is MISSING - this was the bug
      sessionStyle: 'moderate',
    };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(buggyAnswers)
    );

    const isComplete = await hasCompleteQuestionnaire();
    expect(isComplete).toBe(false); // Should fail without volumePreference
  });

  it('should validate volumePreference values are correct', async () => {
    const validValues = ['8-12', '12-16', '16-20'];
    
    for (const value of validValues) {
      const answers: QuestionnaireAnswers = {
        primaryGoal: 'build_muscle',
        trainingExperience: 'intermediate',
        totalTrainingDays: 4,
        programDuration: '12_weeks',
        selectedEquipment: ['barbell'],
        volumePreference: value,
        sessionStyle: 'moderate',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(answers)
      );

      const isComplete = await hasCompleteQuestionnaire();
      expect(isComplete).toBe(true);
    }
  });
});