import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Linking } from 'react-native';
import { navigationRef } from '../utils/navigationRef';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import NutritionHomeScreen from '../screens/NutritionHomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LibraryScreen from '../screens/LibraryScreen';
import WorkoutPreviewScreen from '../screens/WorkoutPreviewScreen';
import SamplePlanDetailScreen from '../screens/SamplePlanDetailScreen';
// ModeTransitionContainer is no longer wired in — mode switching is now via
// the bottom tab bar. Import kept in case it's needed elsewhere.
// import ModeTransitionContainer from '../components/ModeTransitionContainer';
import ImportRoutineScreen from '../screens/ImportRoutineScreen';
import ImportSharedContent from '../screens/ImportSharedContent';
import ImportMealPlanScreen from '../screens/ImportMealPlanScreen';
import MyWorkoutsScreen from '../screens/MyWorkoutsScreen';
import MyMealPlansScreen from '../screens/MyMealPlansScreen';
import SampleMealPlansScreen from '../screens/SampleMealPlansScreen';
import BlocksScreen from '../screens/BlocksScreen';
import MesocycleBlocksScreen from '../screens/MesocycleBlocksScreen';
import MealPlanWeeksScreen from '../screens/MealPlanWeeksScreen';
import MealPlanDaysScreen from '../screens/MealPlanDaysScreen';
import MealPlanDayScreen from '../screens/MealPlanDayScreen';
import MealPlanMealDetailScreen from '../screens/MealPlanMealDetailScreen';
import MealPrepSessionScreen from '../screens/MealPrepSessionScreen';
import MealPrepDetailScreen from '../screens/MealPrepDetailScreen';
import DaysScreen from '../screens/DaysScreen';
import WorkoutLogScreenAdapter from '../screens/WorkoutLogScreenAdapter';
import WorkoutReviewScreen from '../screens/WorkoutReviewScreen';
import OneRMProgressionScreen from '../screens/OneRMProgressionScreen';
import AppIconScreen from '../screens/AppIconScreen';
import PaymentScreen from '../screens/PaymentScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import CookModeScreen from '../screens/CookModeScreen';
import MealsLibraryScreen from '../screens/MealsLibraryScreen';
import SmoothiesLibraryScreen from '../screens/SmoothiesLibraryScreen';
import MealDetailScreen from '../screens/nutrition/MealDetailScreen';
import { FloatingWorkoutIndicator } from '../components/FloatingWorkoutIndicator';
// import { FeedbackModal } from '../components/FeedbackTab';
import { AppModeProvider } from '../contexts/AppModeContext';
import { MealPlanningProvider } from '../contexts/MealPlanningContext';
import { SimplifiedMealPlanningProvider } from '../contexts/SimplifiedMealPlanningContext';
import { WeightUnitProvider } from '../contexts/WeightUnitContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { WorkoutRoutineProvider } from '../contexts/WorkoutRoutineContext';
import { TimerProvider } from '../contexts/TimerContext';
import { CookTimerProvider } from '../contexts/CookTimerContext';
import ShareIntentHandler from '../components/ShareIntentHandler';

