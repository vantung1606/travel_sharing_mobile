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
import { WF_COLORS } from '@/constants/Colors';
import { authApi, API_BASE_URL } from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import axios from 'axios';

export default function ProfileScreen() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Tab đăng nhập / đăng ký
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState<string>('');
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

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }

    try {
      setSubmitting(true);
      let authData;
      if (authMode === 'login') {
        authData = await authApi.login(email.trim(), password);
        Alert.alert('Thành công! 🎉', `Chào mừng trở lại, ${authData.fullName}!`);
      } else {
        if (!fullName.trim()) {
          Alert.alert('Thông báo', 'Vui lòng nhập Họ và tên để đăng ký');
          return;
        }
        authData = await authApi.register(fullName.trim(), email.trim(), password);
        Alert.alert('Thành công! 🎉', 'Tài khoản của bạn đã được khởi tạo thành công.');
      }
      setUser(authData);
      setPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Thao tác không thành công';
      Alert.alert('Lỗi xác thực', msg);
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
      Alert.alert('Kết nối thông suốt! ✅', `Điện thoại đã kết nối trực tiếp với Cloud Railway:\n${API_BASE_URL}`);
    } catch (err: any) {
      setPingStatus('failed');
      Alert.alert(
        'Chưa kết nối được máy chủ ❌',
        `Không thể gửi request tới:\n${API_BASE_URL}`
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerBox, { backgroundColor: WF_COLORS.slate50 }]}>
        <ActivityIndicator size="large" color={WF_COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Breadcrumb chuẩn Web */}
        <View style={styles.breadcrumbRow}>
          <FontAwesome name="compass" size={12} color={WF_COLORS.primary} />
          <Text style={styles.breadcrumbLink}>Trang chủ</Text>
          <Text style={styles.breadcrumbDivider}>/</Text>
          <Text style={styles.breadcrumbCurrent}>Hồ sơ cá nhân</Text>
        </View>

        {/* 2. User Profile Card (Khi đã đăng nhập) */}
        {user ? (
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <Image
                source={{
                  uri: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                }}
                style={styles.avatar}
              />
              <View style={styles.avatarOnlineDot} />
            </View>

            <Text style={styles.userName}>{user.fullName || 'Thành viên Wayfare'}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <FontAwesome name="shield" size={12} color={WF_COLORS.primary} />
                <Text style={styles.roleText}>{user.roles ? user.roles[0] : 'USER'}</Text>
              </View>
              <View style={styles.tierBadge}>
                <FontAwesome name="trophy" size={12} color="#D97706" />
                <Text style={styles.tierText}>{user.tier || 'Lữ Hành Bạc'}</Text>
              </View>
            </View>

            {/* User Travel Stats chuẩn Web */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>4</Text>
                <Text style={styles.statLabel}>Chuyến đi</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>12</Text>
                <Text style={styles.statLabel}>Bài viết</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNum}>28</Text>
                <Text style={styles.statLabel}>Đã lưu</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <FontAwesome name="sign-out" size={15} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Form Đăng nhập / Đăng ký */
          <View style={styles.authCard}>
            <View style={styles.authTabs}>
              <TouchableOpacity
                style={[styles.authTabBtn, authMode === 'login' && styles.authTabBtnActive]}
                onPress={() => setAuthMode('login')}>
                <Text style={[styles.authTabBtnText, authMode === 'login' && styles.authTabBtnTextActive]}>
                  Đăng nhập
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTabBtn, authMode === 'register' && styles.authTabBtnActive]}
                onPress={() => setAuthMode('register')}>
                <Text style={[styles.authTabBtnText, authMode === 'register' && styles.authTabBtnTextActive]}>
                  Đăng ký mới
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.authSubtitle}>
              {authMode === 'login'
                ? 'Dùng chung tài khoản với Web để đồng bộ lịch trình & bài viết du lịch'
                : 'Tạo tài khoản thành viên Wayfare để khám phá và lập kế hoạch chuyến đi'}
            </Text>

            {authMode === 'register' ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Họ và tên *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor={WF_COLORS.slate400}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="vidu@email.com"
                placeholderTextColor={WF_COLORS.slate400}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu *</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={WF_COLORS.slate400}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.authSubmitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleAuth}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.authSubmitBtnText}>
                  {authMode === 'login' ? 'Đăng nhập vào Wayfare' : 'Đăng ký tài khoản'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Server Connection Status Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoTitleRow}>
            <FontAwesome name="cloud" size={15} color={WF_COLORS.primary} />
            <Text style={styles.infoTitle}>Máy Chủ Cloud Railway</Text>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineBadgeText}>LIVE</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Endpoint:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {API_BASE_URL}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.testBtn}
            onPress={handleTestConnection}
            disabled={pingStatus === 'testing'}>
            {pingStatus === 'testing' ? (
              <ActivityIndicator size="small" color={WF_COLORS.primary} />
            ) : (
              <>
                <FontAwesome
                  name={pingStatus === 'success' ? 'check-circle' : pingStatus === 'failed' ? 'times-circle' : 'refresh'}
                  size={14}
                  color={pingStatus === 'success' ? WF_COLORS.emerald : pingStatus === 'failed' ? '#EF4444' : WF_COLORS.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.testBtnText}>Kiểm tra đường truyền Server</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.versionBox}>
          <Text style={styles.versionText}>Wayfare Mobile v1.0.0</Text>
          <Text style={styles.versionSub}>Hệ sinh thái Chia sẻ Du lịch (Đồng bộ 100% Web)</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WF_COLORS.slate50,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  breadcrumbLink: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate500,
  },
  breadcrumbDivider: {
    fontSize: 12,
    color: WF_COLORS.slate400,
  },
  breadcrumbCurrent: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  profileCard: {
    backgroundColor: WF_COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: WF_COLORS.primaryLight,
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: WF_COLORS.emerald,
    borderWidth: 2,
    borderColor: WF_COLORS.white,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: WF_COLORS.slate500,
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
    gap: 4,
    backgroundColor: WF_COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WF_COLORS.amberLight,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: WF_COLORS.slate100,
    marginBottom: 18,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  statLabel: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: WF_COLORS.slate200,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  // Auth Form
  authCard: {
    backgroundColor: WF_COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  authTabs: {
    flexDirection: 'row',
    backgroundColor: WF_COLORS.slate100,
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  authTabBtnActive: {
    backgroundColor: WF_COLORS.white,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  authTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: WF_COLORS.slate500,
  },
  authTabBtnTextActive: {
    color: WF_COLORS.primary,
    fontWeight: '700',
  },
  authSubtitle: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate700,
    marginBottom: 5,
  },
  input: {
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: WF_COLORS.slate900,
  },
  authSubmitBtn: {
    backgroundColor: WF_COLORS.primary,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: WF_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  authSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: WF_COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    padding: 16,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    flex: 1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WF_COLORS.emeraldLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WF_COLORS.emerald,
  },
  onlineBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 11,
    color: WF_COLORS.slate400,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_COLORS.slate100,
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  testBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate700,
  },
  versionBox: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate400,
  },
  versionSub: {
    fontSize: 11,
    color: WF_COLORS.slate400,
    marginTop: 2,
  },
});
