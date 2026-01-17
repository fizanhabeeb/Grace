// src/utils/screenUtil.js
import { Dimensions, PixelRatio } from 'react-native';

// Get current device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =========================================================
// CONFIGURATION
// Base dimensions your app was designed for (e.g., iPhone 11 / Pixel)
// If you designed it mainly on a Tablet, change these to ~800 x 1280
// =========================================================
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/**
 * scale(size):
 * Linearly scales the size based on screen width.
 * Good for: Widths, Margins, Paddings.
 * Usage: width: scale(100)
 */
const scale = (size) => (SCREEN_WIDTH / GUIDELINE_BASE_WIDTH) * size;

/**
 * verticalScale(size):
 * Linearly scales the size based on screen height.
 * Good for: Heights.
 * Usage: height: verticalScale(50)
 */
const verticalScale = (size) => (SCREEN_HEIGHT / GUIDELINE_BASE_HEIGHT) * size;

/**
 * moderateScale(size, factor):
 * Scales size but not linearly. Used to keep things looking "normal" 
 * on tablets without becoming comically huge.
 * Good for: Font Sizes, Icon Sizes.
 * Usage: fontSize: moderateScale(16)
 */
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * wp(percentage): Width Percentage
 * Returns calculated width based on percentage of screen width.
 * Usage: width: wp('50%')
 */
const wp = (widthPercent) => {
  const elemWidth = typeof widthPercent === "number" ? widthPercent : parseFloat(widthPercent);
  return PixelRatio.roundToNearestPixel(SCREEN_WIDTH * elemWidth / 100);
};

/**
 * hp(percentage): Height Percentage
 * Returns calculated height based on percentage of screen height.
 * Usage: height: hp('30%')
 */
const hp = (heightPercent) => {
  const elemHeight = typeof heightPercent === "number" ? heightPercent : parseFloat(heightPercent);
  return PixelRatio.roundToNearestPixel(SCREEN_HEIGHT * elemHeight / 100);
};

export { 
  scale, 
  verticalScale, 
  moderateScale, 
  wp, 
  hp, 
  SCREEN_WIDTH, 
  SCREEN_HEIGHT 
};