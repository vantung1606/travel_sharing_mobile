// Wayfare Modern Wanderlust Design System (Airbnb x Arc Style)
export const WF_COLORS = {
  primary: '#E05A36',       // Vibrant Terracotta 600
  primaryHover: '#C24422',  // Terracotta 700
  primaryLight: '#FDF2EE',  // Terracotta 50
  primarySoft: '#FAF7F4',   // Warm Pearl
  secondary: '#475569',     // Slate Secondary
  amber: '#D97706',         // Warm Amber
  amberLight: '#FEF3C7',
  rose: '#E11D48',          // Rose Red
  roseLight: '#FFE4E6',
  emerald: '#059669',       // Deep Emerald
  emeraldLight: '#D1FAE5',
  violet: '#7C3AED',        // Vibrant Violet
  violetLight: '#EDE9FE',
  slate900: '#0F172A',      // Crisp Deep Slate
  slate700: '#334155',      // Neutral Dark
  slate600: '#475569',      // Neutral Medium
  slate500: '#64748B',      // Neutral Muted
  slate400: '#94A3B8',      // Icon Slate
  slate200: '#E2E8F0',      // Soft Border
  slate100: '#F1F5F9',      // Light Pill
  slate50: '#F8FAFC',       // Clean Canvas
  white: '#FFFFFF',         // Pure White Card
};

// Modern Wanderlust Palette (Airy, Crisp, Clean & Tactile)
export const WF_PAPER = {
  bg: '#F8F9FA',                        // Nền canvas sáng sạch, hiện đại
  card: '#FFFFFF',                      // Thẻ card trắng tinh tế nổi bật
  cardBorder: 'rgba(15, 23, 42, 0.06)', // Viền siêu mỏng tự nhiên
  inkPrimary: '#0F172A',                // Màu chữ chính đậm nét, dễ đọc
  inkSecondary: '#475569',              // Màu chữ phụ trung tính
  inkMuted: '#94A3B8',                  // Màu chữ mờ cho timestamp / meta
  pillBg: '#F1F5F9',                    // Nền pill chip bo tròn
  pillBorder: 'rgba(15, 23, 42, 0.05)',
  clay: '#E05A36',                      // Đất nung Terracotta năng động
  clayDark: '#C24422',
  clayLight: '#FDF2EE',                 // Đất nung nhạt
  sky: '#0284C7',                       // Xanh da trời Wayfare
  skyLight: '#E0F2FE',
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
