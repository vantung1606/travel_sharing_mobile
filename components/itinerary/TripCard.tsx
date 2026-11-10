import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { ItineraryItem } from '@/src/services/api';
import { formatItineraryDuration, getItineraryDayCount } from '@/src/utils/itinerary';
import { PLACE_IMAGE_POOL } from '@/src/utils/placeImagePool';

const DESTINATION_COVERS: Record<string, string> = {
  'da nang': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
  'ha tinh': 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  'hoi an': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
  'ha noi': 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
  'sa pa': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  'sapa': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
  'phu quoc': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'da lat': 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
  'ninh binh': 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=800&q=80',
  'hue': 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
  'quy nhon': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'nha trang': 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80',
  'ha giang': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
};

const removeTones = (str = '') =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');

function resolveItineraryCover(item: ItineraryItem): string {
  const raw = item.coverImageUrl || item.coverImage;
  if (raw && !raw.includes('/uploads/posts/') && !raw.includes('commons.wikimedia.org')) {
    // Nếu người dùng đã tự upload ảnh riêng biệt
    if (!raw.includes('photo-1528127269322-539801943592') && !raw.includes('photo-1506744038136-46273834b3fb')) {
      return raw;
    }
  }

  // Khớp thông minh không dấu theo điểm đến hoặc tiêu đề
  const textNormalized = removeTones(`${item.destination || ''} ${item.title || ''}`);
  for (const [key, url] of Object.entries(DESTINATION_COVERS)) {
    if (textNormalized.includes(key)) return url;
  }

  // Băm ổn định theo ID để mỗi chuyến đi luôn có một ảnh phong cảnh riêng biệt
  const poolLen = PLACE_IMAGE_POOL.length;
  if (poolLen > 0) {
    const safeId = typeof item.id === 'number' ? item.id : Number(String(item.id).replace(/\D/g, '')) || 7;
    const idx = Math.abs(Math.imul(safeId, 2654435761)) % poolLen;
    return PLACE_IMAGE_POOL[idx];
  }

  return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
}

export interface TripCardProps {
  item: ItineraryItem;
  onPress: () => void;
  onMenuPress: () => void;
}

/**
 * Card lịch trình phong cách Vipo Travel:
 * - Banner ảnh lớn 16:9 với gradient đa tầng sang trọng
 * - Huy hiệu AI Planner / Nhóm bạn nổi bật
 * - Hiển thị ngân sách rõ ràng, trạng thái chuyến đi sắc nét
 */
export function TripCard({ item, onPress, onMenuPress }: TripCardProps) {
  const imageUrl = resolveItineraryCover(item);
  const durationText = formatItineraryDuration(getItineraryDayCount(item));

  const budgetDisplay = item.budgetTotal
    ? `${item.budgetTotal.toLocaleString('vi-VN')} đ`
    : item.budgetPerPerson
    ? `~${item.budgetPerPerson.toLocaleString('vi-VN')} đ/người`
    : 'Chi phí linh hoạt';

  const statusLower = (item.status || '').toLowerCase();
  const isCompleted = statusLower === 'completed';
  const isUpcoming =
    statusLower === 'upcoming' ||
    statusLower === 'active' ||
    statusLower === 'planning' ||
    !statusLower;

  const statusLabel = isCompleted ? 'Đã xong' : isUpcoming ? 'Sắp tới' : 'Bản nháp';
  const statusColor = isCompleted ? '#6B7280' : isUpcoming ? '#059669' : '#D97706';
  const statusBg = isCompleted ? '#F3F4F6' : isUpcoming ? '#ECFDF5' : '#FEF3C7';

  // Định dạng ngày ngắn gọn (ví dụ 07/11 - 09/11)
  let dateText = '';
  if (item.startDate) {
    try {
      const s = new Date(item.startDate);
      const sStr = `${String(s.getDate()).padStart(2, '0')}/${String(s.getMonth() + 1).padStart(2, '0')}`;
      if (item.endDate) {
        const e = new Date(item.endDate);
        const eStr = `${String(e.getDate()).padStart(2, '0')}/${String(e.getMonth() + 1).padStart(2, '0')}`;
        dateText = `${sStr} - ${eStr}`;
      } else {
        dateText = sStr;
      }
    } catch {
      dateText = '';
    }
  }

  const groupLabel =
    item.groupType === 'FRIENDS'
      ? 'Nhóm bạn'
      : item.groupType === 'FAMILY'
      ? 'Gia đình'
      : item.groupType === 'SOLO'
      ? 'Một mình'
      : item.groupType === 'COUPLE'
      ? 'Cặp đôi'
      : null;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Lịch trình ${item.title}`}
    >
      {/* ── Banner Ảnh 16:9 với Gradient Vipo ── */}
      <View style={styles.bannerWrap}>
        <Image source={{ uri: imageUrl }} style={styles.bannerImage} resizeMode="cover" />

        {/* Lớp Gradient tối màu ở đáy và đỉnh để nổi bật các badge */}
        <LinearGradient
          colors={['rgba(15, 23, 42, 0.55)', 'transparent', 'rgba(15, 23, 42, 0.78)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Cụm badge phía trên ảnh */}
        <View style={styles.bannerTopRow}>
          <View style={styles.badgeLeftGroup}>
            {item.isAiGenerated ? (
              <View style={styles.aiBadge}>
                <FontAwesome name="magic" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.aiBadgeText}>AI TOUR</Text>
              </View>
            ) : null}

            {groupLabel ? (
              <View style={styles.groupBadge}>
                <Text style={styles.groupBadgeText}>{groupLabel}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.menuCircleBtn}
            onPress={(e) => {
              e.stopPropagation();
              onMenuPress();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Tùy chọn lịch trình"
          >
            <FontAwesome name="ellipsis-h" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Cụm thông tin trên đáy ảnh */}
        <View style={styles.bannerBottomRow}>
          <View style={styles.destPill}>
            <FontAwesome name="map-marker" size={11} color="#FBBF24" style={{ marginRight: 4 }} />
            <Text style={styles.destPillText} numberOfLines={1}>
              {item.destination || 'Việt Nam'}
            </Text>
          </View>

          <View style={styles.durationPill}>
            <Text style={styles.durationPillText}>{durationText}</Text>
          </View>
        </View>
      </View>

      {/* ── Thân Card Thông Tin Chi Tiết ── */}
      <View style={styles.cardBody}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        {dateText ? (
          <View style={styles.dateRow}>
            <FontAwesome name="calendar" size={12} color="#D9532F" style={{ marginRight: 6 }} />
            <Text style={styles.dateText}>{dateText}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />

        {/* Hàng đáy: Dự toán chi phí & Trạng thái */}
        <View style={styles.footerRow}>
          <View>
            <Text style={styles.budgetCaption}>DỰ TOÁN CHI PHÍ</Text>
            <Text style={styles.budgetValue}>{budgetDisplay}</Text>
          </View>

          <View style={styles.footerRight}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            </View>

            <View style={styles.arrowCircle}>
              <FontAwesome name="angle-right" size={15} color="#D9532F" />
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  bannerWrap: {
    width: '100%',
    height: 155,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  groupBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  groupBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  menuCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBottomRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: '65%',
  },
  destPillText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  durationPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  cardBody: {
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 23,
    letterSpacing: -0.2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  dateText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetCaption: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF5722',
    marginTop: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
