import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS } from '../theme';

const THEME_KEY = '@securevault_theme_mode';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system'); // 'system', 'light', 'dark'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_KEY);
      if (savedMode) {
        setThemeMode(savedMode);
      }
    } catch (e) {
      console.error('Failed to load theme mode', e);
    } finally {
      setLoading(false);
    }
  };

  const updateThemeMode = async (mode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem(THEME_KEY, mode);
    } catch (e) {
      console.error('Failed to save theme mode', e);
    }
  };

  // Determine actual theme
  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark' 
    : themeMode === 'dark';

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ 
      themeMode, 
      setThemeMode: updateThemeMode, 
      isDark, 
      colors,
      loading 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
