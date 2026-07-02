import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadQuestionnaireAnswers,
  saveQuestionnaireAnswers,
  hasCompleteQuestionnaire,
  updateQuestionnaireField,
  clearQuestionnaireAnswers,
  QuestionnaireAnswers,
} from '../questionnaireStorage';
import { WorkoutStorage } from '../storage';

describe('questionnaireStorage', () => {
  beforeEach(() => {
    // Clear all mocked data before each test
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();
    (AsyncStorage.multiRemove as jest.Mock).mockClear();
  });

  describe('saveQuestionnaireAnswers and loadQuestionnaireAnswers', () => {
    it('1. should round-trip data correctly - saves data that loads back identically', async () => {
      const testData: QuestionnaireAnswers = {
        primaryGoal: 'build_muscle',
        trainingExperience: 'intermediate',
        totalTrainingDays: 4,
        programDuration: '12_weeks',
        selectedEquipment: ['barbell', 'dumbbells'],
        volumePreference: '12-16',
        sessionStyle: 'moderate',
        priorityMuscleGroups: ['chest', 'back'],
        auxiliaryMuscles: ['abs'],
        movementLimitations: [],
        gender: 'male',
        includeDirectCore: true,
      };

      await saveQuestionnaireAnswers(testData);
      
      // Mock the storage to return what was saved
      const savedData = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedData));

      const loaded = await loadQuestionnaireAnswers();
      
      expect(loaded).toBeTruthy();
      expect(loaded?.primaryGoal).toBe(testData.primaryGoal);
      expect(loaded?.trainingExperience).toBe(testData.trainingExperience);
      expect(loaded?.totalTrainingDays).toBe(testData.totalTrainingDays);
      expect(loaded?.programDuration).toBe(testData.programDuration);
      expect(loaded?.selectedEquipment).toEqual(testData.selectedEquipment);
      expect(loaded?.volumePreference).toBe(testData.volumePreference);
      expect(loaded?.sessionStyle).toBe(testData.sessionStyle);
      expect(loaded?.lastUpdatedAt).toBeDefined();
    });
  });

  describe('hasCompleteQuestionnaire', () => {
    it('2. should return true when all 7 required fields are present', async () => {
      const completeData: QuestionnaireAnswers = {
        primaryGoal: 'build_muscle',
        trainingExperience: 'intermediate',
        totalTrainingDays: 4,
        programDuration: '12_weeks',
        selectedEquipment: ['barbell', 'dumbbells'],
        volumePreference: '12-16',
        sessionStyle: 'moderate',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(completeData)
      );

      const isComplete = await hasCompleteQuestionnaire();
      expect(isComplete).toBe(true);
    });

    it('3. should return false when volumePreference is missing', async () => {
      const incompleteData: QuestionnaireAnswers = {
        primaryGoal: 'build_muscle',
        trainingExperience: 'intermediate',
        totalTrainingDays: 4,
        programDuration: '12_weeks',
        selectedEquipment: ['barbell', 'dumbbells'],
        // volumePreference is missing
        sessionStyle: 'moderate',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(incompleteData)
      );

      const isComplete = await hasCompleteQuestionnaire();
      expect(isComplete).toBe(false);
    });
  });

  describe('updateQuestionnaireField', () => {
    it('4. should update a single field without wiping others', async () => {
      const originalData: QuestionnaireAnswers = {
        primaryGoal: 'build_muscle',
        trainingExperience: 'intermediate',
        totalTrainingDays: 4,
        programDuration: '12_weeks',
        selectedEquipment: ['barbell'],
        volumePreference: '12-16',
        sessionStyle: 'moderate',
      };

      // First mock the load to return original data
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(originalData)
      );

      // Update volumePreference
      await updateQuestionnaireField('volumePreference', '16-20');

      // Check that save was called with all fields intact plus the update
      const saveCall = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      const savedData = JSON.parse(saveCall[1]);
      
      expect(savedData.primaryGoal).toBe('build_muscle');
      expect(savedData.trainingExperience).toBe('intermediate');
      expect(savedData.totalTrainingDays).toBe(4);
      expect(savedData.programDuration).toBe('12_weeks');
      expect(savedData.selectedEquipment).toEqual(['barbell']);
      expect(savedData.volumePreference).toBe('16-20'); // Updated
      expect(savedData.sessionStyle).toBe('moderate');
    });
  });

  describe('clearQuestionnaireAnswers', () => {
    it('5. should result in loadQuestionnaireAnswers returning null', async () => {
      await clearQuestionnaireAnswers();

      // Mock empty object response (how clearQuestionnaireAnswers works)
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({}));

      const loaded = await loadQuestionnaireAnswers();
      expect(loaded).toBeNull();
    });

    it('5. should result in hasCompleteQuestionnaire returning false', async () => {
      await clearQuestionnaireAnswers();

      // Mock empty object response
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({}));

      const isComplete = await hasCompleteQuestionnaire();
      expect(isComplete).toBe(false);
    });
  });

  describe('draft/final key consistency', () => {
    it('6. should write to the draft key AND both legacy keys when saving', async () => {
      const testData: QuestionnaireAnswers = {
        primaryGoal: 'build_muscle',
        trainingExperience: 'intermediate',
        totalTrainingDays: 4,
        programDuration: '12_weeks',
        selectedEquipment: ['barbell'],
        volumePreference: '12-16',
        sessionStyle: 'moderate',
      };

      await saveQuestionnaireAnswers(testData);

      // Draft key (used for routing/completeness) + both legacy keys
      // (used by PromptReadyScreen, WorkoutGeneratorStep1New, etc.)
      const setCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      expect(setCalls.length).toBe(3);

      const key0 = setCalls[0][0];
      const key1 = setCalls[1][0];
      const key2 = setCalls[2][0];
      const data0 = JSON.parse(setCalls[0][1]);
      const data1 = JSON.parse(setCalls[1][1]);
      const data2 = JSON.parse(setCalls[2][1]);

      expect(key0).toBe('@workout_questionnaire_answers');
      expect(key1).toBe('fitness_goals_questionnaire_results');
      expect(key2).toBe('equipment_preferences_questionnaire_results');

      // All three should carry the same data (aside from timestamps, which
      // might differ slightly across the underlying save calls).
      expect(data0.primaryGoal).toBe(data1.primaryGoal);
      expect(data1.primaryGoal).toBe(data2.primaryGoal);
      expect(data0.volumePreference).toBe(data1.volumePreference);
      expect(data1.volumePreference).toBe(data2.volumePreference);
      expect(data0.sessionStyle).toBe(data1.sessionStyle);
      expect(data1.sessionStyle).toBe(data2.sessionStyle);
    });
  });

  describe('edge cases', () => {
    it('should treat empty selectedEquipment array as incomplete', async () => {
      const dataWithEmptyEquipment: QuestionnaireAnswers = {
        primaryGoal: 'build_muscle',
        trainingExperience: 'intermediate',
        totalTrainingDays: 4,
        programDuration: '12_weeks',
        selectedEquipment: [], // Empty array
        volumePreference: '12-16',
        sessionStyle: 'moderate',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(dataWithEmptyEquipment)
      );

      const isComplete = await hasCompleteQuestionnaire();
      expect(isComplete).toBe(false);
    });

    it('should handle null/undefined gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const loaded = await loadQuestionnaireAnswers();
      expect(loaded).toBeNull();
      
      const isComplete = await hasCompleteQuestionnaire();
      expect(isComplete).toBe(false);
    });
  });
});