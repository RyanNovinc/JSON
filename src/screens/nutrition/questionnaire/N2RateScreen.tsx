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
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import QuestionnaireHeader from '../../questionnaire/QuestionnaireHeader';
import QuestionCard from '../../questionnaire/QuestionCard';
import { updateNutritionField } from '../../../utils/nutritionQuestionnaireStorage';

/**
 * N2 — Target rate
 * Step 2. Skipped entirely for "maintain" (N1 routes straight to N3).
 *
 * The old NutritionStep2 used a continuous slider with goal-specific
 * ranges. To match the workout style (no sliders anywhere) this presents
 * the same range as discrete QuestionCards, storing `targetRatePercentage`
 * (% bodyweight / week). The kg/week `targetRate` is derived later, once
 * weight is known on N3 / at macro computation.
 */

interface RateOption {
  value: number;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const LOSS_OPTIONS: RateOption[] = [
  { value: 0.25, title: 'Gentle · 0.25% / week', subtitle: 'Slowest. Best muscle retention.', icon: 'leaf' },
  { value: 0.5, title: 'Standard · 0.5% / week', subtitle: 'The sweet spot. Sustainable fat loss.', icon: 'walk' },
  { value: 0.75, title: 'Faster · 0.75% / week', subtitle: 'Quicker, with a bit more muscle-loss risk.', icon: 'flame' },
  { value: 1.0, title: 'Aggressive · 1% / week', subtitle: 'Fastest. Hardest to sustain.', icon: 'flash' },
];

const GAIN_OPTIONS: RateOption[] = [
  { value: 0.16, title: 'Lean · 0.16% / week', subtitle: 'Minimal fat gain, mostly muscle.', icon: 'leaf' },
  { value: 0.25, title: 'Standard · 0.25% / week', subtitle: 'Balanced muscle and size.', icon: 'walk' },
  { value: 0.5, title: 'Aggressive · 0.5% / week', subtitle: 'Fastest gains, more fat to cut later.', icon: 'flash' },
];

type ParamList = {
  N2Rate: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function N2RateScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'N2Rate'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  const isLoss = answersSoFar.goal === 'lose_weight';
  const OPTIONS = isLoss ? LOSS_OPTIONS : GAIN_OPTIONS;

  const [selected, setSelected] = useState<number | null>(
    (answersSoFar.targetRatePercentage as number) ?? null
  );

  const handleNext = async () => {
    if (selected == null) return;
    
    // Always save the answer to storage, whether in edit mode or not
    await updateNutritionField('targetRatePercentage', selected);
    
    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N3AboutYou',
      {
        answersSoFar: { ...answersSoFar, targetRatePercentage: selected },
      }
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={2}
        totalSteps={12}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>
          How {isLoss ? 'fast' : 'quickly'} do you want to{' '}
          {isLoss ? 'lose' : 'gain'}?
        </Text>
        <Text style={styles.subtitle}>
          Sets your weekly calorie {isLoss ? 'deficit' : 'surplus'}. Slower
          is easier to sustain.
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
          disabled={selected == null}
          onPress={handleNext}
          style={[
            styles.ctaButton,
            { backgroundColor: selected != null ? themeColor : '#1c1c1f' },
          ]}
        >
          <Text
            style={[
              styles.ctaText,
              { color: selected != null ? '#0a0a0b' : '#3f3f46' },
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