import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  Share,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { confirmDialog } from '@/components/ConfirmDialog';
import { FollowModal } from '@/components/FollowModal';
import { TripActionSheet } from '@/components/itinerary/TripActionSheet';
import { TripCard } from '@/components/itinerary/TripCard';
import { ItineraryDetailModal } from '@/components/ItineraryDetailModal';
import { PostDetailModal } from '@/components/community/PostDetailModal';
import { ImageLightbox } from '@/components/community/ImageLightbox';
import { PostMedia } from '@/components/community/PostMedia';
import { getPostImages } from '@/components/community/communityUtils';
import { BadgesModal } from '@/components/profile/BadgesModal';
import { TravelFootprintSheet } from '@/components/profile/TravelFootprintSheet';
import { SettingsSheet } from '@/components/profile/SettingsSheet';
import { Text, TextInput } from '@/components/Themed';
import { ToastHost, showToast } from '@/components/Toast';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { UserProfileModal } from '@/components/UserProfileModal';
import { PlaceCard } from '@/components/explore/PlaceCard';
import { DS_COLOR, DS_RADIUS, DS_SPACE, DS_TOUCH, DS_TYPE } from '@/constants/DesignSystem';
import {
  authApi,
  itineraryApi,
  ItineraryItem,
  postApi,
  PostItem,
  PlaceItem,
  UpdateProfilePayload,
  uploadApi,
  userApi,
  UserProfileItem,
  webItineraryUrl,
} from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import { authPrompt } from '@/src/services/authPrompt';
import { savedPlaces } from '@/src/services/savedPlaces';
import { tabBarVisibility } from '@/src/services/tabBarVisibility';
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

const BUDGET_PREFERENCES = ['Tiết kiệm', 'Linh hoạt', 'Sang chảnh'];

