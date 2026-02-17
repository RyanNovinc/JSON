import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Linking,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { getMealPlanPrompt } from '../data/mealPlanPrompt';
import { generateUserMealPlanPrompt } from '../data/generateUserMealPrompt';
import { generateJsonConversionPrompt } from '../data/generateJsonConversionPrompt';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage } from '../utils/storage';

type ImportMealPlanNavigationProp = StackNavigationProp<RootStackParamList, 'ImportMealPlan'>;

interface MealPlan {
  plan_name: string;
  description?: string;
  duration_days: number;
  total_meals: number;
  weeks: Array<{
    week_number: number;
    days: Array<{
      day_name: string;
      day_number: number;
      meals: Array<{
        meal_name: string;
        meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
        prep_time?: number;
        cook_time?: number;
        total_time?: number;
        servings?: number;
        calories?: number;
        macros?: {
          protein: number;
          carbs: number;
          fat: number;
          fiber?: number;
        };
        ingredients: Array<{
          item: string;
          amount: string;
          unit: string;
          notes?: string;
        }>;
        instructions: string[];
        notes?: string;
        tags?: string[];
      }>;
    }>;
  }>;
  id?: string;
}

export default function ImportMealPlanScreen() {
  const navigation = useNavigation<ImportMealPlanNavigationProp>();
  const { themeColor } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [parsedMealPlan, setParsedMealPlan] = useState<MealPlan | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [planningPromptCopied, setPlanningPromptCopied] = useState(false);
  const [aiPromptCopied, setAiPromptCopied] = useState(false);
  const [auditPromptCopied, setAuditPromptCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sampleCopied, setSampleCopied] = useState(false);
  const [modalScale] = useState(new Animated.Value(0));
  const [modalOpacity] = useState(new Animated.Value(0));
  const [successScale] = useState(new Animated.Value(0));
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState(false);
  const [instructionsCreationMode, setInstructionsCreationMode] = useState<'quick' | 'research'>('quick');
  const [showModeInfo, setShowModeInfo] = useState(false);

  const sampleMealPlan = {
    "plan_name": "Quick Start - Balanced Meal Plan",
    "description": "3-day sample meal plan to try the app",
    "duration_days": 3,
    "total_meals": 9,
    "weeks": [
      {
        "week_number": 1,
        "days": [
          {
            "day_name": "Monday",
            "day_number": 1,
            "meals": [
              {
                "meal_name": "Greek Yogurt Bowl",
                "meal_type": "breakfast",
                "prep_time": 5,
                "cook_time": 0,
                "total_time": 5,
                "servings": 1,
                "calories": 320,
                "macros": {
                  "protein": 20,
                  "carbs": 35,
                  "fat": 8,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Greek yogurt",
                    "amount": "1",
                    "unit": "cup",
                    "notes": "plain, non-fat"
                  },
                  {
                    "item": "Mixed berries",
                    "amount": "0.5",
                    "unit": "cup"
                  },
                  {
                    "item": "Honey",
                    "amount": "1",
                    "unit": "tbsp"
                  },
                  {
                    "item": "Granola",
                    "amount": "2",
                    "unit": "tbsp"
                  }
                ],
                "instructions": [
                  "Add Greek yogurt to bowl",
                  "Top with mixed berries",
                  "Drizzle honey over berries",
                  "Sprinkle granola on top"
                ],
                "notes": "Use frozen berries if fresh not available",
                "tags": ["high-protein", "quick", "vegetarian"]
              },
              {
                "meal_name": "Grilled Chicken Salad",
                "meal_type": "lunch",
                "prep_time": 10,
                "cook_time": 15,
                "total_time": 25,
                "servings": 1,
                "calories": 450,
                "macros": {
                  "protein": 35,
                  "carbs": 15,
                  "fat": 25,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Chicken breast",
                    "amount": "4",
                    "unit": "oz"
                  },
                  {
                    "item": "Mixed greens",
                    "amount": "2",
                    "unit": "cups"
                  },
                  {
                    "item": "Cherry tomatoes",
                    "amount": "0.5",
                    "unit": "cup"
                  },
                  {
                    "item": "Avocado",
                    "amount": "0.5",
                    "unit": "medium"
                  },
                  {
                    "item": "Olive oil",
                    "amount": "1",
                    "unit": "tbsp"
                  },
                  {
                    "item": "Lemon juice",
                    "amount": "1",
                    "unit": "tbsp"
                  }
                ],
                "instructions": [
                  "Season and grill chicken breast until cooked through",
                  "Let chicken rest, then slice",
                  "Combine greens, tomatoes in bowl",
                  "Add sliced chicken and avocado",
                  "Whisk olive oil and lemon juice",
                  "Drizzle dressing over salad"
                ],
                "notes": "Cook chicken to internal temp of 165°F",
                "tags": ["high-protein", "low-carb", "gluten-free"]
              }
            ]
          }
        ]
      }
    ]
  };

  const handleCopySample = async () => {
    const sampleJson = JSON.stringify(sampleMealPlan, null, 2);
    await Clipboard.setStringAsync(sampleJson);
    setSampleCopied(true);
    setTimeout(() => {
      setSampleCopied(false);
    }, 2000);
  };

  const validateAndParseJSON = (input: string): MealPlan | null => {
    let parsed: any;
    
    // Normalize smart quotes to straight quotes before parsing
    let text = input;
    text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');  // curly double quotes
    text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");  // curly single quotes
    
    // Enhanced JSON parsing with detailed error reporting
    try {
      parsed = JSON.parse(text);
    } catch (jsonError) {
      const error = jsonError as Error;
      let detailedError = 'JSON Parse Error:\n\n';
      
      // Extract position information from error message
      const positionMatch = error.message.match(/position (\d+)/i) || 
                           error.message.match(/at position (\d+)/i) ||
                           error.message.match(/column (\d+)/i);
      
      const lineMatch = error.message.match(/line (\d+)/i);
      
      if (positionMatch || lineMatch) {
        const position = positionMatch ? parseInt(positionMatch[1]) : null;
        const line = lineMatch ? parseInt(lineMatch[1]) : null;
        
        if (position !== null) {
          detailedError += `Error at position ${position}`;
          if (line) detailedError += ` (line ${line})`;
          detailedError += '\n\n';
          
          // Show snippet around error position
          const start = Math.max(0, position - 50);
          const end = Math.min(text.length, position + 50);
          const snippet = text.slice(start, end);
          const errorPos = position - start;
          
          detailedError += 'Context:\n';
          detailedError += `...${snippet.slice(0, errorPos)}⚠️${snippet.slice(errorPos)}...\n\n`;
        }
      }
      
      // Detect specific common issues
      const rawError = error.message.toLowerCase();
      
      if (rawError.includes('unexpected end') || rawError.includes('unterminated')) {
        detailedError += '🔍 Issue: JSON appears truncated or incomplete\n';
        detailedError += '💡 Solution: File may be too large for mobile clipboard. Try:\n';
        detailedError += '• Use a smaller meal plan file\n';
        detailedError += '• Import via computer/simulator\n';
        detailedError += '• Copy in smaller chunks\n';
      } else if (input.includes('\u201c') || input.includes('\u201d') || input.includes('\u2018') || input.includes('\u2019')) {
        detailedError += '🔍 Issue: Smart/curly quotes were detected and auto-fixed\n';
        detailedError += '💡 Note: Quotes were normalized, but there may be other syntax issues\n';
      } else if (rawError.includes('unexpected token')) {
        const tokenMatch = error.message.match(/unexpected token '(.*)'/i) || 
                          error.message.match(/unexpected token (.*) in/i);
        if (tokenMatch) {
          detailedError += `🔍 Issue: Unexpected character "${tokenMatch[1]}"\n`;
          detailedError += '💡 Solution: Remove invalid characters or fix JSON syntax\n';
        }
      } else if (text.trim().startsWith('```')) {
        detailedError += '🔍 Issue: Code block markers found\n';
        detailedError += '💡 Solution: Copy only the JSON content, not the ```json markers\n';
      } else if (!text.trim().startsWith('{')) {
        detailedError += '🔍 Issue: JSON must start with {\n';
        detailedError += '💡 Solution: Copy the complete JSON object\n';
      } else {
        detailedError += '🔍 Issue: JSON syntax error\n';
        detailedError += '💡 Common fixes:\n';
        detailedError += '• Check for missing commas between items\n';
        detailedError += '• Remove trailing commas\n';
        detailedError += '• Ensure all brackets are properly closed\n';
        detailedError += '• Use straight quotes, not curly quotes\n';
      }
      
      detailedError += '\n📋 Raw error: ' + error.message;
      
      setErrorMessage(detailedError);
      return null;
    }
    
    // Continue with existing validation logic
    try {
      
      // Basic validation
      if (!parsed.plan_name || typeof parsed.plan_name !== 'string') {
        throw new Error('Invalid meal plan name');
      }
      
      if (!parsed.duration_days || typeof parsed.duration_days !== 'number') {
        throw new Error('Invalid duration days');
      }

      if (!parsed.total_meals || typeof parsed.total_meals !== 'number') {
        throw new Error('Invalid total meals count');
      }
      
      if (!Array.isArray(parsed.days) || parsed.days.length === 0) {
        throw new Error('No meal plan days found');
      }
      
      // Validate plan-level optional fields
      if (parsed.description && typeof parsed.description !== 'string') {
        throw new Error('Description must be a string');
      }

      // Validate days structure
      parsed.days.forEach((day: any, dayIndex: number) => {
        if (!day.day_name || !day.day_number) {
          throw new Error(`Day ${dayIndex + 1} needs day_name and day_number`);
        }
        
        if (!Array.isArray(day.meals) || day.meals.length === 0) {
          throw new Error(`"${day.day_name}" has no meals`);
        }
        
        day.meals.forEach((meal: any, mealIndex: number) => {
            // Validate required fields
            if (!meal.meal_name || !meal.meal_type || 
                !Array.isArray(meal.ingredients) || meal.ingredients.length === 0 ||
                !Array.isArray(meal.instructions) || meal.instructions.length === 0) {
              throw new Error(`Meal ${mealIndex + 1} in "${day.day_name}" is missing required fields`);
            }
            
            // Validate meal type
            const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
            if (!validMealTypes.includes(meal.meal_type)) {
              throw new Error(`Meal "${meal.meal_name}" has invalid meal_type. Must be one of: ${validMealTypes.join(', ')}`);
            }
            
            // Validate ingredients
            meal.ingredients.forEach((ingredient: any, ingredientIndex: number) => {
              if (!ingredient.item || !ingredient.amount || !ingredient.unit) {
                throw new Error(`Ingredient ${ingredientIndex + 1} in "${meal.meal_name}" is missing required fields (item, amount, unit)`);
              }
              // No glossary validation - AI can use any ingredient names
            });
            
            // Validate optional numeric fields
            const numericFields = ['prep_time', 'cook_time', 'total_time', 'servings', 'calories'];
            numericFields.forEach(field => {
              if (meal[field] && (typeof meal[field] !== 'number' || meal[field] <= 0)) {
                throw new Error(`Meal "${meal.meal_name}" has invalid ${field} value`);
              }
            });
            
            // Validate macros if present
            if (meal.macros) {
              if (typeof meal.macros !== 'object' || meal.macros === null) {
                throw new Error(`Meal "${meal.meal_name}" has invalid macros format`);
              }
              const requiredMacros = ['protein', 'carbs', 'fat'];
              requiredMacros.forEach(macro => {
                if (typeof meal.macros[macro] !== 'number' || meal.macros[macro] < 0) {
                  throw new Error(`Meal "${meal.meal_name}" has invalid ${macro} value in macros`);
                }
              });
            }
            
            // Validate tags if present
            if (meal.tags && !Array.isArray(meal.tags)) {
              throw new Error(`Meal "${meal.meal_name}" tags must be an array`);
            }
          });
        });
      
      // Validate optional grocery list if present
      if (parsed.grocery_list) {
        if (typeof parsed.grocery_list !== 'object') {
          throw new Error('grocery_list must be an object');
        }
        
        if (parsed.grocery_list.categories && !Array.isArray(parsed.grocery_list.categories)) {
          throw new Error('grocery_list.categories must be an array');
        }
        
        if (parsed.grocery_list.categories) {
          parsed.grocery_list.categories.forEach((category: any, catIndex: number) => {
            if (!category.category_name) {
              throw new Error(`Grocery category ${catIndex + 1} missing category_name`);
            }
            
            if (category.items && !Array.isArray(category.items)) {
              throw new Error(`Grocery category "${category.category_name}" items must be an array`);
            }
          });
        }
      }
      
      return parsed as MealPlan;
    } catch (validationError) {
      const error = validationError as Error;
      const detailedError = `⚠️ Validation Error:\n\n${error.message}\n\n💡 This means your JSON was parsed successfully, but the meal plan structure has issues. Please check that all required fields are present and correctly formatted.`;
      
      setErrorMessage(detailedError);
      return null;
    }
  };

  const handlePasteAndImport = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      Alert.alert('Clipboard Empty', 'Copy your meal plan first', [{ text: 'OK' }]);
      return;
    }

    processMealPlanData(text);
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        // Read file content
        const response = await fetch(file.uri);
        const text = await response.text();
        
        processMealPlanData(text);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to read file. Please try again.', [{ text: 'OK' }]);
      console.error('File upload error:', error);
    }
  };

  const processMealPlanData = async (text: string) => {
    setIsLoading(true);
    const startTime = Date.now();
    setGenerationStartTime(startTime);
    
    // Simulate processing time for better UX
    setTimeout(() => {
      const mealPlan = validateAndParseJSON(text);
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000; // Convert to seconds
      setGenerationTime(totalTime);
      setIsLoading(false);
      
      if (mealPlan) {
        // Generate unique ID for this meal plan import
        const mealPlanId = Date.now().toString() + Math.random().toString(36);
        mealPlan.id = mealPlanId;
        setParsedMealPlan(mealPlan);
        setShowConfirmation(true);
        
        // Animate modal entrance with futuristic easing
        Animated.parallel([
          Animated.timing(modalScale, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(modalOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, 800);
  };

  const handleConfirmImport = async () => {
    if (parsedMealPlan) {
      // Success animation
      Animated.sequence([
        Animated.spring(successScale, {
          toValue: 1.2,
          useNativeDriver: true,
          duration: 200,
        }),
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          duration: 150,
        }),
      ]).start();

      // Save the meal plan to storage
      try {
        // Transform the parsed meal plan to match the MealPlan interface
        const transformedMealPlan = {
          id: parsedMealPlan.id,
          name: parsedMealPlan.plan_name,
          duration: parsedMealPlan.duration_days,
          meals: parsedMealPlan.total_meals,
          data: parsedMealPlan,  // Store the complete JSON data
        };
        
        await WorkoutStorage.addMealPlan(transformedMealPlan);
      } catch (error) {
        console.error('Failed to save meal plan:', error);
      }

      setTimeout(() => {
        // Animate modal exit
        Animated.parallel([
          Animated.timing(modalScale, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(modalOpacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowConfirmation(false);
          modalScale.setValue(0);
          modalOpacity.setValue(0);
          successScale.setValue(0);
          
          navigation.navigate('NutritionHome', { 
            refresh: true
          } as any);
        });
      }, 500);
    }
  };

  const handleModalCancel = () => {
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowConfirmation(false);
      setParsedMealPlan(null);
      modalScale.setValue(0);
      modalOpacity.setValue(0);
    });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>Processing meal plan...</Text>
      </View>
    );
  }

  if (showInstructions) {
    return (
      <View style={styles.container}>
        <View style={styles.closeButtonWrapper}>
          <TouchableOpacity onPress={() => setShowInstructions(false)} style={styles.closeButtonInner}>
            <Ionicons name="close" size={28} color="#71717a" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.instructionsContainer}>
          <ScrollView 
            style={styles.instructionsScrollView}
            contentContainerStyle={styles.instructionsContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ height: 60 }} />
            
            {/* Mode Selection Section */}
            <View style={styles.modeSection}>
              <View style={styles.simpleModeToggle}>
                <TouchableOpacity
                  style={[
                    styles.simpleOption,
                    instructionsCreationMode === 'quick' && [styles.simpleOptionActive, { backgroundColor: themeColor }]
                  ]}
                  onPress={() => setInstructionsCreationMode('quick')}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.simpleOptionText,
                    instructionsCreationMode === 'quick' && { color: '#0a0a0b' }
                  ]}>Quick</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.simpleOption,
                    instructionsCreationMode === 'research' && [styles.simpleOptionActive, { backgroundColor: themeColor }]
                  ]}
                  onPress={() => setInstructionsCreationMode('research')}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.simpleOptionText,
                    instructionsCreationMode === 'research' && { color: '#0a0a0b' }
                  ]}>Research</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.centeredInfoButton}
                onPress={() => setShowModeInfo(!showModeInfo)}
                activeOpacity={0.7}
              >
                <Text style={[styles.infoButtonText, { color: themeColor }]}>What's the difference?</Text>
                <Ionicons 
                  name={showModeInfo ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color={themeColor} 
                />
              </TouchableOpacity>
              
              {showModeInfo && (
                <View style={[styles.infoCard, { borderColor: themeColor + '20' }]}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoColumn}>
                      <Text style={[styles.infoTitle, { color: themeColor }]}>Quick</Text>
                      <Text style={styles.infoDesc}>Faster but less accurate meal plan</Text>
                    </View>
                    <View style={styles.infoDivider} />
                    <View style={styles.infoColumn}>
                      <Text style={[styles.infoTitle, { color: themeColor }]}>Research</Text>
                      <Text style={styles.infoDesc}>Longer but more accurate meal plan</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.stepsContainer}>
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>Plan Your Meals</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  {instructionsCreationMode === 'research' 
                    ? 'Send this enhanced prompt for research-verified meal planning'
                    : 'Send this prompt to your AI of choice for quick meal planning'
                  }
                </Text>
                {instructionsCreationMode === 'research' && (
                  <View style={[styles.researchNote, { borderColor: themeColor + '30', backgroundColor: themeColor + '10' }]}>
                    <Ionicons name="information-circle" size={16} color={themeColor} />
                    <Text style={[styles.researchNoteText, { color: themeColor }]}>
                      Enable web search/research tools in your AI (Claude, ChatGPT, etc.)
                    </Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColor }]}
                  onPress={async () => {
                    try {
                      const planningPrompt = await generateUserMealPlanPrompt(instructionsCreationMode === 'research');
                      await Clipboard.setStringAsync(planningPrompt);
                      setPlanningPromptCopied(true);
                      setTimeout(() => {
                        setPlanningPromptCopied(false);
                      }, 2000);
                    } catch (error) {
                      Alert.alert(
                        'Missing Data',
                        error instanceof Error ? error.message : 'Please complete the required questionnaires first.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={18} color="#0a0a0b" />
                  <Text style={styles.actionButtonText}>
                    {planningPromptCopied ? 'Copied!' : `Copy ${instructionsCreationMode === 'research' ? 'Research' : 'Quick'} Planning Prompt`}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {instructionsCreationMode === 'research' && (
                <View style={styles.stepCard}>
                  <View style={styles.stepCardHeader}>
                    <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                      <Text style={styles.stepBadgeText}>2</Text>
                    </View>
                    <Text style={styles.stepCardTitle}>Critical Audit</Text>
                  </View>
                  <Text style={styles.stepCardDescription}>
                    Challenge the AI to prove its research with this skeptical follow-up
                  </Text>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: themeColor }]}
                    onPress={async () => {
                      const auditPrompt = `I'm skeptical about the accuracy of your research and calculations. Can you prove the legitimacy of what you just presented? Specifically:

1. Source Verification: Show me the actual URLs or direct links you used for pricing verification. Provide the specific links you accessed.

2. Macro Math Audit: Walk me through the exact calculations for your protein/macro claims. Show the database entries you used and any conversions you applied.

3. Pricing Reality Check: Prove your pricing claims are accurate for current market conditions. These need verification.

4. Cross-Reference Claims: Pick 3 specific nutritional claims and show me how you verified them across multiple databases.

5. Calculation Transparency: Your totals need to add up. Show your exact arithmetic for daily calories and macros.

If you can't provide specific URLs, database entry numbers, or verifiable calculations, then admit which parts are estimates vs. actual research. Don't present confident claims without backing them up with real, accessible sources.

Prove your research is real, not just confident-sounding assumptions.

After you've completed this audit and made any necessary corrections, regenerate the complete meal plan using your verified data.`;
                      
                      await Clipboard.setStringAsync(auditPrompt);
                      setAuditPromptCopied(true);
                      setTimeout(() => {
                        setAuditPromptCopied(false);
                      }, 2000);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shield-checkmark" size={18} color="#0a0a0b" />
                    <Text style={styles.actionButtonText}>
                      {auditPromptCopied ? 'Copied!' : 'Copy Audit Prompt'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>{instructionsCreationMode === 'research' ? '3' : '2'}</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>Generate Meal Plan</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Send this prompt to convert your plan to a JSON format
                </Text>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColor }]}
                  onPress={async () => {
                    const prompt = generateJsonConversionPrompt();
                    await Clipboard.setStringAsync(prompt);
                    setAiPromptCopied(true);
                    setTimeout(() => {
                      setAiPromptCopied(false);
                    }, 2000);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={18} color="#0a0a0b" />
                  <Text style={styles.actionButtonText}>
                    {aiPromptCopied ? 'Copied!' : 'Copy AI Prompt'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>{instructionsCreationMode === 'research' ? '4' : '3'}</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>Import & Enjoy</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Copy the JSON file your AI created and paste it in
                </Text>
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.tutorialSection}>
            <Text style={styles.tutorialSectionTitle}>Need Help?</Text>
            <TouchableOpacity 
              style={[styles.tutorialButton, { backgroundColor: themeColor }]}
              onPress={() => {
                // Open YouTube tutorial
                const url = 'https://youtube.com/shorts/_l6E9sX-9QQ';
                Linking.openURL(url);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={18} color="#ffffff" />
              <Text style={styles.tutorialButtonText}>Watch Tutorial</Text>
              <Text style={styles.tutorialButtonSubtext}>30 seconds</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.closeButtonWrapper}>
          <TouchableOpacity 
            onPress={() => setErrorMessage(null)} 
            style={styles.closeButtonInner}
          >
            <Ionicons name="close" size={28} color="#71717a" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Format Error</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          
          <TouchableOpacity
            style={[styles.copyErrorButton, { backgroundColor: themeColor }]}
            onPress={async () => {
              const debugMessage = `I got this error when trying to import my meal plan: "${errorMessage}". Please fix the JSON and make sure it follows the exact format.`;
              await Clipboard.setStringAsync(debugMessage);
              
              setErrorMessage(null);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={20} color="#0a0a0b" />
            <Text style={styles.copyErrorText}>Copy Error for AI</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.closeButtonWrapper}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButtonInner}>
            <Ionicons name="close" size={28} color="#71717a" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Upload Mode toggle */}
          <TouchableOpacity 
            style={[styles.uploadModeToggle, { borderColor: themeColor }]}
            onPress={() => setUploadMode(!uploadMode)}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={uploadMode ? "clipboard-outline" : "cloud-upload-outline"} 
              size={20} 
              color={themeColor} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.mainButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
            onPress={uploadMode ? handleFileUpload : handlePasteAndImport}
            activeOpacity={0.9}
          >
            <Ionicons 
              name={uploadMode ? "cloud-upload" : "restaurant"} 
              size={40} 
              color="#0a0a0b" 
            />
            <Text style={styles.mainButtonText}>
              {uploadMode ? "Upload File" : "Paste & Import"}
            </Text>
            <Text style={styles.mainButtonSubtext}>
              {uploadMode ? "Choose JSON file from device" : "Paste your meal plan JSON"}
            </Text>
          </TouchableOpacity>


          <View style={styles.orSection}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('SampleMealPlans' as any)}
            activeOpacity={0.9}
          >
            <Text style={styles.secondaryButtonText}>Try Sample Meal Plans</Text>
          </TouchableOpacity>

        </View>

        {/* Move help link to bottom of screen */}
        <View style={styles.helpLinkWrapper}>
          <TouchableOpacity 
            style={styles.helpLink}
            onPress={() => setShowInstructions(true)}
            activeOpacity={0.8}
          >
            <Text style={[styles.helpLinkText, { color: themeColor }]}>How to create a custom meal plan with AI?</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showConfirmation}
        transparent
        animationType="none"
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: modalOpacity }
          ]}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              { 
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
                borderColor: themeColor,
                shadowColor: themeColor,
              }
            ]}
          >
            {/* Close Button */}
            <View style={styles.closeButtonWrapper}>
              <TouchableOpacity 
                style={styles.closeButtonInner} 
                onPress={handleModalCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Header Badge */}
            {generationTime && (
              <View style={[styles.headerBadge, { backgroundColor: themeColor + '1A', borderColor: themeColor }]}>
                <Text style={[styles.badgeText, { color: themeColor }]}>Generated in {generationTime.toFixed(2)}s</Text>
              </View>
            )}

            {/* Main Content */}
            <View style={styles.mainContent}>
              <Text style={styles.title}>Meal Plan Ready</Text>
              <Text style={styles.planName}>{parsedMealPlan?.plan_name}</Text>
              
              {/* Plan Summary */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Duration</Text>
                  <Text style={[styles.summaryValue, { color: themeColor }]}>{parsedMealPlan?.duration_days} days</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Unique Recipes</Text>
                  <Text style={[styles.summaryValue, { color: themeColor }]}>
                    {(() => {
                      const uniqueMeals = new Set();
                      parsedMealPlan?.days.forEach(day => 
                        day.meals.forEach(meal => uniqueMeals.add(meal.meal_name))
                      );
                      return uniqueMeals.size;
                    })()} recipes
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Action Button */}
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: themeColor }]}
                onPress={handleConfirmImport}
                activeOpacity={0.9}
              >
                <Text style={styles.createButtonText}>Create Meal Plan</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoButton: {
    width: 40,
    height: 40,
  },
  closeButtonWrapper: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    zIndex: 1,
  },
  closeButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  modeSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  simpleModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 2,
    marginBottom: 12,
  },
  simpleOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  simpleOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  simpleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  centeredInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
  },
  infoButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    width: '100%',
    maxWidth: 320,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoColumn: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    backgroundColor: '#27272a',
    marginHorizontal: 16,
    alignSelf: 'stretch',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 16,
  },
  uploadModeToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 20,
    alignSelf: 'center',
  },
  mainButton: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  mainButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0a0a0b',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  mainButtonSubtext: {
    fontSize: 16,
    color: '#0a0a0b',
    opacity: 0.8,
    marginTop: 8,
  },
  orSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 48,
    width: '100%',
    maxWidth: 200,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272a',
  },
  orText: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
    paddingHorizontal: 20,
    letterSpacing: 1,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
    marginBottom: 32,
    minWidth: 240,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e4e4e7',
    letterSpacing: 0.3,
  },
  helpLinkWrapper: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  helpLink: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  helpLinkText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#71717a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modalContent: {
    backgroundColor: '#0a0a0b',
    borderRadius: 20,
    borderWidth: 1,
    padding: 0,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#a1a1aa',
    fontWeight: '400',
    lineHeight: 18,
  },
  headerBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 24,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  mainContent: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#a1a1aa',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 38,
  },
  summaryCard: {
    backgroundColor: 'rgba(39, 39, 42, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(113, 113, 122, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(113, 113, 122, 0.2)',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionSection: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    paddingTop: 8,
  },
  createButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
  },
  instructionsContainer: {
    flex: 1,
  },
  instructionsScrollView: {
    flex: 1,
  },
  instructionsContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    flex: 1,
  },
  stepsContainer: {
    gap: 16,
  },
  stepCard: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 20,
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  stepCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  stepCardDescription: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#0a0a0b',
    fontWeight: '600',
  },
  tutorialSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  tutorialSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 16,
    textAlign: 'center',
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  tutorialButtonText: {
    fontSize: 16,
    color: '#0a0a0b',
    fontWeight: '600',
  },
  tutorialButtonSubtext: {
    fontSize: 12,
    color: '#0a0a0b',
    opacity: 0.7,
    marginLeft: 4,
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  researchNote: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  researchNoteText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  errorHeader: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 24,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  copyErrorButton: {
    flexDirection: 'row',
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  copyErrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
});