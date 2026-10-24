import axios from 'axios';
import { authStorage } from './authStorage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://travelsharingbackend-production.up.railway.app/api';

/**
 * Địa chỉ web Wayfare — dùng để chia sẻ LINK THẬT (trang /places/:id, /itineraries)
 * trong nút Share của app. Cấu hình bằng app.json extra / .env
 * (EXPO_PUBLIC_WEB_URL); chưa cấu hình thì chia sẻ bằng text thuần như trước.
 */
export const WEB_ORIGIN = (process.env.EXPO_PUBLIC_WEB_URL || '').replace(/\/$/, '');
export const webPlaceUrl = (placeId: number) => (WEB_ORIGIN ? `${WEB_ORIGIN}/places/${placeId}` : '');
export const webItineraryUrl = (itineraryId?: number) =>
  WEB_ORIGIN ? (itineraryId ? `${WEB_ORIGIN}/itineraries?id=${itineraryId}` : `${WEB_ORIGIN}/itineraries`) : '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động gắn JWT Token vào header Authorization
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await authStorage.getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Could not attach token to request', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor xử lý lỗi chung (401 Unauthorized handling)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired or unauthorized (401). Clearing session and notifying listeners.');
      await authStorage.clearSession();
      authStorage.notifyUnauthorized();
    }
    return Promise.reject(error);
  }
);

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface UserAuthData {
  token: string;
  id: number;
  email: string;
  fullName: string;
  handle: string;
  avatar: string;
  tier: string;
  roles: string[];
}

export interface PlaceItem {
  id: number;
  name: string;
  description?: string;
  city: string;
  category: string;
  address?: string;
  coverImage?: string;
  rating?: number;
  reviewsCount?: number;
  priceLevel?: string;
  openingHours?: string;
  /** Tiện ích đã tách sẵn (CSDL lưu 1 chuỗi ngăn cách bằng dấu phẩy). */
  amenities?: string[];
  phoneNumber?: string;
  ticketPrice?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  isVerifiedHost?: boolean;
  ownerName?: string;
  /** Thông tin người đăng (server trả sẵn) — dùng cho dòng "Được chia sẻ bởi". */
  ownerHandle?: string;
  ownerAvatar?: string;
}

/**
 * Chuyển dữ liệu thô từ API /places sang PlaceItem dùng trong app.
 *
 * API trả về tên trường theo CSDL (coverImageUrl, averageRating, categoryName,
 * priceRange, openHours, amenities, ticketPrice, latitude/longitude...) trong khi
 * app trước đây đọc thẳng tên trường PlaceItem. Hệ quả: ảnh luôn rơi vào ảnh dự
 * phòng, đánh giá/danh mục/giá/giờ mở cửa đều trống. Hàm này bù lại khoảng cách
 * đó. Vẫn đọc được cả 2 kiểu tên để không vỡ khi backend đổi cách đặt tên.
 */
function mapPlace(raw: any): PlaceItem {
  const amenitiesRaw = raw?.amenities;
  let amenities: string[] | undefined;
  if (Array.isArray(amenitiesRaw)) {
    amenities = amenitiesRaw.map((a: any) => String(a).trim()).filter(Boolean);
  } else if (typeof amenitiesRaw === 'string') {
    amenities = amenitiesRaw.split(',').map((a) => a.trim()).filter(Boolean);
  }

  const ratingRaw = raw?.averageRating ?? raw?.rating;
  const reviewsRaw = raw?.reviewCount ?? raw?.reviewsCount;
  const ticketRaw = raw?.ticketPrice;

  return {
    id: raw?.id,
    name: raw?.name,
    description: raw?.description,
    city: raw?.city,
    category: raw?.categoryName ?? raw?.category ?? '',
    address: raw?.address,
    coverImage: raw?.coverImageUrl ?? raw?.coverImage,
    rating: ratingRaw != null ? Number(ratingRaw) : undefined,
    reviewsCount: reviewsRaw != null ? Number(reviewsRaw) : undefined,
    priceLevel: raw?.priceRange ?? raw?.priceLevel,
    openingHours: raw?.openHours ?? raw?.openingHours,
    amenities: amenities && amenities.length ? amenities : undefined,
    phoneNumber: raw?.phoneNumber || undefined,
    ticketPrice: ticketRaw != null ? Number(ticketRaw) : null,
    latitude: raw?.latitude != null ? Number(raw.latitude) : null,
    longitude: raw?.longitude != null ? Number(raw.longitude) : null,
    isVerifiedHost: Boolean(raw?.isVerifiedHost),
    ownerName: raw?.ownerName,
    ownerHandle: raw?.ownerHandle,
    ownerAvatar: raw?.ownerAvatar,
  };
}

