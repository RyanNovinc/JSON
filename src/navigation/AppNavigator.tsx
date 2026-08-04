import React from 'react';
import { NavigationContainer, getStateFromPath as getStateFromPathDefault } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Animated, StyleSheet , Linking } from 'react-native';
import { navigationRef } from '../utils/navigationRef';
import { Analytics } from '../services/analytics';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import NutritionHomeScreen from '../screens/NutritionHomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SavedWorkoutsScreen from '../screens/SavedWorkoutsScreen';
import SavedNutritionScreen from '../screens/SavedNutritionScreen';
import WorkoutPreviewScreen from '../screens/WorkoutPreviewScreen';
import MealPlanPreviewScreen from '../screens/MealPlanPreviewScreen';
import SamplePlanDetailScreen from '../screens/SamplePlanDetailScreen';
// ModeTransitionContainer is no longer wired in — mode switching is now via
// the bottom tab bar. Import kept in case it's needed elsewhere.
// import ModeTransitionContainer from '../components/ModeTransitionContainer';
import ImportRoutineScreen from '../screens/ImportRoutineScreen';
import AddBlockScreen from '../screens/AddBlockScreen';
import ImportSharedContent from '../screens/ImportSharedContent';
import ImportMealPlanScreen from '../screens/ImportMealPlanScreen';
import ImportSharedMealPlan from '../screens/ImportSharedMealPlan';
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
import PrepModeScreen from '../screens/PrepModeScreen';
import MealPrepDetailScreen from '../screens/MealPrepDetailScreen';
import DaysScreen from '../screens/DaysScreen';
import WorkoutLogScreenAdapter from '../screens/WorkoutLogScreenAdapter';
import WorkoutReviewScreen from '../screens/WorkoutReviewScreen';
import OneRMProgressionScreen from '../screens/OneRMProgressionScreen';
import AppIconScreen from '../screens/AppIconScreen';
import PaymentScreen from '../screens/PaymentScreen';
import RecipeDetailScreen from '../screens/RecipeDetailScreen';
import CookModeScreen from '../screens/CookModeScreen';
import CookScreen from '../screens/CookScreen';
import MealsLibraryScreen from '../screens/MealsLibraryScreen';
import SmoothiesLibraryScreen from '../screens/SmoothiesLibraryScreen';
import MealDetailScreen from '../screens/nutrition/MealDetailScreen';
import { FloatingWorkoutIndicator } from '../components/FloatingWorkoutIndicator';
// import { FeedbackModal } from '../components/FeedbackTab';
import { AppModeProvider } from '../contexts/AppModeContext';
import { MealPlanningProvider } from '../contexts/MealPlanningContext';
import { SimplifiedMealPlanningProvider } from '../contexts/SimplifiedMealPlanningContext';
import { WeightUnitProvider } from '../contexts/WeightUnitContext';
import { ThemeProvider, NutritionThemeProvider } from '../contexts/ThemeContext';
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

// Shared goals intake — runs once before either planning flow
import GoalsIntakeScreen from '../screens/GoalsIntakeScreen';
import GoalsStatsScreen from '../screens/GoalsStatsScreen';
import ConfirmStatsScreen from '../screens/ConfirmStatsScreen';

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
import IntentForkModal from '../onboarding/IntentForkModal';
import OnboardingContractScreen from '../onboarding/OnboardingContractScreen';
import N1GoalScreen from '../screens/nutrition/questionnaire/N1GoalScreen';
import N2RateScreen from '../screens/nutrition/questionnaire/N2RateScreen';
import N3AboutYouScreen from '../screens/nutrition/questionnaire/N3AboutYouScreen';
import N4ActivityScreen from '../screens/nutrition/questionnaire/N4ActivityScreen';
import N5DietTypeScreen from '../screens/nutrition/questionnaire/N5DietTypeScreen';
import N5bAllergiesScreen from '../screens/nutrition/questionnaire/N5bAllergiesScreen';
import N5cSleepScreen from '../screens/nutrition/questionnaire/N5cSleepScreen';
import N6MealsSnackingScreen from '../screens/nutrition/questionnaire/N6MealsSnackingScreen';
import N6aDessertScreen from '../screens/nutrition/questionnaire/N6aDessertScreen';
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
  targetDate?: string;
  planId?: string;
  planName?: string;
  dayName?: string;
  displayDate?: string;
  // New meal-prep navigation params
  day?: any;
  weekNumber?: number;
  mealPlanName?: string;
  dayIndex?: number;
  calculatedDayName?: string;
  calculatedDateString?: string;
}

