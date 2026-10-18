import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import { WF_COLORS } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface BrandedLoadingProps {
  title: string;
  subtitle?: string;
}

/**
 * Trạng thái đang tải đồng bộ thương hiệu cho các tab dùng nền sáng.
 * Thay cho spinner trần + dòng chữ lộ tên hạ tầng (Railway).
 */
export function BrandedLoading({ title, subtitle }: BrandedLoadingProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.in(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0],
  });
  const ringScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  });

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={title}
      accessibilityRole="progressbar">
      <View style={styles.badge}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
        <View style={styles.badgeCore}>
          <FontAwesome name="compass" size={25} color={WF_COLORS.primary} />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 46,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  badge: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ring: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: WF_COLORS.primary,
  },
  badgeCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_COLORS.primaryLight,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.18)',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: WF_COLORS.slate700,
    textAlign: 'center',
    fontFamily: SERIF_FONT,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 11.5,
    lineHeight: 17,
    color: WF_COLORS.slate500,
    textAlign: 'center',
    fontFamily: SERIF_FONT,
  },
});
