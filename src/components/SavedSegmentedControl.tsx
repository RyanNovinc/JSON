import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Two-option pill toggle used by the Saved screens (SavedWorkoutsScreen and
 * SavedNutritionScreen).
 *
 * Picks up its accent from `useTheme()`, so a screen rendered inside
 * NutritionThemeProvider gets green without any special casing here.
 * Touchables come from react-native, not RNGH — nothing in this component
 * needs gesture-handler, and these screens sit on the root stack rather than
 * inside ModeTransitionContainer's PanGestureHandler.
 */

export interface SavedSegment {
  key: string;
  label: string;
  count?: number;
}

interface Props {
  segments: SavedSegment[];
  value: string;
  onChange: (key: string) => void;
}

export default function SavedSegmentedControl({ segments, value, onChange }: Props) {
  const { themeColor } = useTheme();

  return (
    <View style={styles.track}>
      {segments.map((segment) => {
        const isActive = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            style={[
              styles.option,
              isActive && {
                backgroundColor: themeColor + '1A',
                borderColor: themeColor + '66',
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityState={isActive ? { selected: true } : {}}
            accessibilityLabel={segment.label}
          >
            <Text
              style={[styles.optionText, { color: isActive ? themeColor : '#a1a1aa' }]}
              numberOfLines={1}
            >
              {segment.label}
              {typeof segment.count === 'number' && (
                <Text
                  style={[
                    styles.optionCount,
                    { color: isActive ? themeColor + 'B3' : '#52525b' },
                  ]}
                >
                  {'  '}
                  {segment.count}
                </Text>
              )}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: '#18181b',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  option: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
});
