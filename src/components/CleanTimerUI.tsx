import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSimpleTimer } from '../contexts/SimpleTimerContext';
import { useTheme } from '../contexts/ThemeContext';

export const CleanTimerUI: React.FC = () => {
  const { timer, isMinimized, startTimer, pauseTimer, resumeTimer, adjustTime, clearTimer, setMinimized, toggleQuickMode, toggleCountMode } = useSimpleTimer();
  const { themeColor } = useTheme();

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!timer) {
    // Show 0:00 when no timer active
    return (
      <View 
        style={{
          position: 'absolute',
          bottom: 34,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 99999,
          pointerEvents: 'box-none'
        }}
      >
        <TouchableOpacity 
          style={{
            backgroundColor: '#18181b',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#27272a',
            paddingHorizontal: 20,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
          onPress={() => {
            console.log('Opening timer with startValue: 0, isCountUp: true');
            // Create a default timer but don't auto-start it
            startTimer({ 
              name: 'Rest Timer', 
              isCountUp: true, // Count up from 0:00
              startValue: 0, // Start at 0:00
              autoStart: false
            });
            setMinimized(false);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="timer-outline" size={18} color={themeColor} />
          <Text style={{
            fontSize: 15,
            fontWeight: '600',
            color: themeColor
          }}>
            0:00
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {/* Minimized Timer Display */}
      {isMinimized && (
        <View 
          style={{
            position: 'absolute',
            bottom: 34,
            left: 0,
            right: 0,
            alignItems: 'center',
            zIndex: 99999,
            pointerEvents: 'box-none'
          }}
        >
          <TouchableOpacity 
            style={{
              backgroundColor: '#18181b',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#27272a',
              paddingHorizontal: 20,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onPress={() => setMinimized(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="timer-outline" size={18} color={themeColor} />
            <Text style={{
              fontSize: 15,
              fontWeight: '600',
              color: themeColor
            }}>
              {formatTime(timer.currentTime)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Full Timer Modal */}
      <Modal
        visible={timer && !isMinimized}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMinimized(true)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.85)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {timer && (
          <View style={{
            backgroundColor: '#18181b',
            borderRadius: 24,
            padding: 24,
            marginHorizontal: 20,
            width: '90%',
            maxWidth: 380,
            borderWidth: 1,
            borderColor: `${themeColor}25`,
            shadowColor: themeColor,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}>
            
            {/* Close Button */}
            <TouchableOpacity 
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onPress={() => {
                console.log('Close button pressed');
                setMinimized(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#ffffff" />
            </TouchableOpacity>

            {/* Timer Title */}
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: 24,
            }}>
              {timer.isQuickMode ? `Quick ${timer.name}` : `Optimal ${timer.name}`}
            </Text>

            {/* Main Timer Display */}
            <Text style={{
              fontSize: 64,
              fontWeight: '300',
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: 32,
              letterSpacing: -2,
            }}>
              {formatTime(timer.currentTime)}
            </Text>

            {/* Timer Settings Toggles */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
              gap: 16,
            }}>
              
              {/* Quick/Optimal Toggle */}
              <TouchableOpacity 
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: timer.isQuickMode ? themeColor : 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: timer.isQuickMode ? themeColor : 'rgba(255,255,255,0.2)',
                }}
                onPress={toggleQuickMode}
              >
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: timer.isQuickMode ? '#000000' : '#ffffff' 
                }}>
                  {timer.isQuickMode ? 'Quick' : 'Optimal'}
                </Text>
              </TouchableOpacity>

              {/* Count Up/Down Toggle */}
              <TouchableOpacity 
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: timer.isCountUp ? themeColor : 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: timer.isCountUp ? themeColor : 'rgba(255,255,255,0.2)',
                }}
                onPress={toggleCountMode}
              >
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: timer.isCountUp ? '#000000' : '#ffffff' 
                }}>
                  {timer.isCountUp ? 'Count Up' : 'Countdown'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Control Buttons Row */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}>
              
              {/* -15 Button */}
              <TouchableOpacity 
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                }}
                onPress={() => adjustTime(-15)}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                  -15s
                </Text>
              </TouchableOpacity>

              {/* Play/Pause Button */}
              <TouchableOpacity 
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: themeColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: themeColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
                onPress={() => {
                  if (timer.isRunning) {
                    pauseTimer();
                  } else {
                    resumeTimer();
                  }
                }}
              >
                <Ionicons 
                  name={timer.isRunning ? "pause" : "play"} 
                  size={24} 
                  color="#ffffff"
                  style={{ marginLeft: timer.isRunning ? 0 : 3 }}
                />
              </TouchableOpacity>

              {/* +15 Button */}
              <TouchableOpacity 
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                }}
                onPress={() => adjustTime(15)}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ffffff' }}>
                  +15s
                </Text>
              </TouchableOpacity>
            </View>

            {/* Clear Timer Button */}
            <TouchableOpacity 
              style={{
                paddingVertical: 12,
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                alignItems: 'center',
              }}
              onPress={() => {
                clearTimer();
                setMinimized(true);
              }}
            >
              <Text style={{ fontSize: 14, color: '#888888' }}>
                Clear Timer
              </Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
      </Modal>
    </>
  );
};