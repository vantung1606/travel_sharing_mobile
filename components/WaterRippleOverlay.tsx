import React, { useState, useRef, useCallback, ReactNode } from 'react';
import { View, StyleSheet, Animated, Easing, Platform } from 'react-native';

const RIPPLE_BASE_SIZE = 85;

interface DropletParticle {
  id: string;
  startX: number;
  startY: number;
  translateXAnim: Animated.Value;
  translateYAnim: Animated.Value;
  opacityAnim: Animated.Value;
  size: number;
}

interface OrganicWave {
  id: string;
  x: number;
  y: number;
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
  rotation: string;
  size: number;
  isEcho?: boolean;
}

interface WakeBubble {
  id: string;
  x: number;
  y: number;
  scaleAnim: Animated.Value;
  opacityAnim: Animated.Value;
  size: number;
}

interface WaterRippleOverlayProps {
  children: ReactNode;
}

/**
 * WaterRippleOverlay - Hiệu ứng nước động chân thực (Realistic Fluid & Water Touch)
 * - Sóng nước đa tầng có độ dập dềnh khúc xạ ánh sáng (Specular highlight & Refraction sheen)
 * - Giọt nước bắn tóe 3D (Splash Droplets) khi chạm ngón tay
 * - Vệt bọt nước rẽ sóng (Wake Bubbles) khi vuốt/lướt màn hình
 * - Sử dụng Responder Capture trả về false để KHÔNG BAO GIỜ chặn click, scroll hay phím bấm.
 * - 100% Native Driver GPU Acceleration (60–120fps).
 */
