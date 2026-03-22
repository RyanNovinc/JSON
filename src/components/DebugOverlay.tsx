import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'log' | 'error' | 'warn';
}

class DebugLogger {
  private static logs: LogEntry[] = [];
  private static listeners: ((logs: LogEntry[]) => void)[] = [];

  static log(message: string, type: 'log' | 'error' | 'warn' = 'log') {
    const entry: LogEntry = {
      timestamp: new Date().toISOString().split('T')[1].split('.')[0], // HH:MM:SS format
      message,
      type,
    };
    
    this.logs.push(entry);
    
    // Keep only last 50 entries
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }
    
    // Notify listeners
    this.listeners.forEach(listener => listener([...this.logs]));
    
    // Also log to console
    console.log(`🐛 [DEBUG] ${message}`);
  }

  static addListener(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    // Immediately call with current logs
    listener([...this.logs]);
  }

  static removeListener(listener: (logs: LogEntry[]) => void) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  static getLogs() {
    return [...this.logs];
  }

  static clear() {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
  }
}

export { DebugLogger };

export const DebugOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const updateLogs = (newLogs: LogEntry[]) => setLogs(newLogs);
    DebugLogger.addListener(updateLogs);
    return () => DebugLogger.removeListener(updateLogs);
  }, []);

  const copyLogsToClipboard = async () => {
    const logText = logs
      .map(log => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`)
      .join('\n');
    
    try {
      await Clipboard.setString(logText);
      Alert.alert('Copied!', 'Debug logs copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy logs');
    }
  };

  const clearLogs = () => {
    DebugLogger.clear();
  };

  return (
    <>
      {/* Floating Debug Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsVisible(true)}
      >
        <Ionicons name="bug" size={24} color="#ffffff" />
      </TouchableOpacity>

      {/* Debug Modal */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.debugModal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Live Activity Debug Logs</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={copyLogsToClipboard}
                >
                  <Ionicons name="copy" size={20} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={clearLogs}
                >
                  <Ionicons name="trash" size={20} color="#ffffff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => setIsVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Logs */}
            <ScrollView style={styles.logsContainer} showsVerticalScrollIndicator={true}>
              {logs.length === 0 ? (
                <Text style={styles.noLogs}>No debug logs yet. Complete a set to trigger timer.</Text>
              ) : (
                logs.map((log, index) => (
                  <View key={index} style={styles.logEntry}>
                    <Text style={styles.timestamp}>{log.timestamp}</Text>
                    <Text style={[
                      styles.logMessage,
                      log.type === 'error' && styles.errorLog,
                      log.type === 'warn' && styles.warnLog,
                    ]}>
                      {log.message}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {logs.length} log entries • Tap copy to share with Claude
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  debugModal: {
    width: '100%',
    height: '80%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  logEntry: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  timestamp: {
    color: '#888888',
    fontSize: 12,
    fontFamily: 'monospace',
    marginRight: 12,
    minWidth: 70,
  },
  logMessage: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
  },
  errorLog: {
    color: '#ff6b6b',
  },
  warnLog: {
    color: '#ffa726',
  },
  noLogs: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    margin: 20,
  },
  footer: {
    backgroundColor: '#2a2a2a',
    padding: 12,
  },
  footerText: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'center',
  },
});