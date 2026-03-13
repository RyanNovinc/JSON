import AsyncStorage from '@react-native-async-storage/async-storage';
import { SmartStorageSync as MMKVSync, storage as mmkv } from './smartStorage';

interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  errors: string[];
  totalItems: number;
}

/**
 * Safe migration from AsyncStorage to MMKV with validation
 * Only runs once when app first starts with MMKV
 */
export const migrateFromAsyncStorageToMMKV = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: false,
    migratedKeys: [],
    errors: [],
    totalItems: 0
  };

  try {
    // Check if migration already completed
    if (MMKVSync.getBoolean('__migration_completed')) {
      console.log('✅ [Migration] Already completed');
      return { ...result, success: true };
    }

    console.log('🔄 [Migration] Starting AsyncStorage → MMKV migration');
    
    // Get all keys from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    result.totalItems = keys.length;
    
    console.log(`📊 [Migration] Found ${keys.length} items to migrate`);
    
    // Migrate each key with validation
    for (const key of keys) {
      try {
        const value = await AsyncStorage.getItem(key);
        
        if (value !== null) {
          // Store in MMKV
          mmkv.set(key, value);
          
          // Verify the migration worked
          const verifyValue = mmkv.getString(key);
          if (verifyValue === value) {
            result.migratedKeys.push(key);
            
            // Remove from AsyncStorage after successful migration
            await AsyncStorage.removeItem(key);
            
            console.log(`✅ [Migration] Migrated: ${key}`);
          } else {
            throw new Error(`Verification failed for key: ${key}`);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to migrate key "${key}": ${error}`;
        console.error(`❌ [Migration] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }
    
    // Mark migration as completed
    mmkv.set('__migration_completed', true);
    mmkv.set('__migration_timestamp', Date.now().toString());
    mmkv.set('__migration_stats', JSON.stringify({
      totalItems: result.totalItems,
      migratedKeys: result.migratedKeys.length,
      errors: result.errors.length
    }));
    
    result.success = result.errors.length === 0;
    
    console.log(`🎉 [Migration] Complete! ${result.migratedKeys.length}/${result.totalItems} items migrated`);
    if (result.errors.length > 0) {
      console.warn(`⚠️ [Migration] ${result.errors.length} errors occurred`);
    }
    
  } catch (error) {
    console.error('💥 [Migration] Fatal error:', error);
    result.errors.push(`Fatal migration error: ${error}`);
  }
  
  return result;
};

/**
 * Recovery function - restore from AsyncStorage if needed
 */
export const recoverFromAsyncStorage = async (): Promise<boolean> => {
  try {
    console.log('🔄 [Recovery] Attempting to recover data from AsyncStorage');
    const keys = await AsyncStorage.getAllKeys();
    
    if (keys.length === 0) {
      console.log('ℹ️ [Recovery] No data found in AsyncStorage');
      return false;
    }
    
    // Copy back to MMKV
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        mmkv.set(key, value);
      }
    }
    
    console.log(`✅ [Recovery] Recovered ${keys.length} items from AsyncStorage`);
    return true;
  } catch (error) {
    console.error('💥 [Recovery] Failed:', error);
    return false;
  }
};

/**
 * Get migration status and stats
 */
export const getMigrationStatus = () => {
  return {
    isCompleted: MMKVSync.getBoolean('__migration_completed') ?? false,
    timestamp: MMKVSync.getString('__migration_timestamp'),
    stats: (() => {
      try {
        const statsStr = MMKVSync.getString('__migration_stats');
        return statsStr ? JSON.parse(statsStr) : null;
      } catch {
        return null;
      }
    })()
  };
};