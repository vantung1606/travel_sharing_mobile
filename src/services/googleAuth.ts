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
 * Đảm bảo Google Identity Services (GIS SDK) đã được tải trên trình duyệt Web.
 */
function ensureGoogleGsiLoaded(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    const win = window as any;
    if (win.google?.accounts) return resolve();

    const existingScript = document.getElementById('google-gsi-client');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () =>
        reject(new Error('Không thể tải Google Identity Services SDK'))
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Không thể tải Google Identity Services SDK. Kiểm tra kết nối mạng.'));
    document.head.appendChild(script);
  });
}

/**
 * Start Google Sign-In on Native & Web.
 * 
 * - Web Platform: Sử dụng Google Identity Services (GIS SDK `initTokenClient`) trực tiếp.
 *   Google mở popup chọn tài khoản và trả token thẳng về trang gọi (form điện thoại),
 *   đăng nhập ngay tức thì mà không điều hướng sang trang web khác.
 * 
 * - Native Platform (Android / iOS): Sử dụng Custom Chrome Tabs / ASWebAuthenticationSession
 *   theo đúng chuẩn bảo mật của Google (tránh 403 disallowed_useragent) và quay về app qua deep link.
 */
export async function startGoogleSignIn(): Promise<UserAuthData | null> {
  // ─── 1. WEB PLATFORM (Expo Web / Trình duyệt máy tính / Mobile Web) ───────
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    await ensureGoogleGsiLoaded();
    const win = window as any;

    return new Promise<UserAuthData | null>((resolve, reject) => {
      try {
        if (win.google?.accounts?.oauth2?.initTokenClient) {
          const tokenClient = win.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID.trim(),
            scope: 'email profile openid',
            callback: async (tokenResponse: any) => {
              if (tokenResponse.error) {
                const desc = tokenResponse.error_description || tokenResponse.error;
                if (desc.includes('origin_mismatch') || desc.includes('400')) {
                  reject(
                    new Error(
                      `Nguồn gốc ${window.location.origin} chưa được cấp phép trong Google Cloud Console. Vui lòng thêm ${window.location.origin} vào "Authorized JavaScript origins" hoặc chạy web trên cổng 5173.`
                    )
                  );
                } else if (tokenResponse.error === 'popup_closed_by_user') {
                  resolve(null);
                } else {
                  reject(new Error(`Đăng nhập Google thất bại: ${desc}`));
                }
                return;
              }

              const token = tokenResponse.access_token || tokenResponse.id_token;
              if (token) {
                try {
                  const user = await authApi.loginWithGoogle(token);
                  resolve(user);
                } catch (apiErr) {
                  reject(apiErr);
                }
              } else {
                reject(new Error('Không nhận được mã xác thực từ Google.'));
              }
            },
          });

          tokenClient.requestAccessToken();
        } else if (win.google?.accounts?.id) {
          // Fallback One-tap / Prompt
          win.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID.trim(),
            callback: async (res: any) => {
              if (res.credential) {
                try {
                  const user = await authApi.loginWithGoogle(res.credential);
                  resolve(user);
                } catch (e) {
                  reject(e);
                }
              } else {
                reject(new Error('Không nhận được chứng chỉ xác thực từ Google.'));
              }
            },
          });
          win.google.accounts.id.prompt();
        } else {
          reject(new Error('Trình duyệt chưa sẵn sàng cho Google Sign-In SDK.'));
        }
      } catch (err: any) {
        reject(new Error(err.message || 'Lỗi khi khởi chạy Google Sign-In trên web.'));
      }
    });
  }

  // ─── 2. NATIVE PLATFORM (Android / iOS) ──────────────────────────────────
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
