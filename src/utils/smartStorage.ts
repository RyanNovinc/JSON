import { Platform } from 'react-native';

// Check if we're in Expo Go (development) or a custom build (production/dev build)
const isExpoGo = () => {
  try {
    // In Expo Go, Constants.appOwnership is 'expo'
    // In custom builds, it's 'standalone' or undefined
    const Constants = require('expo-constants');
    return Constants.appOwnership === 'expo';
  } catch {
    return false;
  }
};

// Dynamic import based on environment
let storage: any;

if (isExpoGo()) {
  // Use AsyncStorage for Expo Go (development)
  console.log('🔄 [SmartStorage] Using AsyncStorage for Expo Go development');
  storage = require('@react-native-async-storage/async-storage').default;
} else {
  // Use MMKV for production/custom builds
  console.log('⚡ [SmartStorage] Using MMKV for production build');
  try {
    const { MMKVStorage } = require('./mmkvStorage');
    storage = MMKVStorage;
  } catch (error) {
    console.warn('⚠️ [SmartStorage] MMKV not available, falling back to AsyncStorage');
    storage = require('@react-native-async-storage/async-storage').default;
  }
}

// Create synchronous methods for compatibility with MMKVSync usage
let syncStorage: any = {};
let rawStorage: any = {};

if (isExpoGo()) {
  // For AsyncStorage, we can't provide true sync methods, so we throw errors for sync usage
  syncStorage = {
    getString: (key: string) => {
      throw new Error('[SmartStorage] Synchronous operations not available in Expo Go. Use async methods instead.');
    },
    getNumber: (key: string) => {
      throw new Error('[SmartStorage] Synchronous operations not available in Expo Go. Use async methods instead.');
    },
    getBoolean: (key: string) => {
      throw new Error('[SmartStorage] Synchronous operations not available in Expo Go. Use async methods instead.');
    },
    set: (key: string, value: any) => {
      throw new Error('[SmartStorage] Synchronous operations not available in Expo Go. Use async methods instead.');
    },
    delete: (key: string) => {
      throw new Error('[SmartStorage] Synchronous operations not available in Expo Go. Use async methods instead.');
    },
    contains: (key: string) => {
      throw new Error('[SmartStorage] Synchronous operations not available in Expo Go. Use async methods instead.');
    },
    getAllKeys: () => {
      throw new Error('[SmartStorage] Synchronous operations not available in Expo Go. Use async methods instead.');
    },
    clearAll: () => {
      throw new Error('[SmartStorage] Synchronous operations not available in Expo Go. Use async methods instead.');
    },
  };
  rawStorage = storage;
} else {
  // Use MMKV's sync methods and raw storage
  try {
    const { MMKVSync, storage: mmkv } = require('./mmkvStorage');
    syncStorage = MMKVSync;
    rawStorage = mmkv;
  } catch (error) {
    console.warn('⚠️ [SmartStorage] MMKV sync methods not available, sync operations will throw errors');
    syncStorage = {
      getString: () => { throw new Error('[SmartStorage] MMKV not available, sync operations disabled.'); },
      getNumber: () => { throw new Error('[SmartStorage] MMKV not available, sync operations disabled.'); },
      getBoolean: () => { throw new Error('[SmartStorage] MMKV not available, sync operations disabled.'); },
      set: () => { throw new Error('[SmartStorage] MMKV not available, sync operations disabled.'); },
      delete: () => { throw new Error('[SmartStorage] MMKV not available, sync operations disabled.'); },
      contains: () => { throw new Error('[SmartStorage] MMKV not available, sync operations disabled.'); },
      getAllKeys: () => { throw new Error('[SmartStorage] MMKV not available, sync operations disabled.'); },
      clearAll: () => { throw new Error('[SmartStorage] MMKV not available, sync operations disabled.'); },
    };
    rawStorage = storage;
  }
}

// Export the appropriate storage implementations
export default storage;
export { storage as SmartStorage, syncStorage as SmartStorageSync, rawStorage as storage };