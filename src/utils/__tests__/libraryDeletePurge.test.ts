/**
 * Test for Fix 1: Workout routine deletion uses P6E purge-all-copies
 * Verifies deleted routines cannot resurrect from RobustStorage duplicates
 */

import { WorkoutStorage, WorkoutRoutine } from '../storage';
import RobustStorage from '../robustStorage';

// Mock RobustStorage and AsyncStorage
jest.mock('../robustStorage');
jest.mock('@react-native-async-storage/async-storage');

const mockRobustStorage = RobustStorage as jest.Mocked<typeof RobustStorage>;

describe('Library Delete Purge (Fix 1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRobustStorage.removeItem.mockResolvedValue(true);
    mockRobustStorage.setItem.mockResolvedValue(true);
    mockRobustStorage.getItem.mockResolvedValue(null);
  });

  it('1. PURGE DELETE: removeMyRoutine calls RobustStorage.removeItem before re-saving', async () => {
    const testRoutines: WorkoutRoutine[] = [
      { id: 'routine1', name: 'Test Routine 1', days: 3, blocks: 1 },
      { id: 'routine2', name: 'Test Routine 2', days: 4, blocks: 2 },
    ];

    // Mock loadMyRoutines to return test data
    mockRobustStorage.getItem.mockResolvedValueOnce(JSON.stringify(testRoutines));

    await WorkoutStorage.removeMyRoutine('routine1');

    // Verify RobustStorage.removeItem was called with purge flag
    expect(mockRobustStorage.removeItem).toHaveBeenCalledWith('my_workout_routines', true);
    
    // Verify filtered data was re-saved
    expect(mockRobustStorage.setItem).toHaveBeenCalledWith(
      'my_workout_routines', 
      JSON.stringify([{ id: 'routine2', name: 'Test Routine 2', days: 4, blocks: 2 }]),
      true
    );
  });

  it('2. FINGERPRINT DELETE: removes by both id and fingerprint', async () => {
    const testRoutines: WorkoutRoutine[] = [
      { id: 'routine1', name: 'Test Routine 1', days: 3, blocks: 1, fingerprint: 'fp1' },
      { id: 'routine2', name: 'Test Routine 2', days: 4, blocks: 2, fingerprint: 'fp2' },
    ];

    mockRobustStorage.getItem.mockResolvedValueOnce(JSON.stringify(testRoutines));

    // Delete by fingerprint instead of id
    await WorkoutStorage.removeMyRoutine('fp1');

    // Verify routine with fingerprint fp1 was removed
    const savedData = JSON.parse(mockRobustStorage.setItem.mock.calls[0][1]);
    expect(savedData).toHaveLength(1);
    expect(savedData[0].fingerprint).toBe('fp2');
  });

  it('3. MEAL PLANS UNAFFECTED: meal plan deletion still uses simple delete (not critical storage)', async () => {
    // This test documents that meal plans use AsyncStorage, not RobustStorage
    // So they don't need the P6E purge (no resurrection risk)
    
    const testMealPlans = [
      { id: 'meal1', name: 'Test Meal 1' },
      { id: 'meal2', name: 'Test Meal 2' },
    ];

    // Mock AsyncStorage for meal plans
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(testMealPlans));

    await WorkoutStorage.removeMealPlan('meal1');

    // Verify RobustStorage.removeItem was NOT called for meal plans
    expect(mockRobustStorage.removeItem).not.toHaveBeenCalled();
    
    // Verify AsyncStorage was used instead
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'meal_plans',
      JSON.stringify([{ id: 'meal2', name: 'Test Meal 2' }])
    );
  });
});