import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';

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
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const showRating = hasRealRating(place);
  const priceInfo = formatPrice(place);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      accessibilityLabel={`Xem chi tiết ${place.name}`}
      style={[styles.card, isSmallScreen && { marginHorizontal: 12, marginBottom: 10, padding: 8 }]}>
      <View style={[styles.thumbWrapper, isSmallScreen && { width: 80, height: 80, borderRadius: 14 }]}>
        <PlaceImage place={place} style={styles.thumb} />
        {place.category ? (
          <View style={styles.thumbCategoryBadge}>
            <Text style={styles.thumbCategoryText} numberOfLines={1}>
              {place.category}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.body, isSmallScreen && { marginLeft: 10, marginRight: 4, gap: 2 }]}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isSmallScreen && { fontSize: 14 }]} numberOfLines={1}>
            {place.name}
          </Text>
          {place.isVerifiedHost ? (
            <FontAwesome name="check-circle" size={13} color="#2563EB" style={{ marginLeft: 2 }} />
          ) : null}
        </View>

        <View style={styles.locationRow}>
          <FontAwesome name="map-marker" size={11} color={DS_COLOR.accent} style={{ marginRight: 3 }} />
          <Text style={[styles.meta, isSmallScreen && { fontSize: 11.5 }]} numberOfLines={1}>
            {place.city || 'Việt Nam'}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          {showRating ? (
            <View style={styles.rating}>
              <FontAwesome name="star" size={11} color="#F59E0B" />
              <Text style={[styles.ratingText, isSmallScreen && { fontSize: 12 }]}>{place.rating!.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({place.reviewsCount})</Text>
            </View>
          ) : (
            <Text style={styles.noRating}>Mới khám phá</Text>
          )}

          <View style={[styles.pricePill, priceInfo.isFree ? styles.pricePillFree : styles.pricePillPaid, isSmallScreen && { paddingHorizontal: 7, paddingVertical: 2.5 }]}>
            <Text style={[styles.pricePillText, priceInfo.isFree ? styles.pricePillTextFree : styles.pricePillTextPaid, isSmallScreen && { fontSize: 10.5 }]} numberOfLines={1}>
              {priceInfo.label}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.favBtn, isSmallScreen && { width: 34, height: 34, borderRadius: 17 }, saved && styles.favBtnActive]}
        activeOpacity={0.7}
        onPress={(e) => {
          e.stopPropagation();
          onToggleSave();
        }}
        accessibilityLabel={saved ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}>
        <FontAwesome
          name={saved ? 'heart' : 'heart-o'}
          size={isSmallScreen ? 14 : 16}
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
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const showRating = hasRealRating(place);
  const priceInfo = formatPrice(place);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityLabel={`Địa điểm nổi bật ${place.name}`}
      style={[styles.hero, isSmallScreen && { marginHorizontal: 12, height: 180 }]}>
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  thumbWrapper: {
    width: 92,
    height: 92,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFF3E0',
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  thumbCategoryText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
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
    fontSize: 15.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meta: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 3,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  ratingCount: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  noRating: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  pricePill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  pricePillFree: {
    backgroundColor: '#ECFDF5',
  },
  pricePillPaid: {
    backgroundColor: '#FFF3E0',
  },
  pricePillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  pricePillTextFree: {
    color: '#059669',
  },
  pricePillTextPaid: {
    color: '#FF5722',
  },
  favBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnActive: {
    backgroundColor: '#FFE4E6',
    borderColor: '#FECDD3',
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 14,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    aspectRatio: 16 / 9,
    elevation: 5,
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
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
    backgroundColor: '#FF5722',
    shadowColor: '#FF5722',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  heroCategoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroCategoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroInfo: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  heroCityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCity: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  heroRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  heroRating: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroReviewCount: {
    fontSize: 10.5,
    color: '#F1F5F9',
    marginLeft: 2,
    fontWeight: '600',
  },
  heroPriceBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: '#10B981',
  },
  heroPriceText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
