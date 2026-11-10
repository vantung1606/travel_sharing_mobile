import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { WF_PAPER } from '@/constants/Colors';

export interface PostMediaProps {
  images?: string[];
  videoUrl?: string;
  locationText?: string;
  isVideoPlaying?: boolean;
  renderVideo?: () => React.ReactNode;
  onPressImage?: (index: number) => void;
  onPressVideo?: () => void;
}

const GAP = 5;
const RADIUS = 12;

/**
 * Bộ khung media bài viết thông minh (Smart Media Grid):
 * - Ưu tiên Video đầu tiên (nếu có).
 * - Lưới ảnh đa tầng linh hoạt:
 *   · 1 ảnh: Khung 4:3 sắc nét
 *   · 2 ảnh: Tách đôi 50/50 cân xứng
 *   · 3 ảnh: 1 ảnh lớn bên trái + 2 ảnh xếp dọc bên phải
 *   · 4 ảnh: Lưới 2x2 vuông vắn, hài hòa
 *   · 5+ ảnh (ví dụ 6 ảnh): Hiển thị 4 ô trong lưới 2x2, ô thứ 4 phủ màng tối "+2 ảnh" (hoặc +N ảnh còn lại)
 */
export function PostMedia({
  images = [],
  videoUrl,
  locationText,
  renderVideo,
  onPressImage,
  onPressVideo,
}: PostMediaProps) {
  const list = (images || []).filter(Boolean);
  const hasVideo = Boolean(videoUrl);
  const hasImages = list.length > 0;

  if (!hasVideo && !hasImages) return null;

  return (
    <View style={styles.wrapper}>
      {/* ── 1. ƯU TIÊN VIDEO ĐẦU TIÊN ── */}
      {hasVideo ? (
        <View style={[styles.videoSection, hasImages && { marginBottom: GAP + 2 }]}>
          {renderVideo ? (
            renderVideo()
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.defaultVideoCard}
              onPress={onPressVideo}
              accessibilityLabel="Phát video bài viết">
              <View style={styles.videoScrim} />
              <View style={styles.playCircle}>
                <FontAwesome name="play" size={20} color="#FFFDF8" style={{ marginLeft: 3 }} />
              </View>
              <View style={styles.videoBadge}>
                <FontAwesome name="video-camera" size={11} color="#FFFDF8" />
                <Text style={styles.videoBadgeText}>Thước phim</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* ── 2. LƯỚI ẢNH ĐA TẦNG (SMART PHOTO GRID) ── */}
      {hasImages ? (
        <View style={styles.photoGridContainer}>
          {/* CASE 1: 1 ẢNH */}
          {list.length === 1 && (
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.singleWrap}
              onPress={() => onPressImage?.(0)}
              accessibilityLabel="Xem ảnh toàn màn hình">
              <Image source={{ uri: list[0] }} style={styles.singleImage} resizeMode="cover" />
              {locationText ? (
                <View style={styles.photoLocationTag}>
                  <FontAwesome name="map-marker" size={11} color="#FBBF24" style={{ marginRight: 4 }} />
                  <Text style={styles.photoLocationText} numberOfLines={1}>
                    {locationText}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}

          {/* CASE 2: 2 ẢNH (Chia đôi 50/50) */}
          {list.length === 2 && (
            <View style={styles.row}>
              {list.map((uri, index) => (
                <TouchableOpacity
                  key={`${uri}-${index}`}
                  activeOpacity={0.92}
                  style={styles.rowItem}
                  onPress={() => onPressImage?.(index)}
                  accessibilityLabel={`Xem ảnh ${index + 1}`}>
                  <Image source={{ uri }} style={styles.rowImage} resizeMode="cover" />
                  {index === 0 && locationText ? (
                    <View style={styles.photoLocationTag}>
                      <FontAwesome name="map-marker" size={11} color="#FBBF24" style={{ marginRight: 4 }} />
                      <Text style={styles.photoLocationText} numberOfLines={1}>
                        {locationText}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* CASE 3: 3 ẢNH (1 ảnh lớn bên trái + 2 ảnh xếp dọc bên phải) */}
          {list.length === 3 && (
            <View style={styles.mosaicThree}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.threeMain}
                onPress={() => onPressImage?.(0)}
                accessibilityLabel="Xem ảnh 1">
                <Image source={{ uri: list[0] }} style={styles.fullFillImage} resizeMode="cover" />
                {locationText ? (
                  <View style={styles.photoLocationTag}>
                    <FontAwesome name="map-marker" size={11} color="#FBBF24" style={{ marginRight: 4 }} />
                    <Text style={styles.photoLocationText} numberOfLines={1}>
                      {locationText}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <View style={styles.threeSide}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.threeSideItem}
                  onPress={() => onPressImage?.(1)}
                  accessibilityLabel="Xem ảnh 2">
                  <Image source={{ uri: list[1] }} style={styles.fullFillImage} resizeMode="cover" />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.threeSideItem}
                  onPress={() => onPressImage?.(2)}
                  accessibilityLabel="Xem ảnh 3">
                  <Image source={{ uri: list[2] }} style={styles.fullFillImage} resizeMode="cover" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* CASE 4: 4 ẢNH (Lưới 2x2 vuông vắn) */}
          {list.length === 4 && (
            <View style={styles.gridFour}>
              {/* Hàng trên: 2 ảnh */}
              <View style={styles.gridRow}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.gridCell}
                  onPress={() => onPressImage?.(0)}
                  accessibilityLabel="Xem ảnh 1">
                  <Image source={{ uri: list[0] }} style={styles.fullFillImage} resizeMode="cover" />
                  {locationText ? (
                    <View style={styles.photoLocationTag}>
                      <FontAwesome name="map-marker" size={11} color="#FBBF24" style={{ marginRight: 4 }} />
                      <Text style={styles.photoLocationText} numberOfLines={1}>
                        {locationText}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.gridCell}
                  onPress={() => onPressImage?.(1)}
                  accessibilityLabel="Xem ảnh 2">
                  <Image source={{ uri: list[1] }} style={styles.fullFillImage} resizeMode="cover" />
                </TouchableOpacity>
              </View>

              {/* Hàng dưới: 2 ảnh */}
              <View style={styles.gridRow}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.gridCell}
                  onPress={() => onPressImage?.(2)}
                  accessibilityLabel="Xem ảnh 3">
                  <Image source={{ uri: list[2] }} style={styles.fullFillImage} resizeMode="cover" />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.gridCell}
                  onPress={() => onPressImage?.(3)}
                  accessibilityLabel="Xem ảnh 4">
                  <Image source={{ uri: list[3] }} style={styles.fullFillImage} resizeMode="cover" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* CASE 5: 5+ ẢNH (Ví dụ 6 ảnh: Hiển thị 4 ô 2x2, ô thứ 4 phủ "+2 ảnh") */}
          {list.length >= 5 && (
            <View style={styles.gridFour}>
              {/* Hàng trên: 2 ảnh */}
              <View style={styles.gridRow}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.gridCell}
                  onPress={() => onPressImage?.(0)}
                  accessibilityLabel="Xem ảnh 1">
                  <Image source={{ uri: list[0] }} style={styles.fullFillImage} resizeMode="cover" />
                  {locationText ? (
                    <View style={styles.photoLocationTag}>
                      <FontAwesome name="map-marker" size={11} color="#FBBF24" style={{ marginRight: 4 }} />
                      <Text style={styles.photoLocationText} numberOfLines={1}>
                        {locationText}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.gridCell}
                  onPress={() => onPressImage?.(1)}
                  accessibilityLabel="Xem ảnh 2">
                  <Image source={{ uri: list[1] }} style={styles.fullFillImage} resizeMode="cover" />
                </TouchableOpacity>
              </View>

              {/* Hàng dưới: Ảnh thứ 3 và Ảnh thứ 4 (kèm lớp phủ số lượng ảnh còn lại) */}
              <View style={styles.gridRow}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.gridCell}
                  onPress={() => onPressImage?.(2)}
                  accessibilityLabel="Xem ảnh 3">
                  <Image source={{ uri: list[2] }} style={styles.fullFillImage} resizeMode="cover" />
                </TouchableOpacity>

                {/* Ô thứ 4: Hiển thị ảnh kèm lớp phủ số lượng ảnh chưa hiển thị (+N) */}
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.gridCell}
                  onPress={() => onPressImage?.(3)}
                  accessibilityLabel={`Xem ảnh 4 và ${list.length - 4} ảnh khác`}>
                  <Image source={{ uri: list[3] }} style={styles.fullFillImage} resizeMode="cover" />
                  <View style={styles.moreOverlay}>
                    <Text style={styles.moreNumber}>+{list.length - 4}</Text>
                    <Text style={styles.moreLabel}>ảnh</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  videoSection: {
    width: '100%',
  },
  defaultVideoCard: {
    height: 220,
    borderRadius: RADIUS,
    backgroundColor: '#1E1A15',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2, 132, 199, 0.16)',
  },
  playCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(30, 26, 21, 0.65)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(30, 26, 21, 0.75)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoBadgeText: {
    color: '#FFFDF8',
    fontSize: 11,
    fontWeight: '700',
  },

  photoGridContainer: {
    width: '100%',
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  singleWrap: {
    width: '100%',
    borderRadius: RADIUS,
    overflow: 'hidden',
    backgroundColor: WF_PAPER.pillBg,
  },
  singleImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: WF_PAPER.pillBg,
  },

  row: {
    flexDirection: 'row',
    gap: GAP,
    height: 195,
  },
  rowItem: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  rowImage: {
    width: '100%',
    height: '100%',
    backgroundColor: WF_PAPER.pillBg,
  },

  mosaicThree: {
    flexDirection: 'row',
    gap: GAP,
    height: 235,
  },
  threeMain: {
    flex: 1.45,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  threeSide: {
    flex: 1,
    gap: GAP,
  },
  threeSideItem: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },

  gridFour: {
    gap: GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: GAP,
    height: 135,
  },
  gridCell: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: 'hidden',
    backgroundColor: WF_PAPER.pillBg,
  },

  fullFillImage: {
    width: '100%',
    height: '100%',
    backgroundColor: WF_PAPER.pillBg,
  },

  moreOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20, 16, 12, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreNumber: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 24,
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  moreLabel: {
    color: '#FFFDF8',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.3,
  },

  photoLocationTag: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 26, 21, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '85%',
  },
  photoLocationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
