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

export const NutritionStep7: React.FC<Props> = ({
  formData,
  updateFormData,
  nextStep,
  previousStep,
  colors,
}) => {
  const pregnancyOptions = [
    { id: 'none', label: 'Not Applicable', icon: 'remove-circle' },
    { id: 'pregnant', label: 'Currently Pregnant', icon: 'heart' },
    { id: 'breastfeeding', label: 'Breastfeeding', icon: 'nutrition' },
  ];

  const smokingOptions = [
    { id: 'never', label: 'Never Smoked', icon: 'checkmark-circle' },
    { id: 'former', label: 'Former Smoker', icon: 'time' },
    { id: 'current', label: 'Current Smoker', icon: 'ban' },
  ];

  const sunExposureOptions = [
    { id: 'minimal', label: 'Minimal', subtitle: 'Mostly indoors, limited sun' },
    { id: 'moderate', label: 'Moderate', subtitle: '30min-2hrs daily sun exposure' },
    { id: 'high', label: 'High', subtitle: '>2hrs daily sun exposure' },
  ];

  const stressOptions = [
    { id: 'low', label: 'Low Stress', icon: 'happy' },
    { id: 'moderate', label: 'Moderate Stress', icon: 'remove' },
    { id: 'high', label: 'High Stress', icon: 'alert' },
  ];

  const sleepOptions = [
    { id: 'poor', label: 'Poor', subtitle: '<6hrs or restless' },
    { id: 'fair', label: 'Fair', subtitle: '6-7hrs, some issues' },
    { id: 'good', label: 'Good', subtitle: '7-8hrs, mostly restful' },
    { id: 'excellent', label: 'Excellent', subtitle: '8+hrs, very restful' },
  ];

  const regionOptions = [
    { id: 'north_america', label: 'North America' },
    { id: 'europe', label: 'Europe' },
    { id: 'asia', label: 'Asia' },
    { id: 'other', label: 'Other/Prefer not to say' },
  ];

  const commonConditions = [
    'None', 'Diabetes', 'High Blood Pressure', 'Heart Disease', 'Thyroid Issues',
    'Kidney Disease', 'Liver Disease', 'Anemia', 'Osteoporosis',
    'Inflammatory Conditions', 'Digestive Disorders', 'Food Allergies'
  ];

  const digestiveIssues = [
    'IBS', 'Crohn\'s Disease', 'Celiac Disease', 'Lactose Intolerance',
    'Acid Reflux/GERD', 'Frequent Bloating', 'Other Food Sensitivities'
  ];

  const handleSelection = (field: string, value: any) => {
    updateFormData({ [field]: value });
  };

  const toggleArrayItem = (field: string, item: string) => {
    const current = formData[field as keyof NutritionFormData] as string[] || [];
    
    // Special handling for medical conditions with 'None' option
    if (field === 'medicalConditions') {
      if (item === 'None') {
        // If selecting 'None', clear all other selections
        const updated = current.includes('None') ? [] : ['None'];
        updateFormData({ [field]: updated });
        return;
      } else {
        // If selecting any other condition, remove 'None' and toggle the item
        const withoutNone = current.filter(i => i !== 'None');
        const updated = withoutNone.includes(item)
          ? withoutNone.filter(i => i !== item)
          : [...withoutNone, item];
        updateFormData({ [field]: updated });
        return;
      }
    }
    
    // Standard toggle for other fields
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    updateFormData({ [field]: updated });
  };

  const isFormValid = () => {
    return formData.smokingStatus && formData.sunExposure && formData.stressLevel && 
           formData.sleepQuality && formData.geographicRegion;
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
            <Text style={[styles.stepNumber, { color: colors.primary }]}>7 of 7</Text>
            <Text style={styles.title}>Health & Lifestyle</Text>
            <Text style={styles.subtitle}>
              Help us personalize your micronutrient recommendations
            </Text>
          </View>
        </Animatable.View>

        {/* Pregnancy/Breastfeeding - Only for females */}
        {formData.gender === 'female' && (
          <Animatable.View animation="fadeInUp" delay={400}>
            <Text style={styles.sectionTitle}>Pregnancy & Breastfeeding Status</Text>
            <View style={styles.optionsGrid}>
              {pregnancyOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    formData.pregnantBreastfeeding === option.id && [
                      styles.optionCardSelected,
                      { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                    ],
                  ]}
                  onPress={() => handleSelection('pregnantBreastfeeding', option.id)}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={20} 
                    color={formData.pregnantBreastfeeding === option.id ? colors.primary : '#666'} 
                  />
                  <Text style={[
                    styles.optionLabel,
                    formData.pregnantBreastfeeding === option.id && { color: colors.primary }
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animatable.View>
        )}

        {/* Medical Conditions */}
        <Animatable.View animation="fadeInUp" delay={500}>
          <Text style={styles.sectionTitle}>Medical Conditions</Text>
          <Text style={styles.sectionSubtitle}>Select any that apply (optional)</Text>
          <View style={styles.checkboxGrid}>
            {commonConditions.map((condition) => (
              <TouchableOpacity
                key={condition}
                style={[
                  styles.checkboxItem,
                  formData.medicalConditions?.includes(condition) && [
                    styles.checkboxSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                  ],
                ]}
                onPress={() => toggleArrayItem('medicalConditions', condition)}
              >
                <Text style={[
                  styles.checkboxText,
                  formData.medicalConditions?.includes(condition) && { color: colors.primary }
                ]}>
                  {condition}
                </Text>
                {formData.medicalConditions?.includes(condition) && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Smoking Status */}
        <Animatable.View animation="fadeInUp" delay={600}>
          <Text style={styles.sectionTitle}>Smoking Status</Text>
          <View style={styles.optionsGrid}>
            {smokingOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  formData.smokingStatus === option.id && [
                    styles.optionCardSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                  ],
                ]}
                onPress={() => handleSelection('smokingStatus', option.id)}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={20} 
                  color={formData.smokingStatus === option.id ? colors.primary : '#666'} 
                />
                <Text style={[
                  styles.optionLabel,
                  formData.smokingStatus === option.id && { color: colors.primary }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Sun Exposure */}
        <Animatable.View animation="fadeInUp" delay={700}>
          <Text style={styles.sectionTitle}>Daily Sun Exposure</Text>
          <Text style={styles.sectionSubtitle}>Affects vitamin D requirements</Text>
          <View style={styles.verticalOptions}>
            {sunExposureOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.verticalOption,
                  formData.sunExposure === option.id && [
                    styles.verticalOptionSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                  ],
                ]}
                onPress={() => handleSelection('sunExposure', option.id)}
              >
                <Text style={[
                  styles.verticalOptionTitle,
                  formData.sunExposure === option.id && { color: colors.primary }
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.verticalOptionSubtitle}>{option.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Digestive Issues */}
        <Animatable.View animation="fadeInUp" delay={800}>
          <Text style={styles.sectionTitle}>Digestive Health</Text>
          <Text style={styles.sectionSubtitle}>Select any that apply (affects absorption)</Text>
          <View style={styles.checkboxGrid}>
            {digestiveIssues.map((issue) => (
              <TouchableOpacity
                key={issue}
                style={[
                  styles.checkboxItem,
                  formData.digestiveIssues?.includes(issue) && [
                    styles.checkboxSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                  ],
                ]}
                onPress={() => toggleArrayItem('digestiveIssues', issue)}
              >
                <Text style={[
                  styles.checkboxText,
                  formData.digestiveIssues?.includes(issue) && { color: colors.primary }
                ]}>
                  {issue}
                </Text>
                {formData.digestiveIssues?.includes(issue) && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Stress Level */}
        <Animatable.View animation="fadeInUp" delay={900}>
          <Text style={styles.sectionTitle}>Current Stress Level</Text>
          <View style={styles.optionsGrid}>
            {stressOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  formData.stressLevel === option.id && [
                    styles.optionCardSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                  ],
                ]}
                onPress={() => handleSelection('stressLevel', option.id)}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={20} 
                  color={formData.stressLevel === option.id ? colors.primary : '#666'} 
                />
                <Text style={[
                  styles.optionLabel,
                  formData.stressLevel === option.id && { color: colors.primary }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Sleep Quality */}
        <Animatable.View animation="fadeInUp" delay={1000}>
          <Text style={styles.sectionTitle}>Sleep Quality</Text>
          <View style={styles.verticalOptions}>
            {sleepOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.verticalOption,
                  formData.sleepQuality === option.id && [
                    styles.verticalOptionSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                  ],
                ]}
                onPress={() => handleSelection('sleepQuality', option.id)}
              >
                <Text style={[
                  styles.verticalOptionTitle,
                  formData.sleepQuality === option.id && { color: colors.primary }
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.verticalOptionSubtitle}>{option.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        {/* Geographic Region */}
        <Animatable.View animation="fadeInUp" delay={1100}>
          <Text style={styles.sectionTitle}>Geographic Region</Text>
          <Text style={styles.sectionSubtitle}>Affects iodine and selenium availability</Text>
          <View style={styles.checkboxGrid}>
            {regionOptions.map((region) => (
              <TouchableOpacity
                key={region.id}
                style={[
                  styles.checkboxItem,
                  formData.geographicRegion === region.id && [
                    styles.checkboxSelected,
                    { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                  ],
                ]}
                onPress={() => handleSelection('geographicRegion', region.id)}
              >
                <Text style={[
                  styles.checkboxText,
                  formData.geographicRegion === region.id && { color: colors.primary }
                ]}>
                  {region.label}
                </Text>
                {formData.geographicRegion === region.id && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={1200}>
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
            <LinearGradient
              colors={[colors.primary, colors.primary + 'DD']}
              style={styles.nextGradient}
            >
              <Text style={styles.nextButtonText}>Calculate My Plan</Text>
              <Ionicons name="calculator" size={20} color="#000" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={[colors.primary, colors.primary + '80']}
                style={[styles.progressFill, { width: '100%' }]}
              />
            </View>
            <Text style={styles.progressText}>Step 7 of 7 - Complete!</Text>
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
    minWidth: '47%',
    gap: 8,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  verticalOptions: {
    gap: 12,
  },
  verticalOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  verticalOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  verticalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  verticalOptionSubtitle: {
    fontSize: 13,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 8,
  },
  checkboxSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  checkboxText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  nextButton: {
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
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  nextButtonText: {
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
});