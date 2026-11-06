import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface FeedVideoPlayerProps {
  videoUrl: string;
  isPlaying: boolean;
  style?: any;
}

/**
 * Trình phát video tự động chuẩn TikTok/Instagram cho feed du ký:
 * - Khi bài viết trượt vào giữa màn hình (in viewport): Tự động phát mượt mà.
 * - Khi người dùng lướt qua: Tự động tạm dừng ngay lập tức để tiết kiệm băng thông & pin.
 * - Mặc định tắt tiếng (muted: true) để tránh ồn, có nút Loa nhỏ để người dùng bật tiếng tùy thích.
 */
export function FeedVideoPlayer({ videoUrl, isPlaying, style }: FeedVideoPlayerProps) {
  const [isMuted, setIsMuted] = useState(true);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
    if (isPlaying) {
      p.play();
    }
  });

  useEffect(() => {
    if (!player) return;
    try {
      player.muted = isMuted;
    } catch {
      // Ignore
    }
  }, [isMuted, player]);

  useEffect(() => {
    if (!player) return;
    try {
      if (isPlaying) {
        player.play();
      } else {
        player.pause();
      }
    } catch {
      // Ignore
    }
  }, [isPlaying, player]);

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Nút bật/tắt âm thanh (Mute / Unmute) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setIsMuted((m) => !m)}
        style={styles.soundBtn}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? 'Bật âm thanh video' : 'Tắt âm thanh video'}>
        <FontAwesome
          name={isMuted ? 'volume-off' : 'volume-up'}
          size={14}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  soundBtn: {
    position: 'absolute',
    top: 56,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
});
