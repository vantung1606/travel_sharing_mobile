import { PlaceItem } from '@/src/services/api';

export interface PlaceCategoryOption {
  /** Chuỗi đúng như lưu trong CSDL — backend lọc theo categoryName. */
  label: string;
  /** Nhãn ngắn dùng cho hàng chip trên đầu trang Khám phá. */
  short: string;
  icon: string;
}

/**
 * Danh mục THẬT của Wayfare (đúng chuỗi lưu trong CSDL). Trước đây thanh danh
 * mục dùng tên tự chế nên bấm vào là ra danh sách rỗng.
 */
export const PLACE_CATEGORIES: PlaceCategoryOption[] = [
  { label: 'Tất cả', short: 'Tất cả', icon: 'compass' },
  { label: 'Núi Rừng & Mây Ngàn', short: 'Núi rừng', icon: 'tree' },
  { label: 'Di Sản & Phố Cổ', short: 'Di sản', icon: 'university' },
  { label: 'Biển Đảo & Nghỉ Dưỡng', short: 'Biển đảo', icon: 'sun-o' },
  { label: 'Danh Lam & Thắng Cảnh', short: 'Thắng cảnh', icon: 'camera' },
  { label: 'Quán Cafe & Săn Mây', short: 'Cafe', icon: 'coffee' },
];

/** Các danh mục thật (bỏ "Tất cả") dùng trong sheet Bộ lọc. */
export const CATEGORY_FILTERS = PLACE_CATEGORIES.filter((item) => item.label !== 'Tất cả');

// Khoảng giá — GIỐNG HẾT web (ExploreFilterDrawer.budgetOptions): lọc client-side
// trên danh sách đã tải, dựa trên ticketPrice thật.
export const BUDGET_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả mức giá' },
  { value: 'under50k', label: 'Dưới 50k' },
  { value: '50k-200k', label: '50k – 200k' },
  { value: '200k-1m', label: '200k – 1tr' },
  { value: 'above1m', label: 'Trên 1tr' },
];

/** Giá tham chiếu (VND) của địa điểm — ưu tiên ticketPrice thật, đối chiếu web.parsePriceVND. */
export const parsePriceVND = (item: PlaceItem): number => {
  if (item.ticketPrice != null) {
    return Number(item.ticketPrice) || 0;
  }
  const text = String(item.priceLevel || '').replace(/\s/g, '');
  if (!text || /mi[nN] ph/i.test(text)) return 0;
  const numbers = (text.match(/[\d.,]+/g) || [])
    .map((n) => Number(n.replace(/[.,]/g, '')))
    .filter((n) => !Number.isNaN(n));
  return numbers.length ? Math.min(...numbers) : 0;
};

export const matchBudget = (priceVND: number, budget: string): boolean => {
  switch (budget) {
    case 'under50k':
      return priceVND < 50000;
    case '50k-200k':
      return priceVND >= 50000 && priceVND <= 200000;
    case '200k-1m':
      return priceVND > 200000 && priceVND <= 1000000;
    case 'above1m':
      return priceVND > 1000000;
    default:
      return true;
  }
};
