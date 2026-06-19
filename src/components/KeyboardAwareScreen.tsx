import React from 'react';
import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAwareScreenProps {
  children: React.ReactNode;
  contentContainerStyle?: any;
  showsVerticalScrollIndicator?: boolean;
  style?: any;
}

export default function KeyboardAwareScreen({
  children,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  style,
}: KeyboardAwareScreenProps) {
  const insets = useSafeAreaInsets();
  
  // Calculate header height + safe area for proper keyboard offset
  const headerHeight = 60; // Approximate height of QuestionnaireHeader
  const keyboardVerticalOffset = headerHeight + insets.top;

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardContainer, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        contentContainerStyle={[styles.defaultContentContainer, contentContainerStyle]}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  defaultContentContainer: {
    flexGrow: 1,
    paddingBottom: 100, // Extra padding for button space
  },
});