import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function AppIcon({ size = 1024 }: { size?: number }) {
  const iconSize = size * 0.6; // Icon takes up 60% of the total size

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Ionicons 
        name="fitness" 
        size={iconSize} 
        color="#22d3ee" 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 180, // This creates the rounded corners for iOS app icons
  },
});