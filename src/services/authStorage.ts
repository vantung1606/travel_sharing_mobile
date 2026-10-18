import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'wayfare_mobile_user';
const TOKEN_KEY = 'wayfare_mobile_token';

export interface UserSession {
  id?: number;
  email?: string;
  fullName?: string;
  role?: string;
  avatarUrl?: string;
  token?: string;
  [key: string]: any;
}

type AuthListener = (session: UserSession | null) => void;
type UnauthorizedListener = () => void;

let sessionListeners: AuthListener[] = [];
let unauthorizedListeners: UnauthorizedListener[] = [];

export const authStorage = {
  subscribe(listener: AuthListener): () => void {
    sessionListeners.push(listener);
    return () => {
      sessionListeners = sessionListeners.filter((l) => l !== listener);
    };
  },

  onUnauthorized(listener: UnauthorizedListener): () => void {
    unauthorizedListeners.push(listener);
    return () => {
      unauthorizedListeners = unauthorizedListeners.filter((l) => l !== listener);
    };
  },

  notifyUnauthorized(): void {
    unauthorizedListeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.warn('Error in unauthorized listener', e);
      }
    });
  },

  async saveSession(user: UserSession, token?: string): Promise<void> {
    try {
      const finalToken = token || user.token;
      if (finalToken) {
        await AsyncStorage.setItem(TOKEN_KEY, finalToken);
      }
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      sessionListeners.forEach((cb) => {
        try {
          cb(user);
        } catch (e) {
          console.warn('Error in session listener', e);
        }
      });
    } catch (e) {
      console.error('Error saving user session', e);
    }
  },

  async getSession(): Promise<UserSession | null> {
    try {
      const raw = await AsyncStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Error getting user session', e);
      return null;
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error('Error getting token', e);
      return null;
    }
  },

  async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      await AsyncStorage.removeItem(TOKEN_KEY);
      sessionListeners.forEach((cb) => {
        try {
          cb(null);
        } catch (e) {
          console.warn('Error in session listener', e);
        }
      });
    } catch (e) {
      console.error('Error clearing session', e);
    }
  }
};
