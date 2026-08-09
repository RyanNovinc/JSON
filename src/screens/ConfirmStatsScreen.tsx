import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import {
  loadGoalsProfile,
  updateGoalsProfileField,
  AGE_MIN,
  AGE_MAX,
  HEIGHT_CM_MIN,
  HEIGHT_CM_MAX,
} from '../utils/goalsProfileStorage';
import type { Sex, ActivityLevel } from '../utils/goalsProfile';
import {
  continueWorkoutFlow,
  continueNutritionFlow,
} from '../utils/questionnaireRouting';
import WeightEntrySheet from '../components/nutrition/WeightEntrySheet';
import BodyFatField, {
  emptyBodyFatValue,
  type BodyFatFieldValue,
} from '../components/BodyFatField';

/**
 * ConfirmStatsScreen — the lightweight touchpoint for returning users
 * (a usable GoalsProfile already exists). Shown once, right before the
 * plan-specific questions, so current weight/body-fat don't silently go
 * stale between plans. Not part of the numbered questionnaire progress
 * bar — it's a single confirm-or-edit step, not a flow of its own.
 *
 * It also carries the TOP-UP for sex / age / height. Those three moved onto
 * GoalsProfile with the shared intake, but GoalsIntake only ever runs on a
 * first run — so without this, every user who already had a profile would
 * keep those fields undefined forever, losing the FFMI plausibility check and
 * the phase model's sex-specific bands. This screen is the only place a
 * returning user is guaranteed to pass through, so the top-up lives here.
 *
 * Only the MISSING fields are shown. A user who has all three sees the screen
 * exactly as it was, with no extra friction. Once answered, they never see the
 * top-up again.
 */

/**
 * Activity level joined the top-up on 9 Aug 2026, and it is not optional
 * cosmetics: N4 (the screen that used to ask) was deleted when the shared
 * intake started collecting it, and the intake is FIRST-RUN ONLY. A returning
 * user therefore had no activityLevel anywhere — computeMacros returns null
 * without it, so finalizeNutrition failed at the very last screen with
 * "Failed to finalize nutrition data from N9".
 */
const ACTIVITY_OPTIONS: Array<{ value: ActivityLevel; label: string; hint: string }> = [
  { value: 'sedentary', label: 'Mostly sitting', hint: 'Desk job, little walking' },
  { value: 'light', label: 'Lightly active', hint: 'On your feet some of the day' },
  { value: 'moderate', label: 'Moderately active', hint: 'Lots of walking, or an active job' },
  { value: 'heavy', label: 'Very active', hint: 'On your feet all day, physical job' },
  { value: 'extreme', label: 'Extremely active', hint: 'Heavy manual work as well as training' },
];

const SEX_OPTIONS: Array<{ value: Sex; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Rather not say' },
];

// Duplicated from GoalsIntakeScreen rather than shared, matching how the
// option arrays are already duplicated across the profile screens. A third
// copy (GoalsStatsScreen will need these when it gains the same fields)
// is the point at which extracting them earns its keep.
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

type Nav = StackNavigationProp<RootStackParamList, 'ConfirmStats'>;
type RouteProps = RouteProp<RootStackParamList, 'ConfirmStats'>;

