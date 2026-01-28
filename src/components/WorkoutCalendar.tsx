import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutStorage } from '../utils/storage';

interface WorkoutCalendarProps {
  visible: boolean;
  onClose: () => void;
}

interface WorkoutDay {
  date: string;
  workouts: any[];
}

export default function WorkoutCalendar({ visible, onClose }: WorkoutCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [workoutDays, setWorkoutDays] = useState<Map<string, any[]>>(new Map());
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [selectedDayWorkouts, setSelectedDayWorkouts] = useState<any[]>([]);
  const [totalWorkoutSessions, setTotalWorkoutSessions] = useState(0);
  const [allWorkoutSessions, setAllWorkoutSessions] = useState<string[]>([]);

  const isCurrentMonth = () => {
    const now = new Date();
    return currentDate.getMonth() === now.getMonth() && 
           currentDate.getFullYear() === now.getFullYear();
  };

  useEffect(() => {
    console.log('Calendar: useEffect triggered, visible:', visible, 'currentDate:', currentDate);
    if (visible) {
      loadWorkoutHistory();
    }
  }, [visible, currentDate]);
  
  // Reload data whenever the modal becomes visible (to catch new workouts)
  useEffect(() => {
    console.log('Calendar: Reload useEffect triggered, visible:', visible);
    if (visible) {
      // Add a small delay to ensure any ongoing saves are complete
      const timer = setTimeout(() => {
        console.log('Calendar: Delayed reload triggered');
        loadWorkoutHistory();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const loadWorkoutHistory = async () => {
    console.log('Calendar: loadWorkoutHistory called');
    const history = await WorkoutStorage.loadWorkoutHistory();
    console.log('Calendar: Loaded', history.length, 'workout entries');
    
    // Check dates of all entries
    const dateCounts = {};
    history.forEach(entry => {
      const date = entry.date || (entry.timestamp ? new Date(entry.timestamp).toISOString().split('T')[0] : 'unknown');
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    console.log('Calendar: Workout dates distribution:', dateCounts);
    
    // Group workouts by date
    const workoutsByDate = new Map<string, any[]>();
    
    // Track unique workout sessions (by dayName + date combination)
    const workoutSessions = new Set<string>();
    
    history.forEach((workout: any) => {
      // Handle both timestamp and date formats
      let dateKey: string;
      if (workout.timestamp) {
        dateKey = new Date(workout.timestamp).toDateString();
      } else if (workout.date) {
        // Convert YYYY-MM-DD to a date string
        // Make sure to handle the date properly to avoid timezone issues
        const [year, month, day] = workout.date.split('-');
        const workoutDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        dateKey = workoutDate.toDateString();
      } else {
        return; // Skip if no date info
      }
      
      // Count unique workout sessions (dayName + date)
      const sessionKey = `${workout.dayName}_${dateKey}`;
      workoutSessions.add(sessionKey);
      
      // Debug: Log the first few entries to see structure
      if (history.indexOf(workout) < 3) {
        console.log('Calendar: Sample workout entry:', {
          dayName: workout.dayName,
          date: workout.date,
          dateKey,
          sessionKey,
          hasMultipleSets: workout.sets && Array.isArray(workout.sets)
        });
      }
      
      if (!workoutsByDate.has(dateKey)) {
        workoutsByDate.set(dateKey, []);
      }
      
      // If the workout has sets, add each set as a separate entry
      if (workout.sets && Array.isArray(workout.sets)) {
        console.log(`Calendar: Processing ${workout.exerciseName} with ${workout.sets.length} sets`);
        workout.sets.forEach((set: any, setIndex: number) => {
          console.log(`  - Adding set ${setIndex + 1}:`, set);
          workoutsByDate.get(dateKey)?.push({
            ...set,
            exerciseName: workout.exerciseName,
            dayName: workout.dayName,
            timestamp: workout.timestamp || new Date(workout.date).getTime(),
            sessionKey
          });
        });
      } else {
        workoutsByDate.get(dateKey)?.push({
          ...workout,
          sessionKey
        });
      }
    });
    
    setWorkoutDays(workoutsByDate);
    
    console.log('Calendar: Unique sessions found:', workoutSessions.size);
    console.log('Calendar: Session keys:', Array.from(workoutSessions));
    
    // Store total workout sessions count
    setTotalWorkoutSessions(workoutSessions.size);
    setAllWorkoutSessions(Array.from(workoutSessions));
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
    workouts.forEach(workout => {
      const key = workout.exerciseName;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(workout);
    });
    return grouped;
  };

  const formatWorkoutSummary = (workouts: any[]) => {
    const totalSets = workouts.reduce((sum, w) => sum + (w.setsCompleted || 1), 0);
    const totalVolume = workouts.reduce((sum, w) => {
      const weight = parseFloat(w.weight) || 0;
      const reps = parseInt(w.reps) || 0;
      let volume = weight * reps;
      
      // Add drop set volume if it exists
      if (w.drops && Array.isArray(w.drops)) {
        w.drops.forEach((drop: any) => {
          if (drop.completed !== false) { // Include if completed is true or undefined (for backward compatibility)
            const dropWeight = parseFloat(drop.weight) || 0;
            const dropReps = parseInt(drop.reps) || 0;
            volume += dropWeight * dropReps;
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
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateKey = date.toDateString();
      const hasWorkout = workoutDays.has(dateKey);
      const isToday = dateKey === new Date().toDateString();
      
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            hasWorkout && styles.dayCellWithWorkout,
            isToday && styles.dayCellToday,
          ]}
          onPress={() => handleDayPress(day)}
          disabled={!hasWorkout}
        >
          <Text style={[
            styles.dayText,
            hasWorkout && styles.dayTextWithWorkout,
            isToday && styles.dayTextToday,
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            {!isCurrentMonth() ? (
              <TouchableOpacity 
                style={styles.todayButton}
                onPress={() => setCurrentDate(new Date())}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#71717a" />
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => navigateMonth(-1)}
            >
              <Ionicons name="chevron-back" size={20} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => navigateMonth(1)}
            >
              <Ionicons name="chevron-forward" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Day Names */}
          <View style={styles.dayNamesRow}>
            {dayNames.map(day => (
              <Text key={day} style={styles.dayName}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {renderCalendarDays()}
          </View>

          {/* Stats Summary */}
          <View style={styles.statsSummary}>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={24} color="#22d3ee" style={{marginBottom: 8}} />
              <Text style={styles.statValue}>{totalWorkoutSessions}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={24} color="#22d3ee" style={{marginBottom: 8}} />
              <Text style={styles.statValue}>
                {allWorkoutSessions.filter(sessionKey => {
                  const dateString = sessionKey.split('_').slice(1).join('_'); // Remove dayName part
                  const date = new Date(dateString);
                  return date.getMonth() === currentDate.getMonth() && 
                         date.getFullYear() === currentDate.getFullYear();
                }).length}
              </Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Day Detail Modal */}
      <Modal
        visible={showDayDetail}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDayDetail(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>
                {selectedDate?.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <TouchableOpacity onPress={() => setShowDayDetail(false)}>
                <Ionicons name="close" size={24} color="#71717a" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.detailContent}>
              {Array.from(groupWorkoutsByExercise(selectedDayWorkouts)).map(([exerciseName, sets]) => (
                <View key={exerciseName} style={styles.workoutItem}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.workoutExercise}>{exerciseName}</Text>
                    <Text style={styles.setsCount}>{sets.length} sets</Text>
                  </View>
                  <View style={styles.setsContainer}>
                    {sets.map((workout, index) => (
                      <View key={index}>
                        <View style={styles.setRow}>
                          <Text style={styles.setNumber}>Set {workout.setNumber || index + 1}</Text>
                          <Text style={styles.setDetails}>
                            {workout.weight}kg × {workout.reps} reps
                            {workout.drops && workout.drops.length > 0 && (
                              <Text style={styles.dropIndicator}> + {workout.drops.length} drops</Text>
                            )}
                          </Text>
                        </View>
                        {workout.drops && workout.drops.length > 0 && (
                          <View style={styles.calendarDropSets}>
                            {workout.drops.map((drop: any, dropIndex: number) => (
                              <View key={dropIndex} style={styles.calendarDropRow}>
                                <Text style={styles.calendarDropLabel}>
                                  Drop {dropIndex + 1}
                                </Text>
                                <Text style={styles.calendarDropDetails}>
                                  {drop.weight}kg × {drop.reps} reps
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

            <View style={styles.detailSummary}>
              {(() => {
                const { totalSets, totalVolume } = formatWorkoutSummary(selectedDayWorkouts);
                return (
                  <>
                    <Text style={styles.summaryText}>
                      Total Sets: {totalSets}
                    </Text>
                    <Text style={styles.summaryText}>
                      Total Volume: {totalVolume.toFixed(0)}kg
                    </Text>
                  </>
                );
              })()}
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0b',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  todayButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22d3ee',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#22d3ee',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNamesRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#52525b',
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellWithWorkout: {
    backgroundColor: '#22d3ee',
    borderRadius: 8,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: '#3f3f46',
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    color: '#52525b',
    fontWeight: '500',
  },
  dayTextWithWorkout: {
    color: '#0a0a0b',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#ffffff',
    fontWeight: '700',
  },
  statsSummary: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    padding: 20,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
  },
  statDivider: {
    width: 0,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#22d3ee',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Day Detail Modal Styles
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  detailContainer: {
    backgroundColor: '#0a0a0b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272a',
    width: '100%',
    maxHeight: '75%',
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#18181b',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailContent: {
    padding: 20,
  },
  workoutItem: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutExercise: {
    fontSize: 17,
    fontWeight: '700',
    color: '#22d3ee',
  },
  setsCount: {
    fontSize: 13,
    color: '#71717a',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0a0a0b',
    borderRadius: 8,
  },
  setNumber: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '600',
  },
  setDetails: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  dropIndicator: {
    fontSize: 12,
    color: '#22d3ee',
    fontWeight: '600',
  },
  calendarDropSets: {
    marginLeft: 12,
    marginTop: 4,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#22d3ee',
  },
  calendarDropRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  calendarDropLabel: {
    fontSize: 12,
    color: '#52525b',
    fontWeight: '600',
  },
  calendarDropDetails: {
    fontSize: 12,
    color: '#71717a',
    fontWeight: '600',
  },
  detailSummary: {
    padding: 20,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
});