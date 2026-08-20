import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutChangeEvent,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import QuestionnaireHeader from './QuestionnaireHeader';
import { updateQuestionnaireField } from '../../utils/questionnaireStorage';

/**
 * Q3 — Days per week
 * The FIRST workout question since Q1 left the flow on 9 Aug 2026.
 *
 * It keeps its Q3 name and route so nothing else has to be renamed, but its
 * step literals moved: currentStep is now stepOffset + 1 (not + 2) and the
 * flow is 5 screens, not 6. It also hands off at stepOffset - 1, which lets
 * Q4-Q7 keep their own hardcoded literals untouched.
 *
 * Captures `totalTrainingDays` (number).
 *
 * Copy revision, 18 Aug 2026
 * --------------------------
 * The previous DAY_HINTS read as a quality ladder ("the sweet spot" at 3,
 * "demands serious sleep, food, and recovery" at 6), which implied more days
 * means more muscle. That is not what the evidence says, and it is not what
 * this app does: weekly sets per muscle are chosen on Q6 and that ceiling
 * does not move with the number of training days. Two of the old hints were
 * also plainly wrong ("1: Maintenance only", "2: Minimum to build").
 *
 * This screen now owns LOGISTICS only. Days decides how the weekly sets are
 * distributed and how long each session runs. Q6 owns the growth claim, and
 * closes with a line naming this answer so the two screens agree out loud.
 *
 * Evidence behind the change:
 *   - Schoenfeld, Grgic & Krieger 2019 (J Sports Sci 37(11):1286-95, 25
 *     studies): frequency does not meaningfully affect hypertrophy when
 *     weekly volume is equated.
 *   - Pelland et al. 2026 (Sports Med 56(2):481-505, 67 studies, 2,058
 *     participants): the frequency slope for hypertrophy is compatible with
 *     negligible effects. Frequency DOES help strength.
 *   - Remmert et al. per-session meta-regression: hypertrophy point of
 *     diminishing returns at ~11 fractional sets in a single session, which
 *     is what rules 1 day per week out rather than any "maintenance" claim.
 *
 * RECOMMENDED_DAYS band
 * ---------------------
 * 3 to 5, shown as a muted bracket under those tiles. Deliberately grey
 * rather than themeColor so the selected tile stays the loudest element and
 * the band reads as guidance, not a second selection state.
 *   - Floor: the ACSM 2026 Position Stand (MSSE, 137 systematic reviews)
 *     anchors on training each major muscle group at least twice a week.
 *     1 day cannot do that and forces the whole week into one session.
 *     2 clears it with a full body split, so 2 is legitimate, not warned
 *     against; it just constrains which Q6 tier is comfortably deliverable.
 *   - Ceiling: past 5 the extra sessions buy no stimulus, and 7 removes the
 *     rest day, which cuts against the adherence point that is the ACSM's
 *     actual headline.
 *
 * The bracket is positioned from a measured row width rather than flex
 * weights, because flex spacers land ~1px off once the 5px gaps are counted.
 * Tiles keep `flex: 1` so the row still scales from iPhone SE upward.
 */

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

/** Inclusive band highlighted under the tiles. Must be contiguous. */
const RECOMMENDED_DAYS = [3, 4, 5];

const TILE_GAP = 5;

const DAY_HINTS: Record<number, string> = {
  1: 'Everything in one long session. Past a point, extra sets in a single session stop paying off.',
  2: 'Two longer full body sessions. The accepted minimum for hitting each muscle twice.',
  3: 'Three moderate sessions. Comfortably fits any volume you pick later.',
  4: 'Four shorter sessions. Easy to hit every muscle twice a week.',
  5: 'Five shorter sessions. More trips to the gym, less time in each.',
  6: 'Six short sessions. Same weekly sets as four days, cut into smaller pieces.',
  7: 'Every day, no rest day. Very short sessions, and the weekly total is unchanged.',
};

type ParamList = {
  Q3DaysPerWeek: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
};

export default function Q3DaysPerWeekScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'Q3DaysPerWeek'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const stepOffset = route.params?.flowStepOffset ?? 0;
  const [selected, setSelected] = useState<number | null>(
    (answersSoFar.totalTrainingDays as number) ?? null,
  );

  // Measured so the band bracket lines up exactly with tiles 3 through 5.
  const [rowWidth, setRowWidth] = useState(0);
  const tileWidth =
    rowWidth > 0 ? (rowWidth - TILE_GAP * (DAY_OPTIONS.length - 1)) / DAY_OPTIONS.length : 0;
  const bandStartIndex = RECOMMENDED_DAYS[0] - 1;
  const bandLeft = bandStartIndex * (tileWidth + TILE_GAP);
  const bandWidth =
    RECOMMENDED_DAYS.length * tileWidth + (RECOMMENDED_DAYS.length - 1) * TILE_GAP;

  const handleRowLayout = (e: LayoutChangeEvent) =>
    setRowWidth(e.nativeEvent.layout.width);

  const handleNext = async () => {
    if (!selected) return;

    // Always save the answer to storage, whether in edit mode or not
    await updateQuestionnaireField('totalTrainingDays', selected);

    if (editMode) {
      navigation.goBack();
      return;
    }
    // Offset drops by one: Q1 is gone, so Q4-Q7's hardcoded literals (which
    // still assume Q1 occupied step 1) land correctly without editing them.
    navigation.navigate('Q4ProgramDuration', {
      answersSoFar: { ...answersSoFar, totalTrainingDays: selected },
      flowStepOffset: stepOffset - 1,
    });
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const hint = selected ? DAY_HINTS[selected] : null;

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 1}
        totalSteps={stepOffset + 5}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>How many days a week?</Text>
        <Text style={styles.subtitle}>
          Your weekly sets stay the same either way. More days means shorter
          sessions, fewer days means longer ones.
        </Text>

        {/* Single horizontal row of 7 tiles. */}
        <View style={styles.row} onLayout={handleRowLayout}>
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

        {/* Recommended band bracket under tiles 3 to 5. */}
        {rowWidth > 0 && (
          <View style={styles.bandRow}>
            <View
              style={[
                styles.bandBracket,
                { marginLeft: bandLeft, width: bandWidth },
              ]}
            />
          </View>
        )}
        <Text style={styles.bandLabel}>Most people land here</Text>

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
    gap: TILE_GAP,
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

  // Recommended band. Muted on purpose: the selected tile owns themeColor.
  bandRow: {
    flexDirection: 'row',
    marginTop: 9,
  },
  bandBracket: {
    height: 6,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#3f3f46',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  bandLabel: {
    fontSize: 11,
    color: '#71717a',
    textAlign: 'center',
    letterSpacing: 0.4,
    marginTop: 6,
  },

  // Big display block under the row
  displayBlock: {
    marginTop: 30,
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
    marginTop: 18,
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