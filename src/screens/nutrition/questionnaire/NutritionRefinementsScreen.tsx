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
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  saveNutritionAnswers,
  updateNutritionField,
} from '../../../utils/nutritionQuestionnaireStorage';
import { finalizeNutrition } from '../../../utils/nutritionMacros';

/**
 * NutritionRefinements — optional final step before the Summary.
 *
 * SCOPE NOTE: allergies and foods-to-avoid USED to live here too, but they
 * are now collected in the main flow at N5b (a hard-constraint step). To keep
 * a single source of truth, this screen no longer touches allergies/avoidFoods
 * — it only collects EATING CHALLENGES (soft shaping signal). Leaving the old
 * groups here would let this screen silently overwrite the N5b answers.
 *
 * On Continue (non-edit) it consolidates the full answer set into the draft
 * store, then runs finalizeNutrition() — which computes macros and writes BOTH
 * storage keys the prompt builder reads. That's the step that makes
 * assembleMealPlanningPrompt() fire. Then it goes to the Summary hub.
 *
 * editMode (entered from Summary) just updates eatingChallenges in the draft
 * and pops back; Summary re-finalizes on its own Continue.
 */

const EATING_CHALLENGES = [
  'Low appetite',
  'Time-poor',
  'Picky eater',
  'Cook for family',
  'Eat out often',
  'Emotional eating',
];

type ParamList = {
  NutritionRefinements:
    | { answersSoFar?: Record<string, any>; editMode?: boolean }
    | undefined;
};

export default function NutritionRefinementsScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'NutritionRefinements'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;

  const [challenges, setChallenges] = useState<string[]>(
    (answersSoFar.eatingChallenges as string[]) ?? []
  );
  const [saving, setSaving] = useState(false);

  // Reset the spinner if we pop back here (mirrors the workout fix).
  useFocusEffect(
    useCallback(() => {
      setSaving(false);
    }, [])
  );

  const toggle = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    setList(
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item]
    );
  };

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (editMode) {
        // Only eatingChallenges — allergies/avoid are owned by N5b now.
        await updateNutritionField('eatingChallenges', challenges);
        navigation.goBack();
        return;
      }

      const merged = {
        ...answersSoFar,
        eatingChallenges: challenges,
      };
      await saveNutritionAnswers(merged);

      // Compute macros + write nutrition_questionnaire_results and
      // budget_cooking_questionnaire_results — the prompt builder's inputs.
      const macros = await finalizeNutrition(merged);
      if (!macros) {
        Alert.alert(
          'Missing details',
          'Some required answers are missing — go back and complete the earlier steps.'
        );
        setSaving(false);
        return;
      }

      navigation.navigate('NutritionSummary' as never);
    } catch (e) {
      console.error('Refinements continue failed', e);
      Alert.alert('Something went wrong', 'Could not save your answers. Try again.');
      setSaving(false);
    }
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const renderGroup = (
    title: string,
    subtitle: string,
    options: string[],
    selected: string[],
    setSelected: (v: string[]) => void
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      <View style={styles.chipsRow}>
        {options.map((opt) => {
          const isSel = selected.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              activeOpacity={0.85}
              onPress={() => toggle(selected, setSelected, opt)}
              style={[
                styles.chip,
                isSel && {
                  borderColor: themeColor,
                  backgroundColor: 'rgba(34, 211, 238, 0.07)',
                  borderWidth: 1.5,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  isSel && { color: '#ffffff', fontWeight: '600' },
                ]}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
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
        <Text style={styles.question}>Anything we should know?</Text>
        <Text style={styles.subtitle}>
          Optional context that helps shape your plan. Skip if none apply.
        </Text>

        {renderGroup(
          'Eating challenges',
          'Helps shape portions, timing, and meal style.',
          EATING_CHALLENGES,
          challenges,
          setChallenges
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <View
        style={[
          styles.ctaBar,
          { paddingBottom: Math.max(insets.bottom, 12) + 4 },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={saving}
          onPress={handleContinue}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
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
  section: { marginBottom: 32 },
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
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  chipText: { fontSize: 13, fontWeight: '500', color: '#d4d4d8' },
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
  ctaText: { fontSize: 15, fontWeight: '500' },
});