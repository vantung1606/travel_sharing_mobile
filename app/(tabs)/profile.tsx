import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { authApi, API_BASE_URL } from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import axios from 'axios';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Form đăng nhập
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Ping test
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const session = await authStorage.getSession();
      setUser(session);
    } catch (e) {
      console.warn('Load session error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }

    try {
      setSubmitting(true);
      const authData = await authApi.login(email.trim(), password);
      setUser(authData);
      Alert.alert('Thành công', `Chào mừng trở lại, ${authData.fullName}! 🎉`);
      setPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đăng nhập không thành công';
      Alert.alert('Lỗi đăng nhập', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý',
        style: 'destructive',
        onPress: async () => {
          await authApi.logout();
          setUser(null);
        },
      },
    ]);
  };

  const handleTestConnection = async () => {
    setPingStatus('testing');
    try {
      await axios.get(`${API_BASE_URL}/places`, { timeout: 6000 });
      setPingStatus('success');
      Alert.alert('Kết nối thông suốt! ✅', `Điện thoại đã kết nối thành công với Backend Spring Boot tại:\n${API_BASE_URL}`);
    } catch (err: any) {
      setPingStatus('failed');
      Alert.alert(
        'Chưa kết nối được máy chủ ❌',
        `Không thể gửi request tới:\n${API_BASE_URL}\n\nKiểm tra lại:\n1. Laptop đã mở Backend Spring Boot ở cổng 8081 chưa?\n2. Điện thoại và Laptop có đang cùng bắt chung 1 mạng Wi-Fi không?`
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerBox, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        {user ? (
          <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Image
              source={{
                uri: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
              }}
              style={styles.avatar}
            />
            <Text style={[styles.userName, { color: theme.text }]}>{user.fullName || 'Người dùng Wayfare'}</Text>
            <Text style={[styles.userEmail, { color: theme.textMuted }]}>{user.email}</Text>

            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: theme.badge }]}>
                <FontAwesome name="shield" size={12} color={theme.tint} />
                <Text style={[styles.roleText, { color: theme.tint }]}>{user.roles ? user.roles[0] : 'USER'}</Text>
              </View>
              {user.tier ? (
                <View style={[styles.roleBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <FontAwesome name="trophy" size={12} color="#F59E0B" />
                  <Text style={[styles.roleText, { color: '#F59E0B' }]}>{user.tier}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <FontAwesome name="sign-out" size={15} color="#EF4444" />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.loginCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.loginHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(13, 148, 136, 0.12)' }]}>
                <FontAwesome name="user-circle-o" size={40} color={theme.tint} />
              </View>
              <Text style={[styles.loginTitle, { color: theme.text }]}>Đăng nhập Wayfare</Text>
              <Text style={[styles.loginSubtitle, { color: theme.textMuted }]}>
                Đồng bộ lịch trình và bài viết du lịch của bạn từ Web
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="vidu@email.com"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Mật khẩu</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.primaryBtn, { backgroundColor: theme.tint }, submitting ? { opacity: 0.7 } : {}]}
              onPress={handleLogin}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Server Diagnostic Card */}
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.infoTitleRow}>
            <FontAwesome name="server" size={15} color={theme.tint} />
            <Text style={[styles.infoTitle, { color: theme.text }]}>Kiểm Tra Máy Chủ Backend</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textMuted }]}>API Endpoint Hiện Tại:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>
              {API_BASE_URL}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.testBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
            onPress={handleTestConnection}
            disabled={pingStatus === 'testing'}>
            {pingStatus === 'testing' ? (
              <ActivityIndicator size="small" color={theme.tint} />
            ) : (
              <>
                <FontAwesome
                  name={pingStatus === 'success' ? 'check-circle' : pingStatus === 'failed' ? 'times-circle' : 'refresh'}
                  size={15}
                  color={pingStatus === 'success' ? '#10B981' : pingStatus === 'failed' ? '#EF4444' : theme.tint}
                />
                <Text style={[styles.testBtnText, { color: theme.text }]}>Kiểm tra đường truyền Server</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* App Version Info */}
        <View style={styles.versionBox}>
          <Text style={[styles.versionText, { color: theme.textMuted }]}>Wayfare Mobile v1.0.0</Text>
          <Text style={[styles.versionSub, { color: theme.textMuted, opacity: 0.7 }]}>
            Hệ sinh thái Chia sẻ Du lịch (Đồ án Tốt nghiệp)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 13,
  },
  loginCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  loginTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginTop: 4,
  },
  loginSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  versionBox: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  versionSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
