import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Keyboard,
  Platform,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useWeightUnit } from '../../contexts/WeightUnitContext';
import { WorkoutStorage } from '../../utils/storage';
import { loadGoalsProfile, saveGoalsProfile } from '../../utils/goalsProfileStorage';
import type { GoalsProfile } from '../../utils/goalsProfile';
import {
  resolveNutritionAnswers,
  updateNutritionField,
} from '../../utils/nutritionQuestionnaireStorage';
import { finalizeNutrition } from '../../utils/nutritionMacros';
import { useNavigation } from '@react-navigation/native';
import {
  evaluateTransition,
  shouldPromptForCrossing,
  markCrossingDismissed,
  clearCrossingDismissals,
} from '../../utils/phaseTransition';
import type {
  TransitionCheck,
  WeightReading,
  PreciseBodyFatReading,
} from '../../utils/phaseTransition';
import { isPreciseBodyFatSource } from '../../utils/goalsProfile';
import type { BodyFatSource } from '../../utils/goalsProfile';
import { loadPhaseJourney } from '../../utils/phaseJourney';

/**
 * WeightEntrySheet — the single reusable bottom sheet for logging weight.
 *
 * Used from:
 *   1. WeightTrackerScreen from Profile (dashboard context)
 *   2. ConfirmStatsScreen, the returning-user stats check (entry context)
 *
 * It was previously opened from N3AboutYouScreen too. That screen was removed
 * on 9 Aug 2026 when sex, age, height and weight moved onto GoalsProfile via
 * the shared intake, so the nutrition questionnaire no longer asks for weight
 * at all. The finalizeNutrition-on-save behaviour below still matters for the
 * remaining callers.
 *
 * Why one component and not two flows:
 *   - The actual entry UI is identical in both contexts (number + unit + notes)
 *   - Single source of truth for "what does saving a weight do"
 *   - Macro recalc on save is centralised — finalizeNutrition() runs IFF the
 *     nutrition questionnaire has been completed (i.e. there's something to
 *     recalc against). This fixes the bug where the old WeightTracker
 *     duplicated the BMR formula inline and could drift from nutritionMacros.
 *
 * Animation:
 *   - animationType is "none" on the Modal. We drive two animations off a
 *     single `progress` value (0 hidden → 1 shown): the backdrop FADES via
 *     opacity, and the panel SLIDES up via translateY. The old
 *     animationType="slide" moved backdrop + panel together, which is why
 *     the dark overlay rode up instead of fading in.
 *   - The Modal stays mounted through the exit animation (`mounted` state),
 *     then unmounts once the slide-out finishes.
 *
 * Keyboard behaviour:
 *   - We listen for the keyboard directly and lift the whole panel by its
 *     height (folded into the same translateY). This replaces
 *     KeyboardAvoidingView, which didn't reliably lift a bottom-anchored
 *     sheet on iOS and did nothing at all on Android (behavior was
 *     undefined there), leaving the input covered.
 *   - decimal-pad keyboard with returnKeyType='done' gives an explicit
 *     dismiss path.
 *
 * Photos are deliberately NOT in this entry flow. They're a per-entry
 * add-on accessed from the history detail view in WeightTracker.
 *
 * Save-path hardening:
 *   - The save used to do `loadWeightHistory()` then save
 *     `[entry, ...history]`. When the read failed it returned [], so the
 *     save wrote a single-entry array over the user's entire history and
 *     the loss looked like a legitimate new state. It now uses
 *     loadWeightHistoryResult() and ABORTS when the read did not
 *     succeed.
 *   - The write is verified by reading back and checking the new entry's
 *     id is present, before onSaved fires or the sheet closes.
 *   - A failed save used to only flip `saving` back to false, leaving
 *     the user staring at an unchanged sheet with no idea why. It now
 *     surfaces an alert.
 *   - Entry ids carry a random suffix; Date.now() alone collides when
 *     two saves land in the same millisecond, and duplicate ids make
 *     later deletes remove the wrong row.
 *   - Macro recalc runs only after the weight is confirmed saved.
 */

