import { Platform } from 'react-native';

/**
 * Standard Times New Roman / Serif font resolution across platforms:
 * - iOS: 'Times New Roman'
 * - Android: 'serif' (Android native Times New Roman equivalent)
 * - Web / Desktop: 'Times New Roman, serif'
 */
export const SERIF_FONT = Platform.select({
  ios: 'Times New Roman',
  android: 'serif',
  web: 'Times New Roman, serif',
  default: 'serif',
}) || 'serif';

/**
 * Safe initializer for typography
 */
export function applyGlobalSerifTypography() {
  try {
    const RN = require('react-native');
    if (RN?.Text && typeof RN.Text === 'object' && RN.Text.defaultProps) {
      RN.Text.defaultProps.style = [{ fontFamily: SERIF_FONT }, RN.Text.defaultProps.style];
    }
    if (RN?.TextInput && typeof RN.TextInput === 'object' && RN.TextInput.defaultProps) {
      RN.TextInput.defaultProps.style = [{ fontFamily: SERIF_FONT }, RN.TextInput.defaultProps.style];
    }
  } catch {
    // Safe fallback for Hermes
  }
}
