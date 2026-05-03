import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage } from '../utils/storage';

type RequiredSetupNavigationProp = StackNavigationProp<RootStackParamList, 'RequiredSetup'>;

interface SetupItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  navigationTarget: keyof RootStackParamList;
  storageKey: string;
}

const SETUP_ITEMS: SetupItem[] = [
  {
    id: 'fitnessGoals',
    title: 'Fitness Goals',
    description: 'Define your workout objectives',
    icon: 'fitness-outline',
    navigationTarget: 'FitnessGoalsQuestionnaire',
    storageKey: 'fitnessGoalsCompleted',
  },
  {
    id: 'equipment',
    title: 'Equipment Setup',
    description: 'Select your available equipment',
    icon: 'barbell-outline',
    navigationTarget: 'EquipmentPreferencesQuestionnaire',
    storageKey: 'equipmentPreferencesCompleted',
  },
];

export default function RequiredSetupScreen() {
  const navigation = useNavigation<RequiredSetupNavigationProp>();
  const { themeColor } = useTheme();
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCompletionStatus();
  }, []);

  // Reload completion status when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkCompletionStatus();
    }, [])
  );

  const checkCompletionStatus = async () => {
    try {
      const completed = new Set<string>();
      
      // Check fitness goals completion
      const fitnessGoalsData = await WorkoutStorage.loadFitnessGoalsResults();
      if (fitnessGoalsData && fitnessGoalsData.completedAt) {
        completed.add('fitnessGoals');
      }
      
      // Check equipment preferences completion
      const equipmentPreferencesData = await WorkoutStorage.loadEquipmentPreferencesResults();
      if (equipmentPreferencesData && equipmentPreferencesData.completedAt) {
        completed.add('equipment');
      }
      
      setCompletedItems(completed);
    } catch (error) {
      console.error('Failed to check completion status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: SetupItem) => {
    navigation.navigate(item.navigationTarget);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const allCompleted = SETUP_ITEMS.every(item => completedItems.has(item.id));
  const completedCount = completedItems.size;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Required Setup</Text>
          <Text style={styles.subtitle}>
            {allCompleted 
              ? 'All set! Ready to generate workouts' 
              : `${completedCount}/${SETUP_ITEMS.length} completed`
            }
          </Text>
        </View>
      </View>

      {allCompleted && (
        <View style={[styles.completionBanner, { backgroundColor: themeColor + '20' }]}>
          <Ionicons name="checkmark-circle" size={24} color={themeColor} />
          <Text style={[styles.completionText, { color: themeColor }]}>
            Profile setup complete - Ready to generate!
          </Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {SETUP_ITEMS.map((item) => {
          const isCompleted = completedItems.has(item.id);
          
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.setupItem,
                isCompleted && styles.setupItemCompleted,
                { borderLeftColor: isCompleted ? '#ec4899' : '#27272a' }
              ]}
              onPress={() => handleItemPress(item)}
              activeOpacity={0.8}
            >
              <View style={styles.setupItemContent}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: isCompleted ? '#ec489920' : '#27272a' }
                ]}>
                  <Ionicons 
                    name={item.icon as any} 
                    size={24} 
                    color={isCompleted ? themeColor : '#71717a'} 
                  />
                </View>
                
                <View style={styles.itemDetails}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  {isCompleted && (
                    <View style={styles.completedIndicator}>
                      <Ionicons name="checkmark" size={16} color={themeColor} />
                      <Text style={[styles.completedText, { color: themeColor }]}>
                        Completed
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.itemAction}>
                  {isCompleted ? (
                    <Ionicons name="chevron-forward" size={20} color="#71717a" />
                  ) : (
                    <View style={[styles.actionButton, { borderColor: themeColor }]}>
                      <Text style={[styles.actionButtonText, { color: themeColor }]}>
                        Start
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#71717a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  setupItem: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    borderLeftWidth: 4,
    marginBottom: 16,
    overflow: 'hidden',
  },
  setupItemCompleted: {
    backgroundColor: '#0d1611',
    borderColor: '#10b98120',
  },
  setupItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#71717a',
    lineHeight: 20,
  },
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemAction: {
    marginLeft: 12,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});