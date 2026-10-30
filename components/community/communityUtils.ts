import { PostItem } from '@/src/services/api';

/** Chuẩn hoá tiếng Việt: bỏ dấu + hạ chữ thường để tìm kiếm không phân biệt dấu. */
export function normalizeVi(input?: string | null): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** Rút gọn số lớn: 1200 -> 1,2k */
export function formatCount(value?: number | null): string {
  const n = Number(value || 0);
  if (n < 1000) return String(n);
  if (n < 1000000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace('.', ',')}k`;
  }
  const m = n / 1000000;
  return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1).replace('.', ',')}tr`;
}

export type FeedScope = 'all' | 'following' | 'saved';
export type PostSortKey = 'newest' | 'popular' | 'has_itinerary';

export const FEED_SCOPES: { key: FeedScope; label: string; icon: string }[] = [
  { key: 'all', label: 'Khám phá dành cho bạn', icon: 'compass' },
  { key: 'following', label: 'Đang theo dõi', icon: 'user-o' },
  { key: 'saved', label: 'Bài viết đã lưu', icon: 'bookmark-o' },
];

export const SORT_OPTIONS: { key: PostSortKey; label: string; hint: string }[] = [
  { key: 'newest', label: 'Mới nhất', hint: 'Bài viết vừa đăng' },
  { key: 'popular', label: 'Nhiều like nhất', hint: 'Được yêu thích nhất' },
  { key: 'has_itinerary', label: 'Có lịch trình', hint: 'Kèm tour chi tiết' },
];

export type TopicKey = 'all' | 'video' | 'itinerary' | 'checkin' | 'food' | 'adventure' | 'beach';

export const TOPIC_FILTERS: { key: TopicKey; label: string; icon: string; badge?: string }[] = [
  { key: 'all', label: 'Tất cả', icon: 'compass' },
  { key: 'checkin', label: 'Check-in', icon: 'map-marker', badge: '📍' },
  { key: 'itinerary', label: 'Lịch trình', icon: 'map-o', badge: 'Tour' },
  { key: 'video', label: 'Video', icon: 'play-circle-o', badge: 'Video' },
  { key: 'food', label: 'Ẩm thực', icon: 'cutlery' },
  { key: 'adventure', label: 'Phượt', icon: 'fire' },
  { key: 'beach', label: 'Biển đảo', icon: 'sun-o' },
];

export const TRAVEL_HASHTAGS: { key: string; label: string }[] = [
  { key: 'all', label: '#TấtCả' },
  { key: 'kinhnghiem', label: '#KinhNghiệm' },
  { key: 'amthuc', label: '#ReviewẨmThực' },
  { key: 'phuotsolo', label: '#PhượtSolo' },
  { key: 'dalat', label: '#ĐàLạt' },
  { key: 'hagiang', label: '#HàGiang' },
  { key: 'sapa', label: '#SaPa' },
  { key: 'phuquoc', label: '#PhúQuốc' },
  { key: 'danang', label: '#ĐàNẵng' },
  { key: 'checkin', label: '#CheckInSốngẢo' },
  { key: 'tietkiem', label: '#DuLịchTiếtKiệm' },
];

export const POST_CATEGORIES = [
  'Ẩm thực & Check-in',
  'Phượt & Khám phá',
  'Biển đảo & Nghỉ dưỡng',
  'Văn hóa & Lịch sử',
];

export const REPORT_REASONS = [
  'Spam / Quảng cáo',
  'Đòi nợ / Quấy rối tài chính',
  'Lừa đảo / Tin giả',
  'Nội dung phản cảm',
  'Giả mạo / Bản quyền',
  'Lý do khác',
];

const HASHTAG_KEYWORDS: Record<string, string[]> = {
  kinhnghiem: ['kinh nghiem', 'meo', 'tip', 'luu y', 'bi kip'],
  amthuc: ['am thuc', 'an uong', 'quan an', 'dac san', 'food', 'review am thuc'],
  phuotsolo: ['phuot', 'solo', 'xe may', 'trekking'],
  dalat: ['da lat', 'dalat'],
  hagiang: ['ha giang'],
  sapa: ['sa pa', 'sapa'],
  phuquoc: ['phu quoc'],
  danang: ['da nang', 'danang'],
  checkin: ['check-in', 'checkin', 'song ao', 'check in'],
  tietkiem: ['tiet kiem', 'chi phi', 'budget', 'gia re', 'tiet kiem'],
};

