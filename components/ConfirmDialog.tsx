import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text } from '@/components/Themed';
import { SERIF_FONT } from '@/constants/Typography';
import { WF_COLORS } from '@/constants/Colors';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export type ConfirmAccent = 'danger' | 'primary' | 'amber' | 'violet' | 'slate';

export interface ConfirmOptions {
  /** Tiêu đề hộp thoại (ngắn, thường là câu hỏi). */
  title: string;
  /** Nội dung giải thích thêm (không bắt buộc). */
  message?: string;
  /** Nhãn nút xác nhận. Mặc định: "Đồng ý". */
  confirmText?: string;
  /** Nhãn nút huỷ. Mặc định: "Hủy". */
  cancelText?: string;
  /** Hành động nguy hiểm (xoá, đăng xuất...) - nút xác nhận chuyển màu đỏ. */
  destructive?: boolean;
  /** Ghi đè icon FontAwesome hiển thị trên huy hiệu. */
  icon?: string;
  /** Bảng màu của huy hiệu. Mặc định suy ra từ `destructive`. */
  accent?: ConfirmAccent;
  /** Cho phép chạm nền tối để huỷ. Mặc định true. */
  dismissible?: boolean;
}

type ConfirmRequest = ConfirmOptions & {
  id: number;
  resolve: (confirmed: boolean) => void;
};

type ConfirmListener = (request: ConfirmRequest) => void;

let confirmAutoId = 0;

// Ngăn xếp các host đang gắn trong cây component. Chỉ host nằm TRÊN CÙNG hiển
// thị hộp thoại, nhờ vậy hộp xác nhận gọi từ bên trong một modal luôn hiện đúng
// trên modal đó (xem thêm ghi chú trong Toast.tsx).
let hostStack: ConfirmListener[] = [];
const hostWatchers = new Set<() => void>();

function notifyHostWatchers(): void {
  hostWatchers.forEach((watcher) => {
    try {
      watcher();
    } catch (e) {
      console.warn('Error syncing confirm host', e);
    }
  });
}

/**
 * Mở hộp thoại xác nhận của Wayfare và chờ người dùng lựa chọn.
 *
 * ```ts
 * const ok = await confirmDialog({
 *   title: 'Xoá lịch trình',
 *   message: 'Hành động không thể hoàn tác.',
 *   destructive: true,
 *   confirmText: 'Xoá',
 * });
 * if (!ok) return;
 * ```
 *
 * Chạy được cả trên web lẫn thiết bị thật (khác với Alert của React Native,
 * vốn không được cài đặt trên react-native-web).
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const target = hostStack[hostStack.length - 1];
    if (!target) {
      // Không có host nào được gắn: mở khoá an toàn, không treo luồng gọi.
      console.warn('confirmDialog: chưa gắn <ConfirmHost /> nào trong cây component.');
      resolve(false);
      return;
    }
    target({ ...options, id: ++confirmAutoId, resolve });
  });
}

const ACCENTS: Record<ConfirmAccent, { tint: string; color: string }> = {
  danger: { tint: WF_COLORS.roseLight, color: WF_COLORS.rose },
  primary: { tint: WF_COLORS.primaryLight, color: WF_COLORS.primary },
  amber: { tint: WF_COLORS.amberLight, color: WF_COLORS.amber },
  violet: { tint: WF_COLORS.violetLight, color: WF_COLORS.violet },
  slate: { tint: WF_COLORS.slate100, color: WF_COLORS.slate700 },
};

/**
 * Nơi neo của hộp thoại xác nhận. Gắn ở app/_layout.tsx cho toàn app, và gắn
 * thêm bên trong các native Modal (Chat, Thông báo, Lịch trình, Bài viết) để
 * hộp thoại phủ được lên chính modal đang mở.
 */
