// LanguageContext.js - Manages language state across the app

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import translations from '../utils/translations';

// Create the context
const LanguageContext = createContext();

// Language Provider Component
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en'); // 'en' for English, 'ml' for Malayalam

  // Load saved language on app start
  useEffect(() => {
    loadLanguage();
  }, []);

  // Load language from storage
  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.log('Error loading language:', error);
    }
  };

  // Toggle between English and Malayalam
  const toggleLanguage = async () => {
    try {
      const newLanguage = language === 'en' ? 'ml' : 'en';
      setLanguage(newLanguage);
      await AsyncStorage.setItem('app_language', newLanguage);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  // Get translation for a key
  const t = (key) => {
    return translations[language][key] || key;
  };

  // Get category name in current language
  const getCategoryName = (category) => {
    const categoryMap = {
      'All': language === 'en' ? 'All' : 'എല്ലാം',
      'Breakfast': language === 'en' ? 'Breakfast' : 'പ്രഭാതഭക്ഷണം',
      'Rice': language === 'en' ? 'Rice' : 'ചോറ്',
      'Curry': language === 'en' ? 'Curry' : 'കറി',
      'Snacks': language === 'en' ? 'Snacks' : 'ലഘുഭക്ഷണം',
      'Beverages': language === 'en' ? 'Beverages' : 'പാനീയങ്ങൾ',
    };
    return categoryMap[category] || category;
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      toggleLanguage, 
      t,
      getCategoryName,
      isEnglish: language === 'en',
      isMalayalam: language === 'ml'
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;