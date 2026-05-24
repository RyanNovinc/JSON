// src/components/questionnaire/AILaunchSheet.tsx
//
// Bottom sheet that appears when the user taps an AI card on the
// PromptReady screen. Confirms the prompt was copied to the clipboard,
// gives a one-line instruction, and requires an explicit tap on
// "Open Claude" / "Open ChatGPT" before the AI is launched.
//
// Designed to give users a beat to process what just happened before
// being whisked to an external app.

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export type AIProvider = 'claude' | 'chatgpt';

interface AILaunchSheetProps {
  visible: boolean;
  provider: AIProvider;
  onConfirm: () => void;
  onCancel: () => void;
}

const PROVIDER_NAMES: Record<AIProvider, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
};

export const AILaunchSheet: React.FC<AILaunchSheetProps> = ({
  visible,
  provider,
  onConfirm,
  onCancel,
}) => {
  const { themeColor } = useTheme();
  const name = PROVIDER_NAMES[provider];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.content}>
            <View
              style={[
                styles.checkCircle,
                { backgroundColor: 'rgba(34, 211, 238, 0.18)' },
              ]}
            >
              <Ionicons name="checkmark" size={32} color={themeColor} />
            </View>

            <Text style={styles.heading}>Prompt copied</Text>

            <Text style={styles.body}>
              Paste it in {name}'s chat box and it will guide you from there.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: themeColor }]}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Open {name}</Text>
            <Ionicons
              name="open-outline"
              size={16}
              color="#0a0a0b"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f0f10',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
    borderTopWidth: 0.5,
    borderTopColor: '#27272a',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3f3f46',
    alignSelf: 'center',
    marginBottom: 18,
  },
  content: {
    alignItems: 'center',
    paddingTop: 6,
    marginBottom: 28,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
    lineHeight: 32,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '500',
  },
});