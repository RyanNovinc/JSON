import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Shared header used by every questionnaire screen (Q1 through Q7).
 *
 * v2 — replaces the dots-row progress indicator with a segmented bar.
 * Each step is a horizontal segment that fills cyan once it's been
 * reached, giving a clearer sense of momentum than the dots ever did.
 *
 *   ┌─────┐  ▰▰▰▱▱▱▱  ┌─────┐
 *   │  <  │             │  X  │
 *   └─────┘             └─────┘
 *
 * - Back button hides automatically on step 1 (or pass showBack={false}).
 * - Close button always dismisses the whole questionnaire flow.
 * - All segments from index 0 through currentStep-1 are filled cyan.
 */

interface Props {
  currentStep: number;
  totalSteps?: number;
  onBack?: () => void;
  onClose: () => void;
  /** Override the auto-hide on step 1 if you need to. */
  showBack?: boolean;
}

export default function QuestionnaireHeader({
  currentStep,
  totalSteps = 7,
  onBack,
  onClose,
  showBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();

  const shouldShowBack = showBack ?? currentStep > 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        {shouldShowBack ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color="#d4d4d8" />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtnPlaceholder} />
        )}

        <View style={styles.segmentsRow}>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
            const isCompleted = step <= currentStep;
            return (
              <View
                key={step}
                style={[
                  styles.segment,
                  { backgroundColor: isCompleted ? themeColor : '#27272a' },
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color="#d4d4d8" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a0a0b',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 14,
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
  iconBtnPlaceholder: {
    width: 36,
    height: 36,
  },
  segmentsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
});