// src/contexts/CookTimerContext.tsx
//
// Global timer state for Cook Mode.
// - Multiple concurrent timers (e.g. searing + rice cooking)
// - Persists across step navigation
// - Plays a sound on completion (assets/sounds/timer_ding.mp3)
// - Schedules a local notification so user is alerted even if app is backgrounded
// - Supports adjustTimer (any delta seconds, positive or negative), pause, cancel, dismiss-finished

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

// ============================================================================
// Types
// ============================================================================

export interface ActiveCookTimer {
  id: string;
  label: string;
  total_seconds: number;
  end_at: number;
  remaining_seconds: number;
  state: 'running' | 'paused' | 'finished';
  notification_id?: string;
}

interface CookTimerContextValue {
  timers: ActiveCookTimer[];
  startTimer: (id: string, label: string, total_seconds: number) => void;
  stopTimer: (id: string) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  adjustTimer: (id: string, delta_seconds: number) => void;
  dismissFinished: (id: string) => void;
  isTimerActive: (id: string) => boolean;
}

const CookTimerContext = createContext<CookTimerContextValue | null>(null);

// ============================================================================
// One-time setup
// ============================================================================

let notificationsConfigured = false;
async function configureNotifications() {
  if (notificationsConfigured) return;
  notificationsConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as any),
  });

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch (e) {
    console.warn('Notification permission request failed:', e);
  }
}

let dingSound: Audio.Sound | null = null;
async function loadDingSound() {
  if (dingSound) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/timer_ding.mp3'),
      { shouldPlay: false }
    );
    dingSound = sound;
  } catch (e) {
    console.warn('Failed to load timer ding sound:', e);
  }
}

async function playDing() {
  if (!dingSound) await loadDingSound();
  if (!dingSound) return;
  try {
    await dingSound.replayAsync();
  } catch (e) {
    console.warn('Failed to play timer ding:', e);
  }
}

async function scheduleTimerNotification(
  label: string,
  seconds: number
): Promise<string | undefined> {
  if (seconds <= 0) return undefined;
  try {
    const notification_id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${label} — time's up`,
        body: 'Tap to return to Cook Mode',
        sound: 'default',
      },
      trigger: {
        seconds,
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      } as Notifications.TimeIntervalTriggerInput,
    });
    return notification_id;
  } catch (e) {
    console.warn('Failed to schedule notification:', e);
    return undefined;
  }
}

async function cancelNotification(notification_id: string | undefined) {
  if (!notification_id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notification_id);
  } catch (e) {
    // Already fired or missing — fine.
  }
}

// ============================================================================
// Provider
// ============================================================================

