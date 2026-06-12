/**
 * Critical test: Verify removeMyRoutine tombstone behavior
 * Tests if data survives purge+tombstone followed by resave
 */

import { WorkoutStorage, WorkoutRoutine } from '../storage';
import RobustStorage from '../robustStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Real RobustStorage behavior simulation
const mockStorage = new Map<string, string>();
const mockTombstones = new Set<string>();

const mockRobustStorage = {
  setItem: jest.fn(async (key: string, value: string, critical?: boolean) => {
    mockTombstones.delete(key); // Clear tombstone on write
    mockStorage.set(key, value);
    
    if (critical) {
      // Simulate critical storage - write to multiple locations
      mockStorage.set(`${key}_backup`, value);
      mockStorage.set(`${key}_emergency`, value);
    }
    return true;
  }),
  
  getItem: jest.fn(async (key: string, critical?: boolean) => {
    if (mockTombstones.has(key)) {
      return null; // Tombstoned keys return null
    }
    return mockStorage.get(key) || null;
  }),
  
  removeItem: jest.fn(async (key: string, critical?: boolean) => {
    if (critical) {
      // Purge all copies and create tombstone
      mockStorage.delete(key);
      mockStorage.delete(`${key}_backup`);
      mockStorage.delete(`${key}_emergency`);
      mockTombstones.add(key);
    } else {
      mockStorage.delete(key);
    }
    return true;
  }),
  
  // Simulate health check that could resurrect deleted data
  healthCheck: jest.fn(async () => {
    // Simulate finding backup data and trying to restore
    for (const [key, value] of mockStorage.entries()) {
      if (key.endsWith('_backup')) {
        const mainKey = key.replace('_backup', '');
        if (!mockStorage.has(mainKey) && !mockTombstones.has(mainKey)) {
          mockStorage.set(mainKey, value);
        }
      }
    }
  })
};

// Replace the real RobustStorage with our mock
jest.doMock('../robustStorage', () => mockRobustStorage);

describe('RemoveMyRoutine Tombstone Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockTombstones.clear();
    
    // Mock RobustStorage methods
    (RobustStorage.setItem as jest.Mock) = mockRobustStorage.setItem;
    (RobustStorage.getItem as jest.Mock) = mockRobustStorage.getItem;
    (RobustStorage.removeItem as jest.Mock) = mockRobustStorage.removeItem;
  });

  it('1. TOMBSTONE SURVIVAL: data survives purge+resave cycle', async () => {
    const testRoutines: WorkoutRoutine[] = [
      { id: 'routine1', name: 'Keep This 1', days: 3, blocks: 1 },
      { id: 'routine2', name: 'DELETE THIS', days: 4, blocks: 2 },
      { id: 'routine3', name: 'Keep This 2', days: 5, blocks: 3 },
    ];

    // 1. Initial save - sets up critical storage
    await WorkoutStorage.saveMyRoutines(testRoutines);
    
    // Verify initial state
    expect(mockStorage.get('my_workout_routines')).toBeTruthy();
    expect(mockStorage.get('my_workout_routines_backup')).toBeTruthy();
    expect(mockTombstones.has('my_workout_routines')).toBe(false);

    // 2. Remove one routine (this does purge+tombstone+resave)
    await WorkoutStorage.removeMyRoutine('routine2');

    // 3. Verify tombstone was cleared by resave
    expect(mockTombstones.has('my_workout_routines')).toBe(false);
    
    // 4. Verify remaining data exists
    const remainingRoutines = await WorkoutStorage.loadMyRoutines();
    expect(remainingRoutines).toHaveLength(2);
    expect(remainingRoutines.map(r => r.id)).toEqual(['routine1', 'routine3']);
  });

  it('2. HEALTH CHECK RESILIENCE: data survives simulated restart+healthcheck', async () => {
    const testRoutines: WorkoutRoutine[] = [
      { id: 'routine1', name: 'Persistent 1', days: 3, blocks: 1 },
      { id: 'routine2', name: 'Will Delete', days: 4, blocks: 2 },
      { id: 'routine3', name: 'Persistent 2', days: 5, blocks: 3 },
    ];

    await WorkoutStorage.saveMyRoutines(testRoutines);
    await WorkoutStorage.removeMyRoutine('routine2');

    // Simulate restart scenario - run health check
    await mockRobustStorage.healthCheck();

    // Should still have 2 routines, not the deleted one
    const finalRoutines = await WorkoutStorage.loadMyRoutines();
    expect(finalRoutines).toHaveLength(2);
    expect(finalRoutines.find(r => r.id === 'routine2')).toBeUndefined();
    expect(finalRoutines.find(r => r.id === 'routine1')).toBeDefined();
    expect(finalRoutines.find(r => r.id === 'routine3')).toBeDefined();
  });

  it('3. FINGERPRINT DELETE: deletion by fingerprint works correctly', async () => {
    const testRoutines: WorkoutRoutine[] = [
      { id: 'routine1', name: 'Keep', days: 3, blocks: 1, fingerprint: 'keep_fp' },
      { id: 'routine2', name: 'Delete', days: 4, blocks: 2, fingerprint: 'delete_fp' },
    ];

    await WorkoutStorage.saveMyRoutines(testRoutines);
    
    // Delete by fingerprint instead of ID
    await WorkoutStorage.removeMyRoutine('delete_fp');

    const remaining = await WorkoutStorage.loadMyRoutines();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].fingerprint).toBe('keep_fp');
  });

  it('4. TOMBSTONE PERSISTENCE: verify removeItem creates proper tombstone', async () => {
    // This test verifies the tombstone mechanism itself
    await mockRobustStorage.setItem('test_key', 'test_data', true);
    expect(mockStorage.get('test_key')).toBe('test_data');
    expect(mockTombstones.has('test_key')).toBe(false);

    // Remove with tombstone
    await mockRobustStorage.removeItem('test_key', true);
    expect(mockTombstones.has('test_key')).toBe(true);
    expect(await mockRobustStorage.getItem('test_key', true)).toBeNull();

    // Subsequent write clears tombstone
    await mockRobustStorage.setItem('test_key', 'new_data', true);
    expect(mockTombstones.has('test_key')).toBe(false);
    expect(await mockRobustStorage.getItem('test_key', true)).toBe('new_data');
  });
});