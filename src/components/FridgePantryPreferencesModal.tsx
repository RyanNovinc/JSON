import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface FridgePantryPreferences {
  primaryApproach: 'maximize' | 'expiry' | 'ai-led';
  flagExpiringItems: boolean;
  preferExistingInventory: boolean;
  suggestSubstitutions: boolean;
}

interface FridgePantryPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (preferences: FridgePantryPreferences) => void;
  initialPreferences?: FridgePantryPreferences;
}

const FridgePantryPreferencesModal: React.FC<FridgePantryPreferencesModalProps> = ({
  visible,
  onClose,
  onSave,
  initialPreferences,
}) => {
  const { themeColor } = useTheme();
  
  const [preferences, setPreferences] = useState<FridgePantryPreferences>({
    primaryApproach: 'ai-led',
    flagExpiringItems: true,
    preferExistingInventory: true,
    suggestSubstitutions: true,
  });

  // Update local state when initialPreferences changes
  React.useEffect(() => {
    if (initialPreferences) {
      setPreferences(initialPreferences);
    }
  }, [initialPreferences]);

  const primaryApproaches = [
    {
      id: 'maximize' as const,
      title: 'Maximize My Inventory',
      description: 'Plan meals specifically around what I already have',
      icon: 'storefront',
    },
    {
      id: 'expiry' as const,
      title: 'Expiry Focused',
      description: 'Prioritize using items before they expire',
      icon: 'time',
    },
    {
      id: 'ai-led' as const,
      title: 'AI-Led Planning',
      description: 'Create optimal meal plans first, naturally incorporate my items when they fit',
      icon: 'sparkles',
    },
  ];

  const secondaryPreferences = [
    {
      key: 'flagExpiringItems' as const,
      title: 'Always flag expiring items',
      description: 'Highlight ingredients that will expire soon',
    },
    {
      key: 'preferExistingInventory' as const,
      title: 'Prefer using existing inventory when possible',
      description: 'Suggest existing ingredients when suitable',
    },
    {
      key: 'suggestSubstitutions' as const,
      title: 'Suggest substitutions from my inventory',
      description: 'Recommend alternatives from what I have',
    },
  ];

  const handleSave = () => {
    onSave(preferences);
    onClose();
  };

  const updatePrimaryApproach = (approach: FridgePantryPreferences['primaryApproach']) => {
    setPreferences(prev => ({ ...prev, primaryApproach: approach }));
  };

  const toggleSecondaryPreference = (key: keyof Omit<FridgePantryPreferences, 'primaryApproach'>) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { borderColor: themeColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColor }]}>
              Usage Preferences
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Primary Approach */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Primary Approach</Text>
              <Text style={styles.sectionDescription}>Choose your main meal planning philosophy</Text>
              
              <View style={styles.optionsContainer}>
                {primaryApproaches.map((approach) => (
                  <TouchableOpacity
                    key={approach.id}
                    style={[
                      styles.optionCard,
                      preferences.primaryApproach === approach.id && {
                        borderColor: themeColor,
                        backgroundColor: themeColor + '10',
                      }
                    ]}
                    onPress={() => updatePrimaryApproach(approach.id)}
                  >
                    <View style={styles.optionHeader}>
                      <Ionicons 
                        name={approach.icon as any} 
                        size={24} 
                        color={preferences.primaryApproach === approach.id ? themeColor : '#71717a'} 
                      />
                      <View style={styles.radioContainer}>
                        <View style={[
                          styles.radioOuter,
                          preferences.primaryApproach === approach.id && { borderColor: themeColor }
                        ]}>
                          {preferences.primaryApproach === approach.id && (
                            <View style={[styles.radioInner, { backgroundColor: themeColor }]} />
                          )}
                        </View>
                      </View>
                    </View>
                    <Text style={[
                      styles.optionTitle,
                      preferences.primaryApproach === approach.id && { color: themeColor }
                    ]}>
                      {approach.title}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {approach.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: themeColor }]} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3f3f46',
    padding: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioContainer: {
    
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#71717a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 18,
  },
  checkboxContainer: {
    gap: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#71717a',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  checkboxDescription: {
    fontSize: 13,
    color: '#a1a1aa',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
});

export default FridgePantryPreferencesModal;