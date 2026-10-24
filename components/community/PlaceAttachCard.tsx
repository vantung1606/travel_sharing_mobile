import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { WF_COLORS } from '@/constants/Colors';
import { PostItem } from '@/src/services/api';

interface PlaceAttachCardProps {
  post: PostItem;
  onPress?: (placeId: number) => void;
}

const FALLBACK_PLACE_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80';

export function PlaceAttachCard({ post, onPress }: PlaceAttachCardProps) {
  const placeId = post.placeId ?? post.sharedPost?.placeId;
  const placeName = post.placeName || post.sharedPost?.placeName;
  if (!placeId && !placeName) return null;

  const address = post.placeAddress || post.sharedPost?.placeAddress;
  const city = post.placeCity || post.sharedPost?.placeCity;
  const coverImage = post.placeCoverImageUrl || post.sharedPost?.placeCoverImageUrl || FALLBACK_PLACE_IMAGE;
  const rating = post.placeAverageRating ?? post.sharedPost?.placeAverageRating;
  const reviewCount = post.placeReviewCount ?? post.sharedPost?.placeReviewCount;
  const category = post.placeCategoryName || post.sharedPost?.placeCategoryName;
  const ticketPrice = post.placeTicketPrice || post.sharedPost?.placeTicketPrice;
  const openHours = post.placeOpenHours || post.sharedPost?.placeOpenHours;

  const handlePress = () => {
    if (placeId && onPress) {
      onPress(placeId);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={styles.card}
    >
      <View style={styles.accent} />
      <View style={styles.content}>
        {/* Top badge row */}
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <FontAwesome name="map-marker" size={11} color="#059669" />
            <Text style={styles.badgeText}>Check-in địa điểm</Text>
          </View>
          {category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText} numberOfLines={1}>{category}</Text>
            </View>
          ) : null}
          {city ? (
            <Text style={styles.cityText} numberOfLines={1}>• {city}</Text>
          ) : null}
        </View>

        {/* Main row: Thumbnail + Details */}
        <View style={styles.mainRow}>
          <Image
            source={{ uri: coverImage }}
            style={styles.thumbnail}
            resizeMode="cover"
          />

          <View style={styles.infoCol}>
            <Text style={styles.placeTitle} numberOfLines={2}>
              {placeName}
            </Text>

            {address ? (
              <View style={styles.addressRow}>
                <FontAwesome name="location-arrow" size={10} color={WF_COLORS.slate400} />
                <Text style={styles.addressText} numberOfLines={1}>
                  {address}
                </Text>
              </View>
            ) : null}

            {/* Chips row: Rating, Price, Hours */}
            <View style={styles.chipsRow}>
              {rating != null && rating > 0 ? (
                <View style={styles.ratingChip}>
                  <FontAwesome name="star" size={10} color="#D97706" />
                  <Text style={styles.ratingText}>
                    {rating.toFixed(1)}
                    {reviewCount != null ? ` (${reviewCount})` : ''}
                  </Text>
                </View>
              ) : null}

              {ticketPrice ? (
                <View style={styles.chip}>
                  <FontAwesome name="ticket" size={9} color="#059669" />
                  <Text style={styles.chipText} numberOfLines={1}>{ticketPrice}</Text>
                </View>
              ) : null}

              {openHours ? (
                <View style={styles.chip}>
                  <FontAwesome name="clock-o" size={9} color={WF_COLORS.primaryHover} />
                  <Text style={styles.chipText} numberOfLines={1}>{openHours}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Action footer */}
        <View style={styles.footerRow}>
          <Text style={styles.footerHint}>Chạm để khám phá địa điểm</Text>
          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Khám phá</Text>
            <FontAwesome name="chevron-right" size={10} color="#059669" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    overflow: 'hidden',
    marginTop: 8,
    flexDirection: 'row',
  },
  accent: {
    width: 4,
    backgroundColor: '#10B981',
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  categoryPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  cityText: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    fontWeight: '500',
  },
  mainRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: WF_COLORS.slate200,
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  placeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    lineHeight: 18,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    flex: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: WF_COLORS.slate600,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
  },
  footerHint: {
    fontSize: 10,
    color: WF_COLORS.slate400,
    fontStyle: 'italic',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
});
