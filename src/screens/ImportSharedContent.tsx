import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { fetchShare, ShareError } from '../services/shareService';

type ImportSharedContentNavigationProp = StackNavigationProp<RootStackParamList, 'ImportSharedContent'>;
type ImportSharedContentRouteProp = RouteProp<RootStackParamList, 'ImportSharedContent'>;

interface ImportState {
  loading: boolean;
  error: string | null;
}

// Type detection function
function detectShareType(inner: any): 'workout' | 'meal_plan' {
  // Meal plan indicators
  if (inner.dailyMeals || inner.startDate || (inner.meals && Array.isArray(inner.meals))) {
    return 'meal_plan';
  }
  // Workout indicators  
  if (inner.routine_name || inner.blocks || inner.days_per_week) {
    return 'workout';
  }
  // Default: workout (legacy compatibility)
  return 'workout';
}

export default function ImportSharedContent() {
  const navigation = useNavigation<ImportSharedContentNavigationProp>();
  const route = useRoute<ImportSharedContentRouteProp>();
  const { themeColor } = useTheme();
  const { shareId } = route.params;
  
  console.log('📱 [IMPORT SHARED] Component mounted with shareId:', shareId);
  console.log('📱 [IMPORT SHARED] Route params:', route.params);
  console.log('📱 [IMPORT SHARED] Navigation state:', navigation.getState());
  
  const [importState, setImportState] = useState<ImportState>({
    loading: false, // Don't show loading - navigate immediately
    error: null,
  });

  useEffect(() => {
    console.log('📱 [IMPORT SHARED] useEffect triggered with shareId:', shareId);
    fetchAndNavigate();
  }, [shareId]);

  const fetchAndNavigate = async () => {
    try {
      console.log('📱 [IMPORT SHARED] fetchAndNavigate started for shareId:', shareId);
      console.log('📱 [IMPORT SHARED] About to call fetchShare service');
      
      // Fetch the shared content data
      const startTime = Date.now();
      const sharedData = await fetchShare(shareId);
      const fetchTime = Date.now() - startTime;
      
      console.log('📱 [IMPORT SHARED] fetchShare completed in', fetchTime, 'ms');
      console.log('📱 [IMPORT SHARED] Raw sharedData type:', typeof sharedData);
      console.log('📱 [IMPORT SHARED] Raw sharedData keys:', Object.keys(sharedData || {}));
      console.log('📱 [IMPORT SHARED] Raw sharedData sample:', JSON.stringify(sharedData).substring(0, 300) + '...');
      
      // Extract the inner data from the shared structure
      const sharedDataAny = sharedData as any;
      console.log('📱 [IMPORT SHARED] Starting data structure analysis');
      
      // Get the actual content data
      let innerData;
      if (sharedDataAny.data && sharedDataAny.data.workoutData) {
        console.log('📱 [IMPORT SHARED] Found data.workoutData structure');
        innerData = sharedDataAny.data.workoutData;
      } else if (sharedDataAny.data && sharedDataAny.data.mealPlanData) {
        console.log('📱 [IMPORT SHARED] Found data.mealPlanData structure');
        innerData = sharedDataAny.data.mealPlanData;
      } else if (sharedDataAny.workoutData) {
        console.log('📱 [IMPORT SHARED] Found direct workoutData structure');
        innerData = sharedDataAny.workoutData;
      } else if (sharedDataAny.mealPlanData) {
        console.log('📱 [IMPORT SHARED] Found direct mealPlanData structure');
        innerData = sharedDataAny.mealPlanData;
      } else {
        console.log('📱 [IMPORT SHARED] Using raw sharedData as innerData (fallback)');
        innerData = sharedDataAny;
      }
      
      console.log('📱 [IMPORT SHARED] Extracted innerData type:', typeof innerData);
      console.log('📱 [IMPORT SHARED] Extracted innerData keys:', Object.keys(innerData || {}));
      
      if (!innerData || typeof innerData !== 'object') {
        console.error('📱 [IMPORT SHARED] Invalid innerData:', innerData);
        throw new Error('Invalid shared data received');
      }
      
      // Detect content type
      console.log('📱 [IMPORT SHARED] Starting type detection');
      const contentType = detectShareType(innerData);
      
      console.log('🔍 [TYPE DETECTION] Share ID:', shareId);
      console.log('🔍 [TYPE DETECTION] Content keys:', Object.keys(innerData));
      console.log('🔍 [TYPE DETECTION] Detected share type:', contentType);
      console.log('🔍 [TYPE DETECTION] Sample data:', JSON.stringify(innerData).substring(0, 200) + '...');
      
      // Convert back to JSON string
      console.log('📱 [IMPORT SHARED] Converting to JSON string for prefill');
      const prefilledJson = JSON.stringify(innerData);
      console.log('📱 [IMPORT SHARED] prefilledJson length:', prefilledJson.length);
      console.log('📱 [IMPORT SHARED] prefilledJson sample:', prefilledJson.substring(0, 100) + '...');
      
      // Navigate to appropriate import screen
      console.log('📱 [IMPORT SHARED] About to navigate based on contentType:', contentType);
      if (contentType === 'meal_plan') {
        console.log('📱 [IMPORT SHARED] Navigating to ImportMealPlan with prefilledJson');
        console.log('📱 [IMPORT SHARED] Navigation params:', { prefilledJson: prefilledJson.substring(0, 100) + '...' });
        navigation.replace('ImportMealPlan', { prefilledJson });
      } else {
        console.log('📱 [IMPORT SHARED] Navigating to ImportRoutine with prefilledJson');
        console.log('📱 [IMPORT SHARED] Navigation params:', { prefilledJson: prefilledJson.substring(0, 100) + '...' });
        navigation.replace('ImportRoutine', { prefilledJson });
      }
      console.log('📱 [IMPORT SHARED] Navigation call completed successfully');
      
    } catch (error) {
      console.error('📱 [IMPORT SHARED] ERROR occurred:', error);
      console.error('📱 [IMPORT SHARED] Error type:', typeof error);
      console.error('📱 [IMPORT SHARED] Error name:', error?.name);
      console.error('📱 [IMPORT SHARED] Error message:', error?.message);
      console.error('📱 [IMPORT SHARED] Error stack:', error?.stack);
      console.error('📱 [IMPORT SHARED] Error instanceof ShareError:', error instanceof ShareError);
      
      if (error instanceof ShareError) {
        console.error('📱 [IMPORT SHARED] ShareError code:', error.code);
        console.error('📱 [IMPORT SHARED] ShareError details:', error);
      }
      
      let errorMessage = 'Failed to load shared content';
      
      if (error instanceof ShareError) {
        console.log('📱 [IMPORT SHARED] Processing ShareError with code:', error.code);
        switch (error.code) {
          case 'EXPIRED':
            errorMessage = 'This shared content has expired or is no longer available';
            break;
          case 'NETWORK_ERROR':
            errorMessage = "Couldn't load this content — check your connection";
            break;
          case 'TIMEOUT':
            errorMessage = "Request timed out — check your connection";
            break;
          case 'INVALID_DATA':
            errorMessage = 'This share link looks broken — ask the sender for a new one';
            break;
          default:
            errorMessage = error.message;
        }
      } else {
        console.log('📱 [IMPORT SHARED] Processing generic error');
        errorMessage = error?.message || 'Unknown error occurred';
      }
      
      console.log('📱 [IMPORT SHARED] Final error message:', errorMessage);
      console.log('📱 [IMPORT SHARED] Setting importState to error');
      setImportState({ loading: false, error: errorMessage });
    }
  };

  const handleRetry = () => {
    fetchAndNavigate();
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  if (importState.loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <ActivityIndicator size="large" color={themeColor} />
          </View>
          <Text style={styles.title}>Importing shared content...</Text>
          <Text style={styles.description}>
            Please wait while we load your content
          </Text>
        </View>
      </View>
    );
  }


  if (importState.error) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Ionicons name="warning" size={64} color="#ef4444" />
          </View>
          <Text style={styles.title}>Import failed</Text>
          <Text style={styles.description}>
            {importState.error}
          </Text>
          
          <View style={styles.actionButtons}>
            {(importState.error.includes('connection') || importState.error.includes('timed out')) && (
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: themeColor }]}
                onPress={handleRetry}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={20} color="#0a0a0b" />
                <Text style={styles.retryButtonText}>Try again</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
              activeOpacity={0.8}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
    width: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionButtons: {
    width: '100%',
    gap: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});