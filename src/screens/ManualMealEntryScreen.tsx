import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import AsyncStorage from '../utils/smartStorage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface Ingredient {
  id: string;
  text: string;
}

interface Instruction {
  id: string;
  step: number;
  instruction: string;
}

export default function ManualMealEntryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { themeColor } = useTheme();
  const { addToFavorites, removeFromFavorites, getFavoriteMeals, refreshData } = useMealPlanning();
  const { updateMeal, currentPlan } = useSimplifiedMealPlanning();
  
  // Check if we're editing an existing meal
  const editMeal = route.params?.editMeal;
  const isEditing = route.params?.isEditing;

  // Initialize form data from edit meal if available
  const initializeIngredients = (mealIngredients: any[] = []) => {
    console.log('🥕 Initializing ingredients with:', mealIngredients);
    
    if (!mealIngredients || !Array.isArray(mealIngredients)) {
      console.log('⚠️ No valid ingredients array, returning empty');
      return [];
    }
    
    return mealIngredients.map((ing, index) => {
      console.log(`🥕 Processing ingredient ${index}:`, ing);
      
      let text = '';
      if (typeof ing === 'string') {
        text = ing;
      } else if (ing && typeof ing === 'object') {
        // Handle both SimplifiedMeal Ingredient format and legacy format
        if (ing.amount && ing.unit && ing.name) {
          // Skip generic units like "item" and just show the name with amount if meaningful
          if (ing.unit === 'item' && ing.amount === 1) {
            text = ing.name;
          } else if (ing.unit === 'item') {
            text = `${ing.amount} ${ing.name}`;
          } else {
            text = `${ing.amount} ${ing.unit} ${ing.name}`;
          }
        } else if (ing.name || ing.item) {
          text = ing.name || ing.item || '';
        } else {
          text = '';
        }
      }
      
      const result = {
        id: ing?.id || `ingredient_${index}`,
        text: text
      };
      
      console.log(`🥕 Result for ingredient ${index}:`, result);
      return result;
    });
  };

  const initializeInstructions = (mealInstructions: any[] = []) => {
    return mealInstructions.map((inst, index) => ({
      id: inst.id || `instruction_${index}`,
      step: inst.step || (index + 1),
      instruction: typeof inst === 'string' ? inst : inst.instruction || ''
    }));
  };

  // Basic Info
  const [mealName, setMealName] = useState(editMeal?.name || editMeal?.meal_name || '');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(editMeal?.type || editMeal?.meal_type || null);
  const [mealTime, setMealTime] = useState(editMeal?.time || '12:00');
  const [hasSpecificTime, setHasSpecificTime] = useState(!!editMeal?.time);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    if (editMeal?.time) {
      // Parse existing time into a Date object
      const [time, period] = editMeal.time.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period?.toLowerCase() === 'pm' && hours !== 12) hours += 12;
      if (period?.toLowerCase() === 'am' && hours === 12) hours = 0;
      
      const date = new Date();
      date.setHours(hours, minutes || 0, 0, 0);
      return date;
    }
    // Default to 12:00 PM
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    return date;
  });
  const [prepTime, setPrepTime] = useState(editMeal?.prepTime?.toString() || editMeal?.prep_time?.toString() || '');
  const [cookTime, setCookTime] = useState(editMeal?.cookTime?.toString() || editMeal?.cook_time?.toString() || '');

  // Nutrition
  const [calories, setCalories] = useState((editMeal?.nutritionInfo?.calories || editMeal?.calories)?.toString() || '');
  const [protein, setProtein] = useState((editMeal?.nutritionInfo?.protein || editMeal?.macros?.protein)?.toString() || '');
  const [carbs, setCarbs] = useState((editMeal?.nutritionInfo?.carbs || editMeal?.macros?.carbs)?.toString() || '');
  const [fat, setFat] = useState((editMeal?.nutritionInfo?.fat || editMeal?.macros?.fat)?.toString() || '');

  // Optional sections
  const [ingredients, setIngredients] = useState<Ingredient[]>(initializeIngredients(editMeal?.ingredients));
  const [instructions, setInstructions] = useState<Instruction[]>(initializeInstructions(editMeal?.instructions));
  const [showIngredients, setShowIngredients] = useState(editMeal?.ingredients?.length > 0 || false);
  const [showInstructions, setShowInstructions] = useState(editMeal?.instructions?.length > 0 || false);

  const addIngredient = () => {
    const newIngredient: Ingredient = {
      id: Date.now().toString(),
      text: '',
    };
    setIngredients([...ingredients, newIngredient]);
  };

  const updateIngredient = (id: string, value: string) => {
    setIngredients(ingredients.map(ing => 
      ing.id === id ? { ...ing, text: value } : ing
    ));
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const addInstruction = () => {
    const newInstruction: Instruction = {
      id: Date.now().toString(),
      step: instructions.length + 1,
      instruction: '',
    };
    setInstructions([...instructions, newInstruction]);
  };

  const updateInstruction = (id: string, value: string) => {
    setInstructions(instructions.map(inst => 
      inst.id === id ? { ...inst, instruction: value } : inst
    ));
  };

  const removeInstruction = (id: string) => {
    const updatedInstructions = instructions
      .filter(inst => inst.id !== id)
      .map((inst, index) => ({ ...inst, step: index + 1 }));
    setInstructions(updatedInstructions);
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setSelectedDate(selectedTime);
      const timeString = formatTime(selectedTime);
      setMealTime(timeString);
    }
  };

  const handleTimePickerDone = () => {
    setShowTimePicker(false);
  };

  const saveMeal = async () => {
    // Validation - only meal name is required
    if (!mealName.trim()) {
      Alert.alert('Missing Information', 'Please enter a meal name.');
      return;
    }

    console.log('💾 SAVE MEAL DEBUG START');
    console.log('💾 prepTime state:', prepTime);
    console.log('💾 cookTime state:', cookTime);
    console.log('💾 isEditing:', isEditing);
    console.log('💾 editMeal:', editMeal);

    try {
      const mealData = {
        id: isEditing ? editMeal.id : 'manual_' + Date.now(),
        type: mealType || 'breakfast',
        name: mealName.trim(),
        description: editMeal?.description || `A custom ${mealType || 'meal'} recipe`,
        time: hasSpecificTime ? mealTime : '', // use selected time or empty for no specific time
        ingredients: ingredients
          .filter(ing => ing.text.trim())
          .map((ing, index) => {
            const text = ing.text.trim();
            const parts = text.split(' ');
            
            // If it's just a number or single word, treat it as the name
            if (parts.length <= 2) {
              return {
                id: ing.id,
                name: text,
                amount: 1,
                unit: 'item',
                category: 'other' as const,
                estimatedCost: 0,
                isOptional: false,
              };
            }
            
            // Try to parse amount/unit/name for longer entries
            const firstPart = parts[0];
            const isNumber = !isNaN(parseFloat(firstPart));
            
            if (isNumber) {
              const amount = parseFloat(firstPart);
              const unit = parts[1] || 'piece';
              const name = parts.slice(2).join(' ') || text;
              
              return {
                id: ing.id,
                name: name,
                amount: amount,
                unit: unit,
                category: 'other' as const,
                estimatedCost: 0,
                isOptional: false,
              };
            } else {
              // No number detected, treat whole thing as name
              return {
                id: ing.id,
                name: text,
                amount: 1,
                unit: 'item',
                category: 'other' as const,
                estimatedCost: 0,
                isOptional: false,
              };
            }
          }),
        instructions: instructions
          .filter(inst => inst.instruction.trim())
          .map(inst => ({
            step: inst.step,
            instruction: inst.instruction.trim(),
          })),
        nutritionInfo: {
          calories: parseInt(calories) || 0,
          protein: parseInt(protein) || 0,
          carbs: parseInt(carbs) || 0,
          fat: parseInt(fat) || 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        },
        difficulty: 'easy' as const,
        prepTime: parseInt(prepTime) || 0,
        cookTime: parseInt(cookTime) || 0,
        servings: 1,
        tags: editMeal?.tags || ['custom'] as const,
        isFavorite: editMeal?.isFavorite || false,
      };

      console.log('💾 Created mealData:');
      console.log('💾 mealData.prepTime:', mealData.prepTime);
      console.log('💾 mealData.cookTime:', mealData.cookTime);

      if (isEditing) {
        console.log('Editing meal with ID:', editMeal.id);
        
        // Update favorites if this meal is in favorites
        const currentFavorites = getFavoriteMeals();
        const isInFavorites = currentFavorites.some(fav => fav.mealId === editMeal.id);
        
        if (isInFavorites) {
          const updatedFavorites = currentFavorites.map(fav => {
            if (fav.mealId === editMeal.id) {
              // Update the existing favorite with new meal data
              return {
                ...fav,
                meal: mealData,
                // Keep original metadata
                mealId: mealData.id,
                addedAt: fav.addedAt,
                timesCooked: fav.timesCooked,
                lastCookedAt: fav.lastCookedAt
              };
            }
            return fav;
          });
          
          // Save to AsyncStorage and refresh context state
          await AsyncStorage.setItem('favoriteMeals', JSON.stringify(updatedFavorites));
          await refreshData();
        }
        
        // Also update the meal in the current plan if it exists
        if (currentPlan) {
          console.log('🔍 Looking for meal with ID:', editMeal.id, 'in current plan');
          console.log('🗓️ Plan has dates:', Object.keys(currentPlan.dailyMeals));
          
          // Find the meal in the plan and update it
          let mealFound = false;
          for (const [date, dayData] of Object.entries(currentPlan.dailyMeals)) {
            console.log(`📅 Checking date ${date} with ${dayData.meals.length} meals`);
            const mealIndex = dayData.meals.findIndex(meal => meal.id === editMeal.id);
            if (mealIndex !== -1) {
              console.log(`✅ Found meal at index ${mealIndex} on date ${date}`);
            }
            if (mealIndex !== -1) {
              // Convert the meal data to SimplifiedMeal format
              console.log('⏰ DEBUG SAVE - mealData.prepTime:', mealData.prepTime);
              console.log('⏰ DEBUG SAVE - mealData.cookTime:', mealData.cookTime);
              
              const simplifiedMealData = {
                id: mealData.id,
                name: mealData.name,
                type: mealData.type,
                time: mealData.time,
                calories: mealData.nutritionInfo.calories,
                macros: {
                  protein: mealData.nutritionInfo.protein,
                  carbs: mealData.nutritionInfo.carbs,
                  fat: mealData.nutritionInfo.fat,
                },
                ingredients: mealData.ingredients,
                instructions: mealData.instructions,
                tags: mealData.tags || [],
                prep_time: mealData.prepTime,
                cook_time: mealData.cookTime,
                servings: mealData.servings,
                isOriginal: editMeal.isOriginal || false,
                addedAt: editMeal.addedAt || new Date().toISOString(),
              };
              
              console.log('⏰ DEBUG SAVE - simplifiedMealData.prep_time:', simplifiedMealData.prep_time);
              console.log('⏰ DEBUG SAVE - simplifiedMealData.cook_time:', simplifiedMealData.cook_time);
              
              const success = await updateMeal(date, editMeal.id, simplifiedMealData);
              if (success) {
                console.log(`✅ Updated meal in plan on date: ${date}`);
                mealFound = true;
              }
              break;
            }
          }
          
          if (!mealFound) {
            console.log('⚠️ Meal not found in current plan');
          }
        }
        
        Alert.alert('Success', 'Meal updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await addToFavorites(mealData);
        console.log('Added new meal:', mealData.name);
        Alert.alert('Success', 'Meal added to favorites!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    }
  };

  const MealTypeSelector = () => (
    <View style={styles.mealTypeContainer}>
      <Text style={styles.sectionLabel}>Meal Type</Text>
      <View style={styles.mealTypeButtons}>
        {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.mealTypeButton,
              mealType === type && { backgroundColor: themeColor }
            ]}
            onPress={() => setMealType(mealType === type ? null : type)}
          >
            <Text style={[
              styles.mealTypeText,
              mealType === type && { color: '#0a0a0b' }
            ]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Meal' : 'Add New Meal'}</Text>
        <TouchableOpacity onPress={saveMeal} style={styles.saveButton}>
          <Text style={[styles.saveButtonText, { color: themeColor }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Meal Name - Hero Input */}
        <View style={styles.heroSection}>
          <TextInput
            style={styles.heroInput}
            placeholder="Meal name..."
            placeholderTextColor="#3f3f46"
            value={mealName}
            onChangeText={setMealName}
            autoFocus
          />
        </View>

        {/* Meal Type Pills */}
        <View style={styles.pillSection}>
          <View style={styles.mealTypePills}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pill,
                  mealType === type && { backgroundColor: themeColor }
                ]}
                onPress={() => setMealType(mealType === type ? null : type)}
              >
                <Text style={[
                  styles.pillText,
                  mealType === type && { color: '#0a0a0b' }
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Meal Time Section - Central */}
        <View style={styles.centralTimeSection}>
          <Text style={styles.timeLabel}>When will you eat this?</Text>
          <TouchableOpacity 
            style={styles.centralTimeButton}
            onPress={() => {
              setHasSpecificTime(!hasSpecificTime);
              if (!hasSpecificTime) {
                setShowTimePicker(true);
              }
            }}
          >
            <Ionicons 
              name="time-outline" 
              size={24} 
              color={hasSpecificTime ? themeColor : '#71717a'} 
            />
            <Text style={[
              styles.centralTimeText,
              hasSpecificTime && { color: themeColor }
            ]}>
              {hasSpecificTime ? mealTime : 'Anytime'}
            </Text>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color="#71717a" 
            />
          </TouchableOpacity>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStatsSection}>
          <View style={styles.statGroup}>
            <TextInput
              style={styles.statInput}
              placeholder="0"
              placeholderTextColor="#71717a"
              value={prepTime}
              onChangeText={setPrepTime}
              keyboardType="numeric"
            />
            <Text style={styles.statLabel}>prep min</Text>
          </View>
          <View style={styles.statGroup}>
            <TextInput
              style={styles.statInput}
              placeholder="0"
              placeholderTextColor="#71717a"
              value={cookTime}
              onChangeText={setCookTime}
              keyboardType="numeric"
            />
            <Text style={styles.statLabel}>cook min</Text>
          </View>
          <View style={styles.statGroup}>
            <TextInput
              style={[styles.statInput, styles.caloriesInput]}
              placeholder="0"
              placeholderTextColor="#71717a"
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
            />
            <Text style={styles.statLabel}>cal</Text>
          </View>
        </View>

        {/* Macros Row */}
        <View style={styles.macrosSection}>
          <View style={styles.macroGroup}>
            <Text style={styles.macroLabel}>P</Text>
            <TextInput
              style={styles.macroInput}
              placeholder="0"
              placeholderTextColor="#71717a"
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.macroGroup}>
            <Text style={styles.macroLabel}>C</Text>
            <TextInput
              style={styles.macroInput}
              placeholder="0"
              placeholderTextColor="#71717a"
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.macroGroup}>
            <Text style={styles.macroLabel}>F</Text>
            <TextInput
              style={styles.macroInput}
              placeholder="0"
              placeholderTextColor="#71717a"
              value={fat}
              onChangeText={setFat}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Expandable Sections */}
        <View style={styles.expandableSection}>
          <TouchableOpacity 
            style={styles.expandHeader}
            onPress={() => setShowIngredients(!showIngredients)}
          >
            <Text style={styles.expandTitle}>Ingredients</Text>
            <Ionicons 
              name={showIngredients ? "remove" : "add"} 
              size={18} 
              color="#71717a" 
            />
          </TouchableOpacity>

          {showIngredients && (
            <View style={styles.expandContent}>
              {ingredients.map((ingredient) => (
                <View key={ingredient.id} style={styles.ingredientRow}>
                  <TextInput
                    style={styles.ingredientInput}
                    placeholder="1 cup Greek yogurt"
                    placeholderTextColor="#71717a"
                    value={ingredient.text}
                    onChangeText={(value) => updateIngredient(ingredient.id, value)}
                  />
                  <TouchableOpacity onPress={() => removeIngredient(ingredient.id)}>
                    <Ionicons name="close" size={16} color="#71717a" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity style={styles.addMore} onPress={addIngredient}>
                <Ionicons name="add" size={14} color={themeColor} />
                <Text style={[styles.addMoreText, { color: themeColor }]}>Add ingredient</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.expandableSection}>
          <TouchableOpacity 
            style={styles.expandHeader}
            onPress={() => setShowInstructions(!showInstructions)}
          >
            <Text style={styles.expandTitle}>Instructions</Text>
            <Ionicons 
              name={showInstructions ? "remove" : "add"} 
              size={18} 
              color="#71717a" 
            />
          </TouchableOpacity>

          {showInstructions && (
            <View style={styles.expandContent}>
              {instructions.map((instruction) => (
                <View key={instruction.id} style={styles.instructionRow}>
                  <Text style={styles.stepDot}>{instruction.step}</Text>
                  <TextInput
                    style={styles.instructionInput}
                    placeholder="Add step..."
                    placeholderTextColor="#71717a"
                    value={instruction.instruction}
                    onChangeText={(value) => updateInstruction(instruction.id, value)}
                    multiline
                  />
                  <TouchableOpacity onPress={() => removeInstruction(instruction.id)}>
                    <Ionicons name="close" size={16} color="#71717a" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity style={styles.addMore} onPress={addInstruction}>
                <Ionicons name="add" size={14} color={themeColor} />
                <Text style={[styles.addMoreText, { color: themeColor }]}>Add step</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <Modal transparent animationType="fade" visible={showTimePicker}>
          <View style={styles.timePickerModalOverlay}>
            <View style={styles.timePickerModal}>
              <View style={styles.timePickerHeader}>
                <TouchableOpacity 
                  onPress={() => setShowTimePicker(false)}
                  style={styles.timePickerButton}
                >
                  <Text style={styles.timePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.timePickerTitle}>Set Meal Time</Text>
                <TouchableOpacity 
                  onPress={handleTimePickerDone}
                  style={styles.timePickerButton}
                >
                  <Text style={[styles.timePickerButtonText, { color: themeColor }]}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                style={styles.timePicker}
                textColor="#ffffff"
              />
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#ffffff',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  heroSection: {
    marginBottom: 32,
  },
  heroInput: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  pillSection: {
    marginBottom: 40,
  },
  mealTypePills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#18181b',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  quickStatsSection: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  statGroup: {
    alignItems: 'center',
    gap: 6,
  },
  statInput: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    minWidth: 60,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  caloriesInput: {
    borderBottomColor: '#3b82f6',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 11,
    color: '#71717a',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macrosSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 48,
    paddingVertical: 16,
    backgroundColor: '#111111',
    borderRadius: 12,
  },
  macroGroup: {
    alignItems: 'center',
    gap: 8,
  },
  macroLabel: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '600',
  },
  macroInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    minWidth: 40,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  expandableSection: {
    marginBottom: 16,
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  expandTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  expandContent: {
    paddingTop: 16,
    gap: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ingredientInput: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111111',
    borderRadius: 8,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#27272a',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
  },
  instructionInput: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#111111',
    borderRadius: 8,
    minHeight: 44,
  },
  addMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 500,
  },
  centralTimeSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  centralTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  centralTimeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  timePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  timePickerModal: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  timePickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timePickerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#71717a',
  },
  timePicker: {
    backgroundColor: '#18181b',
    marginTop: 20,
  },
});