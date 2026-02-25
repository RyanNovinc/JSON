import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { Program, ProgramStorage, MesocyclePhase } from '../data/programStorage';
import { WorkoutStorage } from '../utils/storage';

type BlocksScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Blocks'>;
type BlocksScreenRouteProp = RouteProp<RootStackParamList, 'Blocks'>;

interface Block {
  block_name: string;
  weeks: string;
  structure?: string;
  days: any[];
}

interface MesocycleCard {
  mesocycleNumber: number;
  phase?: MesocyclePhase;
  blocksInMesocycle: Block[];
  completedBlocks: number;
  totalBlocks: number;
  isCompleted: boolean;
  isActive: boolean;
}

interface BlockCardProps {
  block: Block;
  onPress: () => void;
  themeColor: string;
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

interface MesocycleCardProps {
  mesocycle: MesocycleCard;
  onPress: () => void;
  themeColor: string;
}

function MesocycleCard({ mesocycle, onPress, themeColor }: MesocycleCardProps) {
  const progressPercentage = mesocycle.totalBlocks > 0 
    ? (mesocycle.completedBlocks / mesocycle.totalBlocks) * 100 
    : 0;

  // Use theme color only for active mesocycle, gray for others
  const phaseColor = mesocycle.isActive ? themeColor : '#6b7280';
  
  const title = `Mesocycle ${mesocycle.mesocycleNumber}`;
  const subtitle = mesocycle.phase?.phaseName || 'Training Phase';

  return (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: phaseColor }]} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.blockName}>{title}</Text>
          <Text style={styles.mesocyclePhaseName}>{subtitle}</Text>
          
          {mesocycle.phase && (
            <View style={[styles.phaseBadge, { backgroundColor: phaseColor + '20' }]}>
              <Text style={[styles.phaseText, { color: phaseColor }]}>
                {mesocycle.phase.repFocus} • {mesocycle.phase.weeks} weeks
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerRight}>
          {mesocycle.isActive ? (
            <View style={[styles.activeBadge, { backgroundColor: themeColor }]}>
              <Text style={styles.activeBadgeText}>ACTIVE</Text>
            </View>
          ) : mesocycle.isCompleted ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              <Text style={styles.completedBadgeText}>COMPLETE</Text>
            </View>
          ) : null}
          <Ionicons name="chevron-forward" size={24} color={phaseColor} />
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="apps-outline" size={16} color="#71717a" />
            <Text style={styles.statText}>
              {mesocycle.totalBlocks} {mesocycle.totalBlocks === 1 ? 'block' : 'blocks'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#71717a" />
            <Text style={styles.statText}>
              {mesocycle.completedBlocks}/{mesocycle.totalBlocks} completed
            </Text>
          </View>
        </View>
        
        {mesocycle.phase && (
          <View style={styles.exercisePreview}>
            <Text style={styles.previewLabel}>Phase Emphasis:</Text>
            <Text style={styles.previewText}>
              {mesocycle.phase.emphasis}
            </Text>
          </View>
        )}

        {mesocycle.totalBlocks > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                Progress: {Math.round(progressPercentage)}%
              </Text>
              <Text style={[
                styles.progressStatus,
                { 
                  color: mesocycle.isCompleted 
                    ? '#22c55e' 
                    : mesocycle.isActive 
                      ? themeColor 
                      : '#71717a'
                }
              ]}>
                {mesocycle.isCompleted 
                  ? 'Complete' 
                  : mesocycle.isActive 
                    ? 'In Progress'
                    : 'Upcoming'
                }
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[styles.progressBar, { 
                  width: `${progressPercentage}%`,
                  backgroundColor: mesocycle.isCompleted ? '#22c55e' : phaseColor
                }]} 
              />
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function BlockCard({ block, onPress, onLongPress, isActive, weekProgress, themeColor }: BlockCardProps) {
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

export default function BlocksScreen() {
  const navigation = useNavigation<BlocksScreenNavigationProp>();
  const route = useRoute<BlocksScreenRouteProp>();
  const { routine, initialBlock, initialWeek } = route.params;
  const { themeColor } = useTheme();
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0); // Default to first block
  const [currentWeek, setCurrentWeek] = useState<number>(1); // Current week within active block
  const [blockStartDate, setBlockStartDate] = useState<string | null>(null);
  const [completionBasedWeek, setCompletionBasedWeek] = useState<number>(1);
  const [completionStatus, setCompletionStatus] = useState<{[blockName: string]: boolean}>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<{ block: Block; index: number } | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [mesocycleCards, setMesocycleCards] = useState<MesocycleCard[]>([]);
  
  const totalWeeks = calculateTotalWeeks(routine.data.blocks);
  const hasMesocycles = program && program.totalMesocycles > 1;

  useEffect(() => {
    loadActiveBlock();
    loadWeekProgress();
    loadProgramData();
  }, []);

  useEffect(() => {
    if (activeBlockIndex !== -1) {
      calculateCompletionBasedWeek();
      checkAllBlocksCompletion();
    }
  }, [activeBlockIndex, routine]);

  // Recalculate week progress when screen comes into focus (handles bookmark changes)
  useFocusEffect(
    React.useCallback(() => {
      if (activeBlockIndex !== -1) {
        calculateCompletionBasedWeek();
      }
      checkAllBlocksCompletion();
    }, [activeBlockIndex])
  );

  // Handle auto-navigation when coming from "Today" button
  useEffect(() => {
    if (initialBlock !== undefined && initialWeek !== undefined && routine.data.blocks[initialBlock]) {
      // Set the active block and navigate to today's workout
      setActiveBlockIndex(initialBlock);
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        const block = routine.data.blocks[initialBlock];
        navigation.navigate('Days' as any, { 
          block, 
          routineName: routine.name,
          initialWeek: initialWeek
        });
      }, 100);
    }
  }, [initialBlock, initialWeek, routine, navigation]);

  // Update mesocycle cards when program or completion status changes
  useEffect(() => {
    if (program && hasMesocycles) {
      updateMesocycleCards();
    }
  }, [program, completionStatus, routine.data.blocks]);


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

  const loadProgramData = async () => {
    if (routine.programId) {
      try {
        const programData = await ProgramStorage.getProgram(routine.programId);
        setProgram(programData);
      } catch (error) {
        console.error('Failed to load program data:', error);
      }
    }
  };

  const updateMesocycleCards = () => {
    if (!program || program.totalMesocycles <= 1) {
      return;
    }

    const cards: MesocycleCard[] = [];
    const currentMesocycle = program.currentMesocycle;
    const routineMesocycle = routine.mesocycleNumber;
    
    if (routineMesocycle) {
      // CASE 1: Routine has explicit mesocycle number (individual imports)
      const mesocycleNumber = routineMesocycle;
      const phase = program.mesocycleRoadmap.find(p => p.mesocycleNumber === mesocycleNumber);
      
      const mesocycleBlocks = routine.data.blocks;
      let isCompleted = false;
      let isActive = false;

      // Determine state based on mesocycle position
      if (mesocycleNumber === currentMesocycle) {
        isActive = true;
      } else if (mesocycleNumber < currentMesocycle) {
        isCompleted = true;
      }
      
      // Check if mesocycle is completed
      if (mesocycleBlocks.length > 0) {
        const completedBlocks = mesocycleBlocks.filter(block => 
          completionStatus[block.block_name] || false
        ).length;
        if (mesocycleNumber === currentMesocycle) {
          isCompleted = completedBlocks === mesocycleBlocks.length;
        }
      }
      
      // Calculate completion stats
      const completedBlocks = mesocycleBlocks.filter(block => 
        completionStatus[block.block_name] || false
      ).length;
      
      // Check if this mesocycle contains the active block
      const containsActiveBlock = mesocycleBlocks.some((block) => {
        const globalIndex = routine.data.blocks.findIndex(b => b.block_name === block.block_name);
        return globalIndex === activeBlockIndex;
      });
      
      cards.push({
        mesocycleNumber,
        phase,
        blocksInMesocycle: mesocycleBlocks,
        completedBlocks,
        totalBlocks: mesocycleBlocks.length,
        isCompleted,
        isActive: isActive || containsActiveBlock
      });
    } else {
      // CASE 2: Full program import - distribute blocks across mesocycles
      const totalBlocks = routine.data.blocks.length;
      const blocksPerMesocycle = Math.ceil(totalBlocks / program.totalMesocycles);
      
      for (let i = 0; i < program.totalMesocycles; i++) {
        const mesocycleNumber = i + 1;
        const phase = program.mesocycleRoadmap.find(p => p.mesocycleNumber === mesocycleNumber);
        
        // Distribute blocks evenly across mesocycles
        const startIdx = i * blocksPerMesocycle;
        const endIdx = Math.min(startIdx + blocksPerMesocycle, totalBlocks);
        const originalBlocks = routine.data.blocks.slice(startIdx, endIdx);
        
        if (originalBlocks.length === 0) continue; // Skip empty mesocycles
        
        // Calculate absolute week numbers for this mesocycle
        let currentWeek = 1;
        for (let j = 0; j < startIdx; j++) {
          const blockWeeks = routine.data.blocks[j].weeks;
          const weeks = blockWeeks.includes('-') 
            ? parseInt(blockWeeks.split('-')[1]) - parseInt(blockWeeks.split('-')[0]) + 1
            : 1;
          currentWeek += weeks;
        }
        
        // Adjust week numbers for blocks in this mesocycle
        const mesocycleBlocks = originalBlocks.map(block => {
          const blockWeeks = block.weeks.includes('-') 
            ? parseInt(block.weeks.split('-')[1]) - parseInt(block.weeks.split('-')[0]) + 1
            : 1;
          
          const adjustedWeeks = blockWeeks === 1 
            ? currentWeek.toString()
            : `${currentWeek}-${currentWeek + blockWeeks - 1}`;
          
          currentWeek += blockWeeks;
          
          return {
            ...block,
            weeks: adjustedWeeks
          };
        });
        
        let isCompleted = false;
        let isActive = false;

        // Determine state based on mesocycle position
        if (mesocycleNumber === currentMesocycle) {
          isActive = true;
        } else if (mesocycleNumber < currentMesocycle) {
          isCompleted = true;
        }
        
        // Check if mesocycle is completed
        const completedBlocks = mesocycleBlocks.filter(block => 
          completionStatus[block.block_name] || false
        ).length;
        
        if (mesocycleNumber === currentMesocycle) {
          isCompleted = completedBlocks === mesocycleBlocks.length;
        }
        
        // Check if this mesocycle contains the active block
        const containsActiveBlock = mesocycleBlocks.some((block) => {
          const globalIndex = routine.data.blocks.findIndex(b => b.block_name === block.block_name);
          return globalIndex === activeBlockIndex;
        });
        
        cards.push({
          mesocycleNumber,
          phase,
          blocksInMesocycle: mesocycleBlocks,
          completedBlocks,
          totalBlocks: mesocycleBlocks.length,
          isCompleted,
          isActive: isActive || containsActiveBlock
        });
      }
    }
    
    setMesocycleCards(cards);
  };

  const handleMesocyclePress = (mesocycle: MesocycleCard) => {
    // Navigate to a dedicated screen showing blocks within this mesocycle
    navigation.navigate('MesocycleBlocks' as any, {
      mesocycle,
      routine,
      program
    });
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

  const calculateCompletionBasedWeek = async () => {
    if (activeBlockIndex === -1) return;
    
    const block = routine.data.blocks[activeBlockIndex];
    const totalWeeks = getBlockWeekCount(block.weeks);
    
    try {
      // Check if user has manually bookmarked a week (using same key as DaysScreen)
      const bookmarkKey = `bookmark_${block.block_name}`;
      const savedBookmark = await AsyncStorage.getItem(bookmarkKey);
      if (savedBookmark) {
        const { week, isBookmarked } = JSON.parse(savedBookmark);
        if (isBookmarked && week >= 1 && week <= totalWeeks) {
          // If bookmarked to final week, check if that week is completed
          if (week === totalWeeks) {
            const weekKey = `completed_${block.block_name}_week${week}`;
            const completed = await AsyncStorage.getItem(weekKey);
            
            if (completed) {
              const completedSet = new Set(JSON.parse(completed));
              const allDaysCompleted = block.days.every(day => 
                completedSet.has(`${day.day_name}_week${week}`)
              );
              
              if (allDaysCompleted) {
                setCompletionBasedWeek(totalWeeks + 1); // Mark as complete
                return;
              }
            }
          }
          
          setCompletionBasedWeek(week);
          return;
        }
      }
      
      // No bookmark found, calculate based on completed workouts
      for (let week = 1; week <= totalWeeks; week++) {
        const weekKey = `completed_${block.block_name}_week${week}`;
        const completed = await AsyncStorage.getItem(weekKey);
        
        if (!completed) {
          // No workouts completed in this week yet
          setCompletionBasedWeek(week);
          return;
        }
        
        const completedSet = new Set(JSON.parse(completed));
        
        // Check if all days in this week are completed
        const allDaysCompleted = block.days.every(day => 
          completedSet.has(`${day.day_name}_week${week}`)
        );
        
        if (!allDaysCompleted) {
          // This week is not fully completed
          setCompletionBasedWeek(week);
          return;
        }
      }
      
      // All weeks are completed, set to the last week + 1 (or cap at totalWeeks)
      setCompletionBasedWeek(totalWeeks + 1);
    } catch (error) {
      console.error('Failed to calculate completion-based week:', error);
      setCompletionBasedWeek(1);
    }
  };

  const checkAllWeeksCompleted = async (block: Block, totalWeeks: number) => {
    try {
      for (let week = 1; week <= totalWeeks; week++) {
        const weekKey = `completed_${block.block_name}_week${week}`;
        const completed = await AsyncStorage.getItem(weekKey);
        
        if (!completed) {
          return false; // Week has no completed workouts
        }
        
        const completedSet = new Set(JSON.parse(completed));
        
        // Check if all days in this week are completed
        const allDaysCompleted = block.days.every(day => 
          completedSet.has(`${day.day_name}_week${week}`)
        );
        
        if (!allDaysCompleted) {
          return false; // Week is not fully completed
        }
      }
      
      return true; // All weeks are completed
    } catch (error) {
      console.error('Error checking all weeks completed:', error);
      return false;
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
    const block = routine.data.blocks[blockIndex];
    const totalWeeks = getBlockWeekCount(block.weeks);
    
    if (blockIndex === activeBlockIndex) {
      // For active block, use completion-based week calculation
      const currentWeekInBlock = completionBasedWeek;
      const remaining = Math.max(0, totalWeeks - currentWeekInBlock + 1);
      const isComplete = currentWeekInBlock > totalWeeks;
      
      return {
        current: Math.min(currentWeekInBlock, totalWeeks),
        total: totalWeeks,
        remaining,
        isComplete,
        isOverdue: false
      };
    } else {
      // For non-active blocks, check if they're completed
      const isComplete = checkBlockCompletionSync(block, totalWeeks);
      
      return {
        current: isComplete ? totalWeeks : 1,
        total: totalWeeks,
        remaining: isComplete ? 0 : totalWeeks,
        isComplete,
        isOverdue: false
      };
    }
  };

  const checkBlockCompletionSync = (block: Block, totalWeeks: number) => {
    // This will be updated by the async function, but we need a sync version for rendering
    // We'll use state to track completion status for each block
    return completionStatus[block.block_name] || false;
  };

  const checkAllBlocksCompletion = async () => {
    const newCompletionStatus: {[blockName: string]: boolean} = {};
    
    for (const block of routine.data.blocks) {
      const totalWeeks = getBlockWeekCount(block.weeks);
      const isComplete = await checkAllWeeksCompleted(block, totalWeeks);
      newCompletionStatus[block.block_name] = isComplete;
    }
    
    setCompletionStatus(newCompletionStatus);
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
            {hasMesocycles 
              ? `${program?.totalMesocycles} mesocycles • ${totalWeeks} weeks`
              : `${totalWeeks} ${totalWeeks === 1 ? 'week' : 'weeks'} • ${routine.data.blocks.length} blocks`
            }
          </Text>
        </View>
      </View>

      {hasMesocycles ? (
        <FlatList
          data={mesocycleCards}
          keyExtractor={(item) => `mesocycle-${item.mesocycleNumber}`}
          renderItem={({ item }) => (
            <MesocycleCard
              mesocycle={item}
              onPress={() => handleMesocyclePress(item)}
              themeColor={themeColor}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
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
              themeColor={themeColor}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle-outline" size={32} color={themeColor} />
              <Text style={styles.modalTitle}>Set Active Block</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Set <Text style={[styles.blockNameHighlight, { color: themeColor }]}>"{selectedBlock?.block.block_name}"</Text> as your active training block?
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
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: themeColor }]}
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
  mesocyclePhaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a1a1aa',
    marginBottom: 8,
  },
});