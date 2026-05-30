import React, { useState, useCallback } from 'react';
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
  useFocusEffect,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import QuestionnaireHeader from '../../questionnaire/QuestionnaireHeader';
import WeightEntrySheet from '../../../components/nutrition/WeightEntrySheet';
import { WorkoutStorage } from '../../../utils/storage';
import { updateNutritionField } from '../../../utils/nutritionQuestionnaireStorage';

/**
 * N3 — About you (age / gender / height / weight)
 *
 * Step 3 of the nutrition questionnaire. Layout matches every other N
 * screen — QuestionnaireHeader on top, QuestionCard-style selectors in
 * the body, CTA bar at the bottom.
 *
 * v2 — Weight UX redesign.
 * The previous flow navigated to WeightTracker (a full Profile-level
 * screen) just to update one number. That meant the user lost their
 * questionnaire context, saw a hero number + history list + testimonial
 * button + "AI info banner", and had to come back. Now we open the
 * shared WeightEntrySheet inline — same component the Profile tracker
 * uses, but kept light. KeyboardAvoidingView in the sheet handles the
 * keyboard hiding the input. The sheet refreshes the local weight
 * value via onSaved, which then propagates into answersSoFar on Next.
 *
 * Theme tints (the rgba background for selected cards) are now derived
 * from themeColor with low alpha rather than the hardcoded cyan rgba
 * that broke the pink theme.
 */

type GenderValue = 'male' | 'female' | 'prefer_not_to_say';

const GENDER_OPTIONS: { value: GenderValue; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

type ParamList = {
  N3AboutYou: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

// hex (#rrggbb) → rgba(r, g, b, a). Used so the selection tint follows
// the user's theme color instead of being a hardcoded cyan rgba.
function hexToRgba(hex: string, alpha: number): string {
  const stripped = hex.replace('#', '');
  const r = parseInt(stripped.substring(0, 2), 16);
  const g = parseInt(stripped.substring(2, 4), 16);
  const b = parseInt(stripped.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function N3AboutYouScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'N3AboutYou'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  const [gender, setGender] = useState<GenderValue | null>(
    (answersSoFar.gender as GenderValue) ?? null
  );
  const [age, setAge] = useState<string>(
    answersSoFar.age != null ? String(answersSoFar.age) : ''
  );
  const [height, setHeight] = useState<string>(
    answersSoFar.height != null ? String(answersSoFar.height) : ''
  );
  const [weight, setWeight] = useState<number | null>(
    (answersSoFar.weight as number) ?? null
  );
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [focused, setFocused] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const selectionTint = hexToRgba(themeColor, 0.08);

  // Pull the latest weight from WeightTracker. Used on mount and
  // whenever we focus back to this screen (covers the case where the
  // user navigated to the Profile WeightTracker somehow and updated
  // their weight from there).
  const loadCurrentWeight = useCallback(async () => {
    try {
      const history = await WorkoutStorage.loadWeightHistory();
      if (history && history.length > 0) {
        const latest = [...history].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0];
        setWeight(latest.weight);
        if (latest.unit === 'kg' || latest.unit === 'lbs') {
          setWeightUnit(latest.unit);
        }
      }
    } catch (e) {
      console.error('N3 loadCurrentWeight failed', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCurrentWeight();
    }, [loadCurrentWeight])
  );

  const ageNum = parseInt(age, 10);
  const heightNum = parseInt(height, 10);
  const valid =
    !!gender &&
    Number.isFinite(ageNum) &&
    ageNum > 0 &&
    Number.isFinite(heightNum) &&
    heightNum > 0 &&
    weight != null &&
    weight > 0;

  const handleNext = async () => {
    if (!valid) return;
    if (editMode) {
      await updateNutritionField('gender', gender!);
      await updateNutritionField('age', ageNum);
      await updateNutritionField('height', heightNum);
      await updateNutritionField('weight', weight!);
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N4Activity' as never,
      {
        answersSoFar: {
          ...answersSoFar,
          gender,
          age: ageNum,
          height: heightNum,
          weight,
        },
      } as never
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={3}
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
          <Text style={styles.question}>A bit about you</Text>
          <Text style={styles.subtitle}>
            Used to calculate your calorie and macro targets.
          </Text>

          {/* Gender */}
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => {
              const isSel = gender === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.85}
                  onPress={() => setGender(opt.value)}
                  style={[
                    styles.genderCard,
                    isSel && {
                      borderColor: themeColor,
                      backgroundColor: selectionTint,
                      borderWidth: 1.5,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.genderText,
                      isSel && { color: '#ffffff', fontWeight: '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Age */}
          <Text style={styles.fieldLabel}>Age</Text>
          <View
            style={[
              styles.inputRow,
              focused === 'age' && { borderColor: themeColor },
            ]}
          >
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              onFocus={() => setFocused('age')}
              onBlur={() => setFocused(null)}
              placeholder="Enter your age"
              placeholderTextColor="#52525b"
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.inputUnit}>years</Text>
          </View>

          {/* Height */}
          <Text style={styles.fieldLabel}>Height</Text>
          <View
            style={[
              styles.inputRow,
              focused === 'height' && { borderColor: themeColor },
            ]}
          >
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              onFocus={() => setFocused('height')}
              onBlur={() => setFocused(null)}
              placeholder="Enter your height"
              placeholderTextColor="#52525b"
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.inputUnit}>cm</Text>
          </View>

          {/* Weight — opens the inline WeightEntrySheet instead of
              navigating to the full WeightTracker screen. */}
          <Text style={styles.fieldLabel}>Current weight</Text>
          {weight != null ? (
            <View style={styles.weightRow}>
              <View style={styles.weightValueWrap}>
                <Text style={styles.weightValue}>{weight}</Text>
                <Text style={styles.weightUnit}>{weightUnit}</Text>
              </View>
              <TouchableOpacity
                style={[styles.weightBtn, { borderColor: themeColor }]}
                onPress={() => setSheetVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={15} color={themeColor} />
                <Text style={[styles.weightBtnText, { color: themeColor }]}>
                  Change
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addWeight, { borderColor: themeColor }]}
              onPress={() => setSheetVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color={themeColor} />
              <Text style={[styles.addWeightText, { color: themeColor }]}>
                Add your weight
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.weightHint}>
            Stays in sync with your Weight Tracker.
          </Text>
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

      <WeightEntrySheet
        visible={sheetVisible}
        title={weight != null ? 'Update weight' : 'Add weight'}
        onClose={() => setSheetVisible(false)}
        onSaved={(entry) => {
          // Immediately reflect the new weight locally — the sheet has
          // already persisted to WorkoutStorage and run macro recalc.
          setWeight(entry.weight);
          if (entry.unit === 'kg' || entry.unit === 'lbs') {
            setWeightUnit(entry.unit);
          }
        }}
      />
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
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  genderCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#d4d4d8',
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131316',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#27272a',
    marginBottom: 24,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    paddingVertical: 15,
  },
  inputUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
    marginLeft: 8,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#131316',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  weightValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  weightValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  weightUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
    marginLeft: 6,
  },
  weightBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  weightBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addWeight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131316',
    borderRadius: 14,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: 8,
  },
  addWeightText: {
    fontSize: 14,
    fontWeight: '600',
  },
  weightHint: {
    fontSize: 12,
    color: '#52525b',
    marginTop: 10,
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