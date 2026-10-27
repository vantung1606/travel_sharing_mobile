import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { LogBox, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { BrandSplash } from '@/components/BrandSplash';
import { ConfirmHost } from '@/components/ConfirmDialog';
import { ToastHost } from '@/components/Toast';
import { useColorScheme } from '@/components/useColorScheme';
import { WF_PAPER } from '@/constants/Colors';
import { applyGlobalSerifTypography } from '@/constants/Typography';

// Initialize global Times New Roman / Serif typography across the entire app
applyGlobalSerifTypography();

LogBox.ignoreLogs(['Cannot connect to Expo CLI']);

const WAYFARE_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: WF_PAPER.clay,
    background: WF_PAPER.bg,
    card: WF_PAPER.card,
    text: WF_PAPER.inkPrimary,
    border: WF_PAPER.cardBorder,
    notification: WF_PAPER.clay,
  },
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  anchor: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);

  const handleSplashFinish = useCallback(() => setShowLaunchSplash(false), []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <View style={styles.root}>
      <StatusBar style={showLaunchSplash ? 'light' : 'dark'} />
      <RootLayoutNav />
      <ConfirmHost />
      <ToastHost />
      {showLaunchSplash ? <BrandSplash onFinish={handleSplashFinish} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WF_PAPER.bg,
  },
});

function RootLayoutNav() {
  return (
    <ThemeProvider value={WAYFARE_THEME}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

