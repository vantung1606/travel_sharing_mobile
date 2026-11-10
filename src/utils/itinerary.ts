const DAY_MS = 24 * 60 * 60 * 1000;

type ItineraryDaySource = {
  startDate?: string;
  endDate?: string;
  daysCount?: number;
  details?: { dayNumber?: number }[];
  days?: { dayNumber?: number }[];
};

function parseDateOnly(value?: string): number | null {
  if (!value) return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (dateOnly) {
    return Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * Số ngày của lịch trình, ưu tiên khoảng ngày thực tế (tính cả ngày đi và về).
 * `daysCount` từ API chỉ dùng khi lịch trình chưa có đủ ngày bắt đầu/kết thúc.
 */
export function getItineraryDayCount(itinerary?: ItineraryDaySource | null): number {
  if (!itinerary) return 1;

  let dayCount = 0;
  const start = parseDateOnly(itinerary.startDate);
  const end = parseDateOnly(itinerary.endDate);

  if (start !== null && end !== null) {
    const rangeDays = Math.round((end - start) / DAY_MS) + 1;
    if (rangeDays > 0 && rangeDays <= 365) {
      dayCount = rangeDays;
    }
  }

  if (!dayCount && itinerary.daysCount && itinerary.daysCount > 0) {
    dayCount = Math.round(itinerary.daysCount);
  }

  const detailDays = [
    ...(itinerary.details || []),
    ...(itinerary.days || []),
  ].reduce((max, item) => Math.max(max, Number(item?.dayNumber) || 1), 0);

  return Math.max(1, dayCount, detailDays);
}

export function formatItineraryDuration(dayCount: number): string {
  const days = Math.max(1, Math.round(dayCount));
  return `${days}N${Math.max(1, days - 1)}Đ`;
}

export type ItineraryComputedStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface ItineraryStatusInfo {
  statusKey: ItineraryComputedStatus;
  label: string;
  color: string;
  bg: string;
  borderColor: string;
}

/**
 * Tính toán trạng thái lịch trình động theo ngày thực tế:
 * - Đã hủy nếu status === 'cancelled'
 * - Đã xong nếu ngày kết thúc đã qua (hoặc status === 'completed')
 * - Đang diễn ra nếu hôm nay nằm trong khoảng ngày đi và ngày về
 * - Sắp tới nếu ngày đi ở tương lai
 */
export function computeItineraryStatus(itin?: {
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
} | null): ItineraryStatusInfo {
  if (!itin) {
    return {
      statusKey: 'upcoming',
      label: 'Sắp tới',
      color: '#059669',
      bg: '#ECFDF5',
      borderColor: '#A7F3D0',
    };
  }

  const rawStatus = (itin.status || '').toLowerCase().trim();

  // 1. Trạng thái Đã hủy
  if (rawStatus === 'cancelled' || rawStatus === 'canceled') {
    return {
      statusKey: 'cancelled',
      label: 'Đã hủy',
      color: '#EF4444',
      bg: '#FEF2F2',
      borderColor: '#FECACA',
    };
  }

  // 2. Trạng thái Đã xong được đánh dấu trong CSDL
  if (rawStatus === 'completed' || rawStatus === 'finished') {
    return {
      statusKey: 'completed',
      label: 'Đã xong',
      color: '#64748B',
      bg: '#F1F5F9',
      borderColor: '#E2E8F0',
    };
  }

  // 3. Tính toán tự động theo thời gian thực (Real-time Temporal Status)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let startMs: number | null = null;
  let endMs: number | null = null;

  if (itin.startDate) {
    const s = new Date(itin.startDate);
    if (!isNaN(s.getTime())) {
      startMs = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
    }
  }

  if (itin.endDate) {
    const e = new Date(itin.endDate);
    if (!isNaN(e.getTime())) {
      endMs = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999).getTime();
    }
  }

  // Đã qua ngày kết thúc -> Tự động chuyển thành "Đã xong"
  if (endMs !== null && today > endMs) {
    return {
      statusKey: 'completed',
      label: 'Đã xong',
      color: '#64748B',
      bg: '#F1F5F9',
      borderColor: '#E2E8F0',
    };
  }

  // Chuyến đi đang diễn ra (hôm nay nằm giữa ngày đi và ngày về)
  if (startMs !== null) {
    if (today >= startMs && (endMs === null || today <= endMs)) {
      return {
        statusKey: 'ongoing',
        label: 'Đang diễn ra',
        color: '#2563EB',
        bg: '#EFF6FF',
        borderColor: '#BFDBFE',
      };
    }

    // Chuyến đi tương lai
    if (today < startMs) {
      return {
        statusKey: 'upcoming',
        label: 'Sắp tới',
        color: '#059669',
        bg: '#ECFDF5',
        borderColor: '#A7F3D0',
      };
    }
  }

  // Fallback mặc định
  return {
    statusKey: 'upcoming',
    label: 'Sắp tới',
    color: '#059669',
    bg: '#ECFDF5',
    borderColor: '#A7F3D0',
  };
}
