import { useMemo } from 'react';
import { useRevenueCat } from '../contexts/RevenueCatContext';
import { REVENUECAT_CONFIG } from '../config/revenueCatConfig';

interface JSONProStatus {
  hasAccess: boolean;
  isLoading: boolean;
  customerInfo: any;
  error: string | null;
}

/**
 * Hook to check if user has JSON Pro access
 * Returns loading state, access status, and customer info
 */
export const useJSONPro = (): JSONProStatus => {
  const { 
    customerInfo, 
    isLoading, 
    hasJSONPro, 
    error 
  } = useRevenueCat();

  const status = useMemo(() => {
    return {
      hasAccess: hasJSONPro,
      isLoading,
      customerInfo,
      error,
    };
  }, [hasJSONPro, isLoading, customerInfo, error]);

  return status;
};

/**
 * Hook to check specific entitlements
 */
export const useEntitlement = (entitlementId: string): boolean => {
  const { customerInfo } = useRevenueCat();

  return useMemo(() => {
    if (!customerInfo?.entitlements?.active) {
      return false;
    }
    
    const entitlement = customerInfo.entitlements.active[entitlementId];
    return entitlement?.isActive === true;
  }, [customerInfo, entitlementId]);
};

/**
 * Hook to get all active entitlements
 */
export const useActiveEntitlements = (): string[] => {
  const { customerInfo } = useRevenueCat();

  return useMemo(() => {
    if (!customerInfo?.entitlements?.active) {
      return [];
    }
    
    return Object.keys(customerInfo.entitlements.active).filter(
      (entitlementId) => customerInfo.entitlements.active[entitlementId]?.isActive === true
    );
  }, [customerInfo]);
};

/**
 * Hook to get customer purchase history and metadata
 */
export const useCustomerPurchaseInfo = () => {
  const { customerInfo } = useRevenueCat();

  return useMemo(() => {
    if (!customerInfo) {
      return {
        originalPurchaseDate: null,
        latestPurchaseDate: null,
        nonSubscriptionTransactions: [],
        subscriptions: {},
        userId: null,
      };
    }

    return {
      originalPurchaseDate: customerInfo.originalPurchaseDate,
      latestPurchaseDate: customerInfo.latestExpirationDate,
      nonSubscriptionTransactions: customerInfo.nonSubscriptionTransactions || [],
      subscriptions: customerInfo.entitlements?.active || {},
      userId: customerInfo.originalAppUserId,
    };
  }, [customerInfo]);
};