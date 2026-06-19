import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
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
 * N5 — Diet type
 * Step 5, last of the macro-input segment. Values match the calculator's
 * diet-split table. "custom" reveals three % inputs (protein/carbs/fat)
 * that must total 100. Macros are NOT computed here — they're computed
 * once at the end of the flow (Summary/save), the same way the workout
 * prompt is only assembled at the very end.
 *
 * handleNext continues to N6 (Meals & snacking) — the first Budget &
 * Cooking screen, built next.
 */

type DietValue = 'balanced' | 'high_protein' | 'low_carb' | 'keto' | 'custom';

interface DietOption {
  value: DietValue;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: DietOption[] = [
  {
    value: 'balanced',
    title: 'Balanced',
    subtitle: '20% protein · 50% carbs · 30% fat. A solid default.',
    icon: 'nutrition',
  },
  {
    value: 'high_protein',
    title: 'High protein',
    subtitle: '30% protein · 40% carbs · 30% fat. Great for building.',
    icon: 'barbell',
  },
  {
    value: 'low_carb',
    title: 'Low carb',
    subtitle: '25% protein · 25% carbs · 50% fat.',
    icon: 'leaf',
  },
  {
    value: 'keto',
    title: 'Keto',
    subtitle: '20% protein · 5% carbs · 75% fat.',
    icon: 'flame',
  },
  {
    value: 'custom',
    title: 'Custom',
    subtitle: 'Set your own protein / carb / fat split.',
    icon: 'options',
  },
];

type ParamList = {
  N5DietType: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function N5DietTypeScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'N5DietType'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  const [selected, setSelected] = useState<DietValue | null>(
    (answersSoFar.dietType as DietValue) ?? null
  );
  const [protein, setProtein] = useState<string>(
    answersSoFar.customMacros?.protein != null
      ? String(answersSoFar.customMacros.protein)
      : ''
  );
  const [carbs, setCarbs] = useState<string>(
    answersSoFar.customMacros?.carbs != null
      ? String(answersSoFar.customMacros.carbs)
      : ''
  );
  const [fat, setFat] = useState<string>(
    answersSoFar.customMacros?.fat != null
      ? String(answersSoFar.customMacros.fat)
      : ''
  );

  const handleSelect = (value: DietValue) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(180, 'easeInEaseOut', 'opacity')
    );
    setSelected(value);
  };

  const p = parseInt(protein, 10);
  const c = parseInt(carbs, 10);
  const f = parseInt(fat, 10);
  const customTotal =
    (Number.isFinite(p) ? p : 0) +
    (Number.isFinite(c) ? c : 0) +
    (Number.isFinite(f) ? f : 0);
  const customValid =
    Number.isFinite(p) && Number.isFinite(c) && Number.isFinite(f) && customTotal === 100;

  const valid = selected != null && (selected !== 'custom' || customValid);

  const handleNext = async () => {
    if (!valid) return;
    const customMacros =
      selected === 'custom' ? { protein: p, carbs: c, fat: f } : undefined;

    // Always save the answers to storage, whether in edit mode or not
    await updateNutritionField('dietType', selected!);
    if (customMacros) await updateNutritionField('customMacros', customMacros);
    
    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N5bAllergies' as never,
      {
        answersSoFar: {
          ...answersSoFar,
          dietType: selected,
          ...(customMacros ? { customMacros } : {}),
        },
      } as never
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={5}
        totalSteps={12}
        onBack={handleBack}
        onClose={handleClose}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.question}>How do you want to eat?</Text>
          <Text style={styles.subtitle}>
            Sets how your calories split across protein, carbs, and fat.
          </Text>

          <View>
            {OPTIONS.map((opt) => (
              <QuestionCard
                key={opt.value}
                icon={opt.icon}
                title={opt.title}
                subtitle={opt.subtitle}
                selected={selected === opt.value}
                onPress={() => handleSelect(opt.value)}
              />
            ))}
          </View>

          {selected === 'custom' && (
            <View style={styles.customBox}>
              <View style={styles.customHeader}>
                <Text style={styles.customTitle}>Your split</Text>
                <Text
                  style={[
                    styles.customTotal,
                    { color: customTotal === 100 ? themeColor : '#ef4444' },
                  ]}
                >
                  {customTotal}% / 100%
                </Text>
              </View>

              {[
                { label: 'Protein', value: protein, set: setProtein },
                { label: 'Carbs', value: carbs, set: setCarbs },
                { label: 'Fat', value: fat, set: setFat },
              ].map((row) => (
                <View key={row.label} style={styles.customRow}>
                  <Text style={styles.customLabel}>{row.label}</Text>
                  <View style={styles.customInputWrap}>
                    <TextInput
                      style={styles.customInput}
                      value={row.value}
                      onChangeText={row.set}
                      placeholder="0"
                      placeholderTextColor="#52525b"
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                    <Text style={styles.customPct}>%</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
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
      </KeyboardAvoidingView>
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
  customBox: {
    marginTop: 8,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 16,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  customTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  customTotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  customLabel: {
    fontSize: 14,
    color: '#d4d4d8',
    fontWeight: '500',
  },
  customInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 12,
    width: 92,
  },
  customInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    paddingVertical: 10,
    textAlign: 'right',
  },
  customPct: {
    fontSize: 13,
    color: '#71717a',
    marginLeft: 4,
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