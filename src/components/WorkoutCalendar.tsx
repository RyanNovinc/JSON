import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutStorage } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';

interface WorkoutCalendarProps {
  visible: boolean;
  onClose: () => void;
}

export default function WorkoutCalendar({ visible, onClose }: WorkoutCalendarProps) {
  const { themeColor } = useTheme();
  const { convertWeight } = useWeightUnit();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [workoutDays, setWorkoutDays] = useState<Map<string, any[]>>(new Map());
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<any[]>([]);
  const [totalWorkoutSessions, setTotalWorkoutSessions] = useState(0);
  const [allWorkoutSessions, setAllWorkoutSessions] = useState<string[]>([]);
  const [totalVolumeLifted, setTotalVolumeLifted] = useState(0);
  const [monthlyVolumeLifted, setMonthlyVolumeLifted] = useState(0);

  const isCurrentMonth = () => {
    const now = new Date();
    return currentDate.getMonth() === now.getMonth() &&
           currentDate.getFullYear() === now.getFullYear();
  };

  useEffect(() => {
    if (visible) {
      loadWorkoutHistory();
    }
  }, [visible, currentDate]);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        loadWorkoutHistory();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const loadWorkoutHistory = async () => {
    const history = await WorkoutStorage.loadWorkoutHistory();

    const workoutsByDate = new Map<string, any[]>();
    const workoutSessions = new Set<string>();
    let allTimeVolume = 0;
    let currentMonthVolume = 0;
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    history.forEach((workout: any) => {
      let dateKey: string;
      if (workout.timestamp) {
        dateKey = new Date(workout.timestamp).toDateString();
      } else if (workout.date) {
        const [year, month, day] = workout.date.split('-');
        const workoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        dateKey = workoutDate.toDateString();
      } else {
        return;
      }

      const sessionKey = `${workout.dayName}_${dateKey}`;
      workoutSessions.add(sessionKey);

      const calculateWorkoutVolume = (workoutData: any) => {
        let volume = 0;
        if (workoutData.sets && Array.isArray(workoutData.sets)) {
          workoutData.sets.forEach((set: any) => {
            const weight = parseFloat(set.weight) || 0;
            const weightInKg = convertWeight(weight, set.unit || 'kg', 'kg');
            const reps = parseInt(set.reps) || 0;
            volume += weightInKg * reps;

            if (set.drops && Array.isArray(set.drops)) {
              set.drops.forEach((drop: any) => {
                if (drop.completed !== false) {
                  const dropWeight = parseFloat(drop.weight) || 0;
                  const dropWeightInKg = convertWeight(dropWeight, drop.unit || 'kg', 'kg');
                  const dropReps = parseInt(drop.reps) || 0;
                  volume += dropWeightInKg * dropReps;
                }
              });
            }
          });
        } else {
          const weight = parseFloat(workoutData.weight) || 0;
          const weightInKg = convertWeight(weight, workoutData.unit || 'kg', 'kg');
          const reps = parseInt(workoutData.reps) || 0;
          volume += weightInKg * reps;

          if (workoutData.drops && Array.isArray(workoutData.drops)) {
            workoutData.drops.forEach((drop: any) => {
              if (drop.completed !== false) {
                const dropWeight = parseFloat(drop.weight) || 0;
                const dropWeightInKg = convertWeight(dropWeight, drop.unit || 'kg', 'kg');
                const dropReps = parseInt(drop.reps) || 0;
                volume += dropWeightInKg * dropReps;
              }
            });
          }
        }
        return volume;
      };

      const workoutVolume = calculateWorkoutVolume(workout);
      allTimeVolume += workoutVolume;

      const workoutDate = workout.timestamp ? new Date(workout.timestamp) : new Date(workout.date);
      if (workoutDate.getMonth() === currentMonth && workoutDate.getFullYear() === currentYear) {
        currentMonthVolume += workoutVolume;
      }

      if (!workoutsByDate.has(dateKey)) {
        workoutsByDate.set(dateKey, []);
      }

      if (workout.sets && Array.isArray(workout.sets)) {
        workout.sets.forEach((set: any) => {
          workoutsByDate.get(dateKey)?.push({
            ...set,
            exerciseName: workout.exerciseName,
            dayName: workout.dayName,
            timestamp: workout.timestamp || new Date(workout.date).getTime(),
            sessionKey,
          });
        });
      } else {
        workoutsByDate.get(dateKey)?.push({
          ...workout,
          sessionKey,
        });
      }
    });

    setWorkoutDays(workoutsByDate);
    setTotalWorkoutSessions(workoutSessions.size);
    setAllWorkoutSessions(Array.from(workoutSessions));
    setTotalVolumeLifted(allTimeVolume);
    setMonthlyVolumeLifted(currentMonthVolume);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleDayPress = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateKey = selected.toDateString();
    const workouts = workoutDays.get(dateKey) || [];
    if (workouts.length > 0) {
      setSelectedDate(selected);
      setSelectedDayWorkouts(workouts);
      setShowDayDetail(true);
    }
  };

  const groupWorkoutsByExercise = (workouts: any[]) => {
    const grouped = new Map<string, any[]>();
    workouts.forEach((workout) => {
      const key = workout.exerciseName;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(workout);
    });
    return grouped;
  };

  const formatWorkoutSummary = (workouts: any[]) => {
    const totalSets = workouts.reduce((sum, w) => sum + (w.setsCompleted || 1), 0);
    const totalVolume = workouts.reduce((sum, w) => {
      const weight = parseFloat(w.weight) || 0;
      const weightInKg = convertWeight(weight, w.unit || 'kg', 'kg');
      const reps = parseInt(w.reps) || 0;
      let volume = weightInKg * reps;

      if (w.drops && Array.isArray(w.drops)) {
        w.drops.forEach((drop: any) => {
          if (drop.completed !== false) {
            const dropWeight = parseFloat(drop.weight) || 0;
            const dropWeightInKg = convertWeight(dropWeight, drop.unit || 'kg', 'kg');
            const dropReps = parseInt(drop.reps) || 0;
            volume += dropWeightInKg * dropReps;
          }
        });
      }
      return sum + volume;
    }, 0);

    return { totalSets, totalVolume };
  };

  const renderCalendarDays = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateKey = date.toDateString();
      const hasWorkout = workoutDays.has(dateKey);
      const isToday = dateKey === new Date().toDateString();

      const cellStyle: any[] = [styles.dayCell];
      const textStyle: any[] = [styles.dayText];

      if (hasWorkout) {
        cellStyle.push({
          backgroundColor: hexA(themeColor, 0.12),
          borderColor: hexA(themeColor, 0.5),
          borderWidth: 1,
        });
        textStyle.push({ color: themeColor, fontWeight: '600' });
      } else if (isToday) {
        cellStyle.push({
          borderColor: hexA(themeColor, 0.3),
          borderWidth: 1,
        });
        textStyle.push({ color: '#f0f0f2' });
      }

      days.push(
        <TouchableOpacity
          key={day}
          style={cellStyle}
          onPress={() => handleDayPress(day)}
          disabled={!hasWorkout}
          activeOpacity={0.7}
        >
          <Text style={textStyle}>{day}</Text>
          {isToday && (
            <View style={[styles.todayDot, { backgroundColor: themeColor }]} />
          )}
        </TouchableOpacity>
      );
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const monthlySessionsCount = allWorkoutSessions.filter((sessionKey) => {
    const dateString = sessionKey.split('_').slice(1).join('_');
    const date = new Date(dateString);
    return date.getMonth() === currentDate.getMonth() &&
           date.getFullYear() === currentDate.getFullYear();
  }).length;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.iconButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerLabel}>CALENDAR</Text>

          {!isCurrentMonth() ? (
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => setCurrentDate(new Date())}
              activeOpacity={0.7}
            >
              <Text style={[styles.todayButtonText, { color: themeColor }]}>Today</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.iconButtonSpacer} />
          )}
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Workout history</Text>
            <Text style={styles.subtitle}>
              {totalWorkoutSessions} TOTAL SESSION{totalWorkoutSessions !== 1 ? 'S' : ''}
            </Text>
          </View>

          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth(-1)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={18} color="#9898a4" />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth(1)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={18} color="#9898a4" />
            </TouchableOpacity>
          </View>

          {/* Day names */}
          <View style={styles.dayNamesRow}>
            {dayNames.map((day, idx) => (
              <Text key={idx} style={styles.dayName}>{day}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {renderCalendarDays()}
          </View>

          {/* Stats grid 2x2 */}
          <View style={styles.statsGrid}>
            <StatCard label="ALL TIME" value={String(totalWorkoutSessions)} unit="sessions" />
            <StatCard label="THIS MONTH" value={String(monthlySessionsCount)} unit="sessions" />
            <StatCard
              label="ALL VOLUME"
              value={Math.round(totalVolumeLifted).toLocaleString()}
              unit="kg"
            />
            <StatCard
              label="MONTH VOLUME"
              value={Math.round(monthlyVolumeLifted).toLocaleString()}
              unit="kg"
            />
          </View>
        </ScrollView>

        {/* Day Detail Modal */}
        <Modal
          visible={showDayDetail}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDayDetail(false)}
        >
          <View style={styles.detailOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowDayDetail(false)}
            />

            <View style={styles.detailSheet}>
              {/* Detail header */}
              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailDate}>
                    {selectedDate?.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                  {selectedDate && (
                    <Text style={styles.detailSubtitle}>
                      {selectedDayWorkouts.length} ENTRY{selectedDayWorkouts.length !== 1 ? 'S' : ''}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setShowDayDetail(false)}
                  style={styles.detailCloseButton}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color="#9898a4" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.detailContent}
                contentContainerStyle={{ paddingBottom: 12 }}
                showsVerticalScrollIndicator={false}
              >
                {Array.from(groupWorkoutsByExercise(selectedDayWorkouts)).map(([exerciseName, sets]) => (
                  <View key={exerciseName} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <Text style={styles.exerciseName} numberOfLines={2}>
                        {exerciseName}
                      </Text>
                      <Text style={styles.setsCount}>
                        {sets.length} SET{sets.length !== 1 ? 'S' : ''}
                      </Text>
                    </View>

                    <View style={styles.setsTable}>
                      <View style={styles.setsTableHeader}>
                        <Text style={[styles.setsTableHeaderCell, { width: 36 }]}>SET</Text>
                        <Text style={[styles.setsTableHeaderCell, { flex: 1 }]}>KG</Text>
                        <Text style={[styles.setsTableHeaderCell, { flex: 1 }]}>REPS</Text>
                      </View>

                      {sets.map((workout, index) => (
                        <View key={index}>
                          <View style={styles.setRow}>
                            <Text style={[styles.setNum, { width: 36 }]}>
                              {workout.setNumber || index + 1}
                            </Text>
                            <Text style={[styles.setValue, { flex: 1, color: themeColor }]}>
                              {workout.weight}
                            </Text>
                            <Text style={[styles.setValue, { flex: 1 }]}>
                              {workout.reps}
                            </Text>
                          </View>

                          {workout.drops && workout.drops.length > 0 && (
                            <View style={styles.dropSetsContainer}>
                              {workout.drops.map((drop: any, dropIndex: number) => (
                                <View key={dropIndex} style={styles.dropSetRow}>
                                  <Text style={[styles.dropSetLabel, { width: 36 }]}>↳</Text>
                                  <Text style={[styles.dropSetValue, { flex: 1, color: hexA(themeColor, 0.7) }]}>
                                    {drop.weight}
                                  </Text>
                                  <Text style={[styles.dropSetValue, { flex: 1 }]}>
                                    {drop.reps}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Detail footer summary */}
              <View style={styles.detailSummary}>
                {(() => {
                  const { totalSets, totalVolume } = formatWorkoutSummary(selectedDayWorkouts);
                  return (
                    <>
                      <View style={styles.detailSummaryItem}>
                        <Text style={styles.detailSummaryLabel}>TOTAL SETS</Text>
                        <Text style={styles.detailSummaryValue}>{totalSets}</Text>
                      </View>
                      <View style={styles.detailSummaryDivider} />
                      <View style={styles.detailSummaryItem}>
                        <Text style={styles.detailSummaryLabel}>VOLUME</Text>
                        <Text style={styles.detailSummaryValue}>
                          {Math.round(totalVolume).toLocaleString()} kg
                        </Text>
                      </View>
                    </>
                  );
                })()}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.statBoxOuter}>
      <View style={styles.statBoxInner}>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statValueRow}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statUnit}>{unit}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 56,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSpacer: {
    width: 38,
    height: 38,
  },
  headerLabel: {
    color: '#9898a4',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Title
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  title: {
    color: '#f0f0f2',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: 'Outfit-Bold',
    lineHeight: 28,
  },
  subtitle: {
    color: '#55555f',
    fontSize: 11,
    letterSpacing: 1.3,
    marginTop: 6,
    fontFamily: 'DMMono-Medium',
  },

  // Month nav
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 14,
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f0f0f2',
    letterSpacing: -0.2,
    fontFamily: 'Outfit-SemiBold',
  },
  navButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Day names row
  dayNamesRow: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    color: '#55555f',
    fontWeight: '500',
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },

  // Calendar grid
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  // Day cell — flat, no nested wrapper
  dayCell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    position: 'relative',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 14,
    color: '#9898a4',
    fontWeight: '500',
    fontFamily: 'DMMono-Medium',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Stats grid (2x2)
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
    marginHorizontal: 12,
  },
  statBoxOuter: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  statBoxInner: {
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    minHeight: 78,
  },
  statLabel: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    color: '#f0f0f2',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: -0.4,
    fontFamily: 'Outfit-SemiBold',
  },
  statUnit: {
    color: '#55555f',
    fontSize: 10,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.3,
  },

  // Day detail modal
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  detailSheet: {
    backgroundColor: '#0a0a0f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  detailDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f0f0f2',
    letterSpacing: -0.3,
    fontFamily: 'Outfit-SemiBold',
  },
  detailSubtitle: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.3,
    marginTop: 4,
    fontFamily: 'DMMono-Medium',
  },
  detailCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // Exercise card in detail
  exerciseCard: {
    backgroundColor: '#111116',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    marginBottom: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#f0f0f2',
    letterSpacing: -0.2,
    fontFamily: 'Outfit-SemiBold',
  },
  setsCount: {
    fontSize: 9,
    color: '#55555f',
    fontWeight: '500',
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },

  // Sets table inside detail
  setsTable: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  setsTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  setsTableHeaderCell: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Regular',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  setNum: {
    color: '#55555f',
    fontSize: 13,
    fontFamily: 'DMMono-Medium',
  },
  setValue: {
    color: '#f0f0f2',
    fontSize: 14,
    fontFamily: 'DMMono-Medium',
  },

  // Drop sets
  dropSetsContainer: {
    paddingLeft: 8,
  },
  dropSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  dropSetLabel: {
    color: '#3a3a44',
    fontSize: 12,
    fontFamily: 'DMMono-Regular',
  },
  dropSetValue: {
    color: '#9898a4',
    fontSize: 13,
    fontFamily: 'DMMono-Regular',
  },

  // Detail summary footer
  detailSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  detailSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailSummaryLabel: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
    marginBottom: 4,
  },
  detailSummaryValue: {
    color: '#f0f0f2',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.3,
  },
  detailSummaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});