export interface PostItem {
  id: number;
  title?: string;
  content: string;
  authorId?: number;
  authorName?: string;
  authorEmail?: string;
  authorAvatar?: string;
  authorHandle?: string;
  authorRole?: string;
  authorTier?: string;
  category?: string;
  locationName?: string;
  locationTag?: string;
  coverImage?: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  visibility?: string;
  badgeText?: string;
  status?: string;
  aiSafetyScore?: number;
  aiFlagReason?: string;
  likesCount?: number;
  likeCount?: number;
  commentsCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  isOwner?: boolean;
  createdAt?: string;
  timeAgo?: string;
  formattedDate?: string;
  /** Lịch trình đính kèm (nếu bài viết gắn tour) */
  itineraryId?: number;
  itineraryTitle?: string;
  itineraryDestination?: string;
  itineraryDuration?: string;
  itineraryBudget?: number;
  itineraryPlacesCount?: number;
  itineraryIsAi?: boolean;
  /** Địa điểm check-in đính kèm */
  placeId?: number;
  placeName?: string;
  placeAddress?: string;
  placeCity?: string;
  placeCoverImageUrl?: string;
  placeAverageRating?: number;
  placeReviewCount?: number;
  placeCategoryName?: string;
  placeTicketPrice?: string;
  placeOpenHours?: string;
  /** Bài viết gốc khi đây là bài chia sẻ lại */
  sharedPostId?: number;
  sharedPost?: PostItem;
}

export function normalizeMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  if (/^http:\/\/localhost(:\d+)?\/uploads\//i.test(url)) {
    const backendBase = API_BASE_URL.replace(/\/api\/?$/, '');
    return url.replace(/^http:\/\/localhost(:\d+)?/i, backendBase);
  }
  return url;
}

export function normalizePost(post: PostItem): PostItem {
  if (!post || typeof post !== 'object') return post;
  return {
    ...post,
    imageUrl: post.imageUrl ? normalizeMediaUrl(post.imageUrl) : post.imageUrl,
    coverImage: post.coverImage ? normalizeMediaUrl(post.coverImage) : post.coverImage,
    images: Array.isArray(post.images) ? post.images.map(normalizeMediaUrl) : post.images,
    videoUrl: post.videoUrl ? normalizeMediaUrl(post.videoUrl) : post.videoUrl,
    authorAvatar: post.authorAvatar ? normalizeMediaUrl(post.authorAvatar) : post.authorAvatar,
    placeCoverImageUrl: post.placeCoverImageUrl ? normalizeMediaUrl(post.placeCoverImageUrl) : post.placeCoverImageUrl,
    sharedPost: post.sharedPost ? normalizePost(post.sharedPost) : post.sharedPost,
  };
}

export interface ItineraryItem {
  id: number;
  creatorId?: number;
  creatorName?: string;
  creatorEmail?: string;
  creatorAvatar?: string;
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  daysCount?: number;
  budget?: number;
  budgetTotal?: number;
  coverImageUrl?: string;
  isAiGenerated?: boolean;
  status?: string;
  groupType?: string;
  coverImage?: string;
  authorName?: string;
  details?: ItineraryDetailItem[];
}

