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
  authorName?: string;
  authorAvatar?: string;
  category?: string;
  locationName?: string;
  coverImage?: string;
  images?: string[];
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  createdAt?: string;
}

export interface ItineraryItem {
  id: number;
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  daysCount?: number;
  budget?: number;
  status?: string;
  coverImage?: string;
  authorName?: string;
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
  startDate?: string;
  endDate?: string;
  budgetTotal?: number;
  status?: string;
  coverImageUrl?: string;
  creatorName?: string;
  creatorAvatar?: string;
  creatorEmail?: string;
  details?: ItineraryDetailItem[];
}

export interface CreateItineraryPayload {
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  budgetTotal?: number;
  coverImageUrl?: string;
  status?: string;
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

export default apiClient;
