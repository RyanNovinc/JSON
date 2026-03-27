// Debug script to examine actual questionnaire data
const AsyncStorage = require('@react-native-async-storage/async-storage');

async function debugQuestionnaireData() {
  try {
    console.log('=== DEBUGGING QUESTIONNAIRE DATA ===');
    
    // Load raw data
    const [fitnessGoalsData, equipmentPreferencesData] = await Promise.all([
      AsyncStorage.getItem('fitnessGoalsData'),
      AsyncStorage.getItem('equipmentPreferencesData'),
    ]);
    
    console.log('\n=== RAW FITNESS GOALS DATA ===');
    console.log(fitnessGoalsData || 'null');
    
    console.log('\n=== RAW EQUIPMENT PREFERENCES DATA ===');
    console.log(equipmentPreferencesData || 'null');
    
    // Parse data
    let fitnessGoals = {};
    let equipmentPrefs = {};
    
    try {
      fitnessGoals = fitnessGoalsData ? JSON.parse(fitnessGoalsData) : {};
    } catch (parseError) {
      console.error('Error parsing fitnessGoalsData:', parseError);
    }
    
    try {
      equipmentPrefs = equipmentPreferencesData ? JSON.parse(equipmentPreferencesData) : {};
    } catch (parseError) {
      console.error('Error parsing equipmentPreferencesData:', parseError);
    }
    
    console.log('\n=== PARSED FITNESS GOALS ===');
    console.log(JSON.stringify(fitnessGoals, null, 2));
    
    console.log('\n=== PARSED EQUIPMENT PREFERENCES ===');
    console.log(JSON.stringify(equipmentPrefs, null, 2));
    
    console.log('\n=== FIELD ANALYSIS ===');
    console.log('primaryGoal:', fitnessGoals.primaryGoal || 'MISSING');
    console.log('trainingExperience:', fitnessGoals.trainingExperience || 'MISSING');
    console.log('volumePreference:', fitnessGoals.volumePreference || 'MISSING');
    console.log('selectedEquipment:', equipmentPrefs.selectedEquipment || 'MISSING');
    console.log('sessionStyle (fitness):', fitnessGoals.sessionStyle || 'MISSING');
    console.log('sessionStyle (equipment):', equipmentPrefs.sessionStyle || 'MISSING');
    console.log('programDuration:', fitnessGoals.programDuration || 'MISSING');
    console.log('priorityMuscleGroups:', fitnessGoals.priorityMuscleGroups || 'MISSING');
    
  } catch (error) {
    console.error('Error in debug script:', error);
  }
}

// Note: This can't actually run in Node.js without React Native AsyncStorage
// This is just a reference script showing what we need to check
console.log('This is a reference script. Copy this logic into a React Native component to debug.');