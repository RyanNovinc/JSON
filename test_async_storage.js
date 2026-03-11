// Test AsyncStorage operations to verify persistence
const AsyncStorage = require('@react-native-async-storage/async-storage');

async function testAsyncStorage() {
  try {
    console.log('🧪 Testing AsyncStorage operations...');
    
    // Test 1: Basic setItem/getItem
    console.log('\n1. Testing basic setItem/getItem...');
    const testKey = 'test_persistence_key';
    const testValue = { message: 'Hello World', timestamp: Date.now() };
    
    await AsyncStorage.setItem(testKey, JSON.stringify(testValue));
    console.log('✅ setItem completed');
    
    const retrieved = await AsyncStorage.getItem(testKey);
    const parsedValue = JSON.parse(retrieved);
    console.log('✅ getItem result:', parsedValue);
    
    // Test 2: Simulating workout completion storage
    console.log('\n2. Testing workout completion pattern...');
    const blockName = 'Block 1: Foundation (Part 1)';
    const weekString = '1';
    const dayName = 'Full Body A';
    
    // Mimic the exact logic from WorkoutLogScreen
    const workoutKey = `${dayName}_week${weekString}`;
    const completedKey = `completed_${blockName}_week${weekString}`;
    
    console.log('Workout key:', workoutKey);
    console.log('Completed key:', completedKey);
    
    // Save completion
    const completed = await AsyncStorage.getItem(completedKey);
    const completedSet = completed ? new Set(JSON.parse(completed)) : new Set();
    completedSet.add(workoutKey);
    await AsyncStorage.setItem(completedKey, JSON.stringify(Array.from(completedSet)));
    console.log('✅ Saved completed workouts:', Array.from(completedSet));
    
    // Load completion (mimic DaysScreen logic)
    const loadedCompleted = await AsyncStorage.getItem(completedKey);
    if (loadedCompleted) {
      const parsedCompleted = JSON.parse(loadedCompleted);
      const completedWorkouts = new Set(parsedCompleted);
      console.log('✅ Loaded completed workouts:', Array.from(completedWorkouts));
      console.log('✅ Is workout completed?', completedWorkouts.has(workoutKey));
    }
    
    // Test 3: Check all stored keys
    console.log('\n3. Checking all stored keys...');
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('All stored keys:', allKeys.filter(key => 
      key.includes('completed_') || key.includes('test_')
    ));
    
    // Clean up
    await AsyncStorage.removeItem(testKey);
    console.log('\n✅ AsyncStorage test completed successfully!');
    
  } catch (error) {
    console.error('❌ AsyncStorage test failed:', error);
  }
}

// Run the test if this is executed directly
if (require.main === module) {
  testAsyncStorage();
}

module.exports = testAsyncStorage;