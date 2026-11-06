import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/Themed';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';

export interface CreateTripActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectAI: () => void;
  onSelectManual: () => void;
}

export function CreateTripActionSheet({
  visible,
  onClose,
  onSelectAI,
  onSelectManual,
}: CreateTripActionSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Tạo Lịch Trình Mới">
      <View style={styles.container}>
        {/* Lựa chọn 1: AI */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => {
            onClose();
            onSelectAI();
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FDF2F0' }]}>
            <FontAwesome name="magic" size={20} color={DS_COLOR.accent} />
          </View>
          <View style={styles.textBox}>
            <View style={styles.titleRow}>
              <Text style={styles.optionTitle}>Kiến tạo cùng WanderAI</Text>
              <View style={styles.recommendBadge}>
                <Text style={styles.recommendText}>Gợi ý</Text>
              </View>
            </View>
            <Text style={styles.optionDesc}>
              AI tự động gợi ý điểm đến, sắp xếp trạm dừng theo giờ và dự toán chi phí trong 15 giây.
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={13} color={DS_COLOR.inkMuted} />
        </TouchableOpacity>

        {/* Lựa chọn 2: Thủ công */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => {
            onClose();
            onSelectManual();
          }}
          activeOpacity={0.85}
        >
          <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
            <FontAwesome name="pencil" size={20} color="#0284C7" />
          </View>
          <View style={styles.textBox}>
            <Text style={styles.optionTitle}>Tự lập lịch trình thủ công</Text>
            <Text style={styles.optionDesc}>
              Tự chọn thời gian, phân bổ ngày và tự thêm từng trạm dừng khám phá theo sở thích riêng.
            </Text>
          </View>
          <FontAwesome name="chevron-right" size={13} color={DS_COLOR.inkMuted} />
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS_COLOR.surface,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    borderRadius: DS_RADIUS.lg,
    padding: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textBox: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: DS_TYPE.body,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  recommendBadge: {
    marginLeft: 8,
    backgroundColor: '#FDF2F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: DS_RADIUS.pill,
  },
  recommendText: {
    fontSize: 10,
    fontWeight: '700',
    color: DS_COLOR.accent,
  },
  optionDesc: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
    lineHeight: 18,
  },
});
