import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { useMealPlanning } from '../contexts/MealPlanningContext';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function AddMealScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();
  const { addToFavorites } = useMealPlanning();
  
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [importedMealName, setImportedMealName] = useState('');
  const [importedMealNutrition, setImportedMealNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [uploadMode, setUploadMode] = useState(false);
  const [modalScale] = useState(new Animated.Value(0));
  const [modalOpacity] = useState(new Animated.Value(0));

  const handleJsonImport = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text) {
      Alert.alert('Clipboard Empty', 'Copy your meal JSON first', [{ text: 'OK' }]);
      return;
    }

    processJsonImport(text);
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const response = await fetch(file.uri);
        const text = await response.text();
        processJsonImport(text);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to read the selected file');
    }
  };

  const handleManualAdd = () => {
    navigation.navigate('ManualMealEntry' as any);
  };

  const processJsonImport = async (text: string) => {
    try {
      const mealData = JSON.parse(text.trim());
      
      // Basic validation
      if (!mealData.name) {
        Alert.alert('Invalid JSON', 'Please ensure the JSON contains a meal name');
        return;
      }

      // Create a complete meal object matching our Meal interface
      const completeMeal = {
        id: 'imported_' + Date.now(),
        type: mealData.type || 'breakfast',
        name: mealData.name,
        description: `Imported ${mealData.type || 'meal'} recipe`,
        time: '12:00',
        ingredients: (mealData.ingredients || []).map((ing: any, index: number) => ({
          id: `ing_${index}_${Date.now()}`,
          name: typeof ing === 'string' ? ing : ing.name || ing.item || '',
          amount: typeof ing === 'string' ? 1 : (parseFloat(ing.amount) || 1),
          unit: typeof ing === 'string' ? 'item' : (ing.unit || 'item'),
          category: 'other' as const,
          estimatedCost: 0,
          isOptional: false,
        })),
        instructions: (mealData.instructions || []).map((inst: any, index: number) => ({
          step: index + 1,
          instruction: typeof inst === 'string' ? inst : inst.instruction || inst,
        })),
        nutritionInfo: {
          calories: mealData.nutritionInfo?.calories || 0,
          protein: mealData.nutritionInfo?.protein || 0,
          carbs: mealData.nutritionInfo?.carbs || 0,
          fat: mealData.nutritionInfo?.fat || 0,
          fiber: 0,
          sugar: 0,
          sodium: 0,
        },
        difficulty: 'easy' as const,
        prepTime: mealData.prepTime || 0,
        cookTime: mealData.cookTime || 0,
        servings: 1,
        tags: ['imported'] as const,
        isFavorite: false,
      };

      // Add meal to favorites
      await addToFavorites(completeMeal);

      // Show success modal
      setImportedMealName(completeMeal.name);
      setImportedMealNutrition({
        calories: completeMeal.nutritionInfo.calories,
        protein: completeMeal.nutritionInfo.protein,
        carbs: completeMeal.nutritionInfo.carbs,
        fat: completeMeal.nutritionInfo.fat,
      });
      setShowSuccessModal(true);
      
      // Animate modal entrance
      Animated.parallel([
        Animated.timing(modalScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      Alert.alert('Invalid JSON', 'Please check your JSON format and try again.');
    }
  };

  const handleSuccessModalClose = () => {
    // Animate modal exit
    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccessModal(false);
      modalScale.setValue(0);
      modalOpacity.setValue(0);
      navigation.goBack();
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.closeButtonWrapper}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButtonInner}>
          <Ionicons name="close" size={28} color="#71717a" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Upload Mode toggle */}
        <TouchableOpacity 
          style={[styles.uploadModeToggle, { borderColor: themeColor }]}
          onPress={() => setUploadMode(!uploadMode)}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={uploadMode ? "clipboard-outline" : "cloud-upload-outline"} 
            size={20} 
            color={themeColor} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.mainButton, { backgroundColor: themeColor, shadowColor: themeColor }]}
          onPress={uploadMode ? handleFileUpload : handleJsonImport}
          activeOpacity={0.9}
        >
          <Ionicons 
            name={uploadMode ? "cloud-upload" : "restaurant"} 
            size={40} 
            color="#0a0a0b" 
          />
          <Text style={styles.mainButtonText}>
            {uploadMode ? "Upload File" : "Paste & Import"}
          </Text>
          <Text style={styles.mainButtonSubtext}>
            {uploadMode ? "Choose JSON file from device" : "Paste your meal JSON"}
          </Text>
        </TouchableOpacity>

        <View style={styles.orSection}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>

        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={handleManualAdd}
          activeOpacity={0.9}
        >
          <Text style={styles.secondaryButtonText}>Manually Add</Text>
        </TouchableOpacity>

        {/* Move help link to bottom of screen */}
        <View style={styles.helpLinkWrapper}>
          <TouchableOpacity 
            style={styles.helpLink}
            onPress={() => navigation.navigate('MealPlanHelp' as any)}
            activeOpacity={0.8}
          >
            <Text style={[styles.helpLinkText, { color: themeColor }]}>How to create a custom meal plan with AI?</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* JSON Import Modal */}
      <Modal
        visible={showJsonModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowJsonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.jsonModalContainer}>
            <Text style={styles.jsonModalTitle}>Import Recipe JSON</Text>
            <Text style={styles.jsonModalSubtitle}>
              Paste JSON recipe data from ChatGPT, Claude, or other AI tools
            </Text>
            
            <TextInput
              style={styles.jsonInput}
              placeholder="Paste your JSON recipe data here..."
              placeholderTextColor="#71717a"
              value={jsonInput}
              onChangeText={setJsonInput}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.jsonModalActions}>
              <TouchableOpacity
                style={styles.jsonCancelButton}
                onPress={() => {
                  setShowJsonModal(false);
                  setJsonInput('');
                }}
              >
                <Text style={styles.jsonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.jsonImportButton, { backgroundColor: themeColor }]}
                onPress={processJsonImport}
                disabled={!jsonInput.trim()}
              >
                <Text style={styles.jsonImportText}>Import Meal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="none"
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: modalOpacity }
          ]}
        >
          <Animated.View 
            style={[
              styles.successModalContent,
              { 
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
                borderColor: themeColor,
                shadowColor: themeColor,
              }
            ]}
          >
            {/* Close Button */}
            <View style={styles.successCloseButtonWrapper}>
              <TouchableOpacity 
                style={styles.successCloseButtonInner} 
                onPress={handleSuccessModalClose}
                activeOpacity={0.8}
              >
                <Text style={styles.successCloseButtonText}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Header Badge */}
            <View style={[styles.headerBadge, { backgroundColor: themeColor + '1A', borderColor: themeColor }]}>
              <Text style={[styles.badgeText, { color: themeColor }]}>Generated in 0.81s</Text>
            </View>

            {/* Main Content */}
            <View style={styles.successMainContent}>
              <Text style={styles.successTitle}>Meal Ready</Text>
              <Text style={styles.successMealName}>{importedMealName}</Text>
              
              {/* Summary Card */}
              <View style={styles.successSummaryCard}>
                <View style={styles.successSummaryRow}>
                  <Text style={styles.successSummaryLabel}>Macros</Text>
                  <Text style={[styles.successSummaryValue, { color: themeColor }]}>
                    P: {importedMealNutrition.protein}g  C: {importedMealNutrition.carbs}g  F: {importedMealNutrition.fat}g
                  </Text>
                </View>
                <View style={styles.successSummaryDivider} />
                <View style={styles.successSummaryRow}>
                  <Text style={styles.successSummaryLabel}>Calories</Text>
                  <Text style={[styles.successSummaryValue, { color: themeColor }]}>{importedMealNutrition.calories} cal</Text>
                </View>
              </View>
            </View>
            
            {/* Action Button */}
            <View style={styles.successActionSection}>
              <TouchableOpacity
                style={[styles.successButton, { backgroundColor: themeColor }]}
                onPress={handleSuccessModalClose}
                activeOpacity={0.9}
              >
                <Text style={styles.successButtonText}>View in Favorites</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  closeButtonWrapper: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    zIndex: 1,
  },
  closeButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  uploadModeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
    alignSelf: 'center',
  },
  mainButton: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  mainButtonText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0a0a0b',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  mainButtonSubtext: {
    fontSize: 16,
    color: '#0a0a0b',
    opacity: 0.8,
    marginTop: 8,
  },
  orSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 48,
    width: '100%',
    maxWidth: 200,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#27272a',
  },
  orText: {
    fontSize: 14,
    color: '#71717a',
    marginHorizontal: 20,
    fontWeight: '500',
  },
  secondaryButton: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e4e4e7',
    letterSpacing: 0.3,
  },
  helpLinkWrapper: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  helpLink: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  helpLinkText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  jsonModalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  jsonModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  jsonModalSubtitle: {
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  jsonInput: {
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#ffffff',
    height: 200,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  jsonModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  jsonCancelButton: {
    flex: 1,
    backgroundColor: '#27272a',
    borderRadius: 12,
    padding: 16,
  },
  jsonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#71717a',
    textAlign: 'center',
  },
  jsonImportButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
  },
  jsonImportText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
    textAlign: 'center',
  },
  successModalContent: {
    backgroundColor: '#0a0a0b',
    borderRadius: 20,
    borderWidth: 1,
    padding: 0,
    width: '100%',
    maxWidth: 420,
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  successCloseButtonWrapper: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    zIndex: 1,
  },
  successCloseButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCloseButtonText: {
    fontSize: 18,
    color: '#a1a1aa',
    fontWeight: '400',
    lineHeight: 18,
  },
  headerBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 24,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  successMainContent: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#a1a1aa',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  successMealName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 38,
  },
  successSummaryCard: {
    backgroundColor: 'rgba(39, 39, 42, 0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(113, 113, 122, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  successSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  successSummaryDivider: {
    height: 1,
    backgroundColor: 'rgba(113, 113, 122, 0.2)',
    marginVertical: 4,
  },
  successSummaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  successSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  successActionSection: {
    paddingHorizontal: 28,
    paddingBottom: 28,
    paddingTop: 8,
  },
  successButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.5,
  },
});