export default function ConfirmStatsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();

  const nextFlow = route.params?.nextFlow ?? 'workout';
  const extraParams = route.params?.extraParams ?? {};

  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);

  const [originalWeightKg, setOriginalWeightKg] = useState<number | null>(null);
  const [originalBodyFatPct, setOriginalBodyFatPct] = useState<number | undefined>(undefined);

  const [currentWeightKg, setCurrentWeightKg] = useState<number | null>(null);
  const [weightDisplay, setWeightDisplay] = useState('');
  const [weightSheetVisible, setWeightSheetVisible] = useState(false);
  // The same three-mode field the intake uses. It used to be a plain number
  // box here, which meant the estimator was unreachable for anyone who
  // already had a profile — most users, most of the time.
  const [bodyFat, setBodyFat] = useState<BodyFatFieldValue>(emptyBodyFatValue());
  const [heightCm, setHeightCmState] = useState<number | undefined>(undefined);

  // ── Top-up state ───────────────────────────────────────────────────────────
  // needX is fixed at load time, not derived from the inputs, so the fields
  // don't disappear from under the user the moment they answer one.
  const [needSex, setNeedSex] = useState(false);
  const [needAge, setNeedAge] = useState(false);
  const [needHeight, setNeedHeight] = useState(false);
  const [needActivity, setNeedActivity] = useState(false);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [ageInput, setAgeInput] = useState('');
  const [heightInput, setHeightInput] = useState('');

  useEffect(() => {
    (async () => {
      const profile = await loadGoalsProfile();
      if (profile?.currentWeightKg) {
        setOriginalWeightKg(profile.currentWeightKg);
        setCurrentWeightKg(profile.currentWeightKg);
        setWeightDisplay(`${Math.round(profile.currentWeightKg * 10) / 10} kg`);
      }
      if (profile?.currentBodyFatPct != null) {
        setOriginalBodyFatPct(profile.currentBodyFatPct);
        setBodyFat(emptyBodyFatValue(profile.currentBodyFatPct));
      }
      setHeightCmState(profile?.heightCm);

      setNeedSex(profile?.sex == null);
      setNeedAge(profile?.ageYears == null);
      setNeedHeight(profile?.heightCm == null);
      setNeedActivity(profile?.activityLevel == null);
      if (profile?.activityLevel) setActivityLevel(profile.activityLevel);
      if (profile?.sex) setSex(profile.sex);
      if (profile?.ageYears != null) setAgeInput(String(profile.ageYears));
      if (profile?.heightCm != null) setHeightInput(String(profile.heightCm));

      setLoading(false);
    })();
  }, []);

  const handleClose = () => navigation.goBack();

  const handleContinue = async () => {
    if (continuing) return;
    setContinuing(true);
    try {
      const newBodyFatPct = bodyFat.bodyFatPct;

      if (currentWeightKg != null && currentWeightKg !== originalWeightKg) {
        await updateGoalsProfileField('currentWeightKg', currentWeightKg);
      }
      if (newBodyFatPct !== originalBodyFatPct) {
        await updateGoalsProfileField('currentBodyFatPct', newBodyFatPct);
        if (newBodyFatPct != null) {
          await updateGoalsProfileField('bodyFatSource', bodyFat.source);
        }
      }

      if (needSex && sex) {
        await updateGoalsProfileField('sex', sex);
      }
      if (needAge && ageInput.trim() && !validateAge(ageInput)) {
        await updateGoalsProfileField('ageYears', parseInt(ageInput, 10));
      }
      if (needHeight && heightInput.trim() && !validateHeight(heightInput)) {
        await updateGoalsProfileField('heightCm', parseInt(heightInput, 10));
      }
      if (needActivity && activityLevel) {
        await updateGoalsProfileField('activityLevel', activityLevel);
      }

      // NOTE: this used to detour through the Route screen when the roadmap had
      // materially changed. That was the only way a returning user could reach
      // it — but it hijacked the tap. Someone who chose "Custom workout plan"
      // got a roadmap instead. CreateChooserScreen now shows the route as its
      // own card at the top, so the route has a front door and this screen
      // goes straight to the questions the user actually asked for.
      if (nextFlow === 'workout') {
        await continueWorkoutFlow(navigation, extraParams);
      } else {
        await continueNutritionFlow(navigation, extraParams);
      }
    } finally {
      setContinuing(false);
    }
  };

  const ageError = validateAge(ageInput);
  const heightError = validateHeight(heightInput);
  const showTopUp = needSex || needAge || needHeight || needActivity;
  const sexForField = sex;

  // Missing fields must be filled to continue. They are not decoration: without
  // height there is no plausibility check, and without sex the phase model
  // falls back to male body-fat bands for everyone.
  const topUpComplete =
    (!needSex || sex !== null) &&
    (!needAge || (ageInput.trim().length > 0 && !ageError)) &&
    (!needHeight || (heightInput.trim().length > 0 && !heightError)) &&
    (!needActivity || activityLevel !== null);

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
        <View style={{ width: 36 }} />
        <Text style={styles.topBarTitle}>Quick check</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ScrollView, not a plain View: this screen used to hold two rows and
            now holds up to five activity options, three top-up fields, the
            weight row and the whole body-fat field. On a smaller phone the
            bottom of it was simply unreachable. */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>
            {showTopUp ? 'A couple of new details' : 'Still accurate?'}
          </Text>
          <Text style={styles.subtitle}>
            {showTopUp
              ? 'Your plans now use these to work out realistic targets. One time only.'
              : "Your targets are calculated from these. Update anything that's changed."}
          </Text>

          {needSex ? (
            <>
              <Text style={styles.groupLabel}>Sex</Text>
              <View style={styles.pillRow}>
                {SEX_OPTIONS.map((opt) => {
                  const active = sex === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.pill,
                        active && { borderColor: themeColor, backgroundColor: '#14181b' },
                      ]}
                      onPress={() => setSex(opt.value)}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[styles.pillText, active && { color: themeColor }]}
                        numberOfLines={1}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}

          {needAge ? (
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
          ) : null}
          {needAge && ageError ? (
            <Text style={styles.inputError}>{ageError}</Text>
          ) : null}

          {needActivity ? (
            <>
              <Text style={styles.groupLabel}>Day-to-day activity</Text>
              {ACTIVITY_OPTIONS.map((opt) => {
                const active = activityLevel === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.activityRow,
                      active && { borderColor: themeColor, backgroundColor: '#14181b' },
                    ]}
                    onPress={() => setActivityLevel(opt.value)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={styles.activityBody}>
                      <Text style={[styles.activityLabel, active && { color: themeColor }]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.activityHint}>{opt.hint}</Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={18} color={themeColor} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </>
          ) : null}

          {needHeight ? (
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
          ) : null}
          {needHeight && heightError ? (
            <Text style={styles.inputError}>{heightError}</Text>
          ) : null}

          {showTopUp ? <View style={styles.divider} /> : null}

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

          <Text style={styles.groupLabel}>
            Body fat <Text style={styles.optionalTag}>optional</Text>
          </Text>
          <BodyFatField
            value={bodyFat}
            onChange={setBodyFat}
            sex={sexForField ?? undefined}
            heightCm={heightCm}
            weightKg={currentWeightKg ?? undefined}
            themeColor={themeColor}
          />
        </ScrollView>

        <View style={[styles.ctaBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[
              styles.ctaButton,
              {
                backgroundColor:
                  currentWeightKg != null && topUpComplete ? themeColor : '#1c1c1f',
              },
            ]}
            onPress={handleContinue}
            disabled={continuing || currentWeightKg == null || !topUpComplete}
            activeOpacity={0.85}
          >
            {continuing ? (
              <ActivityIndicator color="#0a0a0b" />
            ) : (
              <Text
                style={[
                  styles.ctaText,
                  {
                    color:
                      currentWeightKg != null && topUpComplete ? '#0a0a0b' : '#3f3f46',
                  },
                ]}
              >
                Continue
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
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#d4d4d8',
    letterSpacing: 0.2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    // No flex: 1 here — this is a contentContainerStyle now, and flexing it
    // would stop the content growing past the viewport, which is the whole
    // problem being fixed.
    paddingHorizontal: 20,
    paddingTop: 12,
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
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  activityBody: { flex: 1 },
  activityLabel: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  activityHint: { fontSize: 11.5, color: '#71717a', marginTop: 2 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  pill: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  inputError: {
    fontSize: 12,
    color: '#f87171',
    marginTop: -4,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginVertical: 18,
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