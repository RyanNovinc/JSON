/**
 * Data Migration Framework
 * 
 * Provides versioned data migration on top of RobustStorage with:
 * - Snapshot-before-migrate safety
 * - Ordered migration execution
 * - Failure rollback and recovery
 * - Idempotent operations
 */

import RobustStorage from './robustStorage';
import { WorkoutStorage } from './storage';
import { resolveExerciseId, IDENTITY_TABLE_VERSION } from './exerciseIdentity';

// Global state to track migration completion
let migrationsCompleted = false;
let migrationPromise: Promise<void> | null = null;

// Current overall schema version
export const SCHEMA_VERSION = 2;

// Storage keys for version tracking
const STORAGE_KEYS = {
  SCHEMA_VERSION: 'schema_version',
  IDENTITY_TABLE_VERSION: 'identity_table_version'
} as const;

interface Migration {
  version: number;
  description: string;
  run: () => Promise<void>;
}

interface VersionInfo {
  schemaVersion: number;
  identityTableVersion: number;
}

/**
 * Get current stored version information
 */
async function getStoredVersions(): Promise<VersionInfo> {
  try {
    const [schemaVersionStr, identityVersionStr] = await Promise.all([
      RobustStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION, true),
      RobustStorage.getItem(STORAGE_KEYS.IDENTITY_TABLE_VERSION, true)
    ]);

    // Debug logging for version parsing issues
    if (__DEV__) {
      console.log(`🔄 [MIGRATIONS] Raw version strings - Schema: "${schemaVersionStr}", Identity: "${identityVersionStr}"`);
    }

    let schemaVersion = 0;
    let identityVersion = 0;

    // Parse schema version with validation for corrupted data
    if (schemaVersionStr) {
      // Check if the stored data is actually a version number and not JSON
      if (schemaVersionStr.startsWith('{') || schemaVersionStr.startsWith('[')) {
        console.warn(`⚠️ [MIGRATIONS] Schema version corrupted with JSON data, resetting to v0`);
        // Clear the corrupted version data (no tombstone since we'll write new data)
        await RobustStorage.removeItem(STORAGE_KEYS.SCHEMA_VERSION, true, false);
        schemaVersion = 0;
      } else {
        const parsed = parseInt(schemaVersionStr, 10);
        schemaVersion = isNaN(parsed) ? 0 : parsed;
      }
    }

    // Parse identity version with validation for corrupted data  
    if (identityVersionStr) {
      // Check if the stored data is actually a version number and not JSON
      if (identityVersionStr.startsWith('{') || identityVersionStr.startsWith('[')) {
        console.warn(`⚠️ [MIGRATIONS] Identity version corrupted with JSON data, resetting to v0`);
        // Clear the corrupted version data (no tombstone since we'll write new data)
        await RobustStorage.removeItem(STORAGE_KEYS.IDENTITY_TABLE_VERSION, true, false);
        identityVersion = 0;
      } else {
        const parsed = parseInt(identityVersionStr, 10);
        identityVersion = isNaN(parsed) ? 0 : parsed;
      }
    }

    // Log final parsed versions
    if (__DEV__) {
      console.log(`🔄 [MIGRATIONS] Parsed versions - Schema: ${schemaVersion}, Identity: ${identityVersion}`);
    }

    return {
      schemaVersion,
      identityTableVersion: identityVersion
    };
  } catch (error) {
    console.warn('🔄 [MIGRATIONS] Failed to read stored versions, assuming v0:', error);
    return { schemaVersion: 0, identityTableVersion: 0 };
  }
}

/**
 * Update stored version information
 */
