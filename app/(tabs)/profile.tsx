import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { confirmDialog } from '@/components/ConfirmDialog';
import { FollowModal } from '@/components/FollowModal';
import { TripActionSheet } from '@/components/itinerary/TripActionSheet';
import { TripCard } from '@/components/itinerary/TripCard';
import { ItineraryDetailModal } from '@/components/ItineraryDetailModal';
import { BadgesModal } from '@/components/profile/BadgesModal';
import { SettingsSheet } from '@/components/profile/SettingsSheet';
import { Text, TextInput } from '@/components/Themed';
import { showToast } from '@/components/Toast';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { UserProfileModal } from '@/components/UserProfileModal';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import {
  authApi,
  itineraryApi,
  ItineraryItem,
  postApi,
  PostItem,
  UpdateProfilePayload,
  uploadApi,
  userApi,
  UserProfileItem,
} from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import {
  calculateTierProgress,
  calculateUserXP,
  getNextTier,
  getUserTier,
  TierItem,
} from '@/src/utils/tierSystem';

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

export type ProfileTab = 'itineraries' | 'posts' | 'saved';

export default function ProfileScreen() {
  const router = useRouter();

  const [user, setUser] = useState<UserSession | null>(null);
  const [profileData, setProfileData] = useState<UserProfileItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Active sub-tab: 3 tabs gọn gàng
  const [activeTab, setActiveTab] = useState<ProfileTab>('itineraries');

  // Bookmarked posts
  const [savedPosts, setSavedPosts] = useState<PostItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);

  // Settings Sheet & Badges Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [badgesModalVisible, setBadgesModalVisible] = useState<boolean>(false);
  const [badgesInitialTab, setBadgesInitialTab] = useState<'badges' | 'dna'>('badges');

  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editHandle, setEditHandle] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editTravelStyle, setEditTravelStyle] = useState<string>('Khám phá tự do');
  const [editBudget, setEditBudget] = useState<string>('Linh hoạt');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);

  // Auth form (when logged out)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authFullName, setAuthFullName] = useState<string>('');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [submittingAuth, setSubmittingAuth] = useState<boolean>(false);

  // Follow Modal state
  const [followModalVisible, setFollowModalVisible] = useState<boolean>(false);
  const [followModalInitialTab, setFollowModalInitialTab] = useState<'followers' | 'following'>('followers');
  const [selectedUserIdForModal, setSelectedUserIdForModal] = useState<number | null>(null);

  // Itinerary Detail Modal state
  const [selectedItinerary, setSelectedItinerary] = useState<ItineraryItem | null>(null);
  const [itineraryDetailVisible, setItineraryDetailVisible] = useState<boolean>(false);
  const [actionSheetVisible, setActionSheetVisible] = useState<boolean>(false);
  const [actionSheetItem, setActionSheetItem] = useState<ItineraryItem | null>(null);

  const resetAuthForm = useCallback(() => {
    setAuthMode('login');
    setAuthFullName('');
    setAuthEmail('');
    setAuthPassword('');
  }, []);

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
            setEditAddress(live.address || live.location || '');
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

  useEffect(() => {
    const unsubscribe = authStorage.subscribe((session) => {
      if (session?.token) {
        setUser(session);
        loadProfile();
      } else {
        setUser(null);
        setProfileData(null);
        setSavedPosts([]);
        resetAuthForm();
      }
    });
    return unsubscribe;
  }, [loadProfile, resetAuthForm]);

  const loadSavedPosts = useCallback(async () => {
    try {
      setLoadingSaved(true);
      const res = await postApi.getBookmarkedPosts();
      setSavedPosts(res);
    } catch (err) {
      console.warn('Could not load saved posts', err);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'saved' && user?.token) {
      loadSavedPosts();
    }
  }, [activeTab, user?.token, loadSavedPosts]);

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
      showToast({
        kind: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập đầy đủ Email và Mật khẩu.',
      });
      return;
    }

    try {
      setSubmittingAuth(true);
      let authData: UserSession;
      if (authMode === 'login') {
        authData = await authApi.login(authEmail.trim(), authPassword);
        showToast({
          kind: 'success',
          title: 'Đăng nhập thành công',
          message: `Chào mừng ${authData.fullName || authData.email} trở lại Wayfare!`,
        });
      } else {
        if (!authFullName.trim()) {
          showToast({
            kind: 'error',
            title: 'Thiếu thông tin',
            message: 'Vui lòng nhập Họ và tên để đăng ký.',
          });
          return;
        }
        authData = await authApi.register(authFullName.trim(), authEmail.trim(), authPassword);
        showToast({
          kind: 'success',
          title: 'Tạo tài khoản thành công',
          message: 'Chào mừng bạn đến với cộng đồng Wayfare!',
        });
      }
      setUser(authData);
      resetAuthForm();
      loadProfile();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Thao tác không thành công';
      showToast({ kind: 'error', title: 'Đăng nhập thất bại', message: msg, duration: 4200 });
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setSubmittingAuth(true);
      const googleClientId =
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
        '340055145050-thlfrv3nl1j1jcahh75n8inr8v5j4574.apps.googleusercontent.com';
      const redirectUri = Linking.createURL('oauth');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        googleClientId
      )}&redirect_uri=${encodeURIComponent(
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
          showToast({
            kind: 'success',
            title: 'Đăng nhập Google thành công',
            message: `Xin chào ${session.fullName || session.email}, hồ sơ Google đã được kết nối.`,
          });
          loadProfile();
          return;
        }
      }
      showToast({
        kind: 'info',
        title: 'Đăng nhập Google',
        message: 'Xác thực qua Google chưa hoàn tất hoặc trình duyệt đã đóng.',
      });
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Không thể đăng nhập Google',
        message: e.message || 'Vui lòng thử lại sau.',
      });
    } finally {
      setSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: 'Đăng xuất tài khoản?',
      message: 'Bạn sẽ cần đăng nhập lại để sử dụng đầy đủ các tính năng.',
      confirmText: 'Đăng xuất',
      destructive: true,
      icon: 'sign-out',
      accent: 'slate',
    });
    if (!confirmed) return;

    await authApi.logout();
    setUser(null);
    setProfileData(null);
    setSavedPosts([]);
    resetAuthForm();
    showToast({
      kind: 'info',
      title: 'Đã đăng xuất',
      message: 'Hẹn gặp lại bạn trên hành trình tiếp theo!',
      icon: 'sign-out',
    });
  };

  // ─── EDIT PROFILE HANDLER ──────────────────────────────────
  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      showToast({ kind: 'error', title: 'Thiếu thông tin', message: 'Họ và tên không được để trống.' });
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
        address: editAddress.trim(),
        avatarUrl: editAvatarUrl.trim() || undefined,
      };

      const updated = await userApi.updateProfile(payload);
      if (updated) {
        setProfileData((prev) => (prev ? { ...prev, ...updated } : updated));
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
        showToast({
          kind: 'success',
          title: 'Đã lưu hồ sơ',
          message: 'Thông tin cá nhân của bạn đã được cập nhật.',
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi cập nhật hồ sơ';
      showToast({ kind: 'error', title: 'Cập nhật thất bại', message: msg });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingAvatar(true);
        const uploadedUrl = await uploadApi.uploadSingle(result.assets[0].uri);
        setEditAvatarUrl(uploadedUrl);
        setProfileData((prev) => (prev ? { ...prev, avatarUrl: uploadedUrl } : null));

        if (user) {
          const newSession = { ...user, avatar: uploadedUrl };
          await authStorage.saveSession(newSession);
          setUser(newSession);
        }

        showToast({
          kind: 'success',
          title: 'Ảnh đại diện mới',
          message: 'Ảnh đại diện đã được lưu thành công.',
        });
      }
    } catch {
      showToast({ kind: 'error', title: 'Tải ảnh thất bại', message: 'Không thể cập nhật ảnh đại diện.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePickCover = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingCover(true);
        const uploadedUrl = await uploadApi.uploadSingle(result.assets[0].uri);
        setProfileData((prev) => (prev ? { ...prev, coverImageUrl: uploadedUrl } : null));
        showToast({
          kind: 'success',
          title: 'Ảnh bìa mới',
          message: 'Ảnh bìa trang cá nhân đã được lưu thành công.',
        });
      }
    } catch {
      showToast({ kind: 'error', title: 'Tải ảnh bìa thất bại', message: 'Không thể cập nhật ảnh bìa.' });
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleDeleteItinerary = async (itin: ItineraryItem) => {
    const confirmed = await confirmDialog({
      title: 'Xóa lịch trình?',
      message: `Chuyến đi "${itin.title}" sẽ bị xóa vĩnh viễn. Hành động không thể hoàn tác.`,
      confirmText: 'Xóa',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await itineraryApi.deleteItinerary(itin.id);
      showToast({
        kind: 'success',
        title: 'Đã xóa lịch trình',
        message: `Chuyến đi "${itin.title}" đã được xóa.`,
      });
      loadProfile();
    } catch {
      showToast({
        kind: 'error',
        title: 'Xóa thất bại',
        message: 'Không thể xóa lịch trình này.',
      });
    }
  };

  // ─── DERIVED DATA ───────────────────────────────────────────
  const displayPosts = profileData?.posts || [];
  const displayItineraries = profileData?.itineraries || [];
  const postsCount = profileData?.postsCount ?? displayPosts.length;
  const itinsCount = profileData?.itinerariesCount ?? displayItineraries.length;
  const activeFollowersCount = profileData?.followersCount ?? 0;
  const activeFollowingCount = profileData?.followingCount ?? 0;

  const userTotalXP = calculateUserXP({
    ...profileData,
    postsCount,
    itinerariesCount: itinsCount,
    followersCount: activeFollowersCount,
  });

  const currentTier: TierItem = getUserTier({
    ...profileData,
    tier: profileData?.tier,
    totalXp: userTotalXP,
  });

  const nextTier: TierItem | null = getNextTier(currentTier);
  const progressPercent: number = calculateTierProgress(userTotalXP, currentTier, nextTier);

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={DS_COLOR.accent} />
        <Text style={styles.loadingText}>Đang đồng bộ dữ liệu hồ sơ cá nhân...</Text>
      </View>
    );
  }

  // ─── UNAUTHENTICATED VIEW (LOGIN / REGISTER) ───────────────
  if (!user?.token) {
    return (
      <View style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.authHero}>
            <View style={styles.authLogoCircle}>
              <FontAwesome name="user" size={36} color={DS_COLOR.accent} />
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
                  placeholderTextColor={DS_COLOR.inkMuted}
                  value={authFullName}
                  onChangeText={setAuthFullName}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email tài khoản</Text>
              <TextInput
                style={styles.textInput}
                placeholder="name@example.com"
                placeholderTextColor={DS_COLOR.inkMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={authEmail}
                onChangeText={setAuthEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <TextInput
                style={styles.textInput}
                placeholder="••••••••"
                placeholderTextColor={DS_COLOR.inkMuted}
                secureTextEntry
                value={authPassword}
                onChangeText={setAuthPassword}
              />
            </View>

            <TouchableOpacity
              onPress={handleAuth}
              style={[styles.primaryAuthBtn, submittingAuth && { opacity: 0.7 }]}
              disabled={submittingAuth}
            >
              {submittingAuth ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryAuthBtnText}>
                  {authMode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản Mới'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>HOẶC TIẾP TỤC VỚI</Text>
              <View style={styles.orLine} />
            </View>

            <TouchableOpacity
              onPress={handleGoogleLogin}
              style={styles.googleAuthBtn}
              activeOpacity={0.85}
              disabled={submittingAuth}
            >
              <FontAwesome name="google" size={16} color="#DB4437" style={{ marginRight: 8 }} />
              <Text style={styles.googleAuthBtnText}>Đăng nhập với Google</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── AUTHENTICATED VIEW ────────────────────────────────────
  const coverUrl =
    profileData?.coverImageUrl ||
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80';
  const avatarUrl =
    profileData?.avatarUrl ||
    user?.avatar ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
  const displayName = profileData?.fullName || user?.fullName || 'Nhà Lữ Hành';
  const displayHandle = profileData?.handle || user?.handle || '@wanderer';
  const displayLocation = profileData?.address || profileData?.location || 'Việt Nam';
  const displayTravelStyle = profileData?.travelStyle || 'Khám phá tự do';

  // Current list data
  const currentListData =
    activeTab === 'itineraries'
      ? displayItineraries
      : activeTab === 'posts'
      ? displayPosts
      : savedPosts;

  const renderListItem = ({ item }: { item: any }) => {
    if (activeTab === 'itineraries') {
      const itin = item as ItineraryItem;
      return (
        <TripCard
          item={itin}
          onPress={() => {
            setSelectedItinerary(itin);
            setItineraryDetailVisible(true);
          }}
          onMenuPress={() => {
            setActionSheetItem(itin);
            setActionSheetVisible(true);
          }}
        />
      );
    }

    // Render post item (for both 'posts' and 'saved' tabs)
    const post = item as PostItem;
    const author = post.authorName || displayName;
    const time = post.timeAgo || 'Gần đây';
    const loc = post.locationTag || post.locationName || 'Việt Nam';
    const likes = post.likeCount ?? post.likesCount ?? 0;
    const comments = post.commentCount ?? post.commentsCount ?? 0;

    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Image source={{ uri: post.authorAvatar || avatarUrl }} style={styles.postAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.postAuthorName}>{author}</Text>
            <Text style={styles.postMeta}>
              {time} • 📍 {loc}
            </Text>
          </View>
        </View>

        {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}
        {post.content ? (
          <Text style={styles.postContent} numberOfLines={3}>
            {post.content}
          </Text>
        ) : null}

        {post.images && post.images.length > 0 ? (
          <Image source={{ uri: post.images[0] }} style={styles.postSingleImage} resizeMode="cover" />
        ) : null}

        <View style={styles.postFooter}>
          <View style={styles.postStatItem}>
            <FontAwesome name="heart" size={13} color="#EF4444" style={{ marginRight: 5 }} />
            <Text style={styles.postStatText}>{likes} thích</Text>
          </View>
          <View style={styles.postStatItem}>
            <FontAwesome name="comment-o" size={13} color={DS_COLOR.inkMuted} style={{ marginRight: 5 }} />
            <Text style={styles.postStatText}>{comments} bình luận</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <FlatList
        data={currentListData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderListItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[DS_COLOR.accent]} />
        }
        stickyHeaderIndices={[1]}
        ListHeaderComponent={
          <>
            {/* ─── 1. HERO PROFILE CARD GỌN GÀNG (~290px) ─────────── */}
            <View style={styles.heroCard}>
              {/* Cover Photo 120px */}
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
                    <ActivityIndicator size="small" color={DS_COLOR.accent} />
                  ) : (
                    <FontAwesome name="camera" size={11} color={DS_COLOR.accent} />
                  )}
                  <Text style={styles.coverEditBtnText}>Đổi bìa</Text>
                </TouchableOpacity>
              </View>

              {/* Profile Info Content */}
              <View style={styles.profileInfoContent}>
                {/* Avatar Row */}
                <View style={styles.avatarRow}>
                  {/* Avatar 72x72 */}
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
                        <FontAwesome name="camera" size={9} color="#FFFFFF" />
                      </View>
                    )}
                    <View style={[styles.tierCornerBadge, { backgroundColor: currentTier.cornerBgColor }]}>
                      <Text style={styles.tierCornerText}>{currentTier.cornerIcon}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Top-Right Action Buttons: Chỉnh sửa & Cài đặt ⚙ */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => setIsEditModalOpen(true)}
                      style={styles.editProfileBtn}
                      activeOpacity={0.8}
                    >
                      <FontAwesome name="pencil" size={12} color={DS_COLOR.ink} style={{ marginRight: 6 }} />
                      <Text style={styles.editProfileBtnText}>Chỉnh sửa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setIsSettingsOpen(true)}
                      style={styles.settingsCogBtn}
                      activeOpacity={0.8}
                      accessibilityLabel="Cài đặt & Tài khoản"
                    >
                      <FontAwesome name="cog" size={16} color={DS_COLOR.ink} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Name & Tier */}
                <View style={styles.userNameBlock}>
                  <View style={styles.nameRow}>
                    <Text style={styles.fullNameText} numberOfLines={1}>
                      {displayName}
                    </Text>
                    <TouchableOpacity
                      style={[styles.tierBadgePill, { backgroundColor: currentTier.badgeBg }]}
                      onPress={() => {
                        setBadgesInitialTab('badges');
                        setBadgesModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.tierBadgeText}>
                        {currentTier.icon} {currentTier.name}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Meta: Handle · Location · Style */}
                  <Text style={styles.metaLine} numberOfLines={1}>
                    {displayHandle} · 📍 {displayLocation} · 🧭 {displayTravelStyle}
                  </Text>

                  {/* Bio */}
                  {profileData?.bio ? (
                    <Text style={styles.bioText} numberOfLines={2}>
                      {profileData.bio}
                    </Text>
                  ) : null}

                  {/* 1 Hàng 3 Stat Nhấn Được */}
                  <View style={styles.statBar}>
                    <TouchableOpacity
                      style={styles.statItem}
                      onPress={() => setActiveTab('itineraries')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.statValue}>{itinsCount}</Text>
                      <Text style={styles.statLabel}>Chuyến đi</Text>
                    </TouchableOpacity>

                    <View style={styles.statDivider} />

                    <TouchableOpacity
                      style={styles.statItem}
                      onPress={() => setActiveTab('posts')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.statValue}>{postsCount}</Text>
                      <Text style={styles.statLabel}>Bài viết</Text>
                    </TouchableOpacity>

                    <View style={styles.statDivider} />

                    <TouchableOpacity
                      style={styles.statItem}
                      onPress={() => {
                        setFollowModalInitialTab('followers');
                        setFollowModalVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.statValue}>{activeFollowersCount}</Text>
                      <Text style={styles.statLabel}>Theo dõi</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* ─── 2. STICKY SEGMENTED TABS (3 TABS) ─────────────── */}
            <View style={styles.stickyTabBar}>
              <SegmentedTabs
                items={[
                  { key: 'itineraries', label: `Chuyến đi (${itinsCount})` },
                  { key: 'posts', label: `Bài viết (${postsCount})` },
                  { key: 'saved', label: `Đã lưu (${savedPosts.length})` },
                ]}
                value={activeTab}
                onChange={(key) => setActiveTab(key as ProfileTab)}
              />
            </View>
          </>
        }
        ListEmptyComponent={
          loadingSaved && activeTab === 'saved' ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={DS_COLOR.accent} />
              <Text style={styles.emptySubtitle}>Đang tải bài viết đã lưu...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <FontAwesome
                name={activeTab === 'itineraries' ? 'suitcase' : activeTab === 'posts' ? 'pencil' : 'bookmark-o'}
                size={36}
                color={DS_COLOR.inkMuted}
                style={{ marginBottom: 10 }}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'itineraries'
                  ? 'Chưa có lịch trình'
                  : activeTab === 'posts'
                  ? 'Chưa có bài viết'
                  : 'Chưa có bài viết đã lưu'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'itineraries'
                  ? 'Tạo chuyến đi đầu tiên ở tab Lịch trình để lưu lại hành trình của bạn.'
                  : activeTab === 'posts'
                  ? 'Hãy chia sẻ những trải nghiệm thực tế cùng cộng đồng du lịch Wayfare.'
                  : 'Lưu các bài viết yêu thích từ Bảng tin Cộng đồng để xem lại tại đây.'}
              </Text>
              {activeTab === 'itineraries' ? (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => router.push('/(tabs)/itinerary')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyActionBtnText}>Khám phá lịch trình</Text>
                </TouchableOpacity>
              ) : activeTab === 'posts' ? (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => router.push('/(tabs)/community')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyActionBtnText}>Xem cộng đồng</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
      />

      {/* ─── SETTINGS SHEET (MỞ KHI BẤM BÁNH RĂNG ⚙) ───────────── */}
      <SettingsSheet
        visible={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userName={displayName}
        userEmail={user?.email}
        currentTier={currentTier}
        userXP={userTotalXP}
        onEditProfile={() => setIsEditModalOpen(true)}
        onChangePassword={() => setIsChangePasswordOpen(true)}
        onViewBadges={() => {
          setBadgesInitialTab('badges');
          setBadgesModalVisible(true);
        }}
        onViewDna={() => {
          setBadgesInitialTab('dna');
          setBadgesModalVisible(true);
        }}
        onLogout={handleLogout}
      />

      {/* ─── BADGES & AI DNA MODAL ────────────────────────────── */}
      <BadgesModal
        visible={badgesModalVisible}
        onClose={() => setBadgesModalVisible(false)}
        currentTier={currentTier}
        nextTier={nextTier}
        userTotalXP={userTotalXP}
        progressPercent={progressPercent}
        achievements={achievements}
        profileData={profileData}
        initialTab={badgesInitialTab}
      />

      {/* ─── TRIP ACTION SHEET CHO CHUYẾN ĐI ───────────────────── */}
      <TripActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        itinerary={actionSheetItem}
        onView={() => {
          if (actionSheetItem) {
            setSelectedItinerary(actionSheetItem);
            setItineraryDetailVisible(true);
          }
        }}
        onShare={async () => {
          if (actionSheetItem) {
            try {
              await ShareTrip(actionSheetItem);
            } catch {
              // Ignore
            }
          }
        }}
        onToggleVisibility={async () => {
          if (actionSheetItem) {
            try {
              const nextPublic = !(actionSheetItem.isPublic !== false);
              await itineraryApi.toggleVisibility(actionSheetItem.id, nextPublic);
              showToast({
                kind: 'success',
                title: nextPublic ? 'Đã công khai lịch trình' : 'Đã chuyển sang riêng tư',
                message: nextPublic ? 'Mọi người có thể khám phá chuyến đi của bạn.' : 'Lịch trình chỉ hiển thị với bạn.',
              });
              loadProfile();
            } catch {
              showToast({ kind: 'error', title: 'Lỗi', message: 'Không thể cập nhật quyền hiển thị.' });
            }
          }
        }}
        onDelete={() => {
          if (actionSheetItem) handleDeleteItinerary(actionSheetItem);
        }}
      />

      {/* ─── ITINERARY DETAIL MODAL ───────────────────────────── */}
      <ItineraryDetailModal
        visible={itineraryDetailVisible}
        onClose={() => setItineraryDetailVisible(false)}
        itinerary={selectedItinerary}
        onItineraryUpdated={loadProfile}
        canEdit={true}
      />

      {/* ─── CHANGE PASSWORD MODAL ────────────────────────────── */}
      <ChangePasswordModal
        visible={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* ─── EDIT PROFILE MODAL ───────────────────────────────── */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh Sửa Hồ Sơ</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)} style={styles.modalCloseBtn}>
                <FontAwesome name="times" size={16} color={DS_COLOR.inkMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Avatar Picker */}
              <View style={styles.modalAvatarRow}>
                <Image
                  source={{
                    uri:
                      editAvatarUrl.trim() ||
                      avatarUrl ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                  }}
                  style={[styles.modalAvatarPreview, { borderColor: currentTier.avatarRingColor }]}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>Ảnh đại diện</Text>
                  <TouchableOpacity
                    onPress={handlePickAvatar}
                    disabled={isUploadingAvatar}
                    style={styles.pickImageBtn}
                    activeOpacity={0.8}
                  >
                    {isUploadingAvatar ? (
                      <ActivityIndicator size="small" color={DS_COLOR.accent} style={{ marginRight: 6 }} />
                    ) : (
                      <FontAwesome name="camera" size={12} color={DS_COLOR.accent} style={{ marginRight: 6 }} />
                    )}
                    <Text style={styles.pickImageBtnText}>
                      {isUploadingAvatar ? 'Đang tải ảnh lên...' : 'Chọn ảnh từ thiết bị'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Họ và tên <Text style={{ color: DS_COLOR.danger }}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập họ và tên..."
                  placeholderTextColor={DS_COLOR.inkMuted}
                  value={editFullName}
                  onChangeText={setEditFullName}
                />
              </View>

              {/* Handle & Phone */}
              <View style={styles.twoColumnRow}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Text style={styles.inputLabel}>Biệt danh</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="@wanderer"
                    placeholderTextColor={DS_COLOR.inkMuted}
                    value={editHandle}
                    onChangeText={setEditHandle}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.inputLabel}>Số điện thoại</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0912345678"
                    placeholderTextColor={DS_COLOR.inkMuted}
                    keyboardType="phone-pad"
                    value={editPhone}
                    onChangeText={setEditPhone}
                  />
                </View>
              </View>

              {/* Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Địa chỉ / Nơi cư trú</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: Quận 1, TP. Hồ Chí Minh"
                  placeholderTextColor={DS_COLOR.inkMuted}
                  value={editAddress}
                  onChangeText={setEditAddress}
                />
              </View>

              {/* Travel Style */}
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
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{style}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Budget */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Khẩu vị ngân sách</Text>
                <View style={styles.chipsRow}>
                  {BUDGET_PREFERENCES.map((b) => {
                    const isSelected = editBudget === b;
                    return (
                      <TouchableOpacity
                        key={b}
                        onPress={() => setEditBudget(b)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{b}</Text>
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
                  placeholder="Chia sẻ đôi điều về bản thân và niềm đam mê xê dịch..."
                  placeholderTextColor={DS_COLOR.inkMuted}
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

      {/* Follow Modal */}
      <FollowModal
        visible={followModalVisible}
        onClose={() => {
          setFollowModalVisible(false);
          loadProfile();
        }}
        initialTab={followModalInitialTab}
        onFollowChange={loadProfile}
        onSelectUser={(targetUserId) => {
          setSelectedUserIdForModal(targetUserId);
        }}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        visible={Boolean(selectedUserIdForModal)}
        userId={selectedUserIdForModal}
        onClose={() => setSelectedUserIdForModal(null)}
      />
    </View>
  );
}

async function ShareTrip(itin: ItineraryItem) {
  // Simple helper for sharing trip from profile
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: DS_COLOR.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DS_COLOR.bg,
  },
  loadingText: {
    marginTop: 12,
    fontSize: DS_TYPE.body,
    color: DS_COLOR.inkMuted,
  },
  listContent: {
    paddingBottom: 40,
  },

  // ─── HERO CARD (~290px) ──────────────────────────────────
  heroCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: DS_COLOR.surface,
    borderRadius: DS_RADIUS.lg,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    overflow: 'hidden',
  },
  coverWrapper: {
    height: 110,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.20)',
  },
  coverEditBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: DS_RADIUS.pill,
  },
  coverEditBtnText: {
    color: DS_COLOR.accent,
    fontSize: 10.5,
    fontWeight: '700',
    marginLeft: 4,
  },

  // Profile Content
  profileInfoContent: {
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -34,
    marginBottom: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS_COLOR.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  tierCornerBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  tierCornerText: {
    fontSize: 9.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: '#F5F5F4',
    borderWidth: 1,
    borderColor: DS_COLOR.line,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  settingsCogBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F4',
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  userNameBlock: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginRight: 8,
  },
  tierBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: DS_RADIUS.pill,
  },
  tierBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1E1A15',
  },
  metaLine: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
  },
  bioText: {
    fontSize: 12,
    color: DS_COLOR.inkSecondary,
    lineHeight: 17,
    marginTop: 2,
  },

  // Stat Bar (3 Items)
  statBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F5',
    borderRadius: DS_RADIUS.md,
    paddingVertical: 8,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: DS_COLOR.line,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  statLabel: {
    fontSize: 10.5,
    color: DS_COLOR.inkMuted,
    marginTop: 1,
  },

  // Sticky Tab Bar
  stickyTabBar: {
    backgroundColor: DS_COLOR.bg,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  // Post Card Styles
  postCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: DS_COLOR.surface,
    borderRadius: DS_RADIUS.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  postAuthorName: {
    fontSize: 13,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  postMeta: {
    fontSize: 11,
    color: DS_COLOR.inkMuted,
  },
  postTitle: {
    fontSize: DS_TYPE.body,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginBottom: 4,
  },
  postContent: {
    fontSize: 13,
    color: DS_COLOR.inkSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  postSingleImage: {
    width: '100%',
    height: 160,
    borderRadius: DS_RADIUS.md,
    marginBottom: 8,
  },
  postFooter: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 4,
  },
  postStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatText: {
    fontSize: 11.5,
    color: DS_COLOR.inkMuted,
  },

  // Empty Container
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: DS_TYPE.body,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
  },
  emptyActionBtn: {
    backgroundColor: DS_COLOR.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: DS_RADIUS.pill,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },

  // Auth Styles
  authScroll: {
    padding: 20,
    paddingTop: 40,
  },
  authHero: {
    alignItems: 'center',
    marginBottom: 24,
  },
  authLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDF2F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  authHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: DS_COLOR.ink,
    marginBottom: 6,
  },
  authHeroDesc: {
    fontSize: 12.5,
    color: DS_COLOR.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  authCard: {
    backgroundColor: DS_COLOR.surface,
    borderRadius: DS_RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
  },
  authTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F4',
    borderRadius: DS_RADIUS.pill,
    padding: 3,
    marginBottom: 16,
  },
  authTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: DS_RADIUS.pill,
  },
  authTabActive: {
    backgroundColor: '#FFFFFF',
  },
  authTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: DS_COLOR.inkMuted,
  },
  authTabTextActive: {
    color: DS_COLOR.accent,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    borderRadius: DS_RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: DS_COLOR.ink,
  },
  primaryAuthBtn: {
    backgroundColor: DS_COLOR.accent,
    paddingVertical: 12,
    borderRadius: DS_RADIUS.pill,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryAuthBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: DS_COLOR.line,
  },
  orText: {
    fontSize: 10,
    fontWeight: '700',
    color: DS_COLOR.inkMuted,
    marginHorizontal: 10,
  },
  googleAuthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DS_COLOR.line,
  },
  googleAuthBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: DS_COLOR.surface,
    borderTopLeftRadius: DS_RADIUS.sheet,
    borderTopRightRadius: DS_RADIUS.sheet,
    maxHeight: '90%',
  },
  modalHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: DS_COLOR.line,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatarPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
  pickImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FDF2F0',
    borderRadius: DS_RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  pickImageBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  twoColumnRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: '#F5F5F4',
  },
  chipActive: {
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: DS_COLOR.accent,
  },
  chipText: {
    fontSize: 11.5,
    color: DS_COLOR.ink,
  },
  chipTextActive: {
    color: DS_COLOR.accent,
    fontWeight: '700',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: DS_COLOR.line,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: DS_COLOR.accent,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