// Where "Update plans" lands: the create chooser, which holds the route card
// and both plan cards. AppNavigator registers CreateChooserScreen as
// 'CreateFlow' (modal presentation, the center-button flow) — verified
// against AppNavigator.tsx:658 on 9 Aug 2026. Change ONLY this constant if
// that registration ever moves.
const CREATE_CHOOSER_ROUTE = 'CreateFlow';

// Phase-kind vocabulary for the transition prompt, lowercase because these
// land mid-sentence.
const TRANSITION_KIND_LABELS: Record<string, string> = {
  recomp: 'recomp',
  build: 'build',
  trim: 'trim',
  reveal: 'final cut',
};

/** Title + message for the transition alert. The single-phase (HARD RULE 4)
 *  crossing has no next phase — that is the journey ENDING, not a phase
 *  change, and it gets its own copy. */
function transitionAlertContent(check: TransitionCheck): {
  title: string;
  message: string;
} {
  // COPY NOW LEADS ON WEIGHT, 18 Aug 2026. Detection moved off body fat
  // because consumer readings cannot resolve the change a phase targets, and
  // the message has to match what was actually measured or the user is told
  // their body fat "reached" a number no device of theirs can see. The body
  // fat still appears — it is what the phase MEANS — but as the interpretation,
  // not the evidence.
  const kind = TRANSITION_KIND_LABELS[check.currentKind] ?? check.currentKind;
  const at = check.thresholdKg != null ? `${check.thresholdKg} kg` : 'your target';

  // ── ARRIVING TOO FAST IS NOT AN ACHIEVEMENT ───────────────────────────────
  //
  // The single most likely way a weight target gets misread: hit 76.7 kg by any
  // means and the app says well done. But a large share of weight lost quickly
  // is lean tissue — Garthe 2011's slow group GAINED lean while losing fat and
  // her fast group merely held it — so a target met at double the prescribed
  // rate has cost the user exactly what the phase existed to protect.
  //
  // Same on a build: gaining faster than prescribed is fat, not muscle, because
  // the rate muscle can be built at is capped and food does not raise the cap.
  //
  // So this branch reaches the SAME conclusion — the phase is over, move on —
  // but refuses to call it a win, and says what it cost. It deliberately does
  // not scold or tell them to undo anything: it is already done, and the useful
  // thing now is that they slow down in the next phase.
  if (check.pace === 'too_fast') {
    const measured =
      check.ratePctPerWeek != null && check.targetRatePctPerWeek != null
        ? `${Math.abs(check.ratePctPerWeek).toFixed(1)}% of your bodyweight a week against the ` +
          `${Math.abs(check.targetRatePctPerWeek).toFixed(1)}% this phase planned for`
        : 'faster than this phase planned for';
    const losing = (check.targetRatePctPerWeek ?? 0) < 0;
    return {
      title: `You've hit ${at} — faster than planned`,
      message:
        `That's ${measured}. ` +
        (losing
          ? 'Weight lost that quickly is partly muscle, so you may be lighter than the plan intended but carrying less of what you were training for. '
          : 'Weight gained that quickly is mostly fat rather than muscle, since muscle can only be built so fast. ') +
        'Nothing to undo — worth easing off to the planned rate from here.',
    };
  }
  // A SCAN GETS ITS OWN COPY. When the scan fires and the weight has not, the
  // user is being told a phase is over while their scale disagrees — and left
  // unexplained that reads as a bug. Naming the evidence is what makes it read
  // as a better measurement instead.
  if (check.reachedBy === 'scan') {
    const scanKind = TRANSITION_KIND_LABELS[check.currentKind] ?? check.currentKind;
    const next = check.nextKind
      ? ` Next up: a ${TRANSITION_KIND_LABELS[check.nextKind] ?? check.nextKind}` +
        (check.nextExitBodyFatPct != null ? ` to ~${check.nextExitBodyFatPct}%.` : '.')
      : ' That was the plan, and you did it.';
    return {
      title: `Your ${scanKind} is done`,
      message:
        `Your scan puts you past the ${check.thresholdBodyFatPct}% this phase was ` +
        'aiming for, so it counts even though your weight trend has not got there ' +
        'yet — a scan measures this directly and the scale only infers it.' +
        next,
    };
  }

  if (!check.nextKind) {
    return {
      title: 'You\u2019ve reached your goal',
      message:
        `Your weight trend has reached ${at}, which is about ` +
        `${check.thresholdBodyFatPct}% body fat \u2014 the ${kind} that finishes ` +
        'your route is complete. That was the plan, and you did it.',
    };
  }
  const next = TRANSITION_KIND_LABELS[check.nextKind] ?? check.nextKind;
  const nextTarget =
    check.nextExitBodyFatPct != null ? ` to ~${check.nextExitBodyFatPct}%` : '';
  return {
    title: `Your ${kind} is done`,
    message:
      `Your weight trend has reached ${at}, which is about ` +
      `${check.thresholdBodyFatPct}% body fat \u2014 this phase is complete. ` +
      `Next up: a ${next}${nextTarget}. ` +
      'Update your plans so they target the new phase.',
  };
}

