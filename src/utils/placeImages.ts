import { PLACE_IMAGE_POOL, SHARED_PLACEHOLDER_IMAGE } from '@/src/utils/placeImagePool';

/**
 * Nhiều URL ảnh trong CSDL bị lỗi mã hoá: dấu '%' bị ghi thành '\%'
 * (ví dụ ".../Hoang\%20Lien.jpg") khiến ảnh trả về 404.
 * Sửa ngay trên app nên ảnh hiện được mà không cần đụng tới CSDL.
 */
export function fixImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\\%/g, '%');
}

/**
 * Băm id thành chỉ số ổn định (Knuth multiplicative hashing) để hai địa điểm
 * nằm liền nhau không bao giờ rơi vào cùng một ảnh.
 */
function poolIndex(id: number, length: number): number {
  const mixed = Math.imul(id, 2654435761) >>> 0;
  return mixed % length;
}

/** Ảnh thật dự phòng ổn định cho một id (dùng khi ảnh gốc lỗi/trùng). */
export function pickFallbackImage(id: number): string {
  if (PLACE_IMAGE_POOL.length === 0) return SHARED_PLACEHOLDER_IMAGE;
  return PLACE_IMAGE_POOL[poolIndex(id, PLACE_IMAGE_POOL.length)];
}

/**
 * Chọn ảnh hiển thị cho một địa điểm:
 * 1. Ưu tiên ảnh riêng của địa điểm (sau khi sửa lỗi mã hoá '%').
 * 2. 464 địa điểm trong CSDL đang dùng CHUNG một ảnh Unsplash -> thay bằng một
 *    ảnh thật khác (lấy từ kho ảnh thật của Wayfare) để lưới không lặp một ảnh.
 */
export function resolvePlaceImage(
  place?: { id: number; coverImage?: string | null } | null
): string {
  if (!place) return SHARED_PLACEHOLDER_IMAGE;

  const own = fixImageUrl(place.coverImage);
  if (own && own !== SHARED_PLACEHOLDER_IMAGE) return own;

  return pickFallbackImage(place.id);
}
