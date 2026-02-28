import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { MigrationHelper } from '../utils/migrationHelper';
import { SimplifiedMeal } from '../types/nutrition';

export default function MealPlanTestScreen() {
  const navigation = useNavigation();
  const [testDate] = useState('2024-02-20'); // Fixed test date
  const [meals, setMeals] = useState<SimplifiedMeal[]>([]);
  
  const {
    currentPlan,
    isLoading,
    getMealsForDate,
    addMealToDate,
    deleteMealFromDate,
    createNewPlan,
    saveMealPlan,
  } = useSimplifiedMealPlanning();

  // Load meals for test date
  const loadTestMeals = () => {
    const testMeals = getMealsForDate(testDate);
    setMeals(testMeals);
    console.log(`🧪 TestScreen: Loaded ${testMeals.length} meals for ${testDate}`);
  };

  useEffect(() => {
    loadTestMeals();
  }, [currentPlan]);

  // Create sample meal plan for testing
  const createSamplePlan = async () => {
    try {
      console.log('🧪 TestScreen: Creating sample meal plan...');
      
      const samplePlan = createNewPlan('Test Meal Plan', '2024-02-20', 7);
      
      // Add some sample meals to our test date
      await saveMealPlan(samplePlan);
      
      // Add sample meals
      await addMealToDate(testDate, {
        name: 'Sample Breakfast',
        type: 'breakfast',
        time: '8:00 AM',
        calories: 350,
        macros: { protein: 20, carbs: 40, fat: 12 },
        ingredients: [{ item: 'Oats', amount: 1, unit: 'cup' }],
        instructions: [{ step: 1, instruction: 'Cook oats with water' }],
        tags: [],
        isOriginal: true,
      });

      await addMealToDate(testDate, {
        name: 'Sample Lunch',
        type: 'lunch',
        time: '12:30 PM',
        calories: 450,
        macros: { protein: 30, carbs: 35, fat: 15 },
        ingredients: [{ item: 'Chicken', amount: 6, unit: 'oz' }],
        instructions: [{ step: 1, instruction: 'Grill chicken breast' }],
        tags: [],
        isOriginal: true,
      });

      await addMealToDate(testDate, {
        name: 'Sample Dinner',
        type: 'dinner',
        time: '7:00 PM',
        calories: 520,
        macros: { protein: 35, carbs: 45, fat: 18 },
        ingredients: [{ item: 'Salmon', amount: 6, unit: 'oz' }],
        instructions: [{ step: 1, instruction: 'Bake salmon with vegetables' }],
        tags: [],
        isOriginal: true,
      });
      
      loadTestMeals();
      Alert.alert('Success', 'Sample meal plan created with 3 meals!');
    } catch (error) {
      console.error('❌ TestScreen: Error creating sample plan:', error);
      Alert.alert('Error', 'Failed to create sample plan');
    }
  };

  // Test meal deletion
  const testDeleteMeal = async (meal: SimplifiedMeal) => {
    Alert.alert(
      'Delete Test',
      `Delete "${meal.name}" from ${testDate}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log(`🧪 TestScreen: Testing deletion of "${meal.name}"`);
            
            const success = await deleteMealFromDate(testDate, meal.id);
            
            if (success) {
              console.log('✅ TestScreen: Deletion successful');
              loadTestMeals(); // Reload to see updated list
              Alert.alert('Success', `"${meal.name}" deleted successfully!`);
            } else {
              console.log('❌ TestScreen: Deletion failed');
              Alert.alert('Error', 'Failed to delete meal');
            }
          },
        },
      ]
    );
  };

  // Test meal addition
  const testAddMeal = async () => {
    const newMealName = `Test Meal ${Date.now()}`;
    
    console.log(`🧪 TestScreen: Testing addition of "${newMealName}"`);
    
    const success = await addMealToDate(testDate, {
      name: newMealName,
      type: 'snack',
      time: '3:00 PM',
      calories: 200,
      macros: { protein: 10, carbs: 20, fat: 8 },
      ingredients: [],
      instructions: [],
      tags: ['test'],
      isOriginal: false,
    });

    if (success) {
      console.log('✅ TestScreen: Addition successful');
      loadTestMeals(); // Reload to see updated list
      Alert.alert('Success', `"${newMealName}" added successfully!`);
    } else {
      console.log('❌ TestScreen: Addition failed');
      Alert.alert('Error', 'Failed to add meal');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading simplified meal planning...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meal Plan Testing</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        
        {/* Migration Helper */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔧 Data Migration</Text>
          <MigrationHelper />
        </View>

        {/* Plan Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Current Plan Status</Text>
          <View style={styles.statusCard}>
            {currentPlan ? (
              <>
                <Text style={styles.statusText}>✅ Plan loaded: "{currentPlan.name}"</Text>
                <Text style={styles.statusSubtext}>
                  {Object.keys(currentPlan.dailyMeals).length} days configured
                </Text>
              </>
            ) : (
              <Text style={styles.statusText}>❌ No simplified plan loaded</Text>
            )}
          </View>
        </View>

        {/* Test Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Test Controls</Text>
          
          <TouchableOpacity style={styles.testButton} onPress={createSamplePlan}>
            <Ionicons name="create-outline" size={20} color="white" />
            <Text style={styles.testButtonText}>Create Sample Plan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={testAddMeal}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.testButtonText}>Test Add Meal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={loadTestMeals}>
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.testButtonText}>Reload Test Meals</Text>
          </TouchableOpacity>
        </View>

        {/* Test Date Meals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🍽️ Test Date: {testDate}</Text>
          
          {meals.length > 0 ? (
            meals.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                style={styles.mealCard}
                onPress={() => testDeleteMeal(meal)}
              >
                <View style={styles.mealHeader}>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <View style={styles.mealMeta}>
                    <Text style={styles.mealTime}>{meal.time}</Text>
                    <Text style={styles.mealCalories}>{meal.calories} cal</Text>
                  </View>
                </View>
                
                <View style={styles.mealDetails}>
                  <Text style={styles.mealType}>{meal.type.toUpperCase()}</Text>
                  {!meal.isOriginal && <Text style={styles.manualLabel}>MANUAL</Text>}
                  <Text style={styles.mealId}>ID: {meal.id.slice(-8)}</Text>
                </View>
                
                <Text style={styles.deleteHint}>Tap to test deletion</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No meals for this test date</Text>
              <Text style={styles.emptySubtext}>Create a sample plan to test</Text>
            </View>
          )}
        </View>

        {/* Debug Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Debug Info</Text>
          <View style={styles.debugCard}>
            <Text style={styles.debugText}>Test Date: {testDate}</Text>
            <Text style={styles.debugText}>Meals Count: {meals.length}</Text>
            <Text style={styles.debugText}>Plan Loaded: {currentPlan ? 'Yes' : 'No'}</Text>
            <Text style={styles.debugText}>Loading: {isLoading ? 'Yes' : 'No'}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 5,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  mealCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  mealMeta: {
    alignItems: 'flex-end',
  },
  mealTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  mealCalories: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginTop: 2,
  },
  mealDetails: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  mealType: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  manualLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  mealId: {
    fontSize: 10,
    color: '#9ca3af',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteHint: {
    fontSize: 12,
    color: '#ef4444',
    fontStyle: 'italic',
    marginTop: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 5,
  },
  debugCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 15,
  },
  debugText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});