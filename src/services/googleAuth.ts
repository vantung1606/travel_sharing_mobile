import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { authApi, UserAuthData } from '@/src/services/api';

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '340055145050-thlfrv3nl1j1jcahh75n8inr8v5j4574.apps.googleusercontent.com';

// Authorized Web Redirect URI configured on Google Cloud Console
const GOOGLE_AUTHORIZED_WEB_REDIRECT_URI = 'http://localhost:5173';
const GOOGLE_AUTHORIZED_NATIVE_REDIRECT_URI =
  'https://travelsharingfrontend-production.up.railway.app';

/**
 * Start Google Sign-In on Native & Web.
 * 
 * - Web Platform (localhost:8081, localhost:8082, etc.):
 *   Mở cửa sổ popup OAuth 2.0 hướng về redirect_uri: http://localhost:5173 (đã được cấp phép 100%
 *   trong Google Cloud Console). Bridge trên cổng 5173 sẽ tự động chuyển token về form điện thoại
 *   qua window.opener.postMessage và tự đóng popup. Tránh hoàn toàn lỗi Error 400: origin_mismatch!
 * 
 * - Native Platform (Android / iOS):
 *   Sử dụng Custom Chrome Tabs / ASWebAuthenticationSession theo đúng chính sách bảo mật của Google,
 *   tránh lỗi 403 disallowed_useragent và quay về app qua deep link scheme (wayfare://oauth).
 */
export async function startGoogleSignIn(): Promise<UserAuthData | null> {
  // ─── 1. WEB PLATFORM (Expo Web / localhost:8081 / localhost:8082) ────────
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return new Promise<UserAuthData | null>((resolve, reject) => {
      try {
        const width = 500;
        const height = 620;
        const left = (window.screen?.width ? (window.screen.width - width) / 2 : 200) + (window.screenX || 0);
        const top = (window.screen?.height ? (window.screen.height - height) / 2 : 100) + (window.screenY || 0);

        // Mở cầu nối xác thực OAuth Bridge trên cổng 5173 (Origin đã được cấu hình trong Google Cloud Console)
        // Điều này đảm bảo origin mở popup là http://localhost:5173, giải quyết triệt để lỗi Error 400: origin_mismatch
        const bridgeUrl = `${GOOGLE_AUTHORIZED_WEB_REDIRECT_URI}/oauth-bridge.html?parent=${encodeURIComponent(
          window.location.origin
        )}`;

        const popup = window.open(
          bridgeUrl,
          'google_oauth_popup',
          `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
        );

        if (!popup) {
          reject(
            new Error(
              'Trình duyệt đã chặn mở cửa sổ Popup. Vui lòng cho phép popup trong cài đặt trình duyệt để tiếp tục đăng nhập Google.'
            )
          );
          return;
        }

        let settled = false;

        const handleMessage = async (event: MessageEvent) => {
          if (event.data?.type === 'WAYFARE_GOOGLE_AUTH_SUCCESS' && event.data?.token) {
            if (settled) return;
            settled = true;
            window.removeEventListener('message', handleMessage);
            clearInterval(checkInterval);
            try {
              const user = await authApi.loginWithGoogle(event.data.token);
              resolve(user);
            } catch (err) {
              reject(err);
            }
          }
        };

        window.addEventListener('message', handleMessage);

        const checkInterval = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkInterval);
            window.removeEventListener('message', handleMessage);
            if (!settled) {
              settled = true;
              resolve(null); // Người dùng đã tắt popup khi chưa chọn tài khoản
            }
          }
        }, 800);
      } catch (e: any) {
        reject(new Error(e.message || 'Lỗi khi khởi chạy đăng nhập Google trên web.'));
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

    // Bổ sung prompt=select_account để Google luôn hiển thị danh sách tài khoản ngay tức thì,
    // tránh tình trạng treo phiên cookie cũ hoặc tự động quay vòng vô hạn.
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      GOOGLE_CLIENT_ID.trim()
    )}&redirect_uri=${encodeURIComponent(
      GOOGLE_AUTHORIZED_NATIVE_REDIRECT_URI
    )}&response_type=token%20id_token&scope=openid%20profile%20email&prompt=select_account&state=${stateParam}&nonce=wayfare_${Date.now()}`;

    // Đặt cơ chế Promise.race với timeout an toàn 75s để không bao giờ bị kẹt vòng xoay loading vô hạn
    const authSessionPromise = WebBrowser.openAuthSessionAsync(authUrl, appReturnUrl);
    const timeoutPromise = new Promise<WebBrowser.WebBrowserAuthSessionResult>((resolve) => {
      setTimeout(() => {
        resolve({ type: 'dismiss' } as any);
      }, 75000);
    });

    const result = await Promise.race([authSessionPromise, timeoutPromise]);

    if (result.type === 'success' && result.url) {
      const rawUrl = result.url;
      let token = '';

      // 1. Phân tích token từ hash fragment (#)
      if (rawUrl.includes('#')) {
        const fragmentPart = rawUrl.split('#')[1] || '';
        const fragParams = new URLSearchParams(fragmentPart);
        token = fragParams.get('id_token') || fragParams.get('access_token') || '';
      }

      // 2. Dự phòng phân tích từ query string (?) nếu fragment không chứa token
      if (!token && rawUrl.includes('?')) {
        const queryPart = (rawUrl.split('?')[1] || '').split('#')[0];
        const queryParams = new URLSearchParams(queryPart);
        token = queryParams.get('id_token') || queryParams.get('access_token') || '';
      }

      if (token) {
        const user = await authApi.loginWithGoogle(token);
        return user;
      }
      throw new Error('Không nhận diện được chứng chỉ xác thực Google từ phản hồi.');
    }

    // Người dùng đóng trình duyệt hoặc hết hạn phiên chờ
    return null;
  } finally {
    try {
      await WebBrowser.coolDownAsync();
    } catch {}
  }
}
