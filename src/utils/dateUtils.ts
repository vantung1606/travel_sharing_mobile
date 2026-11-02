/**
 * Tiện ích chuẩn hóa múi giờ Việt Nam (UTC+7 / Asia/Ho_Chi_Minh) cho Wayfare Mobile App.
 * Đảm bảo đồng bộ với Web Frontend: định dạng 24 giờ, không cần giây, tính timeAgo chính xác.
 */

export const parseVietnamDate = (dateValue?: string | number | Date | null): Date | null => {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }

  if (typeof dateValue === 'number') {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof dateValue === 'string') {
    const str = dateValue.trim();
    if (!str) return null;

    // Pattern "HH:mm - DD/MM/YYYY" hoặc "HH:mm DD/MM/YYYY"
    const ddmmyyyyMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*[-/ ]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (ddmmyyyyMatch) {
      const [, h, min, sec, d, m, y] = ddmmyyyyMatch;
      const parsed = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(sec || 0));
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Nếu chuỗi đã có chỉ định múi giờ rõ ràng (Z hoặc +07:00, -05:00)
    if (str.endsWith('Z') || /[+-]\d{2}(:?\d{2})?$/.test(str)) {
      const parsed = new Date(str);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    // Nếu là chuỗi ISO "YYYY-MM-DDTHH:mm:ss" không có múi giờ (từ server Cloud chạy UTC)
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(str)) {
      const normalizedIso = str.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1');
      const now = Date.now();
      const asUtc = new Date(normalizedIso + 'Z');
      const asLocal = new Date(normalizedIso);

      if (!isNaN(asUtc.getTime()) && !isNaN(asLocal.getTime())) {
        const diffUtc = now - asUtc.getTime();
        const diffLocal = now - asLocal.getTime();

        // Nếu parse theo UTC cho mốc thời gian trong tương lai (> 2 phút), chứng tỏ chuỗi đã là giờ local
        if (diffUtc < -120000) {
          return asLocal;
        }

        // Nếu parse theo local bị lệch hơn 6 tiếng (do server UTC bị chậm 7 tiếng so với giờ VN),
        // trong khi parse theo UTC rơi vào khoảng hợp lý
        if (diffLocal >= 6 * 3600 * 1000 && diffUtc >= -60000 && diffUtc < diffLocal) {
          return asUtc;
        }

        return asUtc;
      }
    }

    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
};

/**
 * Định dạng ngày giờ 24h chuẩn Việt Nam (không cần giây): "HH:mm DD/MM/YYYY"
 */
export const formatVietnam24h = (dateValue?: string | number | Date | null, fallback = '—'): string => {
  const d = parseVietnamDate(dateValue);
  if (!d) return fallback;

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${hh}:${mm} ${day}/${month}/${year}`;
};

/**
 * Định dạng chỉ ngày: "DD/MM/YYYY"
 */
export const formatVietnamDateOnly = (dateValue?: string | number | Date | null, fallback = '—'): string => {
  const d = parseVietnamDate(dateValue);
  if (!d) return fallback;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Định dạng giờ phút 24h: "HH:mm" (dùng cho chat bubbles, badge)
 */
export const formatVietnamClock = (dateValue?: string | number | Date | null, fallback = ''): string => {
  const d = parseVietnamDate(dateValue);
  if (!d) return fallback;

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');

  return `${hh}:${mm}`;
};

/**
 * Định dạng thời gian tương đối thân thiện:
 * "Vừa xong", "X phút trước", "X giờ trước", "Hôm qua", "X ngày trước"
 */
export const formatVietnamRelativeTime = (dateValue?: string | number | Date | null, fallback = 'Vừa xong'): string => {
  const d = parseVietnamDate(dateValue);
  if (!d) return fallback;

  const diffSeconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSeconds < 60) return 'Vừa xong';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} phút trước`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} giờ trước`;
  if (diffSeconds < 86400 * 2) return 'Hôm qua';
  if (diffSeconds < 86400 * 7) return `${Math.floor(diffSeconds / 86400)} ngày trước`;

  return formatVietnamDateOnly(d);
};
