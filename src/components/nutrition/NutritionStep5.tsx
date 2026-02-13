import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import Slider from '@react-native-community/slider';
import { NutritionFormData } from '../../screens/NutritionQuestionnaireScreen';

interface Props {
  formData: NutritionFormData;
  updateFormData: (data: Partial<NutritionFormData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  colors: any;
}

export const NutritionStep5: React.FC<Props> = ({
  formData,
  updateFormData,
  nextStep,
  previousStep,
  colors,
}) => {
  const [showCustomMacros, setShowCustomMacros] = useState(formData.dietType === 'custom');

  const dietTypes = [
    {
      id: 'balanced',
      title: 'Balanced',
      subtitle: 'Well-rounded nutrition',
      description: '20% Protein • 50% Carbs • 30% Fat',
      icon: 'restaurant',
      gradient: ['#667eea', '#764ba2'],
    },
    {
      id: 'high_protein',
      title: 'High Protein',
      subtitle: 'Muscle building focus',
      description: '30% Protein • 40% Carbs • 30% Fat',
      icon: 'fitness',
      gradient: ['#f093fb', '#f5576c'],
    },
    {
      id: 'low_carb',
      title: 'Low Carb',
      subtitle: 'Reduced carbohydrate',
      description: '25% Protein • 25% Carbs • 50% Fat',
      icon: 'leaf',
      gradient: ['#4facfe', '#00f2fe'],
    },
    {
      id: 'keto',
      title: 'Ketogenic',
      subtitle: 'Very low carb, high fat',
      description: '20% Protein • 5% Carbs • 75% Fat',
      icon: 'flash-off',
      gradient: ['#fa709a', '#fee140'],
    },
    {
      id: 'custom',
      title: 'Custom',
      subtitle: 'Set your own ratios',
      description: 'Customize your macro split',
      icon: 'construct',
      gradient: ['#a8edea', '#fed6e3'],
    },
  ];

  const handleDietSelect = (dietId: string) => {
    updateFormData({ dietType: dietId as any });
    setShowCustomMacros(dietId === 'custom');
    
    if (dietId !== 'custom') {
      // Reset custom macros when selecting preset
      updateFormData({ customMacros: undefined });
    } else {
      // Initialize custom macros if not set
      if (!formData.customMacros) {
        updateFormData({
          customMacros: {
            protein: 25,
            carbs: 45,
            fat: 30,
          }
        });
      }
    }
  };

  const updateCustomMacros = (macro: keyof NonNullable<NutritionFormData['customMacros']>, value: number) => {
    const currentMacros = formData.customMacros || { protein: 25, carbs: 45, fat: 30 };
    const newMacros = { ...currentMacros, [macro]: value };
    
    // Auto-adjust other macros to maintain 100% total
    const total = newMacros.protein + newMacros.carbs + newMacros.fat;
    if (total !== 100) {
      const difference = 100 - total;
      const otherMacros = Object.keys(newMacros).filter(key => key !== macro) as Array<keyof typeof newMacros>;
      
      if (otherMacros.length > 0) {
        const adjustment = difference / otherMacros.length;
        otherMacros.forEach(otherMacro => {
          newMacros[otherMacro] = Math.max(5, Math.round(newMacros[otherMacro] + adjustment));
        });
      }
    }
    
    updateFormData({ customMacros: newMacros });
  };

  const isFormValid = () => {
    return formData.dietType !== null;
  };

  const handleNext = () => {
    if (isFormValid()) {
      nextStep();
    }
  };

  const customMacros = formData.customMacros || { protein: 25, carbs: 45, fat: 30 };
  const macroTotal = customMacros.protein + customMacros.carbs + customMacros.fat;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animatable.View animation="fadeInDown" delay={200}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={previousStep}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>5 of 6</Text>
            <Text style={styles.title}>Dietary Approach</Text>
            <Text style={styles.subtitle}>
              Choose your preferred macro distribution
            </Text>
          </View>
        </Animatable.View>

        <View style={styles.dietContainer}>
          {dietTypes.map((diet, index) => (
            <Animatable.View
              key={diet.id}
              animation="fadeInUp"
              delay={400 + (index * 80)}
            >
              <TouchableOpacity
                style={[
                  styles.dietCard,
                  formData.dietType === diet.id && styles.dietCardSelected,
                ]}
                onPress={() => handleDietSelect(diet.id)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={diet.gradient}
                  style={styles.dietGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.dietContent}>
                    <View style={styles.dietIcon}>
                      <Ionicons name={diet.icon as any} size={24} color="#000" />
                    </View>
                    <View style={styles.dietText}>
                      <Text style={styles.dietTitle}>{diet.title}</Text>
                      <Text style={styles.dietSubtitle}>{diet.subtitle}</Text>
                      <Text style={styles.dietDescription}>{diet.description}</Text>
                    </View>
                    {formData.dietType === diet.id && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark" size={20} color="#000" />
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animatable.View>
          ))}
        </View>

        {showCustomMacros && (
          <Animatable.View animation="fadeInUp" delay={800} style={styles.customMacrosCard}>
            <Text style={styles.customTitle}>Custom Macro Split</Text>
            <Text style={[
              styles.totalText,
              macroTotal !== 100 && { color: '#FF6B6B' }
            ]}>
              Total: {macroTotal}% {macroTotal !== 100 && '(Should equal 100%)'}
            </Text>
            
            <View style={styles.macroSliders}>
              {/* Protein */}
              <View style={styles.macroSlider}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Protein</Text>
                  <Text style={[styles.macroValue, { color: '#4CAF50' }]}>
                    {customMacros.protein}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={15}
                  maximumValue={40}
                  value={customMacros.protein}
                  onValueChange={(value) => updateCustomMacros('protein', Math.round(value))}
                  step={1}
                  minimumTrackTintColor="#4CAF50"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                  thumbStyle={{ backgroundColor: '#4CAF50', width: 20, height: 20 }}
                  trackStyle={{ height: 6, borderRadius: 3 }}
                />
              </View>

              {/* Carbs */}
              <View style={styles.macroSlider}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Carbs</Text>
                  <Text style={[styles.macroValue, { color: '#FF9800' }]}>
                    {customMacros.carbs}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={5}
                  maximumValue={60}
                  value={customMacros.carbs}
                  onValueChange={(value) => updateCustomMacros('carbs', Math.round(value))}
                  step={1}
                  minimumTrackTintColor="#FF9800"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                  thumbStyle={{ backgroundColor: '#FF9800', width: 20, height: 20 }}
                  trackStyle={{ height: 6, borderRadius: 3 }}
                />
              </View>

              {/* Fat */}
              <View style={styles.macroSlider}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroLabel}>Fat</Text>
                  <Text style={[styles.macroValue, { color: '#2196F3' }]}>
                    {customMacros.fat}%
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={15}
                  maximumValue={75}
                  value={customMacros.fat}
                  onValueChange={(value) => updateCustomMacros('fat', Math.round(value))}
                  step={1}
                  minimumTrackTintColor="#2196F3"
                  maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                  thumbStyle={{ backgroundColor: '#2196F3', width: 20, height: 20 }}
                  trackStyle={{ height: 6, borderRadius: 3 }}
                />
              </View>
            </View>
          </Animatable.View>
        )}

        <Animatable.View animation="fadeInUp" delay={900}>
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.primary },
              !isFormValid() && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!isFormValid()}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#000" />
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[colors.primary, colors.primary + '80']}
                style={[styles.progressFill, { width: '83.33%' }]}
              />
            </View>
            <Text style={styles.progressText}>Step 5 of 6</Text>
          </View>
        </Animatable.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    opacity: 0.8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 24,
  },
  dietContainer: {
    gap: 12,
    marginBottom: 24,
  },
  dietCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dietCardSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  dietGradient: {
    padding: 20,
  },
  dietContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dietIcon: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dietText: {
    flex: 1,
  },
  dietTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  dietSubtitle: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.7)',
    fontWeight: '600',
    marginBottom: 2,
  },
  dietDescription: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.6)',
    fontWeight: '500',
  },
  selectedIndicator: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customMacrosCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  customTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 24,
  },
  macroSliders: {
    gap: 20,
  },
  macroSlider: {
    gap: 8,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 24,
    gap: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#B0B0B0',
    fontWeight: '500',
  },
});