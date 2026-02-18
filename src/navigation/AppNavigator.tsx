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
import ImportMealPlanScreen from '../screens/ImportMealPlanScreen';
import SampleWorkoutsScreen from '../screens/SampleWorkoutsScreen';
import SampleMealPlansScreen from '../screens/SampleMealPlansScreen';
import BlocksScreen from '../screens/BlocksScreen';
import MealPlanWeeksScreen from '../screens/MealPlanWeeksScreen';
import MealPlanDaysScreen from '../screens/MealPlanDaysScreen';
import MealPlanDayScreen from '../screens/MealPlanDayScreen';
import MealPlanMealDetailScreen from '../screens/MealPlanMealDetailScreen';
import MealPrepSessionScreen from '../screens/MealPrepSessionScreen';
import DaysScreen from '../screens/DaysScreen';
import WorkoutLogScreen from '../screens/WorkoutLogScreen';
import WorkoutReviewScreen from '../screens/WorkoutReviewScreen';
import AppIconScreen from '../screens/AppIconScreen';
import PaymentScreen from '../screens/PaymentScreen';
import { FloatingWorkoutIndicator } from '../components/FloatingWorkoutIndicator';
import { FeedbackTab } from '../components/FeedbackTab';
import { AppModeProvider } from '../contexts/AppModeContext';
import { MealPlanningProvider } from '../contexts/MealPlanningContext';
import { WeightUnitProvider } from '../contexts/WeightUnitContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import ShareIntentHandler from '../components/ShareIntentHandler';

// Import nutrition screens
import { NutritionQuestionnaireScreen } from '../screens/NutritionQuestionnaireScreen';
import BudgetCookingQuestionnaireScreen from '../screens/BudgetCookingQuestionnaireScreen';
import FridgePantryQuestionnaireScreen from '../screens/FridgePantryQuestionnaireScreen';
import SleepOptimizationScreen from '../screens/SleepOptimizationScreen';
import NutritionHomeScreen from '../screens/NutritionHomeScreen';
import NutritionDashboardScreen from '../screens/NutritionDashboardScreen';
import WorkoutDashboardScreen from '../screens/WorkoutDashboardScreen';
import FitnessGoalsQuestionnaireScreen from '../screens/FitnessGoalsQuestionnaireScreen';
import MealCalendarScreen from '../screens/MealCalendarScreen';
import MealDetailScreen from '../screens/MealDetailScreen';
import GroceryListScreen from '../screens/GroceryListScreen';
import MealRatingsScreen from '../screens/MealRatingsScreen';
import FavoriteMealsScreen from '../screens/FavoriteMealsScreen';
import AddMealScreen from '../screens/AddMealScreen';
import ManualMealEntryScreen from '../screens/ManualMealEntryScreen';
import MealPlanHelpScreen from '../screens/MealPlanHelpScreen';
import WeightTrackerScreen from '../screens/WeightTrackerScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  CreateCountdown: undefined;
  ImportRoutine: undefined;
  ImportMealPlan: undefined;
  SampleWorkouts: undefined;
  SampleMealPlans: undefined;
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
  MealPlanWeeks: {
    mealPlan: {
      id: string;
      name: string;
      duration: number;
      meals: number;
      data: any;
    };
  };
  MealPlanDays: {
    week: any;
    mealPlanName: string;
    mealPrepSession?: any;
    allMealPrepSessions?: any[];
    groceryList?: any;
  };
  MealPlanDay: {
    day: any;
    weekNumber: number;
    mealPlanName: string;
    dayIndex: number;
    calculatedDayName: string;
  };
  MealPlanMealDetail: {
    meal: any;
    dayName: string;
    weekNumber: number;
    mealPlanName: string;
  };
  MealPrepSession: {
    mealPrepSession: any;
    sessionIndex?: number; // Which session to display (0, 1, 2...)
    allSessions?: any[]; // All meal prep sessions for navigation
  };
  Days: {
    block: any;
    routineName: string;
    initialWeek?: number;
  };
  WorkoutLog: {
    day: any;
    blockName: string;
    currentWeek?: number;
    block?: any;
    routineName?: string;
  };
  WorkoutReview: {
    day: any;
    blockName: string;
    completionStats: any;
    currentWeek: number;
  };
  // Nutrition screens
  NutritionQuestionnaire: undefined;
  BudgetCookingQuestionnaire: undefined;
  FridgePantryQuestionnaire: undefined;
  SleepOptimizationScreen: undefined;
  NutritionHome: undefined;
  NutritionDashboard: undefined;
  WorkoutDashboard: undefined;
  FitnessGoalsQuestionnaire: undefined;
  MealCalendar: undefined;
  MealDetail: {
    meal: any;
  };
  GroceryList: {
    groceryList?: any;
  };
  MealRatings: undefined;
  FavoriteMeals: undefined;
  AddMeal: undefined;
  ManualMealEntry: undefined;
  MealPlanHelp: undefined;
  WeightTracker: undefined;
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
      <ThemeProvider>
        <AppModeProvider>
          <WeightUnitProvider>
            <MealPlanningProvider>
              <NavigationContainer ref={navigationRef}>
                <ShareIntentHandler />
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
                name="ImportMealPlan" 
                component={ImportMealPlanScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen 
                name="SampleWorkouts" 
                component={SampleWorkoutsScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen 
                name="SampleMealPlans" 
                component={SampleMealPlansScreen}
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
                name="MealPlanWeeks" 
                component={MealPlanWeeksScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="MealPlanDays" 
                component={MealPlanDaysScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="MealPlanDay" 
                component={MealPlanDayScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="MealPlanMealDetail" 
                component={MealPlanMealDetailScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="MealPrepSession" 
                component={MealPrepSessionScreen}
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
              {/* Nutrition Screens */}
              <RootStack.Screen 
                name="NutritionQuestionnaire" 
                component={NutritionQuestionnaireScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen 
                name="BudgetCookingQuestionnaire" 
                component={BudgetCookingQuestionnaireScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen 
                name="FridgePantryQuestionnaire" 
                component={FridgePantryQuestionnaireScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen 
                name="SleepOptimizationScreen" 
                component={SleepOptimizationScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen 
                name="NutritionHome" 
                component={NutritionHomeScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="NutritionDashboard" 
                component={NutritionDashboardScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <RootStack.Screen 
                name="WorkoutDashboard" 
                component={WorkoutDashboardScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <RootStack.Screen 
                name="FitnessGoalsQuestionnaire" 
                component={FitnessGoalsQuestionnaireScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <RootStack.Screen 
                name="MealCalendar" 
                component={MealCalendarScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="MealDetail" 
                component={MealDetailScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="GroceryList" 
                component={GroceryListScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="MealRatings" 
                component={MealRatingsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="FavoriteMeals" 
                component={FavoriteMealsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="AddMeal" 
                component={AddMealScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="ManualMealEntry" 
                component={ManualMealEntryScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="MealPlanHelp" 
                component={MealPlanHelpScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen 
                name="WeightTracker" 
                component={WeightTrackerScreen}
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
            </MealPlanningProvider>
          </WeightUnitProvider>
        </AppModeProvider>
      </ThemeProvider>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});