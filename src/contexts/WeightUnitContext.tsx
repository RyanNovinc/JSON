import React, { createContext, useContext, useState, ReactNode } from 'react';

export type WeightUnit = 'kg' | 'lbs';

interface WeightUnitContextType {
  globalUnit: WeightUnit;
  exerciseUnits: { [exerciseIndex: number]: WeightUnit };
  setGlobalUnit: (unit: WeightUnit) => void;
  setExerciseUnit: (exerciseIndex: number, unit: WeightUnit) => void;
  getExerciseUnit: (exerciseIndex: number) => WeightUnit;
  convertWeight: (weight: number, fromUnit: WeightUnit, toUnit: WeightUnit) => number;
  formatWeight: (weight: number, unit: WeightUnit) => string;
}

const WeightUnitContext = createContext<WeightUnitContextType | undefined>(undefined);

interface WeightUnitProviderProps {
  children: ReactNode;
}

export const WeightUnitProvider: React.FC<WeightUnitProviderProps> = ({ children }) => {
  const [globalUnit, setGlobalUnit] = useState<WeightUnit>('kg');
  const [exerciseUnits, setExerciseUnits] = useState<{ [exerciseIndex: number]: WeightUnit }>({});

  const setExerciseUnit = (exerciseIndex: number, unit: WeightUnit) => {
    setExerciseUnits(prev => ({
      ...prev,
      [exerciseIndex]: unit
    }));
  };

  const getExerciseUnit = (exerciseIndex: number): WeightUnit => {
    return exerciseUnits[exerciseIndex] || globalUnit;
  };

  const convertWeight = (weight: number, fromUnit: WeightUnit, toUnit: WeightUnit): number => {
    if (fromUnit === toUnit) return weight;
    
    if (fromUnit === 'kg' && toUnit === 'lbs') {
      return Math.round(weight * 2.20462 * 10) / 10; // Round to 1 decimal
    } else if (fromUnit === 'lbs' && toUnit === 'kg') {
      return Math.round(weight / 2.20462 * 10) / 10; // Round to 1 decimal
    }
    
    return weight;
  };

  const formatWeight = (weight: number, unit: WeightUnit): string => {
    return `${weight}${unit}`;
  };

  return (
    <WeightUnitContext.Provider 
      value={{ 
        globalUnit,
        exerciseUnits,
        setGlobalUnit,
        setExerciseUnit,
        getExerciseUnit,
        convertWeight,
        formatWeight
      }}
    >
      {children}
    </WeightUnitContext.Provider>
  );
};

export const useWeightUnit = (): WeightUnitContextType => {
  const context = useContext(WeightUnitContext);
  if (context === undefined) {
    throw new Error('useWeightUnit must be used within a WeightUnitProvider');
  }
  return context;
};