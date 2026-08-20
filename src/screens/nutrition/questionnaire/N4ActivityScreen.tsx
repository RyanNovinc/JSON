// src/screens/nutrition/questionnaire/N4ActivityScreen.tsx
//
// How active the user is outside training.
//
// ── WHY IT IS HERE AND NOT ON THE PROFILE INTAKE ────────────────────────────
//
// It used to be collected by ConfirmStatsScreen, on the reasoning that day-to-
// day activity is a fact about the person rather than a food preference, and
// that the workout side has a claim on it too.
//
// That reasoning has a hole in practice: this is the answer that moves the
// CALORIE TARGET, and a user filling in the nutrition questionnaire had no
// idea it had already been asked somewhere else — so the same question could
// reach them twice, once as a "gap" to fill and once not at all.
//
// It now lives in the flow whose output it changes. The value still writes to
// the GoalsProfile, so nothing downstream moves: computeMacros reads it from
// the seeded nutrition draft exactly as before, and the workout side can still
// read it off the profile if it ever wants to.

import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import QuestionnaireHeader from '../../questionnaire/QuestionnaireHeader';
import { updateNutritionField } from '../../../utils/nutritionQuestionnaireStorage';
import { loadGoalsProfile, updateGoalsProfileField } from '../../../utils/goalsProfileStorage';
import type { ActivityLevel } from '../../../utils/goalsProfile';

/**
 * Values match the ACTIVITY_MULTIPLIERS keys in nutritionMacros.ts exactly, so
 * seeding the nutrition draft from the profile stays a straight copy with no
 * mapping layer to drift.
 *
 * The hints describe the OTHER twenty-three hours deliberately. Users
 * consistently over-rate themselves when the question reads as "how active are
 * you", because they count their training — which the plan already knows about
 * and would otherwise count twice.
 */
const OPTIONS: Array<{ value: ActivityLevel; label: string; hint: string }> = [
  { value: 'sedentary', label: 'Mostly sitting', hint: 'Desk work, driving, not much walking' },
  { value: 'light', label: 'On my feet a bit', hint: 'Some walking through the day' },
  { value: 'moderate', label: 'On my feet a lot', hint: 'Teaching, retail, hospitality' },
  { value: 'heavy', label: 'Physical work', hint: 'Trades, warehouse, nursing' },
  { value: 'extreme', label: 'Hard physical work', hint: 'Labouring all day, every day' },
];

type Params = RouteProp<
  { p: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } },
  'p'
>;

export default function N4ActivityScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<Params>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const stepOffset = route.params?.flowStepOffset ?? 0;

  const [selected, setSelected] = useState<ActivityLevel | null>(
    (answersSoFar.activityLevel as ActivityLevel) ?? null,
  );
  const [saving, setSaving] = useState(false);

  // Prefill from the profile when there is one — a returning user should not
  // have to answer this again just because the screen moved.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (selected) return;
      loadGoalsProfile().then((p) => {
        if (!cancelled && p?.activityLevel) setSelected(p.activityLevel);
      });
      return () => {
        cancelled = true;
      };
    }, [selected]),
  );

  const handleNext = async () => {
    if (!selected || saving) return;
    setSaving(true);
    try {
      // TWO WRITES, and both are needed. The PROFILE is the durable home —
      // it survives a questionnaire restart and the workout side can read it.
      // The nutrition draft is what computeMacros reads directly.
      await updateGoalsProfileField('activityLevel', selected);
      await updateNutritionField('activityLevel', selected);

      if (editMode) {
        navigation.goBack();
        return;
      }
      navigation.navigate('N5DietType', {
        answersSoFar: { ...answersSoFar, activityLevel: selected },
        flowStepOffset: stepOffset,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 4}
        totalSteps={stepOffset + 12}
        onBack={() => navigation.goBack()}
        onClose={() => navigation.popToTop()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.question}>How active are you{'\n'}outside the gym?</Text>
        <Text style={styles.subtitle}>
          Your training is already counted. This is everything else — work, errands, getting around.
        </Text>

        {OPTIONS.map((opt) => {
          const on = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.option,
                on && { borderWidth: 1.5, borderColor: themeColor, backgroundColor: `${themeColor}14` },
              ]}
              onPress={() => setSelected(opt.value)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <View style={styles.optionBody}>
                <Text style={[styles.optionLabel, on && { color: '#ffffff', fontWeight: '600' }]}>
                  {opt.label}
                </Text>
                <Text style={styles.optionHint}>{opt.hint}</Text>
              </View>
              {on ? <Ionicons name="checkmark-circle" size={20} color={themeColor} /> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: selected && !saving ? themeColor : '#1c1c1f' }]}
          onPress={handleNext}
          disabled={!selected || saving}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0a0a0b" />
          ) : (
            <Text style={[styles.ctaText, { color: selected && !saving ? '#0a0a0b' : '#3f3f46' }]}>
              {editMode ? 'Save' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },
  question: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: { fontSize: 13, color: '#71717a', lineHeight: 19, marginBottom: 26 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    backgroundColor: '#131316',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  optionBody: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '500', color: '#d4d4d8' },
  optionHint: { fontSize: 12.5, color: '#71717a', marginTop: 3 },
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