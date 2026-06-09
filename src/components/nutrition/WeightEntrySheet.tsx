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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useWeightUnit } from '../../contexts/WeightUnitContext';
import { WorkoutStorage } from '../../utils/storage';
import {
  loadNutritionAnswers,
  updateNutritionField,
} from '../../utils/nutritionQuestionnaireStorage';
import { finalizeNutrition } from '../../utils/nutritionMacros';

/**
 * WeightEntrySheet — the single reusable bottom sheet for logging weight.
 *
 * Used from:
 *   1. N3AboutYouScreen during the nutrition questionnaire (entry context)
 *   2. WeightTrackerScreen from Profile (dashboard context)
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
 */

interface WeightEntry {
  id: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;
  notes?: string;
  photos?: any[];
}

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

export default function WeightEntrySheet({
  visible,
  onClose,
  onSaved,
  title = 'Log weight',
}: Props) {
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { globalUnit } = useWeightUnit();

  const [weight, setWeight] = useState('');
  const unit = globalUnit; // Use global unit preference instead of local state
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [latestEntry, setLatestEntry] = useState<WeightEntry | null>(null);

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
  const valid =
    Number.isFinite(parsedWeight) &&
    parsedWeight > 20 && // anything under 20kg/lbs is almost certainly a typo
    parsedWeight < 500;

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const entry: WeightEntry = {
        id: Date.now().toString(),
        weight: Math.round(parsedWeight * 10) / 10, // 1 decimal place
        unit,
        date: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };

      const history = await WorkoutStorage.loadWeightHistory();
      await WorkoutStorage.saveWeightHistory([entry, ...history]);

      // If the nutrition questionnaire has been completed, push the new
      // weight through finalizeNutrition() so calories/macros stay in
      // sync. This replaces the old inline BMR recalc in WeightTracker.
      try {
        const answers = await loadNutritionAnswers();
        const hasQuestionnaire =
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
    } catch (e) {
      console.error('WeightEntrySheet save failed', e);
      setSaving(false);
    }
  };

  // Show a small "last entry" hint above the input, since prefilling the
  // unit but not the number can otherwise feel disconnected.
  const lastWeightHint = latestEntry
    ? `Last: ${latestEntry.weight} ${latestEntry.unit}`
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

            <View style={styles.unitDisplay}>
              <Text style={styles.unitText}>{unit}</Text>
              <Text style={styles.unitSubtext}>Change in Profile settings</Text>
            </View>
          </View>

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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
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