// Import nutrition screens
import { NutritionQuestionnaireScreen } from '../screens/NutritionQuestionnaireScreen';
import BudgetCookingQuestionnaireScreen from '../screens/BudgetCookingQuestionnaireScreen';
import FridgePantryQuestionnaireScreen from '../screens/FridgePantryQuestionnaireScreen';
import SleepOptimizationScreen from '../screens/SleepOptimizationScreen';
import NutritionDashboardScreen from '../screens/NutritionDashboardScreen';
import WorkoutDashboardScreen from '../screens/WorkoutDashboardScreen';
import RequiredSetupScreen from '../screens/RequiredSetupScreen';
import OptionalToolsScreen from '../screens/OptionalToolsScreen';
import NutritionRequiredSetupScreen from '../screens/NutritionRequiredSetupScreen';
import NutritionOptionalToolsScreen from '../screens/NutritionOptionalToolsScreen';
import FitnessGoalsQuestionnaireScreen from '../screens/FitnessGoalsQuestionnaireScreen';
import EquipmentPreferencesQuestionnaireScreen from '../screens/EquipmentPreferencesQuestionnaireScreen';
import MealCalendarScreen from '../screens/MealCalendarScreen';
import WorkoutCalendar from '../components/WorkoutCalendar';
import GroceryListScreen from '../screens/GroceryListScreen';
import MealRatingsScreen from '../screens/MealRatingsScreen';
import FavoriteMealsScreen from '../screens/FavoriteMealsScreen';
import AddMealScreen from '../screens/AddMealScreen';
import ManualMealEntryScreen from '../screens/ManualMealEntryScreen';
import MealPlanHelpScreen from '../screens/MealPlanHelpScreen';
import MealPlanTestScreen from '../screens/MealPlanTestScreen';
import FavoriteExercisesScreen from '../screens/FavoriteExercisesScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import AddExerciseSelectionScreen from '../screens/AddExerciseSelectionScreen';
import ManualExerciseEntryScreen from '../screens/ManualExerciseEntryScreen';
import ExerciseHelpScreen from '../screens/ExerciseHelpScreen';
import MethodologyScreen from '../screens/MethodologyScreen';
import WeightTrackerScreen from '../screens/WeightTrackerScreen';
import WeekVolumeScreen from '../screens/WeekVolumeScreen';
import CreateChooserScreen from '../screens/CreateChooserScreen';

// Import questionnaire screens
import Q1PrimaryGoalScreen from '../screens/questionnaire/Q1PrimaryGoalScreen';
import Q2ExperienceScreen from '../screens/questionnaire/Q2ExperienceScreen';
import Q3DaysPerWeekScreen from '../screens/questionnaire/Q3DaysPerWeekScreen';
import Q4ProgramDurationScreen from '../screens/questionnaire/Q4ProgramDurationScreen';
import Q5EquipmentScreen from '../screens/questionnaire/Q5EquipmentScreen';
import Q6VolumePreferenceScreen from '../screens/questionnaire/Q6VolumePreferenceScreen';
import Q7RestStyleScreen from '../screens/questionnaire/Q7RestStyleScreen';
import RefinementsScreen from '../screens/questionnaire/RefinementsScreen';
import PromptReadyScreen from '../screens/questionnaire/PromptReadyScreen';
import QuestionnaireSummaryScreen from '../screens/questionnaire/QuestionnaireSummaryScreen';

// Import nutrition questionnaire screens
import N1GoalScreen from '../screens/nutrition/questionnaire/N1GoalScreen';
import N2RateScreen from '../screens/nutrition/questionnaire/N2RateScreen';
import N3AboutYouScreen from '../screens/nutrition/questionnaire/N3AboutYouScreen';
import N4ActivityScreen from '../screens/nutrition/questionnaire/N4ActivityScreen';
import N5DietTypeScreen from '../screens/nutrition/questionnaire/N5DietTypeScreen';
import N5bAllergiesScreen from '../screens/nutrition/questionnaire/N5bAllergiesScreen';
import N5cSleepScreen from '../screens/nutrition/questionnaire/N5cSleepScreen';
import N6MealsSnackingScreen from '../screens/nutrition/questionnaire/N6MealsSnackingScreen';
import N7LocationScreen from '../screens/nutrition/questionnaire/N7LocationScreen';
import N8BudgetScreen from '../screens/nutrition/questionnaire/N8BudgetScreen';
import N9PlanLengthScreen from '../screens/nutrition/questionnaire/N9PlanLengthScreen';
import NutritionRefinementsScreen from '../screens/nutrition/questionnaire/NutritionRefinementsScreen';
import NutritionSummaryScreen from '../screens/nutrition/questionnaire/NutritionSummaryScreen';
import NutritionPromptReadyScreen from '../screens/nutrition/questionnaire/NutritionPromptReadyScreen';
import CuratedFavoritesScreen from '../screens/nutrition/CuratedFavoritesScreen';
import FridgePantryScreen from '../screens/nutrition/FridgePantryScreen';