export function ConfirmHost({ enabled = true }: { enabled?: boolean }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [rendering, setRendering] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;

  const pendingRef = useRef<ConfirmRequest | null>(null);
  pendingRef.current = request;

  const settle = useCallback((confirmed: boolean, then?: () => void) => {
    const current = pendingRef.current;
    pendingRef.current = null;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(cardScale, {
        toValue: 0.96,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      setRequest(null);
      setRendering(false);
      current?.resolve(confirmed);
      then?.();
    });
  }, [backdropOpacity, cardOpacity, cardScale]);

  useEffect(() => {
    if (!enabled) return;

    const listener: ConfirmListener = (incoming) => {
      // Nếu đang có hộp thoại chờ mà bị yêu cầu mới chèn lên, huỷ cái cũ.
      const previous = pendingRef.current;
      if (previous) {
        pendingRef.current = null;
        previous.resolve(false);
      }
      pendingRef.current = incoming;
      setRequest(incoming);
      setRendering(true);
    };

    const syncActive = () => setIsActive(hostStack[hostStack.length - 1] === listener);
    hostWatchers.add(syncActive);
    hostStack.push(listener);
    notifyHostWatchers();

    return () => {
      hostWatchers.delete(syncActive);
      hostStack = hostStack.filter((item) => item !== listener);
      // Host bị gỡ khi vẫn còn hộp thoại đang chờ (ví dụ người dùng bấm nút
      // back của Android để đóng modal): mở khoá promise để luồng gọi không treo.
      const orphan = pendingRef.current;
      if (orphan) {
        pendingRef.current = null;
        orphan.resolve(false);
      }
      notifyHostWatchers();
    };
  }, [enabled]);

  // Host bị lớp khác phủ lên thì nhường quyền hiển thị và huỷ hộp thoại đang chờ.
  useEffect(() => {
    if (isActive) return;
    const previous = pendingRef.current;
    if (previous) {
      pendingRef.current = null;
      previous.resolve(false);
    }
    setRequest(null);
    setRendering(false);
  }, [isActive]);

  // Trên Android, nút back đóng hộp xác nhận thay vì đóng màn hình bên dưới.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!isActive || !request) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (request.dismissible ?? true) settle(false);
      return true;
    });
    return () => subscription.remove();
  }, [isActive, request, settle]);

  useEffect(() => {
    if (!rendering || !request) return;

    backdropOpacity.setValue(0);
    cardOpacity.setValue(0);
    cardScale.setValue(0.94);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        damping: 17,
        stiffness: 190,
        mass: 0.8,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [rendering, request, backdropOpacity, cardOpacity, cardScale]);

  if (!isActive || !rendering || !request) return null;

  const destructive = request.destructive ?? false;
  const accentKey: ConfirmAccent = request.accent ?? (destructive ? 'danger' : 'primary');
  const accent = ACCENTS[accentKey];
  const iconName = request.icon || (destructive ? 'trash' : 'question');
  const dismissible = request.dismissible ?? true;
  const confirmText = request.confirmText || 'Đồng ý';
  const cancelText = request.cancelText || 'Hủy';

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          accessible={false}
          onPress={() => {
            if (dismissible) settle(false);
          }}
        />
      </Animated.View>

      <Animated.View
        style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}
        accessibilityViewIsModal
        accessibilityRole="alert"
        accessibilityLabel={`${request.title}${request.message ? `. ${request.message}` : ''}`}>
        <View style={[styles.iconBadge, { backgroundColor: accent.tint }]}>
          <FontAwesome name={iconName as any} size={21} color={accent.color} />
        </View>

        <Text style={styles.title}>{request.title}</Text>
        {request.message ? <Text style={styles.message}>{request.message}</Text> : null}

        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.button, styles.cancelButton]}
            onPress={() => settle(false)}>
            <Text style={styles.cancelText}>{cancelText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.button,
              styles.confirmButton,
              { backgroundColor: destructive ? WF_COLORS.rose : accent.color },
            ]}
            onPress={() => settle(true)}>
            <Text style={styles.confirmText}>{confirmText}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99998,
    elevation: 99998,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 23, 38, 0.55)',
  },
  backdropTouch: {
    flex: 1,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    elevation: 18,
    shadowColor: '#031726',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 26,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    textAlign: 'center',
    letterSpacing: 0.2,
    fontFamily: SERIF_FONT,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    color: WF_COLORS.slate600,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: SERIF_FONT,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 22,
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    marginRight: 10,
  },
  confirmButton: {
    elevation: 2,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '800',
    color: WF_COLORS.slate700,
    fontFamily: SERIF_FONT,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: SERIF_FONT,
  },
});
