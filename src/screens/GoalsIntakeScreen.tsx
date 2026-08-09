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
import { TrainingState, Sex, ActivityLevel } from '../utils/goalsProfile';
import BodyFatField, {
  emptyBodyFatValue,
  type BodyFatFieldValue,
} from '../components/BodyFatField';
import {
  leanMassKg,
  weightAtBodyFat,
  physiqueTargets,
  classifyGoal,
} from '../utils/roadmap';
import {
  saveGoalsProfile,
  WEIGHT_KG_MIN,
  WEIGHT_KG_MAX,
  AGE_MIN,
  AGE_MAX,
  HEIGHT_CM_MIN,
  HEIGHT_CM_MAX,
} from '../utils/goalsProfileStorage';
import { WorkoutStorage } from '../utils/storage';
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
    title: 'Very lean (around 10%, an athletic floor)',
    subtitle: 'Competition-ready. Visible abs and definition.',
  },
  {
    pct: 13,
    icon: 'fitness-outline',
    title: 'Athletic (around 12 to 15%)',
    subtitle: 'Lean and defined. Visible abs in good lighting.',
  },
  {
    pct: 17,
    icon: 'heart-outline',
    title: 'Fit and healthy (around 16 to 19%)',
    subtitle: 'Active, healthy look. Light definition.',
  },
  {
    pct: undefined,
    icon: 'remove-circle-outline',
    title: 'Not a priority',
    subtitle: 'Focusing on performance or size, not leanness.',
  },
];

// ── Input validation ────────────────────────────────────────────────────────
// Ranges are IMPORTED from goalsProfileStorage, not declared here, so this
// screen, GoalsStatsScreen and the storage sanitiser can never disagree about
// what a human looks like. They were local copies until now, which is exactly
// the kind of duplication that drifts the first time someone widens one of them.
//
// Both fields were previously unvalidated: the text was stripped to digits,
// parseFloat'd, and written straight to the profile. A real stored profile came
// back with currentBodyFatPct: 183 — the user's height, typed into the body-fat
// box, which is four characters and accepts anything. That number feeds
// computeMacrosPhaseAware, where body fat caps the cutting deficit, so a typo
// here silently rewrote someone's calorie target for every plan they generated.

/** null = empty (valid, both fields are optional). string = why it's rejected. */
/** Sex, age and height moved here from nutrition N3 so BOTH plans can use
 *  them: they drive BMR, muscle-gain rate scaling, the body-fat operating
 *  band and the FFMI plausibility check. */
const SEX_OPTIONS: Array<{ value: Sex; icon: string; title: string; subtitle: string }> = [
  {
    value: 'male',
    icon: 'male-outline',
    title: 'Male',
    subtitle: 'Male ranges for body fat, gain rate, and energy needs.',
  },
  {
    value: 'female',
    icon: 'female-outline',
    title: 'Female',
    subtitle: 'Female ranges for body fat, gain rate, and energy needs.',
  },
  {
    value: 'prefer_not_to_say',
    icon: 'remove-circle-outline',
    title: 'Prefer not to say',
    subtitle: "We'll average the two calculations. Your targets stay usable.",
  },
];

/**
 * Day-to-day activity OUTSIDE training. Moved here from nutrition N4: it is a
 * fact about the person rather than a food preference, it doesn't change
 * between plans, and it sits naturally next to training history — one question
 * covers the gym, the other covers the remaining twenty-three hours.
 *
 * Values match ACTIVITY_MULTIPLIERS in nutritionMacros.ts exactly.
 */
const ACTIVITY_OPTIONS: Array<{
  value: ActivityLevel;
  icon: string;
  title: string;
  subtitle: string;
}> = [
  {
    value: 'sedentary',
    icon: 'desktop-outline',
    title: 'Mostly sitting',
    subtitle: 'Desk job, not much walking outside your sessions.',
  },
  {
    value: 'light',
    icon: 'walk-outline',
    title: 'Lightly active',
    subtitle: 'On your feet some of the day, or a regular walk.',
  },
  {
    value: 'moderate',
    icon: 'bicycle-outline',
    title: 'Moderately active',
    subtitle: 'Plenty of walking, or an active job with sitting.',
  },
  {
    value: 'heavy',
    icon: 'hammer-outline',
    title: 'Very active',
    subtitle: 'On your feet all day, or a physical job.',
  },
  {
    value: 'extreme',
    icon: 'flame-outline',
    title: 'Extremely active',
    subtitle: 'Heavy manual work, on top of training.',
  },
];

