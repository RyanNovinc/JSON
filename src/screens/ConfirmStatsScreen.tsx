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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
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
import type { Sex } from '../utils/goalsProfile';
import { WorkoutStorage } from '../utils/storage';
import { recordWeightEntry } from '../utils/weightHistory';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import {
  continueWorkoutFlow,
  continueNutritionFlow,
} from '../utils/questionnaireRouting';
import WeightEntrySheet from '../components/nutrition/WeightEntrySheet';
import {
  emptyBodyFatValue,
  resolveBodyFat,
  type BodyFatFieldValue,
} from '../components/BodyFatField';
import RouteBodyFatField from '../components/route/RouteBodyFatField';
import {
  loadBodyFatReadings,
  recordBodyFatReading,
} from '../utils/bodyFatHistory';

/**
 * ConfirmStatsScreen — the lightweight touchpoint for returning users
 * (a usable GoalsProfile already exists). Shown once, right before the
 * plan-specific questions, so current weight/body-fat don't silently go
 * stale between plans. Not part of the numbered questionnaire progress
 * bar — it's a single confirm-or-edit step, not a flow of its own.
 *
 * The TOP-UP branch it used to carry (sex / age / height, shown as "A couple
 * of gaps") was deleted 17 Aug 2026. Sex and height are mandatory in
 * onboarding, so the branch was unreachable; age and activity moved to the
 * nutrition questionnaire, where the answers actually change something the
 * user can see.
 *
 * Sex is still LOADED here, and still needed: the body-fat field resolves
 * its tiers against it. It is just no longer editable on this screen.
 */

/**
 * HISTORY, because it is the reason to be careful here.
 *
 * Activity level was pulled into this screen's top-up on 9 Aug 2026 after N4
 * was deleted and the shared intake — which is FIRST-RUN ONLY — became its
 * only source. Returning users had no activityLevel anywhere, computeMacros
 * returned null without it, and finalizeNutrition failed on the very last
 * screen of the questionnaire.
 *
 * It has now gone back to being its own questionnaire step (N4Activity), which
 * fixes that properly rather than by patching a hole in a screen that fires
 * conditionally. Anything moved out of a questionnaire has to land somewhere a
 * RETURNING user will still meet it.
 */


const DAY_MS = 24 * 60 * 60 * 1000;

/** Past this, a number is old enough to distort a plan built from it. */
const WEIGHT_STALE_DAYS = 14;
const BODY_FAT_STALE_DAYS = 45;

// The verb is a parameter because "Logged" and "Estimated" are the one thing
// distinguishing these two rows. A single "Updated" for both throws that away.
function ageLabel(days: number | null, verb: string): string | null {
  if (days == null) return null;
  if (days <= 0) return `${verb} today`;
  if (days === 1) return `${verb} yesterday`;
  if (days < 14) return `${verb} ${days} days ago`;
  if (days < 60) return `${verb} ${Math.round(days / 7)} weeks ago`;
  return `${verb} months ago`;
}

/** A real radial gradient, not an approximation of one. The first version
 *  stacked eight translucent discs, which banded visibly: eight steps at 100px
 *  spacing reads as rings, and the alphas accumulated into a flat tint over the
 *  whole screen rather than light falling off from a point.
 *
 *  The stops match the mockup exactly: peak alpha at the centre, fully
 *  transparent by 68% of the radius, so it has died out before it reaches the
 *  stat rows. */
function Glow({ color }: { color: string }) {
  return (
    <View style={styles.glowWrap} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="confirmStatsGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.13} />
            <Stop offset="0.68" stopColor={color} stopOpacity={0} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#confirmStatsGlow)" />
      </Svg>
    </View>
  );
}

type Nav = StackNavigationProp<RootStackParamList, 'ConfirmStats'>;
type RouteProps = RouteProp<RootStackParamList, 'ConfirmStats'>;

