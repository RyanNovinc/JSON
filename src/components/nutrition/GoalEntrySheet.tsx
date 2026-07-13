import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { loadGoalsProfile, saveGoalsProfile } from '../../utils/goalsProfileStorage';
import type { GoalsProfile } from '../../utils/goalsProfile';

/**
 * GoalEntrySheet — edit goal weight + BF% target in place.
 *
 * Visually mirrors WeightEntrySheet ("Log weight"): handle, bold title
 * with a circular close button, a "Current: X kg" caption where the
 * weight sheet shows "Last: X kg", the big accent-bordered input with a
 * companion card on the right (BF% target takes the unit card's slot),
 * and the same full-width Save with a dim disabled state. Remove goal
 * sits under Save as a quiet destructive action.
 *
 * Sync model: reads and writes GoalsProfile — the single source of
 * truth the questionnaire also reads — so a goal edited here shows up
 * everywhere with no extra plumbing. Verify the questionnaire's goal
 * step hydrates from GoalsProfile on open rather than a stale draft.
 *
 * Start anchor: whenever the goal *weight* is set or changed, the sheet
 * snapshots the user's current weight into startWeightKg. That's what
 * the tracker's progress bar anchors to across phase switches. Editing
 * only the BF% leaves the anchor untouched.
 *
 * NOTE: assumes goalsProfileStorage exports saveGoalsProfile alongside
 * loadGoalsProfile. If the writer is named differently, fix the import.
 *
 * NOTE: macro recalc is deliberately NOT triggered here. If goal weight
 * or BF% should influence targets, call finalizeNutrition() where
 * marked in handleSave (same hook WeightEntrySheet uses).
 */

// GoalsProfile doesn't declare startWeightKg yet (add it to the type
// when convenient). The field round-trips through storage fine either
// way since the profile is persisted as-is.
type GoalsProfileMaybeStart = GoalsProfile & { startWeightKg?: number | null };

interface GoalEntrySheetProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Unit the tracker is currently displaying — inputs match it. */
  unit: 'kg' | 'lbs';
  /** Latest logged weight in kg. Shown as "Current:" context and
   * snapshotted as the progress track's start anchor whenever the goal
   * weight is set or changed. */
  currentWeightKg?: number | null;
}

const KG_PER_LB = 0.453592;

