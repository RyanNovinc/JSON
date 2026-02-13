import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { WorkoutStorage } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper functions for date conversion
const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return '';
  try {
    // Convert YYYY-MM-DD to DD-MM-YYYY for display
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

const convertDisplayDateToStorage = (displayDate: string): string => {
  if (!displayDate) return '';
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(displayDate)) {
    return displayDate;
  }
  
  // Convert DD-MM-YYYY to YYYY-MM-DD
  if (/^\d{2}-\d{2}-\d{4}$/.test(displayDate)) {
    const [day, month, year] = displayDate.split('-');
    return `${year}-${month}-${day}`;
  }
  
  return displayDate;
};

interface IngredientItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  location: 'fridge' | 'pantry' | 'freezer';
  expiryDate?: string;
  notes?: string;
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newItem, setNewItem] = useState<Partial<IngredientItem>>({
    name: '',
    quantity: '',
    unit: '',
    location: 'fridge',
    expiryDate: '',
    notes: '',
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
    } catch (error) {
      console.error('Failed to load existing fridge pantry results:', error);
    }
  };

  const [tempDate, setTempDate] = useState<Date>(new Date());

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        const formattedDate = selectedDate.toISOString().split('T')[0];
        setNewItem({ ...newItem, expiryDate: formattedDate });
      }
    } else if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleDateSave = () => {
    const formattedDate = tempDate.toISOString().split('T')[0];
    setNewItem({ ...newItem, expiryDate: formattedDate });
    setShowDatePicker(false);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
    setTempDate(newItem.expiryDate ? new Date(newItem.expiryDate) : new Date());
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.quantity || !newItem.unit) {
      Alert.alert('Missing Information', 'Please fill in name, quantity, and unit.');
      return;
    }

    const item: IngredientItem = {
      id: Date.now().toString(),
      name: newItem.name!,
      quantity: newItem.quantity!,
      unit: newItem.unit!,
      location: activeTab,
      expiryDate: newItem.expiryDate,
      notes: newItem.notes,
    };

    setIngredients([...ingredients, item]);
    setNewItem({
      name: '',
      quantity: '',
      unit: '',
      location: activeTab,
      expiryDate: '',
      notes: '',
    });
    setShowAddModal(false);
    setShowDatePicker(false);
    saveData([...ingredients, item]);
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

  const saveData = async (ingredientsList: IngredientItem[]) => {
    try {
      const results = {
        formData: {
          wantToUseExistingIngredients: ingredientsList.length > 0,
          ingredients: ingredientsList,
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

  const units = ['g', 'kg', 'ml', 'L', 'cups', 'tbsp', 'tsp', 'pieces', 'cans', 'packets', 'bottles'];

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
        onPress={() => {
          setNewItem({ ...newItem, location: activeTab });
          setShowAddModal(true);
        }}
      >
        <Ionicons name="add" size={24} color="#0a0a0b" />
      </TouchableOpacity>

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={[styles.modalContent, { borderColor: themeColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColor }]}>
                Add to {activeTab === 'fridge' ? 'Fridge' : 'Pantry'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalBody}>
                {/* Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Item Name</Text>
                  <TextInput
                    style={[styles.textInput, { borderColor: themeColor + '40' }]}
                    value={newItem.name}
                    onChangeText={(text) => setNewItem({ ...newItem, name: text })}
                    placeholder="e.g. Chicken Breast, Rice, Milk"
                    placeholderTextColor="#71717a"
                  />
                </View>

                {/* Quantity & Unit Row */}
                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                    <Text style={styles.inputLabel}>Quantity</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: themeColor + '40' }]}
                      value={newItem.quantity}
                      onChangeText={(text) => setNewItem({ ...newItem, quantity: text })}
                      placeholder="500"
                      placeholderTextColor="#71717a"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Unit</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.unitSelector}
                    >
                      {units.map((unit) => (
                        <TouchableOpacity
                          key={unit}
                          style={[
                            styles.unitButton,
                            newItem.unit === unit && { backgroundColor: themeColor }
                          ]}
                          onPress={() => setNewItem({ ...newItem, unit })}
                        >
                          <Text style={[
                            styles.unitButtonText,
                            newItem.unit === unit && { color: '#0a0a0b' }
                          ]}>
                            {unit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                {/* Expiry Date */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Expiry Date (Optional)</Text>
                  <TouchableOpacity
                    style={[styles.datePickerButton, { borderColor: themeColor + '40' }]}
                    onPress={() => {
                      setTempDate(newItem.expiryDate ? new Date(newItem.expiryDate) : new Date());
                      setShowDatePicker(true);
                    }}
                  >
                    <Ionicons name="calendar-outline" size={20} color={themeColor} />
                    <Text style={[styles.datePickerButtonText, { color: themeColor }]}>
                      {newItem.expiryDate ? new Date(newItem.expiryDate).toLocaleDateString() : 'Tap to set date'}
                    </Text>
                  </TouchableOpacity>
                  {newItem.expiryDate && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={() => setNewItem({ ...newItem, expiryDate: '' })}
                    >
                      <Text style={styles.clearDateText}>Clear date</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Notes */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea, { borderColor: themeColor + '40' }]}
                    value={newItem.notes}
                    onChangeText={(text) => setNewItem({ ...newItem, notes: text })}
                    placeholder="e.g. Opened, half full, organic..."
                    placeholderTextColor="#71717a"
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: themeColor }]}
                onPress={handleAddItem}
              >
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={handleDateCancel}
      >
        <View style={styles.dateModalOverlay}>
          <View style={[styles.dateModalContent, { borderColor: themeColor }]}>
            <View style={styles.dateModalHeader}>
              <TouchableOpacity onPress={handleDateCancel}>
                <Text style={styles.dateModalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.dateModalTitle, { color: themeColor }]}>Select Date</Text>
              <TouchableOpacity onPress={handleDateSave}>
                <Text style={[styles.dateModalSave, { color: themeColor }]}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
                textColor="#ffffff"
                themeVariant="dark"
              />
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  unitSelector: {
    flexDirection: 'row',
    marginTop: 8,
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#27272a',
    borderRadius: 6,
    marginRight: 8,
  },
  unitButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#27272a',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  addButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderRadius: 8,
    gap: 12,
  },
  datePickerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  clearDateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearDateText: {
    fontSize: 14,
    color: '#71717a',
    textDecorationLine: 'underline',
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dateModalContent: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    width: '100%',
    maxWidth: 350,
    overflow: 'hidden',
  },
  dateModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateModalCancel: {
    fontSize: 16,
    color: '#71717a',
  },
  dateModalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default FridgePantryQuestionnaireScreen;