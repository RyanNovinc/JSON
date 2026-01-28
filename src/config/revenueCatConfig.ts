// RevenueCat Configuration - Based on working LifeCompass implementation
export const REVENUECAT_CONFIG = {
  // iOS API Key (Apple App Store)
  apple: 'appl_GISpMfUXbUvJLSKcoRrUZPcZWRp',
  
  // Android API Key (Google Play Store) 
  google: 'goog_YOUR_GOOGLE_API_KEY_HERE',
  
  // Entitlement IDs that match your RevenueCat configuration
  entitlements: {
    // Main pro access entitlement (matches your RevenueCat entitlement)
    json_pro: 'JSON Pro',           // Your entitlement identifier
  },

  // Offering IDs (these match what you created in RevenueCat)
  offerings: {
    lifetime_pro: 'lifetime_pro',   // Your offering identifier
  },

  // Package IDs within offerings (these need to match what you set up in RevenueCat)
  packages: {
    lifetime_pro_tier_1: 'lifetime_pro_tier_1', // Your package identifier
  },
  
  // Debug mode
  debugMode: __DEV__,
};

// Product configuration for easier reference
export const PRODUCT_CONFIG = {
  lifetime_pro_tier_1: {
    packageId: REVENUECAT_CONFIG.packages.lifetime_pro_tier_1,
    title: 'Lifetime Access',
    description: 'One-time purchase for unlimited access to all premium features',
    entitlements: [REVENUECAT_CONFIG.entitlements.json_pro],
    features: [
      'Unlimited workout routines',
      'Advanced analytics', 
      'Cloud sync',
      'Lifetime updates',
    ],
    price: '$29.99',
    originalPrice: '$49.99',
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