// ─── AUTH API ──────────────────────────────────────────────
export const authApi = {
  async login(email: string, password: string): Promise<UserAuthData> {
    const res = await apiClient.post<ApiResponse<UserAuthData>>('/auth/login', { email, password });
    if (res.data.success && res.data.data) {
      await authStorage.saveSession(res.data.data);
      return res.data.data;
    }
    throw new Error(res.data.message || 'Đăng nhập không thành công');
  },

  async register(fullName: string, email: string, password: string): Promise<UserAuthData> {
    const res = await apiClient.post<ApiResponse<UserAuthData>>('/auth/register', {
      fullName,
      email,
      password,
    });
    if (res.data.success && res.data.data) {
      await authStorage.saveSession(res.data.data);
      return res.data.data;
    }
    throw new Error(res.data.message || 'Đăng ký không thành công');
  },

  async loginWithGoogle(idToken: string): Promise<UserAuthData> {
    const res = await apiClient.post<ApiResponse<UserAuthData>>('/auth/google', {
      idToken: idToken.trim(),
    });
    if (res.data.success && res.data.data) {
      await authStorage.saveSession(res.data.data);
      return res.data.data;
    }
    throw new Error(res.data.message || 'Xác thực tài khoản Google với máy chủ không thành công');
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Logout API error', e);
    } finally {
      await authStorage.clearSession();
    }
  },
};

// ─── PLACES API ────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export const placeApi = {
  async getAllPlaces(params?: { city?: string; category?: string; keyword?: string; status?: string }): Promise<PlaceItem[]> {
    const res = await apiClient.get<ApiResponse<PlaceItem[]>>('/places', { params });
    return (res.data.data || []).map(mapPlace);
  },

  /**
   * Lấy địa điểm có phân trang phía server (giảm payload so với tải toàn bộ).
   * Trả về null nếu API chưa hỗ trợ, caller có thể fallback sang getAllPlaces.
   */
  async getPlacesPaged(params: { page?: number; size?: number; city?: string; category?: string; keyword?: string; status?: string } = {}): Promise<PagedResult<PlaceItem> | null> {
    try {
      const res = await apiClient.get<ApiResponse<PagedResult<PlaceItem>>>('/places', { params });
      const data = res.data.data;
      if (!data) return null;
      return { ...data, items: (data.items || []).map(mapPlace) };
    } catch (err: any) {
      console.warn('API error fetching paged places:', err?.message || err);
      return null;
    }
  },

  async getPlaceById(id: number): Promise<PlaceItem> {
    const res = await apiClient.get<ApiResponse<PlaceItem>>(`/places/${id}`);
    return mapPlace(res.data.data);
  },
};

/**
 * Danh sách "muốn đi" lưu TRÊN SERVER (bảng saved_places) — web & app mobile
 * cùng người dùng chia sẻ đúng 1 danh sách thay vì chỉ lưu theo thiết bị.
 * Cả 3 hàm yêu cầu đã đăng nhập (JWT gắn tự động trong interceptor).
 */
export const savedPlaceApi = {
  /** Trả về mảng placeId đã lưu, hoặc null nếu lỗi/chưa đăng nhập. */
  async getSavedPlaces(): Promise<number[] | null> {
    try {
      const res = await apiClient.get<ApiResponse<PlaceItem[]>>('/users/saved-places');
      const list = res.data?.data;
      if (!Array.isArray(list)) return null;
      return list.map((p) => Number(p.id)).filter((n) => Number.isFinite(n as number)) as number[];
    } catch (e) {
      console.warn('API error fetching saved places', e);
      return null;
    }
  },

  async addSavedPlace(placeId: number): Promise<void> {
    await apiClient.post(`/users/saved-places/${placeId}`);
  },

  async removeSavedPlace(placeId: number): Promise<void> {
    await apiClient.delete(`/users/saved-places/${placeId}`);
  },
};

export interface ReviewItem {
  id: number;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  rating: number;
  comment: string;
  createdAt?: string;
}

/**
 * Đánh giá địa điểm THẬT từ bảng reviews — cùng nguồn với web. Sau khi
 * backend gieo 5110 review thật, trang chi tiết trên mobile không còn trống.
 */
