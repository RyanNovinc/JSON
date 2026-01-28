import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ 
  visible, 
  onClose 
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ 
    title, 
    children 
  }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="document-text" size={24} color="#22d3ee" />
              <Text style={styles.headerTitle}>Terms of Service</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#71717a" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Section title="1. Application Services">
              <Text style={styles.sectionText}>
                JSON is a fitness application that helps you import, manage, and track workout routines. All your data is stored locally on your device.
              </Text>
            </Section>

            <Section title="2. Data Storage">
              <Text style={styles.sectionText}>
                All your workout routines, progress, and personal data are stored locally on your device. We do not collect, store, or transmit your personal workout data to external servers.
              </Text>
            </Section>

            <Section title="3. Pro Access Purchase">
              <Text style={styles.sectionText}>
                Pro Access is a one-time purchase that unlocks premium features. This is not a subscription - you pay once and own the features forever.
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Unlimited workout routines</Text>
                <Text style={styles.bulletText}>• Advanced analytics</Text>
                <Text style={styles.bulletText}>• Cloud sync (when available)</Text>
                <Text style={styles.bulletText}>• No recurring charges</Text>
              </View>
            </Section>

            <Section title="4. Acceptable Use">
              <Text style={styles.sectionText}>
                You agree to use the app for personal fitness purposes only. Do not attempt to reverse engineer, modify, or distribute the application.
              </Text>
            </Section>

            <Section title="5. Limitation of Liability">
              <Text style={styles.sectionText}>
                The app is provided "as is" for fitness tracking purposes. Always consult healthcare professionals before starting new workout routines. We are not liable for any injuries or health issues resulting from workouts.
              </Text>
            </Section>

            <Section title="6. Updates and Changes">
              <Text style={styles.sectionText}>
                We may update these terms occasionally. Continued use of the app constitutes acceptance of updated terms. Major changes will be communicated through app updates.
              </Text>
            </Section>

            <Section title="7. Contact Information">
              <Text style={styles.sectionText}>
                Questions about these terms? Contact us through the app's feedback feature or via the App Store.
              </Text>
            </Section>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Last Updated: {new Date().toLocaleDateString()}
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0a0a0b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.9,
    maxHeight: 800,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: '#a1a1aa',
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletContainer: {
    marginTop: 8,
    paddingLeft: 16,
  },
  bulletText: {
    fontSize: 15,
    color: '#a1a1aa',
    lineHeight: 22,
    marginBottom: 4,
  },
  footer: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#71717a',
  },
});

export default TermsOfServiceModal;