// Goal edits smaller than this are treated as "unchanged" so re-saving
// the same goal doesn't re-anchor the progress track.
const GOAL_CHANGE_EPSILON_KG = 0.05;

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// "22" not "22.0", "86.2" stays "86.2" — matches the weight sheet's
// "Last: 22 kg" formatting.
function fmtWeight(v: number): string {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export default function GoalEntrySheet({
  visible,
  onClose,
  onSaved,
  unit,
  currentWeightKg,
}: GoalEntrySheetProps) {
  const { themeColor } = useTheme();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<GoalsProfileMaybeStart | null>(null);
  const [weightText, setWeightText] = useState('');
  const [bfText, setBfText] = useState('');
  const [weightFocused, setWeightFocused] = useState(false);
  const [bfFocused, setBfFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hydrate from GoalsProfile every time the sheet opens, so edits made
  // elsewhere (the questionnaire, future flows) always show current
  // values.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = (await loadGoalsProfile()) as GoalsProfileMaybeStart | null;
        if (cancelled) return;
        setProfile(p);
        const goalKg =
          p?.goalWeightKg != null && p.goalWeightKg > 0 ? p.goalWeightKg : null;
        setWeightText(
          goalKg != null
            ? (unit === 'lbs' ? goalKg / KG_PER_LB : goalKg).toFixed(1)
            : ''
        );
        setBfText(p?.goalBodyFatPct != null ? String(p.goalBodyFatPct) : '');
      } catch (e) {
        console.error('GoalEntrySheet load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, unit]);

  // ---------- Parsing + validation ----------

  const weightNum = parseFloat(weightText.replace(',', '.'));
  const parsedWeightKg =
    isFinite(weightNum) && weightNum > 0
      ? unit === 'lbs'
        ? weightNum * KG_PER_LB
        : weightNum
      : null;
  // Loose sanity bounds to catch fat-fingered entries, not to police.
  const weightValid =
    parsedWeightKg != null && parsedWeightKg >= 20 && parsedWeightKg <= 400;
  const weightInvalidVisible = weightText.trim() !== '' && !weightValid;

  const bfRaw = bfText.trim();
  const bfNum = bfRaw === '' ? null : parseFloat(bfRaw.replace(',', '.'));
  const bfValid =
    bfNum == null || (isFinite(bfNum) && bfNum >= 3 && bfNum <= 60);

  const canSave = weightValid && bfValid && !saving && !loading;

  const hasExistingGoal =
    profile?.goalWeightKg != null && profile.goalWeightKg > 0;

  const currentDisplay =
    currentWeightKg != null
      ? unit === 'lbs'
        ? currentWeightKg / KG_PER_LB
        : currentWeightKg
      : null;

  // Live gap preview against the latest logged weight.
  const gapPreview = (() => {
    if (!weightValid || parsedWeightKg == null || currentWeightKg == null) {
      return null;
    }
    const diffKg = parsedWeightKg - currentWeightKg;
    if (Math.abs(diffKg) <= 0.5) return 'At your current weight';
    const abs =
      unit === 'lbs' ? Math.abs(diffKg) / KG_PER_LB : Math.abs(diffKg);
    return diffKg > 0
      ? `${abs.toFixed(1)} ${unit} to gain from current`
      : `${abs.toFixed(1)} ${unit} to lose from current`;
  })();

  // ---------- Save / remove ----------

  const handleSave = async () => {
    if (!canSave || parsedWeightKg == null) return;
    setSaving(true);
    try {
      const prev =
        profile ??
        ((await loadGoalsProfile()) as GoalsProfileMaybeStart | null);
      const prevGoalKg =
        prev?.goalWeightKg != null && prev.goalWeightKg > 0
          ? prev.goalWeightKg
          : null;
      const goalChanged =
        prevGoalKg == null ||
        Math.abs(prevGoalKg - parsedWeightKg) > GOAL_CHANGE_EPSILON_KG;

      // Snapshot the start anchor at the moment the goal weight is set
      // or changed. A BF-only edit keeps the existing anchor so the
      // progress bar doesn't reset.
      const nextStart = goalChanged
        ? currentWeightKg ?? prev?.startWeightKg ?? null
        : prev?.startWeightKg ?? null;

      // If prev is null the user somehow has no profile yet; spreading
      // an empty object keeps this compiling, but if GoalsProfile has
      // required fields beyond these, seed the app's default profile
      // here instead.
      const next: GoalsProfileMaybeStart = {
        ...(prev ?? ({} as GoalsProfileMaybeStart)),
        goalWeightKg: parsedWeightKg,
        goalBodyFatPct: bfNum == null ? null : Math.round(bfNum * 10) / 10,
        startWeightKg: nextStart,
      };
      await saveGoalsProfile(next);

      // finalizeNutrition() hook: call it here if goal weight / BF%
      // should re-derive macro targets, mirroring WeightEntrySheet.

      onSaved();
      onClose();
    } catch (e) {
      console.error('GoalEntrySheet save failed', e);
      Alert.alert('Save failed', 'Could not save your goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    Alert.alert('Remove goal', 'Clear your goal weight and BF% target?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const prev =
              profile ??
              ((await loadGoalsProfile()) as GoalsProfileMaybeStart | null);
            if (!prev) {
              onClose();
              return;
            }
            const next: GoalsProfileMaybeStart = {
              ...prev,
              goalWeightKg: null,
              goalBodyFatPct: null,
              startWeightKg: null,
            };
            await saveGoalsProfile(next);
            onSaved();
            onClose();
          } catch (e) {
            console.error('GoalEntrySheet remove failed', e);
            Alert.alert(
              'Remove failed',
              'Could not remove your goal. Please try again.'
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  // ---------- Render ----------

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Close"
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Set goal</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color="#d4d4d8" />
            </TouchableOpacity>
          </View>

          {currentDisplay != null && (
            <Text style={styles.caption}>
              Current: {fmtWeight(currentDisplay)} {unit}
            </Text>
          )}

          {loading ? (
            <ActivityIndicator color={themeColor} style={styles.loadingWrap} />
          ) : (
            <>
              <View style={styles.inputsRow}>
                <View
                  style={[
                    styles.weightBox,
                    {
                      borderWidth: weightFocused ? 2 : StyleSheet.hairlineWidth,
                      borderColor: weightFocused ? themeColor : '#27272a',
                    },
                  ]}
                >
                  <TextInput
                    style={styles.weightInput}
                    value={weightText}
                    onChangeText={setWeightText}
                    onFocus={() => setWeightFocused(true)}
                    onBlur={() => setWeightFocused(false)}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor="#52525b"
                    selectionColor={themeColor}
                    autoFocus
                    accessibilityLabel={`Goal weight in ${unit}`}
                  />
                  <Text style={styles.weightUnit}>{unit}</Text>
                </View>

                <View
                  style={[
                    styles.bfCard,
                    {
                      borderWidth: bfFocused ? 2 : StyleSheet.hairlineWidth,
                      borderColor: bfFocused ? themeColor : '#27272a',
                    },
                  ]}
                >
                  <TextInput
                    style={styles.bfInput}
                    value={bfText}
                    onChangeText={setBfText}
                    onFocus={() => setBfFocused(true)}
                    onBlur={() => setBfFocused(false)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#52525b"
                    selectionColor={themeColor}
                    accessibilityLabel="Body fat target percent, optional"
                  />
                  <Text style={styles.bfCaption}>BF % target (optional)</Text>
                </View>
              </View>

              {weightInvalidVisible ? (
                <Text style={styles.errorText}>
                  Enter a realistic weight in {unit}.
                </Text>
              ) : !bfValid ? (
                <Text style={styles.errorText}>
                  BF% should be between 3 and 60, or blank.
                </Text>
              ) : gapPreview ? (
                <Text style={styles.helper}>{gapPreview}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  canSave
                    ? { backgroundColor: themeColor }
                    : styles.saveBtnDisabled,
                ]}
                disabled={!canSave}
                onPress={handleSave}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Save goal"
              >
                {saving ? (
                  <ActivityIndicator color="#0a0a0b" />
                ) : (
                  <Text
                    style={[
                      styles.saveText,
                      !canSave && styles.saveTextDisabled,
                    ]}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>

              {hasExistingGoal && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={handleRemove}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Remove goal"
                >
                  <Text style={styles.removeText}>Remove goal</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: '#131316',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#3f3f46',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 23,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1f1f23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    fontSize: 15,
    color: '#a1a1aa',
    marginBottom: 20,
  },
  loadingWrap: {
    marginVertical: 48,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  weightBox: {
    flex: 1.15,
    height: 96,
    borderRadius: 18,
    backgroundColor: '#0d0d0f',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  weightInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
    padding: 0,
  },
  weightUnit: {
    fontSize: 15,
    fontWeight: '500',
    color: '#71717a',
    marginLeft: 8,
  },
  bfCard: {
    flex: 1,
    height: 96,
    borderRadius: 18,
    backgroundColor: '#0d0d0f',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  bfInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    minWidth: 60,
    padding: 0,
  },
  bfCaption: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 4,
  },
  helper: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#f87171',
    marginTop: 14,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: {
    backgroundColor: '#1c1c1f',
  },
  saveText: {
    color: '#0a0a0b',
    fontSize: 16,
    fontWeight: '600',
  },
  saveTextDisabled: {
    color: '#6b6b70',
  },
  removeBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#f87171',
  },
});