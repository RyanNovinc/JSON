// src/screens/questionnaire/QuestionnaireSummaryScreen.tsx
//
// The hub the user lands on AFTER completing the questionnaire (or
// when re-entering the Create flow with saved answers from a previous
// session).
//
// Top: header (back + close to dismiss the whole flow).
// Body: hero "Your plan" title + a list of summary rows (one per Q),
//   each tappable to edit. Refinements appear in a collapsible-style
//   section below. The CTAs ("Continue to prompt" / "Start over")
//   flow at the end of the scroll content, after refinements.
//
// Editing flow:
//   tap a row → navigate to that Q in editMode → user changes value
//   → tapping the CTA on that Q saves the field and goBacks here.
//   useFocusEffect reloads answers each time the screen regains focus,
//   so edits show up immediately without a manual refresh.
//
// Start over:
//   Confirms via Alert, then clears storage and navigates to Q1.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import {
  loadQuestionnaireAnswers,
  clearQuestionnaireAnswers,
  QuestionnaireAnswers,
} from '../../utils/questionnaireStorage';
import GoalsProfileSummaryCard from '../../components/GoalsProfileSummaryCard';

type NavProp = StackNavigationProp<any>;

// ---------------------------------------------------------------------------
// Label maps — convert stored values to display strings.
// ---------------------------------------------------------------------------


const DURATION_LABELS: Record<string, string> = {
  '4_weeks': '4 weeks',
  '8_weeks': '8 weeks',
  '12_weeks': '12 weeks',
  '6_months': '6 months',
  '1_year': '1 year',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  commercial_gym: 'Commercial gym',
  home_gym: 'Home gym',
  basic_equipment: 'Basic equipment',
  bodyweight: 'Bodyweight only',
};

const VOLUME_LABELS: Record<string, string> = {
  '8-12': 'Conservative',
  '12-16': 'Moderate',
  '16-20': 'High volume',
};

const REST_LABELS: Record<string, string> = {
  optimal: 'Optimal',
  moderate: 'Moderate',
  minimal: 'Minimal',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Not specified',
};

const AUXILIARY_LABELS: Record<string, string> = {
  neck: 'Neck',
  forearms: 'Forearms',
  obliques: 'Obliques',
  serratus: 'Serratus',
  lower_back: 'Lower back',
  hip_abductors: 'Hip abductors',
  hip_adductors: 'Hip adductors',
  shins: 'Shins',
};

// ---------------------------------------------------------------------------
// Row config — single source of truth for which row routes where.
// ---------------------------------------------------------------------------

interface RowConfig {
  label: string;
  route: string;
  format: (answers: QuestionnaireAnswers) => string;
}

