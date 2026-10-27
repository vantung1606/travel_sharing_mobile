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
