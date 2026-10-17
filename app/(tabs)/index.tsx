import React from 'react';
import { Redirect } from 'expo-router';

/**
 * Trang chủ cũ - Tự động chuyển hướng ngay sang Bảng tin Cộng đồng (Feed giống Facebook)
 */
export default function IndexScreen() {
  return <Redirect href="/(tabs)/community" />;
}