// New: custom tab bar
import { CustomTabBar, CREATE_ROUTE } from './CustomTabBar';

// Clean meal plan navigation types
interface CleanMealPlanNavigationParams {
  targetDate: string; // Always YYYY-MM-DD format
  planId: string;
  planName: string;
  // Optional display helpers (derived from targetDate)
  dayName?: string;
  displayDate?: string;
}

export type RootStackParamList = {
  Main: undefined;
  CreateFlow: undefined;
  SamplePlanDetail: { plan: any };
  ImportRoutine: { prefilledJson?: string; showStep1New?: boolean; shareId?: string; mode?: string; targetWorkoutId?: string; fromNewFlow?: boolean };
  ImportSharedContent: { shareId: string };
  ImportMealPlan: { showStep1New?: boolean; prefilledJson?: string };
  MyWorkouts: undefined;
  MyMealPlans: undefined;
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
      programId?: string;
    };
    initialBlock?: number;
    initialWeek?: number;
    autoNavigateToToday?: boolean;
  };
  WorkoutPreview: {
    routine: {
      id: string;
      name: string;
      days: number;
      blocks: number;
      data?: any;
      programId?: string;
      mesocycleNumber?: number;
      fingerprint?: string;
      createdAt?: number;
    };
  };
  MesocycleBlocks: {
    mesocycle: {
      mesocycleNumber: number;
      phase?: any;
      blocksInMesocycle: any[];
      completedBlocks: number;
      totalBlocks: number;
      isCompleted: boolean;
      isActive: boolean;
    };
    routine: {
      id: string;
      name: string;
      days: number;
      blocks: number;
      data: any;
      programId?: string;
    };
    program: any;
    autoNavigateToToday?: boolean;
    todayBlockIndex?: number;
    todayWeek?: number;
  };
  // Legacy meal plan navigation (keeping for compatibility during transition)
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
    planId: string;
    planName: string;
  };
  // New clean meal plan day navigation
  MealPlanDay: CleanMealPlanNavigationParams;
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
  MealPrepDetail: {
    meal: any;
    sessionName: string;
    themeColor: string;
    sessionData: any;
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
    selectedExercise?: any;
  };
  WorkoutReview: {
    day: any;
    blockName: string;
    completionStats: any;
    currentWeek: number;
  };
  OneRMProgression: {
    exerciseName: string;
  };
  // Nutrition screens
  NutritionQuestionnaire: undefined;
  BudgetCookingQuestionnaire: undefined;
  FridgePantryQuestionnaire: undefined;
  SleepOptimizationScreen: undefined;
  NutritionDashboard: undefined;
  WorkoutDashboard: undefined;
  WorkoutCalendar: undefined;
  RequiredSetup: undefined;
  OptionalTools: undefined;
  NutritionRequiredSetup: undefined;
  NutritionOptionalTools: undefined;
  FitnessGoalsQuestionnaire: undefined;
  EquipmentPreferencesQuestionnaire: undefined;
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
  MealPlanTest: undefined;
  FavoriteExercises: undefined;
  ExerciseDetail: {
    exercise: any;
  };
  AddExercise: undefined;
  ManualExerciseEntry: undefined;
  ExerciseHelp: undefined;
  Methodology: undefined;
  WeightTracker: undefined;
  WeekVolumeScreen: {
    exercises: any[];
    blockName: string;
    weekNumber: number;
    themeColor: string;
  };
  RecipeDetail: { mealSlug: string };
  CookMode: { mealSlug: string; plateIndex: number; methodIndex: number };
  MealsLibrary: undefined;
  SmoothiesLibrary: undefined;
  // Questionnaire screens
  Q1PrimaryGoal: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  Q2Experience: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  Q3DaysPerWeek: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  Q4ProgramDuration: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  Q5Equipment: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  Q6Volume: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  Q7RestStyle: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  QuestionnaireRefinements: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  PromptReady: undefined;
  QuestionnaireSummary: undefined;
  // Nutrition questionnaire screens
  N1Goal: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  N2Rate: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  N3AboutYou: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  N4Activity: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  N5DietType: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  N5bAllergies: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  N5cSleep: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  N6MealsSnacking: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  N7Location: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  N8Budget: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  N9PlanLength: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  NutritionRefinements: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  NutritionSummary: undefined;
  NutritionPromptReady: undefined;
  CuratedFavorites: undefined;
  FridgePantry: { editMode?: boolean } | undefined;
};

