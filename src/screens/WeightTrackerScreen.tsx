import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutStorage } from '../utils/storage';
import RobustStorage from '../utils/robustStorage';
import { sendTestimonial } from '../services/feedbackApi';

interface ProgressPhoto {
  uri: string;
  type: 'front' | 'side_left' | 'back' | 'side_right' | 'extra';
  timestamp: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;
  notes?: string;
  photos?: ProgressPhoto[];
}

const WeightTrackerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { themeColor, themeColorLight } = useTheme();
  
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [currentWeight, setCurrentWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [notes, setNotes] = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [testimonialText, setTestimonialText] = useState('');
  const [returnContext, setReturnContext] = useState<string | null>(null);
  const [selectedStartWeight, setSelectedStartWeight] = useState<WeightEntry | null>(null);
  const [showWeightPicker, setShowWeightPicker] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [showPhotoSection, setShowPhotoSection] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<WeightEntry | null>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [viewerPhotos, setViewerPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedBeforePhotos, setSelectedBeforePhotos] = useState<ProgressPhoto[]>([]);
  const [currentAfterPhotos, setCurrentAfterPhotos] = useState<ProgressPhoto[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isSubmittingTestimonial, setIsSubmittingTestimonial] = useState(false);

  useEffect(() => {
    loadWeightHistory();
    loadUserSettings();
    checkReturnContext();
  }, []);

  const checkReturnContext = async () => {
    try {
      const context = await AsyncStorage.getItem('@nutrition_return_context');
      if (context) {
        console.log('⚖️ [WEIGHT] Found return context:', context);
        setReturnContext(context);
      }
    } catch (error) {
      console.error('Failed to check return context:', error);
    }
  };

  const loadWeightHistory = async () => {
    try {
      console.log('⚖️ [WEIGHT] Loading weight history with ROBUST STORAGE...');
      
      // Run health check first
      const healthCheck = await RobustStorage.healthCheck();
      console.log('⚖️ [WEIGHT] Storage health check:', healthCheck);
      
      // Try robust storage first
      let stored = await RobustStorage.getItem('@weight_history', true);
      let dataSource = 'robust';
      
      if (!stored) {
        // Fallback to legacy storage for migration
        console.log('⚖️ [WEIGHT] No data in robust storage, checking legacy storage...');
        stored = await AsyncStorage.getItem('@weight_history');
        dataSource = 'legacy';
        
        if (stored) {
          // Migrate to robust storage
          console.log('⚖️ [WEIGHT] 🔄 Migrating legacy weight data to robust storage...');
          await RobustStorage.setItem('@weight_history', stored, true);
          dataSource = 'migrated';
        }
      }
      
      if (stored) {
        const history: WeightEntry[] = JSON.parse(stored);
        console.log(`⚖️ [WEIGHT] Loaded ${history.length} weight entries from ${dataSource} storage`);
        setWeightHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } else {
        console.log('⚖️ [WEIGHT] No weight history found');
      }
    } catch (error) {
      console.error('Failed to load weight history:', error);
    }
  };

  const loadUserSettings = async () => {
    try {
      const nutritionResults = await WorkoutStorage.loadNutritionResults();
      if (nutritionResults?.formData?.weightUnit) {
        setWeightUnit(nutritionResults.formData.weightUnit);
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  };

  const saveWeight = async () => {
    if (!currentWeight.trim()) {
      Alert.alert('Error', 'Please enter your weight');
      return;
    }

    const weightValue = parseFloat(currentWeight);
    if (isNaN(weightValue) || weightValue <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    const newEntry: WeightEntry = {
      id: Date.now().toString(),
      weight: weightValue,
      unit: weightUnit,
      date: new Date().toISOString(),
      notes: notes.trim() || undefined,
      photos: progressPhotos.length > 0 ? [...progressPhotos] : undefined,
    };

    try {
      const updatedHistory = [newEntry, ...weightHistory];
      
      console.log('⚖️ [WEIGHT] 💾 Saving weight entry with robust storage...');
      console.log('⚖️ [WEIGHT] New entry:', { weight: newEntry.weight, unit: newEntry.unit, date: newEntry.date });
      
      // Save using robust storage with redundancy
      const saveSuccess = await RobustStorage.setItem('@weight_history', JSON.stringify(updatedHistory), true);
      console.log(`⚖️ [WEIGHT] Robust save result: ${saveSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (!saveSuccess) {
        console.error('⚖️ [WEIGHT] ❌ Robust save failed, trying emergency fallback...');
        await AsyncStorage.setItem('@weight_history', JSON.stringify(updatedHistory));
      }
      
      setWeightHistory(updatedHistory);
      
      // Update nutrition results with latest weight
      await updateNutritionWeight(weightValue);
      
      setCurrentWeight('');
      setNotes('');
      setProgressPhotos([]);
      setShowPhotoSection(false);
      setShowUpdateModal(false);
      
      // Handle return navigation to questionnaire
      if (returnContext === 'NutritionQuestionnaireStep3') {
        console.log('⚖️ [WEIGHT] Returning to nutrition questionnaire...');
        // Clear return context
        await AsyncStorage.removeItem('@nutrition_return_context');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to save weight:', error);
      Alert.alert('Error', 'Failed to save weight. Please try again.');
    }
  };

  const updateNutritionWeight = async (newWeight: number) => {
    try {
      const nutritionResults = await WorkoutStorage.loadNutritionResults();
      if (nutritionResults) {
        const updatedResults = {
          ...nutritionResults,
          formData: {
            ...nutritionResults.formData,
            weight: newWeight.toString(),
          },
        };
        await WorkoutStorage.saveNutritionResults(updatedResults);
      }
    } catch (error) {
      console.error('Failed to update nutrition weight:', error);
    }
  };

  const deleteWeightEntry = async (entryId: string) => {
    try {
      const updatedHistory = weightHistory.filter(entry => entry.id !== entryId);
      
      console.log('⚖️ [WEIGHT] 🗑️ Deleting weight entry...');
      
      // Save updated history with robust storage
      const saveSuccess = await RobustStorage.setItem('@weight_history', JSON.stringify(updatedHistory), true);
      console.log(`⚖️ [WEIGHT] Delete save result: ${saveSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (!saveSuccess) {
        console.error('⚖️ [WEIGHT] ❌ Robust save failed, trying emergency fallback...');
        await AsyncStorage.setItem('@weight_history', JSON.stringify(updatedHistory));
      }
      
      setWeightHistory(updatedHistory);
      
      // If we deleted the latest entry, update nutrition with the new latest weight
      if (updatedHistory.length > 0 && entryId === weightHistory[0].id) {
        await updateNutritionWeight(updatedHistory[0].weight);
      }
    } catch (error) {
      console.error('Failed to delete weight entry:', error);
      Alert.alert('Error', 'Failed to delete weight entry. Please try again.');
    }
  };

  const confirmDelete = (entry: WeightEntry) => {
    Alert.alert(
      'Delete Weight Entry',
      `Are you sure you want to delete the entry for ${entry.weight} ${entry.unit} from ${formatDate(entry.date)}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteWeightEntry(entry.id),
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need camera roll permissions to save your progress photos.');
      return false;
    }
    return true;
  };

  const selectPhoto = async (photoType: ProgressPhoto['type']) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhoto: ProgressPhoto = {
        uri: result.assets[0].uri,
        type: photoType,
        timestamp: new Date().toISOString(),
      };
      
      // Replace existing photo of the same type or add new one
      setProgressPhotos(prev => {
        const filtered = prev.filter(photo => photo.type !== photoType);
        return [...filtered, newPhoto];
      });
    }
  };

  const removePhoto = (photoType: ProgressPhoto['type']) => {
    setProgressPhotos(prev => prev.filter(photo => photo.type !== photoType));
  };

  const getPhotoByType = (type: ProgressPhoto['type']) => {
    return progressPhotos.find(photo => photo.type === type);
  };

  const openPhotoViewer = (photos: ProgressPhoto[], startIndex: number) => {
    setViewerPhotos(photos);
    setSelectedPhotoIndex(startIndex);
    setShowPhotoViewer(true);
  };

  const nextPhoto = () => {
    setSelectedPhotoIndex((prev) => (prev + 1) % viewerPhotos.length);
  };

  const previousPhoto = () => {
    setSelectedPhotoIndex((prev) => (prev - 1 + viewerPhotos.length) % viewerPhotos.length);
  };

  const selectCurrentPhoto = async (photoType: ProgressPhoto['type']) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhoto: ProgressPhoto = {
        uri: result.assets[0].uri,
        type: photoType,
        timestamp: new Date().toISOString(),
      };
      
      setCurrentAfterPhotos(prev => {
        const filtered = prev.filter(photo => photo.type !== photoType);
        return [...filtered, newPhoto];
      });
    }
  };

  const toggleBeforePhotoSelection = (photo: ProgressPhoto) => {
    setSelectedBeforePhotos(prev => {
      const isSelected = prev.some(p => p.uri === photo.uri);
      if (isSelected) {
        return prev.filter(p => p.uri !== photo.uri);
      } else {
        return [...prev, photo];
      }
    });
  };

  const getWeightDifference = () => {
    if (weightHistory.length < 2) return null;
    
    const latest = weightHistory[0];
    const first = weightHistory[weightHistory.length - 1]; // First entry (oldest)
    
    let latestWeight = latest.weight;
    let firstWeight = first.weight;
    
    if (latest.unit !== first.unit) {
      if (latest.unit === 'kg' && first.unit === 'lbs') {
        firstWeight = firstWeight * 0.453592;
      } else if (latest.unit === 'lbs' && first.unit === 'kg') {
        firstWeight = firstWeight * 2.20462;
      }
    }
    
    const diff = latestWeight - firstWeight;
    
    return {
      value: Math.abs(diff),
      unit: latest.unit,
      isPositive: diff > 0,
    };
  };

  const getTestimonialStats = () => {
    if (weightHistory.length < 1) return null;
    
    const latestEntry = weightHistory[0];
    const startEntry = selectedStartWeight || (weightHistory.length < 2 ? null : weightHistory[weightHistory.length - 1]);
    
    if (!startEntry) return null;
    
    // Convert weights to same unit for calculation
    let startWeight = startEntry.weight;
    let currentWeight = latestEntry.weight;
    
    if (startEntry.unit !== latestEntry.unit) {
      if (latestEntry.unit === 'kg' && startEntry.unit === 'lbs') {
        startWeight = startWeight * 0.453592;
      } else if (latestEntry.unit === 'lbs' && startEntry.unit === 'kg') {
        startWeight = startWeight * 2.20462;
      }
    }
    
    const weightLoss = startWeight - currentWeight;
    const startDate = new Date(startEntry.date);
    const currentDate = new Date(latestEntry.date);
    const transformationDays = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      startWeight: startEntry.weight,
      startUnit: startEntry.unit,
      currentWeight: latestEntry.weight,
      currentUnit: latestEntry.unit,
      weightLoss: Math.abs(weightLoss),
      transformationDays,
      isWeightLoss: weightLoss > 0,
      startDate: formatDate(startEntry.date),
      currentDate: formatDate(latestEntry.date),
    };
  };

  const weightDiff = getWeightDifference();
  const latestEntry = weightHistory[0];
  const testimonialStats = getTestimonialStats();

  // History View
  if (showHistory) {
    // Show photo viewer if a photo is selected
    if (showPhotoViewer && viewerPhotos.length > 0) {
      return (
        <View style={[styles.container, { backgroundColor: '#000000' }]}>
          <View style={styles.photoViewerHeader}>
            <TouchableOpacity onPress={() => setShowPhotoViewer(false)}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.photoViewerTitle}>
              {viewerPhotos[selectedPhotoIndex] 
                ? viewerPhotos[selectedPhotoIndex].type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                : 'Photo'
              }
            </Text>
            <Text style={styles.photoCounter}>
              {selectedPhotoIndex + 1} / {viewerPhotos.length}
            </Text>
          </View>

          <View style={styles.photoViewerContent}>
            <Image 
              source={{ uri: viewerPhotos[selectedPhotoIndex].uri }} 
              style={styles.fullscreenPhoto}
              resizeMode="contain"
            />

          </View>

          {/* Bottom Navigation */}
          {viewerPhotos.length > 1 && (
            <View style={styles.bottomNavigation}>
              <TouchableOpacity 
                style={styles.bottomNavButton}
                onPress={previousPhoto}
              >
                <Ionicons name="chevron-back" size={40} color="#ffffff" />
              </TouchableOpacity>
              
              {/* Photo Dots Indicator */}
              <View style={styles.photoIndicators}>
                {viewerPhotos.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.photoIndicatorDot,
                      { backgroundColor: index === selectedPhotoIndex ? themeColor : 'rgba(255, 255, 255, 0.3)' }
                    ]}
                    onPress={() => setSelectedPhotoIndex(index)}
                  />
                ))}
              </View>
              
              <TouchableOpacity 
                style={styles.bottomNavButton}
                onPress={nextPhoto}
              >
                <Ionicons name="chevron-forward" size={40} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    // Show detailed view if an entry is selected
    if (showHistoryDetail && selectedHistoryEntry) {
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => {
              setShowHistoryDetail(false);
              setSelectedHistoryEntry(null);
            }} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={themeColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: '#ffffff' }]}>Weight Entry</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.historyDetailContent}>
            {/* Weight Info */}
            <View style={styles.weightInfoCard}>
              <Text style={[styles.weightInfoValue, { color: themeColor }]}>
                {selectedHistoryEntry.weight} {selectedHistoryEntry.unit}
              </Text>
              <Text style={styles.weightInfoDate}>
                {formatDate(selectedHistoryEntry.date)}
              </Text>
              {selectedHistoryEntry.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.notesSectionTitle}>Notes</Text>
                  <Text style={styles.notesText}>{selectedHistoryEntry.notes}</Text>
                </View>
              )}
            </View>

            {/* Progress Photos */}
            {selectedHistoryEntry.photos && selectedHistoryEntry.photos.length > 0 && (
              <View style={styles.photosSection}>
                <Text style={styles.photosSectionTitle}>
                  Progress Photos ({selectedHistoryEntry.photos.length})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosGallery}>
                  {selectedHistoryEntry.photos.map((photo, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={styles.galleryPhotoContainer}
                      onPress={() => {
                        setViewerPhotos(selectedHistoryEntry.photos!);
                        setSelectedPhotoIndex(index);
                        setShowPhotoViewer(true);
                      }}
                    >
                      <Image source={{ uri: photo.uri }} style={styles.galleryPhoto} />
                      <Text style={styles.photoTypeLabel}>
                        {photo.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>
        </View>
      );
    }

    // Show history list
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={themeColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#ffffff' }]}>Weight History</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.historyContainer}>
          {weightHistory.length > 0 ? (
            weightHistory.map((entry) => (
              <TouchableOpacity 
                key={entry.id} 
                style={[styles.historyItem, { borderColor: themeColor + '30' }]}
                onPress={() => {
                  setSelectedHistoryEntry(entry);
                  setShowHistoryDetail(true);
                }}
                onLongPress={() => confirmDelete(entry)}
              >
                <View style={styles.historyLeft}>
                  <Text style={styles.historyWeight}>{entry.weight} {entry.unit}</Text>
                  <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                </View>
                <View style={styles.historyRight}>
                  {entry.notes && (
                    <Text style={styles.historyNotes}>{entry.notes}</Text>
                  )}
                  {(entry.photos && entry.photos.length > 0) && (
                    <View style={styles.photoIndicator}>
                      <Ionicons name="camera" size={14} color={themeColor} />
                      <Text style={[styles.photoCount, { color: themeColor }]}>
                        {entry.photos.length}
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color="#71717a" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noHistoryText}>No weight history yet</Text>
          )}
        </View>
      </View>
    );
  }

  // Main Weight Display
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#ffffff' }]}>
          {returnContext === 'NutritionQuestionnaireStep3' ? 'Update Weight' : 'Weight Tracker'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.headerActionButton}>
            <Ionicons name="time-outline" size={22} color={themeColor} />
          </TouchableOpacity>
          {weightHistory.length > 0 && (
            <TouchableOpacity onPress={() => setShowTestimonialModal(true)} style={styles.headerActionButton}>
              <Ionicons name="star-outline" size={22} color={themeColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* AI Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: themeColor + '20', borderColor: themeColor + '30' }]}>
        <Ionicons name="bulb-outline" size={20} color={themeColor} />
        <Text style={[styles.infoText, { color: '#ffffff' }]}>
          Your weight helps the AI create accurate meal plans with proper calories and macros
        </Text>
      </View>

      {/* Main Weight Display */}
      <View style={styles.weightDisplayContainer}>
        {latestEntry ? (
          <View style={[styles.weightCard, { 
            borderColor: themeColor + '30',
            shadowColor: themeColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 16,
          }]}>
            <Text style={styles.weightLabel}>Current Weight</Text>
            <View style={styles.weightValueContainer}>
              <Text style={[styles.weightValue, { color: themeColor, textShadowColor: themeColorLight }]}>
                {latestEntry.weight}
              </Text>
              <Text style={[styles.weightUnit, { color: themeColor }]}>
                {latestEntry.unit}
              </Text>
            </View>
            <Text style={styles.lastUpdated}>
              Last updated {formatDate(latestEntry.date)}
            </Text>
            
            {weightDiff && (
              <View style={styles.changeContainer}>
                <View style={[styles.changeBadge, { 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                }]}>
                  <Ionicons 
                    name={weightDiff.isPositive ? "trending-up" : "trending-down"} 
                    size={16} 
                    color="#ffffff" 
                  />
                  <Text style={[styles.changeText, { 
                    color: "#ffffff" 
                  }]}>
                    {weightDiff.isPositive ? '+' : '-'}{weightDiff.value.toFixed(1)} {weightDiff.unit} total
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="fitness" size={64} color={themeColor + '40'} />
            </View>
            <Text style={styles.emptyStateTitle}>Track Your Weight</Text>
            <Text style={styles.emptyStateSubtitle}>
              Add your weight to help the AI create personalized meal plans
            </Text>
          </View>
        )}
      </View>

      {/* Update Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.updateButton, { 
            backgroundColor: themeColor,
            shadowColor: themeColor 
          }]}
          onPress={() => setShowUpdateModal(true)}
        >
          <Ionicons name="add" size={20} color="#0a0a0b" />
          <Text style={styles.updateButtonText}>
            {latestEntry ? 'Update Weight' : 'Add First Weight'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Update Modal */}
      <Modal
        visible={showUpdateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
        >
          <View style={styles.modalInnerContainer}>
          <View style={[styles.modalContainer, { borderColor: themeColor + '30' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                  <Ionicons name="close" size={24} color="#a1a1aa" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalHeaderCenter}>
                <Text style={[styles.modalTitle, { color: '#ffffff' }]}>Update Weight</Text>
              </View>
              <View style={styles.modalHeaderRight} />
            </View>

            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.weightInputRow}>
                <TextInput
                  style={[styles.weightInput, { color: '#ffffff', borderColor: themeColor + '30' }]}
                  value={currentWeight}
                  onChangeText={setCurrentWeight}
                  placeholder={`Enter weight in ${weightUnit}`}
                  placeholderTextColor="#71717a"
                  keyboardType="numeric"
                  autoFocus
                />
                
                <View style={styles.unitSelector}>
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      weightUnit === 'kg' && { backgroundColor: themeColor }
                    ]}
                    onPress={() => setWeightUnit('kg')}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      { color: weightUnit === 'kg' ? '#0a0a0b' : '#ffffff' }
                    ]}>kg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      weightUnit === 'lbs' && { backgroundColor: themeColor }
                    ]}
                    onPress={() => setWeightUnit('lbs')}
                  >
                    <Text style={[
                      styles.unitButtonText,
                      { color: weightUnit === 'lbs' ? '#0a0a0b' : '#ffffff' }
                    ]}>lbs</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={[styles.notesInput, { color: '#ffffff', borderColor: themeColor + '30' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes (e.g., morning weigh-in, after workout)"
                placeholderTextColor="#71717a"
                multiline
                numberOfLines={3}
              />

              {/* Progress Photos Section */}
              <View style={styles.photoSection}>
                <TouchableOpacity 
                  style={styles.photoSectionHeader}
                  onPress={() => setShowPhotoSection(!showPhotoSection)}
                >
                  <Ionicons name="camera" size={20} color={themeColor} />
                  <Text style={styles.photoSectionTitle}>
                    Progress Photos {progressPhotos.length > 0 && `(${progressPhotos.length})`}
                  </Text>
                  <Ionicons 
                    name={showPhotoSection ? "chevron-up" : "chevron-down"} 
                    size={16} 
                    color={themeColor} 
                  />
                </TouchableOpacity>

                {showPhotoSection && (
                  <View style={styles.photoGrid}>
                    {/* Front Photo */}
                    <View style={styles.photoSlot}>
                      <TouchableOpacity 
                        style={styles.photoButton}
                        onPress={() => selectPhoto('front')}
                      >
                        {getPhotoByType('front') ? (
                          <View style={styles.photoContainer}>
                            <Image 
                              source={{ uri: getPhotoByType('front')?.uri }} 
                              style={styles.progressPhoto}
                            />
                            <TouchableOpacity 
                              style={styles.removePhotoButton}
                              onPress={() => removePhoto('front')}
                            >
                              <Ionicons name="close-circle" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.emptyPhotoSlot}>
                            <Ionicons name="camera-outline" size={24} color="#71717a" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <Text style={styles.photoLabel}>Front</Text>
                    </View>

                    {/* Side Left Photo */}
                    <View style={styles.photoSlot}>
                      <TouchableOpacity 
                        style={styles.photoButton}
                        onPress={() => selectPhoto('side_left')}
                      >
                        {getPhotoByType('side_left') ? (
                          <View style={styles.photoContainer}>
                            <Image 
                              source={{ uri: getPhotoByType('side_left')?.uri }} 
                              style={styles.progressPhoto}
                            />
                            <TouchableOpacity 
                              style={styles.removePhotoButton}
                              onPress={() => removePhoto('side_left')}
                            >
                              <Ionicons name="close-circle" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.emptyPhotoSlot}>
                            <Ionicons name="camera-outline" size={24} color="#71717a" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <Text style={styles.photoLabel}>Side L</Text>
                    </View>

                    {/* Back Photo */}
                    <View style={styles.photoSlot}>
                      <TouchableOpacity 
                        style={styles.photoButton}
                        onPress={() => selectPhoto('back')}
                      >
                        {getPhotoByType('back') ? (
                          <View style={styles.photoContainer}>
                            <Image 
                              source={{ uri: getPhotoByType('back')?.uri }} 
                              style={styles.progressPhoto}
                            />
                            <TouchableOpacity 
                              style={styles.removePhotoButton}
                              onPress={() => removePhoto('back')}
                            >
                              <Ionicons name="close-circle" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.emptyPhotoSlot}>
                            <Ionicons name="camera-outline" size={24} color="#71717a" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <Text style={styles.photoLabel}>Back</Text>
                    </View>

                    {/* Side Right Photo */}
                    <View style={styles.photoSlot}>
                      <TouchableOpacity 
                        style={styles.photoButton}
                        onPress={() => selectPhoto('side_right')}
                      >
                        {getPhotoByType('side_right') ? (
                          <View style={styles.photoContainer}>
                            <Image 
                              source={{ uri: getPhotoByType('side_right')?.uri }} 
                              style={styles.progressPhoto}
                            />
                            <TouchableOpacity 
                              style={styles.removePhotoButton}
                              onPress={() => removePhoto('side_right')}
                            >
                              <Ionicons name="close-circle" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.emptyPhotoSlot}>
                            <Ionicons name="camera-outline" size={24} color="#71717a" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <Text style={styles.photoLabel}>Side R</Text>
                    </View>

                    {/* Extra Photo */}
                    <View style={styles.photoSlot}>
                      <TouchableOpacity 
                        style={styles.photoButton}
                        onPress={() => selectPhoto('extra')}
                      >
                        {getPhotoByType('extra') ? (
                          <View style={styles.photoContainer}>
                            <Image 
                              source={{ uri: getPhotoByType('extra')?.uri }} 
                              style={styles.progressPhoto}
                            />
                            <TouchableOpacity 
                              style={styles.removePhotoButton}
                              onPress={() => removePhoto('extra')}
                            >
                              <Ionicons name="close-circle" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.emptyPhotoSlot}>
                            <Ionicons name="camera-outline" size={24} color="#71717a" />
                          </View>
                        )}
                      </TouchableOpacity>
                      <Text style={styles.photoLabel}>Extra</Text>
                    </View>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { 
                  backgroundColor: themeColor,
                  shadowColor: themeColor 
                }]}
                onPress={saveWeight}
              >
                <Text style={styles.saveButtonText}>Save Weight</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Simple Testimonial Modal */}
      <Modal
        visible={showTestimonialModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setShowTestimonialModal(false);
          setSelectedStartWeight(null);
          setTestimonialText('');
          setSelectedBeforePhotos([]);
          setCurrentAfterPhotos([]);
        }}
      >
        <View style={styles.testimonialFullscreen}>
          <KeyboardAvoidingView 
            style={styles.testimonialContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Clean Header */}
            <View style={styles.simpleHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setShowTestimonialModal(false);
                  setSelectedStartWeight(null);
                  setTestimonialText('');
                  setSelectedBeforePhotos([]);
                  setCurrentAfterPhotos([]);
                }}
              >
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              
              <Text style={styles.headerTitle}>Share Story</Text>
              
              <View style={{ width: 60 }} />
            </View>

            <ScrollView 
              ref={scrollViewRef}
              style={styles.simpleContent}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={true}
            >
              {weightHistory.length > 0 && (
                <>
                  {/* Weight Selection */}
                  <View style={styles.weightSelectionCard}>
                    <Text style={styles.weightSelectionTitle}>Choose Your Starting Point</Text>
                    {selectedStartWeight ? (
                      <TouchableOpacity 
                        style={[styles.selectedWeightButton, { borderColor: themeColor }]}
                        onPress={() => setShowWeightPicker(!showWeightPicker)}
                      >
                        <View style={styles.selectedWeightContent}>
                          <Text style={styles.selectedWeightText}>
                            {selectedStartWeight.weight} {selectedStartWeight.unit}
                          </Text>
                          <Text style={styles.selectedWeightDate}>
                            {formatDate(selectedStartWeight.date)}
                          </Text>
                        </View>
                        <Ionicons 
                          name={showWeightPicker ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color={themeColor} 
                        />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.chooseWeightButton, { backgroundColor: themeColor + '20', borderColor: themeColor }]}
                        onPress={() => setShowWeightPicker(!showWeightPicker)}
                      >
                        <Ionicons name="scale-outline" size={20} color={themeColor} />
                        <Text style={[styles.chooseWeightText, { color: themeColor }]}>
                          Choose Start Weight
                        </Text>
                        <Ionicons 
                          name={showWeightPicker ? "chevron-up" : "chevron-down"} 
                          size={16} 
                          color={themeColor} 
                        />
                      </TouchableOpacity>
                    )}

                    {/* Inline Weight Options */}
                    {showWeightPicker && (
                      <ScrollView 
                        style={[styles.inlineWeightList, { maxHeight: 300 }]}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      >
                        {weightHistory.map((entry, index) => (
                          <TouchableOpacity
                            key={entry.id}
                            style={[
                              styles.inlineWeightItem,
                              { 
                                borderColor: selectedStartWeight?.id === entry.id ? themeColor : 'rgba(255, 255, 255, 0.1)',
                                backgroundColor: selectedStartWeight?.id === entry.id ? themeColor + '10' : 'transparent'
                              }
                            ]}
                            onPress={() => {
                              setSelectedStartWeight(entry);
                              setShowWeightPicker(false);
                            }}
                          >
                            <View style={styles.inlineWeightContent}>
                              <Text style={styles.inlineWeightText}>
                                {entry.weight} {entry.unit}
                              </Text>
                              <Text style={styles.inlineWeightDate}>
                                {formatDate(entry.date)}
                              </Text>
                              {entry.notes && (
                                <Text style={styles.inlineWeightNotes}>
                                  {entry.notes}
                                </Text>
                              )}
                            </View>
                            {selectedStartWeight?.id === entry.id && (
                              <Ionicons name="checkmark-circle" size={20} color={themeColor} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>

                  {testimonialStats ? (
                    <View style={styles.simpleStatsCard}>
                      <Text style={styles.simpleStatsTitle}>Your Progress</Text>
                      
                      <View style={styles.simpleStatsRow}>
                        <View style={styles.simpleStat}>
                          <Text style={styles.simpleStatValue}>{testimonialStats.startWeight}</Text>
                          <Text style={styles.simpleStatLabel}>Started</Text>
                        </View>
                        
                        <Text style={[styles.simpleArrow, { color: themeColor }]}>→</Text>
                        
                        <View style={styles.simpleStat}>
                          <Text style={[styles.simpleStatValue, { color: themeColor }]}>{testimonialStats.currentWeight}</Text>
                          <Text style={styles.simpleStatLabel}>Current</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.simpleProgress}>
                        {testimonialStats.isWeightLoss ? 'Lost' : 'Gained'} {testimonialStats.weightLoss.toFixed(1)} {testimonialStats.currentUnit} in {testimonialStats.transformationDays} days
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.simpleStatsCard}>
                      <Text style={styles.simpleStatsTitle}>Current Weight</Text>
                      <Text style={[styles.simpleCurrentWeight, { color: themeColor }]}>
                        {latestEntry?.weight} {latestEntry?.unit}
                      </Text>
                      <Text style={styles.simpleMotivation}>Share your fitness journey</Text>
                    </View>
                  )}

                  {/* Photo Selection for Testimonial */}
                  {selectedStartWeight && (
                    <View style={styles.testimonialPhotoSection}>
                      <Text style={styles.testimonialPhotoTitle}>Add Photos to Your Story</Text>
                      
                      {/* Before Photos Selection */}
                      {selectedStartWeight.photos && selectedStartWeight.photos.length > 0 && (
                        <View style={styles.beforePhotosSection}>
                          <Text style={styles.beforePhotosLabel}>
                            Choose "Before" photos from {formatDate(selectedStartWeight.date)}:
                          </Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.beforePhotosScroll}>
                            {selectedStartWeight.photos.map((photo, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.selectablePhoto,
                                  { borderColor: selectedBeforePhotos.some(p => p.uri === photo.uri) ? themeColor : 'rgba(255, 255, 255, 0.2)' }
                                ]}
                                onPress={() => toggleBeforePhotoSelection(photo)}
                              >
                                <Image source={{ uri: photo.uri }} style={styles.selectablePhotoImage} />
                                {selectedBeforePhotos.some(p => p.uri === photo.uri) && (
                                  <View style={styles.photoSelectionOverlay}>
                                    <Ionicons name="checkmark-circle" size={24} color={themeColor} />
                                  </View>
                                )}
                                <Text style={styles.selectablePhotoLabel}>
                                  {photo.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}

                      {/* Current After Photos */}
                      <View style={styles.afterPhotosSection}>
                        <Text style={styles.afterPhotosLabel}>Add "After" photos from today:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.afterPhotosScroll}>
                          {(['front', 'side_left', 'back', 'side_right', 'extra'] as const).map((photoType) => {
                            const existingPhoto = currentAfterPhotos.find(p => p.type === photoType);
                            return (
                              <TouchableOpacity
                                key={photoType}
                                style={styles.addPhotoSlot}
                                onPress={() => selectCurrentPhoto(photoType)}
                              >
                                {existingPhoto ? (
                                  <View style={styles.addedPhotoContainer}>
                                    <Image source={{ uri: existingPhoto.uri }} style={styles.addedPhotoImage} />
                                    <TouchableOpacity 
                                      style={styles.removeAddedPhoto}
                                      onPress={() => setCurrentAfterPhotos(prev => prev.filter(p => p.type !== photoType))}
                                    >
                                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                  </View>
                                ) : (
                                  <View style={styles.emptyAddPhotoSlot}>
                                    <Ionicons name="camera-outline" size={24} color="#71717a" />
                                  </View>
                                )}
                                <Text style={styles.addPhotoLabel}>
                                  {photoType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </View>
                  )}

                  <View style={styles.simpleInputSection}>
                    <Text style={styles.simpleInputLabel}>
                      {testimonialStats ? 'Share your story' : 'Tell us about your journey'}
                    </Text>
                    
                    <TextInput
                      style={[styles.simpleInput, { borderColor: themeColor + '20' }]}
                      value={testimonialText}
                      onChangeText={setTestimonialText}
                      placeholder={testimonialStats 
                        ? "What worked for you? How do you feel?" 
                        : "What motivated you to start your fitness journey?"
                      }
                      placeholderTextColor="#a1a1aa"
                      multiline
                      numberOfLines={6}
                      onFocus={() => {
                        // Close weight picker to give more space and scroll to text input
                        if (showWeightPicker) {
                          setShowWeightPicker(false);
                        }
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 100);
                      }}
                      maxLength={300}
                    />
                    
                    <Text style={styles.simpleCharCount}>{testimonialText.length}/300</Text>
                  </View>

                  <Text style={styles.simpleConsent}>
                    Your story will be shared anonymously to inspire others
                  </Text>

                  <TouchableOpacity
                    style={[styles.simpleSubmitButton, { 
                      backgroundColor: isSubmittingTestimonial ? themeColor + '60' : themeColor,
                      opacity: isSubmittingTestimonial ? 0.6 : 1 
                    }]}
                    onPress={async () => {
                      if (!latestEntry || isSubmittingTestimonial) return;
                      
                      setIsSubmittingTestimonial(true);
                      
                      try {
                        console.log('📝 [TESTIMONIAL] Submitting testimonial...');
                        
                        if (testimonialStats) {
                          // Transformation testimonial with photos
                          const beforePhotoUris = selectedBeforePhotos.map(photo => photo.uri);
                          const afterPhotoUris = currentAfterPhotos.map(photo => photo.uri);
                          
                          await sendTestimonial(
                            testimonialText.trim() || `Amazing transformation! ${testimonialStats.isWeightLoss ? 'Lost' : 'Gained'} ${testimonialStats.weightLoss.toFixed(1)} ${testimonialStats.currentUnit} in ${testimonialStats.transformationDays} days using this app.`,
                            testimonialStats.startWeight,
                            testimonialStats.currentWeight,
                            testimonialStats.currentUnit,
                            testimonialStats.transformationDays,
                            true,
                            beforePhotoUris,
                            afterPhotoUris
                          );
                        } else {
                          // General journey testimonial with current photos
                          const currentPhotoUris = currentAfterPhotos.map(photo => photo.uri);
                          
                          await sendTestimonial(
                            testimonialText.trim() || `Starting my fitness journey at ${latestEntry.weight} ${latestEntry.unit}! Excited to see my progress with this app.`,
                            latestEntry.weight,
                            latestEntry.weight,
                            latestEntry.unit,
                            0,
                            true,
                            [],
                            currentPhotoUris
                          );
                        }
                        
                        setShowTestimonialModal(false);
                        setTestimonialText('');
                        setSelectedStartWeight(null);
                        setSelectedBeforePhotos([]);
                        setCurrentAfterPhotos([]);
                        setIsSubmittingTestimonial(false);
                        
                        // Show custom success modal
                        setShowSuccessModal(true);
                        
                        console.log('📝 [TESTIMONIAL] Testimonial submitted successfully');
                      } catch (error) {
                        setIsSubmittingTestimonial(false);
                        console.error('Failed to submit testimonial:', error);
                        Alert.alert(
                          'Submission Failed', 
                          'There was an issue submitting your testimonial. Your progress is still saved!',
                          [{ text: 'OK' }]
                        );
                      }
                      }}
                    >
                      {isSubmittingTestimonial ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#0a0a0b" style={{ marginRight: 8 }} />
                          <Text style={styles.simpleSubmitText}>Uploading...</Text>
                        </View>
                      ) : (
                        <Text style={styles.simpleSubmitText}>
                          {testimonialStats ? 'Share Transformation' : 'Share Journey'}
                        </Text>
                      )}
                    </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Custom Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={[styles.successModalContainer, { borderColor: themeColor + '30' }]}>
            <View style={[styles.successCheckmark, { backgroundColor: themeColor }]}>
              <Ionicons name="checkmark" size={40} color="#0a0a0b" />
            </View>
            
            <Text style={styles.successTitle}>You're all set!</Text>
            <Text style={styles.successSubtitle}>
              Your story has been submitted and will help inspire others on their fitness journey.
            </Text>
            
            <TouchableOpacity 
              style={[styles.successButton, { backgroundColor: themeColor }]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

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
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  weightDisplayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  weightCard: {
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 40,
    width: '100%',
    maxWidth: 340,
    borderWidth: 2,
  },
  weightLabel: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  weightValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
    justifyContent: 'center',
  },
  weightValue: {
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 72,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  weightUnit: {
    fontSize: 28,
    fontWeight: '600',
    marginLeft: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  changeContainer: {
    alignItems: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  changeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    maxWidth: 280,
  },
  emptyStateIcon: {
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  updateButtonText: {
    color: '#0a0a0b',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  
  // History styles
  historyContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
  },
  historyLeft: {
    flex: 1,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyWeight: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  historyNotes: {
    fontSize: 12,
    color: '#71717a',
    fontStyle: 'italic',
    maxWidth: 120,
    textAlign: 'right',
    marginBottom: 4,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  photoCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  noHistoryText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    marginTop: 60,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalInnerContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    maxHeight: '70%',
    borderRightWidth: 2,
    maxHeight: '95%',
    minHeight: 600,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeaderLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  modalHeaderCenter: {
    flex: 2,
    alignItems: 'center',
  },
  modalHeaderRight: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalContent: {
    flexGrow: 1,
    flexShrink: 1,
  },
  modalContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  weightInput: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginRight: 12,
    borderWidth: 1,
    color: '#ffffff',
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  unitButton: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  notesInput: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 30,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    color: '#ffffff',
  },
  saveButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: '#0a0a0b',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Simple Testimonial Modal styles
  testimonialFullscreen: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  testimonialContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  cancelButton: {
    fontSize: 16,
    color: '#a1a1aa',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  shareButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  simpleContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  simpleStatsContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  simpleStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  simpleStatItem: {
    alignItems: 'center',
  },
  simpleStatLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 4,
  },
  simpleStatValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  simpleStatUnit: {
    fontSize: 14,
    color: '#a1a1aa',
    marginLeft: 4,
  },
  achievementSection: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  achievementText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  inputContainer: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
  },
  textInput: {
    fontSize: 16,
    color: '#ffffff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  consentText: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
    flex: 1,
    marginLeft: 12,
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  // Additional simple styles for testimonial modal JSX
  simpleStatsCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  simpleStatsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  simpleStat: {
    alignItems: 'center',
  },
  simpleStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  simpleStatLabel: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  simpleArrow: {
    fontSize: 24,
    fontWeight: '600',
    marginHorizontal: 20,
  },
  simpleProgress: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    marginTop: 16,
  },
  simpleCurrentWeight: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  simpleMotivation: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
  },
  simpleInputSection: {
    marginBottom: 24,
  },
  simpleInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  simpleInput: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  simpleCharCount: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'right',
    marginTop: 8,
  },
  simpleConsent: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
    marginBottom: 24,
  },
  simpleSubmitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  simpleSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  // Weight Selection styles
  weightSelectionCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  weightSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  chooseWeightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  chooseWeightText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  selectedWeightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectedWeightContent: {
    flex: 1,
  },
  selectedWeightText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  selectedWeightDate: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  // Inline Weight List styles
  inlineWeightList: {
    marginTop: 16,
    maxHeight: 300,
  },
  inlineWeightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  inlineWeightContent: {
    flex: 1,
  },
  inlineWeightText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  inlineWeightDate: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  inlineWeightNotes: {
    fontSize: 11,
    color: '#71717a',
    fontStyle: 'italic',
    marginTop: 2,
  },
  // Progress Photos styles
  photoSection: {
    marginVertical: 24,
    borderRadius: 12,
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  photoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginLeft: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  photoSlot: {
    alignItems: 'center',
    width: '18%',
    marginBottom: 12,
  },
  photoButton: {
    width: 70,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  photoContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  progressPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  emptyPhotoSlot: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0f0f0f',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#0f0f0f',
    borderRadius: 10,
  },
  photoLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'center',
    fontWeight: '500',
  },
  // History Detail styles
  historyDetailContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  weightInfoCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  weightInfoValue: {
    fontSize: 48,
    fontWeight: '900',
    marginBottom: 8,
  },
  weightInfoDate: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 20,
  },
  notesSection: {
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  notesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 16,
    color: '#a1a1aa',
    lineHeight: 24,
  },
  photosSection: {
    marginBottom: 40,
  },
  photosSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  photosGallery: {
    paddingLeft: 0,
  },
  galleryPhotoContainer: {
    marginRight: 16,
    alignItems: 'center',
  },
  galleryPhoto: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#18181b',
    marginBottom: 8,
  },
  photoTypeLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
    textAlign: 'center',
  },
  // Fullscreen Photo Viewer styles
  photoViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  photoViewerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  photoCounter: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  photoViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullscreenPhoto: {
    width: '100%',
    height: '100%',
  },
  bottomNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  bottomNavButton: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Testimonial Photo Selection styles
  testimonialPhotoSection: {
    marginBottom: 24,
  },
  testimonialPhotoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  beforePhotosSection: {
    marginBottom: 24,
  },
  beforePhotosLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 12,
  },
  beforePhotosScroll: {
    paddingLeft: 0,
  },
  selectablePhoto: {
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    padding: 8,
    position: 'relative',
  },
  selectablePhotoImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    marginBottom: 6,
  },
  photoSelectionOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  selectablePhotoLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'center',
    fontWeight: '500',
  },
  afterPhotosSection: {
    marginBottom: 16,
  },
  afterPhotosLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 12,
  },
  afterPhotosScroll: {
    paddingLeft: 0,
  },
  addPhotoSlot: {
    marginRight: 12,
    alignItems: 'center',
  },
  addedPhotoContainer: {
    position: 'relative',
  },
  addedPhotoImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    marginBottom: 6,
  },
  removeAddedPhoto: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#0f0f0f',
    borderRadius: 10,
  },
  emptyAddPhotoSlot: {
    width: 80,
    height: 100,
    backgroundColor: '#18181b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  addPhotoLabel: {
    fontSize: 12,
    color: '#a1a1aa',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Loading and Success Modal styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
  },
  successCheckmark: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
});

export default WeightTrackerScreen;