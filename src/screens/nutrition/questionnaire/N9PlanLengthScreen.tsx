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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import QuestionnaireHeader from '../../questionnaire/QuestionnaireHeader';
import { updateNutritionField } from '../../../utils/nutritionQuestionnaireStorage';

/**
 * N9 — Plan length & start
 * Step 9. Sets `planDuration` (days) and `startDate`
 * ('today' | 'tomorrow' | 'next_monday'), both read by the prompt builder.
 */

const DURATIONS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
];

const START_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'next_monday', label: 'Next Monday' },
];

type ParamList = {
  N9PlanLength: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function N9PlanLengthScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'N9PlanLength'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  // Default to 1 week. If a draft carried a now-removed value (21/28), clamp to 7.
  const [duration, setDuration] = useState<number | null>(
    answersSoFar.planDuration === 14 ? 14 : 7
  );
  const [start, setStart] = useState<string | null>(
    (answersSoFar.startDate as string) ?? null
  );

  const valid = duration != null && start != null;

  const handleNext = async () => {
    if (!valid) return;
    if (editMode) {
      await updateNutritionField('planDuration', duration);
      await updateNutritionField('startDate', start);
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N10Cooking' as never,
      {
        answersSoFar: { ...answersSoFar, planDuration: duration, startDate: start },
      } as never
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={9}
        totalSteps={10}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>How long a plan?</Text>
        <Text style={styles.subtitle}>
          Sets how many days of meals your AI maps out.
        </Text>

        <Text style={styles.fieldLabel}>Duration</Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => {
            const isSel = duration === d.days;
            return (
              <TouchableOpacity
                key={d.days}
                activeOpacity={0.85}
                onPress={() => setDuration(d.days)}
                style={[
                  styles.durationCard,
                  {
                    borderColor: isSel ? themeColor : '#27272a',
                    backgroundColor: isSel
                      ? 'rgba(34, 211, 238, 0.08)'
                      : '#131316',
                    borderWidth: isSel ? 1.5 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.durationLabel,
                    { color: isSel ? '#ffffff' : '#d4d4d8', fontWeight: isSel ? '700' : '500' },
                  ]}
                >
                  {d.label}
                </Text>
                <Text style={styles.durationDays}>{d.days} days</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Start</Text>
        <View style={styles.startRow}>
          {START_OPTIONS.map((s) => {
            const isSel = start === s.value;
            return (
              <TouchableOpacity
                key={s.value}
                activeOpacity={0.85}
                onPress={() => setStart(s.value)}
                style={[
                  styles.startCard,
                  isSel && {
                    borderColor: themeColor,
                    backgroundColor: 'rgba(34, 211, 238, 0.07)',
                    borderWidth: 1.5,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.startText,
                    isSel && { color: '#ffffff', fontWeight: '600' },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
          disabled={!valid}
          onPress={handleNext}
          style={[
            styles.ctaButton,
            { backgroundColor: valid ? themeColor : '#1c1c1f' },
          ]}
        >
          <Text
            style={[styles.ctaText, { color: valid ? '#0a0a0b' : '#3f3f46' }]}
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
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationCard: {
    flexGrow: 1,
    flexBasis: '47%',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  durationLabel: { fontSize: 15, marginBottom: 2 },
  durationDays: { fontSize: 12, color: '#71717a' },
  startRow: { flexDirection: 'row', gap: 10 },
  startCard: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { fontSize: 13, fontWeight: '500', color: '#d4d4d8' },
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