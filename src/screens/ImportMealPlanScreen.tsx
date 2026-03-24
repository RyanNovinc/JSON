import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Linking,
  Animated,
  SafeAreaView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { assembleMealPlanningPrompt, getMealPlanReviewPrompt } from '../data/mealPlanningPrompt';
import { generateJsonConversionPrompt } from '../data/generateJsonConversionPrompt';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage } from '../utils/storage';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RobustStorage from '../utils/robustStorage';
import { Platform } from 'react-native';
import { NUTRITION_STORAGE_KEYS } from '../types/nutrition';
import NutritionGeneratorStep1 from '../components/NutritionGeneratorStep1';
import NutritionGeneratorStep2 from '../components/NutritionGeneratorStep2';
import NutritionGeneratorStep3 from '../components/NutritionGeneratorStep3';
import NutritionGeneratorStep4 from '../components/NutritionGeneratorStep4';

type ImportMealPlanNavigationProp = StackNavigationProp<RootStackParamList, 'ImportMealPlan'>;

import { SimplifiedMealPlan, SimplifiedMealPlanDay, SimplifiedMeal } from '../types/nutrition';

export default function ImportMealPlanScreen() {
  const navigation = useNavigation<ImportMealPlanNavigationProp>();
  const { themeColor } = useTheme();
  const { saveMealPlan } = useSimplifiedMealPlanning();
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [planningPromptCopied, setPlanningPromptCopied] = useState(false);
  const [aiPromptCopied, setAiPromptCopied] = useState(false);
  const [auditPromptCopied, setAuditPromptCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sampleCopied, setSampleCopied] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState(false);
  const [reviewPromptCopied, setReviewPromptCopied] = useState(false);
  const [showSlideMode, setShowSlideMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [parsedMealPlan, setParsedMealPlan] = useState<SimplifiedMealPlan | null>(null);
  const [modalScale] = useState(new Animated.Value(0));
  const [modalOpacity] = useState(new Animated.Value(0));

  const getCurrentDate = (): string => {
    const today = new Date();
    const startDate = new Date(today.getTime() + (24 * 60 * 60 * 1000)); // Start tomorrow
    return startDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const getDatePlusN = (n: number): string => {
    const today = new Date();
    const targetDate = new Date(today.getTime() + ((n + 1) * 24 * 60 * 60 * 1000));
    return targetDate.toISOString().split('T')[0];
  };

  const getDayName = (n: number): string => {
    const today = new Date();
    const targetDate = new Date(today.getTime() + ((n + 1) * 24 * 60 * 60 * 1000));
    return targetDate.toLocaleDateString('en-US', { weekday: 'long' });
  };



  const sampleMealPlan = {
    "id": "sample_3day_balanced",
    "name": "Quick Start - Balanced Meal Plan",
    "startDate": getCurrentDate(),
    "endDate": getDatePlusN(2),
    "dailyMeals": {
      [getCurrentDate()]: {
        "date": getCurrentDate(),
        "dayName": getDayName(0),
        "meals": [
          {
            "id": "meal_1_breakfast_1",
            "name": "Greek Yogurt Bowl",
            "type": "breakfast",
            "time": "7:30 AM",
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
                "unit": "cup",
                "notes": ""
              },
              {
                "item": "Honey",
                "amount": "1",
                "unit": "tbsp",
                "notes": ""
              },
              {
                "item": "Granola",
                "amount": "2",
                "unit": "tbsp",
                "notes": ""
              }
            ],
            "instructions": [
              "Add Greek yogurt to bowl",
              "Top with mixed berries",
              "Drizzle honey over berries",
              "Sprinkle granola on top"
            ],
            "tags": ["high-protein", "quick", "vegetarian"],
            "isOriginal": true,
            "addedAt": new Date().toISOString()
          },
          {
            "id": "meal_1_lunch_1",
            "name": "Grilled Chicken Salad",
            "type": "lunch",
            "time": "12:30 PM",
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
                "unit": "oz",
                "notes": ""
              },
              {
                "item": "Mixed greens",
                "amount": "2",
                "unit": "cups",
                "notes": ""
              },
              {
                "item": "Cherry tomatoes",
                "amount": "0.5",
                "unit": "cup",
                "notes": ""
              },
              {
                "item": "Avocado",
                "amount": "0.5",
                "unit": "medium",
                "notes": ""
              },
              {
                "item": "Olive oil",
                "amount": "1",
                "unit": "tbsp",
                "notes": ""
              },
              {
                "item": "Lemon juice",
                "amount": "1",
                "unit": "tbsp",
                "notes": ""
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
            "tags": ["high-protein", "low-carb", "gluten-free"],
            "isOriginal": true,
            "addedAt": new Date().toISOString()
          },
          {
            "id": "meal_1_dinner_1",
            "name": "Baked Salmon with Vegetables",
            "type": "dinner",
            "time": "6:30 PM",
            "calories": 520,
            "macros": {
              "protein": 40,
              "carbs": 20,
              "fat": 32,
              "fiber": 6
            },
            "ingredients": [
              {
                "item": "Salmon fillet",
                "amount": "5",
                "unit": "oz",
                "notes": ""
              },
              {
                "item": "Broccoli",
                "amount": "1",
                "unit": "cup",
                "notes": ""
              },
              {
                "item": "Sweet potato",
                "amount": "1",
                "unit": "medium",
                "notes": ""
              }
            ],
            "instructions": [
              "Preheat oven to 400°F",
              "Season salmon with salt and pepper",
              "Cut vegetables into bite-sized pieces",
              "Bake salmon and vegetables for 20 minutes",
              "Serve immediately"
            ],
            "tags": ["high-protein", "omega-3", "gluten-free"],
            "isOriginal": true,
            "addedAt": new Date().toISOString()
          }
        ]
      },
      [getDatePlusN(1)]: {
        "date": getDatePlusN(1),
        "dayName": getDayName(1),
        "meals": [
          {
            "id": "meal_2_breakfast_1",
            "name": "Protein Smoothie",
            "type": "breakfast",
            "time": "7:30 AM",
            "calories": 350,
            "macros": {
              "protein": 25,
              "carbs": 30,
              "fat": 12,
              "fiber": 5
            },
            "ingredients": [
              {
                "item": "Protein powder",
                "amount": "1",
                "unit": "scoop",
                "notes": "vanilla"
              },
              {
                "item": "Banana",
                "amount": "1",
                "unit": "medium",
                "notes": ""
              },
              {
                "item": "Spinach",
                "amount": "1",
                "unit": "cup",
                "notes": ""
              },
              {
                "item": "Almond milk",
                "amount": "1",
                "unit": "cup",
                "notes": ""
              }
            ],
            "instructions": [
              "Add all ingredients to blender",
              "Blend until smooth",
              "Pour into glass and serve"
            ],
            "tags": ["high-protein", "quick", "vegetarian"],
            "isOriginal": true,
            "addedAt": new Date().toISOString()
          }
        ]
      },
      [getDatePlusN(2)]: {
        "date": getDatePlusN(2),
        "dayName": getDayName(2),
        "meals": [
          {
            "id": "meal_3_breakfast_1",
            "name": "Oatmeal with Nuts",
            "type": "breakfast",
            "time": "7:30 AM",
            "calories": 380,
            "macros": {
              "protein": 18,
              "carbs": 45,
              "fat": 15,
              "fiber": 8
            },
            "ingredients": [
              {
                "item": "Rolled oats",
                "amount": "0.5",
                "unit": "cup",
                "notes": ""
              },
              {
                "item": "Almonds",
                "amount": "2",
                "unit": "tbsp",
                "notes": "chopped"
              },
              {
                "item": "Milk",
                "amount": "1",
                "unit": "cup",
                "notes": ""
              }
            ],
            "instructions": [
              "Cook oats with milk according to package directions",
              "Top with chopped almonds",
              "Serve warm"
            ],
            "tags": ["high-fiber", "quick", "vegetarian"],
            "isOriginal": true,
            "addedAt": new Date().toISOString()
          }
        ]
      }
    },
    "metadata": {
      "generatedAt": new Date().toISOString(),
      "totalCost": 45.50,
      "duration": 3
    }
  };

  const handleCopySample = async () => {
    const sampleJson = JSON.stringify(sampleMealPlan, null, 2);
    await Clipboard.setStringAsync(sampleJson);
    setSampleCopied(true);
    setTimeout(() => {
      setSampleCopied(false);
    }, 2000);
  };


  const validateAndParseJSON = (input: string): SimplifiedMealPlan | null => {
    try {
      // Normalize smart quotes to straight quotes before parsing
      let text = input;
      text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');  // curly double quotes
      text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");  // curly single quotes
      
      const parsed = JSON.parse(text);
      console.log("📥 Parsed JSON successfully");
      
      // Simple validation for SimplifiedMealPlan format
      if (!parsed.id) {
        setErrorMessage("❌ Missing required field: id");
        return null;
      }
      
      if (!parsed.name) {
        setErrorMessage("❌ Missing required field: name");
        return null;
      }
      
      if (!parsed.dailyMeals || typeof parsed.dailyMeals !== "object") {
        setErrorMessage("❌ Missing or invalid dailyMeals structure");
        return null;
      }
      
      if (!parsed.metadata || !parsed.metadata.duration) {
        setErrorMessage("❌ Missing metadata.duration field");
        return null;
      }
      
      // Validate that dailyMeals has at least one day
      const dailyMealsKeys = Object.keys(parsed.dailyMeals);
      if (dailyMealsKeys.length === 0) {
        setErrorMessage("❌ No meal days found in dailyMeals");
        return null;
      }
      
      // Quick validation of date format in keys
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const invalidDates = dailyMealsKeys.filter(key => !dateRegex.test(key));
      if (invalidDates.length > 0) {
        setErrorMessage(`❌ Invalid date format in dailyMeals keys: ${invalidDates.join(", ")}. Expected YYYY-MM-DD format.`);
        return null;
      }
      
      console.log("✅ SimplifiedMealPlan format validated successfully");
      return parsed as SimplifiedMealPlan;
      
    } catch (jsonError) {
      const error = jsonError as Error;
      setErrorMessage(`❌ JSON Parse Error: ${error.message}`);
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
    setTimeout(async () => {
      const mealPlan = validateAndParseJSON(text);
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000; // Convert to seconds
      setGenerationTime(totalTime);
      setIsLoading(false);
      
      if (mealPlan) {
        // Generate unique ID for this meal plan import
        const mealPlanId = Date.now().toString() + Math.random().toString(36);
        mealPlan.id = mealPlanId;
        
        // Import the meal plan directly without confirmation modal
        await importMealPlanDirectly(mealPlan);
      }
    }, 800);
  };

  // Create content fingerprint for SimplifiedMealPlan
  const createMealPlanFingerprint = (simplifiedPlan: SimplifiedMealPlan): string => {
    // Extract only content that matters for uniqueness
    const contentToHash = {
      name: simplifiedPlan.name.toLowerCase().trim(),
      duration: simplifiedPlan.metadata.duration,
      dailyMeals: Object.keys(simplifiedPlan.dailyMeals).sort().map(date => ({
        date,
        dayName: simplifiedPlan.dailyMeals[date].dayName,
        meals: simplifiedPlan.dailyMeals[date].meals.map((meal: any) => ({
          name: meal.name,
          type: meal.type,
          ingredients: (meal.ingredients || []).sort((a: any, b: any) => 
            (a.item || '').localeCompare(b.item || '')
          ),
          instructions: meal.instructions || [],
          macros: meal.macros,
          calories: meal.calories
        }))
      }))
    };
    
    // Create a simple hash from the stringified content
    const contentString = JSON.stringify(contentToHash);
    let hash = 0;
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  };

  const importMealPlanDirectly = async (simplifiedPlan: SimplifiedMealPlan) => {
    try {
      // Skip auto-saving to "My Meals" - users will manually save if they want
      
      // Before importing, preserve any manually added meals from current plan
      const existingPlanData = await AsyncStorage.getItem(NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN);
      let mergedPlanData = { ...simplifiedPlan };
      
      if (existingPlanData) {
        try {
          const existingPlan = JSON.parse(existingPlanData);
          console.log('🔄 Preserving manually added meals from existing plan');
          
          // If the existing plan has manually added meals, merge them with the imported plan
          if (existingPlan.data?.days) {
            const existingDays = existingPlan.data.days;
            
            // Create a merged days array that combines imported plan with manually added meals
            if (!mergedPlanData.days) {
              mergedPlanData.days = [];
            }
            
            // Find and preserve manually added meals
            for (const existingDay of existingDays) {
              if (existingDay.meals && Array.isArray(existingDay.meals)) {
                const manualMeals = existingDay.meals.filter(meal => meal.isManuallyAdded);
                if (manualMeals.length > 0) {
                  console.log(`🔄 Found ${manualMeals.length} manual meals to preserve`);
                  
                  // Find or create corresponding day in merged plan
                  let targetDay = mergedPlanData.days.find(d => d.date === existingDay.date);
                  if (!targetDay) {
                    // Create a new day entry for manually added meals
                    targetDay = {
                      date: existingDay.date,
                      meals: []
                    };
                    mergedPlanData.days.push(targetDay);
                  }
                  
                  // Add the manual meals to the target day
                  if (!targetDay.meals) targetDay.meals = [];
                  targetDay.meals.push(...manualMeals);
                  console.log(`📋 Preserved ${manualMeals.length} manual meals for day ${existingDay.date}`);
                }
              }
            }
          }
        } catch (error) {
          console.error('⚠️ Error preserving manual meals:', error);
        }
      }
      
      // Save the parsed meal plan to state and show confirmation
      console.log('📤 Meal plan ready for confirmation');
      setParsedMealPlan(simplifiedPlan);
      setShowConfirmation(true);
      
      // Animate modal entrance
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
    } catch (error) {
      console.error('Failed to import meal plan:', error);
      Alert.alert('Error', 'Failed to import meal plan. Please try again.');
    }
  };



  const handleCancel = () => {
    navigation.goBack();
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

  const handleConfirmImport = async () => {
    if (!parsedMealPlan) return;
    
    try {
      // Save to SimplifiedMealPlanningContext
      console.log('📤 Importing meal plan to SimplifiedMealPlanningContext');
      await saveMealPlan(parsedMealPlan);
      
      // Close the modal first
      setShowConfirmation(false);
      
      // Navigate to nutrition home
      navigation.navigate('NutritionHome', { 
        refresh: true
      } as any);
    } catch (error) {
      console.error('Failed to save meal plan:', error);
      Alert.alert('Error', 'Failed to save meal plan. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>Processing meal plan...</Text>
      </View>
    );
  }

  if (showSlideMode) {
    const handleSlideBack = () => {
      if (currentSlide === 1) {
        setShowSlideMode(false);
      } else {
        setCurrentSlide(currentSlide - 1);
      }
    };

    const handleSlideNext = () => {
      if (currentSlide < 4) {
        setCurrentSlide(currentSlide + 1);
      }
    };

    const handleExitSlideMode = () => {
      setShowSlideMode(false);
      setCurrentSlide(1);
    };

    const handleImportSuccess = async (mealPlan: SimplifiedMealPlan) => {
      // Don't immediately exit slide mode - let confirmation modal handle it
      await importMealPlanDirectly(mealPlan);
    };

    switch (currentSlide) {
      case 1:
        return (
          <NutritionGeneratorStep1
            onNext={handleSlideNext}
            onBack={handleSlideBack}
          />
        );
      case 2:
        return (
          <NutritionGeneratorStep2
            onNext={handleSlideNext}
            onBack={handleSlideBack}
          />
        );
      case 3:
        return (
          <NutritionGeneratorStep3
            onNext={handleSlideNext}
            onBack={handleSlideBack}
          />
        );
      case 4:
        return (
          <NutritionGeneratorStep4
            onBack={handleSlideBack}
            onImportSuccess={handleImportSuccess}
            onExitSlideMode={handleExitSlideMode}
          />
        );
      default:
        return null;
    }
  }

  if (showInstructions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.instructionsContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowInstructions(false)} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Meal Plan Generator</Text>
            </View>
          </View>
          
          <ScrollView 
            style={styles.instructionsScrollView}
            contentContainerStyle={styles.instructionsContent}
            showsVerticalScrollIndicator={false}
          >
            
            
            <View style={styles.stepsContainer}>
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>We Build Your Perfect Prompt</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Customized based on your questionnaire answers
                </Text>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColor }]}
                  onPress={async () => {
                    try {
                      const planningPrompt = await assembleMealPlanningPrompt();
                      
                      // Try to copy to clipboard with better error handling
                      try {
                        await Clipboard.setStringAsync(planningPrompt);
                        setPlanningPromptCopied(true);
                        setTimeout(() => {
                          setPlanningPromptCopied(false);
                        }, 2000);
                      } catch (clipboardError) {
                        console.error('Clipboard error:', clipboardError);
                        Alert.alert(
                          'Copy Failed',
                          'Unable to copy to clipboard. Please try again or copy manually from the generated prompt.',
                          [{ text: 'OK' }]
                        );
                      }
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
                    {planningPromptCopied ? 'Copied!' : 'Copy Your Prompt'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>Quality Check Review</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Ask AI to review and improve the meal plan quality
                </Text>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColor }]}
                  onPress={async () => {
                    try {
                      const reviewPrompt = await getMealPlanReviewPrompt();
                      
                      try {
                        await Clipboard.setStringAsync(reviewPrompt);
                        setReviewPromptCopied(true);
                        setTimeout(() => {
                          setReviewPromptCopied(false);
                        }, 2000);
                      } catch (clipboardError) {
                        console.error('Clipboard error:', clipboardError);
                        Alert.alert(
                          'Copy Failed',
                          'Unable to copy review prompt to clipboard. Please try again.',
                          [{ text: 'OK' }]
                        );
                      }
                    } catch (error) {
                      console.error('Error generating review prompt:', error);
                      Alert.alert(
                        'Error',
                        'Unable to generate review prompt. Please try again.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#0a0a0b" />
                  <Text style={styles.actionButtonText}>
                    {reviewPromptCopied ? 'Review Copied!' : 'Optional: Copy Review Check'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>3</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>Get Your Final Plan</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Ask the AI to format it for the app
                </Text>
                
                
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: themeColor }]}
                  onPress={async () => {
                    try {
                      const prompt = generateJsonConversionPrompt('save_import');
                      await Clipboard.setStringAsync(prompt);
                      setAiPromptCopied(true);
                      setTimeout(() => {
                        setAiPromptCopied(false);
                      }, 2000);
                    } catch (clipboardError) {
                      console.error('Clipboard error:', clipboardError);
                      Alert.alert(
                        'Copy Failed',
                        'Unable to copy format request to clipboard. Please try again.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="sparkles" size={18} color="#0a0a0b" />
                  <Text style={styles.actionButtonText}>
                    {aiPromptCopied ? 'Copied!' : 'Copy Format Request'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
                    <Text style={styles.stepBadgeText}>4</Text>
                  </View>
                  <Text style={styles.stepCardTitle}>Import and Start Eating</Text>
                </View>
                <Text style={styles.stepCardDescription}>
                  Just paste or upload what the AI created
                </Text>
              </View>
            </View>

            {/* Need Help Section - Only shown in development */}
            {__DEV__ && (
              <View style={styles.helpSection}>
                <Text style={styles.helpTitle}>Need Help?</Text>
                
                <TouchableOpacity 
                  style={[styles.tutorialButton, { backgroundColor: themeColor }]}
                  onPress={() => {
                    // Open YouTube tutorial
                    const url = 'https://youtube.com/shorts/_l6E9sX-9QQ';
                    Linking.openURL(url);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="play" size={20} color="#000000" />
                  <Text style={styles.tutorialButtonText}>Watch Tutorial</Text>
                  <Text style={styles.tutorialDuration}>30 seconds</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </ScrollView>
        </View>
      </SafeAreaView>
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
              {uploadMode ? "Upload Your Plan" : "Paste Your Plan"}
            </Text>
            <Text style={styles.mainButtonSubtext}>
              {uploadMode ? "Import the AI's file" : "Paste what the AI created"}
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
            style={[styles.helpButton, { borderColor: themeColor }]}
            onPress={() => setShowSlideMode(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="bulb-outline" size={20} color={themeColor} />
            <Text style={[styles.helpButtonText, { color: themeColor }]}>How to create custom meal plans with AI?</Text>
            <Ionicons name="chevron-forward" size={16} color={themeColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirmation Modal */}
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
                style={styles.closeButton} 
                onPress={handleModalCancel}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color="#71717a" />
              </TouchableOpacity>
            </View>
            
            {parsedMealPlan && (
              <>
                {/* Header Badge */}
                <View style={styles.headerBadgeContainer}>
                  {generationTime && (
                    <View style={[styles.headerBadge, { backgroundColor: themeColor + '1A', borderColor: themeColor }]}>
                      <Text style={[styles.badgeText, { color: themeColor }]}>Generated in {generationTime.toFixed(2)}s</Text>
                    </View>
                  )}
                </View>
                
                {/* Main Content */}
                <View style={styles.mainContent}>
                  <Text style={styles.title}>Meal Plan Ready</Text>
                  <Text style={styles.routineName}>{parsedMealPlan.name}</Text>
                </View>
                
                  {/* Meal Plan Summary */}
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Duration</Text>
                      <Text style={[styles.summaryValue, { color: themeColor }]}>{Object.keys(parsedMealPlan.dailyMeals).length} days</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Total Meals</Text>
                      <Text style={[styles.summaryValue, { color: themeColor }]}>
                        {Object.values(parsedMealPlan.dailyMeals).reduce((total, day) => total + day.meals.length, 0)} meals
                      </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Start Date</Text>
                      <Text style={[styles.summaryValue, { color: themeColor }]}>{new Date(parsedMealPlan.startDate).toLocaleDateString()}</Text>
                    </View>
                  </View>
                
                {/* Actions */}
                <View style={styles.actionSection}>
                  <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: themeColor }]}
                    onPress={handleConfirmImport}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.createButtonText}>Start Meal Plan</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    top: 60,
    left: 20,
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
    left: 20,
    right: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    gap: 8,
  },
  helpButtonText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  tutorialButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  tutorialButtonSubtext: {
    fontSize: 12,
    color: '#0a0a0b',
    opacity: 0.7,
    marginLeft: 4,
  },
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#71717a',
  },
  helpSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
  },
  tutorialDuration: {
    fontSize: 14,
    color: '#000000',
    opacity: 0.8,
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
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
  // Added missing styles for modal
  headerBadgeContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  routineName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 38,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
});