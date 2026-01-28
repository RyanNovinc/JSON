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

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ 
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

  const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View style={styles.infoBox}>
      <Ionicons name="shield-checkmark" size={20} color="#22d3ee" />
      <View style={styles.infoBoxText}>
        {children}
      </View>
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
              <Ionicons name="shield-checkmark" size={24} color="#22d3ee" />
              <Text style={styles.headerTitle}>Privacy Policy</Text>
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
            <Section title="1. Data Collection Overview">
              <Text style={styles.sectionText}>
                JSON prioritizes your privacy by storing all personal data locally on your device. We do NOT collect, store, or transmit your workout routines, progress, or personal information to external servers.
              </Text>
              
              <InfoBox>
                <Text style={styles.infoBoxText}>
                  <Text style={styles.emphasis}>Local Storage Only:</Text> All your workouts, progress tracking, and personal data remain on your device and never leave it.
                </Text>
              </InfoBox>
            </Section>

            <Section title="2. What Data We Store Locally">
              <Text style={styles.sectionText}>
                The following information is stored exclusively on your device:
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Imported workout routines</Text>
                <Text style={styles.bulletText}>• Exercise progress and logs</Text>
                <Text style={styles.bulletText}>• App preferences and settings</Text>
                <Text style={styles.bulletText}>• Workout calendar data</Text>
                <Text style={styles.bulletText}>• Personal notes and customizations</Text>
              </View>
            </Section>

            <Section title="3. What We Don't Collect">
              <Text style={styles.sectionText}>
                We do not collect, process, or store:
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Personal identifying information</Text>
                <Text style={styles.bulletText}>• Workout performance data</Text>
                <Text style={styles.bulletText}>• Device location data</Text>
                <Text style={styles.bulletText}>• Usage analytics or tracking</Text>
                <Text style={styles.bulletText}>• Social media or contact information</Text>
              </View>
            </Section>

            <Section title="4. App Store Purchases">
              <Text style={styles.sectionText}>
                When you purchase Pro Access through the App Store, Apple handles all payment processing. We receive only basic purchase confirmation to unlock premium features. No payment details are stored by our app.
              </Text>
            </Section>

            <Section title="5. Data Security">
              <Text style={styles.sectionText}>
                Since all data is stored locally on your device, your information security depends on your device's security measures:
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Use device passcode/biometric locks</Text>
                <Text style={styles.bulletText}>• Keep your device's OS updated</Text>
                <Text style={styles.bulletText}>• Regular device backups protect your data</Text>
              </View>
            </Section>

            <Section title="6. Data Backup and Sync">
              <Text style={styles.sectionText}>
                Your workout data may be included in iOS device backups (iCloud or iTunes). This backup process is managed entirely by Apple according to their privacy policies. We do not have access to your backup data.
              </Text>
            </Section>

            <Section title="7. Children's Privacy">
              <Text style={styles.sectionText}>
                Our app is suitable for users 13 and older. We do not knowingly collect information from children under 13. Since all data is stored locally, parental supervision of device usage is recommended for younger users.
              </Text>
            </Section>

            <Section title="8. Changes to Privacy Policy">
              <Text style={styles.sectionText}>
                Any updates to this privacy policy will be communicated through app updates. Since we don't collect personal data, policy changes typically involve clarifications rather than new data practices.
              </Text>
            </Section>

            <Section title="9. Contact Information">
              <Text style={styles.sectionText}>
                Questions about our privacy practices? Contact us through the app's feedback feature or via the App Store. Since we don't store personal data, most privacy concerns can be resolved through local device management.
              </Text>
            </Section>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Last Updated: {new Date().toLocaleDateString()}
              </Text>
              <Text style={styles.footerSubtext}>
                Your data stays on your device. Always.
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
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#22d3ee10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22d3ee20',
    marginTop: 12,
  },
  infoBoxText: {
    flex: 1,
    marginLeft: 12,
  },
  emphasis: {
    fontWeight: '700',
    color: '#22d3ee',
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
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#22d3ee',
    fontWeight: '600',
  },
});

export default PrivacyPolicyModal;