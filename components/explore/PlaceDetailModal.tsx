import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Linking, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showToast } from '@/components/Toast';
import { Text } from '@/components/Themed';
import { PlaceImage } from '@/components/explore/PlaceImage';
import { WF_COLORS } from '@/constants/Colors';
import { PlaceItem } from '@/src/services/api';

interface PlaceDetailModalProps {
  visible: boolean;
  place: PlaceItem | null;
  saved: boolean;
  onClose: () => void;
  onToggleSave: () => void;
  onAddToPlan: () => void;
}

export function PlaceDetailModal({
  visible,
  place,
  saved,
  onClose,
  onToggleSave,
  onAddToPlan,
}: PlaceDetailModalProps) {
  const reviews = place?.reviewsCount ?? 0;
  const hasRating = Boolean(place?.rating) && reviews > 0;

  const priceLabel = (() => {
    if (!place) return '';
    const base = place.priceLevel || 'Miễn phí tham quan';
    if (place.ticketPrice && place.ticketPrice > 0) {
      return `${base} · ${place.ticketPrice.toLocaleString('vi-VN')}đ/khách`;
    }
    return base;
  })();

  const handleOpenMap = async () => {
    if (!place) return;
    const hasCoords = place.latitude != null && place.longitude != null;
    const query = hasCoords
      ? `${place.latitude},${place.longitude}`
      : encodeURIComponent([place.name, place.address, place.city].filter(Boolean).join(', '));
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn('Open map failed', e);
      showToast({
        kind: 'error',
        title: 'Không mở được bản đồ',
        message: 'Thiết bị không mở được liên kết bản đồ. Bạn thử lại sau nhé.',
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {place ? (
            <>
              <View style={styles.heroWrap}>
                <PlaceImage place={place} style={styles.hero} />
                <View style={styles.heroScrim} />

                <TouchableOpacity
                  style={[styles.floatingBtn, styles.floatingBtnLeft]}
                  onPress={onClose}
                  accessibilityLabel="Đóng chi tiết">
                  <FontAwesome name="chevron-left" size={16} color={WF_COLORS.slate900} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.floatingBtn, styles.floatingBtnRight]}
                  onPress={onToggleSave}
                  accessibilityLabel={saved ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}>
                  <FontAwesome
                    name={saved ? 'heart' : 'heart-o'}
                    size={16}
                    color={saved ? WF_COLORS.rose : WF_COLORS.slate900}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.body}>
                <View style={styles.tagRow}>
                  {place.category ? (
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{place.category}</Text>
                    </View>
                  ) : null}
                  <View style={styles.cityTag}>
                    <FontAwesome name="map-marker" size={10} color={WF_COLORS.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.cityTagText}>{place.city || 'Việt Nam'}</Text>
                  </View>
                  {place.isVerifiedHost ? (
                    <View style={styles.verifiedTag}>
                      <FontAwesome name="check-circle" size={10} color={WF_COLORS.emerald} style={{ marginRight: 4 }} />
                      <Text style={styles.verifiedTagText}>Đã xác thực</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.name}>{place.name}</Text>

                <View style={styles.ratingBox}>
                  <FontAwesome name="star" size={18} color={hasRating ? WF_COLORS.amber : WF_COLORS.slate400} />
                  <Text style={styles.ratingValue}>{hasRating ? place.rating!.toFixed(1) : '--'}</Text>
                  <Text style={styles.ratingMeta}>
                    {hasRating ? `${reviews} lượt đánh giá` : 'Chưa có lượt đánh giá nào'}
                  </Text>
                </View>

                <View style={styles.infoCard}>
                  <InfoRow icon="map-marker" color={WF_COLORS.primary} text={place.address || `${place.city}, Việt Nam`} />
                  {place.openingHours ? (
                    <InfoRow icon="clock-o" color={WF_COLORS.emerald} text={`Mở cửa: ${place.openingHours}`} />
                  ) : null}
                  {priceLabel ? <InfoRow icon="ticket" color={WF_COLORS.amber} text={priceLabel} /> : null}
                  {place.phoneNumber ? (
                    <InfoRow icon="phone" color={WF_COLORS.violet} text={place.phoneNumber} />
                  ) : null}
                </View>

                {place.amenities && place.amenities.length > 0 ? (
                  <>
                    <Text style={styles.sectionTitle}>Tiện ích tại đây</Text>
                    <View style={styles.chipWrap}>
                      {place.amenities.map((amenity, idx) => (
                        <View key={`${amenity}-${idx}`} style={styles.chip}>
                          <FontAwesome name="check" size={10} color={WF_COLORS.emerald} style={{ marginRight: 5 }} />
                          <Text style={styles.chipText}>{amenity}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}

                <Text style={styles.sectionTitle}>Giới thiệu</Text>
                <Text style={styles.description}>
                  {place.description || 'Chưa có mô tả chi tiết cho địa điểm này.'}
                </Text>

                <TouchableOpacity style={styles.mapBtn} activeOpacity={0.85} onPress={handleOpenMap}>
                  <FontAwesome name="location-arrow" size={13} color={WF_COLORS.primary} style={{ marginRight: 7 }} />
                  <Text style={styles.mapBtnText}>Xem vị trí trên Google Maps</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={onAddToPlan}>
                  <FontAwesome name="calendar-plus-o" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Thêm vào Plan chuyến đi</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function InfoRow({ icon, color, text }: { icon: string; color: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <FontAwesome name={icon as any} size={13} color={color} style={styles.infoIcon} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WF_COLORS.slate50,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroWrap: {
    position: 'relative',
    height: 270,
    backgroundColor: WF_COLORS.slate100,
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 70,
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
  },
  floatingBtn: {
    position: 'absolute',
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingBtnLeft: {
    left: 12,
  },
  floatingBtnRight: {
    right: 12,
  },
  body: {
    padding: 16,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  categoryTag: {
    backgroundColor: WF_COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTagText: {
    color: WF_COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  cityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.white,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cityTagText: {
    color: WF_COLORS.slate700,
    fontSize: 11,
    fontWeight: '600',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.emeraldLight,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedTagText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '700',
  },
  name: {
    fontSize: 23,
    fontWeight: '900',
    color: WF_COLORS.slate900,
    letterSpacing: -0.4,
    marginBottom: 12,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WF_COLORS.white,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '900',
    color: WF_COLORS.slate900,
  },
  ratingMeta: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginLeft: 2,
  },
  infoCard: {
    backgroundColor: WF_COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    padding: 14,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  infoIcon: {
    width: 22,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: WF_COLORS.slate700,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    marginTop: 16,
    marginBottom: 9,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.white,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  description: {
    fontSize: 13,
    lineHeight: 21,
    color: WF_COLORS.slate600,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
    backgroundColor: WF_COLORS.primarySoft,
    marginTop: 20,
  },
  mapBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 13,
    backgroundColor: WF_COLORS.primary,
    marginTop: 12,
    shadowColor: WF_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
