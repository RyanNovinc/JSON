import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import SubscriptionService from './src/services/SubscriptionService';

export default function App() {
  useEffect(() => {
    // Initialize RevenueCat on app start
    SubscriptionService.initialize();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}