interface WeightEntry {
  id: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;
  notes?: string;
  photos?: any[];
  /** Optional body composition reading taken at the same time as the
   * weight. Stored per entry so it's trackable over time, and mirrored
   * to GoalsProfile.currentBodyFatPct so the questionnaire and macro
   * calc read the same number. */
  bodyFatPct?: number;
  /**
   * Which device produced `bodyFatPct`, recorded PER ENTRY rather than read
   * from the profile.
   *
   * The profile carries one `bodyFatSource` describing how the user measures
   * TODAY. That is the wrong thing to ask of a history: someone who bought a
   * DXA in March has scale readings before it and scans after, and stamping
   * every past entry with their current method would either promote old
   * bathroom-scale numbers to scan-grade or demote real scans. Provenance
   * belongs to the reading, not to the person.
   *
   * Absent on every entry written before 19 Aug 2026, and absent is treated as
   * imprecise — those readings keep being displayed and stop being trusted,
   * which is the safe direction when the device is unknowable.
   */
  bodyFatSource?: BodyFatSource;
}

// GoalsProfile carries currentWeightKg / currentBodyFatPct. Declared
// loosely here for the same reason GoalEntrySheet does: the profile
// round-trips through storage as-is.
type GoalsProfileLoose = GoalsProfile & {
  currentWeightKg?: number | null;
  currentBodyFatPct?: number | null;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  /**
   * Fired AFTER the weight has been saved to storage. The parent can use
   * this to refresh its own state (the dashboard's chart, or the
   * questionnaire's local weight value).
   */
  onSaved?: (entry: WeightEntry) => void;
  /**
   * Optional title override. Defaults to "Log weight". The questionnaire
   * context uses "Update weight" instead.
   */
  title?: string;
}

/**
 * The measurement methods a user can pick from, and what each is FOR.
 *
 * ONLY DXA COUNTS TOWARD ENDING A PHASE — see PRECISE_BODY_FAT_SOURCES. The
 * notes say that plainly rather than warning about accuracy on every option,
 * because a warning on every option is a paragraph people read once and then
 * stop seeing. Telling someone what their reading is for is more useful than
 * telling them what it is not.
 */
const BF_SOURCE_OPTIONS: ReadonlyArray<{ id: BodyFatSource; label: string; note: string }> = [
  {
    id: 'scale',
    label: 'Smart scale',
    note: 'Tracked and charted. Your weight is what ends a phase — scales are usually out by several points and move with hydration.',
  },
  {
    id: 'calipers',
    label: 'Calipers',
    note: 'Tracked and charted. Good for spotting a direction if the same person measures each time, but your weight is what ends a phase.',
  },
  {
    id: 'tape',
    label: 'Tape',
    note: 'Tracked and charted. Depends on hitting the same spot each time, so your weight is what ends a phase.',
  },
  {
    id: 'dxa',
    label: 'DXA scan',
    note: 'Precise enough to count. A scan can finish a phase on its own, alongside your weight.',
  },
];

