import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import Slider from '@react-native-community/slider';
import { NutritionFormData, MacroResults } from '../../screens/NutritionQuestionnaireScreen';

interface Props {
  formData: NutritionFormData;
  macroResults: MacroResults | null;
  displayCalories: number | null;
  setDisplayCalories: (calories: number) => void;
  targetRate: number;
  setTargetRate: (rate: number) => void;
  calculateCaloriesFromSlider: (rate: number) => number;
  recalculateMacrosWithNewCalories: (calories: number) => MacroResults;
  setMacroResults: (results: MacroResults) => void;
  setHasUnsavedChanges: (changed: boolean) => void;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onRetake: () => void;
  colors: any;
}

export const NutritionSummary: React.FC<Props> = ({
  formData,
  macroResults,
  displayCalories,
  setDisplayCalories,
  targetRate,
  setTargetRate,
  calculateCaloriesFromSlider,
  recalculateMacrosWithNewCalories,
  setMacroResults,
  setHasUnsavedChanges,
  hasUnsavedChanges,
  onSave,
  onRetake,
  colors,
}) => {
  const [micronutrientsExpanded, setMicronutrientsExpanded] = useState(false);

  // Initialize displayCalories to match current slider position on first load
  useEffect(() => {
    if (!displayCalories && macroResults) {
      const initialCalories = calculateCaloriesFromSlider(targetRate);
      setDisplayCalories(initialCalories);
    }
  }, [macroResults, displayCalories, targetRate, calculateCaloriesFromSlider, setDisplayCalories]);

  // Recalculate calories when goal changes (only goal and TDEE changes)
  useEffect(() => {
    if (macroResults?.tdee && formData.goal) {
      const newCalories = calculateCaloriesFromSlider(targetRate);
      setDisplayCalories(newCalories);
    }
  }, [formData.goal, macroResults?.tdee, targetRate, calculateCaloriesFromSlider, setDisplayCalories]);

  if (!macroResults) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Calculating your nutrition plan...</Text>
      </View>
    );
  }

  const currentCalories = displayCalories || macroResults.targetCalories || 0;
  const currentMacros = displayCalories ? recalculateMacrosWithNewCalories(displayCalories) : macroResults;
  
  // Ensure macro values are always numbers
  const safeProtein = Number(currentMacros?.macros?.protein) || 0;
  const safeCarbs = Number(currentMacros?.macros?.carbs) || 0;
  const safeFat = Number(currentMacros?.macros?.fat) || 0;

  const handleSliderChange = (value: number) => {
    console.log('🔥 Slider changed to:', value);
    setTargetRate(value);
    const newCalories = calculateCaloriesFromSlider(value);
    console.log('🔥 New calories:', newCalories, 'for rate:', value);
    setDisplayCalories(newCalories);
    const updatedMacros = recalculateMacrosWithNewCalories(newCalories);
    setMacroResults(updatedMacros);
    setHasUnsavedChanges(true);
  };

  const getGoalDescription = () => {
    if (formData.goal === 'lose_weight') {
      return targetRate <= 0.5 ? '🔥 Moderate Fat Loss' : '🔥 Aggressive Fat Loss';
    } else if (formData.goal === 'gain_weight') {
      return targetRate <= 0.35 ? '💪 Lean Muscle Gain' : '💪 Rapid Muscle Gain';
    }
    return '⚖️ Weight Maintenance';
  };

  const getRecommendedMicronutrients = () => {
    // Calculate adjustments based on health factors
    const isPregnant = formData.pregnantBreastfeeding === 'pregnant';
    const isBreastfeeding = formData.pregnantBreastfeeding === 'breastfeeding';
    const isSmoker = formData.smokingStatus === 'current';
    const hasAnemia = formData.medicalConditions?.includes('Anemia');
    const hasOsteoporosis = formData.medicalConditions?.includes('Osteoporosis');
    const hasThyroidIssues = formData.medicalConditions?.includes('Thyroid Issues');
    const hasDigestiveIssues = formData.digestiveIssues && formData.digestiveIssues.length > 0;
    const isHighStress = formData.stressLevel === 'high';
    const hasPoorSleep = formData.sleepQuality === 'poor';
    const hasMinimalSun = formData.sunExposure === 'minimal';
    
    // Diet-based factors
    const isVegetarian = formData.restrictions?.includes('vegetarian');
    const isVegan = formData.restrictions?.includes('vegan');
    
    // Activity-based factors (research: athletes need 1.5-2x certain nutrients)
    const isHighlyActive = formData.activityLevel === 'heavy' || formData.activityLevel === 'extreme';
    
    // Body size factor (some nutrients scale with body weight - research basis)
    const bodyWeightKg = formData.weight || 70; // Default if missing
    const isLargeBody = bodyWeightKg > 90; // >90kg may need higher doses of fat-soluble vitamins

    // Essential Vitamins with health-based adjustments
    const essentialVitamins = [
      { 
        name: 'Vitamin A', 
        amount: formData.gender === 'male' ? '900' : (isPregnant ? '770' : isBreastfeeding ? '1300' : '700'), 
        unit: 'mcg', 
        reason: isPregnant || isBreastfeeding ? 'Increased needs for fetal development/milk production' : 'Vision, immune function & skin health' 
      },
      { 
        name: 'Vitamin C', 
        amount: isSmoker ? 
          (formData.gender === 'male' ? '125' : '110') : 
          (isHighlyActive ? (formData.gender === 'male' ? '120' : '100') :
          (isPregnant ? '85' : isBreastfeeding ? '120' : (formData.gender === 'male' ? '90' : '75'))), 
        unit: 'mg', 
        reason: isSmoker ? 'Increased needs due to smoking oxidative stress' : 
                isHighlyActive ? 'Higher needs for recovery & immune support' :
                isPregnant || isBreastfeeding ? 'Increased needs for immune support' : 'Antioxidant & immune support' 
      },
      { 
        name: 'Vitamin D', 
        amount: hasMinimalSun ? '2000-4000' : hasOsteoporosis ? '1500-2000' : '1000-2000', 
        unit: 'IU', 
        reason: hasMinimalSun ? 'Higher needs due to limited sun exposure' : 
                hasOsteoporosis ? 'Increased needs for bone health' : 'Bone health & immune function' 
      },
      { 
        name: 'Vitamin E', 
        amount: isSmoker ? '20-25' : '15', 
        unit: 'mg', 
        reason: isSmoker ? 'Increased antioxidant needs due to smoking' : 'Antioxidant protection' 
      },
      { 
        name: 'Vitamin K', 
        amount: formData.gender === 'male' ? '120' : (isPregnant || isBreastfeeding ? '90' : '90'), 
        unit: 'mcg', 
        reason: 'Blood clotting & bone health' 
      },
    ];

    // B-Complex Vitamins with stress/sleep adjustments
    const bVitamins = [
      { 
        name: 'Vitamin B1 (Thiamine)', 
        amount: isHighStress ? (formData.gender === 'male' ? '1.5' : '1.4') : (formData.gender === 'male' ? '1.2' : '1.1'), 
        unit: 'mg', 
        reason: isHighStress ? 'Increased needs due to stress response' : 'Energy metabolism' 
      },
      { 
        name: 'Vitamin B2 (Riboflavin)', 
        amount: isHighStress ? (formData.gender === 'male' ? '1.6' : '1.4') : (formData.gender === 'male' ? '1.3' : '1.1'), 
        unit: 'mg', 
        reason: isHighStress ? 'Higher needs for stress management' : 'Energy production & cellular function' 
      },
      { 
        name: 'Vitamin B3 (Niacin)', 
        amount: formData.gender === 'male' ? '16' : '14', 
        unit: 'mg', 
        reason: 'Energy metabolism & nervous system' 
      },
      { 
        name: 'Vitamin B5 (Pantothenic Acid)', 
        amount: isHighStress ? '7-10' : '5', 
        unit: 'mg', 
        reason: isHighStress ? 'Adrenal support during stress' : 'Hormone production & metabolism' 
      },
      { 
        name: 'Vitamin B6', 
        amount: isPregnant ? '1.9' : isBreastfeeding ? '2.0' : 
                (formData.age && formData.age > 50 ? (formData.gender === 'male' ? '1.7' : '1.5') : '1.3'), 
        unit: 'mg', 
        reason: isPregnant || isBreastfeeding ? 'Critical for fetal brain development' : 'Protein metabolism & brain function' 
      },
      { 
        name: 'Vitamin B7 (Biotin)', 
        amount: isPregnant ? '30-35' : '30', 
        unit: 'mcg', 
        reason: isPregnant ? 'Increased needs during pregnancy' : 'Hair, skin & nail health' 
      },
      { 
        name: 'Vitamin B9 (Folate)', 
        amount: isPregnant ? '600' : isBreastfeeding ? '500' : '400', 
        unit: 'mcg', 
        reason: isPregnant ? 'CRITICAL - prevents neural tube defects' : 
                isBreastfeeding ? 'Support milk production' : 'Cell division & DNA synthesis' 
      },
      { 
        name: 'Vitamin B12', 
        amount: isVegan ? '25-100' : 
                (isVegetarian ? '10-25' : 
                (hasDigestiveIssues ? '5-10' : (isPregnant ? '2.6' : isBreastfeeding ? '2.8' : '2.4'))), 
        unit: 'mcg', 
        reason: isVegan ? 'CRITICAL - No dietary sources, supplement required' : 
                isVegetarian ? 'Higher needs - limited dietary sources' :
                hasDigestiveIssues ? 'Increased needs due to absorption issues' : 
                isPregnant || isBreastfeeding ? 'Support nervous system development' : 'Energy metabolism & nervous system' 
      },
    ];

    // Essential Minerals with health-based adjustments
    const essentialMinerals = [
      { 
        name: 'Calcium', 
        amount: hasOsteoporosis ? '1200-1500' : 
                (isPregnant || isBreastfeeding ? '1000-1300' : 
                (formData.age && formData.age > 50 ? '1200' : '1000')), 
        unit: 'mg', 
        reason: hasOsteoporosis ? 'Critical for bone density' : 
                isPregnant || isBreastfeeding ? 'Support bone health & milk production' : 'Bone & teeth health' 
      },
      { 
        name: 'Iron', 
        amount: hasAnemia ? (formData.gender === 'male' ? '15-25' : '25-40') : 
                (isVegan || isVegetarian ? (formData.gender === 'male' ? '14-16' : '32-36') :
                (isHighlyActive ? (formData.gender === 'male' ? '12-15' : '22-25') :
                (isPregnant ? '27' : isBreastfeeding ? '9' : 
                (formData.gender === 'male' ? '8' : '18')))), 
        unit: 'mg', 
        reason: hasAnemia ? 'Therapeutic dose for iron deficiency' : 
                isVegan || isVegetarian ? 'Higher needs - plant iron less absorbable (1.8x RDA)' :
                isHighlyActive ? 'Athletes lose iron through sweat & training' :
                isPregnant ? 'Critical - prevent maternal anemia' : 
                isBreastfeeding ? 'Return to normal levels' : 'Oxygen transport & energy' 
      },
      { 
        name: 'Magnesium', 
        amount: isHighStress || hasPoorSleep ? 
                (formData.gender === 'male' ? '450-500' : '350-400') : 
                (isPregnant ? '350-400' : 
                (formData.gender === 'male' ? '400-420' : '310-320')), 
        unit: 'mg', 
        reason: isHighStress || hasPoorSleep ? 'Stress management & sleep quality' : 
                isPregnant ? 'Support fetal development' : 'Muscle & nerve function' 
      },
      { 
        name: 'Phosphorus', 
        amount: '700', 
        unit: 'mg', 
        reason: 'Bone health & energy storage' 
      },
      { 
        name: 'Potassium', 
        amount: '3500-4700', 
        unit: 'mg', 
        reason: 'Heart function & blood pressure' 
      },
      { 
        name: 'Sodium', 
        amount: '<2300', 
        unit: 'mg', 
        reason: 'Fluid balance (limit intake)' 
      },
      { 
        name: 'Zinc', 
        amount: hasDigestiveIssues ? (formData.gender === 'male' ? '15-20' : '12-15') : 
                (isVegan || isVegetarian ? (formData.gender === 'male' ? '16-20' : '12-16') :
                (isHighlyActive ? (formData.gender === 'male' ? '15-18' : '12-15') :
                (isPregnant ? '11' : isBreastfeeding ? '12' : 
                (formData.gender === 'male' ? '11' : '8')))), 
        unit: 'mg', 
        reason: hasDigestiveIssues ? 'Higher needs due to absorption issues' : 
                isVegan || isVegetarian ? 'Higher needs - plant sources less absorbable' :
                isHighlyActive ? 'Athletes lose zinc through sweat' :
                isPregnant || isBreastfeeding ? 'Support immune function & development' : 'Immune function & healing' 
      },
    ];

    // Trace Minerals with health-based adjustments
    const traceMinerals = [
      { 
        name: 'Copper', 
        amount: hasAnemia ? '1200-1500' : (isPregnant ? '1000' : '900'), 
        unit: 'mcg', 
        reason: hasAnemia ? 'Support iron absorption' : 
                isPregnant ? 'Support fetal development' : 'Iron metabolism & connective tissue' 
      },
      { 
        name: 'Iodine', 
        amount: hasThyroidIssues ? '100-200' : 
                (isPregnant ? '220' : isBreastfeeding ? '290' : '150'), 
        unit: 'mcg', 
        reason: hasThyroidIssues ? 'Thyroid support (consult doctor)' : 
                isPregnant || isBreastfeeding ? 'Critical for brain development' : 'Thyroid function' 
      },
      { 
        name: 'Manganese', 
        amount: formData.gender === 'male' ? '2.3' : (isPregnant ? '2.0' : isBreastfeeding ? '2.6' : '1.8'), 
        unit: 'mg', 
        reason: isPregnant || isBreastfeeding ? 'Support bone development' : 'Bone formation & metabolism' 
      },
      { 
        name: 'Selenium', 
        amount: hasThyroidIssues ? '70-100' : 
                (formData.geographicRegion === 'europe' ? '70-80' : '55'), 
        unit: 'mcg', 
        reason: hasThyroidIssues ? 'Thyroid antioxidant protection' : 
                formData.geographicRegion === 'europe' ? 'Higher needs due to soil deficiency' : 'Antioxidant & thyroid function' 
      },
      { 
        name: 'Chromium', 
        amount: formData.medicalConditions?.includes('Diabetes') ? '200-400' : 
                (formData.gender === 'male' ? '35' : '25'), 
        unit: 'mcg', 
        reason: formData.medicalConditions?.includes('Diabetes') ? 'Enhanced glucose metabolism' : 'Blood sugar regulation' 
      },
      { 
        name: 'Molybdenum', 
        amount: '45', 
        unit: 'mcg', 
        reason: 'Enzyme function' 
      },
    ];

    // Goal-specific supplements
    const goalSpecific = [];
    if (formData.goal === 'lose_weight') {
      goalSpecific.push(
        { name: 'Green Tea Extract', amount: '300-500', unit: 'mg', reason: 'Metabolism support' },
        { name: 'L-Carnitine', amount: '2-3', unit: 'g', reason: 'Fat metabolism' },
        { name: 'CLA', amount: '3-6', unit: 'g', reason: 'Body composition support' }
      );
    } else if (formData.goal === 'gain_weight') {
      goalSpecific.push(
        { name: 'Creatine Monohydrate', amount: '3-5', unit: 'g', reason: 'Muscle performance & growth' },
        { name: 'Whey Protein', amount: '25-50', unit: 'g', reason: 'Muscle protein synthesis' },
        { name: 'HMB', amount: '3', unit: 'g', reason: 'Muscle preservation & growth' }
      );
    }

    // Activity-specific additions
    if (formData.activityLevel === 'heavy' || formData.activityLevel === 'extreme') {
      goalSpecific.push(
        { name: 'Electrolyte Complex', amount: '1-2', unit: 'servings', reason: 'Hydration & performance' },
        { name: 'Omega-3 (EPA/DHA)', amount: '1-3', unit: 'g', reason: 'Anti-inflammatory support' }
      );
    }

    return {
      essentialVitamins,
      bVitamins,
      essentialMinerals,
      traceMinerals,
      supplements: goalSpecific
    };
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <ScrollView style={styles.fullScrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={[colors.primary, colors.primary + 'CC', colors.primary + '88']}
          style={styles.heroSection}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Your Nutrition Plan</Text>
            <Text style={styles.heroSubtitle}>Personalized & Science-Based</Text>
            
            <View style={styles.caloriesContainer}>
              <View style={styles.caloriesDisplay}>
                <Text style={styles.caloriesNumber}>{Number(currentCalories) || 0}</Text>
                <Text style={styles.caloriesLabel}>calories/day</Text>
              </View>
              
              {formData.goal !== 'maintain' && (
                <View style={styles.goalContainer}>
                  <Text style={styles.goalType}>{getGoalDescription()}</Text>
                  <Text style={styles.goalRate}>
                    {formData.goal === 'lose_weight' ? '-' : '+'}{targetRate.toFixed(1)}kg/week
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.waveContainer}>
            <View style={[styles.wave, { backgroundColor: '#000' }]} />
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Goal Adjustment Slider */}
          {formData.goal !== 'maintain' && (
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
                minimumValue={0.25}
                maximumValue={formData.goal === 'lose_weight' ? 0.75 : 0.5}
                value={targetRate}
                onValueChange={handleSliderChange}
                step={0.05}
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
                    <Text style={[styles.macroValue, { color: '#4CAF50' }]}>{safeProtein}g</Text>
                    <Text style={styles.macroLabel}>Protein</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.macroCircle}>
                <View style={[styles.circleOuter, { borderColor: '#FF9800' }]}>
                  <View style={[styles.circleInner, { backgroundColor: '#FF9800' + '20' }]}>
                    <Ionicons name="flash" size={24} color="#FF9800" />
                    <Text style={[styles.macroValue, { color: '#FF9800' }]}>{safeCarbs}g</Text>
                    <Text style={styles.macroLabel}>Carbs</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.macroCircle}>
                <View style={[styles.circleOuter, { borderColor: '#2196F3' }]}>
                  <View style={[styles.circleInner, { backgroundColor: '#2196F3' + '20' }]}>
                    <Ionicons name="water" size={24} color="#2196F3" />
                    <Text style={[styles.macroValue, { color: '#2196F3' }]}>{safeFat}g</Text>
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
                <Text style={[styles.statValue, { color: colors.primary }]}>{Number(macroResults.bmr) || 0}</Text>
                <Text style={styles.statLabel}>BMR</Text>
                <Text style={styles.statSubtext}>Base Metabolic Rate</Text>
              </LinearGradient>
              
              <LinearGradient
                colors={[colors.primary + '20', colors.primary + '10']}
                style={styles.statCard}
              >
                <Ionicons name="flash" size={28} color={colors.primary} />
                <Text style={[styles.statValue, { color: colors.primary }]}>{Number(macroResults.tdee) || 0}</Text>
                <Text style={styles.statLabel}>TDEE</Text>
                <Text style={styles.statSubtext}>Total Daily Energy</Text>
              </LinearGradient>
            </View>
          </Animatable.View>

          {/* Micronutrients Section */}
          <Animatable.View animation="fadeInUp" delay={350} style={styles.micronutrientsCard}>
            <TouchableOpacity
              style={styles.expandableHeader}
              onPress={() => setMicronutrientsExpanded(!micronutrientsExpanded)}
              activeOpacity={0.8}
            >
              <View style={styles.expandableHeaderContent}>
                <View style={styles.headerLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="nutrition" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.micronutrientTitle}>Micronutrients</Text>
                    <Text style={styles.micronutrientSubtitle}>
                      {micronutrientsExpanded ? 'Tap to collapse' : 'Tap to view recommendations'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.chevronContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons 
                    name={micronutrientsExpanded ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color={colors.primary} 
                  />
                </View>
              </View>
            </TouchableOpacity>

            {micronutrientsExpanded && (
              <Animatable.View animation="slideInDown" duration={300}>
                {(() => {
                  const micronutrients = getRecommendedMicronutrients();
                  return (
                    <View style={styles.micronutrientsContent}>
                      {/* Essential Vitamins */}
                      <View style={styles.microSection}>
                        <Text style={styles.microSectionTitle}>💊 Essential Vitamins</Text>
                        {micronutrients.essentialVitamins.map((item, index) => (
                          <View key={index} style={styles.microItem}>
                            <View style={styles.microItemHeader}>
                              <Text style={styles.microName}>{item.name}</Text>
                              <Text style={styles.microAmount}>{item.amount} {item.unit}</Text>
                            </View>
                            <Text style={styles.microReason}>{item.reason}</Text>
                          </View>
                        ))}
                      </View>

                      {/* B-Complex Vitamins */}
                      <View style={styles.microSection}>
                        <Text style={styles.microSectionTitle}>🧬 B-Complex Vitamins</Text>
                        {micronutrients.bVitamins.map((item, index) => (
                          <View key={index} style={styles.microItem}>
                            <View style={styles.microItemHeader}>
                              <Text style={styles.microName}>{item.name}</Text>
                              <Text style={styles.microAmount}>{item.amount} {item.unit}</Text>
                            </View>
                            <Text style={styles.microReason}>{item.reason}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Essential Minerals */}
                      <View style={styles.microSection}>
                        <Text style={styles.microSectionTitle}>⚡ Essential Minerals</Text>
                        {micronutrients.essentialMinerals.map((item, index) => (
                          <View key={index} style={styles.microItem}>
                            <View style={styles.microItemHeader}>
                              <Text style={styles.microName}>{item.name}</Text>
                              <Text style={styles.microAmount}>{item.amount} {item.unit}</Text>
                            </View>
                            <Text style={styles.microReason}>{item.reason}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Trace Minerals */}
                      <View style={styles.microSection}>
                        <Text style={styles.microSectionTitle}>🔬 Trace Minerals</Text>
                        {micronutrients.traceMinerals.map((item, index) => (
                          <View key={index} style={styles.microItem}>
                            <View style={styles.microItemHeader}>
                              <Text style={styles.microName}>{item.name}</Text>
                              <Text style={styles.microAmount}>{item.amount} {item.unit}</Text>
                            </View>
                            <Text style={styles.microReason}>{item.reason}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Goal-Specific Supplements */}
                      {micronutrients.supplements.length > 0 && (
                        <View style={styles.microSection}>
                          <Text style={styles.microSectionTitle}>
                            🎯 {formData.goal === 'lose_weight' ? 'Weight Loss Support' : 'Muscle Building Support'}
                          </Text>
                          {micronutrients.supplements.map((item, index) => (
                            <View key={index} style={styles.microItem}>
                              <View style={styles.microItemHeader}>
                                <Text style={styles.microName}>{item.name}</Text>
                                <Text style={styles.microAmount}>{item.amount} {item.unit}</Text>
                              </View>
                              <Text style={styles.microReason}>{item.reason}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={styles.microDisclaimer}>
                        <Ionicons name="information-circle" size={16} color="#666" />
                        <Text style={styles.disclaimerText}>
                          These are general recommendations. Consult with a healthcare provider before starting any supplement regimen.
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </Animatable.View>
            )}
          </Animatable.View>

          {/* Bottom Actions */}
          <Animatable.View animation="fadeInUp" delay={400} style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={onSave}
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
              onPress={onRetake}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
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
  micronutrientsCard: {
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  expandableHeader: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  expandableHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  micronutrientTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  micronutrientSubtitle: {
    fontSize: 13,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micronutrientsContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  microSection: {
    marginBottom: 24,
  },
  microSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  microItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  microItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  microName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  microAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  microReason: {
    fontSize: 13,
    color: '#B0B0B0',
    lineHeight: 18,
    fontWeight: '500',
  },
  microDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    fontWeight: '500',
  },
});