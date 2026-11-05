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
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 196,
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cityPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '65%',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cityPillText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  favBtnActive: {
    backgroundColor: WF_COLORS.primary,
  },
  imageOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    flexShrink: 1,
    backgroundColor: 'rgba(224, 90, 54, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  categoryPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    backgroundColor: 'rgba(5, 150, 105, 0.95)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  body: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    marginRight: 8,
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
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
    marginBottom: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pricePill: {
    flexShrink: 1,
    paddingVertical: 3,
    marginRight: 8,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  featuredCard: {
    width: 224,
    height: 160,
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    height: '65%',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  featuredScrimStrong: {
    display: 'none',
  },
  featuredRating: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  featuredRatingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  featuredInfo: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  featuredName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  featuredCity: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
});
