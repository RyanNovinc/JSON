import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import NutritionPaywallScreen from '../components/NutritionPaywallScreenSimple';
import TermsOfServiceModal from '../components/TermsOfServiceModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import { useTheme } from '../contexts/ThemeContext';

export default function PaymentScreen() {
  const navigation = useNavigation();
  const { themeColor } = useTheme();
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const handlePurchaseSuccess = () => {
    // Handle successful purchase - custom modal will handle this
    // The PurchaseSuccessModal will show and navigate to NutritionHome on close
  };

  const handleRestoreSuccess = () => {
    // Handle successful restore - navigate to nutrition home screen
    navigation.navigate('NutritionHome' as any);
  };

  return (
    <>
      {/* Nutrition Paywall Screen */}
      <NutritionPaywallScreen
        onPurchaseSuccess={handlePurchaseSuccess}
        onRestoreSuccess={handleRestoreSuccess}
        onTermsPress={() => setTermsModalVisible(true)}
        onPrivacyPress={() => setPrivacyModalVisible(true)}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal 
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  footer: {
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    paddingVertical: 4,
  },
  footerLinkText: {
    fontSize: 12,
    color: '#71717a',
  },
  footerSeparator: {
    fontSize: 12,
    color: '#52525b',
    marginHorizontal: 8,
  },
});