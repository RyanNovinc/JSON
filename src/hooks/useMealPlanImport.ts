/**
 * useMealPlanImport — nutrition import pipeline.
 *
 * The nutrition twin of useWorkoutImport. Deliberately MUCH smaller: a meal
 * plan is a single object, so there's no block merging, no "accumulated
 * programs", no add-more mode, no append, no mesocycle restoration. Just:
 * paste/file → validate → confirm → save.
 *
 * The parse/validate/save logic is lifted verbatim from the proven
 * ImportMealPlanScreen (validateAndParseJSON, processMealPlanData,
 * importMealPlanDirectly) so behaviour for existing paying users is unchanged.
 *
 * NOTE on saving: the workout hook saves via WorkoutStorage directly, but a
 * meal plan is saved through the useSimplifiedMealPlanning() CONTEXT, which
 * can't be consumed inside a plain hook without coupling. So the screen passes
 * its `saveMealPlan` in as an option — the hook stays context-agnostic.
 */

import { useState, useRef } from 'react';
import { Alert, Animated } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NUTRITION_STORAGE_KEYS } from '../types/nutrition';
import type { SimplifiedMealPlan } from '../types/nutrition';
import { Analytics } from '../services/analytics';

export interface UseMealPlanImportOptions {
  // Save handler from useSimplifiedMealPlanning() — passed in by the screen.
  saveMealPlan: (plan: SimplifiedMealPlan) => Promise<void>;
  // Fired after a successful confirm+save, once the modal has animated out.
  onImportComplete?: (plan: SimplifiedMealPlan) => void;
  // Optional: clear the cold-launch "Continue your setup" banner flag on a
  // successful import (mirrors the workout flow's WorkoutStorage.setAwaitingImport(false)).
  // The screen passes this so the hook stays storage-agnostic.
  onClearImportBanner?: () => Promise<void>;
}

export interface UseMealPlanImportReturn {
  parsedMealPlan: SimplifiedMealPlan | null;
  showConfirmation: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  generationTime: number | null;

  modalScale: Animated.Value;
  modalOpacity: Animated.Value;
  successScale: Animated.Value;

  importFromClipboard: () => Promise<void>;
  importFromText: (text: string) => Promise<void>;
  importFromFile: () => Promise<void>;
  confirmImport: () => Promise<void>;
  cancelConfirmation: () => void;
  clearError: () => void;
}

