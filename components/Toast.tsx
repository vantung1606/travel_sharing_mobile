import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { SERIF_FONT } from '@/constants/Typography';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastOptions {
  /** Loại thông báo: thành công / lỗi / thông tin. Mặc định: success. */
  kind?: ToastKind;
  /** Tiêu đề ngắn gọn. */
  title: string;
  /** Nội dung mô tả thêm (không bắt buộc). */
  message?: string;
  /** Thời gian tự ẩn (ms). Mặc định 3200. */
  duration?: number;
  /** Ghi đè icon FontAwesome của loại thông báo. */
  icon?: string;
}

type ToastPayload = ToastOptions & { id: number };

type ToastListener = (payload: ToastPayload) => void;

let toastAutoId = 0;

// Ngăn xếp các host đang gắn trong cây component. Chỉ host nằm TRÊN CÙNG hiển
// thị toast: khi mở modal đăng nhập (host của modal gắn sau) thì thông báo hiện
// bên trong modal; khi modal đóng (host gỡ ra) thông báo quay về host gốc.
let hostStack: ToastListener[] = [];
const hostWatchers = new Set<() => void>();

function notifyHostWatchers(): void {
  hostWatchers.forEach((watcher) => {
    try {
      watcher();
    } catch (e) {
      console.warn('Error syncing toast host', e);
    }
  });
}

/**
 * Hiển thị một thông báo nổi dạng thẻ (toast) ở cạnh trên màn hình.
 * Gọi được từ bất kỳ màn hình / modal nào, miễn là <ToastHost /> đã được gắn
 * ở layout gốc (app/_layout.tsx).
 */
export function showToast(options: ToastOptions): void {
  const payload: ToastPayload = { ...options, id: ++toastAutoId };
  const target = hostStack[hostStack.length - 1];
  if (!target) return;
  try {
    target(payload);
  } catch (e) {
    console.warn('Error in toast host', e);
  }
}

const KIND_CONFIG: Record<ToastKind, { accent: string; icon: string }> = {
  success: { accent: '#34D399', icon: 'check' },
  error: { accent: '#FB7185', icon: 'exclamation' },
  info: { accent: '#38BDF8', icon: 'info' },
};

const DEFAULT_DURATION = 3200;

/**
 * Thẻ thông báo nổi dùng chung cho toàn app (xem showToast).
 * Tự ẩn sau `duration`, chạm vào thẻ để ẩn ngay.
 *
 * `enabled=false` để host tạm nhường quyền hiển thị cho lớp khác (ví dụ host
 * nằm trong modal tự tắt khi modal đóng, kể cả khi nền tảng vẫn giữ modal
 * trong cây DOM).
 */
export function ToastHost({ enabled = true }: { enabled?: boolean }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-28)).current;
  const progress = useRef(new Animated.Value(0)).current;

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnim = useRef<Animated.CompositeAnimation | null>(null);

  const clearTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    progressAnim.current?.stop();
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 190,
        easing: Easing.in(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(translateY, {
        toValue: -22,
        duration: 210,
        easing: Easing.in(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [clearTimer, opacity, translateY]);

  useEffect(() => {
    if (!enabled) return;

    const listener: ToastListener = (payload) => {
      setToast(payload);
      setVisible(true);
    };

    const syncActive = () => setIsActive(hostStack[hostStack.length - 1] === listener);
    hostWatchers.add(syncActive);
    hostStack.push(listener);
    notifyHostWatchers();

    return () => {
      hostWatchers.delete(syncActive);
      hostStack = hostStack.filter((item) => item !== listener);
      notifyHostWatchers();
    };
  }, [enabled]);

  // Host bị lớp khác phủ lên thì ẩn ngay, tránh hiện lặp lại khi được bật lại.
  useEffect(() => {
    if (!isActive) {
      clearTimer();
      setVisible(false);
    }
  }, [isActive, clearTimer]);

  useEffect(() => {
    if (!isActive || !visible || !toast) return;

    opacity.setValue(0);
    translateY.setValue(-28);
    progress.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 230,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 190,
        mass: 0.8,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();

    const duration = toast.duration ?? DEFAULT_DURATION;
    progressAnim.current = Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    progressAnim.current.start();

    clearTimer();
    hideTimer.current = setTimeout(() => hide(), duration);

    return clearTimer;
  }, [toast, visible, isActive, hide, clearTimer, opacity, progress, translateY]);

  if (!isActive || !visible || !toast) return null;

  const kind = toast.kind ?? 'success';
  const config = KIND_CONFIG[kind];
  const iconName = toast.icon || config.icon;

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 10 }]}>
      <Animated.View
        style={[styles.wrap, { opacity, transform: [{ translateY }] }]}
        accessibilityRole="alert"
        accessibilityLabel={`${toast.title}${toast.message ? `. ${toast.message}` : ''}`}>
        <TouchableOpacity activeOpacity={0.92} onPress={hide} style={styles.card}>
          <View style={[styles.iconBadge, { backgroundColor: config.accent }]}>
            <FontAwesome name={iconName as any} size={13} color="#031726" />
          </View>

          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={1}>
              {toast.title}
            </Text>
            {toast.message ? (
              <Text style={styles.message} numberOfLines={2}>
                {toast.message}
              </Text>
            ) : null}
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: config.accent,
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['100%', '0%'],
                  }),
                },
              ]}
            />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 99999,
  },
  wrap: {
    borderRadius: 18,
    backgroundColor: '#031726',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    elevation: 14,
    shadowColor: '#031726',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 18,
    overflow: 'hidden',
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    fontFamily: SERIF_FONT,
  },
  message: {
    fontSize: 12,
    color: 'rgba(226, 232, 240, 0.78)',
    lineHeight: 17,
    marginTop: 3,
    fontFamily: SERIF_FONT,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  progressBar: {
    height: 2.5,
  },
});
