import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

function SplashScreen({ onFinish }: SplashScreenProps) {
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    // Icon animation
    Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Start typing animation after icon appears
      startTypingAnimation();
    });
  }, []);

  const startTypingAnimation = () => {
    const text = 'JSON';
    setShowCursor(true);
    
    // Type each letter with delay
    text.split('').forEach((char, index) => {
      setTimeout(() => {
        setDisplayedText(prev => prev + char);
      }, index * 200); // 200ms delay between each letter
    });

    // Hide cursor and start fade out after typing completes
    setTimeout(() => {
      setShowCursor(false);
      setTimeout(() => {
        Animated.timing(iconOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(onFinish);
      }, 300);
    }, text.length * 200 + 500); // Wait for typing + 500ms pause
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <View style={styles.dumbbellContainer}>
          <View style={styles.dumbbellBar} />
          <View style={[styles.dumbbellWeight, styles.leftWeight]} />
          <View style={[styles.dumbbellWeight, styles.rightWeight]} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.appName}>
            {displayedText}
            {showCursor && <Text style={styles.cursor}>|</Text>}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    // Nothing needed here
  },
  dumbbellContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dumbbellBar: {
    width: 60,
    height: 8,
    backgroundColor: '#00f5ff',
    borderRadius: 4,
    shadowColor: '#00f5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  dumbbellWeight: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: '#00f5ff',
    borderRadius: 12,
    shadowColor: '#00f5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  leftWeight: {
    left: 13,
  },
  rightWeight: {
    right: 13,
  },
  textContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontFamily: 'SpaceMono-Regular',
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: 2,
  },
  cursor: {
    color: '#ffffff',
    opacity: 1,
  },
});

export default SplashScreen;