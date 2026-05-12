import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from './DaysScreen.styles';

// ── Helper ────────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Types ─────────────────────────────────────────────────────────

interface Exercise {
  exercise: string;
  sets: number;
  reps: string;
  rest?: number;
  restQuick?: number;
  notes?: string;
  alternatives?: string[];
}

interface Day {
  day_name: string;
  estimated_duration?: number;
  exercises: Exercise[];
}

interface CompletionStats {
  duration: number;
  totalVolume: number;
  date: string;
}

interface DayRowProps {
  day: Day;
  dayNumber: number;                 // 1-based position in the week (used as the index badge for pending rows)
  onPress: () => void;
  onLongPress?: () => void;
  isCompleted?: boolean;
  isNextUp?: boolean;                // hero variant — only one day per screen
  currentWeek: number;
  themeColor: string;
  blockName: string;
  refreshTrigger?: number;
  completionStats?: CompletionStats;
  globalUnit?: string;
}

// ── Component ─────────────────────────────────────────────────────

export default function DayRow({
  day,
  dayNumber,
  onPress,
  onLongPress,
  isCompleted,
  isNextUp,
  currentWeek,
  themeColor,
  blockName,
  refreshTrigger,
  completionStats,
  globalUnit = 'kg',
}: DayRowProps) {
  const [modifiedExercises, setModifiedExercises] = useState<Exercise[]>(day.exercises || []);
  const [dynamicExercises, setDynamicExercises] = useState<Exercise[]>([]);
  const [customizedDuration, setCustomizedDuration] = useState<number | undefined>(day.estimated_duration);

  const exerciseCount = (modifiedExercises?.length || 0) + (dynamicExercises?.length || 0);

  const loadWeekCustomizations = async () => {
    try {
      const customizationKey = `day_customization_${blockName}_${day.day_name || 'unknown'}_week${currentWeek}`;
      const savedCustomization = await AsyncStorage.getItem(customizationKey);
      if (savedCustomization) {
        const customizationData = JSON.parse(savedCustomization);

        if (customizationData.exercises) {
          setModifiedExercises(customizationData.exercises);
        }

        if (customizationData.estimated_duration !== undefined) {
          setCustomizedDuration(customizationData.estimated_duration);
        }

        setDynamicExercises([]);
        return;
      } else {
        setModifiedExercises(day.exercises || []);
        setCustomizedDuration(day.estimated_duration);
      }
    } catch (error) {
      setModifiedExercises(day.exercises || []);
      setCustomizedDuration(day.estimated_duration);
    }
  };

  const loadDynamicExercises = async () => {
    const customizationKey = `day_customization_${blockName}_${day.day_name || 'unknown'}_week${currentWeek}`;
    try {
      const savedCustomization = await AsyncStorage.getItem(customizationKey);
      if (savedCustomization) {
        setDynamicExercises([]);
        return;
      }
    } catch (error) {
      // Continue to load dynamic exercises if customization check fails
    }

    try {
      const dynamicKey = `workout_${blockName}_${day.day_name || 'unknown'}_week${currentWeek}_exercises`;
      const savedDynamic = await AsyncStorage.getItem(dynamicKey);
      if (savedDynamic) {
        const parsedDynamic = JSON.parse(savedDynamic);
        setDynamicExercises(parsedDynamic);
      } else {
        setDynamicExercises([]);
      }
    } catch (error) {
      setDynamicExercises([]);
    }
  };

  const loadSetsData = async () => {
    try {
      const savedKey = `workout_${blockName}_${day.day_name || 'unknown'}_week${currentWeek}_sets`;
      const savedData = await AsyncStorage.getItem(savedKey);
      if (savedData) {
        const savedSetsData = JSON.parse(savedData);
        const updatedExercises = (day.exercises || []).map((exercise, index) => {
          if (savedSetsData[index] && savedSetsData[index].length > 0) {
            return {
              ...exercise,
              sets: savedSetsData[index].length
            };
          }
          return exercise;
        });
        setModifiedExercises(updatedExercises);
      }
    } catch (error) {
      // Use template data if no saved sets
    }
  };

  useEffect(() => {
    loadWeekCustomizations();
    loadSetsData();
    loadDynamicExercises();
  }, [blockName, day.day_name, currentWeek, refreshTrigger]);

  const allExercises = [...(modifiedExercises || []), ...(dynamicExercises || [])];

  const estimatedDuration = (() => {
    if (exerciseCount === 0) {
      return 0;
    }

    if (customizedDuration !== undefined) {
      return customizedDuration;
    }

    if (day.estimated_duration && (day.exercises?.length || 0) > 0) {
      return day.estimated_duration;
    }

    const totalRestTime = allExercises.reduce((total, ex) => {
      const sets = ex.sets;
      const restPerSet = (ex.rest || 120) / 60;
      return total + (sets * restPerSet);
    }, 0);

    const executionTime = allExercises.reduce((total, ex) => {
      const name = (ex.exercise || '').toLowerCase();
      const isCompound = name.includes('squat') || name.includes('deadlift') ||
                        name.includes('press') || name.includes('row') ||
                        name.includes('pull up') || name.includes('chin up');
      const timePerSet = isCompound ? 1.5 : 1;
      return total + (ex.sets * timePerSet);
    }, 0);

    const warmupTime = 5;
    const setupTime = exerciseCount * 0.5;

    return Math.round(totalRestTime + executionTime + warmupTime + setupTime);
  })();

  const isRestDay = exerciseCount === 0 && day.day_name && day.day_name.toUpperCase().includes('REST');

  // ── REST DAY ─────────────────────────────────────────────────────
  if (isRestDay) {
    return (
      <View style={styles.restRow}>
        <View style={styles.restIconWrap}>
          <Ionicons name="bed-outline" size={14} color="#55555f" />
        </View>
        <Text style={styles.restText}>Rest</Text>
        <Text style={styles.restDayNameText}>{day.day_name}</Text>
      </View>
    );
  }

  // ── NEXT-UP HERO ROW ─────────────────────────────────────────────
  if (isNextUp) {
    return (
      <TouchableOpacity
        style={[
          styles.nextUpCard,
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
        <View style={styles.nextUpContent}>
          <View style={styles.nextUpTextBlock}>
            <Text style={styles.nextUpDayName} numberOfLines={1}>
              {day.day_name || 'Untitled Day'}
            </Text>
            <View style={styles.nextUpMetaRow}>
              <Text style={styles.nextUpMetaText}>
                {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
              </Text>
              {estimatedDuration > 0 && (
                <>
                  <View style={styles.nextUpMetaDot} />
                  <Text style={styles.nextUpMetaText}>~{estimatedDuration} min</Text>
                </>
              )}
            </View>
          </View>
          <View style={[styles.nextUpStartButton, { backgroundColor: themeColor }]}>
            <Text style={styles.nextUpStartButtonText}>Start</Text>
            <Ionicons name="arrow-forward" size={13} color="#000" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── COMPLETED ROW ────────────────────────────────────────────────
  if (isCompleted && completionStats) {
    return (
      <TouchableOpacity
        style={styles.dayRow}
        activeOpacity={0.8}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={800}
      >
        <View
          style={[
            styles.dayRowStatus,
            {
              backgroundColor: hexA(themeColor, 0.15),
              borderColor: hexA(themeColor, 0.3),
            },
          ]}
        >
          <Ionicons name="checkmark" size={12} color={themeColor} />
        </View>
        <View style={styles.dayRowContent}>
          <Text style={styles.dayRowName} numberOfLines={1}>
            {day.day_name || 'Untitled Day'}
          </Text>
          <Text style={styles.dayRowMeta} numberOfLines={1}>
            {completionStats.duration} min · {completionStats.totalVolume.toFixed(0)} {globalUnit}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#3a3a44" />
      </TouchableOpacity>
    );
  }

  // ── PENDING DAY ROW ──────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={styles.dayRow}
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.dayRowStatus}>
        <Text style={styles.dayRowStatusNumber}>{dayNumber}</Text>
      </View>
      <View style={styles.dayRowContent}>
        <Text style={styles.dayRowName} numberOfLines={1}>
          {day.day_name || 'Untitled Day'}
        </Text>
        <Text style={styles.dayRowMeta} numberOfLines={1}>
          {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
          {estimatedDuration > 0 ? ` · ~${estimatedDuration} min` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#3a3a44" />
    </TouchableOpacity>
  );
}