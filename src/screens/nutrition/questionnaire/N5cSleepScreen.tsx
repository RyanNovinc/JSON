import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import QuestionnaireHeader from '../../questionnaire/QuestionnaireHeader';
import { WorkoutStorage } from '../../../utils/storage';

/**
 * N5c — Sleep & meal timing
 * Single-screen replacement for the old 3-screen SleepOptimizationScreen.
 * Captures only the inputs the meal plan actually needs: bedtime, wake time,
 * and a timing-strictness choice. No results page, no research modal, no
 * workout branch — the AI computes meal times from these three values.
 *
 * STORAGE — writes the LEGACY shape the prompt already reads:
 *   WorkoutStorage.saveSleepOptimizationResults({
 *     formData: { bedtime, wakeTime, optimizationLevel }, completedAt
 *   })
 * The prompt builder keys off sleepResults.formData.optimizationLevel with
 * values 'minimal' | 'moderate' | 'maximum'. We keep friendly UI labels
 * (Relaxed / Balanced / Strict) but store those enum values, so NO prompt
 * change is needed.
 *
 * Note: unlike the allergies step, sleep lives in its own WorkoutStorage key,
 * NOT in the NutritionAnswers draft — that's how the prompt already reads it.
 * So this screen saves directly and forwards answersSoFar untouched.
 *
 * NOTE: this is step 7 of 12 once inserted after N5b. Bump downstream
 * currentStep/totalSteps accordingly (11 -> 12). N5b's handleNext must point
 * here ('N5cSleep') instead of 'N6MealsSnacking'; this screen forwards to
 * 'N6MealsSnacking'.
 */

type Strictness = 'minimal' | 'moderate' | 'maximum';

const BEDTIMES = [
  '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM',
  '11:00 PM', '11:30 PM', '12:00 AM', '12:30 AM', '1:00 AM',
];

const WAKE_TIMES = [
  '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM',
  '7:00 AM', '7:30 AM', '8:00 AM', '8:30 AM', '9:00 AM', '10:00 AM',
];

interface StrictOption {
  value: Strictness;
  title: string;
  desc: string;
}

// Sleep quality directly impacts muscle recovery and growth hormone release.
// Deep sleep triggers GH bursts essential for muscle protein synthesis.
// Research shows: small protein snacks (30min), light meals (1h), large meals (2-3h+).
const STRICT_OPTIONS: StrictOption[] = [
  {
    value: 'minimal',
    title: 'Performance-focused',
    desc: 'Protein snacks anytime, light meals 1h before bed. Optimize muscle building over timing.',
  },
  {
    value: 'moderate',
    title: 'Balanced',
    desc: 'Small protein snacks OK, larger meals 2h before bed. Good balance for most people.',
  },
  {
    value: 'maximum',
    title: 'Sleep-first',
    desc: 'All food 3+ hours before bed. Prioritize deep sleep and growth hormone over late nutrition.',
  },
];

