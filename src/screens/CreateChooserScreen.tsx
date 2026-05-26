// src/screens/CreateChooserScreen.tsx
//
// The "What do you want to create?" modal users land on when they tap
// the Create (+) button. Lets them choose between a custom workout plan
// (which kicks off the questionnaire flow) or a custom meal plan (which
// now kicks off the nutrition questionnaire flow).
//
// The meal-plan card routes into the required nutrition questionnaire:
// NutritionSummary if the NEW questionnaire draft is complete, otherwise
// N1Goal fresh. The completeness check reads the nutrition DRAFT store
// (hasCompleteNutritionAnswers), NOT the finalized result keys — those
// can hold stale completedAt from the old nutrition questionnaires, which
// would wrongly route a brand-new user straight to an empty Summary.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { getCreateImage } from '../assets/createImages';
import { WorkoutStorage } from '../utils/storage';
import { hasCompleteQuestionnaire } from '../utils/questionnaireStorage';
import { hasCompleteNutritionAnswers } from '../utils/nutritionQuestionnaireStorage';

type NavProp = StackNavigationProp<RootStackParamList>;

type CreateOption = {
  id: 'workout' | 'nutrition';
  eyebrow: string;
  title: string;
};

const OPTIONS: CreateOption[] = [
  {
    id: 'workout',
    eyebrow: 'WORKOUT',
    title: 'Custom workout plan',
  },
  {
    id: 'nutrition',
    eyebrow: 'NUTRITION',
    title: 'Custom meal plan',
  },
];

export default function CreateChooserScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const [awaitingImport, setAwaitingImport] = useState(false);
  const [hasSavedPlan, setHasSavedPlan] = useState(false);
  const [hasNutritionPlan, setHasNutritionPlan] = useState(false);

  useEffect(() => {
    const check = async () => {
      const pending = await WorkoutStorage.isAwaitingImport();
      const complete = await hasCompleteQuestionnaire();
      const nutritionComplete = await hasCompleteNutritionAnswers();
      setAwaitingImport(pending);
      setHasSavedPlan(complete);
      setHasNutritionPlan(nutritionComplete);
    };
    check();
    const unsub = navigation.addListener('focus', check);
    return unsub;
  }, [navigation]);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleSelect = (option: CreateOption) => {
    // Dismiss the chooser modal, then immediately push the relevant
    // questionnaire. This keeps the chooser out of the back stack so
    // back-arrow from the questionnaire returns to the tab bar instead
    // of looping back through the chooser.
    navigation.goBack();

    // Slight delay to let the dismiss animation start before the
    // next push — feels more natural than stacking the navigations.
    setTimeout(() => {
      if (option.id === 'workout') {
        if (hasSavedPlan) {
          navigation.navigate('QuestionnaireSummary');
        } else {
          navigation.navigate('Q1PrimaryGoal', undefined);
        }
      } else {
        if (hasNutritionPlan) {
          navigation.navigate('NutritionSummary');
        } else {
          navigation.navigate('N1Goal', undefined);
        }
      }
    }, 50);
  };


  return (
    <View style={styles.container}>
      {/* Close button — top left */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={22} color="#d4d4d8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>What do you want{'\n'}to create?</Text>
          <Text style={styles.subtitle}>Pick one to get started.</Text>
        </View>


        {/* Cards */}
        {OPTIONS.map((option) => {
          const imageSource = getCreateImage(option.id);
          return (
            <TouchableOpacity
              key={option.id}
              style={styles.card}
              onPress={() => handleSelect(option)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={option.title}
            >
              <View style={styles.cardImageWrap}>
                {imageSource ? (
                  <Image
                    source={imageSource}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  // Fallback gradient if image missing
                  <View style={[styles.cardImage, styles.cardImageFallback]} />
                )}

                {/* Dark gradient overlay for text legibility */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.85)']}
                  style={styles.cardGradient}
                  pointerEvents="none"
                />

                {/* Text + CTA overlay */}
                <View style={styles.cardOverlay}>
                  <Text style={styles.cardEyebrow}>{option.eyebrow}</Text>
                  <View style={styles.cardBottomRow}>
                    <Text style={styles.cardTitle}>{option.title}</Text>
                    <View
                      style={[
                        styles.cardArrowButton,
                        { backgroundColor: themeColor, shadowColor: themeColor },
                      ]}
                    >
                      <Ionicons name="arrow-forward" size={20} color="#0a0a0b" />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleBlock: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 22,
  },


  // ===== Card =====
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#18181b',
  },
  cardImageWrap: {
    height: 220,
    position: 'relative',
  },
  cardImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cardImageFallback: {
    backgroundColor: '#1f1f23',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  cardEyebrow: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardArrowButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
});