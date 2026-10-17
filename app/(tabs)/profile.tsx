import React, { useEffect, useState, useCallback } from 'react';
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
  Modal,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WF_COLORS } from '@/constants/Colors';
import {
  authApi,
  userApi,
  postApi,
  itineraryApi,
  uploadApi,
  UserProfileItem,
  PostItem,
  ItineraryItem,
  UpdateProfilePayload,
} from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import {
  TIERS,
  calculateUserXP,
  getUserTier,
  getNextTier,
  calculateTierProgress,
  TierItem,
} from '@/src/utils/tierSystem';
import { FollowModal } from '@/components/FollowModal';
import { ItineraryDetailModal } from '@/components/ItineraryDetailModal';

const { width } = Dimensions.get('window');

const TRAVEL_STYLES = [
  'Khám phá tự do',
  'Phượt mạo hiểm',
  'Nghỉ dưỡng & Spa',
  'Foodie ẩm thực',
  'Khám phá văn hóa',
  'Check-in sống ảo',
  'Du lịch chữa lành',
];

const BUDGET_PREFERENCES = ['Tiết kiệm', 'Linh hoạt', 'Cao cấp'];

export type ProfileTab = 'itineraries' | 'posts' | 'ai-dna' | 'saved' | 'badges';

export default function ProfileScreen() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [profileData, setProfileData] = useState<UserProfileItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Active sub-tab: 5 tabs matching web
  const [activeTab, setActiveTab] = useState<ProfileTab>('itineraries');

  // Bookmarked posts
  const [savedPosts, setSavedPosts] = useState<PostItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);

  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editHandle, setEditHandle] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editTravelStyle, setEditTravelStyle] = useState<string>('Khám phá tự do');
  const [editBudget, setEditBudget] = useState<string>('Linh hoạt');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);

  // Auth form (when logged out)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authFullName, setAuthFullName] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [submittingAuth, setSubmittingAuth] = useState<boolean>(false);

  // Follow Modal state (Xem danh sách người theo dõi / đang theo dõi)
  const [followModalVisible, setFollowModalVisible] = useState<boolean>(false);
  const [followModalInitialTab, setFollowModalInitialTab] = useState<'followers' | 'following'>('followers');

  // Itinerary Detail Modal state (Xem chi tiết chuyến đi)
  const [selectedItinerary, setSelectedItinerary] = useState<ItineraryItem | null>(null);
  const [itineraryDetailVisible, setItineraryDetailVisible] = useState<boolean>(false);

  const loadProfile = useCallback(async () => {
    try {
      const session = await authStorage.getSession();
      setUser(session);
      if (session?.token) {
        try {
          const live = await userApi.getMyProfile();
          if (live) {
            setProfileData(live);
            setEditFullName(live.fullName || session.fullName || '');
            setEditHandle(live.handle || session.handle || '');
            setEditBio(live.bio || '');
            setEditPhone(live.phoneNumber || live.phone || '');
            setEditTravelStyle(live.travelStyle || 'Khám phá tự do');
            setEditBudget(live.budgetPreference || 'Linh hoạt');
            setEditAvatarUrl(live.avatarUrl || session.avatar || '');
          }
        } catch (pe) {
          console.warn('Could not fetch live profile from MySQL', pe);
        }
      }
    } catch (e) {
      console.warn('Load session error', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load saved posts when switching to 'saved' tab
  useEffect(() => {
    if (activeTab === 'saved' && user?.token) {
      loadSavedPosts();
    }
  }, [activeTab, user?.token]);

  const loadSavedPosts = async () => {
    try {
      setLoadingSaved(true);
      const res = await postApi.getBookmarkedPosts();
      setSavedPosts(res);
    } catch (err) {
      console.warn('Could not load saved posts', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    if (activeTab === 'saved') {
      await loadSavedPosts();
    }
  };

  // ─── AUTH HANDLERS ──────────────────────────────────────────
  const handleAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email và Mật khẩu');
      return;
    }

    try {
      setSubmittingAuth(true);
      let authData: UserSession;
      if (authMode === 'login') {
        authData = await authApi.login(authEmail.trim(), authPassword);
        Alert.alert('Thành công! 🎉', `Chào mừng trở lại, ${authData.fullName}!`);
      } else {
        if (!authFullName.trim()) {
          Alert.alert('Thông báo', 'Vui lòng nhập Họ và tên để đăng ký');
          return;
        }
        authData = await authApi.register(authFullName.trim(), authEmail.trim(), authPassword);
        Alert.alert('Thành công! 🎉', 'Tài khoản của bạn đã được khởi tạo thành công.');
      }
      setUser(authData);
      setAuthPassword('');
      loadProfile();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Thao tác không thành công';
      Alert.alert('Lỗi xác thực', msg);
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setSubmittingAuth(true);
      const redirectUri = Linking.createURL('oauth');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=340055145050-thlfrv3nl1j1jcahh75n8inr8v5j4574.apps.googleusercontent.com&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token%20id_token&scope=openid%20profile%20email&nonce=wayfare_${Date.now()}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success' && result.url) {
        const urlPart = result.url.includes('#') ? result.url.split('#')[1] : result.url.split('?')[1] || '';
        const params = new URLSearchParams(urlPart);
        const token = params.get('id_token') || params.get('access_token');
        if (token) {
          const session = await authApi.loginWithGoogle(token);
          setUser(session);
          Alert.alert('Thành công! 🎉', `Đăng nhập Google thành công, xin chào ${session.fullName}!`);
          loadProfile();
          return;
        }
      }
      Alert.alert('Đăng nhập Google', 'Xác thực qua Google chưa hoàn tất hoặc trình duyệt đã đóng.');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể đăng nhập Google lúc này.');
    } finally {
      setSubmittingAuth(false);
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
          setProfileData(null);
          setSavedPosts([]);
        },
      },
    ]);
  };

  // ─── EDIT PROFILE HANDLER ──────────────────────────────────
  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      Alert.alert('Thông báo', 'Họ và tên không được để trống!');
      return;
    }
    try {
      setIsSavingProfile(true);
      const payload: UpdateProfilePayload = {
        fullName: editFullName.trim(),
        handle: editHandle.trim(),
        bio: editBio.trim(),
        phoneNumber: editPhone.trim(),
        travelStyle: editTravelStyle,
        budgetPreference: editBudget,
        avatarUrl: editAvatarUrl.trim() || undefined,
      };

      const updated = await userApi.updateProfile(payload);
      if (updated) {
        setProfileData((prev) => (prev ? { ...prev, ...updated } : updated));
        // Also update local session
        if (user) {
          const newSession: UserSession = {
            ...user,
            fullName: updated.fullName || user.fullName,
            handle: updated.handle || user.handle,
            avatar: updated.avatarUrl || user.avatar,
          };
          await authStorage.saveSession(newSession);
          setUser(newSession);
        }
        setIsEditModalOpen(false);
        Alert.alert('Thành công! 🎉', 'Đã lưu thông tin hồ sơ của bạn vào cơ sở dữ liệu!');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi cập nhật hồ sơ';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─── DEVICE IMAGE PICKERS (AVATAR & COVER) ────────────────
  const handlePickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để chọn ảnh đại diện!');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setIsUploadingAvatar(true);
        const uploaded = await uploadApi.uploadSingle(res.assets[0].uri);
        if (uploaded) {
          setEditAvatarUrl(uploaded);
          await userApi.updateProfile({ avatarUrl: uploaded });
          setProfileData((prev) => (prev ? { ...prev, avatarUrl: uploaded } : prev));
          if (user) {
            const newSession = { ...user, avatar: uploaded };
            await authStorage.saveSession(newSession);
            setUser(newSession);
          }
          Alert.alert('Thành công! 🎉', 'Đã tải ảnh đại diện từ thiết bị lên máy chủ thành công!');
        }
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể tải ảnh đại diện: ' + (err.message || 'Vui lòng thử lại'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePickCover = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để đổi ảnh bìa!');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setIsUploadingCover(true);
        const uploaded = await uploadApi.uploadSingle(res.assets[0].uri);
        if (uploaded) {
          await userApi.updateProfile({ coverImageUrl: uploaded });
          setProfileData((prev) => (prev ? { ...prev, coverImageUrl: uploaded } : prev));
          Alert.alert('Thành công! 📸', 'Đã cập nhật ảnh bìa mới từ thiết bị thành công!');
        }
      }
    } catch (err: any) {
      Alert.alert('Lỗi', 'Không thể tải ảnh bìa: ' + (err.message || 'Vui lòng thử lại'));
    } finally {
      setIsUploadingCover(false);
    }
  };

  // ─── DELETE ITINERARY HANDLER ───────────────────────────────
  const handleDeleteItinerary = (itin: ItineraryItem) => {
    Alert.alert(
      'Xóa lịch trình',
      `Bạn có chắc chắn muốn xóa chuyến đi "${itin.title}" khỏi kho cá nhân của bạn không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await itineraryApi.deleteItinerary(itin.id);
              Alert.alert('Thành công', 'Đã xóa lịch trình thành công.');
              loadProfile();
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa lịch trình này.');
            }
          },
        },
      ]
    );
  };

  // ─── PRESTIGE TIER CALCULATION ─────────────────────────────
  const displayPosts = profileData?.posts || [];
  const displayItineraries = profileData?.itineraries || [];
  const itinsCount = displayItineraries.length;
  const postsCount = displayPosts.length;
  const activeFollowersCount = profileData?.followersCount || 0;
  const activeFollowingCount = profileData?.followingCount || 0;

  // Total likes received from all user posts
  const totalLikesReceived = React.useMemo(() => {
    return displayPosts.reduce((acc, p) => acc + (p.likeCount ?? p.likesCount ?? 0), 0);
  }, [displayPosts]);

  const userTotalXP = calculateUserXP({
    itinsCount,
    postsCount,
    followersCount: activeFollowersCount,
  });

  const currentTier: TierItem = getUserTier({
    ...user,
    ...profileData,
    tier: profileData?.tier,
    totalXp: userTotalXP,
  });

  const nextTier: TierItem | null = getNextTier(currentTier);
  const progressPercent: number = calculateTierProgress(userTotalXP, currentTier, nextTier);

  // Historic achievements matching web
  const achievements = [
    {
      title: 'Tác Giả Cộng Đồng',
      icon: '✍️',
      desc: postsCount >= 5 ? `Đã đăng ${postsCount} bài viết chia sẻ` : `Đã đăng ${postsCount}/5 bài viết`,
      date: postsCount > 0 ? 'Đang hoạt động' : 'Chưa mở khóa',
      unlocked: postsCount >= 5,
    },
    {
      title: 'Nhà Sáng Lập Tour',
      icon: '🗺️',
      desc: itinsCount >= 3 ? `Đã thiết kế ${itinsCount} lịch trình du lịch` : `Đã thiết kế ${itinsCount}/3 lịch trình`,
      date: itinsCount > 0 ? 'Đang hoạt động' : 'Chưa mở khóa',
      unlocked: itinsCount >= 3,
    },
    {
      title: 'Gương Mặt Truyền Cảm Hứng',
      icon: '🌟',
      desc:
        activeFollowersCount >= 10
          ? `Có ${activeFollowersCount} người theo dõi`
          : `Đạt ${activeFollowersCount}/10 người theo dõi`,
      date: activeFollowersCount >= 10 ? 'Đã đạt tiêu chuẩn' : 'Đang phấn đấu',
      unlocked: activeFollowersCount >= 10,
    },
    {
      title: 'Thành Viên Xác Thực',
      icon: '🛡️',
      desc: Boolean(profileData?.isVerified) ? 'Hồ sơ đã được xác thực bảo mật' : 'Cần cập nhật hồ sơ đầy đủ',
      date: Boolean(profileData?.isVerified) ? 'Đã xác minh' : 'Chưa hoàn tất',
      unlocked: Boolean(profileData?.isVerified),
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={WF_COLORS.primary} />
        <Text style={styles.loadingText}>Đang đồng bộ dữ liệu hồ sơ cá nhân...</Text>
      </SafeAreaView>
    );
  }

  // ─── UNAUTHENTICATED VIEW (LOGIN / REGISTER) ───────────────
  if (!user?.token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.authHero}>
            <View style={styles.authLogoCircle}>
              <FontAwesome name="user" size={36} color={WF_COLORS.primary} />
            </View>
            <Text style={styles.authHeroTitle}>Hồ Sơ Cá Nhân Wayfare</Text>
            <Text style={styles.authHeroDesc}>
              Đăng nhập để đồng bộ lịch trình, quản lý bài viết cộng đồng và bảng thành tích huy hiệu danh dự của bạn.
            </Text>
          </View>

          <View style={styles.authCard}>
            <View style={styles.authTabs}>
              <TouchableOpacity
                onPress={() => setAuthMode('login')}
                style={[styles.authTab, authMode === 'login' && styles.authTabActive]}
              >
                <Text style={[styles.authTabText, authMode === 'login' && styles.authTabTextActive]}>
                  Đăng Nhập
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setAuthMode('register')}
                style={[styles.authTab, authMode === 'register' && styles.authTabActive]}
              >
                <Text style={[styles.authTabText, authMode === 'register' && styles.authTabTextActive]}>
                  Đăng Ký
                </Text>
              </TouchableOpacity>
            </View>

            {authMode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Họ và tên</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ví dụ: Nguyễn Văn Du Lịch"
                  placeholderTextColor="#94A3B8"
                  value={authFullName}
                  onChangeText={setAuthFullName}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder="email@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={authEmail}
                onChangeText={setAuthEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={authPassword}
                onChangeText={setAuthPassword}
              />
            </View>

            <TouchableOpacity
              onPress={handleAuth}
              disabled={submittingAuth}
              style={[styles.primaryBtn, submittingAuth && styles.btnDisabled]}
            >
              {submittingAuth ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {authMode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản Mới'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={submittingAuth}
              style={styles.googleBtn}
            >
              <FontAwesome name="google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
              <Text style={styles.googleBtnText}>Đăng nhập với Google</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── AUTHENTICATED PROFILE VIEW ────────────────────────────
  const coverUrl =
    profileData?.coverImageUrl ||
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80';
  const avatarUrl =
    profileData?.avatarUrl ||
    user?.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
  const displayName = profileData?.fullName || user?.fullName || 'Nhà Lữ Hành';
  const displayHandle = profileData?.handle || user?.handle || '@wanderer';
  const displayLocation = profileData?.location || 'Việt Nam';
  const displayTravelStyle = profileData?.travelStyle || 'Khám phá tự do';
  const displayBudget = profileData?.budgetPreference || 'Linh hoạt';
  const displayBio =
    profileData?.bio ||
    'Đam mê xê dịch, khám phá những vùng đất hoang sơ và chia sẻ kinh nghiệm hành trình cùng cộng đồng Wayfare.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[WF_COLORS.primary]} />}
      >
        {/* ========================================================= */}
        {/* 1. HERO PROFILE BANNER & USER HEADER CARD                 */}
        {/* ========================================================= */}
        <View style={styles.heroCard}>
          {/* Cover Photo */}
          <View style={styles.coverWrapper}>
            <Image source={{ uri: coverUrl }} style={styles.coverImage} />
            <View style={styles.coverOverlay} />
            <TouchableOpacity
              onPress={handlePickCover}
              disabled={isUploadingCover}
              style={styles.coverEditBtn}
              activeOpacity={0.8}
            >
              {isUploadingCover ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
              ) : (
                <FontAwesome name="camera" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              )}
              <Text style={styles.coverEditBtnText}>
                {isUploadingCover ? 'Đang tải...' : 'Đổi ảnh bìa'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Profile Info Bar */}
          <View style={styles.profileInfoContent}>
            {/* Avatar & Main Row */}
            <View style={styles.avatarRow}>
              {/* Avatar with Prestige Tier Frame and Device Picker */}
              <TouchableOpacity
                onPress={handlePickAvatar}
                disabled={isUploadingAvatar}
                style={styles.avatarWrapper}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: avatarUrl }}
                  style={[styles.avatarImage, { borderColor: currentTier.avatarRingColor }]}
                />
                {isUploadingAvatar ? (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.avatarCameraBadge}>
                    <FontAwesome name="camera" size={10} color="#FFFFFF" />
                  </View>
                )}
                <View style={[styles.tierCornerBadge, { backgroundColor: currentTier.cornerBgColor }]}>
                  <Text style={styles.tierCornerText}>{currentTier.cornerIcon}</Text>
                </View>
              </TouchableOpacity>

              {/* Action Buttons Top-Right */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => setIsEditModalOpen(true)}
                  style={styles.editProfileBtn}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="pencil" size={12} color="#334155" style={{ marginRight: 6 }} />
                  <Text style={styles.editProfileBtnText}>Chỉnh Sửa</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleLogout}
                  style={styles.logoutBtn}
                  activeOpacity={0.8}
                  accessibilityLabel="Đăng xuất"
                >
                  <FontAwesome name="sign-out" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            {/* User Names & Badges */}
            <View style={styles.userNameBlock}>
              <View style={styles.nameRow}>
                <Text style={styles.fullNameText}>{displayName}</Text>
                <View style={[styles.tierBadgePill, { backgroundColor: currentTier.badgeBg }]}>
                  <Text style={styles.tierBadgeText}>
                    {currentTier.icon} {currentTier.name}
                  </Text>
                </View>
              </View>

              {/* Secondary Details: Handle, Location, Style, Budget */}
              <View style={styles.metaRow}>
                <Text style={styles.handleText}>{displayHandle}</Text>
                <Text style={styles.metaDot}>•</Text>
                <View style={styles.metaLocation}>
                  <FontAwesome name="map-marker" size={12} color={WF_COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.metaLocationText}>{displayLocation}</Text>
                </View>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.budgetPill}>💰 {displayBudget}</Text>
              </View>

              {/* Travel Style Tag */}
              <View style={styles.travelStyleRow}>
                <View style={styles.travelStyleBadge}>
                  <Text style={styles.travelStyleText}>🧭 {displayTravelStyle}</Text>
                </View>
              </View>

              {/* Follower Stats Bar - Clickable to open FollowModal */}
              <View style={styles.followBar}>
                <TouchableOpacity
                  style={styles.followItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setFollowModalInitialTab('followers');
                    setFollowModalVisible(true);
                  }}
                >
                  <Text style={styles.followCount}>{activeFollowersCount}</Text>
                  <Text style={styles.followLabel}>người theo dõi</Text>
                </TouchableOpacity>
                <Text style={styles.metaDot}>•</Text>
                <TouchableOpacity
                  style={styles.followItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    setFollowModalInitialTab('following');
                    setFollowModalVisible(true);
                  }}
                >
                  <Text style={styles.followCount}>{activeFollowingCount}</Text>
                  <Text style={styles.followLabel}>đang theo dõi</Text>
                </TouchableOpacity>
              </View>

              {/* Bio text */}
              <Text style={styles.bioText}>{displayBio}</Text>
            </View>

            {/* Key Travel Metrics Bento Bar - Full 6 items exactly matching Web */}
            <View style={styles.bentoContainer}>
              {/* Row 1 */}
              <View style={styles.bentoRow}>
                <TouchableOpacity
                  onPress={() => setActiveTab('posts')}
                  style={styles.bentoCard}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bentoLabel}>Lượt Thích</Text>
                  <View style={styles.bentoValueRow}>
                    <Text style={[styles.bentoValue, { color: '#EF4444' }]}>{totalLikesReceived}</Text>
                    <FontAwesome name="heart" size={13} color="#EF4444" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={styles.bentoHint}>Tương tác bài viết →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('itineraries')}
                  style={[styles.bentoCard, styles.bentoCardBorder]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bentoLabel}>Lịch Trình Đã Tạo</Text>
                  <View style={styles.bentoValueRow}>
                    <Text style={[styles.bentoValue, { color: WF_COLORS.primary }]}>{itinsCount}</Text>
                    <FontAwesome name="map" size={12} color="#0284C7" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={styles.bentoHint}>Đã đồng bộ GPS</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('posts')}
                  style={[styles.bentoCard, styles.bentoCardBorder]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bentoLabel}>Bài Đăng Cộng Đồng</Text>
                  <View style={styles.bentoValueRow}>
                    <Text style={[styles.bentoValue, { color: '#0284C7' }]}>{postsCount}</Text>
                    <FontAwesome name="globe" size={12} color="#0284C7" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={styles.bentoHint}>Đã đăng công khai</Text>
                </TouchableOpacity>
              </View>

              {/* Row 2 */}
              <View style={[styles.bentoRow, styles.bentoRowBorderTop]}>
                <TouchableOpacity
                  style={styles.bentoCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    setFollowModalInitialTab('followers');
                    setFollowModalVisible(true);
                  }}
                >
                  <Text style={styles.bentoLabel}>Người Theo Dõi</Text>
                  <View style={styles.bentoValueRow}>
                    <Text style={[styles.bentoValue, { color: '#0284C7' }]}>{activeFollowersCount}</Text>
                    <FontAwesome name="users" size={12} color="#0284C7" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={styles.bentoHint}>Xem danh sách →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.bentoCard, styles.bentoCardBorder]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setFollowModalInitialTab('following');
                    setFollowModalVisible(true);
                  }}
                >
                  <Text style={styles.bentoLabel}>Đang Theo Dõi</Text>
                  <View style={styles.bentoValueRow}>
                    <Text style={[styles.bentoValue, { color: '#6366F1' }]}>{activeFollowingCount}</Text>
                    <FontAwesome name="user-plus" size={12} color="#6366F1" style={{ marginLeft: 4 }} />
                  </View>
                  <Text style={styles.bentoHint}>Quản lý →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('badges')}
                  style={[styles.bentoCard, styles.bentoCardBorder]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bentoLabel}>Cấp Độ Danh Dự</Text>
                  <View style={styles.bentoValueRow}>
                    <Text style={[styles.bentoValue, { color: '#B45309', fontSize: 11 }]} numberOfLines={1}>
                      {currentTier.icon} {currentTier.name}
                    </Text>
                  </View>
                  <Text style={[styles.bentoHint, { color: '#B45309' }]}>{userTotalXP} XP • Khung &rarr;</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Sub-Tabs Navigation Bar - 5 tabs exactly matching Web */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContainer}
          >
            {/* TAB 1: ITINERARIES */}
            <TouchableOpacity
              onPress={() => setActiveTab('itineraries')}
              style={[styles.subTab, activeTab === 'itineraries' && styles.subTabActive]}
              activeOpacity={0.8}
            >
              <FontAwesome
                name="map"
                size={13}
                color={activeTab === 'itineraries' ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.subTabText, activeTab === 'itineraries' && styles.subTabTextActive]}>
                Lịch Trình
              </Text>
              <View
                style={[
                  styles.tabCountBadge,
                  activeTab === 'itineraries' ? styles.tabCountBadgeActive : styles.tabCountBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabCountText,
                    activeTab === 'itineraries' ? styles.tabCountTextActive : styles.tabCountTextInactive,
                  ]}
                >
                  {itinsCount}
                </Text>
              </View>
            </TouchableOpacity>

            {/* TAB 2: POSTS */}
            <TouchableOpacity
              onPress={() => setActiveTab('posts')}
              style={[styles.subTab, activeTab === 'posts' && styles.subTabActive]}
              activeOpacity={0.8}
            >
              <FontAwesome
                name="pencil-square-o"
                size={13}
                color={activeTab === 'posts' ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.subTabText, activeTab === 'posts' && styles.subTabTextActive]}>
                Bài Viết & Review
              </Text>
              <View
                style={[
                  styles.tabCountBadge,
                  activeTab === 'posts' ? styles.tabCountBadgeActive : styles.tabCountBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabCountText,
                    activeTab === 'posts' ? styles.tabCountTextActive : styles.tabCountTextInactive,
                  ]}
                >
                  {postsCount}
                </Text>
              </View>
            </TouchableOpacity>

            {/* TAB 3: AI DNA */}
            <TouchableOpacity
              onPress={() => setActiveTab('ai-dna')}
              style={[styles.subTab, activeTab === 'ai-dna' && styles.subTabActive]}
              activeOpacity={0.8}
            >
              <FontAwesome
                name="magic"
                size={13}
                color={activeTab === 'ai-dna' ? '#FFFFFF' : '#D97706'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.subTabText, activeTab === 'ai-dna' && styles.subTabTextActive]}>
                Gu Du Lịch & AI DNA
              </Text>
              <View
                style={[
                  styles.tabHighlightBadge,
                  activeTab === 'ai-dna' ? styles.tabHighlightBadgeActive : styles.tabHighlightBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabHighlightText,
                    activeTab === 'ai-dna' ? styles.tabHighlightTextActive : styles.tabHighlightTextInactive,
                  ]}
                >
                  AI
                </Text>
              </View>
            </TouchableOpacity>

            {/* TAB 5: SAVED */}
            <TouchableOpacity
              onPress={() => setActiveTab('saved')}
              style={[styles.subTab, activeTab === 'saved' && styles.subTabActive]}
              activeOpacity={0.8}
            >
              <FontAwesome
                name="bookmark"
                size={13}
                color={activeTab === 'saved' ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.subTabText, activeTab === 'saved' && styles.subTabTextActive]}>
                Đã Lưu
              </Text>
              <View
                style={[
                  styles.tabCountBadge,
                  activeTab === 'saved' ? styles.tabCountBadgeActive : styles.tabCountBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabCountText,
                    activeTab === 'saved' ? styles.tabCountTextActive : styles.tabCountTextInactive,
                  ]}
                >
                  {savedPosts.length}
                </Text>
              </View>
            </TouchableOpacity>

            {/* TAB 6: BADGES & TIERS */}
            <TouchableOpacity
              onPress={() => setActiveTab('badges')}
              style={[styles.subTab, activeTab === 'badges' && styles.subTabActive]}
              activeOpacity={0.8}
            >
              <FontAwesome
                name="trophy"
                size={13}
                color={activeTab === 'badges' ? '#FFFFFF' : '#64748B'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.subTabText, activeTab === 'badges' && styles.subTabTextActive]}>
                Huy Hiệu & Cấp Bậc
              </Text>
              <View
                style={[
                  styles.tabCountBadge,
                  activeTab === 'badges' ? styles.tabCountBadgeActive : styles.tabCountBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.tabCountText,
                    activeTab === 'badges' ? styles.tabCountTextActive : styles.tabCountTextInactive,
                  ]}
                >
                  {achievements.length}
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ========================================================= */}
        {/* 2. TABBED CONTENT SECTIONS                                */}
        {/* ========================================================= */}

        {/* TAB 1: ITINERARIES */}
        {activeTab === 'itineraries' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                <FontAwesome name="map" size={15} color={WF_COLORS.primary} /> Danh Sách Lịch Trình ({itinsCount})
              </Text>
            </View>

            {displayItineraries.length === 0 ? (
              <View style={styles.emptyCard}>
                <FontAwesome name="compass" size={40} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Bạn chưa có lịch trình nào trong kho</Text>
                <Text style={styles.emptyDesc}>
                  Hãy khám phá hoặc sử dụng tính năng tạo lịch trình bằng AI để bắt đầu chuyến phiêu lưu!
                </Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {displayItineraries.map((itin) => {
                  const cover =
                    itin.coverImageUrl ||
                    itin.coverImage ||
                    'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80';
                  const budgetFormatted =
                    typeof itin.budgetTotal === 'number'
                      ? `${itin.budgetTotal.toLocaleString('vi-VN')} đ`
                      : itin.budget
                      ? `${itin.budget.toLocaleString('vi-VN')} đ`
                      : '5.000.000 đ';

                  const isAi = itin.isAiGenerated ?? (itin.title?.toLowerCase().includes('ai') || false);

                  return (
                    <TouchableOpacity
                      key={itin.id}
                      style={styles.itinCard}
                      activeOpacity={0.92}
                      onPress={() => {
                        setSelectedItinerary(itin);
                        setItineraryDetailVisible(true);
                      }}
                    >
                      <View style={styles.itinCoverContainer}>
                        <Image source={{ uri: cover }} style={styles.itinCover} />
                        <View style={styles.itinCoverOverlay} />
                        <View style={styles.itinTopBadges}>
                          <View style={isAi ? styles.itinAiTag : styles.itinManualTag}>
                            <FontAwesome
                              name={isAi ? 'magic' : 'pencil'}
                              size={10}
                              color={isAi ? '#FDE047' : '#FFFFFF'}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={isAi ? styles.itinAiTagText : styles.itinManualTagText}>
                              {isAi ? 'Tạo bởi AI' : 'Thủ công'}
                            </Text>
                          </View>
                          <View style={styles.itinDurationTag}>
                            <Text style={styles.itinDurationText}>
                              {itin.daysCount ? `${itin.daysCount}N${Math.max(1, itin.daysCount - 1)}Đ` : '3N2Đ'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.itinDestTag}>
                          <FontAwesome name="map-marker" size={12} color="#FDE047" style={{ marginRight: 4 }} />
                          <Text style={styles.itinDestText} numberOfLines={1}>
                            {itin.destination || 'Việt Nam'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.itinBody}>
                        <Text style={styles.itinTitle} numberOfLines={2}>
                          {itin.title}
                        </Text>
                        <View style={styles.itinBudgetRow}>
                          <Text style={styles.itinBudgetLabel}>Chi phí dự kiến:</Text>
                          <Text style={styles.itinBudgetValue}>{budgetFormatted}</Text>
                        </View>

                        <View style={styles.itinActionRow}>
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedItinerary(itin);
                              setItineraryDetailVisible(true);
                            }}
                            style={styles.itinViewBtn}
                            activeOpacity={0.8}
                          >
                            <FontAwesome name="eye" size={13} color={WF_COLORS.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.itinViewBtnText}>Xem Chi Tiết Lộ Trình</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => handleDeleteItinerary(itin)}
                            style={styles.itinDeleteBtn}
                            activeOpacity={0.8}
                          >
                            <FontAwesome name="trash-o" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: POSTS */}
        {activeTab === 'posts' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                <FontAwesome name="globe" size={15} color={WF_COLORS.primary} /> Bài Viết & Review ({postsCount})
              </Text>
            </View>

            {displayPosts.length === 0 ? (
              <View style={styles.emptyCard}>
                <FontAwesome name="pencil-square-o" size={40} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Bạn chưa có bài viết nào trên cộng đồng</Text>
                <Text style={styles.emptyDesc}>
                  Chia sẻ những bức ảnh và trải nghiệm chuyến đi thực tế của bạn để nhận thêm điểm XP!
                </Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {displayPosts.map((post) => {
                  const author = post.authorName || displayName;
                  const time = post.timeAgo || 'Vừa xong';
                  const loc = post.locationTag || post.locationName || 'Việt Nam';
                  const likes = post.likeCount ?? post.likesCount ?? 0;
                  const comments = post.commentCount ?? post.commentsCount ?? 0;

                  return (
                    <View key={post.id} style={styles.postCard}>
                      <View style={styles.postHeader}>
                        <Image source={{ uri: avatarUrl }} style={styles.postAvatar} />
                        <View style={{ flex: 1 }}>
                          <View style={styles.postNameRow}>
                            <Text style={styles.postAuthorName}>{author}</Text>
                            <View style={styles.postTierPill}>
                              <Text style={styles.postTierPillText}>{currentTier.name}</Text>
                            </View>
                          </View>
                          <Text style={styles.postMeta}>
                            {time} • 📍 {loc}
                          </Text>
                        </View>
                      </View>

                      {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
                      <Text style={styles.postContent} numberOfLines={4}>
                        {post.content}
                      </Text>

                      {post.images && post.images.length > 0 && (
                        <Image source={{ uri: post.images[0] }} style={styles.postSingleImage} />
                      )}

                      <View style={styles.postFooter}>
                        <View style={styles.postStatItem}>
                          <FontAwesome name="heart" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                          <Text style={styles.postStatText}>{likes} thích</Text>
                        </View>
                        <View style={styles.postStatItem}>
                          <FontAwesome name="comment-o" size={14} color="#64748B" style={{ marginRight: 6 }} />
                          <Text style={styles.postStatText}>{comments} bình luận</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: GU DU LỊCH & AI DNA */}
        {activeTab === 'ai-dna' && (
          <View style={styles.tabSection}>
            {/* Header info */}
            <View style={styles.aiDnaHeaderCard}>
              <View style={styles.aiDnaIconCircle}>
                <FontAwesome name="magic" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.aiDnaTitle}>Cấu Hình Gu Du Lịch & AI DNA</Text>
                <Text style={styles.aiDnaSubtitle}>
                  Trợ lý WanderAI tự động ghi nhớ khẩu vị du lịch của bạn để tối ưu gợi ý tour cá nhân hóa
                </Text>
              </View>
            </View>

            {/* Quick edit button */}
            <TouchableOpacity
              onPress={() => setIsEditModalOpen(true)}
              style={styles.editDnaBtn}
              activeOpacity={0.8}
            >
              <FontAwesome name="sliders" size={13} color={WF_COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.editDnaBtnText}>Chỉnh sửa Gu du lịch & Hồ sơ</Text>
            </TouchableOpacity>

            {/* 4 DNA Cards 2x2 Grid */}
            <View style={styles.dnaGrid}>
              {/* Card 1 */}
              <View style={[styles.dnaCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <Text style={[styles.dnaCardLabel, { color: '#0369A1' }]}>PHONG CÁCH DU LỊCH</Text>
                <Text style={styles.dnaCardValue}>🧭 {displayTravelStyle}</Text>
                <Text style={styles.dnaCardDesc}>Khẩu vị di chuyển & trải nghiệm điểm đến</Text>
              </View>

              {/* Card 2 */}
              <View style={[styles.dnaCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Text style={[styles.dnaCardLabel, { color: '#047857' }]}>MỨC NGÂN SÁCH ƯA THÍCH</Text>
                <Text style={styles.dnaCardValue}>💰 {displayBudget}</Text>
                <Text style={styles.dnaCardDesc}>Cân đối chi phí di chuyển, ăn uống & lưu trú</Text>
              </View>

              {/* Card 3 */}
              <View style={[styles.dnaCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Text style={[styles.dnaCardLabel, { color: '#B45309' }]}>CẤP BẬC NHÀ THÁM HIỂM</Text>
                <Text style={styles.dnaCardValue}>
                  {currentTier.icon} {currentTier.name}
                </Text>
                <Text style={styles.dnaCardDesc}>{currentTier.desc}</Text>
              </View>

              {/* Card 4 */}
              <View style={[styles.dnaCard, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                <Text style={[styles.dnaCardLabel, { color: '#7E22CE' }]}>ĐÓNG GÓP CỘNG ĐỒNG</Text>
                <Text style={styles.dnaCardValue}>🌟 {postsCount} Bài viết • {itinsCount} Tour</Text>
                <Text style={styles.dnaCardDesc}>
                  {totalLikesReceived} lượt thích từ bạn bè du khách
                </Text>
              </View>
            </View>

            {/* Bio note for AI */}
            <View style={styles.aiNoteCard}>
              <View style={styles.aiNoteHeader}>
                <FontAwesome name="bolt" size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                <Text style={styles.aiNoteTitle}>Ghi chú riêng của bạn dành cho AI Engine</Text>
              </View>
              <View style={styles.aiNoteContentBox}>
                <Text style={styles.aiNoteText}>
                  "{displayBio || 'Thường đi du lịch trải nghiệm tự túc, thích chụp ảnh và khám phá ẩm thực bản địa độc đáo.'}"
                </Text>
              </View>
              <Text style={styles.aiNoteFooter}>
                * Dữ liệu này được tích hợp trực tiếp vào ngữ cảnh xử lý của thuật toán AI để sinh ra các lịch trình cá nhân hóa sát với mong muốn của bạn nhất.
              </Text>
            </View>
          </View>
        )}

        {/* TAB 5: SAVED POSTS */}
        {activeTab === 'saved' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                <FontAwesome name="bookmark" size={15} color={WF_COLORS.primary} /> Bài Viết Đã Lưu ({savedPosts.length})
              </Text>
            </View>

            {loadingSaved ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator size="small" color={WF_COLORS.primary} />
                <Text style={styles.emptyDesc}>Đang tải danh sách bài viết đã lưu...</Text>
              </View>
            ) : savedPosts.length === 0 ? (
              <View style={styles.emptyCard}>
                <FontAwesome name="bookmark-o" size={40} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Chưa có bài viết nào được lưu</Text>
                <Text style={styles.emptyDesc}>
                  Khi lướt cộng đồng, bấm vào biểu tượng Bookmark để lưu lại những địa điểm và bí kíp hay ho!
                </Text>
              </View>
            ) : (
              <View style={styles.cardList}>
                {savedPosts.map((post) => (
                  <View key={post.id} style={styles.postCard}>
                    <View style={styles.postHeader}>
                      <Image
                        source={{
                          uri:
                            post.authorAvatar ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                        }}
                        style={styles.postAvatar}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.postAuthorName}>{post.authorName || 'Tác giả'}</Text>
                        <Text style={styles.postMeta}>{post.timeAgo || 'Vừa xong'}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await postApi.toggleBookmark(post.id);
                            setSavedPosts((prev) => prev.filter((p) => p.id !== post.id));
                            Alert.alert('Đã xóa', 'Đã bỏ lưu bài viết khỏi kho của bạn');
                          } catch (e) {
                            Alert.alert('Lỗi', 'Không thể bỏ lưu bài viết');
                          }
                        }}
                        style={styles.unbookmarkBtn}
                      >
                        <FontAwesome name="bookmark" size={16} color={WF_COLORS.primary} />
                      </TouchableOpacity>
                    </View>

                    {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
                    <Text style={styles.postContent} numberOfLines={3}>
                      {post.content}
                    </Text>

                    {post.images && post.images.length > 0 && (
                      <Image source={{ uri: post.images[0] }} style={styles.postSingleImage} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 4: BADGES & TIERS */}
        {activeTab === 'badges' && (
          <View style={styles.tabSection}>
            {/* Honor Tier Progress Card */}
            <View style={styles.prestigeCard}>
              <View style={styles.prestigeHeader}>
                <View>
                  <Text style={styles.prestigeTitle}>Hệ Thống Danh Hiệu Wayfare</Text>
                  <Text style={styles.prestigeSubtitle}>
                    Cấp hiện tại: {currentTier.icon} {currentTier.name}
                  </Text>
                </View>
                <View style={[styles.prestigeXpPill, { backgroundColor: currentTier.badgeBg }]}>
                  <Text style={styles.prestigeXpText}>{userTotalXP} XP</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
                </View>
                <View style={styles.progressMeta}>
                  <Text style={styles.progressMetaText}>
                    {nextTier ? `Cần ${nextTier.minXP - userTotalXP} XP để lên ${nextTier.name}` : 'Đã đạt cấp tối đa!'}
                  </Text>
                  <Text style={styles.progressPercentText}>{progressPercent}%</Text>
                </View>
              </View>
            </View>

            {/* 4 Tiers List */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                <FontAwesome name="shield" size={15} color={WF_COLORS.primary} /> 4 Cấp Bậc Vinh Dự
              </Text>
            </View>

            <View style={styles.tiersGrid}>
              {TIERS.map((tier) => {
                const isCurrent = currentTier.level === tier.level;
                const isUnlocked = userTotalXP >= tier.minXP;

                return (
                  <View
                    key={tier.id}
                    style={[
                      styles.tierCardItem,
                      isCurrent && styles.tierCardCurrent,
                      !isUnlocked && styles.tierCardLocked,
                    ]}
                  >
                    <View style={styles.tierCardHeader}>
                      <View style={[styles.tierIconCircle, { borderColor: tier.avatarRingColor }]}>
                        <Text style={styles.tierIconLarge}>{tier.icon}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.tierNameText}>{tier.name}</Text>
                        <Text style={styles.tierNameEnText}>{tier.nameEn}</Text>
                      </View>
                    </View>

                    <Text style={styles.tierDescText}>{tier.desc}</Text>

                    <View style={styles.tierFooter}>
                      <Text style={styles.tierRequirementText}>Yêu cầu: {tier.minXP} XP</Text>
                      {isCurrent ? (
                        <View style={styles.tierStatusActive}>
                          <Text style={styles.tierStatusActiveText}>✓ Đang sử dụng</Text>
                        </View>
                      ) : isUnlocked ? (
                        <View style={styles.tierStatusUnlocked}>
                          <Text style={styles.tierStatusUnlockedText}>✓ Đã mở khóa</Text>
                        </View>
                      ) : (
                        <View style={styles.tierStatusLocked}>
                          <Text style={styles.tierStatusLockedText}>🔒 Thiếu {tier.minXP - userTotalXP} XP</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Community Contribution Badges */}
            <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
              <Text style={styles.sectionTitle}>
                <FontAwesome name="trophy" size={15} color="#F59E0B" /> Huy Hiệu Đóng Góp Cộng Đồng
              </Text>
            </View>

            <View style={styles.achievementsList}>
              {achievements.map((ach, idx) => (
                <View
                  key={idx}
                  style={[styles.achCard, ach.unlocked ? styles.achCardUnlocked : styles.achCardLocked]}
                >
                  <View style={styles.achIconCircle}>
                    <Text style={{ fontSize: 22 }}>{ach.icon}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.achTitleRow}>
                      <Text style={styles.achTitle}>{ach.title}</Text>
                      {ach.unlocked && (
                        <View style={styles.achUnlockedPill}>
                          <Text style={styles.achUnlockedPillText}>Đã mở</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.achDesc}>{ach.desc}</Text>
                    <Text style={styles.achDate}>{ach.date}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* 3. EDIT PROFILE MODAL DIALOG                              */}
      {/* ========================================================= */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh Sửa Hồ Sơ Cá Nhân</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)} style={styles.modalCloseBtn}>
                <FontAwesome name="times" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Avatar Picker from Device */}
              <View style={styles.modalAvatarRow}>
                <View style={styles.modalAvatarWrapper}>
                  <Image
                    source={{
                      uri:
                        editAvatarUrl.trim() ||
                        avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                    }}
                    style={[styles.modalAvatarPreview, { borderColor: currentTier.avatarRingColor }]}
                  />
                  {isUploadingAvatar && (
                    <View style={styles.modalAvatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>Ảnh đại diện</Text>
                  <TouchableOpacity
                    onPress={handlePickAvatar}
                    disabled={isUploadingAvatar}
                    style={styles.pickImageBtn}
                    activeOpacity={0.8}
                  >
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color={WF_COLORS.primary} style={{ marginRight: 6 }} />
                    ) : (
                      <FontAwesome name="camera" size={13} color={WF_COLORS.primary} style={{ marginRight: 6 }} />
                    )}
                    <Text style={styles.pickImageBtnText}>
                      {isUploadingAvatar ? 'Đang tải ảnh lên...' : 'Chọn ảnh từ thiết bị'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.pickImageHint}>Tải trực tiếp ảnh từ thư viện máy của bạn</Text>
                </View>
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Họ và tên <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập họ và tên..."
                  placeholderTextColor="#94A3B8"
                  value={editFullName}
                  onChangeText={setEditFullName}
                />
              </View>

              {/* Handle & Phone */}
              <View style={styles.twoColumnRow}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.inputLabel}>Biệt danh / Handle</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="@wanderer"
                    placeholderTextColor="#94A3B8"
                    value={editHandle}
                    onChangeText={setEditHandle}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.inputLabel}>Số điện thoại</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0912345678"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={editPhone}
                    onChangeText={setEditPhone}
                  />
                </View>
              </View>

              {/* Travel Style Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phong cách du lịch</Text>
                <View style={styles.chipsRow}>
                  {TRAVEL_STYLES.map((style) => {
                    const isSelected = editTravelStyle === style;
                    return (
                      <TouchableOpacity
                        key={style}
                        onPress={() => setEditTravelStyle(style)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {style}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Budget Preference Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mức ngân sách yêu thích</Text>
                <View style={styles.chipsRow}>
                  {BUDGET_PREFERENCES.map((b) => {
                    const isSelected = editBudget === b;
                    return (
                      <TouchableOpacity
                        key={b}
                        onPress={() => setEditBudget(b)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {b}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bio */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tiểu sử du lịch (Bio)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Chia sẻ đôi điều về gu du lịch của bạn..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={editBio}
                  onChangeText={setEditBio}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                style={styles.modalCancelBtn}
                disabled={isSavingProfile}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveProfile}
                style={styles.modalSaveBtn}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Lưu Thay Đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal xem danh sách Người theo dõi / Đang theo dõi */}
      <FollowModal
        visible={followModalVisible}
        onClose={() => {
          setFollowModalVisible(false);
          loadProfile();
        }}
        initialTab={followModalInitialTab}
        onFollowChange={loadProfile}
      />

      {/* Modal xem chi tiết lịch trình du lịch */}
      <ItineraryDetailModal
        visible={itineraryDetailVisible}
        onClose={() => setItineraryDetailVisible(false)}
        itinerary={selectedItinerary}
        onItineraryUpdated={loadProfile}
        canEdit={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  scrollContainer: {
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  coverWrapper: {
    height: 140,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  coverEditBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  coverEditBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
  },

  // Profile Info Content
  profileInfoContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -42,
    marginBottom: 10,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3.5,
    backgroundColor: '#FFFFFF',
  },
  tierCornerBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  tierCornerText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // User Names Block
  userNameBlock: {
    marginBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  fullNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  tierBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  handleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  metaDot: {
    color: '#CBD5E1',
    fontWeight: '700',
  },
  metaLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLocationText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  budgetPill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  travelStyleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  travelStyleBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  travelStyleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  followBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  followItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  followLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  bioText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#475569',
  },

  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 43,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Key Travel Metrics Bento Bar (6 items grid)
  bentoContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    overflow: 'hidden',
  },
  bentoRow: {
    flexDirection: 'row',
  },
  bentoRowBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bentoCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  bentoCardBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  bentoLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 2,
  },
  bentoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  bentoHint: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },

  // Sub-Tabs Navigation
  tabScrollContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCountBadgeInactive: {
    backgroundColor: '#E2E8F0',
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },
  tabCountTextInactive: {
    color: '#475569',
  },
  tabHighlightBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  tabHighlightBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabHighlightBadgeInactive: {
    backgroundColor: '#FEF3C7',
  },
  tabHighlightText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  tabHighlightTextActive: {
    color: '#FFFFFF',
  },
  tabHighlightTextInactive: {
    color: '#92400E',
  },
  // AI DNA Section Styles
  aiDnaHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  aiDnaIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiDnaTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  aiDnaSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  editDnaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: WF_COLORS.primary,
    borderRadius: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  editDnaBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  dnaGrid: {
    gap: 10,
    marginBottom: 14,
  },
  dnaCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  dnaCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  dnaCardValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  dnaCardDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  aiNoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  aiNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiNoteTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  aiNoteContentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  aiNoteText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  aiNoteFooter: {
    fontSize: 10.5,
    color: '#94A3B8',
    lineHeight: 14,
  },

  // Tab Section Content
  tabSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  cardList: {
    gap: 12,
  },

  // Itinerary Card
  itinCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itinCoverContainer: {
    height: 120,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  itinCover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itinCoverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  itinTopBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itinAiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  itinAiTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  itinDurationTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  itinDurationText: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '800',
  },
  itinDestTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itinDestText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  itinBody: {
    padding: 12,
  },
  itinTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  itinBudgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itinBudgetLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  itinBudgetValue: {
    fontSize: 13,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  itinActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  itinViewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 7,
    borderRadius: 12,
  },
  itinViewBtnText: {
    color: WF_COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  itinDeleteBtn: {
    width: 36,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itinManualTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  itinManualTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Post Card
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
  },
  postNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  postTierPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  postTierPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  postMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  unbookmarkBtn: {
    padding: 6,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  postContent: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 18,
  },
  postSingleImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    marginTop: 8,
    resizeMode: 'cover',
  },
  postFooter: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  postStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // Prestige Tier Section
  prestigeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  prestigeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prestigeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  prestigeSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    marginTop: 2,
  },
  prestigeXpPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  prestigeXpText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  progressContainer: {
    marginTop: 14,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: WF_COLORS.primary,
    borderRadius: 4,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressMetaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },

  // Tiers Grid
  tiersGrid: {
    gap: 10,
    marginBottom: 12,
  },
  tierCardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tierCardCurrent: {
    borderColor: WF_COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#F0F9FF',
  },
  tierCardLocked: {
    opacity: 0.65,
  },
  tierCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tierIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tierIconLarge: {
    fontSize: 18,
  },
  tierNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  tierNameEnText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  tierDescText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 10,
  },
  tierFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tierRequirementText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tierStatusActive: {
    backgroundColor: WF_COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tierStatusActiveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  tierStatusUnlocked: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tierStatusUnlockedText: {
    color: '#15803D',
    fontSize: 10,
    fontWeight: '700',
  },
  tierStatusLocked: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tierStatusLockedText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },

  // Achievements
  achievementsList: {
    gap: 8,
  },
  achCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  achCardUnlocked: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  achCardLocked: {
    opacity: 0.7,
  },
  achIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  achTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  achUnlockedPill: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  achUnlockedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
  achDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  achDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: 'monospace',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    padding: 18,
    gap: 12,
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalAvatarPreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  modalAvatarWrapper: {
    position: 'relative',
    width: 50,
    height: 50,
  },
  modalAvatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginTop: 3,
  },
  pickImageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  pickImageHint: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 3,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  twoColumnRow: {
    flexDirection: 'row',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: WF_COLORS.primary,
  },
  modalSaveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Auth Card Styles
  authScroll: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  authHero: {
    alignItems: 'center',
    marginBottom: 24,
    maxWidth: 320,
  },
  authLogoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  authHeroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  authHeroDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  authCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    gap: 14,
  },
  authTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
  },
  authTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  authTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  authTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  authTabTextActive: {
    color: WF_COLORS.primary,
  },
  primaryBtn: {
    backgroundColor: WF_COLORS.primary,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 11,
    borderRadius: 14,
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
});
