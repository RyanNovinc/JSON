import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Shared option card used by Q1, Q2, Q4, Q5, Q6, Q7 (not Q3, which is a
 * numeric grid, and not Refinements, which has its own card pattern).
 *
 * Two states:
 *   - Compact (unselected): just the icon + title, ~52px tall.
 *   - Expanded (selected):  icon turns cyan, the subtitle reveals
 *     below the title, and a filled check badge appears on the right.
 *
 * The height change between states is animated automatically via
 * LayoutAnimation, which means tapping a card feels physical without
 * the file having to import reanimated. On Android the experimental
 * layout-animation flag has to be enabled once at app start; we do it
 * here defensively so this component is fully self-contained.
 */

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface QuestionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** Revealed under the title only when the card is selected. */
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  /**
   * Optional small pill rendered inline next to the title in both
   * states (e.g. "Recommended" on Q6 moderate volume).
   */
  badge?: string;
}

export default function QuestionCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
  badge,
}: QuestionCardProps) {
  const { themeColor } = useTheme();

  const handlePress = () => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'),
    );
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[
        styles.card,
        selected && {
          backgroundColor: 'rgba(34, 211, 238, 0.07)',
          borderColor: themeColor,
          borderWidth: 1.5,
          // Slight padding bump so the expanded state breathes.
          paddingVertical: 14,
          alignItems: 'flex-start',
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          selected && {
            width: 38,
            height: 38,
            borderRadius: 11,
            backgroundColor: 'rgba(34, 211, 238, 0.16)',
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={selected ? 20 : 18}
          color={selected ? themeColor : '#a1a1aa'}
        />
      </View>

      <View style={[styles.textWrap, selected && styles.textWrapSelected]}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              { color: selected ? '#ffffff' : '#e4e4e7' },
            ]}
          >
            {title}
          </Text>
          {badge ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: 'rgba(34, 211, 238, 0.16)' },
              ]}
            >
              <Text style={[styles.badgeText, { color: themeColor }]}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {selected ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>

      {selected ? (
        <View style={[styles.checkBadge, { backgroundColor: themeColor }]}>
          <Ionicons name="checkmark" size={13} color="#0a0a0b" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    gap: 12,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1f1f23',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  textWrapSelected: {
    paddingTop: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 17,
    marginTop: 5,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
  },
});