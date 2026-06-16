// src/screens/ImportSharedMealPlan.tsx
//
// Import-only screen for a shared meal plan that arrives via deep link.
// ImportSharedContent fetches the shared JSON and replaces to here with
// { prefilledJson }. We run the SAME pipeline the questionnaire handoff uses
// (useMealPlanImport) and show the new MealPlanConfirmationModal — this screen
// never renders the legacy "Paste Your Plan" / "Your Prompt is Ready" create
// UI. The loader is the default render, so the paste screen can't flash for a
// frame before the import starts.

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useSimplifiedMealPlanning } from '../contexts/SimplifiedMealPlanningContext';
import { useMealPlanImport } from '../hooks/useMealPlanImport';
import MealPlanConfirmationModal from '../components/import/MealPlanConfirmationModal';

type NavProp = StackNavigationProp<RootStackParamList, 'ImportSharedMealPlan'>;
type ScreenRouteProp = RouteProp<RootStackParamList, 'ImportSharedMealPlan'>;

export default function ImportSharedMealPlan() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<ScreenRouteProp>();
  const { themeColor } = useTheme();
  const { saveMealPlan } = useSimplifiedMealPlanning();

  const prefilledJson = route.params?.prefilledJson;

  // Land on the Nutrition tab. We can't rely on goBack()/popToTop() here: a
  // cold-launch deep link makes this screen the root of the stack
  // (ImportSharedContent replaced itself onto it), so there's nothing
  // underneath to pop to.
  const goToNutrition = () =>
    (navigation as any).navigate('Main', { screen: 'Nutrition' });

  const {
    parsedMealPlan,
    showConfirmation,
    errorMessage,
    generationTime,
    modalScale,
    modalOpacity,
    importFromText,
    confirmImport,
    cancelConfirmation,
    clearError,
  } = useMealPlanImport({
    saveMealPlan,
    onImportComplete: goToNutrition,
  });

  // Auto-run the import as soon as the shared JSON is available.
  useEffect(() => {
    if (prefilledJson) {
      importFromText(prefilledJson);
    } else {
      // No payload (shouldn't happen via the deep link) — don't strand the user.
      goToNutrition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledJson]);

  const handleCancel = () => {
    cancelConfirmation();
    if (navigation.canGoBack()) navigation.goBack();
    else goToNutrition();
  };

  const handleDismissError = () => {
    clearError();
    if (navigation.canGoBack()) navigation.goBack();
    else goToNutrition();
  };

  // Parse/validation error — rare for a shared import (the data was produced by
  // the app), but handled so the user is never stuck on a spinner.
  if (errorMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCloseWrapper}>
          <TouchableOpacity
            onPress={handleDismissError}
            style={styles.errorCloseButton}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <Ionicons name="close" size={26} color="#71717a" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle" size={56} color="#ef4444" />
          <Text style={styles.errorTitle}>Couldn't import</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity
            style={[styles.copyErrorButton, { backgroundColor: themeColor }]}
            onPress={async () => {
              const debugMessage = `I got this error trying to import a shared meal plan: "${errorMessage}". Please fix the JSON and make sure it follows the exact format.`;
              await Clipboard.setStringAsync(debugMessage);
              handleDismissError();
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="copy-outline" size={18} color="#0a0a0b" />
            <Text style={styles.copyErrorText}>Copy error for AI</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Default render is the loader, so the legacy paste UI can never flash. The
  // confirmation modal overlays it the moment the plan is parsed.
  return (
    <View style={styles.container}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>Loading shared meal plan…</Text>
      </View>

      <MealPlanConfirmationModal
        visible={showConfirmation}
        parsedMealPlan={parsedMealPlan}
        generationTime={generationTime}
        modalScale={modalScale}
        modalOpacity={modalOpacity}
        themeColor={themeColor}
        onConfirm={confirmImport}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  loadingContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#71717a' },
  errorCloseWrapper: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    zIndex: 1,
  },
  errorCloseButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  copyErrorButton: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  copyErrorText: { fontSize: 15, fontWeight: '600', color: '#0a0a0b' },
});