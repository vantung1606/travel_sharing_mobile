import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { tabBarVisibility } from '@/src/services/tabBarVisibility';

interface FABProps {
  onPress: () => void;
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  accessibilityLabel?: string;
}

/** Nút hành động nổi 58px, tự động trượt theo thanh điều hướng */
export function FAB({ onPress, icon = 'plus', accessibilityLabel = 'Tạo mới' }: FABProps) {
  const animY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return tabBarVisibility.subscribe((visible) => {
      Animated.spring(animY, {
        toValue: visible ? 0 : 58,
        useNativeDriver: true,
        friction: 8,
        tension: 45,
      }).start();
    });
  }, [animY]);

  return (
    <Animated.View style={[styles.fabWrap, { transform: [{ translateY: animY }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.fab}>
        <FontAwesome name={icon} size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    position: 'absolute',
    right: 18,
    bottom: 80,
    zIndex: 99,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
});
