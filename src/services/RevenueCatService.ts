import Purchases, { 
  CustomerInfo, 
  PurchasesOffering, 
  PurchasesPackage,
  LOG_LEVEL,
  PurchasesError,
  PURCHASES_ERROR_CODE
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { REVENUECAT_CONFIG, hasJSONProAccess, getRevenueCatAPIKey } from '../config/revenueCatConfig';

interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
  userCancelled?: boolean;
  productIdentifier?: string;
  transaction?: any;
  errorCode?: string;
}

interface RestoreResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
  restoredCount: number;
}

class RevenueCatService {
  private static instance: RevenueCatService;
  private isConfigured = false;
  private customerInfoUpdateCallbacks: Array<(customerInfo: CustomerInfo) => void> = [];
  private offerings: any = null;
  private customerInfo: CustomerInfo | null = null;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  /**
   * Configure RevenueCat SDK - Based on working LifeCompass implementation
   */
  async configure(userId?: string): Promise<void> {
    try {
      if (this.isConfigured) {
        console.warn('[RevenueCat] Already configured, skipping...');
        return;
      }

      // Set log level before configuration
      if (!__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.ERROR); // Only show errors in production
      } else {
        Purchases.setLogLevel(LOG_LEVEL.INFO); // Show important info in development
      }

      // Get the appropriate API key based on environment
      const apiKey = getRevenueCatAPIKey();
      console.log(`[RevenueCat] Using API key: ${apiKey.substring(0, 8)}... (${__DEV__ ? 'Test Store' : 'Production'})`);
      console.log(`[RevenueCat] Full API key for debugging: ${apiKey}`);
      
      // Configure SDK with LifeCompass-proven settings
      const config = {
        apiKey: apiKey,
        appUserID: userId || undefined,
        observerMode: false,
        userDefaultsSuiteName: undefined,
        usesStoreKit2IfAvailable: true, // CRITICAL: Prevents hanging promises from StoreKit 1 bugs
        dangerouslyAllowSharingAppUserIDToExternalServices: false
      };

      await Purchases.configure(config);

      // Log in user if userId provided
      if (userId) {
        try {
          const { customerInfo } = await Purchases.logIn(userId);
          this.customerInfo = customerInfo;
          // Update customer info through callbacks
          this.customerInfoUpdateCallbacks.forEach(callback => callback(customerInfo));
        } catch (loginError) {
          console.log('[RevenueCat] Login failed, continuing with anonymous user:', loginError);
        }
      }

      // Set up customer info update listener
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        console.log('[RevenueCat] Customer info updated:', {
          userId: customerInfo.originalAppUserId,
          hasJSONPro: hasJSONProAccess(customerInfo),
          activeEntitlements: Object.keys(customerInfo.entitlements.active),
        });
        
        // Store customer info
        this.customerInfo = customerInfo;
        
        // Notify all callbacks
        this.customerInfoUpdateCallbacks.forEach(callback => callback(customerInfo));
      });

      this.isConfigured = true;
      console.log('[RevenueCat] Successfully configured');
      
      // Load initial data
      await this.refreshCustomerInfo();
      await this.loadOfferings();
      
      // CRITICAL: Auto-restore purchases on app start to fix entitlement persistence
      // This fixes the issue where entitlements don't persist across app reloads
      if (__DEV__) {
        console.log('[RevenueCat] Auto-restoring purchases for Test Store...');
        try {
          await this.restorePurchases();
          console.log('[RevenueCat] Auto-restore completed successfully');
        } catch (restoreError) {
          console.log('[RevenueCat] Auto-restore failed (this is normal if no purchases exist):', restoreError);
        }
      }
      
    } catch (error) {
      console.error('[RevenueCat] Configuration failed:', error);
      
      // In development, log the error but don't throw - Test Store should work
      if (__DEV__) {
        console.log('🔧 [RevenueCat] Configuration failed in development mode');
        console.log('❗ Error details:', error);
        console.log('💡 This may be due to Test Store API key issues or network connectivity');
        
        // Set configured to false but allow app to continue
        this.isConfigured = false;
        return; // Exit gracefully to allow app functionality
      }
      
      this.isConfigured = false;
      throw error;
    }
  }

  async refreshCustomerInfo(): Promise<void> {
    try {
      if (!this.isConfigured || !Purchases) return;
      
      // CRITICAL: Invalidate cache to ensure fresh entitlements data
      // This fixes entitlement persistence issues across app reloads
      await Purchases.invalidateCustomerInfoCache();
      
      this.customerInfo = await Purchases.getCustomerInfo();
      this.customerInfoUpdateCallbacks.forEach(callback => callback(this.customerInfo));
    } catch (error) {
      console.error('[RevenueCat] Failed to refresh customer info:', error);
    }
  }

  async loadOfferings() {
    try {
      if (!this.isConfigured || !Purchases) {
        console.warn('⚠️ [RevenueCat] Not configured, skipping offerings load');
        return null;
      }
      
      console.log('🔄 [RevenueCat] Loading offerings...');
      this.offerings = await Purchases.getOfferings();
      console.log('✅ [RevenueCat] Offerings loaded:', Object.keys(this.offerings.all).length);
      return this.offerings;
    } catch (error) {
      console.error('❌ [RevenueCat] Failed to load offerings:', error);
      return null;
    }
  }

  /**
   * Subscribe to customer info updates
   */
  subscribeToCustomerInfoUpdates(callback: (customerInfo: CustomerInfo) => void): () => void {
    this.customerInfoUpdateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.customerInfoUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.customerInfoUpdateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current customer info
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('[RevenueCat] Retrieved customer info:', {
        userId: customerInfo.originalAppUserId,
        hasJSONPro: hasJSONProAccess(customerInfo),
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
      });
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Failed to get customer info:', error);
      throw error;
    }
  }

  /**
   * Get available offerings
   */
  async getOfferings(): Promise<PurchasesOffering[]> {
    try {
      const offerings = await Purchases.getOfferings();
      console.log('[RevenueCat] Retrieved offerings:', {
        current: offerings.current?.identifier,
        all: Object.keys(offerings.all),
      });
      
      // Debug: Log all available packages in each offering
      if (__DEV__) {
        Object.entries(offerings.all).forEach(([offeringId, offering]) => {
          console.log(`[RevenueCat] Offering "${offeringId}" packages:`, 
            offering.availablePackages.map(pkg => ({
              id: pkg.identifier,
              productId: pkg.product.identifier,
              price: pkg.product.priceString
            }))
          );
        });
      }
      
      return Object.values(offerings.all);
    } catch (error) {
      console.error('[RevenueCat] Failed to get offerings:', error);
      throw error;
    }
  }

  /**
   * Get current offering (default offering)
   */
  async getCurrentOffering(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('[RevenueCat] Failed to get current offering:', error);
      throw error;
    }
  }

  /**
   * Purchase a package - Based on working LifeCompass implementation with timeout protection
   */
  async purchasePackage(offeringId: string, packageId: string): Promise<PurchaseResult> {
    try {
      console.log('[RevenueCat] Purchasing package:', `${offeringId}.${packageId}`);
      
      if (!this.isConfigured) {
        // In development mode, provide helpful error message
        if (__DEV__) {
          throw new Error('RevenueCat configuration failed. Check your Test Store API key and network connection.');
        }
        throw new Error('RevenueCat not configured. Please sign in with Apple ID first.');
      }

      if (!this.isConfigured || !Purchases) {
        return {
          success: false,
          error: 'RevenueCat not available'
        };
      }

      // Load offerings if not cached (LifeCompass pattern)
      if (!this.offerings) {
        await this.loadOfferings();
      }

      // Get the specific package from offering
      const offering = this.offerings.all[offeringId];
      if (!offering) {
        console.error('Available offerings:', Object.keys(this.offerings.all));
        throw new Error(`Offering ${offeringId} not found`);
      }

      const packageToPurchase = offering.availablePackages.find(pkg => pkg.identifier === packageId);
      
      if (!packageToPurchase) {
        console.error('Available packages:', offering.availablePackages.map(p => p.identifier));
        throw new Error(`Package ${packageId} not found in offering ${offeringId}`);
      }

      // CRITICAL: Validate package data before purchase (prevents silent failures)
      if (!packageToPurchase.product || !packageToPurchase.product.identifier) {
        console.error('Invalid package data:', packageToPurchase);
        throw new Error('Invalid product data in package - possible configuration issue');
      }

      // Warn if price data missing (indicates store configuration issue)
      if (!packageToPurchase.product.priceString || packageToPurchase.product.price === undefined) {
        console.warn('⚠️ Price data missing - possible App Store Connect issue');
      }

      console.log('✅ Package validated, proceeding with purchase:', packageToPurchase.product.identifier);
      
      // Debug: Log product type and configuration details
      console.log('🔍 [DEBUG] Product Details:', {
        identifier: packageToPurchase.product.identifier,
        title: packageToPurchase.product.title,
        price: packageToPurchase.product.priceString,
        productType: packageToPurchase.product.productType,
        packageType: packageToPurchase.packageType
      });

      // Add timeout wrapper to prevent hanging promises (StoreKit 1 bug)
      const purchasePromise = Purchases.purchasePackage(packageToPurchase);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Purchase timeout - possible StoreKit issue')), 60000)
      );

      const purchaseResult = await Promise.race([purchasePromise, timeoutPromise]);
      
      console.log('✅ [RevenueCat] Purchase successful:', packageId);
      
      // Update stored customer info
      this.customerInfo = purchaseResult.customerInfo;
      this.customerInfoUpdateCallbacks.forEach(callback => callback(purchaseResult.customerInfo));

      // CRITICAL FIX: Run post-purchase operations in background
      // This prevents post-purchase failures from marking successful purchases as failed
      setTimeout(async () => {
        try {
          console.log('🔄 [RevenueCat] Running post-purchase operations...');
          
          // Refresh customer info to ensure entitlements are updated
          await this.refreshCustomerInfo();
          
          console.log('✅ [RevenueCat] Post-purchase operations complete');
        } catch (postPurchaseError) {
          console.warn('⚠️ [RevenueCat] Post-purchase operations failed (purchase still successful):', postPurchaseError);
        }
      }, 100);

      return {
        success: true,
        customerInfo: purchaseResult.customerInfo,
        productIdentifier: purchaseResult.productIdentifier,
        transaction: purchaseResult.transaction
      };
      
    } catch (error: any) {
      console.error('❌ [RevenueCat] Purchase failed:', error);
      
      // Handle user cancelled purchase
      if (error.userCancelled) {
        return { success: false, userCancelled: true };
      }
      
      return { 
        success: false, 
        error: error.message,
        errorCode: error.code 
      };
    }
  }

  /**
   * Purchase a product by ID
   */
  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    try {
      const offering = await this.getCurrentOffering();
      if (!offering) {
        throw new Error('No offering available');
      }
      
      const packageToPurchase = offering.availablePackages.find(
        pkg => pkg.product.identifier === productId
      );
      
      if (!packageToPurchase) {
        throw new Error(`Product ${productId} not found in current offering`);
      }
      
      // CRITICAL FIX: Call purchasePackage with correct parameters (offering.identifier, package.identifier)
      return await this.purchasePackage(offering.identifier, packageToPurchase.identifier);
    } catch (error: any) {
      console.error('[RevenueCat] Purchase product failed:', error);
      return {
        success: false,
        error: error.message || 'Purchase failed',
      };
    }
  }

  /**
   * Restore purchases
   */
  async restorePurchases(): Promise<RestoreResult> {
    try {
      console.log('[RevenueCat] Starting restore purchases...');
      
      const customerInfo = await Purchases.restorePurchases();
      const activeEntitlements = Object.keys(customerInfo.entitlements.active);
      const restoredCount = activeEntitlements.length;
      
      console.log('[RevenueCat] Restore completed:', {
        userId: customerInfo.originalAppUserId,
        restoredCount,
        activeEntitlements,
        hasJSONPro: hasJSONProAccess(customerInfo),
      });

      return {
        success: true,
        customerInfo,
        restoredCount,
      };
      
    } catch (error: any) {
      console.error('[RevenueCat] Restore failed:', error);
      return {
        success: false,
        error: error.message || 'Restore failed',
        restoredCount: 0,
      };
    }
  }

  /**
   * Check if user has specific entitlement
   */
  async hasEntitlement(entitlementId: string): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return customerInfo.entitlements.active[entitlementId]?.isActive === true;
    } catch (error) {
      console.error('[RevenueCat] Failed to check entitlement:', error);
      return false;
    }
  }

  /**
   * Check if user has JSON Pro access
   */
  async hasJSONProAccess(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return hasJSONProAccess(customerInfo);
    } catch (error) {
      console.error('[RevenueCat] Failed to check JSON Pro access:', error);
      return false;
    }
  }

  /**
   * Get user ID
   */
  async getUserId(): Promise<string> {
    try {
      const customerInfo = await this.getCustomerInfo();
      return customerInfo.originalAppUserId;
    } catch (error) {
      console.error('[RevenueCat] Failed to get user ID:', error);
      throw error;
    }
  }

  /**
   * Set custom user attributes (for analytics and targeting)
   */
  async setAttributes(attributes: { [key: string]: string | null }): Promise<void> {
    try {
      await Purchases.setAttributes(attributes);
      console.log('[RevenueCat] Attributes set:', attributes);
    } catch (error) {
      console.error('[RevenueCat] Failed to set attributes:', error);
      throw error;
    }
  }

  /**
   * Log in user with custom ID
   */
  async loginUser(userId: string): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.logIn(userId);
      console.log('[RevenueCat] User logged in:', {
        userId: customerInfo.originalAppUserId,
        hasJSONPro: hasJSONProAccess(customerInfo),
      });
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Login failed:', error);
      throw error;
    }
  }

  /**
   * Log out current user
   */
  async logoutUser(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.logOut();
      console.log('[RevenueCat] User logged out');
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Logout failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default RevenueCatService.getInstance();