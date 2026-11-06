import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { WF_COLORS, WF_PAPER } from '@/constants/Colors';

const RNWebView: any = WebView;

const GOOGLE_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  '340055145050-thlfrv3nl1j1jcahh75n8inr8v5j4574.apps.googleusercontent.com';

// Authorized redirect URI configured in Google Cloud Console
const GOOGLE_REDIRECT_URI = 'http://localhost:5173';

const MOBILE_USER_AGENT =
  Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

interface GoogleOAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  onError?: (errorMessage: string) => void;
}

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

export function GoogleOAuthModal({
  visible,
  onClose,
  onSuccess,
  onError,
}: GoogleOAuthModalProps) {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<any>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (visible) {
      handledRef.current = false;
      setLoading(true);
      setHasError(false);
    }
  }, [visible]);

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    GOOGLE_CLIENT_ID
  )}&redirect_uri=${encodeURIComponent(
    GOOGLE_REDIRECT_URI
  )}&response_type=token%20id_token&scope=openid%20profile%20email&nonce=wayfare_${Date.now()}`;

  const parseTokenFromUrl = useCallback(
    (url: string): string | null => {
      if (!url) return null;
      try {
        if (
          url.startsWith(GOOGLE_REDIRECT_URI) ||
          url.includes('access_token=') ||
          url.includes('id_token=')
        ) {
          const fragment = url.includes('#')
            ? url.split('#')[1]
            : url.split('?')[1] || '';
          const params = new URLSearchParams(fragment);
          return params.get('id_token') || params.get('access_token') || null;
        }
      } catch (e) {
        console.warn('Error parsing Google OAuth token from URL:', e);
      }
      return null;
    },
    []
  );

  const handleInterceptUrl = useCallback(
    (url: string) => {
      if (handledRef.current) return false;
      const token = parseTokenFromUrl(url);
      if (token) {
        handledRef.current = true;
        onSuccess(token);
        return false;
      }
      return true;
    },
    [parseTokenFromUrl, onSuccess]
  );

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    if (navState.loading) {
      setLoading(true);
    } else {
      setLoading(false);
    }
    handleInterceptUrl(navState.url);
  };

  const handleShouldStartLoad = (request: any) => {
    const shouldLoad = handleInterceptUrl(request.url);
    return shouldLoad;
  };

  // If on Web, GoogleOAuthModal is not needed (handled by triggerGoogleWebAuth)
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" />

        {/* Modal Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Đóng xác thực Google"
          >
            <Ionicons name="close" size={24} color={WF_PAPER.inkPrimary} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle} numberOfLines={1}>
              Đăng nhập Google
            </Text>
          </View>

          <View style={styles.headerRight}>
            {loading && <ActivityIndicator size="small" color={WF_COLORS.primary} />}
          </View>
        </View>

        {/* Security / SSL Bar */}
        <View style={styles.securityBar}>
          <Ionicons name="lock-closed" size={13} color="#16A34A" style={{ marginRight: 5 }} />
          <Text style={styles.securityText}>
            Xác thực tài khoản chính thức qua accounts.google.com
          </Text>
        </View>

        {/* Error Screen */}
        {hasError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EA4335" />
            <Text style={styles.errorTitle}>Không thể tải trang đăng nhập Google</Text>
            <Text style={styles.errorSubtitle}>
              Vui lòng kiểm tra lại kết nối Internet và thử lại.
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setHasError(false);
                setLoading(true);
                webViewRef.current?.reload();
              }}
            >
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.webViewWrapper}>
            <RNWebView
              ref={webViewRef}
              source={{ uri: authUrl }}
              userAgent={MOBILE_USER_AGENT}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={WF_COLORS.primary} />
                  <Text style={styles.loadingText}>Đang kết nối Google...</Text>
                </View>
              )}
              onNavigationStateChange={handleNavigationStateChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              onError={(e: any) => {
                // If it failed because it tried to load localhost:5173 with token, parse URL
                if (e.nativeEvent?.url) {
                  const token = parseTokenFromUrl(e.nativeEvent.url);
                  if (token) {
                    handledRef.current = true;
                    onSuccess(token);
                    return;
                  }
                }
                setLoading(false);
                setHasError(true);
                if (onError) onError(e.nativeEvent?.description || 'Lỗi tải WebView Google');
              }}
              incognito={false}
              sharedCookiesEnabled={true}
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WF_PAPER.cardBorder,
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
  },
  headerRight: {
    width: 32,
    alignItems: 'center',
  },
  securityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#BBF7D0',
  },
  securityText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '500',
  },
  webViewWrapper: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: WF_PAPER.inkMuted,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: WF_PAPER.inkMuted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 24,
    backgroundColor: WF_COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
