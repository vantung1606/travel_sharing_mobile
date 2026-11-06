import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { ItineraryItem } from '@/src/services/api';
import { formatItineraryDuration, getItineraryDayCount } from '@/src/utils/itinerary';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80';

export interface TripCardProps {
  item: ItineraryItem;
  onPress: () => void;
  onMenuPress: () => void;
}

export function TripCard({ item, onPress, onMenuPress }: TripCardProps) {
  const imageUrl = item.coverImageUrl || item.coverImage || FALLBACK_COVER;
  const durationText = formatItineraryDuration(getItineraryDayCount(item));

  const budgetDisplay = item.budgetTotal
    ? `${item.budgetTotal.toLocaleString('vi-VN')} đ`
    : item.budgetPerPerson
    ? `~${item.budgetPerPerson.toLocaleString('vi-VN')} đ`
    : 'Tùy chi tiêu';

  const statusLower = (item.status || '').toLowerCase();
  const isCompleted = statusLower === 'completed';
  const isUpcoming = statusLower === 'upcoming' || statusLower === 'active' || statusLower === 'planning' || !statusLower;

  const statusLabel = isCompleted ? 'Đã xong' : isUpcoming ? 'Sắp tới' : 'Bản nháp';
  const statusColor = isCompleted ? DS_COLOR.inkMuted : isUpcoming ? DS_COLOR.success : DS_COLOR.warning;

  // Format short date if available (e.g. 25/10 - 28/10)
  let dateText = '';
  if (item.startDate) {
    try {
      const s = new Date(item.startDate);
      const sStr = `${s.getDate()}/${s.getMonth() + 1}`;
      if (item.endDate) {
        const e = new Date(item.endDate);
        dateText = `${sStr} - ${e.getDate()}/${e.getMonth() + 1}`;
      } else {
        dateText = sStr;
      }
    } catch {
      dateText = '';
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Lịch trình ${item.title}`}
    >
      {/* Thumbnail 88x88 bên trái */}
      <View style={styles.thumbBox}>
        <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
        {item.isAiGenerated ? (
          <View style={styles.aiBadge}>
            <FontAwesome name="magic" size={9} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        ) : null}
      </View>

      {/* Nội dung chính bên phải */}
      <View style={styles.body}>
        {/* Hàng 1: Tiêu đề & Nút menu ⋯ */}
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={(e) => {
              e.stopPropagation();
              onMenuPress();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Tùy chọn lịch trình"
          >
            <FontAwesome name="ellipsis-h" size={15} color={DS_COLOR.inkMuted} />
          </TouchableOpacity>
        </View>

        {/* Hàng 2: Meta (Điểm đến · Thời lượng · Ngày) */}
        <View style={styles.metaRow}>
          <FontAwesome name="map-marker" size={11} color={DS_COLOR.accent} style={{ marginRight: 4 }} />
          <Text style={styles.destText} numberOfLines={1}>
            {item.destination || 'Việt Nam'}
          </Text>
          <Text style={styles.dotSeparator}>·</Text>
          <Text style={styles.metaText}>{durationText}</Text>
          {dateText ? (
            <>
              <Text style={styles.dotSeparator}>·</Text>
              <Text style={styles.metaText}>{dateText}</Text>
            </>
          ) : null}
        </View>

        {/* Hàng 3: Ngân sách (trái) + Trạng thái (phải) */}
        <View style={styles.bottomRow}>
          <Text style={styles.budgetText}>{budgetDisplay}</Text>
          <View style={styles.statusBox}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS_COLOR.surface,
    borderRadius: DS_RADIUS.lg,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    padding: 10,
    marginBottom: 10,
  },
  thumbBox: {
    width: 88,
    height: 88,
    borderRadius: DS_RADIUS.md,
    overflow: 'hidden',
    backgroundColor: DS_COLOR.surfaceMuted,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  aiBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: DS_RADIUS.pill,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  body: {
    flex: 1,
    height: 88,
    marginLeft: 12,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    fontSize: DS_TYPE.body,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginRight: 8,
  },
  menuBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  destText: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.ink,
    fontWeight: '500',
    maxWidth: 110,
  },
  dotSeparator: {
    marginHorizontal: 5,
    color: DS_COLOR.inkMuted,
    fontSize: 11,
  },
  metaText: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetText: {
    fontSize: 13,
    fontWeight: '700',
    color: DS_COLOR.accent,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