const TOPIC_KEYWORDS: Record<Exclude<TopicKey, 'all' | 'video' | 'itinerary' | 'checkin'>, string[]> = {
  food: ['am thuc', 'an uong', 'quan an', 'dac san', 'food', 'check-in', 'checkin'],
  adventure: ['phuot', 'trekking', 'leo nui', 'kham pha', 'mao hiem', 'xe may'],
  beach: ['bien', 'dao', 'nghi duong', 'resort', 'beach', 'bai bien'],
};

/** Tìm kiếm không dấu trên tiêu đề, nội dung, địa điểm, chủ đề, hashtag, tác giả. */
export function matchesSearch(post: PostItem, keyword: string): boolean {
  const q = normalizeVi(keyword);
  if (!q) return true;
  const haystack = normalizeVi(
    [
      post.title,
      post.content,
      post.locationTag,
      post.locationName,
      post.placeName,
      post.placeAddress,
      post.placeCity,
      post.category,
      post.authorName,
      post.authorHandle,
      post.badgeText,
    ]
      .filter(Boolean)
      .join(' ')
  );
  return haystack.includes(q);
}

export function matchesTopic(post: PostItem, topic: TopicKey): boolean {
  if (topic === 'all') return true;
  if (topic === 'video') return !!post.videoUrl;
  if (topic === 'itinerary') return hasItinerary(post);
  if (topic === 'checkin') return !!post.placeId || !!post.placeName || !!post.sharedPost?.placeId;
  const words = TOPIC_KEYWORDS[topic];
  const haystack = normalizeVi(
    [post.title, post.content, post.category, post.locationTag, post.locationName, post.placeName].filter(Boolean).join(' ')
  );
  return words.some((w) => haystack.includes(w));
}

export function matchesHashtag(post: PostItem, key: string): boolean {
  if (key === 'all') return true;
  const words = HASHTAG_KEYWORDS[key] || [];
  const haystack = normalizeVi(
    [post.title, post.content, post.category, post.locationTag, post.locationName].filter(Boolean).join(' ')
  );
  return words.some((w) => haystack.includes(w));
}

export function hasItinerary(post: PostItem): boolean {
  return !!post.itineraryId || !!post.sharedPost?.itineraryId;
}

export function getPostLikeCount(post: PostItem): number {
  return post.likeCount ?? post.likesCount ?? 0;
}

export function getPostCommentCount(post: PostItem): number {
  return post.commentCount ?? post.commentsCount ?? 0;
}

export function getPostImages(post: PostItem): string[] {
  const isValidImageUrl = (url?: string): boolean =>
    typeof url === 'string' &&
    url.trim().length > 10 &&
    !url.includes('undefined') &&
    !url.includes('null') &&
    (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:image/'));

  if (post.images && post.images.length) {
    return post.images.filter(isValidImageUrl);
  }
  const single = post.imageUrl || post.coverImage;
  return single && isValidImageUrl(single) ? [single] : [];
}

/** Nhánh lọc + sắp xếp giống bản web, dùng chung cho mọi nguồn dữ liệu. */
export function filterAndSortPosts(
  posts: PostItem[],
  opts: {
    scope: FeedScope;
    topic: TopicKey;
    hashtag: string;
    search: string;
    sort: PostSortKey;
    followingIds: Set<number>;
    currentUserId?: number | null;
  }
): PostItem[] {
  const { scope, topic, hashtag, search, sort, followingIds } = opts;

  let list = posts.filter((p) => {
    if (scope === 'following') {
      if (p.authorId == null || !followingIds.has(Number(p.authorId))) return false;
    }
    if (!matchesTopic(p, topic)) return false;
    if (!matchesHashtag(p, hashtag)) return false;
    if (search.trim() && !matchesSearch(p, search)) return false;
    return true;
  });

  if (sort === 'popular') {
    list = [...list].sort((a, b) => getPostLikeCount(b) - getPostLikeCount(a));
  } else if (sort === 'has_itinerary') {
    list = [...list].sort((a, b) => Number(hasItinerary(b)) - Number(hasItinerary(a)));
  } else {
    list = [...list].sort((a, b) => Number(b.id) - Number(a.id));
  }
  return list;
}

export const TIER_LABELS: Record<string, string> = {
  bronze: 'Đồng',
  silver: 'Bạc',
  gold: 'Vàng',
  diamond: 'Kim Cương',
};

export function getTierLabel(tier?: string | null): string {
  if (!tier) return 'Thành viên';
  return TIER_LABELS[tier.toLowerCase()] || tier;
}
