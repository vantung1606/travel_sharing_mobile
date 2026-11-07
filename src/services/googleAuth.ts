import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authApi, UserAuthData } from '@/src/services/api';

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '340055145050-thlfrv3nl1j1jcahh75n8inr8v5j4574.apps.googleusercontent.com';

// Authorized Web Redirect URI configured on Google Cloud Console
const GOOGLE_AUTHORIZED_REDIRECT_URI =
  'https://travelsharingfrontend-production.up.railway.app';

/**
 * Trigger Google OAuth on Web platform using Google Identity Services (GIS).
 */
export function triggerGoogleWebAuth(
  onSuccess: (token: string) => void,
  onError: (errorMsg: string) => void
) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  const win = window as any;

  const runGis = () => {
    try {
      if (win.google?.accounts?.oauth2?.initTokenClient) {
        const tokenClient = win.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID.trim(),
          scope: 'email profile openid',
          callback: (res: any) => {
            if (res.error) {
              onError(res.error_description || res.error || 'Đăng nhập Google bị hủy hoặc thất bại');
              return;
            }
            if (res.access_token) {
              onSuccess(res.access_token);
            } else {
              onError('Không nhận được mã xác thực từ Google');
            }
          },
        });
        tokenClient.requestAccessToken();
      } else if (win.google?.accounts?.id) {
        win.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID.trim(),
          callback: (res: any) => {
            if (res.credential) {
              onSuccess(res.credential);
            } else {
              onError('Không nhận được chứng chỉ xác thực từ Google');
            }
          },
        });
        win.google.accounts.id.prompt();
      } else {
        onError('Trình duyệt chưa sẵn sàng cho Google Sign-In');
      }
    } catch (e: any) {
      onError(e.message || 'Lỗi khi khởi chạy Google Sign-In trên web');
    }
  };

  if (!win.google?.accounts) {
    const existingScript = document.getElementById('google-gsi-client');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => runGis();
      script.onerror = () => onError('Không thể tải Google Identity Services SDK');
      document.head.appendChild(script);
    } else {
      setTimeout(runGis, 500);
    }
  } else {
    runGis();
  }
}

/**
 * Start Google Sign-In on Native & Web.
 * Uses official system browser (Custom Chrome Tabs / ASWebAuthenticationSession) on Native
 * to guarantee that Google never blocks the request (avoids 403 disallowed_useragent).
 */
export async function startGoogleSignIn(): Promise<UserAuthData | null> {
  // Web platform: use official GIS popup
  if (Platform.OS === 'web') {
    return new Promise<UserAuthData | null>((resolve, reject) => {
      triggerGoogleWebAuth(
        async (token: string) => {
          try {
            const user = await authApi.loginWithGoogle(token);
            resolve(user);
          } catch (err) {
            reject(err);
          }
        },
        (errMsg: string) => {
          reject(new Error(errMsg));
        }
      );
    });
  }

  // Native (Android / iOS): Use system browser via Custom Tabs to comply with Google Security Policy
  try {
    await WebBrowser.warmUpAsync();
  } catch {}

  try {
    const appReturnUrl = Linking.createURL('oauth');
    const stateParam = encodeURIComponent(appReturnUrl);

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      GOOGLE_CLIENT_ID.trim()
    )}&redirect_uri=${encodeURIComponent(
      GOOGLE_AUTHORIZED_REDIRECT_URI
    )}&response_type=token%20id_token&scope=openid%20profile%20email&state=${stateParam}&nonce=wayfare_${Date.now()}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, appReturnUrl);

    if (result.type === 'success' && result.url) {
      const rawUrl = result.url;
      const fragment = rawUrl.includes('#')
        ? rawUrl.split('#')[1]
        : rawUrl.split('?')[1] || '';
      const params = new URLSearchParams(fragment);
      const token = params.get('id_token') || params.get('access_token');

      if (token) {
        const user = await authApi.loginWithGoogle(token);
        return user;
      }
      throw new Error('Không nhận diện được chứng chỉ xác thực Google từ phản hồi.');
    }

    // User canceled or dismissed the browser
    return null;
  } finally {
    try {
      await WebBrowser.coolDownAsync();
    } catch {}
  }
}
