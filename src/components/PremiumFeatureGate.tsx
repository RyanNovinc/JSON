import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useJSONPro } from '../hooks/useJSONPro';

interface PremiumFeatureGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  onUpgradePress?: () => void;
  featureName?: string;
}

/**
 * Component that conditionally renders premium features
 * Shows upgrade prompt if user doesn't have access
 */
export const PremiumFeatureGate: React.FC<PremiumFeatureGateProps> = ({
  children,
  fallback,
  showUpgradePrompt = true,
  onUpgradePress,
  featureName = 'this feature',
}) => {
  const { hasAccess, isLoading } = useJSONPro();

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // User has access - show premium content
  if (hasAccess) {
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
        <Ionicons name="lock-closed" size={32} color="#a855f7" />
        <Text style={styles.upgradeTitle}>Premium Feature</Text>
        <Text style={styles.upgradeText}>
          Upgrade to Pro to unlock {featureName}
        </Text>
        {onUpgradePress && (
          <TouchableOpacity style={styles.upgradeButton} onPress={onUpgradePress}>
            <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // No fallback, no upgrade prompt - show nothing
  return null;
};

/**
 * Simple conditional wrapper for premium features
 */
export const IfPremium: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasAccess } = useJSONPro();
  return hasAccess ? <>{children}</> : null;
};

/**
 * Simple conditional wrapper for free features
 */
export const IfFree: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { hasAccess } = useJSONPro();
  return !hasAccess ? <>{children}</> : null;
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
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
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
    backgroundColor: '#a855f7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});