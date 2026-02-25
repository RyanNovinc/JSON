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
  onLongPress: () => void;
  themeColor: string;
}

function MesocycleCard({ mesocycle, onPress, onLongPress, themeColor }: MesocycleCardProps) {
  const progressPercentage = mesocycle.totalBlocks > 0 
    ? (mesocycle.completedBlocks / mesocycle.totalBlocks) * 100 
    : 0;

  // Use theme color only for active mesocycle, gray for others
  const phaseColor = mesocycle.isActive ? themeColor : '#6b7280';
  
  const title = mesocycle.phase?.phaseName || `Mesocycle ${mesocycle.mesocycleNumber}`;

  return (
    <TouchableOpacity 
      style={[styles.card, { borderLeftColor: phaseColor }]} 
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.blockName}>{title}</Text>
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
  const [showMesocycleModal, setShowMesocycleModal] = useState(false);
  const [selectedMesocycle, setSelectedMesocycle] = useState<MesocycleCard | null>(null);
  const [showMesocycleMoreOptions, setShowMesocycleMoreOptions] = useState(false);
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

  const updateMesocycleCards = async () => {
    if (!program || program.totalMesocycles <= 1) {
      return;
    }

    // Fix: If mesocycleRoadmap is empty, create default phase data
    if (!program.mesocycleRoadmap || program.mesocycleRoadmap.length === 0) {
      const defaultRoadmap = [];
      for (let i = 1; i <= program.totalMesocycles; i++) {
        defaultRoadmap.push({
          mesocycleNumber: i,
          phaseName: `Mesocycle ${i}`,
          repFocus: '8-12 reps',
          emphasis: 'Progressive training',
          weeks: 12,
          blocks: 3
        });
      }
      
      // Update the program with default roadmap
      await ProgramStorage.updateProgram(program.id, {
        mesocycleRoadmap: defaultRoadmap
      });
      
      // Update local state
      setProgram(prev => prev ? {...prev, mesocycleRoadmap: defaultRoadmap} : null);
      return; // Exit early, useEffect will trigger again with updated data
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
      }
      
      // Check if mesocycle is completed based on actual block completion
      if (mesocycleBlocks.length > 0) {
        const completedBlocks = mesocycleBlocks.filter(block => 
          completionStatus[block.block_name] || false
        ).length;
        isCompleted = completedBlocks === mesocycleBlocks.length;
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
        isActive: isActive // Only use program's currentMesocycle, not active block
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
        }
        
        // Check if mesocycle is completed based on actual block completion
        const completedBlocks = mesocycleBlocks.filter(block => 
          completionStatus[block.block_name] || false
        ).length;
        
        isCompleted = completedBlocks === mesocycleBlocks.length;
        
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
          isActive: isActive // Only use program's currentMesocycle, not active block
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

  const handleMesocycleLongPress = (mesocycle: MesocycleCard) => {
    setSelectedMesocycle(mesocycle);
    setShowMesocycleModal(true);
  };

  const handleSetActiveMesocycle = async () => {
    if (selectedMesocycle && program) {
      try {
        // Update the program's current mesocycle using updateProgram
        await ProgramStorage.updateProgram(program.id, { 
          currentMesocycle: selectedMesocycle.mesocycleNumber 
        });
        
        // Reload program data to reflect changes
        await loadProgramData();
        
        setShowMesocycleModal(false);
        setSelectedMesocycle(null);
        setShowMesocycleMoreOptions(false);
      } catch (error) {
        console.error('Failed to set active mesocycle:', error);
      }
    }
  };

  const handleShareMesocycle = async () => {
    if (selectedMesocycle) {
      const mesocycleData = {
        mesocycleNumber: selectedMesocycle.mesocycleNumber,
        phase: selectedMesocycle.phase,
        blocks: selectedMesocycle.blocksInMesocycle,
        program: program?.name || 'Mesocycle Program',
        exportedAt: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(mesocycleData, null, 2);
      
      try {
        await Share.share({
          message: jsonString,
          title: `Mesocycle ${selectedMesocycle.mesocycleNumber} Data`,
        });
        setShowMesocycleModal(false);
        setSelectedMesocycle(null);
        setShowMesocycleMoreOptions(false);
      } catch (error) {
        console.error('Error sharing mesocycle:', error);
        setShowMesocycleModal(false);
        setSelectedMesocycle(null);
        setShowMesocycleMoreOptions(false);
      }
    }
  };

  const handleCopyMesocycle = async () => {
    if (selectedMesocycle) {
      const mesocycleData = {
        mesocycleNumber: selectedMesocycle.mesocycleNumber,
        phase: selectedMesocycle.phase,
        blocks: selectedMesocycle.blocksInMesocycle,
        program: program?.name || 'Mesocycle Program',
        exportedAt: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(mesocycleData, null, 2);
      
      try {
        await Clipboard.setStringAsync(jsonString);
        setShowMesocycleModal(false);
        setSelectedMesocycle(null);
        setShowMesocycleMoreOptions(false);
      } catch (error) {
        console.error('Error copying mesocycle:', error);
      }
    }
  };

  const handleDeleteMesocycle = () => {
    if (selectedMesocycle) {
      Alert.alert(
        'Delete Mesocycle',
        `Are you sure you want to delete Mesocycle ${selectedMesocycle.mesocycleNumber}? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              try {
                // TODO: Add actual delete functionality
                // For now just show a message
                Alert.alert('Feature Coming Soon', 'Mesocycle deletion will be available in a future update.');
                setShowMesocycleModal(false);
                setSelectedMesocycle(null);
                setShowMesocycleMoreOptions(false);
              } catch (error) {
                console.error('Error deleting mesocycle:', error);
              }
            }
          }
        ]
      );
    }
  };

  const handleCancelMesocycle = () => {
    setShowMesocycleModal(false);
    setSelectedMesocycle(null);
    setShowMesocycleMoreOptions(false);
  };

  const handleRenameMesocycle = () => {
    if (selectedMesocycle) {
      Alert.prompt(
        'Rename Mesocycle',
        `Enter a new name for Mesocycle ${selectedMesocycle.mesocycleNumber}:`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Rename',
            onPress: async (newName) => {
              if (newName && newName.trim().length > 0) {
                try {
                  // Update the mesocycle name in program roadmap
                  if (program && selectedMesocycle.phase) {
                    const updatedRoadmap = program.mesocycleRoadmap.map(phase => 
                      phase.mesocycleNumber === selectedMesocycle.mesocycleNumber 
                        ? { ...phase, phaseName: newName.trim() }
                        : phase
                    );
                    
                    await ProgramStorage.updateProgram(program.id, {
                      mesocycleRoadmap: updatedRoadmap
                    });

                    // Reload program data to reflect changes and force refresh
                    const updatedProgram = await ProgramStorage.getProgram(program.id);
                    if (updatedProgram) {
                      // Force state change by creating new object reference
                      setProgram({...updatedProgram});
                    }
                  }

                  setShowMesocycleModal(false);
                  setSelectedMesocycle(null);
                  setShowMesocycleMoreOptions(false);
                } catch (error) {
                  console.error('Error renaming mesocycle:', error);
                  Alert.alert('Error', 'Failed to rename mesocycle. Please try again.');
                }
              } else {
                Alert.alert('Invalid Name', 'Please enter a valid name.');
              }
            }
          }
        ],
        'plain-text',
        selectedMesocycle.phase?.phaseName || `Mesocycle ${selectedMesocycle.mesocycleNumber}`
      );
    }
  };

  const handleToggleMesocycleCompletion = async () => {
    if (selectedMesocycle) {
      try {
        const blocksInMesocycle = selectedMesocycle.blocksInMesocycle;
        
        // Check if mesocycle is currently completed (all blocks completed)
        const isCurrentlyCompleted = selectedMesocycle.isCompleted;
        
        for (const block of blocksInMesocycle) {
          const totalWeeks = block.weeks.includes('-') 
            ? parseInt(block.weeks.split('-')[1]) - parseInt(block.weeks.split('-')[0]) + 1
            : 1;

          if (isCurrentlyCompleted) {
            // Uncomplete the mesocycle - remove all completion data for all blocks
            for (let week = 1; week <= totalWeeks; week++) {
              const weekKey = `completed_${block.block_name}_week${week}`;
              await AsyncStorage.removeItem(weekKey);
            }
          } else {
            // Complete the mesocycle - mark all days in all blocks as completed
            for (let week = 1; week <= totalWeeks; week++) {
              const completedWorkouts = block.days.map((day: any) => `${day.day_name}_week${week}`);
              const weekKey = `completed_${block.block_name}_week${week}`;
              await AsyncStorage.setItem(weekKey, JSON.stringify(completedWorkouts));
            }
          }
        }

        // Reload completion status to reflect changes
        await checkAllBlocksCompletion();

        // Close modal without success popup
        setShowMesocycleModal(false);
        setSelectedMesocycle(null);
        setShowMesocycleMoreOptions(false);
        
      } catch (error) {
        console.error('Error toggling mesocycle completion:', error);
        Alert.alert('Error', 'Failed to update mesocycle completion status. Please try again.');
      }
    }
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
              onLongPress={() => handleMesocycleLongPress(item)}
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
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}>
          <View style={{
            backgroundColor: '#18181b',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#27272a',
            padding: 24,
            width: '100%',
            maxWidth: 340,
            alignItems: 'center',
          }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="checkmark-circle-outline" size={32} color={themeColor} />
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#ffffff',
                marginTop: 12,
                textAlign: 'center',
              }}>Set Active Block</Text>
            </View>
            
            <Text style={{
              fontSize: 16,
              color: '#71717a',
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 24,
            }}>
              Set <Text style={{ fontWeight: '600', color: themeColor }}>"{selectedBlock?.block.block_name}"</Text> as your active training block?
            </Text>
            
            <View style={{
              flexDirection: 'row',
              width: '100%',
              gap: 12,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#27272a',
                  borderRadius: 8,
                  paddingVertical: 20,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 60,
                }}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#ffffff',
                }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: themeColor,
                  borderRadius: 8,
                  paddingVertical: 20,
                  paddingHorizontal: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 60,
                }}
                onPress={handleSetActive}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#0a0a0b',
                }}>Set Active</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mesocycle Actions Modal */}
      <Modal
        visible={showMesocycleModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelMesocycle}
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
              }}>Mesocycle {selectedMesocycle?.mesocycleNumber}</Text>
              <Text style={{
                fontSize: 14,
                color: '#71717a',
                textAlign: 'center',
                marginTop: 4,
              }}>{selectedMesocycle?.phase?.phaseName || 'Training Phase'}</Text>
            </View>
            
            <View style={{ width: '100%', gap: 12 }}>
              {/* Primary Actions */}
              {!selectedMesocycle?.isActive && (
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
                  onPress={handleSetActiveMesocycle}
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
                  backgroundColor: selectedMesocycle?.isCompleted ? '#ef4444' : '#22c55e',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}
                onPress={handleToggleMesocycleCompletion}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={selectedMesocycle?.isCompleted ? "close-circle" : "checkmark-done"} 
                  size={20} 
                  color="#0a0a0b" 
                />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#0a0a0b',
                }}>{selectedMesocycle?.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}</Text>
              </TouchableOpacity>

              {/* More Options Toggle */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#27272a',
                  borderWidth: 1,
                  borderColor: '#3a3a3a',
                  borderRadius: 8,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                }}
                onPress={() => setShowMesocycleMoreOptions(!showMesocycleMoreOptions)}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={showMesocycleMoreOptions ? "chevron-up" : "ellipsis-horizontal"} 
                  size={20} 
                  color="#ffffff" 
                />
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#ffffff',
                }}>{showMesocycleMoreOptions ? 'Less Options' : 'More Options'}</Text>
              </TouchableOpacity>

              {/* Secondary Actions */}
              {showMesocycleMoreOptions && (
                <>
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
                    onPress={handleRenameMesocycle}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="pencil-outline" size={20} color="#ffffff" />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#ffffff',
                    }}>Rename</Text>
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
                    onPress={handleCopyMesocycle}
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
                    onPress={handleShareMesocycle}
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
                    onPress={handleDeleteMesocycle}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#ef4444',
                    }}>Delete</Text>
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
              onPress={handleCancelMesocycle}
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
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
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