import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface BottomSheetProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Hành động chính, luôn neo ở đáy sheet (không bị cuộn mất). */
  footer?: React.ReactNode;
  /** Chiều cao tối đa theo % màn hình. Mặc định 82%. */
  maxHeightPercent?: number;
  scrollable?: boolean;
}

/**
 * Bottom sheet dùng chung, 0 dependency ngoài React Native.
 *
 * Dùng Modal để lớp phủ phủ trọn màn hình (kể cả thanh tab), nội dung cuộn
 * được và footer hành động luôn neo ở đáy — người dùng không phải cuộn
 * xuống cuối mới bấm được "Xong".
 */
export function BottomSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxHeightPercent = 82,
  scrollable = true,
}: BottomSheetProps) {
  const [anim] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) {
      anim.setValue(0);
      return;
    }
    Animated.timing(anim, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [visible, anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: anim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
            accessibilityLabel="Đóng bộ lọc"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: `${maxHeightPercent}%` as `${number}%`,
              paddingBottom: Math.max(insets.bottom, 12) + 6,
              transform: [{ translateY }],
            },
          ]}>
          <View style={styles.handle} />

          {title ? (
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Đóng bộ lọc"
                style={styles.closeBtn}>
                <FontAwesome name="times" size={16} color={DS_COLOR.inkSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}

          {scrollable ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={styles.bodyContent}>{children}</View>
          )}

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: DS_COLOR.surface,
    borderTopLeftRadius: DS_RADIUS.sheet,
    borderTopRightRadius: DS_RADIUS.sheet,
    paddingTop: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: DS_COLOR.line,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  title: {
    fontSize: DS_TYPE.title,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  subtitle: {
    marginTop: 2,
    fontSize: DS_TYPE.meta,
    color: DS_COLOR.inkMuted,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DS_COLOR.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DS_COLOR.line,
    backgroundColor: DS_COLOR.surface,
  },
});