export function CookTimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<ActiveCookTimer[]>([]);
  const firedRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    configureNotifications();
    loadDingSound();
  }, []);

  // Tick: update remaining_seconds for running timers, transition to 'finished' at 0
  useEffect(() => {
    const hasRunning = timers.some(t => t.state === 'running');
    if (!hasRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      setTimers(prev => {
        const now = Date.now();
        let changed = false;
        const next = prev.map(t => {
          if (t.state !== 'running') return t;
          const remaining = Math.max(0, Math.ceil((t.end_at - now) / 1000));
          if (remaining === t.remaining_seconds) return t;
          changed = true;
          if (remaining === 0) {
            if (!firedRef.current.has(t.id)) {
              firedRef.current.add(t.id);
              playDing();
            }
            return { ...t, remaining_seconds: 0, state: 'finished' as const };
          }
          return { ...t, remaining_seconds: remaining };
        });
        return changed ? next : prev;
      });
    }, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timers]);

  // ===== Actions =====

  const startTimer = useCallback((id: string, label: string, total_seconds: number) => {
    firedRef.current.delete(id);
    const now = Date.now();
    const newTimer: ActiveCookTimer = {
      id,
      label,
      total_seconds,
      end_at: now + total_seconds * 1000,
      remaining_seconds: total_seconds,
      state: 'running',
    };

    (async () => {
      const notification_id = await scheduleTimerNotification(label, total_seconds);
      if (notification_id) {
        setTimers(prev => prev.map(t => (t.id === id ? { ...t, notification_id } : t)));
      }
    })();

    setTimers(prev => {
      const without = prev.filter(t => t.id !== id);
      return [...without, newTimer];
    });
  }, []);

  const stopTimer = useCallback((id: string) => {
    setTimers(prev => {
      const t = prev.find(x => x.id === id);
      if (t?.notification_id) {
        cancelNotification(t.notification_id);
      }
      firedRef.current.delete(id);
      return prev.filter(x => x.id !== id);
    });
  }, []);

  const pauseTimer = useCallback((id: string) => {
    setTimers(prev =>
      prev.map(t => {
        if (t.id !== id || t.state !== 'running') return t;
        if (t.notification_id) {
          cancelNotification(t.notification_id);
        }
        return { ...t, state: 'paused' as const, notification_id: undefined };
      })
    );
  }, []);

  const resumeTimer = useCallback((id: string) => {
    setTimers(prev =>
      prev.map(t => {
        if (t.id !== id || t.state !== 'paused') return t;
        const new_end = Date.now() + t.remaining_seconds * 1000;
        (async () => {
          const notification_id = await scheduleTimerNotification(
            t.label,
            t.remaining_seconds
          );
          if (notification_id) {
            setTimers(prev2 =>
              prev2.map(t2 => (t2.id === id ? { ...t2, notification_id } : t2))
            );
          }
        })();
        return { ...t, state: 'running' as const, end_at: new_end };
      })
    );
  }, []);

  /**
   * Adjust a timer by delta_seconds (positive or negative).
   * - If the new remaining is <= 0, the timer immediately enters 'finished' state.
   * - If the timer was already finished and delta is positive, it returns to 'running'.
   * - Cancels the old notification and schedules a new one to match the new end.
   */
  const adjustTimer = useCallback((id: string, delta_seconds: number) => {
    setTimers(prev =>
      prev.map(t => {
        if (t.id !== id) return t;

        // Cancel any existing scheduled notification — we'll re-schedule below if needed.
        if (t.notification_id) {
          cancelNotification(t.notification_id);
        }

        const new_remaining = Math.max(0, t.remaining_seconds + delta_seconds);
        const new_total = Math.max(0, t.total_seconds + delta_seconds);

        // If we land at 0, timer finishes. Don't schedule a notification.
        if (new_remaining === 0) {
          // If not already fired, ding once.
          if (!firedRef.current.has(id)) {
            firedRef.current.add(id);
            playDing();
          }
          return {
            ...t,
            remaining_seconds: 0,
            total_seconds: new_total,
            state: 'finished' as const,
            notification_id: undefined,
          };
        }

        // Otherwise, the timer is (re-)running. Clear the fired flag so it can ding again later.
        firedRef.current.delete(id);

        const new_end = Date.now() + new_remaining * 1000;

        // Schedule a fresh notification matching the new end.
        (async () => {
          const notification_id = await scheduleTimerNotification(t.label, new_remaining);
          if (notification_id) {
            setTimers(prev2 =>
              prev2.map(t2 => (t2.id === id ? { ...t2, notification_id } : t2))
            );
          }
        })();

        return {
          ...t,
          remaining_seconds: new_remaining,
          total_seconds: new_total,
          end_at: new_end,
          state: 'running' as const,
          notification_id: undefined,
        };
      })
    );
  }, []);

  const dismissFinished = useCallback((id: string) => {
    setTimers(prev => prev.filter(t => t.id !== id));
    firedRef.current.delete(id);
  }, []);

  const isTimerActive = useCallback(
    (id: string) => timers.some(t => t.id === id),
    [timers]
  );

  const value: CookTimerContextValue = {
    timers,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    adjustTimer,
    dismissFinished,
    isTimerActive,
  };

  return <CookTimerContext.Provider value={value}>{children}</CookTimerContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useCookTimers(): CookTimerContextValue {
  const ctx = useContext(CookTimerContext);
  if (!ctx) {
    throw new Error('useCookTimers must be used inside a CookTimerProvider');
  }
  return ctx;
}

// ============================================================================
// Format helpers
// ============================================================================

export function formatRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00';

  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatEndTime(remaining_seconds: number): string | null {
  if (remaining_seconds < 1800) return null;
  const end = new Date(Date.now() + remaining_seconds * 1000);
  let hours = end.getHours();
  const mins = end.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${String(mins).padStart(2, '0')} ${ampm}`;
}