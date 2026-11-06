import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { DS_COLOR } from '@/constants/DesignSystem';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const BLOCK = '#E7E5E4';

/**
 * Khung xương bảng tin cộng đồng: bám đúng layout PostCard mới
 * (card 16px, avatar 42, media 4:3, hàng 4 hành động) để nội dung thật
 * khớp vào chỗ cũ, không nhảy khi tải xong.
 */
export function CommunityFeedSkeleton() {
  const [pulse] = useState(() => new Animated.Value(0.55));

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
            <View style={[styles.block, styles.menuDot]} />
          </View>

          <View style={styles.body}>
            <View style={[styles.block, styles.textLine, { width: '94%' }]} />
            <View style={[styles.block, styles.textLine, { width: '100%', marginTop: 8 }]} />
            <View style={[styles.block, styles.textLine, { width: '56%', marginTop: 8 }]} />
          </View>

          <View style={styles.media} />

          <View style={styles.footer}>
            {[0, 1, 2, 3].map((action) => (
              <View key={action} style={styles.action}>
                <View style={styles.actionDot} />
                {action < 3 ? <View style={[styles.block, styles.actionLine]} /> : null}
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: DS_COLOR.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    overflow: 'hidden',
  },
  block: {
    backgroundColor: BLOCK,
    borderRadius: 999,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
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
  menuDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  textLine: {
    height: 9,
  },
  media: {
    marginHorizontal: 14,
    marginBottom: 12,
    height: 238,
    borderRadius: 12,
    backgroundColor: DS_COLOR.surfaceMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: DS_COLOR.line,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 24,
  },
  actionDot: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: BLOCK,
  },
  actionLine: {
    width: 20,
    height: 8,
  },
});