// Tab param list — 5 tabs (with the Create slot in the middle).
export type MainTabParamList = {
  Workouts: undefined;
  Nutrition: undefined;
  [CREATE_ROUTE]: undefined;
  Library: undefined;
  Profile: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ============================================================================
// Stub screens for Browse, Profile, Create.
// Replaced in follow-up PRs when those tabs get built out properly.
// ============================================================================

function PlaceholderScreen({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={stubStyles.container}>
      <Text style={stubStyles.title}>{title}</Text>
      <Text style={stubStyles.subtitle}>{subtitle ?? 'Coming soon'}</Text>
    </View>
  );
}

function BrowseStub() {
  return <PlaceholderScreen title="Browse" />;
}

function ProfileStub() {
  return <PlaceholderScreen title="Profile" />;
}

// The Create "tab" slot — never actually renders, because we intercept tab
// presses in the CustomTabBar and route to the CreateFlow modal instead.
// But React Navigation requires a component for every Tab.Screen, so this
// returns an empty View as a placeholder.
function CreateNeverRenders() {
  return <View style={{ flex: 1, backgroundColor: '#0a0a0b' }} />;
}

// The Create modal — opens when the center create button is pressed.
// For now it's a stub. The real compose screen is built in a follow-up PR.
function CreateFlowStub() {
  return (
    <PlaceholderScreen
      title="Create"
      subtitle="What do you want to create? (Compose screen coming soon)"
    />
  );
}

// ============================================================================
// Main tabs — 5 tabs with the cyan-glow Create button in the middle.
// ============================================================================

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Workouts" component={HomeScreen} />
      <Tab.Screen name="Nutrition" component={NutritionHomeScreen} />
      <Tab.Screen
        name={CREATE_ROUTE}
        component={CreateNeverRenders}
        listeners={({ navigation }) => ({
          // Belt-and-braces: even if React Navigation tries to focus this tab,
          // we intercept and route to the CreateFlow modal.
          tabPress: (e) => {
            e.preventDefault();
            navigation.getParent()?.navigate('CreateFlow' as never);
          },
        })}
      />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

interface AppNavigatorProps {
  isAuthenticated: boolean;
  appReady: boolean;
}

// ============================================================================
// Configure deep linking — preserved verbatim from the original.
// Only the screens.Main.screens key changed from `Home` → `Workouts` to match
// the new tab name.
// ============================================================================
const linking = {
  prefixes: ['https://json.fit', 'json-app://'],
  config: {
    screens: {
      Main: {
        screens: {
          Workouts: '',
        },
      },
      ImportSharedContent: {
        path: 'p/:shareId',
        parse: {
          shareId: (shareId: string) => shareId,
        },
      },
    },
  },
  // Custom URL matcher to handle multiple patterns
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    console.log('🔗 [DEEP LINK] getInitialURL called, url:', url);
    console.log('🔗 [DEEP LINK] App launch scenario - checking if URL contains share pattern');

    if (url) {
      console.log('🔗 [DEEP LINK] URL found:', url);
      console.log('🔗 [DEEP LINK] URL analysis:', {
        isHttpsJsonFit: url.includes('https://json.fit'),
        isJsonAppScheme: url.includes('json-app://'),
        isSharePattern: url.includes('/share/'),
        isPPattern: url.includes('/p/'),
      });

      // Handle json-app://share/xyz pattern
      if (url.includes('json-app://share/')) {
        const shareId = url.replace('json-app://share/', '');
        const newUrl = `json-app://p/${shareId}`;
        console.log('🔗 [DEEP LINK] Converting share URL:', url, '→', newUrl, 'shareId:', shareId);
        return newUrl;
      }

      // Extract shareId for logging purposes
      let extractedShareId = null;
      if (url.includes('/p/')) {
        extractedShareId = url.split('/p/')[1];
        console.log('🔗 [DEEP LINK] Extracted shareId from URL:', extractedShareId);
      }
    } else {
      console.log('🔗 [DEEP LINK] No initial URL found - app not launched via link');
    }

    console.log('🔗 [DEEP LINK] Returning URL:', url);
    return url;
  },
  subscribe(listener) {
    const onReceiveURL = ({ url }: { url: string }) => {
      console.log('🔗 [DEEP LINK] Runtime URL received:', url);
      console.log('🔗 [DEEP LINK] Runtime URL analysis:', {
        isHttpsJsonFit: url.includes('https://json.fit'),
        isJsonAppScheme: url.includes('json-app://'),
        isSharePattern: url.includes('/share/'),
        isPPattern: url.includes('/p/'),
      });

      // Handle json-app://share/xyz pattern in runtime
      if (url.includes('json-app://share/')) {
        const shareId = url.replace('json-app://share/', '');
        const newUrl = `json-app://p/${shareId}`;
        console.log('🔗 [DEEP LINK] Converting share URL in runtime:', url, '→', newUrl, 'shareId:', shareId);
        console.log('🔗 [DEEP LINK] About to call listener with converted URL');
        listener(newUrl);
        console.log('🔗 [DEEP LINK] Listener called successfully');
      } else {
        console.log('🔗 [DEEP LINK] Passing URL through without conversion');
        // Extract shareId for logging if it's a /p/ pattern
        if (url.includes('/p/')) {
          const extractedShareId = url.split('/p/')[1];
          console.log('🔗 [DEEP LINK] Runtime extracted shareId:', extractedShareId);
        }
        console.log('🔗 [DEEP LINK] About to call listener with original URL');
        listener(url);
        console.log('🔗 [DEEP LINK] Listener called successfully');
      }
    };

    const subscription = Linking.addEventListener('url', onReceiveURL);

    return () => subscription?.remove?.();
  },
};

