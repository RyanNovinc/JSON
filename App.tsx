import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import AppNavigator from './src/navigation/AppNavigator';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ActiveWorkoutProvider } from './src/contexts/ActiveWorkoutContext';
import { RevenueCatProvider } from './src/contexts/RevenueCatContext';
import * as ExpoSplashScreen from 'expo-splash-screen';
import SplashScreen from './src/components/SplashScreen';

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
    // Hide native splash screen immediately to show our custom one
    ExpoSplashScreen.hideAsync();
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
    <QueryClientProvider client={queryClient}>
      <RevenueCatProvider autoInitialize={true}>
        <ActiveWorkoutProvider>
          <AppContent />
        </ActiveWorkoutProvider>
      </RevenueCatProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
