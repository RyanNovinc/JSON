// src/screens/nutrition/questionnaire/N3AgeScreen.tsx
//
// The user's age.
//
// ── WHY IT IS IN THE NUTRITION FLOW ─────────────────────────────────────────
//
// Age has exactly one consumer: the Mifflin-St Jeor BMR term, which sets the
// calorie target. The roadmap does not read it at all — no phase duration, no
// gain rate, no band depends on it. (Age plausibly does affect gain rate in
// reality, but not by an amount anyone has quantified for a 20-45 population,
// so the model omits it deliberately rather than inventing a coefficient.)
//
// It used to be collected on the shared intake alongside sex and height, which
// meant a nutrition user answered it somewhere they could not see why, and a
// workout-only user answered it for nothing.
//
// The value still writes to the GoalsProfile, so anything that reads it there
// keeps working.

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import QuestionnaireHeader from '../../questionnaire/QuestionnaireHeader';
import { updateNutritionField } from '../../../utils/nutritionQuestionnaireStorage';
import { loadGoalsProfile, updateGoalsProfileField } from '../../../utils/goalsProfileStorage';

/**
 * Bounds, not validation theatre. Below 13 the BMR equations were not derived
 * for the population; above 100 it is a typo. Anything inside is accepted
 * without comment.
 */
const MIN_AGE = 13;
const MAX_AGE = 100;

type Params = RouteProp<
  { p: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } },
  'p'
>;

export default function N3AgeScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<Params>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const stepOffset = route.params?.flowStepOffset ?? 0;

  const [value, setValue] = useState<string>(
    answersSoFar.age != null ? String(answersSoFar.age) : '',
  );
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (value) return;
      loadGoalsProfile().then((p) => {
        if (!cancelled && p?.ageYears != null) setValue(String(p.ageYears));
      });
      return () => {
        cancelled = true;
      };
    }, [value]),
  );

  const parsed = parseInt(value, 10);
  const valid = Number.isFinite(parsed) && parsed >= MIN_AGE && parsed <= MAX_AGE;
  // Only complain once they have typed something real — an error under an
  // empty field is scolding someone for not having answered yet.
  const error = value.length > 0 && !valid ? `Enter an age between ${MIN_AGE} and ${MAX_AGE}` : null;

  const handleNext = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await updateGoalsProfileField('ageYears', parsed);
      await updateNutritionField('age', parsed);

      if (editMode) {
        navigation.goBack();
        return;
      }
      navigation.navigate('N4Activity', {
        answersSoFar: { ...answersSoFar, age: parsed },
        flowStepOffset: stepOffset,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 3}
        totalSteps={stepOffset + 12}
        onBack={() => navigation.goBack()}
        onClose={() => navigation.popToTop()}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.question}>How old are you?</Text>
          <Text style={styles.subtitle}>
            Your body burns fewer calories at rest as you get older, so this shifts your targets.
          </Text>

          <View
            style={[
              styles.field,
              value.length > 0 && valid && { borderColor: themeColor, borderWidth: 1.5 },
              !!error && styles.fieldError,
            ]}
          >
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              placeholder="28"
              placeholderTextColor="#3f3f46"
              keyboardType="number-pad"
              maxLength={3}
              returnKeyType="done"
              onSubmitEditing={handleNext}
              autoFocus={!editMode}
              accessibilityLabel="Your age in years"
            />
            <Text style={styles.unit}>years</Text>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: valid && !saving ? themeColor : '#1c1c1f' }]}
            onPress={handleNext}
            disabled={!valid || saving}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#0a0a0b" />
            ) : (
              <Text style={[styles.ctaText, { color: valid && !saving ? '#0a0a0b' : '#3f3f46' }]}>
                {editMode ? 'Save' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },
  question: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: { fontSize: 13, color: '#71717a', lineHeight: 19, marginBottom: 28 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 18,
    height: 62,
  },
  fieldError: { borderColor: '#ef4444', borderWidth: 1.5 },
  input: { flex: 1, fontSize: 22, fontWeight: '600', color: '#ffffff' },
  unit: { fontSize: 14, color: '#71717a' },
  error: { fontSize: 12.5, color: '#ef4444', marginTop: 9 },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
    backgroundColor: '#0a0a0b',
  },
  cta: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 15, fontWeight: '500' },
});