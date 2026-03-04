import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

const CYAN = "#00B4D8";
const DARK_BG = "#0A0E14";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#8A9BB0";
const TEXT_DIM = "#5A6B80";

const { width } = Dimensions.get('window');

interface ConfettiParticleProps {
  delay: number;
  left: number;
}

function ConfettiParticle({ delay, left, themeColor }: ConfettiParticleProps & { themeColor: string }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const colors = [themeColor, "#FFD700", "#FF6B9D", "#A78BFA", "#34D399", "#F59E0B"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 4 + Math.random() * 6;
  const duration = 1600 + Math.random() * 1000;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [animatedValue, delay, duration]);

  return (
    <Animated.View
      style={[
        styles.confettiParticle,
        {
          left: `${left}%`,
          width: size,
          height: size * (Math.random() > 0.5 ? 1 : 0.5),
          backgroundColor: color,
          borderRadius: Math.random() > 0.5 ? size / 2 : 1,
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 260],
              }),
            },
            {
              rotate: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '540deg'],
              }),
            },
          ],
          opacity: animatedValue.interpolate({
            inputRange: [0, 0.1, 0.9, 1],
            outputRange: [0, 1, 1, 0],
          }),
        },
      ]}
    />
  );
}

interface PurchaseSuccessModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PurchaseSuccessModal({ visible, onClose }: PurchaseSuccessModalProps) {
  const { themeColor } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      checkAnim.setValue(0);
      contentAnim.setValue(0);
      backgroundAnim.setValue(0);

      // Start animations sequence
      Animated.parallel([
        // Background fade in
        Animated.timing(backgroundAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Modal sequence
        Animated.sequence([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(checkAnim, {
            toValue: 1,
            duration: 400,
            delay: 150,
            useNativeDriver: true,
          }),
          Animated.timing(contentAnim, {
            toValue: 1,
            duration: 400,
            delay: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [visible, scaleAnim, checkAnim, contentAnim, backgroundAnim]);

  const handleClose = () => {
    Animated.parallel([
      // Background fade out
      Animated.timing(backgroundAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      // Modal scale out
      Animated.spring(scaleAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: backgroundAnim,
            transform: [{
              scale: backgroundAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1.1, 1],
              })
            }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(10,14,20,1)', 'rgba(10,14,20,0.98)', 'rgba(10,14,20,1)']}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.modal,
            {
              borderColor: `${themeColor}40`,
              shadowColor: themeColor,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Confetti */}
          <View style={styles.confettiContainer}>
            {Array.from({ length: 30 }, (_, i) => (
              <ConfettiParticle
                key={i}
                delay={Math.random() * 0.6}
                left={Math.random() * 100}
                themeColor={themeColor}
              />
            ))}
          </View>

          {/* Check circle */}
          <Animated.View
            style={[
              styles.checkCircle,
              {
                backgroundColor: themeColor,
                shadowColor: themeColor,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Ionicons name="checkmark" size={32} color="#000000" />
          </Animated.View>

          {/* Title */}
          <Animated.View
            style={{
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            }}
          >
            <Text style={styles.title}>You're all set!</Text>
            <Text style={styles.subtitle}>
              Nutrition is unlocked forever.{'\n'}
              <Text style={styles.subdesc}>No subscription. No renewals.</Text>
            </Text>
          </Animated.View>

          {/* CTA Button */}
          <Animated.View
            style={[
              styles.ctaSection,
              {
                opacity: contentAnim,
                transform: [
                  {
                    translateY: contentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity 
              style={[
                styles.ctaButton,
                {
                  backgroundColor: themeColor,
                  shadowColor: themeColor,
                }
              ]} 
              onPress={handleClose}
            >
              <Text style={styles.ctaText}>Get Started →</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,14,20,0.95)',
  },
  modal: {
    width: Math.min(width - 56, 340),
    backgroundColor: DARK_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 204, 0.2)',
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.1,
    shadowRadius: 60,
    elevation: 24,
    overflow: 'hidden',
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    overflow: 'hidden',
  },
  confettiParticle: {
    position: 'absolute',
    top: -8,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  subdesc: {
    fontSize: 13,
    color: TEXT_DIM,
  },
  ctaSection: {
    width: '100%',
  },
  ctaButton: {
    width: '100%',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaText: {
    color: DARK_BG,
    fontSize: 16,
    fontWeight: '800',
  },
});