import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, NutritionCompletionStatus } from '../utils/storage';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  navigationTarget: string;
  completionKey: keyof NutritionCompletionStatus;
}

const optionalTools: ToolCard[] = [
  {
    id: 'fridgePantry',
    title: 'My Fridge & Pantry',
    description: 'Add ingredients you already have',
    icon: 'storefront-outline',
    navigationTarget: 'FridgePantryQuestionnaire',
    completionKey: 'fridgePantry',
  },
  {
    id: 'favorites',
    title: 'Favorite Meals',
    description: 'View and manage your saved meals',
    icon: 'heart-outline',
    navigationTarget: 'FavoriteMeals',
    completionKey: 'favoriteMeals',
  },
];

// ── Helper ────────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function NutritionOptionalToolsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  const [completionStatus, setCompletionStatus] = useState<NutritionCompletionStatus>({
    nutritionGoals: false,
    budgetCooking: false,
    sleepOptimization: false,
    fridgePantry: false,
    favoriteMeals: false,
  });
  const [fridgePantryCount, setFridgePantryCount] = useState<number>(0);
  const [useFridgePantry, setUseFridgePantry] = useState<boolean>(false);
  const [fridgePantryPreferences, setFridgePantryPreferences] = useState<any>(null);

  useEffect(() => {
    loadCompletionStatus();
    loadFridgePantryCount();
    loadUseFridgePantryToggle();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadCompletionStatus();
      loadFridgePantryCount();
      loadUseFridgePantryToggle();
    }, [])
  );

  const loadCompletionStatus = async () => {
    try {
      const status = await WorkoutStorage.loadNutritionCompletionStatus();
      setCompletionStatus(status);
    } catch (error) {
      console.error('Failed to load completion status:', error);
    }
  };

  const loadFridgePantryCount = async () => {
    try {
      const results = await WorkoutStorage.loadFridgePantryResults();
      if (results && results.formData.ingredients) {
        setFridgePantryCount(results.formData.ingredients.length);
      }
      if (results && results.formData.preferences) {
        setFridgePantryPreferences(results.formData.preferences);
      }
    } catch (error) {
      console.error('Failed to load fridge pantry count:', error);
    }
  };

  const loadUseFridgePantryToggle = async () => {
    try {
      const results = await WorkoutStorage.loadFridgePantryResults();
      if (results && results.formData) {
        setUseFridgePantry(results.formData.wantToUseExistingIngredients || false);
      }
    } catch (error) {
      console.error('Failed to load fridge pantry toggle:', error);
    }
  };

  const handleToggleFridgePantry = async (value: boolean) => {
    try {
      setUseFridgePantry(value);

      const results = await WorkoutStorage.loadFridgePantryResults();
      if (results) {
        const updatedResults = {
          ...results,
          formData: {
            ...results.formData,
            wantToUseExistingIngredients: value,
          },
        };
        await WorkoutStorage.saveFridgePantryResults(updatedResults);
      }
    } catch (error) {
      console.error('Failed to save fridge pantry toggle:', error);
    }
  };

  const getFridgePantryDisplayText = () => {
    if (!useFridgePantry) return 'Off';
    if (!fridgePantryPreferences) return 'Set up';

    switch (fridgePantryPreferences.primaryApproach) {
      case 'maximize':
        return 'Maximize inventory';
      case 'expiry':
        return 'Expiry focused';
      case 'ai-led':
        return 'AI-led planning';
      default:
        return 'Set up';
    }
  };

  const handleToolPress = (tool: ToolCard) => {
    navigation.navigate(tool.navigationTarget as any);
  };

  const renderToolCard = (tool: ToolCard) => {
    const isCompleted = completionStatus[tool.completionKey];
    const isFridgePantry = tool.id === 'fridgePantry';

    // Fridge & Pantry has special handling: completed but can be toggled off
    const fridgePantryActive = isFridgePantry && isCompleted && useFridgePantry;
    const fridgePantryInactive = isFridgePantry && isCompleted && !useFridgePantry;

    // Determine active/cyan state for visual emphasis
    const showCyan = isFridgePantry ? fridgePantryActive : isCompleted;

    return (
      <TouchableOpacity
        key={tool.id}
        style={[
          styles.setupItem,
          {
            backgroundColor: showCyan ? hexA(themeColor, 0.05) : '#0a0a0f',
            borderColor: showCyan
              ? hexA(themeColor, 0.3)
              : 'rgba(255,255,255,0.05)',
          },
        ]}
        onPress={() => handleToolPress(tool)}
        activeOpacity={0.8}
      >
        {/* Top row: icon + title + status + chevron */}
        <View style={styles.topRow}>
          <View style={styles.iconWrapper}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: showCyan
                    ? hexA(themeColor, 0.15)
                    : 'rgba(255,255,255,0.04)',
                  borderColor: showCyan
                    ? hexA(themeColor, 0.3)
                    : 'rgba(255,255,255,0.06)',
                },
              ]}
            >
              <Ionicons
                name={tool.icon as any}
                size={22}
                color={showCyan ? themeColor : '#9898a4'}
              />
            </View>

            {/* Item count badge — fridge pantry only */}
            {isFridgePantry && fridgePantryCount > 0 && (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: showCyan ? themeColor : '#3a3a44',
                    borderColor: '#000',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    { color: showCyan ? '#000' : '#f0f0f2' },
                  ]}
                >
                  {fridgePantryCount}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.itemDetails}>
            <View style={styles.itemTitleRow}>
              <Text style={styles.itemTitle}>{tool.title}</Text>

              {/* Status pill */}
              {isFridgePantry ? (
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: showCyan
                        ? hexA(themeColor, 0.15)
                        : 'rgba(255,255,255,0.04)',
                      borderColor: showCyan
                        ? hexA(themeColor, 0.4)
                        : 'rgba(255,255,255,0.08)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: showCyan ? themeColor : '#9898a4' },
                    ]}
                  >
                    {useFridgePantry ? 'ON' : 'OFF'}
                  </Text>
                </View>
              ) : isCompleted ? (
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: hexA(themeColor, 0.15),
                      borderColor: hexA(themeColor, 0.4),
                    },
                  ]}
                >
                  <Text style={[styles.statusPillText, { color: themeColor }]}>DONE</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.itemDescription}>
              {isFridgePantry && isCompleted
                ? getFridgePantryDisplayText()
                : tool.description}
            </Text>
          </View>

          <View style={styles.itemAction}>
            <Ionicons name="chevron-forward" size={18} color="#55555f" />
          </View>
        </View>

        {/* Toggle row — fridge pantry only */}
        {isFridgePantry && (
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>Include in meal planning</Text>
            <Switch
              value={useFridgePantry}
              onValueChange={handleToggleFridgePantry}
              trackColor={{ false: 'rgba(255,255,255,0.08)', true: hexA(themeColor, 0.4) }}
              thumbColor={useFridgePantry ? themeColor : '#9898a4'}
              ios_backgroundColor="rgba(255,255,255,0.08)"
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerLabel}>TOOLS</Text>
          <View style={styles.backButtonSpacer} />
        </View>

        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Profile tools</Text>
          <Text style={styles.subtitle}>MANAGE YOUR NUTRITION PREFERENCES</Text>
        </View>

        {/* Tool list */}
        <View style={styles.content}>
          {optionalTools.map((tool) => renderToolCard(tool))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: {
    width: 38,
    height: 38,
  },
  headerLabel: {
    color: '#9898a4',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },

  // Title block
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    color: '#f0f0f2',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: 'Outfit-Bold',
    lineHeight: 30,
  },
  subtitle: {
    color: '#55555f',
    fontSize: 11,
    letterSpacing: 1.3,
    marginTop: 6,
    fontFamily: 'DMMono-Medium',
  },

  // Content
  content: {
    paddingHorizontal: 16,
  },

  // Tool item rows
  setupItem: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    position: 'relative',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'DMMono-Medium',
    letterSpacing: 0.2,
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f0f0f2',
    letterSpacing: -0.2,
    fontFamily: 'Outfit-SemiBold',
  },
  itemDescription: {
    fontSize: 12,
    color: '#9898a4',
    lineHeight: 16,
    fontFamily: 'Outfit-Regular',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 8,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },
  itemAction: {
    paddingLeft: 4,
  },

  // Toggle row for fridge pantry
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  toggleLabel: {
    fontSize: 12,
    color: '#9898a4',
    flex: 1,
    fontFamily: 'Outfit-Medium',
  },
});