function validateAge(raw: string): string | null {
  if (!raw.trim()) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 'Enter a number.';
  if (n < AGE_MIN || n > AGE_MAX) return `Age should be between ${AGE_MIN} and ${AGE_MAX}.`;
  return null;
}

function validateHeight(raw: string): string | null {
  if (!raw.trim()) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 'Enter a number.';
  if (n < HEIGHT_CM_MIN || n > HEIGHT_CM_MAX) {
    return `Height should be between ${HEIGHT_CM_MIN} and ${HEIGHT_CM_MAX} cm.`;
  }
  return null;
}

function validateGoalWeight(raw: string, unit: 'kg' | 'lbs'): string | null {
  if (!raw.trim()) return null;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 'Enter a number, or leave this blank.';
  const kg = unit === 'lbs' ? n * 0.453592 : n;
  if (kg < WEIGHT_KG_MIN || kg > WEIGHT_KG_MAX) {
    const lo = unit === 'lbs' ? Math.round(WEIGHT_KG_MIN / 0.453592) : WEIGHT_KG_MIN;
    const hi = unit === 'lbs' ? Math.round(WEIGHT_KG_MAX / 0.453592) : WEIGHT_KG_MAX;
    return `Target weight should be between ${lo} and ${hi} ${unit}.`;
  }
  return null;
}

