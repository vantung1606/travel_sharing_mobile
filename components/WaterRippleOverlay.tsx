import React, { useState, useRef, useCallback, ReactNode } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';

const RIPPLE_SIZE = 90;

interface RippleItem {
  id: string;
  x: number;
  y: number;
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
  color: string;
  sizeMultiplier: number;
}

interface WaterRippleOverlayProps {
  children: ReactNode;
}

/**
 * WaterRippleOverlay - Hiệu ứng nước động khi chạm (tap) hoặc lướt (drag) trên Mobile
 * - Sử dụng onStartShouldSetResponderCapture / onMoveShouldSetResponderCapture trả về false
 *   để bắt tọa độ mà KHÔNG can thiệp, KHÔNG chặn bất kỳ nút bấm, scroll hay thao tác nào.
 * - Animation chạy trên Native Driver (GPU) đạt chuẩn 60-120fps mượt mà.
 */
export function WaterRippleOverlay({ children }: WaterRippleOverlayProps) {
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const lastMoveRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  const addRipple = useCallback((x: number, y: number, isMove = false) => {
    const id = `${Date.now()}_${Math.random()}`;
    const scaleAnim = new Animated.Value(0.15);
    const opacityAnim = new Animated.Value(isMove ? 0.35 : 0.65);

    const newRipple: RippleItem = {
      id,
      x,
      y,
      scaleAnim,
      opacityAnim,
      color: isMove ? '#38BDF8' : '#0284C7',
      sizeMultiplier: isMove ? 0.8 : 1.4,
    };

    setRipples((prev) => {
      // Giữ tối đa 12 gợn sóng đồng thời để bảo vệ bộ nhớ và hiệu năng
      const next = prev.length > 12 ? prev.slice(prev.length - 8) : prev;
      return [...next, newRipple];
    });

    // Chạy song song Scale và Fade-out trên Native Driver
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: isMove ? 1.4 : 2.5,
        duration: isMove ? 450 : 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: isMove ? 450 : 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Dọn dẹp ripple sau khi hoàn thành
      setRipples((prev) => prev.filter((r) => r.id !== id));
    });

    // Nếu là cú chạm (Click/Tap), kích hoạt thêm vòng sóng thứ 2 (Echo wave) trễ 80ms
    if (!isMove) {
      setTimeout(() => {
        const echoId = `${id}_echo`;
        const echoScaleAnim = new Animated.Value(0.1);
        const echoOpacityAnim = new Animated.Value(0.45);

        const echoRipple: RippleItem = {
          id: echoId,
          x,
          y,
          scaleAnim: echoScaleAnim,
          opacityAnim: echoOpacityAnim,
          color: '#0EA5E9',
          sizeMultiplier: 1.1,
        };

        setRipples((prev) => [...prev, echoRipple]);

        Animated.parallel([
          Animated.timing(echoScaleAnim, {
            toValue: 2.1,
            duration: 650,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(echoOpacityAnim, {
            toValue: 0,
            duration: 650,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setRipples((prev) => prev.filter((r) => r.id !== echoId));
        });
      }, 90);
    }
  }, []);

  const handleStartCapture = useCallback(
    (evt: any) => {
      const { pageX, pageY } = evt.nativeEvent || {};
      if (pageX !== undefined && pageY !== undefined) {
        addRipple(pageX, pageY, false);
      }
      return false; // KHÔNG nuốt responder -> sự kiện chuyển tiếp đến Button/Input/Link bên dưới
    },
    [addRipple]
  );

  const handleMoveCapture = useCallback(
    (evt: any) => {
      const { pageX, pageY } = evt.nativeEvent || {};
      if (pageX !== undefined && pageY !== undefined) {
        const now = Date.now();
        const dx = pageX - lastMoveRef.current.x;
        const dy = pageY - lastMoveRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Throttle di chuyển: tối thiểu 35px và cách 90ms
        if (dist >= 35 && now - lastMoveRef.current.time >= 90) {
          lastMoveRef.current = { x: pageX, y: pageY, time: now };
          addRipple(pageX, pageY, true);
        }
      }
      return false; // KHÔNG nuốt responder -> cuộn ScrollView / FlatList mượt mà
    },
    [addRipple]
  );

  return (
    <View
      style={styles.rootContainer}
      onStartShouldSetResponderCapture={handleStartCapture}
      onMoveShouldSetResponderCapture={handleMoveCapture}>
      {children}

      {/* Layer hiển thị sóng nước - nằm đè lên trên và pointerEvents="none" */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {ripples.map((ripple) => {
          const halfSize = (RIPPLE_SIZE * ripple.sizeMultiplier) / 2;
          return (
            <Animated.View
              key={ripple.id}
              style={[
                styles.rippleRing,
                {
                  left: ripple.x - halfSize,
                  top: ripple.y - halfSize,
                  width: RIPPLE_SIZE * ripple.sizeMultiplier,
                  height: RIPPLE_SIZE * ripple.sizeMultiplier,
                  borderRadius: halfSize,
                  borderColor: ripple.color,
                  opacity: ripple.opacityAnim,
                  transform: [{ scale: ripple.scaleAnim }],
                },
              ]}
            >
              {/* Vòng sáng khúc xạ nước bên trong (Refraction inner shimmer) */}
              <View
                style={[
                  styles.innerShimmerRing,
                  {
                    borderRadius: halfSize - 3,
                  },
                ]}
              />
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  rippleRing: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  innerShimmerRing: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
});

export default WaterRippleOverlay;
