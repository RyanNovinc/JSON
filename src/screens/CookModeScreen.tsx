import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import {
  useCookTimers,
  formatRemaining,
  formatEndTime,
  ActiveCookTimer,
} from '../contexts/CookTimerContext';
import { CURATED_MEALS } from '../data/curated_meals';
import { MEAL_SUBSTEPS } from '../data/meal_substeps';
import {
  CuratedMeal,
  Plate,
  CookingMethod,
  RecipeStep,
} from '../types/curated_meals';
import { getMealImage } from '../assets/mealImages';

type CookModeRoute = RouteProp<RootStackParamList, 'CookMode'>;
type CookModeNav = StackNavigationProp<RootStackParamList, 'CookMode'>;

// ============================================================================
// Substep helpers
// ============================================================================

function getSubstepText(substep: any): string {
  if (typeof substep === 'string') return substep;
  if (substep && typeof substep === 'object' && 'text' in substep) return substep.text;
  return String(substep);
}

function getSubstepTimer(substep: any): { seconds: number; label: string } | null {
  if (
    substep &&
    typeof substep === 'object' &&
    'timer_seconds' in substep &&
    'timer_label' in substep
  ) {
    return { seconds: substep.timer_seconds, label: substep.timer_label };
  }
  return null;
}

function getStepSummary(step: any): string {
  if (typeof step === 'string') return step;
  return step?.summary ?? step?.text ?? '';
}

function getSubstepsOverride(
  mealSlug: string,
  methodOrPlateId: string,
  stepIndex: number
): any[] | null {
  const mealSubsteps = (MEAL_SUBSTEPS as any)?.[mealSlug];
  if (!mealSubsteps) return null;
  const sectionSubsteps = mealSubsteps[methodOrPlateId];
  if (!sectionSubsteps) return null;
  const stepSubsteps = sectionSubsteps[stepIndex];
  if (!Array.isArray(stepSubsteps) || stepSubsteps.length === 0) return null;
  return stepSubsteps;
}

function renderHighlightedText(text: string, color: string) {
  const re =
    /(\b\d+(?:\.\d+)?(?:\/\d+)?\s*(?:-\s*\d+(?:\.\d+)?(?:\/\d+)?\s*)?(?:g\b|kg\b|ml\b|l\b|tsp\b|tbsp\b|oz\b|lb\b|cm\b|mm\b|minutes?\b|mins?\b|seconds?\b|secs?\b|hours?\b|hrs?\b|cups?\b|cloves?\b|°C\b|°F\b))/gi;

  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), highlight: false });
    }
    parts.push({ text: match[0], highlight: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }

  return parts.map((part, i) =>
    part.highlight ? (
      <Text key={i} style={{ color, fontWeight: '600' }}>
        {part.text}
      </Text>
    ) : (
      <Text key={i}>{part.text}</Text>
    )
  );
}

type CookStep =
  | { type: 'base'; index: number; raw: RecipeStep | string }
  | { type: 'plate'; index: number; raw: RecipeStep | string };

// ============================================================================
// Floating timer card
// ============================================================================

interface TimerCardProps {
  timer: ActiveCookTimer;
  themeColor: string;
  onAdjust: (delta_seconds: number) => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}

