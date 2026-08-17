// src/hooks/useCheckInDue.ts
//
// "Is a weekly check-in waiting right now?" for components that never unmount.
//
// ProfileScreen does not need this: it re-reads inside useFocusEffect, and a
// screen that unmounts gets a fresh answer every time it comes back. The tab
// bar has no such moment, so it needs to be told. Three things can flip the
// answer under a permanently mounted component, and this covers all three:
//
//   1. The user closes a check-in    → subscribeToCheckIn fires on the write.
//   2. The due date passes with the app open → a scheduled re-check.
//   3. The due date passes with the app backgrounded → AppState 'active'.
//
// Deliberately returns a bare boolean. The tab bar shows a dot or it does not;
// giving it the day count as well would invite a "3 days left" label into a
// surface that is meant to stay a single quiet dot.

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  loadCheckInState,
  isCheckInDue,
  nextDueAt,
  subscribeToCheckIn,
} from '../utils/checkIn';

// Long setTimeout delays are unreliable on both platforms (and overflow past
// ~24.8 days), so a pending check-in re-checks at most this often and walks
// itself down to the real due moment.
const MAX_SCHEDULE_MS = 6 * 60 * 60 * 1000;

export function useCheckInDue(): boolean {
  const [due, setDue] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    const refresh = async () => {
      const state = await loadCheckInState();
      if (cancelled) return;

      const nowDue = isCheckInDue(state);
      setDue(nowDue);

      clearTimer();
      // Once it is due it stays due until a write closes it, and that write
      // notifies us — so there is nothing to wait for.
      if (!nowDue) {
        const untilDue = nextDueAt(state).getTime() - Date.now();
        const delay = Math.min(Math.max(untilDue + 1000, 1000), MAX_SCHEDULE_MS);
        timer = setTimeout(refresh, delay);
      }
    };

    refresh();

    const unsubscribe = subscribeToCheckIn(refresh);
    const appStateSub = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });

    return () => {
      cancelled = true;
      clearTimer();
      unsubscribe();
      appStateSub.remove();
    };
  }, []);

  return due;
}