import { MMKV } from 'react-native-mmkv';

// Create a single MMKV instance for the entire app
export const storage = new MMKV({
  id: 'json-fit-storage',
  encryptionKey: undefined, // Add encryption if needed
});

// AsyncStorage-compatible wrapper for easier migration
export const MMKVStorage = {
  // Get item (returns string or null, matching AsyncStorage)
  getItem: async (key: string): Promise<string | null> => {
    try {
      const value = storage.getString(key);
      return value ?? null;
    } catch (error) {
      console.error(`[MMKV] Error getting item ${key}:`, error);
      return null;
    }
  },

  // Set item (stores as string, matching AsyncStorage)
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      storage.set(key, value);
    } catch (error) {
      console.error(`[MMKV] Error setting item ${key}:`, error);
      throw error;
    }
  },

  // Remove item
  removeItem: async (key: string): Promise<void> => {
    try {
      storage.delete(key);
    } catch (error) {
      console.error(`[MMKV] Error removing item ${key}:`, error);
      throw error;
    }
  },

  // Get all keys
  getAllKeys: async (): Promise<readonly string[]> => {
    try {
      return storage.getAllKeys();
    } catch (error) {
      console.error('[MMKV] Error getting all keys:', error);
      return [];
    }
  },

  // Clear all
  clear: async (): Promise<void> => {
    try {
      storage.clearAll();
    } catch (error) {
      console.error('[MMKV] Error clearing storage:', error);
      throw error;
    }
  },

  // Multi get (for compatibility)
  multiGet: async (keys: string[]): Promise<readonly [string, string | null][]> => {
    try {
      return keys.map(key => [key, storage.getString(key) ?? null]);
    } catch (error) {
      console.error('[MMKV] Error in multiGet:', error);
      return keys.map(key => [key, null]);
    }
  },

  // Multi set
  multiSet: async (keyValuePairs: Array<[string, string]>): Promise<void> => {
    try {
      keyValuePairs.forEach(([key, value]) => {
        storage.set(key, value);
      });
    } catch (error) {
      console.error('[MMKV] Error in multiSet:', error);
      throw error;
    }
  },

  // Multi remove
  multiRemove: async (keys: string[]): Promise<void> => {
    try {
      keys.forEach(key => storage.delete(key));
    } catch (error) {
      console.error('[MMKV] Error in multiRemove:', error);
      throw error;
    }
  },

  // Merge item (for compatibility - MMKV doesn't have native merge)
  mergeItem: async (key: string, value: string): Promise<void> => {
    try {
      const existing = storage.getString(key);
      if (existing) {
        const existingObj = JSON.parse(existing);
        const newObj = JSON.parse(value);
        const merged = { ...existingObj, ...newObj };
        storage.set(key, JSON.stringify(merged));
      } else {
        storage.set(key, value);
      }
    } catch (error) {
      console.error(`[MMKV] Error merging item ${key}:`, error);
      throw error;
    }
  },

  // Multi merge
  multiMerge: async (keyValuePairs: Array<[string, string]>): Promise<void> => {
    try {
      for (const [key, value] of keyValuePairs) {
        await MMKVStorage.mergeItem(key, value);
      }
    } catch (error) {
      console.error('[MMKV] Error in multiMerge:', error);
      throw error;
    }
  },
};

// Direct access to synchronous methods for performance-critical code
export const MMKVSync = {
  getString: (key: string): string | undefined => storage.getString(key),
  getNumber: (key: string): number | undefined => storage.getNumber(key),
  getBoolean: (key: string): boolean | undefined => storage.getBoolean(key),
  set: (key: string, value: string | number | boolean): void => storage.set(key, value),
  delete: (key: string): void => storage.delete(key),
  contains: (key: string): boolean => storage.contains(key),
  getAllKeys: (): string[] => storage.getAllKeys(),
  clearAll: (): void => storage.clearAll(),
};

// Export the raw MMKV instance for advanced usage
export const mmkv = storage;