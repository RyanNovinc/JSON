import AsyncStorage from '@react-native-async-storage/async-storage';
import AsyncStorageDebugger from './asyncStorageDebug';
import CrossSessionStorage from './crossSessionStorage';

interface StorageBackup {
  primary: string;
  backup1: string;
  backup2: string;
  metadata: {
    timestamp: number;
    version: number;
    checksum: string;
  };
}

interface RobustStorageConfig {
  maxRetries: number;
  backupCount: number;
  verificationDelay: number;
}

class RobustStorage {
  private static config: RobustStorageConfig = {
    maxRetries: 3,
    backupCount: 3,
    verificationDelay: 100
  };

  // Generate simple checksum for data verification
  private static generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Generate backup key names
  private static getBackupKeys(primaryKey: string): { primary: string; backup1: string; backup2: string; metadata: string } {
    return {
      primary: primaryKey,
      backup1: `${primaryKey}_backup1`,
      backup2: `${primaryKey}_backup2`,
      metadata: `${primaryKey}_meta`
    };
  }

  // Enhanced setItem with redundant storage and verification
  static async setItem(key: string, value: string, critical: boolean = true): Promise<boolean> {
    console.log(`🔐 [ROBUST-STORAGE] Setting key: "${key}" (critical: ${critical})`);
    console.log(`🔐 [ROBUST-STORAGE] AGGRESSIVE MODE: iOS persistence issue detected`);
    
    try {
      const timestamp = Date.now();
      const checksum = this.generateChecksum(value);
      const keys = this.getBackupKeys(key);
      
      if (critical) {
        // For critical data, use redundant storage
        const metadata = {
          timestamp,
          version: 1,
          checksum,
          originalKey: key
        };

        // Save to multiple locations
        const savePromises = [
          AsyncStorageDebugger.setItem(keys.primary, value),
          AsyncStorageDebugger.setItem(keys.backup1, value),
          AsyncStorageDebugger.setItem(keys.backup2, value),
          AsyncStorageDebugger.setItem(keys.metadata, JSON.stringify(metadata))
        ];

        const results = await Promise.all(savePromises);
        const successCount = results.filter(Boolean).length;
        
        console.log(`🔐 [ROBUST-STORAGE] Saved to ${successCount}/4 locations`);
        
        if (successCount >= 2) { // At least primary + one backup
          // AGGRESSIVE VERIFICATION: Multiple verification attempts
          await new Promise(resolve => setTimeout(resolve, this.config.verificationDelay));
          
          let verificationAttempts = 0;
          let verificationSuccess = false;
          
          while (verificationAttempts < 3 && !verificationSuccess) {
            verificationAttempts++;
            console.log(`🔐 [ROBUST-STORAGE] 🔍 Verification attempt ${verificationAttempts}/3`);
            
            verificationSuccess = await this.verifyData(key, value, checksum);
            
            if (!verificationSuccess) {
              console.warn(`🔐 [ROBUST-STORAGE] ⚠️ Verification attempt ${verificationAttempts} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 200)); // Wait longer between attempts
              
              // Re-save if verification fails
              if (verificationAttempts < 3) {
                console.log(`🔐 [ROBUST-STORAGE] 🔄 Re-saving data due to verification failure...`);
                await Promise.all([
                  AsyncStorageDebugger.setItem(keys.primary, value),
                  AsyncStorageDebugger.setItem(keys.backup1, value),
                  AsyncStorageDebugger.setItem(keys.backup2, value)
                ]);
              }
            }
          }
          
          if (verificationSuccess) {
            console.log(`🔐 [ROBUST-STORAGE] ✅ Critical data saved and verified after ${verificationAttempts} attempts`);
            
            // EXTRA AGGRESSIVE: Save to additional emergency locations immediately
            const emergencyKeys = [
              `${key}_emergency_${Date.now()}`,
              `emergency_${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
              `backup_critical_${timestamp}`
            ];
            
            console.log(`🔐 [ROBUST-STORAGE] 🆘 Saving to ${emergencyKeys.length} emergency locations...`);
            for (const emergencyKey of emergencyKeys) {
              try {
                await AsyncStorage.setItem(emergencyKey, value);
                console.log(`🔐 [ROBUST-STORAGE] ✅ Emergency backup saved: ${emergencyKey}`);
              } catch (error) {
                console.warn(`🔐 [ROBUST-STORAGE] ⚠️ Emergency backup failed: ${emergencyKey}`, error);
              }
            }
            
            // CROSS-SESSION BACKUP: Save to cross-session storage
            const crossSessionSuccess = await CrossSessionStorage.setItem(key, value);
            console.log(`🔐 [ROBUST-STORAGE] Cross-session backup: ${crossSessionSuccess ? '✅ SUCCESS' : '❌ FAILED'}`)
            
            return true;
          } else {
            console.error(`🔐 [ROBUST-STORAGE] ❌ Verification failed after ${verificationAttempts} attempts`);
            return false;
          }
        } else {
          console.error(`🔐 [ROBUST-STORAGE] ❌ Failed to save to enough locations (${successCount}/4)`);
          return false;
        }
        
      } else {
        // For non-critical data, use single storage with verification
        const success = await AsyncStorageDebugger.setItem(key, value);
        if (success) {
          await new Promise(resolve => setTimeout(resolve, this.config.verificationDelay));
          const verification = await AsyncStorageDebugger.getItem(key);
          return verification === value;
        }
        return false;
      }
      
    } catch (error) {
      console.error(`🔐 [ROBUST-STORAGE] Error in setItem:`, error);
      return false;
    }
  }

  // Enhanced getItem with fallback recovery
  static async getItem(key: string, critical: boolean = true): Promise<string | null> {
    console.log(`🔐 [ROBUST-STORAGE] Getting key: "${key}" (critical: ${critical})`);
    
    try {
      if (!critical) {
        // Simple get for non-critical data
        return await AsyncStorageDebugger.getItem(key);
      }

      const keys = this.getBackupKeys(key);
      
      // Try to get metadata first
      const metadataStr = await AsyncStorageDebugger.getItem(keys.metadata);
      let expectedChecksum: string | null = null;
      
      if (metadataStr) {
        try {
          const metadata = JSON.parse(metadataStr);
          expectedChecksum = metadata.checksum;
          console.log(`🔐 [ROBUST-STORAGE] Found metadata with checksum: ${expectedChecksum}`);
        } catch (error) {
          console.warn(`🔐 [ROBUST-STORAGE] Invalid metadata format`);
        }
      }

      // Try primary, then backups, then emergency backups
      const keysToTry = [keys.primary, keys.backup1, keys.backup2];
      
      // AGGRESSIVE MODE: Also check for emergency backups
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const emergencyKeys = allKeys.filter(k => 
          k.includes(`${key}_emergency_`) || 
          k.includes(`emergency_${key.replace(/[^a-zA-Z0-9]/g, '_')}`) ||
          k.includes('backup_critical_')
        );
        keysToTry.push(...emergencyKeys);
        console.log(`🔐 [ROBUST-STORAGE] 🔍 Found ${emergencyKeys.length} emergency backup keys to try`);
      } catch (error) {
        console.warn(`🔐 [ROBUST-STORAGE] ⚠️ Could not check emergency keys:`, error);
      }
      
      for (const keyToTry of keysToTry) {
        const data = await AsyncStorageDebugger.getItem(keyToTry);
        
        if (data !== null) {
          // Verify checksum if we have it
          if (expectedChecksum) {
            const dataChecksum = this.generateChecksum(data);
            if (dataChecksum === expectedChecksum) {
              console.log(`🔐 [ROBUST-STORAGE] ✅ Retrieved valid data from ${keyToTry}`);
              
              // If this wasn't the primary key, restore to primary
              if (keyToTry !== keys.primary) {
                console.log(`🔐 [ROBUST-STORAGE] 🔄 Restoring data to primary key`);
                await this.setItem(key, data, true);
              }
              
              return data;
            } else {
              console.warn(`🔐 [ROBUST-STORAGE] ⚠️ Checksum mismatch for ${keyToTry} (expected: ${expectedChecksum}, got: ${dataChecksum})`);
              continue;
            }
          } else {
            // No checksum available, return the data but warn
            console.warn(`🔐 [ROBUST-STORAGE] ⚠️ No checksum verification possible for ${keyToTry}`);
            return data;
          }
        }
      }
      
      console.log(`🔐 [ROBUST-STORAGE] ❌ No valid data found in primary/backup locations for key: ${key}`);
      
      // LAST RESORT: Try cross-session storage
      console.log(`🔐 [ROBUST-STORAGE] 🆘 Trying cross-session storage as last resort...`);
      const crossSessionData = await CrossSessionStorage.getItem(key);
      if (crossSessionData) {
        console.log(`🔐 [ROBUST-STORAGE] ✅ Data recovered from cross-session storage!`);
        
        // Immediately restore to main storage
        const restoreSuccess = await this.setItem(key, crossSessionData, true);
        console.log(`🔐 [ROBUST-STORAGE] Cross-session restore: ${restoreSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        return crossSessionData;
      }
      
      console.log(`🔐 [ROBUST-STORAGE] ❌ No valid data found in any location (including cross-session) for key: ${key}`);
      return null;
      
    } catch (error) {
      console.error(`🔐 [ROBUST-STORAGE] Error in getItem:`, error);
      return null;
    }
  }

  // Verify data integrity
  private static async verifyData(key: string, expectedValue: string, expectedChecksum: string): Promise<boolean> {
    try {
      const keys = this.getBackupKeys(key);
      const verificationPromises = [
        AsyncStorageDebugger.getItem(keys.primary),
        AsyncStorageDebugger.getItem(keys.backup1),
        AsyncStorageDebugger.getItem(keys.backup2)
      ];

      const results = await Promise.all(verificationPromises);
      let validCount = 0;

      results.forEach((result, index) => {
        if (result === expectedValue) {
          const checksum = this.generateChecksum(result);
          if (checksum === expectedChecksum) {
            validCount++;
          }
        }
      });

      console.log(`🔐 [ROBUST-STORAGE] Verification: ${validCount}/3 copies are valid`);
      return validCount >= 1; // At least one valid copy
      
    } catch (error) {
      console.error(`🔐 [ROBUST-STORAGE] Verification error:`, error);
      return false;
    }
  }

  // Remove item and all its backups
  static async removeItem(key: string, critical: boolean = true): Promise<boolean> {
    console.log(`🔐 [ROBUST-STORAGE] Removing key: "${key}" (critical: ${critical})`);
    
    try {
      if (!critical) {
        return await AsyncStorageDebugger.removeItem(key);
      }

      const keys = this.getBackupKeys(key);
      const removePromises = [
        AsyncStorageDebugger.removeItem(keys.primary),
        AsyncStorageDebugger.removeItem(keys.backup1),
        AsyncStorageDebugger.removeItem(keys.backup2),
        AsyncStorageDebugger.removeItem(keys.metadata)
      ];

      const results = await Promise.all(removePromises);
      const successCount = results.filter(Boolean).length;
      
      console.log(`🔐 [ROBUST-STORAGE] Removed from ${successCount}/4 locations`);
      return successCount >= 2;
      
    } catch (error) {
      console.error(`🔐 [ROBUST-STORAGE] Error in removeItem:`, error);
      return false;
    }
  }

  // Health check and repair function
  static async healthCheck(): Promise<{ healthy: boolean; repaired: number; errors: string[] }> {
    console.log(`🔐 [ROBUST-STORAGE] Starting health check...`);
    
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const metadataKeys = allKeys.filter(key => key.endsWith('_meta'));
      
      let repaired = 0;
      const errors: string[] = [];
      
      for (const metaKey of metadataKeys) {
        try {
          const metadataStr = await AsyncStorage.getItem(metaKey);
          if (!metadataStr) continue;
          
          const metadata = JSON.parse(metadataStr);
          const originalKey = metadata.originalKey;
          
          if (!originalKey) continue;
          
          const keys = this.getBackupKeys(originalKey);
          const dataPromises = [
            AsyncStorage.getItem(keys.primary),
            AsyncStorage.getItem(keys.backup1),
            AsyncStorage.getItem(keys.backup2)
          ];
          
          const [primary, backup1, backup2] = await Promise.all(dataPromises);
          const validData = [primary, backup1, backup2].find(data => 
            data && this.generateChecksum(data) === metadata.checksum
          );
          
          if (validData && !primary) {
            // Primary is missing but we have valid backup data
            await AsyncStorage.setItem(keys.primary, validData);
            repaired++;
            console.log(`🔐 [ROBUST-STORAGE] 🔧 Repaired primary key: ${originalKey}`);
          }
          
        } catch (error) {
          const errorMsg = `Health check error for ${metaKey}: ${error}`;
          errors.push(errorMsg);
          console.error(`🔐 [ROBUST-STORAGE] ${errorMsg}`);
        }
      }
      
      console.log(`🔐 [ROBUST-STORAGE] Health check complete. Repaired: ${repaired}, Errors: ${errors.length}`);
      return {
        healthy: errors.length === 0,
        repaired,
        errors
      };
      
    } catch (error) {
      console.error(`🔐 [ROBUST-STORAGE] Health check failed:`, error);
      return {
        healthy: false,
        repaired: 0,
        errors: [`Health check failed: ${error}`]
      };
    }
  }

  // Get storage statistics
  static async getStats(): Promise<{
    totalKeys: number;
    criticalKeys: number;
    backupKeys: number;
    orphanedBackups: number;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const criticalKeys = allKeys.filter(key => !key.includes('_backup') && !key.includes('_meta'));
      const backupKeys = allKeys.filter(key => key.includes('_backup'));
      const metadataKeys = allKeys.filter(key => key.includes('_meta'));
      
      // Find orphaned backups (backups without primary keys)
      let orphanedBackups = 0;
      for (const backupKey of backupKeys) {
        const primaryKey = backupKey.replace(/_backup[12]$/, '');
        if (!allKeys.includes(primaryKey)) {
          orphanedBackups++;
        }
      }
      
      return {
        totalKeys: allKeys.length,
        criticalKeys: criticalKeys.length,
        backupKeys: backupKeys.length,
        orphanedBackups
      };
      
    } catch (error) {
      console.error(`🔐 [ROBUST-STORAGE] Stats error:`, error);
      return { totalKeys: 0, criticalKeys: 0, backupKeys: 0, orphanedBackups: 0 };
    }
  }
}

export default RobustStorage;