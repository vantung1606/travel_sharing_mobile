import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/Themed';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { ItineraryItem } from '@/src/services/api';

export interface TripActionSheetProps {
  visible: boolean;
  onClose: () => void;
  itinerary: ItineraryItem | null;
  onView: () => void;
  onShare: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

export function TripActionSheet({
  visible,
  onClose,
  itinerary,
  onView,
  onShare,
  onToggleVisibility,
  onDelete,
}: TripActionSheetProps) {
  if (!itinerary) return null;

  const isPublic = itinerary.isPublic !== false;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={itinerary.title}>
      <View style={styles.container}>
        {/* Xem chi tiết */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => {
            onClose();
            onView();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#F0F9FF' }]}>
            <FontAwesome name="eye" size={15} color="#0284C7" />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitle}>Xem chi tiết lộ trình</Text>
            <Text style={styles.actionDesc}>Xem các trạm dừng, bản đồ và danh sách đồ dùng</Text>
          </View>
        </TouchableOpacity>

        {/* Chia sẻ */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => {
            onClose();
            onShare();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#F8F4EC' }]}>
            <FontAwesome name="share-alt" size={15} color={DS_COLOR.accent} />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitle}>Chia sẻ chuyến đi</Text>
            <Text style={styles.actionDesc}>Gửi liên kết lịch trình cho bạn bè qua mạng xã hội</Text>
          </View>
        </TouchableOpacity>

        {/* Đổi quyền hiển thị */}
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => {
            onClose();
            onToggleVisibility();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#F5F5F4' }]}>
            <FontAwesome name={isPublic ? 'lock' : 'globe'} size={15} color={DS_COLOR.ink} />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={styles.actionTitle}>
              {isPublic ? 'Chuyển sang chế độ riêng tư' : 'Công khai với cộng đồng'}
            </Text>
            <Text style={styles.actionDesc}>
              {isPublic ? 'Chỉ bạn mới có thể xem chuyến đi này' : 'Chia sẻ với mọi du khách trên Wayfare'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Xóa chuyến đi */}
        <TouchableOpacity
          style={[styles.actionItem, styles.dangerItem]}
          onPress={() => {
            onClose();
            onDelete();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
            <FontAwesome name="trash-o" size={15} color={DS_COLOR.danger} />
          </View>
          <View style={styles.actionTextCol}>
            <Text style={[styles.actionTitle, { color: DS_COLOR.danger }]}>Xóa lịch trình</Text>
            <Text style={styles.actionDesc}>Hành động này sẽ xóa vĩnh viễn chuyến đi khỏi tài khoản</Text>
          </View>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DS_COLOR.line,
  },
  dangerItem: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: DS_TYPE.body,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
  },
});
