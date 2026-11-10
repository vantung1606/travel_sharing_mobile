import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { Text, View } from '@/components/Themed';
import { WF_PAPER } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';

export default function NotFoundScreen() {
  useEffect(() => {
    // Nếu vô tình trúng luồng xác thực / oauth / token thì tự động chuyển về Profile
    async function checkAuthFallback() {
      try {
        const url = await Linking.getInitialURL();
        if (url && (url.includes('oauth') || url.includes('token') || url.includes('access_token'))) {
          router.replace('/(tabs)/profile');
        }
      } catch {}
    }
    checkAuthFallback();
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Wayfare', headerBackTitle: 'Quay lại' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Không tìm thấy trang</Text>
        <Text style={styles.subtitle}>
          Liên kết bạn truy cập hiện không khả dụng hoặc đã được thay đổi.
        </Text>

        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.85}
          onPress={() => router.replace('/(tabs)/profile')}
        >
          <Text style={styles.actionBtnText}>Về trang chính</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: WF_PAPER.bg,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    fontFamily: SERIF_FONT,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: WF_PAPER.inkMuted,
    fontFamily: SERIF_FONT,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: WF_PAPER.clay,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: SERIF_FONT,
  },
});
