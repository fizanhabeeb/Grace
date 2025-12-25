// src/context/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const ThemeContext = createContext();

export const lightTheme = {
  mode: 'light',
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#333333',
  textSecondary: '#666666',
  primary: '#8B0000',
  tint: '#ffcccc',
  border: '#eeeeee',
  icon: '#333333',
  headerText: '#ffffff',
  statBox: '#f0f0f0',
  statusBarStyle: 'light', // For Expo Status Bar
};

export const darkTheme = {
  mode: 'dark',
  background: '#121212',
  card: '#1E1E1E',
  text: '#ffffff',
  textSecondary: '#aaaaaa',
  primary: '#8B0000', // Keep branding consistent
  tint: '#550000',
  border: '#333333',
  icon: '#ffffff',
  headerText: '#ffffff',
  statBox: '#2C2C2C',
  statusBarStyle: 'light',
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme === 'dark') {
        setTheme(darkTheme);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = theme.mode === 'light' ? darkTheme : lightTheme;
      setTheme(newTheme);
      await AsyncStorage.setItem('app_theme', newTheme.mode);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme.mode === 'dark' }}>
      {/* Update StatusBar globally based on theme if needed, usually 'light' looks best with red header */}
      <StatusBar style={theme.statusBarStyle} /> 
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);