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
  SafeAreaView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { authApi, UserAuthData, API_BASE_URL } from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import axios from 'axios';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Form đăng nhập
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Kiểm tra kết nối server
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
      // Gọi endpoint health check hoặc get places
      await axios.get(`${API_BASE_URL}/places`, { timeout: 6000 });
      setPingStatus('success');
      Alert.alert('Kết nối thành công! ✅', `Điện thoại đã kết nối thông suốt với Server tại:\n${API_BASE_URL}`);
    } catch (err: any) {
      setPingStatus('failed');
      Alert.alert(
        'Kết nối thất bại ❌',
        `Không thể kết nối tới:\n${API_BASE_URL}\n\nHãy đảm bảo:\n1. Laptop đã chạy Backend Spring Boot trên port 8081.\n2. Điện thoại và Laptop đang bắt chung 1 mạng Wi-Fi.`
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerBox, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
            <Text style={styles.userEmail}>{user.email}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <FontAwesome name="shield" size={12} color="#0D9488" />
                <Text style={styles.roleText}>{user.roles ? user.roles[0] : 'USER'}</Text>
              </View>
              {user.tier ? (
                <View style={[styles.roleBadge, { backgroundColor: '#FEF3C7' }]}>
                  <FontAwesome name="trophy" size={12} color="#D97706" />
                  <Text style={[styles.roleText, { color: '#B45309' }]}>{user.tier}</Text>
                </View>
              ) : null}
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <FontAwesome name="sign-out" size={16} color="#EF4444" />
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.loginCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.loginHeader}>
              <FontAwesome name="user-circle" size={48} color="#0D9488" />
              <Text style={[styles.loginTitle, { color: theme.text }]}>Đăng nhập Wayfare</Text>
              <Text style={styles.loginSubtitle}>
                Dùng chung tài khoản với Web để đồng bộ lịch trình & bài viết
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="vidu@email.com"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Mật khẩu</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, submitting ? { opacity: 0.7 } : {}]}
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
            <FontAwesome name="server" size={16} color="#0D9488" />
            <Text style={[styles.infoTitle, { color: theme.text }]}>Thông Tin Kết Nối Máy Chủ</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Server Endpoint:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>
              {API_BASE_URL}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.testBtn}
            onPress={handleTestConnection}
            disabled={pingStatus === 'testing'}>
            {pingStatus === 'testing' ? (
              <ActivityIndicator size="small" color="#0D9488" />
            ) : (
              <>
                <FontAwesome
                  name={pingStatus === 'success' ? 'check-circle' : pingStatus === 'failed' ? 'times-circle' : 'refresh'}
                  size={15}
                  color={pingStatus === 'success' ? '#10B981' : pingStatus === 'failed' ? '#EF4444' : '#0D9488'}
                />
                <Text style={styles.testBtnText}>Kiểm tra kết nối Server</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* App Version Info */}
        <View style={styles.versionBox}>
          <Text style={styles.versionText}>Wayfare Mobile Companion App v1.0.0</Text>
          <Text style={styles.versionSub}>Hệ sinh thái Chia sẻ Du lịch (Đồ án Tốt nghiệp)</Text>
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
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  loginCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 10,
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
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
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: '#0D9488',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  infoCard: {
    borderRadius: 16,
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
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  testBtnText: {
    color: '#0D9488',
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
    color: '#94A3B8',
    fontWeight: '600',
  },
  versionSub: {
    fontSize: 12,
    color: '#CBD5E1',
    marginTop: 2,
  },
});
