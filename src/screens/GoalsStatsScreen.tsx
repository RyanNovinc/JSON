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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { TrainingState , Sex, ActivityLevel } from '../utils/goalsProfile';
import BodyFatField, {
  emptyBodyFatValue,
  type BodyFatFieldValue,
} from '../components/BodyFatField';
import {
  loadGoalsProfile,
  updateGoalsProfileField,
  AGE_MIN,
  AGE_MAX,
  HEIGHT_CM_MIN,
  HEIGHT_CM_MAX,
  BODY_FAT_MIN,
  BODY_FAT_MAX,
  WEIGHT_KG_MIN,
  WEIGHT_KG_MAX,
} from '../utils/goalsProfileStorage';

// ── Input validation ────────────────────────────────────────────────────────
// Ranges come from goalsProfileStorage so the screen and the storage sanitiser
// can never disagree about what a human looks like. Both fields were previously
// unvalidated here: stripped to digits, parseFloat'd, written straight through
// updateGoalsProfileField. A real stored profile came back with
// currentBodyFatPct: 183 — the user's height, typed into a four-character
// body-fat box. That number feeds computeMacrosPhaseAware, where body fat caps
// the cutting deficit, so a typo silently rewrote their calorie target.

/** null = empty (valid, both fields are optional). string = why it's rejected. */
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
import { WorkoutStorage } from '../utils/storage';
import QuestionCard from './questionnaire/QuestionCard';
import WeightEntrySheet from '../components/nutrition/WeightEntrySheet';

/**
 * GoalsStatsScreen — the standalone, always-reachable home for GoalsProfile.
 *
 * Unlike GoalsIntakeScreen (a one-time, step-by-step gate shown before the
 * first plan), this screen shows every GoalsProfile field on one page,
 * pre-filled with the saved values, editable in place, saved on demand.
 * Reachable any time from Profile → "Goals & stats".
 *
 * All fields are the same TRAINING_OPTIONS / LEANNESS_OPTIONS vocabulary as
 * GoalsIntakeScreen so the two screens stay conceptually identical — this
 * file intentionally duplicates those small option arrays rather than
 * extracting a shared module, to keep this phase additive and avoid
 * touching GoalsIntakeScreen's working logic.
 */

type Nav = StackNavigationProp<RootStackParamList, 'GoalsStats'>;

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

// Verbatim copy of GoalsIntakeScreen's ACTIVITY_OPTIONS — same deliberate
// duplication as TRAINING_OPTIONS above, so the two screens cannot drift in
// wording without a grep finding both.
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

