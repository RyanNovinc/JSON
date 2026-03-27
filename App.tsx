import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActiveWorkoutProvider } from './src/contexts/ActiveWorkoutContext';
import { RevenueCatProvider } from './src/contexts/RevenueCatContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { WeightUnitProvider } from './src/contexts/WeightUnitContext';
import * as ExpoSplashScreen from 'expo-splash-screen';
import SplashScreen from './src/components/SplashScreen';
import { WorkoutStorage } from './src/utils/storage';
import { validateProductionEnvironment } from './src/utils/environmentValidator';

// Keep the native splash screen visible while loading
ExpoSplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Validate production environment configuration
    validateProductionEnvironment();
    
    // Hide native splash screen immediately to show our custom one
    ExpoSplashScreen.hideAsync();
    
    // Perform data recovery on app startup to fix any corrupted data
    WorkoutStorage.performDataRecovery().catch(error => {
      console.error('❌ [APP] Data recovery failed:', error);
    });
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <AppNavigator isAuthenticated={true} appReady={true} />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <WeightUnitProvider>
            <RevenueCatProvider autoInitialize={true}>
              <ActiveWorkoutProvider>
                <AppContent />
              </ActiveWorkoutProvider>
            </RevenueCatProvider>
          </WeightUnitProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
