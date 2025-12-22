// useOrientation.js - Hook to detect screen orientation changes

import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

export default function useOrientation() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    
    return () => {
      subscription?.remove();
    };
  }, []);
  
  const { width, height } = dimensions;
  const isLandscape = width > height;
  const isPortrait = height > width;
  const isSmallScreen = Math.min(width, height) < 380;
  const isTablet = Math.min(width, height) >= 600;
  
  // Calculate responsive values
  const numColumns = isLandscape ? (isTablet ? 4 : 3) : (isTablet ? 3 : 2);
  const cardWidth = (width - (numColumns + 1) * 10) / numColumns;
  
  return {
    width,
    height,
    isLandscape,
    isPortrait,
    isSmallScreen,
    isTablet,
    numColumns,
    cardWidth,
  };
}