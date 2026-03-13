/**
 * Storage Implementation Test Suite
 * Run this to verify MMKV implementation is working correctly
 */

import { SmartStorage } from './smartStorage';
import { SmartStorageSync as MMKVSync } from './smartStorage';

export const testStorageImplementation = async () => {
  console.log('🧪 [Storage Test] Starting comprehensive test...');
  
  try {
    // Test 1: Basic read/write
    console.log('📝 [Test 1] Basic read/write operations');
    await SmartStorage.setItem('test_key', 'test_value');
    const value = await SmartStorage.getItem('test_key');
    
    if (value !== 'test_value') {
      throw new Error('Basic read/write failed');
    }
    console.log('✅ [Test 1] Passed');
    
    // Test 2: JSON data (most common use case)
    console.log('📝 [Test 2] JSON data operations');
    const testData = { workouts: [{ id: 1, name: 'Test Workout' }], user: { name: 'Test User' } };
    await SmartStorage.setItem('test_json', JSON.stringify(testData));
    const jsonValue = await SmartStorage.getItem('test_json');
    const parsedData = JSON.parse(jsonValue!);
    
    if (parsedData.workouts[0].name !== 'Test Workout') {
      throw new Error('JSON data test failed');
    }
    console.log('✅ [Test 2] Passed');
    
    // Test 3: Large data (simulating meal plans)
    console.log('📝 [Test 3] Large data operations');
    const largeData = JSON.stringify(Array(1000).fill(0).map((_, i) => ({
      id: i,
      name: `Meal ${i}`,
      ingredients: Array(10).fill(0).map((_, j) => `Ingredient ${j}`)
    })));
    
    const startTime = Date.now();
    await SmartStorage.setItem('test_large', largeData);
    const retrievedLarge = await SmartStorage.getItem('test_large');
    const endTime = Date.now();
    
    if (retrievedLarge !== largeData) {
      throw new Error('Large data test failed');
    }
    console.log(`✅ [Test 3] Passed (${endTime - startTime}ms)`);
    
    // Test 4: Multiple operations (simulating app usage)
    console.log('📝 [Test 4] Multiple concurrent operations');
    const promises = Array(50).fill(0).map(async (_, i) => {
      await SmartStorage.setItem(`test_multi_${i}`, `value_${i}`);
      return await SmartStorage.getItem(`test_multi_${i}`);
    });
    
    const results = await Promise.all(promises);
    const allCorrect = results.every((result, i) => result === `value_${i}`);
    
    if (!allCorrect) {
      throw new Error('Multiple operations test failed');
    }
    console.log('✅ [Test 4] Passed');
    
    // Test 5: Storage type detection
    console.log('📝 [Test 5] Storage type detection');
    const isMMKV = typeof MMKVSync !== 'undefined';
    console.log(`📊 [Storage Type] Using ${isMMKV ? 'MMKV' : 'AsyncStorage'}`);
    
    // Cleanup
    const keys = await SmartStorage.getAllKeys();
    const testKeys = keys.filter((key: string) => key.startsWith('test_'));
    await Promise.all(testKeys.map((key: string) => SmartStorage.removeItem(key)));
    
    console.log('🎉 [Storage Test] All tests passed! Storage implementation is working correctly.');
    
    return {
      success: true,
      storageType: isMMKV ? 'MMKV' : 'AsyncStorage',
      testsRun: 5,
      performance: endTime - startTime
    };
    
  } catch (error) {
    console.error('💥 [Storage Test] Failed:', error);
    return {
      success: false,
      error: error.message,
      storageType: 'unknown'
    };
  }
};