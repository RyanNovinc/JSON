import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { WorkoutStorage } from '../utils/storage';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryAlpha20: string;
  primaryAlpha10: string;
}

interface ThemeContextType {
  isPinkTheme: boolean;
  setIsPinkTheme: (isPink: boolean) => void;
  colors: ThemeColors;
  themeColor: string; // Backward compatibility
  themeColorLight: string; // Backward compatibility
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [isPinkTheme, setIsPinkTheme] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      const savedTheme = await WorkoutStorage.loadThemePreference();
      setIsPinkTheme(savedTheme);
    };
    loadThemePreference();
  }, []);

  // Save theme preference when it changes
  const handleSetIsPinkTheme = async (isPink: boolean) => {
    setIsPinkTheme(isPink);
    await WorkoutStorage.saveThemePreference(isPink);
  };

  const colors: ThemeColors = {
    primary: isPinkTheme ? '#ec4899' : '#22d3ee',
    primaryLight: isPinkTheme ? '#ec489940' : '#22d3ee40',
    primaryDark: isPinkTheme ? '#be185d' : '#0891b2',
    primaryAlpha20: isPinkTheme ? '#ec489920' : '#22d3ee20',
    primaryAlpha10: isPinkTheme ? '#ec489910' : '#22d3ee10',
  };

  // Backward compatibility
  const themeColor = colors.primary;
  const themeColorLight = colors.primaryLight;

  return (
    <ThemeContext.Provider 
      value={{ 
        isPinkTheme, 
        setIsPinkTheme: handleSetIsPinkTheme, 
        colors,
        themeColor,
        themeColorLight 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};