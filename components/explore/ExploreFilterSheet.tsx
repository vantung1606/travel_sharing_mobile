import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/ui/Chip';
import { BUDGET_OPTIONS, EXPLORE_REGIONS, PLACE_CATEGORIES } from '@/components/explore/exploreFilters';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';

const ALL = 'Tất cả';

interface ExploreFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  category: string;
  onCategoryChange: (value: string) => void;
  city: string;
  onCityChange: (value: string) => void;
  /** Các tỉnh/thành đã gặp trong dữ liệu (không gồm "Tất cả"). */
  cities: string[];
  region: string;
  onRegionChange: (value: string) => void;
  budget: string;
  onBudgetChange: (value: string) => void;
  sortBy: 'popular' | 'rating' | 'nearest';
  onSortChange: (value: 'popular' | 'rating' | 'nearest') => void;
  onReset: () => void;
}

/**
 * Một sheet duy nhất cho toàn bộ bộ lọc Khám phá: danh mục, tỉnh thành,
 * vùng miền du lịch, thứ tự sắp xếp và khoảng giá — đồng bộ 1:1 với Web.
 */
export function ExploreFilterSheet({
  visible,
  onClose,
  category,
  onCategoryChange,
  city,
  onCityChange,
  cities,
  region,
  onRegionChange,
  budget,
  onBudgetChange,
  sortBy,
  onSortChange,
  onReset,
}: ExploreFilterSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Bộ lọc khám phá"
      subtitle="Tùy biến tiêu chí tìm kiếm theo nhu cầu của bạn"
      maxHeightPercent={86}
      footer={
        <View style={styles.footer}>
          <TouchableOpacity onPress={onReset} style={styles.resetBtn} activeOpacity={0.8}>
            <Text style={styles.resetText}>Đặt lại</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.doneBtn} activeOpacity={0.85}>
            <Text style={styles.doneText}>Áp dụng bộ lọc</Text>
          </TouchableOpacity>
        </View>
      }>
      <Text style={styles.sectionTitle}>Danh mục</Text>
      <View style={styles.chipWrap}>
        {PLACE_CATEGORIES.map((item) => (
          <Chip
            key={item.label}
            label={item.label}
            active={category === item.label}
            onPress={() => onCategoryChange(item.label)}
          />
        ))}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionGap]}>Tỉnh thành</Text>
      <View style={styles.chipWrap}>
        <Chip label={ALL} active={city === ALL} onPress={() => onCityChange(ALL)} />
        {cities.map((name) => (
          <Chip key={name} label={name} active={city === name} onPress={() => onCityChange(name)} />
        ))}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionGap]}>Vùng miền du lịch</Text>
      <View style={styles.chipWrap}>
        {EXPLORE_REGIONS.map((reg) => (
          <Chip
            key={reg}
            label={reg}
            active={region === reg}
            onPress={() => onRegionChange(reg)}
          />
        ))}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionGap]}>Thứ tự sắp xếp</Text>
      <View style={styles.chipWrap}>
        {[
          { value: 'popular' as const, label: 'Phổ biến nhất (nhiều lượt đánh giá)' },
          { value: 'rating' as const, label: 'Điểm đánh giá cao nhất' },
          { value: 'nearest' as const, label: 'Gần vị trí GPS của bạn nhất' },
        ].map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={sortBy === option.value}
            onPress={() => onSortChange(option.value)}
          />
        ))}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionGap]}>Khoảng giá dự kiến</Text>
      <View style={styles.chipWrap}>
        {BUDGET_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={budget === option.value}
            onPress={() => onBudgetChange(option.value)}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionGap: {
    marginTop: 22,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 6,
    gap: 12,
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  resetText: {
    fontSize: DS_TYPE.body,
    fontWeight: '500',
    color: DS_COLOR.danger,
  },
  doneBtn: {
    minWidth: 132,
    height: 46,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: DS_TYPE.body,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
