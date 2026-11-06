import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/Themed';
import { PlaceImage } from '@/components/explore/PlaceImage';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { PlaceItem } from '@/src/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 44) / 2;

/** Điểm đánh giá chỉ hiển thị khi địa điểm thực sự có lượt đánh giá. */
export function hasRealRating(place: PlaceItem): boolean {
  return Boolean(place.rating) && (place.reviewsCount ?? 0) > 0;
}

const formatVND = (value: number) => `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

/** Rút gọn nhãn giá để không bị cắt thành "Miễn phí tham ...". */
export function formatPrice(place: PlaceItem): string {
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
 * Card địa điểm kiểu danh sách ngang: ảnh 80×80 bên trái, 3 dòng thông tin bên phải.
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

interface GridPlaceCardProps {
  place: PlaceItem;
  saved: boolean;
  onPress: () => void;
  onToggleSave: () => void;
  style?: any;
}

/**
 * Card địa điểm phong cách Pinterest / Airbnb Explore (Lưới 2 Cột Nghệ Thuật):
 * - Tỉ lệ ảnh dọc thanh thoát (~230px), ảnh tràn trọn vẹn card.
 * - Gradient mờ liền mạch ở đáy tôn vinh tên điểm đến và vị trí.
 * - Nút Tim kính mờ ở góc trên phải và Badge giá ở góc trên trái.
 */
export function GridPlaceCard({ place, saved, onPress, onToggleSave, style }: GridPlaceCardProps) {
  const showRating = hasRealRating(place);
  const priceLabel = formatPrice(place);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết ${place.name}`}
      style={[styles.gridCard, style]}>
      {/* Khung ảnh tràn viền */}
      <View style={styles.gridImageContainer}>
        <PlaceImage place={place} style={styles.gridImage} />

        {/* Lớp Gradient mờ mềm mại */}
        <LinearGradient
          colors={['rgba(0,0,0,0.32)', 'transparent', 'rgba(15,23,42,0.85)']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Badge Giá / Miễn phí */}
        <View style={styles.gridPriceBadge}>
          <Text style={styles.gridPriceText} numberOfLines={1}>
            {priceLabel}
          </Text>
        </View>

        {/* Nút Tim Lưu kính mờ */}
        <TouchableOpacity
          style={styles.gridFavBtn}
          activeOpacity={0.8}
          onPress={onToggleSave}
          accessibilityLabel={saved ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}>
          <FontAwesome
            name={saved ? 'heart' : 'heart-o'}
            size={14}
            color={saved ? '#EF4444' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Cụm thông tin chìm trên ảnh */}
        <View style={styles.gridInfoOverlay}>
          <Text style={styles.gridName} numberOfLines={2}>
            {place.name}
          </Text>

          <View style={styles.gridMetaRow}>
            <View style={styles.gridCityRow}>
              <FontAwesome name="map-marker" size={10} color="#FBBF24" />
              <Text style={styles.gridCityText} numberOfLines={1}>
                {place.city || 'Việt Nam'}
              </Text>
            </View>

            {showRating && (
              <View style={styles.gridRatingRow}>
                <FontAwesome name="star" size={10} color="#FDE68A" />
                <Text style={styles.gridRatingText}>
                  {place.rating!.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface FeaturedPlaceCardProps {
  place: PlaceItem;
  onPress: () => void;
}

/**
 * Hero Billboard 16:9 nằm đầu danh sách khám phá.
 * Sử dụng LinearGradient mờ mịn không tì vết.
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
      
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(15,23,42,0.88)']}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.heroBadge}>
        <FontAwesome name="star" size={10} color="#FFFFFF" />
        <Text style={styles.heroBadgeText}>Điểm đến tiêu biểu</Text>
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
  // ── LIST CARD STYLES ─────────────────────────────────────────
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
    fontSize: DS_TYPE.meta,
    color: DS_COLOR.inkSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: DS_COLOR.ink,
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
    fontSize: 12,
    fontWeight: '700',
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

  // ── DUAL-COLUMN GRID CARD STYLES (PINTEREST / AIRBNB) ───────
  gridCard: {
    width: GRID_ITEM_WIDTH,
    height: Math.round(GRID_ITEM_WIDTH * 1.34),
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1E1A15',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  gridImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridPriceBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
    maxWidth: '65%',
  },
  gridPriceText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '700',
  },
  gridFavBtn: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridInfoOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  gridName: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gridCityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
  },
  gridCityText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 85,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gridRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gridRatingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // ── HERO BILLBOARD STYLES ────────────────────────────────────
  hero: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: DS_COLOR.surfaceMuted,
    aspectRatio: 16 / 9,
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  heroInfo: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    gap: 2,
  },
  heroName: {
    fontSize: DS_TYPE.title,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroCity: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FDE68A',
  },
  heroDot: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  heroRating: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
