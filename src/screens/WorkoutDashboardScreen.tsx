import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RobustStorage from '../utils/robustStorage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface WorkoutCompletionStatus {
  fitnessGoals: boolean;
  equipmentPreferences: boolean;
}

interface GroupCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'required' | 'optional';
  navigationTarget?: string;
  completedCount?: number;
  totalCount?: number;
}

const groups: GroupCard[] = [
  {
    id: 'requiredSetup',
    title: 'Profile Setup',
    description: 'Required to generate workouts',
    icon: 'checkmark-circle-outline',
    type: 'required',
    navigationTarget: 'RequiredSetup',
  },
  {
    id: 'optionalTools',
    title: 'Profile Tools',
    description: 'Optional - Manage your exercise library',
    icon: 'heart-outline',
    type: 'optional',
    navigationTarget: 'OptionalTools',
  },
];

export default function WorkoutDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const [completionStatus, setCompletionStatus] = useState<WorkoutCompletionStatus>({
    fitnessGoals: false,
    equipmentPreferences: false,
  });

  useEffect(() => {
    loadCompletionStatus();
  }, []);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadCompletionStatus();
    }, [])
  );

  const loadCompletionStatus = async () => {
    try {
      // Check if fitness goals questionnaire is completed
      const fitnessGoalsData = await WorkoutStorage.loadFitnessGoalsResults();
      let fitnessGoalsCompleted = false;
      
      if (fitnessGoalsData) {
        fitnessGoalsCompleted = !!(fitnessGoalsData && fitnessGoalsData.completedAt);
      }

      // Check if equipment preferences questionnaire is completed
      const equipmentPreferencesData = await WorkoutStorage.loadEquipmentPreferencesResults();
      let equipmentPreferencesCompleted = false;
      
      if (equipmentPreferencesData) {
        equipmentPreferencesCompleted = !!(equipmentPreferencesData && equipmentPreferencesData.completedAt);
      }

      const completionStatus: WorkoutCompletionStatus = {
        fitnessGoals: fitnessGoalsCompleted,
        equipmentPreferences: equipmentPreferencesCompleted,
      };
      setCompletionStatus(completionStatus);
    } catch (error) {
      console.error('Failed to load workout completion status:', error);
      // Set default values on error
      setCompletionStatus({
        fitnessGoals: false,
        equipmentPreferences: false,
      });
    }
  };

  const handleGroupPress = (group: GroupCard) => {
    if (group.navigationTarget) {
      navigation.navigate(group.navigationTarget as any);
    }
  };

  const renderGroupCard = (group: GroupCard, index: number) => {
    let displayDescription = group.description;
    let statusColor = '#71717a';
    let isCompleted = false;
    
    if (group.type === 'required') {
      const completedCount = Object.values(completionStatus).filter(Boolean).length;
      const totalCount = 2; // We have 2 required questionnaires
      isCompleted = completedCount === totalCount;
      
      if (isCompleted) {
        displayDescription = '';
        statusColor = themeColor;
      } else {
        displayDescription = 'Complete your fitness profile';
      }
    } else {
      displayDescription = 'Optional - Manage your exercise library';
    }
    
    return (
      <TouchableOpacity
        key={group.id}
        style={[
          styles.card,
          group.type === 'required' ? {
            ...styles.requiredCard,
            borderColor: themeColor
          } : styles.optionalCard,
          isCompleted && group.type === 'required' && {
            ...styles.completedCard,
            borderColor: themeColor,
            backgroundColor: themeColor === '#ec4899' ? '#1f1325' : 
                           themeColor === '#22d3ee' ? '#1e2238' :
                           themeColor === '#10b981' ? '#0f1611' : '#1f1325'
          }
        ]}
        activeOpacity={0.8}
        onPress={() => handleGroupPress(group)}
      >
        {isCompleted && group.type === 'required' && (
          <View style={[styles.completeBadge, { backgroundColor: themeColor }]}>
            <Ionicons name="checkmark" size={16} color="#0a0a0b" />
            <Text style={styles.completeBadgeText}>COMPLETE</Text>
          </View>
        )}
        
        {group.type === 'optional' && (
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>OPTIONAL</Text>
          </View>
        )}
        
        <View style={styles.cardContent}>
          <View style={styles.cardIcon}>
            <Ionicons 
              name={isCompleted && group.type === 'required' ? "checkmark-circle" : group.icon as any}
              size={48} 
              color={group.type === 'required' ? themeColor : '#71717a'}
            />
          </View>
          
          <Text style={styles.cardTitle}>
            {group.title}
          </Text>
          
          <Text style={[styles.cardDescription, { color: statusColor }]}>
            {displayDescription}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Count completed questionnaires
  const completedCount = Object.values(completionStatus).filter(Boolean).length;
  const totalQuestionnaires = 2; // We have 2 required questionnaires
  
  // Check if all questionnaires are completed
  const allQuestionnairesCompleted = completedCount === totalQuestionnaires;
  
  const handleGeneratePrompt = () => {
    navigation.navigate('ImportRoutine', { showStep1New: true });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Scrollable Content */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Workout Profile</Text>
            {!allQuestionnairesCompleted && (
              <Text style={styles.headerSubtitle}>
                Complete your profile to generate workouts
              </Text>
            )}
          </View>
        </View>

        {/* Group Cards */}
        <View style={styles.cardsContainer}>
          {groups.map((group, index) => 
            renderGroupCard(group, index)
          )}
        </View>

        {/* Generate Prompt Button - shown when all questionnaires are completed */}
        {allQuestionnairesCompleted && (
          <View style={styles.generatePromptContainer}>
            <TouchableOpacity 
              style={[styles.generatePromptButton, { backgroundColor: themeColor }]}
              onPress={handleGeneratePrompt}
              activeOpacity={0.8}
            >
              <Ionicons name="rocket" size={28} color="#ffffff" />
              <Text style={styles.generatePromptText}>Generate My Workout</Text>
              <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.myWorkoutsButton, { borderColor: themeColor }]}
              onPress={() => navigation.navigate('MyWorkouts')}
              activeOpacity={0.8}
            >
              <Ionicons name="heart" size={20} color={themeColor} />
              <Text style={[styles.myWorkoutsText, { color: themeColor }]}>My Workouts</Text>
              <Ionicons name="chevron-down" size={20} color={themeColor} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
  },
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 20,
    flex: 1,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 30,
    minHeight: 200,
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  requiredCard: {
    borderWidth: 2,
    backgroundColor: '#18181b',
  },
  optionalCard: {
    borderWidth: 1,
    borderColor: '#3f3f46',
    backgroundColor: '#18181b',
  },
  completedCard: {
    backgroundColor: '#1f1325',
  },
  completeBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  completeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
  },
  optionalBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#3f3f46',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  cardContent: {
    alignItems: 'center',
  },
  cardIcon: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  generatePromptContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
  },
  generatePromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
  },
  generatePromptText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  myWorkoutsButton: {
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    gap: 8,
  },
  myWorkoutsText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
    flex: 1,
    textAlign: 'center',
  },
});