export function WaterRippleOverlay({ children }: WaterRippleOverlayProps) {
  const [waves, setWaves] = useState<OrganicWave[]>([]);
  const [droplets, setDroplets] = useState<DropletParticle[]>([]);
  const [wakes, setWakes] = useState<WakeBubble[]>([]);
  const lastMoveRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // 1. TẠO CÚ CHẠM NƯỚC (WATER IMPACT & SPLASH)
  const createWaterImpact = useCallback((x: number, y: number) => {
    const waveId = `${Date.now()}_${Math.random()}`;
    const scaleAnim = new Animated.Value(0.12);
    const opacityAnim = new Animated.Value(0.85);
    const randomRotation = `${Math.floor(Math.random() * 360)}deg`;

    const mainWave: OrganicWave = {
      id: waveId,
      x,
      y,
      scaleAnim,
      opacityAnim,
      rotation: randomRotation,
      size: RIPPLE_BASE_SIZE,
    };

    setWaves((prev) => [...prev.slice(-8), mainWave]);

    // Animate sóng chính
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 2.6,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 750,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setWaves((prev) => prev.filter((w) => w.id !== waveId));
    });

    // Sóng dội thứ hai (Echo wave) trễ 85ms
    setTimeout(() => {
      const echoId = `${waveId}_echo`;
      const echoScale = new Animated.Value(0.08);
      const echoOpacity = new Animated.Value(0.55);

      const echoWave: OrganicWave = {
        id: echoId,
        x,
        y,
        scaleAnim: echoScale,
        opacityAnim: echoOpacity,
        rotation: `${Math.floor(Math.random() * 360)}deg`,
        size: RIPPLE_BASE_SIZE * 0.78,
        isEcho: true,
      };

      setWaves((prev) => [...prev.slice(-8), echoWave]);

      Animated.parallel([
        Animated.timing(echoScale, {
          toValue: 2.2,
          duration: 680,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(echoOpacity, {
          toValue: 0,
          duration: 680,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setWaves((prev) => prev.filter((w) => w.id !== echoId));
      });
    }, 85);

    // Bắn ra 6-8 giọt nước li ti (Splash Droplets)
    const splashCount = 7;
    const newDroplets: DropletParticle[] = [];

    for (let i = 0; i < splashCount; i++) {
      const dId = `${waveId}_drop_${i}`;
      const angle = (Math.PI * 2 * i) / splashCount + (Math.random() - 0.5) * 0.5;
      const distance = 25 + Math.random() * 45;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance + 12; // hơi rớt xuống do trọng lực

      const transX = new Animated.Value(0);
      const transY = new Animated.Value(0);
      const opac = new Animated.Value(0.9);

      newDroplets.push({
        id: dId,
        startX: x,
        startY: y,
        translateXAnim: transX,
        translateYAnim: transY,
        opacityAnim: opac,
        size: 3.5 + Math.random() * 3,
      });

      Animated.parallel([
        Animated.timing(transX, {
          toValue: targetX,
          duration: 480 + Math.random() * 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(transY, {
          toValue: targetY,
          duration: 480 + Math.random() * 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opac, {
          toValue: 0,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setDroplets((prev) => prev.filter((d) => d.id !== dId));
      });
    }

    setDroplets((prev) => [...prev.slice(-14), ...newDroplets]);
  }, []);

  // 2. TẠO VỆT NƯỚC RẼ SÓNG KHI VUỐT (DRAG / SWIPE WAKE)
  const createWakeBubble = useCallback((x: number, y: number) => {
    const bId = `${Date.now()}_${Math.random()}`;
    const scaleAnim = new Animated.Value(0.2);
    const opacityAnim = new Animated.Value(0.65);
    const size = 18 + Math.random() * 14;

    const wake: WakeBubble = {
      id: bId,
      x,
      y,
      scaleAnim,
      opacityAnim,
      size,
    };

    setWakes((prev) => [...prev.slice(-10), wake]);

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.6,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setWakes((prev) => prev.filter((w) => w.id !== bId));
    });
  }, []);

  // 3. RESPONDER CAPTURE (Không bao giờ nuốt sự kiện)
  const handleStartCapture = useCallback(
    (evt: any) => {
      const { pageX, pageY } = evt.nativeEvent || {};
      if (pageX !== undefined && pageY !== undefined) {
        createWaterImpact(pageX, pageY);
      }
      return false; // KHÔNG nuốt sự kiện -> Click nút bấm hoạt động 100%
    },
    [createWaterImpact]
  );

  const handleMoveCapture = useCallback(
    (evt: any) => {
      const { pageX, pageY } = evt.nativeEvent || {};
      if (pageX !== undefined && pageY !== undefined) {
        const now = Date.now();
        const dx = pageX - lastMoveRef.current.x;
        const dy = pageY - lastMoveRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Throttle khi vuốt ngón tay: cách 30px và 70ms
        if (dist >= 30 && now - lastMoveRef.current.time >= 70) {
          lastMoveRef.current = { x: pageX, y: pageY, time: now };
          createWakeBubble(pageX, pageY);
        }
      }
      return false; // KHÔNG nuốt sự kiện -> Cuộn danh sách mượt mà 100%
    },
    [createWakeBubble]
  );

  return (
    <View
      style={styles.rootContainer}
      onStartShouldSetResponderCapture={handleStartCapture}
      onMoveShouldSetResponderCapture={handleMoveCapture}>
      {children}

      {/* Layer hiển thị sóng nước chân thực */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* A. SÓNG NƯỚC UỐN LƯỢN HỮU CƠ */}
        {waves.map((w) => {
          const halfSize = w.size / 2;
          return (
            <Animated.View
              key={w.id}
              style={[
                styles.organicWaveContainer,
                {
                  left: w.x - halfSize,
                  top: w.y - halfSize,
                  width: w.size,
                  height: w.size,
                  borderRadius: halfSize,
                  opacity: w.opacityAnim,
                  transform: [{ rotate: w.rotation }, { scale: w.scaleAnim }],
                },
              ]}
            >
              {/* Thân sóng nước với viền cong bất đối xứng */}
              <View
                style={[
                  styles.waveBody,
                  w.isEcho ? styles.waveBodyEcho : styles.waveBodyPrimary,
                  { borderRadius: halfSize },
                ]}
              />

              {/* Vệt sáng khúc xạ ánh sáng trên đỉnh sóng (Specular Shimmer) */}
              <View
                style={[
                  styles.specularShimmer,
                  {
                    borderTopLeftRadius: halfSize,
                    borderTopRightRadius: halfSize * 0.7,
                  },
                ]}
              />

              {/* Tâm phản quang giọt nước lõm (Caustic core) */}
              {!w.isEcho && (
                <View
                  style={[
                    styles.causticCore,
                    {
                      width: w.size * 0.32,
                      height: w.size * 0.32,
                      borderRadius: (w.size * 0.32) / 2,
                    },
                  ]}
                />
              )}
            </Animated.View>
          );
        })}

        {/* B. VỆT BỌT NƯỚC RẼ SÓNG KHI VUỐT (WAKE BUBBLES) */}
        {wakes.map((wk) => {
          const half = wk.size / 2;
          return (
            <Animated.View
              key={wk.id}
              style={[
                styles.wakeBubble,
                {
                  left: wk.x - half,
                  top: wk.y - half,
                  width: wk.size,
                  height: wk.size,
                  borderRadius: half,
                  opacity: wk.opacityAnim,
                  transform: [{ scale: wk.scaleAnim }],
                },
              ]}
            />
          );
        })}

        {/* C. CÁC GIỌT NƯỚC BẮN TÓE 3D (SPLASH DROPLETS) */}
        {droplets.map((d) => (
          <Animated.View
            key={d.id}
            style={[
              styles.splashDroplet,
              {
                left: d.startX - d.size / 2,
                top: d.startY - d.size / 2,
                width: d.size,
                height: d.size,
                borderRadius: d.size / 2,
                opacity: d.opacityAnim,
                transform: [
                  { translateX: d.translateXAnim },
                  { translateY: d.translateYAnim },
                ],
              },
            ]}
          >
            {/* Điểm phản quang 3D của giọt nước */}
            <View style={styles.dropletGlint} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },

  // Sóng nước đa tầng
  organicWaveContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveBody: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2.2,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 4,
  },
  waveBodyPrimary: {
    borderColor: '#0284C7',
  },
  waveBodyEcho: {
    borderColor: '#38BDF8',
    borderWidth: 1.6,
    backgroundColor: 'transparent',
  },

  // Vệt khúc xạ ánh sáng trắng trên gờ sóng
  specularShimmer: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: '45%',
    borderTopWidth: 2,
    borderLeftWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    opacity: 0.95,
  },

  // Tâm phát sáng khúc xạ của giọt nước
  causticCore: {
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.6)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 3,
  },

  // Vệt bọt sóng khi vuốt ngón tay
  wakeBubble: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(224, 242, 254, 0.25)',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },

  // Giọt nước bắn tóe 3D
  splashDroplet: {
    position: 'absolute',
    backgroundColor: '#0284C7',
    borderWidth: 1,
    borderColor: '#38BDF8',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 2,
  },
  dropletGlint: {
    position: 'absolute',
    top: 1,
    left: 1,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default WaterRippleOverlay;
