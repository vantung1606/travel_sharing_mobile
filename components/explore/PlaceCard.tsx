import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { PlaceImage } from '@/components/explore/PlaceImage';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { PlaceItem } from '@/src/services/api';

/** Điểm đánh giá chỉ hiển thị khi địa điểm thực sự có lượt đánh giá. */
export function hasRealRating(place: PlaceItem): boolean {
  return Boolean(place.rating) && (place.reviewsCount ?? 0) > 0;
}

const formatVND = (value: number) => `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

/** Rút gọn nhãn giá để không bị cắt thành "Miễn phí tham ...". */
function formatPrice(place: PlaceItem): string {
  const raw = String(place.priceLevel || '').trim();
  if (/miễn phí|mien phi|free/i.test(raw)) return 'Miễn phí';
  if (place.ticketPrice != null && Number(place.ticketPrice) > 0) {
    return formatVND(Number(place.ticketPrice));
  }
  if (!raw) return 'Miễn phí';
  return raw.split(/[,;(]/)[0].trim();
}

interface PlaceCardProps {
  place: PlaceItem;
  saved: boolean;
  onPress: () => void;
  onToggleSave: () => void;
}

/**
 * Card địa điểm kiểu danh sách: ảnh 80×80 bên trái, 3 dòng thông tin bên phải.
 *
 * Bỏ mô tả 2 dòng, city pill, category pill, verified pill và nút "Thêm vào
 * Plan" — tất cả đã có trong trang chi tiết. Nhờ vậy mỗi màn hình thấy được
 * 4–5 địa điểm thay vì ~1,7 như trước.
 */
export function PlaceCard({ place, saved, onPress, onToggleSave }: PlaceCardProps) {
  const showRating = hasRealRating(place);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết ${place.name}`}
      style={styles.card}>
      <PlaceImage place={place} style={styles.thumb} />

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          {place.isVerifiedHost ? (
            <FontAwesome name="check-circle" size={12} color={DS_COLOR.success} />
          ) : null}
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {[place.city, place.category].filter(Boolean).join(' · ') || 'Việt Nam'}
        </Text>

        <View style={styles.bottomRow}>
          {showRating ? (
            <View style={styles.rating}>
              <FontAwesome name="star" size={11} color={DS_COLOR.warning} />
              <Text style={styles.ratingText}>{place.rating!.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({place.reviewsCount})</Text>
            </View>
          ) : (
            <Text style={styles.noRating}>Chưa có đánh giá</Text>
          )}

          <Text style={styles.price} numberOfLines={1}>
            {formatPrice(place)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.favBtn, saved && styles.favBtnActive]}
        activeOpacity={0.7}
        onPress={onToggleSave}
        accessibilityLabel={saved ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}>
        <FontAwesome
          name={saved ? 'heart' : 'heart-o'}
          size={17}
          color={saved ? DS_COLOR.accent : DS_COLOR.inkMuted}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

interface FeaturedPlaceCardProps {
  place: PlaceItem;
  onPress: () => void;
}

/**
 * Hero 16:9 nằm đầu danh sách (thay cho dải cuộn ngang "Nổi bật" cũ).
 * Vì nằm trong danh sách nên nó cuộn đi cùng nội dung, không chiếm chrome.
 */
export function FeaturedPlaceCard({ place, onPress }: FeaturedPlaceCardProps) {
  const showRating = hasRealRating(place);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Địa điểm nổi bật ${place.name}`}
      style={styles.hero}>
      <PlaceImage place={place} style={styles.heroImage} />
      <View style={styles.heroScrimSoft} />
      <View style={styles.heroScrimStrong} />

      <View style={styles.heroBadge}>
        <FontAwesome name="star" size={10} color="#FFFFFF" />
        <Text style={styles.heroBadgeText}>Nổi bật</Text>
      </View>

      <View style={styles.heroInfo}>
        <Text style={styles.heroName} numberOfLines={1}>
          {place.name}
        </Text>
        <View style={styles.heroMetaRow}>
          <Text style={styles.heroCity} numberOfLines={1}>
            {place.city || 'Việt Nam'}
          </Text>
          {showRating ? (
            <>
              <Text style={styles.heroDot}>·</Text>
              <FontAwesome name="star" size={10} color="#FDE68A" />
              <Text style={styles.heroRating}>{place.rating!.toFixed(1)}</Text>
            </>
          ) : null}
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
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 8,
    borderRadius: DS_RADIUS.lg,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.surfaceMuted,
  },
  body: {
    flex: 1,
    marginLeft: 12,
    marginRight: 4,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    flexShrink: 1,
    fontSize: DS_TYPE.body,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  meta: {
    fontSize: 12,
    color: DS_COLOR.inkMuted,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS_COLOR.warning,
  },
  ratingCount: {
    fontSize: 11,
    color: DS_COLOR.inkMuted,
  },
  noRating: {
    fontSize: 11,
    color: DS_COLOR.inkMuted,
  },
  price: {
    flexShrink: 1,
    maxWidth: '48%',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnActive: {
    backgroundColor: DS_COLOR.accentSoft,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    borderRadius: DS_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: DS_COLOR.surfaceMuted,
    aspectRatio: 16 / 9,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroScrimSoft: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  heroScrimStrong: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  heroBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroInfo: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  heroCity: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroDot: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  heroRating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
