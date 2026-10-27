import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { PlaceImage } from '@/components/explore/PlaceImage';
import { WF_COLORS } from '@/constants/Colors';
import { PlaceItem } from '@/src/services/api';

/** Điểm đánh giá chỉ hiển thị khi địa điểm thực sự có lượt đánh giá. */
export function hasRealRating(place: PlaceItem): boolean {
  return Boolean(place.rating) && (place.reviewsCount ?? 0) > 0;
}

interface PlaceCardProps {
  place: PlaceItem;
  saved: boolean;
  onPress: () => void;
  onToggleSave: () => void;
  onAddToPlan: () => void;
}

export function PlaceCard({ place, saved, onPress, onToggleSave, onAddToPlan }: PlaceCardProps) {
  const showRating = hasRealRating(place);

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={styles.card}>
      <View style={styles.imageWrap}>
        <PlaceImage place={place} style={styles.image} />

        <View style={styles.cityPill}>
          <FontAwesome name="map-marker" size={9} color={WF_COLORS.primary} style={{ marginRight: 3 }} />
          <Text style={styles.cityPillText} numberOfLines={1}>
            {place.city || 'Việt Nam'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.favBtn, saved && styles.favBtnActive]}
          activeOpacity={0.7}
          onPress={onToggleSave}
          accessibilityLabel={saved ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}>
          <FontAwesome
            name={saved ? 'heart' : 'heart-o'}
            size={14}
            color={saved ? '#FFFDF8' : WF_COLORS.slate600}
          />
        </TouchableOpacity>

        <View style={styles.imageOverlay}>
          {place.category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText} numberOfLines={1}>
                {place.category}
              </Text>
            </View>
          ) : (
            <View />
          )}
          {place.isVerifiedHost ? (
            <View style={styles.verifiedPill}>
              <FontAwesome name="check-circle" size={9} color="#FFFDF8" style={{ marginRight: 3 }} />
              <Text style={styles.verifiedText}>Đã xác thực</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {place.name}
          </Text>
          {showRating ? (
            <View style={styles.ratingBadge}>
              <FontAwesome name="star" size={10} color={WF_COLORS.amber} />
              <Text style={styles.ratingText}>{place.rating!.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({place.reviewsCount})</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          <FontAwesome name="map-marker" size={11} color={WF_COLORS.slate400} />
          <Text style={styles.metaText} numberOfLines={1}>
            {place.address || `${place.city}, Việt Nam`}
          </Text>
        </View>

        {place.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {place.description}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.pricePill}>
            <Text style={styles.priceText} numberOfLines={1}>
              {place.priceLevel || 'Miễn phí tham quan'}
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.8} onPress={onAddToPlan}>
            <FontAwesome name="plus" size={10} color={WF_COLORS.primary} style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Thêm vào Plan</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

interface FeaturedPlaceCardProps {
  place: PlaceItem;
  onPress: () => void;
}

/** Thẻ lớn nằm trong dải "Nổi bật" theo chiều ngang. */
export function FeaturedPlaceCard({ place, onPress }: FeaturedPlaceCardProps) {
  const showRating = hasRealRating(place);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.featuredCard}>
      <PlaceImage place={place} style={styles.featuredImage} />
      <View style={styles.featuredScrimSoft} />
      <View style={styles.featuredScrimStrong} />

      {showRating ? (
        <View style={styles.featuredRating}>
          <FontAwesome name="star" size={10} color={WF_COLORS.amber} />
          <Text style={styles.featuredRatingText}>{place.rating!.toFixed(1)}</Text>
        </View>
      ) : null}

      <View style={styles.featuredInfo}>
        <Text style={styles.featuredName} numberOfLines={1}>
          {place.name}
        </Text>
        <Text style={styles.featuredCity} numberOfLines={1}>
          {place.city}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WF_COLORS.white,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    overflow: 'hidden',
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 178,
    backgroundColor: WF_COLORS.slate100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cityPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '62%',
    backgroundColor: 'rgba(248, 244, 236, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(30, 26, 21, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  cityPillText: {
    color: WF_COLORS.slate700,
    fontSize: 10,
    fontWeight: '700',
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: 'rgba(248, 244, 236, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(30, 26, 21, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  imageOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    flexShrink: 1,
    backgroundColor: 'rgba(176, 82, 47, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  categoryPillText: {
    color: '#FFFDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    backgroundColor: 'rgba(79, 107, 82, 0.94)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 3,
  },
  verifiedText: {
    color: '#FFFDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  body: {
    padding: 13,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  title: {
    flex: 1,
    marginRight: 8,
    fontSize: 16,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    letterSpacing: -0.2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: WF_COLORS.amberLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  ratingCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B45309',
    opacity: 0.75,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: WF_COLORS.slate500,
  },
  desc: {
    fontSize: 12,
    lineHeight: 17,
    color: WF_COLORS.slate500,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: WF_COLORS.slate100,
  },
  pricePill: {
    flexShrink: 1,
    paddingVertical: 3,
    marginRight: 8,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  featuredCard: {
    width: 208,
    height: 148,
    marginRight: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: WF_COLORS.slate100,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredScrimSoft: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    backgroundColor: 'rgba(30, 26, 21, 0.52)',
  },
  featuredScrimStrong: {
    display: 'none',
  },
  featuredRating: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  featuredRatingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  featuredInfo: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 9,
  },
  featuredName: {
    color: '#FFFDF8',
    fontSize: 14,
    fontWeight: '800',
  },
  featuredCity: {
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 11,
    marginTop: 2,
  },
});
