import axios from 'axios';
import { authStorage } from './authStorage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://travelsharingbackend-production.up.railway.app/api';

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
}

export interface PostItem {
  id: number;
  title?: string;
  content: string;
  authorId?: number;
  authorName?: string;
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
  likesCount?: number;
  likeCount?: number;
  commentsCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt?: string;
  timeAgo?: string;
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
export const placeApi = {
  async getAllPlaces(params?: { city?: string; category?: string; keyword?: string; status?: string }): Promise<PlaceItem[]> {
    const res = await apiClient.get<ApiResponse<PlaceItem[]>>('/places', { params });
    return res.data.data || [];
  },

  async getPlaceById(id: number): Promise<PlaceItem> {
    const res = await apiClient.get<ApiResponse<PlaceItem>>(`/places/${id}`);
    return res.data.data;
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
}

export interface CreatePostPayload {
  title?: string;
  content: string;
  category?: string;
  locationName?: string;
  coverImage?: string;
  images?: string[];
  itineraryId?: number;
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
  async getCommunityPosts(params?: { category?: string; keyword?: string }): Promise<PostItem[]> {
    const res = await apiClient.get<ApiResponse<PostItem[]>>('/posts', { params });
    return res.data.data || [];
  },

  async getPostById(id: number): Promise<PostItem> {
    const res = await apiClient.get<ApiResponse<PostItem>>(`/posts/${id}`);
    return res.data.data;
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
    return res.data.data || [];
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
    return res.data.data;
  },

  async cloneItineraryFromPost(postId: number): Promise<ItineraryItem> {
    const res = await apiClient.post<ApiResponse<ItineraryItem>>(`/posts/${postId}/clone-itinerary`);
    return res.data.data;
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
    return res.data.data;
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
export interface ChatMessage {
  id?: number | string;
  roomId: number | string;
  senderId?: number;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  messageType?: 'TEXT' | 'IMAGE' | 'VOICE' | 'ITINERARY';
  createdAt?: string;
  isMe?: boolean;
  imageUrl?: string;
  itineraryData?: any;
}

export interface ChatRoom {
  id: number | string;
  name: string;
  type?: 'DIRECT' | 'GROUP' | 'ITINERARY' | 'AI';
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  membersCount?: number;
}

export const chatApi = {
  async getRooms(): Promise<ChatRoom[]> {
    try {
      const res = await apiClient.get<ApiResponse<ChatRoom[]>>('/chat/rooms');
      return res.data.data || [];
    } catch (e) {
      console.warn('chatApi.getRooms failed:', e);
      return [];
    }
  },

  async getRoomMessages(roomId: number | string): Promise<ChatMessage[]> {
    try {
      const res = await apiClient.get<ApiResponse<ChatMessage[]>>(`/chat/rooms/${roomId}/messages`);
      return res.data.data || [];
    } catch (e) {
      console.warn(`chatApi.getRoomMessages(${roomId}) failed:`, e);
      return [];
    }
  },

  async sendMessage(roomId: number | string, content: string): Promise<ChatMessage> {
    const res = await apiClient.post<ApiResponse<ChatMessage>>(`/chat/rooms/${roomId}/messages`, {
      content,
      messageType: 'TEXT',
    });
    return res.data.data;
  },

  async createDirectRoom(targetUserId: number): Promise<ChatRoom> {
    const res = await apiClient.post<ApiResponse<ChatRoom>>('/chat/direct', null, {
      params: { targetUserId },
    });
    return res.data.data;
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

