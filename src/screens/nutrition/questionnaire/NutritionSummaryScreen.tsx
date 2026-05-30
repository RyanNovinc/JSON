// src/screens/nutrition/questionnaire/NutritionSummaryScreen.tsx
//
// Hub the user lands on after completing the nutrition questionnaire (or
// when re-entering with saved answers). Mirrors the workout
// QuestionnaireSummaryScreen: hero + tappable rows to edit each answer,
// and CTAs at the end.
//
// Differences from workout: a macro recap card up top (calories + P/C/F
// computed from the answers), and Continue re-runs finalizeNutrition()
// so any edits made here are written to the storage keys before the
// PromptReady screen reads them.
//
// CHANGES (curated-meals model):
//  - "Foods you like" promoted from optional add-on to a primary section
//    ("Build your plan around") above "Your answers", since in the curated
//    model the user's selected meals are the core input the AI schedules from.
//  - Fridge & pantry removed entirely (dead in the curated model).
//  - Refinements (eating challenges) folded into the "Your answers" table as
//    a normal row instead of its own section.
//  - Soft gate on Continue: if no meals are picked, confirm before proceeding
//    (the AI would otherwise invent the whole plan). Not a hard block.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import { loadCuratedFavorites, favoritesCount } from '../../../utils/curatedFavoritesStorage';
import { WorkoutStorage } from '../../../utils/storage';

type NavProp = StackNavigationProp<any>;

