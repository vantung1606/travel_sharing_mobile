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

export const authStorage = {
  async saveSession(user: UserSession, token?: string): Promise<void> {
    try {
      const finalToken = token || user.token;
      if (finalToken) {
        await AsyncStorage.setItem(TOKEN_KEY, finalToken);
      }
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
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
    } catch (e) {
      console.error('Error clearing session', e);
    }
  }
};
