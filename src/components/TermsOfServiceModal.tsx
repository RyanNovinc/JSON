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

interface TermsOfServiceModalProps {
  visible: boolean;
  onClose: () => void;
}

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ 
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
              <Ionicons name="document-text" size={24} color={themeColor} />
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
                JSON.fit is a fitness and nutrition application that helps you import, manage and track workout routines, create personalized meal plans, and manage nutritional goals. It works on a "bring your own AI" model, and your data is stored locally on your device.
              </Text>
              
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Workout routine import, management, and tracking</Text>
                <Text style={styles.bulletText}>• Personalized nutrition planning and meal generation</Text>
                <Text style={styles.bulletText}>• Health-conscious meal planning with dietary restrictions</Text>
                <Text style={styles.bulletText}>• Grocery list generation with local pricing estimates</Text>
                <Text style={styles.bulletText}>• Weight tracking and macro goal management</Text>
                <Text style={styles.bulletText}>• Meal prep guidance and cooking instructions</Text>
              </View>
            </Section>

            <Section title="2. Data Storage">
              <Text style={styles.sectionText}>
                Your workout routines, meal plans, health information and other personal data are stored locally on your device — we do not collect or upload them. To improve the app we collect anonymous, non-identifying usage analytics, and we don't show ads or sell your data.
              </Text>
              
              <Text style={styles.sectionText}>
                Full details, including the analytics providers we use, are in our Privacy Policy.
              </Text>
            </Section>

            <Section title="3. The App Is Free">
              <Text style={styles.sectionText}>
                JSON.fit is free to use. All features, including the full nutrition and meal-planning tools, are available at no cost. There are no subscriptions and no in-app purchases.
              </Text>
            </Section>

            <Section title="4. Third-Party AI Services">
              <Text style={styles.sectionText}>
                JSON.fit does not include or run its own AI. To build a custom plan, you choose and use a separate, third-party AI service (such as ChatGPT, Claude, Gemini or DeepSeek). Your use of those services is governed by their own terms and privacy policies, and any account or fees for them are between you and that provider.
              </Text>
              <Text style={styles.sectionText}>
                AI-generated plans are produced by those third-party services, can contain errors, and are general information only — not medical, dietary or professional advice. You are responsible for reviewing anything an AI generates before relying on it.
              </Text>
            </Section>

            <Section title="5. Health and Nutrition Disclaimers">
              <Text style={styles.sectionText}>
                <Text style={styles.emphasis}>IMPORTANT HEALTH NOTICE:</Text> This app provides general nutrition and fitness information for educational purposes only. It is not intended to replace professional medical advice, diagnosis, or treatment.
              </Text>
              
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Always consult healthcare professionals before making significant dietary changes</Text>
                <Text style={styles.bulletText}>• Meal plans are estimates and may not meet all nutritional needs</Text>
                <Text style={styles.bulletText}>• Food allergies and medical conditions require professional supervision</Text>
                <Text style={styles.bulletText}>• Calorie and macro calculations are approximations</Text>
                <Text style={styles.bulletText}>• Not suitable for pregnant/nursing mothers without medical approval</Text>
                <Text style={styles.bulletText}>• Stop use and consult a doctor if adverse reactions occur</Text>
              </View>
            </Section>

            <Section title="6. Acceptable Use">
              <Text style={styles.sectionText}>
                You agree to use the app for personal fitness and nutrition purposes only. Do not attempt to reverse engineer, modify, or distribute the application.
              </Text>
            </Section>

            <Section title="7. Limitation of Liability">
              <Text style={styles.sectionText}>
                The app is provided "as is" for fitness tracking and nutrition planning purposes. Always consult healthcare professionals before starting new workout routines or making significant dietary changes. We are not liable for any injuries, health issues, allergic reactions, or nutritional deficiencies resulting from use of our recommendations.
              </Text>
              
              <Text style={styles.sectionText}>
                You acknowledge that nutrition and fitness needs are highly individual and that our recommendations may not be suitable for your specific health conditions, goals, or circumstances. Nothing in these Terms excludes any rights or guarantees you have under the Australian Consumer Law that cannot lawfully be excluded.
              </Text>
            </Section>

            <Section title="8. Governing Law">
              <Text style={styles.sectionText}>
                These Terms are governed by the laws of the Australian Capital Territory and the Commonwealth of Australia. Where you use the app in another country, you remain responsible for complying with any local laws that apply to you.
              </Text>
            </Section>

            <Section title="9. Updates and Changes">
              <Text style={styles.sectionText}>
                We may update these terms occasionally. Continued use of the app constitutes acceptance of updated terms. Major changes will be communicated through app updates.
              </Text>
            </Section>

            <Section title="10. Contact Information">
              <Text style={styles.sectionText}>
                Questions about these terms? Contact us at support@json.fit or via the App Store.
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
  emphasis: {
    fontWeight: '700',
  },
});

export default TermsOfServiceModal;