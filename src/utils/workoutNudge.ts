/**
 * "Still training?" nudge for a workout left open.
 *
 * Nothing here ends a workout. Two hours after the last logged set a local
 * notification asks the user to finish or discard, which is the Apple Watch
 * pattern and the only thing that catches "I forgot" before the next morning
 * (when the stale-session prompt takes over: see activeWorkoutSession.ts).
 *
 * Stateless on purpose: the pending nudge is found by its data tag through
 * getAllScheduledNotificationsAsync, so finish/discard after a relaunch can
 * still cancel it without persisting an id.
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { INACTIVITY_NUDGE_MS } from './activeWorkoutSession';

const NUDGE_KIND = 'workout_inactivity_nudge';
const CHANNEL_ID = 'workout-nudge';
// Per keystroke rescheduling would hammer the notification centre; once a
// minute is plenty for a two-hour fuse.
const RESCHEDULE_THROTTLE_MS = 60 * 1000;

let configured = false;
let lastScheduledAt = 0;

async function configure(): Promise<boolean> {
  if (configured) return true;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Workout reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== 'granted') {
        console.log('🔔 [WORKOUT-NUDGE] Notification permission not granted; nudge disabled');
        return false;
      }
    }
    configured = true;
    return true;
  } catch (e) {
    console.warn('🔔 [WORKOUT-NUDGE] Notification setup failed:', e);
    return false;
  }
}

async function findPendingNudgeIds(): Promise<string[]> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    return all
      .filter((n) => (n.content?.data as any)?.kind === NUDGE_KIND)
      .map((n) => n.identifier);
  } catch {
    return [];
  }
}

export async function cancelWorkoutNudge(): Promise<void> {
  lastScheduledAt = 0;
  const ids = await findPendingNudgeIds();
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)),
  );
  if (ids.length) console.log('🔔 [WORKOUT-NUDGE] Cancelled', ids.length, 'pending nudge(s)');
}

/**
 * (Re)arm the nudge for INACTIVITY_NUDGE_MS from now. Call on every logged
 * action; the throttle makes that cheap.
 */
export async function scheduleWorkoutNudge(dayName: string, force: boolean = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastScheduledAt < RESCHEDULE_THROTTLE_MS) return;
  lastScheduledAt = now;

  if (!(await configure())) return;
  const ids = await findPendingNudgeIds();
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)),
  );
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Still training?',
        body: `${dayName || 'Your workout'} has been open for a while. Finish it or discard it.`,
        data: { kind: NUDGE_KIND, dayName },
        ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
      },
      trigger: {
        seconds: Math.floor(INACTIVITY_NUDGE_MS / 1000),
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      } as Notifications.TimeIntervalTriggerInput,
    });
  } catch (e) {
    console.warn('🔔 [WORKOUT-NUDGE] Failed to schedule nudge:', e);
  }
}
