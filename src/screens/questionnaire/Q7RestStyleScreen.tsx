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
  restHint: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const OPTIONS: RestOption[] = [
  {
    value: 'optimal',
    title: 'Optimal',
    subtitle: 'Full recovery between sets, maximum strength',
    restHint: '2–4 min between sets',
    icon: 'hourglass-outline',
  },
  {
    value: 'moderate',
    title: 'Moderate',
    subtitle: 'Balanced strength and conditioning',
    restHint: '60–90 sec between sets',
    icon: 'time-outline',
  },
  {
    value: 'minimal',
    title: 'Minimal',
    subtitle: 'Short rest, more cardio stress',
    restHint: '30–60 sec between sets',
    icon: 'flash-outline',
  },
];

type ParamList = {
  Q7RestStyle: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
};

export default function Q7RestStyleScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<RouteProp<ParamList, 'Q7RestStyle'>>();
  const insets = useSafeAreaInsets();
  const { themeColor, colors } = useTheme();

  const answersSoFar = route.params?.answersSoFar ?? {};
  const editMode = route.params?.editMode ?? false;
  const [selected, setSelected] = useState<SessionStyleValue | null>(
    (answersSoFar.sessionStyle as SessionStyleValue) ?? null,
  );

  const handleNext = async () => {
    if (!selected) return;
    if (editMode) {
      await updateQuestionnaireField('sessionStyle', selected);
      navigation.goBack();
      return;
    }
    navigation.navigate(
      'QuestionnaireRefinements' as never,
      {
        answersSoFar: { ...answersSoFar, sessionStyle: selected },
      } as never,
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

        <View style={styles.optionsList}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.85}
                onPress={() => setSelected(opt.value)}
                style={[
                  styles.card,
                  isSelected && {
                    borderColor: themeColor,
                    backgroundColor: colors.primaryAlpha20,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconBox,
                    isSelected && { backgroundColor: themeColor },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={isSelected ? '#0a0a0b' : '#a1a1aa'}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{opt.title}</Text>
                  <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
                  <Text style={styles.restHint}>{opt.restHint}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
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
  optionsList: {
    gap: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 18,
  },
  restHint: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
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