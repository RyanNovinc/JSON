/**
 * CRITICAL TEST: removeMyRoutine Survivors Test
 * Verifies that deleted routines stay deleted across multiple repair cycles and restart simulations
 */

import { WorkoutStorage, WorkoutRoutine } from '../storage';
import RobustStorage from '../robustStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Real RobustStorage behavior simulation with health check repair
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
  
  removeItem: jest.fn(async (key: string, critical?: boolean, useTombstone: boolean = true) => {
    if (critical) {
      // Purge all copies and conditionally create tombstone
      mockStorage.delete(key);
      mockStorage.delete(`${key}_backup`);
      mockStorage.delete(`${key}_emergency`);
      if (useTombstone) {
        mockTombstones.add(key);
      }
    } else {
      mockStorage.delete(key);
    }
    return true;
  }),
  
  // Simulate health check that could resurrect deleted data
  healthCheck: jest.fn(async () => {
    console.log('[MOCK] Running health check/repair...');
    
    // Simulate finding backup data and trying to restore
    for (const [key, value] of mockStorage.entries()) {
      if (key.endsWith('_backup')) {
        const mainKey = key.replace('_backup', '');
        if (!mockStorage.has(mainKey) && !mockTombstones.has(mainKey)) {
          console.log(`[MOCK] Health check: Restoring ${mainKey} from backup`);
          mockStorage.set(mainKey, value);
        } else if (mockTombstones.has(mainKey)) {
          console.log(`[MOCK] Health check: ${mainKey} is tombstoned, not restoring`);
        }
      }
      
      if (key.endsWith('_emergency')) {
        const mainKey = key.replace('_emergency', '');
        if (!mockStorage.has(mainKey) && !mockTombstones.has(mainKey)) {
          console.log(`[MOCK] Health check: Restoring ${mainKey} from emergency backup`);
          mockStorage.set(mainKey, value);
        } else if (mockTombstones.has(mainKey)) {
          console.log(`[MOCK] Health check: ${mainKey} is tombstoned, not restoring`);
        }
      }
    }
  }),
  
  // Simulate cross-session repair
  crossSessionRepair: jest.fn(async () => {
    console.log('[MOCK] Running cross-session repair...');
    
    // Simulate aggressive repair that looks for any copy anywhere
    const allKeys = Array.from(mockStorage.keys());
    for (const key of allKeys) {
      if (key.includes('_backup') || key.includes('_emergency')) {
        const mainKey = key.replace('_backup', '').replace('_emergency', '');
        if (!mockStorage.has(mainKey) && !mockTombstones.has(mainKey)) {
          console.log(`[MOCK] Cross-session repair: Restoring ${mainKey} from ${key}`);
          mockStorage.set(mainKey, mockStorage.get(key)!);
        } else if (mockTombstones.has(mainKey)) {
          console.log(`[MOCK] Cross-session repair: ${mainKey} is tombstoned, not restoring`);
        }
      }
    }
  })
};

jest.doMock('../robustStorage', () => mockRobustStorage);