function TimerCard({
  timer,
  themeColor,
  onAdjust,
  onPause,
  onResume,
  onCancel,
  onDismiss,
}: TimerCardProps) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (timer.state === 'finished') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timer.state]);

  const isFinished = timer.state === 'finished';
  const isPaused = timer.state === 'paused';
  const endTimeLabel = formatEndTime(timer.remaining_seconds);

  const progress =
    timer.total_seconds > 0
      ? 1 - timer.remaining_seconds / timer.total_seconds
      : 1;

  const RADIUS = 15;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  return (
    <Animated.View
      style={[
        styles.timerCard,
        isFinished && {
          backgroundColor: themeColor,
          borderColor: themeColor,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <View style={styles.timerRing}>
        <Svg
          width={36}
          height={36}
          viewBox="0 0 36 36"
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          <Circle
            cx={18}
            cy={18}
            r={RADIUS}
            stroke={isFinished ? 'rgba(0,0,0,0.2)' : '#27272a'}
            strokeWidth={3}
            fill="none"
          />
          <Circle
            cx={18}
            cy={18}
            r={RADIUS}
            stroke={isFinished ? '#000' : themeColor}
            strokeWidth={3}
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={`${CIRCUMFERENCE * (1 - progress)}`}
            strokeLinecap="round"
          />
        </Svg>
        {isFinished && (
          <Ionicons
            name="notifications"
            size={16}
            color="#000"
            style={{ position: 'absolute' }}
          />
        )}
      </View>

      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={[
            styles.timerLabel,
            { color: isFinished ? 'rgba(0,0,0,0.7)' : themeColor },
          ]}
        >
          {timer.label.toUpperCase()}
          {endTimeLabel && !isFinished && (
            <Text style={{ color: '#71717a', fontWeight: '400' }}>
              {'  ·  Ready ' + endTimeLabel}
            </Text>
          )}
        </Text>
        <Text
          style={[
            styles.timerTime,
            { color: isFinished ? '#000' : '#fff' },
          ]}
        >
          {isFinished ? "Time's up" : formatRemaining(timer.remaining_seconds)}
        </Text>
      </View>

      {isFinished ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            style={styles.timerActionFinished}
            onPress={() => onAdjust(60)}
            activeOpacity={0.7}
          >
            <Text style={{ color: '#000', fontSize: 12, fontWeight: '700' }}>+1m</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timerActionFinished}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          <View style={styles.timerAdjustPill}>
            <TouchableOpacity
              style={styles.timerAdjustHalf}
              onPress={() => onAdjust(-15)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 0 }}
            >
              <Text style={styles.timerAdjustText}>−15s</Text>
            </TouchableOpacity>
            <View style={styles.timerAdjustDivider} />
            <TouchableOpacity
              style={styles.timerAdjustHalf}
              onPress={() => onAdjust(15)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 0, right: 4 }}
            >
              <Text style={styles.timerAdjustText}>+15s</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.timerAction}
            onPress={isPaused ? onResume : onPause}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={14}
              color="#d4d4d8"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.timerAction}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color="#71717a" />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

