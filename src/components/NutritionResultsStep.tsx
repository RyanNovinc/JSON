import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');

interface MacroResults {
  bmr: number;
  tdee: number;
  targetCalories: number;
  weeklyWeightChange: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  goal: string;
}

interface NutritionResultsStepProps {
  macroResults: MacroResults;
  displayCalories: number | null;
  adjustableWeightTarget: number;
  formData: any;
  colors: any;
  hasUnsavedChanges: boolean;
  setShowResearchModal: (show: boolean) => void;
  setAdjustableWeightTarget: (value: number) => void;
  setDisplayCalories: (calories: number) => void;
  setMacroResults: (results: MacroResults) => void;
  setHasUnsavedChanges: (changed: boolean) => void;
  calculateCaloriesFromSlider: (value: number) => number;
  recalculateMacrosWithNewCalories: (calories: number) => MacroResults;
  setCurrentStep: (step: number) => void;
  navigation: any;
  saveCurrentSettings: () => void;
}

export const NutritionResultsStep: React.FC<NutritionResultsStepProps> = ({
  macroResults,
  displayCalories,
  adjustableWeightTarget,
  formData,
  colors,
  hasUnsavedChanges,
  setShowResearchModal,
  setAdjustableWeightTarget,
  setDisplayCalories,
  setMacroResults,
  setHasUnsavedChanges,
  calculateCaloriesFromSlider,
  recalculateMacrosWithNewCalories,
  setCurrentStep,
  navigation,
  saveCurrentSettings,
}) => {
  if (!macroResults) return null;
  
  const { bmr, tdee, targetCalories, weeklyWeightChange, macros, goal } = macroResults;
  const currentCalories = displayCalories || targetCalories;
  
  console.log('🎯 Render - displayCalories:', displayCalories);
  console.log('🎯 Render - targetCalories:', targetCalories); 
  console.log('🎯 Render - currentCalories:', currentCalories);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView style={styles.fullScrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section with Large Calories Display */}
        <LinearGradient
          colors={[colors.primary, colors.primary + 'CC', colors.primary + '88']}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroHeader}>
              <TouchableOpacity 
                style={styles.researchBadge}
                onPress={() => setShowResearchModal(true)}
              >
                <Ionicons name="library" size={14} color="#000" />
                <Text style={styles.researchBadgeText}>Research</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.heroTitle}>Your Plan</Text>
            <Text style={styles.heroSubtitle}>Personalized Nutrition Goals</Text>
            
            <View style={styles.caloriesContainer}>
              <View style={styles.caloriesDisplay}>
                <Text style={styles.caloriesNumber}>{currentCalories}</Text>
                <Text style={styles.caloriesLabel}>calories/day</Text>
              </View>
              
              {weeklyWeightChange !== 0 && (
                <View style={styles.goalContainer}>
                  <Text style={styles.goalType}>
                    {formData.goal === 'lose_weight' ? '🔥 Fat Loss' : '💪 Muscle Gain'}
                  </Text>
                  <Text style={styles.goalRate}>
                    {formData.goal === 'lose_weight' ? '-' : '+'}{Math.abs(adjustableWeightTarget).toFixed(1)}kg/week
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Wave bottom */}
          <View style={styles.waveContainer}>
            <View style={[styles.wave, { backgroundColor: '#000' }]} />
          </View>
        </LinearGradient>

        <View style={styles.content}>
        {/* Goal Adjustment */}
        {weeklyWeightChange !== 0 && (
          <Animatable.View animation="fadeInUp" delay={100} style={styles.adjustmentCard}>
            <Text style={styles.cardTitle}>Fine-tune Your Goal</Text>
            
            <View style={styles.sliderRow}>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>Slow</Text>
                <Text style={styles.sliderLabelText}>Fast</Text>
              </View>
            </View>
            
            <Slider
              style={styles.modernSlider}
              minimumValue={formData.goal === 'lose_weight' ? -0.75 : 0.25}
              maximumValue={formData.goal === 'lose_weight' ? -0.25 : 0.5}
              value={adjustableWeightTarget}
              onValueChange={(value) => {
                console.log('🔥 Slider moved to:', value);
                console.log('🔥 Current calories before:', currentCalories);
                setAdjustableWeightTarget(value);
                const newCalories = calculateCaloriesFromSlider(value);
                console.log('🔥 New calories calculated:', newCalories);
                setDisplayCalories(newCalories);
                console.log('🔥 Display calories set to:', newCalories);
                const updatedMacros = recalculateMacrosWithNewCalories(newCalories);
                setMacroResults(updatedMacros);
                setHasUnsavedChanges(true);
              }}
              step={0.01}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor="#333"
              thumbStyle={styles.sliderThumb}
              trackStyle={styles.sliderTrack}
            />
          </Animatable.View>
        )}

        {/* Macros in Circular Design */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.macrosCard}>
          <Text style={styles.cardTitle}>Daily Macros</Text>
          
          <View style={styles.macrosGrid}>
            <View style={styles.macroCircle}>
              <View style={[styles.circleOuter, { borderColor: '#4CAF50' }]}>
                <View style={[styles.circleInner, { backgroundColor: '#4CAF50' + '20' }]}>
                  <Ionicons name="fitness" size={24} color="#4CAF50" />
                  <Text style={[styles.macroValue, { color: '#4CAF50' }]}>{macros.protein}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.macroCircle}>
              <View style={[styles.circleOuter, { borderColor: '#FF9800' }]}>
                <View style={[styles.circleInner, { backgroundColor: '#FF9800' + '20' }]}>
                  <Ionicons name="flash" size={24} color="#FF9800" />
                  <Text style={[styles.macroValue, { color: '#FF9800' }]}>{macros.carbs}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.macroCircle}>
              <View style={[styles.circleOuter, { borderColor: '#2196F3' }]}>
                <View style={[styles.circleInner, { backgroundColor: '#2196F3' + '20' }]}>
                  <Ionicons name="water" size={24} color="#2196F3" />
                  <Text style={[styles.macroValue, { color: '#2196F3' }]}>{macros.fat}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
              </View>
            </View>
          </View>
        </Animatable.View>

        {/* Stats Cards */}
        <Animatable.View animation="fadeInUp" delay={300} style={styles.statsContainer}>
          <Text style={styles.cardTitle}>Metabolism Overview</Text>
          
          <View style={styles.statsRow}>
            <LinearGradient
              colors={[colors.primary + '20', colors.primary + '10']}
              style={styles.statCard}
            >
              <Ionicons name="body" size={28} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{bmr}</Text>
              <Text style={styles.statLabel}>BMR</Text>
              <Text style={styles.statSubtext}>Base Metabolic Rate</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={[colors.primary + '20', colors.primary + '10']}
              style={styles.statCard}
            >
              <Ionicons name="flash" size={28} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.primary }]}>{tdee}</Text>
              <Text style={styles.statLabel}>TDEE</Text>
              <Text style={styles.statSubtext}>Total Daily Energy</Text>
            </LinearGradient>
          </View>
        </Animatable.View>

        {/* Bottom Actions */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={saveCurrentSettings}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary + 'DD']}
              style={styles.buttonGradient}
            >
              <Ionicons 
                name={hasUnsavedChanges ? "checkmark-circle" : "arrow-forward"} 
                size={22} 
                color="#000" 
              />
              <Text style={styles.primaryButtonText}>
                {hasUnsavedChanges ? "Save & Continue" : "Let's Go!"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.primary + '40' }]}
            onPress={() => {
              setCurrentStep(0);
              navigation.setParams({ showResults: false });
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
              Retake Quiz
            </Text>
          </TouchableOpacity>
          
          <View style={styles.hintBox}>
            <Text style={styles.hintText}>
              🍎 Ready to start your nutrition journey? Your plan is personalized just for you.
            </Text>
          </View>
        </Animatable.View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScrollView: {
    flex: 1,
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    position: 'relative',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  researchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  researchBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.7)',
    fontWeight: '500',
    marginBottom: 30,
    textAlign: 'center',
  },
  caloriesContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  caloriesDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  caloriesNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#000',
    lineHeight: 72,
  },
  caloriesLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.7)',
    marginTop: 4,
  },
  goalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  goalType: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  goalRate: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(0, 0, 0, 0.7)',
  },
  waveContainer: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 20,
  },
  wave: {
    height: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  adjustmentCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  sliderRow: {
    marginBottom: 10,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabelText: {
    fontSize: 14,
    color: '#A0A0A0',
    fontWeight: '500',
  },
  modernSlider: {
    width: '100%',
    height: 50,
  },
  sliderThumb: {
    backgroundColor: '#fff',
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sliderTrack: {
    height: 8,
    borderRadius: 4,
  },
  macrosCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  macroCircle: {
    alignItems: 'center',
  },
  circleOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    padding: 3,
  },
  circleInner: {
    width: '100%',
    height: '100%',
    borderRadius: 47,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '600',
    marginTop: 2,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: '#A0A0A0',
    fontWeight: '500',
    textAlign: 'center',
  },
  actionsContainer: {
    paddingBottom: 40,
  },
  primaryButton: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 24,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hintBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hintText: {
    fontSize: 14,
    color: '#B0B0B0',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
});