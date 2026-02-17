import React from 'react';
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
import { NutritionFormData } from '../../screens/NutritionQuestionnaireScreen';

interface Props {
  formData: NutritionFormData;
  updateFormData: (data: Partial<NutritionFormData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  colors: any;
}

export const NutritionStep6: React.FC<Props> = ({
  formData,
  updateFormData,
  nextStep,
  previousStep,
  colors,
}) => {
  const commonRestrictions = [
    { id: 'vegetarian', label: 'Vegetarian', icon: 'leaf' },
    { id: 'vegan', label: 'Vegan', icon: 'flower' },
    { id: 'dairy_free', label: 'Dairy Free', icon: 'ban' },
    { id: 'gluten_free', label: 'Gluten Free', icon: 'alert-circle' },
    { id: 'nut_free', label: 'Nut Free', icon: 'warning' },
    { id: 'shellfish_free', label: 'Shellfish Free', icon: 'fish' },
  ];

  const commonSupplements = [
    { id: 'protein_powder', label: 'Protein Powder', icon: 'fitness' },
    { id: 'creatine', label: 'Creatine', icon: 'flash' },
    { id: 'multivitamin', label: 'Multivitamin', icon: 'medical' },
    { id: 'omega3', label: 'Omega-3', icon: 'heart' },
    { id: 'vitamin_d', label: 'Vitamin D', icon: 'sunny' },
    { id: 'magnesium', label: 'Magnesium', icon: 'moon' },
  ];

  const toggleRestriction = (restriction: string) => {
    const current = formData.restrictions || [];
    const updated = current.includes(restriction)
      ? current.filter(r => r !== restriction)
      : [...current, restriction];
    updateFormData({ restrictions: updated });
  };

  const toggleSupplement = (supplement: string) => {
    const current = formData.supplements || [];
    const updated = current.includes(supplement)
      ? current.filter(s => s !== supplement)
      : [...current, supplement];
    updateFormData({ supplements: updated });
  };

  const handleNutrientVarietySelect = (priority: 'high' | 'moderate' | 'low') => {
    updateFormData({ nutrientVariety: priority });
  };

  const handleNext = () => {
    nextStep();
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
            <Text style={[styles.stepNumber, { color: colors.primary }]}>6 of 6</Text>
            <Text style={styles.title}>Final Preferences</Text>
            <Text style={styles.subtitle}>
              Customize your meal planning preferences
            </Text>
          </View>
        </Animatable.View>

        {/* Dietary Restrictions */}
        <Animatable.View animation="fadeInUp" delay={400}>
          <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
          <Text style={styles.sectionSubtitle}>Select any that apply to you</Text>
          <View style={styles.optionsGrid}>
            {commonRestrictions.map((restriction) => (
              <TouchableOpacity
                key={restriction.id}
                style={[
                  styles.optionCard,
                  formData.restrictions?.includes(restriction.id) && [
                    styles.optionCardSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                  ],
                ]}
                onPress={() => toggleRestriction(restriction.id)}
              >
                <Ionicons 
                  name={restriction.icon as any} 
                  size={24} 
                  color={formData.restrictions?.includes(restriction.id) ? colors.primary : '#666'} 
                />
                <Text style={[
                  styles.optionLabel,
                  formData.restrictions?.includes(restriction.id) && { color: colors.primary }
                ]}>
                  {restriction.label}
                </Text>
                {formData.restrictions?.includes(restriction.id) && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={12} color="#000" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Supplements */}
        <Animatable.View animation="fadeInUp" delay={500}>
          <Text style={styles.sectionTitle}>Supplements</Text>
          <Text style={styles.sectionSubtitle}>Which supplements do you take?</Text>
          <View style={styles.optionsGrid}>
            {commonSupplements.map((supplement) => (
              <TouchableOpacity
                key={supplement.id}
                style={[
                  styles.optionCard,
                  formData.supplements?.includes(supplement.id) && [
                    styles.optionCardSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                  ],
                ]}
                onPress={() => toggleSupplement(supplement.id)}
              >
                <Ionicons 
                  name={supplement.icon as any} 
                  size={24} 
                  color={formData.supplements?.includes(supplement.id) ? colors.primary : '#666'} 
                />
                <Text style={[
                  styles.optionLabel,
                  formData.supplements?.includes(supplement.id) && { color: colors.primary }
                ]}>
                  {supplement.label}
                </Text>
                {formData.supplements?.includes(supplement.id) && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={12} color="#000" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Nutrient Variety Priority */}
        <Animatable.View animation="fadeInUp" delay={600}>
          <Text style={styles.sectionTitle}>Nutrient Variety Priority</Text>
          <Text style={styles.sectionSubtitle}>How important is diverse nutrient intake to you?</Text>
          
          <View style={styles.varietyContainer}>
            {[
              { id: 'high', label: 'Very Important', description: 'I want maximum nutrient variety' },
              { id: 'moderate', label: 'Moderately Important', description: 'I want some variety with convenience' },
              { id: 'low', label: 'Less Important', description: 'I prefer simple, consistent meals' }
            ].map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.varietyOption,
                  formData.nutrientVariety === option.id && [
                    styles.varietyOptionSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                  ],
                ]}
                onPress={() => handleNutrientVarietySelect(option.id as 'high' | 'moderate' | 'low')}
              >
                <View style={styles.varietyContent}>
                  <Text style={[
                    styles.varietyLabel,
                    formData.nutrientVariety === option.id && { color: colors.primary }
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.varietyDescription}>
                    {option.description}
                  </Text>
                </View>
                {formData.nutrientVariety === option.id && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={12} color="#000" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={700}>
          <TouchableOpacity
            style={[styles.finishButton, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary + 'DD']}
              style={styles.finishGradient}
            >
              <Text style={styles.finishButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#000" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[colors.primary, colors.primary + '80']}
                style={[styles.progressFill, { width: '100%' }]}
              />
            </View>
            <Text style={styles.progressText}>Step 6 of 6 - Complete!</Text>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    marginTop: 32,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 20,
    fontWeight: '500',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    minWidth: '47%',
  },
  optionCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishButton: {
    borderRadius: 16,
    marginTop: 40,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  finishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: '800',
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
  varietyContainer: {
    gap: 12,
  },
  varietyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  varietyOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  varietyContent: {
    flex: 1,
  },
  varietyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  varietyDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    fontWeight: '500',
    lineHeight: 18,
  },
});