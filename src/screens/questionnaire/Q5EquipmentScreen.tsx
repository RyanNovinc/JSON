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
    subtitle: 'Barbell, plates, rack, bench.',
    icon: 'home',
  },
  {
    value: 'basic_equipment',
    title: 'Basic equipment',
    subtitle: 'Dumbbells, resistance bands, pull-up bar.',
    icon: 'barbell-outline',
  },
  {
    value: 'bodyweight',
    title: 'Bodyweight only',
    subtitle: 'No equipment. Calisthenics-focused programming.',
    icon: 'body',
  },
];

type ParamList = {
  Q5Equipment: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function Q5EquipmentScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'Q5Equipment'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const [selected, setSelected] = useState<EquipmentValue[]>(
    (answersSoFar.selectedEquipment as EquipmentValue[]) ?? [],
  );

  const toggle = (value: EquipmentValue) => {
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
      'Q6Volume' as never,
      {
        answersSoFar: { ...answersSoFar, selectedEquipment: selected },
      } as never,
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  const canContinue = selected.length > 0;

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={5}
        totalSteps={7}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>What's available to you?</Text>
        <Text style={styles.subtitle}>
          Decides what exercises the AI can choose from. Pick all that apply.
        </Text>

        <View>
          {OPTIONS.map((opt) => (
            <QuestionCard
              key={opt.value}
              icon={opt.icon}
              title={opt.title}
              subtitle={opt.subtitle}
              selected={selected.includes(opt.value)}
              onPress={() => toggle(opt.value)}
            />
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
});