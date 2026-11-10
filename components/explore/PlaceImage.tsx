import React, { useEffect, useRef, useState } from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { PlaceItem } from '@/src/services/api';
import { pickFallbackImage, resolvePlaceImage } from '@/src/utils/placeImages';

interface PlaceImageProps {
  place: PlaceItem | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch';
}

const GRADIENT_PALETTES = [
  ['#FFE8DC', '#FFD8C2'], // Warm Peach Sunset
  ['#E0F2FE', '#BAE6FD'], // Ocean Breeze
  ['#D1FAE5', '#A7F3D0'], // Tropical Mint
  ['#EDE9FE', '#DDD6FE'], // Twilight Lavender
  ['#FEF3C7', '#FDE68A'], // Golden Sun
];

/**
 * Ảnh địa điểm thông minh với nền Gradient nghệ thuật cao cấp.
 * Không bao giờ bị ô trắng xám rỗng tuếch kể cả khi mạng chậm hoặc ảnh lỗi.
 */
export function PlaceImage({ place, style, resizeMode = 'cover' }: PlaceImageProps) {
  const [uri, setUri] = useState<string>(() => resolvePlaceImage(place));
  const [hasError, setHasError] = useState(false);
  const triedFallback = useRef(false);

  useEffect(() => {
    setUri(resolvePlaceImage(place));
    setHasError(false);
    triedFallback.current = false;
  }, [place?.id, place?.coverImage, (place as any)?.coverImageUrl]);

  const handleError = () => {
    if (!triedFallback.current && place) {
      triedFallback.current = true;
      const fallback = pickFallbackImage(place.id);
      if (fallback !== uri) {
        setUri(fallback);
        return;
      }
    }
    setHasError(true);
  };

  const paletteIndex = place?.id ? Math.abs(place.id) % GRADIENT_PALETTES.length : 0;
  const colors = GRADIENT_PALETTES[paletteIndex] as [string, string];

  return (
    <View style={[styles.container, style]}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill}>
        <View style={styles.placeholderCenter}>
          <FontAwesome name="compass" size={24} color="rgba(255, 87, 34, 0.35)" />
        </View>
      </LinearGradient>
      {!hasError && (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, style]}
          resizeMode={resizeMode}
          onError={handleError}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FFF3E0',
  },
  placeholderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
