// =====================================================================
// WAYFARE PRESTIGE TIER & HONOR SYSTEM (Single Source of Truth)
// Quản lý cơ chế 4 Cấp bậc Danh hiệu, Khung Avatar và Tích lũy Điểm XP
// Đồng bộ 100% logic với travel_frontend/src/utils/tierSystem.js
// =====================================================================

export interface TierItem {
  level: number;
  id: string;
  name: string;
  nameEn: string;
  minXP: number;
  nextXP: number;
  icon: string;
  badgeBg: string;
  tagText: string;
  avatarRingColor: string;
  cornerIcon: string;
  cornerBgColor: string;
  desc: string;
}

export const TIERS: TierItem[] = [
  {
    level: 1,
    id: 'bronze',
    name: 'Tân Thủ Khám Phá',
    nameEn: 'Bronze Explorer',
    minXP: 0,
    nextXP: 150,
    icon: '🥉',
    badgeBg: '#F4E3D3',
    tagText: 'Cấp 1 • Bronze',
    avatarRingColor: '#9A5B35',
    cornerIcon: '🥉',
    cornerBgColor: '#7A4426',
    desc: 'Bước đầu khám phá các vùng đất mới trên nền tảng Wayfare',
  },
  {
    level: 2,
    id: 'silver',
    name: 'Lữ Hành Bạc',
    nameEn: 'Silver Wanderer',
    minXP: 150,
    nextXP: 400,
    icon: '🥈',
    badgeBg: '#ECE9E3',
    tagText: 'Cấp 2 • Silver',
    avatarRingColor: '#8A8175',
    cornerIcon: '🥈',
    cornerBgColor: '#5A5146',
    desc: 'Đã có lịch trình và bài viết chia sẻ truyền cảm hứng',
  },
  {
    level: 3,
    id: 'gold',
    name: 'Nhà Thám Hiểm Vàng',
    nameEn: 'Gold Voyager',
    minXP: 400,
    nextXP: 800,
    icon: '👑',
    badgeBg: '#F7EAD5',
    tagText: 'Cấp 3 • Gold',
    avatarRingColor: '#B7791F',
    cornerIcon: '👑',
    cornerBgColor: '#8F5E14',
    desc: 'Thành viên cốt cán với mạng lưới cộng đồng đông đảo và dấu chân rộng lớn',
  },
  {
    level: 4,
    id: 'diamond',
    name: 'Huyền Thoại Kim Cương',
    nameEn: 'Diamond Legend',
    minXP: 800,
    nextXP: 800,
    icon: '💎',
    badgeBg: '#EFE9F2',
    tagText: 'Cấp 4 • Diamond VIP',
    avatarRingColor: '#6B5B7A',
    cornerIcon: '💎',
    cornerBgColor: '#5B4C69',
    desc: 'Đỉnh cao danh dự! Top 1% bậc thầy lữ hành có sức ảnh hưởng bậc nhất',
  },
];

export interface UserStatsForXP {
  itinsCount?: number;
  itinerariesCount?: number;
  postsCount?: number;
  followersCount?: number;
  destinationsCount?: number;
  totalXp?: number;
  xp?: number;
  tier?: string;
  authorTier?: string;
  rank?: string;
  role?: string;
  authorRole?: string;
  email?: string;
  roles?: string[];
}

/**
 * Tính điểm uy tín (XP) chuẩn dựa trên dữ liệu thực tế từ MySQL CSDL:
 * - Mỗi Lịch trình tạo: 60 XP
 * - Mỗi Bài viết chia sẻ: 40 XP
 * - Mỗi Người theo dõi (Follower): 15 XP
 * - Mỗi Địa điểm / Tỉnh thành khám phá: 25 XP
 */
export const calculateUserXP = (user: UserStatsForXP | null | undefined): number => {
  if (!user) return 0;

  if (typeof user.totalXp === 'number') return user.totalXp;
  if (typeof user.xp === 'number') return user.xp;

  const itinsCount = Number(user.itinerariesCount ?? user.itinsCount ?? 0);
  const postsCount = Number(user.postsCount ?? 0);
  const followersCount = Number(user.followersCount ?? 0);
  return itinsCount * 60 + postsCount * 40 + followersCount * 15;
};

/**
 * Lấy đối tượng Tier hiện tại dựa trên đối tượng User hoặc điểm XP
 */
export const getUserTier = (userOrXP: UserStatsForXP | number | null | undefined): TierItem => {
  if (!userOrXP) return TIERS[0];

  if (typeof userOrXP === 'number') {
    if (userOrXP >= 800) return TIERS[3];
    if (userOrXP >= 400) return TIERS[2];
    if (userOrXP >= 150) return TIERS[1];
    return TIERS[0];
  }

  const user = userOrXP;
  const xp = calculateUserXP(user);
  let xpTierLevel = 1;
  if (xp >= 800) xpTierLevel = 4;
  else if (xp >= 400) xpTierLevel = 3;
  else if (xp >= 150) xpTierLevel = 2;

  let dbTierLevel = 1;
  const rawTier = String(user.tier || user.authorTier || '').trim().toLowerCase();
  if (rawTier === 'diamond' || rawTier === 'kim cương' || rawTier === 'vip') dbTierLevel = 4;
  else if (rawTier === 'gold' || rawTier === 'vàng') dbTierLevel = 3;
  else if (rawTier === 'silver' || rawTier === 'bạc') dbTierLevel = 2;
  else if (rawTier === 'bronze' || rawTier === 'đồng') dbTierLevel = 1;

  const rawRank = String(user.rank || user.role || user.authorRole || '').trim().toLowerCase();
  if (rawRank.includes('kim cương') || rawRank.includes('diamond')) dbTierLevel = Math.max(dbTierLevel, 4);
  else if (rawRank.includes('vàng') || rawRank.includes('gold')) dbTierLevel = Math.max(dbTierLevel, 3);
  else if (rawRank.includes('bạc') || rawRank.includes('silver')) dbTierLevel = Math.max(dbTierLevel, 2);

  if (Array.isArray(user.roles) && user.roles.some((r) => r === 'ROLE_ADMIN')) {
    dbTierLevel = Math.max(dbTierLevel, 4);
  }

  const finalLevel = Math.max(dbTierLevel, xpTierLevel);
  return TIERS[finalLevel - 1] || TIERS[0];
};

export const getNextTier = (currentTier: TierItem): TierItem | null => {
  if (!currentTier || currentTier.level >= 4) return null;
  return TIERS[currentTier.level];
};

export const calculateTierProgress = (xp: number, currentTier: TierItem, nextTier: TierItem | null): number => {
  if (!nextTier) return 100;
  const currentMin = currentTier.minXP;
  const nextMin = nextTier.minXP;
  const progress = Math.min(100, Math.max(0, Math.round(((xp - currentMin) / (nextMin - currentMin)) * 100)));
  return progress;
};
