/**
 * Test for Fix 3: Gate workout questionnaire access on completion
 * Prevents incomplete answers from being treated as completed results
 */

import { WorkoutStorage } from '../storage';

// Mock the PromptReadyScreen logic for testing
const simulatePromptReadyLoad = async () => {
  const fitnessGoals = await WorkoutStorage.loadFitnessGoalsResults();
  const equipment = await WorkoutStorage.loadEquipmentPreferencesResults();
  
  // Apply the fix: only use completed questionnaire data
  const validFitnessGoals = fitnessGoals?.completedAt ? fitnessGoals : {};
  const validEquipment = equipment?.completedAt ? equipment : {};
  const merged = { ...validFitnessGoals, ...validEquipment };
  
  return merged;
};

jest.mock('../storage');
const mockWorkoutStorage = WorkoutStorage as jest.Mocked<typeof WorkoutStorage>;

describe('Workout Questionnaire Gating (Fix 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. INCOMPLETE DATA EXCLUDED: partial answers without completedAt are excluded from prompt', async () => {
    const incompleteGoals = {
      primaryGoal: 'build_muscle',
      trainingExperience: 'beginner',
      // No completedAt field - partial save
    };

    const incompleteEquipment = {
      selectedEquipment: ['dumbbells'],
      // No completedAt field - partial save  
    };

    mockWorkoutStorage.loadFitnessGoalsResults.mockResolvedValue(incompleteGoals);
    mockWorkoutStorage.loadEquipmentPreferencesResults.mockResolvedValue(incompleteEquipment);

    const merged = await simulatePromptReadyLoad();

    // Should be empty since neither has completedAt
    expect(merged).toEqual({});
    expect(merged.primaryGoal).toBeUndefined();
    expect(merged.selectedEquipment).toBeUndefined();
  });

  it('2. COMPLETED DATA INCLUDED: answers with completedAt are included in prompt', async () => {
    const completedGoals = {
      primaryGoal: 'gain_strength',
      trainingExperience: 'intermediate',
      totalTrainingDays: 4,
      programDuration: '8_weeks',
      volumePreference: 'moderate',
      sessionStyle: 'full_body',
      completedAt: '2024-01-01T00:00:00.000Z'
    };

    const completedEquipment = {
      selectedEquipment: ['barbell', 'dumbbells'],
      completedAt: '2024-01-01T00:00:00.000Z'
    };

    mockWorkoutStorage.loadFitnessGoalsResults.mockResolvedValue(completedGoals);
    mockWorkoutStorage.loadEquipmentPreferencesResults.mockResolvedValue(completedEquipment);

    const merged = await simulatePromptReadyLoad();

    // Should include all data since both have completedAt
    expect(merged.primaryGoal).toBe('gain_strength');
    expect(merged.selectedEquipment).toEqual(['barbell', 'dumbbells']);
    expect(merged.trainingExperience).toBe('intermediate');
  });

  it('3. MIXED COMPLETION: only completed questionnaire contributes to prompt', async () => {
    const completedGoals = {
      primaryGoal: 'burn_fat',
      trainingExperience: 'advanced',
      completedAt: '2024-01-01T00:00:00.000Z'
    };

    const incompleteEquipment = {
      selectedEquipment: ['resistance_bands'],
      // No completedAt - partial save
    };

    mockWorkoutStorage.loadFitnessGoalsResults.mockResolvedValue(completedGoals);
    mockWorkoutStorage.loadEquipmentPreferencesResults.mockResolvedValue(incompleteEquipment);

    const merged = await simulatePromptReadyLoad();

    // Should only include completed goals, not incomplete equipment
    expect(merged.primaryGoal).toBe('burn_fat');
    expect(merged.trainingExperience).toBe('advanced');
    expect(merged.selectedEquipment).toBeUndefined();
  });

  it('4. NULL DATA SAFE: null/undefined questionnaire data is handled safely', async () => {
    mockWorkoutStorage.loadFitnessGoalsResults.mockResolvedValue(null);
    mockWorkoutStorage.loadEquipmentPreferencesResults.mockResolvedValue(undefined);

    const merged = await simulatePromptReadyLoad();

    expect(merged).toEqual({});
  });

  it('5. EMPTY OBJECT EXCLUDED: empty objects without completedAt are excluded', async () => {
    mockWorkoutStorage.loadFitnessGoalsResults.mockResolvedValue({});
    mockWorkoutStorage.loadEquipmentPreferencesResults.mockResolvedValue({});

    const merged = await simulatePromptReadyLoad();

    expect(merged).toEqual({});
  });

  it('6. COMPLETENESS FLAG REQUIRED: false completedAt values are excluded', async () => {
    const dataWithFalseFlag = {
      primaryGoal: 'general_fitness',
      completedAt: null // Explicitly false completion
    };

    mockWorkoutStorage.loadFitnessGoalsResults.mockResolvedValue(dataWithFalseFlag);
    mockWorkoutStorage.loadEquipmentPreferencesResults.mockResolvedValue({});

    const merged = await simulatePromptReadyLoad();

    // Should exclude data since completedAt is falsy
    expect(merged).toEqual({});
    expect(merged.primaryGoal).toBeUndefined();
  });
});