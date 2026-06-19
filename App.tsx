import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActiveWorkoutProvider } from './src/contexts/ActiveWorkoutContext';
import { RevenueCatProvider } from './src/contexts/RevenueCatContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { WeightUnitProvider } from './src/contexts/WeightUnitContext';
import * as ExpoSplashScreen from 'expo-splash-screen';
import SplashScreen from './src/components/SplashScreen';
import { WorkoutStorage } from './src/utils/storage';
import { validateProductionEnvironment } from './src/utils/environmentValidator';
import { validateAll } from './src/utils/curated_meals_validation';
import { preloadCriticalImages } from './src/utils/imagePreloader';
import { runMigrations } from './src/utils/migrationFramework';
import { Analytics } from './src/services/analytics';
import Constants from 'expo-constants';

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
  const [migrationsComplete, setMigrationsComplete] = useState(false);

  useEffect(() => {
    Analytics.init({
      endpoint: 'https://kmgao3kfmhtqu47poior5mbqce0nyxfx.lambda-url.ap-southeast-2.on.aws/',
      appVersion: Constants.expoConfig?.version ?? '1.0.20',
      sharedSecret: 'd34039086646a0a1fdb3a3697742ca44',
    });

    async function initializeApp() {
      try {
        // Validate production environment configuration
        validateProductionEnvironment();
        
        // Validate curated meals data integrity
        try {
          validateAll();
          console.log('✅ [CURATED MEALS] Validation passed');
        } catch (error) {
          console.error('[CURATED MEALS VALIDATION FAILED]', error);
          // In development mode, also surface the error visibly
          if (__DEV__) {
            // Re-throw to show in React Native's red screen
            setTimeout(() => {
              throw new Error(`[CURATED MEALS VALIDATION FAILED] ${(error as Error).message}`);
            }, 0);
          }
        }
        
        // Hide native splash screen immediately to show our custom one
        ExpoSplashScreen.hideAsync();
        
        // CRITICAL: Run migrations BEFORE any data access
        console.log('🔄 [APP] Running migrations before data access...');
        await runMigrations();
        console.log('✅ [APP] Migrations completed successfully');
        setMigrationsComplete(true);
        
        // Perform data recovery on app startup to fix any corrupted data
        WorkoutStorage.performDataRecovery().catch(error => {
          console.error('❌ [APP] Data recovery failed:', error);
        });
        
        // Preload critical images for better performance
        preloadCriticalImages().catch(error => {
          console.warn('⚠️ [APP] Image preloading failed:', error);
        });
        
      } catch (error) {
        console.error('💥 [APP] App initialization failed:', error);
        
        // Show error to user in development
        if (__DEV__) {
          Alert.alert(
            'App Initialization Failed',
            `Failed to initialize app: ${(error as Error).message}`,
            [{ text: 'OK' }]
          );
        }
      }
    }
    
    initializeApp();
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (showSplash || !migrationsComplete) {
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
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