export default function AppNavigator({ isAuthenticated, appReady }: AppNavigatorProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  // const [feedbackModalVisible, setFeedbackModalVisible] = React.useState(false);

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
            <WorkoutRoutineProvider>
                <TimerProvider>
                  <CookTimerProvider>
                    <MealPlanningProvider>
                <SimplifiedMealPlanningProvider>
                <NavigationContainer ref={navigationRef} linking={linking}>
                <ShareIntentHandler />
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <>
              <RootStack.Screen name="Main" component={MainNavigator} />
              {/* CreateFlow — modal presentation for the center button flow */}
              <RootStack.Screen
                name="CreateFlow"
                component={CreateChooserScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                  cardStyleInterpolator: ({ current, layouts }) => ({
                    cardStyle: {
                      transform: [
                        {
                          translateY: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.height, 0],
                          }),
                        },
                      ],
                    },
                  }),
                }}
              />
              {/* SamplePlanDetail — preview + import screen for the Bulking program cards */}
              <RootStack.Screen
                name="SamplePlanDetail"
                component={SamplePlanDetailScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="ImportRoutine"
                component={ImportRoutineScreen}
                options={{
                  headerShown: false,
                  animationTypeForReplace: 'push',
                  gestureDirection: 'horizontal',
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateX: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [layouts.screen.width, 0],
                            }),
                          },
                        ],
                      },
                    };
                  },
                }}
              />
              <RootStack.Screen
                name="ImportSharedContent"
                component={ImportSharedContent}
                options={{
                  headerShown: false,
                  animationTypeForReplace: 'push',
                  gestureDirection: 'horizontal',
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateX: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [layouts.screen.width, 0],
                            }),
                          },
                        ],
                      },
                    };
                  },
                }}
              />
              <RootStack.Screen
                name="ImportMealPlan"
                component={ImportMealPlanScreen}
                options={{
                  headerShown: false,
                  animationTypeForReplace: 'push',
                  gestureDirection: 'horizontal',
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateX: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [layouts.screen.width, 0],
                            }),
                          },
                        ],
                      },
                    };
                  },
                }}
              />
              <RootStack.Screen
                name="MyWorkouts"
                component={MyWorkoutsScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen
                name="MyMealPlans"
                component={MyMealPlansScreen}
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
                  presentation: 'modal',
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: {
                      opacity: current.progress,
                    },
                  }),
                }}
              />
              <RootStack.Screen
                name="Blocks"
                component={BlocksScreen}
                options={{
                  headerShown: false,
                }}
              />
              {/* WorkoutPreview — opens when a user taps a saved workout in Library */}
              <RootStack.Screen
                name="WorkoutPreview"
                component={WorkoutPreviewScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="MesocycleBlocks"
                component={MesocycleBlocksScreen}
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
                name="MealPrepDetail"
                component={MealPrepDetailScreen}
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
                component={WorkoutLogScreenAdapter}
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
              <RootStack.Screen
                name="OneRMProgression"
                component={OneRMProgressionScreen}
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
                name="NutritionDashboard"
                component={NutritionDashboardScreen}
                options={{
                  headerShown: false,
                  animationTypeForReplace: 'push',
                  gestureDirection: 'horizontal',
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateX: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-layouts.screen.width, 0],
                            }),
                          },
                        ],
                      },
                    };
                  },
                }}
              />
              <RootStack.Screen
                name="WorkoutDashboard"
                component={WorkoutDashboardScreen}
                options={{
                  headerShown: false,
                  animationTypeForReplace: 'push',
                  gestureDirection: 'horizontal',
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateX: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-layouts.screen.width, 0],
                            }),
                          },
                        ],
                      },
                    };
                  },
                }}
