import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
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
import { useTheme } from '../../contexts/ThemeContext';
import { updateQuestionnaireField } from '../../utils/questionnaireStorage';

/**
 * Refinements — optional final step before prompt generation.
 *
 * All sections here are optional. Tapping "Generate prompt" saves the
 * merged QuestionnaireData to both AsyncStorage keys (so the existing
 * WorkoutGeneratorStep1New can load it unchanged) and navigates to
 * PromptReady.
 *
 * v2 changes
 * ----------
 * - Typography aligned with Q1–Q7 polish (28px title, transparency
 *   subtitle, 17px section titles, refined section subtitles).
 * - Pill chips use the same dark-grey-to-cyan-tint state transition
 *   as the Q1–Q7 cards. Selected chips get a cyan border and tinted
 *   background, no longer just a colour swap.
 * - Auxiliary muscle cards (multi-select) get the new check badge on
 *   the right when selected, consistent with QuestionCard's pattern.
 * - Gender buttons restyled to match the chip/card aesthetic.
 * - Disabled CTA uses a low-contrast dark surface instead of the
 *   default cyan with reduced opacity — clearer "asleep" signal.
 *
 * Bug fix
 * -------
 * The "Generate prompt" button used to get stuck in its loading state
 * after the user navigated to PromptReady and then popped back. Cause:
 * `setSaving(true)` ran on tap, navigation pushed PromptReady onto the
 * stack (this screen never unmounted), and `setSaving(false)` never
 * ran because the success branch navigates away.
 *
 * The `useFocusEffect` below resets `saving` whenever this screen
 * regains focus — handles the pop-back case cleanly without losing
 * any error state mid-submission.
 */

// --- Data: priority muscles (15 chips) ---
const PRIORITY_MUSCLES = [
  'Chest',
  'Lats',
  'Upper Back',
  'Traps',
  'Front Delts',
  'Side Delts',
  'Rear Delts',
  'Biceps',
  'Triceps',
  'Forearms',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
];

// --- Data: auxiliary muscles (2 grouped sections) ---
interface AuxiliaryOption {
  value: string;
  title: string;
  description: string;
}

const AUXILIARY_AESTHETICS: AuxiliaryOption[] = [
  { value: 'neck', title: 'Neck', description: 'Thicker, more developed neckline' },
  { value: 'forearms', title: 'Forearms', description: 'More visible, defined arms' },
  { value: 'obliques', title: 'Obliques', description: 'V-taper definition' },
  { value: 'serratus', title: 'Serratus', description: 'Visible ridges, shoulder health' },
];

const AUXILIARY_STRENGTH: AuxiliaryOption[] = [
  { value: 'lower_back', title: 'Lower back', description: 'Hinge strength, posture support' },
  { value: 'hip_abductors', title: 'Hip abductors', description: 'Glute shape, knee tracking' },
  { value: 'hip_adductors', title: 'Hip adductors', description: 'Inner thigh, groin resilience' },
  { value: 'shins', title: 'Shins', description: 'Ankle stability, shin splint prevention' },
];

// --- Data: movements to avoid ---
const MOVEMENT_LIMITATIONS = [
  'Overhead pressing',
  'Heavy squats',
  'Heavy deadlifts',
  'High-impact moves',
  'Jumping & plyometrics',
  'Inversions',
];

