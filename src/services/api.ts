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

// Interceptor xử lý lỗi chung
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Hết hạn session
      console.warn('Session expired or unauthorized');
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
      const session = await authStorage.getSession();
      await apiClient.post('/auth/logout', null, {
        params: { email: session?.email },
      });
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
    const session = await authStorage.getSession();
    const res = await apiClient.get<ApiResponse<PostItem[]>>('/posts', {
      params: {
        ...params,
        email: session?.email,
      },
    });
    return res.data.data || [];
  },

  async getPostById(id: number): Promise<PostItem> {
    const session = await authStorage.getSession();
    const res = await apiClient.get<ApiResponse<PostItem>>(`/posts/${id}`, {
      params: { email: session?.email },
    });
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
    const session = await authStorage.getSession();
    const res = await apiClient.get<ApiResponse<UserProfileItem>>(`/users/${id}/profile`, {
      params: { email: session?.email },
    });
    return res.data.data;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfileItem> {
    const session = await authStorage.getSession();
    const res = await apiClient.put<ApiResponse<UserProfileItem>>('/users/profile', payload, {
      params: { email: session?.email },
    });
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
    const session = await authStorage.getSession();
    const res = await apiClient.get<ApiResponse<ItineraryItem[]>>('/itineraries', {
      params: { email: session?.email },
    });
    return res.data.data || [];
  },

  async getAllItineraries(): Promise<ItineraryItem[]> {
    const res = await apiClient.get<ApiResponse<ItineraryItem[]>>('/itineraries/all');
    return res.data.data || [];
  },

  async getItineraryById(id: number): Promise<ItineraryItem> {
    const session = await authStorage.getSession();
    const res = await apiClient.get<ApiResponse<ItineraryItem>>(`/itineraries/${id}`, {
      params: { email: session?.email },
    });
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
    const session = await authStorage.getSession();
    const res = await apiClient.post<ApiResponse<ItineraryItem>>('/itineraries/ai-quick-generate', payload, {
      params: { email: session?.email },
    });
    return res.data.data;
  },

  async cloneItinerary(id: number): Promise<ItineraryItem> {
    const session = await authStorage.getSession();
    const res = await apiClient.post<ApiResponse<ItineraryItem>>(`/itineraries/${id}/clone`, null, {
      params: { email: session?.email },
    });
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
      return res.data.data;
    } catch (e) {
      return {
        totalItineraries: 128,
        totalPlaces: 84,
        totalPosts: 320,
        totalUsers: 1450,
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
      return ['Đà Lạt', 'Phú Quốc', 'Sa Pa', 'Đà Nẵng & Hội An', 'Mù Cang Chải', 'Ninh Bình'];
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
      const session = await authStorage.getSession();
      const res = await apiClient.get<ApiResponse<ChatRoom[]>>('/chat/rooms', {
        params: { email: session?.email },
      });
      return res.data.data || [];
    } catch (e) {
      console.warn('Chat rooms API fallback', e);
      return [
        {
          id: 'ai-bot',
          name: 'Trợ lý Du lịch AI Wayfare 🤖',
          type: 'AI',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          lastMessage: 'Chào bạn! Tôi có thể giúp gì cho chuyến du lịch sắp tới?',
          lastMessageTime: 'Vừa xong',
          unreadCount: 1,
        },
        {
          id: 'group-dalat',
          name: 'Hội Săn Mây Đà Lạt 2026 🌫️',
          type: 'GROUP',
          avatarUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=200&q=80',
          lastMessage: 'Mọi người đã chuẩn bị áo ấm chưa, mai nhiệt độ xuống 16 độ đấy!',
          lastMessageTime: '10 phút trước',
          unreadCount: 3,
        },
        {
          id: 'group-phuquoc',
          name: 'Kinh Nghiệm Phượt Đảo Phú Quốc 🏖️',
          type: 'GROUP',
          avatarUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=200&q=80',
          lastMessage: 'Hòn Mây Rút nước trong vắt, lặn san hô cực đỉnh luôn.',
          lastMessageTime: '1 giờ trước',
          unreadCount: 0,
        },
      ];
    }
  },

  async getRoomMessages(roomId: number | string): Promise<ChatMessage[]> {
    try {
      const session = await authStorage.getSession();
      const res = await apiClient.get<ApiResponse<ChatMessage[]>>(`/chat/rooms/${roomId}/messages`, {
        params: { email: session?.email },
      });
      return res.data.data || [];
    } catch (e) {
      console.warn('Room messages fallback', e);
      return [
        {
          id: 1,
          roomId,
          senderName: 'Trợ lý AI Wayfare',
          senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          content: 'Xin chào! Tôi là Trợ lý Du lịch thông minh của Wayfare. Bạn muốn tìm địa điểm ăn ngon, lịch trình tiết kiệm hay góc sống ảo ở thành phố nào?',
          createdAt: '10:00',
          isMe: false,
        },
      ];
    }
  },

  async sendMessage(roomId: number | string, content: string): Promise<ChatMessage> {
    const session = await authStorage.getSession();
    try {
      const res = await apiClient.post<ApiResponse<ChatMessage>>(`/chat/rooms/${roomId}/messages`, {
        content,
        messageType: 'TEXT',
      }, {
        params: { email: session?.email },
      });
      return res.data.data;
    } catch (e) {
      // Local mock response if offline / demo
      return {
        id: Date.now(),
        roomId,
        senderName: session?.fullName || 'Tôi',
        senderAvatar: session?.avatar,
        content,
        createdAt: 'Vừa xong',
        isMe: true,
      };
    }
  },

  async createDirectRoom(targetUserId: number): Promise<ChatRoom> {
    const session = await authStorage.getSession();
    const res = await apiClient.post<ApiResponse<ChatRoom>>('/chat/direct', null, {
      params: {
        targetUserId,
        email: session?.email,
      },
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
  async getNotifications(email?: string): Promise<NotificationDto[]> {
    const session = await authStorage.getSession();
    const targetEmail = email || session?.email;
    try {
      const res = await apiClient.get<NotificationDto[]>('/notifications', {
        params: targetEmail ? { email: targetEmail } : undefined,
      });
      return res.data || [];
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
      return [];
    }
  },

  async getUnreadCount(email?: string): Promise<number> {
    const session = await authStorage.getSession();
    const targetEmail = email || session?.email;
    try {
      const res = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count', {
        params: targetEmail ? { email: targetEmail } : undefined,
      });
      return res.data?.unreadCount ?? 0;
    } catch (e) {
      return 0;
    }
  },

  async markAsRead(id: number, email?: string): Promise<NotificationDto | null> {
    const session = await authStorage.getSession();
    const targetEmail = email || session?.email;
    try {
      const res = await apiClient.put<NotificationDto>(`/notifications/${id}/read`, null, {
        params: targetEmail ? { email: targetEmail } : undefined,
      });
      return res.data;
    } catch (e) {
      console.warn(`Failed to mark notification ${id} as read:`, e);
      return null;
    }
  },

  async markAllAsRead(email?: string): Promise<boolean> {
    const session = await authStorage.getSession();
    const targetEmail = email || session?.email;
    try {
      await apiClient.put('/notifications/read-all', null, {
        params: targetEmail ? { email: targetEmail } : undefined,
      });
      return true;
    } catch (e) {
      console.warn('Failed to mark all notifications as read:', e);
      return false;
    }
  },

  async deleteNotification(id: number, email?: string): Promise<boolean> {
    const session = await authStorage.getSession();
    const targetEmail = email || session?.email;
    try {
      await apiClient.delete(`/notifications/${id}`, {
        params: targetEmail ? { email: targetEmail } : undefined,
      });
      return true;
    } catch (e) {
      console.warn(`Failed to delete notification ${id}:`, e);
      return false;
    }
  },
};

export default apiClient;

