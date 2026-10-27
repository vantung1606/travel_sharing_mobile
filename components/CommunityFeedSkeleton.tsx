import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { WF_PAPER } from '@/constants/Colors';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const BLOCK = '#E8DFD0';

/**
 * Khung xương bảng tin cộng đồng: giữ đúng nhịp layout bài viết
 * (avatar, tiêu đề, nội dung, ảnh, hàng tương tác) để lúc tải xong
 * nội dung thật khớp vào chỗ cũ, không bị nhảy.
 */
export function CommunityFeedSkeleton() {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 860,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 860,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[styles.wrap, { opacity: pulse }]}
      accessible
      accessibilityLabel="Đang tải bảng tin cộng đồng">
      {[0, 1, 2].map((card) => (
        <View key={card} style={styles.card}>
          <View style={styles.authorRow}>
            <View style={styles.avatar} />
            <View style={styles.authorInfo}>
              <View style={[styles.block, styles.nameLine]} />
              <View style={[styles.block, styles.subLine]} />
            </View>
            <View style={[styles.block, styles.pill]} />
          </View>

          <View style={styles.body}>
            <View style={[styles.block, styles.textLine, { width: '94%' }]} />
            <View style={[styles.block, styles.textLine, { width: '100%', marginTop: 8 }]} />
            <View style={[styles.block, styles.textLine, { width: '56%', marginTop: 8 }]} />
          </View>

          <View style={[styles.media, card === 1 && styles.mediaShort]}>
            <View style={styles.mediaHalo} />
          </View>

          <View style={styles.footer}>
            {[0, 1, 2].map((action) => (
              <View key={action} style={styles.action}>
                <View style={styles.actionDot} />
                <View style={[styles.block, styles.actionLine]} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: WF_PAPER.card,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    overflow: 'hidden',
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  block: {
    backgroundColor: BLOCK,
    borderRadius: 99,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BLOCK,
    marginRight: 10,
  },
  authorInfo: {
    flex: 1,
  },
  nameLine: {
    width: '44%',
    height: 11,
  },
  subLine: {
    width: '30%',
    height: 8,
    marginTop: 7,
  },
  pill: {
    width: 58,
    height: 18,
    borderRadius: 6,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 13,
  },
  textLine: {
    height: 9,
  },
  media: {
    height: 200,
    backgroundColor: WF_PAPER.pillBg,
  },
  mediaShort: {
    height: 168,
  },
  mediaHalo: {
    position: 'absolute',
    right: -34,
    bottom: -48,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: WF_PAPER.pillBg,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: BLOCK,
  },
  actionLine: {
    width: 20,
    height: 8,
  },
});
