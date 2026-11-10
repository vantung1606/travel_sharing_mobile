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
    height: 42,
    padding: 3,
    borderRadius: 21,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: '#64748B',
  },
  labelActive: {
    color: DS_COLOR.accent,
    fontWeight: '800',
  },
});
