import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';

interface ImageLightboxProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  authorName?: string;
  onClose: () => void;
}

/**
 * Trình xem ảnh toàn màn hình (overlay trong cây, không lồng native Modal).
 * Vuốt ngang để chuyển ảnh, bấm nền hoặc nút X để đóng.
 */
export function ImageLightbox({ visible, images, initialIndex = 0, authorName, onClose }: ImageLightboxProps) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(initialIndex);
  const width = Dimensions.get('window').width;

  useEffect(() => {
    if (!visible) return;
    const safeIndex = Math.max(0, Math.min(initialIndex, Math.max(images.length - 1, 0)));
    setIndex(safeIndex);
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: safeIndex, animated: false });
    }, 30);
    return () => clearTimeout(timer);
  }, [visible, initialIndex, images.length]);

  if (!visible || !images.length) return null;

  const go = (direction: -1 | 1) => {
    const next = Math.max(0, Math.min(index + direction, images.length - 1));
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  };

  return (
    <View style={styles.overlay}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 6 }]}>
        <View style={{ flex: 1 }}>
          {authorName ? <Text style={styles.author} numberOfLines={1}>{authorName}</Text> : null}
          <Text style={styles.counter}>
            {index + 1} / {images.length}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Đóng ảnh">
          <FontAwesome name="times" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={images}
        keyExtractor={(item, i) => `${item}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.max(0, Math.min(initialIndex, images.length - 1))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(next);
        }}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
          </View>
        )}
      />

      {images.length > 1 ? (
        <>
          {index > 0 ? (
            <TouchableOpacity style={[styles.navBtn, styles.navLeft]} onPress={() => go(-1)}>
              <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          {index < images.length - 1 ? (
            <TouchableOpacity style={[styles.navBtn, styles.navRight]} onPress={() => go(1)}>
              <FontAwesome name="chevron-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          <View style={[styles.dots, { bottom: Math.max(insets.bottom, 16) + 12 }]}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </>
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
    backgroundColor: 'rgba(2, 6, 23, 0.97)',
    zIndex: 60,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  author: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  counter: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navBtn: {
    position: 'absolute',
    top: '48%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLeft: {
    left: 10,
  },
  navRight: {
    right: 10,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },
});
