// src/utils/useOrientation.js
import { useWindowDimensions } from 'react-native';

export default function useOrientation() {
  // modern hook: auto-updates on rotation, no need for useEffect/listeners
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  const isPortrait = height >= width;
  
  // "380" is a good breakpoint for small phones (iPhone SE, older Androids)
  const isSmallScreen = Math.min(width, height) < 380;
  
  // "600" is the standard Android breakpoint for 7-inch tablets and up
  const isTablet = Math.min(width, height) >= 600;
  
  // GRID LOGIC:
  // Tablet Landscape: 4 columns
  // Tablet Portrait:  3 columns
  // Phone Landscape:  3 columns
  // Phone Portrait:   2 columns
  const numColumns = isLandscape ? (isTablet ? 4 : 3) : (isTablet ? 3 : 2);
  
  // Calculates exact card width based on screen size (assuming ~10px margins)
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