export const useMealPlanImport = (
  options: UseMealPlanImportOptions
): UseMealPlanImportReturn => {
  const { saveMealPlan, onImportComplete, onClearImportBanner } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [parsedMealPlan, setParsedMealPlan] = useState<SimplifiedMealPlan | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  // --- validateAndParseJSON (verbatim from ImportMealPlanScreen) ----------
  const validateAndParseJSON = (input: string): SimplifiedMealPlan | null => {
    try {
      let text = input;
      text = text.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
      text = text.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");

      const parsed = JSON.parse(text);

      if (!parsed.id) {
        setErrorMessage('❌ Missing required field: id');
        Analytics.track('meal_plan_imported', { valid: false, error_type: 'missing_field', day_count: 0 });
        return null;
      }
      if (!parsed.name) {
        setErrorMessage('❌ Missing required field: name');
        Analytics.track('meal_plan_imported', { valid: false, error_type: 'missing_field', day_count: 0 });
        return null;
      }
      if (!parsed.dailyMeals || typeof parsed.dailyMeals !== 'object') {
        setErrorMessage('❌ Missing or invalid dailyMeals structure');
        Analytics.track('meal_plan_imported', { valid: false, error_type: 'missing_field', day_count: 0 });
        return null;
      }
      if (!parsed.metadata || !parsed.metadata.duration) {
        setErrorMessage('❌ Missing metadata.duration field');
        Analytics.track('meal_plan_imported', { valid: false, error_type: 'missing_field', day_count: 0 });
        return null;
      }

      const dailyMealsKeys = Object.keys(parsed.dailyMeals);
      if (dailyMealsKeys.length === 0) {
        setErrorMessage('❌ No meal days found in dailyMeals');
        Analytics.track('meal_plan_imported', { valid: false, error_type: 'empty_plan', day_count: 0 });
        return null;
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const invalidDates = dailyMealsKeys.filter((key) => !dateRegex.test(key));
      if (invalidDates.length > 0) {
        setErrorMessage(
          `❌ Invalid date format in dailyMeals keys: ${invalidDates.join(', ')}. Expected YYYY-MM-DD format.`
        );
        Analytics.track('meal_plan_imported', { valid: false, error_type: 'invalid_date_format', day_count: 0 });
        return null;
      }

      return parsed as SimplifiedMealPlan;
    } catch (jsonError) {
      const error = jsonError as Error;
      let detailedError = '❌ JSON Parse Error:\n\n';
      detailedError += '🔍 What you pasted (first 100 characters):\n';
      detailedError += `"${input
        .substring(0, 100)
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')}"\n\n`;

      if (input.includes('I got this error') || input.includes('JSON Parse Error')) {
        detailedError += '🔍 Issue: You copied an error message instead of JSON\n';
        detailedError += '💡 Solution: Copy the actual JSON from the AI, not error text\n\n';
      } else if (input.trim().startsWith('```')) {
        detailedError += '🔍 Issue: Code block markers found\n';
        detailedError += '💡 Solution: Copy only the JSON content, not the ```json markers\n\n';
      } else if (!input.trim().startsWith('{')) {
        detailedError += '🔍 Issue: Text found before JSON\n';
        detailedError += '💡 Solution: Copy starting from the opening { bracket\n\n';
      } else if (
        input.includes('\u201c') ||
        input.includes('\u201d') ||
        input.includes('\u2018') ||
        input.includes('\u2019')
      ) {
        detailedError += '🔍 Issue: Smart/curly quotes detected\n';
        detailedError += '💡 Solution: Use straight quotes only\n\n';
      } else {
        detailedError += '🔍 Issue: Invalid JSON format\n';
        detailedError += '💡 Solution: Check for syntax errors\n\n';
      }

      detailedError += '📋 Technical error: ' + error.message;
      setErrorMessage(detailedError);
      Analytics.track('meal_plan_imported', { valid: false, error_type: 'json_parse_error', day_count: 0 });
      return null;
    }
  };

  // --- importMealPlanDirectly (verbatim: preserve manual meals, then show
  //     confirmation modal) -------------------------------------------------
  const importMealPlanDirectly = async (simplifiedPlan: SimplifiedMealPlan) => {
    try {
      // Preserve any manually added meals from the current plan (same as the
      // original screen — read existing, merge manual meals forward).
      const existingPlanData = await AsyncStorage.getItem(
        NUTRITION_STORAGE_KEYS.CURRENT_MEAL_PLAN
      );
      if (existingPlanData) {
        try {
          const existingPlan = JSON.parse(existingPlanData);
          if (existingPlan.data?.days) {
            const mergedPlanData: any = { ...simplifiedPlan };
            if (!mergedPlanData.days) mergedPlanData.days = [];
            for (const existingDay of existingPlan.data.days) {
              if (Array.isArray(existingDay.meals)) {
                const manualMeals = existingDay.meals.filter((m: any) => m.isManuallyAdded);
                if (manualMeals.length > 0) {
                  let targetDay = mergedPlanData.days.find(
                    (d: any) => d.date === existingDay.date
                  );
                  if (!targetDay) {
                    targetDay = { date: existingDay.date, meals: [] };
                    mergedPlanData.days.push(targetDay);
                  }
                  if (!targetDay.meals) targetDay.meals = [];
                  targetDay.meals.push(...manualMeals);
                }
              }
            }
          }
        } catch (e) {
          console.error('⚠️ Error preserving manual meals:', e);
        }
      }

      setParsedMealPlan(simplifiedPlan);
      setShowConfirmation(true);

      Animated.parallel([
        Animated.timing(modalScale, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(modalOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      console.error('Failed to import meal plan:', e);
      Alert.alert('Error', 'Failed to import meal plan. Please try again.');
    }
  };

  // --- processMealPlanData (verbatim: 800ms UX delay → validate → import) --
  const processMealPlanData = async (text: string) => {
    setIsLoading(true);
    const startTime = Date.now();

    setTimeout(async () => {
      const mealPlan = validateAndParseJSON(text);
      const totalTime = (Date.now() - startTime) / 1000;
      setGenerationTime(totalTime);
      setIsLoading(false);

      if (mealPlan) {
        mealPlan.id = Date.now().toString() + Math.random().toString(36);
        await importMealPlanDirectly(mealPlan);
      }
      // else: error already set by validateAndParseJSON; stay put.
    }, 800);
  };

  // --- public actions ------------------------------------------------------
  const importFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      Alert.alert('Clipboard Empty', 'Copy your meal plan first', [{ text: 'OK' }]);
      return;
    }
    processMealPlanData(text);
  };

  const importFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const response = await fetch(result.assets[0].uri);
        const text = await response.text();
        processMealPlanData(text);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to read file. Please try again.', [{ text: 'OK' }]);
      console.error('File upload error:', e);
    }
  };

  const confirmImport = async () => {
    if (!parsedMealPlan) return;
    Analytics.track('meal_plan_imported', {
      valid: true,
      error_type: null,
      day_count: Object.keys(parsedMealPlan.dailyMeals).length,
    });
    try {
      await saveMealPlan(parsedMealPlan);

      // Success bounce (parity with the workout flow), then animate the
      // modal out and fire the completion callback.
      Animated.sequence([
        Animated.spring(successScale, { toValue: 1.2, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(modalScale, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(modalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(async () => {
          setShowConfirmation(false);
          modalScale.setValue(0);
          modalOpacity.setValue(0);
          successScale.setValue(0);

          // Clear the cold-launch banner flag — import succeeded.
          if (onClearImportBanner) {
            try {
              await onClearImportBanner();
            } catch {
              // Non-critical; don't block navigation on it.
            }
          }

          if (onImportComplete) onImportComplete(parsedMealPlan);
        });
      }, 500);
    } catch (e) {
      console.error('Failed to save meal plan:', e);
      Alert.alert('Error', 'Failed to save meal plan. Please try again.');
    }
  };

  const cancelConfirmation = () => {
    Animated.parallel([
      Animated.timing(modalScale, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(modalOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setShowConfirmation(false);
      setParsedMealPlan(null);
      modalScale.setValue(0);
      modalOpacity.setValue(0);
    });
  };

  const clearError = () => setErrorMessage(null);

  return {
    parsedMealPlan,
    showConfirmation,
    isLoading,
    errorMessage,
    generationTime,
    modalScale,
    modalOpacity,
    successScale,
    importFromClipboard,
    importFromText: processMealPlanData,
    importFromFile,
    confirmImport,
    cancelConfirmation,
    clearError,
  };
};