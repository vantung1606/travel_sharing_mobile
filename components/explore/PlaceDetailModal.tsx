import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showToast } from '@/components/Toast';
import { Text } from '@/components/Themed';
import { PlaceImage } from '@/components/explore/PlaceImage';
import { WF_COLORS } from '@/constants/Colors';
import { authStorage } from '@/src/services/authStorage';
import { PlaceItem, PostItem, postApi, reviewApi, ReviewItem, webPlaceUrl } from '@/src/services/api';
import { getPostImages } from '@/components/community/communityUtils';
import { fetchLiveWeather } from '@/src/utils/weather';

interface PlaceDetailModalProps {
  visible: boolean;
  place: PlaceItem | null;
  saved: boolean;
  onClose: () => void;
  onToggleSave: () => void;
  onAddToPlan: () => void;
  /** Mở form đăng nhập khi người dùng muốn đánh giá mà chưa đăng nhập. */
  onRequireLogin?: () => void;
  /** Callback khi người dùng nhấn 'Viết bài check-in tại đây' */
  onWriteCheckinPost?: (place: PlaceItem) => void;
  /** Callback khi người dùng nhấn vào 1 bài viết check-in */
  onOpenPostDetail?: (post: PostItem) => void;
}

export function PlaceDetailModal({
  visible,
  place,
  saved,
  onClose,
  onToggleSave,
  onAddToPlan,
  onRequireLogin,
  onWriteCheckinPost,
  onOpenPostDetail,
}: PlaceDetailModalProps) {
  // reviewsState/weatherState gắn dấu "forKey" = placeId đã tải → loading là
  // state suy diễn (reviewsState.forKey !== placeId), KHÔNG cần setState
  // đồng bộ trong effect (react-hooks/set-state-in-effect).
  const [reviewsState, setReviewsState] = useState<{
    forKey: number | null;
    list: ReviewItem[];
    canReview: boolean;
  }>({ forKey: null, list: [], canReview: false });
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [weatherState, setWeatherState] = useState<{
    forKey: number | null;
    data: { temp: number; label: string; icon: string; vibe: string } | null;
  }>({ forKey: null, data: null });
  const [checkinState, setCheckinState] = useState<{
    forKey: number | null;
    list: PostItem[];
  }>({ forKey: null, list: [] });

  const handleModalClose = () => {
    // Dọn dẹp khi đóng modal (setState trong event handler — hợp lệ về quy tắc)
    setReviewsState({ forKey: null, list: [], canReview: false });
    setWeatherState({ forKey: null, data: null });
    setCheckinState({ forKey: null, list: [] });
    setReviewStars(0);
    setReviewComment('');
    onClose();
  };

  // Đánh giá THẬT + thời tiết THẬT theo tọa độ, tải khi modal mở lên.
  const placeId = place?.id ?? null;
  const hasCoords = place?.latitude != null && place?.longitude != null;
  const loadingReviews = reviewsState.forKey !== placeId;
  const weatherLoading = hasCoords && weatherState.forKey !== placeId;
  const loadingCheckin = checkinState.forKey !== placeId;
  const liveWeather = weatherState.forKey === placeId ? weatherState.data : null;
  const liveReviews = reviewsState.forKey === placeId ? reviewsState.list : [];
  const liveCheckinPosts = checkinState.forKey === placeId ? checkinState.list : [];
  const canReview = reviewsState.canReview;

  useEffect(() => {
    if (!visible || !placeId) return undefined;
    let alive = true;
    reviewApi
      .getReviews(placeId)
      .then((list) => {
        if (alive) {
          setReviewsState((prev) => ({
            forKey: placeId,
            list,
            canReview: prev.canReview,
          }));
        }
      })
      .catch(() => {
        if (alive) {
          setReviewsState((prev) => ({ forKey: placeId, list: [], canReview: prev.canReview }));
        }
      });
    postApi
      .getCommunityPosts({ placeId })
      .then((posts) => {
        if (alive) {
          setCheckinState({ forKey: placeId, list: posts || [] });
        }
      })
      .catch(() => {
        if (alive) {
          setCheckinState({ forKey: placeId, list: [] });
        }
      });
    authStorage.getSession().then((session) => {
      if (alive) {
        setReviewsState((prev) => ({
          forKey: placeId,
          list: prev.list,
          canReview: Boolean(session),
        }));
      }
    });
    if (hasCoords) {
      fetchLiveWeather(place?.latitude, place?.longitude).then((w) => {
        if (alive) setWeatherState({ forKey: placeId, data: w });
      });
    }
    return () => {
      alive = false;
    };
  }, [visible, placeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitReview = async () => {
    if (!place || submittingReview) return;
    if (!reviewStars || !reviewComment.trim()) return;
    setSubmittingReview(true);
    try {
      const created = await reviewApi.addReview(place.id, {
        rating: reviewStars,
        comment: reviewComment,
      });
      const fresh =
        created ||
        ({
          id: Date.now(),
          rating: reviewStars,
          comment: reviewComment.trim(),
        } as ReviewItem);
      setReviewsState((prev) => ({
        forKey: place.id,
        list: [fresh, ...prev.list],
        canReview: prev.canReview,
      }));
      setReviewStars(0);
      setReviewComment('');
      showToast({
        kind: 'success',
        title: 'Đã gửi nhận xét!',
        message: 'Cảm ơn bạn đã chia sẻ trải nghiệm cho người đi sau. 🌟',
      });
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Không gửi được nhận xét',
        message: e?.message || 'Vui lòng kiểm tra kết nối và thử lại.',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const reviewsCount = liveReviews.length || (place?.reviewsCount ?? 0);
  const hasRating = Boolean(place?.rating) && reviewsCount > 0;

  const priceLabel = (() => {
    if (!place) return '';
    const base = place.priceLevel || 'Miễn phí tham quan';
    if (place.ticketPrice && place.ticketPrice > 0) {
      return `${base} · ${place.ticketPrice.toLocaleString('vi-VN')}đ/khách`;
    }
    return base;
  })();

  const handleSharePlace = async () => {
    if (!place) return;
    const link = webPlaceUrl(place.id);
    const coords = place.latitude != null && place.longitude != null ? `${place.latitude}, ${place.longitude}` : null;
    const message = [
      `${place.name} — ${place.city || 'Việt Nam'}`,
      place.category ? `#${place.category.replace(/\s+/g, '')}` : null,
      coords ? `GPS: ${coords}` : null,
      link ? `Xem chi tiết: ${link}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await Share.share({ title: place.name, message });
    } catch {
      // Người dùng thu hồi hộp thoại chia sẻ — bỏ qua, không toast thụ động.
    }
  };

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
                   onPress={handleModalClose}
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
                    {hasRating ? `${reviewsCount} lượt đánh giá` : 'Chưa có lượt đánh giá nào'}
                  </Text>
                </View>

                {/* Thời tiết THẬT (Open-Meteo) — chỉ hiện khi có GPS, không ước lượng */}
                {hasCoords && weatherLoading ? (
                  <View style={styles.weatherCard}>
                    <ActivityIndicator size="small" color={WF_COLORS.primary} />
                    <Text style={styles.weatherLabel}>Đang kiểm tra thời tiết thực tế...</Text>
                  </View>
                ) : hasCoords && liveWeather ? (
                  <View style={styles.weatherCard}>
                    <Text style={styles.weatherIcon}>{liveWeather.icon}</Text>
                    <View style={styles.weatherBody}>
                      <Text style={styles.weatherTemp}>
                        {liveWeather.temp}°C · {liveWeather.label}
                      </Text>
                      <Text style={styles.weatherLabel}>{liveWeather.vibe}</Text>
                    </View>
                  </View>
                ) : null}

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

                {place.ownerName || place.isVerifiedHost ? (
                  <View style={styles.ownerRow}>
                    <Image
                      source={
                        place.ownerAvatar
                          ? { uri: place.ownerAvatar }
                          : require('../../assets/images/icon.png')
                      }
                      style={styles.ownerAvatar}
                    />
                    <View style={styles.ownerTextWrap}>
                      <Text style={styles.ownerText} numberOfLines={1}>
                        Được chia sẻ bởi{' '}
                        <Text style={styles.ownerName}>
                          {place.ownerName || 'cộng đồng Wayfare'}
                          {place.ownerHandle ? ` (${place.ownerHandle})` : ''}
                        </Text>
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* ═══════════ ĐÁNH GIÁ THẬT TỪ DU KHÁCH ═══════════ */}
                <View style={styles.reviewsSection}>
                  <Text style={styles.sectionTitle}>
                    {loadingReviews
                      ? 'Đang tải đánh giá...'
                      : liveReviews.length > 0
                        ? `Đánh giá từ du khách (${liveReviews.length})`
                        : 'Chưa có đánh giá nào'}
                  </Text>

                  {liveReviews.length > 0 ? (
                    <View style={styles.reviewsWrap}>
                      {liveReviews.slice(0, 10).map((r, idx) => (
                        <View key={r.id ?? `review-${idx}`} style={styles.reviewRow}>
                          {r.authorAvatar ? (
                            <Image source={{ uri: r.authorAvatar }} style={styles.reviewAvatar} />
                          ) : (
                            <View style={styles.reviewAvatarFallback}>
                              <Text style={styles.reviewAvatarText}>{(r.authorName || 'W')[0]}</Text>
                            </View>
                          )}
                          <View style={styles.reviewBody}>
                            <View style={styles.reviewMetaRow}>
                              <Text style={styles.reviewAuthor} numberOfLines={1}>
                                {r.authorName || 'Du khách'}
                              </Text>
                              <Text style={styles.reviewStars}>{'★'.repeat(r.rating || 0)}</Text>
                            </View>
                            <Text style={styles.reviewComment}>{r.comment}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <ActivityIndicator size="small" color={WF_COLORS.primary} style={{ marginVertical: 10 }} />
                  )}

                  {canReview ? (
                    <View style={styles.reviewForm}>
                      <View style={styles.starPickerRow}>
                        <Text style={styles.starPickerLabel}>Chấm điểm:</Text>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => setReviewStars(star)}
                            style={styles.starPickBtn}>
                            <FontAwesome
                              name="star"
                              size={19}
                              color={star <= reviewStars ? WF_COLORS.amber : WF_COLORS.slate400}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        value={reviewComment}
                        onChangeText={setReviewComment}
                        placeholder="Chia sẻ cảm nhận, góc chụp đẹp hoặc lưu ý cho người đi sau..."
                        placeholderTextColor={WF_COLORS.slate400}
                        multiline
                        numberOfLines={3}
                        style={styles.reviewInput}
                      />
                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={submittingReview || !reviewStars || !reviewComment.trim()}
                        style={[
                          styles.reviewSubmitBtn,
                          (submittingReview || !reviewStars || !reviewComment.trim()) &&
                            styles.reviewSubmitBtnDisabled,
                        ]}
                        onPress={handleSubmitReview}>
                        {submittingReview ? (
                          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                        ) : (
                          <FontAwesome name="paper-plane" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.reviewSubmitText}>
                          {submittingReview ? 'Đang gửi...' : 'Gửi nhận xét'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.reviewLoginHint}
                      activeOpacity={0.8}
                      onPress={onRequireLogin}>
                      <FontAwesome name="sign-in" size={11} color={WF_COLORS.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.reviewLoginText}>Đăng nhập để chia sẻ nhận xét của bạn</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* ═══════════ BÀI VIẾT CHECK-IN TỪ CỘNG ĐỒNG ═══════════ */}
                <View style={styles.checkinSection}>
                  <View style={styles.checkinSectionHeader}>
                    <View style={styles.checkinTitleWrap}>
                      <Text style={styles.sectionTitle}>
                        Bài viết check-in ({loadingCheckin ? '...' : liveCheckinPosts.length})
                      </Text>
                      <View style={styles.checkinBadge}>
                        <Text style={styles.checkinBadgeText}>Mới</Text>
                      </View>
                    </View>
                    {onWriteCheckinPost ? (
                      <TouchableOpacity
                        style={styles.writeCheckinMiniBtn}
                        activeOpacity={0.8}
                        onPress={() => onWriteCheckinPost(place)}>
                        <FontAwesome name="camera" size={11} color="#059669" style={{ marginRight: 4 }} />
                        <Text style={styles.writeCheckinMiniText}>Viết bài</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {loadingCheckin ? (
                    <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 12 }} />
                  ) : liveCheckinPosts.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.checkinScroll}>
                      {liveCheckinPosts.map((cp) => {
                        const postImages = getPostImages(cp);
                        return (
                          <TouchableOpacity
                            key={cp.id}
                            style={styles.checkinCard}
                            activeOpacity={0.88}
                            onPress={() => onOpenPostDetail?.(cp)}>
                            {postImages.length > 0 ? (
                              <Image source={{ uri: postImages[0] }} style={styles.checkinCardThumb} />
                            ) : (
                              <View style={[styles.checkinCardThumb, styles.checkinCardThumbFallback]}>
                                <FontAwesome name="camera" size={24} color="#CBD5E1" />
                              </View>
                            )}
                            <View style={styles.checkinCardBody}>
                            <View style={styles.checkinCardAuthorRow}>
                              {cp.authorAvatar ? (
                                <Image source={{ uri: cp.authorAvatar }} style={styles.checkinCardAvatar} />
                              ) : (
                                <View style={styles.checkinCardAvatarFallback}>
                                  <Text style={styles.checkinCardAvatarText}>{(cp.authorName || 'W')[0]}</Text>
                                </View>
                              )}
                              <Text style={styles.checkinCardAuthorName} numberOfLines={1}>
                                {cp.authorName || 'Thành viên'}
                              </Text>
                            </View>
                            <Text style={styles.checkinCardTitle} numberOfLines={2}>
                              {cp.title || cp.content || 'Khoảnh khắc check-in'}
                            </Text>
                            <View style={styles.checkinCardMeta}>
                              <View style={styles.checkinMetaItem}>
                                <FontAwesome name="heart" size={10} color="#EF4444" style={{ marginRight: 3 }} />
                                <Text style={styles.checkinMetaText}>{cp.likeCount ?? cp.likesCount ?? 0}</Text>
                              </View>
                              {cp.commentCount != null && cp.commentCount > 0 ? (
                                <View style={styles.checkinMetaItem}>
                                  <FontAwesome name="comment-o" size={10} color="#64748B" style={{ marginRight: 3 }} />
                                  <Text style={styles.checkinMetaText}>{cp.commentCount}</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptyCheckinBox}>
                      <View style={styles.emptyCheckinCircle}>
                        <FontAwesome name="camera" size={20} color="#059669" />
                      </View>
                      <Text style={styles.emptyCheckinTitle}>Chưa có bài viết check-in nào</Text>
                      <Text style={styles.emptyCheckinSub}>
                        Hãy là người đầu tiên chia sẻ ảnh check-in và kinh nghiệm du lịch tại {place.name}!
                      </Text>
                      {onWriteCheckinPost ? (
                        <TouchableOpacity
                          style={styles.emptyCheckinBtn}
                          activeOpacity={0.85}
                          onPress={() => onWriteCheckinPost(place)}>
                          <FontAwesome name="pencil-square-o" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.emptyCheckinBtnText}>Viết bài check-in đầu tiên</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}
                </View>

                {onWriteCheckinPost ? (
                  <TouchableOpacity
                    style={styles.checkinActionBtn}
                    activeOpacity={0.88}
                    onPress={() => onWriteCheckinPost(place)}>
                    <FontAwesome name="camera" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.checkinActionBtnText}>📸 Viết bài check-in tại đây</Text>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.mapActionsRow}>
                  <TouchableOpacity style={[styles.mapBtn, styles.mapBtnHalf]} activeOpacity={0.85} onPress={handleOpenMap}>
                    <FontAwesome name="location-arrow" size={13} color={WF_COLORS.primary} style={{ marginRight: 7 }} />
                    <Text style={styles.mapBtnText} numberOfLines={1}>Google Maps</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.mapBtn, styles.mapBtnHalf]} activeOpacity={0.85} onPress={handleSharePlace}>
                    <FontAwesome name="share-alt" size={13} color={WF_COLORS.primary} style={{ marginRight: 7 }} />
                    <Text style={styles.mapBtnText} numberOfLines={1}>Chia sẻ</Text>
                  </TouchableOpacity>
                </View>

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
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: WF_COLORS.slate100,
  },
  ownerAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 8,
    backgroundColor: WF_COLORS.slate200,
  },
  ownerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  ownerText: {
    fontSize: 11,
    color: WF_COLORS.slate600,
  },
  ownerName: {
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: WF_COLORS.primarySoft,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
  },
  weatherIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  weatherBody: {
    flex: 1,
    minWidth: 0,
  },
  weatherTemp: {
    fontSize: 13,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  weatherLabel: {
    fontSize: 11,
    color: WF_COLORS.slate600,
    marginTop: 2,
  },
  reviewsSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: WF_COLORS.slate200,
  },
  reviewsWrap: {
    marginTop: 8,
    gap: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reviewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 9,
    backgroundColor: WF_COLORS.slate200,
  },
  reviewAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 9,
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: 11,
    fontWeight: '800',
    color: WF_COLORS.slate500,
  },
  reviewBody: {
    flex: 1,
    minWidth: 0,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
  },
  reviewAuthor: {
    fontSize: 11.5,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    maxWidth: '70%',
  },
  reviewStars: {
    fontSize: 10.5,
    fontWeight: '700',
    color: WF_COLORS.amber,
  },
  reviewComment: {
    fontSize: 11.5,
    lineHeight: 17,
    color: WF_COLORS.slate700,
    marginTop: 2,
  },
  reviewForm: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: WF_COLORS.slate100,
  },
  starPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starPickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.slate700,
    marginRight: 8,
  },
  starPickBtn: {
    paddingHorizontal: 3,
  },
  reviewInput: {
    minHeight: 60,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: WF_COLORS.slate700,
    textAlignVertical: 'top',
  },
  reviewSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: 9,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: WF_COLORS.primary,
  },
  reviewSubmitBtnDisabled: {
    opacity: 0.55,
  },
  reviewSubmitText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  reviewLoginHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
    backgroundColor: WF_COLORS.primarySoft,
  },
  reviewLoginText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.primary,
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
  mapActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  mapBtnHalf: {
    flex: 1,
    minWidth: 0,
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
  // Check-in section styles
  checkinSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  checkinSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  checkinTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkinBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  checkinBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  writeCheckinMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  writeCheckinMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  checkinScroll: {
    paddingRight: 16,
    gap: 12,
  },
  checkinCard: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  checkinCardThumb: {
    width: '100%',
    height: 100,
    backgroundColor: '#F1F5F9',
  },
  checkinCardThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinCardBody: {
    padding: 10,
  },
  checkinCardAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkinCardAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  checkinCardAvatarFallback: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  checkinCardAvatarText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  checkinCardAuthorName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  checkinCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 15,
    marginBottom: 8,
    height: 30,
  },
  checkinCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkinMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkinMetaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  emptyCheckinBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 18,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyCheckinCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyCheckinTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyCheckinSub: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  emptyCheckinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  emptyCheckinBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkinActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 13,
    backgroundColor: '#059669',
    marginTop: 16,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  checkinActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