describe('removeMyRoutine Survivors Test', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockStorage.clear();
    mockTombstones.clear();
    
    (RobustStorage.setItem as jest.Mock) = mockRobustStorage.setItem;
    (RobustStorage.getItem as jest.Mock) = mockRobustStorage.getItem;
    (RobustStorage.removeItem as jest.Mock) = mockRobustStorage.removeItem;
  });

  it('SURVIVORS TEST: deleted routine stays deleted across double repair + restart', async () => {
    // 1. Seed 3 routines
    const testRoutines: WorkoutRoutine[] = [
      { id: 'routine1', name: 'Survivor 1', days: 3, blocks: 1 },
      { id: 'routine2', name: 'DELETE THIS', days: 4, blocks: 2 },
      { id: 'routine3', name: 'Survivor 2', days: 5, blocks: 3 },
    ];

    console.log('=== STEP 1: Seed 3 routines ===');
    await WorkoutStorage.saveMyRoutines(testRoutines);
    
    // Verify initial state - should have 3 routines + backups
    expect(mockStorage.get('my_workout_routines')).toBeTruthy();
    expect(mockStorage.get('my_workout_routines_backup')).toBeTruthy();
    expect(mockStorage.get('my_workout_routines_emergency')).toBeTruthy();
    expect(mockTombstones.has('my_workout_routines')).toBe(false);
    
    const initialLoad = await WorkoutStorage.loadMyRoutines();
    expect(initialLoad).toHaveLength(3);
    expect(initialLoad.map(r => r.id)).toEqual(['routine1', 'routine2', 'routine3']);
    
    // 2. Delete 1 routine (routine2)
    console.log('=== STEP 2: Delete routine2 ===');
    await WorkoutStorage.removeMyRoutine('routine2');
    
    // Verify deletion worked and tombstone was cleared by resave
    expect(mockTombstones.has('my_workout_routines')).toBe(false);
    
    const afterDelete = await WorkoutStorage.loadMyRoutines();
    expect(afterDelete).toHaveLength(2);
    expect(afterDelete.map(r => r.id)).toEqual(['routine1', 'routine3']);
    
    // 3. Run health check/repair FIRST TIME
    console.log('=== STEP 3: First health check/repair ===');
    await mockRobustStorage.healthCheck();
    
    // Verify survivors still present after first repair
    const afterFirstRepair = await WorkoutStorage.loadMyRoutines();
    expect(afterFirstRepair).toHaveLength(2);
    expect(afterFirstRepair.map(r => r.id)).toEqual(['routine1', 'routine3']);
    expect(afterFirstRepair.find(r => r.id === 'routine2')).toBeUndefined();
    
    // 4. Run health check/repair SECOND TIME
    console.log('=== STEP 4: Second health check/repair ===');
    await mockRobustStorage.healthCheck();
    
    // Verify survivors still present after second repair
    const afterSecondRepair = await WorkoutStorage.loadMyRoutines();
    expect(afterSecondRepair).toHaveLength(2);
    expect(afterSecondRepair.map(r => r.id)).toEqual(['routine1', 'routine3']);
    expect(afterSecondRepair.find(r => r.id === 'routine2')).toBeUndefined();
    
    // 5. Simulate restart scenario with cross-session repair
    console.log('=== STEP 5: Simulate restart + cross-session repair ===');
    await mockRobustStorage.crossSessionRepair();
    
    // Verify survivors STILL present after restart simulation
    const afterRestart = await WorkoutStorage.loadMyRoutines();
    expect(afterRestart).toHaveLength(2);
    expect(afterRestart.map(r => r.id)).toEqual(['routine1', 'routine3']);
    expect(afterRestart.find(r => r.id === 'routine2')).toBeUndefined();
    
    // 6. Final verification - check storage state
    console.log('=== STEP 6: Final verification ===');
    expect(mockTombstones.has('my_workout_routines')).toBe(false); // Tombstone cleared by saveMyRoutines
    expect(mockStorage.get('my_workout_routines')).toBeTruthy(); // Data exists
    expect(mockStorage.get('my_workout_routines_backup')).toBeTruthy(); // Backup exists
    expect(mockStorage.get('my_workout_routines_emergency')).toBeTruthy(); // Emergency exists
    
    console.log('✅ SURVIVORS TEST PASSED: routine2 stays deleted across all repair cycles');
  });

  it('TOMBSTONE CLEARING: verify saveMyRoutines clears tombstone', async () => {
    // Manually set a tombstone
    mockTombstones.add('my_workout_routines');
    
    // Verify tombstone blocks access
    const beforeSave = await mockRobustStorage.getItem('my_workout_routines', true);
    expect(beforeSave).toBeNull();
    expect(mockTombstones.has('my_workout_routines')).toBe(true);
    
    // saveMyRoutines should clear the tombstone
    const routines: WorkoutRoutine[] = [
      { id: 'test1', name: 'Test', days: 3, blocks: 1 }
    ];
    await WorkoutStorage.saveMyRoutines(routines);
    
    // Verify tombstone cleared
    expect(mockTombstones.has('my_workout_routines')).toBe(false);
    const afterSave = await mockRobustStorage.getItem('my_workout_routines', true);
    expect(afterSave).toBeTruthy();
    
    // Verify data accessible
    const loaded = await WorkoutStorage.loadMyRoutines();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('test1');
  });

  it('PURGE VERIFICATION: removeMyRoutine actually purges all copies', async () => {
    const routines: WorkoutRoutine[] = [
      { id: 'keep1', name: 'Keep 1', days: 3, blocks: 1 },
      { id: 'purge_me', name: 'Purge Me', days: 4, blocks: 2 },
    ];
    
    await WorkoutStorage.saveMyRoutines(routines);
    
    // Verify all copies exist
    expect(mockStorage.get('my_workout_routines')).toBeTruthy();
    expect(mockStorage.get('my_workout_routines_backup')).toBeTruthy();
    expect(mockStorage.get('my_workout_routines_emergency')).toBeTruthy();
    
    await WorkoutStorage.removeMyRoutine('purge_me');
    
    // Verify the purge happened (checked by whether removeItem was called with critical=true)
    expect(mockRobustStorage.removeItem).toHaveBeenCalledWith('my_workout_routines', true);
    
    // Verify final state has survivors
    const final = await WorkoutStorage.loadMyRoutines();
    expect(final).toHaveLength(1);
    expect(final[0].id).toBe('keep1');
  });
  
  it('EDGE CASE: empty array after deletion still works correctly', async () => {
    const routines: WorkoutRoutine[] = [
      { id: 'only_one', name: 'Only One', days: 3, blocks: 1 },
    ];
    
    await WorkoutStorage.saveMyRoutines(routines);
    expect((await WorkoutStorage.loadMyRoutines())).toHaveLength(1);
    
    // Delete the only routine
    await WorkoutStorage.removeMyRoutine('only_one');
    
    // Should have empty array, not crash
    const afterDelete = await WorkoutStorage.loadMyRoutines();
    expect(afterDelete).toEqual([]);
    
    // Health checks should not crash on empty data
    await mockRobustStorage.healthCheck();
    await mockRobustStorage.crossSessionRepair();
    
    const afterRepairs = await WorkoutStorage.loadMyRoutines();
    expect(afterRepairs).toEqual([]);
  });
});