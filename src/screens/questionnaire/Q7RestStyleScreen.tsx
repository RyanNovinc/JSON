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
 * Q7 — Rest Style
 * Step 7 of 7 (final required step).
 *
 * Values must match the `sessionStyle` union in QuestionnaireData.
 * On Next, routes to the optional Refinements screen.
 */

type SessionStyleValue = 'optimal' | 'moderate' | 'minimal';

interface RestOption {
  value: SessionStyleValue;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: RestOption[] = [
  {
    value: 'optimal',
    title: 'Optimal',
    subtitle: 'Full recovery between sets, maximum strength. 2–4 min between sets',
    icon: 'hourglass-outline',
  },
  {
    value: 'moderate',
    title: 'Moderate',
    subtitle: 'Balanced strength and conditioning. 60–90 sec between sets',
    icon: 'time-outline',
  },
  {
    value: 'minimal',
    title: 'Minimal',
    subtitle: 'Short rest, more cardio stress. 30–60 sec between sets',
    icon: 'flash-outline',
  },
];

type ParamList = {
  Q7RestStyle: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function Q7RestStyleScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<ParamList, 'Q7RestStyle'>>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const [selected, setSelected] = useState<SessionStyleValue | null>(
    (answersSoFar.sessionStyle as SessionStyleValue) ?? null,
  );

  const handleNext = async () => {
    if (!selected) return;
    
    // Always save the answer to storage, whether in edit mode or not
    await updateQuestionnaireField('sessionStyle', selected);
    
    if (editMode) {
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'QuestionnaireRefinements',
      {
        answersSoFar: { ...answersSoFar, sessionStyle: selected },
      },
    );
  };

  const handleBack = () => navigation.goBack();
  const handleClose = () => navigation.popToTop();

  return (
    <View style={styles.container}>
      <QuestionnaireHeader
        currentStep={7}
        totalSteps={7}
        onBack={handleBack}
        onClose={handleClose}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.eyebrow, { color: themeColor }]}>7 OF 7</Text>

        <Text style={styles.question}>How long between sets?</Text>
        <Text style={styles.subtitle}>
          More rest builds strength. Less rest builds conditioning.
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
            { backgroundColor: selected ? themeColor : '#27272a' },
          ]}
        >
          <Text
            style={[
              styles.ctaText,
              { color: selected ? '#0a0a0b' : '#52525b' },
            ]}
          >
            {editMode ? 'Save' : 'Next'}
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
    paddingTop: 24,
    paddingBottom: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  question: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 38,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#a1a1aa',
    lineHeight: 22,
    marginBottom: 28,
  },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
    backgroundColor: '#0a0a0b',
  },
  ctaButton: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
  },
});