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
                JSON is a comprehensive fitness and nutrition application that helps you import, manage, and track workout routines, create personalized meal plans, and manage nutritional goals. All your data is stored locally on your device.
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
                All your workout routines, meal plans, health information, and personal data are stored locally on your device. We do not collect, store, or transmit your personal fitness, nutrition, or health data to external servers.
              </Text>
              
              <Text style={styles.sectionText}>
                This includes sensitive information such as dietary restrictions, health conditions, weight tracking, nutritional goals, meal preferences, and grocery shopping data.
              </Text>
            </Section>

            <Section title="3. Pro Access Purchase">
              <Text style={styles.sectionText}>
                Pro Access is a one-time purchase that unlocks premium nutrition and advanced fitness features. This is not a subscription - you pay once and own the features forever.
              </Text>
              <View style={styles.bulletContainer}>
                <Text style={styles.bulletText}>• Complete nutrition planning and meal generation</Text>
                <Text style={styles.bulletText}>• Personalized meal plans with dietary restrictions</Text>
                <Text style={styles.bulletText}>• Grocery lists with local pricing estimates</Text>
                <Text style={styles.bulletText}>• Meal prep guidance and cooking instructions</Text>
                <Text style={styles.bulletText}>• Advanced health and macro tracking</Text>
                <Text style={styles.bulletText}>• Unlimited workout routines and analytics</Text>
                <Text style={styles.bulletText}>• No recurring charges</Text>
              </View>
            </Section>

            <Section title="4. Health and Nutrition Disclaimers">
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

            <Section title="5. Acceptable Use">
              <Text style={styles.sectionText}>
                You agree to use the app for personal fitness and nutrition purposes only. Do not attempt to reverse engineer, modify, or distribute the application.
              </Text>
            </Section>

            <Section title="6. Limitation of Liability">
              <Text style={styles.sectionText}>
                The app is provided "as is" for fitness tracking and nutrition planning purposes. Always consult healthcare professionals before starting new workout routines or making significant dietary changes. We are not liable for any injuries, health issues, allergic reactions, or nutritional deficiencies resulting from use of our recommendations.
              </Text>
              
              <Text style={styles.sectionText}>
                You acknowledge that nutrition and fitness needs are highly individual and that our recommendations may not be suitable for your specific health conditions, goals, or circumstances.
              </Text>
            </Section>

            <Section title="7. Updates and Changes">
              <Text style={styles.sectionText}>
                We may update these terms occasionally. Continued use of the app constitutes acceptance of updated terms. Major changes will be communicated through app updates.
              </Text>
            </Section>

            <Section title="8. Contact Information">
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
  emphasis: {
    fontWeight: '700',
  },
});

export default TermsOfServiceModal;