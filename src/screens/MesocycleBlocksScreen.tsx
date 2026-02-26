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
  Platform,
  TextInput,
  Button,
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

const getTrainingSplit = async (block: Block): Promise<string> => {
  // Get all days including manual ones
  const allDays = await getAllBlockDays(block);
  
  if (allDays.length > 0) {
    // Extract day names and join them
    const dayNames = allDays.map(day => day.day_name || day.name || 'Unnamed Day');
    return dayNames.join(', ');
  }
  
  // For empty blocks, show a helpful message
  return 'No days added yet';
};

const getAllBlockDays = async (block: Block): Promise<any[]> => {
  try {
    // Start with original block days
    const originalDays = block.days || [];
    
    // Load manual days for this block
    const manualDaysKey = `manual_days_${block.block_name}`;
    const manualDaysData = await AsyncStorage.getItem(manualDaysKey);
    const manualDays = manualDaysData ? JSON.parse(manualDaysData) : [];
    
    // Combine original and manual days
    return [...originalDays, ...manualDays];
  } catch (error) {
    console.error('Error loading block days:', error);
    return block.days || [];
  }
};

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
  const [allDays, setAllDays] = useState<any[]>([]);
  const [trainingSplit, setTrainingSplit] = useState<string>('Loading...');
  
  useEffect(() => {
    const loadDaysData = async () => {
      const days = await getAllBlockDays(block);
      setAllDays(days);
      
      const split = await getTrainingSplit(block);
      setTrainingSplit(split);
    };
    
    loadDaysData();
  }, [block]);
  
  const dayCount = allDays.length;
  
  // Count unique exercises for stats
  const exercises = new Set<string>();
  allDays.forEach(day => {
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
        
        <View style={styles.exercisePreview}>
          <Text style={styles.previewLabel}>Training Split:</Text>
          <Text style={styles.previewText}>
            {trainingSplit}
          </Text>
        </View>

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
  const [showBlockMoreOptions, setShowBlockMoreOptions] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localBlocks, setLocalBlocks] = useState(mesocycle.blocksInMesocycle);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');

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
    const initializeScreen = async () => {
      await loadActiveBlock();
      const loadedBlocks = await reloadManualBlocks(); // Load manual blocks first
      await checkAllBlocksCompletion(loadedBlocks); // Then check completion status with loaded blocks
    };
    initializeScreen();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const reloadScreen = async () => {
        const loadedBlocks = await reloadManualBlocks(); // Reload manual blocks first
        await checkAllBlocksCompletion(loadedBlocks); // Then check completion status with loaded blocks
      };
      reloadScreen();
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

  const checkAllBlocksCompletion = async (blocksToCheck?: Block[]) => {
    // Use provided blocks or fallback to localBlocks
    const blocks = blocksToCheck || localBlocks;
    const newCompletionStatus: {[blockName: string]: boolean} = {};
    
    // Check completion for all blocks (original + manual)
    for (const block of blocks) {
      const totalWeeks = getBlockWeekCount(block.weeks);
      const isComplete = await checkAllWeeksCompleted(block, totalWeeks);
      newCompletionStatus[block.block_name] = isComplete;
    }
    
    setCompletionStatus(newCompletionStatus);
  };

  const getBlockWeekCount = (weeksString: string): number => {
    if (!weeksString) return 4; // Default to 4 weeks if undefined
    if (weeksString.includes('-')) {
      const [start, end] = weeksString.split('-').map(Number);
      return end - start + 1;
    }
    return 1;
  };

  const getStartingWeek = (weeksString: string): number => {
    if (!weeksString) return 1; // Default to week 1
    if (weeksString.includes('-')) {
      const [start] = weeksString.split('-').map(Number);
      return start;
    }
    return 1;
  };

  const createWeeksString = (startWeek: number, duration: number): string => {
    if (duration === 1) {
      return startWeek.toString();
    }
    const endWeek = startWeek + duration - 1;
    return `${startWeek}-${endWeek}`;
  };

  const checkAllWeeksCompleted = async (block: Block, totalWeeks: number) => {
    try {
      // Get all days including manual ones
      const allDays = await getAllBlockDays(block);
      
      for (let week = 1; week <= totalWeeks; week++) {
        const weekKey = `completed_${block.block_name}_week${week}`;
        const completed = await AsyncStorage.getItem(weekKey);
        
        if (!completed) {
          return false;
        }
        
        const completedArray = JSON.parse(completed);
        
        if (allDays.length === 0) {
          // For empty blocks, check for special completion marker
          if (!completedArray.includes('empty_block_completed')) {
            return false;
          }
        } else {
          // For blocks with days, check if all days are completed
          if (completedArray.length !== allDays.length) {
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking all weeks completed:', error);
      return false;
    }
  };

  const getWeekProgress = (localIndex: number) => {
    const block = localBlocks[localIndex];
    if (!block || !block.weeks) {
      return {
        current: 1,
        total: 4,
        remaining: 4,
        isComplete: false,
        isOverdue: false
      };
    }
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

  const handleBlockPress = async (block: Block) => {
    // Calculate current week based on completion status and bookmarks (same logic as "Today" button)
    let currentWeek = 1;
    const totalWeeks = block.weeks.includes('-') 
      ? parseInt(block.weeks.split('-')[1]) - parseInt(block.weeks.split('-')[0]) + 1 
      : 1;

    try {
      // Check for manually bookmarked week first
      const bookmarkKey = `bookmark_${block.block_name}`;
      const savedBookmark = await AsyncStorage.getItem(bookmarkKey);
      
      if (savedBookmark) {
        const { week, isBookmarked } = JSON.parse(savedBookmark);
        if (isBookmarked) {
          currentWeek = week;
        } else {
          // Find first incomplete week
          for (let week = 1; week <= totalWeeks; week++) {
            const weekKey = `completed_${block.block_name}_week${week}`;
            const completed = await AsyncStorage.getItem(weekKey);
            
            if (!completed) {
              currentWeek = week;
              break;
            }
            
            const completedArray = JSON.parse(completed);
            
            // Get all days including manual ones for this block
            const allDays = await getAllBlockDays(block);
            
            if (allDays.length === 0) {
              // For empty blocks, check for special completion marker
              if (!completedArray.includes('empty_block_completed')) {
                currentWeek = week;
                break;
              }
            } else {
              // For blocks with days, check if all days are completed
              const allDaysCompleted = allDays.every(day => 
                completedArray.includes(`${day.day_name}_week${week}`)
              );
              
              if (!allDaysCompleted) {
                currentWeek = week;
                break;
              }
            }
            
            // If we're on the last week and it's complete, stay on last week
            if (week === totalWeeks) {
              currentWeek = totalWeeks;
            }
          }
        }
      } else {
        // No bookmark, find first incomplete week
        for (let week = 1; week <= totalWeeks; week++) {
          const weekKey = `completed_${block.block_name}_week${week}`;
          const completed = await AsyncStorage.getItem(weekKey);
          
          if (!completed) {
            currentWeek = week;
            break;
          }
          
          const completedArray = JSON.parse(completed);
          
          // Get all days including manual ones for this block
          const allDays = await getAllBlockDays(block);
          
          if (allDays.length === 0) {
            // For empty blocks, check for special completion marker
            if (!completedArray.includes('empty_block_completed')) {
              currentWeek = week;
              break;
            }
          } else {
            // For blocks with days, check if all days are completed
            const allDaysCompleted = allDays.every(day => 
              completedArray.includes(`${day.day_name}_week${week}`)
            );
            
            if (!allDaysCompleted) {
              currentWeek = week;
              break;
            }
          }
          
          // If we're on the last week and it's complete, stay on last week
          if (week === totalWeeks) {
            currentWeek = totalWeeks;
          }
        }
      }
    } catch (error) {
      console.log('Error calculating current week, using week 1');
      currentWeek = 1;
    }

    navigation.navigate('Days' as any, { 
      block, 
      routineName: routine.name,
      initialWeek: currentWeek  // Pass the calculated week
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
    setShowBlockMoreOptions(false);
  };

  const handleCancel = () => {
    setShowModal(false);
    setSelectedBlock(null);
    setShowBlockMoreOptions(false);
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
        setShowBlockMoreOptions(false);
      } catch (error) {
        console.error('Error sharing block:', error);
        setShowModal(false);
        setSelectedBlock(null);
        setShowBlockMoreOptions(false);
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
        setShowBlockMoreOptions(false);
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
                if (!selectedBlock) return;
                
                // Remove block from local state
                const updatedBlocks = localBlocks.filter((_, index) => index !== selectedBlock.index);
                setLocalBlocks(updatedBlocks);
                
                // If this was a manual block, also remove it from storage
                if (selectedBlock.index >= mesocycle.blocksInMesocycle.length) {
                  let mesocycleId;
                  if (mesocycle.isCustomMesocycle && mesocycle.customId) {
                    mesocycleId = mesocycle.customId;
                  } else {
                    mesocycleId = mesocycle.name || mesocycle.mesocycleName || mesocycle.id || 'default';
                  }
                  
                  const manualBlocksKey = `manual_blocks_${mesocycleId}`;
                  const manualBlocksData = await AsyncStorage.getItem(manualBlocksKey);
                  
                  if (manualBlocksData) {
                    const manualBlocks = JSON.parse(manualBlocksData);
                    const manualIndex = selectedBlock.index - mesocycle.blocksInMesocycle.length;
                    
                    if (manualIndex >= 0 && manualIndex < manualBlocks.length) {
                      // Remove the block from manual blocks array
                      const updatedManualBlocks = manualBlocks.filter((_, index) => index !== manualIndex);
                      await AsyncStorage.setItem(manualBlocksKey, JSON.stringify(updatedManualBlocks));
                    }
                  }
                }
                
                // Close modal
                setShowModal(false);
                setSelectedBlock(null);
                setShowBlockMoreOptions(false);
                
              } catch (error) {
                console.error('Error deleting block:', error);
                Alert.alert('Error', 'Failed to delete block. Please try again.');
              }
            }
          }
        ]
      );
    }
  };

  const handleToggleBlockCompletion = async () => {
    console.log('🔄 Block completion toggle started');
    if (selectedBlock) {
      console.log('🔄 Selected block:', selectedBlock.block.block_name);
      try {
        const block = selectedBlock.block;
        const totalWeeks = block.weeks.includes('-') 
          ? parseInt(block.weeks.split('-')[1]) - parseInt(block.weeks.split('-')[0]) + 1
          : 1;

        // Check if block is currently completed
        const allDays = await getAllBlockDays(block);
        console.log('📋 All days for block:', allDays);
        console.log('📋 Total weeks:', totalWeeks);
        let isCompleted = true;
        
        // Check completion based on whether block has days
        if (allDays.length === 0) {
          // For empty blocks, check for special completion marker
          for (let week = 1; week <= totalWeeks; week++) {
            const weekKey = `completed_${block.block_name}_week${week}`;
            const completedData = await AsyncStorage.getItem(weekKey);
            if (!completedData) {
              isCompleted = false;
              break;
            }
            const completedWorkouts = JSON.parse(completedData);
            if (!completedWorkouts.includes('empty_block_completed')) {
              isCompleted = false;
              break;
            }
          }
        } else {
          // For blocks with days, check normal completion
          for (let week = 1; week <= totalWeeks; week++) {
            const weekKey = `completed_${block.block_name}_week${week}`;
            const completedData = await AsyncStorage.getItem(weekKey);
            if (!completedData) {
              isCompleted = false;
              break;
            }
            const completedWorkouts = JSON.parse(completedData);
            if (completedWorkouts.length !== allDays.length) {
              isCompleted = false;
              break;
            }
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
          if (allDays.length === 0) {
            // For empty blocks, create a special completion marker
            for (let week = 1; week <= totalWeeks; week++) {
              const weekKey = `completed_${block.block_name}_week${week}`;
              await AsyncStorage.setItem(weekKey, JSON.stringify(['empty_block_completed']));
            }
          } else {
            // For blocks with days, mark all days as completed
            for (let week = 1; week <= totalWeeks; week++) {
              const completedWorkouts = allDays.map(day => `${day.day_name}_week${week}`);
              const weekKey = `completed_${block.block_name}_week${week}`;
              await AsyncStorage.setItem(weekKey, JSON.stringify(completedWorkouts));
            }
          }
        }

        // Reload completion status to reflect changes
        await checkAllBlocksCompletion();

        // Close modal without success popup
        setShowModal(false);
        setSelectedBlock(null);
        setShowBlockMoreOptions(false);
        
      } catch (error) {
        console.error('Error toggling block completion:', error);
        Alert.alert('Error', 'Failed to update block completion status. Please try again.');
      }
    }
  };

  const isBlockCompleted = (block: Block): boolean => {
    const isCompleted = completionStatus[block.block_name] || false;
    console.log(`📋 Block "${block.block_name}" completion status:`, isCompleted);
    return isCompleted;
  };

  const handleRenameBlock = () => {
    if (selectedBlock) {
      Alert.prompt(
        'Rename Block',
        `Enter a new name for "${selectedBlock.block.block_name}":`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Rename',
            onPress: async (newName) => {
              if (newName && newName.trim().length > 0) {
                try {
                  const oldName = selectedBlock.block.block_name;
                  const trimmedName = newName.trim();

                  // Update the block name in the mesocycle data
                  const updatedBlocks = mesocycle.blocksInMesocycle.map(block =>
                    block.block_name === oldName
                      ? { ...block, block_name: trimmedName }
                      : block
                  );
                  
                  // Update local state immediately
                  setLocalBlocks(updatedBlocks);

                  // Update the routine data if this is stored locally
                  const updatedRoutine = {
                    ...routine,
                    data: {
                      ...routine.data,
                      blocks: routine.data.blocks.map((block: any) =>
                        block.block_name === oldName
                          ? { ...block, block_name: trimmedName }
                          : block
                      )
                    }
                  };

                  // Save updated routine
                  await AsyncStorage.setItem(`routine_${routine.id}`, JSON.stringify(updatedRoutine));

                  // Update completion status keys - copy old completion data to new name
                  const keys = await AsyncStorage.getAllKeys();
                  const completionKeys = keys.filter(key => key.includes(`completed_${oldName}_`));
                  
                  for (const key of completionKeys) {
                    const newKey = key.replace(`completed_${oldName}_`, `completed_${trimmedName}_`);
                    const data = await AsyncStorage.getItem(key);
                    if (data) {
                      await AsyncStorage.setItem(newKey, data);
                      await AsyncStorage.removeItem(key);
                    }
                  }

                  // Close modal and force refresh
                  setShowModal(false);
                  setSelectedBlock(null);
                  setShowBlockMoreOptions(false);
                  
                  // Force component re-render to show updated name
                  setRefreshKey(prev => prev + 1);
                  
                } catch (error) {
                  console.error('Error renaming block:', error);
                  Alert.alert('Error', 'Failed to rename block. Please try again.');
                }
              } else {
                Alert.alert('Invalid Name', 'Please enter a valid name.');
              }
            }
          }
        ],
        'plain-text',
        selectedBlock.block.block_name
      );
    }
  };

  const handleAddBlock = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Add New Block',
        'Enter a name for this block:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create', 
            onPress: (text) => {
              if (text && text.trim()) {
                createNewBlock(text.trim());
              }
            }
          }
        ],
        'plain-text'
      );
    } else {
      setNewBlockName('');
      setShowAddBlockModal(true);
    }
  };

  const handleCreateBlock = () => {
    if (newBlockName.trim()) {
      createNewBlock(newBlockName.trim());
      setShowAddBlockModal(false);
      setNewBlockName('');
    }
  };

  const createNewBlock = async (blockName: string) => {
    let debugLog = '';
    
    try {
      debugLog += `🚀 STARTING BLOCK CREATION: "${blockName}"\n\n`;
      
      // Create new block object with complete structure to prevent render errors
      const newBlock: Block = {
        block_name: blockName,
        weeks: "1-4", // Default to 4 weeks
        days: [], // Start with empty days array
        structure: "Custom Block" // Add structure property
      };
      debugLog += `📝 Created block object: ${JSON.stringify(newBlock)}\n\n`;

      // Add the new block to the mesocycle
      const updatedBlocks = [...localBlocks, newBlock];
      debugLog += `📦 Updated local blocks - now has ${updatedBlocks.length} blocks\n`;
      debugLog += `📦 Block names: [${updatedBlocks.map(b => b.block_name).join(', ')}]\n\n`;

      // Update local state immediately for instant UI update
      setLocalBlocks(updatedBlocks);
      debugLog += `✅ Updated local state\n\n`;
      
      // Save manual blocks to separate storage to avoid corruption
      let mesocycleId;
      if (mesocycle.isCustomMesocycle && mesocycle.customId) {
        mesocycleId = mesocycle.customId;
      } else {
        mesocycleId = mesocycle.name || mesocycle.mesocycleName || mesocycle.id || 'default';
      }
      const manualBlocksKey = `manual_blocks_${mesocycleId}`;
      try {
        const existingManualBlocks = await AsyncStorage.getItem(manualBlocksKey);
        const manualBlocksArray = existingManualBlocks ? JSON.parse(existingManualBlocks) : [];
        
        // Add the new block to manual blocks
        const updatedManualBlocks = [...manualBlocksArray, newBlock];
        await AsyncStorage.setItem(manualBlocksKey, JSON.stringify(updatedManualBlocks));
        
        debugLog += `✅ SAVED: Manual block to separate storage\n`;
        debugLog += `✅ Manual blocks key: ${manualBlocksKey}\n`;
        debugLog += `✅ Mesocycle ID: ${mesocycleId}\n`;
        debugLog += `✅ Total manual blocks: ${updatedManualBlocks.length}\n`;
      } catch (error) {
        debugLog += `❌ FAILED to save manual block: ${error.message}\n`;
      }
      
      debugLog += `\n🎉 SUCCESS: Block "${blockName}" created and saved!`;
      
      console.log('=== BLOCK CREATION DEBUG LOG ===');
      console.log(debugLog);
      console.log('=== END DEBUG LOG ===');
      
      // Save to state for viewing
        
    } catch (error) {
      debugLog += `\n💥 ERROR: ${error}\n`;
      debugLog += `💥 Stack: ${error.stack}\n`;
      
      console.log('=== BLOCK CREATION ERROR LOG ===');
      console.log(debugLog);
      console.log('=== END ERROR LOG ===');
      
      Alert.alert(
        'Debug Log - Error',
        debugLog,
        [{ text: 'OK' }]
      );
    }
  };

  // Function to reload manual blocks from storage
  const reloadManualBlocks = async (): Promise<Block[]> => {
    try {
      // For custom mesocycles, use the unique customId if available
      let mesocycleId;
      if (mesocycle.isCustomMesocycle && mesocycle.customId) {
        mesocycleId = mesocycle.customId;
      } else {
        mesocycleId = mesocycle.name || mesocycle.mesocycleName || mesocycle.id || 'default';
      }
      
      const manualBlocksKey = `manual_blocks_${mesocycleId}`;
      const manualBlocksData = await AsyncStorage.getItem(manualBlocksKey);
      
      let mergedBlocks: Block[];
      
      if (manualBlocksData) {
        const manualBlocks = JSON.parse(manualBlocksData);
        
        // For custom mesocycles, blocksInMesocycle already contains the manual blocks
        if (mesocycle.isCustomMesocycle) {
          mergedBlocks = mesocycle.blocksInMesocycle;
        } else {
          // For regular mesocycles, merge original blocks with manual blocks
          mergedBlocks = [...mesocycle.blocksInMesocycle, ...manualBlocks];
        }
      } else {
        // For custom mesocycles with no manual blocks, just use the original (empty) structure
        mergedBlocks = mesocycle.blocksInMesocycle;
      }
      
      setLocalBlocks(mergedBlocks);
      return mergedBlocks;
    } catch (error) {
      console.error('Failed to reload manual blocks:', error);
      const fallbackBlocks = mesocycle.blocksInMesocycle;
      setLocalBlocks(fallbackBlocks);
      return fallbackBlocks;
    }
  };

  const handleWeekCountChange = async (delta: number) => {
    if (!selectedBlock) return;
    
    const currentDuration = getBlockWeekCount(selectedBlock.block.weeks);
    const currentStart = getStartingWeek(selectedBlock.block.weeks);
    const newDuration = Math.max(1, Math.min(12, currentDuration + delta)); // Limit between 1-12 weeks
    
    if (newDuration === currentDuration) return; // No change needed
    
    const newWeeksString = createWeeksString(currentStart, newDuration);
    const updatedBlock = { ...selectedBlock.block, weeks: newWeeksString };
    
    await updateBlockWeeks(updatedBlock);
  };

  const handleStartingWeekChange = async (delta: number) => {
    if (!selectedBlock) return;
    
    const currentDuration = getBlockWeekCount(selectedBlock.block.weeks);
    const currentStart = getStartingWeek(selectedBlock.block.weeks);
    const newStart = Math.max(1, Math.min(50, currentStart + delta)); // Limit between 1-50 weeks
    
    if (newStart === currentStart) return; // No change needed
    
    const newWeeksString = createWeeksString(newStart, currentDuration);
    const updatedBlock = { ...selectedBlock.block, weeks: newWeeksString };
    
    await updateBlockWeeks(updatedBlock);
  };

  const updateBlockWeeks = async (updatedBlock: Block) => {
    if (!selectedBlock) return;
    
    // Update in local state
    const updatedBlocks = localBlocks.map((block, index) => 
      index === selectedBlock.index ? updatedBlock : block
    );
    setLocalBlocks(updatedBlocks);
    
    // Update selected block for the modal
    setSelectedBlock({ ...selectedBlock, block: updatedBlock });
    
    // Save to storage if this is a manual block (index >= original blocks length)
    if (selectedBlock.index >= mesocycle.blocksInMesocycle.length) {
      try {
        let mesocycleId;
        if (mesocycle.isCustomMesocycle && mesocycle.customId) {
          mesocycleId = mesocycle.customId;
        } else {
          mesocycleId = mesocycle.name || mesocycle.mesocycleName || mesocycle.id || 'default';
        }
        const manualBlocksKey = `manual_blocks_${mesocycleId}`;
        const manualBlocksData = await AsyncStorage.getItem(manualBlocksKey);
        
        if (manualBlocksData) {
          const manualBlocks = JSON.parse(manualBlocksData);
          const manualIndex = selectedBlock.index - mesocycle.blocksInMesocycle.length;
          
          if (manualBlocks[manualIndex]) {
            manualBlocks[manualIndex] = updatedBlock;
            await AsyncStorage.setItem(manualBlocksKey, JSON.stringify(manualBlocks));
            console.log(`✅ Updated manual block weeks: ${selectedBlock.block.block_name} -> ${updatedBlock.weeks}`);
          }
        }
      } catch (error) {
        console.error('Failed to update manual block weeks:', error);
      }
    }
    
    // Force refresh to update UI
    setRefreshKey(prev => prev + 1);
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
          <Text style={styles.mesocycleLabel}>MESOCYCLE</Text>
          <Text style={styles.mesocycleName}>{phaseName}</Text>
        </View>
      </View>


      <FlatList
        key={refreshKey}
        data={localBlocks}
        keyExtractor={(item, index) => `${item.block_name}-${index}-${refreshKey}`}
        renderItem={({ item, index }) => (
          <BlockCard
            block={item}
            onPress={() => handleBlockPress(item)}
            onLongPress={() => handleBlockLongPress(item, index)}
            isActive={mesocycle.isActive && index === activeBlockIndex}
            weekProgress={getWeekProgress(index)}
            themeColor={themeColor}
            blockIndex={index}
          />
        )}
        ListFooterComponent={() => (
          <TouchableOpacity 
            style={[styles.addBlockButton, { borderColor: themeColor }]}
            onPress={() => handleAddBlock()}
          >
            <Ionicons name="add-circle-outline" size={24} color={themeColor} />
            <Text style={[styles.addBlockText, { color: themeColor }]}>Add Block</Text>
          </TouchableOpacity>
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
              {!showBlockMoreOptions ? (
                <>
                  {/* Primary Actions */}
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

                  {/* More Options Toggle - Primary View */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#27272a',
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onPress={() => setShowBlockMoreOptions(!showBlockMoreOptions)}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name="ellipsis-horizontal" 
                      size={16} 
                      color="#ffffff" 
                    />
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: '#ffffff',
                    }}>More Options</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Secondary Actions */}
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
                    onPress={handleRenameBlock}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#ffffff" />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#ffffff',
                    }}>Rename</Text>
                  </TouchableOpacity>

                  {/* Starting Week Editor */}
                  <View style={{
                    backgroundColor: '#27272a',
                    borderRadius: 8,
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Ionicons name="play-outline" size={20} color="#ffffff" />
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#ffffff',
                      }}>Start Week</Text>
                    </View>
                    
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#18181b',
                      borderRadius: 8,
                      paddingHorizontal: 4,
                    }}>
                      <TouchableOpacity
                        style={{
                          padding: 8,
                          paddingHorizontal: 12,
                        }}
                        onPress={() => handleStartingWeekChange(-1)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-back" size={18} color={themeColor} />
                      </TouchableOpacity>
                      
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#ffffff',
                        minWidth: 30,
                        textAlign: 'center',
                        paddingHorizontal: 8,
                      }}>
                        {selectedBlock ? getStartingWeek(selectedBlock.block.weeks) : 1}
                      </Text>
                      
                      <TouchableOpacity
                        style={{
                          padding: 8,
                          paddingHorizontal: 12,
                        }}
                        onPress={() => handleStartingWeekChange(1)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-forward" size={18} color={themeColor} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Duration Editor */}
                  <View style={{
                    backgroundColor: '#27272a',
                    borderRadius: 8,
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Ionicons name="calendar-outline" size={20} color="#ffffff" />
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#ffffff',
                      }}>Duration</Text>
                    </View>
                    
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#18181b',
                      borderRadius: 8,
                      paddingHorizontal: 4,
                    }}>
                      <TouchableOpacity
                        style={{
                          padding: 8,
                          paddingHorizontal: 12,
                        }}
                        onPress={() => handleWeekCountChange(-1)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-back" size={18} color={themeColor} />
                      </TouchableOpacity>
                      
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#ffffff',
                        minWidth: 50,
                        textAlign: 'center',
                        paddingHorizontal: 8,
                      }}>
                        {selectedBlock ? `${getBlockWeekCount(selectedBlock.block.weeks)} wks` : '4 wks'}
                      </Text>
                      
                      <TouchableOpacity
                        style={{
                          padding: 8,
                          paddingHorizontal: 12,
                        }}
                        onPress={() => handleWeekCountChange(1)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chevron-forward" size={18} color={themeColor} />
                      </TouchableOpacity>
                    </View>
                  </View>

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

                  {/* Back to Primary Options */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#27272a',
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onPress={() => setShowBlockMoreOptions(!showBlockMoreOptions)}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name="chevron-back" 
                      size={16} 
                      color="#ffffff" 
                    />
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: '#ffffff',
                    }}>Back</Text>
                  </TouchableOpacity>
                </>
              )}
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
              }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Block Modal - Android Only */}
      {Platform.OS === 'android' && (
        <Modal
          visible={showAddBlockModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddBlockModal(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.title}>Add New Block</Text>
              
              <TextInput
                style={styles.input}
                value={newBlockName}
                onChangeText={setNewBlockName}
                placeholder="Enter block name..."
                placeholderTextColor="#888"
                autoFocus={true}
                maxLength={30}
              />
              
              <View style={styles.buttonContainer}>
                <View style={styles.buttonWrapper}>
                  <Button
                    title="Cancel"
                    color="#666"
                    onPress={() => setShowAddBlockModal(false)}
                  />
                </View>
                <View style={styles.buttonWrapper}>
                  <Button
                    title="Create"
                    color={themeColor}
                    onPress={handleCreateBlock}
                    disabled={!newBlockName.trim()}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    paddingRight: 40, // Compensate for back button to center title
  },
  mesocycleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  mesocycleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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
  addBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: 'transparent',
    gap: 8,
  },
  addBlockText: {
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 40,
  },
  modal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#0a0a0b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  buttonWrapper: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
});