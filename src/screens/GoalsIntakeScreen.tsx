import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { TrainingState } from '../utils/goalsProfile';
import { saveGoalsProfile } from '../utils/goalsProfileStorage';
import { WorkoutStorage } from '../utils/storage';
import {
  continueWorkoutFlow,
  continueNutritionFlow,
} from '../utils/questionnaireRouting';
import QuestionCard from './questionnaire/QuestionCard';
import QuestionnaireHeader from './questionnaire/QuestionnaireHeader';
import WeightEntrySheet from '../components/nutrition/WeightEntrySheet';

type Nav = StackNavigationProp<RootStackParamList, 'GoalsIntake'>;
type RouteProps = RouteProp<RootStackParamList, 'GoalsIntake'>;

const TRAINING_OPTIONS: Array<{
  value: TrainingState;
  icon: string;
  title: string;
  subtitle: string;
}> = [
  {
    value: 'new',
    icon: 'sparkles-outline',
    title: 'New to training',
    subtitle: 'Under a year of consistent lifting.',
  },
  {
    value: 'consistent',
    icon: 'trending-up-outline',
    title: 'Consistent',
    subtitle: 'Training regularly for a year or more.',
  },
  {
    value: 'returning',
    icon: 'refresh-outline',
    title: 'Returning after a break',
    subtitle: "You've trained before but had time off. Your muscle memory is still there.",
  },
  {
    value: 'advanced',
    icon: 'barbell-outline',
    title: 'Advanced',
    subtitle: 'Years of structured, progressive training.',
  },
];

const LEANNESS_OPTIONS: Array<{
  pct: number | undefined;
  icon: string;
  title: string;
  subtitle: string;
}> = [
  {
    pct: 10,
    icon: 'flash-outline',
    title: 'Very lean',
    subtitle: 'Competition-ready. Visible abs and definition.',
  },
  {
    pct: 13,
    icon: 'fitness-outline',
    title: 'Athletic',
    subtitle: 'Lean and defined. Visible abs in good lighting.',
  },
  {
    pct: 17,
    icon: 'heart-outline',
    title: 'Fit and healthy',
    subtitle: 'Active, healthy look. Light definition.',
  },
  {
    pct: undefined,
    icon: 'remove-circle-outline',
    title: 'Not a priority',
    subtitle: 'Focusing on performance or size, not leanness.',
  },
];

