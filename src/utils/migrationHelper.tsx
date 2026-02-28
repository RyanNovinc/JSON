import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { NUTRITION_STORAGE_KEYS } from '../types/nutrition';

// =============================================================================
// MIGRATION HELPER COMPONENT
// =============================================================================

export const MigrationHelper: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  
  const { migrateLegacyPlan, loadMealPlan } = useSimplifiedMealPlanning();

  const checkForLegacyData = async () => {
    setIsChecking(true);
    setMigrationStatus('');

    try {
      // Check for legacy meal plan
      const legacyData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
      const simplifiedData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLAN);

      if (legacyData && !simplifiedData) {
        setMigrationStatus('✅ Found legacy meal plan data that needs migration');
      } else if (simplifiedData) {
        setMigrationStatus('✅ Already using simplified meal plan');
      } else {
        setMigrationStatus('ℹ️ No meal plan data found');
      }
    } catch (error) {
      setMigrationStatus('❌ Error checking data: ' + error.message);
    }

    setIsChecking(false);
  };

  const performMigration = async () => {
    setIsMigrating(true);
    setMigrationStatus('');

    try {
      console.log('🔄 Migration: Starting legacy data migration...');

      // Load legacy data
      const legacyDataStr = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
      if (!legacyDataStr) {
        setMigrationStatus('❌ No legacy data found to migrate');
        setIsMigrating(false);
        return;
      }

      const legacyData = JSON.parse(legacyDataStr);
      console.log('📊 Migration: Found legacy data:', {
        name: legacyData.name,
        hasWeeks: !!legacyData.data?.weeks,
        weeksCount: legacyData.data?.weeks?.length || 0,
        hasDays: !!legacyData.data?.days,
        daysCount: legacyData.data?.days?.length || 0,
      });

      // Migrate using our context function
      const migrationSuccess = await migrateLegacyPlan(legacyData);

      if (migrationSuccess) {
        setMigrationStatus('✅ Migration completed successfully!');
        
        // Reload the new simplified plan
        await loadMealPlan();
        
        Alert.alert(
          'Migration Complete',
          'Your meal plan has been successfully migrated to the new simplified format. All your meals have been preserved.',
          [{ text: 'OK' }]
        );
      } else {
        setMigrationStatus('❌ Migration failed');
        Alert.alert('Migration Failed', 'There was an error migrating your data.');
      }
    } catch (error) {
      console.error('❌ Migration error:', error);
      setMigrationStatus('❌ Migration error: ' + error.message);
      Alert.alert('Migration Error', 'An unexpected error occurred during migration.');
    }

    setIsMigrating(false);
  };

  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will delete ALL meal plan data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
              await AsyncStorage.removeItem(NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLAN);
              setMigrationStatus('🗑️ All data cleared');
              Alert.alert('Data Cleared', 'All meal plan data has been deleted.');
            } catch (error) {
              setMigrationStatus('❌ Error clearing data: ' + error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Meal Plan Migration</Text>
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#3b82f6' }]}
        onPress={checkForLegacyData}
        disabled={isChecking}
      >
        <Text style={styles.buttonText}>
          {isChecking ? 'Checking...' : 'Check Data Status'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#10b981' }]}
        onPress={performMigration}
        disabled={isMigrating}
      >
        <Text style={styles.buttonText}>
          {isMigrating ? 'Migrating...' : 'Migrate to New System'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#ef4444' }]}
        onPress={clearAllData}
      >
        <Text style={styles.buttonText}>Clear All Data</Text>
      </TouchableOpacity>

      {migrationStatus && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{migrationStatus}</Text>
        </View>
      )}
    </View>
  );
};

// =============================================================================
// MIGRATION UTILITY FUNCTIONS
// =============================================================================

export const checkMigrationNeeded = async (): Promise<boolean> => {
  try {
    const legacyData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
    const simplifiedData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.SIMPLIFIED_MEAL_PLAN);
    
    return !!legacyData && !simplifiedData;
  } catch {
    return false;
  }
};

export const autoMigrateLegacyData = async (): Promise<boolean> => {
  try {
    const migrationNeeded = await checkMigrationNeeded();
    
    if (migrationNeeded) {
      console.log('🔄 AutoMigration: Legacy data detected, starting auto-migration...');
      
      const legacyDataStr = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
      if (legacyDataStr) {
        const legacyData = JSON.parse(legacyDataStr);
        
        // We'll need to create a simplified context instance here
        // For now, return false to indicate manual migration needed
        console.log('⚠️ AutoMigration: Manual migration required');
        return false;
      }
    }
    
    return true; // No migration needed or already done
  } catch (error) {
    console.error('❌ AutoMigration error:', error);
    return false;
  }
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
});