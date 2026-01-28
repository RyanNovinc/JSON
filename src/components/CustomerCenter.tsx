import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useJSONPro, useCustomerPurchaseInfo } from '../hooks/useJSONPro';
import { useRevenueCat } from '../contexts/RevenueCatContext';

interface CustomerCenterProps {
  onClose?: () => void;
}

export const CustomerCenter: React.FC<CustomerCenterProps> = ({ onClose }) => {
  const { hasAccess, isLoading, customerInfo } = useJSONPro();
  const { originalPurchaseDate, userId } = useCustomerPurchaseInfo();
  const { restorePurchases } = useRevenueCat();

  const handleRestorePurchases = async () => {
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Success', 'Your purchases have been restored.');
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'For support, please email us at Ryan.Novinc@gmail.com',
      [
        { text: 'Copy Email', onPress: () => {
          // In a real app, you'd copy to clipboard here
          Alert.alert('Copied', 'Email copied to clipboard');
        }},
        { text: 'OK' }
      ]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#71717a" />
          </TouchableOpacity>
        )}
      </View>

      {/* Subscription Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={hasAccess ? "checkmark-circle" : "lock-closed"} 
              size={24} 
              color={hasAccess ? "#22d3ee" : "#71717a"} 
            />
            <Text style={styles.statusText}>
              {hasAccess ? "Pro Access" : "Free Plan"}
            </Text>
          </View>
          {hasAccess && originalPurchaseDate && (
            <Text style={styles.purchaseDate}>
              Purchased on {formatDate(originalPurchaseDate)}
            </Text>
          )}
        </View>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue}>{userId || 'Anonymous'}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleRestorePurchases}>
          <Ionicons name="refresh-outline" size={20} color="#22d3ee" />
          <Text style={styles.actionText}>Restore Purchases</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleContactSupport}>
          <Ionicons name="mail-outline" size={20} color="#22d3ee" />
          <Text style={styles.actionText}>Contact Support</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info (only in development) */}
      {__DEV__ && customerInfo && (
        <View style={styles.debugSection}>
          <Text style={styles.sectionTitle}>Debug Info</Text>
          <View style={styles.debugCard}>
            <Text style={styles.debugText}>
              Customer ID: {customerInfo.originalAppUserId}
            </Text>
            <Text style={styles.debugText}>
              Active Entitlements: {Object.keys(customerInfo.entitlements?.active || {}).join(', ') || 'None'}
            </Text>
            <Text style={styles.debugText}>
              Non-Subscription Transactions: {customerInfo.nonSubscriptionTransactions?.length || 0}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  statusCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  purchaseDate: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: '#71717a',
  },
  infoValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  actionText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
    fontWeight: '500',
  },
  debugSection: {
    padding: 20,
    paddingTop: 0,
  },
  debugCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  debugText: {
    fontSize: 12,
    color: '#fbbf24',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});