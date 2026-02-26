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
  isCustomMesocycle?: boolean;
  customId?: string;
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
  
  const exercises = new Set<string>();
  block.days.forEach(day => {
    day.exercises?.forEach((exercise: any) => {
      exercises.add(exercise.exercise);
    });
  });
  
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
  const { routine, initialBlock, initialWeek, autoNavigateToToday } = route.params;
  const { themeColor } = useTheme();
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
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
  const [showAddMesocycleModal, setShowAddMesocycleModal] = useState(false);
  const [newMesocycleName, setNewMesocycleName] = useState('');
  
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

  useFocusEffect(
    React.useCallback(() => {
      const reloadOnFocus = async () => {
        if (activeBlockIndex !== -1) {
          calculateCompletionBasedWeek();
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        await checkAllBlocksCompletion();
        
        if (program && hasMesocycles) {
          await updateMesocycleCards();
        }
      };
      
      reloadOnFocus();
    }, [activeBlockIndex, program, hasMesocycles])
  );

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

    const cards: MesocycleCard[] = [];
    const currentMesocycle = program.currentMesocycle;
    const totalBlocks = routine.data.blocks.length;
    const blocksPerMesocycle = Math.ceil(totalBlocks / program.totalMesocycles);
    
    for (let i = 0; i < program.totalMesocycles; i++) {
      const mesocycleNumber = i + 1;
      const phase = program.mesocycleRoadmap?.find(p => p.mesocycleNumber === mesocycleNumber);
      
      const startIdx = i * blocksPerMesocycle;
      const endIdx = Math.min(startIdx + blocksPerMesocycle, totalBlocks);
      const mesocycleBlocks = routine.data.blocks.slice(startIdx, endIdx);
      
      if (mesocycleBlocks.length === 0) continue;
      
      
      const completedBlocks = mesocycleBlocks.filter(block => 
        completionStatus[block.block_name] || false
      ).length;
      
      const isCompleted = completedBlocks === mesocycleBlocks.length;
      const isActive = mesocycleNumber === currentMesocycle;
      
      const manualBlocksCount = await getManualBlocksCount(mesocycleNumber, routine);
      const totalBlocksWithManual = mesocycleBlocks.length + manualBlocksCount;
      
      cards.push({
        mesocycleNumber,
        phase,
        blocksInMesocycle: mesocycleBlocks,
        completedBlocks,
        totalBlocks: totalBlocksWithManual,
        isCompleted,
        isActive
      });
    }
    
    const customMesocycles = await loadCustomMesocycles();
    const allMesocycles = [...cards, ...customMesocycles];
    
    setMesocycleCards(allMesocycles);
  };

  const handleMesocyclePress = (mesocycle: MesocycleCard) => {
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
      const bookmarkKey = `bookmark_${block.block_name}`;
      const savedBookmark = await AsyncStorage.getItem(bookmarkKey);
      if (savedBookmark) {
        const { week, isBookmarked } = JSON.parse(savedBookmark);
        if (isBookmarked && week >= 1 && week <= totalWeeks) {
          if (week === totalWeeks) {
            const weekKey = `completed_${block.block_name}_week${week}`;
            const completed = await AsyncStorage.getItem(weekKey);
            
            if (completed) {
              const completedSet = new Set(JSON.parse(completed));
              const allDaysCompleted = block.days.every(day => 
                completedSet.has(`${day.day_name}_week${week}`)
              );
              
              if (allDaysCompleted) {
                setCompletionBasedWeek(totalWeeks + 1);
                return;
              }
            }
          }
          
          setCompletionBasedWeek(week);
          return;
        }
      }
      
      for (let week = 1; week <= totalWeeks; week++) {
        const weekKey = `completed_${block.block_name}_week${week}`;
        const completed = await AsyncStorage.getItem(weekKey);
        
        if (!completed) {
          setCompletionBasedWeek(week);
          return;
        }
        
        const completedSet = new Set(JSON.parse(completed));
        const allDaysCompleted = block.days.every(day => 
          completedSet.has(`${day.day_name}_week${week}`)
        );
        
        if (!allDaysCompleted) {
          setCompletionBasedWeek(week);
          return;
        }
      }
      
      setCompletionBasedWeek(totalWeeks + 1);
    } catch (error) {
      console.error('Failed to calculate completion-based week:', error);
      setCompletionBasedWeek(1);
    }
  };

  const checkAllWeeksCompleted = async (block: Block, totalWeeks: number) => {
    try {
      const allDays = block.days || [];
      
      for (let week = 1; week <= totalWeeks; week++) {
        const weekKey = `completed_${block.block_name}_week${week}`;
        const completed = await AsyncStorage.getItem(weekKey);
        
        if (!completed) {
          return false;
        }
        
        const completedArray = JSON.parse(completed);
        
        if (allDays.length === 0) {
          if (!completedArray.includes('empty_block_completed')) {
            return false;
          }
        } else {
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
    return completionStatus[block.block_name] || false;
  };

  const checkAllBlocksCompletion = async () => {
    const newCompletionStatus: {[blockName: string]: boolean} = {};
    
    for (const block of routine.data.blocks) {
      const totalWeeks = getBlockWeekCount(block.weeks);
      const isComplete = await checkAllWeeksCompleted(block, totalWeeks);
      newCompletionStatus[block.block_name] = isComplete;
    }
    
    if (program && program.totalMesocycles > 1) {
      for (let mesocycleNum = 1; mesocycleNum <= program.totalMesocycles; mesocycleNum++) {
        const manualBlocksKey = `manual_blocks_mesocycle_${mesocycleNum}`;
        try {
          const manualBlocksData = await AsyncStorage.getItem(manualBlocksKey);
          if (manualBlocksData) {
            const manualBlocks = JSON.parse(manualBlocksData);
            for (const block of manualBlocks) {
              const totalWeeks = getBlockWeekCount(block.weeks);
              const isComplete = await checkAllWeeksCompleted(block, totalWeeks);
              newCompletionStatus[block.block_name] = isComplete;
            }
          }
        } catch (error) {
          console.error('Error loading manual blocks for mesocycle', mesocycleNum, error);
        }
      }
    }
    
    const customMesocyclesKey = `custom_mesocycles_${routine.id}`;
    try {
      const customMesocyclesData = await AsyncStorage.getItem(customMesocyclesKey);
      if (customMesocyclesData) {
        const customMesocycles = JSON.parse(customMesocyclesData);
        for (const mesocycle of customMesocycles) {
          if (mesocycle.customId) {
            const manualBlocksKey = `manual_blocks_${mesocycle.customId}`;
            const manualBlocksData = await AsyncStorage.getItem(manualBlocksKey);
            if (manualBlocksData) {
              const manualBlocks = JSON.parse(manualBlocksData);
              for (const block of manualBlocks) {
                const totalWeeks = getBlockWeekCount(block.weeks);
                const isComplete = await checkAllWeeksCompleted(block, totalWeeks);
                newCompletionStatus[block.block_name] = isComplete;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading custom mesocycle manual blocks:', error);
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
    if (index === activeBlockIndex) return;
    
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
        await ProgramStorage.updateProgram(program.id, { 
          currentMesocycle: selectedMesocycle.mesocycleNumber 
        });
        
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
                if (!selectedMesocycle) return;
                
                const updatedMesocycles = mesocycleCards.filter(m => m !== selectedMesocycle);
                setMesocycleCards(updatedMesocycles);
                
                if (selectedMesocycle.isCustomMesocycle) {
                  const customMesocyclesKey = `custom_mesocycles_${routine.id}`;
                  const existingCustomMesocycles = await AsyncStorage.getItem(customMesocyclesKey);
                  const customMesocycles = existingCustomMesocycles ? JSON.parse(existingCustomMesocycles) : [];
                  
                  const updatedCustomMesocycles = customMesocycles.filter((m: any) => 
                    m.customId !== selectedMesocycle.customId
                  );
                  await AsyncStorage.setItem(customMesocyclesKey, JSON.stringify(updatedCustomMesocycles));
                  
                  if (selectedMesocycle.customId) {
                    const manualBlocksKey = `manual_blocks_${selectedMesocycle.customId}`;
                    await AsyncStorage.removeItem(manualBlocksKey);
                  }
                } else {
                  if (program && !(routine as any).mesocycleNumber) {
                    const totalBlocks = routine.data.blocks.length;
                    const blocksPerMesocycle = Math.ceil(totalBlocks / program.totalMesocycles);
                    
                    const mesocycleIndex = selectedMesocycle.mesocycleNumber - 1;
                    const startIdx = mesocycleIndex * blocksPerMesocycle;
                    const endIdx = Math.min(startIdx + blocksPerMesocycle, totalBlocks);
                    
                    const updatedBlocks = [
                      ...routine.data.blocks.slice(0, startIdx),
                      ...routine.data.blocks.slice(endIdx)
                    ];
                    
                    const updatedRoutine = {
                      ...routine,
                      data: {
                        ...routine.data,
                        blocks: updatedBlocks
                      }
                    };
                    
                    const routines = await WorkoutStorage.loadRoutines();
                    const routineIndex = routines.findIndex(r => r.id === routine.id);
                    if (routineIndex !== -1) {
                      routines[routineIndex] = updatedRoutine;
                      await WorkoutStorage.saveRoutines(routines);
                    }
                    
                    Object.assign(routine, updatedRoutine);
                  }
                  
                  if (program) {
                    const updatedRoadmap = program.mesocycleRoadmap.filter(phase => 
                      phase.mesocycleNumber !== selectedMesocycle.mesocycleNumber
                    );
                    
                    updatedRoadmap.forEach((phase, index) => {
                      phase.mesocycleNumber = index + 1;
                    });
                    
                    await ProgramStorage.updateProgram(program.id, {
                      mesocycleRoadmap: updatedRoadmap,
                      totalMesocycles: updatedRoadmap.length,
                      currentMesocycle: Math.min(program.currentMesocycle, updatedRoadmap.length)
                    });
                    
                    await loadProgramData();
                  }
                }
                
                setShowMesocycleModal(false);
                setSelectedMesocycle(null);
                setShowMesocycleMoreOptions(false);
                
              } catch (error) {
                console.error('Error deleting mesocycle:', error);
                Alert.alert('Error', 'Failed to delete mesocycle. Please try again.');
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
                  if (program && selectedMesocycle.phase) {
                    const updatedRoadmap = program.mesocycleRoadmap.map(phase => 
                      phase.mesocycleNumber === selectedMesocycle.mesocycleNumber 
                        ? { ...phase, phaseName: newName.trim() }
                        : phase
                    );
                    
                    await ProgramStorage.updateProgram(program.id, {
                      mesocycleRoadmap: updatedRoadmap
                    });

                    const updatedProgram = await ProgramStorage.getProgram(program.id);
                    if (updatedProgram) {
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
        const isCurrentlyCompleted = selectedMesocycle.isCompleted;
        
        for (const block of blocksInMesocycle) {
          const totalWeeks = block.weeks.includes('-') 
            ? parseInt(block.weeks.split('-')[1]) - parseInt(block.weeks.split('-')[0]) + 1
            : 1;

          if (isCurrentlyCompleted) {
            for (let week = 1; week <= totalWeeks; week++) {
              const weekKey = `completed_${block.block_name}_week${week}`;
              await AsyncStorage.removeItem(weekKey);
            }
          } else {
            for (let week = 1; week <= totalWeeks; week++) {
              const completedWorkouts = block.days.map((day: any) => `${day.day_name}_week${week}`);
              const weekKey = `completed_${block.block_name}_week${week}`;
              await AsyncStorage.setItem(weekKey, JSON.stringify(completedWorkouts));
            }
          }
        }

        await checkAllBlocksCompletion();

        setShowMesocycleModal(false);
        setSelectedMesocycle(null);
        setShowMesocycleMoreOptions(false);
        
      } catch (error) {
        console.error('Error toggling mesocycle completion:', error);
        Alert.alert('Error', 'Failed to update mesocycle completion status. Please try again.');
      }
    }
  };

  const handleAddMesocycle = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Add New Mesocycle',
        'Enter a name for this mesocycle:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create', 
            onPress: (text) => {
              if (text && text.trim()) {
                createNewMesocycle(text.trim());
              }
            }
          }
        ],
        'plain-text'
      );
    } else {
      setNewMesocycleName('');
      setShowAddMesocycleModal(true);
    }
  };

  const handleCreateMesocycle = () => {
    if (newMesocycleName.trim()) {
      createNewMesocycle(newMesocycleName.trim());
      setShowAddMesocycleModal(false);
      setNewMesocycleName('');
    }
  };

  const createNewMesocycle = async (mesocycleName: string) => {
    try {
      const customMesocycleId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newMesocycle: MesocycleCard = {
        mesocycleNumber: mesocycleCards.length + 1,
        phase: {
          mesocycleNumber: mesocycleCards.length + 1,
          phaseName: mesocycleName,
          repFocus: '',
          emphasis: '',
          weeks: 4,
          blocks: 0
        },
        blocksInMesocycle: [],
        completedBlocks: 0,
        totalBlocks: 0,
        isCompleted: false,
        isActive: false,
        isCustomMesocycle: true,
        customId: customMesocycleId
      };

      const updatedMesocycles = [...mesocycleCards, newMesocycle];
      setMesocycleCards(updatedMesocycles);

      await saveCustomMesocycle(newMesocycle);
      
    } catch (error) {
      console.error('Error creating mesocycle:', error);
      Alert.alert('Error', 'Failed to create mesocycle. Please try again.');
    }
  };

  const saveCustomMesocycle = async (mesocycle: MesocycleCard) => {
    try {
      const customMesocyclesKey = `custom_mesocycles_${routine.id}`;
      const existingCustomMesocycles = await AsyncStorage.getItem(customMesocyclesKey);
      const customMesocycles = existingCustomMesocycles ? JSON.parse(existingCustomMesocycles) : [];
      
      const updatedCustomMesocycles = [...customMesocycles, mesocycle];
      await AsyncStorage.setItem(customMesocyclesKey, JSON.stringify(updatedCustomMesocycles));
    } catch (error) {
      console.error('Failed to save custom mesocycle:', error);
    }
  };

  const getManualBlocksCount = async (mesocycleNumber: number, routine: any, customId?: string): Promise<number> => {
    try {
      let mesocycleId;
      
      if (customId) {
        mesocycleId = customId;
      } else {
        mesocycleId = `mesocycle_${mesocycleNumber}`;
      }
      
      const manualBlocksKey = `manual_blocks_${mesocycleId}`;
      const manualBlocksData = await AsyncStorage.getItem(manualBlocksKey);
      
      if (manualBlocksData) {
        const manualBlocks = JSON.parse(manualBlocksData);
        return manualBlocks.length;
      }
      
      return 0;
    } catch (error) {
      console.error('Error counting manual blocks:', error);
      return 0;
    }
  };

  const getManualBlocks = async (mesocycleNumber: number, routine: any, customId?: string): Promise<Block[]> => {
    try {
      let mesocycleId;
      
      if (customId) {
        mesocycleId = customId;
      } else {
        mesocycleId = `mesocycle_${mesocycleNumber}`;
      }
      
      const manualBlocksKey = `manual_blocks_${mesocycleId}`;
      const manualBlocksData = await AsyncStorage.getItem(manualBlocksKey);
      
      if (manualBlocksData) {
        const manualBlocks = JSON.parse(manualBlocksData);
        return manualBlocks;
      }
      
      return [];
    } catch (error) {
      console.error('Error loading manual blocks:', error);
      return [];
    }
  };

  const checkAllWeeksCompletedFresh = async (block: Block, totalWeeks: number): Promise<boolean> => {
    try {
      const originalDays = block.days || [];
      const manualDaysKey = `manual_days_${block.block_name}`;
      const manualDaysData = await AsyncStorage.getItem(manualDaysKey);
      const manualDays = manualDaysData ? JSON.parse(manualDaysData) : [];
      const allDays = [...originalDays, ...manualDays];
      
      for (let week = 1; week <= totalWeeks; week++) {
        const weekKey = `completed_${block.block_name}_week${week}`;
        const completed = await AsyncStorage.getItem(weekKey);
        
        if (!completed) {
          return false;
        }
        
        const completedArray = JSON.parse(completed);
        
        if (allDays.length === 0) {
          if (!completedArray.includes('empty_block_completed')) {
            return false;
          }
        } else {
          if (completedArray.length !== allDays.length) {
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error in fresh completion check:', error);
      return false;
    }
  };

  const loadCustomMesocycles = async () => {
    try {
      const customMesocyclesKey = `custom_mesocycles_${routine.id}`;
      const customMesocyclesData = await AsyncStorage.getItem(customMesocyclesKey);
      const customMesocycles = customMesocyclesData ? JSON.parse(customMesocyclesData) : [];
      
      
      const updatedCustomMesocycles = await Promise.all(
        customMesocycles.map(async (mesocycle: any) => {
          const manualBlocks = await getManualBlocks(mesocycle.mesocycleNumber, routine, mesocycle.customId);
          
          const completedBlocksPromises = manualBlocks.map(async (block) => {
            const totalWeeks = getBlockWeekCount(block.weeks);
            const isComplete = await checkAllWeeksCompletedFresh(block, totalWeeks);
            return isComplete;
          });
          
          const completionResults = await Promise.all(completedBlocksPromises);
          const completedBlocks = completionResults.filter(Boolean).length;
          
          return {
            ...mesocycle,
            isCustomMesocycle: true,
            blocksInMesocycle: manualBlocks,
            completedBlocks: completedBlocks,
            totalBlocks: manualBlocks.length,
            isCompleted: manualBlocks.length > 0 && completedBlocks === manualBlocks.length
          };
        })
      );
      
      return updatedCustomMesocycles;
    } catch (error) {
      console.error('Failed to load custom mesocycles:', error);
      return [];
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
          <Text style={styles.programLabel}>PROGRAM</Text>
          <Text style={styles.programName}>{routine.name}</Text>
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
          ListFooterComponent={() => (
            <TouchableOpacity 
              style={[styles.addMesocycleButton, { borderColor: themeColor }]}
              onPress={() => handleAddMesocycle()}
            >
              <Ionicons name="add-circle-outline" size={24} color={themeColor} />
              <Text style={[styles.addMesocycleText, { color: themeColor }]}>Add Mesocycle</Text>
            </TouchableOpacity>
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

      {Platform.OS === 'android' && (
        <Modal
          visible={showAddMesocycleModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddMesocycleModal(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Add New Mesocycle</Text>
              
              <TextInput
                style={styles.input}
                value={newMesocycleName}
                onChangeText={setNewMesocycleName}
                placeholder="Enter mesocycle name..."
                placeholderTextColor="#888"
                autoFocus={true}
                maxLength={30}
              />
              
              <View style={styles.buttonContainer}>
                <View style={styles.buttonWrapper}>
                  <Button
                    title="Cancel"
                    color="#666"
                    onPress={() => setShowAddMesocycleModal(false)}
                  />
                </View>
                <View style={styles.buttonWrapper}>
                  <Button
                    title="Create"
                    color={themeColor}
                    onPress={handleCreateMesocycle}
                    disabled={!newMesocycleName.trim()}
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
    paddingRight: 40,
  },
  programLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  programName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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
  addMesocycleButton: {
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
  addMesocycleText: {
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
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