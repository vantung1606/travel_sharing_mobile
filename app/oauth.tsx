import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/Themed';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { WF_PAPER } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { authApi } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';
import { showToast } from '@/components/Toast';

/**
 * Màn hình xử lý OAuth Deep Link (wayfare://oauth).
 * Ngăn chặn lỗi "This screen doesn't exist" (404 / +not-found) khi đăng nhập Google trên thiết bị thật.
 */
export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    let isMounted = true;

    async function processOAuthDeepLink() {
      try {
        const initialUrl = await Linking.getInitialURL();
        const currentUrl = initialUrl || '';
        let token = (params?.access_token as string) || (params?.id_token as string) || '';

        // Phân tích token từ hash fragment (#)
        if (!token && currentUrl.includes('#')) {
          const fragmentPart = currentUrl.split('#')[1] || '';
          const fragParams = new URLSearchParams(fragmentPart);
          token = fragParams.get('access_token') || fragParams.get('id_token') || '';
        }

        // Phân tích token từ query string (?)
        if (!token && currentUrl.includes('?')) {
          const queryPart = (currentUrl.split('?')[1] || '').split('#')[0];
          const queryParams = new URLSearchParams(queryPart);
          token = queryParams.get('access_token') || queryParams.get('id_token') || '';
        }

        // Nếu có token và chưa lưu phiên đăng nhập
        if (token) {
          const session = await authStorage.getSession();
          if (!session) {
            const user = await authApi.loginWithGoogle(token);
            if (user && isMounted) {
              await authStorage.saveSession(user);
              showToast({
                kind: 'success',
                title: 'Đăng nhập Google thành công',
                message: `Chào mừng ${user.fullName || user.email}!`,
              });
            }
          }
        }
      } catch (err) {
        // startGoogleSignIn trong modal đã xử lý
      } finally {
        if (isMounted) {
          // Tự động chuyển thẳng về trang cá nhân / tài khoản
          setTimeout(() => {
            router.replace('/(tabs)/profile');
          }, 120);
        }
      }
    }

    processOAuthDeepLink();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color={WF_PAPER.clay} />
        <Text style={styles.title}>Đang hoàn tất đăng nhập...</Text>
        <Text style={styles.subtitle}>Chào mừng bạn quay lại với Wayfare!</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WF_PAPER.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    fontFamily: SERIF_FONT,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: WF_PAPER.inkMuted,
    fontFamily: SERIF_FONT,
  },
});
