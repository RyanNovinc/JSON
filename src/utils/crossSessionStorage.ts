import AsyncStorage from './smartStorage';

interface SessionData {
  timestamp: number;
  sessionId: string;
  data: string;
  attempts: number;
}

class CrossSessionStorage {
  private static sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  // Save data with multiple session-based keys
  static async setItem(key: string, value: string): Promise<boolean> {
    const sessionData: SessionData = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data: value,
      attempts: 1
    };
    
    const sessionKey = `cross_${key}_${this.sessionId}`;
    const timestampKey = `cross_${key}_${Date.now()}`;
    
    console.log(`🌐 [CROSS-SESSION] Saving data with session ID: ${this.sessionId}`);
    
    try {
      // Save with session-specific keys
      await Promise.all([
        AsyncStorage.setItem(sessionKey, JSON.stringify(sessionData)),
        AsyncStorage.setItem(timestampKey, JSON.stringify(sessionData)),
        AsyncStorage.setItem(`cross_latest_${key}`, JSON.stringify(sessionData))
      ]);
      
      console.log(`🌐 [CROSS-SESSION] ✅ Data saved to cross-session storage`);
      return true;
    } catch (error) {
      console.error(`🌐 [CROSS-SESSION] ❌ Failed to save:`, error);
      return false;
    }
  }
  
  // Get data from any available session
  static async getItem(key: string): Promise<string | null> {
    console.log(`🌐 [CROSS-SESSION] Looking for data across all sessions...`);
    
    try {
      // First try the latest key
      const latest = await AsyncStorage.getItem(`cross_latest_${key}`);
      if (latest) {
        const sessionData: SessionData = JSON.parse(latest);
        console.log(`🌐 [CROSS-SESSION] ✅ Found latest data from session: ${sessionData.sessionId}`);
        return sessionData.data;
      }
      
      // Search all keys for any cross-session data
      const allKeys = await AsyncStorage.getAllKeys();
      const crossSessionKeys = allKeys.filter(k => k.startsWith(`cross_${key}_`));
      
      console.log(`🌐 [CROSS-SESSION] Found ${crossSessionKeys.length} cross-session keys`);
      
      let newestData: SessionData | null = null;
      
      for (const sessionKey of crossSessionKeys) {
        try {
          const data = await AsyncStorage.getItem(sessionKey);
          if (data) {
            const sessionData: SessionData = JSON.parse(data);
            if (!newestData || sessionData.timestamp > newestData.timestamp) {
              newestData = sessionData;
            }
          }
        } catch (error) {
          console.warn(`🌐 [CROSS-SESSION] ⚠️ Invalid session data in ${sessionKey}`);
        }
      }
      
      if (newestData) {
        console.log(`🌐 [CROSS-SESSION] ✅ Found newest data from session: ${newestData.sessionId} (${new Date(newestData.timestamp).toISOString()})`);
        
        // Update the latest key
        await AsyncStorage.setItem(`cross_latest_${key}`, JSON.stringify(newestData));
        
        return newestData.data;
      }
      
      console.log(`🌐 [CROSS-SESSION] ❌ No cross-session data found`);
      return null;
      
    } catch (error) {
      console.error(`🌐 [CROSS-SESSION] ❌ Error retrieving data:`, error);
      return null;
    }
  }
  
  // Clean old session data (keep last 10 sessions)
  static async cleanup(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const crossSessionKeys = allKeys.filter(k => k.startsWith('cross_'));
      
      const sessionDataMap = new Map<string, SessionData[]>();
      
      for (const key of crossSessionKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const sessionData: SessionData = JSON.parse(data);
            const baseKey = key.replace(/cross_(.+)_session_\d+_\w+/, '$1').replace(/cross_(.+)_\d+/, '$1').replace('cross_latest_', '');
            
            if (!sessionDataMap.has(baseKey)) {
              sessionDataMap.set(baseKey, []);
            }
            sessionDataMap.get(baseKey)!.push(sessionData);
          }
        } catch (error) {
          // Invalid data, mark for removal
          await AsyncStorage.removeItem(key);
        }
      }
      
      // Keep only the newest 10 sessions for each key
      for (const [baseKey, sessions] of sessionDataMap) {
        sessions.sort((a, b) => b.timestamp - a.timestamp);
        if (sessions.length > 10) {
          const toRemove = sessions.slice(10);
          for (const sessionData of toRemove) {
            const sessionKey = `cross_${baseKey}_${sessionData.sessionId}`;
            await AsyncStorage.removeItem(sessionKey);
          }
        }
      }
      
      console.log(`🌐 [CROSS-SESSION] 🧹 Cleanup complete`);
    } catch (error) {
      console.error(`🌐 [CROSS-SESSION] ❌ Cleanup failed:`, error);
    }
  }
}

export default CrossSessionStorage;