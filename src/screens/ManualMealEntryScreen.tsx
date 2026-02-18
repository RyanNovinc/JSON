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
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';

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
  const { themeColor } = useTheme();
  const { addToFavorites } = useMealPlanning();

  // Basic Info
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(null);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');

  // Nutrition
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Optional sections
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [showIngredients, setShowIngredients] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

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

  const saveMeal = async () => {
    // Validation - only meal name is required
    if (!mealName.trim()) {
      Alert.alert('Missing Information', 'Please enter a meal name.');
      return;
    }

    try {
      const mealData = {
        id: 'manual_' + Date.now(),
        type: mealType || 'breakfast',
        name: mealName.trim(),
        description: `A custom ${mealType || 'meal'} recipe`,
        time: '12:00', // default time
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
        tags: ['custom'] as const,
        isFavorite: false,
      };

      await addToFavorites(mealData);

      Alert.alert('Success', 'Meal added to favorites!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
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
        <Text style={styles.headerTitle}>Add New Meal</Text>
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
});