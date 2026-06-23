import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ 
  visible, 
  onClose 
}) => {
  const { themeColor } = useTheme();
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
    <View style={[styles.infoBox, { backgroundColor: themeColor + '10', borderColor: themeColor + '20' }]}>
      <Ionicons name="shield-checkmark" size={20} color={themeColor} />
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
              <Ionicons name="shield-checkmark" size={24} color={themeColor} />
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
                JSON.fit keeps your personal fitness and nutrition data on your device. Your workouts, meal plans, health information and other personal data are not uploaded to our servers. To understand how the app is used and to make it better, we collect anonymous, non-identifying usage analytics.
              </Text>
              
              <InfoBox>
                <Text style={[styles.infoBoxText, { color: '#ffffff' }]}>
                  <Text style={[styles.emphasis, { color: themeColor }]}>On your device:</Text> Your workouts, meal plans, health info, weight and other personal data stay on your device. We don't show ads and we never sell your data.
                </Text>
              </InfoBox>

              <Text style={styles.sectionText}>
                Sensitive information such as dietary restrictions, medical conditions, weight tracking and nutritional goals is stored only on your device.
              </Text>
            </Section>

            <Section title="2. What Stays On Your Device">
              <Text style={styles.sectionText}>
                The following is stored only on your device and is never collected by us:
              </Text>
              
              <Text style={[styles.sectionSubheading, { color: themeColor, marginTop: 16, marginBottom: 8 }]}>
                Fitness & Workout Data:
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Imported workout routines</Text>
                <Text style={styles.bulletText}>• Exercise progress and logs</Text>
                <Text style={styles.bulletText}>• Workout calendar data</Text>
                <Text style={styles.bulletText}>• Personal notes and customizations</Text>
              </View>

              <Text style={[styles.sectionSubheading, { color: themeColor, marginTop: 16, marginBottom: 8 }]}>
                Nutrition & Health Data:
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Personal nutrition goals and macro targets</Text>
                <Text style={styles.bulletText}>• Health conditions and dietary restrictions</Text>
                <Text style={styles.bulletText}>• Weight tracking history and measurements</Text>
                <Text style={styles.bulletText}>• Meal plans, recipes, and cooking instructions</Text>
                <Text style={styles.bulletText}>• Food inventory and grocery shopping lists</Text>
                <Text style={styles.bulletText}>• Budget and location info you enter for pricing</Text>
                <Text style={styles.bulletText}>• Supplement intake and nutrient deficiency tracking</Text>
                <Text style={styles.bulletText}>• Meal timing schedules and food preferences</Text>
                <Text style={styles.bulletText}>• Meal prep sessions and cooking instructions</Text>
              </View>

              <Text style={[styles.sectionSubheading, { color: themeColor, marginTop: 16, marginBottom: 8 }]}>
                General App Data:
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• App preferences and settings</Text>
              </View>
            </Section>

            <Section title="3. Anonymous Analytics We Collect">
              <Text style={styles.sectionText}>
                To see how the app is used and to fix problems, we collect anonymous, non-identifying analytics. This typically includes app interactions and events (such as which features are used or when a plan is imported), general device information (device type, operating system, app version), an approximate region derived from your IP address, and diagnostic/crash data.
              </Text>
              <Text style={styles.sectionText}>
                This data is not linked to your identity and never includes your on-device workout or nutrition data. We use the following analytics providers, who process this data on our behalf: Google Analytics (Google), Microsoft Clarity (Microsoft), and our own analytics hosted on Amazon Web Services (AWS).
              </Text>
            </Section>

            <Section title="4. What We Don't Do">
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• We don't show ads</Text>
                <Text style={styles.bulletText}>• We don't sell, rent or trade your data</Text>
                <Text style={styles.bulletText}>• We don't build advertising profiles or track you across other companies' apps</Text>
                <Text style={styles.bulletText}>• We don't put personal information into our analytics</Text>
                <Text style={styles.bulletText}>• We don't require an account</Text>
              </View>
            </Section>

            <Section title="5. Health Data and Nutrition Information">
              <Text style={styles.sectionText}>
                The app processes sensitive health and nutrition information on your device to provide personalized meal planning and dietary guidance. This includes:
              </Text>
              
              <InfoBox>
                <Text style={[styles.infoBoxText, { color: '#ffffff' }]}>
                  <Text style={[styles.emphasis, { color: themeColor }]}>Health Data Sensitivity:</Text> We treat your health information with the highest level of privacy protection by keeping it exclusively on your device.
                </Text>
              </InfoBox>

              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Medical conditions that affect nutrition (diabetes, hypertension, etc.)</Text>
                <Text style={styles.bulletText}>• Known nutrient deficiencies and supplementation</Text>
                <Text style={styles.bulletText}>• Pregnancy, breastfeeding, or other life stage considerations</Text>
                <Text style={styles.bulletText}>• Digestive issues and food absorption concerns</Text>
                <Text style={styles.bulletText}>• Energy levels and metabolic patterns</Text>
              </View>

              <Text style={styles.sectionText}>
                <Text style={[styles.emphasis, { color: themeColor }]}>Important:</Text> This app is not a substitute for professional medical advice. Always consult healthcare providers for medical nutrition therapy or if you have serious health conditions.
              </Text>
            </Section>

            <Section title="6. The App Is Free">
              <Text style={styles.sectionText}>
                JSON.fit is free. There are no subscriptions and no in-app purchases, so we do not process or store any payment information.
              </Text>
            </Section>

            <Section title="7. Data Security">
              <Text style={styles.sectionText}>
                Your on-device data is protected by your device's own security, so keeping your device secured protects that data:
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Use device passcode/biometric locks</Text>
                <Text style={styles.bulletText}>• Keep your device's OS updated</Text>
                <Text style={styles.bulletText}>• Regular device backups protect your data</Text>
              </View>
              <Text style={styles.sectionText}>
                Analytics we collect is transmitted over encrypted (HTTPS/TLS) connections.
              </Text>
            </Section>

            <Section title="8. Data Backup and Sync">
              <Text style={styles.sectionText}>
                Your workout data may be included in iOS device backups (iCloud or iTunes). This backup process is managed entirely by Apple according to their privacy policies. We do not have access to your backup data.
              </Text>
            </Section>

            <Section title="9. Your Choices">
              <Text style={styles.sectionText}>
                You can limit analytics at any time by resetting or limiting your device's advertising identifier in your device settings. You can ask us to access or delete any personal information we hold — in practice, only an email address if you subscribed to our newsletter on the website — by contacting support@json.fit. Your on-device data is under your control and can be deleted in the app at any time.
              </Text>
            </Section>

            <Section title="10. Children's Privacy">
              <Text style={styles.sectionText}>
                Our app is suitable for users 13 and older. We do not knowingly collect information from children under 13. Since your personal data is stored locally, parental supervision of device usage is recommended for younger users.
              </Text>
            </Section>

            <Section title="11. Changes to Privacy Policy">
              <Text style={styles.sectionText}>
                Any updates to this privacy policy will be communicated through app updates and reflected by an updated date.
              </Text>
            </Section>

            <Section title="12. Contact Information">
              <Text style={styles.sectionText}>
                Questions about our privacy practices? Contact us at support@json.fit or via the App Store. The full policy is also available at json.fit/privacy-policy.html.
              </Text>
            </Section>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Last Updated: {new Date().toLocaleDateString()}
              </Text>
              <Text style={[styles.footerSubtext, { color: themeColor }]}>
                Your workouts and nutrition stay on your device.
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
  sectionSubheading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  infoBoxText: {
    flex: 1,
    marginLeft: 12,
  },
  emphasis: {
    fontWeight: '700',
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
    fontWeight: '600',
  },
});

export default PrivacyPolicyModal;