export default function GoalsStatsScreen() {
  const navigation = useNavigation<Nav>();
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [trainingState, setTrainingState] = useState<TrainingState | null>(null);

  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null);
  const [weightDisplay, setWeightDisplay] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightSheetVisible, setWeightSheetVisible] = useState(false);
  // The shared three-mode field, same one the intake and Quick check use.
  // This screen previously had a plain number box, which meant the estimator
  // was unreachable for anyone editing their stats rather than filling in the
  // intake — the last place body fat could be entered the old way.
  const [bodyFat, setBodyFat] = useState<BodyFatFieldValue>(emptyBodyFatValue());

  // Sex, age and height live on GoalsProfile now, so the profile editor has to
  // be able to edit them. Height in particular gates the FFMI plausibility
  // check on the roadmap.
  const [sex, setSex] = useState<Sex | null>(null);
  const [ageInput, setAgeInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  // Day-to-day activity outside training — feeds TDEE on the nutrition side
  // and the Athlete line in the workout prompt, so the profile editor must be
  // able to correct it without redoing intake. Optional, like sex.
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);

  const [goalWeightInput, setGoalWeightInput] = useState('');
  const [selectedLeannessIdx, setSelectedLeannessIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [profile, history] = await Promise.all([
        loadGoalsProfile(),
        WorkoutStorage.loadWeightHistory().catch(() => []),
      ]);

      setTrainingState(profile?.trainingState ?? null);
      if (profile?.currentBodyFatPct != null) {
        setBodyFat(emptyBodyFatValue(profile.currentBodyFatPct));
      }
      setSex(profile?.sex ?? null);
      setActivityLevel(profile?.activityLevel ?? null);
      if (profile?.ageYears != null) setAgeInput(String(profile.ageYears));
      if (profile?.heightCm != null) setHeightInput(String(profile.heightCm));
      if (profile?.goalBodyFatPct !== undefined) {
        const idx = LEANNESS_OPTIONS.findIndex((o) => o.pct === profile.goalBodyFatPct);
        if (idx !== -1) setSelectedLeannessIdx(idx);
      }

      // The weight-history log (WeightEntrySheet / weight tracker) is
      // appended to on every weigh-in, while GoalsProfile.currentWeightKg
      // is only ever set once, at onboarding — the log entry that seeded
      // it lives in this same history. So the history's latest entry is
      // always at least as fresh as the profile snapshot; prefer it, and
      // fall back to the profile value only if no history exists yet.
      const sortedHistory = [...(history || [])].sort(
        (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latest = sortedHistory[0];

      let unit: 'kg' | 'lbs' = 'kg';
      let weightKg: number | null = null;
      let display = '';

      if (latest?.weight) {
        unit = latest.unit === 'lbs' ? 'lbs' : 'kg';
        weightKg = unit === 'lbs' ? latest.weight * 0.453592 : latest.weight;
        display = `${latest.weight} ${unit}`;
      } else if (profile?.currentWeightKg) {
        weightKg = profile.currentWeightKg;
        display = `${Math.round(profile.currentWeightKg * 10) / 10} kg`;
      }

      setCurrentWeightKg(weightKg);
      setWeightUnit(unit);
      setWeightDisplay(display);

      if (profile?.goalWeightKg != null) {
        const displayVal =
          unit === 'lbs' ? profile.goalWeightKg / 0.453592 : profile.goalWeightKg;
        setGoalWeightInput(String(Math.round(displayVal * 10) / 10));
      }

      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!trainingState || !currentWeightKg || saving) return;
    setSaving(true);
    try {
      // Re-checked here as well as in the CTA gate: the gate is the UX, this is
      // the guarantee that nothing out of range reaches the profile.
      const currentBFPct =
        bodyFat.bodyFatPct;
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
        selectedLeannessIdx !== null ? LEANNESS_OPTIONS[selectedLeannessIdx].pct : undefined;

      // Each field is written through updateGoalsProfileField — the single
      // write path into GoalsProfile — rather than assembling a whole
      // object and calling saveGoalsProfile directly.
      await updateGoalsProfileField('trainingState', trainingState);
      await updateGoalsProfileField('currentWeightKg', currentWeightKg);
      await updateGoalsProfileField('currentBodyFatPct', currentBFPct);
      if (currentBFPct != null) {
        await updateGoalsProfileField('bodyFatSource', bodyFat.source);
      }
      await updateGoalsProfileField('sex', sex ?? undefined);
      await updateGoalsProfileField('activityLevel', activityLevel ?? undefined);
      await updateGoalsProfileField(
        'ageYears',
        !validateAge(ageInput) && ageInput.trim() ? parseInt(ageInput, 10) : undefined,
      );
      await updateGoalsProfileField(
        'heightCm',
        !validateHeight(heightInput) && heightInput.trim()
          ? parseInt(heightInput, 10)
          : undefined,
      );
      await updateGoalsProfileField('goalWeightKg', goalWeightKg);
      await updateGoalsProfileField('goalBodyFatPct', goalBFPct);

      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const ageError = validateAge(ageInput);
  const heightError = validateHeight(heightInput);
  const goalWeightError = validateGoalWeight(goalWeightInput, weightUnit);

  // Say out loud which direction the target implies, live, while they type.
  //
  // This field silently sets the whole plan's direction: derivePhase reads
  // goalWeightKg against currentWeightKg, and anything above current becomes a
  // gain phase — hundreds of calories a day opposite to a cut. A real profile
  // had 90 kg against a current 82 kg, from someone who wanted to lose weight,
  // and nothing on screen ever told them what they had set.
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
    trainingState !== null &&
    currentWeightKg !== null &&
    !ageError &&
    !heightError &&
    !goalWeightError;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerFill]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Goals &amp; Stats</Text>
        <View style={{ width: 24 }} />
      </View>

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
          {/* ── Training history ──────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>About you</Text>
          <Text style={styles.sectionSublabel}>
            These drive your calorie targets and whether a goal is reachable for
            your frame.
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
          {heightError ? <Text style={styles.inputError}>{heightError}</Text> : null}

          <View style={styles.sectionDivider} />

          <Text style={styles.sectionLabel}>Training history</Text>
          <Text style={styles.sectionSublabel}>Shapes your starting volume and plan intensity.</Text>
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

          {/* ── Outside the gym ───────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Outside the gym</Text>
          <Text style={styles.sectionSublabel}>
            Sets your daily calorie burn — training aside, what does the rest of
            your day look like?
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

          <View style={styles.sectionDivider} />

          {/* ── Body right now ────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>Your body right now</Text>
          <Text style={styles.sectionSublabel}>
            Used to calculate your targets. Weight is required — body fat is optional.
          </Text>

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
                <Text style={[styles.inputRowValue, { color: themeColor }]}>{weightDisplay}</Text>
              ) : (
                <Text style={styles.inputRowPlaceholder}>Tap to enter</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color="#52525b" />
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>
            Body fat{'  '}<Text style={styles.optionalTag}>optional</Text>
          </Text>
          <BodyFatField
            value={bodyFat}
            onChange={setBodyFat}
            sex={sex ?? undefined}
            heightCm={
              !validateHeight(heightInput) && heightInput.trim()
                ? parseInt(heightInput, 10)
                : undefined
            }
            weightKg={currentWeightKg ?? undefined}
            themeColor={themeColor}
          />

          <View style={styles.sectionDivider} />

          {/* ── Goals ─────────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>What you're working toward</Text>
          <Text style={styles.sectionSublabel}>All optional — skip anything you're not sure about.</Text>

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
            {goalWeightInput ? <Text style={styles.unitSuffix}>{weightUnit}</Text> : null}
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

          <Text style={[styles.sectionSublabel, styles.leannessLabel]}>How lean do you want to be?</Text>

          {LEANNESS_OPTIONS.map((opt, idx) => (
            <QuestionCard
              key={idx}
              icon={opt.icon as any}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={selectedLeannessIdx === idx}
              onPress={() => setSelectedLeannessIdx(selectedLeannessIdx === idx ? null : idx)}
            />
          ))}
        </ScrollView>

        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: ctaActive ? themeColor : '#1c1c1f' }]}
            onPress={handleSave}
            disabled={!ctaActive || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#0a0a0b" />
            ) : (
              <Text style={[styles.ctaText, { color: ctaActive ? '#0a0a0b' : '#3f3f46' }]}>Save</Text>
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
  centerFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#18181b',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
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
  leannessLabel: {
    marginTop: 4,
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
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 24,
  },
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