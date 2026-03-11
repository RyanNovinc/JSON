import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { SimplifiedMeal } from '../types/nutrition';

type MealPlanDayScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MealPlanDay'>;
type MealPlanDayScreenRouteProp = RouteProp<RootStackParamList, 'MealPlanDay'>;

interface SimplifiedMealPlanDayScreenProps {
  // NEW SIMPLE NAVIGATION: Just pass the date, not complex objects
  date: string; // "2024-02-20"
  dayName?: string; // "Monday" (optional, we can derive it)
}

export default function SimplifiedMealPlanDayScreen() {
  const navigation = useNavigation<MealPlanDayScreenNavigationProp>();
  const route = useRoute<MealPlanDayScreenRouteProp>();
  const { themeColor } = useTheme();
  
  // NEW CLEAN CONTEXT - Single source of truth
  const {
    getMealsForDate,
    addMealToDate,
    deleteMealFromDate,
    updateMeal,
    isLoading
  } = useSimplifiedMealPlanning();

  // For now, extract date from route params (we'll update navigation later)
  const { day, dayIndex, calculatedDayName } = route.params;
  const currentDate = day.date || new Date().toISOString().split('T')[0]; // Fallback to today
  
  // SIMPLE STATE - No complex data merging needed
  const [meals, setMeals] = useState<SimplifiedMeal[]>([]);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{ meal: SimplifiedMeal; index: number } | null>(null);
  
  // Modal states for adding meals
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealType, setNewMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [newMealTime, setNewMealTime] = useState('12:00 PM');
  const [newMealCalories, setNewMealCalories] = useState('');

  // =============================================================================
  // SIMPLE DATA LOADING - Always from storage, never stale
  // =============================================================================

  const loadMeals = () => {
    console.log(`🔄 SimplifiedScreen: Loading meals for ${currentDate}`);
    const currentMeals = getMealsForDate(currentDate);
    setMeals(currentMeals);
    console.log(`✅ SimplifiedScreen: Loaded ${currentMeals.length} meals for ${currentDate}`);
  };

  // Load meals when screen mounts or date changes
  useEffect(() => {
    loadMeals();
  }, [currentDate]);

  // Reload when screen comes into focus (ensures data consistency)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📱 SimplifiedScreen: Screen focused, reloading meals');
      loadMeals();
    });
    return unsubscribe;
  }, [navigation, currentDate]);

  // =============================================================================
  // SIMPLE MEAL OPERATIONS - Clean and reliable
  // =============================================================================

  const handleDeleteMeal = async (meal: SimplifiedMeal) => {
    console.log(`🗑️ SimplifiedScreen: Attempting to delete "${meal.name}" from ${currentDate}`);
    
    const success = await deleteMealFromDate(currentDate, meal.id);
    
    if (success) {
      console.log('✅ SimplifiedScreen: Deletion successful, reloading meals');
      loadMeals(); // Reload fresh data from storage
      setShowDeleteModal(false);
      setSelectedMeal(null);
      setShowActionSheet(false);
    } else {
      console.log('❌ SimplifiedScreen: Deletion failed');
      // Could show error alert here
    }
  };

  const handleAddMeal = async () => {
    if (!newMealName.trim()) return;

    console.log(`➕ SimplifiedScreen: Adding "${newMealName}" to ${currentDate}`);

    const newMeal: Omit<SimplifiedMeal, 'id'> = {
      name: newMealName.trim(),
      type: newMealType,
      time: newMealTime,
      calories: parseInt(newMealCalories) || 0,
      macros: { protein: 0, carbs: 0, fat: 0 },
      ingredients: [],
      instructions: [],
      tags: [],
      isOriginal: false,
    };

    const success = await addMealToDate(currentDate, newMeal);
    
    if (success) {
      console.log('✅ SimplifiedScreen: Addition successful, reloading meals');
      loadMeals(); // Reload fresh data from storage
      
      // Reset modal state
      setShowAddMealModal(false);
      setNewMealName('');
      setNewMealCalories('');
    } else {
      console.log('❌ SimplifiedScreen: Addition failed');
      // Could show error alert here
    }
  };

  // =============================================================================
  // UI EVENT HANDLERS
  // =============================================================================

  const handleMealLongPress = (meal: SimplifiedMeal, index: number) => {
    console.log(`📱 SimplifiedScreen: Long press on "${meal.name}"`);
    setSelectedMeal({ meal, index });
    setShowActionSheet(true);
  };

  const handleActionSheetAction = (action: string) => {
    if (!selectedMeal) return;

    if (action === 'delete') {
      setShowActionSheet(false);
      setShowDeleteModal(true);
    } else if (action === 'complete') {
      // TODO: Implement completion logic
      setShowActionSheet(false);
      setSelectedMeal(null);
    }
  };

  // =============================================================================
  // RENDER COMPONENTS
  // =============================================================================

  const renderMealItem = (meal: SimplifiedMeal, index: number) => (
    <TouchableOpacity
      key={meal.id}
      style={[styles.mealCard, { borderLeftColor: themeColor }]}
      onLongPress={() => handleMealLongPress(meal, index)}
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
      </View>
      
      {meal.ingredients.length > 0 && (
        <Text style={styles.mealIngredients} numberOfLines={2}>
          {meal.ingredients.map(ing => ing.item || ing.name).join(', ')}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderActionSheet = () => (
    <Modal visible={showActionSheet} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.actionSheet, { backgroundColor: 'white' }]}>
          <Text style={styles.actionSheetTitle}>
            {selectedMeal?.meal.name}
          </Text>
          
          <TouchableOpacity
            style={styles.actionSheetButton}
            onPress={() => handleActionSheetAction('complete')}
          >
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={[styles.actionSheetButtonText, { color: '#10b981' }]}>
              Mark as Complete
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionSheetButton}
            onPress={() => handleActionSheetAction('delete')}
          >
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
            <Text style={[styles.actionSheetButtonText, { color: '#ef4444' }]}>
              Delete Meal
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionSheetButton, { marginTop: 20 }]}
            onPress={() => {
              setShowActionSheet(false);
              setSelectedMeal(null);
            }}
          >
            <Text style={[styles.actionSheetButtonText, { color: '#666' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDeleteConfirmation = () => (
    <Modal visible={showDeleteModal} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.deleteModal, { backgroundColor: 'white' }]}>
          <Text style={styles.deleteTitle}>Delete Meal</Text>
          <Text style={styles.deleteMessage}>
            Are you sure you want to delete "{selectedMeal?.meal.name}"?
            {'\n\n'}This action cannot be undone.
          </Text>
          
          <View style={styles.deleteButtons}>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#f3f4f6' }]}
              onPress={() => {
                setShowDeleteModal(false);
                setSelectedMeal(null);
                setShowActionSheet(false);
              }}
            >
              <Text style={[styles.deleteButtonText, { color: '#374151' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: '#ef4444' }]}
              onPress={() => selectedMeal && handleDeleteMeal(selectedMeal.meal)}
            >
              <Text style={[styles.deleteButtonText, { color: 'white' }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAddMealModal = () => (
    <Modal visible={showAddMealModal} transparent={true} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.addMealModal, { backgroundColor: 'white' }]}>
          <Text style={styles.addMealTitle}>Add New Meal</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Meal name"
            value={newMealName}
            onChangeText={setNewMealName}
            autoFocus
          />
          
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              placeholder="Time (e.g., 12:00 PM)"
              value={newMealTime}
              onChangeText={setNewMealTime}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Calories"
              value={newMealCalories}
              onChangeText={setNewMealCalories}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.addMealButtons}>
            <TouchableOpacity
              style={[styles.addMealButton, { backgroundColor: '#f3f4f6' }]}
              onPress={() => {
                setShowAddMealModal(false);
                setNewMealName('');
                setNewMealCalories('');
              }}
            >
              <Text style={[styles.addMealButtonText, { color: '#374151' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.addMealButton, { backgroundColor: themeColor }]}
              onPress={handleAddMeal}
              disabled={!newMealName.trim()}
            >
              <Text style={[styles.addMealButtonText, { color: 'white' }]}>
                Add Meal
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading meal plan...</Text>
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
          
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{calculatedDayName || 'Meal Plan'}</Text>
            <Text style={styles.headerSubtitle}>{currentDate}</Text>
          </View>
          
          <TouchableOpacity onPress={() => setShowAddMealModal(true)}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {meals.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>
              {meals.length} meal{meals.length !== 1 ? 's' : ''} planned
            </Text>
            {meals.map((meal, index) => renderMealItem(meal, index))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No meals planned</Text>
            <Text style={styles.emptyStateSubtitle}>
              Tap the + button to add your first meal
            </Text>
          </View>
        )}
      </ScrollView>

      {renderActionSheet()}
      {renderDeleteConfirmation()}
      {renderAddMealModal()}
    </SafeAreaView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

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
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  mealCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
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
    marginRight: 10,
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
    marginBottom: 8,
  },
  mealType: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  manualLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mealIngredients: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  actionSheetButtonText: {
    fontSize: 16,
    marginLeft: 15,
  },
  deleteModal: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  deleteMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  addMealModal: {
    margin: 20,
    borderRadius: 20,
    padding: 20,
  },
  addMealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 15,
    backgroundColor: '#f9fafb',
  },
  inputRow: {
    flexDirection: 'row',
  },
  addMealButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  addMealButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addMealButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});