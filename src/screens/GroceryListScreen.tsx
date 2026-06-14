import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import { GroceryItem, FoodCategory } from '../types/nutrition';

type NavigationProp = StackNavigationProp<RootStackParamList, 'GroceryList'>;
type GroceryListRouteProp = RouteProp<RootStackParamList, 'GroceryList'>;

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });
const CANVAS = '#0a0a0b';
const MUTED = '#7a7a80';
const FAINT = '#6a6a70';

const CATEGORY_ORDER: FoodCategory[] = [
  'protein',
  'dairy',
  'vegetables',
  'fruits',
  'grains',
  'pantry',
  'spices',
  'frozen',
  'other',
];

const CATEGORY_ICONS: Record<FoodCategory, keyof typeof Ionicons.glyphMap> = {
  protein: 'fish',
  dairy: 'cafe',
  vegetables: 'leaf',
  fruits: 'nutrition',
  grains: 'library',
  pantry: 'archive',
  spices: 'flask',
  frozen: 'snow',
  other: 'bag',
};

const CATEGORY_COLORS: Record<FoodCategory, string> = {
  protein: '#ef4444',
  dairy: '#3b82f6',
  vegetables: '#22c55e',
  fruits: '#f59e0b',
  grains: '#a855f7',
  pantry: '#8b5cf6',
  spices: '#f97316',
  frozen: '#06b6d4',
  other: '#6b7280',
};

const CATEGORY_NAMES: Record<FoodCategory, string> = {
  protein: 'Protein',
  dairy: 'Dairy',
  vegetables: 'Vegetables',
  fruits: 'Fruits',
  grains: 'Grains & Cereals',
  pantry: 'Pantry Items',
  spices: 'Spices & Herbs',
  frozen: 'Frozen',
  other: 'Other',
};

const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  protein: '🥩',
  dairy: '🥛',
  vegetables: '🥦',
  fruits: '🍎',
  grains: '🌾',
  pantry: '🫙',
  spices: '🧂',
  frozen: '❄️',
  other: '🛒',
};

const CATEGORY_SHORT: Record<FoodCategory, string> = {
  protein: 'Protein',
  dairy: 'Dairy',
  vegetables: 'Veg',
  fruits: 'Fruit',
  grains: 'Grains',
  pantry: 'Pantry',
  spices: 'Spices',
  frozen: 'Frozen',
  other: 'Other',
};

// Map meal plan category names to our internal categories
const mapMealPlanCategory = (categoryName: string): FoodCategory => {
  if (!categoryName) return 'other';
  const name = categoryName.toLowerCase();
  if (name.includes('protein') || name.includes('meat') || name.includes('seafood')) return 'protein';
  if (name.includes('dairy') || name.includes('eggs')) return 'dairy';
  if (name.includes('vegetable') || name.includes('produce')) return 'vegetables';
  if (name.includes('fruit')) return 'fruits';
  if (name.includes('grain') || name.includes('pasta') || name.includes('rice') || name.includes('cereal')) return 'grains';
  if (name.includes('spice') || name.includes('herb') || name.includes('seasoning')) return 'spices';
  if (name.includes('frozen')) return 'frozen';
  if (name.includes('pantry') || name.includes('condiment') || name.includes('sauce')) return 'pantry';
  return 'other';
};

// Convert new SimplifiedMealPlan grocery list format to internal format
const convertSimplifiedGroceryList = (simplifiedGroceryList: any) => {
  if (!simplifiedGroceryList?.categories) return null;

  const items: GroceryItem[] = [];

  simplifiedGroceryList.categories.forEach((category: any) => {
    const mappedCategory = mapMealPlanCategory(category.name || 'other');

    category.items?.forEach((item: any) => {
      const itemId = item.id || `${category.name || 'other'}_${item.name}`.replace(/[^a-zA-Z0-9]/g, '_');

      items.push({
        id: itemId,
        name: item.name || 'Unknown Item',
        amount: typeof item.amount === 'string' ? parseFloat(item.amount) || 1 : item.amount || 1,
        unit: item.unit || '',
        category: mappedCategory,
        estimatedCost: item.estimated_price || 0,
        isPurchased: item.is_purchased || false,
        isFromInventory: false,
        notes: item.notes || '',
      });
    });
  });

  return {
    items,
    totalEstimatedCost: simplifiedGroceryList.total_estimated_cost || items.reduce((sum, item) => sum + item.estimatedCost, 0),
    currency: simplifiedGroceryList.currency || 'USD',
  };
};

