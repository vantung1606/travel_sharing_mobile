import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Chip } from '@/components/ui/Chip';
import {
  SORT_OPTIONS,
  TOPIC_FILTERS,
  TRAVEL_HASHTAGS,
  PostSortKey,
  TopicKey,
} from '@/components/community/communityUtils';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';

interface CommunityFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  topic: TopicKey;
  onTopicChange: (key: TopicKey) => void;
  hashtag: string;
  onHashtagChange: (key: string) => void;
  sort: PostSortKey;
  onSortChange: (key: PostSortKey) => void;
  onReset: () => void;
}

/**
 * Một sheet duy nhất cho toàn bộ bộ lọc feed:
 * chủ đề + hashtag + sắp xếp. Thay cho 2 hàng chip + 1 action sheet riêng.
 */
export function CommunityFilterSheet({
  visible,
  onClose,
  topic,
  onTopicChange,
  hashtag,
  onHashtagChange,
  sort,
  onSortChange,
  onReset,
}: CommunityFilterSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Bộ lọc bảng tin"
      subtitle="Chọn nhanh chủ đề, hashtag và cách sắp xếp."
      maxHeightPercent={86}
      footer={
        <View style={styles.footer}>
          <TouchableOpacity onPress={onReset} style={styles.resetBtn} activeOpacity={0.8}>
            <Text style={styles.resetText}>Xoá bộ lọc</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.doneBtn} activeOpacity={0.85}>
            <Text style={styles.doneText}>Xong</Text>
          </TouchableOpacity>
        </View>
      }>
      <Text style={styles.sectionTitle}>Chủ đề</Text>
      <View style={styles.chipWrap}>
        {TOPIC_FILTERS.map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            active={topic === item.key}
            onPress={() => onTopicChange(item.key)}
          />
        ))}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionGap]}>Hashtag du lịch</Text>
      <View style={styles.chipWrap}>
        {TRAVEL_HASHTAGS.map((tag) => (
          <Chip
            key={tag.key}
            label={tag.label}
            active={hashtag === tag.key}
            onPress={() => onHashtagChange(tag.key)}
          />
        ))}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionGap]}>Sắp xếp</Text>
      <View style={styles.sortList}>
        {SORT_OPTIONS.map((option) => {
          const active = sort === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.8}
              style={styles.sortRow}
              onPress={() => onSortChange(option.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sortLabel, active && styles.sortLabelActive]}>{option.label}</Text>
                <Text style={styles.sortHint}>{option.hint}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>
                {active ? <FontAwesome name="check" size={10} color="#FFFFFF" /> : null}
              </View>
            </TouchableOpacity>
          );
        })}
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
  sortList: {
    gap: 6,
  },
  sortRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.surfaceMuted,
  },
  sortLabel: {
    fontSize: DS_TYPE.body,
    fontWeight: '500',
    color: DS_COLOR.ink,
  },
  sortLabelActive: {
    color: DS_COLOR.accent,
    fontWeight: '600',
  },
  sortHint: {
    marginTop: 1,
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: DS_COLOR.inkMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    backgroundColor: DS_COLOR.accent,
    borderColor: DS_COLOR.accent,
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