// Macro bar colours — protein cyan (theme), carbs amber, fat pink.
const MACRO_COLORS = {
  protein: '#22d3ee',
  carbs: '#fbbf24',
  fat: '#f472b6',
};

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
          : a.snackFrequency === '3+'
          ? '3+ snacks'
          : a.snackFrequency
          ? `${a.snackFrequency} snack${a.snackFrequency === '1' ? '' : 's'}`
          : '';
      return `${a.mealsPerDay} meals${snack ? ` · ${snack}` : ''}`;
    },
  },
  {
    label: 'Desserts',
    route: 'N6aDessert',
    format: (a) => {
      if (!a.dessertFrequency || a.dessertFrequency === '0') return 'None';
      if (a.dessertFrequency === 'every_night') return 'Every night';
      if (a.dessertFrequency === 'most_nights') return 'Most nights';
      if (a.dessertFrequency === 'few_per_week') return 'A few nights a week';
      if (a.dessertFrequency === 'ai_decide') return 'Let AI decide';
      return '—';
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
];

export default function NutritionSummaryScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [answers, setAnswers] = useState<NutritionAnswers | null>(null);
  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);
  // Bumped on every focus so the macro bars replay their fill animation
  // (macros may have changed after editing a row).
  const [animTick, setAnimTick] = useState(0);
  const [favCount, setFavCount] = useState(0);
  // Sleep lives in its own WorkoutStorage key (not the NutritionAnswers
  // draft), so we load it separately to show a row + deep-link to N5cSleep.
  const [sleepSummary, setSleepSummary] = useState<string | null>(null);

  // ScrollView ref for scroll position management
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      // Reset scroll position to top whenever screen gains focus
      // This fixes the issue where summary retains scroll offset across remounts
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });

      (async () => {
        const data = await loadNutritionAnswers();
        const favs = await loadCuratedFavorites();
        let sleepText: string | null = null;
        try {
          const sleep = await WorkoutStorage.loadSleepOptimizationResults();
          const f = sleep?.formData;
          if (f?.bedtime && f?.wakeTime) {
            const level =
              f.optimizationLevel === 'minimal'
                ? 'Relaxed'
                : f.optimizationLevel === 'maximum'
                ? 'Strict'
                : 'Balanced';
            sleepText = `${f.bedtime} – ${f.wakeTime} · ${level}`;
          }
        } catch {
          // no sleep data saved — leave the row showing the optional prompt
        }
        if (!cancelled) {
          setAnswers(data);
          setFavCount(favoritesCount(favs));
          setSleepSummary(sleepText);
          setLoading(false);
          setContinuing(false);
          setAnimTick((t) => t + 1);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const handleBack = () => {
    navigation.navigate('CreateFlow' as never);
  };

  const handleClose = () => {
    // Navigate to the main tab navigator's Nutrition tab
    navigation.navigate('Main', { screen: 'Nutrition' });
  };

  const handleOpenFavorites = () => {
    navigation.push('CuratedFavorites' as never);
  };

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

  // Allergies/avoid are owned by N5b now, so edit there (not Refinements).
  const handleEditAllergies = () => {
    if (!answers) return;
    navigation.push('N5bAllergies' as never, {
      editMode: true,
      answersSoFar: answers,
    } as never);
  };

  // Sleep saves to its own store; N5c reads it itself, so no answersSoFar.
  const handleEditSleep = () => {
    navigation.push('N5cSleep' as never, { editMode: true } as never);
  };

  // Proceeds to the prompt step after re-finalizing. Pulled out so both the
  // direct path and the "Continue anyway" soft-gate path can call it.
  const proceedToPrompt = async () => {
    if (!answers) return;
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

  const handleContinue = async () => {
    if (!answers || continuing) return;

    // Soft gate: in the curated model, an empty "Foods you like" selection
    // means the AI invents the entire plan from scratch. Don't hard-block —
    // just make the consequence clear so there's no confusion downstream.
    if (favCount === 0) {
      Alert.alert(
        'No meals picked yet',
        "Without any picks, the AI builds your whole plan from scratch. Pick a few foods you like for a plan built around them — or continue anyway.",
        [
          {
            text: 'Pick foods',
            onPress: () => navigation.push('CuratedFavorites' as never),
          },
          {
            text: 'Continue anyway',
            style: 'destructive',
            onPress: () => {
              void proceedToPrompt();
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    await proceedToPrompt();
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

  // Eating challenges now live as a row in the main "Your answers" table.
  const challengesValue =
    (answers.eatingChallenges?.length ?? 0) > 0
      ? answers.eatingChallenges!.join(', ')
      : 'None';

  const allergyCount = answers.allergies?.length ?? 0;
  const exclusionsSummary =
    allergyCount > 0 ? answers.allergies!.join(', ') : null;

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
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Looking good.</Text>
        <Text style={styles.subtitle}>
          Tap any answer to change it, then add the meals your plan is built from.
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
            <View style={styles.macroBars}>
              {(() => {
                const pCal = (macros.protein ?? 0) * 4;
                const cCal = (macros.carbs ?? 0) * 4;
                const fCal = (macros.fat ?? 0) * 9;
                const total = pCal + cCal + fCal;
                const pct = (v: number) =>
                  total > 0 ? Math.round((v / total) * 100) : 0;
                return [
                  {
                    label: 'Protein',
                    grams: macros.protein ?? 0,
                    pct: pct(pCal),
                    color: MACRO_COLORS.protein,
                  },
                  {
                    label: 'Carbs',
                    grams: macros.carbs ?? 0,
                    pct: pct(cCal),
                    color: MACRO_COLORS.carbs,
                  },
                  {
                    label: 'Fat',
                    grams: macros.fat ?? 0,
                    pct: pct(fCal),
                    color: MACRO_COLORS.fat,
                  },
                ].map((m, i) => (
                  <MacroBar
                    key={m.label}
                    label={m.label}
                    grams={m.grams}
                    pct={m.pct}
                    color={m.color}
                    delay={i * 120}
                    replayKey={animTick}
                  />
                ));
              })()}
            </View>
          </View>
        )}

        {/* Build your plan around — Foods you like, promoted to primary.
            In the curated model this is the core input, not an optional extra. */}
        <Text style={styles.sectionHeader}>Build your plan around</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleOpenFavorites}
          style={[
            styles.primaryAddon,
            { borderColor: favCount > 0 ? themeColor : '#27272a' },
          ]}
        >
          <View style={styles.primaryAddonRow}>
            <View
              style={[
                styles.primaryAddonIcon,
                {
                  backgroundColor:
                    favCount > 0 ? 'rgba(34,211,238,0.12)' : '#141416',
                },
              ]}
            >
              <Ionicons
                name={favCount > 0 ? 'heart' : 'heart-outline'}
                size={19}
                color={favCount > 0 ? themeColor : '#71717a'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryAddonTitle}>Foods you like</Text>
              <Text style={styles.primaryAddonSub}>
                {favCount > 0
                  ? `${favCount} meal${favCount === 1 ? '' : 's'} picked`
                  : 'The meals your plan is built from'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#52525b" />
          </View>
          {favCount === 0 && (
            <View style={styles.primaryAddonNotice}>
              <Ionicons name="alert-circle-outline" size={14} color="#d97706" />
              <Text style={styles.primaryAddonNoticeText}>
                Nothing picked yet — pick meals for a plan built around your tastes
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Your answers — everything completed in the flow, uniform rows */}
        <Text style={styles.sectionHeader}>Your answers</Text>
        <View style={styles.section}>
          {visibleRows.map((row) => (
            <TouchableOpacity
              key={row.route + row.label}
              activeOpacity={0.7}
              onPress={() => handleEditRow(row.route)}
              style={styles.row}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.format(answers)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#52525b" />
            </TouchableOpacity>
          ))}

          {/* Allergies & avoid — owned by N5b, lives in NutritionAnswers */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleEditAllergies}
            style={styles.row}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Allergies</Text>
              <Text style={styles.rowValue} numberOfLines={2}>
                {exclusionsSummary ?? 'None'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#52525b" />
          </TouchableOpacity>

          {/* Sleep & meal timing — owned by N5c, separate store */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleEditSleep}
            style={styles.row}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Sleep & meal timing</Text>
              <Text style={styles.rowValue}>{sleepSummary ?? 'Not set'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#52525b" />
          </TouchableOpacity>

          {/* Eating challenges — folded in from the old standalone Refinements
              section. Allergies/avoid live in their own row above. */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleEditRefinements}
            style={[styles.row, { borderBottomWidth: 0 }]}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Eating challenges</Text>
              <Text style={styles.rowValue} numberOfLines={2}>
                {challengesValue}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#52525b" />
          </TouchableOpacity>
        </View>

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
                Continue
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

function MacroBar({
  label,
  grams,
  pct,
  color,
  delay,
  replayKey,
}: {
  label: string;
  grams: number;
  pct: number;
  color: string;
  delay: number;
  replayKey: number;
}) {
  // Animate width 0% -> target%. Width can't use the native driver, but for
  // three short one-shot tweens that's fine, and it fills left-to-right
  // naturally with no scale-origin hack.
  const progress = useRef(new Animated.Value(0)).current;
  const targetPct = Math.max(pct, 2);

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 650,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [replayKey, targetPct, delay, progress]);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', `${targetPct}%`],
  });

  return (
    <View style={styles.barRow}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barGrams}>{grams}g</Text>
        <Text style={styles.barPct}>{pct}%</Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            { width: widthInterpolated, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

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
  // Foods you like — primary add-on (solid border, not dashed/optional).
  primaryAddon: {
    backgroundColor: '#131316',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  primaryAddonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryAddonIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAddonTitle: { fontSize: 15, fontWeight: '500', color: '#ffffff' },
  primaryAddonSub: { fontSize: 12, color: '#a1a1aa', marginTop: 2, lineHeight: 16 },
  primaryAddonNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  primaryAddonNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#d97706',
    lineHeight: 16,
  },
  macroTop: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  macroCals: { fontSize: 40, fontWeight: '700', letterSpacing: -1 },
  macroCalsUnit: { fontSize: 13, color: '#71717a', marginLeft: 8 },
  macroBars: { gap: 13 },
  barRow: {},
  barHead: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  barLabel: { flex: 1, fontSize: 12, color: '#a1a1aa' },
  barGrams: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  barPct: { fontSize: 11, color: '#71717a', marginLeft: 8, width: 34, textAlign: 'right' },
  barTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1c1c1f',
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
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