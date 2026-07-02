import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import QuestionnaireHeader from './QuestionnaireHeader';
import QuestionCard from './QuestionCard';
import { updateQuestionnaireField } from '../../utils/questionnaireStorage';

/**
 * Q1 — Primary Goal
 * Step 1 of 7 in the workout questionnaire flow.
 *
 * Value strings must match the `primaryGoal` union in QuestionnaireData
 * (see src/data/workoutPrompt.ts).
 *
 * v2 — uses the shared QuestionCard. The `subtitle` field on each
 * option is the "this is what your AI will build" reveal copy that
 * shows when that option is selected. Brief default labels live in
 * `shortLabel` only for accessibility (not currently rendered).
 */

type PrimaryGoalValue =
  | 'build_muscle'
  | 'burn_fat'
  | 'gain_strength'
  | 'body_recomposition'
  | 'general_fitness';

interface GoalOption {
  value: PrimaryGoalValue;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: GoalOption[] = [
  {
    value: 'build_muscle',
    title: 'Build muscle',
    subtitle: 'Higher rep ranges, 8–15 reps, progressive overload.',
    icon: 'barbell',
  },
  {
    value: 'burn_fat',
    title: 'Burn fat',
    subtitle: 'Higher reps, shorter rest, cardio woven in.',
    icon: 'flame',
  },
  {
    value: 'gain_strength',
    title: 'Gain strength',
    subtitle: 'Heavy compounds, 3–5 reps, longer rest periods.',
    icon: 'flash',
  },
  {
    value: 'body_recomposition',
    title: 'Body recomposition',
    subtitle: 'Balanced. Strength work plus hypertrophy ranges.',
    icon: 'sync',
  },
  {
    value: 'general_fitness',
    title: 'General fitness',
    subtitle: 'Variety. Mixed ranges, moderate intensity, full-body.',
    icon: 'heart',
  },
];

type ParamList = {
  Q1PrimaryGoal: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
};

export default function Q1PrimaryGoalScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'Q1PrimaryGoal'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const stepOffset = route.params?.flowStepOffset ?? 0;
  const [selected, setSelected] = useState<PrimaryGoalValue | null>(
    (answersSoFar.primaryGoal as PrimaryGoalValue) ?? null,
  );

  const handleNext = async () => {
    if (!selected) return;

    // Always save the answer to storage, whether in edit mode or not
    await updateQuestionnaireField('primaryGoal', selected);

    if (editMode) {
      navigation.goBack();
      return;
    }
    // Q2 (training experience) is gone from the visible flow — trainingState
    // on GoalsProfile is the source of truth now. Straight to Q3.
    navigation.navigate(
      'Q3DaysPerWeek',
      {
        answersSoFar: { ...answersSoFar, primaryGoal: selected },
        flowStepOffset: stepOffset,
      },
    );
  };

  const handleClose = () => {
    navigation.popToTop();
  };

  const handleBack = () => navigation.goBack();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 1}
        totalSteps={stepOffset + 6}
        showBack={true}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>What&apos;s your main goal?</Text>
        <Text style={styles.subtitle}>
          Shapes rep ranges, rest times, and exercise selection.
        </Text>

        <View>
          {OPTIONS.map((opt) => (
            <QuestionCard
              key={opt.value}
              icon={opt.icon}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={selected === opt.value}
              onPress={() => setSelected(opt.value)}
            />
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.ctaBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 4 },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!selected}
          onPress={handleNext}
          style={[
            styles.ctaButton,
            { backgroundColor: selected ? themeColor : '#1c1c1f' },
          ]}
        >
          <Text
            style={[
              styles.ctaText,
              { color: selected ? '#0a0a0b' : '#3f3f46' },
            ]}
          >
            {editMode ? 'Save' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  question: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 13,
    color: '#71717a',
    lineHeight: 19,
    marginBottom: 28,
  },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
    backgroundColor: '#0a0a0b',
  },
  ctaButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '500',
  },
});