export default function GoalsIntakeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();

  const nextFlow = route.params?.nextFlow ?? 'workout';

  // ── Step management ────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1: Training state ─────────────────────────────────────────────────
  const [trainingState, setTrainingState] = useState<TrainingState | null>(null);

  // ── Step 2: Body composition ───────────────────────────────────────────────
  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null);
  const [weightDisplay, setWeightDisplay] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightSheetVisible, setWeightSheetVisible] = useState(false);
  const [bodyFatInput, setBodyFatInput] = useState('');

  // ── Step 3: Goals ──────────────────────────────────────────────────────────
  const [goalWeightInput, setGoalWeightInput] = useState('');
  const [selectedLeannessIdx, setSelectedLeannessIdx] = useState<number | null>(null);

  // ── Save state ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // Pre-populate weight from history so step 2 feels pre-filled for returning users
  useEffect(() => {
    WorkoutStorage.loadWeightHistory()
      .then((history) => {
        if (history && history.length > 0) {
          const latest = history[history.length - 1];
          if (latest?.weight) {
            const unit: 'kg' | 'lbs' = latest.unit === 'lbs' ? 'lbs' : 'kg';
            const kg = unit === 'lbs' ? latest.weight * 0.453592 : latest.weight;
            setCurrentWeightKg(kg);
            setWeightUnit(unit);
            setWeightDisplay(`${latest.weight} ${unit}`);
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const handleClose = () => navigation.goBack();

  // ── Step actions ───────────────────────────────────────────────────────────
  const handleStep1Continue = () => {
    if (trainingState) setStep(2);
  };

  const handleStep2Continue = () => {
    if (currentWeightKg) setStep(3);
  };

  const handleComplete = async () => {
    if (!currentWeightKg || !trainingState || saving) return;
    setSaving(true);
    try {
      const currentBFPct = bodyFatInput ? parseFloat(bodyFatInput) : undefined;
      const rawGoalWeight = goalWeightInput ? parseFloat(goalWeightInput) : undefined;
      const goalWeightKg =
        rawGoalWeight != null
          ? weightUnit === 'lbs'
            ? rawGoalWeight * 0.453592
            : rawGoalWeight
          : undefined;
      const goalBFPct =
        selectedLeannessIdx !== null
          ? LEANNESS_OPTIONS[selectedLeannessIdx].pct
          : undefined;

      await saveGoalsProfile({
        currentWeightKg,
        currentBodyFatPct: currentBFPct,
        goalWeightKg,
        goalBodyFatPct: goalBFPct,
        trainingState,
      });

      if (nextFlow === 'workout') {
        await continueWorkoutFlow(navigation);
      } else {
        await continueNutritionFlow(navigation);
      }
    } catch {
      setSaving(false);
    }
  };

  // ── Derived UI state ───────────────────────────────────────────────────────
  const ctaActive =
    step === 1 ? trainingState !== null
    : step === 2 ? currentWeightKg !== null
    : true; // step 3 is always completable (all fields optional)

  const ctaLabel = step === 3 ? 'Build my plan' : 'Continue';

  const handleCta = step === 1 ? handleStep1Continue
    : step === 2 ? handleStep2Continue
    : handleComplete;

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={step}
        totalSteps={3}
        onBack={handleBack}
        onClose={handleClose}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Step 1: Training history ─────────────────────────────────── */}
          {step === 1 && (
            <>
              <Text style={styles.title}>What's your training history?</Text>
              <Text style={styles.subtitle}>
                This shapes your starting volume and plan intensity.
              </Text>
              {TRAINING_OPTIONS.map((opt) => (
                <QuestionCard
                  key={opt.value}
                  icon={opt.icon as any}
                  title={opt.title}
                  subtitle={opt.subtitle}
                  selected={trainingState === opt.value}
                  onPress={() => setTrainingState(opt.value)}
                />
              ))}
            </>
          )}

          {/* ── Step 2: Body composition ─────────────────────────────────── */}
          {step === 2 && (
            <>
              <Text style={styles.title}>Your body right now</Text>
              <Text style={styles.subtitle}>
                Used to calculate your targets. Weight is required — body fat is optional.
              </Text>

              {/* Current weight */}
              <TouchableOpacity
                style={styles.inputRow}
                onPress={() => setWeightSheetVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.inputRowIcon}>
                  <Ionicons name="scale-outline" size={18} color="#a1a1aa" />
                </View>
                <View style={styles.inputRowContent}>
                  <Text style={styles.inputRowLabel}>Current weight</Text>
                  {weightDisplay ? (
                    <Text style={[styles.inputRowValue, { color: themeColor }]}>
                      {weightDisplay}
                    </Text>
                  ) : (
                    <Text style={styles.inputRowPlaceholder}>Tap to enter</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#52525b" />
              </TouchableOpacity>

              {/* Body fat % (optional) */}
              <View style={styles.inputRow}>
                <View style={styles.inputRowIcon}>
                  <Ionicons name="body-outline" size={18} color="#a1a1aa" />
                </View>
                <View style={styles.inputRowContent}>
                  <Text style={styles.inputRowLabel}>
                    Body fat{'  '}
                    <Text style={styles.optionalTag}>optional</Text>
                  </Text>
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="e.g. 18"
                    placeholderTextColor="#52525b"
                    keyboardType="decimal-pad"
                    value={bodyFatInput}
                    onChangeText={(t) => setBodyFatInput(t.replace(/[^0-9.]/g, ''))}
                    maxLength={4}
                    returnKeyType="done"
                  />
                </View>
                {bodyFatInput ? (
                  <Text style={styles.unitSuffix}>%</Text>
                ) : null}
              </View>

              <Text style={styles.hint}>
                Don't know your body fat? Leave it blank — the app works fine without it.
              </Text>
            </>
          )}

          {/* ── Step 3: Goals ────────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <Text style={styles.title}>What are you working toward?</Text>
              <Text style={styles.subtitle}>
                All optional — skip anything you're not sure about.
              </Text>

              {/* Target weight (optional) */}
              <View style={styles.inputRow}>
                <View style={styles.inputRowIcon}>
                  <Ionicons name="flag-outline" size={18} color="#a1a1aa" />
                </View>
                <View style={styles.inputRowContent}>
                  <Text style={styles.inputRowLabel}>
                    Target weight{'  '}
                    <Text style={styles.optionalTag}>optional</Text>
                  </Text>
                  <TextInput
                    style={styles.inlineInput}
                    placeholder={weightUnit === 'lbs' ? 'e.g. 165' : 'e.g. 75'}
                    placeholderTextColor="#52525b"
                    keyboardType="decimal-pad"
                    value={goalWeightInput}
                    onChangeText={(t) => setGoalWeightInput(t.replace(/[^0-9.]/g, ''))}
                    maxLength={6}
                    returnKeyType="done"
                  />
                </View>
                {goalWeightInput ? (
                  <Text style={styles.unitSuffix}>{weightUnit}</Text>
                ) : null}
              </View>

              <View style={styles.sectionDivider} />

              <Text style={styles.sectionLabel}>How lean do you want to be?</Text>
              <Text style={styles.sectionSublabel}>
                Helps calibrate your calorie target and phase direction.
              </Text>

              {LEANNESS_OPTIONS.map((opt, idx) => (
                <QuestionCard
                  key={idx}
                  icon={opt.icon as any}
                  title={opt.title}
                  subtitle={opt.subtitle}
                  selected={selectedLeannessIdx === idx}
                  onPress={() =>
                    setSelectedLeannessIdx(selectedLeannessIdx === idx ? null : idx)
                  }
                />
              ))}
            </>
          )}
        </ScrollView>

        {/* ── CTA bar ───────────────────────────────────────────────────── */}
        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              { backgroundColor: ctaActive ? themeColor : '#1c1c1f' },
            ]}
            onPress={handleCta}
            disabled={!ctaActive || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#0a0a0b" />
            ) : (
              <Text
                style={[
                  styles.ctaText,
                  { color: ctaActive ? '#0a0a0b' : '#3f3f46' },
                ]}
              >
                {ctaLabel}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <WeightEntrySheet
        visible={weightSheetVisible}
        title="Current weight"
        onClose={() => setWeightSheetVisible(false)}
        onSaved={(entry) => {
          const unit: 'kg' | 'lbs' = entry.unit === 'lbs' ? 'lbs' : 'kg';
          const kg = unit === 'lbs' ? entry.weight * 0.453592 : entry.weight;
          setCurrentWeightKg(kg);
          setWeightUnit(unit);
          setWeightDisplay(`${entry.weight} ${unit}`);
          setWeightSheetVisible(false);
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 20,
    marginBottom: 28,
  },
  // ── Input rows (step 2 & 3) ───────────────────────────────────────────────
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    gap: 12,
  },
  inputRowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1f1f23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRowContent: {
    flex: 1,
  },
  inputRowLabel: {
    fontSize: 13,
    color: '#a1a1aa',
    marginBottom: 4,
  },
  inputRowValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  inputRowPlaceholder: {
    fontSize: 15,
    color: '#52525b',
  },
  inlineInput: {
    fontSize: 15,
    color: '#ffffff',
    padding: 0,
    margin: 0,
  },
  unitSuffix: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  optionalTag: {
    fontSize: 11,
    color: '#52525b',
    fontWeight: '400',
  },
  hint: {
    fontSize: 12,
    color: '#52525b',
    lineHeight: 17,
    marginTop: 4,
    marginHorizontal: 4,
  },
  // ── Step 3 extras ─────────────────────────────────────────────────────────
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e4e4e7',
    marginBottom: 4,
  },
  sectionSublabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 16,
  },
  // ── CTA ───────────────────────────────────────────────────────────────────
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#0a0a0b',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
  },
  ctaButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
