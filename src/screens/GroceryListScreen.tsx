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
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';
import { GroceryItem, FoodCategory } from '../types/nutrition';

type NavigationProp = StackNavigationProp<RootStackParamList>;

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

export default function GroceryListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();
  const { getGroceryList, updateGroceryItem } = useMealPlanning();

  const groceryList = getGroceryList();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<FoodCategory>('other');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<FoodCategory[]>(CATEGORY_ORDER);

  const [sortBy, setSortBy] = useState<'category' | 'alphabetical' | 'price'>('category');

  if (!groceryList) {
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
        case 'alphabetical':
          return a.name.localeCompare(b.name);
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
  const totalCost = groceryList.items.reduce((sum, item) => sum + item.estimatedCost, 0);
  const remainingCost = groceryList.items
    .filter(item => !item.isPurchased)
    .reduce((sum, item) => sum + item.estimatedCost, 0);

  const toggleItemPurchased = async (item: GroceryItem) => {
    try {
      await updateGroceryItem(item.id, !item.isPurchased);
    } catch (error) {
      Alert.alert('Error', 'Failed to update item');
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

  const toggleCategoryFilter = (category: FoodCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
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
          <TouchableOpacity onPress={() => setShowCategoryFilter(true)} style={styles.headerButton}>
            <Ionicons name="filter-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

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
        {(['category', 'alphabetical', 'price'] as const).map((option) => (
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
              {option === 'alphabetical' ? 'A-Z' : option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grocery List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredCategories.map((category) => (
          <CategorySection key={category} category={category} />
        ))}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Category Filter Modal */}
      <Modal
        visible={showCategoryFilter}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCategoryFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Categories</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryFilter(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterContent}>
              {CATEGORY_ORDER.filter(cat => groupedItems[cat]?.length > 0).map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.filterOption}
                  onPress={() => toggleCategoryFilter(category)}
                  activeOpacity={0.7}
                >
                  <View style={styles.filterOptionLeft}>
                    <Ionicons
                      name={CATEGORY_ICONS[category]}
                      size={20}
                      color={selectedCategories.includes(category) ? themeColor : '#71717a'}
                    />
                    <Text style={[
                      styles.filterOptionText,
                      selectedCategories.includes(category) && { color: themeColor }
                    ]}>
                      {CATEGORY_NAMES[category]}
                    </Text>
                  </View>
                  <View style={styles.filterOptionRight}>
                    <Text style={styles.filterOptionCount}>
                      {groupedItems[category]?.length || 0}
                    </Text>
                    <Ionicons
                      name={selectedCategories.includes(category) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={selectedCategories.includes(category) ? themeColor : '#71717a'}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={[styles.filterButton, { backgroundColor: themeColor }]}
                onPress={() => {
                  setSelectedCategories(CATEGORY_ORDER.filter(cat => groupedItems[cat]?.length > 0));
                }}
              >
                <Text style={styles.filterButtonText}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, { backgroundColor: '#3f3f46' }]}
                onPress={() => setSelectedCategories([])}
              >
                <Text style={styles.filterButtonText}>Clear All</Text>
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
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
  filterModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContent: {
    maxHeight: 400,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#ffffff',
  },
  filterOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterOptionCount: {
    fontSize: 12,
    color: '#71717a',
    backgroundColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    minWidth: 20,
    textAlign: 'center',
  },
  filterActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#22d3ee',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});