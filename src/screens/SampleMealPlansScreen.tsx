import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ImageBackground,
  Animated,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../contexts/ThemeContext';

type SampleMealPlansNavigationProp = StackNavigationProp<RootStackParamList, 'SampleMealPlans'>;

interface SampleMealPlan {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: string;
  focus: string;
  program: any;
  detailInfo: {
    overview: string;
    highlights: string[];
    targetGoals: string;
    mealTypes: string;
    nutrition: string;
    cookingLevel: string;
  };
}

export default function SampleMealPlansScreen() {
  const { themeColor } = useTheme();
  const navigation = useNavigation<SampleMealPlansNavigationProp>();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState<SampleMealPlan | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [flipAnimation] = useState(new Animated.Value(0));

  const quickStartMealPlan = {
    "plan_name": "Quick Start - Balanced Nutrition",
    "description": "Perfect starter meal plan",
    "duration_days": 7,
    "total_meals": 21,
    "weeks": [
      {
        "week_number": 1,
        "days": [
          {
            "day_name": "Monday",
            "day_number": 1,
            "meals": [
              {
                "meal_name": "Greek Yogurt Bowl",
                "meal_type": "breakfast",
                "prep_time": 5,
                "cook_time": 0,
                "total_time": 5,
                "servings": 1,
                "calories": 320,
                "macros": {
                  "protein": 20,
                  "carbs": 35,
                  "fat": 8,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Greek yogurt",
                    "amount": "240",
                    "unit": "g",
                    "notes": "plain, non-fat"
                  },
                  {
                    "item": "Mixed berries",
                    "amount": "75",
                    "unit": "g"
                  },
                  {
                    "item": "Honey",
                    "amount": "15",
                    "unit": "ml"
                  }
                ],
                "instructions": [
                  "Add Greek yogurt to bowl",
                  "Top with mixed berries",
                  "Drizzle honey over berries"
                ],
                "tags": ["high-protein", "quick", "vegetarian"]
              },
              {
                "meal_name": "Turkey Club Wrap",
                "meal_type": "lunch",
                "prep_time": 10,
                "cook_time": 0,
                "total_time": 10,
                "servings": 1,
                "calories": 450,
                "macros": {
                  "protein": 35,
                  "carbs": 38,
                  "fat": 18,
                  "fiber": 5
                },
                "ingredients": [
                  {
                    "item": "Whole wheat tortilla",
                    "amount": "1",
                    "unit": "large"
                  },
                  {
                    "item": "Turkey breast",
                    "amount": "115",
                    "unit": "g",
                    "notes": "sliced deli meat"
                  },
                  {
                    "item": "Avocado",
                    "amount": "60",
                    "unit": "g"
                  },
                  {
                    "item": "Lettuce",
                    "amount": "30",
                    "unit": "g",
                    "notes": "shredded"
                  },
                  {
                    "item": "Tomato",
                    "amount": "80",
                    "unit": "g",
                    "notes": "sliced"
                  }
                ],
                "instructions": [
                  "Lay tortilla flat and spread mashed avocado",
                  "Layer turkey, lettuce, and tomato slices",
                  "Roll tightly and cut in half",
                  "Serve immediately"
                ],
                "tags": ["high-protein", "quick", "balanced"]
              },
              {
                "meal_name": "Baked Salmon with Quinoa",
                "meal_type": "dinner",
                "prep_time": 10,
                "cook_time": 20,
                "total_time": 30,
                "servings": 1,
                "calories": 520,
                "macros": {
                  "protein": 42,
                  "carbs": 35,
                  "fat": 22,
                  "fiber": 4
                },
                "ingredients": [
                  {
                    "item": "Salmon fillet",
                    "amount": "140",
                    "unit": "g"
                  },
                  {
                    "item": "Quinoa",
                    "amount": "60",
                    "unit": "g",
                    "notes": "dry"
                  },
                  {
                    "item": "Broccoli",
                    "amount": "150",
                    "unit": "g",
                    "notes": "fresh florets"
                  },
                  {
                    "item": "Olive oil",
                    "amount": "15",
                    "unit": "ml"
                  },
                  {
                    "item": "Lemon",
                    "amount": "0.5",
                    "unit": "medium"
                  }
                ],
                "instructions": [
                  "Preheat oven to 200°C",
                  "Cook quinoa according to package directions",
                  "Season salmon with salt, pepper, and lemon juice",
                  "Bake salmon for 15-18 minutes",
                  "Steam broccoli until tender",
                  "Serve salmon over quinoa with broccoli"
                ],
                "tags": ["high-protein", "omega-3", "balanced", "gluten-free"]
              }
            ]
          },
          {
            "day_name": "Tuesday",
            "day_number": 2,
            "meals": [
              {
                "meal_name": "Overnight Oats",
                "meal_type": "breakfast",
                "prep_time": 5,
                "cook_time": 0,
                "total_time": 5,
                "servings": 1,
                "calories": 380,
                "macros": {
                  "protein": 15,
                  "carbs": 52,
                  "fat": 12,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Rolled oats",
                    "amount": "50",
                    "unit": "g"
                  },
                  {
                    "item": "Milk",
                    "amount": "125",
                    "unit": "ml",
                    "notes": "almond or dairy"
                  },
                  {
                    "item": "Chia seeds",
                    "amount": "15",
                    "unit": "g"
                  },
                  {
                    "item": "Banana",
                    "amount": "60",
                    "unit": "g",
                    "notes": "sliced"
                  },
                  {
                    "item": "Peanut butter",
                    "amount": "15",
                    "unit": "g"
                  }
                ],
                "instructions": [
                  "Mix oats, milk, and chia seeds in jar",
                  "Add peanut butter and stir well",
                  "Refrigerate overnight",
                  "Top with banana slices before eating"
                ],
                "tags": ["meal-prep", "vegetarian", "high-fiber"]
              },
              {
                "meal_name": "Chicken Caesar Salad",
                "meal_type": "lunch",
                "prep_time": 15,
                "cook_time": 0,
                "total_time": 15,
                "servings": 1,
                "calories": 420,
                "macros": {
                  "protein": 38,
                  "carbs": 12,
                  "fat": 25,
                  "fiber": 4
                },
                "ingredients": [
                  {
                    "item": "Grilled chicken breast",
                    "amount": "115",
                    "unit": "g",
                    "notes": "pre-cooked"
                  },
                  {
                    "item": "Romaine lettuce",
                    "amount": "100",
                    "unit": "g",
                    "notes": "chopped"
                  },
                  {
                    "item": "Caesar dressing",
                    "amount": "30",
                    "unit": "ml"
                  },
                  {
                    "item": "Parmesan cheese",
                    "amount": "25",
                    "unit": "g",
                    "notes": "grated"
                  },
                  {
                    "item": "Croutons",
                    "amount": "20",
                    "unit": "g"
                  }
                ],
                "instructions": [
                  "Chop romaine lettuce and place in bowl",
                  "Slice grilled chicken breast",
                  "Toss lettuce with Caesar dressing",
                  "Top with chicken, parmesan, and croutons"
                ],
                "tags": ["high-protein", "quick", "low-carb"]
              },
              {
                "meal_name": "Beef Stir-Fry with Brown Rice",
                "meal_type": "dinner",
                "prep_time": 15,
                "cook_time": 15,
                "total_time": 30,
                "servings": 1,
                "calories": 580,
                "macros": {
                  "protein": 35,
                  "carbs": 45,
                  "fat": 26,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Lean ground beef",
                    "amount": "115",
                    "unit": "g"
                  },
                  {
                    "item": "Brown rice",
                    "amount": "85",
                    "unit": "g",
                    "notes": "cooked"
                  },
                  {
                    "item": "Mixed vegetables",
                    "amount": "200",
                    "unit": "g",
                    "notes": "bell peppers, broccoli, snap peas"
                  },
                  {
                    "item": "Soy sauce",
                    "amount": "30",
                    "unit": "ml",
                    "notes": "low sodium"
                  },
                  {
                    "item": "Sesame oil",
                    "amount": "15",
                    "unit": "ml"
                  }
                ],
                "instructions": [
                  "Heat sesame oil in large pan over medium-high heat",
                  "Cook ground beef until browned, about 5 minutes",
                  "Add mixed vegetables and stir-fry for 5-7 minutes",
                  "Add soy sauce and cook 2 more minutes",
                  "Serve over brown rice"
                ],
                "tags": ["high-protein", "balanced", "quick"]
              }
            ]
          },
          {
            "day_name": "Wednesday",
            "day_number": 3,
            "meals": [
              {
                "meal_name": "Scrambled Eggs with Toast",
                "meal_type": "breakfast",
                "prep_time": 5,
                "cook_time": 8,
                "total_time": 13,
                "servings": 1,
                "calories": 340,
                "macros": {
                  "protein": 22,
                  "carbs": 28,
                  "fat": 16,
                  "fiber": 4
                },
                "ingredients": [
                  {
                    "item": "Eggs",
                    "amount": "2",
                    "unit": "large"
                  },
                  {
                    "item": "Whole grain bread",
                    "amount": "2",
                    "unit": "slices"
                  },
                  {
                    "item": "Butter",
                    "amount": "10",
                    "unit": "g"
                  },
                  {
                    "item": "Milk",
                    "amount": "30",
                    "unit": "ml"
                  },
                  {
                    "item": "Spinach",
                    "amount": "30",
                    "unit": "g",
                    "notes": "fresh"
                  }
                ],
                "instructions": [
                  "Beat eggs with milk in bowl",
                  "Heat butter in non-stick pan",
                  "Add spinach to pan and cook 1 minute",
                  "Pour in eggs and scramble until set",
                  "Toast bread and serve alongside"
                ],
                "tags": ["high-protein", "quick", "vegetarian"]
              },
              {
                "meal_name": "Tuna Salad Sandwich",
                "meal_type": "lunch",
                "prep_time": 10,
                "cook_time": 0,
                "total_time": 10,
                "servings": 1,
                "calories": 425,
                "macros": {
                  "protein": 32,
                  "carbs": 35,
                  "fat": 18,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Tuna",
                    "amount": "1",
                    "unit": "can (185g)",
                    "notes": "in water, drained"
                  },
                  {
                    "item": "Whole grain bread",
                    "amount": "2",
                    "unit": "slices"
                  },
                  {
                    "item": "Mayonnaise",
                    "amount": "15",
                    "unit": "g"
                  },
                  {
                    "item": "Cucumber",
                    "amount": "50",
                    "unit": "g",
                    "notes": "sliced"
                  },
                  {
                    "item": "Red onion",
                    "amount": "15",
                    "unit": "g",
                    "notes": "diced"
                  }
                ],
                "instructions": [
                  "Drain tuna and flake in bowl",
                  "Mix tuna with mayo and red onion",
                  "Toast bread if desired",
                  "Spread tuna mixture on bread",
                  "Add cucumber slices and close sandwich"
                ],
                "tags": ["high-protein", "quick", "omega-3"]
              },
              {
                "meal_name": "Chicken Pasta Primavera",
                "meal_type": "dinner",
                "prep_time": 15,
                "cook_time": 20,
                "total_time": 35,
                "servings": 1,
                "calories": 535,
                "macros": {
                  "protein": 38,
                  "carbs": 52,
                  "fat": 18,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Chicken breast",
                    "amount": "120",
                    "unit": "g"
                  },
                  {
                    "item": "Whole wheat pasta",
                    "amount": "75",
                    "unit": "g",
                    "notes": "dry"
                  },
                  {
                    "item": "Zucchini",
                    "amount": "100",
                    "unit": "g",
                    "notes": "sliced"
                  },
                  {
                    "item": "Cherry tomatoes",
                    "amount": "100",
                    "unit": "g",
                    "notes": "halved"
                  },
                  {
                    "item": "Olive oil",
                    "amount": "15",
                    "unit": "ml"
                  }
                ],
                "instructions": [
                  "Cook pasta according to package directions",
                  "Season chicken and cook in pan until done",
                  "Heat olive oil, add zucchini and tomatoes",
                  "Sauté vegetables for 5-7 minutes",
                  "Slice chicken and toss with pasta and vegetables"
                ],
                "tags": ["high-protein", "balanced", "vegetables"]
              }
            ]
          },
          {
            "day_name": "Thursday",
            "day_number": 4,
            "meals": [
              {
                "meal_name": "Smoothie Bowl",
                "meal_type": "breakfast",
                "prep_time": 8,
                "cook_time": 0,
                "total_time": 8,
                "servings": 1,
                "calories": 365,
                "macros": {
                  "protein": 18,
                  "carbs": 48,
                  "fat": 12,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Frozen banana",
                    "amount": "120",
                    "unit": "g"
                  },
                  {
                    "item": "Frozen berries",
                    "amount": "80",
                    "unit": "g"
                  },
                  {
                    "item": "Greek yogurt",
                    "amount": "150",
                    "unit": "g"
                  },
                  {
                    "item": "Granola",
                    "amount": "25",
                    "unit": "g"
                  },
                  {
                    "item": "Almond milk",
                    "amount": "60",
                    "unit": "ml"
                  }
                ],
                "instructions": [
                  "Blend frozen fruits with yogurt and milk",
                  "Pour into bowl",
                  "Top with granola",
                  "Add fresh berries if desired"
                ],
                "tags": ["vegetarian", "high-fiber", "antioxidants"]
              },
              {
                "meal_name": "Quinoa Buddha Bowl",
                "meal_type": "lunch",
                "prep_time": 20,
                "cook_time": 15,
                "total_time": 35,
                "servings": 1,
                "calories": 480,
                "macros": {
                  "protein": 18,
                  "carbs": 62,
                  "fat": 18,
                  "fiber": 12
                },
                "ingredients": [
                  {
                    "item": "Quinoa",
                    "amount": "75",
                    "unit": "g",
                    "notes": "dry"
                  },
                  {
                    "item": "Chickpeas",
                    "amount": "80",
                    "unit": "g",
                    "notes": "cooked"
                  },
                  {
                    "item": "Sweet potato",
                    "amount": "150",
                    "unit": "g",
                    "notes": "cubed and roasted"
                  },
                  {
                    "item": "Avocado",
                    "amount": "80",
                    "unit": "g"
                  },
                  {
                    "item": "Tahini",
                    "amount": "15",
                    "unit": "g"
                  }
                ],
                "instructions": [
                  "Cook quinoa according to package directions",
                  "Roast sweet potato cubes at 200°C for 20 minutes",
                  "Warm chickpeas",
                  "Arrange quinoa, sweet potato, and chickpeas in bowl",
                  "Top with sliced avocado and drizzle with tahini"
                ],
                "tags": ["vegetarian", "high-fiber", "balanced", "vegan"]
              },
              {
                "meal_name": "Baked Cod with Vegetables",
                "meal_type": "dinner",
                "prep_time": 10,
                "cook_time": 25,
                "total_time": 35,
                "servings": 1,
                "calories": 445,
                "macros": {
                  "protein": 35,
                  "carbs": 35,
                  "fat": 16,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Cod fillet",
                    "amount": "150",
                    "unit": "g"
                  },
                  {
                    "item": "Baby potatoes",
                    "amount": "200",
                    "unit": "g"
                  },
                  {
                    "item": "Green beans",
                    "amount": "120",
                    "unit": "g"
                  },
                  {
                    "item": "Olive oil",
                    "amount": "15",
                    "unit": "ml"
                  },
                  {
                    "item": "Lemon",
                    "amount": "0.5",
                    "unit": "medium"
                  }
                ],
                "instructions": [
                  "Preheat oven to 200°C",
                  "Cut potatoes in half and toss with oil",
                  "Roast potatoes for 15 minutes",
                  "Add cod and green beans to pan",
                  "Season with lemon, salt, and pepper",
                  "Bake 10 more minutes until cod flakes easily"
                ],
                "tags": ["high-protein", "omega-3", "low-fat", "vegetables"]
              }
            ]
          },
          {
            "day_name": "Friday",
            "day_number": 5,
            "meals": [
              {
                "meal_name": "Avocado Toast",
                "meal_type": "breakfast",
                "prep_time": 8,
                "cook_time": 3,
                "total_time": 11,
                "servings": 1,
                "calories": 355,
                "macros": {
                  "protein": 16,
                  "carbs": 32,
                  "fat": 20,
                  "fiber": 12
                },
                "ingredients": [
                  {
                    "item": "Whole grain bread",
                    "amount": "2",
                    "unit": "slices"
                  },
                  {
                    "item": "Avocado",
                    "amount": "120",
                    "unit": "g"
                  },
                  {
                    "item": "Egg",
                    "amount": "1",
                    "unit": "large"
                  },
                  {
                    "item": "Cherry tomatoes",
                    "amount": "50",
                    "unit": "g",
                    "notes": "halved"
                  },
                  {
                    "item": "Lemon juice",
                    "amount": "10",
                    "unit": "ml"
                  }
                ],
                "instructions": [
                  "Toast bread slices",
                  "Fry egg sunny-side up",
                  "Mash avocado with lemon juice and salt",
                  "Spread avocado on toast",
                  "Top with fried egg and cherry tomatoes"
                ],
                "tags": ["vegetarian", "high-fiber", "healthy-fats"]
              },
              {
                "meal_name": "Mediterranean Wrap",
                "meal_type": "lunch",
                "prep_time": 12,
                "cook_time": 0,
                "total_time": 12,
                "servings": 1,
                "calories": 465,
                "macros": {
                  "protein": 22,
                  "carbs": 45,
                  "fat": 22,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Whole wheat tortilla",
                    "amount": "1",
                    "unit": "large"
                  },
                  {
                    "item": "Hummus",
                    "amount": "40",
                    "unit": "g"
                  },
                  {
                    "item": "Grilled chicken",
                    "amount": "80",
                    "unit": "g"
                  },
                  {
                    "item": "Cucumber",
                    "amount": "60",
                    "unit": "g",
                    "notes": "diced"
                  },
                  {
                    "item": "Red pepper",
                    "amount": "50",
                    "unit": "g",
                    "notes": "sliced"
                  },
                  {
                    "item": "Feta cheese",
                    "amount": "25",
                    "unit": "g"
                  }
                ],
                "instructions": [
                  "Spread hummus over tortilla",
                  "Layer chicken, cucumber, red pepper",
                  "Crumble feta cheese on top",
                  "Roll tightly and cut in half"
                ],
                "tags": ["mediterranean", "high-protein", "balanced"]
              },
              {
                "meal_name": "Lean Beef with Sweet Potato",
                "meal_type": "dinner",
                "prep_time": 10,
                "cook_time": 25,
                "total_time": 35,
                "servings": 1,
                "calories": 510,
                "macros": {
                  "protein": 38,
                  "carbs": 42,
                  "fat": 18,
                  "fiber": 7
                },
                "ingredients": [
                  {
                    "item": "Lean beef steak",
                    "amount": "130",
                    "unit": "g"
                  },
                  {
                    "item": "Sweet potato",
                    "amount": "200",
                    "unit": "g"
                  },
                  {
                    "item": "Asparagus",
                    "amount": "150",
                    "unit": "g"
                  },
                  {
                    "item": "Olive oil",
                    "amount": "15",
                    "unit": "ml"
                  },
                  {
                    "item": "Garlic",
                    "amount": "2",
                    "unit": "cloves"
                  }
                ],
                "instructions": [
                  "Preheat oven to 200°C",
                  "Cut sweet potato into wedges and roast 20 minutes",
                  "Season steak with salt and pepper",
                  "Pan-sear steak 3-4 minutes each side",
                  "Sauté asparagus with garlic until tender",
                  "Let steak rest, then serve with vegetables"
                ],
                "tags": ["high-protein", "iron-rich", "balanced"]
              }
            ]
          },
          {
            "day_name": "Saturday",
            "day_number": 6,
            "meals": [
              {
                "meal_name": "Weekend Pancakes",
                "meal_type": "breakfast",
                "prep_time": 10,
                "cook_time": 15,
                "total_time": 25,
                "servings": 1,
                "calories": 420,
                "macros": {
                  "protein": 18,
                  "carbs": 58,
                  "fat": 14,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Whole wheat flour",
                    "amount": "80",
                    "unit": "g"
                  },
                  {
                    "item": "Egg",
                    "amount": "1",
                    "unit": "large"
                  },
                  {
                    "item": "Milk",
                    "amount": "150",
                    "unit": "ml"
                  },
                  {
                    "item": "Blueberries",
                    "amount": "80",
                    "unit": "g"
                  },
                  {
                    "item": "Maple syrup",
                    "amount": "30",
                    "unit": "ml"
                  }
                ],
                "instructions": [
                  "Mix flour, egg, and milk to make batter",
                  "Heat non-stick pan over medium heat",
                  "Pour batter to make 3-4 pancakes",
                  "Cook 2-3 minutes each side",
                  "Serve with blueberries and maple syrup"
                ],
                "tags": ["weekend-treat", "vegetarian", "comfort-food"]
              },
              {
                "meal_name": "Chicken Salad Wrap",
                "meal_type": "lunch",
                "prep_time": 15,
                "cook_time": 0,
                "total_time": 15,
                "servings": 1,
                "calories": 445,
                "macros": {
                  "protein": 35,
                  "carbs": 35,
                  "fat": 18,
                  "fiber": 5
                },
                "ingredients": [
                  {
                    "item": "Cooked chicken breast",
                    "amount": "120",
                    "unit": "g",
                    "notes": "diced"
                  },
                  {
                    "item": "Whole wheat tortilla",
                    "amount": "1",
                    "unit": "large"
                  },
                  {
                    "item": "Greek yogurt",
                    "amount": "30",
                    "unit": "g"
                  },
                  {
                    "item": "Grapes",
                    "amount": "60",
                    "unit": "g",
                    "notes": "halved"
                  },
                  {
                    "item": "Celery",
                    "amount": "30",
                    "unit": "g",
                    "notes": "diced"
                  },
                  {
                    "item": "Walnuts",
                    "amount": "20",
                    "unit": "g",
                    "notes": "chopped"
                  }
                ],
                "instructions": [
                  "Mix chicken with yogurt, grapes, celery, and walnuts",
                  "Season with salt and pepper",
                  "Spread mixture on tortilla",
                  "Roll tightly and cut in half"
                ],
                "tags": ["high-protein", "balanced", "quick"]
              },
              {
                "meal_name": "Vegetarian Chili",
                "meal_type": "dinner",
                "prep_time": 15,
                "cook_time": 30,
                "total_time": 45,
                "servings": 1,
                "calories": 485,
                "macros": {
                  "protein": 22,
                  "carbs": 68,
                  "fat": 12,
                  "fiber": 18
                },
                "ingredients": [
                  {
                    "item": "Black beans",
                    "amount": "150",
                    "unit": "g",
                    "notes": "cooked"
                  },
                  {
                    "item": "Kidney beans",
                    "amount": "100",
                    "unit": "g",
                    "notes": "cooked"
                  },
                  {
                    "item": "Diced tomatoes",
                    "amount": "200",
                    "unit": "g",
                    "notes": "canned"
                  },
                  {
                    "item": "Bell peppers",
                    "amount": "100",
                    "unit": "g",
                    "notes": "diced"
                  },
                  {
                    "item": "Onion",
                    "amount": "60",
                    "unit": "g",
                    "notes": "diced"
                  },
                  {
                    "item": "Olive oil",
                    "amount": "15",
                    "unit": "ml"
                  }
                ],
                "instructions": [
                  "Heat oil in large pot",
                  "Sauté onion and peppers 5 minutes",
                  "Add beans and tomatoes",
                  "Season with chili powder, cumin, salt",
                  "Simmer 20 minutes, stirring occasionally"
                ],
                "tags": ["vegetarian", "high-fiber", "plant-protein", "comfort-food"]
              }
            ]
          },
          {
            "day_name": "Sunday",
            "day_number": 7,
            "meals": [
              {
                "meal_name": "Breakfast Burrito",
                "meal_type": "breakfast",
                "prep_time": 12,
                "cook_time": 8,
                "total_time": 20,
                "servings": 1,
                "calories": 395,
                "macros": {
                  "protein": 25,
                  "carbs": 38,
                  "fat": 16,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Whole wheat tortilla",
                    "amount": "1",
                    "unit": "large"
                  },
                  {
                    "item": "Eggs",
                    "amount": "2",
                    "unit": "large"
                  },
                  {
                    "item": "Black beans",
                    "amount": "60",
                    "unit": "g",
                    "notes": "cooked"
                  },
                  {
                    "item": "Cheddar cheese",
                    "amount": "30",
                    "unit": "g",
                    "notes": "shredded"
                  },
                  {
                    "item": "Salsa",
                    "amount": "30",
                    "unit": "g"
                  }
                ],
                "instructions": [
                  "Scramble eggs in non-stick pan",
                  "Warm black beans",
                  "Place eggs and beans on tortilla",
                  "Add cheese and salsa",
                  "Roll tightly to form burrito"
                ],
                "tags": ["high-protein", "vegetarian", "comfort-food"]
              },
              {
                "meal_name": "Asian Lettuce Wraps",
                "meal_type": "lunch",
                "prep_time": 15,
                "cook_time": 10,
                "total_time": 25,
                "servings": 1,
                "calories": 380,
                "macros": {
                  "protein": 32,
                  "carbs": 18,
                  "fat": 20,
                  "fiber": 4
                },
                "ingredients": [
                  {
                    "item": "Ground turkey",
                    "amount": "120",
                    "unit": "g"
                  },
                  {
                    "item": "Butter lettuce",
                    "amount": "8",
                    "unit": "large leaves"
                  },
                  {
                    "item": "Water chestnuts",
                    "amount": "50",
                    "unit": "g",
                    "notes": "diced"
                  },
                  {
                    "item": "Green onions",
                    "amount": "20",
                    "unit": "g",
                    "notes": "sliced"
                  },
                  {
                    "item": "Sesame oil",
                    "amount": "10",
                    "unit": "ml"
                  },
                  {
                    "item": "Soy sauce",
                    "amount": "20",
                    "unit": "ml"
                  }
                ],
                "instructions": [
                  "Heat sesame oil in pan",
                  "Cook ground turkey until browned",
                  "Add water chestnuts and soy sauce",
                  "Cook 2 more minutes",
                  "Serve turkey mixture in lettuce cups",
                  "Garnish with green onions"
                ],
                "tags": ["high-protein", "low-carb", "asian-inspired"]
              },
              {
                "meal_name": "Herb-Roasted Chicken with Vegetables",
                "meal_type": "dinner",
                "prep_time": 15,
                "cook_time": 35,
                "total_time": 50,
                "servings": 1,
                "calories": 525,
                "macros": {
                  "protein": 42,
                  "carbs": 35,
                  "fat": 22,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Chicken thigh",
                    "amount": "150",
                    "unit": "g",
                    "notes": "bone-in, skin-on"
                  },
                  {
                    "item": "Baby potatoes",
                    "amount": "150",
                    "unit": "g"
                  },
                  {
                    "item": "Carrots",
                    "amount": "100",
                    "unit": "g",
                    "notes": "cut into sticks"
                  },
                  {
                    "item": "Brussels sprouts",
                    "amount": "120",
                    "unit": "g",
                    "notes": "halved"
                  },
                  {
                    "item": "Olive oil",
                    "amount": "20",
                    "unit": "ml"
                  },
                  {
                    "item": "Fresh herbs",
                    "amount": "10",
                    "unit": "g",
                    "notes": "rosemary, thyme"
                  }
                ],
                "instructions": [
                  "Preheat oven to 200°C",
                  "Toss vegetables with oil and herbs",
                  "Season chicken with salt, pepper, herbs",
                  "Roast chicken and vegetables 35 minutes",
                  "Check chicken is cooked through (75°C internal temp)",
                  "Let rest 5 minutes before serving"
                ],
                "tags": ["high-protein", "roasted", "comfort-food", "meal-prep"]
              }
            ]
          }
        ]
      }
    ]
  };

  const ketoMealPlan = {
    "plan_name": "14-Day Keto Kickstart",
    "description": "Low-carb fat burning plan",
    "duration_days": 14,
    "total_meals": 42,
    "weeks": [
      {
        "week_number": 1,
        "days": [
          {
            "day_name": "Monday",
            "day_number": 1,
            "meals": [
              {
                "meal_name": "Avocado Bacon Scramble",
                "meal_type": "breakfast",
                "prep_time": 5,
                "cook_time": 8,
                "total_time": 13,
                "servings": 1,
                "calories": 420,
                "macros": {
                  "protein": 22,
                  "carbs": 6,
                  "fat": 35,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Eggs",
                    "amount": "2",
                    "unit": "large"
                  },
                  {
                    "item": "Avocado",
                    "amount": "0.5",
                    "unit": "medium"
                  },
                  {
                    "item": "Bacon",
                    "amount": "2",
                    "unit": "strips"
                  }
                ],
                "instructions": [
                  "Cook bacon until crispy",
                  "Scramble eggs in bacon fat",
                  "Serve with sliced avocado"
                ],
                "tags": ["keto", "low-carb", "high-fat"]
              },
              {
                "meal_name": "Chicken Avocado Salad",
                "meal_type": "lunch",
                "prep_time": 10,
                "cook_time": 0,
                "total_time": 10,
                "servings": 1,
                "calories": 480,
                "macros": {
                  "protein": 35,
                  "carbs": 8,
                  "fat": 35,
                  "fiber": 12
                },
                "ingredients": [
                  {
                    "item": "Grilled chicken breast",
                    "amount": "4",
                    "unit": "oz"
                  },
                  {
                    "item": "Avocado",
                    "amount": "1",
                    "unit": "medium"
                  },
                  {
                    "item": "Mixed greens",
                    "amount": "2",
                    "unit": "cups"
                  },
                  {
                    "item": "Olive oil",
                    "amount": "2",
                    "unit": "tbsp"
                  },
                  {
                    "item": "Lemon juice",
                    "amount": "1",
                    "unit": "tbsp"
                  }
                ],
                "instructions": [
                  "Dice chicken breast and avocado",
                  "Mix chicken and avocado with lemon juice",
                  "Serve over mixed greens",
                  "Drizzle with olive oil"
                ],
                "tags": ["keto", "low-carb", "high-fat", "quick"]
              },
              {
                "meal_name": "Ribeye Steak with Asparagus",
                "meal_type": "dinner",
                "prep_time": 5,
                "cook_time": 15,
                "total_time": 20,
                "servings": 1,
                "calories": 650,
                "macros": {
                  "protein": 45,
                  "carbs": 6,
                  "fat": 50,
                  "fiber": 3
                },
                "ingredients": [
                  {
                    "item": "Ribeye steak",
                    "amount": "6",
                    "unit": "oz"
                  },
                  {
                    "item": "Asparagus",
                    "amount": "1",
                    "unit": "cup"
                  },
                  {
                    "item": "Butter",
                    "amount": "2",
                    "unit": "tbsp"
                  },
                  {
                    "item": "Garlic",
                    "amount": "2",
                    "unit": "cloves",
                    "notes": "minced"
                  }
                ],
                "instructions": [
                  "Season steak with salt and pepper",
                  "Heat pan over medium-high heat",
                  "Cook steak 4-5 minutes per side for medium-rare",
                  "Sauté asparagus with garlic and butter",
                  "Let steak rest 5 minutes before serving"
                ],
                "tags": ["keto", "low-carb", "high-fat", "high-protein"]
              }
            ]
          },
          {
            "day_name": "Tuesday",
            "day_number": 2,
            "meals": [
              {
                "meal_name": "Bulletproof Coffee",
                "meal_type": "breakfast",
                "prep_time": 5,
                "cook_time": 0,
                "total_time": 5,
                "servings": 1,
                "calories": 320,
                "macros": {
                  "protein": 1,
                  "carbs": 2,
                  "fat": 35,
                  "fiber": 0
                },
                "ingredients": [
                  {
                    "item": "Black coffee",
                    "amount": "1",
                    "unit": "cup",
                    "notes": "freshly brewed"
                  },
                  {
                    "item": "Grass-fed butter",
                    "amount": "1",
                    "unit": "tbsp"
                  },
                  {
                    "item": "MCT oil",
                    "amount": "1",
                    "unit": "tbsp"
                  }
                ],
                "instructions": [
                  "Brew fresh black coffee",
                  "Add butter and MCT oil to coffee",
                  "Blend for 10-15 seconds until frothy",
                  "Serve immediately while hot"
                ],
                "tags": ["keto", "low-carb", "high-fat", "quick"]
              },
              {
                "meal_name": "Tuna Stuffed Avocados",
                "meal_type": "lunch",
                "prep_time": 10,
                "cook_time": 0,
                "total_time": 10,
                "servings": 1,
                "calories": 520,
                "macros": {
                  "protein": 35,
                  "carbs": 8,
                  "fat": 38,
                  "fiber": 10
                },
                "ingredients": [
                  {
                    "item": "Avocados",
                    "amount": "2",
                    "unit": "medium"
                  },
                  {
                    "item": "Tuna",
                    "amount": "1",
                    "unit": "can",
                    "notes": "in water, drained"
                  },
                  {
                    "item": "Mayonnaise",
                    "amount": "2",
                    "unit": "tbsp"
                  },
                  {
                    "item": "Red onion",
                    "amount": "2",
                    "unit": "tbsp",
                    "notes": "diced"
                  }
                ],
                "instructions": [
                  "Cut avocados in half and remove pits",
                  "Scoop out some flesh to create wells",
                  "Mix tuna, mayo, and red onion",
                  "Fill avocado halves with tuna mixture"
                ],
                "tags": ["keto", "low-carb", "high-fat", "no-cook"]
              },
              {
                "meal_name": "Pork Chops with Cauliflower Mash",
                "meal_type": "dinner",
                "prep_time": 10,
                "cook_time": 20,
                "total_time": 30,
                "servings": 1,
                "calories": 580,
                "macros": {
                  "protein": 42,
                  "carbs": 8,
                  "fat": 42,
                  "fiber": 4
                },
                "ingredients": [
                  {
                    "item": "Pork chops",
                    "amount": "1",
                    "unit": "thick cut",
                    "notes": "bone-in, 6 oz"
                  },
                  {
                    "item": "Cauliflower",
                    "amount": "2",
                    "unit": "cups",
                    "notes": "chopped"
                  },
                  {
                    "item": "Heavy cream",
                    "amount": "0.25",
                    "unit": "cup"
                  },
                  {
                    "item": "Butter",
                    "amount": "2",
                    "unit": "tbsp"
                  }
                ],
                "instructions": [
                  "Steam cauliflower until tender, about 15 minutes",
                  "Season pork chops with salt and pepper",
                  "Pan-sear pork chops 4-5 minutes per side",
                  "Mash cauliflower with cream and butter",
                  "Let pork rest, then serve with cauliflower mash"
                ],
                "tags": ["keto", "low-carb", "high-fat", "comfort-food"]
              }
            ]
          },
          {
            "day_name": "Wednesday",
            "day_number": 3,
            "meals": [
              {
                "meal_name": "Keto Omelet",
                "meal_type": "breakfast",
                "prep_time": 5,
                "cook_time": 8,
                "total_time": 13,
                "servings": 1,
                "calories": 450,
                "macros": {
                  "protein": 28,
                  "carbs": 5,
                  "fat": 35,
                  "fiber": 1
                },
                "ingredients": [
                  {
                    "item": "Eggs",
                    "amount": "3",
                    "unit": "large"
                  },
                  {
                    "item": "Cheddar cheese",
                    "amount": "0.25",
                    "unit": "cup",
                    "notes": "shredded"
                  },
                  {
                    "item": "Spinach",
                    "amount": "0.5",
                    "unit": "cup",
                    "notes": "fresh"
                  },
                  {
                    "item": "Butter",
                    "amount": "1",
                    "unit": "tbsp"
                  }
                ],
                "instructions": [
                  "Beat eggs in bowl",
                  "Heat butter in pan over medium heat",
                  "Pour in eggs, let set for 1 minute",
                  "Add spinach and cheese to one half",
                  "Fold omelet in half and serve"
                ],
                "tags": ["keto", "low-carb", "high-fat", "vegetarian"]
              }
            ]
          }
        ]
      },
      {
        "week_number": 2,
        "days": [
          {
            "day_name": "Monday",
            "day_number": 8,
            "meals": [
              {
                "meal_name": "Coconut Chia Pudding",
                "meal_type": "breakfast",
                "prep_time": 5,
                "cook_time": 0,
                "total_time": 5,
                "servings": 1,
                "calories": 380,
                "macros": {
                  "protein": 8,
                  "carbs": 6,
                  "fat": 35,
                  "fiber": 12
                },
                "ingredients": [
                  {
                    "item": "Chia seeds",
                    "amount": "3",
                    "unit": "tbsp"
                  },
                  {
                    "item": "Coconut milk",
                    "amount": "0.75",
                    "unit": "cup",
                    "notes": "full-fat canned"
                  },
                  {
                    "item": "Vanilla extract",
                    "amount": "0.5",
                    "unit": "tsp"
                  }
                ],
                "instructions": [
                  "Mix chia seeds with coconut milk and vanilla",
                  "Refrigerate overnight until thick",
                  "Stir before serving"
                ],
                "tags": ["keto", "low-carb", "high-fat", "meal-prep"]
              }
            ]
          }
        ]
      }
    ]
  };

  const muscleGainMealPlan = {
    "plan_name": "Muscle Gain Pro",
    "description": "High-protein muscle building",
    "duration_days": 28,
    "total_meals": 140,
    "weeks": [
      {
        "week_number": 1,
        "days": [
          {
            "day_name": "Monday",
            "day_number": 1,
            "meals": [
              {
                "meal_name": "Power Protein Bowl",
                "meal_type": "breakfast",
                "prep_time": 10,
                "cook_time": 15,
                "total_time": 25,
                "servings": 1,
                "calories": 650,
                "macros": {
                  "protein": 45,
                  "carbs": 55,
                  "fat": 18,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Oatmeal",
                    "amount": "0.75",
                    "unit": "cup"
                  },
                  {
                    "item": "Protein powder",
                    "amount": "1",
                    "unit": "scoop"
                  },
                  {
                    "item": "Banana",
                    "amount": "1",
                    "unit": "medium"
                  },
                  {
                    "item": "Almond butter",
                    "amount": "1",
                    "unit": "tbsp"
                  }
                ],
                "instructions": [
                  "Cook oatmeal according to package directions",
                  "Stir in protein powder while hot",
                  "Top with sliced banana and almond butter"
                ],
                "tags": ["high-protein", "muscle-building", "post-workout"]
              },
              {
                "meal_name": "Chicken & Rice Power Bowl",
                "meal_type": "lunch",
                "prep_time": 15,
                "cook_time": 25,
                "total_time": 40,
                "servings": 1,
                "calories": 720,
                "macros": {
                  "protein": 52,
                  "carbs": 68,
                  "fat": 18,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Chicken breast",
                    "amount": "6",
                    "unit": "oz"
                  },
                  {
                    "item": "Brown rice",
                    "amount": "1",
                    "unit": "cup",
                    "notes": "cooked"
                  },
                  {
                    "item": "Black beans",
                    "amount": "0.5",
                    "unit": "cup"
                  },
                  {
                    "item": "Sweet potato",
                    "amount": "1",
                    "unit": "medium",
                    "notes": "roasted"
                  },
                  {
                    "item": "Avocado",
                    "amount": "0.25",
                    "unit": "medium"
                  }
                ],
                "instructions": [
                  "Season and grill chicken breast until cooked through",
                  "Roast sweet potato at 400°F for 25-30 minutes",
                  "Warm black beans",
                  "Combine all ingredients in bowl",
                  "Top with sliced avocado"
                ],
                "tags": ["high-protein", "muscle-building", "balanced", "meal-prep"]
              },
              {
                "meal_name": "Post-Workout Protein Smoothie",
                "meal_type": "snack",
                "prep_time": 5,
                "cook_time": 0,
                "total_time": 5,
                "servings": 1,
                "calories": 380,
                "macros": {
                  "protein": 35,
                  "carbs": 42,
                  "fat": 8,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Protein powder",
                    "amount": "1",
                    "unit": "scoop",
                    "notes": "whey or plant-based"
                  },
                  {
                    "item": "Banana",
                    "amount": "1",
                    "unit": "large"
                  },
                  {
                    "item": "Spinach",
                    "amount": "1",
                    "unit": "cup",
                    "notes": "fresh"
                  },
                  {
                    "item": "Almond milk",
                    "amount": "1.5",
                    "unit": "cups"
                  },
                  {
                    "item": "Berries",
                    "amount": "0.5",
                    "unit": "cup",
                    "notes": "mixed frozen"
                  }
                ],
                "instructions": [
                  "Add all ingredients to blender",
                  "Blend until smooth and creamy",
                  "Add ice if desired consistency",
                  "Consume within 30 minutes post-workout"
                ],
                "tags": ["high-protein", "post-workout", "quick", "recovery"]
              },
              {
                "meal_name": "Lean Beef with Quinoa",
                "meal_type": "dinner",
                "prep_time": 10,
                "cook_time": 20,
                "total_time": 30,
                "servings": 1,
                "calories": 680,
                "macros": {
                  "protein": 48,
                  "carbs": 52,
                  "fat": 22,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Lean ground beef",
                    "amount": "6",
                    "unit": "oz",
                    "notes": "93/7 lean"
                  },
                  {
                    "item": "Quinoa",
                    "amount": "0.75",
                    "unit": "cup",
                    "notes": "cooked"
                  },
                  {
                    "item": "Broccoli",
                    "amount": "1.5",
                    "unit": "cups"
                  },
                  {
                    "item": "Bell peppers",
                    "amount": "1",
                    "unit": "cup",
                    "notes": "mixed colors"
                  },
                  {
                    "item": "Olive oil",
                    "amount": "1",
                    "unit": "tbsp"
                  }
                ],
                "instructions": [
                  "Cook quinoa according to package directions",
                  "Season beef with salt, pepper, and garlic powder",
                  "Brown beef in large skillet over medium-high heat",
                  "Steam broccoli and bell peppers until tender-crisp",
                  "Serve beef over quinoa with vegetables, drizzle with olive oil"
                ],
                "tags": ["high-protein", "muscle-building", "balanced", "iron-rich"]
              }
            ]
          },
          {
            "day_name": "Tuesday",
            "day_number": 2,
            "meals": [
              {
                "meal_name": "Muscle Builder Pancakes",
                "meal_type": "breakfast",
                "prep_time": 10,
                "cook_time": 10,
                "total_time": 20,
                "servings": 1,
                "calories": 580,
                "macros": {
                  "protein": 38,
                  "carbs": 62,
                  "fat": 15,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Protein powder",
                    "amount": "1",
                    "unit": "scoop"
                  },
                  {
                    "item": "Oat flour",
                    "amount": "0.5",
                    "unit": "cup"
                  },
                  {
                    "item": "Egg whites",
                    "amount": "4",
                    "unit": "large"
                  },
                  {
                    "item": "Greek yogurt",
                    "amount": "0.25",
                    "unit": "cup"
                  },
                  {
                    "item": "Blueberries",
                    "amount": "0.5",
                    "unit": "cup"
                  }
                ],
                "instructions": [
                  "Mix protein powder and oat flour in bowl",
                  "Whisk in egg whites and Greek yogurt until smooth",
                  "Heat non-stick pan over medium heat",
                  "Pour batter to make 3-4 pancakes",
                  "Top with fresh blueberries"
                ],
                "tags": ["high-protein", "muscle-building", "pre-workout"]
              },
              {
                "meal_name": "Tuna Power Salad",
                "meal_type": "lunch",
                "prep_time": 10,
                "cook_time": 0,
                "total_time": 10,
                "servings": 1,
                "calories": 520,
                "macros": {
                  "protein": 42,
                  "carbs": 35,
                  "fat": 22,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Tuna",
                    "amount": "2",
                    "unit": "cans",
                    "notes": "in water, drained"
                  },
                  {
                    "item": "Chickpeas",
                    "amount": "0.5",
                    "unit": "cup"
                  },
                  {
                    "item": "Mixed greens",
                    "amount": "3",
                    "unit": "cups"
                  },
                  {
                    "item": "Cherry tomatoes",
                    "amount": "1",
                    "unit": "cup",
                    "notes": "halved"
                  },
                  {
                    "item": "Olive oil vinaigrette",
                    "amount": "2",
                    "unit": "tbsp"
                  }
                ],
                "instructions": [
                  "Drain tuna and flake into large bowl",
                  "Add chickpeas, cherry tomatoes",
                  "Serve over mixed greens",
                  "Drizzle with vinaigrette and toss"
                ],
                "tags": ["high-protein", "quick", "omega-3", "lean"]
              },
              {
                "meal_name": "Turkey Meatballs with Pasta",
                "meal_type": "dinner",
                "prep_time": 15,
                "cook_time": 25,
                "total_time": 40,
                "servings": 1,
                "calories": 750,
                "macros": {
                  "protein": 52,
                  "carbs": 78,
                  "fat": 18,
                  "fiber": 6
                },
                "ingredients": [
                  {
                    "item": "Ground turkey",
                    "amount": "6",
                    "unit": "oz",
                    "notes": "93/7 lean"
                  },
                  {
                    "item": "Whole wheat pasta",
                    "amount": "2",
                    "unit": "oz",
                    "notes": "dry weight"
                  },
                  {
                    "item": "Marinara sauce",
                    "amount": "0.5",
                    "unit": "cup"
                  },
                  {
                    "item": "Parmesan cheese",
                    "amount": "2",
                    "unit": "tbsp",
                    "notes": "grated"
                  }
                ],
                "instructions": [
                  "Form turkey into 8-10 meatballs",
                  "Bake meatballs at 400°F for 20 minutes",
                  "Cook pasta according to package directions",
                  "Heat marinara sauce",
                  "Serve meatballs and sauce over pasta, top with parmesan"
                ],
                "tags": ["high-protein", "muscle-building", "comfort-food"]
              }
            ]
          }
        ]
      },
      {
        "week_number": 2,
        "days": [
          {
            "day_name": "Monday",
            "day_number": 8,
            "meals": [
              {
                "meal_name": "Protein-Packed French Toast",
                "meal_type": "breakfast",
                "prep_time": 10,
                "cook_time": 8,
                "total_time": 18,
                "servings": 1,
                "calories": 620,
                "macros": {
                  "protein": 42,
                  "carbs": 58,
                  "fat": 18,
                  "fiber": 8
                },
                "ingredients": [
                  {
                    "item": "Ezekiel bread",
                    "amount": "2",
                    "unit": "slices"
                  },
                  {
                    "item": "Eggs",
                    "amount": "2",
                    "unit": "large"
                  },
                  {
                    "item": "Protein powder",
                    "amount": "0.5",
                    "unit": "scoop",
                    "notes": "vanilla"
                  },
                  {
                    "item": "Greek yogurt",
                    "amount": "0.5",
                    "unit": "cup"
                  },
                  {
                    "item": "Berries",
                    "amount": "0.5",
                    "unit": "cup",
                    "notes": "mixed fresh"
                  }
                ],
                "instructions": [
                  "Whisk eggs, protein powder, and a splash of milk",
                  "Dip bread slices in mixture",
                  "Cook in non-stick pan 3-4 minutes per side",
                  "Serve with Greek yogurt and berries"
                ],
                "tags": ["high-protein", "muscle-building", "weekend-special"]
              }
            ]
          }
        ]
      }
    ]
  };

  const sampleMealPlans: SampleMealPlan[] = [
    {
      id: 'quick-start',
      title: 'Quick Start - Balanced Nutrition',
      description: 'Perfect starter meal plan',
      duration: '7 days • 21 meals',
      difficulty: 'Beginner',
      focus: 'Balanced Nutrition',
      program: quickStartMealPlan,
      detailInfo: {
        overview: 'A comprehensive 7-day balanced nutrition plan with easy-to-prepare meals that cover all macronutrients and provide sustainable energy throughout the day.',
        highlights: [
          '7 days of balanced meal planning',
          'Quick 15-minute meal prep times',
          'Beginner-friendly cooking techniques',
          'Grocery list optimization',
          'Nutritional variety and balance',
          'Alternative ingredient suggestions'
        ],
        targetGoals: 'Establishing healthy eating habits with balanced macronutrients, steady energy levels, and sustainable meal planning practices',
        mealTypes: '3 main meals per day with optimal breakfast, lunch, and dinner combinations focusing on protein, complex carbs, and healthy fats',
        nutrition: 'Balanced macro split: 25% protein, 45% carbs, 30% fat with 1800-2200 calories per day depending on activity level',
        cookingLevel: 'Beginner-friendly with simple techniques: mixing, basic cooking, minimal prep time requirements'
      }
    },
    {
      id: 'keto-14',
      title: '14-Day Keto Kickstart',
      description: 'Low-carb fat burning plan',
      duration: '14 days • 42 meals',
      difficulty: 'Intermediate',
      focus: 'Ketogenic & Fat Loss',
      program: ketoMealPlan,
      detailInfo: {
        overview: 'A comprehensive 14-day ketogenic meal plan designed to kickstart fat burning through strategic carb restriction and increased healthy fat intake.',
        highlights: [
          '2-week ketogenic protocol',
          'Under 20g net carbs per day',
          'High-quality fat sources',
          'Electrolyte balance guidance',
          'Ketosis tracking tips',
          'Restaurant and travel adaptations'
        ],
        targetGoals: 'Enter ketosis for fat burning, reduce inflammation, stabilize blood sugar, and establish sustainable low-carb eating patterns',
        mealTypes: 'High-fat breakfast, moderate lunch, and satisfying dinner with optional intermittent fasting windows',
        nutrition: 'Ketogenic macro split: 25% protein, 5% carbs, 70% fat with 1600-2000 calories optimized for ketosis',
        cookingLevel: 'Intermediate with emphasis on fat cooking techniques, meal timing, and macro tracking requirements'
      }
    },
    {
      id: 'muscle-gain-28',
      title: 'Muscle Gain Pro',
      description: 'High-protein muscle building',
      duration: '28 days • 140 meals',
      difficulty: 'Advanced',
      focus: 'Muscle Building & Performance',
      program: muscleGainMealPlan,
      detailInfo: {
        overview: 'A comprehensive 4-week high-protein muscle building plan with strategic nutrient timing, progressive caloric surplus, and performance optimization.',
        highlights: [
          '4-week muscle building protocol',
          'High protein intake (1.2-1.6g per lb)',
          'Pre and post-workout nutrition',
          'Progressive caloric increases',
          'Advanced meal timing strategies',
          'Supplement integration guidance'
        ],
        targetGoals: 'Maximize muscle protein synthesis, support intense training, optimize recovery, and build lean mass with minimal fat gain',
        mealTypes: '5-6 meals per day with strategic pre-workout, post-workout, and bedtime nutrition timing',
        nutrition: 'Muscle building split: 30% protein, 40% carbs, 30% fat with 2800-3500 calories based on training intensity',
        cookingLevel: 'Advanced meal prep techniques, batch cooking, precise macro tracking, and supplement timing coordination'
      }
    }
  ];

  const handleCopyMealPlan = async (mealPlan: SampleMealPlan) => {
    const mealPlanJson = JSON.stringify(mealPlan.program, null, 2);
    await Clipboard.setStringAsync(mealPlanJson);
    
    setCopiedId(mealPlan.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return '#22c55e';
      case 'Intermediate':
        return '#f59e0b';
      case 'Advanced':
        return '#ef4444';
      default:
        return '#71717a';
    }
  };

  const handleShowDetails = (mealPlan: SampleMealPlan) => {
    console.log('INFO BUTTON PRESSED:', mealPlan.title);
    
    if (Platform.OS === 'ios') {
      handleExpandCard(mealPlan.id);
    } else {
      setSelectedMealPlan(mealPlan);
      setShowDetailModal(true);
    }
  };

  const handleExpandCard = (mealPlanId: string) => {
    const isCurrentlyExpanded = expandedCard === mealPlanId;
    
    if (isCurrentlyExpanded) {
      Animated.timing(flipAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setExpandedCard(null);
      });
    } else {
      setExpandedCard(mealPlanId);
      Animated.timing(flipAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const renderMealPlanCard = (mealPlan: SampleMealPlan, index: number) => {
    const isExpanded = expandedCard === mealPlan.id;
    
    const frontRotateY = flipAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });
    
    const backRotateY = flipAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['180deg', '360deg'],
    });

    const imageUrls = [
      'https://images.unsplash.com/photo-1547496502-affa22d38842?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', // Healthy bowl
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80', // Keto meal
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80'  // High protein
    ];

    if (Platform.OS === 'ios') {
      return (
        <View key={mealPlan.id} style={[styles.mealPlanCard, isExpanded && styles.expandedCard]}>
          {/* Front of card */}
          <Animated.View 
            style={[
              styles.cardFace,
              { transform: [{ rotateY: frontRotateY }] },
              isExpanded && styles.cardHidden
            ]}
          >
            <TouchableOpacity 
              onPress={() => handleCopyMealPlan(mealPlan)}
              activeOpacity={0.8}
              style={styles.cardTouchable}
              disabled={isExpanded}
            >
              <ImageBackground
                style={styles.cardBackground}
                imageStyle={styles.cardImage}
                source={{ uri: imageUrls[index] }}
              >
                <LinearGradient
                  colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTopRow}>
                      <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(mealPlan.difficulty) }]}>
                        <Text style={styles.difficultyText}>{mealPlan.difficulty}</Text>
                      </View>
                      <View style={styles.cardActions}>
                        <TouchableOpacity 
                          style={styles.infoButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleShowDetails(mealPlan);
                          }}
                          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="information-circle-outline" size={24} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.mealPlanTitle}>{mealPlan.title}</Text>
                    <Text style={styles.mealPlanDescription}>{mealPlan.description}</Text>
                    
                    <View style={styles.cardFooter}>
                      <Text style={styles.focusText}>{mealPlan.focus}</Text>
                      <Text style={styles.durationText}>{mealPlan.duration}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </TouchableOpacity>
            
            {/* Copied Overlay */}
            {copiedId === mealPlan.id && (
              <View style={styles.copiedOverlay}>
                <LinearGradient
                  colors={[`${themeColor}F2`, `${themeColor}D9`]}
                  style={styles.copiedGradient}
                >
                  <View style={styles.copiedContent}>
                    <Ionicons name="checkmark-circle" size={60} color="#ffffff" />
                    <Text style={styles.copiedTitle}>Copied!</Text>
                    <Text style={styles.copiedSubtitle}>{mealPlan.title} is ready to import</Text>
                  </View>
                </LinearGradient>
              </View>
            )}
          </Animated.View>

          {/* Back of card - iOS only */}
          <Animated.View 
            style={[
              styles.cardFace,
              styles.cardBack,
              { transform: [{ rotateY: backRotateY }] },
              !isExpanded && styles.cardHidden
            ]}
          >
            <LinearGradient
              colors={['#1e293b', '#0f172a']}
              style={styles.cardBackGradient}
            >
              <View style={styles.backHeader}>
                <Text style={styles.backTitle}>{mealPlan.title}</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => handleExpandCard(mealPlan.id)}
                >
                  <Ionicons name="close" size={24} color="#ffffff" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.backContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.overviewText}>{mealPlan.detailInfo.overview}</Text>
                
                <View style={styles.highlightsSection}>
                  <Text style={styles.sectionTitle}>Key Features</Text>
                  {mealPlan.detailInfo.highlights.map((highlight, idx) => (
                    <View key={idx} style={styles.highlightItem}>
                      <Ionicons name="checkmark" size={16} color={themeColor} />
                      <Text style={styles.highlightText}>{highlight}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Target Goals</Text>
                  <Text style={styles.detailText}>{mealPlan.detailInfo.targetGoals}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Meal Structure</Text>
                  <Text style={styles.detailText}>{mealPlan.detailInfo.mealTypes}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Nutrition</Text>
                  <Text style={styles.detailText}>{mealPlan.detailInfo.nutrition}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Cooking Level</Text>
                  <Text style={styles.detailText}>{mealPlan.detailInfo.cookingLevel}</Text>
                </View>
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </View>
      );
    } else {
      // Android: Simplified design
      return (
        <View key={mealPlan.id} style={styles.mealPlanCard}>
          <ImageBackground
            style={styles.cardBackground}
            imageStyle={styles.cardImage}
            source={{ uri: imageUrls[index] }}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
              style={styles.cardGradient}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(mealPlan.difficulty) }]}>
                    <Text style={styles.difficultyText}>{mealPlan.difficulty}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity 
                      style={styles.infoButton}
                      onPress={() => handleShowDetails(mealPlan)}
                      hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                      <Ionicons name="information-circle-outline" size={24} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => handleCopyMealPlan(mealPlan)}
                style={styles.cardContentArea}
                activeOpacity={0.8}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.mealPlanTitle}>{mealPlan.title}</Text>
                  <Text style={styles.mealPlanDescription}>{mealPlan.description}</Text>
                  
                  <View style={styles.cardFooter}>
                    <Text style={styles.focusText}>{mealPlan.focus}</Text>
                    <Text style={styles.durationText}>{mealPlan.duration}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </ImageBackground>
          
          {/* Copied Overlay */}
          {copiedId === mealPlan.id && (
            <View style={styles.copiedOverlay}>
              <LinearGradient
                colors={[`${themeColor}F2`, `${themeColor}D9`]}
                style={styles.copiedGradient}
              >
                <View style={styles.copiedContent}>
                  <Ionicons name="checkmark-circle" size={60} color="#ffffff" />
                  <Text style={styles.copiedTitle}>Copied!</Text>
                  <Text style={styles.copiedSubtitle}>{mealPlan.title} is ready to import</Text>
                </View>
              </LinearGradient>
            </View>
          )}
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.simpleHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meal Plans</Text>
          <View style={styles.placeholder} />
        </View>

        {Platform.OS === 'ios' && expandedCard ? (
          <View style={styles.expandedContainer}>
            {renderMealPlanCard(sampleMealPlans.find(m => m.id === expandedCard)!, sampleMealPlans.findIndex(m => m.id === expandedCard))}
          </View>
        ) : (
          sampleMealPlans.map((mealPlan, index) => renderMealPlanCard(mealPlan, index))
        )}

        <View style={styles.trendsSection}>
          <Text style={styles.sectionTitle}>Getting Started</Text>
          <View style={styles.infoCard}>
            <LinearGradient
              colors={['#2d3748', '#1a202c']}
              style={styles.infoGradient}
            >
              <View style={styles.infoContent}>
                <View style={styles.infoIcon}>
                  <Ionicons name="download-outline" size={24} color={themeColor} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>How to Import</Text>
                  <Text style={styles.infoDescription}>
                    Tap any meal plan card to copy it to your clipboard, then return and use "Paste & Import"
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.bottomText}>More meal plans coming soon</Text>
        </View>
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedMealPlan && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedMealPlan.title}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.overviewText}>{selectedMealPlan.detailInfo.overview}</Text>
              
              <View style={styles.highlightsSection}>
                <Text style={styles.sectionTitle}>Key Features</Text>
                {selectedMealPlan.detailInfo.highlights.map((highlight, idx) => (
                  <View key={idx} style={styles.highlightItem}>
                    <Ionicons name="checkmark" size={16} color={themeColor} />
                    <Text style={styles.highlightText}>{highlight}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Target Goals</Text>
                <Text style={styles.detailText}>{selectedMealPlan.detailInfo.targetGoals}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Meal Structure</Text>
                <Text style={styles.detailText}>{selectedMealPlan.detailInfo.mealTypes}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Nutrition</Text>
                <Text style={styles.detailText}>{selectedMealPlan.detailInfo.nutrition}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Cooking Level</Text>
                <Text style={styles.detailText}>{selectedMealPlan.detailInfo.cookingLevel}</Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  simpleHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  expandedContainer: {
    paddingVertical: 20,
  },
  mealPlanCard: {
    borderRadius: 16,
    marginBottom: 16,
    height: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  expandedCard: {
    height: 400,
    marginBottom: 32,
    marginTop: 16,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backfaceVisibility: 'hidden',
  },
  cardHidden: {
    opacity: 0,
  },
  cardTouchable: {
    width: '100%',
    height: '100%',
  },
  cardBack: {
    backgroundColor: '#1e293b',
  },
  cardBackground: {
    width: '100%',
    height: '100%',
  },
  cardImage: {
    borderRadius: 16,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    alignItems: 'flex-start',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cardContentArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardContent: {
    alignItems: 'flex-start',
  },
  mealPlanTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mealPlanDescription: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 12,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardFooter: {
    width: '100%',
    gap: 4,
  },
  focusText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  durationText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardBackGradient: {
    flex: 1,
    padding: 20,
  },
  backHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 8,
  },
  backContent: {
    flex: 1,
  },
  overviewText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 16,
  },
  highlightsSection: {
    marginBottom: 16,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  highlightText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  trendsSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  infoGradient: {
    padding: 20,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(66, 153, 225, 0.2)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  bottomText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  copiedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  copiedGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  copiedContent: {
    alignItems: 'center',
  },
  copiedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  copiedSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  modalHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});