import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import QuestionnaireHeader from './QuestionnaireHeader';
import { updateQuestionnaireField } from '../../utils/questionnaireStorage';

/**
 * Q3 — Days per week
 * Step 3 of 7.
 *
 * Captures `totalTrainingDays` (number).
 *
 * Redesign goals
 * --------------
 * The previous 3-column grid put 7 days as an orphan single cell on
 * its own row, breaking the visual rhythm and making selection of
 * "7" feel awkward and isolated. The hint text floated far below the
 * grid, disconnected from the choice.
 *
 * This version:
 *   - Single horizontal row of 7 equal-width tiles. All options
 *     visible at a glance; no orphan row.
 *   - Big animated "X days a week" display below the row. Confirms
 *     the selection visually with weight and presence.
 *   - Contextual hint sits right under the display, so the meaning
 *     of the choice is tied directly to the choice itself.
 *   - When nothing is selected the display area shows a neutral
 *     prompt so the screen never feels empty.
 *
 * Tiles use `flex: 1` rather than fixed widths so the row scales
 * cleanly down to small phones (iPhone SE-class) and up to larger
 * devices without needing breakpoints.
 */

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

const DAY_HINTS: Record<number, string> = {
  1: 'Maintenance only. Hard to make real progress at this frequency.',
  2: 'Minimum to build. Full-body sessions twice a week.',
  3: 'The sweet spot. Push/pull/legs or upper/lower split.',
  4: 'Great for intermediates. Upper/lower repeated twice.',
  5: 'Body part split. Good if recovery and sleep are solid.',
  6: 'High frequency. Demands serious sleep, food, and recovery.',
  7: 'Daily training. Mix in active recovery and lower-intensity days.',
};

type ParamList = {
  Q3DaysPerWeek: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function Q3DaysPerWeekScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'Q3DaysPerWeek'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const [selected, setSelected] = useState<number | null>(
    (answersSoFar.totalTrainingDays as number) ?? null,
  );

  const handleNext = async () => {
    if (!selected) return;
    if (editMode) {
      await updateQuestionnaireField('totalTrainingDays', selected);
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'Q4ProgramDuration' as never,
      {
        answersSoFar: { ...answersSoFar, totalTrainingDays: selected },
      } as never,
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const hint = selected ? DAY_HINTS[selected] : null;

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={3}
        totalSteps={7}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>How many days a week?</Text>
        <Text style={styles.subtitle}>
          Pick what you can actually stick to. Quality beats quantity.
        </Text>

        {/* Single horizontal row of 7 tiles. */}
        <View style={styles.row}>
          {DAY_OPTIONS.map((day) => {
            const isSelected = selected === day;
            return (
              <TouchableOpacity
                key={day}
                activeOpacity={0.85}
                onPress={() => setSelected(day)}
                style={[
                  styles.cell,
                  {
                    borderColor: isSelected ? themeColor : '#27272a',
                    backgroundColor: isSelected
                      ? 'rgba(34, 211, 238, 0.08)'
                      : '#131316',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cellNumber,
                    { color: isSelected ? themeColor : '#ffffff' },
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Big "X days a week" display + context hint. */}
        <View style={styles.displayBlock}>
          {selected ? (
            <>
              <Text style={[styles.displayNumber, { color: themeColor }]}>
                {selected}
              </Text>
              <Text style={styles.displayLabel}>
                {selected === 1 ? 'day a week' : 'days a week'}
              </Text>
              <View style={styles.hintBox}>
                <Ionicons
                  name="information-circle"
                  size={15}
                  color={themeColor}
                  style={{ marginTop: 1 }}
                />
                <Text style={styles.hintText}>{hint}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.displayPlaceholder}>
              Tap a number above
            </Text>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.ctaBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 4 },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!selected}
          onPress={handleNext}
          style={[
            styles.ctaButton,
            { backgroundColor: selected ? themeColor : '#1c1c1f' },
          ]}
        >
          <Text
            style={[
              styles.ctaText,
              { color: selected ? '#0a0a0b' : '#3f3f46' },
            ]}
          >
            {editMode ? 'Save' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
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

  // Row of 7 tiles
  row: {
    flexDirection: 'row',
    gap: 5,
  },
  cell: {
    flex: 1,
    height: 64,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellNumber: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.3,
  },

  // Big display block under the row
  displayBlock: {
    marginTop: 36,
    alignItems: 'center',
  },
  displayNumber: {
    fontSize: 72,
    fontWeight: '300',
    lineHeight: 78,
    letterSpacing: -2,
  },
  displayLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  displayPlaceholder: {
    fontSize: 13,
    color: '#52525b',
    paddingVertical: 32,
  },

  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    borderRadius: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#d4d4d8',
    lineHeight: 18,
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