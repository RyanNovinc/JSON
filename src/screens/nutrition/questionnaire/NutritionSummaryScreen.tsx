// src/screens/nutrition/questionnaire/NutritionSummaryScreen.tsx
//
// Hub the user lands on after completing the nutrition questionnaire (or
// when re-entering with saved answers). Mirrors the workout
// QuestionnaireSummaryScreen: hero + tappable rows to edit each answer,
// a refinements block, and CTAs at the end.
//
// Differences from workout: a macro recap card up top (calories + P/C/F
// computed from the answers), and Continue re-runs finalizeNutrition()
// so any edits made here are written to the storage keys before the
// PromptReady screen reads them.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  loadNutritionAnswers,
  clearNutritionAnswers,
  NutritionAnswers,
} from '../../../utils/nutritionQuestionnaireStorage';
import { computeMacros, finalizeNutrition } from '../../../utils/nutritionMacros';

type NavProp = StackNavigationProp<any>;

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Lose weight',
  gain_weight: 'Gain weight',
  maintain: 'Maintain weight',
};
const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  heavy: 'Very active',
  extreme: 'Extremely active',
};
const DIET_LABELS: Record<string, string> = {
  balanced: 'Balanced',
  high_protein: 'High protein',
  low_carb: 'Low carb',
  keto: 'Keto',
  custom: 'Custom split',
};
const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Not specified',
};
const BUDGET_LABELS: Record<string, string> = {
  budget_conscious: 'Budget-conscious',
  keep_reasonable: 'Keep it reasonable',
  quality_first: 'Quality first',
};
const START_LABELS: Record<string, string> = {
  today: 'starts today',
  tomorrow: 'starts tomorrow',
  next_monday: 'starts next Monday',
};

interface RowConfig {
  label: string;
  route: string;
  show?: (a: NutritionAnswers) => boolean;
  format: (a: NutritionAnswers) => string;
}

