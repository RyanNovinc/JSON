import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  CommonActions,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import QuestionnaireHeader from '../../questionnaire/QuestionnaireHeader';
import { updateNutritionField, loadNutritionAnswers } from '../../../utils/nutritionQuestionnaireStorage';
import { finalizeNutrition } from '../../../utils/nutritionMacros';

/**
 * N9 — Plan length & start
 * Step 9. Sets `planDuration` (days) and `startDate`
 * ('today' | 'tomorrow' | 'next_monday'), both read by the prompt builder.
 *
 * Completion routing: finalize, then reset to CuratedFavorites (the "Foods
 * you like" step) with NutritionSummary underneath in the stack — picking is
 * the last step of the flow, and both Save and "Choose for me" on that
 * screen land on the summary via goBack(). Edit mode is untouched: it still
 * goBack()s, so later edits never re-force the picks step.
 */

const DURATIONS = [
  { days: 7, label: '1 week' },
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

  // Default to 1 week. Migrate any existing 14-day value to 7.
  const [duration, setDuration] = useState<number | null>(7);
  const [start, setStart] = useState<string | null>(
    (answersSoFar.startDate as string) ?? null
  );
  const [saving, setSaving] = useState(false);

  const valid = duration != null && start != null;

  const handleNext = async () => {
    if (!valid || saving) return;

    if (editMode) {
      await updateNutritionField('planDuration', duration);
      await updateNutritionField('startDate', start);
      navigation.goBack();
      return;
    }

    setSaving(true);
    try {
      // Save only the fields collected by this screen.
      // N1-N8 answers are already persisted by their individual screens.
      await updateNutritionField('planDuration', duration);
      await updateNutritionField('startDate', start);
      await updateNutritionField('eatingChallenges', []); // default empty; user can set later in Refinements

      // Load the complete answers for macro calculation
      const finalAnswers = await loadNutritionAnswers();
      const macros = await finalizeNutrition(finalAnswers);

      if (!macros) {
        console.error('Failed to finalize nutrition data from N9');
        Alert.alert(
          'Missing details',
          'Some required answers are missing — go back and complete the earlier steps.'
        );
        setSaving(false);
        return;
      }

      // Picks are the final step. Reset with the summary UNDERNEATH the
      // picks screen so both Save and "Choose for me" land there via
      // goBack() — no navigation changes needed inside CuratedFavorites.
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'NutritionSummary' },
            {
              name: 'CuratedFavorites',
              params: { fromQuestionnaire: true, answersSoFar: finalAnswers },
            },
          ],
        })
      );
      setSaving(false);
    } catch (error) {
      console.error('N9 finalize failed', error);
      Alert.alert('Something went wrong', 'Could not save your answers. Try again.');
      setSaving(false);
    }
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={12}
        totalSteps={12}
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
                    borderColor: themeColor, // Always selected since only one option
                    backgroundColor: 'rgba(34, 211, 238, 0.08)',
                    borderWidth: 1.5,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.durationLabel,
                    { color: '#ffffff', fontWeight: '700' }, // Always selected styling
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
          disabled={!valid || saving}
          onPress={handleNext}
          style={[
            styles.ctaButton,
            { backgroundColor: (valid && !saving) ? themeColor : '#1c1c1f' },
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0a0a0b" />
          ) : (
            <Text
              style={[styles.ctaText, { color: (valid && !saving) ? '#0a0a0b' : '#3f3f46' }]}
            >
              {editMode ? 'Save' : 'Continue'}
            </Text>
          )}
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