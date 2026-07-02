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
 * Q5 — Equipment
 * Step 5 of 7.
 *
 * Multi-select. Values must match the `selectedEquipment` union
 * elements in QuestionnaireData. Note: it's 'bodyweight' (NOT
 * 'bodyweight_only').
 *
 * Uses the shared QuestionCard. When multiple cards are selected
 * each shows the expanded state with its own subtitle — that's
 * intentional: it confirms each pick.
 */

type EquipmentValue =
  | 'commercial_gym'
  | 'home_gym'
  | 'bodyweight'
  | 'basic_equipment';

interface EquipmentOption {
  value: EquipmentValue;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  comingSoon?: boolean;
}

const OPTIONS: EquipmentOption[] = [
  {
    value: 'commercial_gym',
    title: 'Commercial gym',
    subtitle: 'Full access — machines, racks, cables, dumbbells.',
    icon: 'business',
  },
  {
    value: 'home_gym',
    title: 'Home gym',
    subtitle: 'Custom home workouts with your equipment.',
    icon: 'home',
    comingSoon: true,
  },
  {
    value: 'basic_equipment',
    title: 'Basic equipment',
    subtitle: 'Minimal equipment routines and bodyweight hybrids.',
    icon: 'barbell-outline',
    comingSoon: true,
  },
  {
    value: 'bodyweight',
    title: 'Bodyweight only',
    subtitle: 'No-equipment calisthenics and progressions.',
    icon: 'body',
    comingSoon: true,
  },
];

type ParamList = {
  Q5Equipment: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
};

export default function Q5EquipmentScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'Q5Equipment'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const stepOffset = route.params?.flowStepOffset ?? 0;
  const [selected, setSelected] = useState<EquipmentValue[]>(
    (answersSoFar.selectedEquipment as EquipmentValue[]) ?? [],
  );

  const toggle = (value: EquipmentValue) => {
    const option = OPTIONS.find(opt => opt.value === value);
    if (option?.comingSoon) {
      // Don't allow selection of coming soon options
      return;
    }
    
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  };

  const handleNext = async () => {
    if (selected.length === 0) return;
    
    // Always save the answer to storage, whether in edit mode or not
    await updateQuestionnaireField('selectedEquipment', selected);
    
    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'Q6Volume',
      {
        answersSoFar: { ...answersSoFar, selectedEquipment: selected },
        flowStepOffset: stepOffset,
      },
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const canContinue = selected.length > 0;

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={stepOffset + 4}
        totalSteps={stepOffset + 6}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>What&apos;s available to you?</Text>
        <Text style={styles.subtitle}>
          Decides what exercises the AI can choose from. Pick all that apply.
        </Text>

        <View>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              activeOpacity={opt.comingSoon ? 1 : 0.85}
              onPress={() => toggle(opt.value)}
              style={[
                styles.card,
                selected.includes(opt.value) && styles.cardSelected,
                opt.comingSoon && styles.cardDisabled,
              ]}
            >
              {opt.comingSoon && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Coming Soon</Text>
                </View>
              )}
              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <Ionicons 
                    name={opt.icon} 
                    size={20} 
                    color={opt.comingSoon ? '#52525b' : selected.includes(opt.value) ? themeColor : '#d4d4d8'} 
                  />
                  <View style={styles.cardTexts}>
                    <Text style={[
                      styles.cardTitle, 
                      opt.comingSoon && styles.cardTitleDisabled,
                      selected.includes(opt.value) && styles.cardTitleSelected
                    ]}>
                      {opt.title}
                    </Text>
                    <Text style={[
                      styles.cardSubtitle,
                      opt.comingSoon && styles.cardSubtitleDisabled
                    ]}>
                      {opt.subtitle}
                    </Text>
                  </View>
                </View>
                {selected.includes(opt.value) && !opt.comingSoon && (
                  <Ionicons name="checkmark-circle" size={20} color={themeColor} />
                )}
              </View>
            </TouchableOpacity>
          ))}
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
          disabled={!canContinue}
          onPress={handleNext}
          style={[
            styles.ctaButton,
            { backgroundColor: canContinue ? themeColor : '#1c1c1f' },
          ]}
        >
          <Text
            style={[
              styles.ctaText,
              { color: canContinue ? '#0a0a0b' : '#3f3f46' },
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
  card: {
    backgroundColor: '#131316',
    borderWidth: 1.5,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  cardSelected: {
    borderColor: '#22d3ee',
    backgroundColor: 'rgba(34, 211, 238, 0.08)',
  },
  cardDisabled: {
    opacity: 0.6,
    backgroundColor: '#0f0f10',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 1,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  cardTexts: {
    marginLeft: 14,
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardTitleSelected: {
    color: '#22d3ee',
  },
  cardTitleDisabled: {
    color: '#71717a',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 18,
  },
  cardSubtitleDisabled: {
    color: '#52525b',
  },
});