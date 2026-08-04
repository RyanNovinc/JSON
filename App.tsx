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
import { useFonts } from 'expo-font';
import {
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';

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

  /* Registered under the names the codebase ALREADY asks for. WorkoutLogScreen
   * and ExerciseHistoryScreen have specified 'Outfit-Bold' and 'DMMono-Regular'
   * in their styles since they were written, but nothing ever loaded a font
   * file — React Native silently falls back when a fontFamily does not resolve,
   * so both screens have been rendering in the system face the whole time.
   * Mapping the Google Fonts exports onto those exact keys switches them on
   * without editing a single style rule.
   *
   * This is also why useFonts is used rather than the expo-font config plugin:
   * the plugin embeds files under their own names (Outfit_700Bold), which would
   * mean rewriting every fontFamily in two screens to match. */
  const [fontsLoaded, fontError] = useFonts({
    'Outfit-Medium': Outfit_500Medium,
    'Outfit-SemiBold': Outfit_600SemiBold,
    'Outfit-Bold': Outfit_700Bold,
    'DMMono-Regular': DMMono_400Regular,
    'DMMono-Medium': DMMono_500Medium,
  });

  useEffect(() => {
    if (fontError) {
      console.warn('⚠️ [APP] Font loading failed, using system face:', fontError);
    }
  }, [fontError]);

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

  /* fontError counts as done, not as a reason to wait. A font that cannot load
   * degrades to the system face — exactly what shipped before today — and that
   * is never worth holding the app on the splash screen for. */
  if (showSplash || !migrationsComplete || !(fontsLoaded || fontError)) {
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
              <RevenueCatProvider autoInitialize={false}>
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