import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Animated, StyleSheet } from 'react-native';
import { navigationRef } from '../utils/navigationRef';

// Import screens (we'll create these next)
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CreateCountdownScreen from '../screens/CreateCountdownScreen';
import ImportRoutineScreen from '../screens/ImportRoutineScreen';
import BlocksScreen from '../screens/BlocksScreen';
import DaysScreen from '../screens/DaysScreen';
import WorkoutLogScreen from '../screens/WorkoutLogScreen';
import WorkoutReviewScreen from '../screens/WorkoutReviewScreen';
import AppIconScreen from '../screens/AppIconScreen';
import PaymentScreen from '../screens/PaymentScreen';
import { FloatingWorkoutIndicator } from '../components/FloatingWorkoutIndicator';
import { FeedbackTab } from '../components/FeedbackTab';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  CreateCountdown: undefined;
  ImportRoutine: undefined;
  AppIcon: undefined;
  Payment: undefined;
  Blocks: {
    routine: {
      id: string;
      name: string;
      days: number;
      blocks: number;
      data: any;
    };
  };
  Days: {
    block: any;
    routineName: string;
  };
  WorkoutLog: {
    day: any;
    blockName: string;
    currentWeek?: number;
  };
  WorkoutReview: {
    day: any;
    blockName: string;
    completionStats: any;
    currentWeek: number;
  };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Settings: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

interface AppNavigatorProps {
  isAuthenticated: boolean;
  appReady: boolean;
}

export default function AppNavigator({ isAuthenticated, appReady }: AppNavigatorProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (appReady) {
      // Start fade-in animation when app is ready
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [appReady, fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <NavigationContainer ref={navigationRef}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          ) : (
            <>
              <RootStack.Screen name="Main" component={MainNavigator} />
              <RootStack.Screen 
                name="CreateCountdown" 
                component={CreateCountdownScreen}
                options={{
                  headerShown: true,
                  headerTitle: 'Create Countdown',
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen 
                name="ImportRoutine" 
                component={ImportRoutineScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen 
                name="AppIcon" 
                component={AppIconScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="Payment" 
                component={PaymentScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="Blocks" 
                component={BlocksScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="Days" 
                component={DaysScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="WorkoutLog" 
                component={WorkoutLogScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="WorkoutReview" 
                component={WorkoutReviewScreen}
                options={{
                  headerShown: false,
                }}
              />
            </>
          )}
        </RootStack.Navigator>
        <FloatingWorkoutIndicator />
        <FeedbackTab />
      </NavigationContainer>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});