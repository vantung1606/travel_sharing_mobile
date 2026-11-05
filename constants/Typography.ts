import { Platform } from 'react-native';

/**
 * Modern Native Font Stacks (Option 1: Modern Wanderlust - Airbnb / Travel Grade):
 * Crisp, clean typography with 100% complete Vietnamese diacritic / tone mark support.
 * Eliminates disjointed accents (e.g. sắ́ m -> sắm, kiế́n -> kiến, Tiế́t -> Tiết) caused by legacy serif fallbacks.
 */
export const SANS_FONT = Platform.select({
  ios: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
  android: 'Roboto, "Helvetica Neue", Arial, sans-serif',
  web: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  default: 'sans-serif',
});

// Map SERIF_FONT directly to SANS_FONT so all screens and modals immediately adopt
// modern, unbroken typography across web and mobile.
export const SERIF_FONT = SANS_FONT;

export function applyGlobalSerifTypography() {
  // Uses clean native system sans-serif typography across all platforms.
}