// Convert meal plan grocery list format to internal format
const convertMealPlanGroceryList = (mealPlanGroceryList: any) => {
  if (!mealPlanGroceryList?.categories) return null;

  const items: GroceryItem[] = [];

  mealPlanGroceryList.categories.forEach((category: any) => {
    const mappedCategory = mapMealPlanCategory(category.category_name);

    category.items?.forEach((item: any) => {
      const itemId = item.manual_item
        ? `manual_${item.item_name}`.replace(/[^a-zA-Z0-9]/g, '_')
        : `${category.category_name}-${item.item_name}`.replace(/[^a-zA-Z0-9]/g, '_');

      items.push({
        id: itemId,
        name: item.item_name,
        amount: typeof item.quantity === 'string' ? parseFloat(item.quantity) || 1 : item.quantity || 1,
        unit: item.unit || '',
        category: mappedCategory,
        estimatedCost: item.estimated_price || 0,
        isPurchased: item.is_purchased || false,
        isFromInventory: false,
        notes: item.notes || '',
      });
    });
  });

  return {
    items,
    totalEstimatedCost: mealPlanGroceryList.total_estimated_cost || 0,
    currency: mealPlanGroceryList.currency || 'USD',
  };
};

export default function GroceryListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<GroceryListRouteProp>();
  const { themeColor, themeColorLight } = useTheme();
  const { getGroceryList, updateGroceryItem, addGroceryItem, currentMealPlan, saveMealPlan } = useMealPlanning();

  console.log('🛒 GroceryListScreen route params:', route.params);
  const { groceryList: routeGroceryList } = route.params || {};
  console.log('🛒 Received routeGroceryList:', routeGroceryList);
  console.log('🛒 First category:', routeGroceryList?.categories?.[0]);
  console.log('🛒 First item structure:', routeGroceryList?.categories?.[0]?.items?.[0]);

  // State declarations first
  const [localGroceryState, setLocalGroceryState] = useState<any>(null);
  const [purchasedItemsState, setPurchasedItemsState] = useState<Record<string, boolean>>({});
  const [isLoadingPurchaseStates, setIsLoadingPurchaseStates] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<FoodCategory>('other');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<FoodCategory[]>(CATEGORY_ORDER);
  const [sortBy, setSortBy] = useState<'category' | 'price'>('category');
  const [filterMode, setFilterMode] = useState<'all' | 'remaining' | 'completed'>('all');

  // Use passed grocery list data or fall back to context
  const passedGroceryList = route.params?.groceryList;
  const contextGroceryList = getGroceryList();

  const isNewSimplifiedFormat = passedGroceryList?.categories?.[0]?.items?.[0]?.name !== undefined &&
                               passedGroceryList?.categories?.[0]?.name !== undefined;

  console.log('🔍 Grocery list format check:', {
    hasPassedGroceryList: !!passedGroceryList,
    isNewSimplifiedFormat,
    firstCategory: passedGroceryList?.categories?.[0],
    firstItemSample: passedGroceryList?.categories?.[0]?.items?.[0]
  });

  const groceryList = localGroceryState || (passedGroceryList ?
    (isNewSimplifiedFormat ? convertSimplifiedGroceryList(passedGroceryList) : convertMealPlanGroceryList(passedGroceryList))
    : contextGroceryList);

  const showLoadingState = passedGroceryList && isLoadingPurchaseStates && !localGroceryState;

  if (!groceryList && !showLoadingState) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>Shopping list</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="bag-outline" size={56} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No grocery list</Text>
          <Text style={styles.emptyDescription}>Generate a meal plan to see your shopping list here.</Text>
        </View>
      </View>
    );
  }

  // Group items by category
  let groupedItems: Record<string, any[]>;

  if (groceryList.categories) {
    groupedItems = {};
    groceryList.categories.forEach((category: any) => {
      groupedItems[category.name] = category.items;
    });
  } else if (groceryList.items) {
    groupedItems = groceryList.items.reduce((groups: Record<string, any[]>, item: any) => {
      const category = item.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {} as Record<FoodCategory, GroceryItem[]>);
  } else {
    groupedItems = {};
  }

  // Sort items within categories
  Object.keys(groupedItems).forEach(category => {
    groupedItems[category as FoodCategory].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return b.estimatedCost - a.estimatedCost;
        default:
          return 0;
      }
    });
  });

  // Filter categories based on selection
  const filteredCategories = CATEGORY_ORDER.filter(category =>
    selectedCategories.includes(category) && groupedItems[category]?.length > 0
  );

  // Calculate statistics - handle both formats
  let allItems: any[] = [];

  if (groceryList.categories) {
    allItems = groceryList.categories.flatMap((category: any) => category.items || []);
  } else if (groceryList.items) {
    allItems = groceryList.items;
  }

  const totalItems = allItems.length;
  const purchasedItems = allItems.filter(item => item.isPurchased).length;
  const totalCost = allItems.reduce((sum, item) => {
    const cost = item.estimatedCost || item.estimated_price || 0;
    return sum + cost;
  }, 0);
  const remainingCost = allItems
    .filter(item => !item.isPurchased)
    .reduce((sum, item) => sum + (item.estimatedCost || item.estimated_price || 0), 0);

  // Get the AI's estimated cost range from the grocery list metadata
  const groceryListData = passedGroceryList || currentMealPlan?.data?.grocery_list;
  const estimatedLow = groceryListData?.total_estimated_cost_low;
  const estimatedHigh = groceryListData?.total_estimated_cost_high;
  const legacyEstimate = groceryListData?.total_estimated_cost;

  const currencySymbol = groceryListData?.currency || '$';
  const hasRange = estimatedLow != null && estimatedHigh != null;

  // Whole-dollar money formatter, with a space after multi-letter codes (AUD 191).
  const money = (n: number) => `${currencySymbol}${currencySymbol.length > 1 ? ' ' : ''}${Math.round(n || 0)}`;

  const estimateDisplay = hasRange
    ? `${money(estimatedLow)}–${Math.round(estimatedHigh)}`
    : legacyEstimate != null
      ? money(legacyEstimate)
      : null;

  const pct = totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0;

  // Generate a unique key for this grocery list
  const groceryListKey = passedGroceryList ?
    `grocery_purchases_${passedGroceryList.total_estimated_cost}_${passedGroceryList.categories?.length || 0}` :
    'grocery_purchases_context';

  // Load purchase states from storage
  useEffect(() => {
    const loadPurchaseStates = async () => {
      try {
        const stored = await AsyncStorage.getItem(groceryListKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPurchasedItemsState(parsed);
        } else {
          setPurchasedItemsState({});
        }
      } catch (error) {
        console.error('Failed to load purchase states:', error);
      } finally {
        setIsLoadingPurchaseStates(false);
      }
    };

    if (groceryListKey) {
      loadPurchaseStates();
    }
  }, [groceryListKey]);

  // Initialize local state if using passed grocery list
  useEffect(() => {
    if (passedGroceryList && !isLoadingPurchaseStates) {
      const converted = isNewSimplifiedFormat ?
        convertSimplifiedGroceryList(passedGroceryList) :
        convertMealPlanGroceryList(passedGroceryList);
      if (converted) {
        converted.items = converted.items.map((item: any) => ({
          ...item,
          isPurchased: purchasedItemsState[item.id] || false
        }));
      }
      setLocalGroceryState(converted);
    }
  }, [passedGroceryList, purchasedItemsState, isLoadingPurchaseStates, isNewSimplifiedFormat]);

  // Refresh data when screen comes back into focus
  useFocusEffect(
    React.useCallback(() => {
      if (!passedGroceryList) {
        // The context will automatically update via getGroceryList()
      } else {
        const updatedContextList = getGroceryList();
        if (updatedContextList && currentMealPlan?.data?.grocery_list) {
          const refreshedGroceryList = convertMealPlanGroceryList(currentMealPlan.data.grocery_list);
          if (refreshedGroceryList) {
            refreshedGroceryList.items = refreshedGroceryList.items.map((item: any) => ({
              ...item,
              isPurchased: purchasedItemsState[item.id] || false
            }));
            setLocalGroceryState(refreshedGroceryList);
          }
        }
      }
    }, [passedGroceryList, currentMealPlan, purchasedItemsState, getGroceryList])
  );

  const toggleItemPurchased = async (item: GroceryItem) => {
    try {
      const newPurchasedState = !item.isPurchased;

      if (passedGroceryList && localGroceryState) {
        setLocalGroceryState((prev: any) => ({
          ...prev,
          items: prev.items.map((i: GroceryItem) =>
            i.id === item.id ? { ...i, isPurchased: newPurchasedState } : i
          )
        }));

        const newPurchasedStates = {
          ...purchasedItemsState,
          [item.id]: newPurchasedState
        };
        setPurchasedItemsState(newPurchasedStates);

        await AsyncStorage.setItem(groceryListKey, JSON.stringify(newPurchasedStates));
      } else {
        await updateGroceryItem(item.id, newPurchasedState);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
      console.error('Toggle item error:', error);
    }
  };

  const shareGroceryList = async () => {
    try {
      const listText = filteredCategories.map(category => {
        const items = groupedItems[category];
        const categoryText = `${CATEGORY_NAMES[category]}:\n${items.map(item =>
          `${item.isPurchased ? '✓' : '•'} ${item.amount} ${item.unit} ${item.name} (${currencySymbol}${item.estimatedCost.toFixed(2)})`
        ).join('\n')}`;
        return categoryText;
      }).join('\n\n');

      const shareContent = `Grocery List\n\nTotal: ${currencySymbol}${totalCost.toFixed(2)} | Remaining: ${currencySymbol}${remainingCost.toFixed(2)}\nItems: ${purchasedItems}/${totalItems} purchased\n\n${listText}`;

      await Share.share({
        message: shareContent,
        title: 'Grocery List',
      });
    } catch (error) {
      console.error('Error sharing grocery list:', error);
    }
  };

  const addManualItem = async () => {
    if (!newItemName.trim()) return;

    try {
      const parsedCost = newItemCost.trim() ? parseFloat(newItemCost.trim()) : 0;
      const validCost = isNaN(parsedCost) ? 0 : Math.max(0, parsedCost);

      const newItem: GroceryItem = {
        id: `manual_${Date.now()}_${newItemName.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: newItemName.trim(),
        category: newItemCategory,
        amount: parseFloat(newItemAmount) || 1,
        unit: newItemUnit.trim() || 'piece',
        estimatedCost: validCost,
        isPurchased: false,
        isFromInventory: false,
        notes: 'Manually added'
      };

      if (passedGroceryList && localGroceryState) {
        setLocalGroceryState((prev: any) => {
          const newTotal = (prev.totalCost || 0) + newItem.estimatedCost;
          return {
            ...prev,
            items: [...prev.items, newItem],
            totalCost: newTotal
          };
        });

        const existingCategory = passedGroceryList.categories?.find(
          cat => mapMealPlanCategory(cat.category_name) === newItemCategory
        );

        let updatedCategories;
        if (existingCategory) {
          updatedCategories = passedGroceryList.categories.map(cat => {
            if (mapMealPlanCategory(cat.category_name) === newItemCategory) {
              return {
                ...cat,
                items: [
                  ...(cat.items || []),
                  {
                    item_name: newItem.name,
                    quantity: `${newItem.amount} ${newItem.unit}`,
                    unit: newItem.unit,
                    estimated_price: newItem.estimatedCost,
                    is_purchased: false,
                    notes: newItem.notes,
                    manual_item: true
                  }
                ]
              };
            }
            return cat;
          });
        } else {
          updatedCategories = [
            ...(passedGroceryList.categories || []),
            {
              category_name: CATEGORY_NAMES[newItemCategory],
              items: [{
                item_name: newItem.name,
                quantity: `${newItem.amount} ${newItem.unit}`,
                unit: newItem.unit,
                estimated_price: newItem.estimatedCost,
                is_purchased: false,
                notes: newItem.notes,
                manual_item: true
              }]
            }
          ];
        }

        const updatedPassedList = {
          ...passedGroceryList,
          categories: updatedCategories,
          total_estimated_cost: (passedGroceryList.total_estimated_cost || 0) + newItem.estimatedCost
        };

        if (route.params) {
          route.params.groceryList = updatedPassedList;
        }

        if (currentMealPlan) {
          const currentMealPlanTotalCost = isNaN(currentMealPlan.totalCost) ? 0 : (currentMealPlan.totalCost || 0);
          const currentGroceryListTotalCost = isNaN(currentMealPlan.groceryList?.totalCost) ? 0 : (currentMealPlan.groceryList?.totalCost || 0);

          const contextUpdatedGroceryList = {
            ...currentMealPlan.groceryList,
            items: [...(currentMealPlan.groceryList?.items || []), newItem],
            totalCost: currentGroceryListTotalCost + newItem.estimatedCost,
          };

          const contextUpdatedMealPlan = {
            ...currentMealPlan,
            groceryList: contextUpdatedGroceryList,
            totalCost: currentMealPlanTotalCost + newItem.estimatedCost,
          };

          if (contextUpdatedMealPlan.data && contextUpdatedMealPlan.data.grocery_list) {
            let targetCategory = contextUpdatedMealPlan.data.grocery_list.categories?.find(
              (cat: any) => mapMealPlanCategory(cat.category_name) === newItem.category
            );

            if (targetCategory) {
              targetCategory.items = targetCategory.items || [];
              targetCategory.items.push({
                item_name: newItem.name,
                quantity: `${newItem.amount} ${newItem.unit}`,
                unit: newItem.unit,
                estimated_price: newItem.estimatedCost,
                is_purchased: false,
                notes: newItem.notes,
                manual_item: true
              });
            } else {
              contextUpdatedMealPlan.data.grocery_list.categories = contextUpdatedMealPlan.data.grocery_list.categories || [];
              contextUpdatedMealPlan.data.grocery_list.categories.push({
                category_name: CATEGORY_NAMES[newItem.category],
                items: [{
                  item_name: newItem.name,
                  quantity: `${newItem.amount} ${newItem.unit}`,
                  unit: newItem.unit,
                  estimated_price: newItem.estimatedCost,
                  is_purchased: false,
                  notes: newItem.notes,
                  manual_item: true
                }]
              });
            }

            contextUpdatedMealPlan.data.grocery_list.total_estimated_cost =
              (contextUpdatedMealPlan.data.grocery_list.total_estimated_cost || 0) + newItem.estimatedCost;
          }

          try {
            await saveMealPlan(contextUpdatedMealPlan);
          } catch (saveError) {
            console.error('❌ Failed to save meal plan:', saveError);
          }
        }
      } else {
        await addGroceryItem({
          name: newItem.name,
          category: newItem.category,
          amount: newItem.amount,
          unit: newItem.unit,
          estimatedCost: newItem.estimatedCost,
          isPurchased: newItem.isPurchased,
          isFromInventory: newItem.isFromInventory,
          notes: newItem.notes
        });
      }

      setNewItemName('');
      setNewItemAmount('');
      setNewItemUnit('');
      setNewItemCost('');
      setNewItemCategory('other');
      setShowAddModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to grocery list');
      console.error('Add manual item error:', error);
    }
  };

  const handleDeleteItem = async (item: GroceryItem) => {
    try {
      if (passedGroceryList && localGroceryState) {
        setLocalGroceryState((prev: any) => ({
          ...prev,
          items: prev.items.filter((i: GroceryItem) => i.id !== item.id),
          totalCost: Math.max(0, (prev.totalCost || 0) - item.estimatedCost)
        }));

        if (passedGroceryList.categories) {
          const updatedCategories = passedGroceryList.categories.map((cat: any) => ({
            ...cat,
            items: (cat.items || []).filter((catItem: any) => {
              const itemId = catItem.manual_item
                ? `manual_${catItem.item_name}`.replace(/[^a-zA-Z0-9]/g, '_')
                : `${cat.category_name}-${catItem.item_name}`.replace(/[^a-zA-Z0-9]/g, '_');
              return itemId !== item.id;
            })
          })).filter((cat: any) => cat.items && cat.items.length > 0);

          const updatedPassedList = {
            ...passedGroceryList,
            categories: updatedCategories,
            total_estimated_cost: Math.max(0, (passedGroceryList.total_estimated_cost || 0) - item.estimatedCost)
          };

          if (route.params) {
            route.params.groceryList = updatedPassedList;
          }

          if (currentMealPlan?.data?.grocery_list?.categories) {
            const exportUpdatedCategories = currentMealPlan.data.grocery_list.categories.map((cat: any) => ({
              ...cat,
              items: (cat.items || []).filter((catItem: any) => {
                const itemId = catItem.manual_item
                  ? `manual_${catItem.item_name}`.replace(/[^a-zA-Z0-9]/g, '_')
                  : `${cat.category_name}-${catItem.item_name}`.replace(/[^a-zA-Z0-9]/g, '_');
                return itemId !== item.id;
              })
            })).filter((cat: any) => cat.items && cat.items.length > 0);

            const contextUpdatedMealPlan = {
              ...currentMealPlan,
              groceryList: {
                ...currentMealPlan.groceryList,
                items: currentMealPlan.groceryList?.items?.filter(i => i.id !== item.id) || [],
                totalCost: Math.max(0, (currentMealPlan.groceryList?.totalCost || 0) - item.estimatedCost)
              },
              data: {
                ...currentMealPlan.data,
                grocery_list: {
                  ...currentMealPlan.data.grocery_list,
                  categories: exportUpdatedCategories,
                  total_estimated_cost: Math.max(0, (currentMealPlan.data.grocery_list.total_estimated_cost || 0) - item.estimatedCost)
                }
              },
              totalCost: Math.max(0, (currentMealPlan.totalCost || 0) - item.estimatedCost)
            };

            await saveMealPlan(contextUpdatedMealPlan);
          }
        }
      } else {
        if (currentMealPlan?.groceryList?.items) {
          const updatedGroceryList = {
            ...currentMealPlan.groceryList,
            items: currentMealPlan.groceryList.items.filter(i => i.id !== item.id),
            totalCost: Math.max(0, (currentMealPlan.groceryList.totalCost || 0) - item.estimatedCost)
          };

          const updatedMealPlan = {
            ...currentMealPlan,
            groceryList: updatedGroceryList,
            totalCost: Math.max(0, (currentMealPlan.totalCost || 0) - item.estimatedCost)
          };

          await saveMealPlan(updatedMealPlan);
        }
      }
    } catch (error) {
      console.error('❌ Failed to delete item:', error);
      Alert.alert('Error', 'Failed to delete item from grocery list');
    }
  };

  const handleLongPressItem = (item: GroceryItem) => {
    Alert.alert(
      'Remove item',
      `Remove "${item.name}" from your grocery list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', onPress: () => handleDeleteItem(item), style: 'destructive' },
      ],
      { cancelable: true }
    );
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewItemName('');
    setNewItemAmount('');
    setNewItemUnit('');
    setNewItemCost('');
    setNewItemCategory('other');
  };

  // ---- Receipt line item --------------------------------------------------
  const GroceryItemRow = ({ item }: { item: GroceryItem }) => (
    <TouchableOpacity
      style={styles.lineItem}
      onPress={() => toggleItemPurchased(item)}
      onLongPress={() => handleLongPressItem(item)}
      delayLongPress={600}
      activeOpacity={0.7}
    >
      <View style={[styles.checkCircle, item.isPurchased && { backgroundColor: themeColor, borderColor: themeColor }]}>
        {item.isPurchased && <Text style={styles.checkMark}>✓</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.lineName, item.isPurchased && styles.lineNameDone]}>{item.name}</Text>
        <Text style={styles.lineAmt}>
          {item.amount} {item.unit}
          {item.isFromInventory ? '  ·  own' : ''}
        </Text>
      </View>
      <Text style={[styles.linePrice, item.isPurchased && styles.linePriceDone]}>
        {item.isFromInventory ? 'Free' : money(item.estimatedCost || (item as any).estimated_price || 0)}
      </Text>
    </TouchableOpacity>
  );

  // ---- Receipt section ----------------------------------------------------
  const CategorySection = ({ category }: { category: FoodCategory }) => {
    const items = groupedItems[category];

    const filteredItems = items.filter(item => {
      if (filterMode === 'remaining') return !item.isPurchased;
      if (filterMode === 'completed') return item.isPurchased;
      return true;
    });

    if (filteredItems.length === 0) return null;

    const categoryTotal = filteredItems.reduce((sum, item) => sum + (item.estimatedCost || item.estimated_price || 0), 0);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{CATEGORY_NAMES[category]}</Text>
          <Text style={styles.sectionTotal}>{money(categoryTotal)}</Text>
        </View>
        {filteredItems.map((item, index) => (
          <GroceryItemRow key={`${item.id || 'no_id'}_${index}`} item={item} />
        ))}
      </View>
    );
  };

  const filterModes: { mode: 'all' | 'remaining' | 'completed'; label: string; count: number }[] = [
    { mode: 'all', label: 'All', count: totalItems },
    { mode: 'remaining', label: 'Remaining', count: totalItems - purchasedItems },
    { mode: 'completed', label: 'Done', count: purchasedItems },
  ];

  // Fixed pixel width for category tiles: (screen - modal padding 20*2 - gap 12) / 2.
  // Percentage/flex widths collapse in this layout, so we size in px for a reliable 2-col grid.
  const TILE_W = (Dimensions.get('window').width - 40 - 12) / 2;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color="#ffffff" />
        </TouchableOpacity>
        <Text style={[styles.topCount, { color: themeColor }]}>{totalItems} items</Text>
      </View>
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Shopping list</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="add" size={26} color={themeColor} />
        </TouchableOpacity>
      </View>

      {showLoadingState ? (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading your grocery list...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollPad} showsVerticalScrollIndicator={false}>
          {/* Total card */}
          <View style={styles.totalCard}>
            <View style={styles.totalTopRow}>
              <Text style={styles.miniLabel}>Estimated total</Text>
              <Text
                style={styles.totalFigure}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {estimateDisplay || money(totalCost)}
              </Text>
            </View>
            <View style={styles.trackBar}>
              <View style={[styles.fillBar, { width: `${pct}%`, backgroundColor: themeColor }]} />
            </View>
            <View style={styles.totalBotRow}>
              <Text style={styles.miniMuted}>{purchasedItems} of {totalItems} checked</Text>
              <Text style={styles.miniMuted}>{money(remainingCost)} left</Text>
            </View>
          </View>

          {/* Filter pills */}
          <View style={styles.filterRow}>
            {filterModes.map(({ mode, label, count }) => {
              const active = filterMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setFilterMode(mode)}
                  activeOpacity={0.8}
                  style={[styles.filterPill, active ? { backgroundColor: themeColor, borderColor: themeColor } : null]}
                >
                  <Text style={[styles.filterPillText, active && { color: '#06262b', fontWeight: '600' }]}>{label} {count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredCategories.map((category) => (
            <CategorySection key={category} category={category} />
          ))}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeAddModal}
      >
        <View style={styles.modalScreen}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeAddModal} style={styles.modalBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="chevron-back" size={26} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add an item</Text>
            <View style={{ width: 26 }} />
          </View>

          <ScrollView
            style={styles.modalScrollContent}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLbl}>Item name</Text>
            <TextInput
              style={styles.field}
              placeholder="e.g. Greek yoghurt, bananas"
              placeholderTextColor="#5a5a60"
              value={newItemName}
              onChangeText={setNewItemName}
              autoCapitalize="words"
              autoFocus
            />

            <View style={styles.dualFieldRow}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLbl}>Amount</Text>
                <TextInput
                  style={styles.field}
                  placeholder="1"
                  placeholderTextColor="#5a5a60"
                  value={newItemAmount}
                  onChangeText={setNewItemAmount}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLbl}>Unit</Text>
                <TextInput
                  style={styles.field}
                  placeholder="kg, tub, pack…"
                  placeholderTextColor="#5a5a60"
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                />
              </View>
            </View>

            <Text style={styles.fieldLbl}>Estimated cost <Text style={styles.optionalLabel}>(optional)</Text></Text>
            <View style={styles.currencyField}>
              <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
              <TextInput
                style={styles.currencyInput}
                placeholder="0"
                placeholderTextColor="#5a5a60"
                value={newItemCost}
                onChangeText={setNewItemCost}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={styles.fieldLbl}>Category</Text>
            <View style={styles.tileWrap}>
              {CATEGORY_ORDER.map((category) => {
                const on = newItemCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setNewItemCategory(category)}
                    activeOpacity={0.8}
                    style={[styles.tile, { width: TILE_W }, on && { borderColor: themeColor, backgroundColor: `${themeColor}14` }]}
                  >
                    <Text style={styles.tileEmoji}>{CATEGORY_EMOJI[category]}</Text>
                    <Text numberOfLines={1} style={[styles.tileText, on && { color: themeColor, fontWeight: '600' }]}>
                      {CATEGORY_SHORT[category]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.modalAction}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: themeColor }, !newItemName.trim() && styles.primaryBtnDisabled]}
              onPress={addManualItem}
              disabled={!newItemName.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Add to list</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={closeAddModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CANVAS },

  // Header (receipt style)
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 2 },
  backBtn: { padding: 6 },
  topCount: { fontSize: 11, letterSpacing: 2, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 14 },
  screenTitle: { fontFamily: SERIF, fontSize: 28, fontWeight: '400', color: '#ffffff', letterSpacing: -0.4 },

  content: { flex: 1 },
  scrollPad: { paddingBottom: 40 },

  // Total card
  totalCard: { marginHorizontal: 18, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15 },
  totalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  miniLabel: { fontSize: 10, letterSpacing: 2, color: FAINT, fontWeight: '600', textTransform: 'uppercase', flexShrink: 0 },
  totalFigure: { fontFamily: SERIF, fontSize: 24, color: '#ffffff', flexShrink: 1, textAlign: 'right' },
  trackBar: { height: 5, backgroundColor: '#1c1c22', borderRadius: 3, marginTop: 12, overflow: 'hidden' },
  fillBar: { height: '100%', borderRadius: 3 },
  totalBotRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  miniMuted: { fontSize: 11, color: MUTED },

  // Filter pills
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 10 },
  filterPill: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#2a2a30', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 13 },
  filterPillText: { fontSize: 12, color: '#9a9aa0', fontWeight: '500' },

  // Receipt sections + line items
  section: { paddingHorizontal: 20, marginTop: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1a1a1e', paddingBottom: 8, marginBottom: 2 },
  sectionLabel: { fontSize: 10, letterSpacing: 2, color: FAINT, fontWeight: '600', textTransform: 'uppercase' },
  sectionTotal: { fontFamily: SERIF, fontSize: 13, color: '#9a9aa0' },
  lineItem: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#161619' },
  checkCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#3a3a42', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#06262b', fontSize: 12, fontWeight: '700' },
  lineName: { fontFamily: SERIF, fontSize: 16, color: '#e8e8ea' },
  lineNameDone: { textDecorationLine: 'line-through', color: '#6a6a70' },
  lineAmt: { fontSize: 10, letterSpacing: 0.8, color: MUTED, textTransform: 'uppercase', marginTop: 3 },
  linePrice: { fontFamily: SERIF, fontSize: 15, color: '#ffffff' },
  linePriceDone: { color: '#6a6a70' },

  bottomPadding: { height: 24 },

  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  loadingText: { fontSize: 16, color: MUTED, textAlign: 'center' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontFamily: SERIF, fontSize: 22, fontWeight: '400', color: '#ffffff', textAlign: 'center', marginTop: 20, marginBottom: 8 },
  emptyDescription: { fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22 },

  // ---- Add Item Modal (receipt style) ----
  modalScreen: { flex: 1, backgroundColor: CANVAS },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#18181c',
  },
  modalBack: { padding: 4 },
  modalTitle: { fontFamily: SERIF, fontSize: 19, color: '#ffffff' },
  modalScrollContent: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  fieldLbl: { fontSize: 10, letterSpacing: 2, color: FAINT, fontWeight: '600', textTransform: 'uppercase', marginBottom: 7 },
  optionalLabel: { letterSpacing: 0, textTransform: 'none', color: '#4a4a50' },
  field: { backgroundColor: '#0e0e12', borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#f4f4f6', marginBottom: 18, minHeight: 48 },
  dualFieldRow: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  currencyField: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0e0e12', borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 12, paddingLeft: 14, marginBottom: 18, minHeight: 48 },
  currencyPrefix: { fontSize: 15, color: '#9a9aa0', marginRight: 8 },
  currencyInput: { flex: 1, paddingVertical: 13, paddingRight: 14, fontSize: 15, color: '#f4f4f6' },
  tileWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#26262c', borderRadius: 16, paddingVertical: 15 },
  tileEmoji: { fontSize: 28, marginBottom: 6 },
  tileText: { fontSize: 14, color: '#cfcfd4' },
  modalAction: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#18181c' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#06262b' },
  cancelText: { fontSize: 14, color: MUTED, textAlign: 'center', marginTop: 14 },
});