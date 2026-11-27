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

// Vùng miền du lịch — GIỐNG HẾT web (ExplorePage.jsx)
export const EXPLORE_REGIONS = ['Tất cả', 'Miền Bắc', 'Miền Trung', 'Miền Nam', 'Tây Nguyên'] as const;

export const getRegionByCity = (cityName = ''): string => {
  const c = String(cityName).toLowerCase().trim();
  if (!c) return 'Khác';

  if (
    c.includes('hà nội') || c.includes('hải phòng') || c.includes('quảng ninh') ||
    c.includes('hạ long') || c.includes('ninh bình') || c.includes('hà giang') ||
    c.includes('lào cai') || c.includes('sa pa') || c.includes('sapa') ||
    c.includes('cao bằng') || c.includes('lạng sơn') || c.includes('bắc kạn') ||
    c.includes('tuyên quang') || c.includes('thái nguyên') || c.includes('phú thọ') ||
    c.includes('bắc giang') || c.includes('bắc ninh') || c.includes('hải dương') ||
    c.includes('hưng yên') || c.includes('hà nam') || c.includes('nam định') ||
    c.includes('thái bình') || c.includes('vĩnh phúc') || c.includes('sơn la') ||
    c.includes('mộc châu') || c.includes('hòa bình') || c.includes('điện biên') ||
    c.includes('lai châu') || c.includes('yên bái')
  ) {
    return 'Miền Bắc';
  }

  if (
    c.includes('đà lạt') || c.includes('lâm đồng') || c.includes('đắk lắk') ||
    c.includes('dak lak') || c.includes('buôn ma thuột') || c.includes('gia lai') ||
    c.includes('pleiku') || c.includes('kon tum') || c.includes('măng đen') ||
    c.includes('đắk nông') || c.includes('bảo lộc')
  ) {
    return 'Tây Nguyên';
  }

  if (
    c.includes('thanh hóa') || c.includes('sầm sơn') || c.includes('nghệ an') ||
    c.includes('hà tĩnh') || c.includes('quảng bình') || c.includes('phong nha') ||
    c.includes('quảng trị') || c.includes('thừa thiên') || c.includes('huế') ||
    c.includes('đà nẵng') || c.includes('quảng nam') || c.includes('hội an') ||
    c.includes('quảng ngãi') || c.includes('bình định') || c.includes('quy nhơn') ||
    c.includes('phú yên') || c.includes('tuy hòa') || c.includes('khánh hòa') ||
    c.includes('nha trang') || c.includes('ninh thuận') || c.includes('phan rang') ||
    c.includes('bình thuận') || c.includes('phan thiết') || c.includes('mũi né')
  ) {
    return 'Miền Trung';
  }

  if (
    c.includes('hồ chí minh') || c.includes('sài gòn') || c.includes('tphcm') ||
    c.includes('bà rịa') || c.includes('vũng tàu') || c.includes('bình dương') ||
    c.includes('bình phước') || c.includes('đồng nai') || c.includes('tây ninh') ||
    c.includes('an giang') || c.includes('bạc liêu') || c.includes('bến tre') ||
    c.includes('cà mau') || c.includes('cần thơ') || c.includes('đồng tháp') ||
    c.includes('hậu giang') || c.includes('kiên giang') || c.includes('phú quốc') ||
    c.includes('long an') || c.includes('sóc trăng') || c.includes('tiền giang') ||
    c.includes('trà vinh') || c.includes('vĩnh long')
  ) {
    return 'Miền Nam';
  }

  return 'Miền Trung';
};

// Khoảng giá — GIỐNG HẾT web (ExploreFilterDrawer.budgetOptions): lọc client-side
// trên danh sách đã tải, dựa trên ticketPrice thật.
export const BUDGET_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả mức giá' },
  { value: 'under50k', label: 'Dưới 50.000đ (Bình dân / Quán nước)' },
  { value: '50k-200k', label: '50.000đ - 200.000đ (Cafe view, Quán ăn)' },
  { value: '200k-1m', label: '200.000đ - 1.000.000đ (Nhà hàng, Tour)' },
  { value: 'above1m', label: 'Trên 1.000.000đ (Homestay, Khách sạn)' },
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