export default function ConfirmStatsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const { themeColor } = useTheme();
  // The unit the entry is STORED in, so the chart shows what the user typed.
  const { globalUnit } = useWeightUnit();
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
  const [bfSheetVisible, setBfSheetVisible] = useState(false);
  // The same three-mode field the intake uses. It used to be a plain number
  // box here, which meant the estimator was unreachable for anyone who
  // already had a profile — most users, most of the time.
  const [bodyFat, setBodyFat] = useState<BodyFatFieldValue>(emptyBodyFatValue());
  const [heightCm, setHeightCmState] = useState<number | undefined>(undefined);

  // ── Top-up state ───────────────────────────────────────────────────────────
  // needX is fixed at load time, not derived from the inputs, so the fields
  // don't disappear from under the user the moment they answer one.
  const [sex, setSex] = useState<Sex | null>(null);

  // How old each number is. The old screen asked "still accurate?" while
  // showing values with no dates, which is a question the user had no way to
  // answer. Now the screen answers it and only flags what has actually gone
  // stale.
  const [weightAgeDays, setWeightAgeDays] = useState<number | null>(null);
  const [bodyFatAgeDays, setBodyFatAgeDays] = useState<number | null>(null);

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

      if (profile?.sex) setSex(profile.sex);

      // Read straight from the key rather than through WorkoutStorage. An
      // earlier version imported that module as a default export, which it may
      // not be — the whole block then threw on its first line and the catch
      // swallowed it, so both dates silently never appeared. Reading the key
      // has no such dependency, and this only needs the newest timestamp, not
      // the write queue and quarantine machinery the helper exists for.
      // Was a raw AsyncStorage.getItem on the key, which bypassed the
      // gateway's backup fallback and corruption recovery — so a user whose
      // primary blob was damaged saw no date even though the backup held one.
      // The import concern in the comment above is real but applies to the
      // DEFAULT export; the named helper below is safe.
      let entries: any[] = [];
      try {
        const read = await WorkoutStorage.loadWeightHistoryResult();
        if (read.ok && Array.isArray(read.entries)) entries = read.entries;
      } catch {
        // leave it unknown: a missing date costs a label, never a value
      }

      // Sorted rather than assumed newest-last: several screens append here and
      // nothing guarantees the order.
      const byDate = (arr: any[]) =>
        arr.filter((e) => e?.date).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];

      const latestWeight = byDate(entries);
      if (latestWeight?.date) {
        const days = Math.floor((Date.now() - new Date(latestWeight.date).getTime()) / DAY_MS);
        if (Number.isFinite(days)) setWeightAgeDays(days);
      }

      try {
        // Sorted here rather than trusting the stored order. recordBodyFatReading
        // does sort before every write, so today this is belt and braces, but the
        // weight lookup directly above already distrusts array order, and having
        // the two halves of one block disagree is how the next writer gets it wrong.
        const readings = [...(await loadBodyFatReadings())].sort((a, b) =>
          a.dateISO.localeCompare(b.dateISO),
        );
        const latest = readings[readings.length - 1];
        if (latest) {
          const days = Math.floor((Date.now() - new Date(latest.dateISO).getTime()) / DAY_MS);
          if (Number.isFinite(days)) setBodyFatAgeDays(days);
        } else {
          // Fall back to a reading logged alongside a weigh-in. The dedicated
          // store only has data from screens routed through it, and four others
          // still write the profile scalar with no date, so an empty store does
          // not mean the user has never estimated.
          const withBf = byDate(entries.filter((e: any) => e?.bodyFatPct != null));
          if (withBf?.date) {
            const days = Math.floor((Date.now() - new Date(withBf.date).getTime()) / DAY_MS);
            if (Number.isFinite(days)) setBodyFatAgeDays(days);
          }
        }
      } catch {
        // leave it unknown
      }

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
        // ── RECORD IT, DO NOT JUST MIRROR IT, 19 Aug 2026 ─────────────────
        //
        // This used to write the profile scalar alone. Weight lives in two
        // stores — the profile every plan is calculated from, and
        // `weight_tracking_history`, the dated series the charts and the
        // phase-transition trend read — and correcting your weight here moved
        // only the first. So this screen showed the new number above its own
        // "logged N days ago" label computed from a history that had not moved,
        // and, worse, the trend that decides when a phase ends was missing this
        // weigh-in entirely.
        //
        // recordWeightEntry writes the entry FIRST with read-back verification
        // and mirrors the profile after, non-fatally — so the ordering that
        // cannot lose data now applies here too, and the profile update below
        // is no longer needed because the helper does it.
        const rec = await recordWeightEntry({
          weightKg: currentWeightKg,
          unit: globalUnit === 'lbs' ? 'lbs' : 'kg',
          origin: 'ConfirmStatsScreen',
        });
        if (!rec.ok) {
          console.error(
            '[ConfirmStats] weigh-in not recorded:',
            'reason' in rec ? rec.reason : 'unknown',
          );
          // Fall back to the profile write so the plan is at least calculated
          // from the number the user just typed. A missing history row is a
          // smaller loss than a plan built on a stale weight.
          await updateGoalsProfileField('currentWeightKg', currentWeightKg);
        }
      }
      if (newBodyFatPct !== originalBodyFatPct) {
        await updateGoalsProfileField('currentBodyFatPct', newBodyFatPct);
        if (newBodyFatPct != null) {
          await updateGoalsProfileField('bodyFatSource', bodyFat.source);
          // bodyFatHistory.ts names this screen as one of four that write the
          // bare profile scalar and leave no dated reading behind. Without this
          // the age label above can only ever come from the weight-entry
          // fallback, so a user who only ever estimates here sees no date, and
          // the stale marking can never fire.
          await recordBodyFatReading(newBodyFatPct, bodyFat.source, 'ConfirmStatsScreen');
        }
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

  const resolvedBodyFat = resolveBodyFat(bodyFat, sex ?? undefined, heightCm);

  // Stale is MARKED, never blocking. It is their body, and a number they have
  // not updated is not the same as one the plan cannot be built without.
  const weightStale = weightAgeDays != null && weightAgeDays >= WEIGHT_STALE_DAYS;
  const bodyFatStale = bodyFatAgeDays != null && bodyFatAgeDays >= BODY_FAT_STALE_DAYS;
  const anythingStale = weightStale || bodyFatStale;
  const sexForField = sex;

  // Missing fields must be filled to continue. They are not decoration: without
  // height there is no plausibility check, and without sex the phase model
  // falls back to male body-fat bands for everyone.
  const topUpComplete =
    true;

  if (loading) {
    return (
      <View style={[styles.container, styles.centerFill]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Glow color={themeColor} />
      {/* No centred title. "Quick check" two lines above a 34pt headline was
          two titles competing for the same job. */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
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
          <Text style={styles.eyebrow}>BEFORE WE BUILD</Text>
          <Text style={styles.title}>
            {anythingStale ? 'Worth a check.' : 'These still right?'}
          </Text>
          <Text style={styles.subtitle}>
            {anythingStale
              ? 'Your plan is calculated from these, and one of them has not moved in a while.'
              : 'Your plan is calculated from these. Change anything that has moved.'}
          </Text>

          {/* TOP-UP BRANCH DELETED 17 Aug 2026.
              
              It asked for sex and height when either was missing, under the
              title "A couple of gaps." Both are mandatory in onboarding — a
              user cannot reach this screen without having answered them — so
              the branch was unreachable and its only effect was to make this
              screen look like it might ask for things it never asks for.
              
              Age and activity left the same way earlier today, to the
              nutrition questionnaire. What remains is what this screen was
              always for: confirming the numbers that go stale. */}

          {/* Plain list rows: no card surface, no border, no icon tile. Two
              bordered cards for two values made the screen feel like a form to
              be completed rather than a list to be glanced at, which is the
              opposite of what a quick check is for. A hairline between them is
              enough separation. */}
          <TouchableOpacity
            style={styles.statRow}
            onPress={() => setWeightSheetVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Current weight"
          >
            <View style={styles.statRowBody}>
              <Text style={styles.statRowLabel}>Current weight</Text>
              {weightDisplay ? (
                <Text style={styles.statRowValue}>{weightDisplay}</Text>
              ) : (
                <Text style={styles.statRowUnset}>Not set</Text>
              )}
              {ageLabel(weightAgeDays, 'Logged') ? (
                <Text style={[styles.statRowAge, weightStale && styles.statRowAgeStale]}>
                  {ageLabel(weightAgeDays, 'Logged')}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={14} color="#3f3f46" />
          </TouchableOpacity>

          {/* A row, matching weight, rather than an inline field with a method
              picker above it. The three method buttons made "how do you want
              to answer" the first decision on a screen whose whole point is a
              glance and a tap, and the estimator already offers those paths
              inside itself. */}
          <TouchableOpacity
            style={styles.statRow}
            onPress={() => setBfSheetVisible(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Body fat"
          >
            <View style={styles.statRowBody}>
              <Text style={styles.statRowLabel}>Body fat</Text>
              {resolvedBodyFat != null ? (
                <Text style={styles.statRowValue}>{Math.round(resolvedBodyFat)}%</Text>
              ) : (
                <Text style={styles.statRowUnset}>Not set</Text>
              )}
              {ageLabel(bodyFatAgeDays, 'Estimated') ? (
                <Text style={[styles.statRowAge, bodyFatStale && styles.statRowAgeStale]}>
                  {ageLabel(bodyFatAgeDays, 'Estimated')}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={14} color="#3f3f46" />
          </TouchableOpacity>
          {/* Mounted collapsed: only its estimator sheet is wanted here, not
              its scale, which would duplicate the row above. */}
          <View style={styles.hiddenField} pointerEvents="box-none">
            <RouteBodyFatField
              value={bodyFat}
              onChange={setBodyFat}
              sex={sexForField ?? undefined}
              heightCm={heightCm}
              themeColor={themeColor}
              estimatorOpen={bfSheetVisible}
              onCloseEstimator={() => setBfSheetVisible(false)}
            />
          </View>
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

          {/* The ghost "Nothing has changed" button used to sit here. It called
              handleContinue, exactly as the button above does. Editing happens
              in the rows, so proceeding after an edit and proceeding without
              one are the same act, and offering two controls for it implied a
              difference that did not exist. */}
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
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  // Every size below was previously the value drawn in a 310px mockup frame,
  // copied unchanged onto a 393pt screen. That is 27% wider, which is why the
  // built screen read as a quarter too small and floated in empty space.
  glowWrap: {
    position: 'absolute',
    left: -190,
    top: -210,
    width: 760,
    height: 760,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 34,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 40,
    letterSpacing: -1,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#71717a',
    lineHeight: 23,
    marginBottom: 34,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 17,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#17171a',
  },
  statRowBody: { flex: 1 },
  statRowLabel: { fontSize: 15, color: '#8e8e93' },
  statRowValue: { fontSize: 19, fontWeight: '700', color: '#e4e4e7', marginTop: 4 },
  // Amber, not grey. A field the plan cannot be built without was rendering in
  // the faintest colour on the screen, which put the only blocking state below
  // the merely stale one in visual priority.
  statRowUnset: { fontSize: 19, fontWeight: '600', color: '#f0b429', marginTop: 4 },
  statRowAge: { fontSize: 12.5, color: '#5b5b62', marginTop: 4 },
  // Amber, not red: an old number is a gap to close, not an error.
  statRowAgeStale: { color: '#f0b429' },

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
  optionalTag: {
    fontSize: 11,
    color: '#52525b',
    fontWeight: '400',
  },
  // Height zero, overflow hidden: the component renders a scale we do not want
  // here, but its estimator modal is the one we do.
  hiddenField: { height: 0, overflow: 'hidden' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2, color: '#5b5b62', marginBottom: 10 },

  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#0a0a0b',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
  },
  ctaButton: {
    height: 56,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
  },
});