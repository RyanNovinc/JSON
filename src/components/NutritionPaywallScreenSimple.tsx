import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRevenueCat } from '../contexts/RevenueCatContext';
import { REVENUECAT_CONFIG } from '../config/revenueCatConfig';
import { useNavigation } from '@react-navigation/native';
import PurchaseSuccessModal from './PurchaseSuccessModal';

interface NutritionPaywallScreenProps {
  onPurchaseSuccess?: () => void;
  onRestoreSuccess?: () => void;
  onTermsPress?: () => void;
  onPrivacyPress?: () => void;
}

const CYAN = '#00E5CC';
const CYAN_DIM = 'rgba(0, 229, 204, 0.15)';
const DARK_BG = '#0A0E14';
const CARD_BG = '#111820';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#8A9BB0';
const TEXT_DIM = '#5A6B80';

const features = [
  {
    icon: '🧬',
    title: 'AI Macro Engine',
    desc: 'Precision-calculated protein, carbs, fat & fiber targets calibrated to your exact body composition and goals',
  },
  {
    icon: '🛒',
    title: 'Smart Grocery Lists',
    desc: 'End grocery store confusion — precise shopping lists that tell you exactly what to buy',
  },
  {
    icon: '📋',
    title: 'Meal Prep Blueprints',
    desc: 'Want to meal prep? Get clear step-by-step instructions for preparing your meals ahead of time',
  },
  {
    icon: '🌙',
    title: 'Sleep-Synced Timing',
    desc: 'Meal times optimized around your circadian rhythm for better recovery, energy, and sleep quality',
  },
  {
    icon: '🥡',
    title: 'Pantry Intelligence',
    desc: 'Input your existing ingredients and get meal plans that work around what\'s already in your kitchen',
  },
  {
    icon: '💰',
    title: 'Skip the Dietitian',
    desc: 'Skip costly dietitian visits — get unlimited personalized meal plans that adjust as you progress',
  },
];