/>
              <RootStack.Screen
                name="WorkoutCalendar"
                component={WorkoutCalendar}
                options={{
                  headerShown: false,
                  animationTypeForReplace: 'push',
                  gestureDirection: 'horizontal',
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateX: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [layouts.screen.width, 0],
                            }),
                          },
                        ],
                      },
                    };
                  },
                }}
              />
              <RootStack.Screen
                name="RequiredSetup"
                component={RequiredSetupScreen}
                options={{
                  headerShown: false,
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: {
                      opacity: current.progress,
                    },
                  }),
                }}
              />
              <RootStack.Screen
                name="OptionalTools"
                component={OptionalToolsScreen}
                options={{
                  headerShown: false,
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: {
                      opacity: current.progress,
                    },
                  }),
                }}
              />
              <RootStack.Screen
                name="NutritionRequiredSetup"
                component={NutritionRequiredSetupScreen}
                options={{
                  headerShown: false,
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: {
                      opacity: current.progress,
                    },
                  }),
                }}
              />
              <RootStack.Screen
                name="NutritionOptionalTools"
                component={NutritionOptionalToolsScreen}
                options={{
                  headerShown: false,
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: {
                      opacity: current.progress,
                    },
                  }),
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
                name="EquipmentPreferencesQuestionnaire"
                component={EquipmentPreferencesQuestionnaireScreen}
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
                name="MealPlanTest"
                component={MealPlanTestScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="FavoriteExercises"
                component={FavoriteExercisesScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="ExerciseDetail"
                component={ExerciseDetailScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="AddExercise"
                component={AddExerciseSelectionScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <RootStack.Screen
                name="ManualExerciseEntry"
                component={ManualExerciseEntryScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <RootStack.Screen
                name="ExerciseHelp"
                component={ExerciseHelpScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <RootStack.Screen
                name="Methodology"
                component={MethodologyScreen}
                options={{
                  headerShown: false,
                  presentation: 'modal',
                }}
              />
              <RootStack.Screen
                name="WeightTracker"
                component={WeightTrackerScreen}
                options={{
                  headerShown: false,
                  animationTypeForReplace: 'push',
                  gestureDirection: 'horizontal',
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateX: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [layouts.screen.width, 0],
                            }),
                          },
                        ],
                      },
                    };
                  },
                }}
              />
              <RootStack.Screen
                name="WeekVolumeScreen"
                component={WeekVolumeScreen}
                options={{
                  headerShown: false,
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: {
                      opacity: current.progress,
                    },
                  }),
                }}
              />
              <RootStack.Screen
                name="RecipeDetail"
                component={RecipeDetailScreen}
                options={{ headerShown: false }}
              />
              <RootStack.Screen
                name="MealsLibrary"
                component={MealsLibraryScreen}
                options={{ headerShown: false }}
              />
              <RootStack.Screen
                name="SmoothiesLibrary"
                component={SmoothiesLibraryScreen}
                options={{ headerShown: false }}
              />
              <RootStack.Screen
                name="CookMode"
                component={CookModeScreen}
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                  cardStyle: { backgroundColor: '#0a0a0b' }
                }}
              />
              {/* Questionnaire screens */}
              <RootStack.Screen name="Q1PrimaryGoal" component={Q1PrimaryGoalScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="Q2Experience" component={Q2ExperienceScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="Q3DaysPerWeek" component={Q3DaysPerWeekScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="Q4ProgramDuration" component={Q4ProgramDurationScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="Q5Equipment" component={Q5EquipmentScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="Q6Volume" component={Q6VolumePreferenceScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="Q7RestStyle" component={Q7RestStyleScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="QuestionnaireRefinements" component={RefinementsScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="PromptReady" component={PromptReadyScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="QuestionnaireSummary" component={QuestionnaireSummaryScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />

              {/* Nutrition questionnaire screens */}
              <RootStack.Screen name="N1Goal" component={N1GoalScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="N2Rate" component={N2RateScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="N3AboutYou" component={N3AboutYouScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="N4Activity" component={N4ActivityScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="N5DietType" component={N5DietTypeScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="N5bAllergies" component={N5bAllergiesScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="N5cSleep" component={N5cSleepScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="N6MealsSnacking" component={N6MealsSnackingScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="N7Location" component={N7LocationScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="N8Budget" component={N8BudgetScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="N9PlanLength" component={N9PlanLengthScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="NutritionRefinements" component={NutritionRefinementsScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="NutritionSummary" component={NutritionSummaryScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="NutritionPromptReady" component={NutritionPromptReadyScreen} options={{ 
                headerShown: false,
                cardStyleInterpolator: ({ current }) => ({
                  cardStyle: {
                    opacity: current.progress,
                  },
                }),
              }} />
              <RootStack.Screen name="CuratedFavorites" component={CuratedFavoritesScreen} options={{ headerShown: false }} />
              <RootStack.Screen name="FridgePantry" component={FridgePantryScreen} options={{ headerShown: false, presentation: 'modal' }} />
              <RootStack.Screen
                name="MealDetail"
                component={MealDetailScreen}
                options={{
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
            </>
        </RootStack.Navigator>
          <FloatingWorkoutIndicator />
          {/* <FeedbackModal 
            visible={feedbackModalVisible}
            onClose={() => setFeedbackModalVisible(false)}
          /> */}
                </NavigationContainer>
                </SimplifiedMealPlanningProvider>
                    </MealPlanningProvider>
                  </CookTimerProvider>
                </TimerProvider>
            </WorkoutRoutineProvider>
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

// Styles for the placeholder Browse / Profile / Create stub screens.
const stubStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#71717a',
    marginTop: 4,
    textAlign: 'center',
  },
});