const ROWS: RowConfig[] = [
  {
    label: 'Goal',
    route: 'N1Goal',
    format: (a) => (a.goal ? GOAL_LABELS[a.goal] ?? a.goal : '—'),
  },
  {
    label: 'Rate',
    route: 'N2Rate',
    show: (a) => a.goal !== 'maintain',
    format: (a) =>
      a.targetRatePercentage != null
        ? `${a.targetRatePercentage}% of bodyweight / week`
        : '—',
  },
  {
    label: 'About you',
    route: 'N3AboutYou',
    format: (a) => {
      const parts = [
        a.age != null ? `${a.age}` : null,
        a.gender ? GENDER_LABELS[a.gender] ?? a.gender : null,
        a.height != null ? `${a.height} cm` : null,
        a.weight != null ? `${a.weight} kg` : null,
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : '—';
    },
  },
  {
    label: 'Activity',
    route: 'N4Activity',
    format: (a) =>
      a.activityLevel ? ACTIVITY_LABELS[a.activityLevel] ?? a.activityLevel : '—',
  },
  {
    label: 'Diet',
    route: 'N5DietType',
    format: (a) => (a.dietType ? DIET_LABELS[a.dietType] ?? a.dietType : '—'),
  },
  {
    label: 'Meals & snacking',
    route: 'N6MealsSnacking',
    format: (a) => {
      if (a.mealsPerDay == null) return '—';
      const snack =
        a.snackFrequency === '0'
          ? 'no snacks'
          : a.snackFrequency === 'ai_decide'
          ? 'snacks: AI decides'
          : a.snackFrequency
          ? `${a.snackFrequency} snack${a.snackFrequency === '1' ? '' : 's'}`
          : '';
      return `${a.mealsPerDay} meals${snack ? ` · ${snack}` : ''}`;
    },
  },
  {
    label: 'Where you shop',
    route: 'N7Location',
    format: (a) => {
      if (!a.groceryStore) return '—';
      const loc = [a.city, a.country].filter(Boolean).join(', ');
      return loc ? `${a.groceryStore} · ${loc}` : a.groceryStore;
    },
  },
  {
    label: 'Budget',
    route: 'N8Budget',
    format: (a) => {
      const att = a.weeklyBudget ? BUDGET_LABELS[a.weeklyBudget] ?? a.weeklyBudget : '—';
      if (a.budgetMin != null && a.budgetMax != null)
        return `${att} · $${a.budgetMin}–$${a.budgetMax}/wk`;
      if (a.budgetMax != null) return `${att} · up to $${a.budgetMax}/wk`;
      return att;
    },
  },
  {
    label: 'Plan length',
    route: 'N9PlanLength',
    format: (a) => {
      if (a.planDuration == null) return '—';
      const start = a.startDate ? START_LABELS[a.startDate] ?? '' : '';
      return `${a.planDuration} days${start ? ` · ${start}` : ''}`;
    },
  },
  {
    label: 'Cooking',
    route: 'N10Cooking',
    format: (a) => {
      if (a.skillConfidence == null) return '—';
      const n = a.cookingEquipment?.length ?? 0;
      return `Skill ${a.skillConfidence}/5 · Time ${a.timeInvestment}/5 · ${n} item${n === 1 ? '' : 's'}`;
    },
  },
];

export default function NutritionSummaryScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [answers, setAnswers] = useState<NutritionAnswers | null>(null);
  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const data = await loadNutritionAnswers();
        if (!cancelled) {
          setAnswers(data);
          setLoading(false);
          setContinuing(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const handleEditRow = (route: string) => {
    if (!answers) return;
    navigation.push(route as never, {
      editMode: true,
      answersSoFar: answers,
    } as never);
  };

  const handleEditRefinements = () => {
    if (!answers) return;
    navigation.push('NutritionRefinements' as never, {
      editMode: true,
      answersSoFar: answers,
    } as never);
  };

  const handleContinue = async () => {
    if (!answers || continuing) return;
    setContinuing(true);
    try {
      // Re-finalize so any edits made here are written before the prompt
      // screen reads the storage keys.
      const macros = await finalizeNutrition(answers);
      if (!macros) {
        Alert.alert(
          'Missing details',
          'Some required answers are missing — tap a row above to finish them.'
        );
        setContinuing(false);
        return;
      }
      navigation.navigate('NutritionPromptReady' as never);
    } catch (e) {
      console.error('Summary continue failed', e);
      Alert.alert('Something went wrong', 'Could not save. Try again.');
      setContinuing(false);
    }
  };

  const handleStartOver = () => {
    Alert.alert(
      'Restart questionnaire?',
      'This clears all your answers and starts again from the beginning.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: async () => {
            await clearNutritionAnswers();
            navigation.navigate('N1Goal' as never);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  if (!answers) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.emptyText}>
          No saved questionnaire. Start a new one from Create.
        </Text>
      </View>
    );
  }

  const macros = computeMacros(answers);

  const hasRefinements =
    (answers.allergies?.length ?? 0) > 0 ||
    (answers.avoidFoods?.length ?? 0) > 0 ||
    (answers.eatingChallenges?.length ?? 0) > 0;

  const visibleRows = ROWS.filter((r) => !r.show || r.show(answers));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#d4d4d8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your plan</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Looking good.</Text>
        <Text style={styles.subtitle}>
          Tap any answer to change it, or continue to your prompt.
        </Text>

        {/* Macro recap */}
        {macros && (
          <View style={styles.macroCard}>
            <View style={styles.macroTop}>
              <Text style={[styles.macroCals, { color: themeColor }]}>
                {macros.calories.toLocaleString()}
              </Text>
              <Text style={styles.macroCalsUnit}>kcal / day</Text>
            </View>
            <View style={styles.macroRow}>
              {[
                { label: 'Protein', value: `${macros.protein}g` },
                { label: 'Carbs', value: `${macros.carbs}g` },
                { label: 'Fat', value: `${macros.fat}g` },
              ].map((m) => (
                <View key={m.label} style={styles.macroItem}>
                  <Text style={styles.macroValue}>{m.value}</Text>
                  <Text style={styles.macroLabel}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rows */}
        <View style={styles.section}>
          {visibleRows.map((row, idx) => (
            <TouchableOpacity
              key={row.route + row.label}
              activeOpacity={0.7}
              onPress={() => handleEditRow(row.route)}
              style={[
                styles.row,
                idx === visibleRows.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.format(answers)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#52525b" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Refinements */}
        <Text style={styles.sectionHeader}>Refinements</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleEditRefinements}
          style={[styles.section, styles.refBlock]}
        >
          {hasRefinements ? (
            <View style={{ flex: 1 }}>
              {(answers.allergies?.length ?? 0) > 0 && (
                <RefRow label="Allergies" value={answers.allergies!.join(', ')} />
              )}
              {(answers.avoidFoods?.length ?? 0) > 0 && (
                <RefRow label="Avoid" value={answers.avoidFoods!.join(', ')} />
              )}
              {(answers.eatingChallenges?.length ?? 0) > 0 && (
                <RefRow
                  label="Challenges"
                  value={answers.eatingChallenges!.join(', ')}
                  last
                />
              )}
            </View>
          ) : (
            <View style={styles.refEmpty}>
              <Ionicons name="add-circle-outline" size={18} color={themeColor} />
              <Text style={[styles.refEmptyText, { color: themeColor }]}>
                Add refinements
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="#52525b" />
        </TouchableOpacity>

        {/* CTAs */}
        <View style={styles.ctas}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={continuing}
            onPress={handleContinue}
            style={[styles.primaryBtn, { backgroundColor: themeColor }]}
          >
            {continuing ? (
              <ActivityIndicator size="small" color="#0a0a0b" />
            ) : (
              <Text style={[styles.primaryBtnText, { color: '#0a0a0b' }]}>
                Continue to prompt
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleStartOver}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Restart questionnaire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function RefRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[refStyles.row, last && { borderBottomWidth: 0, paddingBottom: 0 }]}>
      <Text style={refStyles.label}>{label}</Text>
      <Text style={refStyles.value} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const refStyles = StyleSheet.create({
  row: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  value: { fontSize: 14, color: '#e4e4e7', lineHeight: 19 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  center: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#71717a', paddingHorizontal: 40, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: '#d4d4d8',
    letterSpacing: 0.2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
    marginBottom: 24,
  },
  macroCard: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  macroTop: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  macroCals: { fontSize: 40, fontWeight: '700', letterSpacing: -1 },
  macroCalsUnit: { fontSize: 13, color: '#71717a', marginLeft: 8 },
  macroRow: { flexDirection: 'row' },
  macroItem: { flex: 1 },
  macroValue: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 2 },
  macroLabel: {
    fontSize: 11,
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
    gap: 12,
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  rowValue: { fontSize: 15, color: '#ffffff', fontWeight: '500', lineHeight: 20 },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#71717a',
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  refBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  refEmpty: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  refEmptyText: { fontSize: 14, fontWeight: '500' },
  ctas: { marginTop: 32, gap: 6 },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '600' },
  secondaryBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '500', color: '#71717a' },
});