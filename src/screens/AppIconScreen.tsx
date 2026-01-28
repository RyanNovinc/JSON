import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { Ionicons } from '@expo/vector-icons';

export default function AppIconScreen({ navigation }: any) {
  const handleExportInstructions = () => {
    Alert.alert(
      'Export Instructions',
      'To export this icon:\n\n1. Take a screenshot of the large icon below\n2. Crop it to just the icon\n3. Resize to 1024x1024 for iOS\n4. Create smaller versions for Android\n\nOr use a screen recording tool to capture the icon directly.',
      [{ text: 'Got it' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>App Icon Preview</Text>
        <TouchableOpacity 
          onPress={handleExportInstructions}
          style={styles.infoButton}
        >
          <Ionicons name="information-circle" size={24} color="#22d3ee" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>1024x1024 (iOS App Store)</Text>
        <View style={styles.iconContainer}>
          <AppIcon size={300} />
        </View>

        <Text style={styles.subtitle}>Preview Sizes</Text>
        <View style={styles.previewContainer}>
          <View style={styles.previewItem}>
            <AppIcon size={60} />
            <Text style={styles.previewLabel}>60x60</Text>
          </View>
          <View style={styles.previewItem}>
            <AppIcon size={80} />
            <Text style={styles.previewLabel}>80x80</Text>
          </View>
          <View style={styles.previewItem}>
            <AppIcon size={120} />
            <Text style={styles.previewLabel}>120x120</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Black background (#000000) with cyan fitness icon (#22d3ee)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  infoButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 20,
  },
  iconContainer: {
    backgroundColor: '#18181b',
    padding: 20,
    borderRadius: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  previewContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  previewItem: {
    alignItems: 'center',
    gap: 8,
  },
  previewLabel: {
    fontSize: 12,
    color: '#71717a',
  },
  note: {
    fontSize: 14,
    color: '#52525b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});