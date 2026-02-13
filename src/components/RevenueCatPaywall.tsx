import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  
  ActivityIndicator,
  Alert,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { PurchasesPackage } from 'react-native-purchases';
import { useRevenueCat } from '../contexts/RevenueCatContext';
import { PRODUCT_CONFIG } from '../config/revenueCatConfig';
import { useTheme } from '../contexts/ThemeContext';

interface RevenueCatPaywallProps {
  onClose?: () => void;
  onPurchaseSuccess?: () => void;
  onRestoreSuccess?: () => void;
}

const RevenueCatPaywall: React.FC<RevenueCatPaywallProps> = ({
  onClose,
  onPurchaseSuccess,
  onRestoreSuccess,
}) => {
  const { themeColor } = useTheme();
  const {
    currentOffering,
    isLoading,
    hasJSONPro,
    isConfigured,
    purchasePackage,
    restorePurchases,
    grantFreeAccess,
    error,
    clearError,
  } = useRevenueCat();

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [lifetimePackage, setLifetimePackage] = useState<PurchasesPackage | null>(null);

  // Find lifetime package from current offering
  useEffect(() => {
    if (currentOffering?.availablePackages) {
      const lifetime = currentOffering.availablePackages.find(
        pkg => pkg.product.identifier.includes('lifetime') || 
               pkg.identifier.includes('lifetime')
      );
      setLifetimePackage(lifetime || null);
    }
  }, [currentOffering]);

  // Handle purchase using RevenueCat
  const handlePurchase = async () => {
    try {
      setPurchasing(true);
      clearError();

      // Use actual RevenueCat purchase with your configured offering and package
      const success = await purchasePackage('lifetime_pro', 'lifetime_pro_tier_1');
      
      if (success) {
        Alert.alert(
          'Welcome to Pro!',
          'You now have lifetime access to all premium features!',
          [
            { 
              text: 'Awesome!', 
              onPress: () => {
                onPurchaseSuccess?.();
                onClose?.();
              }
            }
          ]
        );
      } else {
        throw new Error('Purchase failed');
      }
      
    } catch (err) {
      console.error('Purchase error:', err);
      Alert.alert(
        'Purchase Failed',
        'Something went wrong with your purchase. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setPurchasing(false);
    }
  };

  // Handle restore
  const handleRestore = async () => {
    try {
      setRestoring(true);
      clearError();

      const success = await restorePurchases();
      
      if (success) {
        onRestoreSuccess?.();
      }
    } catch (err) {
      console.error('Restore error:', err);
    } finally {
      setRestoring(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Force show the paywall regardless of offerings loading

  // Show error state - but still allow access to paywall
  // if (error) {
  //   return (
  //     <View style={styles.errorContainer}>
  //       <Ionicons name="warning" size={48} color="#ef4444" />
  //       <Text style={styles.errorTitle}>Something went wrong</Text>
  //       <Text style={styles.errorText}>{error}</Text>
  //       <TouchableOpacity style={styles.retryButton} onPress={clearError}>
  //         <Text style={styles.retryButtonText}>Try Again</Text>
  //       </TouchableOpacity>
  //     </View>
  //   );
  // }

  // Show already purchased state
  if (hasJSONPro) {
    return (
      <View style={styles.purchasedContainer}>
        <Ionicons name="checkmark-circle" size={64} color={themeColor} />
        <Text style={styles.purchasedTitle}>You're all set!</Text>
        <Text style={styles.purchasedText}>
          You already have lifetime access to all premium features.
        </Text>
        {onClose && (
          <TouchableOpacity style={[styles.closeButton, { backgroundColor: themeColor }]} onPress={onClose}>
            <Text style={styles.closeButtonText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }


  // Always show paywall - we'll handle package lookup in the purchase method

  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={[styles.iconContainer, { backgroundColor: themeColor + '1A', borderColor: themeColor + '4D' }]}>
          <Ionicons name="rocket" size={32} color={themeColor} />
        </View>
        <Text style={styles.heroTitle}>Unlock Pro Features</Text>
        <Text style={styles.heroSubtitle}>
          Get unlimited access to all premium features{' '}
          <Text style={[styles.foreverText, { color: themeColor }]}>forever</Text>
        </Text>
      </View>

      {/* Pricing Section */}
      <View style={styles.pricingSection}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceStrike}>$19.99</Text>
          <Text style={[styles.priceMain, { color: themeColor, textShadowColor: themeColor + '4D' }]}>FREE</Text>
          <Text style={styles.priceSubtext}>Limited time offer</Text>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>What's included:</Text>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={20} color={themeColor} />
          <Text style={styles.featureText}>Unlimited workout routines</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="checkmark-circle" size={20} color={themeColor} />
          <Text style={styles.featureText}>Lifetime updates</Text>
        </View>
      </View>

      {/* Action Section */}
      <View style={styles.actionSection}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: themeColor, shadowColor: themeColor }, purchasing && styles.primaryButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator size="small" color="#0a0a0b" />
              <Text style={styles.primaryButtonText}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Claim Free Access</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleRestore}
          disabled={restoring || purchasing}
        >
          {restoring ? (
            <ActivityIndicator size="small" color="#71717a" />
          ) : (
            <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Urgency Text */}
      <Text style={styles.urgencyText}>
        This won't last. Claim your lifetime access now — no strings attached.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#71717a',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  purchasedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  purchasedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  purchasedText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  closeButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#a3a3a3',
    textAlign: 'center',
    lineHeight: 22,
  },
  foreverText: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  pricingSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  priceContainer: {
    alignItems: 'center',
  },
  priceStrike: {
    fontSize: 18,
    fontWeight: '500',
    color: '#71717a',
    textDecorationLine: 'line-through',
    marginBottom: 8,
  },
  priceMain: {
    fontSize: 64,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  priceSubtext: {
    fontSize: 14,
    color: '#a3a3a3',
    fontWeight: '500',
  },
  featuresSection: {
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  featureText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 16,
    fontWeight: '500',
  },
  actionSection: {
    marginBottom: 24,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: '#71717a',
    fontWeight: '500',
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyText: {
    fontSize: 14,
    color: '#a3a3a3',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  freeAccessButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  freeAccessButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
});

export default RevenueCatPaywall;