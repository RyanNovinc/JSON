import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  
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

// Map meal plan category names to our internal categories
const mapMealPlanCategory = (categoryName: string): FoodCategory => {
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

// Convert meal plan grocery list format to internal format
const convertMealPlanGroceryList = (mealPlanGroceryList: any) => {
  if (!mealPlanGroceryList?.categories) return null;
  
  const items: GroceryItem[] = [];
  
  mealPlanGroceryList.categories.forEach((category: any) => {
    const mappedCategory = mapMealPlanCategory(category.category_name);
    
    category.items?.forEach((item: any) => {
      // Generate appropriate ID - use manual prefix if this was manually added
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

  // Use passed grocery list data or fall back to context
  const passedGroceryList = route.params?.groceryList;
  const contextGroceryList = getGroceryList();
  
  // Convert meal plan grocery list format to expected format
  const groceryList = localGroceryState || (passedGroceryList ? convertMealPlanGroceryList(passedGroceryList) : contextGroceryList);

  // Show loading state only if we have passed grocery list but are still loading purchase states
  const showLoadingState = passedGroceryList && isLoadingPurchaseStates && !localGroceryState;
  
  if (!groceryList && !showLoadingState) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Grocery List</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="bag-outline" size={64} color="#3f3f46" />
          <Text style={styles.emptyTitle}>No Grocery List</Text>
          <Text style={styles.emptyDescription}>
            Generate a meal plan to see your shopping list here.
          </Text>
        </View>
      </View>
    );
  }

  // Group items by category
  const groupedItems = groceryList.items.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<FoodCategory, GroceryItem[]>);

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

  // Calculate statistics
  const totalItems = groceryList.items.length;
  const purchasedItems = groceryList.items.filter(item => item.isPurchased).length;
  const totalCost = groceryList.items.reduce((sum, item) => {
    console.log('📊 Item cost:', item.name, '=', item.estimatedCost, 'type:', typeof item.estimatedCost);
    return sum + (item.estimatedCost || 0);
  }, 0);
  const remainingCost = groceryList.items
    .filter(item => !item.isPurchased)
    .reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
    
  console.log('💰 Total calculated cost:', totalCost, 'from', totalItems, 'items');
  console.log('🔍 Using items as source of truth for pricing');

  // Generate a unique key for this grocery list (use simpler key)
  const groceryListKey = passedGroceryList ? 
    `grocery_purchases_${passedGroceryList.total_estimated_cost}_${passedGroceryList.categories?.length || 0}` : 
    'grocery_purchases_context';

  // Load purchase states from storage
  useEffect(() => {
    const loadPurchaseStates = async () => {
      try {
        console.log('Loading purchase states from key:', groceryListKey);
        const stored = await AsyncStorage.getItem(groceryListKey);
        console.log('Loaded raw data:', stored);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('Parsed purchase states:', parsed);
          setPurchasedItemsState(parsed);
        } else {
          console.log('No stored purchase states found');
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
      const converted = convertMealPlanGroceryList(passedGroceryList);
      // Apply stored purchase states
      if (converted) {
        converted.items = converted.items.map((item: any) => ({
          ...item,
          isPurchased: purchasedItemsState[item.id] || false
        }));
        console.log('Applied purchase states:', purchasedItemsState);
        console.log('Items with purchase states:', converted.items.filter(i => i.isPurchased).length);
      }
      setLocalGroceryState(converted);
    }
  }, [passedGroceryList, purchasedItemsState, isLoadingPurchaseStates]);

  // Refresh data when screen comes back into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Screen focused - refreshing grocery data');
      
      // If we're using context grocery list, refresh it
      if (!passedGroceryList) {
        console.log('🔄 Refreshing context grocery list');
        // The context will automatically update via getGroceryList()
      } else {
        // If using passed grocery list, check if there's updated data in context
        const updatedContextList = getGroceryList();
        if (updatedContextList && currentMealPlan?.data?.grocery_list) {
          console.log('🔄 Checking for updates in meal plan data');
          const refreshedGroceryList = convertMealPlanGroceryList(currentMealPlan.data.grocery_list);
          if (refreshedGroceryList) {
            refreshedGroceryList.items = refreshedGroceryList.items.map((item: any) => ({
              ...item,
              isPurchased: purchasedItemsState[item.id] || false
            }));
            setLocalGroceryState(refreshedGroceryList);
            console.log('✅ Refreshed local grocery state from updated meal plan');
          }
        }
      }
    }, [passedGroceryList, currentMealPlan, purchasedItemsState, getGroceryList])
  );

  const toggleItemPurchased = async (item: GroceryItem) => {
    try {
      const newPurchasedState = !item.isPurchased;
      
      if (passedGroceryList && localGroceryState) {
        // Update local state for passed grocery list
        setLocalGroceryState((prev: any) => ({
          ...prev,
          items: prev.items.map((i: GroceryItem) => 
            i.id === item.id ? { ...i, isPurchased: newPurchasedState } : i
          )
        }));
        
        // Update purchase states record
        const newPurchasedStates = {
          ...purchasedItemsState,
          [item.id]: newPurchasedState
        };
        setPurchasedItemsState(newPurchasedStates);
        
        // Save to storage
        await AsyncStorage.setItem(groceryListKey, JSON.stringify(newPurchasedStates));
        console.log('Saved purchase states to key:', groceryListKey);
        console.log('Saved data:', newPurchasedStates);
      } else {
        // Use context method for grocery lists from meal planning
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
          `${item.isPurchased ? '✓' : '•'} ${item.amount} ${item.unit} ${item.name} ($${item.estimatedCost.toFixed(2)})`
        ).join('\n')}`;
        return categoryText;
      }).join('\n\n');

      const shareContent = `Grocery List\n\nTotal: $${totalCost.toFixed(2)} | Remaining: $${remainingCost.toFixed(2)}\nItems: ${purchasedItems}/${totalItems} purchased\n\n${listText}`;

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
      // Better cost parsing with validation
      const parsedCost = newItemCost.trim() ? parseFloat(newItemCost.trim()) : 0;
      const validCost = isNaN(parsedCost) ? 0 : Math.max(0, parsedCost);
      
      console.log('🛒 Adding manual item:', {
        name: newItemName.trim(),
        rawCostInput: newItemCost,
        parsedCost: validCost,
        category: newItemCategory
      });

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
        // Update local state for passed grocery list
        console.log('📊 Current total cost:', localGroceryState.totalCost);
        console.log('💰 Adding item cost:', newItem.estimatedCost);
        
        setLocalGroceryState((prev: any) => {
          const newTotal = (prev.totalCost || 0) + newItem.estimatedCost;
          console.log('📈 New total cost will be:', newTotal);
          return {
            ...prev,
            items: [...prev.items, newItem],
            totalCost: newTotal
          };
        });

        // Also update the passed grocery list structure to ensure it persists
        const existingCategory = passedGroceryList.categories?.find(
          cat => mapMealPlanCategory(cat.category_name) === newItemCategory
        );

        let updatedCategories;
        if (existingCategory) {
          // Add to existing category
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
                    manual_item: true // Mark as manually added
                  }
                ]
              };
            }
            return cat;
          });
        } else {
          // Create new category
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
                manual_item: true // Mark as manually added
              }]
            }
          ];
        }

        const updatedPassedList = {
          ...passedGroceryList,
          categories: updatedCategories,
          total_estimated_cost: (passedGroceryList.total_estimated_cost || 0) + newItem.estimatedCost
        };
        
        // Update the route params to persist changes
        // Note: This is a workaround to ensure the parent component gets updated data
        if (route.params) {
          route.params.groceryList = updatedPassedList;
        }
        
        // IMPORTANT: Also save to the actual meal plan context so it persists in exports
        // This ensures manual items show up when the meal plan is copied/shared
        if (currentMealPlan) {
          const currentMealPlanTotalCost = isNaN(currentMealPlan.totalCost) ? 0 : (currentMealPlan.totalCost || 0);
          const currentGroceryListTotalCost = isNaN(currentMealPlan.groceryList?.totalCost) ? 0 : (currentMealPlan.groceryList?.totalCost || 0);
          
          console.log('💰 Current meal plan total cost:', currentMealPlanTotalCost);
          console.log('💰 Current grocery list total cost:', currentGroceryListTotalCost);
          
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
          
          console.log('🔄 Also updating meal plan context for export persistence');
          console.log('📝 About to save meal plan with updated grocery list');
          console.log('📊 Updated meal plan grocery items count:', contextUpdatedGroceryList.items.length);
          console.log('💰 Updated meal plan total cost:', contextUpdatedMealPlan.totalCost);
          
          // CRITICAL: Also update the data structure that gets exported
          // We need to make sure the manual item gets added to the export format
          if (contextUpdatedMealPlan.data && contextUpdatedMealPlan.data.grocery_list) {
            console.log('📋 Updating export data structure with manual item');
            
            // Find or create the category in the export format
            let targetCategory = contextUpdatedMealPlan.data.grocery_list.categories?.find(
              (cat: any) => mapMealPlanCategory(cat.category_name) === newItem.category
            );
            
            if (targetCategory) {
              // Add to existing category
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
              // Create new category
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
            
            // Update total cost in export data
            contextUpdatedMealPlan.data.grocery_list.total_estimated_cost = 
              (contextUpdatedMealPlan.data.grocery_list.total_estimated_cost || 0) + newItem.estimatedCost;
              
            console.log('✅ Updated export data structure');
          }
          
          try {
            // Save the updated meal plan to ensure manual items persist in exports
            await saveMealPlan(contextUpdatedMealPlan);
            console.log('✅ Successfully saved updated meal plan to context AND export data');
          } catch (saveError) {
            console.error('❌ Failed to save meal plan:', saveError);
          }
        }
      } else {
        // Use context method for meal planning grocery lists
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

      // Reset form and close modal
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
      console.log('🗑️ Deleting item:', item.name, 'ID:', item.id);
      
      if (passedGroceryList && localGroceryState) {
        // Update local state for passed grocery list
        setLocalGroceryState((prev: any) => ({
          ...prev,
          items: prev.items.filter((i: GroceryItem) => i.id !== item.id),
          totalCost: Math.max(0, (prev.totalCost || 0) - item.estimatedCost)
        }));
        
        // Update passed grocery list structure
        if (passedGroceryList.categories) {
          const updatedCategories = passedGroceryList.categories.map((cat: any) => ({
            ...cat,
            items: (cat.items || []).filter((catItem: any) => {
              const itemId = catItem.manual_item 
                ? `manual_${catItem.item_name}`.replace(/[^a-zA-Z0-9]/g, '_')
                : `${cat.category_name}-${catItem.item_name}`.replace(/[^a-zA-Z0-9]/g, '_');
              return itemId !== item.id;
            })
          })).filter((cat: any) => cat.items && cat.items.length > 0); // Remove empty categories
          
          const updatedPassedList = {
            ...passedGroceryList,
            categories: updatedCategories,
            total_estimated_cost: Math.max(0, (passedGroceryList.total_estimated_cost || 0) - item.estimatedCost)
          };
          
          if (route.params) {
            route.params.groceryList = updatedPassedList;
          }
          
          // CRITICAL: Also update the export data structure
          if (currentMealPlan?.data?.grocery_list?.categories) {
            console.log('📋 Removing item from export data structure');
            
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
            console.log('✅ Successfully removed item from context AND export data');
            console.log('🔍 Updated meal plan saved with items count:', contextUpdatedMealPlan.groceryList.items.length);
            console.log('🔍 Export data categories count:', contextUpdatedMealPlan.data.grocery_list.categories.length);
          }
        }
      } else {
        // Use context method for meal planning grocery lists
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
          console.log('✅ Successfully removed item from context grocery list');
        }
      }
      
      
      console.log('🎉 Item deletion completed successfully');
    } catch (error) {
      console.error('❌ Failed to delete item:', error);
      Alert.alert('Error', 'Failed to delete item from grocery list');
    }
  };

  const handleLongPressItem = (item: GroceryItem) => {
    console.log('👆 Long press detected on item:', item.name);
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove "${item.name}" from your grocery list?`,
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Delete cancelled'),
          style: 'cancel',
        },
        {
          text: 'Remove',
          onPress: () => handleDeleteItem(item),
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const GroceryItemRow = ({ item }: { item: GroceryItem }) => (
    <TouchableOpacity
      style={[
        styles.itemRow,
        item.isPurchased && styles.purchasedItemRow,
        item.isFromInventory && styles.inventoryItemRow,
      ]}
      onPress={() => toggleItemPurchased(item)}
      onLongPress={() => handleLongPressItem(item)}
      delayLongPress={800}
      activeOpacity={0.7}
    >
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => toggleItemPurchased(item)}
      >
        <Ionicons
          name={item.isPurchased ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={item.isPurchased ? '#22c55e' : '#71717a'}
        />
      </TouchableOpacity>

      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={[
            styles.itemName,
            item.isPurchased && styles.purchasedItemName
          ]}>
            {item.name}
          </Text>
          {item.isFromInventory && (
            <View style={styles.inventoryBadge}>
              <Text style={styles.inventoryBadgeText}>Own</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.itemAmount}>
          {item.amount} {item.unit}
        </Text>
        
        {item.expirationDate && (
          <Text style={styles.expirationDate}>
            Expires: {new Date(item.expirationDate).toLocaleDateString()}
          </Text>
        )}
        
        {item.notes && (
          <Text style={styles.itemNotes}>{item.notes}</Text>
        )}
      </View>

      <View style={styles.itemPrice}>
        <Text style={[
          styles.priceText,
          item.isPurchased && styles.purchasedPriceText,
          item.isFromInventory && styles.inventoryPriceText,
        ]}>
          {item.isFromInventory ? 'Free' : `$${item.estimatedCost.toFixed(2)}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const CategorySection = ({ category }: { category: FoodCategory }) => {
    const items = groupedItems[category];
    const purchasedInCategory = items.filter(item => item.isPurchased).length;
    const categoryTotal = items.reduce((sum, item) => sum + (item.isFromInventory ? 0 : item.estimatedCost), 0);

    return (
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryTitleRow}>
            <Ionicons
              name={CATEGORY_ICONS[category]}
              size={20}
              color={themeColor}
            />
            <Text style={styles.categoryTitle}>{CATEGORY_NAMES[category]}</Text>
            <View style={styles.categoryStats}>
              <Text style={styles.categoryStatsText}>
                {purchasedInCategory}/{items.length}
              </Text>
            </View>
          </View>
          <Text style={styles.categoryTotal}>
            ${categoryTotal.toFixed(2)}
          </Text>
        </View>

        <View style={styles.categoryItems}>
          {items.map((item) => (
            <GroceryItemRow key={item.id} item={item} />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grocery List</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={shareGroceryList} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerButton}>
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {showLoadingState ? (
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading your grocery list...</Text>
        </View>
      ) : (
        /* Grocery List */
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: themeColor }]}>
                ${totalCost.toFixed(2)}
              </Text>
              <Text style={styles.summaryLabel}>Total Cost</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
                {purchasedItems}/{totalItems}
              </Text>
              <Text style={styles.summaryLabel}>Purchased</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                ${remainingCost.toFixed(2)}
              </Text>
              <Text style={styles.summaryLabel}>Remaining</Text>
            </View>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(purchasedItems / totalItems) * 100}%`,
                    backgroundColor: '#22c55e'
                  }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round((purchasedItems / totalItems) * 100)}% complete
            </Text>
          </View>
        </View>

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          {(['category', 'price'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.sortButton,
                sortBy === option && { backgroundColor: themeColor }
              ]}
              onPress={() => setSortBy(option)}
            >
              <Text style={[
                styles.sortButtonText,
                sortBy === option && { color: '#0a0a0b' }
              ]}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
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
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalScreen}>
          {/* Navigation Header */}
          <View style={styles.navHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowAddModal(false);
                setNewItemName('');
                setNewItemAmount('');
                setNewItemUnit('');
                setNewItemCost('');
                setNewItemCategory('other');
              }}
              style={styles.navBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.navTitle}>Add Grocery Item</Text>
            <TouchableOpacity 
              style={[
                styles.navSaveButton,
                { backgroundColor: themeColor },
                !newItemName.trim() && styles.navSaveDisabled
              ]}
              onPress={addManualItem}
              disabled={!newItemName.trim()}
            >
              <Text style={styles.navSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Item Name Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Item Name *</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g., Greek Yogurt, Bananas"
                placeholderTextColor="#6b7280"
                value={newItemName}
                onChangeText={setNewItemName}
                autoCapitalize="words"
                autoFocus
              />
            </View>

            {/* Amount & Unit Row */}
            <View style={styles.dualFieldRow}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Amount</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="1"
                  placeholderTextColor="#6b7280"
                  value={newItemAmount}
                  onChangeText={setNewItemAmount}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>Unit</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="kg, lb, pieces"
                  placeholderTextColor="#6b7280"
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                />
              </View>
            </View>

            {/* Cost Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Estimated Cost <Text style={styles.optionalLabel}>(optional)</Text></Text>
              <View style={styles.currencyInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.currencyInput}
                  placeholder="0.00"
                  placeholderTextColor="#6b7280"
                  value={newItemCost}
                  onChangeText={setNewItemCost}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {CATEGORY_ORDER.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryOption,
                      newItemCategory === category && [styles.categorySelected, { borderColor: themeColor }]
                    ]}
                    onPress={() => setNewItemCategory(category)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={CATEGORY_ICONS[category]}
                      size={18}
                      color={newItemCategory === category ? themeColor : '#9ca3af'}
                    />
                    <Text style={[
                      styles.categoryOptionText,
                      newItemCategory === category && { color: themeColor }
                    ]}>
                      {CATEGORY_NAMES[category]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Fixed Bottom Action Area */}
          <View style={styles.actionArea}>
            <View style={styles.actionButtonContainer}>
              <TouchableOpacity 
                style={styles.secondaryActionButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewItemName('');
                  setNewItemAmount('');
                  setNewItemUnit('');
                  setNewItemCost('');
                  setNewItemCategory('other');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.primaryActionButton,
                  { backgroundColor: themeColor },
                  !newItemName.trim() && styles.primaryActionDisabled
                ]}
                onPress={addManualItem}
                disabled={!newItemName.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.primaryActionText}>Add to List</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 44,
  },
  summaryCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#71717a',
  },
  progressBarContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#27272a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  sortLabel: {
    fontSize: 14,
    color: '#71717a',
    fontWeight: '600',
  },
  sortButton: {
    backgroundColor: '#27272a',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  categorySection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  categoryStats: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  categoryStatsText: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '600',
  },
  categoryTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  categoryItems: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  purchasedItemRow: {
    opacity: 0.6,
    borderColor: '#22c55e',
  },
  inventoryItemRow: {
    borderColor: '#a855f7',
    backgroundColor: '#18181b',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    lineHeight: 20,
  },
  purchasedItemName: {
    textDecorationLine: 'line-through',
    color: '#71717a',
  },
  inventoryBadge: {
    backgroundColor: '#a855f7',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  inventoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  itemAmount: {
    fontSize: 14,
    color: '#71717a',
    marginBottom: 2,
  },
  expirationDate: {
    fontSize: 12,
    color: '#f59e0b',
    marginBottom: 2,
  },
  itemNotes: {
    fontSize: 12,
    color: '#71717a',
    fontStyle: 'italic',
  },
  itemPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  purchasedPriceText: {
    color: '#71717a',
  },
  inventoryPriceText: {
    color: '#a855f7',
  },
  bottomPadding: {
    height: 40,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalScreen: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  
  // Navigation Header (iOS/Android Standard)
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    backgroundColor: '#0a0a0b',
  },
  navBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  navSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSaveDisabled: {
    opacity: 0.4,
  },
  navSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  // Content Area
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  
  // Form Fields
  fieldContainer: {
    marginBottom: 24,
  },
  dualFieldRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  halfField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  optionalLabel: {
    fontWeight: '400',
    color: '#9ca3af',
  },
  inputField: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#f9fafb',
    minHeight: 48,
  },
  
  // Currency Input
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingLeft: 16,
    minHeight: 48,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginRight: 8,
  },
  currencyInput: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 16,
    fontSize: 16,
    color: '#f9fafb',
  },
  
  // Category Selection
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: '45%',
    gap: 8,
  },
  categorySelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 2,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#d1d5db',
    flex: 1,
  },
  
  // Bottom Action Area (Modern Mobile Pattern)
  actionArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0b',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    paddingTop: 16,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  primaryActionButton: {
    flex: 2,
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  primaryActionDisabled: {
    opacity: 0.5,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});