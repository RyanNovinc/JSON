import React, { createContext, useContext, useState } from 'react';

interface ActiveWorkout {
  dayName: string;
  blockName: string;
  duration: number;
  routeParams: {
    day: any;
    blockName: string;
  };
}

interface ActiveWorkoutContextType {
  activeWorkout: ActiveWorkout | null;
  setActiveWorkout: (workout: ActiveWorkout | null) => void;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextType | undefined>(undefined);

export function ActiveWorkoutProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);

  return (
    <ActiveWorkoutContext.Provider 
      value={{ activeWorkout, setActiveWorkout }}
    >
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