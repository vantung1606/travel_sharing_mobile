/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */
import { Text as DefaultText, TextInput as DefaultTextInput, View as DefaultView } from 'react-native';

import { useColorScheme } from './useColorScheme';

import Colors from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & React.ComponentProps<typeof DefaultText>;
export type ViewProps = ThemeProps & React.ComponentProps<typeof DefaultView>;

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const themedColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const color = (lightColor || darkColor) ? themedColor : undefined;

  return <DefaultText style={[{ fontFamily: SERIF_FONT }, color ? { color } : null, style]} {...otherProps} />;
}
export type TextInputProps = ThemeProps & React.ComponentProps<typeof DefaultTextInput>;

export function TextInput(props: TextInputProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const themedColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const color = (lightColor || darkColor) ? themedColor : undefined;

  return <DefaultTextInput style={[{ fontFamily: SERIF_FONT }, color ? { color } : null, style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

