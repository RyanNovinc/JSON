import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { NutritionFormData } from '../../screens/NutritionQuestionnaireScreen';

interface Props {
  formData: NutritionFormData;
  updateFormData: (data: Partial<NutritionFormData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  colors: any;
}

export const NutritionStep3: React.FC<Props> = ({
  formData,
  updateFormData,
  nextStep,
  previousStep,
  colors,
}) => {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const isFormValid = () => {
    return formData.age && formData.gender && formData.height && formData.weight &&
           formData.age > 0 && formData.height > 0 && formData.weight > 0;
  };

  const handleNext = () => {
    if (isFormValid()) {
      nextStep();
    }
  };

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
            <Text style={[styles.stepNumber, { color: colors.primary }]}>3 of 6</Text>
            <Text style={styles.title}>Personal Details</Text>
            <Text style={styles.subtitle}>
              We need some basic info to calculate your nutrition plan
            </Text>
          </View>
        </Animatable.View>

        <View style={styles.form}>
          {/* Gender Selection */}
          <Animatable.View animation="fadeInUp" delay={400}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  formData.gender === 'male' && [styles.genderButtonActive, { borderColor: colors.primary }],
                ]}
                onPress={() => updateFormData({ gender: 'male' })}
              >
                <Ionicons 
                  name="male" 
                  size={24} 
                  color={formData.gender === 'male' ? colors.primary : '#666'} 
                />
                <Text style={[
                  styles.genderText,
                  formData.gender === 'male' && { color: colors.primary }
                ]}>
                  Male
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  formData.gender === 'female' && [styles.genderButtonActive, { borderColor: '#FF69B4' }],
                ]}
                onPress={() => updateFormData({ gender: 'female' })}
              >
                <Ionicons 
                  name="female" 
                  size={24} 
                  color={formData.gender === 'female' ? '#FF69B4' : '#666'} 
                />
                <Text style={[
                  styles.genderText,
                  formData.gender === 'female' && { color: '#FF69B4' }
                ]}>
                  Female
                </Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>

          {/* Age Input */}
          <Animatable.View animation="fadeInUp" delay={500}>
            <Text style={styles.fieldLabel}>Age</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'age' && { borderColor: colors.primary }
            ]}>
              <TextInput
                style={styles.textInput}
                value={formData.age ? String(formData.age) : ''}
                onChangeText={(text) => updateFormData({ age: parseInt(text) || null })}
                onFocus={() => setFocusedField('age')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your age"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.inputUnit}>years</Text>
            </View>
          </Animatable.View>

          {/* Height Input */}
          <Animatable.View animation="fadeInUp" delay={600}>
            <Text style={styles.fieldLabel}>Height</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'height' && { borderColor: colors.primary }
            ]}>
              <TextInput
                style={styles.textInput}
                value={formData.height ? String(formData.height) : ''}
                onChangeText={(text) => updateFormData({ height: parseInt(text) || null })}
                onFocus={() => setFocusedField('height')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your height"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.inputUnit}>cm</Text>
            </View>
          </Animatable.View>

          {/* Weight Input */}
          <Animatable.View animation="fadeInUp" delay={700}>
            <Text style={styles.fieldLabel}>Current Weight</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'weight' && { borderColor: colors.primary }
            ]}>
              <TextInput
                style={styles.textInput}
                value={formData.weight ? String(formData.weight) : ''}
                onChangeText={(text) => updateFormData({ weight: parseFloat(text) || null })}
                onFocus={() => setFocusedField('weight')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your weight"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                maxLength={6}
              />
              <Text style={styles.inputUnit}>kg</Text>
            </View>
          </Animatable.View>
        </View>

        <Animatable.View animation="fadeInUp" delay={800}>
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
                style={[styles.progressFill, { width: '50%' }]}
              />
            </View>
            <Text style={styles.progressText}>Step 3 of 6</Text>
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
  form: {
    flex: 1,
    gap: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 8,
  },
  genderButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  genderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    paddingVertical: 16,
  },
  inputUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 40,
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