// --- Data: gender ---
type GenderValue = 'male' | 'female' | 'prefer_not_to_say';
const GENDER_OPTIONS: { value: GenderValue; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

type ParamList = {
  QuestionnaireRefinements:
    | { answersSoFar?: Record<string, any>; editMode?: boolean }
    | undefined;
};

export default function RefinementsScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'QuestionnaireRefinements'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  // --- Selection state ---
  const [priorityMuscles, setPriorityMuscles] = useState<string[]>(
    (answersSoFar.priorityMuscleGroups as string[]) ?? [],
  );
  const [auxiliaryMuscles, setAuxiliaryMuscles] = useState<string[]>(
    (answersSoFar.auxiliaryMuscles as string[]) ?? [],
  );
  const [movementLimitations, setMovementLimitations] = useState<string[]>(
    (answersSoFar.movementLimitations as string[]) ?? [],
  );
  const [gender, setGender] = useState<GenderValue | null>(
    (answersSoFar.gender as GenderValue) ?? null,
  );
  const [includeDirectCore, setIncludeDirectCore] = useState<boolean>(
    answersSoFar.includeDirectCore ?? true,
  );

  const [saving, setSaving] = useState(false);

  // Reset the submitting state whenever this screen regains focus.
  // Without this, popping back from PromptReady leaves the button
  // stuck in its loading state — see header comment.
  useFocusEffect(
    useCallback(() => {
      setSaving(false);
    }, []),
  );

  // --- Toggles ---
  const togglePriority = (muscle: string) => {
    setPriorityMuscles((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle],
    );
  };

  const toggleAuxiliary = (value: string) => {
    setAuxiliaryMuscles((prev) =>
      prev.includes(value)
        ? prev.filter((m) => m !== value)
        : [...prev, value],
    );
  };

  const toggleLimitation = (limitation: string) => {
    setMovementLimitations((prev) =>
      prev.includes(limitation)
        ? prev.filter((m) => m !== limitation)
        : [...prev, limitation],
    );
  };

  // --- Generate prompt: save data + route to PromptReady ---
  const handleGenerate = async () => {
    if (saving) return;
    setSaving(true);

    try {
      // Save only the refinement fields collected by this screen.
      // Q1-Q7 answers are already persisted by their individual screens.
      await updateQuestionnaireField('priorityMuscleGroups', priorityMuscles);
      await updateQuestionnaireField('auxiliaryMuscles', auxiliaryMuscles);
      await updateQuestionnaireField('movementLimitations', movementLimitations);
      await updateQuestionnaireField('gender', gender ?? 'prefer_not_to_say');
      await updateQuestionnaireField('includeDirectCore', includeDirectCore);

      if (editMode) {
        navigation.goBack();
      } else {
        navigation.navigate('QuestionnaireSummary' as never);
      }
    } catch (err) {
      console.error('Failed to save questionnaire data:', err);
      Alert.alert(
        'Something went wrong',
        'Could not save your answers. Try again.',
      );
      setSaving(false);
    }
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  // --- Render ---
  return (
    <View style={styles.container}>
      {/* Custom header — no progress bar because this screen sits past
          the numbered Q1-Q7 flow. */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#d4d4d8" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Refinements</Text>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: themeColor }]}>OPTIONAL</Text>

        <Text style={styles.question}>Want to refine further?</Text>
        <Text style={styles.subtitle}>
          All optional. Skip anything you don't care about.
        </Text>

        {/* --- Priority muscles --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority muscles</Text>
          <Text style={styles.sectionSubtitle}>
            These get pushed toward higher weekly volume.
          </Text>
          <View style={styles.chipsRow}>
            {PRIORITY_MUSCLES.map((muscle) => {
              const isSelected = priorityMuscles.includes(muscle);
              return (
                <TouchableOpacity
                  key={muscle}
                  activeOpacity={0.85}
                  onPress={() => togglePriority(muscle)}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                    isSelected && { borderColor: themeColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && { color: '#ffffff', fontWeight: '600' },
                    ]}
                  >
                    {muscle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* --- Auxiliary muscles --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Auxiliary muscle work</Text>
          <Text style={styles.sectionSubtitle}>
            Small muscles most programs skip. Pick what you want extra work
            on.
          </Text>

          {/* Aesthetics group */}
          <Text style={styles.subGroupHeader}>For aesthetics</Text>
          {AUXILIARY_AESTHETICS.map((opt) => (
            <AuxCard
              key={opt.value}
              option={opt}
              selected={auxiliaryMuscles.includes(opt.value)}
              onToggle={toggleAuxiliary}
              themeColor={themeColor}
            />
          ))}

          {/* Strength group */}
          <Text style={[styles.subGroupHeader, { marginTop: 20 }]}>
            For strength & injury prevention
          </Text>
          {AUXILIARY_STRENGTH.map((opt) => (
            <AuxCard
              key={opt.value}
              option={opt}
              selected={auxiliaryMuscles.includes(opt.value)}
              onToggle={toggleAuxiliary}
              themeColor={themeColor}
            />
          ))}
        </View>

        {/* --- Movements to avoid --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movements to avoid</Text>
          <Text style={styles.sectionSubtitle}>
            Anything injuries or limitations prevent.
          </Text>
          <View style={styles.chipsRow}>
            {MOVEMENT_LIMITATIONS.map((limit) => {
              const isSelected = movementLimitations.includes(limit);
              return (
                <TouchableOpacity
                  key={limit}
                  activeOpacity={0.85}
                  onPress={() => toggleLimitation(limit)}
                  style={[
                    styles.chip,
                    isSelected && styles.chipSelected,
                    isSelected && { borderColor: themeColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && { color: '#ffffff', fontWeight: '600' },
                    ]}
                  >
                    {limit}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* --- Gender --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gender</Text>
          <Text style={styles.sectionSubtitle}>
            Helps with volume context only. Doesn't change exercises.
          </Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => {
              const isSelected = gender === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.85}
                  onPress={() => setGender(opt.value)}
                  style={[
                    styles.genderCard,
                    isSelected && {
                      borderColor: themeColor,
                      backgroundColor: 'rgba(34, 211, 238, 0.07)',
                      borderWidth: 1.5,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.genderText,
                      isSelected && { color: '#ffffff', fontWeight: '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* --- Direct core --- */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.sectionTitle}>Direct core work</Text>
              <Text style={[styles.sectionSubtitle, { marginBottom: 0 }]}>
                Add dedicated ab and core exercises. On by default.
              </Text>
            </View>
            <Switch
              value={includeDirectCore}
              onValueChange={setIncludeDirectCore}
              trackColor={{ false: '#27272a', true: themeColor }}
              thumbColor="#ffffff"
              ios_backgroundColor="#27272a"
            />
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* CTA bar */}
      <View
        style={[
          styles.ctaBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 4 },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={saving}
          onPress={handleGenerate}
          style={[styles.ctaButton, { backgroundColor: themeColor }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0a0a0b" />
          ) : (
            <Text style={[styles.ctaText, { color: '#0a0a0b' }]}>
              {editMode ? 'Save changes' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AuxCard — multi-select row for the auxiliary muscle sections.
//
// Could not reuse QuestionCard because (a) these have no icon and (b) the
// description text is always visible, not just on selection. The visual
// treatment matches QuestionCard's selected state — cyan border, cyan
// tinted bg, check badge — for consistency across the flow.
// ---------------------------------------------------------------------------
interface AuxCardProps {
  option: AuxiliaryOption;
  selected: boolean;
  onToggle: (value: string) => void;
  themeColor: string;
}

function AuxCard({ option, selected, onToggle, themeColor }: AuxCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onToggle(option.value)}
      style={[
        auxStyles.card,
        selected && {
          borderColor: themeColor,
          backgroundColor: 'rgba(34, 211, 238, 0.07)',
          borderWidth: 1.5,
        },
      ]}
    >
      <View style={auxStyles.text}>
        <Text style={auxStyles.title}>{option.title}</Text>
        <Text style={auxStyles.desc}>{option.description}</Text>
      </View>
      {selected ? (
        <View style={[auxStyles.checkBadge, { backgroundColor: themeColor }]}>
          <Ionicons name="checkmark" size={13} color="#0a0a0b" />
        </View>
      ) : (
        <View style={auxStyles.checkPlaceholder} />
      )}
    </TouchableOpacity>
  );
}

const auxStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    gap: 12,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 3,
    lineHeight: 20,
  },
  desc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 17,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkPlaceholder: {
    width: 22,
    height: 22,
  },
});

// ---------------------------------------------------------------------------
// Main styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 14,
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
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#71717a',
    lineHeight: 19,
    marginBottom: 14,
  },
  subGroupHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  chipSelected: {
    backgroundColor: 'rgba(34, 211, 238, 0.07)',
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#d4d4d8',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toggleText: {
    flex: 1,
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