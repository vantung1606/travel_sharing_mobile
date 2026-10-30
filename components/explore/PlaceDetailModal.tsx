import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, ScrollView, Share, StyleSheet, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { showToast } from '@/components/Toast';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Text } from '@/components/Themed';
import { PlaceImage } from '@/components/explore/PlaceImage';
import { UniversalReportModal } from '@/components/UniversalReportModal';
import { WF_COLORS } from '@/constants/Colors';
import { authStorage, UserSession } from '@/src/services/authStorage';
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
  /** Callback khi người dùng nhấn vào tác giả review */
  onPressAuthor?: (userId: number) => void;
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
  onPressAuthor,
}: PlaceDetailModalProps) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    type: 'PLACE' | 'REVIEW';
    id: number;
    title: string;
  } | null>(null);
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

  const { width: windowWidth } = useWindowDimensions();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleModalClose = () => {
    // Dọn dẹp khi đóng modal (setState trong event handler — hợp lệ về quy tắc)
    setReviewsState({ forKey: null, list: [], canReview: false });
    setWeatherState({ forKey: null, data: null });
    setCheckinState({ forKey: null, list: [] });
    setEditingReviewId(null);
    setReviewStars(0);
    setReviewComment('');
    setActiveImageIndex(0);
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
    authStorage.getSession().then((s) => {
      if (alive) {
        setSession(s);
        setReviewsState((prev) => ({
          forKey: placeId,
          list: prev.list,
          canReview: Boolean(s),
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

  const handleStartEditReview = (review: ReviewItem) => {
    setEditingReviewId(review.id);
    setReviewStars(review.rating);
    setReviewComment(review.comment);
    showToast({
      kind: 'info',
      title: 'Chế độ chỉnh sửa',
      message: 'Bạn đang chỉnh sửa đánh giá của mình.',
      icon: 'pencil',
    });
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setReviewStars(0);
    setReviewComment('');
  };

  const handleDeleteReview = async (review: ReviewItem) => {
    if (!place) return;
    const ok = await confirmDialog({
      title: 'Xóa đánh giá?',
      message: 'Bạn có chắc chắn muốn xóa bài đánh giá này về địa điểm không?',
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      destructive: true,
    });
    if (!ok) return;

    try {
      await reviewApi.deleteReview(place.id, review.id);
      setReviewsState((prev) => ({
        ...prev,
        list: prev.list.filter((r) => r.id !== review.id),
      }));
      if (editingReviewId === review.id) {
        handleCancelEdit();
      }
      showToast({
        kind: 'success',
        title: 'Đã xóa đánh giá',
        message: 'Đánh giá của bạn đã được xóa thành công.',
      });
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Xóa đánh giá thất bại',
        message: e?.message || 'Không thể xóa đánh giá. Vui lòng thử lại sau.',
      });
    }
  };

  const handleSubmitReview = async () => {
    if (!place || submittingReview) return;
    if (!reviewStars || !reviewComment.trim()) return;
    setSubmittingReview(true);
    try {
      if (editingReviewId) {
        const updated = await reviewApi.updateReview(place.id, editingReviewId, {
          rating: reviewStars,
          comment: reviewComment,
        });
        setReviewsState((prev) => ({
          ...prev,
          list: prev.list.map((r) =>
            r.id === editingReviewId
              ? {
                  ...r,
                  ...(updated || {}),
                  rating: reviewStars,
                  comment: reviewComment.trim(),
                }
              : r
          ),
        }));
        handleCancelEdit();
        showToast({
          kind: 'success',
          title: 'Cập nhật thành công!',
          message: 'Đánh giá của bạn đã được cập nhật thành công.',
        });
      } else {
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
            authorName: session?.fullName || 'Tôi',
            authorAvatar: session?.avatar,
            authorId: session?.id,
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
      }
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: editingReviewId ? 'Không cập nhật được' : 'Không gửi được nhận xét',
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

  const handleOpenDirection = async () => {
    if (!place) return;
    const hasCoords = place.latitude != null && place.longitude != null;
    const dest = hasCoords
      ? `${place.latitude},${place.longitude}`
      : encodeURIComponent([place.name, place.address, place.city].filter(Boolean).join(', '));
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn('Open maps direction failed', e);
      const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${dest}`;
      Linking.openURL(fallbackUrl).catch(() => {
        showToast({
          kind: 'error',
          title: 'Không mở được chỉ đường',
          message: 'Thiết bị không mở được ứng dụng bản đồ Google Maps.',
        });
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
                {Array.isArray(place.images) && place.images.length > 1 ? (
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(e) => {
                      const offsetX = e.nativeEvent.contentOffset.x;
                      const idx = Math.round(offsetX / windowWidth);
                      setActiveImageIndex(Math.max(0, Math.min(idx, place.images!.length - 1)));
                    }}
                    style={{ width: windowWidth, height: 270 }}
                  >
                    {place.images.map((imgUri, index) => (
                      <Image
                        key={`${imgUri}-${index}`}
                        source={{ uri: imgUri }}
                        style={{ width: windowWidth, height: 270 }}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                ) : (
                  <PlaceImage place={place} style={styles.hero} />
                )}
                <View style={styles.heroScrim} pointerEvents="none" />

                <TouchableOpacity
                  style={[styles.floatingBtn, styles.floatingBtnLeft]}
                  onPress={handleModalClose}
                  accessibilityLabel="Đóng chi tiết">
                  <FontAwesome name="chevron-left" size={16} color={WF_COLORS.slate900} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.floatingBtn, styles.floatingBtnReport]}
                  onPress={() => {
                    if (!place) return;
                    setReportTarget({
                      type: 'PLACE',
                      id: place.id,
                      title: place.name,
                    });
                  }}
                  accessibilityLabel="Báo cáo địa điểm">
                  <FontAwesome name="flag-o" size={15} color={WF_COLORS.slate900} />
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

                {/* Counter Badge */}
                {Array.isArray(place.images) && place.images.length > 1 && (
                  <View style={styles.imageBadge}>
                    <FontAwesome name="camera" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.imageBadgeText}>{`${activeImageIndex + 1}/${place.images.length}`}</Text>
                  </View>
                )}

                {/* Pagination Dots */}
                {Array.isArray(place.images) && place.images.length > 1 && (
                  <View style={styles.paginationDots} pointerEvents="none">
                    {place.images.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          i === activeImageIndex && styles.activeDot,
                        ]}
                      />
                    ))}
                  </View>
                )}
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
                      {liveReviews.slice(0, 15).map((r, idx) => {
                        const isMyReview = session && (
                          (r.authorId != null && r.authorId === session.id) ||
                          (r.authorEmail && session.email && r.authorEmail.toLowerCase() === session.email.toLowerCase())
                        );
                        return (
                          <View key={r.id ?? `review-${idx}`} style={styles.reviewRow}>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => r.authorId && onPressAuthor?.(r.authorId)}
                              disabled={!r.authorId || !onPressAuthor}>
                              {r.authorAvatar ? (
                                <Image source={{ uri: r.authorAvatar }} style={styles.reviewAvatar} />
                              ) : (
                                <View style={styles.reviewAvatarFallback}>
                                  <Text style={styles.reviewAvatarText}>{(r.authorName || 'W')[0]}</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                            <View style={styles.reviewBody}>
                              <View style={styles.reviewMetaRow}>
                                <TouchableOpacity
                                  activeOpacity={0.8}
                                  onPress={() => r.authorId && onPressAuthor?.(r.authorId)}
                                  disabled={!r.authorId || !onPressAuthor}
                                  style={{ flex: 1 }}>
                                  <Text style={styles.reviewAuthor} numberOfLines={1}>
                                    {r.authorName || 'Du khách'}
                                    {isMyReview ? ' (Bạn)' : ''}
                                  </Text>
                                </TouchableOpacity>
                                <Text style={styles.reviewStars}>{'★'.repeat(r.rating || 0)}</Text>
                              </View>
                              <Text style={styles.reviewComment}>{r.comment}</Text>
                              {isMyReview ? (
                                <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
                                  <TouchableOpacity onPress={() => handleStartEditReview(r)}>
                                    <Text style={{ fontSize: 11.5, color: WF_COLORS.primary, fontWeight: '700' }}>
                                      ✎ Chỉnh sửa
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => handleDeleteReview(r)}>
                                    <Text style={{ fontSize: 11.5, color: '#E11D48', fontWeight: '700' }}>
                                      ✕ Xóa
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              ) : (
                                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
                                  <TouchableOpacity
                                    onPress={() =>
                                      setReportTarget({
                                        type: 'REVIEW',
                                        id: r.id,
                                        title: `Đánh giá của ${r.authorName || 'du khách'}`,
                                      })
                                    }
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                      paddingVertical: 2,
                                      paddingHorizontal: 6,
                                    }}>
                                    <FontAwesome name="flag-o" size={11} color={WF_COLORS.slate400} />
                                    <Text style={{ fontSize: 11, color: WF_COLORS.slate400 }}>Báo cáo</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <ActivityIndicator size="small" color={WF_COLORS.primary} style={{ marginVertical: 10 }} />
                  )}

                  {canReview ? (
                    <View style={styles.reviewForm}>
                      {editingReviewId ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: WF_COLORS.slate200 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: WF_COLORS.primary }}>
                            ✏️ Đang chỉnh sửa nhận xét của bạn
                          </Text>
                          <TouchableOpacity onPress={handleCancelEdit}>
                            <Text style={{ fontSize: 12, color: '#E11D48', fontWeight: '600' }}>Hủy</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}
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
                          <ActivityIndicator size="small" color="#FFFDF8" style={{ marginRight: 6 }} />
                        ) : (
                          <FontAwesome name={editingReviewId ? 'check' : 'paper-plane'} size={12} color="#FFFDF8" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.reviewSubmitText}>
                          {submittingReview ? 'Đang lưu...' : (editingReviewId ? 'Lưu thay đổi' : 'Gửi nhận xét')}
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
                        <FontAwesome name="camera" size={11} color="#B0522F" style={{ marginRight: 4 }} />
                        <Text style={styles.writeCheckinMiniText}>Viết bài</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {loadingCheckin ? (
                    <ActivityIndicator size="small" color="#B0522F" style={{ marginVertical: 12 }} />
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
                                <FontAwesome name="camera" size={24} color="#D9CDBE" />
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
                                  <FontAwesome name="comment-o" size={10} color="#5A5146" style={{ marginRight: 3 }} />
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
                        <FontAwesome name="camera" size={20} color="#B0522F" />
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
                          <FontAwesome name="pencil-square-o" size={12} color="#FFFDF8" style={{ marginRight: 6 }} />
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
                    <FontAwesome name="camera" size={14} color="#FFFDF8" style={{ marginRight: 8 }} />
                    <Text style={styles.checkinActionBtnText}>📸 Viết bài check-in tại đây</Text>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.mapActionsRow}>
                  <TouchableOpacity style={[styles.mapBtn, styles.mapBtnHalf]} activeOpacity={0.85} onPress={handleOpenDirection}>
                    <FontAwesome name="location-arrow" size={13} color={WF_COLORS.primary} style={{ marginRight: 7 }} />
                    <Text style={styles.mapBtnText} numberOfLines={1}>Chỉ đường Maps</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.mapBtn, styles.mapBtnHalf]} activeOpacity={0.85} onPress={handleSharePlace}>
                    <FontAwesome name="share-alt" size={13} color={WF_COLORS.primary} style={{ marginRight: 7 }} />
                    <Text style={styles.mapBtnText} numberOfLines={1}>Chia sẻ</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={onAddToPlan}>
                  <FontAwesome name="calendar-plus-o" size={15} color="#FFFDF8" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Thêm vào Plan chuyến đi</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <UniversalReportModal
        visible={!!reportTarget}
        targetType={reportTarget?.type || 'PLACE'}
        targetId={reportTarget?.id ?? null}
        targetTitle={reportTarget?.title}
        onClose={() => setReportTarget(null)}
      />
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
    backgroundColor: 'rgba(30, 26, 21, 0.16)',
  },
  floatingBtn: {
    position: 'absolute',
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 0,
  },
  floatingBtnLeft: {
    left: 12,
  },
  floatingBtnReport: {
    right: 54,
  },
  floatingBtnRight: {
    right: 12,
  },
  imageBadge: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  paginationDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    width: 14,
    backgroundColor: '#FFFFFF',
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
    borderRadius: 5,
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
    borderRadius: 5,
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
    borderRadius: 5,
  },
  verifiedTagText: {
    color: WF_COLORS.emerald,
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
    borderRadius: 6,
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
    borderRadius: 6,
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
    borderRadius: 5,
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
    borderRadius: 5,
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
    borderRadius: 6,
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
    borderRadius: 5,
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
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: '#FFFDF8',
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
    borderRadius: 5,
    backgroundColor: WF_COLORS.primary,
  },
  reviewSubmitBtnDisabled: {
    opacity: 0.55,
  },
  reviewSubmitText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFDF8',
  },
  reviewLoginHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 5,
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
    borderRadius: 5,
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
    borderRadius: 5,
    backgroundColor: WF_COLORS.primary,
    marginTop: 12,
    shadowColor: WF_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 0,
  },
  primaryBtnText: {
    color: '#FFFDF8',
    fontSize: 14,
    fontWeight: '800',
  },
  // Check-in section styles
  checkinSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3EDE2',
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
    backgroundColor: '#F6E6DD',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  checkinBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B0522F',
  },
  writeCheckinMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: '#F6E6DD',
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  writeCheckinMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B0522F',
  },
  checkinScroll: {
    paddingRight: 16,
    gap: 12,
  },
  checkinCard: {
    width: 170,
    backgroundColor: '#FFFDF8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E4DACB',
    overflow: 'hidden',
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 0,
  },
  checkinCardThumb: {
    width: '100%',
    height: 100,
    backgroundColor: '#F3EDE2',
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
    backgroundColor: '#E4DACB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  checkinCardAvatarText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#5A5146',
  },
  checkinCardAuthorName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#3B332A',
  },
  checkinCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E1A15',
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
    color: '#5A5146',
  },
  emptyCheckinBox: {
    backgroundColor: '#F8F4EC',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E4DACB',
    borderStyle: 'dashed',
    padding: 18,
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyCheckinCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F6E6DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyCheckinTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3B332A',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyCheckinSub: {
    fontSize: 11,
    color: '#5A5146',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  emptyCheckinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B0522F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 5,
  },
  emptyCheckinBtnText: {
    color: '#FFFDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  checkinActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 5,
    backgroundColor: '#B0522F',
    marginTop: 16,
    shadowColor: '#B0522F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 0,
  },
  checkinActionBtnText: {
    color: '#FFFDF8',
    fontSize: 14,
    fontWeight: '800',
  },
});
