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
 * Q6 — Volume Preference
 * Step 6 of 7.
 *
 * Values must match the volumePreference expected by the storage layer.
 * On Continue, routes to Q7RestStyle.
 *
 * Shows weekly volume ranges for muscle building.
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
    subtitle: '8-12 sets per muscle per week. Ideal for beginners or recovery focus.',
    icon: 'leaf-outline',
  },
  {
    value: '12-16',
    title: 'Moderate',
    subtitle: '12-16 sets per muscle per week. Balanced growth and recovery.',
    icon: 'speedometer-outline',
  },
  {
    value: '16-20',
    title: 'High Volume',
    subtitle: '16-20 sets per muscle per week. Maximum growth stimulus.',
    icon: 'flame-outline',
  },
];

type ParamList = {
  Q6Volume: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function Q6VolumePreferenceScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'Q6Volume'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const [selected, setSelected] = useState<VolumePreferenceValue | null>(
    (answersSoFar.volumePreference as VolumePreferenceValue) ?? null,
  );

  const handleNext = async () => {
    if (!selected) return;
    
    // Always save the answer to storage, whether in edit mode or not
    await updateQuestionnaireField('volumePreference', selected);
    
    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'Q7RestStyle' as never,
      {
        answersSoFar: { ...answersSoFar, volumePreference: selected },
      } as never,
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={6}
        totalSteps={7}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>How much volume?</Text>
        <Text style={styles.subtitle}>
          More sets build more muscle. Fewer sets allow better recovery.
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