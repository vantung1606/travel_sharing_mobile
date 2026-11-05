import { Platform } from 'react-native';

/**
 * Modern Native Font Stacks:
 * - SANS_FONT: Crisp, clean native typography for buttons, tabs, inputs, and UI text.
 * - SERIF_FONT: Elegant editorial accent for travel journal titles and hero headers.
 */
export const SANS_FONT = Platform.select({
  ios: 'System',
  android: 'Roboto',
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: 'sans-serif',
});

export const SERIF_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Georgia, Cambria, "Times New Roman", Times, serif',
  default: 'serif',
});

/**
 * Typography configuration for Modern Wanderlust UI.
 * Uses clean system sans-serif by default for a crisp native mobile feel,
 * while reserving serif for editorial travel headlines.
 */
export function applyGlobalSerifTypography() {
  // Clean native default sans-serif is used by default in React Native.
}
