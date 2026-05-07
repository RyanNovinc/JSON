import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Share,
  Animated,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage, MealPlan } from '../utils/storage';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { createShare, ShareError } from '../services/shareService';

type MyMealPlansNavigationProp = StackNavigationProp<RootStackParamList, 'MyMealPlans'>;

interface ShareModalState {
  visible: boolean;
  mealPlan: MealPlan | null;
  isGenerating: boolean;
  qrCode: string | null;
  shareUrl: string | null;
  error: string | null;
  isAnimating: boolean;
}

export default function MyMealPlansScreen() {
  const { themeColor } = useTheme();
  const navigation = useNavigation<MyMealPlansNavigationProp>();
  const [userMealPlans, setUserMealPlans] = useState<MealPlan[]>([]);
  const [shareModal, setShareModal] = useState<ShareModalState>({
    visible: false,
    mealPlan: null,
    isGenerating: false,
    qrCode: null,
    shareUrl: null,
    error: null,
    isAnimating: false,
  });
  
  const modalOpacity = useRef(new Animated.Value(0)).current;

  // Animation functions
  const showModal = (mealPlan: MealPlan) => {
    setShareModal(prev => ({
      ...prev,
      visible: true,
      mealPlan,
      isGenerating: true,
      qrCode: null,
      shareUrl: null,
      error: null,
      isAnimating: true,
    }));

    modalOpacity.setValue(0);
    Animated.timing(modalOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShareModal(prev => ({ ...prev, isAnimating: false }));
    });
  };

  const hideModal = () => {
    setShareModal(prev => ({ ...prev, isAnimating: true }));
    
    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShareModal({
        visible: false,
        mealPlan: null,
        isGenerating: false,
        qrCode: null,
        shareUrl: null,
        error: null,
        isAnimating: false,
      });
    });
  };

  // Load user meal plans when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadUserMealPlans();
    }, [])
  );

  const loadUserMealPlans = async () => {
    const savedPlans = await WorkoutStorage.loadMealPlans();
    console.log('📱 My Meal Plans loading:', savedPlans.length, 'saved plans');
    setUserMealPlans(savedPlans);
  };

  const handleDeleteMealPlan = (planId: string, planName: string) => {
    Alert.alert(
      'Delete Meal Plan',
      `Are you sure you want to delete "${planName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ Deleting saved meal plan:', planName, 'ID:', planId);
            await WorkoutStorage.removeMealPlan(planId);
            loadUserMealPlans();
            console.log('🗑️ Meal plan deleted from My Collection');
          }
        }
      ]
    );
  };

  const handleShareMealPlan = async (plan: MealPlan) => {
    showModal(plan);

    try {
      // Prepare meal plan data for sharing
      const completeExport = {
        mealPlanData: plan.data
      };
      
      // Create universal link
      const shareResult = await createShare(completeExport);
      
      setShareModal(prev => ({ 
        ...prev, 
        qrCode: shareResult.shareUrl,
        shareUrl: shareResult.shareUrl,
        isGenerating: false,
        error: null,
      }));
      
    } catch (error) {
      let errorMessage = 'Failed to create share link';
      if (error instanceof ShareError) {
        switch (error.code) {
          case 'TOO_LARGE':
            errorMessage = 'Meal plan is too large to share';
            break;
          case 'NETWORK_ERROR':
            errorMessage = 'Check your internet connection';
            break;
          default:
            errorMessage = error.message;
        }
      }
      
      setShareModal(prev => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
      }));
    }
  };

  const handleCloseShareModal = () => {
    hideModal();
  };

  const handleShareViaApps = async () => {
    if (!shareModal.shareUrl) return;
    
    try {
      await Share.share({
        message: `Check out this meal plan: ${shareModal.shareUrl}`,
        url: shareModal.shareUrl,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.simpleHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Meal Plans</Text>
          <View style={styles.placeholder} />
        </View>

        {/* User Meal Plans */}
        {userMealPlans.length === 0 ? (
          <View style={styles.emptyStateCenter}>
            <Ionicons name="heart-outline" size={64} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyTitle}>No Favourites Yet</Text>
            <Text style={styles.emptyDescription}>
              Long press a meal plan and add it to favourites to see it here
            </Text>
          </View>
        ) : (
          userMealPlans.map((plan, index) => (
            <View key={plan.id} style={styles.cardContainer}>
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => handleShareMealPlan(plan)}
              >
                <View style={styles.userMealGradient}>
                  <View style={styles.userMealHeader}>
                    <Text style={styles.userMealTitle}>{plan.name}</Text>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteMealPlan(plan.id, plan.name)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.userMealSubtitle}>Custom meal plan</Text>
                  <View style={styles.userMealDetails}>
                    <Text style={styles.userMealText}>Tap to share via QR or link</Text>
                  </View>
                </View>
                
              </TouchableOpacity>
            </View>
          ))
        )}

      </ScrollView>
      
      {/* Share Modal */}
      <Modal
        visible={shareModal.visible}
        transparent
        animationType="none"
        onRequestClose={handleCloseShareModal}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: modalOpacity }]}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleCloseShareModal}
          />
          
          <View style={[styles.modalContainer, { borderColor: themeColor }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share your meal plan</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleCloseShareModal}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color="#a1a1aa" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.modalContent}>
              {shareModal.mealPlan && (
                <Text style={[styles.modalSubtitle, { color: themeColor }]}>
                  {shareModal.mealPlan.name.toUpperCase()}
                </Text>
              )}
              
              {/* QR Code Section */}
              {shareModal.isGenerating ? (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodePlaceholder}>
                    <ActivityIndicator size="large" color={themeColor} />
                    <Text style={styles.qrCodeLoadingText}>Generating QR code...</Text>
                  </View>
                </View>
              ) : shareModal.error ? (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodePlaceholder}>
                    <Ionicons name="warning" size={32} color="#ef4444" />
                    <Text style={styles.errorText}>{shareModal.error}</Text>
                  </View>
                </View>
              ) : shareModal.qrCode ? (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={shareModal.qrCode}
                      size={240}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>
                  <Text style={styles.qrCodeCaption}>Scan to import in JSON.fit</Text>
                </View>
              ) : null}

              {/* Share Button */}
              {shareModal.shareUrl && !shareModal.error && (
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: themeColor }]}
                  onPress={handleShareViaApps}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share" size={20} color="#0a0a0b" />
                  <Text style={styles.shareButtonText}>Send link / Share via apps</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <Text style={styles.footerText}>Link expires in 7 days</Text>
            </View>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  simpleHeader: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // User meal plan card styles
  cardContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  card: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  userMealGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  userMealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userMealTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  userMealSubtitle: {
    fontSize: 16,
    color: '#e4e4e7',
    marginBottom: 12,
  },
  userMealDetails: {
    marginTop: 'auto',
  },
  userMealText: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  bottomText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 2,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrCodeWrapper: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrCodePlaceholder: {
    width: 272,
    height: 272,
    backgroundColor: '#27272a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3f3f46',
  },
  qrCodeLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
  },
  qrCodeCaption: {
    marginTop: 16,
    fontSize: 14,
    color: '#71717a',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    lineHeight: 20,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a0b',
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#71717a',
  },
});