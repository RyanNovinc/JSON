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
 * N10 — Cooking style & equipment (last Budget & Cooking screen)
 * Step 10. Two 1–5 scales (skillConfidence, timeInvestment) + an
 * equipment multi-select. These drive the prompt builder's biggest
 * behaviour overrides (assembly-only, speed-cook, equipment gating).
 * Forwards to NutritionRefinements (built next).
 */

const SKILL_LABELS: Record<number, string> = {
  1: 'Kitchen beginner — assembly only, no real cooking',
  2: 'Cautious cook — simple techniques',
  3: 'Comfortable cook — standard recipes',
  4: 'Confident cook — happy with most techniques',
  5: 'Kitchen experimenter — bring on the complex stuff',
};

// Hands-on / ACTIVE time only — long unattended cooking (slow cooker,
// oven) does not count here. Level 1 is the true no-cook tier; a
// slow-cook fan should pick 2+ (low hands-on, happy to leave it cooking).
const TIME_LABELS: Record<number, string> = {
  1: 'Assembly only — no real cooking, ~5 min',
  2: 'Quick — 10–15 min hands-on',
  3: 'Moderate — up to 30 min hands-on',
  4: 'Involved — up to 45 min hands-on',
  5: 'No limit — I enjoy cooking',
};

// Maps onto the prompt builder's existing `planningStyle` field (1–5),
// which already drives batch-cook / repeat-meal / fresh behaviour.
const PLAN_STYLES = [
  { value: 2, label: 'Batch & reuse', sub: 'Cook once, eat across days' },
  { value: 3, label: 'A mix', sub: 'Some prep, some fresh' },
  { value: 4, label: 'Fresh each meal', sub: 'Cook as I go' },
];

const EQUIPMENT = [
  'Microwave',
  'Stovetop',
  'Oven',
  'Air fryer',
  'Rice cooker',
  'Blender',
  'Slow cooker',
  'Grill / BBQ',
];

type ParamList = {
  N10Cooking: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function N10CookingScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'N10Cooking'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  const [skill, setSkill] = useState<number | null>(
    (answersSoFar.skillConfidence as number) ?? null
  );
  const [time, setTime] = useState<number | null>(
    (answersSoFar.timeInvestment as number) ?? null
  );
  const [equipment, setEquipment] = useState<string[]>(
    (answersSoFar.cookingEquipment as string[]) ?? []
  );
  const [planStyle, setPlanStyle] = useState<number>(
    (answersSoFar.planningStyle as number) ?? 3
  );

  const toggleEquip = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const valid = skill != null && time != null && equipment.length > 0;

  const handleNext = async () => {
    if (!valid) return;
    if (editMode) {
      await updateNutritionField('skillConfidence', skill);
      await updateNutritionField('timeInvestment', time);
      await updateNutritionField('cookingEquipment', equipment);
      await updateNutritionField('planningStyle', planStyle);
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'NutritionRefinements' as never,
      {
        answersSoFar: {
          ...answersSoFar,
          skillConfidence: skill,
          timeInvestment: time,
          cookingEquipment: equipment,
          planningStyle: planStyle,
        },
      } as never
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const renderScale = (
    value: number | null,
    onChange: (n: number) => void,
    labels: Record<number, string>
  ) => (
    <>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const isSel = value === n;
          return (
            <TouchableOpacity
              key={n}
              activeOpacity={0.85}
              onPress={() => onChange(n)}
              style={[
                styles.scaleCell,
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
                  styles.scaleNum,
                  { color: isSel ? themeColor : '#ffffff' },
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value != null && (
        <Text style={styles.scaleCaption}>{labels[value]}</Text>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={10}
        totalSteps={10}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>How do you cook?</Text>
        <Text style={styles.subtitle}>
          Keeps recipes within your skill, time, and kitchen.
        </Text>

        <Text style={styles.fieldLabel}>Cooking skill</Text>
        {renderScale(skill, setSkill, SKILL_LABELS)}

        <Text style={[styles.fieldLabel, { marginTop: 28 }]}>
          Hands-on time
        </Text>
        {renderScale(time, setTime, TIME_LABELS)}
        <Text style={styles.timeNote}>
          Your active time — a slow-cooker meal counts as low even if it
          cooks for hours.
        </Text>

        <Text style={[styles.fieldLabel, { marginTop: 28 }]}>
          How you like to cook
        </Text>
        <View style={styles.planRow}>
          {PLAN_STYLES.map((p) => {
            const isSel = planStyle === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                activeOpacity={0.85}
                onPress={() => setPlanStyle(p.value)}
                style={[
                  styles.planCard,
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
                    styles.planLabel,
                    { color: isSel ? '#ffffff' : '#d4d4d8', fontWeight: isSel ? '700' : '500' },
                  ]}
                >
                  {p.label}
                </Text>
                <Text style={styles.planSub}>{p.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 28 }]}>
          Equipment you want to use
        </Text>
        <View style={styles.chipsRow}>
          {EQUIPMENT.map((item) => {
            const isSel = equipment.includes(item);
            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.85}
                onPress={() => toggleEquip(item)}
                style={[
                  styles.chip,
                  isSel && {
                    borderColor: themeColor,
                    backgroundColor: 'rgba(34, 211, 238, 0.07)',
                    borderWidth: 1.5,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSel && { color: '#ffffff', fontWeight: '600' },
                  ]}
                >
                  {item}
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
  scaleRow: { flexDirection: 'row', gap: 6 },
  scaleCell: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleNum: { fontSize: 19, fontWeight: '600' },
  scaleCaption: {
    fontSize: 13,
    color: '#d4d4d8',
    lineHeight: 18,
    marginTop: 12,
  },
  timeNote: {
    fontSize: 12,
    color: '#71717a',
    lineHeight: 17,
    marginTop: 8,
  },
  planRow: { flexDirection: 'row', gap: 8 },
  planCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },
  planLabel: { fontSize: 14, marginBottom: 3 },
  planSub: { fontSize: 11, color: '#71717a', lineHeight: 15 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  chipText: { fontSize: 13, fontWeight: '500', color: '#d4d4d8' },
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