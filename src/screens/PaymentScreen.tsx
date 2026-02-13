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
import RevenueCatPaywall from '../components/RevenueCatPaywall';
import TermsOfServiceModal from '../components/TermsOfServiceModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import { useTheme } from '../contexts/ThemeContext';

export default function PaymentScreen() {
  const navigation = useNavigation();
  const { themeColor } = useTheme();
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const handlePurchaseSuccess = () => {
    // Handle successful purchase
    Alert.alert(
      'Welcome to Pro!',
      'You now have access to all premium features.',
      [{ text: 'Awesome!', onPress: () => navigation.goBack() }]
    );
  };

  const handleRestoreSuccess = () => {
    // Handle successful restore
    Alert.alert(
      'Purchases Restored!',
      'Your premium access has been restored.',
      [{ text: 'Great!', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* RevenueCat Paywall */}
        <RevenueCatPaywall
          onClose={() => navigation.goBack()}
          onPurchaseSuccess={handlePurchaseSuccess}
          onRestoreSuccess={handleRestoreSuccess}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <TouchableOpacity 
              style={styles.footerLink}
              onPress={() => setTermsModalVisible(true)}
            >
              <Text style={styles.footerLinkText}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>•</Text>
            <TouchableOpacity 
              style={styles.footerLink}
              onPress={() => setPrivacyModalVisible(true)}
            >
              <Text style={styles.footerLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

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
    </View>
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