async function updateStoredVersions(versions: Partial<VersionInfo>): Promise<void> {
  const promises: Promise<boolean>[] = [];
  
  if (versions.schemaVersion !== undefined) {
    promises.push(
      RobustStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, versions.schemaVersion.toString(), true)
    );
  }
  
  if (versions.identityTableVersion !== undefined) {
    promises.push(
      RobustStorage.setItem(STORAGE_KEYS.IDENTITY_TABLE_VERSION, versions.identityTableVersion.toString(), true)
    );
  }
  
  const results = await Promise.all(promises);
  const allSucceeded = results.every(success => success);
  
  if (!allSucceeded) {
    throw new Error('Failed to update stored version information');
  }
}

/**
 * Create timestamped backup of data before migration
 */
async function createBackup(key: string, description: string): Promise<string> {
  const timestamp = Date.now();
  const backupKey = `${key}_backup_${timestamp}`;
  
  console.log(`🔄 [MIGRATIONS] Creating backup: ${backupKey} (${description})`);
  
  try {
    const data = await RobustStorage.getItem(key, true);
    if (data) {
      const success = await RobustStorage.setItem(backupKey, data, true);
      if (!success) {
        throw new Error(`Failed to create backup for ${key}`);
      }
      console.log(`✅ [MIGRATIONS] Backup created: ${backupKey}`);
    } else {
      console.log(`ℹ️ [MIGRATIONS] No data found for ${key}, skipping backup`);
    }
    
    return backupKey;
  } catch (error) {
    console.error(`❌ [MIGRATIONS] Failed to create backup for ${key}:`, error);
    throw error;
  }
}

/**
 * Restore data from backup on migration failure
 */
async function restoreFromBackup(key: string, backupKey: string): Promise<void> {
  console.log(`🔄 [MIGRATIONS] Restoring ${key} from backup ${backupKey}`);
  
  try {
    const backupData = await RobustStorage.getItem(backupKey, true);
    if (backupData) {
      const success = await RobustStorage.setItem(key, backupData, true);
      if (!success) {
        throw new Error(`Failed to restore ${key} from backup`);
      }
      console.log(`✅ [MIGRATIONS] Successfully restored ${key} from backup`);
    } else {
      console.warn(`⚠️ [MIGRATIONS] No backup data found for ${backupKey}`);
    }
  } catch (error) {
    console.error(`❌ [MIGRATIONS] Failed to restore from backup:`, error);
    throw error;
  }
}

/**
 * Migration #1: Exercise Identity Reconcile
 * Re-stamp all workout history entries with current exercise IDs
 */
async function migrateExerciseIdentities(): Promise<void> {
  console.log('🔄 [MIGRATIONS] Running exercise identity reconcile...');
  
  // Create backup first
  const backupKey = await createBackup('workout_history', 'Exercise identity reconcile');
  
  try {
    // Load current workout history
    const history = await WorkoutStorage.loadWorkoutHistory();
    console.log(`🔄 [MIGRATIONS] Processing ${history.length} workout history entries`);
    
    let updatedCount = 0;
    
    // Update each entry's exerciseId based on current identity table
    for (const entry of history) {
      const currentId = resolveExerciseId(entry.exerciseName);
      
      if (entry.exerciseId !== currentId) {
        entry.exerciseId = currentId;
        updatedCount++;
      }
    }
    
    // Save updated history
    await WorkoutStorage.saveWorkoutHistory(history);
    
    console.log(`✅ [MIGRATIONS] Exercise identity reconcile complete: ${updatedCount} entries updated`);
  } catch (error) {
    console.error('❌ [MIGRATIONS] Exercise identity reconcile failed:', error);
    
    // Restore from backup on failure
    try {
      await restoreFromBackup('workout_history', backupKey);
    } catch (restoreError) {
      console.error('💥 [MIGRATIONS] Failed to restore from backup:', restoreError);
    }
    
    throw error;
  }
}

/**
 * Migration #2: Questionnaire Shape Normalization
 * Convert old nested { formData: {...}, macroResults: {...} } format
 * to new flat format { goal, age, height, ... }
 */
