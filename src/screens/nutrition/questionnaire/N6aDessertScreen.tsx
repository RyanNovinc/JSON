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
 * N6a — Desserts (sits between N6 Meals & Snacking and N7 Location)
 *
 * Sets `dessertFrequency`, used by the meal-plan prompt builder's
 * getDessertGuidance and by the Foods You Like screen's tab construction.
 *
 * Cadence is per-week (unlike snacks which are per-day) because that's how
 * people actually think about dessert — "I want it every night" vs "a few
 * times a week", not "two desserts a day".
 */

type DessertValue = '0' | 'once_per_week' | 'few_per_week' | 'most_nights' | 'every_night' | 'ai_decide';

interface DessertOption {
  value: DessertValue;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: DessertOption[] = [
  {
    value: '0',
    title: 'No desserts',
    subtitle: 'Skip desserts entirely. Clean bulk territory.',
    icon: 'close-circle',
  },
  {
    value: 'once_per_week',
    title: 'Once a week',
    subtitle: 'One night per week. An occasional treat.',
    icon: 'calendar',
  },
  {
    value: 'few_per_week',
    title: 'A few nights a week',
    subtitle: '2–3 nights. A treat, not an expectation.',
    icon: 'moon',
  },
  {
    value: 'most_nights',
    title: 'Most nights',
    subtitle: '4–5 nights a week.',
    icon: 'star',
  },
  {
    value: 'every_night',
    title: 'Every night',
    subtitle: 'A nightly treat after dinner.',
    icon: 'ice-cream',
  },
  {
    value: 'ai_decide',
    title: 'Let AI decide',
    subtitle: "We'll fit them in where they make sense.",
    icon: 'bulb',
  },
];

type ParamList = {
  N6aDessert:
    | { answersSoFar?: Record<string, any>; editMode?: boolean }
    | undefined;
};

export default function N6aDessertScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'N6aDessert'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  const [selected, setSelected] = useState<DessertValue | null>(
    (answersSoFar.dessertFrequency as DessertValue) ?? null
  );

  const handleNext = async () => {
    if (!selected) return;
    
    // Always save the answer to storage, whether in edit mode or not
    await updateNutritionField('dessertFrequency', selected);
    
    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N7Location' as never,
      {
        answersSoFar: {
          ...answersSoFar,
          dessertFrequency: selected,
        },
      } as never
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={9}
        totalSteps={12}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>Want dessert in your plan?</Text>
        <Text style={styles.subtitle}>
          A small treat on top of your meals — protein ice cream, mug cakes,
          things like that. Pick how often.
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
            style={[styles.ctaText, { color: selected ? '#0a0a0b' : '#3f3f46' }]}
          >
            {editMode ? 'Save' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
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
  ctaText: { fontSize: 15, fontWeight: '500' },
});