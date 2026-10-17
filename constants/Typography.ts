import React from 'react';
import { Text, TextInput, Platform } from 'react-native';

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
});

// Flag to ensure single patching
let isTypographyPatched = false;

/**
 * Globally apply Times New Roman typography to all React Native Text & TextInput elements.
 */
export function applyGlobalSerifTypography() {
  if (isTypographyPatched) return;
  isTypographyPatched = true;

  try {
    const OriginalText = Text as any;
    if (OriginalText && !OriginalText.__serifApplied) {
      const PatchedText = function (props: any) {
        return React.createElement(OriginalText, {
          ...props,
          style: [{ fontFamily: SERIF_FONT }, props?.style],
        });
      };
      Object.setPrototypeOf(PatchedText, OriginalText);
      Object.assign(PatchedText, OriginalText);
      PatchedText.__serifApplied = true;
      (Text as any) = PatchedText;
    }

    const OriginalTextInput = TextInput as any;
    if (OriginalTextInput && !OriginalTextInput.__serifApplied) {
      const PatchedTextInput = React.forwardRef(function (props: any, ref: any) {
        return React.createElement(OriginalTextInput, {
          ...props,
          ref,
          style: [{ fontFamily: SERIF_FONT }, props?.style],
        });
      });
      Object.setPrototypeOf(PatchedTextInput, OriginalTextInput);
      (PatchedTextInput as any).__serifApplied = true;
      (TextInput as any) = PatchedTextInput;
    }
  } catch (e) {
    console.warn('Could not patch global typography:', e);
  }
}
