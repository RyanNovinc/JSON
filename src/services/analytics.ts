// analytics.ts — minimal, self-hosted event tracking for React Native.
// No third-party analytics SDK. Events are batched, persisted across app
// kills, and flushed to YOUR OWN AWS Lambda endpoint as JSON.
//
// See EVENTS.md for the canonical event catalogue.
//
// Only dependency: @react-native-async-storage/async-storage (you almost
// certainly already have this; if not: npm i @react-native-async-storage/async-storage).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

type Props = Record<string, string | number | boolean | null | undefined>;

interface InitConfig {
  endpoint: string;
  appVersion: string;
  sharedSecret?: string;
  flushIntervalMs?: number;  // default 10s
  sessionTimeoutMs?: number; // default 30 min
  debug?: boolean;
}

interface StoredEvent {
  event: string;
  timestamp: string;
  anon_id: string;
  session_id: string;
  properties: Props;
  context: {
    surface: 'app';
    platform: string;
    os_version: string;
    app_version: string;
  };
}

const ANON_KEY = '@jsonfit_analytics_anon_id';
const QUEUE_KEY = '@jsonfit_analytics_queue';

// Math.random v4 — fine for an anonymous, non-security identifier.
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class AnalyticsClient {
  private cfg: Required<InitConfig> | null = null;
  private anonId = '';
  private sessionId = '';
  private lastActivity = 0;
  private queue: StoredEvent[] = [];
  private ready = false;

  async init(config: InitConfig) {
    this.cfg = {
      flushIntervalMs: 10_000,
      sessionTimeoutMs: 30 * 60_000,
      sharedSecret: '',
      debug: false,
      ...config,
    };

    // Restore or create the anonymous id.
    let id = await AsyncStorage.getItem(ANON_KEY);
    if (!id) {
      id = uuid();
      await AsyncStorage.setItem(ANON_KEY, id);
    }
    this.anonId = id;

    // Restore any events that didn't flush before the last app kill.
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      if (raw) this.queue = JSON.parse(raw);
    } catch {}

    this.ready = true;
    this.rollSession();

    // Periodic flush.
    setInterval(() => this.flush(), this.cfg.flushIntervalMs);

    // Flush when the app backgrounds (best chance before iOS suspends it).
    AppState.addEventListener('change', s => {
      if (s === 'background' || s === 'inactive') this.flush();
    });

    this.track('app_opened', {});
    this.flush();
  }

  private rollSession() {
    if (!this.cfg) return;
    const now = Date.now();
    if (!this.sessionId || now - this.lastActivity > this.cfg.sessionTimeoutMs) {
      this.sessionId = uuid();
      if (this.ready) this.enqueue('session_started', {});
    }
    this.lastActivity = now;
  }

  track(event: string, properties: Props = {}) {
    if (!this.cfg) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[analytics] track() called before init():', event);
      }
      return;
    }
    this.rollSession();
    this.enqueue(event, properties);
    if (this.cfg.debug) console.log('[analytics]', event, properties);
  }

  private enqueue(event: string, properties: Props) {
    const ev: StoredEvent = {
      event,
      timestamp: new Date().toISOString(),
      anon_id: this.anonId,
      session_id: this.sessionId,
      properties,
      context: {
        surface: 'app',
        platform: Platform.OS,
        os_version: String(Platform.Version),
        app_version: this.cfg!.appVersion,
      },
    };
    this.queue.push(ev);

    // Cap the queue so a long offline stretch can't grow it unbounded.
    if (this.queue.length > 500) {
      this.queue.splice(0, this.queue.length - 500);
    }

    // Persist immediately so an app kill doesn't lose the event.
    AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue)).catch(() => {});
  }

  async flush() {
    if (!this.cfg || this.queue.length === 0) return;
    const batch = this.queue.slice();
    try {
      const res = await fetch(this.cfg.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.cfg.sharedSecret ? { 'x-analytics-key': this.cfg.sharedSecret } : {}),
        },
        body: JSON.stringify({ events: batch }),
      });
      if (res.ok) {
        this.queue.splice(0, batch.length);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
      }
    } catch {
      // Offline or endpoint down — keep the queue, retry next interval.
    }
  }
}

export const Analytics = new AnalyticsClient();