const ROWS: RowConfig[] = [
  {
    label: 'Days per week',
    route: 'Q3DaysPerWeek',
    format: (a) =>
      a.totalTrainingDays
        ? `${a.totalTrainingDays} ${
            a.totalTrainingDays === 1 ? 'day' : 'days'
          } a week`
        : '—',
  },
  {
    label: 'Program length',
    route: 'Q4ProgramDuration',
    format: (a) =>
      a.programDuration
        ? DURATION_LABELS[a.programDuration] ?? a.programDuration
        : '—',
  },
  {
    label: 'Equipment',
    route: 'Q5Equipment',
    format: (a) =>
      a.selectedEquipment && a.selectedEquipment.length > 0
        ? a.selectedEquipment
            .map((v) => EQUIPMENT_LABELS[v] ?? v)
            .join(', ')
        : '—',
  },
  {
    label: 'Volume',
    route: 'Q6Volume',
    format: (a) =>
      a.volumePreference
        ? VOLUME_LABELS[a.volumePreference] ?? a.volumePreference
        : '—',
  },
  {
    label: 'Rest between sets',
    route: 'Q7RestStyle',
    format: (a) =>
      a.sessionStyle ? REST_LABELS[a.sessionStyle] ?? a.sessionStyle : '—',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuestionnaireSummaryScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const [answers, setAnswers] = useState<QuestionnaireAnswers | null>(null);
  const [loading, setLoading] = useState(true);

  // Reload on focus so edits from individual Q screens show up
  // immediately when the user pops back here.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const data = await loadQuestionnaireAnswers();
        if (!cancelled) {
          setAnswers(data);
          setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const handleEditRow = (route: string) => {
    if (!answers) return;
    navigation.push(route as never, {
      editMode: true,
      answersSoFar: answers,
    } as never);
  };

  const handleEditRefinements = () => {
    if (!answers) return;
    navigation.push('QuestionnaireRefinements' as never, {
      editMode: true,
      answersSoFar: answers,
    } as never);
  };

  const handleContinue = () => {
    navigation.navigate('PromptReady' as never);
  };

  const handleStartOver = () => {
    Alert.alert(
      'Restart questionnaire?',
      'This will clear all your answers and start the questionnaire from the beginning.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: async () => {
            await clearQuestionnaireAnswers();
            navigation.navigate('Q1PrimaryGoal' as never);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator color={themeColor} />
      </View>
    );
  }

  if (!answers) {
    // Shouldn't happen in practice — CreateChooser only navigates here
    // when hasCompleteQuestionnaire() returns true — but defend against
    // direct/deep-linked navigation.
    return (
      <View style={[styles.container, styles.loading]}>
        <Text style={styles.emptyText}>
          No saved questionnaire. Start a new one from Create.
        </Text>
      </View>
    );
  }

  // Refinements presence — show the section only if at least one
  // refinement field is set.
  const hasRefinements =
    (answers.priorityMuscleGroups?.length ?? 0) > 0 ||
    (answers.auxiliaryMuscles?.length ?? 0) > 0 ||
    (answers.movementLimitations?.length ?? 0) > 0 ||
    Boolean(answers.gender) ||
    answers.includeDirectCore === false; // false is meaningful (default is true)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#d4d4d8" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Your plan</Text>

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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 12) + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Text style={styles.title}>Looking good.</Text>
        <Text style={styles.subtitle}>
          Tap any answer to change it, or continue to the next step.
        </Text>

        {/* Goals & stats — surfaced here so current stats, goal, and
            derived phase are visible where the plan is reviewed. */}
        <GoalsProfileSummaryCard />

        {/* Main rows */}
        <View style={styles.section}>
          {ROWS.map((row, idx) => (
            <TouchableOpacity
              key={row.route}
              activeOpacity={0.7}
              onPress={() => handleEditRow(row.route)}
              style={[
                styles.row,
                idx === ROWS.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.format(answers)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#52525b" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Refinements */}
        <Text style={styles.sectionHeader}>Refinements</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleEditRefinements}
          style={[styles.section, styles.refinementsBlock]}
        >
          {hasRefinements ? (
            <View style={{ flex: 1 }}>
              {answers.priorityMuscleGroups &&
              answers.priorityMuscleGroups.length > 0 ? (
                <RefinementRow
                  label="Priority muscles"
                  value={answers.priorityMuscleGroups.join(', ')}
                />
              ) : null}

              {answers.auxiliaryMuscles &&
              answers.auxiliaryMuscles.length > 0 ? (
                <RefinementRow
                  label="Auxiliary work"
                  value={answers.auxiliaryMuscles
                    .map((v) => AUXILIARY_LABELS[v] ?? v)
                    .join(', ')}
                />
              ) : null}

              {answers.movementLimitations &&
              answers.movementLimitations.length > 0 ? (
                <RefinementRow
                  label="Avoid"
                  value={answers.movementLimitations.join(', ')}
                />
              ) : null}

              {answers.gender ? (
                <RefinementRow
                  label="Gender"
                  value={GENDER_LABELS[answers.gender] ?? answers.gender}
                />
              ) : null}

              <RefinementRow
                label="Direct core work"
                value={answers.includeDirectCore === false ? 'Off' : 'On'}
                last
              />
            </View>
          ) : (
            <View style={styles.refinementsEmpty}>
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={themeColor}
              />
              <Text style={[styles.refinementsEmptyText, { color: themeColor }]}>
                Add refinements
              </Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color="#52525b" />
        </TouchableOpacity>

        {/* CTAs — flow at the end of the content, not pinned */}
        <View style={styles.ctas}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinue}
            style={[styles.primaryBtn, { backgroundColor: themeColor }]}
          >
            <Text style={[styles.primaryBtnText, { color: '#0a0a0b' }]}>
              Continue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleStartOver}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Restart questionnaire</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// RefinementRow — a sub-row inside the refinements block
// ---------------------------------------------------------------------------

function RefinementRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        refStyles.row,
        last && { borderBottomWidth: 0, paddingBottom: 0 },
      ]}
    >
      <Text style={refStyles.label}>{label}</Text>
      <Text style={refStyles.value} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const refStyles = StyleSheet.create({
  row: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  value: {
    fontSize: 14,
    color: '#e4e4e7',
    lineHeight: 19,
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
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#71717a',
    paddingHorizontal: 40,
    textAlign: 'center',
  },

  // Header
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

  // Hero
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
    marginBottom: 28,
  },

  // Section card containing rows
  section: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: '#71717a',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  rowValue: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Refinements
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#71717a',
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  refinementsBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  refinementsEmpty: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refinementsEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // CTAs — now inline at the end of the scroll content
  ctas: {
    marginTop: 32,
    gap: 6,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#71717a',
  },
});