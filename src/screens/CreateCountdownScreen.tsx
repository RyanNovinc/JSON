import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { countdownService } from '../services/api';
import { CreateCountdownRequest } from '../types';

const COLORS = [
  '#1a1a1a',
  '#007AFF',
  '#FF3B30',
  '#34C759',
  '#FF9500',
  '#AF52DE',
  '#5856D6',
  '#FF2D55',
];

export default function CreateCountdownScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [targetDate, setTargetDate] = useState(new Date());
  const [selectedColor, setSelectedColor] = useState('#007AFF');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: CreateCountdownRequest) => countdownService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create countdown');
    },
  });

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (targetDate <= new Date()) {
      Alert.alert('Error', 'Please select a future date');
      return;
    }

    setIsLoading(true);
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        targetDate: targetDate.toISOString(),
        color: selectedColor,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Birthday, Vacation, Anniversary"
              placeholderTextColor="#666"
              value={title}
              onChangeText={setTitle}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Target Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              disabled={isLoading}
            >
              <Text style={styles.dateText}>
                {format(targetDate, 'PPP')}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={targetDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setTargetDate(selectedDate);
                }
              }}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Color Theme</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.selectedColor,
                  ]}
                  onPress={() => setSelectedColor(color)}
                  disabled={isLoading}
                />
              ))}
            </View>
          </View>

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Preview</Text>
            <View style={[styles.previewCard, { backgroundColor: selectedColor }]}>
              <Text style={styles.previewTitle}>{title || 'Your Countdown'}</Text>
              <Text style={styles.previewDate}>
                {format(targetDate, 'PPP')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.createButton, isLoading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#fff',
  },
  dateButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 15,
  },
  dateText: {
    fontSize: 16,
    color: '#fff',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#fff',
  },
  preview: {
    marginTop: 30,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewCard: {
    borderRadius: 16,
    padding: 20,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
  },
  previewDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  actions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 30,
  },
  button: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#1a1a1a',
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  createText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});