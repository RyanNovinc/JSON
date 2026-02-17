import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import { WorkoutStorage } from '../utils/storage';

// Import all step components
import { NutritionStep1 } from '../components/nutrition/NutritionStep1';
import { NutritionStep2 } from '../components/nutrition/NutritionStep2';
import { NutritionStep3 } from '../components/nutrition/NutritionStep3';
import { NutritionStep4 } from '../components/nutrition/NutritionStep4';
import { NutritionStep5 } from '../components/nutrition/NutritionStep5';
import { NutritionStep6 } from '../components/nutrition/NutritionStep6';
import { NutritionSummary } from '../components/nutrition/NutritionSummary';

// Types
export interface NutritionFormData {
  // Step 1: Goal
  goal: 'lose_weight' | 'gain_weight' | 'maintain' | null;
  
  // Step 2: Rate (only for lose/gain)
  targetRatePercentage: number; // percentage of body weight per week
  targetRate: number; // kg per week (calculated from percentage * weight)
  
  // Step 3: Personal Details
  age: number | null;
  gender: 'male' | 'female' | null;
  height: number | null; // cm
  weight: number | null; // kg
  
  // Step 4: Activity Level
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'heavy' | 'extreme' | null;
  workoutFrequency: number | null; // days per week
  
  // Step 5: Dietary Preferences
  dietType: 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'custom' | null;
  customMacros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  
  // Step 6: Final Preferences
  mealsPerDay: number;
  restrictions: string[];
  supplements: string[];
  nutrientVariety: 'high' | 'moderate' | 'low' | null;
}

export interface MacroResults {
  bmr: number;
  tdee: number;
  targetCalories: number;
  weeklyWeightChange: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  goal: string;
}

interface Props {
  navigation: any;
  route: any;
}

export const NutritionQuestionnaireScreen: React.FC<Props> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { userProfile, saveUserProfile } = useMealPlanning();
  // Initialize step - only go to step 8 if we actually have saved data
  const [currentStep, setCurrentStep] = useState<number>(() => {
    // Only start at step 7 if showResults is true AND we have a userProfile with data
    if (route?.params?.showResults && userProfile && userProfile.age) {
      return 7;
    }
    return 1;
  });
  const [formData, setFormData] = useState<NutritionFormData>({
    goal: null,
    targetRatePercentage: 0.5, // 0.5% of body weight per week
    targetRate: 0.5,
    age: null,
    gender: null,
    height: null,
    weight: null,
    activityLevel: null,
    workoutFrequency: null,
    dietType: null,
    mealsPerDay: 3,
    restrictions: [],
    supplements: [],
    nutrientVariety: null,
  });
  
  const [macroResults, setMacroResults] = useState<MacroResults | null>(null);
  const [displayCalories, setDisplayCalories] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Calculate targetRate whenever weight or targetRatePercentage changes
  useEffect(() => {
    if (formData.weight && formData.targetRatePercentage) {
      const calculatedRate = (formData.weight * formData.targetRatePercentage) / 100;
      setFormData(prev => ({ ...prev, targetRate: calculatedRate }));
    }
  }, [formData.weight, formData.targetRatePercentage]);

  // Load saved user data when showing results OR when retaking questionnaire
  useEffect(() => {
    if (!userProfile) return;
    
    console.log('Loading saved user profile:', userProfile); // Debug log
    
    // Map the user profile back to form data format
    const savedData: Partial<NutritionFormData> = {
      goal: userProfile.goals?.primaryGoal || userProfile.goal,
      targetRatePercentage: userProfile.targetRatePercentage || 0.5, // Restore the percentage value
      targetRate: userProfile.targetRate || 0.5, // Restore the kg value
      age: userProfile.age,
      gender: userProfile.gender,
      height: userProfile.height,
      weight: userProfile.currentWeight || userProfile.weight,
      activityLevel: userProfile.activityLevel,
      workoutFrequency: userProfile.workoutFrequency,
      dietType: userProfile.dietType,
      mealsPerDay: userProfile.mealsPerDay,
      restrictions: userProfile.dietaryRestrictions || [],
      supplements: userProfile.supplements || [],
      nutrientVariety: userProfile.nutrientVariety || null,
    };
    
    setFormData(prev => ({ ...prev, ...savedData }));
    
    // Try to find macro data in different possible locations
    const macroData = userProfile.macros || userProfile.macroTargets || userProfile.targets;
    
    console.log('Macro data found:', macroData); // Debug log
    
    if (macroData && macroData.calories && savedData.age && savedData.gender && savedData.height && savedData.weight && savedData.activityLevel) {
      // Recalculate BMR and TDEE from saved data to ensure consistency
      let bmr: number;
      if (savedData.gender === 'male') {
        bmr = (10 * savedData.weight) + (6.25 * savedData.height) - (5 * savedData.age) + 5;
      } else {
        bmr = (10 * savedData.weight) + (6.25 * savedData.height) - (5 * savedData.age) - 161;
      }

      const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        heavy: 1.725,
        extreme: 1.9,
      };

      const tdee = Math.round(bmr * activityMultipliers[savedData.activityLevel]);
      
      // Calculate weekly weight change
      let weeklyWeightChange = 0;
      if (savedData.goal === 'lose_weight') {
        weeklyWeightChange = -savedData.targetRate || -0.5;
      } else if (savedData.goal === 'gain_weight') {
        weeklyWeightChange = savedData.targetRate || 0.5;
      }

      // Ensure all macro values are numbers and not NaN
      const protein = Number(macroData.protein) || 0;
      const carbs = Number(macroData.carbs) || 0;
      const fat = Number(macroData.fat) || 0;
      const calories = Number(macroData.calories) || tdee;

      console.log('Setting macro results with:', {
        bmr,
        tdee,
        targetCalories: calories,
        weeklyWeightChange,
        macros: { protein, carbs, fat },
        goal: savedData.goal || 'maintain'
      });

      setMacroResults({
        bmr: Math.round(bmr),
        tdee,
        targetCalories: calories,
        weeklyWeightChange,
        macros: {
          protein,
          carbs,
          fat,
        },
        goal: savedData.goal || 'maintain'
      });
      setDisplayCalories(calories);
    }
  }, [route?.params?.showResults, userProfile]);

  // Trigger macro calculation if showing results but no macro data was loaded
  useEffect(() => {
    if (route?.params?.showResults && 
        formData.age && formData.gender && formData.height && 
        formData.weight && formData.activityLevel && 
        !macroResults) {
      console.log('Triggering calculateMacros with loaded form data');
      
      // Create a local calculation to avoid dependency issues
      const localCalculate = () => {
        // BMR calculation (Mifflin-St Jeor)
        let bmr: number;
        if (formData.gender === 'male') {
          bmr = (10 * formData.weight) + (6.25 * formData.height) - (5 * formData.age) + 5;
        } else {
          bmr = (10 * formData.weight) + (6.25 * formData.height) - (5 * formData.age) - 161;
        }

        // Activity multipliers
        const activityMultipliers = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          heavy: 1.725,
          extreme: 1.9,
        };

        const tdee = Math.round(bmr * activityMultipliers[formData.activityLevel]);

        // Calculate target calories based on goal
        let targetCalories = tdee;

        if (formData.goal === 'lose_weight') {
          const dailyDeficit = (formData.targetRate * 7700) / 7; 
          targetCalories = Math.round(tdee - dailyDeficit);
        } else if (formData.goal === 'gain_weight') {
          // 1 kg body weight = ~7700 calories, daily surplus = weekly surplus / 7
          const dailySurplus = (formData.targetRate * 7700) / 7;
          targetCalories = Math.round(tdee + dailySurplus);
        }

        // Calculate macros based on diet type
        const dietMacros = {
          balanced: { protein: 20, carbs: 50, fat: 30 },
          high_protein: { protein: 30, carbs: 40, fat: 30 },
          low_carb: { protein: 25, carbs: 25, fat: 50 },
          keto: { protein: 20, carbs: 5, fat: 75 },
          custom: formData.customMacros || { protein: 25, carbs: 45, fat: 30 },
        };

        const macroSplit = dietMacros[formData.dietType] || dietMacros.balanced;
        const proteinGrams = Math.round((targetCalories * (macroSplit.protein / 100)) / 4);
        const carbsGrams = Math.round((targetCalories * (macroSplit.carbs / 100)) / 4);
        const fatGrams = Math.round((targetCalories * (macroSplit.fat / 100)) / 9);

        const results = {
          bmr,
          tdee,
          targetCalories: targetCalories,
          weeklyWeightChange: 0, // Will be calculated based on goal
          macros: {
            protein: proteinGrams,
            carbs: carbsGrams,
            fat: fatGrams,
          },
          goal: formData.goal || 'maintain',
        };

        // Calculate weekly weight change
        if (formData.goal === 'lose_weight') {
          results.weeklyWeightChange = -formData.targetRate;
        } else if (formData.goal === 'gain_weight') {
          results.weeklyWeightChange = formData.targetRate;
        }

        setMacroResults(results);
        setDisplayCalories(targetCalories);
      };
      
      localCalculate();
    }
  }, [route?.params?.showResults, formData, macroResults]);

  // Update form data
  const updateFormData = useCallback((updates: Partial<NutritionFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  // Navigation functions
  const nextStep = useCallback(() => {
    if (currentStep < 6) {
      let nextStepNumber = currentStep + 1;
      // Skip Step 2 if goal is maintain
      if (nextStepNumber === 2 && formData.goal === 'maintain') {
        nextStepNumber = 3;
      }
      setCurrentStep(nextStepNumber);
    } else {
      // Calculate results and show summary
      calculateMacros();
    }
  }, [currentStep, formData.goal]);

  const previousStep = useCallback(() => {
    if (currentStep > 1) {
      let prevStepNumber = currentStep - 1;
      // Skip Step 2 if goal is maintain
      if (prevStepNumber === 2 && formData.goal === 'maintain') {
        prevStepNumber = 1;
      }
      setCurrentStep(prevStepNumber);
    }
  }, [currentStep, formData.goal]);

  const goToSummary = useCallback(() => {
    calculateMacros();
  }, [formData]);

  // Calculate macro results
  const calculateMacros = useCallback(() => {
    // Always go to summary step first
    setCurrentStep(7);
    
    if (!formData.age || !formData.gender || !formData.height || !formData.weight || !formData.activityLevel) {
      console.error('Missing required data for macro calculation');
      return;
    }

    // BMR calculation (Mifflin-St Jeor)
    let bmr: number;
    if (formData.gender === 'male') {
      bmr = (10 * formData.weight) + (6.25 * formData.height) - (5 * formData.age) + 5;
    } else {
      bmr = (10 * formData.weight) + (6.25 * formData.height) - (5 * formData.age) - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      heavy: 1.725,
      extreme: 1.9,
    };

    const tdee = Math.round(bmr * activityMultipliers[formData.activityLevel]);

    // Calculate target calories based on goal
    let targetCalories = tdee;
    let weeklyWeightChange = 0;

    if (formData.goal === 'lose_weight') {
      weeklyWeightChange = -formData.targetRate;
      // 1 kg fat = ~7700 calories, daily deficit = weekly deficit / 7
      const dailyDeficit = (formData.targetRate * 7700) / 7; 
      targetCalories = Math.round(tdee - dailyDeficit);
    } else if (formData.goal === 'gain_weight') {
      weeklyWeightChange = formData.targetRate;
      // 1 kg body weight = ~7700 calories, daily surplus = weekly surplus / 7
      const dailySurplus = (formData.targetRate * 7700) / 7;
      targetCalories = Math.round(tdee + dailySurplus);
    }

    // Calculate macros based on diet type
    const dietMacros = {
      balanced: { protein: 20, carbs: 50, fat: 30 },
      high_protein: { protein: 30, carbs: 40, fat: 30 },
      low_carb: { protein: 25, carbs: 25, fat: 50 },
      keto: { protein: 20, carbs: 5, fat: 75 },
      custom: formData.customMacros || { protein: 25, carbs: 45, fat: 30 },
    };

    const macroRatios = dietMacros[formData.dietType || 'balanced'];
    
    const proteinGrams = Math.round((targetCalories * macroRatios.protein / 100) / 4);
    const carbsGrams = Math.round((targetCalories * macroRatios.carbs / 100) / 4);
    const fatGrams = Math.round((targetCalories * macroRatios.fat / 100) / 9);

    const results: MacroResults = {
      bmr: Math.round(bmr),
      tdee,
      targetCalories,
      weeklyWeightChange,
      macros: {
        protein: proteinGrams,
        carbs: carbsGrams,
        fat: fatGrams,
      },
      goal: formData.goal || 'maintain',
    };

    setMacroResults(results);
  }, [formData]);

  // Calculate calories from slider adjustment
  const calculateCaloriesFromSlider = useCallback((sliderValue: number): number => {
    if (!macroResults) return 0;
    
    if (formData.goal === 'lose_weight') {
      // 1 kg fat = ~7700 calories, daily deficit = weekly deficit / 7
      const dailyDeficit = (Math.abs(sliderValue) * 7700) / 7;
      return Math.round(macroResults.tdee - dailyDeficit);
    } else if (formData.goal === 'gain_weight') {
      // 1 kg body weight = ~7700 calories, daily surplus = weekly surplus / 7
      const dailySurplus = (sliderValue * 7700) / 7;
      return Math.round(macroResults.tdee + dailySurplus);
    }
    
    return macroResults.tdee;
  }, [macroResults, formData.goal]);

  // Recalculate macros with new calories
  const recalculateMacrosWithNewCalories = useCallback((newCalories: number): MacroResults => {
    if (!macroResults) {
      // Return a default structure if macroResults is null
      return {
        bmr: 0,
        tdee: 0,
        targetCalories: newCalories,
        weeklyWeightChange: 0,
        macros: { protein: 0, carbs: 0, fat: 0 },
        goal: 'maintain'
      };
    }
    
    // Ensure newCalories is a valid number
    const validCalories = Number(newCalories) || macroResults.targetCalories || 2000;
    
    const dietMacros = {
      balanced: { protein: 20, carbs: 50, fat: 30 },
      high_protein: { protein: 30, carbs: 40, fat: 30 },
      low_carb: { protein: 25, carbs: 25, fat: 50 },
      keto: { protein: 20, carbs: 5, fat: 75 },
      custom: formData.customMacros || { protein: 25, carbs: 45, fat: 30 },
    };

    const macroRatios = dietMacros[formData.dietType || 'balanced'];
    
    const proteinGrams = Math.round((validCalories * macroRatios.protein / 100) / 4);
    const carbsGrams = Math.round((validCalories * macroRatios.carbs / 100) / 4);
    const fatGrams = Math.round((validCalories * macroRatios.fat / 100) / 9);

    console.log('Recalculating macros:', {
      validCalories,
      macroRatios,
      proteinGrams,
      carbsGrams,
      fatGrams
    });

    return {
      ...macroResults,
      targetCalories: validCalories,
      macros: {
        protein: proteinGrams,
        carbs: carbsGrams,
        fat: fatGrams,
      },
    };
  }, [macroResults, formData.dietType, formData.customMacros]);

  // Save settings
  const saveSettings = useCallback(async () => {
    try {
      if (!macroResults) {
        console.error('Cannot save: no macro results available');
        return;
      }

      // Convert form data to user profile format
      const userProfileData = {
        id: userProfile?.id || Date.now().toString(),
        age: formData.age,
        gender: formData.gender,
        height: formData.height,
        currentWeight: formData.weight,
        weight: formData.weight,
        goal: formData.goal,
        targetRatePercentage: formData.targetRatePercentage, // Save the percentage value
        targetRate: formData.targetRate, // Save the kg value
        activityLevel: formData.activityLevel,
        workoutFrequency: formData.workoutFrequency,
        dietType: formData.dietType,
        mealsPerDay: formData.mealsPerDay,
        dietaryRestrictions: formData.restrictions,
        supplements: formData.supplements,
        nutrientVariety: formData.nutrientVariety,
        // Save macro targets
        macros: {
          calories: macroResults.targetCalories,
          protein: macroResults.macros.protein,
          carbs: macroResults.macros.carbs,
          fat: macroResults.macros.fat,
          autoAdjust: false,
        },
        goals: {
          primaryGoal: formData.goal,
        },
        // Add other required fields with defaults
        createdAt: userProfile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log('Saving nutrition settings:', userProfileData);
      
      // Save using the context function
      await saveUserProfile(userProfileData);

      // Also save nutrition questionnaire results in the expected format for AI prompt generation
      const nutritionQuestionnaireResults = {
        formData: {
          goal: formData.goal,
          rate: formData.goal === 'maintain' ? 'maintain' : 
                formData.goal === 'lose_weight' ? `${formData.targetRate} kg/week loss` :
                `${formData.targetRate} kg/week gain`,
          gender: formData.gender,
          age: formData.age?.toString(),
          height: formData.height?.toString(),
          weight: formData.weight?.toString(),
          activityLevel: formData.activityLevel,
          dietType: formData.dietType,
          jobType: 'Not specified', // Add default as this wasn't collected in nutrition questionnaire
        },
        macroResults: {
          calories: macroResults.targetCalories,
          protein: macroResults.macros.protein,
          carbs: macroResults.macros.carbs,
          fat: macroResults.macros.fat,
          bmr: macroResults.bmr,
          tdee: macroResults.tdee,
        },
        completedAt: new Date().toISOString(),
      };

      console.log('Saving nutrition questionnaire results for AI prompt:', nutritionQuestionnaireResults);
      await WorkoutStorage.saveNutritionResults(nutritionQuestionnaireResults);
      
      // Mark nutrition goals as completed
      const currentStatus = await WorkoutStorage.loadNutritionCompletionStatus();
      const updatedStatus = {
        ...currentStatus,
        nutritionGoals: true,
      };
      await WorkoutStorage.saveNutritionCompletionStatus(updatedStatus);
      
      setHasUnsavedChanges(false);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save nutrition settings:', error);
    }
  }, [formData, macroResults, navigation, userProfile, saveUserProfile]);

  // Render current step
  const renderStep = () => {
    const stepProps = {
      formData,
      updateFormData,
      nextStep,
      previousStep,
      colors,
    };

    switch (currentStep) {
      case 1:
        return <NutritionStep1 {...stepProps} />;
      case 2:
        // Skip Step 2 for maintain goals - should never reach here due to navigation logic
        if (formData.goal === 'maintain') {
          return <NutritionStep3 {...stepProps} />;
        }
        return <NutritionStep2 {...stepProps} />;
      case 3:
        return <NutritionStep3 {...stepProps} />;
      case 4:
        return <NutritionStep4 {...stepProps} />;
      case 5:
        return <NutritionStep5 {...stepProps} />;
      case 6:
        return <NutritionStep6 {...stepProps} />;
      case 7:
        return (
          <NutritionSummary
            formData={formData}
            macroResults={macroResults}
            displayCalories={displayCalories}
            setDisplayCalories={setDisplayCalories}
            targetRate={formData.targetRate}
            targetRatePercentage={formData.targetRatePercentage}
            setTargetRate={(rate) => updateFormData({ targetRate: rate })}
            setTargetRatePercentage={(percentage) => updateFormData({ targetRatePercentage: percentage })}
            calculateCaloriesFromSlider={calculateCaloriesFromSlider}
            recalculateMacrosWithNewCalories={recalculateMacrosWithNewCalories}
            setMacroResults={setMacroResults}
            setHasUnsavedChanges={setHasUnsavedChanges}
            hasUnsavedChanges={hasUnsavedChanges}
            onSave={saveSettings}
            onRetake={() => setCurrentStep(1)}
            colors={colors}
          />
        );
      default:
        return <NutritionStep1 {...stepProps} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {renderStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});