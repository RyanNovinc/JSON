import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { styles } from './BlocksScreen.styles';
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

// ── Helper ────────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Extract a short label for the row status icon
// e.g. "Block A: Hypertrophy" → "A", "Block 1" → "1", "Hypertrophy Phase" → "H"
function getBlockStatusLabel(name: string): string {
  if (!name) return '·';
  // Match "Block X" pattern first
  const blockMatch = name.match(/Block\s+([A-Za-z0-9]+)/i);
  if (blockMatch) return blockMatch[1].toUpperCase();
  // Fallback to first character
  return name.charAt(0).toUpperCase();
}

// ── BlockHeroCard ────────────────────────────────────────────────

interface BlockHeroCardProps {
  block: Block;
  weekProgress: {
    current: number;
    total: number;
    remaining: number;
    isComplete: boolean;
    isOverdue: boolean;
  };
  onPress: () => void;
  onLongPress: () => void;
  themeColor: string;
}

function BlockHeroCard({ block, weekProgress, onPress, onLongPress, themeColor }: BlockHeroCardProps) {
  const dayCount = block.days.length;

  const remainingText = weekProgress.remaining === 1
    ? 'FINAL WEEK'
    : `${weekProgress.remaining} WEEKS LEFT`;
  const progressPct = Math.min((weekProgress.current / weekProgress.total) * 100, 100);

  return (
    <TouchableOpacity
      style={[
        styles.heroCard,
        {
          backgroundColor: hexA(themeColor, 0.05),
          borderColor: hexA(themeColor, 0.3),
        },
      ]}
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View style={styles.heroTopRow}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroName} numberOfLines={2}>{block.block_name}</Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>
              {block.weeks.includes('-') ? `Weeks ${block.weeks}` : `Week ${block.weeks}`}
            </Text>
            <View style={styles.heroMetaDot} />
            <Text style={styles.heroMetaText}>{dayCount} {dayCount === 1 ? 'day' : 'days'}</Text>
          </View>
        </View>
        <View style={[styles.heroOpenButton, { backgroundColor: themeColor }]}>
          <Text style={styles.heroOpenButtonText}>Open</Text>
          <Ionicons name="arrow-forward" size={12} color="#000" />
        </View>
      </View>

      {weekProgress.isComplete ? (
        <View style={styles.heroCompleteRow}>
          <Ionicons name="trophy" size={13} color={themeColor} />
          <Text style={[styles.heroCompleteTitle, { color: themeColor }]}>
            BLOCK COMPLETE · {weekProgress.total} WEEK{weekProgress.total !== 1 ? 'S' : ''} DONE
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.heroProgressLabels}>
            <Text style={[styles.heroProgressLabel, { color: themeColor }]}>
              WEEK {weekProgress.current} OF {weekProgress.total}
            </Text>
            <Text style={styles.heroProgressMeta}>{remainingText}</Text>
          </View>
          <View style={styles.heroProgressBar}>
            <View
              style={[
                styles.heroProgressFill,
                { width: `${progressPct}%`, backgroundColor: themeColor },
              ]}
            />
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── BlockRow ─────────────────────────────────────────────────────

interface BlockRowProps {
  block: Block;
  onPress: () => void;
  onLongPress: () => void;
  isComplete: boolean;
  themeColor: string;
}

function BlockRow({ block, onPress, onLongPress, isComplete, themeColor }: BlockRowProps) {
  const dayCount = block.days.length;

  return (
    <TouchableOpacity
      style={styles.blockRow}
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View
        style={[
          styles.blockRowStatus,
          isComplete && {
            backgroundColor: hexA(themeColor, 0.15),
            borderColor: hexA(themeColor, 0.3),
          },
        ]}
      >
        {isComplete ? (
          <Ionicons name="checkmark" size={14} color={themeColor} />
        ) : (
          <Text style={styles.blockRowStatusText}>{getBlockStatusLabel(block.block_name)}</Text>
        )}
      </View>
      <View style={styles.blockRowContent}>
        <Text style={styles.blockRowName} numberOfLines={1}>{block.block_name}</Text>
        <Text style={styles.blockRowMeta} numberOfLines={1}>
          {block.weeks.includes('-') ? `Weeks ${block.weeks}` : `Week ${block.weeks}`} · {dayCount} {dayCount === 1 ? 'day' : 'days'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#3a3a44" />
    </TouchableOpacity>
  );
}

// ── MesocycleHeroCard ────────────────────────────────────────────

interface MesocycleHeroCardProps {
  mesocycle: MesocycleCard;
  onPress: () => void;
  onLongPress: () => void;
  themeColor: string;
}

function MesocycleHeroCard({ mesocycle, onPress, onLongPress, themeColor }: MesocycleHeroCardProps) {
  const title = mesocycle.phase?.phaseName || `Mesocycle ${mesocycle.mesocycleNumber}`;
  const progressPct = mesocycle.totalBlocks > 0
    ? (mesocycle.completedBlocks / mesocycle.totalBlocks) * 100
    : 0;

  return (
    <TouchableOpacity
      style={[
        styles.heroCard,
        {
          backgroundColor: hexA(themeColor, 0.05),
          borderColor: hexA(themeColor, 0.3),
        },
      ]}
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.heroTopRow}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroName} numberOfLines={2}>{title}</Text>
          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMetaText}>Mesocycle {mesocycle.mesocycleNumber}</Text>
            <View style={styles.heroMetaDot} />
            <Text style={styles.heroMetaText}>
              {mesocycle.totalBlocks} {mesocycle.totalBlocks === 1 ? 'block' : 'blocks'}
            </Text>
          </View>
        </View>
        <View style={[styles.heroOpenButton, { backgroundColor: themeColor }]}>
          <Text style={styles.heroOpenButtonText}>Open</Text>
          <Ionicons name="arrow-forward" size={12} color="#000" />
        </View>
      </View>

      {mesocycle.totalBlocks > 0 && (
        <>
          <View style={styles.heroProgressLabels}>
            <Text style={[styles.heroProgressLabel, { color: themeColor }]}>
              {mesocycle.completedBlocks} OF {mesocycle.totalBlocks} BLOCKS DONE
            </Text>
            <Text style={styles.heroProgressMeta}>{Math.round(progressPct)}%</Text>
          </View>
          <View style={styles.heroProgressBar}>
            <View
              style={[
                styles.heroProgressFill,
                { width: `${progressPct}%`, backgroundColor: themeColor },
              ]}
            />
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── MesocycleRow ─────────────────────────────────────────────────

interface MesocycleRowProps {
  mesocycle: MesocycleCard;
  onPress: () => void;
  onLongPress: () => void;
  themeColor: string;
}

function MesocycleRow({ mesocycle, onPress, onLongPress, themeColor }: MesocycleRowProps) {
  const title = mesocycle.phase?.phaseName || `Mesocycle ${mesocycle.mesocycleNumber}`;

  return (
    <TouchableOpacity
      style={styles.blockRow}
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View
        style={[
          styles.blockRowStatus,
          mesocycle.isCompleted && {
            backgroundColor: hexA(themeColor, 0.15),
            borderColor: hexA(themeColor, 0.3),
          },
        ]}
      >
        {mesocycle.isCompleted ? (
          <Ionicons name="checkmark" size={14} color={themeColor} />
        ) : (
          <Text style={styles.blockRowStatusText}>{mesocycle.mesocycleNumber}</Text>
        )}
      </View>
      <View style={styles.blockRowContent}>
        <Text style={styles.blockRowName} numberOfLines={1}>{title}</Text>
        <Text style={styles.blockRowMeta} numberOfLines={1}>
          {mesocycle.completedBlocks}/{mesocycle.totalBlocks} {mesocycle.totalBlocks === 1 ? 'block' : 'blocks'} complete
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#3a3a44" />
    </TouchableOpacity>
  );
}

// ── BlocksScreen ─────────────────────────────────────────────────

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
        try {
          const allRoutines = await WorkoutStorage.loadRoutines();
          const updatedRoutine = allRoutines.find(r => r.id === routine.id);
          if (updatedRoutine && updatedRoutine.blocks !== routine.blocks) {
            console.log('🔄 [BLOCKS-SCREEN] Routine updated, refreshing...');
            navigation.setParams({ routine: updatedRoutine } as any);
          }
        } catch (error) {
          console.error('Error reloading routine:', error);
        }

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

  const handleDeleteBlock = () => {
    if (!selectedBlock) return;

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
              const updatedBlocks = routine.data.blocks.filter((_, index) => index !== selectedBlock.index);
              const updatedRoutine = {
                ...routine,
                data: {
                  ...routine.data,
                  blocks: updatedBlocks
                },
                blocks: updatedBlocks.length
              };

              const allRoutines = await WorkoutStorage.loadRoutines();
              const updatedRoutines = allRoutines.map(r =>
                r.id === routine.id ? updatedRoutine : r
              );
              await WorkoutStorage.saveRoutines(updatedRoutines);

              if (selectedBlock.index === activeBlockIndex) {
                await AsyncStorage.removeItem(`activeBlock_${routine.id}`);
                setActiveBlockIndex(-1);
              } else if (selectedBlock.index < activeBlockIndex) {
                const newActiveIndex = activeBlockIndex - 1;
                await AsyncStorage.setItem(`activeBlock_${routine.id}`, newActiveIndex.toString());
                setActiveBlockIndex(newActiveIndex);
              }

              navigation.setParams({ routine: updatedRoutine } as any);

              setShowModal(false);
              setSelectedBlock(null);
            } catch (error) {
              console.error('Error deleting block:', error);
              Alert.alert('Error', 'Failed to delete block');
            }
          }
        }
      ]
    );
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

  // ── Derived UI data ─────────────────────────────────────────────

  // Count completed blocks for the routine subtitle
  const completedBlocksCount = routine.data.blocks.filter(
    block => completionStatus[block.block_name]
  ).length;
  const totalBlocksCount = routine.data.blocks.length;

  // Find current week across all blocks for the global progress indicator
  const computeCumulativeWeek = (): number => {
    let weeks = 0;
    for (let i = 0; i < activeBlockIndex; i++) {
      weeks += getBlockWeekCount(routine.data.blocks[i]?.weeks || '1');
    }
    return weeks + Math.min(completionBasedWeek, getBlockWeekCount(routine.data.blocks[activeBlockIndex]?.weeks || '1'));
  };
  const cumulativeWeek = activeBlockIndex >= 0 ? computeCumulativeWeek() : 0;
  const globalProgressPct = totalWeeks > 0 ? (cumulativeWeek / totalWeeks) * 100 : 0;

  // For block mode, separate active from other blocks
  const activeBlock = activeBlockIndex >= 0 ? routine.data.blocks[activeBlockIndex] : null;
  const otherBlocksWithIndex = routine.data.blocks
    .map((block, idx) => ({ block, idx }))
    .filter(({ idx }) => idx !== activeBlockIndex);

  // For mesocycle mode, separate active from others
  const activeMesocycle = mesocycleCards.find(m => m.isActive);
  const otherMesocycles = mesocycleCards.filter(m => !m.isActive);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>PROGRAM</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      {hasMesocycles ? (
        <FlatList
          data={otherMesocycles}
          keyExtractor={(item) => `mesocycle-${item.mesocycleNumber}-${item.customId || ''}`}
          ListHeaderComponent={() => (
            <>
              {/* Title block */}
              <View style={styles.titleBlock}>
                <Text style={styles.routineName} numberOfLines={2}>{routine.name}</Text>
                <Text style={styles.routineSubtitle}>
                  {mesocycleCards.filter(m => m.isCompleted).length} OF {mesocycleCards.length} MESOCYCLES COMPLETE
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: mesocycleCards.length > 0
                          ? `${(mesocycleCards.filter(m => m.isCompleted).length / mesocycleCards.length) * 100}%`
                          : '0%',
                        backgroundColor: themeColor,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Active mesocycle hero */}
              {activeMesocycle && (
                <>
                  <Text style={[styles.sectionLabel, styles.sectionLabelAccent, { color: themeColor }]}>
                    ACTIVE MESOCYCLE
                  </Text>
                  <MesocycleHeroCard
                    mesocycle={activeMesocycle}
                    onPress={() => handleMesocyclePress(activeMesocycle)}
                    onLongPress={() => handleMesocycleLongPress(activeMesocycle)}
                    themeColor={themeColor}
                  />
                </>
              )}

              {otherMesocycles.length > 0 && (
                <Text style={[styles.sectionLabel, styles.sectionLabelMuted]}>
                  {activeMesocycle ? 'ALL MESOCYCLES' : 'MESOCYCLES'}
                </Text>
              )}
            </>
          )}
          renderItem={({ item }) => (
            <MesocycleRow
              mesocycle={item}
              onPress={() => handleMesocyclePress(item)}
              onLongPress={() => handleMesocycleLongPress(item)}
              themeColor={themeColor}
            />
          )}
          ListFooterComponent={() => (
            <TouchableOpacity
              style={[styles.addButton, { borderColor: themeColor }]}
              onPress={() => handleAddMesocycle()}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={18} color={themeColor} />
              <Text style={[styles.addButtonText, { color: themeColor }]}>Add Mesocycle</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={otherBlocksWithIndex}
          keyExtractor={(item) => `${item.block.block_name}-${item.idx}`}
          ListHeaderComponent={() => (
            <>
              {/* Title block */}
              <View style={styles.titleBlock}>
                <Text style={styles.routineName} numberOfLines={2}>{routine.name}</Text>
                <Text style={styles.routineSubtitle}>
                  {completedBlocksCount} OF {totalBlocksCount} BLOCK{totalBlocksCount !== 1 ? 'S' : ''} COMPLETE
                  {totalWeeks > 0 && activeBlock ? ` · WEEK ${Math.min(cumulativeWeek, totalWeeks)} OF ${totalWeeks}` : ''}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(globalProgressPct, 100)}%`,
                        backgroundColor: themeColor,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Active block hero */}
              {activeBlock && (
                <>
                  <Text style={[styles.sectionLabel, styles.sectionLabelAccent, { color: themeColor }]}>
                    ACTIVE BLOCK
                  </Text>
                  <BlockHeroCard
                    block={activeBlock}
                    weekProgress={getWeekProgress(activeBlockIndex)}
                    onPress={() => handleBlockPress(activeBlock)}
                    onLongPress={() => handleBlockLongPress(activeBlock, activeBlockIndex)}
                    themeColor={themeColor}
                  />
                </>
              )}

              {otherBlocksWithIndex.length > 0 && (
                <Text style={[styles.sectionLabel, styles.sectionLabelMuted]}>
                  {activeBlock ? 'ALL BLOCKS' : 'BLOCKS'}
                </Text>
              )}
            </>
          )}
          renderItem={({ item }) => (
            <BlockRow
              block={item.block}
              onPress={() => handleBlockPress(item.block)}
              onLongPress={() => handleBlockLongPress(item.block, item.idx)}
              isComplete={completionStatus[item.block.block_name] || false}
              themeColor={themeColor}
            />
          )}
          ListFooterComponent={() => (
            <TouchableOpacity
              style={[styles.addButton, { borderColor: themeColor }]}
              onPress={() => {
                navigation.navigate('ImportRoutine', {
                  mode: 'append-block',
                  targetWorkoutId: routine.id
                });
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={18} color={themeColor} />
              <Text style={[styles.addButtonText, { color: themeColor }]}>Add Block</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Set Active Block Modal */}
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
            backgroundColor: '#0a0a0f',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            padding: 22,
            width: '100%',
            maxWidth: 340,
            alignItems: 'center',
          }}>
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 13,
                  backgroundColor: hexA(themeColor, 0.15),
                  borderWidth: 1,
                  borderColor: hexA(themeColor, 0.3),
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={26} color={themeColor} />
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#f0f0f2',
                textAlign: 'center',
                fontFamily: 'Outfit-SemiBold',
                letterSpacing: -0.3,
              }}>Set Active Block</Text>
            </View>

            <Text style={{
              fontSize: 13,
              color: '#9898a4',
              textAlign: 'center',
              lineHeight: 19,
              marginBottom: 20,
              fontFamily: 'Outfit-Regular',
            }}>
              Set <Text style={{ fontWeight: '600', color: themeColor, fontFamily: 'Outfit-SemiBold' }}>"{selectedBlock?.block.block_name}"</Text> as your active training block?
            </Text>

            <View style={{ width: '100%', gap: 8 }}>
              <TouchableOpacity
                style={{
                  width: '100%',
                  backgroundColor: themeColor,
                  borderRadius: 11,
                  paddingVertical: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleSetActive}
                activeOpacity={0.85}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#000',
                  fontFamily: 'Outfit-SemiBold',
                  letterSpacing: -0.2,
                }}>Set Active</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(239,68,68,0.3)',
                  borderRadius: 11,
                  paddingVertical: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleDeleteBlock}
                activeOpacity={0.85}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#f87171',
                  fontFamily: 'Outfit-SemiBold',
                  letterSpacing: -0.2,
                }}>Delete Block</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 11,
                  paddingVertical: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={handleCancel}
                activeOpacity={0.85}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#9898a4',
                  fontFamily: 'Outfit-Medium',
                }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mesocycle Options Modal */}
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
            backgroundColor: '#0a0a0f',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            padding: 22,
            width: '100%',
            maxWidth: 360,
            alignItems: 'center',
          }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 13,
                  backgroundColor: hexA(themeColor, 0.15),
                  borderWidth: 1,
                  borderColor: hexA(themeColor, 0.3),
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <Ionicons name="options-outline" size={24} color={themeColor} />
              </View>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#f0f0f2',
                textAlign: 'center',
                fontFamily: 'Outfit-SemiBold',
                letterSpacing: -0.3,
              }}>Mesocycle {selectedMesocycle?.mesocycleNumber}</Text>
              <Text style={{
                fontSize: 12,
                color: '#9898a4',
                textAlign: 'center',
                marginTop: 4,
                fontFamily: 'Outfit-Regular',
              }}>{selectedMesocycle?.phase?.phaseName || 'Training Phase'}</Text>
            </View>

            <View style={{ width: '100%', gap: 8 }}>
              {!selectedMesocycle?.isActive && (
                <TouchableOpacity
                  style={{
                    backgroundColor: themeColor,
                    borderRadius: 11,
                    paddingVertical: 13,
                    paddingHorizontal: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  onPress={handleSetActiveMesocycle}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#000" />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#000',
                    fontFamily: 'Outfit-SemiBold',
                    letterSpacing: -0.2,
                  }}>Set as Active</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{
                  backgroundColor: selectedMesocycle?.isCompleted ? 'rgba(239,68,68,0.1)' : hexA(themeColor, 0.1),
                  borderWidth: 1,
                  borderColor: selectedMesocycle?.isCompleted ? 'rgba(239,68,68,0.3)' : hexA(themeColor, 0.3),
                  borderRadius: 11,
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onPress={handleToggleMesocycleCompletion}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={selectedMesocycle?.isCompleted ? "close-circle-outline" : "checkmark-done"}
                  size={16}
                  color={selectedMesocycle?.isCompleted ? '#f87171' : themeColor}
                />
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: selectedMesocycle?.isCompleted ? '#f87171' : themeColor,
                  fontFamily: 'Outfit-SemiBold',
                  letterSpacing: -0.2,
                }}>{selectedMesocycle?.isCompleted ? 'Mark Incomplete' : 'Mark Complete'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 11,
                  paddingVertical: 13,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onPress={() => setShowMesocycleMoreOptions(!showMesocycleMoreOptions)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={showMesocycleMoreOptions ? "chevron-up" : "ellipsis-horizontal"}
                  size={16}
                  color="#9898a4"
                />
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#9898a4',
                  fontFamily: 'Outfit-Medium',
                }}>{showMesocycleMoreOptions ? 'Less Options' : 'More Options'}</Text>
              </TouchableOpacity>

              {showMesocycleMoreOptions && (
                <>
                  <TouchableOpacity
                    style={{
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: 11,
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onPress={handleRenameMesocycle}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#f0f0f2" />
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: '#f0f0f2',
                      fontFamily: 'Outfit-Medium',
                    }}>Rename</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: 11,
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onPress={handleCopyMesocycle}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="copy-outline" size={16} color="#f0f0f2" />
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: '#f0f0f2',
                      fontFamily: 'Outfit-Medium',
                    }}>Copy JSON</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: 'transparent',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: 11,
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onPress={handleShareMesocycle}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="share-outline" size={16} color="#f0f0f2" />
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: '#f0f0f2',
                      fontFamily: 'Outfit-Medium',
                    }}>Share</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      borderRadius: 11,
                      paddingVertical: 13,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                    onPress={handleDeleteMesocycle}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash-outline" size={16} color="#f87171" />
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: '#f87171',
                      fontFamily: 'Outfit-SemiBold',
                      letterSpacing: -0.2,
                    }}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <TouchableOpacity
              style={{
                marginTop: 16,
                paddingVertical: 10,
                paddingHorizontal: 22,
              }}
              onPress={handleCancelMesocycle}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 13,
                fontWeight: '500',
                color: '#55555f',
                fontFamily: 'Outfit-Medium',
              }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Android Add Mesocycle Modal */}
      {Platform.OS === 'android' && (
        <Modal
          visible={showAddMesocycleModal}
          transparent={true}
          animationType="fade"
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