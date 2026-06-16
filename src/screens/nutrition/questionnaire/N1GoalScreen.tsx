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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import QuestionnaireHeader from '../../questionnaire/QuestionnaireHeader';
import QuestionCard from '../../questionnaire/QuestionCard';
import { updateNutritionField } from '../../../utils/nutritionQuestionnaireStorage';

/**
 * N1 — Primary nutrition goal
 * Step 1 of the nutrition questionnaire. Exact structural mirror of the
 * workout Q1PrimaryGoalScreen: shared QuestionCard, answersSoFar passed
 * forward, editMode saves the single field and goes back.
 *
 * Skip logic: "maintain" has no rate to pick, so it jumps straight to
 * N3 (About you), mirroring the existing nutrition flow.
 */

type GoalValue = 'lose_weight' | 'gain_weight' | 'maintain';

interface GoalOption {
  value: GoalValue;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: GoalOption[] = [
  {
    value: 'lose_weight',
    title: 'Lose weight',
    subtitle: 'Calorie deficit. Lean out while keeping muscle.',
    icon: 'flame',
  },
  {
    value: 'gain_weight',
    title: 'Gain weight',
    subtitle: 'Calorie surplus. Build size and strength.',
    icon: 'barbell',
  },
  {
    value: 'maintain',
    title: 'Maintain weight',
    subtitle: 'Hold your current weight. Recomp-friendly.',
    icon: 'sync',
  },
];

type ParamList = {
  N1Goal: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function N1GoalScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'N1Goal'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const [selected, setSelected] = useState<GoalValue | null>(
    (answersSoFar.goal as GoalValue) ?? null
  );

  const handleNext = async () => {
    if (!selected) return;
    
    // Always save the answer to storage, whether in edit mode or not
    await updateNutritionField('goal', selected);
    
    if (editMode) {
      navigation.goBack();
      return;
    }
    // maintain has no rate step → jump to N3
    const next = selected === 'maintain' ? 'N3AboutYou' : 'N2Rate';
    navigation.navigate(
      next as never,
      { answersSoFar: { ...answersSoFar, goal: selected } } as never
    );
  };

  const handleClose = () => navigation.popToTop();

  const handleBack = () => navigation.goBack();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={1}
        totalSteps={12}
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
          Sets your calorie target and how we split your macros.
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