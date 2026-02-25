import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';

type MesocycleBlocksScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MesocycleBlocks'>;
type MesocycleBlocksScreenRouteProp = RouteProp<RootStackParamList, 'MesocycleBlocks'>;

interface Block {
  block_name: string;
  weeks: string;
  structure?: string;
  days: any[];
}

interface BlockCardProps {
  block: Block;
  onPress: () => void;
  themeColor: string;
  onLongPress: () => void;
  isActive?: boolean;
  blockIndex: number;
  weekProgress?: {
    current: number;
    total: number;
    remaining: number;
    isComplete: boolean;
    isOverdue: boolean;
  };
}

function BlockCard({ block, onPress, onLongPress, isActive, weekProgress, themeColor, blockIndex }: BlockCardProps) {
  const dayCount = block.days.length;
  
  // Count unique exercises for stats
  const exercises = new Set<string>();
  block.days.forEach(day => {
    day.exercises?.forEach((exercise: any) => {
      exercises.add(exercise.exercise);
    });
  });
  
  // Use theme color only for active block, gray for others
  const phaseColor = isActive ? themeColor : '#6b7280';
  
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
          <Text style={styles.blockName}>{block.block_name}</Text>
          <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '20' }]}>
            <Text style={[styles.phaseText, { color: phaseColor }]}>
              {block.weeks.includes('-') ? 'Weeks' : 'Week'} {block.weeks}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {isActive ? (
            <View style={[styles.activeBadge, { backgroundColor: themeColor }]}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          ) : weekProgress?.isComplete ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={styles.completedBadgeText}>COMPLETE</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={24} color={isActive ? themeColor : "#6b7280"} />
        </View>
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
            {weekProgress.isComplete ? (
              <View style={styles.completedSection}>
                <View style={styles.completedHeader}>
                  <Ionicons name="trophy" size={20} color={themeColor} />
                  <Text style={[styles.completedTitle, { color: themeColor }]}>Block Complete!</Text>
                </View>
                <Text style={styles.completedSubtext}>
                  All {weekProgress.total} weeks completed
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    Week {weekProgress.current} of {weekProgress.total}
                  </Text>
                  <Text style={[
                    styles.progressStatus,
                    { 
                      color: weekProgress.remaining <= 1 
                        ? '#fbbf24' 
                        : themeColor 
                    }
                  ]}>
                    {weekProgress.remaining === 1 
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
                        backgroundColor: themeColor
                      }
                    ]} 
                  />
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MesocycleBlocksScreen() {
  const navigation = useNavigation<MesocycleBlocksScreenNavigationProp>();
  const route = useRoute<MesocycleBlocksScreenRouteProp>();
  const { mesocycle, routine, program } = route.params;
  const { themeColor } = useTheme();
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0);
  const [completionStatus, setCompletionStatus] = useState<{[blockName: string]: boolean}>({});
  const [completionBasedWeek, setCompletionBasedWeek] = useState<number>(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<{ block: Block; index: number } | null>(null);

  // Find the global index of the first block in this mesocycle
  const getGlobalBlockIndex = (localIndex: number): number => {
    // Find where this mesocycle's blocks start in the full routine
    const allBlocks = routine.data.blocks;
    const firstBlockName = mesocycle.blocksInMesocycle[0]?.block_name;
    if (!firstBlockName) return 0;
    
    const globalStartIndex = allBlocks.findIndex((block: any) => block.block_name === firstBlockName);
    return globalStartIndex + localIndex;
  };

  useEffect(() => {
    loadActiveBlock();
    checkAllBlocksCompletion();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      checkAllBlocksCompletion();
    }, [])
  );

  const loadActiveBlock = async () => {
    try {
      const activeBlock = await AsyncStorage.getItem(`activeBlock_${routine.id}`);
      if (activeBlock !== null) {
        const globalActiveIndex = parseInt(activeBlock);
        // Convert global index to local mesocycle index
        const firstBlockGlobalIndex = getGlobalBlockIndex(0);
        const localActiveIndex = globalActiveIndex - firstBlockGlobalIndex;
        
        if (localActiveIndex >= 0 && localActiveIndex < mesocycle.blocksInMesocycle.length) {
          setActiveBlockIndex(localActiveIndex);
        }
      }
    } catch (error) {
      console.error('Failed to load active block:', error);
    }
  };

  const saveActiveBlock = async (localIndex: number) => {
    try {
      const globalIndex = getGlobalBlockIndex(localIndex);
      await AsyncStorage.setItem(`activeBlock_${routine.id}`, globalIndex.toString());
      setActiveBlockIndex(localIndex);
    } catch (error) {
      console.error('Failed to save active block:', error);
    }
  };

  const checkAllBlocksCompletion = async () => {
    const newCompletionStatus: {[blockName: string]: boolean} = {};
    
    for (const block of mesocycle.blocksInMesocycle) {
      const totalWeeks = getBlockWeekCount(block.weeks);
      const isComplete = await checkAllWeeksCompleted(block, totalWeeks);
      newCompletionStatus[block.block_name] = isComplete;
    }
    
    setCompletionStatus(newCompletionStatus);
  };

  const getBlockWeekCount = (weeksString: string): number => {
    if (weeksString.includes('-')) {
      const [start, end] = weeksString.split('-').map(Number);
      return end - start + 1;
    }
    return 1;
  };

  const checkAllWeeksCompleted = async (block: Block, totalWeeks: number) => {
    try {
      for (let week = 1; week <= totalWeeks; week++) {
        const weekKey = `completed_${block.block_name}_week${week}`;
        const completed = await AsyncStorage.getItem(weekKey);
        
        if (!completed) {
          return false;
        }
        
        const completedSet = new Set(JSON.parse(completed));
        const allDaysCompleted = block.days.every(day => 
          completedSet.has(`${day.day_name}_week${week}`)
        );
        
        if (!allDaysCompleted) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking all weeks completed:', error);
      return false;
    }
  };

  const getWeekProgress = (localIndex: number) => {
    const block = mesocycle.blocksInMesocycle[localIndex];
    const totalWeeks = getBlockWeekCount(block.weeks);
    
    if (localIndex === activeBlockIndex) {
      const isComplete = completionStatus[block.block_name] || false;
      return {
        current: isComplete ? totalWeeks : 1,
        total: totalWeeks,
        remaining: isComplete ? 0 : totalWeeks,
        isComplete,
        isOverdue: false
      };
    } else {
      const isComplete = completionStatus[block.block_name] || false;
      return {
        current: isComplete ? totalWeeks : 1,
        total: totalWeeks,
        remaining: isComplete ? 0 : totalWeeks,
        isComplete,
        isOverdue: false
      };
    }
  };

  const handleBlockPress = (block: Block) => {
    navigation.navigate('Days' as any, { 
      block, 
      routineName: routine.name 
    });
  };

  const handleBlockLongPress = (block: Block, localIndex: number) => {
    setSelectedBlock({ block, index: localIndex });
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

  const handleShareBlock = async () => {
    if (selectedBlock) {
      const blockData = {
        blockName: selectedBlock.block.block_name,
        weeks: selectedBlock.block.weeks,
        days: selectedBlock.block.days,
        mesocycle: mesocycle.mesocycleNumber,
        program: program.name || 'Mesocycle Program',
        exportedAt: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(blockData, null, 2);
      
      try {
        await Share.share({
          message: jsonString,
          title: `${selectedBlock.block.block_name} Block Data`,
        });
        setShowModal(false);
        setSelectedBlock(null);
      } catch (error) {
        console.error('Error sharing block:', error);
        setShowModal(false);
        setSelectedBlock(null);
      }
    }
  };

  const handleCopyBlock = async () => {
    if (selectedBlock) {
      const blockData = {
        blockName: selectedBlock.block.block_name,
        weeks: selectedBlock.block.weeks,
        days: selectedBlock.block.days,
        mesocycle: mesocycle.mesocycleNumber,
        program: program.name || 'Mesocycle Program',
        exportedAt: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(blockData, null, 2);
      
      try {
        await Clipboard.setStringAsync(jsonString);
        setShowModal(false);
        setSelectedBlock(null);
      } catch (error) {
        console.error('Error copying block:', error);
      }
    }
  };

  const handleDeleteBlock = () => {
    if (selectedBlock) {
      Alert.alert(
        'Delete Block',
        `Are you sure you want to delete "${selectedBlock.block.block_name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              try {
                // TODO: Add actual delete functionality
                // For now just show a message
                Alert.alert('Feature Coming Soon', 'Block deletion will be available in a future update.');
                setShowModal(false);
                setSelectedBlock(null);
              } catch (error) {
                console.error('Error deleting block:', error);
              }
            }
          }
        ]
      );
    }
  };

  const handleToggleBlockCompletion = async () => {
    if (selectedBlock) {
      try {
        const block = selectedBlock.block;
        const totalWeeks = block.weeks.includes('-') 
          ? parseInt(block.weeks.split('-')[1]) - parseInt(block.weeks.split('-')[0]) + 1
          : 1;

        // Check if block is currently completed
        let isCompleted = true;
        for (let week = 1; week <= totalWeeks; week++) {
          const weekKey = `completed_${block.block_name}_week${week}`;
          const completedData = await AsyncStorage.getItem(weekKey);
          if (!completedData) {
            isCompleted = false;
            break;
          }
          const completedWorkouts = JSON.parse(completedData);
          if (completedWorkouts.length !== block.days.length) {
            isCompleted = false;
            break;
          }
        }

        if (isCompleted) {
          // Uncomplete the block - remove all completion data
          for (let week = 1; week <= totalWeeks; week++) {
            const weekKey = `completed_${block.block_name}_week${week}`;
            await AsyncStorage.removeItem(weekKey);
          }
        } else {
          // Complete the block - mark all days as completed
          for (let week = 1; week <= totalWeeks; week++) {
            const completedWorkouts = block.days.map(day => `${day.day_name}_week${week}`);
            const weekKey = `completed_${block.block_name}_week${week}`;
            await AsyncStorage.setItem(weekKey, JSON.stringify(completedWorkouts));
          }
        }

        // Reload completion status to reflect changes
        await checkAllBlocksCompletion();

        // Close modal without success popup
        setShowModal(false);
        setSelectedBlock(null);
        
      } catch (error) {
        console.error('Error toggling block completion:', error);
        Alert.alert('Error', 'Failed to update block completion status. Please try again.');
      }
    }
  };

  const isBlockCompleted = (block: Block): boolean => {
    return completionStatus[block.block_name] || false;
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const phaseName = mesocycle.phase?.phaseName || 'Training Phase';
  const repFocus = mesocycle.phase?.repFocus || '';
  const emphasis = mesocycle.phase?.emphasis || '';

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
          <Text style={styles.title} numberOfLines={1}>
            Mesocycle {mesocycle.mesocycleNumber}
          </Text>
          <Text style={styles.subtitle}>
            {phaseName} • {mesocycle.blocksInMesocycle.length} blocks
          </Text>
        </View>
        <View style={styles.backButton} />
      </View>


      <FlatList
        data={mesocycle.blocksInMesocycle}
        keyExtractor={(item, index) => `${item.block_name}-${index}`}
        renderItem={({ item, index }) => (
          <BlockCard
            block={item}
            onPress={() => handleBlockPress(item)}
            onLongPress={() => handleBlockLongPress(item, index)}
            isActive={index === activeBlockIndex}
            weekProgress={getWeekProgress(index)}
            themeColor={themeColor}
            blockIndex={index}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Block Actions Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}>
          <View style={{
            backgroundColor: '#18181b',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#27272a',
            padding: 24,
            width: '100%',
            maxWidth: 360,
            alignItems: 'center',
          }}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Ionicons name="options-outline" size={32} color={themeColor} />
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#ffffff',
                marginTop: 12,
                textAlign: 'center',
              }}>{selectedBlock?.block.block_name}</Text>
              <Text style={{
                fontSize: 14,
                color: '#71717a',
                textAlign: 'center',
                marginTop: 4,
              }}>Weeks {selectedBlock?.block.weeks}</Text>
            </View>
            
            <View style={{ width: '100%', gap: 12 }}>
              {selectedBlock?.index !== activeBlockIndex && (
                <TouchableOpacity
                  style={{
                    backgroundColor: themeColor,
                    borderRadius: 8,
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                  onPress={handleSetActive}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#0a0a0b" />
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#0a0a0b',
                  }}>Set as Active</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{
                  backgroundColor: selectedBlock && isBlockCompleted(selectedBlock.block) ? '#ef4444' : '#22c55e',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}
                onPress={handleToggleBlockCompletion}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={selectedBlock && isBlockCompleted(selectedBlock.block) ? "close-circle" : "checkmark-done"} 
                  size={20} 
                  color="#0a0a0b" 
                />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#0a0a0b',
                }}>{selectedBlock && isBlockCompleted(selectedBlock.block) ? 'Mark Incomplete' : 'Mark Complete'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  backgroundColor: '#27272a',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}
                onPress={handleCopyBlock}
                activeOpacity={0.8}
              >
                <Ionicons name="copy-outline" size={20} color="#ffffff" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#ffffff',
                }}>Copy JSON</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  backgroundColor: '#27272a',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}
                onPress={handleShareBlock}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={20} color="#ffffff" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#ffffff',
                }}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}
                onPress={handleDeleteBlock}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#ef4444',
                }}>Delete</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={{
                marginTop: 20,
                paddingVertical: 12,
                paddingHorizontal: 24,
              }}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '500',
                color: '#71717a',
              }}>Cancel</Text>
            </TouchableOpacity>
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
    paddingBottom: 16,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    flex: 1,
  },
  blockName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 24,
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#22c55e',
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
  completedSection: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  completedSubtext: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '500',
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
    // backgroundColor set inline
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