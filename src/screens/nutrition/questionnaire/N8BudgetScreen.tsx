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
 * N8 — Budget
 * Step 8. Sets `weeklyBudget` (attitude) plus optional `budgetMin`/
 * `budgetMax`. The prompt builder prioritises the range if present, else
 * falls back to the attitude — both paths are supported here.
 */

type Attitude = 'budget_conscious' | 'keep_reasonable' | 'quality_first';

interface AttitudeOption {
  value: Attitude;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: AttitudeOption[] = [
  {
    value: 'budget_conscious',
    title: 'Budget-conscious',
    subtitle: 'Keep it cheap. Lean on value staples.',
    icon: 'wallet',
  },
  {
    value: 'keep_reasonable',
    title: 'Keep it reasonable',
    subtitle: 'Balanced. Good value without penny-pinching.',
    icon: 'cart',
  },
  {
    value: 'quality_first',
    title: 'Quality first',
    subtitle: 'Spend for better ingredients where it counts.',
    icon: 'sparkles',
  },
];

type ParamList = {
  N8Budget: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function N8BudgetScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'N8Budget'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  const [attitude, setAttitude] = useState<Attitude | null>(
    (answersSoFar.weeklyBudget as Attitude) ?? null
  );
  const [showRange, setShowRange] = useState<boolean>(
    answersSoFar.budgetMin != null || answersSoFar.budgetMax != null
  );
  const [min, setMin] = useState<string>(
    answersSoFar.budgetMin != null ? String(answersSoFar.budgetMin) : ''
  );
  const [max, setMax] = useState<string>(
    answersSoFar.budgetMax != null ? String(answersSoFar.budgetMax) : ''
  );

  const valid = attitude != null;

  const toggleRange = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(180, 'easeInEaseOut', 'opacity')
    );
    setShowRange((s) => !s);
  };

  const handleNext = async () => {
    if (!valid) return;
    const minNum = parseInt(min, 10);
    const maxNum = parseInt(max, 10);
    const payload: Record<string, any> = { weeklyBudget: attitude };
    if (showRange && Number.isFinite(minNum)) payload.budgetMin = minNum;
    if (showRange && Number.isFinite(maxNum)) payload.budgetMax = maxNum;

    // Always save the answers to storage, whether in edit mode or not
    await updateNutritionField('weeklyBudget', attitude!);
    await updateNutritionField('budgetMin', payload.budgetMin ?? null);
    await updateNutritionField('budgetMax', payload.budgetMax ?? null);
    
    // Set default values for missing required fields until proper screens are added
    await updateNutritionField('skillConfidence', 3); // Default medium confidence
    await updateNutritionField('timeInvestment', 30); // Default 30 min
    await updateNutritionField('cookingEquipment', ['stovetop', 'oven']); // Default basic equipment
    
    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N9PlanLength' as never,
      { answersSoFar: { ...answersSoFar, ...payload } } as never
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={11}
        totalSteps={12}
        onBack={handleBack}
        onClose={handleClose}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.question}>What's your grocery budget?</Text>
          <Text style={styles.subtitle}>
            Guides ingredient choices. Add a weekly range if you have one.
          </Text>

          <View>
            {OPTIONS.map((opt) => (
              <QuestionCard
                key={opt.value}
                icon={opt.icon}
                title={opt.title}
                subtitle={opt.subtitle}
                selected={attitude === opt.value}
                onPress={() => setAttitude(opt.value)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.rangeToggle}
            onPress={toggleRange}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showRange ? 'remove-circle-outline' : 'add-circle-outline'}
              size={16}
              color={themeColor}
            />
            <Text style={[styles.rangeToggleText, { color: themeColor }]}>
              {showRange ? 'Remove weekly range' : 'Add a weekly range (optional)'}
            </Text>
          </TouchableOpacity>

          {showRange && (
            <View style={styles.rangeRow}>
              <View style={styles.rangeField}>
                <Text style={styles.rangeLabel}>Min / week</Text>
                <View style={styles.rangeInputWrap}>
                  <Text style={styles.currency}>$</Text>
                  <TextInput
                    style={styles.rangeInput}
                    value={min}
                    onChangeText={setMin}
                    placeholder="0"
                    placeholderTextColor="#52525b"
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>
              <View style={styles.rangeField}>
                <Text style={styles.rangeLabel}>Max / week</Text>
                <View style={styles.rangeInputWrap}>
                  <Text style={styles.currency}>$</Text>
                  <TextInput
                    style={styles.rangeInput}
                    value={max}
                    onChangeText={setMax}
                    placeholder="0"
                    placeholderTextColor="#52525b"
                    keyboardType="number-pad"
                    maxLength={5}
                  />
                </View>
              </View>
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
  rangeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  rangeToggleText: { fontSize: 13, fontWeight: '600' },
  rangeRow: { flexDirection: 'row', gap: 12 },
  rangeField: { flex: 1 },
  rangeLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  rangeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131316',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  currency: { fontSize: 15, color: '#71717a', marginRight: 4 },
  rangeInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    paddingVertical: 13,
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