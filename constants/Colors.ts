// Wayfare Design System - Paper / Ink / Clay, đồng bộ với web.
// Các biến legacy được giữ tên cũ để không phải sửa toàn bộ màn hình,
// nhưng giá trị đã chuyển sang bảng màu giấy mực của web.
export const WF_COLORS = {
  primary: '#B0522F',       // Clay 600
  primaryHover: '#8F3F24',  // Clay 700
  primaryLight: '#F6E6DD',  // Clay 100
  primarySoft: '#FBF4EC',   // Giấy ấm
  secondary: '#6B6154',     // Ink phụ
  amber: '#B7791F',         // Vàng đất
  amberLight: '#F7EAD5',
  rose: '#A64B3C',          // Đỏ đất
  roseLight: '#F7E4DF',
  emerald: '#4F6B52',       // Xanh rêu
  emeraldLight: '#E8EFE3',
  violet: '#6B5B7A',        // Tím mực
  violetLight: '#EFE9F2',
  slate900: '#1E1A15',      // Mực chính
  slate700: '#3B332A',      // Mực phụ đậm
  slate600: '#5A5146',      // Mực phụ vừa
  slate500: '#6B6154',      // Mực mờ
  slate400: '#8A7F70',      // Icon mờ
  slate200: '#E4DACB',      // Viền giấy
  slate100: '#F3EDE2',      // Nền nút phụ
  slate50: '#F8F4EC',       // Nền giấy
  white: '#FFFDF8',         // Card giấy
};

// Paper - Ink - Clay Editorial Palette (Đồng bộ 100% với Web Community & Travel Journal)
export const WF_PAPER = {
  bg: '#F8F4EC',                    // Nền trang giấy ngà ấm áp
  card: '#FFFDF8',                  // Nền thẻ card bài viết trắng ngà cao cấp
  cardBorder: 'rgba(30, 26, 21, 0.10)', // Viền mảnh tự nhiên
  inkPrimary: '#1E1A15',            // Mực đen đậm cho tiêu đề & tên
  inkSecondary: '#5A5146',          // Mực ghi trung tính cho nội dung
  inkMuted: '#8A7F70',              // Mực xám phụ cho thời gian & meta
  pillBg: '#F3EDE2',                // Nền pill chip chủ đề & hashtag
  pillBorder: 'rgba(30, 26, 21, 0.09)',
  clay: '#B0522F',                  // Màu đất nung terracotta ấm áp
  clayDark: '#8F3F24',
  clayLight: '#F6E6DD',             // Nền đất nung nhạt
  sky: '#0284C7',                   // Xanh da trời Wayfare
  skyLight: '#E0F2FE',
};

/** Bo góc đồng bộ với web: nút/ô nhập/chip 5px, card 6px. */
export const WF_RADIUS = {
  xs: 2,
  sm: 4,
  input: 5,
  button: 5,
  card: 6,
  pill: 999,
} as const;

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
