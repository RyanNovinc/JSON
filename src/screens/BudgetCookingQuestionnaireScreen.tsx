import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
   
  ScrollView, 
  StatusBar,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import CountryPicker from 'react-native-country-picker-modal';
import { useNavigation } from '@react-navigation/native';
import { WorkoutStorage } from '../utils/storage';
import { useMealPlanning } from '../contexts/MealPlanningContext';

interface BudgetCookingQuestionnaireProps {
  onComplete?: (data: any) => void;
  onBack?: () => void;
}

const BudgetCookingQuestionnaireScreen: React.FC<BudgetCookingQuestionnaireProps> = ({
  onComplete,
  onBack
}) => {
  const navigation = useNavigation();
  const { getFavoriteMeals } = useMealPlanning();
  const [currentStep, setCurrentStep] = useState(0);
  
  const handleComplete = async () => {
    try {
      // Save budget cooking results to storage
      const results = {
        formData,
        completedAt: new Date().toISOString(),
      };
      await WorkoutStorage.saveBudgetCookingResults(results);
      
      // Call onComplete if provided, otherwise navigate back to NutritionHome
      if (onComplete) {
        onComplete(formData);
      } else {
        navigation.navigate('NutritionHome' as never);
      }
    } catch (error) {
      console.error('Failed to save budget cooking results:', error);
      // Still navigate back even if save fails
      navigation.navigate('NutritionHome' as never);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.navigate('NutritionHome' as never);
    }
  };
  const [formData, setFormData] = useState({
    weeklyBudget: '',
    customBudgetAmount: '',
    country: '',
    countryCode: '',
    city: '',
    groceryStore: '',
    // Kitchen personality scales (1-5)
    planningStyle: 0, // 1=meal prep everything, 5=decide last minute
    cookingEnjoyment: 0, // 1=cooking is chore, 5=cooking is hobby
    timeInvestment: 0, // 1=5min meals only, 5=happy spending 2+ hours
    varietySeeking: 0, // 1=same meals all week, 5=different every day
    skillConfidence: 0, // 1=afraid to try new, 5=love experimenting
    mealsPerDay: 0,
    snackingStyle: '',
    eatingChallenges: [] as string[],
    allergies: [] as string[],
    avoidFoods: [] as string[],
    planDuration: 7, // Default to recommended 7 days
    mealPreferences: '', // 'ai_suggest' or 'include_favorites'
    selectedFavorites: [] as string[], // Array of favorite meal IDs
    customMealRequests: '', // Text input for custom requests
    cookingEquipment: [] as string[], // Available cooking equipment
  });
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [customAllergy, setCustomAllergy] = useState('');
  const [customAvoidFood, setCustomAvoidFood] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Get favorite meals
  const favoriteMeals = getFavoriteMeals();

  // Function to toggle favorite meal selection
  const toggleFavoriteMeal = (mealId: string) => {
    const currentSelection = formData.selectedFavorites || [];
    if (currentSelection.includes(mealId)) {
      // Remove from selection
      setFormData({
        ...formData,
        selectedFavorites: currentSelection.filter(id => id !== mealId)
      });
    } else {
      // Add to selection
      setFormData({
        ...formData,
        selectedFavorites: [...currentSelection, mealId]
      });
    }
  };

  // Function to toggle cooking equipment selection
  const toggleCookingEquipment = (equipment: string) => {
    const currentSelection = formData.cookingEquipment || [];
    if (currentSelection.includes(equipment)) {
      // Remove from selection
      setFormData({
        ...formData,
        cookingEquipment: currentSelection.filter(item => item !== equipment)
      });
    } else {
      // Add to selection
      setFormData({
        ...formData,
        cookingEquipment: [...currentSelection, equipment]
      });
    }
  };

  // Check if questionnaire is already completed on mount
  useEffect(() => {
    const checkCompletionStatus = async () => {
      try {
        const existingResults = await WorkoutStorage.loadBudgetCookingResults();
        if (existingResults) {
          // Load existing data with fallbacks for new fields
          setFormData({
            ...existingResults.formData,
            planDuration: existingResults.formData.planDuration || 7, // Default to 7 days for existing data
            mealPreferences: existingResults.formData.mealPreferences || '',
            selectedFavorites: existingResults.formData.selectedFavorites || [],
            customMealRequests: existingResults.formData.customMealRequests || '',
            cookingEquipment: existingResults.formData.cookingEquipment || []
          });
          setShowResults(true);
        }
      } catch (error) {
        console.error('Failed to load existing budget cooking results:', error);
      }
    };

    checkCompletionStatus();
  }, []);

  const colors = {
    primary: '#00D4FF',
    primaryDark: '#0099CC',
    primaryLight: '#66E5FF',
    primaryAlpha10: '#00D4FF20',
    primaryAlpha20: '#00D4FF40',
    primaryAlpha30: '#00D4FF60',
  };

  const totalSteps = 7;

  const getStoreRecommendation = () => {
    const budget = formData.weeklyBudget;
    const country = formData.country.toLowerCase();
    
    // For custom budgets, recommend based on amount
    const getCustomBudgetCategory = (amount: string | undefined) => {
      const numAmount = parseInt(amount || '0') || 0;
      if (numAmount < 80) return 'very_tight';
      if (numAmount < 120) return 'budget_conscious';
      if (numAmount < 180) return 'moderate';
      if (numAmount < 250) return 'comfortable';
      return 'unlimited';
    };
    
    const effectiveBudget = budget === 'custom' ? getCustomBudgetCategory(formData.customBudgetAmount) : budget;
    
    // Budget-conscious recommendations by country
    const recommendations: Record<string, Record<string, string>> = {
      'australia': {
        'very_tight': 'Aldi',
        'budget_conscious': 'Aldi',
        'moderate': 'Coles',
        'comfortable': 'Woolworths',
        'unlimited': 'Harris Farm Markets'
      },
      'united states': {
        'very_tight': 'Walmart',
        'budget_conscious': 'Walmart',
        'moderate': 'Target',
        'comfortable': 'Whole Foods',
        'unlimited': 'Whole Foods'
      },
      'united kingdom': {
        'very_tight': 'Aldi',
        'budget_conscious': 'Lidl',
        'moderate': 'Tesco',
        'comfortable': 'Sainsbury\'s',
        'unlimited': 'Waitrose'
      },
      'canada': {
        'very_tight': 'No Frills',
        'budget_conscious': 'No Frills',
        'moderate': 'Metro',
        'comfortable': 'Loblaws',
        'unlimited': 'Loblaws'
      }
    };

    // Default fallback recommendations
    const defaultRecommendations: Record<string, string> = {
      'very_tight': 'Budget grocery store',
      'budget_conscious': 'Discount supermarket',
      'moderate': 'Local supermarket',
      'comfortable': 'Premium supermarket',
      'unlimited': 'Gourmet grocery store'
    };

    return recommendations[country]?.[effectiveBudget] || defaultRecommendations[effectiveBudget] || 'Local supermarket';
  };

  const handleSmartRecommendation = () => {
    setFormData({ ...formData, groceryStore: "I don't care, pick for me" });
  };

  const budgetOptions = [
    {
      id: 'custom',
      title: 'Custom Amount',
      subtitle: 'Enter your exact budget',
      icon: 'create-outline',
      accentColor: '#3b82f6',
      description: 'Specify your weekly grocery budget'
    },
    {
      id: 'very_tight',
      title: 'Very Tight Budget',
      subtitle: 'Every dollar counts',
      icon: 'water-outline',
      accentColor: '#71717a',
      description: 'Rice, beans, pasta, frozen veggies, bulk items'
    },
    {
      id: 'budget_conscious',
      title: 'Budget Conscious', 
      subtitle: 'Smart shopping',
      icon: 'leaf-outline',
      accentColor: '#22c55e',
      description: 'Chicken thighs, canned tuna, seasonal produce, store brands'
    },
    {
      id: 'moderate',
      title: 'Moderate Spending',
      subtitle: 'Balanced choices',
      icon: 'scale-outline',
      accentColor: '#f59e0b',
      description: 'Mix of fresh & frozen, some premium proteins, variety'
    },
    {
      id: 'comfortable',
      title: 'Comfortable Budget',
      subtitle: 'Quality focused',
      icon: 'diamond-outline',
      accentColor: '#8b5cf6',
      description: 'Organic options, fresh fish, quality meats, specialty items'
    },
    {
      id: 'unlimited',
      title: 'Money No Object',
      subtitle: 'Premium everything',
      icon: 'star-outline',
      accentColor: '#ef4444',
      description: 'Best quality, dining out, premium supplements, anything goes'
    }
  ];

  const cookingStyleOptions = [
    {
      id: 'meal_prep',
      title: 'Meal Prep Master',
      subtitle: 'Batch cook once, eat all week',
      emoji: '📦',
      gradient: ['#2196F3', '#64B5F6'],
    },
    {
      id: 'fresh_variety',
      title: 'Fresh & Varied',
      subtitle: 'Different meals every day',
      emoji: '🍽️',
      gradient: ['#4CAF50', '#81C784'],
    },
    {
      id: 'quick_convenient',
      title: 'Quick & Convenient', 
      subtitle: 'Fast meals, minimal prep',
      emoji: '⚡',
      gradient: ['#FF9800', '#FFB74D'],
    },
    {
      id: 'gourmet_cooking',
      title: 'Gourmet Cooking',
      subtitle: 'Love spending time in kitchen',
      emoji: '👨‍🍳',
      gradient: ['#9C27B0', '#BA68C8'],
    }
  ];

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Show results page after completing all steps
      setShowResults(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onBack();
    }
  };


  const renderBudgetStep = () => (
    <View style={styles.stepContainer}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={[styles.header, { borderBottomColor: colors.primaryAlpha20 }]}>
          <View style={styles.progressContainer}>
            <View style={styles.stepIndicator}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>
                {currentStep + 1}
              </Text>
              <Text style={styles.stepTotal}>/{totalSteps}</Text>
            </View>
            
            <View style={[styles.progressTrack, { backgroundColor: colors.primaryAlpha20 }]}>
              <View
                style={[
                  styles.progressFill,
                  { 
                    width: `${((currentStep + 1) / totalSteps) * 100}%`,
                    backgroundColor: colors.primary 
                  }
                ]}
              />
            </View>
          </View>
        </View>
        
        <Animatable.View
          animation="fadeInUp"
          delay={200}
          style={styles.content}
        >
          <Text style={[styles.stepTitle, { color: colors.primary }]}>
            What's Your Grocery Budget?
          </Text>
          
          <View style={styles.optionsContainer}>
            {budgetOptions.map((option, index) => (
              <Animatable.View
                key={option.id}
                animation="fadeInUp"
                delay={300 + (index * 100)}
              >
                <TouchableOpacity
                  style={[
                    styles.budgetOptionCard,
                    formData.weeklyBudget === option.id && [
                      styles.selectedBudgetCard,
                      { borderColor: option.accentColor }
                    ]
                  ]}
                  onPress={() => setFormData({ 
                    ...formData, 
                    weeklyBudget: formData.weeklyBudget === option.id ? '' : option.id,
                    customBudgetAmount: formData.weeklyBudget === option.id ? '' : formData.customBudgetAmount
                  })}
                  activeOpacity={0.8}
                >
                  {option.id === 'custom' && formData.weeklyBudget === 'custom' ? (
                    // Custom input version of the card
                    <View style={styles.budgetCardContent}>
                      <View style={[styles.budgetIconContainer, { backgroundColor: `${option.accentColor}20` }]}>
                        <Ionicons 
                          name={option.icon as any} 
                          size={28} 
                          color={option.accentColor} 
                        />
                      </View>
                      
                      <View style={styles.budgetTextContainer}>
                        <Text style={[styles.budgetTitle, { color: '#ffffff' }]}>
                          {option.title}
                        </Text>
                        <View style={styles.inlineCustomBudgetContainer}>
                          <Text style={styles.inlineCurrencySymbol}>$</Text>
                          <TextInput
                            style={styles.inlineCustomBudgetInput}
                            value={formData.customBudgetAmount}
                            onChangeText={(text) => setFormData({ 
                              ...formData, 
                              customBudgetAmount: text.replace(/[^0-9]/g, '') 
                            })}
                            placeholder="150"
                            placeholderTextColor="#71717a"
                            keyboardType="numeric"
                            autoFocus
                          />
                          <Text style={styles.inlineBudgetFrequency}>per week</Text>
                        </View>
                      </View>
                      
                      <View style={styles.budgetSelectIndicator}>
                        <Ionicons name="radio-button-on" size={24} color={option.accentColor} />
                      </View>
                    </View>
                  ) : (
                    // Normal card version
                    <View style={styles.budgetCardContent}>
                      <View style={[styles.budgetIconContainer, { backgroundColor: `${option.accentColor}20` }]}>
                        <Ionicons 
                          name={option.icon as any} 
                          size={28} 
                          color={option.accentColor} 
                        />
                      </View>
                      
                      <View style={styles.budgetTextContainer}>
                        <Text style={[styles.budgetTitle, { color: '#ffffff' }]}>
                          {option.title}
                        </Text>
                        <Text style={[styles.budgetSubtitle, { color: option.accentColor }]}>
                          {option.subtitle}
                        </Text>
                        <Text style={styles.budgetDescription}>
                          {option.description}
                        </Text>
                      </View>
                      
                      <View style={styles.budgetSelectIndicator}>
                        {formData.weeklyBudget === option.id ? (
                          <Ionicons name="radio-button-on" size={24} color={option.accentColor} />
                        ) : (
                          <Ionicons name="radio-button-off" size={24} color="#3f3f46" />
                        )}
                      </View>
                    </View>
                  )}
                  
                  {formData.weeklyBudget === option.id && (
                    <View style={[styles.budgetSelectedBorder, { backgroundColor: option.accentColor }]} />
                  )}
                </TouchableOpacity>
              </Animatable.View>
            ))}
            
          </View>
        </Animatable.View>
      </ScrollView>
    </View>
  );

  const renderLocationStep = () => (
    <KeyboardAvoidingView 
      style={styles.stepContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { borderBottomColor: colors.primaryAlpha20 }]}>
          <View style={styles.progressContainer}>
            <View style={styles.stepIndicator}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>
                {currentStep + 1}
              </Text>
              <Text style={styles.stepTotal}>/{totalSteps}</Text>
            </View>
            
            <View style={[styles.progressTrack, { backgroundColor: colors.primaryAlpha20 }]}>
              <View
                style={[
                  styles.progressFill,
                  { 
                    width: `${((currentStep + 1) / totalSteps) * 100}%`,
                    backgroundColor: colors.primary 
                  }
                ]}
              />
            </View>
          </View>
        </View>
        
        <Animatable.View
          animation="fadeInUp"
          delay={200}
          style={styles.content}
        >
          <Text style={[styles.stepTitle, { color: colors.primary }]}>
            Where Do You Shop?
          </Text>
          <Text style={styles.stepSubtitle}>
            Location affects food costs and availability
          </Text>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Country</Text>
              <TouchableOpacity
                style={[styles.countryPickerButton, { borderColor: colors.primaryAlpha20 }]}
                onPress={() => setShowCountryPicker(true)}
              >
                <Text style={[styles.countryPickerText, { color: formData.country ? '#ffffff' : '#666666' }]}>
                  {formData.country || 'Select your country'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.primary} />
              </TouchableOpacity>
              
              <CountryPicker
                visible={showCountryPicker}
                onClose={() => setShowCountryPicker(false)}
                onSelect={(country) => {
                  setFormData({ 
                    ...formData, 
                    country: country.name,
                    countryCode: country.cca2
                  });
                  setShowCountryPicker(false);
                }}
                withFlag
                withCallingCode={false}
                withEmoji={true}
                countryCode={formData.countryCode as any}
                theme={{
                  backgroundColor: '#000000',
                  onBackgroundTextColor: '#ffffff',
                  fontSize: 16,
                  filterPlaceholderTextColor: '#666666',
                  activeOpacity: 0.7,
                  itemHeight: 60,
                }}
                modalProps={{
                  presentationStyle: 'pageSheet'
                }}
                containerButtonStyle={{
                  backgroundColor: 'transparent',
                  opacity: 0,
                  height: 0,
                }}
                textStyle={{
                  opacity: 0,
                  height: 0,
                }}
                renderFlagButton={() => null}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City/Town</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.primaryAlpha20 }]}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                placeholder="Enter your city or town"
                placeholderTextColor="#666666"
                autoCapitalize="words"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Where do you shop?</Text>
              <TextInput
                style={[styles.textInput, { borderColor: colors.primaryAlpha20 }]}
                value={formData.groceryStore}
                onChangeText={(text) => setFormData({ ...formData, groceryStore: text })}
                placeholder="e.g. Coles, Walmart, Tesco"
                placeholderTextColor="#666666"
                autoCapitalize="words"
              />
              
              {!formData.groceryStore && (
                <TouchableOpacity
                  style={[styles.smartButton, { backgroundColor: colors.primaryAlpha20, borderColor: colors.primary }]}
                  onPress={handleSmartRecommendation}
                  activeOpacity={0.7}
                >
                  <Ionicons name="shuffle" size={16} color={colors.primary} />
                  <Text style={[styles.smartButtonText, { color: colors.primary }]}>
                    I don't care, pick for me
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animatable.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderCookingStyleStep = () => (
    <View style={styles.stepContainer}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={[styles.header, { borderBottomColor: colors.primaryAlpha20 }]}>
          <View style={styles.progressContainer}>
            <View style={styles.stepIndicator}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>
                {currentStep + 1}
              </Text>
              <Text style={styles.stepTotal}>/{totalSteps}</Text>
            </View>
            
            <View style={[styles.progressTrack, { backgroundColor: colors.primaryAlpha20 }]}>
              <View
                style={[
                  styles.progressFill,
                  { 
                    width: `${((currentStep + 1) / totalSteps) * 100}%`,
                    backgroundColor: colors.primary 
                  }
                ]}
              />
            </View>
          </View>
        </View>
        
        <Animatable.View
          animation="fadeInUp"
          delay={200}
          style={styles.content}
        >
          <Text style={[styles.stepTitle, { color: colors.primary }]}>
            What's Your Cooking Style?
          </Text>
          <Text style={styles.stepSubtitle}>
            How do you prefer to prepare your meals?
          </Text>
          
          <View style={styles.optionsContainer}>
            {cookingStyleOptions.map((option, index) => (
              <Animatable.View
                key={option.id}
                animation="fadeInUp"
                delay={300 + (index * 100)}
              >
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    formData.cookingStyle === option.id && [
                      styles.selectedCard,
                      { borderColor: colors.primary }
                    ]
                  ]}
                  onPress={() => setFormData({ 
                    ...formData, 
                    cookingStyle: formData.cookingStyle === option.id ? '' : option.id 
                  })}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={option.gradient}
                    style={styles.optionGradient}
                  >
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                    </View>
                    {formData.cookingStyle === option.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animatable.View>
            ))}
          </View>
        </Animatable.View>
      </ScrollView>
    </View>
  );

  const renderKitchenPersonalityStep = () => {
    const personalityScales = [
      {
        id: 'planningStyle',
        title: 'Meal Planning',
        left: 'I meal prep everything',
        right: 'I decide what to eat last minute',
        value: formData.planningStyle,
        descriptions: {
          1: 'Dedicated Meal Prepper',
          2: 'Weekly Planner', 
          3: 'Flexible Planner',
          4: 'Spontaneous Cook',
          5: 'Last-Minute Decider'
        }
      },
      {
        id: 'cookingEnjoyment', 
        title: 'Cooking Enjoyment',
        left: 'Cooking is a chore',
        right: 'Cooking is my favorite hobby',
        value: formData.cookingEnjoyment,
        descriptions: {
          1: 'Cooking Avoider',
          2: 'Reluctant Cook',
          3: 'Neutral Cook', 
          4: 'Cooking Enthusiast',
          5: 'Passionate Home Chef'
        }
      },
      {
        id: 'timeInvestment',
        title: 'Time Investment', 
        left: '5-minute meals only',
        right: 'Happy spending 2+ hours',
        value: formData.timeInvestment,
        descriptions: {
          1: 'Speed Cook',
          2: 'Quick Meals',
          3: 'Moderate Cook',
          4: 'Thorough Cook', 
          5: 'Slow Food Lover'
        }
      },
      {
        id: 'varietySeeking',
        title: 'Variety Seeking',
        left: 'Same meals all week is fine', 
        right: 'Need something different daily',
        value: formData.varietySeeking,
        descriptions: {
          1: 'Routine Eater',
          2: 'Mostly Consistent',
          3: 'Moderate Variety',
          4: 'Variety Seeker',
          5: 'Adventure Eater'
        }
      },
      {
        id: 'skillConfidence',
        title: 'Skill Confidence',
        left: 'Afraid to try new techniques',
        right: 'Love experimenting with recipes',
        value: formData.skillConfidence,
        descriptions: {
          1: 'Kitchen Beginner',
          2: 'Cautious Cook',
          3: 'Comfortable Cook',
          4: 'Confident Cook',
          5: 'Kitchen Experimenter'
        }
      }
    ];

    return (
      <View style={styles.stepContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View style={[styles.header, { borderBottomColor: colors.primaryAlpha20 }]}>
            <View style={styles.progressContainer}>
              <View style={styles.stepIndicator}>
                <Text style={[styles.stepNumber, { color: colors.primary }]}>
                  {currentStep + 1}
                </Text>
                <Text style={styles.stepTotal}>/{totalSteps}</Text>
              </View>
              
              <View style={[styles.progressTrack, { backgroundColor: colors.primaryAlpha20 }]}>
                <View
                  style={[
                    styles.progressFill,
                    { 
                      width: `${((currentStep + 1) / totalSteps) * 100}%`,
                      backgroundColor: colors.primary 
                    }
                  ]}
                />
              </View>
            </View>
          </View>
          
          <Animatable.View
            animation="fadeInUp"
            delay={200}
            style={styles.content}
          >
            <Text style={[styles.stepTitle, { color: colors.primary }]}>
              Your Kitchen Personality
            </Text>
            <Text style={styles.stepSubtitle}>
              Rate yourself on these scales (1-5)
            </Text>
            
            <View style={styles.scalesContainer}>
              {personalityScales.map((scale, index) => (
                <Animatable.View
                  key={scale.id}
                  animation="fadeInUp"
                  delay={300 + (index * 100)}
                  style={styles.scaleGroup}
                >
                  <Text style={styles.scaleTitle}>{scale.title}</Text>
                  
                  <View style={styles.scaleLabels}>
                    {scale.value > 0 ? (
                      <View style={styles.selectedDescriptionContainer}>
                        <Text style={[styles.selectedDescription, { color: colors.primary }]}>
                          {scale.descriptions[scale.value]}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.scaleLabel}>{scale.left}</Text>
                        <Text style={styles.scaleLabel}>{scale.right}</Text>
                      </>
                    )}
                  </View>
                  
                  <View style={styles.scaleContainer}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <TouchableOpacity
                        key={rating}
                        style={[
                          styles.scaleButton,
                          scale.value === rating && [
                            styles.selectedScale,
                            { backgroundColor: colors.primary }
                          ]
                        ]}
                        onPress={() => setFormData({ 
                          ...formData, 
                          [scale.id]: scale.value === rating ? 0 : rating 
                        })}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.scaleButtonText,
                          { color: scale.value === rating ? '#000000' : '#ffffff' }
                        ]}>
                          {rating}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animatable.View>
              ))}
            </View>
          </Animatable.View>
        </ScrollView>
      </View>
    );
  };

  const renderFoodPreferencesStep = () => (
    <View style={styles.stepContainer}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={[styles.header, { borderBottomColor: colors.primaryAlpha20 }]}>
          <View style={styles.progressContainer}>
            <View style={styles.stepIndicator}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>
                {currentStep + 1}
              </Text>
              <Text style={styles.stepTotal}>/{totalSteps}</Text>
            </View>
            
            <View style={[styles.progressTrack, { backgroundColor: colors.primaryAlpha20 }]}>
              <View
                style={[
                  styles.progressFill,
                  { 
                    width: `${((currentStep + 1) / totalSteps) * 100}%`,
                    backgroundColor: colors.primary 
                  }
                ]}
              />
            </View>
          </View>
        </View>
        
        <Animatable.View
          animation="fadeInUp"
          delay={200}
          style={styles.content}
        >
          <Text style={[styles.stepTitle, { color: colors.primary }]}>
            Eating Patterns
          </Text>
          
          <View style={styles.preferencesContainer}>
            {/* Meal Frequency */}
            <Animatable.View
              animation="fadeInUp"
              delay={300}
              style={styles.preferenceSection}
            >
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                How Many Meals Per Day?
              </Text>
              <Text style={styles.sectionSubtitle}>
                Some people prefer fewer big meals, others like smaller frequent meals
              </Text>
              
              <View style={styles.mealFrequencyContainer}>
                {[
                  { value: 2, label: '2 Big Meals', description: 'Smash it out in two sittings' },
                  { value: 3, label: '3 Regular Meals', description: 'Breakfast, lunch, dinner' },
                  { value: 4, label: '4 Main Meals', description: 'Four proper meals throughout day' },
                  { value: 5, label: '5 Smaller Meals', description: 'Five main meals, smaller portions' },
                  { value: 6, label: '6+ Mini Meals', description: 'Frequent small main meals' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.mealFrequencyOption,
                      formData.mealsPerDay === option.value && [
                        styles.selectedMealOption,
                        { backgroundColor: colors.primary }
                      ]
                    ]}
                    onPress={() => setFormData({ ...formData, mealsPerDay: option.value })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.mealOptionLabel,
                      { color: formData.mealsPerDay === option.value ? '#000000' : '#ffffff' }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.mealOptionDescription,
                      { color: formData.mealsPerDay === option.value ? '#333333' : '#888888' }
                    ]}>
                      {option.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animatable.View>

            {/* Snacking Preferences */}
            <Animatable.View
              animation="fadeInUp"
              delay={400}
              style={styles.preferenceSection}
            >
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                Snacking Style
              </Text>
              <Text style={styles.sectionSubtitle}>
                How do you feel about snacking between meals?
              </Text>
              
              <View style={styles.optionsGrid}>
                {[
                  'Love snacking', 'Occasional snacker', 'Hate snacking', 
                  'Need healthy snacks', 'Sweet tooth snacker', 'Savory snacker'
                ].map((snackStyle) => (
                  <TouchableOpacity
                    key={snackStyle}
                    style={[
                      styles.optionButton,
                      formData.snackingStyle === snackStyle && [
                        styles.selectedOption,
                        { backgroundColor: colors.primary }
                      ]
                    ]}
                    onPress={() => setFormData({ ...formData, snackingStyle: snackStyle })}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: formData.snackingStyle === snackStyle ? '#000000' : '#ffffff' }
                    ]}>
                      {snackStyle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animatable.View>

            {/* Eating Challenges */}
            <Animatable.View
              animation="fadeInUp"
              delay={500}
              style={styles.preferenceSection}
            >
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                Any Eating Challenges?
              </Text>
              <Text style={styles.sectionSubtitle}>
                This helps us suggest the right meal types and textures
              </Text>
              
              <View style={styles.optionsGrid}>
                {[
                  'Struggle to eat enough', 'Prefer liquid meals', 'Need saucy foods',
                  'Hate dry foods', 'Small appetite', 'Need calorie-dense meals',
                  'Prefer smooth textures', 'No challenges'
                ].map((challenge) => (
                  <TouchableOpacity
                    key={challenge}
                    style={[
                      styles.optionButton,
                      formData.eatingChallenges?.includes(challenge) && [
                        styles.selectedOption,
                        { backgroundColor: colors.primary }
                      ]
                    ]}
                    onPress={() => {
                      const current = formData.eatingChallenges || [];
                      let updated;
                      
                      if (challenge === 'No challenges') {
                        updated = current.includes(challenge) ? [] : ['No challenges'];
                      } else {
                        updated = current.includes(challenge)
                          ? current.filter(c => c !== challenge)
                          : [...current.filter(c => c !== 'No challenges'), challenge];
                      }
                      
                      setFormData({ ...formData, eatingChallenges: updated });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: formData.eatingChallenges?.includes(challenge) ? '#000000' : '#ffffff' }
                    ]}>
                      {challenge}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animatable.View>

            {/* Food Allergies & Avoidances */}
            <Animatable.View
              animation="fadeInUp"
              delay={600}
              style={styles.preferenceSection}
            >
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                Allergies & Foods to Avoid
              </Text>
              <Text style={styles.sectionSubtitle}>
                Any allergies or foods you prefer to avoid for any reason
              </Text>
              
              <View style={styles.allergyContainer}>
                <Text style={[styles.allergySubheading, { color: colors.primary }]}>
                  🚨 Allergies (Medical)
                </Text>
                <View style={styles.optionsGrid}>
                  {[
                    'Nuts', 'Shellfish', 'Dairy', 'Eggs', 'Gluten/Wheat',
                    'Soy', 'Fish', 'Sesame', 'No allergies',
                    ...(formData.allergies || []).filter(a => 
                      !['Nuts', 'Shellfish', 'Dairy', 'Eggs', 'Gluten/Wheat', 'Soy', 'Fish', 'Sesame', 'No allergies'].includes(a)
                    )
                  ].map((allergy, index) => (
                    <TouchableOpacity
                      key={`allergy-${index}-${allergy}`}
                      style={[
                        styles.optionButton,
                        styles.allergyButton,
                        formData.allergies?.includes(allergy) && [
                          styles.selectedAllergy,
                          { backgroundColor: '#FF4444' }
                        ],
                        // Custom entries get special styling
                        !['Nuts', 'Shellfish', 'Dairy', 'Eggs', 'Gluten/Wheat', 'Soy', 'Fish', 'Sesame', 'No allergies'].includes(allergy) && 
                        styles.customEntry
                      ]}
                      onPress={() => {
                        const current = formData.allergies || [];
                        let updated;
                        
                        if (allergy === 'No allergies') {
                          updated = current.includes(allergy) ? [] : ['No allergies'];
                        } else {
                          updated = current.includes(allergy)
                            ? current.filter(a => a !== allergy)
                            : [...current.filter(a => a !== 'No allergies'), allergy];
                        }
                        
                        setFormData({ ...formData, allergies: updated });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: formData.allergies?.includes(allergy) ? '#FFFFFF' : '#ffffff' }
                      ]}>
                        {allergy}
                      </Text>
                      {/* Show X button for custom entries */}
                      {!['Nuts', 'Shellfish', 'Dairy', 'Eggs', 'Gluten/Wheat', 'Soy', 'Fish', 'Sesame', 'No allergies'].includes(allergy) && 
                       formData.allergies?.includes(allergy) && (
                        <Text style={styles.deleteIcon}>×</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Allergy Input */}
                <View style={styles.customInputContainer}>
                  <TextInput
                    style={[styles.customInput, { borderColor: '#FF4444' }]}
                    value={customAllergy}
                    onChangeText={setCustomAllergy}
                    placeholder="Add custom allergy"
                    placeholderTextColor="#666666"
                    onSubmitEditing={() => {
                      if (customAllergy.trim()) {
                        const current = formData.allergies || [];
                        const trimmedAllergy = customAllergy.trim();
                        // Don't add if it already exists
                        if (!current.includes(trimmedAllergy)) {
                          const updated = [...current.filter(a => a !== 'No allergies'), trimmedAllergy];
                          setFormData({ ...formData, allergies: updated });
                        }
                        setCustomAllergy('');
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: '#FF4444' }]}
                    onPress={() => {
                      if (customAllergy.trim()) {
                        const current = formData.allergies || [];
                        const trimmedAllergy = customAllergy.trim();
                        // Don't add if it already exists
                        if (!current.includes(trimmedAllergy)) {
                          const updated = [...current.filter(a => a !== 'No allergies'), trimmedAllergy];
                          setFormData({ ...formData, allergies: updated });
                        }
                        setCustomAllergy('');
                      }
                    }}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.allergySubheading, { color: colors.primary, marginTop: 24 }]}>
                  🙅‍♀️ Foods to Avoid (Preference)
                </Text>
                <View style={styles.optionsGrid}>
                  {[
                    'Mushrooms', 'Onions', 'Garlic', 'Spicy Food', 
                    'Cilantro', 'Olives', 'Tomatoes', 'Avocado',
                    'Coconut', 'Bell Peppers', 'Brussels Sprouts', 
                    'Seafood', 'Red Meat', 'None',
                    ...(formData.avoidFoods || []).filter(f => 
                      !['Mushrooms', 'Onions', 'Garlic', 'Spicy Food', 'Cilantro', 'Olives', 'Tomatoes', 'Avocado', 'Coconut', 'Bell Peppers', 'Brussels Sprouts', 'Seafood', 'Red Meat', 'None'].includes(f)
                    )
                  ].map((avoidFood, index) => (
                    <TouchableOpacity
                      key={`avoidFood-${index}-${avoidFood}`}
                      style={[
                        styles.optionButton,
                        formData.avoidFoods?.includes(avoidFood) && [
                          styles.selectedOption,
                          { backgroundColor: colors.primary }
                        ],
                        // Custom entries get special styling
                        !['Mushrooms', 'Onions', 'Garlic', 'Spicy Food', 'Cilantro', 'Olives', 'Tomatoes', 'Avocado', 'Coconut', 'Bell Peppers', 'Brussels Sprouts', 'Seafood', 'Red Meat', 'None'].includes(avoidFood) && 
                        styles.customEntry
                      ]}
                      onPress={() => {
                        const current = formData.avoidFoods || [];
                        let updated;
                        
                        if (avoidFood === 'None') {
                          updated = current.includes(avoidFood) ? [] : ['None'];
                        } else {
                          updated = current.includes(avoidFood)
                            ? current.filter(f => f !== avoidFood)
                            : [...current.filter(f => f !== 'None'), avoidFood];
                        }
                        
                        setFormData({ ...formData, avoidFoods: updated });
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.optionText,
                        { color: formData.avoidFoods?.includes(avoidFood) ? '#000000' : '#ffffff' }
                      ]}>
                        {avoidFood}
                      </Text>
                      {/* Show X button for custom entries */}
                      {!['Mushrooms', 'Onions', 'Garlic', 'Spicy Food', 'Cilantro', 'Olives', 'Tomatoes', 'Avocado', 'Coconut', 'Bell Peppers', 'Brussels Sprouts', 'Seafood', 'Red Meat', 'None'].includes(avoidFood) && 
                       formData.avoidFoods?.includes(avoidFood) && (
                        <Text style={[styles.deleteIcon, { color: '#000000' }]}>×</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Custom Avoid Food Input */}
                <View style={styles.customInputContainer}>
                  <TextInput
                    style={[styles.customInput, { borderColor: colors.primaryAlpha20 }]}
                    value={customAvoidFood}
                    onChangeText={setCustomAvoidFood}
                    placeholder="Add custom food to avoid"
                    placeholderTextColor="#666666"
                    onSubmitEditing={() => {
                      if (customAvoidFood.trim()) {
                        const current = formData.avoidFoods || [];
                        const trimmedFood = customAvoidFood.trim();
                        // Don't add if it already exists
                        if (!current.includes(trimmedFood)) {
                          const updated = [...current.filter(f => f !== 'None'), trimmedFood];
                          setFormData({ ...formData, avoidFoods: updated });
                        }
                        setCustomAvoidFood('');
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      if (customAvoidFood.trim()) {
                        const current = formData.avoidFoods || [];
                        const trimmedFood = customAvoidFood.trim();
                        // Don't add if it already exists
                        if (!current.includes(trimmedFood)) {
                          const updated = [...current.filter(f => f !== 'None'), trimmedFood];
                          setFormData({ ...formData, avoidFoods: updated });
                        }
                        setCustomAvoidFood('');
                      }
                    }}
                  >
                    <Text style={[styles.addButtonText, { color: '#000000' }]}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animatable.View>
          </View>
        </Animatable.View>
      </ScrollView>
    </View>
  );

  const scrollViewRef = React.useRef<ScrollView>(null);
  
  // Scroll to top when results screen loads
  React.useEffect(() => {
    if (showResults && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [showResults]);

  const renderResultsSummaryStep = () => {
    const personalityScales = [
      {
        key: 'planningStyle',
        title: 'Planning Style',
        descriptions: {
          1: 'Dedicated Meal Prepper',
          2: 'Weekly Planner', 
          3: 'Flexible Planner',
          4: 'Spontaneous Cook',
          5: 'Last-Minute Decider'
        }
      },
      {
        key: 'cookingEnjoyment', 
        title: 'Cooking Enjoyment',
        descriptions: {
          1: 'Cooking Avoider',
          2: 'Reluctant Cook',
          3: 'Neutral Cook', 
          4: 'Cooking Enthusiast',
          5: 'Passionate Home Chef'
        }
      },
      {
        key: 'timeInvestment',
        title: 'Time Investment', 
        descriptions: {
          1: 'Speed Cook',
          2: 'Quick Meals',
          3: 'Moderate Cook',
          4: 'Thorough Cook', 
          5: 'Slow Food Lover'
        }
      },
      {
        key: 'varietySeeking',
        title: 'Variety Seeking',
        descriptions: {
          1: 'Routine Eater',
          2: 'Mostly Consistent',
          3: 'Moderate Variety',
          4: 'Variety Seeker',
          5: 'Adventure Eater'
        }
      },
      {
        key: 'skillConfidence',
        title: 'Skill Confidence',
        descriptions: {
          1: 'Kitchen Beginner',
          2: 'Cautious Cook',
          3: 'Comfortable Cook',
          4: 'Confident Cook',
          5: 'Kitchen Experimenter'
        }
      }
    ];

    return (
      <View style={styles.container}>
        <ScrollView 
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Tron-style Header with Matrix Effect */}
          <Animatable.View 
            style={styles.tronHeader}
            animation="slideInDown"
            duration={300}
            easing="ease-out"
          >
            <Animatable.View 
              style={[styles.tronBorder, { borderColor: colors.primary }]}
              animation="pulse"
              iterationCount={1}
              delay={100}
            >
              <Animatable.Text 
                style={[styles.tronTitle, { color: colors.primary }]}
                animation="flipInX"
                delay={200}
              >
                Cooking Profile
              </Animatable.Text>
              <Animatable.View 
                style={[styles.tronLine, { backgroundColor: colors.primary }]} 
                animation="slideInLeft"
                delay={300}
                duration={200}
              />
              <Animatable.Text 
                style={styles.tronSubtitle}
                animation="fadeIn"
                delay={400}
              >
                Setup Complete
              </Animatable.Text>
            </Animatable.View>
          </Animatable.View>

          <View style={styles.tronContainer}>
            <Animatable.View 
              animation="slideInRight" 
              delay={500}
              duration={300}
              style={[styles.tronDataBlock, { borderColor: colors.primary }]}
            >
              <Animatable.Text 
                style={[styles.tronBlockTitle, { color: colors.primary }]}
                animation="zoomIn"
                delay={600}
              >
                Budget & Shopping
              </Animatable.Text>
              <Animatable.View 
                style={styles.tronDataRow}
                animation="fadeInLeft"
                delay={700}
              >
                <Text style={styles.tronDataLabel}>Weekly Budget</Text>
                <Text style={[styles.tronDataValue, { color: colors.primary }]}>
                  ${formData.weeklyBudget}
                </Text>
              </Animatable.View>
              <Animatable.View 
                style={styles.tronDataRow}
                animation="fadeInLeft"
                delay={750}
              >
                <Text style={styles.tronDataLabel}>Location</Text>
                <Text style={[styles.tronDataValue, { color: colors.primary }]}>
                  {formData.city}, {formData.country}
                </Text>
              </Animatable.View>
              <Animatable.View 
                style={styles.tronDataRow}
                animation="fadeInLeft"
                delay={800}
              >
                <Text style={styles.tronDataLabel}>Grocery Store</Text>
                <Text style={[styles.tronDataValue, { color: colors.primary }]}>
                  {formData.groceryStore}
                </Text>
              </Animatable.View>
              <Animatable.View 
                style={styles.tronDataRow}
                animation="fadeInLeft"
                delay={850}
              >
                <Text style={styles.tronDataLabel}>Plan Duration</Text>
                <Text style={[styles.tronDataValue, { color: colors.primary }]}>
                  {formData.planDuration} days
                </Text>
              </Animatable.View>
            </Animatable.View>

            <Animatable.View 
              animation="slideInLeft" 
              delay={900}
              duration={300}
              style={[styles.tronDataBlock, { borderColor: colors.primary }]}
            >
              <Animatable.Text 
                style={[styles.tronBlockTitle, { color: colors.primary }]}
                animation="zoomIn"
                delay={1000}
              >
                Kitchen Personality
              </Animatable.Text>
              {personalityScales.map((scale, index) => (
                <Animatable.View 
                  key={scale.key} 
                  style={styles.tronDataRow}
                  animation="fadeInRight"
                  delay={1100 + (index * 50)}
                >
                  <Text style={styles.tronDataLabel}>
                    {scale.title}
                  </Text>
                  <Text style={[styles.tronDataValue, { color: colors.primary }]}>
                    {scale.descriptions[formData[scale.key as keyof typeof formData] as number]}
                  </Text>
                </Animatable.View>
              ))}
            </Animatable.View>

            <Animatable.View 
              animation="slideInRight" 
              delay={1400}
              duration={300}
              style={[styles.tronDataBlock, { borderColor: colors.primary }]}
            >
              <Animatable.Text 
                style={[styles.tronBlockTitle, { color: colors.primary }]}
                animation="zoomIn"
                delay={1500}
              >
                Eating Patterns
              </Animatable.Text>
              <Animatable.View 
                style={styles.tronDataRow}
                animation="fadeInLeft"
                delay={1600}
              >
                <Text style={styles.tronDataLabel}>Meals per Day</Text>
                <Text style={[styles.tronDataValue, { color: colors.primary }]}>
                  {formData.mealsPerDay}
                </Text>
              </Animatable.View>
              <Animatable.View 
                style={styles.tronDataRow}
                animation="fadeInLeft"
                delay={1650}
              >
                <Text style={styles.tronDataLabel}>Snacking Style</Text>
                <Text style={[styles.tronDataValue, { color: colors.primary }]}>
                  {formData.snackingStyle}
                </Text>
              </Animatable.View>
              {formData.eatingChallenges && formData.eatingChallenges.length > 0 && (
                <Animatable.View 
                  style={styles.tronDataRow}
                  animation="fadeInLeft"
                  delay={1700}
                >
                  <Text style={styles.tronDataLabel}>Eating Challenges</Text>
                  <Text style={[styles.tronDataValue, { color: colors.primary }]}>
                    {formData.eatingChallenges.join(', ')}
                  </Text>
                </Animatable.View>
              )}
              {formData.allergies && formData.allergies.length > 0 && (
                <Animatable.View 
                  style={styles.tronDataRow}
                  animation="fadeInLeft"
                  delay={1750}
                >
                  <Text style={styles.tronDataLabel}>Allergies</Text>
                  <Animatable.Text 
                    style={[styles.tronDataValue, { color: '#FF4444' }]}
                    animation="pulse"
                    iterationCount="infinite"
                    direction="alternate"
                    duration={2000}
                  >
                    {formData.allergies.join(', ')}
                  </Animatable.Text>
                </Animatable.View>
              )}
              {formData.avoidFoods && formData.avoidFoods.length > 0 && (
                <Animatable.View 
                  style={styles.tronDataRow}
                  animation="fadeInLeft"
                  delay={1800}
                >
                  <Text style={styles.tronDataLabel}>Foods to Avoid</Text>
                  <Text style={[styles.tronDataValue, { color: colors.primary }]}>
                    {formData.avoidFoods.join(', ')}
                  </Text>
                </Animatable.View>
              )}
            </Animatable.View>

            {/* Tron-style Action Buttons */}
            <Animatable.View 
              animation="fadeInUp" 
              delay={1900}
              duration={300}
              style={styles.tronButtonsContainer}
            >
              <TouchableOpacity
                style={[styles.tronButton, styles.tronButtonSecondary, { borderColor: colors.primary }]}
                onPress={() => {
                  setShowResults(false);
                  setCurrentStep(0);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.tronButtonInner, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
                  <Text style={[styles.tronButtonText, { color: colors.primary }]}>← EDIT PROFILE</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.tronButton, styles.tronButtonPrimary, { borderColor: colors.primary, backgroundColor: colors.primary }]}
                onPress={handleComplete}
                activeOpacity={0.8}
              >
                <View style={styles.tronButtonInner}>
                  <Text style={[styles.tronButtonText, { color: '#000000' }]}>SAVE & CONTINUE →</Text>
                </View>
              </TouchableOpacity>
            </Animatable.View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderMealPlanDurationStep = () => (
    <View style={styles.stepContainer}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={[styles.header, { borderBottomColor: colors.primaryAlpha20 }]}>
          <View style={styles.progressContainer}>
            <View style={styles.stepIndicator}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>
                {currentStep + 1}
              </Text>
              <Text style={styles.stepTotal}>/{totalSteps}</Text>
            </View>
            
            <View style={[styles.progressTrack, { backgroundColor: colors.primaryAlpha20 }]}>
              <View
                style={[
                  styles.progressFill,
                  { 
                    width: `${((currentStep + 1) / totalSteps) * 100}%`,
                    backgroundColor: colors.primary 
                  }
                ]}
              />
            </View>
          </View>
        </View>
        
        <Animatable.View
          animation="fadeInUp"
          delay={200}
          style={styles.content}
        >
          <Text style={[styles.stepTitle, { color: colors.primary }]}>
            Meal Plan Duration
          </Text>
          <Text style={styles.stepSubtitle}>
            How long do you prefer your meal plans to be?
          </Text>
          
          <View style={styles.durationOptionsContainer}>
            {/* 7 Days Option */}
            <Animatable.View
              animation="fadeInUp"
              delay={300}
              style={styles.durationOptionWrapper}
            >
              <TouchableOpacity
                style={[
                  styles.modernDurationCard,
                  formData.planDuration === 7 && [
                    styles.selectedModernCard,
                    { borderColor: colors.primary, backgroundColor: colors.primaryAlpha10 }
                  ]
                ]}
                onPress={() => setFormData({ ...formData, planDuration: 7 })}
                activeOpacity={0.9}
              >
                <View style={styles.modernCardContent}>
                  <View style={styles.modernCardLeft}>
                    <View style={styles.modernTitleRow}>
                      <Text style={[styles.modernTitle, { color: '#ffffff' }]}>
                        1 Week (7 days)
                      </Text>
                      <View style={[styles.modernBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.modernBadgeText}>Recommended</Text>
                      </View>
                    </View>
                    <Text style={styles.modernSubtitle}>Fresh ingredients, easier meal prep, better AI results</Text>
                  </View>
                  
                  <View style={styles.modernCardRight}>
                    <View style={[
                      styles.modernRadio,
                      formData.planDuration === 7 && { backgroundColor: colors.primary }
                    ]}>
                      {formData.planDuration === 7 && (
                        <Ionicons name="checkmark" size={16} color="#000000" />
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Animatable.View>

            {/* 14 Days Option */}
            <Animatable.View
              animation="fadeInUp"
              delay={400}
              style={styles.durationOptionWrapper}
            >
              <TouchableOpacity
                style={[
                  styles.modernDurationCard,
                  formData.planDuration === 14 && [
                    styles.selectedModernCard,
                    { borderColor: colors.primary, backgroundColor: colors.primaryAlpha10 }
                  ]
                ]}
                onPress={() => setFormData({ ...formData, planDuration: 14 })}
                activeOpacity={0.9}
              >
                <View style={styles.modernCardContent}>
                  <View style={styles.modernCardLeft}>
                    <Text style={[styles.modernTitle, { color: '#ffffff' }]}>
                      2 Weeks (14 days)
                    </Text>
                    <Text style={styles.modernSubtitle}>Less frequent planning</Text>
                  </View>
                  
                  <View style={styles.modernCardRight}>
                    <View style={[
                      styles.modernRadio,
                      formData.planDuration === 14 && { backgroundColor: colors.primary }
                    ]}>
                      {formData.planDuration === 14 && (
                        <Ionicons name="checkmark" size={16} color="#000000" />
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Animatable.View>
          </View>
        </Animatable.View>
      </ScrollView>
    </View>
  );

  const renderMealPreferencesStep = () => (
    <View style={styles.stepContainer}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={[styles.header, { borderBottomColor: colors.primaryAlpha20 }]}>
          <View style={styles.progressContainer}>
            <View style={styles.stepIndicator}>
              <Text style={[styles.stepNumber, { color: colors.primary }]}>
                {currentStep + 1}
              </Text>
              <Text style={styles.stepTotal}>/{totalSteps}</Text>
            </View>
            
            <View style={[styles.progressTrack, { backgroundColor: colors.primaryAlpha20 }]}>
              <View
                style={[
                  styles.progressFill,
                  { 
                    width: `${((currentStep + 1) / totalSteps) * 100}%`,
                    backgroundColor: colors.primary 
                  }
                ]}
              />
            </View>
          </View>
        </View>
        
        <Animatable.View
          animation="fadeInUp"
          delay={200}
          style={styles.content}
        >
          <Text style={[styles.stepTitle, { color: colors.primary }]}>
            Meal Preferences
          </Text>
          <Text style={styles.stepSubtitle}>
            How would you like meals chosen for your plan?
          </Text>

          <View style={styles.optionsContainer}>
            {/* AI Suggest Option */}
            <Animatable.View
              animation="fadeInUp"
              delay={200}
              style={styles.durationOptionWrapper}
            >
              <TouchableOpacity
                style={[
                  styles.modernDurationCard,
                  formData.mealPreferences === 'ai_suggest' && [
                    styles.selectedModernCard,
                    { borderColor: colors.primary, backgroundColor: colors.primaryAlpha10 }
                  ]
                ]}
                onPress={() => setFormData({ 
                  ...formData, 
                  mealPreferences: 'ai_suggest',
                  selectedFavorites: [],
                  customMealRequests: ''
                })}
                activeOpacity={0.9}
              >
                <View style={styles.modernCardContent}>
                  <View style={styles.modernCardLeft}>
                    <Text style={[styles.modernTitle, { color: '#ffffff' }]}>
                      Let AI suggest meals
                    </Text>
                    <Text style={styles.modernSubtitle}>
                      AI will create meals based on your profile and preferences
                    </Text>
                  </View>
                  
                  <View style={styles.modernCardRight}>
                    <View style={[
                      styles.modernRadio,
                      formData.mealPreferences === 'ai_suggest' && { backgroundColor: colors.primary }
                    ]}>
                      {formData.mealPreferences === 'ai_suggest' && (
                        <Ionicons name="checkmark" size={16} color="#000000" />
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Animatable.View>

            {/* Include Favorites Option */}
            <Animatable.View
              animation="fadeInUp"
              delay={300}
              style={styles.durationOptionWrapper}
            >
              <TouchableOpacity
                style={[
                  styles.modernDurationCard,
                  formData.mealPreferences === 'include_favorites' && [
                    styles.selectedModernCard,
                    { borderColor: colors.primary, backgroundColor: colors.primaryAlpha10 }
                  ]
                ]}
                onPress={() => setFormData({ 
                  ...formData, 
                  mealPreferences: 'include_favorites'
                })}
                activeOpacity={0.9}
              >
                <View style={styles.modernCardContent}>
                  <View style={styles.modernCardLeft}>
                    <Text style={[styles.modernTitle, { color: '#ffffff' }]}>
                      Include favorites & custom requests
                    </Text>
                    <Text style={styles.modernSubtitle}>
                      Choose from your saved meals and add custom requests
                    </Text>
                  </View>
                  
                  <View style={styles.modernCardRight}>
                    <View style={[
                      styles.modernRadio,
                      formData.mealPreferences === 'include_favorites' && { backgroundColor: colors.primary }
                    ]}>
                      {formData.mealPreferences === 'include_favorites' && (
                        <Ionicons name="checkmark" size={16} color="#000000" />
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Animatable.View>

            {/* Custom Requests Text Input - Show when include_favorites is selected */}
            {formData.mealPreferences === 'include_favorites' && (
              <Animatable.View
                animation="fadeInUp"
                delay={400}
                style={styles.textInputContainer}
              >
                <Text style={styles.textInputLabel}>
                  Custom meal requests (optional)
                </Text>
                <Text style={styles.textInputHelper}>
                  e.g., "Thai green curry, salmon dishes, more vegetarian options..."
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter specific meals or ingredients you'd like..."
                  placeholderTextColor="#666666"
                  value={formData.customMealRequests}
                  onChangeText={(text) => setFormData({ ...formData, customMealRequests: text })}
                  multiline
                  numberOfLines={3}
                />
              </Animatable.View>
            )}

            {/* Favorite meals selection */}
            {formData.mealPreferences === 'include_favorites' && (
              <Animatable.View
                animation="fadeInUp"
                delay={500}
                style={styles.favoriteMealsContainer}
              >
                {favoriteMeals.length > 0 ? (
                  <>
                    <Text style={styles.favoriteMealsTitle}>
                      Select Your Favorite Meals
                    </Text>
                    <Text style={styles.favoriteMealsSubtitle}>
                      Choose which favorites to include in your meal plan
                    </Text>
                    
                    <View style={styles.favoriteMealsList}>
                      {favoriteMeals.map((favorite) => (
                        <TouchableOpacity
                          key={favorite.mealId}
                          style={[
                            styles.favoriteMealItem,
                            (formData.selectedFavorites || []).includes(favorite.mealId) && {
                              borderColor: colors.primary,
                              backgroundColor: colors.primaryAlpha10
                            }
                          ]}
                          onPress={() => toggleFavoriteMeal(favorite.mealId)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.favoriteMealContent}>
                            <Text style={styles.favoriteMealName}>
                              {favorite.meal.name}
                            </Text>
                            <Text style={styles.favoriteMealType}>
                              {favorite.meal.type.charAt(0).toUpperCase() + favorite.meal.type.slice(1)}
                              {favorite.meal.nutritionInfo && ` • ${favorite.meal.nutritionInfo.calories} cal`}
                            </Text>
                          </View>
                          <View style={[
                            styles.favoriteMealCheckbox,
                            (formData.selectedFavorites || []).includes(favorite.mealId) && {
                              backgroundColor: colors.primary
                            }
                          ]}>
                            {(formData.selectedFavorites || []).includes(favorite.mealId) && (
                              <Ionicons name="checkmark" size={16} color="#000000" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <View style={styles.noFavoritesContainer}>
                    <Ionicons name="heart-outline" size={32} color="#666666" />
                    <Text style={styles.noFavoritesTitle}>No Favorite Meals Yet</Text>
                    <Text style={styles.noFavoritesText}>
                      Heart meals in the app to see them here. For now, you can add custom requests below.
                    </Text>
                  </View>
                )}
              </Animatable.View>
            )}
          </View>
        </Animatable.View>
      </ScrollView>
    </View>
  );

  const renderCookingEquipmentStep = () => {
    const equipmentOptions = [
      { id: 'stovetop', name: 'Stovetop/Cooktop', icon: 'flame-outline', description: 'Gas or electric burners' },
      { id: 'oven', name: 'Oven', icon: 'square-outline', description: 'For baking, roasting, broiling' },
      { id: 'microwave', name: 'Microwave', icon: 'cube-outline', description: 'Quick reheating and simple cooking' },
      { id: 'air_fryer', name: 'Air Fryer', icon: 'ellipse-outline', description: 'Crispy foods with less oil' },
      { id: 'slow_cooker', name: 'Slow Cooker', icon: 'hourglass-outline', description: 'Set-and-forget cooking' },
      { id: 'rice_cooker', name: 'Rice Cooker', icon: 'restaurant-outline', description: 'Perfect rice and grains' },
      { id: 'pressure_cooker', name: 'Pressure Cooker/Instant Pot', icon: 'speedometer-outline', description: 'Fast cooking under pressure' },
      { id: 'grill', name: 'Grill/BBQ', icon: 'bonfire-outline', description: 'Outdoor or indoor grilling' },
      { id: 'blender', name: 'Blender', icon: 'refresh-outline', description: 'Smoothies, sauces, soups' },
      { id: 'food_processor', name: 'Food Processor', icon: 'cog-outline', description: 'Chopping, mixing, blending' }
    ];

    return (
      <View style={styles.stepContainer}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          <View style={[styles.header, { borderBottomColor: colors.primaryAlpha20 }]}>
            <View style={styles.progressContainer}>
              <View style={styles.stepIndicator}>
                <Text style={[styles.stepNumber, { color: colors.primary }]}>
                  {currentStep + 1}
                </Text>
                <Text style={styles.stepTotal}>/{totalSteps}</Text>
              </View>
              
              <View style={[styles.progressTrack, { backgroundColor: colors.primaryAlpha20 }]}>
                <View
                  style={[
                    styles.progressFill,
                    { 
                      width: `${((currentStep + 1) / totalSteps) * 100}%`,
                      backgroundColor: colors.primary 
                    }
                  ]}
                />
              </View>
            </View>
          </View>
          
          <Animatable.View
            animation="fadeInUp"
            delay={200}
            style={styles.content}
          >
            <Text style={[styles.stepTitle, { color: colors.primary }]}>
              Available Cooking Equipment
            </Text>
            <Text style={styles.stepSubtitle}>
              Select what you have available. This helps AI suggest recipes you can actually make with your equipment.
            </Text>

            <View style={styles.equipmentGrid}>
              {equipmentOptions.map((equipment, index) => (
                <Animatable.View
                  key={equipment.id}
                  animation="fadeInUp"
                  delay={300 + (index * 50)}
                  style={styles.equipmentOptionWrapper}
                >
                  <TouchableOpacity
                    style={[
                      styles.equipmentOption,
                      (formData.cookingEquipment || []).includes(equipment.id) && [
                        styles.selectedEquipmentOption,
                        { borderColor: colors.primary, backgroundColor: colors.primaryAlpha10 }
                      ]
                    ]}
                    onPress={() => toggleCookingEquipment(equipment.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.equipmentIconContainer}>
                      <Ionicons 
                        name={equipment.icon as any} 
                        size={28} 
                        color={(formData.cookingEquipment || []).includes(equipment.id) ? colors.primary : '#666666'} 
                      />
                    </View>
                    <View style={styles.equipmentContent}>
                      <Text style={[
                        styles.equipmentName,
                        (formData.cookingEquipment || []).includes(equipment.id) && { color: colors.primary }
                      ]}>
                        {equipment.name}
                      </Text>
                      <Text style={styles.equipmentDescription}>
                        {equipment.description}
                      </Text>
                    </View>
                    <View style={[
                      styles.equipmentCheckbox,
                      (formData.cookingEquipment || []).includes(equipment.id) && {
                        backgroundColor: colors.primary
                      }
                    ]}>
                      {(formData.cookingEquipment || []).includes(equipment.id) && (
                        <Ionicons name="checkmark" size={16} color="#000000" />
                      )}
                    </View>
                  </TouchableOpacity>
                </Animatable.View>
              ))}
            </View>

            <Animatable.View
              animation="fadeInUp"
              delay={800}
              style={styles.equipmentNote}
            >
              <View style={styles.noteContent}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                <Text style={styles.noteText}>
                  Select at least one piece of equipment. This helps AI suggest meals you can actually make with your available tools.
                </Text>
              </View>
            </Animatable.View>
          </Animatable.View>
        </ScrollView>
      </View>
    );
  };

  const renderStep = () => {
    // If showing results, render the results summary
    if (showResults) {
      return renderResultsSummaryStep();
    }
    
    // Otherwise render the current step
    switch (currentStep) {
      case 0: return renderBudgetStep();
      case 1: return renderLocationStep(); 
      case 2: return renderKitchenPersonalityStep();
      case 3: return renderFoodPreferencesStep(); // This is now the new Eating Patterns step
      case 4: return renderMealPlanDurationStep();
      case 5: return renderMealPreferencesStep();
      case 6: return renderCookingEquipmentStep();
      default: return renderBudgetStep();
    }
  };

  const renderFooter = () => {
    // No footer for results page (buttons are integrated)
    if (showResults) {
      return null;
    }

    const isStepValid = () => {
      switch (currentStep) {
        case 0: return formData.weeklyBudget && (formData.weeklyBudget !== 'custom' || (formData.customBudgetAmount && formData.customBudgetAmount.trim()));
        case 1: return formData.country && formData.city;
        case 2: return formData.planningStyle > 0 && formData.cookingEnjoyment > 0 && 
                       formData.timeInvestment > 0 && formData.varietySeeking > 0 && 
                       formData.skillConfidence > 0;
        case 3: return true; // Eating patterns are optional
        case 4: return formData.planDuration > 0; // Duration must be selected
        case 5: return formData.mealPreferences !== ''; // Meal preferences must be selected
        case 6: return formData.cookingEquipment.length > 0; // At least one piece of equipment selected
        default: return false;
      }
    };

    return (
      <View style={styles.footer}>
        <View style={[styles.footerButtons]}>
          {/* Always show back button - either to previous step or exit questionnaire */}
          <View style={styles.backFooterButtonContainer}>
            <TouchableOpacity
              style={styles.backFooterButton}
              onPress={currentStep === 0 ? handleBack : prevStep}
            >
              <Ionicons name="arrow-back" size={20} color="#ffffff" />
              <Text style={styles.backFooterText}>
                {currentStep === 0 ? 'Exit' : 'Back'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[
            styles.continueButtonContainer,
            (isStepValid() || currentStep > 0) && styles.expandedContainer
          ]}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: isStepValid() ? colors.primary : '#333333' },
                !isStepValid() && styles.disabledButton
              ]}
              onPress={nextStep}
              disabled={!isStepValid()}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.continueText,
                { color: isStepValid() ? '#000000' : '#666666' }
              ]}>
                {currentStep === totalSteps - 1 ? 'View Results' : 'Continue'}
              </Text>
              <Ionicons 
                name={currentStep === totalSteps - 1 ? "eye" : "arrow-forward"} 
                size={20} 
                color={isStepValid() ? '#000000' : '#666666'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {renderStep()}
      
      {renderFooter()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  progressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  stepNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  stepTotal: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'monospace',
    marginLeft: 4,
  },
  progressTrack: {
    width: 200,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderWidth: 2,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  optionGradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  optionDescription: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 4,
    lineHeight: 16,
  },
  tempText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 40,
  },
  preferencesContainer: {
    marginTop: 20,
  },
  preferenceSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    marginBottom: 8,
  },
  selectedOption: {
    borderColor: 'transparent',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  mealFrequencyContainer: {
    gap: 12,
  },
  mealFrequencyOption: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
  },
  selectedMealOption: {
    borderColor: 'transparent',
  },
  mealOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  mealOptionDescription: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  allergyContainer: {
    marginTop: 8,
  },
  allergySubheading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  allergyButton: {
    borderColor: '#FF4444',
  },
  selectedAllergy: {
    borderColor: 'transparent',
  },
  customInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    fontSize: 14,
    color: '#ffffff',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  customEntry: {
    position: 'relative',
  },
  deleteIcon: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF4444',
    color: '#ffffff',
    borderRadius: 10,
    width: 20,
    height: 20,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  inputContainer: {
    gap: 24,
    marginTop: 32,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  countryPickerButton: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countryPickerText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownContainer: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownStyle: {
    backgroundColor: '#1a1a1a',
    border: 'none',
  },
  dropdownInputStyle: {
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontSize: 16,
    padding: 16,
    border: 'none',
    outline: 'none',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backFooterButtonContainer: {
    overflow: 'hidden',
  },
  backFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#333333',
    gap: 8,
    width: 100,
  },
  continueButtonContainer: {
    flex: 1,
    marginLeft: 16,
  },
  expandedContainer: {
    marginLeft: 0,
  },
  backFooterText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 8,
  },
  continueText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  smartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  smartButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scalesContainer: {
    gap: 32,
    marginTop: 24,
  },
  scaleGroup: {
    gap: 12,
  },
  scaleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  scaleLabel: {
    fontSize: 14,
    color: '#888888',
    flex: 1,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  selectedDescriptionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  selectedDescription: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  scaleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedScale: {
    borderColor: '#ffffff',
  },
  scaleButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryContainer: {
    marginTop: 24,
  },
  summarySection: {
    marginBottom: 32,
  },
  summarySectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#cccccc',
    flex: 1,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: '#ffffff',
    flex: 2,
    textAlign: 'right',
    fontWeight: '600',
  },
  resultsHeader: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  celebrationIcon: {
    marginBottom: 16,
  },
  celebrationEmoji: {
    fontSize: 64,
    textAlign: 'center',
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  celebrationSubtitle: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
  // Tron-style results screen
  tronHeader: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  tronBorder: {
    borderWidth: 2,
    borderRadius: 4,
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  tronTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  tronLine: {
    height: 2,
    width: 80,
    marginVertical: 12,
  },
  tronSubtitle: {
    fontSize: 14,
    color: '#888888',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  tronContainer: {
    paddingHorizontal: 20,
    gap: 24,
  },
  tronDataBlock: {
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  tronBlockTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  tronDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tronDataLabel: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    flex: 1,
    fontWeight: '600',
  },
  tronDataValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
    letterSpacing: 0.5,
  },
  // Tron-style buttons
  tronButtonsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    marginBottom: 40,
  },
  tronButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tronButtonSecondary: {
    backgroundColor: 'transparent',
  },
  tronButtonPrimary: {
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  tronButtonInner: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tronButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    letterSpacing: 1,
    textAlign: 'center',
  },
  // New Budget Option Styles
  budgetOptionCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedBudgetCard: {
    borderWidth: 2,
    backgroundColor: '#1a1a1a',
  },
  budgetCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  budgetIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  budgetTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  budgetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  budgetDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
  budgetSelectIndicator: {
    marginLeft: 'auto',
  },
  budgetSelectedBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  // Duration step styles
  durationOptionCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#27272a',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  selectedDurationCard: {
    borderWidth: 2,
    backgroundColor: '#1a1a1a',
  },
  durationCardContent: {
    padding: 20,
    position: 'relative',
  },
  durationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginRight: 40, // Add margin to prevent overlap with radio button
  },
  durationTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 12, // Add spacing before badge
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationDescription: {
    fontSize: 15,
    color: '#a1a1aa',
    marginBottom: 16,
    lineHeight: 22,
  },
  durationBenefits: {
    marginBottom: 16,
  },
  benefitItem: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 4,
    lineHeight: 20,
  },
  durationSelectIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  // Modern duration card styles
  durationOptionsContainer: {
    gap: 16,
    marginTop: 8,
  },
  durationOptionWrapper: {
    width: '100%',
  },
  modernDurationCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#27272a',
    padding: 20,
    width: '100%',
  },
  selectedModernCard: {
    borderWidth: 1.5,
  },
  modernCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernCardLeft: {
    flex: 1,
  },
  modernTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  modernTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  modernSubtitle: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '500',
  },
  modernBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  modernBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modernCardRight: {
    marginLeft: 16,
  },
  modernRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3f3f46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Inline custom budget input styles
  inlineCustomBudgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  inlineCurrencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
  },
  inlineCustomBudgetInput: {
    backgroundColor: '#0a0a0b',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    minWidth: 80,
  },
  textInputContainer: {
    marginTop: 24,
    marginHorizontal: 24,
  },
  textInputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  textInputHelper: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteContainer: {
    marginTop: 20,
    marginHorizontal: 24,
  },
  noteContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  noteText: {
    fontSize: 14,
    color: '#cbd5e1',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  favoriteMealsContainer: {
    marginTop: 20,
    marginHorizontal: 24,
  },
  favoriteMealsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  favoriteMealsSubtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 16,
  },
  favoriteMealsList: {
    gap: 12,
  },
  favoriteMealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
  },
  favoriteMealContent: {
    flex: 1,
  },
  favoriteMealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  favoriteMealType: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  favoriteMealCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noFavoritesContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1a1a1b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  noFavoritesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
  },
  noFavoritesText: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
  },
  equipmentGrid: {
    marginTop: 20,
  },
  equipmentOptionWrapper: {
    marginBottom: 12,
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1b',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
  },
  selectedEquipmentOption: {
    borderWidth: 2,
  },
  equipmentIconContainer: {
    marginRight: 16,
  },
  equipmentContent: {
    flex: 1,
  },
  equipmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  equipmentDescription: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  equipmentCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentNote: {
    marginTop: 24,
  },
  inlineBudgetFrequency: {
    fontSize: 14,
    fontWeight: '500',
    color: '#71717a',
  },
});

export default BudgetCookingQuestionnaireScreen;