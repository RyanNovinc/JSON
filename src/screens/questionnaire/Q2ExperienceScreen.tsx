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
 * Q2 — Training Experience
 * Step 2 of 7.
 *
 * Values must match the `trainingExperience` union in QuestionnaireData.
 */

type ExperienceValue =
  | 'complete_beginner'
  | 'beginner'
  | 'intermediate'
  | 'advanced';

interface ExperienceOption {
  value: ExperienceValue;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: ExperienceOption[] = [
  {
    value: 'complete_beginner',
    title: 'Complete beginner',
    subtitle: 'Simple programming. Compound lifts, lower volume.',
    icon: 'sparkles',
  },
  {
    value: 'beginner',
    title: 'Beginner',
    subtitle: 'Foundation building. Linear progression still works.',
    icon: 'leaf',
  },
  {
    value: 'intermediate',
    title: 'Intermediate',
    subtitle: 'Periodization with multi-block progression.',
    icon: 'trending-up',
  },
  {
    value: 'advanced',
    title: 'Advanced',
    subtitle: 'Full periodization. High volume, recovery focus.',
    icon: 'trophy',
  },
];

type ParamList = {
  Q2Experience: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
};

export default function Q2ExperienceScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'Q2Experience'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const stepOffset = route.params?.flowStepOffset ?? 0;
  const [selected, setSelected] = useState<ExperienceValue | null>(
    (answersSoFar.trainingExperience as ExperienceValue) ?? null,
  );

  const handleNext = async () => {
    if (!selected) return;

    // Always save the answer to storage, whether in edit mode or not
    await updateQuestionnaireField('trainingExperience', selected);

    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'Q3DaysPerWeek',
      {
        answersSoFar: { ...answersSoFar, trainingExperience: selected },
        flowStepOffset: stepOffset,
      },
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 2}
        totalSteps={stepOffset + 7}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>How long have you been training?</Text>
        <Text style={styles.subtitle}>
          Shapes program complexity and weekly volume.
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