export default function GoalsIntakeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();

  const nextFlow = route.params?.nextFlow ?? 'workout';

  // ── Step management ────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // ── Step 1: About you ──────────────────────────────────────────────────────
  const [sex, setSex] = useState<Sex | null>(null);
  const [ageInput, setAgeInput] = useState('');
  const [heightInput, setHeightInput] = useState('');

  // ── Step 2: Training state ─────────────────────────────────────────────────
  const [trainingState, setTrainingState] = useState<TrainingState | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);

  // ── Step 3: Body composition ───────────────────────────────────────────────
  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null);
  const [weightDisplay, setWeightDisplay] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightSheetVisible, setWeightSheetVisible] = useState(false);
  // The shared three-mode field (typed / tier picker / tape). One
  // implementation, also used by ConfirmStatsScreen.
  const [bodyFat, setBodyFat] = useState<BodyFatFieldValue>(emptyBodyFatValue());

  // ── Step 4: Goals ──────────────────────────────────────────────────────────
  const [goalWeightInput, setGoalWeightInput] = useState('');
  const [selectedLeannessIdx, setSelectedLeannessIdx] = useState<number | null>(null);
  // Plenty of people know how they want to LOOK without knowing the numbers.
  const [showTargets, setShowTargets] = useState(false);

  // These are the numbered opening steps of the questionnaire — the
  // progress bar spans profile setup AND the plan-specific questions that
  // follow, so the user never sees a step count reset or a separate gate.
  // Nutrition's count reacts to the target-weight input: a filled-in goal
  // weight means N1/N2 will be skipped (see handleComplete), so the total
  // is 2 shorter — computed here so the bar never jumps once N3 appears.
  // No skip/non-skip split any more: N1, N2 and N3 are all gone from the
  // nutrition flow, so it is a flat 9 screens for everyone.
  const PLAN_STEP_COUNT =
    nextFlow === 'workout' ? 5 : 8;
  // 4, not 3: sex/age/height became the opening step when they moved off
  // nutrition N3. Every downstream screen derives its numbering from
  // flowStepOffset, so this and the offsets in handleComplete are the only
  // places that know the intake got longer.
  const totalFlowSteps = 4 + PLAN_STEP_COUNT;

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
    if (
      sex &&
      ageInput.trim() &&
      heightInput.trim() &&
      !validateAge(ageInput) &&
      !validateHeight(heightInput)
    ) {
      setStep(2);
    }
  };

  const handleStep2Continue = () => {
    if (trainingState && activityLevel) setStep(3);
  };

  const handleStep3Continue = () => {
    if (currentWeightKg) setStep(4);
  };

  const handleComplete = async () => {
    if (!currentWeightKg || !trainingState || saving) return;
    setSaving(true);
    try {
      // Re-check at the save site as well as in the CTA gate. The gate is the
      // UX; this is the guarantee — nothing out of range reaches the profile
      // even if a future edit changes how the button is enabled.
      const currentBFPct = bodyFat.bodyFatPct;
      const rawGoalWeight =
        goalWeightInput && !validateGoalWeight(goalWeightInput, weightUnit)
          ? parseFloat(goalWeightInput)
          : undefined;
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

      const ageYears =
        !validateAge(ageInput) && ageInput.trim() ? parseInt(ageInput, 10) : undefined;
      const heightCm =
        !validateHeight(heightInput) && heightInput.trim()
          ? parseInt(heightInput, 10)
          : undefined;

      await saveGoalsProfile({
        currentWeightKg,
        currentBodyFatPct: currentBFPct,
        goalWeightKg,
        goalBodyFatPct: goalBFPct,
        trainingState,
        sex: sex ?? undefined,
        ageYears,
        heightCm,
        activityLevel: activityLevel ?? undefined,
        // Provenance matters: a tier picked from a description and a DEXA scan
        // are both "20%", but only one should be trusted when the app later
        // compares readings to decide whether the user has progressed.
        bodyFatSource: currentBFPct != null ? bodyFat.source : undefined,
      });

      // Everything lands on the roadmap first. It is the payoff for answering
      // four steps, and it is where the user picks WHICH plan to build — so
      // the workout/nutrition fork lives there, not here. flowStepOffset stays
      // at 4: the roadmap is a result, not a numbered step, so the plan
      // questions still resume at step 5.
      navigation.navigate('Route', { flowStepOffset: 4 });
    } catch {
      setSaving(false);
    }
  };

  // ── Derived UI state ───────────────────────────────────────────────────────
  // Both fields stay optional; they just can't hold a number that isn't a
  // body fat percentage or a body weight.
  // The weight that means "no change" in whatever unit they're using, so the
  // maintain option writes a real goal rather than leaving the field blank.
  const maintainWeightText =
    currentWeightKg != null
      ? (weightUnit === 'lbs' ? currentWeightKg / 0.453592 : currentWeightKg).toFixed(1)
      : '';

  const ageError = validateAge(ageInput);
  const heightError = validateHeight(heightInput);
  const resolvedBodyFat = bodyFat.bodyFatPct;

  // Live read of the goal, so the plausibility verdict lands on the step where
  // the goal is SET rather than three screens later. Height is what makes it
  // possible: the same lean target is reachable at one height and past the
  // natural range at another, so without it we show nothing rather than guess.
  const heightCmLive =
    !validateHeight(heightInput) && heightInput.trim() ? parseInt(heightInput, 10) : undefined;
  const goalWeightKgLive = (() => {
    const raw = parseFloat(goalWeightInput);
    if (!Number.isFinite(raw) || validateGoalWeight(goalWeightInput, weightUnit)) return undefined;
    return weightUnit === 'lbs' ? raw * 0.453592 : raw;
  })();
  const goalBodyFatLive =
    selectedLeannessIdx !== null ? LEANNESS_OPTIONS[selectedLeannessIdx].pct : undefined;
  const leanTargetLive =
    goalWeightKgLive != null && goalBodyFatLive != null
      ? leanMassKg(goalWeightKgLive, goalBodyFatLive)
      : undefined;
  const goalVerdict =
    leanTargetLive != null && heightCmLive != null
      ? classifyGoal(leanTargetLive, heightCmLive, sex ?? undefined)
      : undefined;
  const goalWeightError = validateGoalWeight(goalWeightInput, weightUnit);

  // Say out loud which direction the target implies, live, while they type.
  //
  // This field silently sets the whole plan's direction: derivePhase reads
  // goalWeightKg against currentWeightKg, and anything above current becomes a
  // gain phase — hundreds of calories a day in the opposite direction from a
  // cut. A real stored profile had 90 kg against a current 82 kg, from a user
  // who wanted to lose weight. Nothing on screen ever told them what they had
  // set, and a second corrupt field happened to mask it, so it went unnoticed
  // through months of generated plans.
  //
  // Deliberately a statement, not a warning: gaining is a legitimate goal, so
  // this reads as confirmation rather than a scold. It just has to be
  // impossible to set the direction without being told which one you picked.
  const goalDirection: 'gain' | 'loss' | 'maintain' | null = (() => {
    if (goalWeightError || !goalWeightInput.trim() || !currentWeightKg) return null;
    const n = parseFloat(goalWeightInput);
    if (!Number.isFinite(n)) return null;
    const kg = weightUnit === 'lbs' ? n * 0.453592 : n;
    const delta = kg - currentWeightKg;
    if (Math.abs(delta) < 0.5) return 'maintain';
    return delta > 0 ? 'gain' : 'loss';
  })();

  const goalDirectionNote =
    goalDirection === 'gain'
      ? 'Above your current weight, so this is a muscle gain goal. Enter a lower number if you meant to lose weight.'
      : goalDirection === 'loss'
      ? 'Below your current weight, so this is a fat loss goal.'
      : goalDirection === 'maintain'
      ? 'About the same as your current weight, so this is a maintenance goal.'
      : null;

  const ctaActive =
    step === 1
      ? sex !== null &&
        ageInput.trim().length > 0 &&
        heightInput.trim().length > 0 &&
        !ageError &&
        !heightError
    : step === 2 ? trainingState !== null && activityLevel !== null
    : step === 3 ? currentWeightKg !== null
    : !goalWeightError; // step 4 is completable with everything blank, just not with a bad number

  const ctaLabel = step === 4 ? 'See my route' : 'Continue';

  const handleCta = step === 1 ? handleStep1Continue
    : step === 2 ? handleStep2Continue
    : step === 3 ? handleStep3Continue
    : handleComplete;

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={step}
        totalSteps={totalFlowSteps}
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

          {/* ── Step 1: About you ────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <Text style={styles.title}>First, a bit about you</Text>
              <Text style={styles.subtitle}>
                These shape everything else: how fast you can build, how lean is
                realistic, and what your calories should be.
              </Text>

              <Text style={styles.sectionLabel}>Sex</Text>
              <Text style={styles.sectionSublabel}>
                Muscle-gain rates and healthy body-fat ranges differ, so this
                changes the targets we set.
              </Text>
              {SEX_OPTIONS.map((opt) => (
                <QuestionCard
                  key={opt.value}
                  icon={opt.icon as any}
                  title={opt.title}
                  subtitle={opt.subtitle}
                  selected={sex === opt.value}
                  onPress={() => setSex(opt.value)}
                />
              ))}

              <View style={styles.sectionDivider} />

              <View style={styles.inputRow}>
                <View style={styles.inputRowIcon}>
                  <Ionicons name="calendar-outline" size={18} color="#a1a1aa" />
                </View>
                <View style={styles.inputRowContent}>
                  <Text style={styles.inputRowLabel}>Age</Text>
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="e.g. 28"
                    placeholderTextColor="#52525b"
                    keyboardType="number-pad"
                    value={ageInput}
                    onChangeText={(t) => setAgeInput(t.replace(/[^0-9]/g, ''))}
                    maxLength={3}
                    returnKeyType="done"
                  />
                </View>
              </View>
              {ageError ? <Text style={styles.inputError}>{ageError}</Text> : null}

              <View style={styles.inputRow}>
                <View style={styles.inputRowIcon}>
                  <Ionicons name="resize-outline" size={18} color="#a1a1aa" />
                </View>
                <View style={styles.inputRowContent}>
                  <Text style={styles.inputRowLabel}>Height</Text>
                  <TextInput
                    style={styles.inlineInput}
                    placeholder="e.g. 178"
                    placeholderTextColor="#52525b"
                    keyboardType="number-pad"
                    value={heightInput}
                    onChangeText={(t) => setHeightInput(t.replace(/[^0-9]/g, ''))}
                    maxLength={3}
                    returnKeyType="done"
                  />
                </View>
                {heightInput ? <Text style={styles.unitSuffix}>cm</Text> : null}
              </View>
              {heightError ? (
                <Text style={styles.inputError}>{heightError}</Text>
              ) : (
                <Text style={styles.hint}>
                  Height is what lets us tell you whether a goal is realistically
                  reachable for your frame.
                </Text>
              )}
            </>
          )}

          {/* ── Step 2: Training history ─────────────────────────────────── */}
          {step === 2 && (
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

              <View style={styles.sectionDivider} />

              <Text style={styles.sectionLabel}>Outside the gym</Text>
              <Text style={styles.sectionSublabel}>
                Your day-to-day activity sets your calorie baseline, so this
                matters as much as the training itself.
              </Text>
              {ACTIVITY_OPTIONS.map((opt) => (
                <QuestionCard
                  key={opt.value}
                  icon={opt.icon as any}
                  title={opt.title}
                  subtitle={opt.subtitle}
                  selected={activityLevel === opt.value}
                  onPress={() => setActivityLevel(opt.value)}
                />
              ))}
            </>
          )}

          {/* ── Step 3: Body composition ─────────────────────────────────── */}
          {step === 3 && (
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

              <Text style={styles.sectionLabel}>
                Body fat{'  '}<Text style={styles.optionalTag}>optional</Text>
              </Text>
              <Text style={styles.sectionSublabel}>
                Most people don't know theirs. Any of these is fine — we read the
                trend over time, not the single number.
              </Text>
              <BodyFatField
                value={bodyFat}
                onChange={setBodyFat}
                sex={sex ?? undefined}
                heightCm={heightCmLive}
                weightKg={currentWeightKg ?? undefined}
                themeColor={themeColor}
              />

            </>
          )}

          {/* ── Step 4: Goals ────────────────────────────────────────────── */}
          {step === 4 && (
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

              {goalWeightError ? (
                <Text style={styles.inputError}>{goalWeightError}</Text>
              ) : goalDirectionNote ? (
                <Text
                  style={[
                    styles.directionNote,
                    goalDirection === 'gain' && styles.directionNoteGain,
                  ]}
                >
                  {goalDirectionNote}
                </Text>
              ) : null}

              <View style={styles.sectionDivider} />

              <Text style={styles.sectionLabel}>How lean do you want to be?</Text>
              <Text style={styles.sectionSublabel}>
                Helps calibrate your calorie target and phase direction.
              </Text>

              {/* An explicit answer, not an inference from silence. With the
                  nutrition goal question gone, skipping this used to hand the
                  user a maintenance plan they never chose. */}
              <TouchableOpacity
                style={[
                  styles.maintainBtn,
                  goalWeightInput.trim() === maintainWeightText &&
                    maintainWeightText.length > 0 && {
                      borderColor: themeColor,
                      backgroundColor: '#14181b',
                    },
                ]}
                onPress={() => {
                  setGoalWeightInput(maintainWeightText);
                  setShowTargets(false);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                disabled={!maintainWeightText}
              >
                <Ionicons name="remove-circle-outline" size={16} color="#a1a1aa" />
                <Text style={styles.maintainTxt}>
                  Keep me where I am
                  {maintainWeightText ? ` (${maintainWeightText} ${weightUnit})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.idkBtn}
                onPress={() => setShowTargets((v) => !v)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons name="help-circle-outline" size={16} color="#a1a1aa" />
                <Text style={styles.idkTxt}>
                  {showTargets ? 'Hide suggestions' : "I don't know \u2014 show me what to aim for"}
                </Text>
              </TouchableOpacity>

              {showTargets && heightCmLive != null
                ? physiqueTargets(heightCmLive, sex ?? undefined).map((target) => {
                    // Snap to whichever leanness option is closest so the goal
                    // has ONE source of truth, then recompute the weight at
                    // that snapped body fat — otherwise the stored pair drifts
                    // away from the number shown on the card.
                    const idx = LEANNESS_OPTIONS.reduce<number | null>((best, o, i) => {
                      if (o.pct == null) return best;
                      if (best === null) return i;
                      const bestPct = LEANNESS_OPTIONS[best].pct as number;
                      return Math.abs(o.pct - target.goalBodyFatPct) <
                        Math.abs(bestPct - target.goalBodyFatPct)
                        ? i
                        : best;
                    }, null);
                    const snappedPct =
                      idx !== null ? (LEANNESS_OPTIONS[idx].pct as number) : target.goalBodyFatPct;
                    const lean = leanMassKg(target.goalWeightKg, target.goalBodyFatPct);
                    const snappedKg = weightAtBodyFat(lean, snappedPct);
                    const shown = weightUnit === 'lbs' ? snappedKg / 0.453592 : snappedKg;
                    return (
                      <TouchableOpacity
                        key={target.id}
                        style={styles.targetCard}
                        onPress={() => {
                          setGoalWeightInput(shown.toFixed(1));
                          if (idx !== null) setSelectedLeannessIdx(idx);
                        }}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                      >
                        <View style={styles.targetBody}>
                          <Text style={styles.targetName}>{target.name}</Text>
                          <Text style={styles.targetDesc}>{target.description}</Text>
                        </View>
                        <View style={styles.targetNums}>
                          <Text style={[styles.targetWeight, { color: themeColor }]}>
                            {shown.toFixed(0)} {weightUnit}
                          </Text>
                          <Text style={styles.targetPct}>at {snappedPct}% body fat</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                : null}

              {showTargets && heightCmLive == null ? (
                <Text style={styles.hint}>
                  Add your height on the first step and we can work these out for
                  your frame.
                </Text>
              ) : null}

              {goalVerdict && leanTargetLive != null ? (
                <View
                  style={[
                    styles.fbBox,
                    goalVerdict.plausibility !== 'reachable' && styles.fbBoxWarn,
                  ]}
                >
                  <Ionicons
                    name={
                      goalVerdict.plausibility === 'reachable'
                        ? 'checkmark-circle-outline'
                        : 'alert-circle-outline'
                    }
                    size={16}
                    color={goalVerdict.plausibility === 'reachable' ? themeColor : '#f0b429'}
                  />
                  <Text style={styles.fbText}>
                    That needs{' '}
                    <Text style={styles.fbStrong}>
                      {leanTargetLive.toFixed(1)} kg of lean mass
                    </Text>
                    {currentWeightKg != null && resolvedBodyFat != null ? (
                      <>
                        , so you're{' '}
                        <Text style={styles.fbStrong}>
                          {(
                            leanTargetLive - leanMassKg(currentWeightKg, resolvedBodyFat)
                          ).toFixed(1)}{' '}
                          kg of muscle
                        </Text>{' '}
                        away
                      </>
                    ) : null}
                    .{' '}
                    {goalVerdict.plausibility === 'reachable'
                      ? "That's a body composition drug-free lifters reach. A long project, but the target is sound."
                      : goalVerdict.plausibility === 'borderline'
                      ? "That's near the upper end of what's been recorded in drug-free lifters. Some people get there, many don't, and that isn't a failure."
                      : "That's beyond what's typically been recorded in drug-free lifters at your height. Genetics vary, but a nearer target would serve you better."}
                  </Text>
                </View>
              ) : null}

              <View style={styles.sectionDivider} />

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
  maintainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#131316',
    marginBottom: 8,
  },
  maintainTxt: { fontSize: 13, fontWeight: '600', color: '#a1a1aa' },
  idkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
    marginBottom: 10,
  },
  idkTxt: { fontSize: 13, fontWeight: '600', color: '#a1a1aa' },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  targetBody: { flex: 1 },
  targetName: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  targetDesc: { fontSize: 11.5, lineHeight: 16, color: '#71717a', marginTop: 2 },
  targetNums: { alignItems: 'flex-end' },
  targetWeight: { fontSize: 14, fontWeight: '700' },
  targetPct: { fontSize: 10.5, fontWeight: '600', color: '#71717a', marginTop: 1 },
  fbBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#101416',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1c3238',
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
  },
  fbBoxWarn: { backgroundColor: '#141310', borderColor: '#33291a' },
  fbText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: '#a1a1aa' },
  fbStrong: { color: '#ffffff', fontWeight: '600' },
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
  inputError: {
    fontSize: 12,
    color: '#f87171',
    lineHeight: 17,
    marginTop: 4,
    marginHorizontal: 4,
  },
  directionNote: {
    fontSize: 12,
    color: '#a1a1aa',
    lineHeight: 17,
    marginTop: 4,
    marginHorizontal: 4,
  },
  // Gain is the surprising outcome for most people typing in this box, so it
  // gets a warmer tone. Not red: it isn't an error, it's the answer to a
  // question they didn't know they were being asked.
  directionNoteGain: {
    color: '#fbbf24',
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