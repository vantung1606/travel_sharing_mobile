import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  /** Hiển thị dấu check thay vì chấm khi active. */
  showCheck?: boolean;
  disabled?: boolean;
}

/**
 * Chip lọc dùng chung: cao 34px (vùng chạm bù lên 44px bằng hitSlop),
 * pill 999, chỉ dùng accent cho trạng thái active.
 */
export function Chip({ label, active, onPress, style, showCheck, disabled }: ChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 5, bottom: 5, left: 4, right: 4 }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[styles.chip, active && styles.chipActive, style]}>
      {showCheck && active ? <Text style={styles.check}>✓</Text> : null}
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 34,
    paddingHorizontal: 13,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: DS_COLOR.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipActive: {
    backgroundColor: DS_COLOR.accent,
  },
  label: {
    fontSize: DS_TYPE.meta,
    fontWeight: '500',
    color: DS_COLOR.inkSecondary,
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  check: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
