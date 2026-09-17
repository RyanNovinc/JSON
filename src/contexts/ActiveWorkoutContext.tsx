import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { WorkoutStorage } from '../utils/storage';
import { sessionFromRecord } from '../utils/activeWorkoutSession';
import type { ActiveWorkoutSession } from '../utils/activeWorkoutSession';

export type ActiveWorkout = ActiveWorkoutSession;

interface ActiveWorkoutContextType {
  activeWorkout: ActiveWorkout | null;
  setActiveWorkout: (workout: ActiveWorkout | null) => void;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextType | undefined>(undefined);

export function ActiveWorkoutProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);

  // The timer is persisted by WorkoutLogScreenAdapter, but this context is
  // in-memory only, so a relaunch used to lose the resume bar while the stored
  // start time kept "running". Seed the context from storage once at mount.
  // App.tsx awaits runMigrations() before rendering this provider, so the read
  // is safe (see CLAUDE.md gotcha 1). A session the adapter has already
  // announced by the time the read lands wins over the stored one.
  const hydratedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const records = await WorkoutStorage.loadAllCurrentWorkouts();
      if (cancelled || hydratedRef.current) return;
      hydratedRef.current = true;
      const session = records.map((r) => sessionFromRecord(r)).find((s) => s !== null) || null;
      if (!session) {
        console.log('⏱️ [ACTIVE-WORKOUT] No resumable workout in storage');
        return;
      }
      console.log('⏱️ [ACTIVE-WORKOUT] Rehydrated resumable workout:', session.dayName, session.duration, 's');
      setActiveWorkout((current) => current ?? session);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ activeWorkout, setActiveWorkout }), [activeWorkout]);

  return (
    <ActiveWorkoutContext.Provider value={value}>
      {children}
    </ActiveWorkoutContext.Provider>
  );
}

export function useActiveWorkout() {
  const context = useContext(ActiveWorkoutContext);
  if (context === undefined) {
    throw new Error('useActiveWorkout must be used within an ActiveWorkoutProvider');
  }
  return context;
}
