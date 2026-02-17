import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { WorkoutStorage } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';
import AddItemModal from '../components/AddItemModal';
import FridgePantryPreferencesModal from '../components/FridgePantryPreferencesModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


interface IngredientItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  location: 'fridge' | 'pantry' | 'freezer';
  expiryDate?: string;
  notes?: string;
}

interface FridgePantryPreferences {
  primaryApproach: 'maximize' | 'expiry' | 'ai-led';
  flagExpiringItems: boolean;
  preferExistingInventory: boolean;
  suggestSubstitutions: boolean;
}

interface FridgePantryQuestionnaireProps {
  onComplete?: (data: any) => void;
  onBack?: () => void;
}

const FridgePantryQuestionnaireScreen: React.FC<FridgePantryQuestionnaireProps> = ({
  onComplete,
  onBack
}) => {
  const navigation = useNavigation();
  const { themeColor, isPinkTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'fridge' | 'pantry'>('fridge');
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [preferences, setPreferences] = useState<FridgePantryPreferences>({
    primaryApproach: 'ai-led',
    flagExpiringItems: true,
    preferExistingInventory: true,
    suggestSubstitutions: true,
  });

  useEffect(() => {
    loadExistingData();
  }, []);

  const loadExistingData = async () => {
    try {
      const existingResults = await WorkoutStorage.loadFridgePantryResults();
      if (existingResults && existingResults.formData.ingredients) {
        setIngredients(existingResults.formData.ingredients);
      }
      if (existingResults && existingResults.formData.preferences) {
        setPreferences(existingResults.formData.preferences);
      }
    } catch (error) {
      console.error('Failed to load existing fridge pantry results:', error);
    }
  };

  const handleAddItem = (newItemData: Omit<IngredientItem, 'id'>) => {
    const item: IngredientItem = {
      id: Date.now().toString(),
      ...newItemData,
    };

    const updatedIngredients = [...ingredients, item];
    setIngredients(updatedIngredients);
    saveData(updatedIngredients);
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedIngredients = ingredients.filter(item => item.id !== id);
            setIngredients(updatedIngredients);
            saveData(updatedIngredients);
          }
        }
      ]
    );
  };

  const saveData = async (ingredientsList: IngredientItem[], preferencesData?: FridgePantryPreferences) => {
    try {
      const results = {
        formData: {
          wantToUseExistingIngredients: ingredientsList.length > 0,
          ingredients: ingredientsList,
          preferences: preferencesData || preferences,
        },
        completedAt: new Date().toISOString(),
      };
      await WorkoutStorage.saveFridgePantryResults(results);
      
      // Update completion status
      const currentStatus = await WorkoutStorage.loadNutritionCompletionStatus();
      const updatedStatus = {
        ...currentStatus,
        fridgePantry: true,
      };
      await WorkoutStorage.saveNutritionCompletionStatus(updatedStatus);
    } catch (error) {
      console.error('Failed to save fridge pantry results:', error);
    }
  };

  const handleSavePreferences = async (newPreferences: FridgePantryPreferences) => {
    setPreferences(newPreferences);
    await saveData(ingredients, newPreferences);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const getFilteredIngredients = () => {
    return ingredients.filter(item => item.location === activeTab);
  };

  const getExpiryColor = (expiryDate?: string) => {
    if (!expiryDate) return '#71717a';
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return '#ef4444'; // Expired - red
    if (daysUntilExpiry <= 3) return '#f59e0b'; // Expiring within 3 days - amber
    if (daysUntilExpiry <= 7) return '#eab308'; // Warning within 7 days - yellow
    return '#71717a'; // Normal - gray
  };

  const formatExpiryDate = (expiryDate?: string) => {
    if (!expiryDate) return '';
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry === 0) return 'Expires today';
    if (daysUntilExpiry === 1) return 'Expires tomorrow';
    if (daysUntilExpiry <= 7) return `${daysUntilExpiry} days left`;
    return expiry.toLocaleDateString();
  };

  const renderIngredientCard = (item: IngredientItem) => (
    <View key={item.id} style={[styles.ingredientCard, { borderColor: themeColor + '20' }]}>
      <View style={styles.ingredientContent}>
        <View style={styles.ingredientHeader}>
          <Text style={styles.ingredientName}>{item.name}</Text>
          <TouchableOpacity
            onPress={() => handleDeleteItem(item.id)}
            style={styles.deleteButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.ingredientDetails}>
          <Text style={styles.quantityText}>
            {item.quantity} {item.unit}
          </Text>
          {item.expiryDate && (
            <Text style={[styles.expiryText, { color: getExpiryColor(item.expiryDate) }]}>
              {formatExpiryDate(item.expiryDate)}
            </Text>
          )}
        </View>
        
        {item.notes && (
          <Text style={styles.notesText} numberOfLines={1}>
            {item.notes}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColor + '20' }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Fridge & Pantry</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'fridge' && [styles.activeTab, { backgroundColor: themeColor }]
          ]}
          onPress={() => setActiveTab('fridge')}
        >
          <Ionicons 
            name="snow" 
            size={20} 
            color={activeTab === 'fridge' ? '#0a0a0b' : '#71717a'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'fridge' && { color: '#0a0a0b' }
          ]}>
            Fridge ({ingredients.filter(i => i.location === 'fridge').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'pantry' && [styles.activeTab, { backgroundColor: themeColor }]
          ]}
          onPress={() => setActiveTab('pantry')}
        >
          <Ionicons 
            name="storefront" 
            size={20} 
            color={activeTab === 'pantry' ? '#0a0a0b' : '#71717a'} 
          />
          <Text style={[
            styles.tabText,
            activeTab === 'pantry' && { color: '#0a0a0b' }
          ]}>
            Pantry ({ingredients.filter(i => i.location === 'pantry').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.itemsContainer}>
          {getFilteredIngredients().length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name={activeTab === 'fridge' ? 'snow-outline' : 'storefront-outline'} 
                size={48} 
                color="#71717a" 
              />
              <Text style={styles.emptyTitle}>
                No items in your {activeTab}
              </Text>
              <Text style={styles.emptySubtitle}>
                Add ingredients to track what you have at home
              </Text>
            </View>
          ) : (
            getFilteredIngredients().map(renderIngredientCard)
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: themeColor }]}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="#0a0a0b" />
      </TouchableOpacity>

      {/* Preferences Button */}
      <TouchableOpacity
        style={[styles.preferencesButton, { backgroundColor: themeColor }]}
        onPress={() => setShowPreferencesModal(true)}
      >
        <Ionicons name="settings" size={20} color="#0a0a0b" />
      </TouchableOpacity>

      {/* Add Item Modal */}
      <AddItemModal
        visible={showAddModal}
        location={activeTab}
        onClose={() => setShowAddModal(false)}
        onAddItem={handleAddItem}
      />

      {/* Preferences Modal */}
      <FridgePantryPreferencesModal
        visible={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        onSave={handleSavePreferences}
        initialPreferences={preferences}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  itemsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
  },
  ingredientCard: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  ingredientDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a1a1aa',
    marginRight: 16,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 12,
    color: '#71717a',
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  preferencesButton: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default FridgePantryQuestionnaireScreen;