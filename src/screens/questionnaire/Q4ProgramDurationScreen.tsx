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
 * Q4 — Program Duration
 * Step 4 of 7.
 *
 * Values must match the `programDuration` union in QuestionnaireData
 * (excluding 'custom', which we intentionally drop from the new flow).
 *
 * The 6 months / 1 year options trigger an inline AI-tier notice below
 * the option list: free Claude/ChatGPT can usually do up to 12 weeks
 * comfortably; longer plans tend to span multiple sessions or need a
 * paid tier.
 */

type DurationValue =
  | '4_weeks'
  | '8_weeks'
  | '12_weeks'
  | '6_months'
  | '1_year';

interface DurationOption {
  value: DurationValue;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: DurationOption[] = [
  {
    value: '4_weeks',
    title: '4 weeks',
    subtitle: 'Quick reset. Single training block.',
    icon: 'calendar-outline',
  },
  {
    value: '8_weeks',
    title: '8 weeks',
    subtitle: 'Standard mesocycle. Real measurable results.',
    icon: 'calendar',
  },
  {
    value: '12_weeks',
    title: '12 weeks',
    subtitle: 'Three blocks. Full progression cycle.',
    icon: 'calendar-clear',
  },
  {
    value: '6_months',
    title: '6 months',
    subtitle: 'Multiple phases. Sustained adaptation.',
    icon: 'calendar-clear-outline',
  },
  {
    value: '1_year',
    title: '1 year',
    subtitle: 'Full periodization. Lifestyle commitment.',
    icon: 'calendar-number',
  },
];

const LONG_DURATIONS: DurationValue[] = ['6_months', '1_year'];

type ParamList = {
  Q4ProgramDuration: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function Q4ProgramDurationScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'Q4ProgramDuration'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const [selected, setSelected] = useState<DurationValue | null>(
    (answersSoFar.programDuration as DurationValue) ?? null,
  );

  const handleNext = async () => {
    if (!selected) return;
    
    // Always save the answer to storage, whether in edit mode or not
    await updateQuestionnaireField('programDuration', selected);
    
    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'Q5Equipment',
      {
        answersSoFar: { ...answersSoFar, programDuration: selected },
      },
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const showLongProgramNotice = selected && LONG_DURATIONS.includes(selected);

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={4}
        totalSteps={7}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>How long should it run?</Text>
        <Text style={styles.subtitle}>
          Longer programs build deeper adaptations.
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

        {showLongProgramNotice ? (
          <View style={styles.noticeBox}>
            <Ionicons
              name="information-circle"
              size={15}
              color={themeColor}
              style={{ marginTop: 1 }}
            />
            <Text style={styles.noticeText}>
              Long programs may not fit a single free AI session. You can
              run it across multiple sessions, or use a paid Claude or
              ChatGPT plan for one shot.
            </Text>
          </View>
        ) : null}
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
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    borderRadius: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#d4d4d8',
    lineHeight: 17,
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