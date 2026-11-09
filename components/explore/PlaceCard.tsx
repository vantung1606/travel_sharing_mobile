import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
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

/** Rút gọn nhãn giá để hiển thị rõ ràng, nổi bật. */
function formatPrice(place: PlaceItem): { label: string; isFree: boolean } {
  const raw = String(place.priceLevel || '').trim();
  if (/miễn phí|mien phi|free/i.test(raw)) return { label: 'Miễn phí', isFree: true };
  if (place.ticketPrice != null && Number(place.ticketPrice) > 0) {
    return { label: formatVND(Number(place.ticketPrice)), isFree: false };
  }
  if (!raw) return { label: 'Miễn phí', isFree: true };
  const cleaned = raw.split(/[,;(]/)[0].trim();
  return { label: cleaned, isFree: /miễn phí|mien phi|free/i.test(cleaned) };
}

interface PlaceCardProps {
  place: PlaceItem;
  saved: boolean;
  onPress: () => void;
  onToggleSave: () => void;
}

/**
 * Card địa điểm: ảnh 88×88 bo tròn bên trái, thông tin nổi bật, tag giá bắt mắt bên phải.
 */
export function PlaceCard({ place, saved, onPress, onToggleSave }: PlaceCardProps) {
  const showRating = hasRealRating(place);
  const priceInfo = formatPrice(place);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết ${place.name}`}
      style={styles.card}>
      <View style={styles.thumbWrapper}>
        <PlaceImage place={place} style={styles.thumb} />
        {place.category ? (
          <View style={styles.thumbCategoryBadge}>
            <Text style={styles.thumbCategoryText} numberOfLines={1}>
              {place.category}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          {place.isVerifiedHost ? (
            <FontAwesome name="check-circle" size={13} color="#2563EB" style={{ marginLeft: 2 }} />
          ) : null}
        </View>

        <View style={styles.locationRow}>
          <FontAwesome name="map-marker" size={12} color={DS_COLOR.accent} style={{ marginRight: 4 }} />
          <Text style={styles.meta} numberOfLines={1}>
            {place.city || 'Việt Nam'}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          {showRating ? (
            <View style={styles.rating}>
              <FontAwesome name="star" size={12} color="#F59E0B" />
              <Text style={styles.ratingText}>{place.rating!.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({place.reviewsCount})</Text>
            </View>
          ) : (
            <Text style={styles.noRating}>Mới khám phá</Text>
          )}

          <View style={[styles.pricePill, priceInfo.isFree ? styles.pricePillFree : styles.pricePillPaid]}>
            <Text style={[styles.pricePillText, priceInfo.isFree ? styles.pricePillTextFree : styles.pricePillTextPaid]} numberOfLines={1}>
              {priceInfo.label}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.favBtn, saved && styles.favBtnActive]}
        activeOpacity={0.7}
        onPress={(e) => {
          e.stopPropagation();
          onToggleSave();
        }}
        accessibilityLabel={saved ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}>
        <FontAwesome
          name={saved ? 'heart' : 'heart-o'}
          size={16}
          color={saved ? '#EF4444' : DS_COLOR.inkMuted}
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
 * Hero nổi bật 16:9 với gradient mượt mà, huy hiệu VIP và thông tin ấn tượng.
 */
export function FeaturedPlaceCard({ place, onPress }: FeaturedPlaceCardProps) {
  const showRating = hasRealRating(place);
  const priceInfo = formatPrice(place);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Địa điểm nổi bật ${place.name}`}
      style={styles.hero}>
      <PlaceImage place={place} style={styles.heroImage} />

      {/* Gradient chuyển màu cao cấp từ trong suốt xuống đen đậm */}
      <LinearGradient
        colors={['transparent', 'rgba(15, 23, 42, 0.45)', 'rgba(15, 23, 42, 0.88)']}
        locations={[0.2, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Huy hiệu Nổi Bật & Danh Mục */}
      <View style={styles.heroTopRow}>
        <View style={styles.heroBadge}>
          <FontAwesome name="star" size={11} color="#FEF08A" style={{ marginRight: 4 }} />
          <Text style={styles.heroBadgeText}>NỔI BẬT</Text>
        </View>
        {place.category ? (
          <View style={styles.heroCategoryPill}>
            <Text style={styles.heroCategoryText} numberOfLines={1}>{place.category}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.heroInfo}>
        <Text style={styles.heroName} numberOfLines={1}>
          {place.name}
        </Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroCityWrap}>
            <FontAwesome name="map-marker" size={12} color="#FBBF24" style={{ marginRight: 4 }} />
            <Text style={styles.heroCity} numberOfLines={1}>
              {place.city || 'Việt Nam'}
            </Text>
          </View>

          {showRating ? (
            <View style={styles.heroRatingWrap}>
              <FontAwesome name="star" size={11} color="#F59E0B" style={{ marginRight: 3 }} />
              <Text style={styles.heroRating}>{place.rating!.toFixed(1)}</Text>
              <Text style={styles.heroReviewCount}>({place.reviewsCount})</Text>
            </View>
          ) : null}

          <View style={{ flex: 1 }} />

          <View style={styles.heroPriceBadge}>
            <Text style={styles.heroPriceText}>{priceInfo.label}</Text>
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
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EDE7DE',
    elevation: 2,
    shadowColor: '#1A1008',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  thumbWrapper: {
    width: 88,
    height: 88,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3EFE9',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbCategoryBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  thumbCategoryText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1917',
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1C1917',
  },
  ratingCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  noRating: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  pricePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pricePillFree: {
    backgroundColor: '#ECFDF5',
  },
  pricePillPaid: {
    backgroundColor: '#FFF1ED',
  },
  pricePillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  pricePillTextFree: {
    color: '#059669',
  },
  pricePillTextPaid: {
    color: '#C84B2C',
  },
  favBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8F4EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1E1A15',
    aspectRatio: 16 / 9,
    elevation: 4,
    shadowColor: '#1A1008',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroTopRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#D9532F',
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  heroCategoryPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroCategoryText: {
    fontSize: 11,
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
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  heroCityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCity: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  heroRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroRating: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroReviewCount: {
    fontSize: 10,
    color: '#E5E7EB',
    marginLeft: 2,
  },
  heroPriceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  heroPriceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