export default function NutritionPaywallScreen({ onPurchaseSuccess, onRestoreSuccess, onTermsPress, onPrivacyPress }: NutritionPaywallScreenProps) {
  const navigation = useNavigation();
  const {
    purchasePackage,
    restorePurchases,
    hasNutrition,
    clearError,
  } = useRevenueCat();

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [justPurchased, setJustPurchased] = useState(false);
  
  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Start animations on mount
  useEffect(() => {
    // Pulse animation for CTA
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Float animation for hero icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, floatAnim]);

  const handlePurchase = async () => {
    try {
      setPurchasing(true);
      clearError();

      const result = await purchasePackage(
        REVENUECAT_CONFIG.offerings.lifetime_pro, 
        REVENUECAT_CONFIG.packages.lifetime_pro_tier_1
      );
      
      if (result) {
        setJustPurchased(true);
        setShowSuccessModal(true);
      } else {
        throw new Error('Purchase failed');
      }
      
    } catch (err: any) {
      
      // Show detailed error in production for debugging
      let errorMessage = 'Something went wrong with your purchase. Please try again.';
      
      // Keep debug info in logs for developer investigation
      console.error('Purchase failed:', {
        error: err.message,
        code: err.code || err.originalCode,
        debugInfo: err.debugInfo
      });
      
      Alert.alert(
        'Purchase Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      clearError();

      const success = await restorePurchases();
      
      if (success) {
        onRestoreSuccess?.();
      }
    } catch (err) {
    } finally {
      setRestoring(false);
    }
  };

  const floatTransform = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  // Only show "already have access" if user had access BEFORE this session
  if (hasNutrition && !justPurchased) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.purchasedContainer}>
          <Text style={styles.purchasedIcon}>🎉</Text>
          <Text style={styles.purchasedTitle}>You're all set!</Text>
          <Text style={styles.purchasedText}>
            You already have lifetime access to AI nutrition planning.
          </Text>
          <TouchableOpacity style={[styles.continueButton, { backgroundColor: CYAN }]} onPress={() => navigation.goBack()}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Close button */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={TEXT_DIM} />
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Animated.Text style={[styles.heroIcon, { 
            transform: [{ translateY: floatTransform }] 
          }]}>🍽️</Animated.Text>
          <Text style={styles.heroTitle}>
            Your AI Nutritionist{'\n'}
            <Text style={{ color: CYAN }}>Is Ready</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Effortless eating, engineered for you.
          </Text>
          
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>WHAT YOU UNLOCK</Text>
          {features.map((feature, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.featureCard,
                expandedFeature === index && styles.featureCardExpanded
              ]}
              onPress={() => setExpandedFeature(expandedFeature === index ? null : index)}
            >
              <View style={styles.featureHeader}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={TEXT_DIM}
                  style={[
                    styles.featureChevron,
                    expandedFeature === index && styles.featureChevronExpanded
                  ]}
                />
              </View>
              {expandedFeature === index && (
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Comparison Toggle */}
        <View style={styles.comparisonSection}>
          <TouchableOpacity
            style={styles.comparisonToggle}
            onPress={() => setShowComparison(!showComparison)}
          >
            <Text style={styles.comparisonToggleText}>
              {showComparison ? 'Hide' : 'See how we'} compare to hiring a dietitian
            </Text>
            <Ionicons
              name={showComparison ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={TEXT_SECONDARY}
              style={styles.comparisonChevron}
            />
          </TouchableOpacity>

          {showComparison && (
            <View style={styles.comparisonTable}>
              <View style={styles.comparisonHeader}>
                <Text style={styles.comparisonHeaderEmpty}></Text>
                <Text style={[styles.comparisonHeaderText, { color: CYAN }]}>JSON.fit</Text>
                <Text style={[styles.comparisonHeaderText, { color: TEXT_SECONDARY }]}>Dietitian</Text>
              </View>
              {[
                { feature: 'Expert-level personalization', us: true, them: true },
                { feature: 'Instant access (no waiting)', us: true, them: false },
                { feature: 'Unlimited plan adjustments', us: true, them: false },
                { feature: 'Meal prep guidance included', us: true, them: false },
                { feature: 'Grocery lists with pricing', us: true, them: false },
                { feature: 'No ongoing fees', us: true, them: false },
                { feature: 'Typical cost', us: '$9.99 once', them: '$150–300/session' },
              ].map((row, index) => (
                <View key={index} style={styles.comparisonRow}>
                  <Text style={styles.comparisonFeature}>{row.feature}</Text>
                  <Text style={[styles.comparisonValue, { color: CYAN }]}>
                    {row.us === true ? '✓' : row.us}
                  </Text>
                  <Text style={[
                    styles.comparisonValue,
                    { color: row.them === false ? '#FF5A5A' : row.them === true ? CYAN : TEXT_DIM }
                  ]}>
                    {row.them === false ? '✗' : row.them === true ? '✓' : row.them}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={styles.priceStrike}>$150–300/session (dietitians)</Text>
          <View style={styles.priceContainer}>
            <View style={styles.priceMainContainer}>
              <Text style={styles.priceMain}>$9.99</Text>
              <Text style={styles.priceCurrency}>USD</Text>
            </View>
            <Text style={styles.priceOnce}>once</Text>
          </View>
          <Text style={styles.priceSubtext}>One-time purchase • Own forever</Text>
          
          {/* Limited Time Offer Badge */}
          <View style={styles.limitedOfferBadge}>
            <Text style={styles.limitedOfferText}>⚡ Limited Time: Launch Pricing</Text>
          </View>
        </View>

        {/* CTA Button */}
        <View style={styles.ctaSection}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.ctaButton, purchasing && styles.ctaButtonDisabled]}
              onPress={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={DARK_BG} />
                  <Text style={styles.ctaButtonText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.ctaButtonText}>Unlock AI Nutrition →</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Sub-CTA */}
        <View style={styles.subCtaContainer}>
          {['Instant access', 'No subscriptions', 'Lifetime updates'].map((item, index) => (
            <View key={index} style={styles.subCtaItem}>
              <Text style={styles.subCtaCheck}>✓</Text>
              <Text style={styles.subCtaText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleRestore}
            disabled={restoring || purchasing}
          >
            {restoring ? (
              <ActivityIndicator size="small" color={TEXT_DIM} />
            ) : (
              <Text style={styles.restoreText}>Restore Purchase</Text>
            )}
          </TouchableOpacity>
          <View style={styles.legalLinksContainer}>
            <TouchableOpacity onPress={onTermsPress}>
              <Text style={styles.legalLink}>Terms & Conditions</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>·</Text>
            <TouchableOpacity onPress={onPrivacyPress}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <PurchaseSuccessModal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setJustPurchased(false);
          onPurchaseSuccess?.();
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeButton: {
    padding: 8,
  },
  heroSection: {
    padding: 40,
    paddingTop: 20,
    alignItems: 'center',
  },
  heroIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  heroTitle: {
    color: TEXT_PRIMARY,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 31,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 320,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CYAN_DIM,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 204, 0.25)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 6,
  },
  trustBadgeText: {
    color: CYAN,
    fontSize: 12,
    fontWeight: '600',
  },
  featuresSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: CYAN,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  featureCard: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  featureCardExpanded: {
    borderColor: CYAN,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  featureTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  featureChevron: {
    transform: [{ rotate: '0deg' }],
  },
  featureChevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  featureDesc: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    marginLeft: 34,
  },
  comparisonSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  comparisonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  comparisonToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginRight: 8,
  },
  comparisonChevron: {
    marginLeft: 4,
  },
  comparisonTable: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  comparisonHeader: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  comparisonHeaderEmpty: {
    flex: 1,
  },
  comparisonHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    width: 70,
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  comparisonFeature: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  comparisonValue: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    width: 70,
  },
  priceSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
    alignItems: 'center',
  },
  priceStrike: {
    color: TEXT_DIM,
    fontSize: 13,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceMainContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceMain: {
    color: TEXT_PRIMARY,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  priceCurrency: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  priceOnce: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  priceSubtext: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginTop: 2,
  },
  limitedOfferBadge: {
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 165, 0, 0.3)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
    alignSelf: 'center',
  },
  limitedOfferText: {
    color: '#FFA500',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  ctaSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  ctaButton: {
    backgroundColor: CYAN,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaButtonText: {
    color: DARK_BG,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  subCtaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  subCtaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  subCtaCheck: {
    color: CYAN,
    fontSize: 10,
  },
  subCtaText: {
    color: TEXT_DIM,
    fontSize: 10,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: 8,
  },
  restoreText: {
    color: TEXT_DIM,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  legalLink: {
    color: TEXT_DIM,
    fontSize: 10,
    opacity: 0.6,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: TEXT_DIM,
    fontSize: 10,
    opacity: 0.6,
    marginHorizontal: 8,
  },
  purchasedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  purchasedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  purchasedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  purchasedText: {
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  continueButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: DARK_BG,
  },
});