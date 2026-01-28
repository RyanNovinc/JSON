import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImportFeedbackModalProps {
  visible: boolean;
  onFeedback: (feedback: 'positive' | 'negative', details?: string) => void;
  onSkip: () => void;
}

export default function ImportFeedbackModal({ 
  visible, 
  onFeedback, 
  onSkip 
}: ImportFeedbackModalProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<'positive' | 'negative' | null>(null);
  const [negativeDetails, setNegativeDetails] = useState('');

  const handleThumbsUp = () => {
    setSelectedFeedback('positive');
    setNegativeDetails(''); // Clear negative feedback if switching
  };

  const handleThumbsDown = () => {
    setSelectedFeedback('negative');
  };

  const handleAppStoreRate = async () => {
    const appStoreUrl = 'https://apps.apple.com/app/idYOUR_APP_ID'; // TODO: Replace with actual App Store URL
    try {
      await Linking.openURL(appStoreUrl);
    } catch (error) {
      console.log('Failed to open App Store');
    }
    onFeedback('positive');
  };

  const handleSubmitPositive = () => {
    onFeedback('positive');
  };

  const handleSubmitNegative = () => {
    onFeedback('negative', negativeDetails.trim() || undefined);
  };

  const handleModalClose = () => {
    setSelectedFeedback(null);
    setNegativeDetails('');
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.modalContent, selectedFeedback && styles.modalContentExpanded]}>
            <TouchableOpacity 
              onPress={handleModalClose}
              style={styles.skipButton}
            >
              <Ionicons name="close" size={20} color="#71717a" />
            </TouchableOpacity>
            
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={32} color="#22d3ee" />
            </View>
            
            <Text style={styles.title}>Import successful</Text>
            <Text style={styles.subtitle}>How was the experience?</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                selectedFeedback === 'positive' && styles.selectedPositive
              ]}
              onPress={handleThumbsUp}
              activeOpacity={0.7}
            >
              <Ionicons name="thumbs-up-outline" size={24} color={selectedFeedback === 'positive' ? '#22d3ee' : '#71717a'} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                selectedFeedback === 'negative' && styles.selectedNegative
              ]}
              onPress={handleThumbsDown}
              activeOpacity={0.7}
            >
              <Ionicons name="thumbs-down-outline" size={24} color={selectedFeedback === 'negative' ? '#ef4444' : '#71717a'} />
            </TouchableOpacity>
          </View>

          {/* Positive Feedback Follow-up */}
          {selectedFeedback === 'positive' && (
            <View style={styles.followUpSection}>
              <Text style={styles.followUpText}>Great to hear!</Text>
              <Text style={styles.followUpSubtext}>Would you mind rating us?</Text>
              
              <View style={styles.followUpButtons}>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={handleAppStoreRate}
                  activeOpacity={0.7}
                >
                  <Text style={styles.primaryActionText}>Rate on App Store</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.secondaryActionButton}
                  onPress={handleSubmitPositive}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryActionText}>Not now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Negative Feedback Follow-up */}
          {selectedFeedback === 'negative' && (
            <View style={styles.followUpSection}>
              <Text style={styles.followUpText}>Help us improve</Text>
              
              <TextInput
                style={styles.textInput}
                placeholder="What could be better?"
                placeholderTextColor="#52525b"
                multiline
                numberOfLines={3}
                value={negativeDetails}
                onChangeText={setNegativeDetails}
                autoFocus
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={handleSubmitNegative}
              />
              
              <View style={styles.followUpButtons}>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={handleSubmitNegative}
                  activeOpacity={0.7}
                >
                  <Text style={styles.primaryActionText}>Send feedback</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.secondaryActionButton}
                  onPress={() => onFeedback('negative')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryActionText}>Skip</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: '#0a0a0b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#18181b',
    padding: 28,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
    marginVertical: 20,
  },
  modalContentExpanded: {
    maxWidth: 340,
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  successIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  feedbackButton: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  selectedPositive: {
    backgroundColor: '#065f46',
    borderColor: '#22d3ee',
  },
  selectedNegative: {
    backgroundColor: '#450a0a',
    borderColor: '#ef4444',
  },
  followUpSection: {
    width: '100%',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#18181b',
  },
  followUpText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 6,
  },
  followUpSubtext: {
    fontSize: 13,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 20,
  },
  followUpButtons: {
    gap: 10,
  },
  primaryActionButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  secondaryActionButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryActionText: {
    fontSize: 13,
    color: '#52525b',
  },
  textInput: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 4,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 16,
    minHeight: 72,
  },
});