async function migrateQuestionnaireShape(): Promise<void> {
  console.log('🔄 [MIGRATIONS] Running questionnaire shape normalization...');
  
  const questionnaireDomains = [
    'nutrition_questionnaire_results',
    'budget_cooking_questionnaire_results', 
    'fridge_pantry_questionnaire_results',
    'sleep_optimization_results',
    'fitness_goals_questionnaire_results',
    'equipment_preferences_questionnaire_results'
  ];
  
  let migratedDomainsCount = 0;
  
  for (const domain of questionnaireDomains) {
    let backupKey: string | undefined;
    try {
      // Create backup for each domain
      backupKey = await createBackup(domain, `Questionnaire shape migration - ${domain}`);
      
      console.log(`🔄 [MIGRATIONS] Processing ${domain}...`);
      const data = await RobustStorage.getItem(domain, true);
      
      if (!data) {
        console.log(`ℹ️ [MIGRATIONS] No data found for ${domain}, skipping`);
        continue;
      }
      
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (parseError) {
        console.warn(`⚠️ [MIGRATIONS] Invalid JSON in ${domain}, skipping:`, parseError);
        continue;
      }
      
      // Check if data is in old nested format
      if (parsedData && typeof parsedData === 'object' && parsedData.formData) {
        console.log(`🔄 [MIGRATIONS] Converting ${domain} from old nested format to flat format`);
        
        // Flatten the structure - move formData fields to top level while preserving ALL other fields
        const { formData, ...rest } = parsedData;
        const flattenedData = { 
          ...formData, 
          ...rest, 
          _migratedAt: new Date().toISOString(),
          _migrationVersion: 2 
        };
        
        // Save flattened format
        const success = await RobustStorage.setItem(domain, JSON.stringify(flattenedData), true);
        if (!success) {
          throw new Error(`Failed to save migrated ${domain} data`);
        }
        
        migratedDomainsCount++;
        console.log(`✅ [MIGRATIONS] Successfully migrated ${domain} to flat format`);
      } else {
        console.log(`ℹ️ [MIGRATIONS] ${domain} already in flat format or empty, skipping`);
      }
      
    } catch (error) {
      console.error(`❌ [MIGRATIONS] Failed to migrate ${domain}:`, error);
      
      // Restore from backup on failure
      try {
        if (backupKey) await restoreFromBackup(domain, backupKey);
      } catch (restoreError) {
        console.error(`💥 [MIGRATIONS] Failed to restore ${domain} from backup:`, restoreError);
      }
      
      throw error;
    }
  }
  
  console.log(`✅ [MIGRATIONS] Questionnaire shape normalization complete: ${migratedDomainsCount} domains migrated`);
}

/**
 * All available migrations in order
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Exercise identity reconcile',
    run: migrateExerciseIdentities
  },
  {
    version: 2,
    description: 'Questionnaire shape normalization',
    run: migrateQuestionnaireShape
  }
];

/**
 * Run pending data migrations
 * Called once on app launch before any screen reads data
 */
export async function runMigrations(): Promise<void> {
  // Ensure migrations only run once per launch
  if (migrationsCompleted) {
    console.log('✅ [MIGRATIONS] Already completed this session');
    return;
  }
  
  // If migrations are already running, wait for them
  if (migrationPromise) {
    console.log('🔄 [MIGRATIONS] Waiting for in-progress migrations...');
    return migrationPromise;
  }
  
  // Start migrations
  migrationPromise = runMigrationsInternal();
  
  try {
    await migrationPromise;
    migrationsCompleted = true;
  } finally {
    migrationPromise = null;
  }
}

/**
 * Internal migration runner
 */
