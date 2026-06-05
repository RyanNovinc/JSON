import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const WeightUnitProvider = ({ children }: WeightUnitProviderProps) => {
  const [globalUnit, setGlobalUnit] = useState<WeightUnit>('kg');
  const [exerciseUnits, setExerciseUnits] = useState<{ [exerciseIndex: number]: WeightUnit }>({});

  // Load saved weight unit preference on mount
  useEffect(() => {
    const loadWeightUnitPreference = async () => {
      try {
        const savedUnit = await AsyncStorage.getItem('globalWeightUnit');
        if (savedUnit && (savedUnit === 'kg' || savedUnit === 'lbs')) {
          setGlobalUnit(savedUnit as WeightUnit);
        }
      } catch (error) {
        console.error('Failed to load weight unit preference:', error);
      }
    };
    
    loadWeightUnitPreference();
  }, []);

  // Save weight unit preference when it changes
  const setGlobalUnitAndSave = async (unit: WeightUnit) => {
    try {
      setGlobalUnit(unit);
      await AsyncStorage.setItem('globalWeightUnit', unit);
    } catch (error) {
      console.error('Failed to save weight unit preference:', error);
    }
  };

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
        setGlobalUnit: setGlobalUnitAndSave,
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