import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { DS_COLOR, DS_SHADOW } from '@/constants/DesignSystem';

interface FABProps {
  onPress: () => void;
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  accessibilityLabel?: string;
}

/** Nút hành động nổi 56px, đặt trên tab bar 16px. */
export function FAB({ onPress, icon = 'plus', accessibilityLabel = 'Tạo mới' }: FABProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.fab}>
      <FontAwesome name={icon} size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
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
    elevation: 7,
  },
});
