import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useEntitlement } from '../hooks/useJSONPro';
import { useRevenueCat } from '../contexts/RevenueCatContext';
import { REVENUECAT_CONFIG } from '../config/revenueCatConfig';

interface NutritionFeatureGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  onUpgradePress?: () => void;
  featureName?: string;
}

/**
 * Component that conditionally renders nutrition features based on nutrition_access entitlement
 * Shows upgrade prompt if user doesn't have access
 */
export const NutritionFeatureGate: React.FC<NutritionFeatureGateProps> = ({
  children,
  fallback,
  showUpgradePrompt = true,
  onUpgradePress,
  featureName = 'nutrition planning',
}) => {
  const { isLoading } = useRevenueCat();
  const hasNutritionAccess = useEntitlement(REVENUECAT_CONFIG.entitlements.json_pro);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // User has access - show premium content
  if (hasNutritionAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - show fallback or upgrade prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  if (showUpgradePrompt) {
    return (
      <View style={styles.upgradeContainer}>
        <Ionicons name="restaurant" size={32} color="#00E5CC" />
        <Text style={styles.upgradeTitle}>Nutrition Pro Required</Text>
        <Text style={styles.upgradeText}>
          Upgrade to unlock {featureName} with AI-powered meal planning
        </Text>
        {onUpgradePress && (
          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgradePress}>
            <Text style={styles.upgradeButtonText}>Unlock for $9.99</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // No fallback, no upgrade prompt - show nothing
  return null;
};

/**
 * Simple conditional wrapper for nutrition features
 */
export const IfNutritionPro: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasNutritionAccess = useEntitlement(REVENUECAT_CONFIG.entitlements.json_pro);
  return hasNutritionAccess ? <>{children}</> : null;
};

/**
 * Simple conditional wrapper for non-nutrition users
 */
export const IfNutritionFree: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const hasNutritionAccess = useEntitlement(REVENUECAT_CONFIG.entitlements.json_pro);
  return !hasNutritionAccess ? <>{children}</> : null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#71717a',
    fontSize: 16,
  },
  upgradeContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 204, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 204, 0.3)',
    margin: 16,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
  },
  upgradeText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: '#00E5CC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  upgradeButtonText: {
    color: '#0A0E14',
    fontSize: 16,
    fontWeight: '600',
  },
});