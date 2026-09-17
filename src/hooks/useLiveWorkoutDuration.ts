import { useEffect, useState } from 'react';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';

/**
 * Live duration, in seconds, of the workout in ActiveWorkoutContext.
 *
 * Shared by FloatingWorkoutIndicator (the resume bar) and CustomTabBar (the
 * timer in the Workouts tab), so both read the same way. Only one of the two is
 * on screen at a time. Same logic the indicator always used: seed from the
 * context's duration, then tick once a second while a workout is active.
 */
export function useLiveWorkoutDuration(): number {
  const { activeWorkout } = useActiveWorkout();
  const [liveDuration, setLiveDuration] = useState(0);

  useEffect(() => {
    if (activeWorkout) {
      setLiveDuration(activeWorkout.duration);

      const interval = setInterval(() => {
        setLiveDuration((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeWorkout?.duration]);

  return liveDuration;
}

/** 4 → "0:04", 754 → "12:34", 3930 → "1:05:30". */
export function formatWorkoutDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}