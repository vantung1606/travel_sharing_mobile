/**
 * Design tokens dùng chung cho toàn app mobile.
 *
 * Mục tiêu: thay thế các literal rải rác (13 kiểu radius, 17 cỡ chữ, 40+ màu)
 * bằng một hệ thống nhỏ, nhất quán. Chỉ dùng các token dưới đây cho UI mới.
 */
import { WF_PAPER } from '@/constants/Colors';

export const DS_COLOR = {
  /** Màu hành động duy nhất. */
  accent: WF_PAPER.clay,
  accentSoft: WF_PAPER.clayLight,
  accentPressed: WF_PAPER.clayDark,

  ink: '#0F172A',
  inkSecondary: '#475569',
  inkMuted: '#94A3B8',
  line: 'rgba(15, 23, 42, 0.07)',

  bg: '#F7F7F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',

  success: '#059669',
  successSoft: '#D1FAE5',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
} as const;

export const DS_SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** 4 bậc bo góc + pill. Sheet dùng 24. */
export const DS_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  sheet: 24,
  pill: 999,
} as const;

/** 6 cỡ chữ. Tối thiểu 11px cho caption. */
export const DS_TYPE = {
  caption: 11,
  meta: 13,
  body: 15,
  title: 17,
  page: 22,
  display: 28,
} as const;

export const DS_SHADOW = {
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

/** Tap target tối thiểu theo chuẩn mobile. */
export const DS_TOUCH = 44;
