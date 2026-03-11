import React from 'react';
import { TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import AsyncStorageDebugger from '../utils/asyncStorageDebug';

interface Props {
  style?: any;
}

export default function AsyncStorageTestButton({ style }: Props) {
  const runComprehensiveTest = async () => {
    try {
      console.log('🧪 === STARTING COMPREHENSIVE ASYNCSTORAGE TEST ===');
      
      // Test 1: Basic persistence
      console.log('\n🧪 Test 1: Basic Persistence');
      const basicTest = await AsyncStorageDebugger.testPersistence();
      console.log(`Basic persistence: ${basicTest ? '✅ PASS' : '❌ FAIL'}`);
      
      // Test 2: Simulate workout completion flow
      console.log('\n🧪 Test 2: Workout Completion Simulation');
      const testBlockName = 'Test Block';
      const testWeek = 1;
      const testDayName = 'Test Day';
      
      const workoutKey = `${testDayName}_week${testWeek}`;
      const completedKey = `completed_${testBlockName}_week${testWeek}`;
      
      // Save completion
      const existingData = await AsyncStorageDebugger.getItem(completedKey);
      const completedSet = existingData ? new Set(JSON.parse(existingData)) : new Set();
      completedSet.add(workoutKey);
      
      const saveSuccess = await AsyncStorageDebugger.setItem(
        completedKey, 
        JSON.stringify(Array.from(completedSet))
      );
      
      // Immediately verify
      const verification = await AsyncStorageDebugger.getItem(completedKey);
      const verified = verification !== null;
      
      // Check if workout is marked as completed
      const loadedSet = new Set(JSON.parse(verification || '[]'));
      const isCompleted = loadedSet.has(workoutKey);
      
      console.log(`Workout completion simulation: ${saveSuccess && verified && isCompleted ? '✅ PASS' : '❌ FAIL'}`);
      
      // Test 3: Storage stats
      console.log('\n🧪 Test 3: Storage Stats');
      const stats = await AsyncStorageDebugger.getStorageStats();
      console.log(`Storage accessible: ${stats.totalKeys >= 0 ? '✅ PASS' : '❌ FAIL'}`);
      
      // Test 4: Large data test
      console.log('\n🧪 Test 4: Large Data Test');
      const largeData = JSON.stringify({
        data: 'x'.repeat(5000), // 5KB of data
        timestamp: new Date().toISOString()
      });
      const largeKey = 'large_data_test';
      const largeSuccess = await AsyncStorageDebugger.setItem(largeKey, largeData);
      const largeVerify = await AsyncStorageDebugger.getItem(largeKey);
      await AsyncStorageDebugger.removeItem(largeKey); // Clean up
      
      console.log(`Large data test: ${largeSuccess && largeVerify === largeData ? '✅ PASS' : '❌ FAIL'}`);
      
      // Clean up test data
      await AsyncStorageDebugger.removeItem(completedKey);
      
      // Show results
      AsyncStorageDebugger.printSummary();
      
      const overallResult = basicTest && saveSuccess && verified && isCompleted && (stats.totalKeys >= 0) && largeSuccess;
      
      Alert.alert(
        'AsyncStorage Test Results',
        `Overall: ${overallResult ? 'PASS ✅' : 'FAIL ❌'}\n\n` +
        `Basic Persistence: ${basicTest ? 'PASS' : 'FAIL'}\n` +
        `Workout Completion: ${saveSuccess && verified && isCompleted ? 'PASS' : 'FAIL'}\n` +
        `Storage Access: ${stats.totalKeys >= 0 ? 'PASS' : 'FAIL'}\n` +
        `Large Data: ${largeSuccess ? 'PASS' : 'FAIL'}\n\n` +
        `Check console for detailed logs.`,
        [{ text: 'OK' }]
      );
      
      console.log('🧪 === COMPREHENSIVE TEST COMPLETE ===\n');
      
    } catch (error) {
      console.error('🧪 === TEST FAILED WITH ERROR ===', error);
      Alert.alert('Test Error', `AsyncStorage test failed: ${error}`);
    }
  };

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={runComprehensiveTest}>
      <Text style={styles.buttonText}>🧪 Test AsyncStorage</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    margin: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});