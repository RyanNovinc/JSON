import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface OnboardingOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function OnboardingOverlay({ visible, onDismiss }: OnboardingOverlayProps) {
  const { themeColor } = useTheme();
  const bounceAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Start bouncing animation
      const bounce = () => {
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -10,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (visible) bounce(); // Continue bouncing if still visible
        });
      };
      bounce();
    }
  }, [visible, bounceAnim]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View 
        style={[
          styles.arrowContainer,
          { 
            transform: [{ translateY: bounceAnim }],
          }
        ]}
      >
        <Text style={[styles.startText, { color: themeColor }]}>Start Here</Text>
        <Ionicons 
          name="arrow-down" 
          size={36} 
          color={themeColor} 
          style={styles.arrow}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  arrowContainer: {
    position: 'absolute',
    bottom: 120,
    right: -6,
    width: 100,
    alignItems: 'center',
  },
  startText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  arrow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});