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
    height: 36,
    paddingHorizontal: 14,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chipActive: {
    backgroundColor: DS_COLOR.accent,
    borderColor: DS_COLOR.accent,
    shadowColor: DS_COLOR.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.32,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.inkSecondary,
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  check: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
