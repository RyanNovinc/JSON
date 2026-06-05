import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
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
 * Keyboard behaviour:
 *   - Input is near the TOP of the sheet content, so KeyboardAvoidingView
 *     pushing the sheet up never hides it.
 *   - On iOS we use behavior='padding', which pushes the entire sheet up
 *     when the keyboard appears.
 *   - decimal-pad keyboard with returnKeyType='done' gives an explicit
 *     dismiss path even on iPhones with no hardware return key behaviour.
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

  // Reset form + prefill the unit from the most recent entry every time
  // the sheet opens. Don't prefill the weight number itself — encouraging
  // the user to retype is intentional (no accidental "save without
  // weighing" by tapping Save on yesterday's number).
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
        const latest = sorted[0];
        setLatestEntry(latest);
      } catch (e) {
        console.error('WeightEntrySheet prefill failed', e);
      }
    })();
    return () => {
      active = false;
    };
  }, [visible]);

  // Clear local state on close so reopening doesn't show last attempt
  const handleClose = useCallback(() => {
    setWeight('');
    setNotes('');
    setShowNotes(false);
    setSaving(false);
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop — tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={handleClose}>
        {/* Inner Pressable swallows touches on the sheet itself so they
            don't bubble back up to the backdrop and close it. */}
        <Pressable onPress={() => { /* swallow */ }} style={{ width: '100%' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View
              style={[
                styles.sheet,
                {
                  paddingBottom: Math.max(insets.bottom, 16) + 16,
                  borderColor: themeColor + '40',
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

              {/* Weight input row — sits near the top so the keyboard
                  never covers it once the sheet is pushed up. */}
              <View style={styles.inputRow}>
                <View
                  style={[
                    styles.inputBox,
                    { borderColor: themeColor },
                  ]}
                >
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
                  <Text style={styles.unitText}>
                    {unit}
                  </Text>
                  <Text style={styles.unitSubtext}>
                    Change in Profile settings
                  </Text>
                </View>
              </View>

              {/* Notes toggle — collapsed by default to keep the sheet
                  short. Tapping reveals a small text area. */}
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
                  {
                    backgroundColor:
                      valid && !saving ? themeColor : '#1c1c1f',
                  },
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
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
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