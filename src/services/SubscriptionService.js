// src/services/SubscriptionService.js

import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

// Replace with your RevenueCat API keys
const REVENUECAT_API_KEY_IOS = 'your_ios_api_key_here';
const REVENUECAT_API_KEY_ANDROID = 'your_android_api_key_here';

// Replace with your product identifiers from App Store Connect / Google Play Console
export const SUBSCRIPTION_PRODUCTS = {
  // Example product IDs - replace with your actual ones
  MONTHLY_PREMIUM: 'your_monthly_product_id',
  YEARLY_PREMIUM: 'your_yearly_product_id',
  LIFETIME_PREMIUM: 'your_lifetime_product_id',
};

// Feature access configuration
export const PREMIUM_FEATURES = {
  PREMIUM_FEATURE_1: 'premium_feature_1',
  PREMIUM_FEATURE_2: 'premium_feature_2',
  // Add your premium features here
};

// Free plan limits
export const FREE_PLAN_LIMITS = {
  MAX_ITEMS: 5,
  MAX_DAILY_ACTIONS: 10,
  // Add your free plan limits here
};

class SubscriptionService {
  constructor() {
    this.isInitialized = false;
    this.customerInfo = null;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (Platform.OS === 'ios') {
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });
      } else {
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY_ANDROID });
      }
      
      this.isInitialized = true;
      console.log('RevenueCat initialized successfully');
      
      // Get initial customer info
      await this.refreshCustomerInfo();
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    }
  }

  async refreshCustomerInfo() {
    try {
      this.customerInfo = await Purchases.getCustomerInfo();
      return this.customerInfo;
    } catch (error) {
      console.error('Failed to get customer info:', error);
      return null;
    }
  }

  async getOfferings() {
    try {
      return await Purchases.getOfferings();
    } catch (error) {
      console.error('Failed to get offerings:', error);
      return null;
    }
  }

  async purchasePackage(packageToPurchase) {
    try {
      const purchaseResult = await Purchases.purchasePackage(packageToPurchase);
      await this.refreshCustomerInfo();
      return purchaseResult;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  async restorePurchases() {
    try {
      const customerInfo = await Purchases.restorePurchases();
      this.customerInfo = customerInfo;
      return customerInfo;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      throw error;
    }
  }

  isPremiumActive() {
    if (!this.customerInfo) return false;
    return this.customerInfo.activeSubscriptions.length > 0;
  }

  hasFeatureAccess(featureId) {
    // If user has premium, they have access to all features
    if (this.isPremiumActive()) {
      return true;
    }

    // Add your free tier feature logic here
    return false;
  }

  async setUserId(userId) {
    try {
      await Purchases.logIn(userId);
      await this.refreshCustomerInfo();
    } catch (error) {
      console.error('Failed to set user ID:', error);
    }
  }

  async logOut() {
    try {
      await Purchases.logOut();
      this.customerInfo = null;
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }
}

export default new SubscriptionService();