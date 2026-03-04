import { Platform } from 'react-native';

// RevenueCat Configuration - Based on working LifeCompass implementation
export const REVENUECAT_CONFIG = {
  // Test Store API Key (for development testing without App Store setup)
  testStore: 'test_axWlVBbeCTMoZdSVmpVTXqORJnq',
  
  // iOS API Key (Apple App Store)
  apple: 'appl_GISpMfUXbUvJLSKcoRrUZPcZWRp',
  
  // Android API Key (Google Play Store) 
  google: 'goog_YOUR_GOOGLE_API_KEY_HERE',
  
  // Entitlement IDs that match your RevenueCat configuration
  entitlements: {
    // Main pro access entitlement (matches your RevenueCat entitlement)
    json_pro: 'JSON Pro',           // Your entitlement identifier
    nutrition_access: 'nutrition_access', // Nutrition-specific entitlement
  },

  // Offering IDs (Test Store uses 'default', production uses your custom IDs)
  offerings: {
    lifetime_pro: __DEV__ ? 'default' : 'lifetime_pro',   // Test Store uses 'default'
  },

  // Package IDs within offerings (Test Store has built-in packages)
  packages: {
    lifetime_pro_tier_1: __DEV__ ? '$rc_lifetime' : 'lifetime_pro_tier_1', // Test Store package
  },
  
  // Debug mode
  debugMode: __DEV__,
};

// Product configuration for easier reference
export const PRODUCT_CONFIG = {
  lifetime_pro_tier_1: {
    packageId: REVENUECAT_CONFIG.packages.lifetime_pro_tier_1,
    title: 'Nutrition Pro',
    description: 'One-time purchase for lifetime access to AI nutrition planning',
    entitlements: [REVENUECAT_CONFIG.entitlements.nutrition_access],
    features: [
      'AI Macro Engine',
      'Smart Grocery Lists',
      'Meal Prep Blueprints',
      'Sleep-Synced Timing',
      'Skill-Adaptive Recipes',
      'Pantry Intelligence',
    ],
    price: '$9.99',
    originalPrice: '$79.99',
  },
};

// Helper to check if user has specific entitlement
export const hasEntitlement = (customerInfo: any, entitlementKey: string): boolean => {
  if (!customerInfo?.entitlements?.active) return false;
  return customerInfo.entitlements.active[entitlementKey]?.isActive === true;
};

// Helper to check if user has JSON Pro access
export const hasJSONProAccess = (customerInfo: any): boolean => {
  return hasEntitlement(customerInfo, REVENUECAT_CONFIG.entitlements.json_pro);
};

// Helper to check if user has nutrition access
export const hasNutritionAccess = (customerInfo: any): boolean => {
  return hasEntitlement(customerInfo, REVENUECAT_CONFIG.entitlements.nutrition_access);
};

// Helper to get the appropriate API key based on environment
export const getRevenueCatAPIKey = (): string => {
  // In development, use Test Store for testing
  if (__DEV__) {
    console.log('[RevenueCat] Using Test Store for development testing');
    return REVENUECAT_CONFIG.testStore;
  }
  
  // In production, use platform-specific keys
  if (Platform.OS === 'ios') {
    console.log('[RevenueCat] Using Apple App Store API key for production');
    return REVENUECAT_CONFIG.apple;
  } else if (Platform.OS === 'android') {
    return REVENUECAT_CONFIG.google;
  }
  
  // Fallback to iOS key
  return REVENUECAT_CONFIG.apple;
};