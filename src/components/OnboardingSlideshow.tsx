import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ================================
// TYPES
// ================================

interface OnboardingSlide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  highlight: string;
}

interface OnboardingSlideshowProps {
  visible: boolean;
  onComplete: () => void;
}

// ================================
// CONSTANTS
// ================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  background: '#0a0a0b',
  card: '#18181b',
  border: '#27272a',
  accent: '#22d3ee',
  accentDim: 'rgba(34, 211, 238, 0.12)',
  accentGlow: 'rgba(34, 211, 238, 0.25)',
  textPrimary: '#ffffff',
  textSecondary: '#a1a1aa',
  textTertiary: '#71717a',
  dotInactive: '#3f3f46',
};

const SLIDES: OnboardingSlide[] = [
  {
    icon: 'clipboard-outline',
    title: 'Set Your Goals',
    description:
      'Answer the questionnaires in the bottom left for your workout goals and nutrition goals.',
    highlight: 'Questionnaires help us build the perfect prompt for your needs',
  },
  {
    icon: 'bulb-outline',
    title: 'Generate Your Program',
    description:
      'Copy your personalised prompt into any AI — ChatGPT, Claude, Gemini, or whatever you prefer.',
    highlight: 'No locked-in AI. Use whichever one you like best',
  },
  {
    icon: 'download-outline',
    title: 'Import & Track',
    description:
      'Import the JSON file back into the app and follow your optimised workout and meal plans.',
    highlight: '⚠️ All data is stored locally on your device. Deleting the app will permanently remove your workout logs, progress, and questionnaire data.',
  },
];

// ================================
// COMPONENT
// ================================

const OnboardingSlideshow: React.FC<OnboardingSlideshowProps> = ({
  visible,
  onComplete,
}) => {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Animated values for each dot
  const dotScales = useRef(SLIDES.map(() => new Animated.Value(1))).current;

  // Fade animation for slide content
  const contentOpacity = useRef(new Animated.Value(1)).current;

  // Icon pulse animation
  const iconScale = useRef(new Animated.Value(1)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
      animateDots(0);
      pulseIcon();
    }
  }, [visible]);

  // Animate dots when slide changes
  const animateDots = useCallback(
    (index: number) => {
      SLIDES.forEach((_, i) => {
        Animated.spring(dotScales[i], {
          toValue: i === index ? 1.2 : 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }).start();
      });
    },
    [dotScales]
  );

  // Subtle icon pulse on slide change
  const pulseIcon = useCallback(() => {
    iconScale.setValue(0.85);
    Animated.spring(iconScale, {
      toValue: 1,
      friction: 4,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [iconScale]);

  // Handle scroll
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
        setCurrentIndex(index);
        animateDots(index);
        pulseIcon();

        // Brief fade for content transition
        Animated.sequence([
          Animated.timing(contentOpacity, {
            toValue: 0.6,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
    [currentIndex, animateDots, pulseIcon, contentOpacity]
  );

  // Navigate to specific slide
  const goToSlide = useCallback(
    (index: number) => {
      scrollViewRef.current?.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(index);
      animateDots(index);
      pulseIcon();
    },
    [animateDots, pulseIcon]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      onComplete();
    }
  }, [currentIndex, goToSlide, onComplete]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  }, [currentIndex, goToSlide]);

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onComplete}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        {/* Header with Skip */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity
            onPress={onComplete}
            style={styles.skipButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Slides */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
          decelerationRate="fast"
          style={styles.scrollView}
        >
          {SLIDES.map((slide, index) => (
            <View key={index} style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <Animated.View style={{ opacity: contentOpacity }}>
                {/* Icon Container */}
                <Animated.View
                  style={[
                    styles.iconContainer,
                    { transform: [{ scale: iconScale }] },
                  ]}
                >
                  <View style={styles.iconGlow} />
                  <Ionicons
                    name={slide.icon}
                    size={48}
                    color={COLORS.accent}
                  />
                </Animated.View>

                {/* Step indicator */}
                <Text style={styles.stepText}>
                  Step {index + 1} of {SLIDES.length}
                </Text>

                {/* Title */}
                <Text style={styles.title}>{slide.title}</Text>

                {/* Description */}
                <Text style={styles.description}>{slide.description}</Text>
              </Animated.View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Warning for step 3 */}
          {currentIndex === 2 && (
            <Animated.View style={[styles.warningBox, { opacity: contentOpacity }]}>
              <Ionicons name="warning" size={16} color="#f59e0b" />
              <Text style={styles.warningText}>
                All data is stored locally. Deleting the app will remove your workout logs and progress.
              </Text>
            </Animated.View>
          )}

          {/* Progress Dots */}
          <View style={styles.dotsContainer}>
            {SLIDES.map((_, index) => {
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => goToSlide(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Animated.View
                    style={[
                      styles.dot,
                      index === currentIndex ? styles.dotActive : styles.dotInactive,
                      {
                        transform: [{ scale: dotScales[index] }],
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Navigation Buttons */}
          <View style={styles.buttonsRow}>
            {currentIndex > 0 ? (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.buttonPlaceholder} />
            )}

            <TouchableOpacity
              onPress={handleNext}
              style={[
                styles.nextButton,
                isLastSlide && styles.getStartedButton,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.nextButtonText,
                  isLastSlide && styles.getStartedButtonText,
                ]}
              >
                {isLastSlide ? 'Get Started' : 'Next'}
              </Text>
              {!isLastSlide && (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.accent}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ================================
// STYLES
// ================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 44,
  },
  headerSpacer: {
    width: 60,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    color: COLORS.textTertiary,
    fontSize: 15,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.accentGlow,
    opacity: 0.4,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  stepText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  description: {
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 300,
    alignSelf: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.accent,
  },
  dotInactive: {
    width: 8,
    backgroundColor: COLORS.dotInactive,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonPlaceholder: {
    width: 80,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 4,
  },
  backButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 6,
  },
  nextButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  getStartedButton: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  getStartedButtonText: {
    color: COLORS.background,
  },
});

export default OnboardingSlideshow;