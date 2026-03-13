import AsyncStorage from './smartStorage';

interface StorageOperation {
  type: 'GET' | 'SET' | 'REMOVE';
  key: string;
  value?: any;
  success: boolean;
  timestamp: string;
  error?: string;
}

class AsyncStorageDebugger {
  private static operations: StorageOperation[] = [];

  // Enhanced setItem with logging and verification
  static async setItem(key: string, value: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`🔵 [STORAGE-SET] ${timestamp} - Setting key: "${key}"`);
      console.log(`🔵 [STORAGE-SET] Value length: ${value.length} chars`);
      console.log(`🔵 [STORAGE-SET] Value preview: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
      
      await AsyncStorage.setItem(key, value);
      
      // Immediately verify the save worked
      const verification = await AsyncStorage.getItem(key);
      const verified = verification === value;
      
      console.log(`🔵 [STORAGE-SET] Save verification: ${verified ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      this.operations.push({
        type: 'SET',
        key,
        value: value.length > 100 ? value.substring(0, 100) + '...' : value,
        success: verified,
        timestamp
      });
      
      return verified;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`🔴 [STORAGE-SET] ERROR: ${errorMsg}`);
      
      this.operations.push({
        type: 'SET',
        key,
        value,
        success: false,
        timestamp,
        error: errorMsg
      });
      
      return false;
    }
  }

  // Enhanced getItem with logging
  static async getItem(key: string): Promise<string | null> {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`🟢 [STORAGE-GET] ${timestamp} - Getting key: "${key}"`);
      
      const value = await AsyncStorage.getItem(key);
      
      if (value === null) {
        console.log(`🟢 [STORAGE-GET] Result: NULL (key not found)`);
      } else {
        console.log(`🟢 [STORAGE-GET] Result: ${value.length} chars`);
        console.log(`🟢 [STORAGE-GET] Preview: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);
      }
      
      this.operations.push({
        type: 'GET',
        key,
        value: value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : 'NULL',
        success: true,
        timestamp
      });
      
      return value;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`🔴 [STORAGE-GET] ERROR: ${errorMsg}`);
      
      this.operations.push({
        type: 'GET',
        key,
        success: false,
        timestamp,
        error: errorMsg
      });
      
      return null;
    }
  }

  // Enhanced removeItem with logging
  static async removeItem(key: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    
    try {
      console.log(`🟡 [STORAGE-REMOVE] ${timestamp} - Removing key: "${key}"`);
      
      await AsyncStorage.removeItem(key);
      
      // Verify removal
      const verification = await AsyncStorage.getItem(key);
      const removed = verification === null;
      
      console.log(`🟡 [STORAGE-REMOVE] Removal verification: ${removed ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      this.operations.push({
        type: 'REMOVE',
        key,
        success: removed,
        timestamp
      });
      
      return removed;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`🔴 [STORAGE-REMOVE] ERROR: ${errorMsg}`);
      
      this.operations.push({
        type: 'REMOVE',
        key,
        success: false,
        timestamp,
        error: errorMsg
      });
      
      return false;
    }
  }

  // Get operation history
  static getOperationHistory(): StorageOperation[] {
    return [...this.operations];
  }

  // Clear operation history
  static clearHistory(): void {
    this.operations = [];
  }

  // Get all keys in storage
  static async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      console.log(`📋 [STORAGE-KEYS] Found ${keys.length} keys:`, keys);
      return keys;
    } catch (error) {
      console.error('🔴 [STORAGE-KEYS] Error getting all keys:', error);
      return [];
    }
  }

  // Get storage stats
  static async getStorageStats(): Promise<{totalKeys: number, completionKeys: string[], workoutKeys: string[]}> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const completionKeys = allKeys.filter(key => key.includes('completed_'));
      const workoutKeys = allKeys.filter(key => key.includes('workout_'));
      
      const stats = {
        totalKeys: allKeys.length,
        completionKeys,
        workoutKeys
      };
      
      console.log('📊 [STORAGE-STATS]', stats);
      return stats;
      
    } catch (error) {
      console.error('🔴 [STORAGE-STATS] Error:', error);
      return { totalKeys: 0, completionKeys: [], workoutKeys: [] };
    }
  }

  // Test persistence by saving and immediately checking
  static async testPersistence(): Promise<boolean> {
    const testKey = 'persistence_test_' + Date.now();
    const testValue = JSON.stringify({
      timestamp: new Date().toISOString(),
      data: 'This is a persistence test'
    });

    try {
      console.log('🧪 [PERSISTENCE-TEST] Starting test...');
      
      // Save
      const saved = await this.setItem(testKey, testValue);
      if (!saved) {
        console.log('🧪 [PERSISTENCE-TEST] ❌ Failed to save test data');
        return false;
      }

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load
      const loaded = await this.getItem(testKey);
      const loadSuccess = loaded === testValue;

      // Clean up
      await this.removeItem(testKey);

      console.log(`🧪 [PERSISTENCE-TEST] ${loadSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
      return loadSuccess;

    } catch (error) {
      console.error('🧪 [PERSISTENCE-TEST] ERROR:', error);
      return false;
    }
  }

  // Print summary report
  static printSummary(): void {
    console.log('\n📋 === ASYNCSTORAGE OPERATION SUMMARY ===');
    
    const recent = this.operations.slice(-10); // Last 10 operations
    const failures = this.operations.filter(op => !op.success);
    
    console.log(`Total operations: ${this.operations.length}`);
    console.log(`Failed operations: ${failures.length}`);
    
    if (failures.length > 0) {
      console.log('\n❌ FAILURES:');
      failures.forEach(op => {
        console.log(`  ${op.timestamp} - ${op.type} "${op.key}": ${op.error}`);
      });
    }
    
    console.log('\n📝 RECENT OPERATIONS:');
    recent.forEach(op => {
      const status = op.success ? '✅' : '❌';
      console.log(`  ${status} ${op.timestamp} - ${op.type} "${op.key}"`);
    });
    
    console.log('=== END SUMMARY ===\n');
  }
}

export default AsyncStorageDebugger;