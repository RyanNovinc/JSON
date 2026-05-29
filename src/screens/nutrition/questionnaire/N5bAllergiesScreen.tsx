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
 * N5b — Allergies & foods to avoid
 * Inserted after N5 (Diet type). A hard-constraint step: allergies are
 * medical, avoid-foods are preference; both must be excluded from the plan,
 * so they belong in the main flow with the other constraints rather than in
 * the optional "Foods you like" picker.
 *
 * Writes `allergies` and `avoidFoods` (string[]) into the questionnaire
 * draft. finalizeNutrition already reads both and passes them to the prompt
 * builder's dietary sections — no prompt change needed.
 *
 * Pattern mirrors N5: QuestionnaireHeader, draft writes via
 * updateNutritionField, answersSoFar/editMode nav contract, CTA bar.
 * This screen is fully optional to fill — the user can continue with nothing
 * selected (it just means no exclusions).
 *
 * NOTE: this is step 6 of 11 once inserted. Bump N6–N10 + Refinements/Summary
 * currentStep/totalSteps accordingly (10 -> 11). N5's handleNext must point
 * here ('N5bAllergies') instead of 'N6MealsSnacking'; this screen forwards to
 * 'N6MealsSnacking'.
 */

const COMMON_ALLERGENS = [
  'Nuts',
  'Shellfish',
  'Dairy',
  'Eggs',
  'Gluten/Wheat',
  'Soy',
  'Fish',
  'Sesame',
];


type ParamList = {
  N5bAllergies: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function N5bAllergiesScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'N5bAllergies'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  const [allergies, setAllergies] = useState<string[]>(
    Array.isArray(answersSoFar.allergies) ? answersSoFar.allergies : []
  );
  const [customAllergy, setCustomAllergy] = useState('');

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const addCustom = (
    raw: string,
    list: string[],
    setList: (v: string[]) => void,
    clear: () => void
  ) => {
    const v = raw.trim();
    if (!v) return;
    if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setList([...list, v]);
    }
    clear();
  };

  // Custom entries = anything not in the common preset lists.
  const customAllergyChips = allergies.filter((a) => !COMMON_ALLERGENS.includes(a));

  const handleNext = async () => {
    if (editMode) {
      await updateNutritionField('allergies', allergies);
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N5cSleep' as never,
      {
        answersSoFar: {
          ...answersSoFar,
          allergies,
        },
      } as never
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const renderChip = (
    label: string,
    active: boolean,
    onPress: () => void,
    danger = false,
    removable = false
  ) => (
    <TouchableOpacity
      key={label}
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.chip,
        active &&
          (danger
            ? { backgroundColor: '#ef4444', borderColor: 'transparent' }
            : { backgroundColor: themeColor, borderColor: 'transparent' }),
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {removable && active && <Text style={styles.chipRemove}>×</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={6}
        totalSteps={11}
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
          <Text style={styles.question}>Any allergies?</Text>
          <Text style={styles.subtitle}>
            Medical exclusions only — the AI keeps these out of every meal. Optional — skip if none apply.
          </Text>

          {/* Allergies */}
          <View style={styles.chipWrap}>
            {COMMON_ALLERGENS.map((a) =>
              renderChip(a, allergies.includes(a), () => toggle(allergies, setAllergies, a), true)
            )}
            {customAllergyChips.map((a) =>
              renderChip(a, true, () => toggle(allergies, setAllergies, a), true, true)
            )}
          </View>
          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              value={customAllergy}
              onChangeText={setCustomAllergy}
              placeholder="Add another allergy"
              placeholderTextColor="#52525b"
              returnKeyType="done"
              onSubmitEditing={() =>
                addCustom(customAllergy, allergies, setAllergies, () => setCustomAllergy(''))
              }
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: '#ef4444' }]}
              onPress={() =>
                addCustom(customAllergy, allergies, setAllergies, () => setCustomAllergy(''))
              }
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNext}
            style={[styles.ctaButton, { backgroundColor: themeColor }]}
          >
            <Text style={[styles.ctaText, { color: '#0a0a0b' }]}>
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },
  question: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: { fontSize: 13, color: '#71717a', lineHeight: 19, marginBottom: 28 },

  sectionLabel: { fontSize: 15, fontWeight: '600', color: '#ffffff', marginBottom: 3 },
  sectionHint: { fontSize: 12, color: '#71717a', marginBottom: 12 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: '#d4d4d8' },
  chipTextActive: { color: '#0a0a0b', fontWeight: '600' },
  chipRemove: { fontSize: 15, fontWeight: '700', color: '#0a0a0b', marginLeft: 6 },

  addRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  addInput: {
    flex: 1,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#ffffff',
  },
  addBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },

  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
    backgroundColor: '#0a0a0b',
  },
  ctaButton: { height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 15, fontWeight: '500' },
});