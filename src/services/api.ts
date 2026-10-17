import axios from 'axios';
import { authStorage } from './authStorage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.190:8081/api';

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
};

export default apiClient;
