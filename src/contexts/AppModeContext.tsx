import React, { createContext, useContext, useState, ReactNode } from 'react';

export type AppMode = 'training' | 'nutrition';

interface AppModeContextType {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  isTrainingMode: boolean;
  isNutritionMode: boolean;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

interface AppModeProviderProps {
  children: ReactNode;
}

export const AppModeProvider: React.FC<AppModeProviderProps> = ({ children }) => {
  const [appMode, setAppMode] = useState<AppMode>('training'); // Default to training

  const isTrainingMode = appMode === 'training';
  const isNutritionMode = appMode === 'nutrition';

  return (
    <AppModeContext.Provider 
      value={{ 
        appMode,
        setAppMode,
        isTrainingMode,
        isNutritionMode
      }}
    >
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = (): AppModeContextType => {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
};