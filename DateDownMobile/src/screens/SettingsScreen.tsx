import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/api';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['userSettings'],
    queryFn: settingsService.getUserSettings,
  });

  const togglePremiumMutation = useMutation({
    mutationFn: settingsService.togglePremium,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userSettings'] });
    },
  });

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: logout
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="person-outline" size={24} color="#007AFF" />
            <Text style={styles.rowText}>{user?.name || 'User'}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="mail-outline" size={24} color="#007AFF" />
            <Text style={styles.rowText}>{user?.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium</Text>
        
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="star-outline" size={24} color="#FFD700" />
            <Text style={styles.rowText}>Premium Features</Text>
          </View>
          <Switch
            value={settings?.isPremium || false}
            onValueChange={(value) => togglePremiumMutation.mutate(value)}
            trackColor={{ false: '#3e3e3e', true: '#007AFF' }}
            thumbColor="#fff"
          />
        </View>

        {settings?.isPremium && (
          <Text style={styles.premiumText}>
            Enjoy unlimited countdowns and custom themes!
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.rowText}>Version 1.0.0</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row}>
          <View style={styles.rowLeft}>
            <Ionicons name="document-text-outline" size={24} color="#007AFF" />
            <Text style={styles.rowText}>Terms & Privacy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Made with ❤️ using React Native</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    fontSize: 16,
    color: '#fff',
  },
  premiumText: {
    fontSize: 14,
    color: '#888',
    paddingHorizontal: 16,
    marginTop: -5,
  },
  logoutButton: {
    marginHorizontal: 20,
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 14,
    color: '#555',
  },
});