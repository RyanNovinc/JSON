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
 * N4 — Activity level
 * Step 4. Feeds the TDEE activity multiplier. Values match the existing
 * macro calculator: sedentary / light / moderate / heavy / extreme.
 */

type ActivityValue = 'sedentary' | 'light' | 'moderate' | 'heavy' | 'extreme';

interface ActivityOption {
  value: ActivityValue;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: ActivityOption[] = [
  {
    value: 'sedentary',
    title: 'Sedentary',
    subtitle: 'Little or no exercise, desk job.',
    icon: 'bed',
  },
  {
    value: 'light',
    title: 'Lightly active',
    subtitle: 'Light exercise 1–3 days a week.',
    icon: 'walk',
  },
  {
    value: 'moderate',
    title: 'Moderately active',
    subtitle: 'Moderate exercise 3–5 days a week.',
    icon: 'bicycle',
  },
  {
    value: 'heavy',
    title: 'Very active',
    subtitle: 'Hard exercise 6–7 days a week.',
    icon: 'barbell',
  },
  {
    value: 'extreme',
    title: 'Extremely active',
    subtitle: 'Physical job or training twice a day.',
    icon: 'flame',
  },
];

type ParamList = {
  N4Activity: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
};

export default function N4ActivityScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'N4Activity'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const stepOffset = route.params?.flowStepOffset ?? 0;
  const [selected, setSelected] = useState<ActivityValue | null>(
    (answersSoFar.activityLevel as ActivityValue) ?? null
  );

  const handleNext = async () => {
    if (!selected) return;

    // Always save the answer to storage, whether in edit mode or not
    await updateNutritionField('activityLevel', selected);

    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N5DietType',
      { answersSoFar: { ...answersSoFar, activityLevel: selected }, flowStepOffset: stepOffset }
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 4}
        totalSteps={stepOffset + 12}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>How active are you?</Text>
        <Text style={styles.subtitle}>
          Sets your daily energy burn on top of your baseline.
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