export const reviewApi = {
  async getReviews(placeId: number): Promise<ReviewItem[]> {
    try {
      const res = await apiClient.get<ApiResponse<ReviewItem[]>>(`/places/${placeId}/reviews`);
      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch (e) {
      console.warn(`API error fetching reviews for place #${placeId}`, e);
      return [];
    }
  },

  async addReview(placeId: number, payload: { rating: number; comment: string }): Promise<ReviewItem | null> {
    try {
      const res = await apiClient.post<ApiResponse<ReviewItem>>(`/places/${placeId}/reviews`, {
        rating: Number(payload.rating),
        comment: String(payload.comment || '').trim(),
      });
      return res.data?.data ?? null;
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Không gửi được nhận xét. Vui lòng thử lại.';
      const err = new Error(msg);
      console.warn(`API error adding review for place #${placeId}`, e);
      throw err;
    }
  },
};

export interface CommentItem {
  id: number;
  postId?: number;
  authorId?: number;
  authorName?: string;
  authorAvatar?: string;
  authorHandle?: string;
  userId?: number;
  userName?: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  timeAgo?: string;
  parentId?: number;
  replyToUserId?: number;
  replyToUserName?: string;
  replyToUserHandle?: string;
  replies?: CommentItem[];
}

export interface CreatePostPayload {
  title?: string;
  content: string;
  category?: string;
  locationTag?: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  visibility?: string;
  itineraryId?: number;
  placeId?: number;
  sharedPostId?: number;
}

export interface UserProfileItem {
  id: number;
  email: string;
  fullName: string;
  handle?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  phoneNumber?: string;
  coverImageUrl?: string;
  travelStyle?: string;
  budgetPreference?: string;
  location?: string;
  rank?: string;
  role?: string;
  tier?: string;
  isVerified?: boolean;
  destinationsCount?: number;
  tripsCount?: number;
  itinerariesCount?: number;
  postsCount?: number;
  followingCount?: number;
  followersCount?: number;
  isFollowing?: boolean;
  posts?: PostItem[];
  itineraries?: ItineraryItem[];
  totalXp?: number;
  roles?: string[];
}

// ─── COMMUNITY POSTS API ───────────────────────────────────
export const postApi = {
  async getCommunityPosts(params?: { category?: string; keyword?: string; placeId?: number }): Promise<PostItem[]> {
    const res = await apiClient.get<ApiResponse<PostItem[]>>('/posts', { params });
    const items = res.data.data || [];
    return items.map(normalizePost);
  },

  /**
   * Lấy bài viết cộng đồng có phân trang phía server.
   * Trả về null nếu API chưa hỗ trợ, caller có thể fallback sang getCommunityPosts.
   */
  async getCommunityPostsPaged(params: { page?: number; size?: number; category?: string; keyword?: string; placeId?: number } = {}): Promise<PagedResult<PostItem> | null> {
    try {
      const res = await apiClient.get<ApiResponse<PagedResult<PostItem>>>('/posts', { params });
      if (!res.data.data) return null;
      return {
        ...res.data.data,
        items: (res.data.data.items || []).map(normalizePost),
      };
    } catch (err: any) {
      console.warn('API error fetching paged posts:', err?.message || err);
      return null;
    }
  },

  async getPostById(id: number): Promise<PostItem> {
    const res = await apiClient.get<ApiResponse<PostItem>>(`/posts/${id}`);
    return normalizePost(res.data.data);
  },

  async toggleLike(id: number): Promise<{ isLiked: boolean; likeCount: number }> {
    const res = await apiClient.post<ApiResponse<{ isLiked: boolean; likeCount: number }>>(`/posts/${id}/like`);
    return res.data.data;
  },

  async toggleBookmark(id: number): Promise<{ isBookmarked: boolean }> {
    const res = await apiClient.post<ApiResponse<{ isBookmarked: boolean }>>(`/posts/${id}/bookmark`);
    return res.data.data;
  },

  async getBookmarkedPosts(): Promise<PostItem[]> {
    const res = await apiClient.get<ApiResponse<PostItem[]>>('/posts/bookmarked');
    const items = res.data.data || [];
    return items.map(normalizePost);
  },

  async getComments(postId: number): Promise<CommentItem[]> {
    const res = await apiClient.get<ApiResponse<CommentItem[]>>(`/posts/${postId}/comments`);
    return res.data.data || [];
  },

  async addComment(postId: number, content: string, parentId?: number): Promise<CommentItem> {
    const res = await apiClient.post<ApiResponse<CommentItem>>(`/posts/${postId}/comments`, {
      content,
      parentId,
    });
    return res.data.data;
  },

  async deleteComment(postId: number, commentId: number): Promise<void> {
    await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
  },

  async createPost(payload: CreatePostPayload): Promise<PostItem> {
    const res = await apiClient.post<ApiResponse<PostItem>>('/posts', payload);
    return normalizePost(res.data.data);
  },

  async cloneItineraryFromPost(postId: number): Promise<ItineraryItem> {
    const res = await apiClient.post<ApiResponse<ItineraryItem>>(`/posts/${postId}/clone-itinerary`);
    return res.data.data;
  },

  async updatePost(id: number, payload: CreatePostPayload): Promise<PostItem> {
    // UpdatePostRequest không có sharedPostId -> loại bỏ để payload khớp hợp đồng backend
    const body: CreatePostPayload = { ...payload };
    delete body.sharedPostId;
    const res = await apiClient.put<ApiResponse<PostItem>>(`/posts/${id}`, body);
    return normalizePost(res.data.data);
  },

  async updatePostVisibility(id: number, visibility: string): Promise<PostItem> {
    const res = await apiClient.patch<ApiResponse<PostItem>>(`/posts/${id}/visibility`, null, {
      params: { visibility },
    });
    return res.data.data;
  },

  async deletePost(id: number): Promise<void> {
    await apiClient.delete(`/posts/${id}`);
  },

  async reportPost(id: number, payload: { reason: string; category?: string; details?: string }): Promise<void> {
    await apiClient.post(`/posts/${id}/report`, payload);
  },

  async getBookmarkedPostIds(): Promise<number[]> {
    const res = await apiClient.get<ApiResponse<number[]>>('/posts/bookmarked/ids');
    return res.data.data || [];
  },
};

export interface UpdateProfilePayload {
  fullName?: string;
  handle?: string;
  bio?: string;
  phone?: string;
  phoneNumber?: string;
  travelStyle?: string;
  budgetPreference?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
}

// ─── USER PROFILE & FOLLOW API ─────────────────────────────
export const userApi = {
  async getMyProfile(): Promise<UserProfileItem> {
    const res = await apiClient.get<ApiResponse<UserProfileItem>>('/users/me');
    return res.data.data;
  },

  async getUserProfile(id: number): Promise<UserProfileItem> {
    const res = await apiClient.get<ApiResponse<UserProfileItem>>(`/users/${id}/profile`);
    return res.data.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfileItem> {
    const res = await apiClient.put<ApiResponse<UserProfileItem>>('/users/profile', payload);
    return res.data.data;
  },

  async toggleFollow(targetUserId: number): Promise<{ isFollowing: boolean }> {
    const res = await apiClient.post<ApiResponse<{ isFollowing: boolean }>>(`/users/${targetUserId}/follow`);
    return res.data.data;
  },

  async getFollowing(): Promise<any[]> {
    try {
      const res = await apiClient.get<ApiResponse<any[]>>('/users/following');
      return res.data.data || [];
    } catch {
      return [];
    }
  },

  async getFollowingIds(): Promise<number[]> {
    try {
      const res = await apiClient.get<ApiResponse<number[]>>('/users/following/ids');
      return res.data.data || [];
    } catch {
      try {
        const list = await userApi.getFollowing();
        return list
          .map((u: any) => Number(u?.id ?? u?.userId ?? u?.followingId))
          .filter((n: number) => Number.isFinite(n));
      } catch {
        return [];
      }
    }
  },

  async getFollowers(): Promise<any[]> {
    try {
      const res = await apiClient.get<ApiResponse<any[]>>('/users/followers');
      return res.data.data || [];
    } catch {
      return [];
    }
  },
};

// ─── UPLOAD API ────────────────────────────────────────────
export const uploadApi = {
  async uploadSingle(uri: string, name?: string, type?: string): Promise<string> {
    const filename = name || uri.split('/').pop() || `upload_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const mime = type || (match ? `image/${match[1]}` : 'image/jpeg');

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: mime,
    } as any);

    const res = await apiClient.post<ApiResponse<string>>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return normalizeMediaUrl(res.data.data);
  },
};

export interface ItineraryDetailItem {
  id?: number;
  itineraryId?: number;
  placeId?: number;
  locationName: string;
  locationAddress?: string;
  category?: string;
  dayNumber: number;
  visitOrder?: number;
  startTime?: string;
  estimatedCost?: number;
  aiTip?: string;
  transitInfo?: string;
  note?: string;
}

export interface ItineraryItem {
  id: number;
  title: string;
  destination: string;
  region?: string;
  startDate?: string;
  endDate?: string;
  daysCount?: number;
  budgetTotal?: number;
  budgetPerPerson?: number;
  groupType?: string;
  isAiGenerated?: boolean;
  status?: string;
  coverImageUrl?: string;
  coverImage?: string;
  creatorName?: string;
  creatorAvatar?: string;
  creatorEmail?: string;
  details?: ItineraryDetailItem[];
  placesCount?: number;
  placesList?: string[];
  days?: any[];
}

export interface CreateItineraryPayload {
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  budgetTotal?: number;
  coverImageUrl?: string;
  status?: string;
  isAiGenerated?: boolean;
  groupType?: string;
  details?: ItineraryDetailItem[];
}

// ─── ITINERARIES API ───────────────────────────────────────
export const itineraryApi = {
  async getMyItineraries(): Promise<ItineraryItem[]> {
    const res = await apiClient.get<ApiResponse<ItineraryItem[]>>('/itineraries');
    return res.data.data || [];
  },

  async getAllItineraries(): Promise<ItineraryItem[]> {
    const res = await apiClient.get<ApiResponse<ItineraryItem[]>>('/itineraries/all');
    return res.data.data || [];
  },

  async getItineraryById(id: number): Promise<ItineraryItem> {
    const res = await apiClient.get<ApiResponse<ItineraryItem>>(`/itineraries/${id}`);
    return res.data.data;
  },

  async createItinerary(payload: CreateItineraryPayload): Promise<ItineraryItem> {
    const res = await apiClient.post<ApiResponse<ItineraryItem>>('/itineraries', payload);
    return res.data.data;
  },

  async deleteItinerary(id: number): Promise<void> {
    await apiClient.delete(`/itineraries/${id}`);
  },

  async addDetail(itineraryId: number, detail: ItineraryDetailItem): Promise<ItineraryDetailItem> {
    const res = await apiClient.post<ApiResponse<ItineraryDetailItem>>(`/itineraries/${itineraryId}/details`, detail);
    return res.data.data;
  },

  async deleteDetail(detailId: number): Promise<void> {
    await apiClient.delete(`/itineraries/details/${detailId}`);
  },

  async aiQuickGenerate(payload: {
    destination: string;
    budget: string;
    style: string;
    duration: string;
  }): Promise<ItineraryItem> {
    const res = await apiClient.post<ApiResponse<ItineraryItem>>('/itineraries/ai-quick-generate', payload);
    return res.data.data;
  },

  async cloneItinerary(id: number): Promise<ItineraryItem> {
    const res = await apiClient.post<ApiResponse<ItineraryItem>>(`/itineraries/${id}/clone`);
    return res.data.data;
  },
};

// ─── HOME API ──────────────────────────────────────────────
export interface HomeStatsData {
  totalItineraries: number;
  totalPlaces: number;
  totalPosts: number;
  totalUsers: number;
  totalLikes?: number;
  totalComments?: number;
}

export interface FeaturedItineraryItem {
  id: string | number;
  region: string;
  title: string;
  desc: string;
  duration: string;
  tag: string;
  category: string;
  rating: number;
  saves: string;
  price: string;
  location: string;
  image: string;
}

export const homeApi = {
  async getStats(): Promise<HomeStatsData> {
    try {
      const res = await apiClient.get<ApiResponse<HomeStatsData>>('/home/stats');
      return res.data.data || { totalItineraries: 0, totalPlaces: 0, totalPosts: 0, totalUsers: 0 };
    } catch (e) {
      console.warn('homeApi.getStats failed:', e);
      return {
        totalItineraries: 0,
        totalPlaces: 0,
        totalPosts: 0,
        totalUsers: 0,
      };
    }
  },

  async getFeaturedItineraries(region = 'all'): Promise<FeaturedItineraryItem[]> {
    try {
      const res = await apiClient.get<ApiResponse<FeaturedItineraryItem[]>>('/home/featured-itineraries', {
        params: { region },
      });
      return res.data.data || [];
    } catch (e) {
      return [];
    }
  },

  async getCommunityHighlights(): Promise<PostItem[]> {
    try {
      const res = await apiClient.get<ApiResponse<PostItem[]>>('/home/community-highlights');
      return res.data.data || [];
    } catch (e) {
      return [];
    }
  },

  async getTrendingDestinations(): Promise<string[]> {
    try {
      const res = await apiClient.get<ApiResponse<string[]>>('/home/trending-destinations');
      return res.data.data || [];
    } catch (e) {
      console.warn('homeApi.getTrendingDestinations failed:', e);
      return [];
    }
  },
};

// ─── CHAT API ──────────────────────────────────────────────
export type ChatMessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'VOICE'
  | 'FILE'
  | 'ITINERARY'
  | 'LOCATION'
  | 'SYSTEM';

export interface ChatMessage {
  id?: number | string;
  roomId: number | string;
  senderId?: number;
  senderEmail?: string;
  senderName?: string;
  senderHandle?: string;
  senderAvatar?: string;
  content: string;
  messageType?: ChatMessageType;
  /** ISO datetime gốc từ backend, dùng để chia nhóm tin nhắn theo ngày. */
  createdAt?: string;
  /** Giờ hiển thị dạng "HH:mm" (backend trả sẵn trong trường `time`). */
  time?: string;
  isMe?: boolean;
  /** Tin nhắn đang chờ server xác nhận (optimistic). */
  isPending?: boolean;
  /** Gửi thất bại, cho phép bấm "Gửi lại". */
  isFailed?: boolean;
  /** Câu trả lời do trợ lý tạo trên máy, chưa được lưu ở backend. */
  isLocal?: boolean;
  itineraryData?: any;
}

export interface ChatMember {
  userId: number;
  fullName: string;
  handle?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  isOnline?: boolean;
  statusText?: string;
  lastActiveAt?: string;
}

export interface ChatRoom {
  id: number | string;
  name: string;
  type?: 'DIRECT' | 'GROUP' | 'ITINERARY' | 'AI';
  avatarUrl?: string;
  itineraryId?: number;
  itineraryTitle?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  membersCount?: number;
  members?: ChatMember[];
  isOnline?: boolean;
  statusText?: string;
  updatedAt?: string;
  lastActiveAt?: string;
}

const mapChatMember = (raw: any): ChatMember => ({
  userId: Number(raw?.userId),
  fullName: raw?.fullName || raw?.email || 'Người dùng Wayfare',
  handle: raw?.handle,
  email: raw?.email,
  avatarUrl: raw?.avatarUrl,
  role: raw?.role,
  isOnline: raw?.isOnline,
  statusText: raw?.statusText,
  lastActiveAt: raw?.lastActiveAt,
});

const mapChatRoom = (raw: any): ChatRoom => {
  let lastMessage = raw?.lastMsg ?? raw?.lastMessage;
  // Backend chưa rút gọn preview của tin ITINERARY (JSON thô) -> hiển thị thân thiện hơn.
  if (typeof lastMessage === 'string' && lastMessage.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(lastMessage);
      if (parsed?.title) lastMessage = 'Đã chia sẻ một lịch trình';
    } catch {
      // Giữ nguyên nội dung nếu không phải JSON hợp lệ
    }
  }

  return {
    id: raw?.id,
    name: raw?.name || 'Cuộc trò chuyện',
    type: raw?.type,
    avatarUrl: raw?.avatar || raw?.avatarUrl,
    itineraryId: raw?.itineraryId ?? undefined,
    itineraryTitle: raw?.itineraryTitle ?? undefined,
    lastMessage,
    lastMessageTime: raw?.time ?? raw?.lastMessageTime,
    unreadCount: raw?.unread ?? raw?.unreadCount ?? 0,
    membersCount: raw?.membersCount,
    members: Array.isArray(raw?.members) ? raw.members.map(mapChatMember) : undefined,
    isOnline: raw?.isOnline,
    statusText: raw?.statusText,
    updatedAt: raw?.updatedAt,
    lastActiveAt: raw?.lastActiveAt,
  };
};

const mapChatMessage = (raw: any): ChatMessage => ({
  id: raw?.id,
  roomId: raw?.roomId,
  senderId: raw?.senderId ?? undefined,
  senderEmail: raw?.senderEmail,
  senderName: raw?.senderName,
  senderHandle: raw?.senderHandle,
  senderAvatar: raw?.senderAvatar,
  content: raw?.content ?? '',
  messageType: raw?.messageType,
  createdAt: raw?.createdAt,
  time: raw?.time,
  isMe: typeof raw?.isMe === 'boolean' ? raw.isMe : undefined,
});

export const chatApi = {
  async getRooms(): Promise<ChatRoom[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/chat/rooms');
    return (res.data.data || []).map(mapChatRoom);
  },

  async getRoomMessages(roomId: number | string): Promise<ChatMessage[]> {
    const res = await apiClient.get<ApiResponse<any[]>>(`/chat/rooms/${roomId}/messages`);
    return (res.data.data || []).map(mapChatMessage);
  },

  async sendMessage(
    roomId: number | string,
    content: string,
    messageType: ChatMessageType = 'TEXT'
  ): Promise<ChatMessage> {
    const res = await apiClient.post<ApiResponse<any>>(`/chat/rooms/${roomId}/messages`, {
      content,
      messageType,
    });
    return mapChatMessage(res.data.data);
  },

  async createDirectRoom(targetUserId: number): Promise<ChatRoom> {
    const res = await apiClient.post<ApiResponse<any>>('/chat/direct', null, {
      params: { targetUserId },
    });
    return mapChatRoom(res.data.data);
  },

  async getAvailableUsers(keyword?: string): Promise<ChatMember[]> {
    const res = await apiClient.get<ApiResponse<any[]>>('/chat/available-users', {
      params: keyword?.trim() ? { keyword: keyword.trim() } : undefined,
    });
    return (res.data.data || []).map(mapChatMember);
  },
};

export interface NotificationDto {
  id: number;
  recipientId?: number;
  actorId?: number;
  actorName?: string;
  actorHandle?: string;
  actorAvatar?: string;
  type: string;
  message: string;
  targetUrl?: string;
  isRead: boolean;
  time?: string;
  createdAt?: string;
}

export const notificationApi = {
  async getNotifications(): Promise<NotificationDto[]> {
    try {
      const res = await apiClient.get<NotificationDto[]>('/notifications');
      return res.data || [];
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
      return [];
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const res = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
      return res.data?.unreadCount ?? 0;
    } catch (e) {
      return 0;
    }
  },

  async markAsRead(id: number): Promise<NotificationDto | null> {
    try {
      const res = await apiClient.put<NotificationDto>(`/notifications/${id}/read`);
      return res.data;
    } catch (e) {
      console.warn(`Failed to mark notification ${id} as read:`, e);
      return null;
    }
  },

  async markAllAsRead(): Promise<boolean> {
    try {
      await apiClient.put('/notifications/read-all');
      return true;
    } catch (e) {
      console.warn('Failed to mark all notifications as read:', e);
      return false;
    }
  },

  async deleteNotification(id: number): Promise<boolean> {
    try {
      await apiClient.delete(`/notifications/${id}`);
      return true;
    } catch (e) {
      console.warn(`Failed to delete notification ${id}:`, e);
      return false;
    }
  },
};

export default apiClient;

