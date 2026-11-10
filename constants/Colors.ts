// Wayfare Modern Vibrant Travel Design System (Airbnb x Lemon8 Style)
export const WF_COLORS = {
  primary: '#FF5722',       // Vibrant Sunset Orange (Rực rỡ, năng động, tươi mới)
  primaryHover: '#E64A19',  // Deep Sunset 700
  primaryLight: '#FFF3E0',  // Warm Orange 50
  primarySoft: '#FFF8F1',   // Warm Pearl Peach
  secondary: '#334155',     // Slate Secondary
  amber: '#F59E0B',         // Vibrant Warm Amber (Vàng nắng sao đánh giá)
  amberLight: '#FEF3C7',
  rose: '#F43F5E',          // Vibrant Rose / Pink Coral (Hồng san hô tim yêu thích)
  roseLight: '#FFE4E6',
  emerald: '#10B981',       // Tropical Emerald Green (Xanh ngọc lục bảo thiên nhiên)
  emeraldLight: '#D1FAE5',
  sky: '#0EA5E9',           // Ocean Sky Blue (Xanh biển biếc check-in)
  skyLight: '#E0F2FE',
  violet: '#8B5CF6',        // Vibrant AI Violet (Tím mộng mơ WanderAI)
  violetLight: '#EDE9FE',
  slate900: '#0F172A',      // Crisp Deep Slate (Chữ đậm nét cao cấp)
  slate700: '#334155',      // Neutral Dark
  slate600: '#475569',      // Neutral Medium
  slate500: '#64748B',      // Neutral Muted
  slate400: '#94A3B8',      // Icon Slate
  slate200: '#E2E8F0',      // Soft Border
  slate100: '#F1F5F9',      // Light Pill
  slate50: '#F8FAFC',       // Crisp Canvas White
  white: '#FFFFFF',         // Pure White Card
};

// Modern Wanderlust Palette (Airy, Crisp, Clean & Tactile)
export const WF_PAPER = {
  bg: '#F8FAFC',                        // Nền canvas sáng sạch, hiện đại
  card: '#FFFFFF',                      // Thẻ card trắng tinh tế nổi bật
  cardBorder: 'rgba(15, 23, 42, 0.08)', // Viền siêu mỏng tự nhiên
  inkPrimary: '#0F172A',                // Màu chữ chính đậm nét, dễ đọc
  inkSecondary: '#334155',              // Màu chữ phụ trung tính sắc nét
  inkMuted: '#64748B',                  // Màu chữ mờ cho timestamp / meta
  pillBg: '#F1F5F9',                    // Nền pill chip bo tròn
  pillBorder: 'rgba(15, 23, 42, 0.06)',
  clay: '#FF5722',                      // Vibrant Sunset Orange năng động
  clayDark: '#E64A19',
  clayLight: '#FFF3E0',                 // Cam đào nhạt
  sky: '#0EA5E9',                       // Xanh biển ngọc Wayfare
  skyLight: '#E0F2FE',
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  rose: '#F43F5E',
  roseLight: '#FFE4E6',
  violet: '#8B5CF6',
  violetLight: '#EDE9FE',
};

/** Bo góc hiện đại chuẩn mobile: card 18px-24px, button/pill dạng con nhộng (999px). */
export const WF_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  input: 16,
  button: 999,
  card: 18,
  cardLg: 24,
  pill: 999,
} as const;

/** Đổ bóng mờ tự nhiên chuẩn Native Mobile (Airbnb / iOS style). */
export const WF_SHADOW = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
};

export default {
  light: {
    text: WF_COLORS.slate900,
    textMuted: WF_COLORS.slate500,
    background: WF_COLORS.slate50,
    tint: WF_COLORS.primary,
    tabIconDefault: WF_COLORS.slate400,
    tabIconSelected: WF_COLORS.primary,
    card: WF_COLORS.white,
    border: WF_COLORS.slate200,
    primary: WF_COLORS.primary,
    primaryLight: WF_COLORS.primaryLight,
    badge: WF_COLORS.slate100,
  },
  dark: {
    text: WF_COLORS.slate900,
    textMuted: WF_COLORS.slate500,
    background: WF_COLORS.slate50,
    tint: WF_COLORS.primary,
    tabIconDefault: WF_COLORS.slate400,
    tabIconSelected: WF_COLORS.primary,
    card: WF_COLORS.white,
    border: WF_COLORS.slate200,
    primary: WF_COLORS.primary,
    primaryLight: WF_COLORS.primaryLight,
    badge: WF_COLORS.slate100,
  },
};
