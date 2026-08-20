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
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import QuestionnaireHeader from './QuestionnaireHeader';
import QuestionCard from './QuestionCard';
import { updateQuestionnaireField } from '../../utils/questionnaireStorage';

/**
 * Q6 — Volume Preference
 * Step 4 of 5 in the current flow. (The literals below still read
 * stepOffset + 5 of + 6 and are CORRECT: Q3 hands off at stepOffset - 1
 * since Q1 was deleted, so this renders as 4 of 5. The old "Step 6 of 7"
 * comment was stale, not the numbers.)
 *
 * Values must match the volumePreference expected by the storage layer.
 * On Continue, routes to Q7RestStyle.
 *
 * Copy revision, 18 Aug 2026
 * --------------------------
 * "Maximum growth stimulus" was removed from the High tier. It is not the
 * maximum and it implies a ceiling the data does not show: the weekly volume
 * dose-response is monotone with diminishing returns (Pelland et al. 2026,
 * Sports Med 56(2):481-505, ~0.24% more hypertrophy per additional set at
 * 12.25 weekly fractional sets), superiority only becomes undetectable past
 * roughly 31 fractional weekly sets, and Enes et al. 2024 ran a group to 52
 * weekly sets and still saw a small advantage. This screen's 16-20 top tier
 * sits nearer the middle of the useful range than the top of it.
 *
 * This screen owns the GROWTH claim. Q3 owns logistics only. The closing
 * line names the Q3 answer so the two screens agree out loud, instead of
 * both implying they drive muscle gain.
 *
 * Deliberately NOT shown: sets per muscle per session. Weekly sets divided
 * by training days is wrong arithmetic, because the split decides how many
 * sessions each muscle actually gets and the AI picks the split.
 *
 * The closing line renders only when totalTrainingDays is present on
 * answersSoFar. On the normal flow it always is (Q3 runs first). Reaching
 * this screen in editMode from the summary may not carry it, in which case
 * the line is omitted rather than guessed.
 */

type VolumePreferenceValue = '8-12' | '12-16' | '16-20';

interface VolumeOption {
  value: VolumePreferenceValue;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: VolumeOption[] = [
  {
    value: '8-12',
    title: 'Conservative',
    subtitle:
      '8 to 12 sets per muscle per week. Enough to grow on. Good if you are new to lifting or short on time.',
    icon: 'leaf-outline',
  },
  {
    value: '12-16',
    title: 'Moderate',
    subtitle:
      '12 to 16 sets per muscle per week. Solid growth without your week revolving around the gym.',
    icon: 'speedometer-outline',
  },
  {
    value: '16-20',
    title: 'High',
    subtitle:
      '16 to 20 sets per muscle per week. More stimulus, and more fatigue to recover from. Needs sleep and food behind it.',
    icon: 'flame-outline',
  },
];

type ParamList = {
  Q6Volume: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
};

export default function Q6VolumePreferenceScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'Q6Volume'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const stepOffset = route.params?.flowStepOffset ?? 0;
  const [selected, setSelected] = useState<VolumePreferenceValue | null>(
    (answersSoFar.volumePreference as VolumePreferenceValue) ?? null,
  );

  const trainingDays =
    typeof answersSoFar.totalTrainingDays === 'number'
      ? (answersSoFar.totalTrainingDays as number)
      : null;

  const handleNext = async () => {
    if (!selected) return;

    // Always save the answer to storage, whether in edit mode or not
    await updateQuestionnaireField('volumePreference', selected);

    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'Q7RestStyle',
      {
        answersSoFar: { ...answersSoFar, volumePreference: selected },
        flowStepOffset: stepOffset,
      },
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 5}
        totalSteps={stepOffset + 6}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>How much volume?</Text>
        <Text style={styles.subtitle}>
          Sets per muscle per week. This is the dial that drives growth, and it
          keeps paying as it climbs, just by less each time.
        </Text>

        <View>
          {OPTIONS.map((opt) => (
            <QuestionCard
              key={opt.value}
              icon={opt.icon}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={selected === opt.value}
              onPress={() => setSelected(opt.value)}
            />
          ))}
        </View>

        {trainingDays !== null && (
          <View style={styles.tieLine}>
            <Ionicons
              name="information-circle"
              size={15}
              color={themeColor}
              style={{ marginTop: 1 }}
            />
            <Text style={styles.tieLineText}>
              Your {trainingDays} {trainingDays === 1 ? 'day' : 'days'} a week
              decides how these sets get split up, not how many there are.
            </Text>
          </View>
        )}
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
    marginBottom: 28,
  },

  tieLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    borderRadius: 12,
  },
  tieLineText: {
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