import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutStorage } from '../utils/storage';
import RobustStorage from '../utils/robustStorage';

interface WeightEntry {
  id: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;
  notes?: string;
}

const WeightTrackerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { themeColor, themeColorLight } = useTheme();
  
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [currentWeight, setCurrentWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [notes, setNotes] = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadWeightHistory();
    loadUserSettings();
  }, []);

  const loadWeightHistory = async () => {
    try {
      console.log('⚖️ [WEIGHT] Loading weight history with ROBUST STORAGE...');
      
      // Run health check first
      const healthCheck = await RobustStorage.healthCheck();
      console.log('⚖️ [WEIGHT] Storage health check:', healthCheck);
      
      // Try robust storage first
      let stored = await RobustStorage.getItem('@weight_history', true);
      let dataSource = 'robust';
      
      if (!stored) {
        // Fallback to legacy storage for migration
        console.log('⚖️ [WEIGHT] No data in robust storage, checking legacy storage...');
        stored = await AsyncStorage.getItem('@weight_history');
        dataSource = 'legacy';
        
        if (stored) {
          // Migrate to robust storage
          console.log('⚖️ [WEIGHT] 🔄 Migrating legacy weight data to robust storage...');
          await RobustStorage.setItem('@weight_history', stored, true);
          dataSource = 'migrated';
        }
      }
      
      if (stored) {
        const history: WeightEntry[] = JSON.parse(stored);
        console.log(`⚖️ [WEIGHT] Loaded ${history.length} weight entries from ${dataSource} storage`);
        setWeightHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } else {
        console.log('⚖️ [WEIGHT] No weight history found');
      }
    } catch (error) {
      console.error('Failed to load weight history:', error);
    }
  };

  const loadUserSettings = async () => {
    try {
      const nutritionResults = await WorkoutStorage.loadNutritionResults();
      if (nutritionResults?.formData?.weightUnit) {
        setWeightUnit(nutritionResults.formData.weightUnit);
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  };

  const saveWeight = async () => {
    if (!currentWeight.trim()) {
      Alert.alert('Error', 'Please enter your weight');
      return;
    }

    const weightValue = parseFloat(currentWeight);
    if (isNaN(weightValue) || weightValue <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    const newEntry: WeightEntry = {
      id: Date.now().toString(),
      weight: weightValue,
      unit: weightUnit,
      date: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    try {
      const updatedHistory = [newEntry, ...weightHistory];
      
      console.log('⚖️ [WEIGHT] 💾 Saving weight entry with robust storage...');
      console.log('⚖️ [WEIGHT] New entry:', { weight: newEntry.weight, unit: newEntry.unit, date: newEntry.date });
      
      // Save using robust storage with redundancy
      const saveSuccess = await RobustStorage.setItem('@weight_history', JSON.stringify(updatedHistory), true);
      console.log(`⚖️ [WEIGHT] Robust save result: ${saveSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (!saveSuccess) {
        console.error('⚖️ [WEIGHT] ❌ Robust save failed, trying emergency fallback...');
        await AsyncStorage.setItem('@weight_history', JSON.stringify(updatedHistory));
      }
      
      setWeightHistory(updatedHistory);
      
      // Update nutrition results with latest weight
      await updateNutritionWeight(weightValue);
      
      setCurrentWeight('');
      setNotes('');
      setShowUpdateModal(false);
      
      Alert.alert('Weight Updated', 'Your weight has been saved with enhanced protection and will be used for future meal plan calculations.');
    } catch (error) {
      console.error('Failed to save weight:', error);
      Alert.alert('Error', 'Failed to save weight. Please try again.');
    }
  };

  const updateNutritionWeight = async (newWeight: number) => {
    try {
      const nutritionResults = await WorkoutStorage.loadNutritionResults();
      if (nutritionResults) {
        const updatedResults = {
          ...nutritionResults,
          formData: {
            ...nutritionResults.formData,
            weight: newWeight.toString(),
          },
        };
        await WorkoutStorage.saveNutritionResults(updatedResults);
      }
    } catch (error) {
      console.error('Failed to update nutrition weight:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getWeightDifference = () => {
    if (weightHistory.length < 2) return null;
    
    const latest = weightHistory[0];
    const previous = weightHistory[1];
    
    let latestWeight = latest.weight;
    let previousWeight = previous.weight;
    
    if (latest.unit !== previous.unit) {
      if (latest.unit === 'kg' && previous.unit === 'lbs') {
        previousWeight = previousWeight * 0.453592;
      } else if (latest.unit === 'lbs' && previous.unit === 'kg') {
        previousWeight = previousWeight * 2.20462;
      }
    }
    
    const diff = latestWeight - previousWeight;
    
    return {
      value: Math.abs(diff),
      unit: latest.unit,
      isPositive: diff > 0,
    };
  };

  const weightDiff = getWeightDifference();
  const latestEntry = weightHistory[0];

  // History View
  if (showHistory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={themeColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#ffffff' }]}>Weight History</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.historyContainer}>
          {weightHistory.length > 0 ? (
            weightHistory.map((entry) => (
              <View key={entry.id} style={[styles.historyItem, { borderColor: themeColor + '30' }]}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyWeight}>{entry.weight} {entry.unit}</Text>
                  <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                </View>
                {entry.notes && (
                  <Text style={styles.historyNotes}>{entry.notes}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noHistoryText}>No weight history yet</Text>
          )}
        </View>
      </View>
    );
  }

  // Main Weight Display
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#ffffff' }]}>Weight Tracker</Text>
        {weightHistory.length > 0 && (
          <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.headerButton}>
            <Ionicons name="time-outline" size={24} color={themeColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* AI Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: themeColor + '20', borderColor: themeColor + '30' }]}>
        <Ionicons name="bulb-outline" size={20} color={themeColor} />
        <Text style={[styles.infoText, { color: '#ffffff' }]}>
          Your weight helps the AI create accurate meal plans with proper calories and macros
        </Text>
      </View>

      {/* Main Weight Display */}
      <View style={styles.weightDisplayContainer}>
        {latestEntry ? (
          <View style={[styles.weightCard, { 
            borderColor: themeColor + '30',
            shadowColor: themeColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 16,
          }]}>
            <Text style={styles.weightLabel}>Current Weight</Text>
            <View style={styles.weightValueContainer}>
              <Text style={[styles.weightValue, { color: themeColor, textShadowColor: themeColorLight }]}>
                {latestEntry.weight}
              </Text>
              <Text style={[styles.weightUnit, { color: themeColor }]}>
                {latestEntry.unit}
              </Text>
            </View>
            <Text style={styles.lastUpdated}>
              Last updated {formatDate(latestEntry.date)}
            </Text>
            
            {weightDiff && (
              <View style={styles.changeContainer}>
                <View style={[styles.changeBadge, { 
                  backgroundColor: weightDiff.isPositive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)' 
                }]}>
                  <Ionicons 
                    name={weightDiff.isPositive ? "trending-up" : "trending-down"} 
                    size={16} 
                    color={weightDiff.isPositive ? "#ef4444" : "#22c55e"} 
                  />
                  <Text style={[styles.changeText, { 
                    color: weightDiff.isPositive ? "#ef4444" : "#22c55e" 
                  }]}>
                    {weightDiff.isPositive ? '+' : '-'}{weightDiff.value.toFixed(1)} {weightDiff.unit}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="fitness" size={64} color={themeColor + '40'} />
            </View>
            <Text style={styles.emptyStateTitle}>Track Your Weight</Text>
            <Text style={styles.emptyStateSubtitle}>
              Add your weight to help the AI create personalized meal plans
            </Text>
          </View>
        )}
      </View>

      {/* Update Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.updateButton, { 
            backgroundColor: themeColor,
            shadowColor: themeColor 
          }]}
          onPress={() => setShowUpdateModal(true)}
        >
          <Ionicons name="add" size={20} color="#0a0a0b" />
          <Text style={styles.updateButtonText}>
            {latestEntry ? 'Update Weight' : 'Add First Weight'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Update Modal */}
      <Modal
        visible={showUpdateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.modalContainer, { borderColor: themeColor + '30' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Update Weight</Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.weightInputRow}>
                <TextInput
                  style={[styles.weightInput, { color: '#ffffff', borderColor: themeColor + '30' }]}
                  value={currentWeight}
                  onChangeText={setCurrentWeight}
                  placeholder={`Enter weight in ${weightUnit}`}
                  placeholderTextColor="#71717a"
                  keyboardType="numeric"
                  autoFocus
                />
                
                <View style={styles.unitSelector}>
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      weightUnit === 'kg' && { backgroundColor: themeColor }
                    ]}
                    onPress={() => setWeightUnit('kg')}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      { color: weightUnit === 'kg' ? '#0a0a0b' : '#ffffff' }
                    ]}>kg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      weightUnit === 'lbs' && { backgroundColor: themeColor }
                    ]}
                    onPress={() => setWeightUnit('lbs')}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      { color: weightUnit === 'lbs' ? '#0a0a0b' : '#ffffff' }
                    ]}>lbs</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={[styles.notesInput, { color: '#ffffff', borderColor: themeColor + '30' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes (e.g., morning weigh-in, after workout)"
                placeholderTextColor="#71717a"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.saveButton, { 
                  backgroundColor: themeColor,
                  shadowColor: themeColor 
                }]}
                onPress={saveWeight}
              >
                <Text style={styles.saveButtonText}>Save Weight</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  weightDisplayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  weightCard: {
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 40,
    width: '100%',
    maxWidth: 340,
    borderWidth: 2,
  },
  weightLabel: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  weightValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
    justifyContent: 'center',
  },
  weightValue: {
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 72,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  weightUnit: {
    fontSize: 28,
    fontWeight: '600',
    marginLeft: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  changeContainer: {
    alignItems: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  changeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    maxWidth: 280,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  updateButtonText: {
    color: '#0a0a0b',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  
  // History styles
  historyContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
  },
  historyLeft: {
    flex: 1,
  },
  historyWeight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  historyNotes: {
    fontSize: 12,
    color: '#71717a',
    fontStyle: 'italic',
    maxWidth: 120,
    textAlign: 'right',
  },
  noHistoryText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 60,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    maxHeight: '85%',
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  weightInput: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginRight: 12,
    borderWidth: 1,
    color: '#ffffff',
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  unitButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  notesInput: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 30,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    color: '#ffffff',
  },
  saveButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: '#0a0a0b',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WeightTrackerScreen;