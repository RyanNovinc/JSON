import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';

type BlocksScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Blocks'>;
type BlocksScreenRouteProp = RouteProp<RootStackParamList, 'Blocks'>;

interface Block {
  block_name: string;
  weeks: string;
  structure?: string;
  days: any[];
}

interface BlockCardProps {
  block: Block;
  onPress: () => void;
  onLongPress: () => void;
  isActive?: boolean;
  weekProgress?: {
    current: number;
    total: number;
    remaining: number;
    isComplete: boolean;
    isOverdue: boolean;
  };
}

function BlockCard({ block, onPress, onLongPress, isActive, weekProgress }: BlockCardProps) {
  const dayCount = block.days.length;
  
  // Count unique exercises for stats
  const exercises = new Set<string>();
  block.days.forEach(day => {
    day.exercises?.forEach((exercise: any) => {
      exercises.add(exercise.exercise);
    });
  });
  
  // Use blue color only for active block, gray for others
  const phaseColor = isActive ? '#22d3ee' : '#6b7280';
  
  return (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: phaseColor }]} 
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <View style={styles.titleRow}>
            <Text style={styles.blockName}>{block.block_name}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '20' }]}>
            <Text style={[styles.phaseText, { color: phaseColor }]}>
              {block.weeks.includes('-') ? 'Weeks' : 'Week'} {block.weeks}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color={isActive ? "#22d3ee" : "#6b7280"} />
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color="#71717a" />
            <Text style={styles.statText}>{dayCount} {dayCount === 1 ? 'day' : 'days'}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="barbell-outline" size={16} color="#71717a" />
            <Text style={styles.statText}>{Array.from(exercises).length} exercises</Text>
          </View>
        </View>
        
        {block.structure && (
          <View style={styles.exercisePreview}>
            <Text style={styles.previewLabel}>Training Split:</Text>
            <Text style={styles.previewText}>
              {block.structure}
            </Text>
          </View>
        )}

        {isActive && weekProgress && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                Week {weekProgress.current} of {weekProgress.total}
              </Text>
              <Text style={[
                styles.progressStatus,
                { 
                  color: weekProgress.isComplete 
                    ? '#f59e0b' 
                    : weekProgress.remaining <= 1 
                      ? '#fbbf24' 
                      : '#22d3ee' 
                }
              ]}>
                {weekProgress.isComplete 
                  ? 'Ready to advance' 
                  : weekProgress.remaining === 1 
                    ? 'Final week' 
                    : `${weekProgress.remaining} weeks left`
                }
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${Math.min((weekProgress.current / weekProgress.total) * 100, 100)}%`,
                    backgroundColor: weekProgress.isComplete ? '#f59e0b' : '#22d3ee'
                  }
                ]} 
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function BlocksScreen() {
  const navigation = useNavigation<BlocksScreenNavigationProp>();
  const route = useRoute<BlocksScreenRouteProp>();
  const { routine } = route.params;
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0); // Default to first block
  const [currentWeek, setCurrentWeek] = useState<number>(1); // Current week within active block
  const [blockStartDate, setBlockStartDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<{ block: Block; index: number } | null>(null);
  
  const totalWeeks = calculateTotalWeeks(routine.data.blocks);

  useEffect(() => {
    loadActiveBlock();
    loadWeekProgress();
  }, []);

  useEffect(() => {
    // Check if current block is complete and suggest advancement
    if (activeBlockIndex !== -1 && blockStartDate) {
      const progress = getWeekProgress(activeBlockIndex);
      if (progress.isComplete && activeBlockIndex < routine.data.blocks.length - 1) {
        // Show advancement suggestion after a short delay
        setTimeout(() => {
          showAdvancementSuggestion();
        }, 1000);
      }
    }
  }, [activeBlockIndex, blockStartDate]);

  const showAdvancementSuggestion = () => {
    const currentBlock = routine.data.blocks[activeBlockIndex];
    const nextBlock = routine.data.blocks[activeBlockIndex + 1];
    
    if (nextBlock) {
      Alert.alert(
        "Block Complete! 🎉",
        `You've completed "${currentBlock.block_name}"!\n\nReady to advance to "${nextBlock.block_name}"?`,
        [
          { text: "Stay Here", style: "cancel" },
          { 
            text: "Advance", 
            onPress: () => saveActiveBlock(activeBlockIndex + 1),
            style: "default"
          }
        ]
      );
    }
  };

  const loadActiveBlock = async () => {
    try {
      const activeBlock = await AsyncStorage.getItem(`activeBlock_${routine.id}`);
      if (activeBlock !== null) {
        setActiveBlockIndex(parseInt(activeBlock));
      }
    } catch (error) {
      console.error('Failed to load active block:', error);
    }
  };

  const loadWeekProgress = async () => {
    try {
      const weekData = await AsyncStorage.getItem(`weekProgress_${routine.id}`);
      if (weekData) {
        const { currentWeek, startDate } = JSON.parse(weekData);
        setCurrentWeek(currentWeek);
        setBlockStartDate(startDate);
      } else {
        // Initialize with current date if no progress exists
        const today = new Date().toISOString();
        setBlockStartDate(today);
        await saveWeekProgress(1, today);
      }
    } catch (error) {
      console.error('Failed to load week progress:', error);
    }
  };

  const saveWeekProgress = async (week: number, startDate: string) => {
    try {
      const weekData = { currentWeek: week, startDate };
      await AsyncStorage.setItem(`weekProgress_${routine.id}`, JSON.stringify(weekData));
      setCurrentWeek(week);
      setBlockStartDate(startDate);
    } catch (error) {
      console.error('Failed to save week progress:', error);
    }
  };

  const saveActiveBlock = async (blockIndex: number) => {
    try {
      await AsyncStorage.setItem(`activeBlock_${routine.id}`, blockIndex.toString());
      setActiveBlockIndex(blockIndex);
      
      // Reset week progress when switching blocks
      const today = new Date().toISOString();
      await saveWeekProgress(1, today);
    } catch (error) {
      console.error('Failed to save active block:', error);
    }
  };

  // Helper functions for week calculations
  const getBlockWeekCount = (weeksString: string): number => {
    if (weeksString.includes('-')) {
      const [start, end] = weeksString.split('-').map(Number);
      return end - start + 1;
    }
    return 1;
  };

  const getWeekProgress = (blockIndex: number) => {
    if (blockIndex !== activeBlockIndex || !blockStartDate) {
      return { current: 1, total: 1, remaining: 0, isComplete: false, isOverdue: false };
    }

    const block = routine.data.blocks[blockIndex];
    const totalWeeks = getBlockWeekCount(block.weeks);
    const startDate = new Date(blockStartDate);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksSinceStart = Math.floor(daysSinceStart / 7) + 1;
    
    const currentWeekInBlock = Math.min(weeksSinceStart, totalWeeks + 1);
    const remaining = Math.max(0, totalWeeks - currentWeekInBlock + 1);
    const isComplete = currentWeekInBlock > totalWeeks;
    const isOverdue = currentWeekInBlock > totalWeeks;

    return {
      current: currentWeekInBlock,
      total: totalWeeks,
      remaining,
      isComplete,
      isOverdue
    };
  };

  function calculateTotalWeeks(blocks: Block[]): number {
    let total = 0;
    blocks.forEach(block => {
      if (block.weeks.includes('-')) {
        const [start, end] = block.weeks.split('-').map(Number);
        total += (end - start + 1);
      } else {
        total += 1;
      }
    });
    return total;
  }

  const handleBlockPress = (block: Block) => {
    navigation.navigate('Days' as any, { 
      block, 
      routineName: routine.name 
    });
  };

  const handleBlockLongPress = (block: Block, index: number) => {
    if (index === activeBlockIndex) return; // Already active
    
    setSelectedBlock({ block, index });
    setShowModal(true);
  };

  const handleSetActive = () => {
    if (selectedBlock) {
      saveActiveBlock(selectedBlock.index);
    }
    setShowModal(false);
    setSelectedBlock(null);
  };

  const handleCancel = () => {
    setShowModal(false);
    setSelectedBlock(null);
  };

  const handleBack = () => {
    navigation.goBack();
  };

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
          <Text style={styles.title} numberOfLines={1}>{routine.name}</Text>
          <Text style={styles.subtitle}>
            {totalWeeks} {totalWeeks === 1 ? 'week' : 'weeks'} • {routine.data.blocks.length} blocks
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <FlatList
        data={routine.data.blocks}
        keyExtractor={(item, index) => `${item.block_name}-${index}`}
        renderItem={({ item, index }) => (
          <BlockCard
            block={item}
            onPress={() => handleBlockPress(item)}
            onLongPress={() => handleBlockLongPress(item, index)}
            isActive={index === activeBlockIndex}
            weekProgress={getWeekProgress(index)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#22d3ee" />
              <Text style={styles.modalTitle}>Set Active Block</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Set <Text style={styles.blockNameHighlight}>"{selectedBlock?.block.block_name}"</Text> as your active training block?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSetActive}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>Set Active</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#71717a',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    borderLeftWidth: 4,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 24,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: '#22d3ee',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  exercisePreview: {
    backgroundColor: '#0a0a0b',
    borderRadius: 8,
    padding: 12,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  progressSection: {
    backgroundColor: '#0a0a0b',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressStatus: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#27272a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  blockNameHighlight: {
    color: '#22d3ee',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#27272a',
  },
  confirmButton: {
    backgroundColor: '#22d3ee',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
});