async function runMigrationsInternal(): Promise<void> {
  console.log('🔄 [MIGRATIONS] Starting migration check...');
  
  try {
    const storedVersions = await getStoredVersions();
    console.log(`🔄 [MIGRATIONS] Current versions - Schema: ${storedVersions.schemaVersion}, Identity Table: ${storedVersions.identityTableVersion}`);
    console.log(`🔄 [MIGRATIONS] Target versions - Schema: ${SCHEMA_VERSION}, Identity Table: ${IDENTITY_TABLE_VERSION}`);
    
    // Check if schema migrations are needed
    const pendingMigrations = MIGRATIONS.filter(migration => 
      migration.version > storedVersions.schemaVersion
    );
    
    // Check if identity table reconcile is needed
    const needsIdentityReconcile = storedVersions.identityTableVersion < IDENTITY_TABLE_VERSION;
    
    if (pendingMigrations.length === 0 && !needsIdentityReconcile) {
      console.log('✅ [MIGRATIONS] All migrations up to date');
      return;
    }
    
    console.log(`🔄 [MIGRATIONS] Found ${pendingMigrations.length} pending migrations, identity reconcile needed: ${needsIdentityReconcile}`);
    
    // Run schema migrations
    for (const migration of pendingMigrations) {
      console.log(`🔄 [MIGRATIONS] Running migration ${migration.version}: ${migration.description}`);
      
      try {
        await migration.run();
        
        // Update schema version on success
        await updateStoredVersions({ schemaVersion: migration.version });
        console.log(`✅ [MIGRATIONS] Migration ${migration.version} completed successfully`);
        
      } catch (error) {
        console.error(`❌ [MIGRATIONS] Migration ${migration.version} failed:`, error);
        console.error('🛑 [MIGRATIONS] Stopping migration process due to failure');
        throw error; // Don't continue with remaining migrations
      }
    }
    
    // Run identity table reconcile if needed (can run independently of schema migrations)
    if (needsIdentityReconcile) {
      console.log('🔄 [MIGRATIONS] Running identity table reconcile...');
      
      try {
        await migrateExerciseIdentities();
        
        // Update identity table version on success
        await updateStoredVersions({ identityTableVersion: IDENTITY_TABLE_VERSION });
        console.log('✅ [MIGRATIONS] Identity table reconcile completed successfully');
        
      } catch (error) {
        console.error('❌ [MIGRATIONS] Identity table reconcile failed:', error);
        throw error;
      }
    }
    
    console.log('🎉 [MIGRATIONS] All migrations completed successfully');
    
  } catch (error) {
    console.error('💥 [MIGRATIONS] Migration process failed:', error);
    console.error('ℹ️ [MIGRATIONS] Data should remain accessible from backups');
    throw error;
  }
}

/**
 * Check if migrations have completed (for testing)
 */
export function areMigrationsCompleted(): boolean {
  return migrationsCompleted;
}

/**
 * Reset migration state (for testing only)
 */
export async function resetMigrationState(): Promise<void> {
  if (__DEV__) {
    migrationsCompleted = false;
    migrationPromise = null;
    
    // Also clear persistent version storage for clean test state (no tombstones for test cleanup)
    try {
      await Promise.all([
        RobustStorage.removeItem(STORAGE_KEYS.SCHEMA_VERSION, true, false),
        RobustStorage.removeItem(STORAGE_KEYS.IDENTITY_TABLE_VERSION, true, false)
      ]);
    } catch (error) {
      console.warn('🔄 [MIGRATIONS] Failed to clear version storage during reset:', error);
    }
  }
}

/**
 * Get migration status for debugging
 */
export async function getMigrationStatus(): Promise<{
  current: VersionInfo;
  target: VersionInfo;
  pendingMigrations: string[];
  needsIdentityReconcile: boolean;
}> {
  const storedVersions = await getStoredVersions();
  const pendingMigrations = MIGRATIONS
    .filter(migration => migration.version > storedVersions.schemaVersion)
    .map(migration => `v${migration.version}: ${migration.description}`);
  
  return {
    current: storedVersions,
    target: {
      schemaVersion: SCHEMA_VERSION,
      identityTableVersion: IDENTITY_TABLE_VERSION
    },
    pendingMigrations,
    needsIdentityReconcile: storedVersions.identityTableVersion < IDENTITY_TABLE_VERSION
  };
}