export type RootStackParamList = {
  Main: undefined;
  Home: undefined;
  CreateFlow: undefined;
  SamplePlanDetail: { plan: any };
  ImportRoutine: { prefilledJson?: string; fileUri?: string; receivedAt?: string; showStep1New?: boolean; shareId?: string; mode?: string; targetWorkoutId?: string; fromNewFlow?: boolean; isCurated?: boolean; curatedSlug?: string };
  AddBlock: { targetWorkoutId: string; routineName?: string };
  ImportSharedContent: { shareId: string };
  ImportMealPlan: { showStep1New?: boolean; prefilledJson?: string };
  ImportSharedMealPlan: { prefilledJson?: string };
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
  MealPlanPreview: {
    plan: {
      id: string;
      name: string;
      duration: number;
      meals: number;
      data?: any;
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
    planId?: string;
    planName?: string;
    week?: any;
    mealPlanName?: string;
    mealPrepSession?: any;
    allMealPrepSessions?: any;
    groceryList?: any;
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
    mealPrepSession?: any;
    sessionIndex?: number; // Which session to display (0, 1, 2...)
    allSessions?: any[]; // All meal prep sessions for navigation
  } | undefined;
  // Prep-day step walker for one dish, launched from MealPrepSession.
  // doneKey/planId let it mark the session task done on Batch done.
  PrepMode: {
    mealSlug: string;
    plateId: string;
    servings: number;
    planId: string;
    doneKey: string;
    title?: string;
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
  SleepOptimizationScreen: { showResults?: boolean } | undefined;
  NutritionHome: undefined;
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
  // Per-domain saved content, opened by the "Saved" pill in each home
  // screen's title row (replaced the old Library tab).
  SavedNutrition: undefined;
  SavedWorkouts: undefined;
  AddMeal: undefined;
  ManualMealEntry: { editMeal?: any; isEditing?: boolean } | undefined;
  MealPlanHelp: undefined;
  MealPlanTest: undefined;
  FavoriteExercises: { selectionMode?: boolean; onExerciseSelect?: (exercise: any) => void } | undefined;
  ExerciseDetail: {
    exercise: any;
  };
  AddExercise: undefined;
  ManualExerciseEntry: { editExercise?: any; isEditing?: boolean; day?: any; blockName?: string } | undefined;
  ExerciseHelp: undefined;
  Methodology: undefined;
  WeightTracker: undefined;
  WeekVolumeScreen: {
    exercises: any[];
    blockName: string;
    weekNumber: number;
    themeColor: string;
  };
  RecipeDetail: { mealSlug: string; plateId?: string; servings?: number };
  CookMode: { mealSlug: string; plateIndex: number; methodIndex: number };
  MealsLibrary: { cuisine?: string; title?: string } | undefined;
  SmoothiesLibrary: undefined;
  // Shared goals intake — first-run only, flows straight into the
  // plan-specific questions (no separate gate, no teleport to summary)
  GoalsIntake: { nextFlow: 'workout' | 'nutrition' } | undefined;
  // Returning-user lightweight stats confirm, shown before the
  // plan-specific questions when a usable GoalsProfile already exists
  ConfirmStats: { nextFlow: 'workout' | 'nutrition'; extraParams?: Record<string, any> } | undefined;
  // Standalone, always-reachable editable view of GoalsProfile
  GoalsStats: undefined;
  // Questionnaire screens
  Q1PrimaryGoal: { answersSoFar?: Record<string, any>; editMode?: boolean; fromOnboarding?: boolean; flowStepOffset?: number } | undefined;
  Q2Experience: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  Q3DaysPerWeek: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  Q4ProgramDuration: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  Q5Equipment: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  Q6Volume: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  Q7RestStyle: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  QuestionnaireRefinements: { answersSoFar?: Record<string, any>; editMode?: boolean } | undefined;
  PromptReady: undefined;
  QuestionnaireSummary: undefined;
  OnboardingContract: { flow?: 'meal' | 'workout' };
  // Nutrition questionnaire screens
  N1Goal: { answersSoFar?: Record<string, any>; editMode?: boolean; fromOnboarding?: boolean; flowStepOffset?: number } | undefined;
  N2Rate: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  N3AboutYou: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  N4Activity: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  N5DietType: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  N5bAllergies: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  N5cSleep: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  N6MealsSnacking: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  N6aDessert: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  N7Location: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  N8Budget: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
  N9PlanLength: { answersSoFar?: Record<string, any>; editMode?: boolean; flowStepOffset?: number } | undefined;
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
  Cook: undefined;
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
      <Tab.Screen 
        name="Nutrition" 
        children={() => (
          <NutritionThemeProvider>
            <NutritionHomeScreen />
          </NutritionThemeProvider>
        )} 
      />
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
      {/* Cook — the full-bleed vertical meal feed that took over the old
          Library tab's slot. The bar is OVERLAID here, not hidden: iOS has no
          system back for tabs, so a hidden bar strands the user on this tab.
          position: 'absolute' puts CustomTabBar into overlay mode — it floats
          over the footage instead of taking layout space, so CookScreen keeps
          sizing cards to the full window and reads the bar's real height from
          BottomTabBarHeightContext to keep its content clear of it. The rest
          of the style makes the bar translucent (the 0.62 alpha is the knob).
          Other tabs are unaffected. */}
      <Tab.Screen
        name="Cook"
        component={CookScreen}
        options={{
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'rgba(12,12,12,0.62)',
            borderTopWidth: 0,
          },
        }}
      />
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

// Normalise any json-app:// custom-scheme URL to its canonical https://json.fit/
// form, so it flows through the SAME prefixes + getStateFromPath routing below
// as a real universal link. iOS refuses to hand a universal link to the app when
// it points at the same domain the page is already on (json.fit -> json.fit), so
// the website's "Import this program" button opens the app via the json-app://
// scheme instead — and we rewrite it back to https here so the routing below
// handles it unchanged.
//   json-app://p/program/<slug> -> https://json.fit/p/program/<slug>
//   json-app://share/<id>       -> https://json.fit/p/<id>   (back-compat)
//   json-app://p/<id>           -> https://json.fit/p/<id>
function toCanonicalUrl(url: string | null): string | null {
  if (!url) return url;
  // Inbound file import (share sheet / Open-with). The OS hands us a file:// or
  // content:// URI, which matches no prefix and no route on its own. Fold it into
  // the same canonical https form as everything else, carrying the URI as a query
  // param, so it routes through getStateFromPath → ImportRoutine like a normal link.
  // ImportRoutineScreen reads params.fileUri and does the actual read.
  //
  // receivedAt stamps each delivery. Without it, re-opening the SAME file while
  // ImportRoutine is already focused produces identical params — React Navigation
  // sees no state change, never re-renders, and the import effect never re-runs, so
  // the second tap is silently a no-op (e.g. open a file, cancel, tap it again).
  // The stamp makes every delivery distinct, so one tap always == one import attempt.
  if (url.startsWith('file://') || url.startsWith('content://')) {
    return 'https://json.fit/import-file?fileUri=' + encodeURIComponent(url) +
      '&receivedAt=' + Date.now();
  }
  if (!url.startsWith('json-app://')) return url;
  let rest = url.slice('json-app://'.length);
  if (rest.startsWith('share/')) {
    rest = 'p/' + rest.slice('share/'.length);
  }
  return 'https://json.fit/' + rest;
}

const linking = {
  prefixes: ['https://json.fit'],
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
      // Inbound file import — synthesised by toCanonicalUrl from a file:// or
      // content:// URI handed to us by the share sheet / Open-with.
      // NO custom `parse` here: React Navigation already decodes query params
      // once, which exactly undoes toCanonicalUrl's single encodeURIComponent.
      // A decodeURIComponent here would decode a SECOND time and corrupt any
      // document id containing %3A / %2F — which every Downloads-provider
      // content:// URI does (e.g. .../document/raw%3A%2Fstorage%2F...).
      ImportRoutine: {
        path: 'import-file',
      },
      RecipeDetail: {
        path: 'r',
        parse: {
          mealSlug: (params: any) => params.meal,
          plateId: (params: any) => params.plate,
        },
      },
    },
  },
  // Curated program links (/p/program/<slug>) are a two-segment path that the
  // declarative `p/:shareId` rule can't match — a `:param` only captures one
  // segment. Map them explicitly to ImportSharedContent with shareId =
  // "program/<slug>", which is exactly what that screen already expects.
  // Everything else falls through to the default matcher, so normal shares
  // are unaffected.
  getStateFromPath(path: string, options: any) {
    const m = path.match(/p\/program\/([a-z0-9-]+)/i);
    if (m) {
      return {
        routes: [
          { name: 'ImportSharedContent', params: { shareId: 'program/' + m[1] } },
        ],
      };
    }
    return getStateFromPathDefault(path, options);
  },
  // Custom URL matcher. Any json-app:// custom-scheme URL is normalised to its
  // canonical https://json.fit/ form (see toCanonicalUrl above) so it flows
  // through the prefixes + getStateFromPath routing above — this is what makes
  // the website's json-app://p/program/<slug> button open the curated import.
  async getInitialURL() {
    const raw = await Linking.getInitialURL();
    const url = toCanonicalUrl(raw);
    console.log('🔗 [DEEP LINK] getInitialURL raw:', raw, '→ canonical:', url);
    return url;
  },
  subscribe(listener) {
    const onReceiveURL = ({ url }: { url: string }) => {
      const canonical = toCanonicalUrl(url) as string;
      console.log('🔗 [DEEP LINK] Runtime URL:', url, '→ canonical:', canonical);
      listener(canonical);
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
                <NavigationContainer
                  ref={navigationRef}
                  linking={linking}
                  onReady={() => {
                    const route = navigationRef.getCurrentRoute();
                    if (route?.name) Analytics.track('screen_viewed', { screen_name: route.name });
                  }}
                  onStateChange={() => {
                    const route = navigationRef.getCurrentRoute();
                    if (route?.name) Analytics.track('screen_viewed', { screen_name: route.name });
                  }}
                >
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
                name="AddBlock"
                component={AddBlockScreen}
                options={{
                  headerShown: false,
                  gestureDirection: 'horizontal',
                  cardStyleInterpolator: ({ current, layouts }) => ({
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
                  }),
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
                children={() => (
                  <NutritionThemeProvider>
                    <ImportMealPlanScreen />
                  </NutritionThemeProvider>
                )}
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
                name="ImportSharedMealPlan"
                children={() => (
                  <NutritionThemeProvider>
                    <ImportSharedMealPlan />
                  </NutritionThemeProvider>
                )}
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
                children={() => (
                  <NutritionThemeProvider>
                    <MyMealPlansScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen
                name="SampleMealPlans"
                children={() => (
                  <NutritionThemeProvider>
                    <SampleMealPlansScreen />
                  </NutritionThemeProvider>
                )}
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
              {/* WorkoutPreview — opens when a user taps a saved workout in SavedWorkouts */}
              <RootStack.Screen
                name="WorkoutPreview"
                component={WorkoutPreviewScreen}
                options={{
                  headerShown: false,
                }}
              />
              {/* MealPlanPreview — summary + import screen for saved meal plans */}
              <RootStack.Screen
                name="MealPlanPreview"
                children={() => (
                  <NutritionThemeProvider>
                    <MealPlanPreviewScreen />
                  </NutritionThemeProvider>
                )}
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
                children={() => (
                  <NutritionThemeProvider>
                    <MealPlanWeeksScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="MealPlanDays"
                children={() => (
                  <NutritionThemeProvider>
                    <MealPlanDaysScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="MealPlanDay"
                children={() => (
                  <NutritionThemeProvider>
                    <MealPlanDayScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="MealPlanMealDetail"
                children={() => (
                  <NutritionThemeProvider>
                    <MealPlanMealDetailScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="MealPrepSession"
                children={() => (
                  <NutritionThemeProvider>
                    <MealPrepSessionScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="PrepMode"
                children={() => (
                  <NutritionThemeProvider>
                    <PrepModeScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="MealPrepDetail"
                children={() => (
                  <NutritionThemeProvider>
                    <MealPrepDetailScreen />
                  </NutritionThemeProvider>
                )}
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
                children={(props) => (
                  <NutritionThemeProvider>
                    <NutritionQuestionnaireScreen {...props} />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen
                name="BudgetCookingQuestionnaire"
                children={(props) => (
                  <NutritionThemeProvider>
                    <BudgetCookingQuestionnaireScreen {...props} />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                  presentation: 'modal'
                }}
              />
              <RootStack.Screen
                name="FridgePantryQuestionnaire"
                children={() => (
                  <NutritionThemeProvider>
                    <FridgePantryQuestionnaireScreen />
                  </NutritionThemeProvider>
                )}
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
                children={() => (
                  <NutritionThemeProvider>
                    <NutritionDashboardScreen />
                  </NutritionThemeProvider>
                )}
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
                children={() => (
                  <NutritionThemeProvider>
                    <NutritionRequiredSetupScreen />
                  </NutritionThemeProvider>
                )}
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
                children={() => (
                  <NutritionThemeProvider>
                    <NutritionOptionalToolsScreen />
                  </NutritionThemeProvider>
                )}
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
                children={() => (
                  <NutritionThemeProvider>
                    <MealCalendarScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="GroceryList"
                children={() => (
                  <NutritionThemeProvider>
                    <GroceryListScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="MealRatings"
                children={() => (
                  <NutritionThemeProvider>
                    <MealRatingsScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="FavoriteMeals"
                children={() => (
                  <NutritionThemeProvider>
                    <FavoriteMealsScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              {/* Saved content, per domain. SavedNutrition re-wraps in
                  NutritionThemeProvider — a root-stack nutrition screen loses
                  the green accent otherwise. */}
              <RootStack.Screen
                name="SavedNutrition"
                children={() => (
                  <NutritionThemeProvider>
                    <SavedNutritionScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="SavedWorkouts"
                component={SavedWorkoutsScreen}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="AddMeal"
                children={() => (
                  <NutritionThemeProvider>
                    <AddMealScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="ManualMealEntry"
                children={() => (
                  <NutritionThemeProvider>
                    <ManualMealEntryScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="MealPlanHelp"
                children={() => (
                  <NutritionThemeProvider>
                    <MealPlanHelpScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                }}
              />
              <RootStack.Screen
                name="MealPlanTest"
                children={() => (
                  <NutritionThemeProvider>
                    <MealPlanTestScreen />
                  </NutritionThemeProvider>
                )}
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
                children={() => (
                  <NutritionThemeProvider>
                    <RecipeDetailScreen />
                  </NutritionThemeProvider>
                )}
                options={{ headerShown: false }}
              />
              <RootStack.Screen
                name="MealsLibrary"
                children={() => (
                  <NutritionThemeProvider>
                    <MealsLibraryScreen />
                  </NutritionThemeProvider>
                )}
                options={{ headerShown: false }}
              />
              <RootStack.Screen
                name="SmoothiesLibrary"
                component={SmoothiesLibraryScreen}
                options={{ headerShown: false }}
              />
              <RootStack.Screen
                name="CookMode"
                children={() => (
                  <NutritionThemeProvider>
                    <CookModeScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                  cardStyle: { backgroundColor: '#0a0a0b' }
                }}
              />
              <RootStack.Screen
                name="OnboardingContract"
                component={OnboardingContractScreen}
                options={{
                  headerShown: false,
                  // Appear instantly (no fade). We navigate here while the fork
                  // modal is still opaque on top, so the contract must fully cover
                  // Main from the first frame — a fade-in would let the Main tab
                  // show through behind the contract as the fork dismisses.
                  animationEnabled: false,
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: { opacity: current.progress },
                  }),
                }}
              />
              {/* Shared goals intake — first-run only, flows straight into
                  the plan-specific questions */}
              <RootStack.Screen
                name="GoalsIntake"
                component={GoalsIntakeScreen}
                options={{
                  headerShown: false,
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: { opacity: current.progress },
                  }),
                }}
              />
              {/* Returning-user lightweight stats confirm */}
              <RootStack.Screen
                name="ConfirmStats"
                component={ConfirmStatsScreen}
                options={{
                  headerShown: false,
                  cardStyleInterpolator: ({ current }) => ({
                    cardStyle: { opacity: current.progress },
                  }),
                }}
              />
              {/* Standalone, always-reachable editable view of GoalsProfile */}
              <RootStack.Screen
                name="GoalsStats"
                component={GoalsStatsScreen}
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
              <RootStack.Screen 
                name="N1Goal" 
                children={() => (
                  <NutritionThemeProvider>
                    <N1GoalScreen />
                  </NutritionThemeProvider>
                )}
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
                name="N2Rate" 
                children={() => (
                  <NutritionThemeProvider>
                    <N2RateScreen />
                  </NutritionThemeProvider>
                )}
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
                name="N3AboutYou" 
                children={() => (
                  <NutritionThemeProvider>
                    <N3AboutYouScreen />
                  </NutritionThemeProvider>
                )}
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
                name="N4Activity" 
                children={() => (
                  <NutritionThemeProvider>
                    <N4ActivityScreen />
                  </NutritionThemeProvider>
                )}
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
                name="N5DietType" 
                children={() => (
                  <NutritionThemeProvider>
                    <N5DietTypeScreen />
                  </NutritionThemeProvider>
                )}
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
                name="N5bAllergies" 
                children={() => (
                  <NutritionThemeProvider>
                    <N5bAllergiesScreen />
                  </NutritionThemeProvider>
                )}
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
                name="N5cSleep" 
                children={() => (
                  <NutritionThemeProvider>
                    <N5cSleepScreen />
                  </NutritionThemeProvider>
                )}
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
                name="N6MealsSnacking" 
                children={() => (
                  <NutritionThemeProvider>
                    <N6MealsSnackingScreen />
                  </NutritionThemeProvider>
                )}
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
                name="N6aDessert"
                children={() => (
                  <NutritionThemeProvider>
                    <N6aDessertScreen />
                  </NutritionThemeProvider>
                )}
              />
              <RootStack.Screen 
                name="N7Location" 
                children={() => (
                  <NutritionThemeProvider>
                    <N7LocationScreen />
                  </NutritionThemeProvider>
                )}
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
                name="N8Budget" 
                children={() => (
                  <NutritionThemeProvider>
                    <N8BudgetScreen />
                  </NutritionThemeProvider>
                )}
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
                name="N9PlanLength" 
                children={() => (
                  <NutritionThemeProvider>
                    <N9PlanLengthScreen />
                  </NutritionThemeProvider>
                )}
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
                name="NutritionRefinements" 
                children={() => (
                  <NutritionThemeProvider>
                    <NutritionRefinementsScreen />
                  </NutritionThemeProvider>
                )}
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
                name="NutritionSummary" 
                children={() => (
                  <NutritionThemeProvider>
                    <NutritionSummaryScreen />
                  </NutritionThemeProvider>
                )}
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
                name="NutritionPromptReady" 
                children={() => (
                  <NutritionThemeProvider>
                    <NutritionPromptReadyScreen />
                  </NutritionThemeProvider>
                )}
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
                name="CuratedFavorites" 
                children={() => (
                  <NutritionThemeProvider>
                    <CuratedFavoritesScreen />
                  </NutritionThemeProvider>
                )} 
                options={{ headerShown: false }} 
              />
              <RootStack.Screen 
                name="FridgePantry" 
                children={() => (
                  <NutritionThemeProvider>
                    <FridgePantryScreen />
                  </NutritionThemeProvider>
                )} 
                options={{ headerShown: false, presentation: 'modal' }} 
              />
              <RootStack.Screen
                name="MealDetail"
                children={() => (
                  <NutritionThemeProvider>
                    <MealDetailScreen />
                  </NutritionThemeProvider>
                )}
                options={{
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
            </>
        </RootStack.Navigator>
          <FloatingWorkoutIndicator />
          <IntentForkModal />
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