export type ProfileTab = 'itineraries' | 'posts' | 'saved';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < 380;

  const [user, setUser] = useState<UserSession | null>(null);
  const [profileData, setProfileData] = useState<UserProfileItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const profileRequestVersion = useRef(0);
  const profileAccount = useRef<number | string | null>(null);
  const profileGeneration = useRef(0);
  const savedPostsRequestVersion = useRef(0);
  const savedPlacesRequestVersion = useRef(0);
  const savedPlaceMutations = useRef(new Set<string>());
  const bookmarkMutations = useRef(new Set<string>());
  const profileMutation = useRef<'save' | 'avatar' | null>(null);

  // Active sub-tab: 3 tabs gọn gàng
  const [activeTab, setActiveTab] = useState<ProfileTab>('itineraries');

  // Bookmarked posts
  const [savedPosts, setSavedPosts] = useState<PostItem[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);
  const [savedPostsError, setSavedPostsError] = useState<string | null>(null);
  const [savedContentType, setSavedContentType] = useState<'places' | 'posts'>('places');
  const [savedPlaceItems, setSavedPlaceItems] = useState<PlaceItem[]>([]);
  const [loadingSavedPlaces, setLoadingSavedPlaces] = useState(false);
  const [savedPlacesError, setSavedPlacesError] = useState<string | null>(null);
  const [removingPlaceIds, setRemovingPlaceIds] = useState<number[]>([]);
  const [bookmarkedMap, setBookmarkedMap] = useState<Record<number, boolean>>({});
  const [detailPost, setDetailPost] = useState<PostItem | null>(null);

  // Settings Sheet & Badges Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [badgesModalVisible, setBadgesModalVisible] = useState<boolean>(false);
  const [badgesInitialTab, setBadgesInitialTab] = useState<'badges' | 'dna'>('badges');
  const [footprintVisible, setFootprintVisible] = useState(false);

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

  // Follow Modal state
  const [followModalVisible, setFollowModalVisible] = useState<boolean>(false);
  const [followModalInitialTab, setFollowModalInitialTab] = useState<'followers' | 'following'>('followers');
  const [selectedUserIdForModal, setSelectedUserIdForModal] = useState<number | null>(null);

  // Itinerary Detail Modal state
  const [selectedItinerary, setSelectedItinerary] = useState<ItineraryItem | null>(null);
  const [itineraryDetailVisible, setItineraryDetailVisible] = useState<boolean>(false);
  const [actionSheetVisible, setActionSheetVisible] = useState<boolean>(false);
  const [actionSheetItem, setActionSheetItem] = useState<ItineraryItem | null>(null);

  // Lightbox state
  const [lightboxPost, setLightboxPost] = useState<PostItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const clearProfileState = useCallback(() => {
    profileGeneration.current += 1;
    profileMutation.current = null;
    savedPostsRequestVersion.current += 1;
    savedPlacesRequestVersion.current += 1;
    setProfileData(null);
    setSavedPosts([]);
    setLoadingSaved(false);
    setSavedPostsError(null);
    setSavedPlaceItems([]);
    setSavedContentType('places');
    setLoadingSavedPlaces(false);
    setSavedPlacesError(null);
    setRemovingPlaceIds([]);
    setIsSavingProfile(false);
    setIsUploadingAvatar(false);
    setIsUploadingCover(false);
    setBookmarkedMap({});
    setDetailPost(null);
    setLightboxPost(null);
    setLightboxIndex(null);
    setSelectedItinerary(null);
    setItineraryDetailVisible(false);
    setActionSheetVisible(false);
    setActionSheetItem(null);
    setIsSettingsOpen(false);
    setBadgesModalVisible(false);
    setFootprintVisible(false);
    setIsEditModalOpen(false);
    setIsChangePasswordOpen(false);
    setFollowModalVisible(false);
    setSelectedUserIdForModal(null);
    setEditFullName('');
    setEditHandle('');
    setEditBio('');
    setEditPhone('');
    setEditTravelStyle('Khám phá tự do');
    setEditBudget('Linh hoạt');
    setEditAddress('');
    setEditAvatarUrl('');
    setActiveTab('itineraries');
  }, []);

  const loadProfile = useCallback(async (session: UserSession | null) => {
    const requestVersion = ++profileRequestVersion.current;
    const account = session?.token ? session.id ?? session.email ?? session.token : null;
    if (profileAccount.current !== account) {
      clearProfileState();
      profileAccount.current = account;
    }
    setUser(session);
    try {
      if (session?.token) {
        try {
          const live = await userApi.getMyProfile();
          if (requestVersion !== profileRequestVersion.current) return;
          if (live) {
            setProfileData(live);
          }
        } catch (pe) {
          if (requestVersion === profileRequestVersion.current) {
            console.warn('Could not fetch live profile from MySQL', pe);
          }
        }
      }
    } catch (e) {
      console.warn('Load session error', e);
    } finally {
      if (requestVersion === profileRequestVersion.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [clearProfileState]);

  useEffect(() => {
    let active = true;
    let sessionChanged = false;
    const unsubscribe = authStorage.subscribe((session) => {
      sessionChanged = true;
      void loadProfile(session);
    });
    void authStorage.getSession().then((session) => {
      if (active && !sessionChanged) void loadProfile(session);
    });
    return () => {
      active = false;
      profileRequestVersion.current += 1;
      profileGeneration.current += 1;
      savedPostsRequestVersion.current += 1;
      savedPlacesRequestVersion.current += 1;
      unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    const requestVersion = profileRequestVersion.current;
    const session = await authStorage.getSession();
    if (requestVersion === profileRequestVersion.current) await loadProfile(session);
  }, [loadProfile]);

  const loadSavedPosts = useCallback(async () => {
    const requestVersion = ++savedPostsRequestVersion.current;
    try {
      setLoadingSaved(true);
      setSavedPostsError(null);
      const res = await postApi.getBookmarkedPosts();
      if (requestVersion !== savedPostsRequestVersion.current) return;
      setSavedPosts(res);
      const map: Record<number, boolean> = {};
      res.forEach((p) => {
        map[p.id] = true;
      });
      setBookmarkedMap(map);
    } catch (err: any) {
      if (requestVersion === savedPostsRequestVersion.current) {
        console.warn('Could not load saved posts', err);
        setSavedPostsError(err?.response?.data?.message || err?.message || 'Không thể tải bài viết đã lưu.');
      }
    } finally {
      if (requestVersion === savedPostsRequestVersion.current) setLoadingSaved(false);
    }
  }, []);

  const loadSavedPlaceItems = useCallback(async () => {
    const requestVersion = ++savedPlacesRequestVersion.current;
    setLoadingSavedPlaces(true);
    setSavedPlacesError(null);
    try {
      const items = await savedPlaces.getItems();
      if (requestVersion === savedPlacesRequestVersion.current) setSavedPlaceItems(items);
    } catch (error: any) {
      if (requestVersion === savedPlacesRequestVersion.current) {
        setSavedPlacesError(error?.response?.data?.message || error?.message || 'Không thể tải địa điểm đã lưu.');
      }
    } finally {
      if (requestVersion === savedPlacesRequestVersion.current) setLoadingSavedPlaces(false);
    }
  }, []);

  const loadSelectedSavedContent = () => savedContentType === 'places' ? loadSavedPlaceItems() : loadSavedPosts();

  const handleRemoveSavedPlace = async (place: PlaceItem) => {
    const generation = profileGeneration.current;
    const mutationKey = `${generation}:${place.id}`;
    if (!user?.token || savedPlaceMutations.current.has(mutationKey)) return;
    savedPlaceMutations.current.add(mutationKey);
    setRemovingPlaceIds(ids => [...ids, place.id]);
    // Invalidate older GETs so a delayed response cannot restore a removed item.
    savedPlacesRequestVersion.current += 1;
    setLoadingSavedPlaces(false);
    try {
      await savedPlaces.remove(place.id);
      if (generation !== profileGeneration.current) return;
      savedPlacesRequestVersion.current += 1;
      setLoadingSavedPlaces(false);
      setSavedPlaceItems(items => items.filter(item => item.id !== place.id));
      setSavedPlacesError(null);
      showToast({ kind: 'success', title: 'Đã bỏ lưu địa điểm', message: place.name });
    } catch (error: any) {
      if (generation !== profileGeneration.current) return;
      showToast({ kind: 'error', title: 'Bỏ lưu thất bại', message: error?.response?.data?.message || error?.message || 'Vui lòng thử lại.' });
    } finally {
      savedPlaceMutations.current.delete(mutationKey);
      if (generation === profileGeneration.current) setRemovingPlaceIds(ids => ids.filter(id => id !== place.id));
    }
  };

  const handleToggleBookmark = async (postId: number) => {
    const generation = profileGeneration.current;
    const mutationKey = `${generation}:${postId}`;
    if (bookmarkMutations.current.has(mutationKey)) return;
    bookmarkMutations.current.add(mutationKey);
    savedPostsRequestVersion.current += 1;
    setLoadingSaved(false);
    try {
      const res = await postApi.toggleBookmark(postId);
      if (generation !== profileGeneration.current) return;
      const isBookmarked = res.isBookmarked;
      savedPostsRequestVersion.current += 1;
      setLoadingSaved(false);
      setBookmarkedMap((prev) => ({ ...prev, [postId]: isBookmarked }));
      if (!isBookmarked) {
        savedPostsRequestVersion.current += 1;
        setLoadingSaved(false);
        setSavedPosts((prev) => prev.filter((p) => p.id !== postId));
        showToast({
          kind: 'info',
          title: 'Đã bỏ lưu',
          message: 'Đã gỡ bài viết khỏi danh sách Đã lưu.',
        });
      } else {
        const post = detailPost?.id === postId ? detailPost : profileData?.posts?.find(item => item.id === postId);
        if (post) setSavedPosts(items => items.some(item => item.id === postId) ? items : [{ ...post, isBookmarked: true }, ...items]);
        showToast({
          kind: 'success',
          title: 'Đã lưu',
          message: 'Đã lưu bài viết vào danh sách Đã lưu của bạn.',
        });
      }
    } catch (err: any) {
      if (generation !== profileGeneration.current) return;
      showToast({
        kind: 'error',
        title: 'Thao tác thất bại',
        message: err?.response?.data?.message || 'Không thể thay đổi trạng thái lưu.',
      });
    } finally {
      bookmarkMutations.current.delete(mutationKey);
    }
  };

  const onRefresh = async () => {
    const generation = profileGeneration.current;
    setRefreshing(true);
    await refreshProfile();
    if (generation === profileGeneration.current && activeTab === 'saved' && user?.token) {
      await loadSelectedSavedContent();
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
    showToast({
      kind: 'info',
      title: 'Đã đăng xuất',
      message: 'Hẹn gặp lại bạn trên hành trình tiếp theo!',
      icon: 'sign-out',
    });
  };

  // ─── EDIT PROFILE HANDLER ──────────────────────────────────
  const openEditProfile = () => {
    if (profileMutation.current) return;
    setEditFullName(profileData?.fullName || user?.fullName || '');
    setEditHandle(profileData?.handle || user?.handle || '');
    setEditBio(profileData?.bio ?? '');
    setEditPhone(profileData?.phoneNumber ?? profileData?.phone ?? '');
    setEditTravelStyle(profileData?.travelStyle || 'Khám phá tự do');
    setEditBudget(profileData?.budgetPreference || 'Linh hoạt');
    setEditAddress(profileData?.address ?? profileData?.location ?? '');
    setEditAvatarUrl(profileData?.avatarUrl || user?.avatarUrl || user?.avatar || '');
    setIsEditModalOpen(true);
  };

  const closeEditProfile = () => {
    if (!profileMutation.current) setIsEditModalOpen(false);
  };

  const openChangePassword = () => {
    if (profileMutation.current) return;
    const generation = profileGeneration.current;
    setIsEditModalOpen(false);
    setIsSettingsOpen(false);
    // Let the current native modal finish closing before presenting the next one.
    setTimeout(() => {
      if (generation === profileGeneration.current) setIsChangePasswordOpen(true);
    }, 320);
  };

  const closeFootprint = useCallback(() => setFootprintVisible(false), []);

  const openFootprint = () => {
    const generation = profileGeneration.current;
    setIsSettingsOpen(false);
    setTimeout(() => {
      if (generation === profileGeneration.current) setFootprintVisible(true);
    }, 320);
  };

  const applyProfileUpdate = async (updated: UserProfileItem, generation: number) => {
    const currentSession = await authStorage.getSession();
    if (generation !== profileGeneration.current || !currentSession?.token) return false;
    setProfileData((prev) => (prev ? { ...prev, ...updated } : updated));
    await authStorage.saveSession({
      ...currentSession,
      fullName: updated.fullName,
      handle: updated.handle,
      avatar: updated.avatarUrl || currentSession.avatar,
      avatarUrl: updated.avatarUrl || currentSession.avatarUrl,
      bio: updated.bio,
      phoneNumber: updated.phoneNumber,
      address: updated.address,
      travelStyle: updated.travelStyle,
      budgetPreference: updated.budgetPreference,
    });
    return generation === profileGeneration.current;
  };

  const handleSaveProfile = async () => {
    if (!user?.token || profileMutation.current) return;
    const generation = profileGeneration.current;
    if (!editFullName.trim()) {
      showToast({ kind: 'error', title: 'Thiếu thông tin', message: 'Họ và tên không được để trống.' });
      return;
    }
    const trimmedHandle = editHandle.trim();
    const normalizedHandle = trimmedHandle && !trimmedHandle.startsWith('@') ? `@${trimmedHandle}` : trimmedHandle;
    const fields = [
      { label: 'Họ và tên', value: editFullName.trim(), max: 100 },
      { label: 'Biệt danh', value: normalizedHandle, max: 50 },
      { label: 'Số điện thoại', value: editPhone.trim(), max: 20 },
      { label: 'Địa chỉ', value: editAddress.trim(), max: 255 },
      { label: 'Tiểu sử', value: editBio.trim(), max: 500 },
      { label: 'Phong cách du lịch', value: editTravelStyle, max: 100 },
      { label: 'Ngân sách', value: editBudget, max: 50 },
      { label: 'Đường dẫn ảnh', value: editAvatarUrl.trim(), max: 500 },
    ];
    const invalid = fields.find(field => field.value.length > field.max);
    if (invalid) {
      showToast({ kind: 'error', title: 'Thông tin quá dài', message: `${invalid.label} tối đa ${invalid.max} ký tự.` });
      return;
    }
    profileMutation.current = 'save';
    try {
      setIsSavingProfile(true);
      const payload: UpdateProfilePayload = {
        fullName: editFullName.trim(),
        handle: normalizedHandle || undefined,
        bio: editBio.trim(),
        phoneNumber: editPhone.trim(),
        travelStyle: editTravelStyle,
        budgetPreference: editBudget,
        address: editAddress.trim(),
        avatarUrl: editAvatarUrl.trim() || undefined,
      };

      const updated = await userApi.updateProfile(payload);
      if (generation !== profileGeneration.current) return;
      if (!updated?.id) throw new Error('Chưa nhận được hồ sơ đã cập nhật từ máy chủ. Vui lòng thử lại.');
      if (await applyProfileUpdate(updated, generation)) {
        setIsEditModalOpen(false);
        setTimeout(() => showToast({
          kind: 'success',
          title: 'Đã lưu hồ sơ',
          message: 'Thông tin cá nhân của bạn đã được cập nhật.',
        }), 300);
      }
    } catch (err: any) {
      if (generation !== profileGeneration.current) return;
      const msg = err.response?.data?.message || err.message || 'Lỗi khi cập nhật hồ sơ';
      showToast({ kind: 'error', title: 'Cập nhật thất bại', message: msg });
    } finally {
      if (generation === profileGeneration.current) {
        profileMutation.current = null;
        setIsSavingProfile(false);
      }
    }
  };

  const handlePickAvatar = async (saveImmediately = false) => {
    if (!user?.token || profileMutation.current) return;
    const generation = profileGeneration.current;
    profileMutation.current = 'avatar';
    setIsUploadingAvatar(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (generation !== profileGeneration.current) return;
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uploadedUrl = await uploadApi.uploadSingle(asset.uri, asset.fileName || 'avatar.jpg', asset.mimeType || undefined);
        if (generation !== profileGeneration.current) return;
        if (!uploadedUrl || uploadedUrl.length > 500) throw new Error('Đường dẫn ảnh đại diện không hợp lệ. Vui lòng chọn ảnh khác.');
        if (saveImmediately) {
          const updated = await userApi.updateProfile({ avatarUrl: uploadedUrl });
          if (generation !== profileGeneration.current) return;
          if (!updated?.id) throw new Error('Chưa nhận được hồ sơ đã cập nhật. Vui lòng thử lại.');
          if (!await applyProfileUpdate(updated, generation)) return;
        }
        setEditAvatarUrl(uploadedUrl);
        showToast({
          kind: 'success',
          title: 'Đã tải ảnh đại diện',
          message: saveImmediately ? 'Ảnh đại diện của bạn đã được cập nhật.' : 'Nhấn “Lưu thay đổi” để cập nhật ảnh lên hồ sơ.',
        });
      }
    } catch (error: any) {
      if (generation !== profileGeneration.current) return;
      showToast({ kind: 'error', title: 'Tải ảnh thất bại', message: error?.response?.data?.message || error?.message || 'Không thể cập nhật ảnh đại diện.' });
    } finally {
      if (generation === profileGeneration.current) {
        profileMutation.current = null;
        setIsUploadingAvatar(false);
      }
    }
  };

  const handlePickCover = async () => {
    const generation = profileGeneration.current;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (generation !== profileGeneration.current) return;
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploadingCover(true);
        const uploadedUrl = await uploadApi.uploadSingle(result.assets[0].uri);
        if (generation !== profileGeneration.current) return;
        setProfileData((prev) => (prev ? { ...prev, coverImageUrl: uploadedUrl } : null));
        showToast({
          kind: 'success',
          title: 'Ảnh bìa mới',
          message: 'Ảnh bìa trang cá nhân đã được lưu thành công.',
        });
      }
    } catch {
      if (generation !== profileGeneration.current) return;
      showToast({ kind: 'error', title: 'Tải ảnh bìa thất bại', message: 'Không thể cập nhật ảnh bìa.' });
    } finally {
      if (generation === profileGeneration.current) setIsUploadingCover(false);
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
      void refreshProfile();
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

  // Guests open the same authentication form used throughout the app.
  if (!user?.token) {
    return (
      <View style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.authScroll, { paddingHorizontal: isSmallScreen ? 12 : 16 }]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.authCard}>
            <View style={styles.authLogoCircle}>
              <FontAwesome name="user-o" size={28} color={DS_COLOR.accent} />
            </View>
            <Text style={styles.authHeroTitle}>Chưa đăng nhập tài khoản</Text>
            <Text style={styles.authHeroDesc}>
              Đăng nhập để quản lý hồ sơ cá nhân, lịch trình du lịch và các bài viết chia sẻ của bạn.
            </Text>
            <TouchableOpacity
              onPress={() => authPrompt.open('login')}
              style={styles.primaryAuthBtn}
              activeOpacity={0.8}
              accessibilityRole="button">
              <Text style={styles.primaryAuthBtnText}>Đăng nhập ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => authPrompt.open('register')}
              style={styles.registerLink}
              activeOpacity={0.8}
              accessibilityRole="button">
              <Text style={styles.registerLinkText}>Tạo tài khoản mới</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

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
  const showingSavedPlaces = activeTab === 'saved' && savedContentType === 'places';
  const savedContentLoading = savedContentType === 'places' ? loadingSavedPlaces : loadingSaved;
  const savedContentError = savedContentType === 'places' ? savedPlacesError : savedPostsError;

  // Current list data
  const currentListData: (ItineraryItem | PostItem | PlaceItem)[] =
    activeTab === 'itineraries'
      ? displayItineraries
      : activeTab === 'posts'
      ? displayPosts
      : showingSavedPlaces ? savedPlaceItems : savedPosts;

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

    if (showingSavedPlaces) {
      const place = item as PlaceItem;
      return (
        <PlaceCard
          place={place}
          saved
          saving={removingPlaceIds.includes(place.id)}
          onToggleSave={() => handleRemoveSavedPlace(place)}
          onPress={() => router.push({ pathname: '/(tabs)/explore', params: { q: place.name } })}
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
    const postImages = getPostImages(post);

    return (
      <View style={[styles.postCard, isSmallScreen && { marginHorizontal: 12, padding: 10 }]}>
        <View style={styles.postHeader}>
          <Image source={{ uri: post.authorAvatar || avatarUrl }} style={[styles.postAvatar, isSmallScreen && { width: 32, height: 32, borderRadius: 16, marginRight: 8 }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.postAuthorName, isSmallScreen && { fontSize: 12.5 }]}>{author}</Text>
            <Text style={[styles.postMeta, isSmallScreen && { fontSize: 10.5 }]}>
              {time} • 📍 {loc}
            </Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={() => setDetailPost(post)}>
          {post.title ? <Text style={[styles.postTitle, isSmallScreen && { fontSize: 13.5 }]}>{post.title}</Text> : null}
          {post.content ? (
            <Text style={[styles.postContent, isSmallScreen && { fontSize: 12, lineHeight: 17 }]} numberOfLines={3}>
              {post.content}
            </Text>
          ) : null}
        </TouchableOpacity>

        {postImages.length > 0 || Boolean(post.videoUrl) ? (
          <View style={{ marginTop: 8 }}>
            <PostMedia
              images={postImages}
              videoUrl={post.videoUrl}
              onPressImage={(idx) => {
                setLightboxPost(post);
                setLightboxIndex(idx);
              }}
            />
          </View>
        ) : null}

        <View style={[styles.postFooter, isSmallScreen && { gap: 10 }]}>
          <View style={styles.postStatItem}>
            <FontAwesome name="heart" size={isSmallScreen ? 11 : 13} color="#EF4444" style={{ marginRight: 4 }} />
            <Text style={[styles.postStatText, isSmallScreen && { fontSize: 11 }]}>{likes} thích</Text>
          </View>
          <View style={styles.postStatItem}>
            <FontAwesome name="comment-o" size={isSmallScreen ? 11 : 13} color={DS_COLOR.inkMuted} style={{ marginRight: 4 }} />
            <Text style={[styles.postStatText, isSmallScreen && { fontSize: 11 }]}>{comments} bình luận</Text>
          </View>

          <View style={{ flex: 1 }} />

          {/* Nút Gỡ lưu (chỉ hiển thị khi đang xem tab Bài viết Đã lưu) */}
          {activeTab === 'saved' ? (
            <TouchableOpacity
              style={styles.postBookmarkBtn}
              onPress={() => handleToggleBookmark(post.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Bỏ lưu bài viết"
            >
              <FontAwesome
                name="bookmark"
                size={16}
                color="#F59E0B"
              />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.postDetailLinkBtn}
            onPress={() => setDetailPost(post)}
          >
            <Text style={[styles.postDetailLinkText, isSmallScreen && { fontSize: 11 }]}>Xem bài</Text>
            <FontAwesome name="angle-right" size={12} color={DS_COLOR.accent} style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.safeArea}>
      <FlatList
        accessibilityLabel="Nội dung hồ sơ"
        data={currentListData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderListItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={tabBarVisibility.onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[DS_COLOR.accent]} />
        }
        stickyHeaderIndices={[1]}
        ListHeaderComponent={
          <>
            {/* ─── 1. HERO PROFILE CARD GỌN GÀNG (~290px) ─────────── */}
            <View style={[styles.heroCard, isSmallScreen && { marginHorizontal: 12, marginTop: 8 }]}>
              {/* Cover Photo 120px */}
              <View style={[styles.coverWrapper, isSmallScreen && { height: 95 }]}>
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
              <View style={[styles.profileInfoContent, isSmallScreen && { paddingHorizontal: 10, paddingBottom: 10 }]}>
                {/* Avatar Row */}
                <View style={[styles.avatarRow, isSmallScreen && { marginTop: -26, marginBottom: 6 }]}>
                  {/* Avatar 72x72 */}
                  <TouchableOpacity
                    onPress={() => handlePickAvatar(true)}
                    disabled={isUploadingAvatar || isSavingProfile}
                    accessibilityRole="button"
                    accessibilityLabel="Đổi ảnh đại diện"
                    style={styles.avatarWrapper}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: avatarUrl }}
                      style={[
                        styles.avatarImage,
                        isSmallScreen && { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5 },
                        { borderColor: currentTier.avatarRingColor },
                      ]}
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
                  <View style={[styles.actionRow, isSmallScreen && { gap: 6 }]}>
                    <TouchableOpacity
                      onPress={openEditProfile}
                      accessibilityRole="button"
                      style={[styles.editProfileBtn, isSmallScreen && { paddingHorizontal: 10, paddingVertical: 5 }]}
                      activeOpacity={0.8}
                    >
                      <FontAwesome name="pencil" size={11} color={DS_COLOR.ink} style={{ marginRight: 4 }} />
                      <Text style={[styles.editProfileBtnText, isSmallScreen && { fontSize: 11 }]}>Chỉnh sửa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setIsSettingsOpen(true)}
                      style={[styles.settingsCogBtn, isSmallScreen && { width: 28, height: 28, borderRadius: 14 }]}
                      activeOpacity={0.8}
                      accessibilityLabel="Cài đặt & Tài khoản"
                    >
                      <FontAwesome name="cog" size={isSmallScreen ? 14 : 16} color={DS_COLOR.ink} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Name & Tier */}
                <View style={styles.userNameBlock}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.fullNameText, isSmallScreen && { fontSize: 15 }]} numberOfLines={1}>
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
                      <Text style={[styles.tierBadgeText, isSmallScreen && { fontSize: 9.5 }]}>
                        {currentTier.icon} {currentTier.name}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Meta: Handle · Location · Style */}
                  <Text style={[styles.metaLine, isSmallScreen && { fontSize: 10.5 }]} numberOfLines={1}>
                    {displayHandle} · 📍 {displayLocation} · 🧭 {displayTravelStyle}
                  </Text>

                  {/* Bio */}
                  {profileData?.bio ? (
                    <Text style={[styles.bioText, isSmallScreen && { fontSize: 11.5 }]} numberOfLines={2}>
                      {profileData.bio}
                    </Text>
                  ) : null}

                  {/* 1 Hàng 3 Stat Nhấn Được */}
                  <View style={[styles.statBar, isSmallScreen && { paddingVertical: 6, marginTop: 6 }]}>
                    <TouchableOpacity
                      style={styles.statItem}
                      onPress={() => setActiveTab('itineraries')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statValue, isSmallScreen && { fontSize: 14 }]}>{itinsCount}</Text>
                      <Text style={styles.statLabel}>Lịch trình</Text>
                    </TouchableOpacity>

                    <View style={styles.statDivider} />

                    <TouchableOpacity
                      style={styles.statItem}
                      onPress={() => setActiveTab('posts')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statValue, isSmallScreen && { fontSize: 14 }]}>{postsCount}</Text>
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
                      <Text style={[styles.statValue, isSmallScreen && { fontSize: 14 }]}>{activeFollowersCount}</Text>
                      <Text style={styles.statLabel}>Theo dõi</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* ─── 2. STICKY SEGMENTED TABS (3 TABS) ─────────────── */}
            <View style={[styles.stickyTabBar, isSmallScreen && { paddingHorizontal: 12, paddingVertical: 4 }]}>
              <SegmentedTabs
                items={[
                  { key: 'itineraries', label: `Lịch trình (${itinsCount})` },
                  { key: 'posts', label: `Bài viết (${postsCount})` },
                  { key: 'saved', label: 'Đã lưu' },
                ]}
                value={activeTab}
                onChange={(key) => {
                  setActiveTab(key as ProfileTab);
                  if (key === 'saved') void loadSelectedSavedContent();
                }}
              />
              {activeTab === 'saved' && (
                <View style={styles.savedControls}>
                  <SegmentedTabs
                    items={[
                      { key: 'places', label: `Địa điểm (${savedPlaceItems.length})` },
                      { key: 'posts', label: `Bài viết (${savedPosts.length})` },
                    ]}
                    value={savedContentType}
                    onChange={(kind) => {
                      setSavedContentType(kind);
                      if (kind === 'places') void loadSavedPlaceItems();
                      else void loadSavedPosts();
                    }}
                  />
                  {currentListData.length > 0 && savedContentLoading && <ActivityIndicator color={DS_COLOR.accent} accessibilityLabel="Đang tải danh sách đã lưu" />}
                  {currentListData.length > 0 && savedContentError && (
                    <View style={styles.savedError}>
                      <Text style={styles.savedErrorText}>{savedContentError}</Text>
                      <TouchableOpacity onPress={loadSelectedSavedContent} accessibilityRole="button" style={styles.retryButton}>
                        <Text style={styles.postDetailLinkText}>Thử lại</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          </>
        }
        ListEmptyComponent={
          savedContentLoading && activeTab === 'saved' ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="small" color={DS_COLOR.accent} />
              <Text style={styles.emptySubtitle}>{showingSavedPlaces ? 'Đang tải địa điểm đã lưu...' : 'Đang tải bài viết đã lưu...'}</Text>
            </View>
          ) : activeTab === 'saved' && savedContentError ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Chưa tải được danh sách đã lưu</Text>
              <Text style={styles.emptySubtitle}>{savedContentError}</Text>
              <TouchableOpacity onPress={loadSelectedSavedContent} style={styles.emptyActionBtn} accessibilityRole="button">
                <Text style={styles.emptyActionBtnText}>Thử lại</Text>
              </TouchableOpacity>
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
                  : showingSavedPlaces ? 'Chưa có địa điểm đã lưu' : 'Chưa có bài viết đã lưu'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'itineraries'
                  ? 'Tạo chuyến đi đầu tiên ở tab Lịch trình để lưu lại hành trình của bạn.'
                  : activeTab === 'posts'
                  ? 'Hãy chia sẻ những trải nghiệm thực tế cùng cộng đồng du lịch Wayfare.'
                  : showingSavedPlaces ? 'Bấm trái tim trong trang Khám phá để lưu những địa điểm bạn muốn ghé thăm.' : 'Lưu các bài viết yêu thích từ Bảng tin Cộng đồng để xem lại tại đây.'}
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
              ) : (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => router.push(showingSavedPlaces ? '/(tabs)/explore' : '/(tabs)/community')}
                  activeOpacity={0.85}
                  accessibilityRole="button">
                  <Text style={styles.emptyActionBtnText}>{showingSavedPlaces ? 'Khám phá địa điểm' : 'Xem cộng đồng'}</Text>
                </TouchableOpacity>
              )}
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
        onEditProfile={openEditProfile}
        onChangePassword={openChangePassword}
        onViewBadges={() => {
          setBadgesInitialTab('badges');
          setBadgesModalVisible(true);
        }}
        onViewDna={() => {
          setBadgesInitialTab('dna');
          setBadgesModalVisible(true);
        }}
        onViewFootprint={openFootprint}
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

      <TravelFootprintSheet
        key={user?.token || 'guest'}
        visible={footprintVisible}
        onClose={closeFootprint}
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
              void refreshProfile();
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
        onItineraryUpdated={refreshProfile}
        canEdit={true}
      />

      {/* ─── CHANGE PASSWORD MODAL ────────────────────────────── */}
      <ChangePasswordModal
        visible={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* ─── EDIT PROFILE MODAL ───────────────────────────────── */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent onRequestClose={closeEditProfile}>
        <KeyboardAvoidingView style={[styles.modalOverlay, { paddingTop: insets.top + 16 }]} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
          <View style={[styles.modalContainer, { paddingBottom: insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh Sửa Hồ Sơ</Text>
              <TouchableOpacity onPress={closeEditProfile} disabled={isSavingProfile || isUploadingAvatar} style={styles.modalCloseBtn} accessibilityRole="button" accessibilityLabel="Đóng form chỉnh sửa hồ sơ">
                <FontAwesome name="times" size={16} color={DS_COLOR.inkMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={[styles.modalBody, { paddingHorizontal: isSmallScreen ? 12 : 16 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                    onPress={() => handlePickAvatar()}
                    disabled={isUploadingAvatar || isSavingProfile}
                    accessibilityRole="button"
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
                  editable={!isSavingProfile && !isUploadingAvatar}
                  maxLength={100}
                  autoComplete="name"
                  textContentType="name"
                  autoCapitalize="words"
                  accessibilityLabel="Họ và tên"
                />
              </View>

              {/* Handle & Phone */}
              <View style={[styles.twoColumnRow, isSmallScreen && styles.singleColumnRow]}>
                <View style={[styles.columnField, isSmallScreen && styles.stackedField]}>
                  <Text style={styles.inputLabel}>Biệt danh</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="@wanderer"
                    placeholderTextColor={DS_COLOR.inkMuted}
                    value={editHandle}
                    onChangeText={setEditHandle}
                    editable={!isSavingProfile && !isUploadingAvatar}
                    maxLength={50}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Biệt danh"
                  />
                </View>
                <View style={[styles.columnField, isSmallScreen && styles.stackedField]}>
                  <Text style={styles.inputLabel}>Số điện thoại</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0912345678"
                    placeholderTextColor={DS_COLOR.inkMuted}
                    keyboardType="phone-pad"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    editable={!isSavingProfile && !isUploadingAvatar}
                    maxLength={20}
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    accessibilityLabel="Số điện thoại"
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
                  editable={!isSavingProfile && !isUploadingAvatar}
                  maxLength={255}
                  autoComplete="street-address"
                  textContentType="fullStreetAddress"
                  accessibilityLabel="Địa chỉ"
                />
              </View>

              {/* Travel Style */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phong cách du lịch</Text>
                <View style={styles.chipsRow}>
                  {Array.from(new Set([...TRAVEL_STYLES, editTravelStyle])).map((style) => {
                    const isSelected = editTravelStyle === style;
                    return (
                      <TouchableOpacity
                        key={style}
                        onPress={() => setEditTravelStyle(style)}
                        disabled={isSavingProfile || isUploadingAvatar}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
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
                <Text style={styles.inputLabel}>Mức ngân sách ưa thích</Text>
                <View style={styles.chipsRow}>
                  {Array.from(new Set([...BUDGET_PREFERENCES, editBudget])).map((b) => {
                    const isSelected = editBudget === b;
                    return (
                      <TouchableOpacity
                        key={b}
                        onPress={() => setEditBudget(b)}
                        disabled={isSavingProfile || isUploadingAvatar}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
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
                  editable={!isSavingProfile && !isUploadingAvatar}
                  maxLength={500}
                  accessibilityLabel="Tiểu sử cá nhân"
                />
                <Text style={styles.fieldHint}>{editBio.length}/500 ký tự</Text>
              </View>
              <TouchableOpacity
                onPress={openChangePassword}
                disabled={isSavingProfile || isUploadingAvatar}
                style={styles.securityButton}
                accessibilityRole="button">
                <FontAwesome name="lock" size={18} color={DS_COLOR.accent} />
                <Text style={styles.securityText}>Đổi mật khẩu tài khoản</Text>
                <FontAwesome name="chevron-right" size={12} color={DS_COLOR.inkMuted} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={closeEditProfile}
                style={styles.modalCancelBtn}
                disabled={isSavingProfile || isUploadingAvatar}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveProfile}
                style={[styles.modalSaveBtn, (isSavingProfile || isUploadingAvatar) && { opacity: 0.65 }]}
                disabled={isSavingProfile || isUploadingAvatar}
                accessibilityRole="button"
                accessibilityLabel="Lưu thay đổi hồ sơ"
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
        <ToastHost enabled={isEditModalOpen} />
      </Modal>

      {/* Follow Modal */}
      <FollowModal
        visible={followModalVisible}
        onClose={() => {
          setFollowModalVisible(false);
          void refreshProfile();
        }}
        initialTab={followModalInitialTab}
        onFollowChange={refreshProfile}
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

      {/* Lightbox Modal */}
      <ImageLightbox
        visible={lightboxIndex !== null && Boolean(lightboxPost)}
        images={lightboxPost ? getPostImages(lightboxPost) : []}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => {
          setLightboxIndex(null);
          setLightboxPost(null);
        }}
        authorName={lightboxPost?.authorName || displayName}
        authorAvatar={lightboxPost?.authorAvatar || avatarUrl}
      />

      {/* Post Detail Modal */}
      <PostDetailModal
        visible={Boolean(detailPost)}
        post={detailPost}
        onClose={() => setDetailPost(null)}
        bookmarked={detailPost ? Boolean(bookmarkedMap[detailPost.id] ?? detailPost.isBookmarked ?? (activeTab === 'saved' && savedContentType === 'posts')) : false}
        onToggleBookmark={() => detailPost && handleToggleBookmark(detailPost.id)}
      />
    </View>
  );
}

async function ShareTrip(itin: ItineraryItem) {
  try {
    const link = webItineraryUrl(itin.id);
    const message = `Khám phá kế hoạch chuyến đi "${itin.title}" tại ${itin.destination || 'Việt Nam'} trên Wayfare Travel! 🌟${link ? `\n\nXem tại: ${link}` : ''}`;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: itin.title,
            text: message,
            url: link || undefined,
          });
          return;
        } catch (error: any) {
          if (error?.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(link || message);
      showToast({
        kind: 'success',
        title: 'Đã sao chép liên kết',
        message: 'Đã sao chép liên kết chia sẻ lịch trình vào bộ nhớ tạm.',
      });
      return;
    }

    await Share.share({
      message,
      title: itin.title,
      url: link || undefined,
    });
  } catch {
    showToast({
      kind: 'info',
      title: 'Chia sẻ lịch trình',
      message: 'Không thể mở hộp thoại chia sẻ.',
    });
  }
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
    paddingBottom: 116,
  },

  // ─── HERO CARD (~290px) ──────────────────────────────────
  heroCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    marginTop: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
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
  savedControls: {
    gap: DS_SPACE.sm,
    marginTop: DS_SPACE.sm,
  },
  savedError: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: DS_SPACE.sm,
  },
  savedErrorText: {
    flex: 1,
    fontSize: DS_TYPE.meta,
    color: DS_COLOR.danger,
  },
  retryButton: {
    minHeight: DS_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: DS_SPACE.md,
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
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  postStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatText: {
    fontSize: 11.5,
    color: DS_COLOR.inkMuted,
  },
  postBookmarkBtn: {
    minWidth: DS_TOUCH,
    minHeight: DS_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    marginRight: 6,
  },
  postDetailLinkBtn: {
    minHeight: DS_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#F5F5F4',
  },
  postDetailLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: DS_COLOR.accent,
  },

  // Empty Container
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    textAlign: 'center',
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
    minHeight: DS_TOUCH,
    justifyContent: 'center',
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: DS_SPACE.xxl,
    paddingBottom: 100,
  },
  authLogoCircle: {
    width: DS_TOUCH + DS_SPACE.xl,
    height: DS_TOUCH + DS_SPACE.xl,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: DS_COLOR.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS_SPACE.lg,
  },
  authHeroTitle: {
    fontSize: DS_TYPE.page,
    fontWeight: '800',
    color: DS_COLOR.ink,
    marginBottom: DS_SPACE.sm,
    textAlign: 'center',
  },
  authHeroDesc: {
    fontSize: DS_TYPE.meta,
    color: DS_COLOR.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: DS_SPACE.xl,
  },
  authCard: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    backgroundColor: DS_COLOR.surface,
    borderRadius: DS_RADIUS.lg,
    padding: DS_SPACE.xl,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
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
    minHeight: 48,
    minWidth: 0,
  },
  primaryAuthBtn: {
    width: '100%',
    minHeight: DS_TOUCH,
    backgroundColor: DS_COLOR.accent,
    paddingVertical: DS_SPACE.md,
    paddingHorizontal: DS_SPACE.lg,
    borderRadius: DS_RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAuthBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  registerLink: {
    width: '100%',
    minHeight: DS_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: DS_SPACE.sm,
    paddingHorizontal: DS_SPACE.md,
    paddingVertical: DS_SPACE.sm,
  },
  registerLinkText: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.inkSecondary,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: DS_COLOR.surface,
    borderTopLeftRadius: DS_RADIUS.sheet,
    borderTopRightRadius: DS_RADIUS.sheet,
    maxHeight: '100%',
    flexShrink: 1,
  },
  modalHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: DS_COLOR.line,
  },
  modalTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  modalCloseBtn: {
    width: DS_TOUCH,
    height: DS_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalScroll: {
    flexShrink: 1,
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
    minHeight: DS_TOUCH,
    maxWidth: '100%',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pickImageBtnText: {
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  twoColumnRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: DS_SPACE.md,
  },
  singleColumnRow: {
    flexDirection: 'column',
  },
  columnField: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  stackedField: {
    flexBasis: 'auto',
    flexGrow: 0,
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
    minHeight: DS_TOUCH,
    maxWidth: '100%',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DS_COLOR.line,
  },
  chipActive: {
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: DS_COLOR.accent,
  },
  chipText: {
    fontSize: 11.5,
    color: DS_COLOR.ink,
    flexShrink: 1,
  },
  chipTextActive: {
    color: DS_COLOR.accent,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  fieldHint: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
    textAlign: 'right',
    marginTop: DS_SPACE.xs,
  },
  securityButton: {
    minHeight: DS_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS_SPACE.md,
    padding: DS_SPACE.md,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.bg,
  },
  securityText: {
    flex: 1,
    fontSize: DS_TYPE.meta,
    color: DS_COLOR.inkSecondary,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: DS_COLOR.line,
    gap: 12,
    flexWrap: 'wrap',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: '#F5F5F4',
    alignItems: 'center',
    minHeight: DS_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: DS_SPACE.md,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: DS_COLOR.ink,
    textAlign: 'center',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: DS_COLOR.accentPressed,
    alignItems: 'center',
    minHeight: DS_TOUCH,
    justifyContent: 'center',
    paddingHorizontal: DS_SPACE.md,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
