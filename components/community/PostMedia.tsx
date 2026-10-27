import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { WF_PAPER } from '@/constants/Colors';

interface PostMediaProps {
  images?: string[];
  videoUrl?: string;
  onPressImage?: (index: number) => void;
  onPressVideo?: () => void;
}

const GAP = 6;

/**
 * Bộ khung media bài viết bám theo bản web:
 * 1 ảnh lớn · 2 ảnh cạnh nhau · 3+ ảnh dạng mosaic (1 lớn + 2 nhỏ, phủ "+N ảnh").
 * Video hiển thị dạng poster kèm nút phát.
 */
export function PostMedia({ images = [], videoUrl, onPressImage, onPressVideo }: PostMediaProps) {
  const list = (images || []).filter(Boolean);

  if (videoUrl && !list.length) {
    return (
      <TouchableOpacity activeOpacity={0.9} style={styles.videoCard} onPress={onPressVideo}>
        <View style={styles.videoScrim} />
        <View style={styles.playCircle}>
          <FontAwesome name="play" size={20} color="#FFFDF8" style={{ marginLeft: 3 }} />
        </View>
        <View style={styles.videoBadge}>
          <FontAwesome name="video-camera" size={11} color="#FFFDF8" />
          <Text style={styles.videoBadgeText}>Thước phim</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (!list.length) return null;

  if (list.length === 1) {
    return (
      <TouchableOpacity activeOpacity={0.92} onPress={() => onPressImage?.(0)}>
        <Image source={{ uri: list[0] }} style={styles.single} resizeMode="cover" />
        {videoUrl ? (
          <View style={styles.singlePlayWrap} pointerEvents="none">
            <View style={styles.playCircle}>
              <FontAwesome name="play" size={20} color="#FFFDF8" style={{ marginLeft: 3 }} />
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  }

  if (list.length === 2) {
    return (
      <View style={styles.row}>
        {list.map((uri, index) => (
          <TouchableOpacity
            key={`${uri}-${index}`}
            activeOpacity={0.92}
            style={styles.rowItem}
            onPress={() => onPressImage?.(index)}>
            <Image source={{ uri }} style={styles.rowImage} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  const rightItems = list.slice(1, 3);
  const remaining = list.length - 3;

  return (
    <View style={styles.mosaic}>
      <TouchableOpacity activeOpacity={0.92} style={styles.mosaicMain} onPress={() => onPressImage?.(0)}>
        <Image source={{ uri: list[0] }} style={styles.mosaicImage} resizeMode="cover" />
      </TouchableOpacity>
      <View style={styles.mosaicSide}>
        {rightItems.map((uri, index) => {
          const imageIndex = index + 1;
          const isLast = index === rightItems.length - 1 && remaining > 0;
          return (
            <TouchableOpacity
              key={`${uri}-${imageIndex}`}
              activeOpacity={0.92}
              style={[styles.mosaicSideItem, imageIndex === 1 && { marginBottom: GAP }]}
              onPress={() => onPressImage?.(imageIndex)}>
              <Image source={{ uri }} style={styles.mosaicImage} resizeMode="cover" />
              {isLast ? (
                <View style={styles.moreOverlay}>
                  <Text style={styles.moreText}>+{remaining} ảnh</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const RADIUS = 14;

const styles = StyleSheet.create({
  single: {
    width: '100%',
    height: 244,
    backgroundColor: WF_PAPER.pillBg,
  },
  singlePlayWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 26, 21, 0.22)',
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  rowItem: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  rowImage: {
    width: '100%',
    height: 190,
    backgroundColor: WF_PAPER.pillBg,
  },
  mosaic: {
    flexDirection: 'row',
    gap: GAP,
    height: 236,
  },
  mosaicMain: {
    flex: 1.9,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  mosaicSide: {
    flex: 1,
  },
  mosaicSideItem: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: 'hidden',
  },
  mosaicImage: {
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
    backgroundColor: 'rgba(30, 26, 21, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    color: '#FFFDF8',
    fontWeight: '800',
    fontSize: 14,
  },
  videoCard: {
    height: 210,
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
    borderRadius: 5,
    backgroundColor: 'rgba(30, 26, 21, 0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoBadge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(30, 26, 21, 0.7)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 5,
  },
  videoBadgeText: {
    color: '#FFFDF8',
    fontSize: 11,
    fontWeight: '700',
  },
});
