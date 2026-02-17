import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface IngredientItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  location: 'fridge' | 'pantry' | 'freezer';
  expiryDate?: string;
  notes?: string;
}

interface AddItemModalProps {
  visible: boolean;
  location: 'fridge' | 'pantry';
  onClose: () => void;
  onAddItem: (item: Omit<IngredientItem, 'id'>) => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({
  visible,
  location,
  onClose,
  onAddItem,
}) => {
  const { themeColor } = useTheme();
  
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  
  const units = ['g', 'kg', 'ml', 'L', 'cups', 'tbsp', 'tsp', 'pieces', 'cans', 'packets', 'bottles'];

  const resetForm = () => {
    setName('');
    setQuantity('');
    setUnit('');
    setExpiryDate('');
    setNotes('');
    setShowDatePicker(false);
    setTempDate(new Date());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAddItem = () => {
    if (!name.trim()) {
      Alert.alert('Missing Information', 'Please fill in the item name.');
      return;
    }

    const item = {
      name: name.trim(),
      quantity: quantity.trim() || '',
      unit: unit.trim() || '',
      location,
      expiryDate: expiryDate || undefined,
      notes: notes.trim() || undefined,
    };

    onAddItem(item);
    resetForm();
    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleDateSave = () => {
    const formattedDate = tempDate.toISOString().split('T')[0];
    setExpiryDate(formattedDate);
    setShowDatePicker(false);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
    setTempDate(expiryDate ? new Date(expiryDate) : new Date());
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.container, { borderColor: themeColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColor }]}>
              Add to {location === 'fridge' ? 'Fridge' : 'Pantry'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView 
            style={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Item Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Name</Text>
              <TextInput
                style={[styles.textInput, { borderColor: themeColor + '40' }]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Chicken Breast, Rice, Milk"
                placeholderTextColor="#71717a"
                autoCapitalize="words"
              />
            </View>

            {/* Quantity & Unit Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.quantityInput]}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: themeColor + '40' }]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="500"
                  placeholderTextColor="#71717a"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, styles.unitInput]}>
                <Text style={styles.label}>Unit</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.unitScroll}
                >
                  {units.map((unitOption) => (
                    <TouchableOpacity
                      key={unitOption}
                      style={[
                        styles.unitButton,
                        unit === unitOption && { backgroundColor: themeColor }
                      ]}
                      onPress={() => setUnit(unitOption)}
                    >
                      <Text style={[
                        styles.unitButtonText,
                        unit === unitOption && { color: '#0a0a0b' }
                      ]}>
                        {unitOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Expiry Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expiry Date (Optional)</Text>
              <TouchableOpacity
                style={[styles.dateButton, { borderColor: themeColor + '40' }]}
                onPress={() => {
                  setTempDate(expiryDate ? new Date(expiryDate) : new Date());
                  setShowDatePicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={20} color={themeColor} />
                <Text style={[styles.dateButtonText, { color: themeColor }]}>
                  {expiryDate ? formatDateForDisplay(expiryDate) : 'Tap to set date'}
                </Text>
              </TouchableOpacity>
              {expiryDate && (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => setExpiryDate('')}
                >
                  <Text style={styles.clearDateText}>Clear date</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput, { borderColor: themeColor + '40' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Opened, half full, organic..."
                placeholderTextColor="#71717a"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
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

        {/* Date Picker */}
        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={handleDateCancel} style={styles.datePickerButton}>
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={handleDateSave} style={styles.datePickerButton}>
                  <Text style={[styles.datePickerSaveText, { color: themeColor }]}>Save</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
                textColor="#ffffff"
                themeVariant="dark"
              />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#18181b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  form: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  quantityInput: {
    flex: 1,
  },
  unitInput: {
    flex: 1,
  },
  unitScroll: {
    flexDirection: 'row',
  },
  unitButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#27272a',
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  unitButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#27272a',
    borderWidth: 1,
    borderRadius: 8,
    gap: 12,
  },
  dateButtonText: {
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
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  actions: {
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
    borderWidth: 1,
    borderColor: '#3f3f46',
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
  datePickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModal: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    margin: 20,
    maxWidth: 350,
    width: '100%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  datePickerButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  datePickerCancelText: {
    fontSize: 16,
    color: '#71717a',
  },
  datePickerSaveText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddItemModal;