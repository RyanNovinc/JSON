import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import { WeightEntry } from '../types/nutrition';

type NavigationProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

export default function WeightTrackerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const { 
    addWeightEntry, 
    weightEntries, 
    userProfile,
    updateMacrosBasedOnWeight,
    getLatestWeight,
  } = useMealPlanning();
  const { globalUnit, convertWeight } = useWeightUnit();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'lbs'>(globalUnit);
  const [viewPeriod, setViewPeriod] = useState<'week' | 'month' | 'all'>('month');

  // Filter entries based on view period
  const getFilteredEntries = () => {
    const now = new Date();
    const entries = [...weightEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    switch (viewPeriod) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return entries.filter(entry => new Date(entry.date) >= weekAgo);
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return entries.filter(entry => new Date(entry.date) >= monthAgo);
      default:
        return entries;
    }
  };

  const filteredEntries = getFilteredEntries();
  const latestEntry = getLatestWeight();

  // Calculate weight change
  const getWeightChange = () => {
    if (filteredEntries.length < 2) return null;
    
    const latest = filteredEntries[0];
    const previous = filteredEntries[1];
    
    const latestWeight = convertWeight(latest.weight, latest.unit, globalUnit);
    const previousWeight = convertWeight(previous.weight, previous.unit, globalUnit);
    
    const change = latestWeight - previousWeight;
    const days = Math.max(1, Math.floor((new Date(latest.date).getTime() - new Date(previous.date).getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      change,
      changePerWeek: (change * 7) / days,
      isGain: change > 0,
      days,
    };
  };

  const weightChange = getWeightChange();

  // Get progress towards goal
  const getGoalProgress = () => {
    if (!userProfile?.goals.targetWeight || !latestEntry) return null;
    
    const currentWeight = convertWeight(latestEntry.weight, latestEntry.unit, globalUnit);
    const targetWeight = userProfile.goals.targetWeight;
    const startWeight = weightEntries.length > 0 
      ? convertWeight(weightEntries[weightEntries.length - 1].weight, weightEntries[weightEntries.length - 1].unit, globalUnit)
      : currentWeight;
    
    const totalNeeded = Math.abs(targetWeight - startWeight);
    const achieved = Math.abs(currentWeight - startWeight);
    const remaining = Math.abs(targetWeight - currentWeight);
    
    const isLossGoal = userProfile.goals.primaryGoal === 'weight_loss';
    const progressPercentage = totalNeeded > 0 ? Math.min((achieved / totalNeeded) * 100, 100) : 0;
    
    return {
      currentWeight,
      targetWeight,
      startWeight,
      remaining,
      progressPercentage,
      isLossGoal,
      isOnTrack: isLossGoal ? currentWeight < startWeight : currentWeight > startWeight,
    };
  };

  const goalProgress = getGoalProgress();

  const addWeight = async () => {
    if (!newWeight.trim()) {
      Alert.alert('Error', 'Please enter a weight');
      return;
    }

    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0 || weight > 1000) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    try {
      const entry: WeightEntry = {
        date: selectedDate,
        weight,
        unit: selectedUnit,
        notes: newNotes.trim() || undefined,
      };

      await addWeightEntry(entry);
      setShowAddModal(false);
      setNewWeight('');
      setNewNotes('');
      setSelectedDate(new Date().toISOString().split('T')[0]);
      
      Alert.alert('Success', 'Weight entry added');
    } catch (error) {
      Alert.alert('Error', 'Failed to add weight entry');
    }
  };

  const forceUpdateMacros = async () => {
    try {
      await updateMacrosBasedOnWeight();
      Alert.alert('Updated', 'Macros have been adjusted based on your progress');
    } catch (error) {
      Alert.alert('Error', 'Failed to update macros');
    }
  };

  const WeightChart = () => {
    if (filteredEntries.length === 0) return null;

    const chartEntries = filteredEntries.slice(0, 10).reverse(); // Show last 10 entries
    const weights = chartEntries.map(entry => convertWeight(entry.weight, entry.unit, globalUnit));
    const minWeight = Math.min(...weights) * 0.98;
    const maxWeight = Math.max(...weights) * 1.02;
    const weightRange = maxWeight - minWeight || 1;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weight Trend</Text>
        <View style={styles.chartArea}>
          <View style={styles.chartGrid}>
            {/* Y-axis labels */}
            <View style={styles.yAxisLabels}>
              <Text style={styles.yAxisLabel}>{maxWeight.toFixed(1)}</Text>
              <Text style={styles.yAxisLabel}>{((maxWeight + minWeight) / 2).toFixed(1)}</Text>
              <Text style={styles.yAxisLabel}>{minWeight.toFixed(1)}</Text>
            </View>
            
            {/* Chart lines */}
            <View style={styles.chartLines}>
              {chartEntries.map((entry, index) => {
                const weight = convertWeight(entry.weight, entry.unit, globalUnit);
                const x = (index / Math.max(1, chartEntries.length - 1)) * 100;
                const y = ((maxWeight - weight) / weightRange) * 100;
                
                return (
                  <View key={entry.date} style={styles.chartColumn}>
                    <View
                      style={[
                        styles.chartPoint,
                        {
                          left: `${x}%`,
                          top: `${y}%`,
                          backgroundColor: themeColor,
                        }
                      ]}
                    />
                    {index < chartEntries.length - 1 && (
                      <View
                        style={[
                          styles.chartLine,
                          {
                            left: `${x}%`,
                            top: `${y}%`,
                            width: `${100 / (chartEntries.length - 1)}%`,
                            backgroundColor: themeColor,
                          }
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
          
          {/* X-axis labels */}
          <View style={styles.xAxisLabels}>
            {chartEntries.map((entry, index) => (
              index % Math.ceil(chartEntries.length / 4) === 0 && (
                <Text key={entry.date} style={styles.xAxisLabel}>
                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              )
            ))}
          </View>
        </View>
      </View>
    );
  };

  const WeightEntryCard = ({ entry, isLatest }: { entry: WeightEntry; isLatest: boolean }) => {
    const displayWeight = convertWeight(entry.weight, entry.unit, globalUnit);
    
    return (
      <View style={[styles.entryCard, isLatest && { borderColor: themeColor }]}>
        <View style={styles.entryHeader}>
          <View style={styles.entryDateRow}>
            <Text style={styles.entryDate}>
              {new Date(entry.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
            {isLatest && (
              <View style={[styles.latestBadge, { backgroundColor: themeColor }]}>
                <Text style={styles.latestBadgeText}>Latest</Text>
              </View>
            )}
          </View>
          
          <Text style={[styles.entryWeight, isLatest && { color: themeColor }]}>
            {displayWeight.toFixed(1)} {globalUnit}
          </Text>
        </View>

        {entry.notes && (
          <Text style={styles.entryNotes}>{entry.notes}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weight Tracker</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Current Stats</Text>
          
          <View style={styles.currentWeight}>
            <Text style={[styles.currentWeightValue, { color: themeColor }]}>
              {latestEntry 
                ? `${convertWeight(latestEntry.weight, latestEntry.unit, globalUnit).toFixed(1)} ${globalUnit}`
                : 'No entries yet'
              }
            </Text>
            <Text style={styles.currentWeightLabel}>Current Weight</Text>
          </View>

          {weightChange && (
            <View style={styles.changeStats}>
              <View style={styles.changeStat}>
                <Text style={[
                  styles.changeValue,
                  { color: weightChange.isGain ? '#ef4444' : '#22c55e' }
                ]}>
                  {weightChange.isGain ? '+' : ''}{weightChange.change.toFixed(1)} {globalUnit}
                </Text>
                <Text style={styles.changeLabel}>
                  Last {weightChange.days} day{weightChange.days !== 1 ? 's' : ''}
                </Text>
              </View>
              
              <View style={styles.changeStat}>
                <Text style={[
                  styles.changeValue,
                  { color: weightChange.isGain ? '#ef4444' : '#22c55e' }
                ]}>
                  {weightChange.isGain ? '+' : ''}{weightChange.changePerWeek.toFixed(1)} {globalUnit}/week
                </Text>
                <Text style={styles.changeLabel}>Weekly Rate</Text>
              </View>
            </View>
          )}

          {/* Goal Progress */}
          {goalProgress && (
            <View style={styles.goalProgress}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>Goal Progress</Text>
                <Text style={styles.goalTarget}>
                  Target: {goalProgress.targetWeight} {globalUnit}
                </Text>
              </View>
              
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${goalProgress.progressPercentage}%`,
                      backgroundColor: goalProgress.isOnTrack ? '#22c55e' : '#f59e0b'
                    }
                  ]}
                />
              </View>
              
              <View style={styles.progressStats}>
                <Text style={styles.progressText}>
                  {goalProgress.progressPercentage.toFixed(1)}% complete
                </Text>
                <Text style={styles.remainingText}>
                  {goalProgress.remaining.toFixed(1)} {globalUnit} remaining
                </Text>
              </View>
            </View>
          )}

          {/* Auto-adjust button */}
          {userProfile?.macros.autoAdjust && weightEntries.length > 1 && (
            <TouchableOpacity
              style={[styles.adjustButton, { borderColor: themeColor }]}
              onPress={forceUpdateMacros}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={16} color={themeColor} />
              <Text style={[styles.adjustButtonText, { color: themeColor }]}>
                Update Macros Based on Progress
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Period Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>View Period:</Text>
          <View style={styles.filterButtons}>
            {(['week', 'month', 'all'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.filterButton,
                  viewPeriod === period && { backgroundColor: themeColor }
                ]}
                onPress={() => setViewPeriod(period)}
              >
                <Text style={[
                  styles.filterButtonText,
                  viewPeriod === period && { color: '#0a0a0b' }
                ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weight Chart */}
        {filteredEntries.length > 1 && <WeightChart />}

        {/* Weight History */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>
            Weight History ({filteredEntries.length} entries)
          </Text>
          
          {filteredEntries.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No entries for this period</Text>
            </View>
          ) : (
            <View style={styles.entriesList}>
              {filteredEntries.map((entry, index) => (
                <WeightEntryCard 
                  key={entry.date} 
                  entry={entry} 
                  isLatest={index === 0 && viewPeriod === 'all'}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Weight Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Weight Entry</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Weight</Text>
                <View style={styles.weightInputRow}>
                  <TextInput
                    style={styles.weightInput}
                    value={newWeight}
                    onChangeText={setNewWeight}
                    placeholder="70.5"
                    placeholderTextColor="#71717a"
                    keyboardType="decimal-pad"
                  />
                  
                  <View style={styles.unitSelector}>
                    {(['kg', 'lbs'] as const).map((unit) => (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.unitButton,
                          selectedUnit === unit && { backgroundColor: themeColor }
                        ]}
                        onPress={() => setSelectedUnit(unit)}
                      >
                        <Text style={[
                          styles.unitButtonText,
                          selectedUnit === unit && { color: '#0a0a0b' }
                        ]}>
                          {unit}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity style={styles.dateInput}>
                  <Text style={styles.dateInputText}>
                    {new Date(selectedDate).toLocaleDateString()}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={themeColor} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  value={newNotes}
                  onChangeText={setNewNotes}
                  placeholder="How are you feeling? Any observations..."
                  placeholderTextColor="#71717a"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: themeColor }]}
                onPress={addWeight}
              >
                <Text style={styles.modalSaveText}>Save Entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  statsCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
  },
  currentWeight: {
    alignItems: 'center',
    marginBottom: 20,
  },
  currentWeightValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  currentWeightLabel: {
    fontSize: 14,
    color: '#71717a',
  },
  changeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  changeStat: {
    alignItems: 'center',
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  changeLabel: {
    fontSize: 12,
    color: '#71717a',
  },
  goalProgress: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingTop: 16,
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  goalTarget: {
    fontSize: 14,
    color: '#71717a',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#27272a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 12,
    color: '#71717a',
  },
  adjustButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  adjustButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  chartContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  chartArea: {
    height: 200,
  },
  chartGrid: {
    flex: 1,
    flexDirection: 'row',
  },
  yAxisLabels: {
    width: 40,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#71717a',
    textAlign: 'right',
  },
  chartLines: {
    flex: 1,
    position: 'relative',
  },
  chartColumn: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  chartPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -3,
    marginLeft: -3,
  },
  chartLine: {
    position: 'absolute',
    height: 2,
    marginTop: -1,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: 40,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#71717a',
  },
  historySection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#71717a',
  },
  entriesList: {
    gap: 12,
  },
  entryCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryDate: {
    fontSize: 14,
    color: '#71717a',
  },
  latestBadge: {
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  latestBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  entryWeight: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  entryNotes: {
    fontSize: 14,
    color: '#a1a1aa',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  weightInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  weightInput: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#27272a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateInputText: {
    fontSize: 16,
    color: '#ffffff',
  },
  notesInput: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
});