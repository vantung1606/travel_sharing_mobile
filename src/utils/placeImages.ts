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
 * 1. Đọc cả coverImage, coverImageUrl hoặc ảnh đầu tiên trong images.
 * 2. Tự động chuyển qua ảnh đẹp trong PLACE_IMAGE_POOL nếu ảnh gốc là ảnh placeholder chung 464 lần,
 *    hoặc ảnh uploads cũ trả về 404, hoặc ảnh Wikimedia gây lỗi chuyển hướng mạng trên Android.
 */
export function resolvePlaceImage(
  place?: { id: number; coverImage?: string | null; coverImageUrl?: string | null; images?: string[] } | null
): string {
  if (!place) return SHARED_PLACEHOLDER_IMAGE;

  const raw = place.coverImage || place.coverImageUrl || place.images?.[0];
  const own = fixImageUrl(raw);

  if (
    own &&
    own !== SHARED_PLACEHOLDER_IMAGE &&
    !own.includes('/uploads/posts/') &&
    !own.includes('commons.wikimedia.org')
  ) {
    return own;
  }

  return pickFallbackImage(place.id);
}