// ============================================================================
// Component
// ============================================================================
export default function CookModeScreen() {
  const navigation = useNavigation<CookModeNav>();
  const route = useRoute<CookModeRoute>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const {
    timers,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    adjustTimer,
    dismissFinished,
    isTimerActive,
  } = useCookTimers();

  useKeepAwake();

  const { mealSlug, plateIndex, methodIndex } = route.params;
  const meal: CuratedMeal | undefined = (CURATED_MEALS as any)[mealSlug];
  const plate: Plate | undefined = meal?.plates?.[plateIndex];
  const method: CookingMethod | undefined = meal?.methods?.[methodIndex];

  const steps: CookStep[] = useMemo(() => {
    if (!method || !plate) return [];
    const baseSteps: CookStep[] = method.instructions.map((raw, i) => ({
      type: 'base' as const,
      index: i,
      raw,
    }));
    const plateSteps: CookStep[] = plate.additional_instructions.map((raw, i) => ({
      type: 'plate' as const,
      index: i,
      raw,
    }));
    return [...baseSteps, ...plateSteps];
  }, [method, plate]);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [checkedSubsteps, setCheckedSubsteps] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);

  if (!meal || !plate || !method) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20, padding: 20 }]}>
        <Text style={styles.errorTitle}>Recipe not found</Text>
        <TouchableOpacity style={styles.errorBack} onPress={() => navigation.goBack()}>
          <Text style={styles.errorBackText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalSteps = steps.length;
  const currentStep = steps[currentStepIdx];
  const isLastStep = currentStepIdx === totalSteps - 1;
  const isFirstStep = currentStepIdx === 0;

  const stepSummary = getStepSummary(currentStep.raw);

  const sectionId = currentStep.type === 'base' ? method.id : plate.id;
  const overrideSubsteps = getSubstepsOverride(meal.slug, sectionId, currentStep.index);

  const hasSplitSubsteps =
    overrideSubsteps !== null &&
    (overrideSubsteps.length > 1 ||
      (overrideSubsteps.length === 1 &&
        getSubstepText(overrideSubsteps[0]) !== stepSummary));

  const sectionLabel = currentStep.type === 'plate' ? 'PLATE IT UP' : null;

  const showReserveNoteOnThisStep =
    !!plate.reserve_before_finishing_note &&
    currentStep.type === 'base' &&
    currentStep.index === method.instructions.length - 1;

  const makeTimerId = (substepIndex: number) =>
    `${meal.slug}-${sectionId}-${currentStepIdx}-${substepIndex}`;

  // ===== Handlers =====
  const handleClose = () => {
    setShowStopModal(true);
  };

  const handleKeepCooking = () => {
    setShowStopModal(false);
  };

  const handleStopCooking = () => {
    setShowStopModal(false);
    navigation.goBack();
  };

  const handleNext = () => {
    if (isLastStep) {
      setCompleted(true);
      return;
    }
    setCurrentStepIdx(Math.min(currentStepIdx + 1, totalSteps - 1));
  };

  const handlePrev = () => {
    if (isFirstStep) return;
    setCurrentStepIdx(Math.max(currentStepIdx - 1, 0));
  };

  const toggleSubstep = (key: string) => {
    setCheckedSubsteps(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleFinish = () => {
    navigation.goBack();
  };

  const handleShare = () => {
    // TODO: wire up share sheet — design TBD
    console.log('share pressed for', plate.display_name);
  };

  const sortedTimers = useMemo(() => {
    return [...timers].sort((a, b) => {
      if (a.state === 'finished' && b.state !== 'finished') return -1;
      if (b.state === 'finished' && a.state !== 'finished') return 1;
      return a.remaining_seconds - b.remaining_seconds;
    });
  }, [timers]);

  // ============================================================
  // COMPLETION SCREEN — Option A: Full-bleed celebration
  // ============================================================
  if (completed) {
    const imageSource = getMealImage(plate.image_filename ?? meal.image_filename);

    const totalMinutes =
      (method.time_total_minutes ?? 0) + (plate.assembly_time_minutes ?? 0);

    const macros = plate.plate_macros;

    return (
      <View style={styles.completionContainer}>
        {/* Full-bleed background image */}
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.completionBgImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[styles.completionBgImage, { backgroundColor: '#1a0a05' }]}
          />
        )}

        {/* Dark gradient overlays — top + bottom for legibility */}
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.05)']}
          locations={[0, 0.2, 0.5]}
          style={styles.completionTopGradient}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.75)', 'rgba(0,0,0,0.95)']}
          locations={[0, 0.55, 1]}
          style={styles.completionBottomGradient}
          pointerEvents="none"
        />

        {/* Top bar */}
        <View
          style={[
            styles.completionTopBar,
            { paddingTop: insets.top + 12 },
          ]}
        >
          <Text style={styles.completionEyebrow}>
            {meal?.cuisine === 'smoothie' ? 'DONE BLENDING' : 'DONE COOKING'}
          </Text>
          <TouchableOpacity
            style={styles.completionShareBtn}
            onPress={handleShare}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom content */}
        <View
          style={[
            styles.completionBottom,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <Text style={styles.completionTitle}>
            {meal?.cuisine === 'smoothie' ? 'Drink up.' : 'Eat well.'}
          </Text>
          <Text style={styles.completionPlateName}>{plate.display_name}</Text>
          {plate.description && (
            <Text style={styles.completionDescription} numberOfLines={2}>
              {plate.description}
            </Text>
          )}

          {/* Macro strip */}
          <View style={styles.completionMacroStrip}>
            <View style={styles.completionMacro}>
              <Text style={styles.completionMacroLabel}>TIME</Text>
              <Text style={styles.completionMacroValue}>
                {totalMinutes}
                <Text style={styles.completionMacroUnit}>m</Text>
              </Text>
            </View>
            <View style={styles.completionMacroDivider} />
            <View style={styles.completionMacro}>
              <Text style={styles.completionMacroLabel}>CALS</Text>
              <Text style={styles.completionMacroValue}>{macros.kcal}</Text>
            </View>
            <View style={styles.completionMacroDivider} />
            <View style={styles.completionMacro}>
              <Text style={styles.completionMacroLabel}>PROTEIN</Text>
              <Text style={styles.completionMacroValue}>
                {macros.protein_g}
                <Text style={styles.completionMacroUnit}>g</Text>
              </Text>
            </View>
            <View style={styles.completionMacroDivider} />
            <View style={styles.completionMacro}>
              <Text style={styles.completionMacroLabel}>CARBS</Text>
              <Text style={styles.completionMacroValue}>
                {macros.carbs_g}
                <Text style={styles.completionMacroUnit}>g</Text>
              </Text>
            </View>
          </View>

          {/* Done CTA */}
          <TouchableOpacity
            style={[
              styles.completionCta,
              { backgroundColor: themeColor, shadowColor: themeColor },
            ]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.completionCtaText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ============================================================
  // MAIN COOK MODE VIEW
  // ============================================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={handleClose}
          activeOpacity={0.7}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="close" size={24} color="#a1a1aa" />
        </TouchableOpacity>
        <Text style={styles.headerStepCount}>
          STEP {currentStepIdx + 1} OF {totalSteps}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressRow}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressDot,
              { backgroundColor: i <= currentStepIdx ? themeColor : '#27272a' },
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={{
          paddingBottom: 100 + sortedTimers.length * 64,
        }}
        showsVerticalScrollIndicator={false}
      >
        {sectionLabel && (
          <Text style={[styles.sectionEyebrow, { color: themeColor }]}>{sectionLabel}</Text>
        )}

        <View
          style={[
            styles.summaryCard,
            { borderColor: themeColor + '40', backgroundColor: themeColor + '0F' },
          ]}
        >
          <View style={styles.summaryHeaderRow}>
            <View style={[styles.summaryStepBubble, { backgroundColor: themeColor }]}>
              <Text style={styles.summaryStepBubbleText}>{currentStepIdx + 1}</Text>
            </View>
            <Text style={[styles.summaryHeaderLabel, { color: themeColor }]}>
              STEP {currentStepIdx + 1}
            </Text>
          </View>
          <Text style={styles.summaryBody}>{stepSummary}</Text>
        </View>

        {showReserveNoteOnThisStep && plate.reserve_before_finishing_note && (
          <View style={styles.reserveNote}>
            <Ionicons name="information-circle" size={14} color="#f59e0b" style={{ marginTop: 2 }} />
            <Text style={styles.reserveNoteText}>
              {plate.reserve_before_finishing_note}
            </Text>
          </View>
        )}

        {hasSplitSubsteps && overrideSubsteps && (
          <View style={styles.substepSection}>
            {overrideSubsteps.map((substep, i) => {
              const key = `${currentStepIdx}-${i}`;
              const checked = checkedSubsteps.has(key);
              const substepText = getSubstepText(substep);
              const timer = getSubstepTimer(substep);
              const timerId = timer ? makeTimerId(i) : null;
              const timerActive = timerId ? isTimerActive(timerId) : false;

              const firstUncheckedIdx = overrideSubsteps.findIndex(
                (_, j) => !checkedSubsteps.has(`${currentStepIdx}-${j}`)
              );
              const isCurrentlyActive = i === firstUncheckedIdx;

              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleSubstep(key)}
                  activeOpacity={0.7}
                  style={[
                    styles.substepRow,
                    isCurrentlyActive && {
                      backgroundColor: themeColor + '14',
                    },
                    checked && { opacity: 0.45 },
                  ]}
                >
                  {isCurrentlyActive && (
                    <View
                      style={[
                        styles.substepActiveBar,
                        { backgroundColor: themeColor },
                      ]}
                    />
                  )}

                  <View style={styles.substepNumberWrap}>
                    {checked ? (
                      <Ionicons name="checkmark" size={16} color={themeColor} />
                    ) : (
                      <Text
                        style={[
                          styles.substepNumber,
                          isCurrentlyActive && { color: themeColor, fontWeight: '700' },
                        ]}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.substepText,
                        checked && styles.struckThrough,
                        isCurrentlyActive && !checked && { fontWeight: '500' },
                      ]}
                    >
                      {renderHighlightedText(substepText, checked ? '#52525b' : themeColor)}
                    </Text>

                    {timer && timerId && !timerActive && !checked && (
                      <TouchableOpacity
                        onPress={() => startTimer(timerId, timer.label, timer.seconds)}
                        activeOpacity={0.7}
                        style={[
                          styles.timerChip,
                          {
                            borderColor: themeColor + '4D',
                            backgroundColor: themeColor + '1F',
                          },
                        ]}
                      >
                        <Ionicons name="time-outline" size={12} color={themeColor} />
                        <Text style={[styles.timerChipText, { color: themeColor }]}>
                          Start {formatRemaining(timer.seconds)} timer
                        </Text>
                      </TouchableOpacity>
                    )}

                    {timer && timerId && timerActive && (
                      <View style={[styles.timerChipActive, { backgroundColor: themeColor }]}>
                        <View style={styles.timerChipDot} />
                        <Text style={styles.timerChipActiveText}>Timer running</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {sortedTimers.length > 0 && (
        <View
          style={[styles.timerStack, { bottom: 80 + insets.bottom }]}
          pointerEvents="box-none"
        >
          {sortedTimers.map(timer => (
            <TimerCard
              key={timer.id}
              timer={timer}
              themeColor={themeColor}
              onAdjust={(delta) => adjustTimer(timer.id, delta)}
              onPause={() => pauseTimer(timer.id)}
              onResume={() => resumeTimer(timer.id)}
              onCancel={() => stopTimer(timer.id)}
              onDismiss={() => dismissFinished(timer.id)}
            />
          ))}
        </View>
      )}

      <View style={[styles.navBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.navPrev, isFirstStep && { opacity: 0.3 }]}
          onPress={handlePrev}
          disabled={isFirstStep}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#a1a1aa" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navNext, { backgroundColor: themeColor, shadowColor: themeColor }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.navNextText}>
            {isLastStep ? 'Finish' : 'Next step'}
          </Text>
          <Ionicons
            name={isLastStep ? 'checkmark' : 'arrow-forward'}
            size={18}
            color="#0a0a0b"
          />
        </TouchableOpacity>
      </View>

      {/* Custom Stop Cooking Modal */}
      <Modal
        visible={showStopModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleKeepCooking}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Stop cooking?</Text>
              <Text style={styles.modalSubtitle}>You'll lose your place in the recipe.</Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalKeepButton, { borderColor: themeColor }]}
                  onPress={handleKeepCooking}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, styles.modalKeepText, { color: themeColor }]}>
                    Keep cooking
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalStopButton]}
                  onPress={handleStopCooking}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, styles.modalStopText]}>
                    Stop
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerStepCount: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
  },

  progressRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  progressDot: { flex: 1, height: 3, borderRadius: 2 },

  body: { flex: 1, paddingHorizontal: 20 },

  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },

  summaryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryStepBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStepBubbleText: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  summaryBody: {
    color: '#d4d4d8',
    fontSize: 14,
    lineHeight: 21,
  },

  reserveNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  reserveNoteText: { color: '#fbbf24', fontSize: 13, lineHeight: 19, flex: 1 },

  substepSection: {
    gap: 6,
    marginBottom: 16,
  },
  substepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 18,
    backgroundColor: '#18181b',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  substepActiveBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  substepNumberWrap: {
    width: 16,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
  },
  substepNumber: {
    color: '#52525b',
    fontSize: 12,
    fontWeight: '600',
  },
  substepText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  struckThrough: {
    color: '#52525b',
    textDecorationLine: 'line-through',
  },

  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  timerChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timerChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  timerChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
  },
  timerChipActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },

  timerStack: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 6,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(236,72,153,0.4)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  timerRing: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  timerTime: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 20,
  },
  timerAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerActionFinished: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerAdjustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 14,
    height: 28,
    paddingHorizontal: 2,
  },
  timerAdjustHalf: {
    paddingHorizontal: 8,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerAdjustDivider: {
    width: StyleSheet.hairlineWidth,
    height: 14,
    backgroundColor: '#3f3f46',
  },
  timerAdjustText: {
    color: '#d4d4d8',
    fontSize: 10,
    fontWeight: '600',
  },

  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#000',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  navPrev: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navNext: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  navNextText: { color: '#0a0a0b', fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },

  // ============================================================
  // COMPLETION SCREEN STYLES — Option A full-bleed
  // ============================================================
  completionContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  completionBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  completionTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  completionBottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  completionTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  completionEyebrow: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  completionShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  completionTitle: {
    fontFamily: 'Georgia',
    fontSize: 42,
    fontWeight: '400',
    fontStyle: 'italic',
    color: '#fff',
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 6,
  },
  completionPlateName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  completionDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 22,
  },
  completionMacroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 18,
  },
  completionMacro: {
    flex: 1,
    alignItems: 'center',
  },
  completionMacroLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  completionMacroValue: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 18,
  },
  completionMacroUnit: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  completionMacroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  completionCta: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  completionCtaText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  errorTitle: { color: '#fff', fontSize: 18, marginBottom: 16 },
  errorBack: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    alignSelf: 'flex-start',
  },
  errorBackText: { color: '#fff', fontSize: 14 },

  // ============================================================
  // MODAL STYLES
  // ============================================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    width: '100%',
    maxWidth: 340,
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#a1a1aa',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  modalKeepButton: {
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
  modalStopButton: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modalKeepText: {
    // color will be set dynamically to themeColor
  },
  modalStopText: {
    color: '#fff',
  },
});