import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SERIF_FONT } from '@/constants/Typography';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const LOGO_RATIO = 676 / 1732;

interface BrandSplashProps {
  onFinish?: () => void;
}

/**
 * Màn hình chờ thương hiệu hiển thị ngay sau native splash.
 * Đồng bộ nền mực #1E1A15 và logo trắng với cấu hình splash trong app.json.
 */
export function BrandSplash({ onFinish }: BrandSplashProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentShift = useRef(new Animated.Value(14)).current;
  const dotOne = useRef(new Animated.Value(0.3)).current;
  const dotTwo = useRef(new Animated.Value(0.3)).current;
  const dotThree = useRef(new Animated.Value(0.3)).current;

  const logoWidth = Math.min(268, Math.max(204, width * 0.56));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(contentShift, {
        toValue: 0,
        duration: 780,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();

    const makeDotLoop = (value: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 420,
            easing: Easing.in(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.delay(460),
        ])
      );

    const loops = [dotOne, dotTwo, dotThree].map(makeDotLoop);
    const dotTimers = loops.map((loop, index) => {
      const timer = setTimeout(() => loop.start(), index * 160);
      return timer;
    });

    const exitTimer = setTimeout(() => {
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 430,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished) onFinish?.();
      });
    }, 1250);

    return () => {
      clearTimeout(exitTimer);
      dotTimers.forEach(clearTimeout);
      loops.forEach((loop) => loop.stop());
    };
  }, [contentOpacity, contentShift, dotOne, dotThree, dotTwo, onFinish, overlayOpacity]);

  return (
    <Animated.View
      style={[styles.overlay, { opacity: overlayOpacity }]}
      accessibilityLabel="Wayfare Travel đang chuẩn bị hành trình"
      accessibilityRole="progressbar">
      <View style={styles.orbitOuter} />
      <View style={styles.orbitInner} />
      <View style={styles.centerDot} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentShift }],
          },
        ]}>
        <Image
          source={require('../assets/images/wayfare-logo-white.png')}
          style={{ width: logoWidth, height: logoWidth * LOGO_RATIO }}
          resizeMode="contain"
        />

        <View style={styles.taglineRow}>
          <View style={styles.taglineLine} />
          <Text style={styles.tagline}>TRAVEL · SHARE · INSPIRE</Text>
          <View style={styles.taglineLine} />
        </View>
      </Animated.View>

      <View style={[styles.footer, { bottom: Math.max(insets.bottom, 16) + 46 }]}>
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dotOne }]} />
          <Animated.View style={[styles.dot, { opacity: dotTwo }]} />
          <Animated.View style={[styles.dot, { opacity: dotThree }]} />
        </View>
        <Text style={styles.loadingText}>ĐANG CHUẨN BỊ HÀNH TRÌNH</Text>
      </View>

      <Text style={[styles.brandFooter, { bottom: Math.max(insets.bottom, 16) + 14 }]}>
        WAYFARE TRAVEL
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#1E1A15',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
    overflow: 'hidden',
  },
  orbitOuter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -175,
    marginLeft: -175,
    width: 350,
    height: 350,
    borderRadius: 175,
    borderWidth: 1,
    borderColor: 'rgba(246, 230, 221, 0.10)',
  },
  orbitInner: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -124,
    marginLeft: -124,
    width: 248,
    height: 248,
    borderRadius: 124,
    borderWidth: 1,
    borderColor: 'rgba(246, 230, 221, 0.07)',
  },
  centerDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -177,
    marginLeft: -2.5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F6E6DD',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -26,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  taglineLine: {
    width: 22,
    height: 1,
    backgroundColor: 'rgba(246, 230, 221, 0.5)',
  },
  tagline: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2.6,
    color: 'rgba(255, 255, 255, 0.48)',
    fontFamily: SERIF_FONT,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 13,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F6E6DD',
  },
  loadingText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.7,
    color: 'rgba(255, 255, 255, 0.42)',
    fontFamily: SERIF_FONT,
  },
  brandFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 2.2,
    color: 'rgba(255, 255, 255, 0.2)',
    fontFamily: SERIF_FONT,
  },
});
