import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkoutStorage, WorkoutRoutine } from '../utils/storage';
import WorkoutCalendar from '../components/WorkoutCalendar';
import ImportFeedbackModal from '../components/ImportFeedbackModal';
import { useImportFeedback } from '../hooks/useImportFeedback';
import { useRevenueCat } from '../contexts/RevenueCatContext';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

function RoutineCard({ routine, onExport, onPress, onLongPress }: { 
  routine: WorkoutRoutine; 
  onExport: () => void;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.8} 
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={800}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardTitle}>{routine.name}</Text>
          <Text style={styles.cardSubtitle}>
            {routine.days} days • {routine.blocks} blocks
          </Text>
        </View>
        <TouchableOpacity onPress={onExport} style={styles.exportButton}>
          <Ionicons name="share-outline" size={22} color="#22d3ee" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ route }: any) {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [shareModal, setShareModal] = useState<{ visible: boolean; routine: WorkoutRoutine | null }>({
    visible: false,
    routine: null,
  });
  const [successModal, setSuccessModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; routine: WorkoutRoutine | null }>({
    visible: false,
    routine: null,
  });
  const [calendarModal, setCalendarModal] = useState(false);
  
  const { showFeedbackModal, submitFeedback, skipFeedback, triggerFeedbackModal } = useImportFeedback();
  const { hasJSONPro } = useRevenueCat();

  // Load routines from storage on component mount
  useEffect(() => {
    loadRoutines();
  }, []);

  // Handle imported program
  useEffect(() => {
    if (route?.params?.importedProgram) {
      const program = route.params.importedProgram;
      const newRoutine: WorkoutRoutine = {
        id: Date.now().toString(),
        name: program.routine_name,
        days: program.days_per_week,
        blocks: program.blocks.length,
        data: program,
      };
      addRoutine(newRoutine);
      
      // Trigger feedback modal if the program has an import ID
      if (program.id) {
        setTimeout(() => {
          triggerFeedbackModal(program.id);
        }, 1000); // Give time for the program to be added to the list
      }
      
      // Clear the params to prevent re-adding
      navigation.setParams({ importedProgram: undefined } as any);
    }
  }, [route?.params?.importedProgram, triggerFeedbackModal]);

  const loadRoutines = async () => {
    const storedRoutines = await WorkoutStorage.loadRoutines();
    setRoutines(storedRoutines);
  };

  const addRoutine = async (routine: WorkoutRoutine) => {
    await WorkoutStorage.addRoutine(routine);
    setRoutines(prev => [...prev, routine]);
  };

  const handleExport = (routine: WorkoutRoutine) => {
    if (!routine.data) return;
    setShareModal({ visible: true, routine });
  };

  const handleShare = async (action: 'copy' | 'share') => {
    const routine = shareModal.routine;
    if (!routine?.data) return;
    
    const jsonString = JSON.stringify(routine.data, null, 2);
    
    if (action === 'copy') {
      await Clipboard.setStringAsync(jsonString);
      setShareModal({ visible: false, routine: null });
      setTimeout(() => {
        setSuccessModal(true);
      }, 100);
    } else if (action === 'share') {
      try {
        await Share.share({
          message: jsonString,
          title: `${routine.name} Workout`,
        });
        setShareModal({ visible: false, routine: null });
      } catch (error) {
        console.error('Error sharing:', error);
        setShareModal({ visible: false, routine: null });
      }
    }
  };

  const handleDeleteRequest = (routine: WorkoutRoutine) => {
    setDeleteModal({ visible: true, routine });
  };

  const handleDeleteConfirm = async () => {
    const routine = deleteModal.routine;
    if (!routine) return;

    try {
      await WorkoutStorage.removeRoutine(routine.id);
      setRoutines(prev => prev.filter(r => r.id !== routine.id));
      setDeleteModal({ visible: false, routine: null });
    } catch (error) {
      console.error('Failed to delete routine:', error);
    }
  };

  const renderContent = () => {
    if (routines.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No routines yet</Text>
        </View>
      );
    }

    if (routines.length === 1) {
      // Hero layout for single routine
      const routine = routines[0];
      return (
        <View style={styles.heroContainer}>
          <TouchableOpacity
            style={styles.heroCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Blocks' as any, { routine })}
            onLongPress={() => handleDeleteRequest(routine)}
            delayLongPress={800}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{routine.name}</Text>
              <Text style={styles.heroSubtitle}>
                {routine.days} days per week • {routine.blocks} blocks
              </Text>
              <Text style={styles.heroDescription}>
                Tap to start your workout
              </Text>
            </View>
            
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroActionButton}
                onPress={() => handleExport(routine)}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={24} color="#22d3ee" />
                <Text style={styles.heroActionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (routines.length === 2) {
      // Dual card layout for two routines
      return (
        <View style={styles.dualContainer}>
          {routines.map((routine, index) => (
            <TouchableOpacity
              key={routine.id}
              style={[styles.dualCard, index === 0 ? styles.dualCardFirst : styles.dualCardSecond]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Blocks' as any, { routine })}
              onLongPress={() => handleDeleteRequest(routine)}
              delayLongPress={800}
            >
              <View style={styles.dualContent}>
                <Text style={styles.dualTitle}>{routine.name}</Text>
                <Text style={styles.dualSubtitle}>
                  {routine.days} days • {routine.blocks} blocks
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.dualShareButton}
                onPress={() => handleExport(routine)}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={20} color="#22d3ee" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // List layout for multiple routines
    return (
      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RoutineCard
            routine={item}
            onExport={() => handleExport(item)}
            onPress={() => navigation.navigate('Blocks' as any, { routine: item })}
            onLongPress={() => handleDeleteRequest(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}

      {/* Calendar Button - Bottom Left */}
      <TouchableOpacity
        style={styles.calendarButton}
        onPress={() => setCalendarModal(true)}
        activeOpacity={0.9}
      >
        <Ionicons name="calendar-outline" size={24} color="#0a0a0b" />
      </TouchableOpacity>

      {/* Shop Button - Bottom Center - Hidden if user has JSON Pro */}
      {!hasJSONPro && (
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('Payment' as any)}
          activeOpacity={0.9}
        >
          <Ionicons name="storefront-outline" size={24} color="#0a0a0b" />
        </TouchableOpacity>
      )}

      {/* Add Routine FAB - Bottom Right */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ImportRoutine' as any)}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={28} color="#0a0a0b" />
      </TouchableOpacity>

      {/* Custom Share Modal */}
      <Modal
        visible={shareModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShareModal({ visible: false, routine: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Share Workout</Text>
            <Text style={styles.modalSubtitle}>
              Share "{shareModal.routine?.name}"
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleShare('copy')}
                activeOpacity={0.8}
              >
                <Ionicons name="copy-outline" size={20} color="#22d3ee" />
                <Text style={styles.modalButtonText}>Copy to Clipboard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => handleShare('share')}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={20} color="#22d3ee" />
                <Text style={styles.modalButtonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShareModal({ visible: false, routine: null })}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonCancelText]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Success Modal */}
      <Modal
        visible={successModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Copied!</Text>
            <Text style={styles.successMessage}>Workout JSON copied to clipboard</Text>
            
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={deleteModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModal({ visible: false, routine: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteContainer}>
            <Ionicons name="trash" size={48} color="#ef4444" />
            <Text style={styles.deleteTitle}>Delete Routine</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to delete "{deleteModal.routine?.name}"?{'\n\n'}
              This action cannot be undone, but your workout history will be preserved.
            </Text>
            
            <View style={styles.deleteButtons}>
              <TouchableOpacity
                style={[styles.deleteButton, styles.deleteCancelButton]}
                onPress={() => setDeleteModal({ visible: false, routine: null })}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.deleteButton, styles.deleteConfirmButton]}
                onPress={handleDeleteConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Workout Calendar */}
      <WorkoutCalendar
        visible={calendarModal}
        onClose={() => setCalendarModal(false)}
      />

      {/* Import Feedback Modal */}
      <ImportFeedbackModal
        visible={showFeedbackModal}
        onFeedback={submitFeedback}
        onSkip={skipFeedback}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  appHeader: {
    marginBottom: 24,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22d3ee',
    letterSpacing: 2,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyListContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#18181b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 20,
    marginBottom: 12,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#71717a',
  },
  exportButton: {
    padding: 8,
    marginLeft: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#71717a',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#52525b',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonCancelText: {
    color: '#71717a',
  },
  successContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 32,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#22d3ee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 80,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    textAlign: 'center',
  },
  deleteContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  deleteTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 16,
  },
  deleteMessage: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  deleteCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  deleteConfirmButton: {
    backgroundColor: '#ef4444',
  },
  deleteCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
  },
  deleteConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  heroContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    minHeight: 320,
    justifyContent: 'center',
    shadowColor: '#22d3ee',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    // Add a subtle inner glow effect with multiple shadows
    shadowColor: '#22d3ee',
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 42,
    textShadowColor: '#22d3ee40',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 16,
    color: '#22d3ee',
    textAlign: 'center',
    fontWeight: '500',
  },
  heroActions: {
    width: '100%',
    alignItems: 'center',
  },
  heroActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  heroActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22d3ee',
  },
  dualContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 100,
    gap: 20,
  },
  dualCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    padding: 24,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 120,
  },
  dualCardFirst: {
    borderColor: '#22d3ee40',
  },
  dualCardSecond: {
    borderColor: '#a855f740',
  },
  dualContent: {
    flex: 1,
  },
  dualTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    lineHeight: 28,
  },
  dualSubtitle: {
    fontSize: 14,
    color: '#71717a',
  },
  dualShareButton: {
    backgroundColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  
  // Calendar button styles
  calendarButton: {
    position: 'absolute',
    left: 16,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Shop button styles
  shopButton: {
    position: 'absolute',
    left: '50%',
    bottom: 32,
    marginLeft: -28, // Half of width to center
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: '#a855f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
});