export default function WeightEntrySheet({
  visible,
  onClose,
  onSaved,
  title = 'Log weight',
}: Props) {
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { globalUnit, setGlobalUnit, convertWeight } = useWeightUnit();

  const [weight, setWeight] = useState('');
  const unit = globalUnit;
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [latestEntry, setLatestEntry] = useState<WeightEntry | null>(null);

  // Body fat %. Optional, and deliberately NOT prefilled with the last
  // value — carrying it forward would stamp a stale reading onto every
  // weigh-in and draw a flat BF line that looks like measured data. The
  // previous reading shows as a hint instead, same as the weight.
  const [bodyFat, setBodyFat] = useState('');
  // For the transition prompt's "Update plans" action. Both parents
  // (WeightTrackerScreen, ConfirmStatsScreen) are registered screens, so the
  // hook always has a navigator to reach.
  const navigation = useNavigation<any>();
  const [bfFocused, setBfFocused] = useState(false);
  /**
   * How this reading was measured. Defaults to the profile's current method so
   * a regular DXA user is not re-picking it every weigh-in, and falls back to
   * 'scale' rather than to nothing — an unset source would be treated as
   * imprecise, which is right for legacy rows but wrong for a user who is
   * actively telling us a number now.
   */
  const [bodyFatSource, setBodyFatSource] = useState<BodyFatSource>('scale');
  const [lastBodyFatPct, setLastBodyFatPct] = useState<number | null>(null);

  // ---------- Animation state ----------
  // Keep the modal mounted through the exit animation; unmount after.
  const [mounted, setMounted] = useState(false);
  // Measured panel height — drives how far translateY travels on entrance.
  const [sheetH, setSheetH] = useState(600);
  const progress = useRef(new Animated.Value(0)).current; // 0 hidden, 1 shown
  const kb = useRef(new Animated.Value(0)).current; // current keyboard height

  // Drive open/close. On open we also reset the form here (previously this
  // happened on close, which flashed cleared inputs during the slide-out).
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setWeight('');
      setNotes('');
      setBodyFat('');
      setShowNotes(false);
      setSaving(false);
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        useNativeDriver: false,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Track keyboard height and animate the panel up by it. On iOS the
  // *Will* events fire in step with the keyboard so the lift tracks
  // smoothly; on Android only the *Did* events report a usable height.
  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: any) =>
      Animated.timing(kb, {
        toValue: e?.endCoordinates?.height ?? 0,
        duration: e?.duration || 250,
        useNativeDriver: false,
      }).start();

    const onHide = (e: any) =>
      Animated.timing(kb, {
        toValue: 0,
        duration: e?.duration || 200,
        useNativeDriver: false,
      }).start();

    const showSub = Keyboard.addListener(showEvt, onShow);
    const hideSub = Keyboard.addListener(hideEvt, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [kb]);

  // Prefill the unit hint from the most recent entry every time the sheet
  // opens. Don't prefill the weight number itself — encouraging the user
  // to retype is intentional (no accidental "save without weighing" by
  // tapping Save on yesterday's number).
  useEffect(() => {
    if (!visible) return;
    let active = true;
    (async () => {
      try {
        const history = await WorkoutStorage.loadWeightHistory();
        if (!active || !history || history.length === 0) return;
        const sorted = [...history].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setLatestEntry(sorted[0]);

        // BF% is logged less often than weight, so the most recent
        // reading usually isn't on the most recent entry.
        const lastWithBf = sorted.find(
          (e: WeightEntry) => typeof e.bodyFatPct === 'number'
        );
        setLastBodyFatPct(lastWithBf?.bodyFatPct ?? null);
      } catch (e) {
        console.error('WeightEntrySheet prefill failed', e);
      }
    })();
    return () => {
      active = false;
    };
  }, [visible]);

  // Dismiss the keyboard on close so it animates down alongside the sheet.
  // Form reset now happens on open (see effect above).
  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  // Parse and validate. Allow decimal (81.5) but block negative, zero,
  // and absurd values that suggest a typo.
  const parsedWeight = parseFloat(weight.replace(',', '.'));
  const weightValid =
    Number.isFinite(parsedWeight) &&
    parsedWeight > 20 && // anything under 20kg/lbs is almost certainly a typo
    parsedWeight < 500;

  // Body fat is optional: blank is valid. Bounds match GoalEntrySheet's
  // BF% target so the two fields accept the same range.
  const bfRaw = bodyFat.trim();
  const parsedBf = bfRaw === '' ? null : parseFloat(bfRaw.replace(',', '.'));
  const bfValid =
    parsedBf == null ||
    (Number.isFinite(parsedBf) && parsedBf >= 3 && parsedBf <= 60);
  const bfInvalidVisible = bfRaw !== '' && !bfValid;

  const valid = weightValid && bfValid;

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const entry: WeightEntry = {
        // Date.now() alone collides if two saves land in the same
        // millisecond, and a duplicate id makes deletes remove the wrong
        // row later. Suffix keeps ids unique without a uuid dependency.
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        weight: Math.round(parsedWeight * 10) / 10, // 1 decimal place
        unit,
        date: new Date().toISOString(),
        notes: notes.trim() || undefined,
        bodyFatPct:
          parsedBf == null ? undefined : Math.round(parsedBf * 10) / 10,
        // Stamped at the moment of entry, so the history stays honest when the
        // user changes how they measure.
        bodyFatSource: parsedBf == null ? undefined : bodyFatSource,
      };

      // Read the CURRENT history before prepending. loadWeightHistoryResult
      // reports whether the read actually succeeded — a plain [] cannot
      // distinguish "no entries yet" from "could not read", and writing
      // [entry, ...[]] on a failed read replaces the user's entire history
      // with a single entry. That is the data-loss path this guards.
      const read = await WorkoutStorage.loadWeightHistoryResult();
      if (!read.ok) {
        console.error('WeightEntrySheet: refusing to save, store unreadable', read.reason);
        Alert.alert(
          'Could not read your history',
          'Your saved weights could not be read, so nothing was changed. Close and reopen the app, then try again.'
        );
        setSaving(false);
        return;
      }

      const history = read.entries || [];
      await WorkoutStorage.saveWeightHistory([entry, ...history]);

      // Confirm the entry actually landed before telling the parent it
      // did. A silently dropped write used to surface weeks later as a
      // missing weigh-in.
      const confirmed = await WorkoutStorage.loadWeightHistoryResult();
      if (!confirmed.ok || !confirmed.entries.some((e: any) => e?.id === entry.id)) {
        console.error('WeightEntrySheet: save could not be verified', confirmed.reason);
        Alert.alert(
          'Could not save',
          'That weight could not be saved. Please try again.'
        );
        setSaving(false);
        return;
      }

      // Mirror the reading into GoalsProfile, the store the
      // questionnaire and ConfirmStatsScreen both read. Without this,
      // logging a weigh-in here left the questionnaire showing whatever
      // was captured the last time the user walked the flow, and there
      // was no path at all for current BF% — it could only be set once
      // on ConfirmStatsScreen. Runs after the entry is confirmed saved
      // and is non-fatal: the weight is already safely stored.
      try {
        const weightKgForProfile =
          entry.unit === 'lbs' ? entry.weight * 0.453592 : entry.weight;
        const prev = (await loadGoalsProfile()) as GoalsProfileLoose | null;
        const nextProfile: GoalsProfileLoose = {
          ...(prev ?? ({} as GoalsProfileLoose)),
          currentWeightKg: weightKgForProfile,
          // Only overwrite BF% when one was actually entered. A blank
          // field means "not measured today", not "reset to unknown".
          ...(entry.bodyFatPct != null
            ? { currentBodyFatPct: entry.bodyFatPct }
            : {}),
        };
        await saveGoalsProfile(nextProfile);
      } catch (e) {
        console.error('WeightEntrySheet profile sync failed', e);
      }

      // Transition detection (9 Aug 2026): only when THIS save carried a
      // body-fat reading, and never fatally — the weigh-in is already safely
      // stored, so a failure here costs a prompt, not data. The trend reads
      // the just-confirmed history (new entry included), and the roadmap is
      // derived fresh from the just-mirrored profile, so the check sees
      // exactly what the prompts will see on regeneration.
      let transition: TransitionCheck | null = null;
      // GATE MOVED FROM BODY FAT TO WEIGHT. This used to run only when the save
      // carried a body-fat reading, because that was what detection read. Every
      // weigh-in carries a weight, so the check now runs on all of them — which
      // is also the point: a user who never enters body fat can still finish a
      // phase.
      if (Number.isFinite(entry.weight) && entry.weight > 0) {
        try {
          const profileNow = await loadGoalsProfile();
          if (profileNow) {
            // NORMALISED TO KILOGRAMS. Entries are stored in the unit they
            // were typed in, so a user who switched from lbs to kg has both in
            // their history — feeding those straight to the trend would read a
            // 176 and an 80 as a 96 kg swing. The same conversion is already
            // applied above when mirroring to the profile.
            // PRECISE SOURCES ONLY. phaseTransition never sees a source field,
            // so filtering here is what stops a smart-scale reading ending a
            // phase — the exact failure the weight path exists to prevent.
            // Consumer BIA is ±4-8 percentage points against DXA; a phase moves
            // someone 2-3 points. Only a scan clears that.
            const scans: PreciseBodyFatReading[] = [entry, ...history]
              .filter(
                (e: any) =>
                  typeof e?.bodyFatPct === 'number' &&
                  e.bodyFatPct > 0 &&
                  e?.date &&
                  isPreciseBodyFatSource(e.bodyFatSource),
              )
              .map((e: any) => ({ dateISO: e.date, bodyFatPct: e.bodyFatPct }));

            const readings: WeightReading[] = [entry, ...history]
              .filter((e: any) => typeof e?.weight === 'number' && e.weight > 0 && e?.date)
              .map((e: any) => ({
                dateISO: e.date,
                weightKg: e.unit === 'lbs' ? e.weight * 0.453592 : e.weight,
              }));
            // The journey count is what tells evaluateTransition WHERE the
            // user is standing. Without it the detector falls back to
            // roadmap.phases[0] — the opener, a definition rather than a
            // position — so it could only ever notice the FIRST crossing and
            // nobody was advanced automatically past phase one.
            const journey = await loadPhaseJourney();
            const check = evaluateTransition(
              profileNow,
              readings,
              undefined,
              Date.now(),
              journey.length,
              scans,
            );
            if (check?.crossed && (await shouldPromptForCrossing(check))) {
              transition = check;
            }
          }
        } catch (e) {
          console.error('WeightEntrySheet transition check failed', e);
        }
      }

      // If the nutrition questionnaire has been completed, push the new
      // weight through finalizeNutrition() so calories/macros stay in
      // sync. This replaces the old inline BMR recalc in WeightTracker.
      // Runs only AFTER the weight is confirmed saved — recalculating
      // macros against a weight that was never persisted would leave the
      // two stores disagreeing.
      try {
        const answers = await resolveNutritionAnswers();
        const hasQuestionnaire =
          !!answers &&
          !!answers.gender &&
          answers.age != null &&
          answers.height != null &&
          answers.activityLevel;
        if (hasQuestionnaire) {
          // Convert lbs → kg for the calculation; macros are kg-based
          const weightKg =
            entry.unit === 'lbs' ? entry.weight * 0.453592 : entry.weight;
          await updateNutritionField('weight', weightKg);
          await finalizeNutrition({ ...answers, weight: weightKg });
        }
      } catch (e) {
        // Non-fatal — the weight itself is saved
        console.error('WeightEntrySheet macro recalc failed', e);
      }

      onSaved?.(entry);
      handleClose();

      // After the modal is gone — an Alert raised while a statusBarTranslucent
      // modal is dismissing can be swallowed on iOS, hence the delay.
      if (transition) {
        const check = transition;
        const { title, message } = transitionAlertContent(check);
        setTimeout(() => {
          if (!check.nextKind) {
            // Journey complete — acknowledge and stop re-firing.
            Alert.alert(title, message, [
              { text: 'OK', onPress: () => { markCrossingDismissed(check); } },
            ]);
            return;
          }
          Alert.alert(title, message, [
            {
              text: 'Not now',
              style: 'cancel',
              onPress: () => { markCrossingDismissed(check); },
            },
            {
              text: 'Update plans',
              onPress: () => {
                clearCrossingDismissals();
                navigation.navigate(CREATE_CHOOSER_ROUTE);
              },
            },
          ]);
        }, 350);
      }
    } catch (e) {
      console.error('WeightEntrySheet save failed', e);
      // The old version failed silently here: the sheet stayed open with
      // no explanation and the user assumed it had saved.
      Alert.alert('Could not save', 'That weight could not be saved. Please try again.');
      setSaving(false);
    }
  };

  // Show a small "last entry" hint above the input, converting to the
  // currently selected unit if the stored unit differs.
  const lastWeightHint = latestEntry
    ? (() => {
        const displayWeight =
          latestEntry.unit !== unit
            ? convertWeight(latestEntry.weight, latestEntry.unit, unit)
            : latestEntry.weight;
        return `Last: ${displayWeight} ${unit}`;
      })()
    : null;

  // Panel transform: entrance slide (sheetH → 0 as progress 0 → 1) minus
  // the current keyboard height, so the panel lifts above the keyboard.
  const translateY = Animated.subtract(
    progress.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] }),
    kb
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Backdrop fades in via opacity; tap anywhere outside to dismiss */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Panel slides up and lifts above the keyboard */}
        <Animated.View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - sheetH) > 1) setSheetH(h);
          }}
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 16,
              borderColor: themeColor + '40',
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Grab handle */}
          <View style={styles.handle} />

          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          {/* Last entry hint */}
          {lastWeightHint && (
            <Text style={styles.lastHint}>{lastWeightHint}</Text>
          )}

          {/* Weight input row */}
          <View style={styles.inputRow}>
            <View style={[styles.inputBox, { borderColor: themeColor }]}>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="0.0"
                placeholderTextColor="#3f3f46"
                keyboardType="decimal-pad"
                returnKeyType="done"
                autoFocus
                maxLength={5}
                onSubmitEditing={handleSave}
              />
            </View>

            <TouchableOpacity
              style={styles.unitDisplay}
              onPress={() => setGlobalUnit(unit === 'kg' ? 'lbs' : 'kg')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${unit === 'kg' ? 'pounds' : 'kilograms'}`}
            >
              <Text style={styles.unitText}>{unit}</Text>
              <Text style={styles.unitSubtext}>Applies across the app</Text>
            </TouchableOpacity>
          </View>

          {/* Body fat % — optional, sits directly under the weight so
              the two read as one reading taken at the same time. */}
          <View
            style={[
              styles.bfRow,
              {
                borderColor: bfFocused ? themeColor : '#27272a',
                borderWidth: bfFocused ? 1.5 : StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={styles.bfLabelWrap}>
              <Text style={styles.bfLabel}>Body fat</Text>
              <Text style={styles.bfOptional}>
                {lastBodyFatPct != null
                  ? `optional · last ${lastBodyFatPct}%`
                  : 'optional'}
              </Text>
            </View>
            <TextInput
              style={styles.bfInput}
              value={bodyFat}
              onChangeText={setBodyFat}
              onFocus={() => setBfFocused(true)}
              onBlur={() => setBfFocused(false)}
              placeholder="—"
              placeholderTextColor="#3f3f46"
              keyboardType="decimal-pad"
              returnKeyType="done"
              maxLength={4}
              selectionColor={themeColor}
              accessibilityLabel="Current body fat percentage, optional"
            />
            <Text style={styles.bfPercent}>%</Text>
          </View>

          {/* HOW IT WAS MEASURED. Only shown once a number has been typed —
              asking an empty field how it was measured is noise, and body fat
              is optional.

              This exists because 'reported' used to cover a DXA scan and a
              bathroom scale alike, and the difference between them is the
              difference between a reading that can end a phase (±1-2 points)
              and one that cannot (±4-8). The app could not see it. */}
          {bodyFat.trim().length > 0 && (
            <>
              <View style={styles.srcRow}>
                {BF_SOURCE_OPTIONS.map((opt) => {
                  const active = bodyFatSource === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.srcChip,
                        active && { borderColor: themeColor, backgroundColor: '#16232a' },
                      ]}
                      onPress={() => setBodyFatSource(opt.id)}
                      activeOpacity={0.85}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={`${opt.label}. ${opt.note}`}
                    >
                      <Text style={[styles.srcChipText, active && { color: themeColor }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* One line, rewritten per source. Says what the reading is FOR
                  rather than warning about accuracy, because a warning on every
                  option is a paragraph people stop seeing. */}
              <Text style={styles.srcNote}>
                {BF_SOURCE_OPTIONS.find((o) => o.id === bodyFatSource)?.note}
              </Text>
            </>
          )}

          {bfInvalidVisible && (
            <Text style={styles.errorText}>
              Body fat should be between 3 and 60, or left blank.
            </Text>
          )}

          {/* Notes toggle — collapsed by default to keep the sheet short.
              Tapping reveals a small text area. */}
          {!showNotes ? (
            <TouchableOpacity
              style={styles.notesToggle}
              onPress={() => setShowNotes(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color="#71717a" />
              <Text style={styles.notesToggleText}>Add note</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.notesWrap}>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. morning, after workout"
                placeholderTextColor="#52525b"
                maxLength={120}
                returnKeyType="done"
                blurOnSubmit
              />
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: valid && !saving ? themeColor : '#1c1c1f' },
            ]}
            onPress={handleSave}
            disabled={!valid || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#0a0a0b" />
            ) : (
              <Text
                style={[
                  styles.saveText,
                  { color: valid ? '#0a0a0b' : '#3f3f46' },
                ]}
              >
                Save
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: '#131316',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#3f3f46',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastHint: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  inputBox: {
    flex: 1,
    backgroundColor: '#0a0a0b',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  input: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
    paddingVertical: 14,
    letterSpacing: -0.5,
  },
  unitDisplay: {
    backgroundColor: '#0a0a0b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3f3f46',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  unitSubtext: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  bfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  bfLabelWrap: {
    flex: 1,
  },
  bfLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  bfOptional: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  srcRow: { flexDirection: 'row', gap: 7, marginTop: 10, flexWrap: 'wrap' },
  srcChip: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    backgroundColor: '#17171a',
  },
  srcChipText: { fontSize: 12, color: '#8e8e93' },
  srcNote: { fontSize: 12, lineHeight: 18, color: '#6b6b70', marginTop: 8 },

  bfInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'right',
    minWidth: 56,
    paddingVertical: 2,
  },
  bfPercent: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#f87171',
    marginBottom: 10,
  },
  notesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  notesToggleText: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
  },
  notesWrap: {
    backgroundColor: '#0a0a0b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  notesInput: {
    fontSize: 14,
    color: '#ffffff',
    paddingVertical: 11,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
  },
});