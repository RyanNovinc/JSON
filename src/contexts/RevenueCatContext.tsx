import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  ReactNode 
} from 'react';
import { Alert } from 'react-native';
import { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import RevenueCatService from '../services/RevenueCatService';
import { hasJSONProAccess, REVENUECAT_CONFIG } from '../config/revenueCatConfig';

interface RevenueCatContextType {
  // Customer Info
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  hasJSONPro: boolean;
  isConfigured: boolean;

  // Offerings
  offerings: PurchasesOffering[];
  currentOffering: PurchasesOffering | null;

  // Actions
  refreshCustomerInfo: () => Promise<void>;
  purchasePackage: (offeringId: string, packageId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  grantFreeAccess: () => Promise<boolean>;
  
  // Error state
  error: string | null;
  clearError: () => void;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

interface RevenueCatProviderProps {
  children: ReactNode;
  userId?: string;
  autoInitialize?: boolean;
}

export const RevenueCatProvider: React.FC<RevenueCatProviderProps> = ({ 
  children, 
  userId,
  autoInitialize = true 
}) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values
  const hasJSONPro = customerInfo ? hasJSONProAccess(customerInfo) : false;

  /**
   * Initialize RevenueCat SDK
   */
  const initializeRevenueCat = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[RevenueCatContext] Initializing RevenueCat...');
      
      // Configure SDK
      await RevenueCatService.configure(userId);
      setIsConfigured(true);

      // Subscribe to customer info updates
      const unsubscribe = RevenueCatService.subscribeToCustomerInfoUpdates((info) => {
        console.log('[RevenueCatContext] Customer info updated from listener');
        setCustomerInfo(info);
      });

      // Get initial customer info
      const info = await RevenueCatService.getCustomerInfo();
      setCustomerInfo(info);

      // Get offerings
      const allOfferings = await RevenueCatService.getOfferings();
      const current = await RevenueCatService.getCurrentOffering();
      setOfferings(allOfferings);
      setCurrentOffering(current);

      console.log('[RevenueCatContext] RevenueCat initialized successfully');

      // Return cleanup function
      return unsubscribe;
      
    } catch (err: any) {
      console.error('[RevenueCatContext] Failed to initialize RevenueCat:', err);
      setError(err.message || 'Failed to initialize RevenueCat');
      
      // Set mock data so app doesn't hang
      setIsConfigured(true);
      setCustomerInfo(null);
      setOfferings([]);
      setCurrentOffering(null);
      
      // Return empty cleanup function
      return () => {};
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Refresh customer info
   */
  const refreshCustomerInfo = useCallback(async () => {
    try {
      setError(null);
      const info = await RevenueCatService.getCustomerInfo();
      setCustomerInfo(info);
      console.log('[RevenueCatContext] Customer info refreshed');
    } catch (err: any) {
      console.error('[RevenueCatContext] Failed to refresh customer info:', err);
      setError(err.message || 'Failed to refresh customer info');
    }
  }, []);

  /**
   * Purchase a package using LifeCompass-proven method
   */
  const purchasePackage = useCallback(async (offeringId: string, packageId: string): Promise<boolean> => {
    try {
      setError(null);
      
      const result = await RevenueCatService.purchasePackage(offeringId, packageId);
      
      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
        console.log('[RevenueCatContext] Purchase successful');
        return true;
      } else if (result.userCancelled) {
        console.log('[RevenueCatContext] Purchase cancelled by user');
        return false;
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
      
    } catch (err: any) {
      console.error('[RevenueCatContext] Purchase failed:', err);
      setError(err.message || 'Purchase failed');
      
      // Show user-friendly error
      Alert.alert(
        'Purchase Failed',
        'We encountered an issue processing your purchase. Please try again.',
        [{ text: 'OK' }]
      );
      
      return false;
    }
  }, []);

  /**
   * Restore purchases
   */
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      
      const result = await RevenueCatService.restorePurchases();
      
      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
        
        if (result.restoredCount > 0) {
          Alert.alert(
            'Purchases Restored',
            `Successfully restored ${result.restoredCount} purchase${result.restoredCount === 1 ? '' : 's'}.`,
            [{ text: 'OK' }]
          );
          console.log('[RevenueCatContext] Purchases restored successfully');
          return true;
        } else {
          Alert.alert(
            'No Purchases Found',
            'No previous purchases were found to restore.',
            [{ text: 'OK' }]
          );
          return false;
        }
      } else {
        throw new Error(result.error || 'Restore failed');
      }
      
    } catch (err: any) {
      console.error('[RevenueCatContext] Restore failed:', err);
      setError(err.message || 'Restore failed');
      
      Alert.alert(
        'Restore Failed',
        'We encountered an issue restoring your purchases. Please try again.',
        [{ text: 'OK' }]
      );
      
      return false;
    }
  }, []);

  /**
   * Grant free access (for promotional periods)
   */
  const grantFreeAccess = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      
      // For free promotion, we'll create a mock customer info with active entitlements
      // In a real production app, you'd handle this server-side or with promotional codes
      const mockCustomerInfo = {
        originalAppUserId: customerInfo?.originalAppUserId || 'free_user',
        entitlements: {
          active: {
            [REVENUECAT_CONFIG.entitlements.JSON_PRO]: {
              isActive: true,
              willRenew: false,
              periodType: 'lifetime',
              latestPurchaseDate: new Date().toISOString(),
              originalPurchaseDate: new Date().toISOString(),
            }
          }
        },
        nonSubscriptionTransactions: [],
        originalPurchaseDate: new Date().toISOString(),
        latestExpirationDate: null,
      };
      
      setCustomerInfo(mockCustomerInfo as any);
      console.log('[RevenueCatContext] Free access granted');
      return true;
      
    } catch (err: any) {
      console.error('[RevenueCatContext] Failed to grant free access:', err);
      setError(err.message || 'Failed to grant free access');
      return false;
    }
  }, [customerInfo]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (autoInitialize) {
      let cleanup: (() => void) | undefined;

      initializeRevenueCat().then((unsubscribe) => {
        cleanup = unsubscribe;
      });

      return () => {
        if (cleanup) {
          cleanup();
        }
      };
    }
  }, [autoInitialize, initializeRevenueCat]);

  // Log state changes for debugging
  useEffect(() => {
    if (REVENUECAT_CONFIG.debugMode) {
      console.log('[RevenueCatContext] State updated:', {
        isConfigured,
        hasJSONPro,
        isLoading,
        hasCustomerInfo: !!customerInfo,
        offeringsCount: offerings.length,
        hasCurrentOffering: !!currentOffering,
        error,
      });
    }
  }, [isConfigured, hasJSONPro, isLoading, customerInfo, offerings, currentOffering, error]);

  const contextValue: RevenueCatContextType = {
    customerInfo,
    isLoading,
    hasJSONPro,
    isConfigured,
    offerings,
    currentOffering,
    refreshCustomerInfo,
    purchasePackage,
    restorePurchases,
    grantFreeAccess,
    error,
    clearError,
  };

  return (
    <RevenueCatContext.Provider value={contextValue}>
      {children}
    </RevenueCatContext.Provider>
  );
};

/**
 * Hook to use RevenueCat context
 */
export const useRevenueCat = (): RevenueCatContextType => {
  const context = useContext(RevenueCatContext);
  
  if (context === undefined) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  
  return context;
};

/**
 * Hook to check if user has JSON Pro access
 */
export const useHasJSONPro = (): boolean => {
  const { hasJSONPro } = useRevenueCat();
  return hasJSONPro;
};

/**
 * Hook to get customer info
 */
export const useCustomerInfo = (): CustomerInfo | null => {
  const { customerInfo } = useRevenueCat();
  return customerInfo;
};