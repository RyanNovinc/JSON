/**
 * Debug script to extract real workout history data and unit settings
 * Run with: node src/utils/__tests__/debugWorkoutUnits.js
 */

const AsyncStorage = require('@react-native-async-storage/async-storage');

// Mock React Native AsyncStorage for Node.js
const mockStorage = {};
const mockAsyncStorage = {
  setItem: async (key, value) => {
    mockStorage[key] = value;
    return Promise.resolve();
  },
  getItem: async (key) => {
    return Promise.resolve(mockStorage[key] || null);
  },
  removeItem: async (key) => {
    delete mockStorage[key];
    return Promise.resolve();
  }
};

// Replace AsyncStorage with mock for testing
global.AsyncStorage = mockAsyncStorage;

async function debugWorkoutUnits() {
  console.log('🔍 [DEBUG] Starting workout units investigation...\n');
  
  try {
    // 1. Check workout_history raw data
    console.log('1️⃣ EXTRACTING WORKOUT_HISTORY DATA:');
    const workoutHistoryRaw = await AsyncStorage.getItem('workout_history');
    
    if (workoutHistoryRaw) {
      try {
        const workoutHistory = JSON.parse(workoutHistoryRaw);
        console.log(`Found ${workoutHistory.length} workout history entries`);
        
        // Look for entries with sets and examine their units
        workoutHistory.forEach((entry, index) => {
          console.log(`\nEntry ${index}: ${entry.exerciseName} (${entry.date})`);
          if (entry.sets && entry.sets.length > 0) {
            entry.sets.forEach((set, setIndex) => {
              console.log(`  Set ${setIndex + 1}: ${set.weight} × ${set.reps}, unit: ${JSON.stringify(set.unit)}`);
              
              // Check if this matches the user's described bug scenario
              if (set.weight === '1' && set.reps === '2') {
                console.log('    ⚠️ POTENTIAL BUG ENTRY FOUND! ⚠️');
                console.log(`    Raw JSON: ${JSON.stringify(set)}`);
              }
            });
          }
        });
      } catch (parseError) {
        console.error('❌ Failed to parse workout_history JSON:', parseError);
      }
    } else {
      console.log('No workout_history data found in AsyncStorage');
      
      // Create sample data to test the scenario
      console.log('\n📝 Creating test data to reproduce the bug...');
      const testEntry = {
        id: 'test-debug-entry',
        routineName: 'Test Routine',
        dayName: 'Test Day',
        exerciseName: 'Test Exercise',
        date: '2026-06-12',
        sets: [
          { setNumber: 1, weight: '1', reps: '2', completed: true, unit: 'lbs' },
          { setNumber: 2, weight: '1', reps: '2', completed: true, unit: 'kg' },
          { setNumber: 3, weight: '1', reps: '2', completed: true, unit: undefined },
          { setNumber: 4, weight: '1', reps: '2', completed: true } // no unit field
        ]
      };
      
      await AsyncStorage.setItem('workout_history', JSON.stringify([testEntry]));
      console.log('Test data created with various unit scenarios');
    }
    
    // 2. Check weight unit preference
    console.log('\n2️⃣ CHECKING WEIGHT UNIT PREFERENCES:');
    const globalWeightUnit = await AsyncStorage.getItem('globalWeightUnit');
    console.log(`globalWeightUnit in AsyncStorage: ${JSON.stringify(globalWeightUnit)}`);
    
    // 3. Show WeightUnitContext default
    console.log('\n3️⃣ WEIGHTUNITCONTEXT DEFAULT:');
    console.log('WeightUnitContext default (from code): "kg"');
    
    // 4. Test volume calculations with different units
    console.log('\n4️⃣ VOLUME CALCULATION TEST:');
    
    // Mock convertWeight function (from actual implementation)
    const convertWeight = (weight, fromUnit, toUnit) => {
      if (fromUnit === toUnit) return weight;
      
      if (fromUnit === 'kg' && toUnit === 'lbs') {
        return Math.round(weight * 2.20462 * 10) / 10;
      } else if (fromUnit === 'lbs' && toUnit === 'kg') {
        return Math.round(weight / 2.20462 * 10) / 10;
      }
      
      return weight;
    };
    
    const scenarios = [
      { unit: 'lbs', displayUnit: 'kg', description: 'lbs set, kg display' },
      { unit: 'kg', displayUnit: 'kg', description: 'kg set, kg display' },
      { unit: undefined, displayUnit: 'kg', description: 'undefined unit, kg display (fallback)' },
      { unit: 'lbs', displayUnit: 'lbs', description: 'lbs set, lbs display' }
    ];
    
    scenarios.forEach(scenario => {
      const weight = 1;
      const reps = 2;
      const fallbackUnit = scenario.unit || 'kg';
      const convertedWeight = convertWeight(weight, fallbackUnit, scenario.displayUnit);
      const volume = convertedWeight * reps;
      
      console.log(`${scenario.description}:`);
      console.log(`  1 ${fallbackUnit} × 2 reps → ${convertedWeight} ${scenario.displayUnit} × 2 = ${volume} ${scenario.displayUnit}`);
      
      if (volume === 1) {
        console.log('  ⚠️ THIS MATCHES THE BUG SCENARIO! ⚠️');
      }
    });
    
    // 5. Determine the actual issue
    console.log('\n5️⃣ ROOT CAUSE ANALYSIS:');
    
    const currentGlobalUnit = globalWeightUnit || 'kg';
    console.log(`Current effective globalUnit: "${currentGlobalUnit}"`);
    
    if (currentGlobalUnit === 'lbs') {
      console.log('🎯 FOUND THE ISSUE!');
      console.log('- The user has lbs as their active unit preference');
      console.log('- New sets are correctly stamped with unit: "lbs"');
      console.log('- But display/volume shows in kg, causing the conversion bug');
      console.log('- Fix needed: Ensure volume display uses same unit as logging preference');
    } else {
      console.log('🤔 Unit preference is kg, investigating further...');
      console.log('- Check if there are legacy lbs entries from before unit stamping was added');
      console.log('- Or if there is inconsistency between logging and display unit preferences');
    }
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the debug
debugWorkoutUnits().then(() => {
  console.log('\n✅ Debug investigation complete');
}).catch(error => {
  console.error('❌ Debug failed:', error);
});