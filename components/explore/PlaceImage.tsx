import React, { useEffect, useRef, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

import { PlaceItem } from '@/src/services/api';
import { pickFallbackImage, resolvePlaceImage } from '@/src/utils/placeImages';

interface PlaceImageProps {
  place: PlaceItem | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch';
}

/**
 * Ảnh địa điểm có tự chữa lỗi: nếu URL hỏng/không tải được thì tự đổi sang một
 * ảnh thật khác, nên lưới địa điểm không bao giờ có ô trắng.
 */
export function PlaceImage({ place, style, resizeMode = 'cover' }: PlaceImageProps) {
  const [uri, setUri] = useState<string>(() => resolvePlaceImage(place));
  const triedFallback = useRef(false);

  useEffect(() => {
    setUri(resolvePlaceImage(place));
    triedFallback.current = false;
  }, [place?.id, place?.coverImage]);

  const handleError = () => {
    if (!place || triedFallback.current) return;
    triedFallback.current = true;
    const fallback = pickFallbackImage(place.id);
    setUri((current) => (current === fallback ? current : fallback));
  };

  return <Image source={{ uri }} style={style} resizeMode={resizeMode} onError={handleError} />;
}
