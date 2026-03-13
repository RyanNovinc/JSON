/**
 * Storage Migration Strategy
 * 
 * Since the app hasn't launched yet, we're doing a full replacement:
 * 1. Replace all AsyncStorage imports with MMKVStorage
 * 2. Use the AsyncStorage-compatible API from MMKVStorage
 * 3. No data migration needed (no existing users)
 */

// This file maps the old AsyncStorage to the new MMKV implementation
// Simply replace: import AsyncStorage from '@react-native-async-storage/async-storage'
// With: import AsyncStorage from '../utils/storageMigration'

export { MMKVStorage as default } from './mmkvStorage';
export { MMKVStorage } from './mmkvStorage';