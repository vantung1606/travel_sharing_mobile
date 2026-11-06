import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';

export interface SegmentedItem<T extends string> {
  key: T;
  label: string;
}

interface SegmentedTabsProps<T extends string> {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (key: T) => void;
}

/**
 * Segmented control kiểu iOS: nền xám, "thumb" trắng trượt theo tab active.
 * Cao 40px, mỗi tab chia đều và đủ vùng chạm.
 */
export function SegmentedTabs<T extends string>({ items, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {items.map((item) => {
        const active = item.key === value;
        return (
          <TouchableOpacity
            key={item.key}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(item.key)}>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 40,
    padding: 3,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.surfaceMuted,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DS_RADIUS.sm,
    paddingHorizontal: 4,
  },
  tabActive: {
    backgroundColor: DS_COLOR.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  label: {
    fontSize: DS_TYPE.meta,
    fontWeight: '500',
    color: DS_COLOR.inkMuted,
  },
  labelActive: {
    color: DS_COLOR.ink,
    fontWeight: '600',
  },
});
