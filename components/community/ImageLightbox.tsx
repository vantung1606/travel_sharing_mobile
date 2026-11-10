import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { WF_PAPER } from '@/constants/Colors';

interface ImageLightboxProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  authorName?: string;
  onClose: () => void;
}

/**
 * Trình xem ảnh toàn màn hình (Full-screen Image Lightbox):
 * - Kích thước pixel tường minh (Explicit Dimensions) bảo đảm ảnh luôn hiển thị sắc nét,
 *   không bao giờ bị sụp chiều cao về 0 trên Web lẫn Native Android/iOS.
 * - Hỗ trợ vuốt ngang mượt mà, chuyển trang bằng nút bấm < > hoặc chỉ báo chấm (Dots).
 * - Báo trạng thái tải ảnh với ActivityIndicator tinh tế.
 */
export function ImageLightbox({
  visible,
  images,
  initialIndex = 0,
  authorName,
  onClose,
}: ImageLightboxProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(initialIndex);
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});

  // Tính toán chiều cao khả dụng chính xác cho khu vực ảnh
  const topBarHeight = Math.max(insets.top, 12) + 54;
  const bottomBarHeight = Math.max(insets.bottom, 16) + 40;
  const contentHeight = Math.max(220, height - topBarHeight - bottomBarHeight);

  useEffect(() => {
    if (!visible) return;
    const safeIndex = Math.max(0, Math.min(initialIndex, Math.max(images.length - 1, 0)));
    setIndex(safeIndex);
    const timer = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
      } catch {}
    }, 40);
    return () => clearTimeout(timer);
  }, [visible, initialIndex, images.length]);

  if (!visible || !images.length) return null;

  const go = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(index + direction, images.length - 1));
    try {
      listRef.current?.scrollToIndex({ index: next, animated: true });
    } catch {
      listRef.current?.scrollToOffset({ offset: next * width, animated: true });
    }
    setIndex(next);
  };

  return (
    <View style={styles.overlay}>
      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <View style={{ flex: 1 }}>
          {authorName ? (
            <Text style={styles.author} numberOfLines={1}>
              {authorName}
            </Text>
          ) : null}
          <Text style={styles.counter}>
            {index + 1} / {images.length}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
          accessibilityLabel="Đóng xem ảnh">
          <FontAwesome name="times" size={18} color="#FFFDF8" />
        </TouchableOpacity>
      </View>

      {/* ── Main Image Carousel Area ── */}
      <View style={[styles.contentArea, { height: contentHeight }]}>
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(item, i) => `${item}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={[styles.list, { width, height: contentHeight }]}
          contentContainerStyle={{ minHeight: contentHeight }}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              try {
                listRef.current?.scrollToIndex({ index: info.index, animated: false });
              } catch {}
            }, 60);
          }}
          onMomentumScrollEnd={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / width);
            if (next >= 0 && next < images.length) {
              setIndex(next);
            }
          }}
          renderItem={({ item, index: itemIndex }) => (
            <View style={[styles.page, { width, height: contentHeight }]}>
              {loadingMap[itemIndex] ? (
                <View style={styles.loaderCenter}>
                  <ActivityIndicator size="small" color={WF_PAPER.clay} />
                </View>
              ) : null}
              <Image
                source={{ uri: item }}
                style={[styles.image, { width: Math.max(200, width - 24), height: Math.max(200, contentHeight - 16) }]}
                resizeMode="contain"
                onLoadStart={() => setLoadingMap((prev) => ({ ...prev, [itemIndex]: true }))}
                onLoadEnd={() => setLoadingMap((prev) => ({ ...prev, [itemIndex]: false }))}
                onError={() => setLoadingMap((prev) => ({ ...prev, [itemIndex]: false }))}
              />
            </View>
          )}
        />

        {/* ── Left / Right Arrow Navigation (Cho cả Web & Touch) ── */}
        {images.length > 1 ? (
          <>
            {index > 0 ? (
              <TouchableOpacity
                style={[styles.navBtn, styles.navLeft]}
                onPress={() => go(-1)}
                activeOpacity={0.8}
                accessibilityLabel="Ảnh trước">
                <FontAwesome name="chevron-left" size={16} color="#FFFDF8" />
              </TouchableOpacity>
            ) : null}
            {index < images.length - 1 ? (
              <TouchableOpacity
                style={[styles.navBtn, styles.navRight]}
                onPress={() => go(1)}
                activeOpacity={0.8}
                accessibilityLabel="Ảnh sau">
                <FontAwesome name="chevron-right" size={16} color="#FFFDF8" />
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
      </View>

      {/* ── Bottom Dots Indicator ── */}
      {images.length > 1 ? (
        <View style={[styles.dots, { bottom: Math.max(insets.bottom, 16) + 12 }]}>
          {images.map((_, i) => (
            <TouchableOpacity
              key={i}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              onPress={() => {
                try {
                  listRef.current?.scrollToIndex({ index: i, animated: true });
                  setIndex(i);
                } catch {}
              }}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(20, 16, 12, 0.98)',
    zIndex: 9999,
    flexDirection: 'column',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
  },
  author: {
    color: '#FFFDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  counter: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  contentArea: {
    width: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 1,
  },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
  },
  loaderCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  navBtn: {
    position: 'absolute',
    top: '48%',
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  navLeft: {
    left: 12,
  },
  navRight: {
    right: 12,
  },

  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  dotActive: {
    backgroundColor: '#FFFDF8',
    width: 18,
  },
});