type ParamList = {
  N5cSleep: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

// LayoutAnimation needs explicit opt-in on Android.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function N5cSleepScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'N5cSleep'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  const [bedtime, setBedtime] = useState<string>('');
  const [wakeTime, setWakeTime] = useState<string>('');
  const [strictness, setStrictness] = useState<Strictness>('moderate');

  // Prefill from any previously saved sleep result (edit / revisit).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await WorkoutStorage.loadSleepOptimizationResults();
        const f = saved?.formData;
        if (active && f) {
          if (f.bedtime) setBedtime(f.bedtime);
          if (f.wakeTime) setWakeTime(f.wakeTime);
          if (f.optimizationLevel === 'minimal' || f.optimizationLevel === 'maximum') {
            setStrictness(f.optimizationLevel);
          } else if (f.optimizationLevel) {
            setStrictness('moderate');
          }
        }
      } catch {
        // no saved sleep data — fine, this step is optional
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Both times set, or both empty (skipped) — never one without the other.
  const oneTimeOnly = (!!bedtime) !== (!!wakeTime);
  // The strictness block only appears once both times are chosen, so the
  // screen opens as just two clean time rows rather than a wall of options.
  const bothTimesSet = !!bedtime && !!wakeTime;

  // Animate layout changes (the strictness block sliding in / out) when a
  // time is picked or cleared.
  const selectTime = (setter: (v: string) => void) => (v: string) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(200, 'easeInEaseOut', 'opacity')
    );
    setter(v);
  };

  const persist = async () => {
    if (bedtime && wakeTime) {
      await WorkoutStorage.saveSleepOptimizationResults({
        formData: { bedtime, wakeTime, optimizationLevel: strictness },
        completedAt: new Date().toISOString(),
      });
    }
    // If skipped (no times), we simply don't write — the prompt degrades to
    // its generic meal-timing guidance, which is the correct default.
  };

  const handleNext = async () => {
    if (oneTimeOnly) return;
    await persist();

    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'N6MealsSnacking',
      { answersSoFar }
    );
  };

  const handleSkip = async () => {
    // Explicit skip: clear times locally and continue without writing.
    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate('N6MealsSnacking', { answersSoFar });
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const renderTimeRow = (
    options: string[],
    value: string,
    onSelect: (v: string) => void
  ) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.timeRowContent}
      style={styles.timeRow}
    >
      {options.map((opt) => {
        const on = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            activeOpacity={0.8}
            onPress={() => onSelect(on ? '' : opt)}
            style={[
              styles.timeChip,
              on && { backgroundColor: themeColor, borderColor: 'transparent' },
            ]}
          >
            <Text style={[styles.timeChipText, on && styles.timeChipTextOn]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={7}
        totalSteps={12}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.question}>Sleep & recovery</Text>
        <Text style={styles.subtitle}>
          Deep sleep triggers growth hormone for muscle recovery. Meal timing affects sleep quality and your body's ability to build muscle overnight.
        </Text>

        <Text style={styles.label}>Bedtime</Text>
        {renderTimeRow(BEDTIMES, bedtime, selectTime(setBedtime))}

        <Text style={styles.label}>Wake time</Text>
        {renderTimeRow(WAKE_TIMES, wakeTime, selectTime(setWakeTime))}

        {bothTimesSet && (
          <>
            <Text style={[styles.label, { marginTop: 6 }]}>Meal timing approach</Text>
            <Text style={styles.labelHint}>
              How important is optimizing meal timing for sleep quality and recovery?
            </Text>
            {STRICT_OPTIONS.map((opt) => {
              const on = strictness === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.85}
                  onPress={() => setStrictness(opt.value)}
                  style={[styles.opt, on && { borderWidth: 2, borderColor: themeColor, backgroundColor: '#0e1719' }]}
                >
                  <View style={styles.optTop}>
                    <Text style={[styles.optTitle, on && { color: themeColor }]}>{opt.title}</Text>
                    {on && <Ionicons name="checkmark-circle" size={20} color={themeColor} />}
                  </View>
                  <Text style={styles.optDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        {!bothTimesSet && !editMode && (
          <TouchableOpacity activeOpacity={0.7} onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!bothTimesSet}
          onPress={handleNext}
          style={[
            styles.ctaButton,
            { backgroundColor: bothTimesSet ? themeColor : '#1c1c1f' },
          ]}
        >
          <Text style={[styles.ctaText, { color: bothTimesSet ? '#0a0a0b' : '#3f3f46' }]}>
            {editMode ? 'Save' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24 },
  question: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subtitle: { fontSize: 13, color: '#71717a', lineHeight: 19, marginBottom: 26 },

  label: { fontSize: 14, fontWeight: '600', color: '#ffffff', marginBottom: 9 },
  labelHint: { fontSize: 12, color: '#71717a', marginTop: -4, marginBottom: 12, lineHeight: 17 },

  timeRow: { marginHorizontal: -20, marginBottom: 22 },
  timeRowContent: { paddingHorizontal: 20, gap: 7 },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  timeChipText: { fontSize: 13, fontWeight: '500', color: '#d4d4d8' },
  timeChipTextOn: { color: '#0a0a0b', fontWeight: '600' },

  opt: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    backgroundColor: '#131316',
    borderRadius: 12,
    padding: 13,
    marginBottom: 10,
  },
  optTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  optTitle: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  optDesc: { fontSize: 12.5, color: '#71717a', lineHeight: 18 },

  ctaBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
    backgroundColor: '#0a0a0b',
  },
  skipBtn: {
    height: 54,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { fontSize: 15, fontWeight: '500', color: '#a1a1aa' },
  ctaButton: { flex: 1, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontSize: 15, fontWeight: '500' },
});