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
import { updateNutritionField } from '../../../utils/nutritionQuestionnaireStorage';

/**
 * N6 — Meals & snacking (first Budget & Cooking screen)
 * Step 6. Meals/day uses the Q3-style numeric grid. Snacking is a small
 * card row that sets `snackFrequency` ('0' | '1' | '2' | 'ai_decide') and
 * a matching `snackingStyle` string — both read by the meal-plan prompt
 * builder's getSnackingGuidance.
 */

const MEAL_OPTIONS = [2, 3, 4, 5, 6];

const MEAL_HINTS: Record<number, string> = {
  2: 'Two bigger meals. Fewer dishes, simpler prep.',
  3: 'Classic — breakfast, lunch, dinner.',
  4: 'Four solid meals. Good for higher intakes.',
  5: 'Five smaller meals spread across the day.',
  6: 'Frequent eating. Demands more prep.',
};

interface SnackOption {
  freq: string;
  style: string;
  label: string;
}

const SNACK_OPTIONS: SnackOption[] = [
  { freq: '0', style: "I don't snack", label: 'None' },
  { freq: '1', style: 'Occasional snacker', label: '1 snack' },
  { freq: '2', style: 'Occasional snacker', label: '2 snacks' },
  { freq: '3+', style: 'Frequent snacker', label: '3+ snacks' },
];

type ParamList = {
  N6MealsSnacking:
    | { answersSoFar?: Record<string, any>; editMode?: boolean }
    | undefined;
};

export default function N6MealsSnackingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'N6MealsSnacking'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  const [meals, setMeals] = useState<number | null>(
    (answersSoFar.mealsPerDay as number) ?? null
  );
  const [snackFreq, setSnackFreq] = useState<string | null>(
    (answersSoFar.snackFrequency as string) ?? null
  );

  const valid = meals != null && snackFreq != null;

  const handleNext = async () => {
    if (!valid) return;
    const snack = SNACK_OPTIONS.find((s) => s.freq === snackFreq)!;
    if (editMode) {
      await updateNutritionField('mealsPerDay', meals);
      await updateNutritionField('snackFrequency', snackFreq);
      await updateNutritionField('snackingStyle', snack.style);
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N6aDessert' as never,
      {
        answersSoFar: {
          ...answersSoFar,
          mealsPerDay: meals,
          snackFrequency: snackFreq,
          snackingStyle: snack.style,
        },
      } as never
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={8}
        totalSteps={12}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>How do you like to eat?</Text>
        <Text style={styles.subtitle}>
          Sets your meal structure. Pick what fits your day.
        </Text>

        <Text style={styles.fieldLabel}>Meals per day</Text>
        <View style={styles.row}>
          {MEAL_OPTIONS.map((n) => {
            const isSel = meals === n;
            return (
              <TouchableOpacity
                key={n}
                activeOpacity={0.85}
                onPress={() => setMeals(n)}
                style={[
                  styles.cell,
                  {
                    borderColor: isSel ? themeColor : '#27272a',
                    backgroundColor: isSel
                      ? 'rgba(34, 211, 238, 0.08)'
                      : '#131316',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cellNumber,
                    { color: isSel ? themeColor : '#ffffff' },
                  ]}
                >
                  {n}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {meals != null && (
          <View style={styles.hintBox}>
            <Ionicons
              name="information-circle"
              size={15}
              color={themeColor}
              style={{ marginTop: 1 }}
            />
            <Text style={styles.hintText}>{MEAL_HINTS[meals]}</Text>
          </View>
        )}

        <Text style={[styles.fieldLabel, { marginTop: 28 }]}>Snacks</Text>
        <View style={styles.snackRow}>
          {SNACK_OPTIONS.map((opt) => {
            const isSel = snackFreq === opt.freq;
            return (
              <TouchableOpacity
                key={opt.freq}
                activeOpacity={0.85}
                onPress={() => setSnackFreq(opt.freq)}
                style={[
                  styles.snackCard,
                  isSel && {
                    borderColor: themeColor,
                    backgroundColor: 'rgba(34, 211, 238, 0.07)',
                    borderWidth: 1.5,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.snackText,
                    isSel && { color: '#ffffff', fontWeight: '600' },
                  ]}
                >
                  {opt.label}
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
  row: { flexDirection: 'row', gap: 6 },
  cell: {
    flex: 1,
    height: 60,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellNumber: {
    fontSize: 21,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    borderRadius: 12,
  },
  hintText: { flex: 1, fontSize: 13, color: '#d4d4d8', lineHeight: 18 },
  snackRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  snackCard: {
    flexGrow: 1,
    flexBasis: '47%',
    paddingVertical: 14,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snackText: { fontSize: 13, fontWeight: '500', color: '#d4d4d8' },
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