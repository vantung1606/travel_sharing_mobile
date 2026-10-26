import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { Text, TextInput } from '@/components/Themed';
import { CommunityFeedSkeleton } from '@/components/CommunityFeedSkeleton';
import { ActionSheet, ActionSheetOption } from '@/components/community/ActionSheet';
import { CreatePostModal } from '@/components/community/CreatePostModal';
import { ImageLightbox } from '@/components/community/ImageLightbox';
import { PostCard } from '@/components/community/PostCard';
import { PostDetailModal } from '@/components/community/PostDetailModal';
import { ReportPostSheet } from '@/components/community/ReportPostSheet';
import {
  FEED_SCOPES,
  FeedScope,
  PostSortKey,
  SORT_OPTIONS,
  TOPIC_FILTERS,
  TRAVEL_HASHTAGS,
  TopicKey,
  filterAndSortPosts,
} from '@/components/community/communityUtils';
import { useLocalSearchParams } from 'expo-router';
import { PlaceDetailModal } from '@/components/explore/PlaceDetailModal';
import { ItineraryDetailModal } from '@/components/ItineraryDetailModal';
import { showToast } from '@/components/Toast';
import { confirmDialog } from '@/components/ConfirmDialog';
import { WF_COLORS, WF_PAPER } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { itineraryApi, ItineraryItem, placeApi, PlaceItem, postApi, PostItem, userApi } from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import { authPrompt } from '@/src/services/authPrompt';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIDDEN_POSTS_STORAGE_KEY = 'wayfare_hidden_post_ids';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

const COMMUNITY_STORIES = [
  { id: 'dalat', location: 'Đà Lạt', badge: '🌸', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80' },
  { id: 'danang', location: 'Đà Nẵng', badge: '🌊', image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=300&q=80' },
  { id: 'phuquoc', location: 'Phú Quốc', badge: '🏖️', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80' },
  { id: 'hagiang', location: 'Hà Giang', badge: '🏍️', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=300&q=80' },
  { id: 'sapa', location: 'Sa Pa', badge: '🌾', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=300&q=80' },
  { id: 'ninhbinh', location: 'Ninh Bình', badge: '🛶', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80' },
  { id: 'hoian', location: 'Hội An', badge: '🏮', image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=300&q=80' },
];

const PAGE_SIZE = 10;

interface LightboxState {
  images: string[];
  index: number;
  authorName?: string;
}

export default function CommunityScreen() {
  // ── Session ───────────────────────────────────────────────
  const [session, setSession] = useState<UserSession | null>(null);

  // ── Nguồn dữ liệu ─────────────────────────────────────────
  const [pagedPosts, setPagedPosts] = useState<PostItem[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [postsPage, setPostsPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [fullPosts, setFullPosts] = useState<PostItem[] | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [savedPosts, setSavedPosts] = useState<PostItem[] | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const [followingIds, setFollowingIds] = useState<Set<number>>(new Set());
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  // ── Meta (like/bookmark) ──────────────────────────────────
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<number, number>>({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Record<number, boolean>>({});
  const [commentOverrides, setCommentOverrides] = useState<Record<number, number>>({});
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());

  // ── Bộ lọc ────────────────────────────────────────────────
  const [scope, setScope] = useState<FeedScope>('all');
  const [topic, setTopic] = useState<TopicKey>('all');
  const [hashtag, setHashtag] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<PostSortKey>('newest');
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  // ── Overlay ───────────────────────────────────────────────
  const [detailPost, setDetailPost] = useState<PostItem | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [menuPost, setMenuPost] = useState<PostItem | null>(null);
  const [reportTarget, setReportTarget] = useState<PostItem | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [itineraryDetail, setItineraryDetail] = useState<ItineraryItem | null>(null);
  const [itineraryVisible, setItineraryVisible] = useState(false);
  const [cloningPostId, setCloningPostId] = useState<number | null>(null);

  // ── Place Check-in integration ─────────────────────────────
  const routeParams = useLocalSearchParams<{ checkinPlaceId?: string }>();
  const [checkinPlaceId, setCheckinPlaceId] = useState<number | null>(null);
  const [activePlace, setActivePlace] = useState<PlaceItem | null>(null);
  const [placeDetailVisible, setPlaceDetailVisible] = useState(false);

  useEffect(() => {
    if (routeParams?.checkinPlaceId) {
      const pid = Number(routeParams.checkinPlaceId);
      if (pid) {
        setCheckinPlaceId(pid);
        setComposerVisible(true);
      }
    }
  }, [routeParams?.checkinPlaceId]);

  const handleOpenPlace = useCallback(async (placeId: number) => {
    try {
      const data = await placeApi.getPlaceById(placeId);
      if (data) {
        setActivePlace(data);
        setPlaceDetailVisible(true);
      }
    } catch (e) {
      console.warn('Lỗi xem chi tiết địa điểm:', e);
      showToast({
        kind: 'error',
        title: 'Không thể mở địa điểm',
        message: 'Có lỗi xảy ra khi tải thông tin địa điểm.',
      });
    }
  }, []);

  const clientFiltering = scope !== 'all' || topic !== 'all' || hashtag !== 'all' || !!search.trim() || sort !== 'newest';

  // ── Meta helpers ──────────────────────────────────────────
  const initMeta = useCallback((list: PostItem[]) => {
    if (!list?.length) return;
    const liked: Record<number, boolean> = {};
    const counts: Record<number, number> = {};
    const saved: Record<number, boolean> = {};
    list.forEach((p) => {
      liked[p.id] = !!p.isLiked;
      counts[p.id] = p.likeCount ?? p.likesCount ?? 0;
      saved[p.id] = !!p.isBookmarked;
    });
    setLikedPosts((prev) => ({ ...prev, ...liked }));
    setLikesCount((prev) => ({ ...prev, ...counts }));
    setBookmarkedPosts((prev) => ({ ...prev, ...saved }));
  }, []);

  // ── Nạp dữ liệu ───────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    try {
      setHasError(false);
      const result = await postApi.getCommunityPostsPaged({ page: 0, size: PAGE_SIZE });
      let data: PostItem[];
      if (result && Array.isArray(result.items)) {
        data = result.items;
        setPostsTotal(result.totalElements || data.length);
        setHasMorePosts(Boolean(result.hasNext));
      } else {
        data = await postApi.getCommunityPosts();
        setPostsTotal((data || []).length);
        setHasMorePosts(false);
      }
      setPostsPage(0);
      setPagedPosts(data || []);
      initMeta(data || []);
    } catch (err: any) {
      console.warn('Lỗi tải bảng tin cộng đồng:', err?.message || err);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [initMeta]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMorePosts || scope !== 'all' || clientFiltering) return;
    setLoadingMore(true);
    try {
      const nextPage = postsPage + 1;
      const result = await postApi.getCommunityPostsPaged({ page: nextPage, size: PAGE_SIZE });
      if (result && Array.isArray(result.items)) {
        setPagedPosts((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...result.items.filter((p) => !seen.has(p.id))];
        });
        initMeta(result.items);
        setPostsPage(nextPage);
        setPostsTotal(result.totalElements || 0);
        setHasMorePosts(Boolean(result.hasNext));
      }
    } catch (err: any) {
      console.warn('Lỗi tải thêm bài viết:', err?.message || err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMorePosts, postsPage, scope, clientFiltering, initMeta]);

  const loadFullPosts = useCallback(async (force = false) => {
    if (fullPosts && !force) return;
    setLoadingFull(true);
    try {
      const list = await postApi.getCommunityPosts();
      setFullPosts(list || []);
      initMeta(list || []);
    } catch (err: any) {
      console.warn('Lỗi tải toàn bộ bài viết:', err?.message || err);
      setFullPosts([]);
    } finally {
      setLoadingFull(false);
    }
  }, [fullPosts, initMeta]);

  const loadSavedPosts = useCallback(async (force = false) => {
    if (savedPosts && !force) return;
    setLoadingSaved(true);
    try {
      const list = await postApi.getBookmarkedPosts();
      setSavedPosts(list || []);
      initMeta(list || []);
    } catch (err: any) {
      console.warn('Lỗi tải bài viết đã lưu:', err?.message || err);
      setSavedPosts([]);
    } finally {
      setLoadingSaved(false);
    }
  }, [savedPosts, initMeta]);

  // ── Bootstrap ─────────────────────────────────────────────
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    let mounted = true;
    authStorage.getSession().then((s) => mounted && setSession(s));
    const unsubscribe = authStorage.subscribe((s) => setSession(s));

    // Nạp danh sách bài viết đã ẩn từ AsyncStorage
    AsyncStorage.getItem(HIDDEN_POSTS_STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHiddenIds(new Set(parsed.map(Number)));
          }
        } catch {}
      })
      .catch(() => {});

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const loadFollowingIds = useCallback(async () => {
    if (!session) {
      setFollowingIds(new Set());
      return;
    }
    const ids = await userApi.getFollowingIds();
    setFollowingIds(new Set(ids));
  }, [session]);

  useEffect(() => {
    loadFollowingIds();
  }, [loadFollowingIds]);

  useEffect(() => {
    if (scope === 'saved') {
      if (session) loadSavedPosts();
      else setSavedPosts([]);
      return;
    }
    if (clientFiltering) loadFullPosts();
  }, [scope, clientFiltering, session, loadSavedPosts, loadFullPosts]);

  // ── Danh sách hiển thị ────────────────────────────────────
  const displayPosts = useMemo(() => {
    let base: PostItem[];
    if (scope === 'saved') base = savedPosts || [];
    else if (clientFiltering) base = fullPosts || [];
    else base = pagedPosts;

    const filtered = filterAndSortPosts(base, {
      scope,
      topic,
      hashtag,
      search,
      sort,
      followingIds,
      currentUserId: session?.id ?? null,
    });
    return hiddenIds.size ? filtered.filter((p) => !hiddenIds.has(p.id)) : filtered;
  }, [scope, clientFiltering, savedPosts, fullPosts, pagedPosts, topic, hashtag, search, sort, followingIds, session?.id, hiddenIds]);

  const listBusy = loading || (scope === 'saved' && loadingSaved) || (clientFiltering && scope !== 'saved' && loadingFull);

  // ── Hành động ─────────────────────────────────────────────
  const requireLogin = (action: string) => {
    showToast({
      kind: 'info',
      title: 'Yêu cầu đăng nhập',
      message: `Vui lòng đăng nhập ở tab "Tài khoản" để ${action}.`,
      icon: 'lock',
    });
  };

  const toggleLike = async (postId: number) => {
    if (!session) return requireLogin('thích bài viết');
    const isLiked = !!likedPosts[postId];
    setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
    setLikesCount((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (isLiked ? -1 : 1)) }));
    try {
      const res = await postApi.toggleLike(postId);
      if (res) {
        setLikedPosts((prev) => ({ ...prev, [postId]: res.isLiked }));
        setLikesCount((prev) => ({ ...prev, [postId]: res.likeCount }));
      }
    } catch {
      setLikedPosts((prev) => ({ ...prev, [postId]: isLiked }));
      setLikesCount((prev) => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 0) + (isLiked ? 1 : -1)) }));
    }
  };

  const toggleBookmark = async (postId: number) => {
    if (!session) return requireLogin('lưu bài viết');
    const isSaved = !!bookmarkedPosts[postId];
    setBookmarkedPosts((prev) => ({ ...prev, [postId]: !isSaved }));
    try {
      const res = await postApi.toggleBookmark(postId);
      setBookmarkedPosts((prev) => ({ ...prev, [postId]: res.isBookmarked }));
      setSavedPosts((prev) => {
        if (!prev) return prev;
        if (!res.isBookmarked) return prev.filter((p) => p.id !== postId);
        const found = displayPosts.find((p) => p.id === postId);
        return found && !prev.some((p) => p.id === postId) ? [found, ...prev] : prev;
      });
      // Không thông báo: trạng thái lưu đã hiện ngay trên icon bookmark và
      // trong danh sách "Đã lưu" nên người dùng tự thấy kết quả.
    } catch (err: any) {
      setBookmarkedPosts((prev) => ({ ...prev, [postId]: isSaved }));
      showToast({
        kind: 'error',
        title: 'Lưu thất bại',
        message: err?.response?.data?.message || 'Không thể lưu bài viết lúc này.',
      });
    }
  };

  const toggleFollowAuthor = async (authorId?: number) => {
    if (!session) return requireLogin('theo dõi tác giả');
    if (authorId == null) return;
    const isFollowing = followingIds.has(Number(authorId));
    setFollowLoadingIds((prev) => new Set(prev).add(Number(authorId)));
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (isFollowing) next.delete(Number(authorId));
      else next.add(Number(authorId));
      return next;
    });
    try {
      const res = await userApi.toggleFollow(Number(authorId));
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (res?.isFollowing) next.add(Number(authorId));
        else next.delete(Number(authorId));
        return next;
      });
    } catch {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.add(Number(authorId));
        else next.delete(Number(authorId));
        return next;
      });
    } finally {
      setFollowLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(Number(authorId));
        return next;
      });
    }
  };

  const handleShare = async (post: PostItem) => {
    try {
      await Share.share({
        message: `${post.title ? `${post.title}\n` : ''}${(post.content || '').slice(0, 180)}\n\n— Chia sẻ từ Cộng đồng Wayfare\nwayfare://community?postId=${post.id}`,
      });
    } catch {
      // Người dùng huỷ chia sẻ
    }
  };

  const hidePost = (postId: number) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      AsyncStorage.setItem(HIDDEN_POSTS_STORAGE_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
    showToast({
      kind: 'info',
      title: 'Đã ẩn bài viết',
      message: 'Bài viết đã được ẩn khỏi bảng tin của bạn.',
      icon: 'eye-slash',
    });
  };

  const openVideo = async (post: PostItem) => {
    if (!post.videoUrl) return;
    try {
      const canOpen = await Linking.canOpenURL(post.videoUrl);
      if (canOpen) {
        await Linking.openURL(post.videoUrl);
      } else {
        showToast({
          kind: 'info',
          title: 'Không thể mở video',
          message: 'Đường dẫn video không hợp lệ.',
        });
      }
    } catch {
      showToast({
        kind: 'error',
        title: 'Lỗi phát video',
        message: 'Không thể phát video này.',
      });
    }
  };

  const openCreate = () => {
    if (!session) return requireLogin('chia sẻ bài viết');
    setEditingPost(null);
    setComposerVisible(true);
  };

  const openEdit = (post: PostItem) => {
    setEditingPost(post);
    setComposerVisible(true);
  };

  const changeVisibility = async (post: PostItem) => {
    const next = (post.visibility || 'PUBLIC').toUpperCase() === 'PRIVATE' ? 'PUBLIC' : 'PRIVATE';
    try {
      const updated = await postApi.updatePostVisibility(post.id, next);
      patchPost(post.id, { visibility: updated?.visibility || next });
      showToast({
        kind: 'success',
        title: next === 'PUBLIC' ? 'Đã chuyển sang công khai' : 'Đã chuyển sang riêng tư',
        message:
          next === 'PUBLIC'
            ? 'Mọi người trong cộng đồng đều có thể xem bài viết này.'
            : 'Chỉ mình bạn nhìn thấy bài viết này.',
        icon: next === 'PUBLIC' ? 'globe' : 'lock',
      });
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Đổi chế độ thất bại',
        message: err?.response?.data?.message || 'Không thể đổi chế độ hiển thị bài viết.',
      });
    }
  };

  const patchPost = (postId: number, patch: Partial<PostItem>) => {
    setPagedPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)));
    setFullPosts((prev) => (prev ? prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)) : prev));
    setSavedPosts((prev) => (prev ? prev.map((p) => (p.id === postId ? { ...p, ...patch } : p)) : prev));
    setDetailPost((prev) => (prev && prev.id === postId ? { ...prev, ...patch } : prev));
  };

  const confirmDelete = async (post: PostItem) => {
    const confirmed = await confirmDialog({
      title: 'Xóa bài viết?',
      message: 'Bài viết sẽ bị gỡ khỏi cộng đồng. Hành động không thể hoàn tác.',
      confirmText: 'Xóa',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await postApi.deletePost(post.id);
      setPagedPosts((prev) => prev.filter((p) => p.id !== post.id));
      setFullPosts((prev) => (prev ? prev.filter((p) => p.id !== post.id) : prev));
      setSavedPosts((prev) => (prev ? prev.filter((p) => p.id !== post.id) : prev));
      setDetailPost((prev) => (prev && prev.id === post.id ? null : prev));
      showToast({
        kind: 'success',
        title: 'Đã xóa bài viết',
        message: 'Bài viết đã được gỡ khỏi cộng đồng.',
      });
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Xóa thất bại',
        message: err?.response?.data?.message || 'Không thể xóa bài viết này.',
      });
    }
  };

  const submitReport = async (post: PostItem, reason: string, details: string) => {
    try {
      await postApi.reportPost(post.id, {
        reason,
        category: reason,
        details: details || undefined,
      });
      showToast({
        kind: 'success',
        title: 'Đã gửi báo cáo',
        message: 'Cảm ơn bạn! Ban quản trị sẽ xem xét bài viết này trong thời gian sớm nhất.',
        duration: 4200,
      });
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Gửi báo cáo thất bại',
        message: err?.response?.data?.message || 'Không thể gửi báo cáo lúc này.',
      });
      throw err;
    }
  };

  const openItineraryFor = async (post: PostItem) => {
    const itineraryId = post.itineraryId ?? post.sharedPost?.itineraryId;
    if (!itineraryId) return;
    try {
      const it = await itineraryApi.getItineraryById(itineraryId);
      setItineraryDetail(it);
      setItineraryVisible(true);
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Không mở được lịch trình',
        message: err?.response?.data?.message || 'Vui lòng thử lại sau.',
      });
    }
  };

  const cloneItinerary = async (post: PostItem) => {
    if (!session) return requireLogin('sao chép lịch trình');
    try {
      setCloningPostId(post.id);
      const cloned = await postApi.cloneItineraryFromPost(post.id);
      showToast({
        kind: 'success',
        title: 'Đã sao chép lịch trình',
        message: 'Lịch trình đã được lưu vào mục Lịch trình của bạn.',
      });
      if (cloned) {
        setItineraryDetail(cloned);
        setItineraryVisible(true);
      }
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Sao chép thất bại',
        message: err?.response?.data?.message || 'Không thể sao chép lịch trình này.',
      });
    } finally {
      setCloningPostId(null);
    }
  };

  const openLightbox = (post: PostItem, index: number) => {
    const images = post.images?.length ? post.images.filter(Boolean) : post.imageUrl ? [post.imageUrl] : [];
    if (!images.length) return;
    setLightbox({ images, index, authorName: post.authorName });
  };

  const buildMenuOptions = (post: PostItem): ActionSheetOption[] => {
    const owner = post.isOwner ?? (session?.id != null && post.authorId === session.id);
    const isPrivate = (post.visibility || 'PUBLIC').toUpperCase() === 'PRIVATE';
    const options: ActionSheetOption[] = [];

    if (owner) {
      options.push({ key: 'edit', label: 'Chỉnh sửa bài viết', icon: 'pencil', onPress: () => openEdit(post) });
      options.push({
        key: 'visibility',
        label: isPrivate ? 'Chuyển sang Công khai' : 'Chuyển sang Chỉ mình tôi',
        icon: isPrivate ? 'globe' : 'lock',
        onPress: () => changeVisibility(post),
      });
    } else {
      if (session && post.authorId != null) {
        const isFollowing = followingIds.has(Number(post.authorId));
        options.push({
          key: 'follow',
          label: isFollowing ? 'Bỏ theo dõi tác giả' : 'Theo dõi tác giả',
          icon: 'user-plus',
          onPress: () => toggleFollowAuthor(post.authorId),
        });
      }
      options.push({
        key: 'hide',
        label: 'Ẩn bài viết này',
        icon: 'eye-slash',
        onPress: () => hidePost(post.id),
      });
    }

    options.push({ key: 'share', label: 'Chia sẻ bài viết', icon: 'share-alt', onPress: () => handleShare(post) });

    if (!owner) {
      options.push({
        key: 'report',
        label: 'Báo cáo vi phạm',
        icon: 'flag',
        destructive: true,
        onPress: () => setReportTarget(post),
      });
    } else {
      options.push({
        key: 'delete',
        label: 'Xóa bài viết',
        icon: 'trash',
        destructive: true,
        onPress: () => confirmDelete(post),
      });
    }

    return options;
  };

  const handleCommentCountChange = (postId: number, count: number) => {
    setCommentOverrides((prev) => ({ ...prev, [postId]: count }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    setFullPosts(null);
    setSavedPosts(null);
    loadFollowingIds();
    if (scope === 'saved') loadSavedPosts(true).finally(() => setRefreshing(false));
    else if (clientFiltering) loadFullPosts(true).finally(() => setRefreshing(false));
    else loadInitial();
  };

  const resetFilters = () => {
    setTopic('all');
    setHashtag('all');
    setSearch('');
    setSort('newest');
  };

  const scrollRef = useRef<FlatList<PostItem>>(null);

  const renderPost = ({ item }: { item: PostItem }) => {
    const liked = !!likedPosts[item.id];
    const likes = likesCount[item.id] ?? item.likeCount ?? item.likesCount ?? 0;
    const commentCount = commentOverrides[item.id] ?? item.commentCount ?? item.commentsCount ?? 0;
    const postWithCount: PostItem = { ...item, commentCount, likeCount: likes, isLiked: liked };
    const canFollow = session && !(item.isOwner ?? (session.id != null && item.authorId === session.id)) && item.authorId != null;

    return (
      <PostCard
        post={postWithCount}
        liked={liked}
        likeCount={likes}
        bookmarked={!!bookmarkedPosts[item.id]}
        isFollowingAuthor={item.authorId != null ? followingIds.has(Number(item.authorId)) : false}
        followLoading={item.authorId != null ? followLoadingIds.has(Number(item.authorId)) : false}
        cloningItinerary={cloningPostId === item.id}
        currentUserId={session?.id ?? null}
        onToggleFollow={canFollow ? () => toggleFollowAuthor(item.authorId) : undefined}
        onToggleLike={() => toggleLike(item.id)}
        onToggleBookmark={() => toggleBookmark(item.id)}
        onOpenComments={() => setDetailPost(postWithCount)}
        onShare={() => handleShare(item)}
        onOpenDetail={() => setDetailPost(postWithCount)}
        onOpenMenu={() => setMenuPost(item)}
        onPressImage={(index) => openLightbox(item, index)}
        onPressVideo={() => openVideo(item)}
        onViewItinerary={() => openItineraryFor(item)}
        onCloneItinerary={() => cloneItinerary(item)}
        onPressPlace={handleOpenPlace}
      />
    );
  };

  const activeFilterCount =
    (topic !== 'all' ? 1 : 0) + (hashtag !== 'all' ? 1 : 0) + (search.trim() ? 1 : 0) + (sort !== 'newest' ? 1 : 0);
  const hasFilter = activeFilterCount > 0;

  const emptyState = () => {
    if (listBusy) return <CommunityFeedSkeleton />;
    if (hasError && !clientFiltering) {
      return (
        <View style={styles.centerBox}>
          <View style={styles.alertCard}>
            <FontAwesome name="globe" size={32} color={WF_COLORS.primary} style={{ marginBottom: 10 }} />
            <Text style={styles.alertTitle}>Không thể kết nối</Text>
            <Text style={styles.alertDesc}>
              Kiểm tra kết nối mạng rồi thử lại nhé. Bảng tin cộng đồng sẽ hiện ngay khi có dữ liệu.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadInitial}>
              <Text style={styles.retryBtnText}>Tải lại dữ liệu</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const messages: Record<string, { icon: any; title: string; sub: string }> = {
      all: {
        icon: hasFilter ? 'filter' : 'comments-o',
        title: hasFilter ? 'Không tìm thấy bài viết phù hợp' : 'Chưa có bài viết nào',
        sub: hasFilter
          ? 'Thử đổi chủ đề, hashtag hoặc từ khoá tìm kiếm khác nhé.'
          : 'Hãy là người đầu tiên chia sẻ khoảnh khắc du lịch tuyệt vời!',
      },
      following: {
        icon: 'user-plus',
        title: session ? 'Chưa có bài viết từ người bạn theo dõi' : 'Đăng nhập để theo dõi',
        sub: session
          ? 'Theo dõi thêm nhà sáng tạo để bảng tin phong phú hơn.'
          : 'Đăng nhập ở tab "Tài khoản" để xem bài viết từ những người bạn theo dõi.',
      },
      saved: {
        icon: 'bookmark-o',
        title: session ? 'Bộ sưu tập đang trống' : 'Đăng nhập để xem bộ sưu tập',
        sub: session
          ? 'Nhấn biểu tượng 🔖 trên bài viết để lưu lại xem sau.'
          : 'Đăng nhập ở tab "Tài khoản" để lưu và xem lại những bài viết yêu thích.',
      },
    };
    const msg = messages[scope] || messages.all;

    return (
      <View style={styles.centerBox}>
        <FontAwesome name={msg.icon} size={42} color={WF_COLORS.slate400} style={{ opacity: 0.55 }} />
        <Text style={styles.emptyTitle}>{msg.title}</Text>
        <Text style={styles.emptySub}>{msg.sub}</Text>
        {hasFilter ? (
          <TouchableOpacity style={[styles.retryBtn, { marginTop: 12 }]} onPress={resetFilters}>
            <Text style={styles.retryBtnText}>Xoá bộ lọc</Text>
          </TouchableOpacity>
        ) : null}
        {scope === 'saved' && session && savedPosts && savedPosts.length === 0 ? (
          <TouchableOpacity style={[styles.retryBtn, { marginTop: 12 }]} onPress={() => loadSavedPosts(true)}>
            <Text style={styles.retryBtnText}>Tải lại</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={scrollRef}
        data={displayPosts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPost}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[WF_COLORS.primary]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            {/* 24h Community Moments Header */}
            <View style={styles.storyHeader}>
              <View style={styles.storyHeaderDot} />
              <Text style={styles.storyHeaderTitle}>Khoảnh Khắc 24h • Trải Nghiệm Thực Tế</Text>
            </View>

            {/* Stories Horizontal Carousel */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
              <TouchableOpacity
                style={styles.storyItem}
                activeOpacity={0.85}
                onPress={() => {
                  resetFilters();
                  setScope('all');
                }}>
                <View style={[styles.storyRing, styles.storyRingAll]}>
                  <View style={styles.storyAllInner}>
                    <FontAwesome name="compass" size={20} color={WF_PAPER.clay} />
                  </View>
                </View>
                <Text style={[styles.storyLabel, !search && styles.storyLabelActive]} numberOfLines={1}>
                  Tất cả
                </Text>
              </TouchableOpacity>
              {COMMUNITY_STORIES.map((story) => {
                const isSelected = search.toLowerCase().includes(story.location.toLowerCase());
                return (
                  <TouchableOpacity
                    key={story.id}
                    style={styles.storyItem}
                    activeOpacity={0.85}
                    onPress={() => {
                      setScope('all');
                      setTopic('all');
                      setHashtag('all');
                      setSearch(isSelected ? '' : story.location);
                      scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
                    }}>
                    <View style={[styles.storyRing, isSelected && styles.storyRingSelected]}>
                      <Image source={{ uri: story.image }} style={styles.storyImage} />
                      <View style={styles.storyBadge}>
                        <Text style={{ fontSize: 10 }}>{story.badge}</Text>
                      </View>
                    </View>
                    <Text style={[styles.storyLabel, isSelected && styles.storyLabelActive]} numberOfLines={1}>
                      {story.location}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Quick Create Post Bar */}
            <View style={styles.createPromptBox}>
              <Image source={{ uri: session?.avatarUrl || session?.avatar || FALLBACK_AVATAR }} style={styles.promptAvatar} />
              <TouchableOpacity style={styles.promptInputFake} onPress={openCreate} activeOpacity={0.85}>
                <Text style={styles.promptPlaceholder} numberOfLines={1}>
                  {session ? 'Chia sẻ review, ảnh đẹp hoặc đính kèm tour...' : 'Đăng nhập để chia sẻ chuyến đi...'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.promptPostBtn} onPress={openCreate} activeOpacity={0.85}>
                <Text style={styles.promptPostBtnText}>Đăng bài</Text>
              </TouchableOpacity>
            </View>

            {/* Tier 1: Underline Feed Scope Tabs (Khớp 100% Web) */}
            <View style={styles.scopeUnderlineRow}>
              {FEED_SCOPES.map((item) => {
                const active = scope === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.scopeUnderlineTab, active && styles.scopeUnderlineTabActive]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if ((item.key === 'following' || item.key === 'saved') && !session) {
                        authPrompt.open();
                        return;
                      }
                      setScope(item.key);
                      scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
                    }}>
                    <FontAwesome
                      name={item.icon as any}
                      size={13}
                      color={active ? WF_PAPER.clay : WF_PAPER.inkMuted}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.scopeUnderlineText, active && styles.scopeUnderlineTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Search + Sort Bar */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <FontAwesome name="search" size={13} color={WF_PAPER.inkMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm bài viết, địa điểm, tác giả..."
                  placeholderTextColor={WF_PAPER.inkMuted}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <FontAwesome name="times-circle" size={14} color={WF_PAPER.inkMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.sortBtn}
                activeOpacity={0.85}
                accessibilityLabel="Sắp xếp bảng tin"
                onPress={() => setSortSheetVisible(true)}>
                <FontAwesome name="sliders" size={14} color={WF_PAPER.inkPrimary} />
              </TouchableOpacity>
            </View>

            {/* Tier 2: Topic Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {TOPIC_FILTERS.map((item) => {
                const active = topic === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.topicChip, active && styles.topicChipActive]}
                    activeOpacity={0.85}
                    onPress={() => setTopic(item.key)}>
                    <FontAwesome
                      name={item.icon as any}
                      size={12}
                      color={active ? '#FFFFFF' : WF_PAPER.inkSecondary}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.topicChipText, active && styles.topicChipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Trending Hashtag chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hashtagRow}>
              {TRAVEL_HASHTAGS.map((tag) => {
                const active = hashtag === tag.key;
                return (
                  <TouchableOpacity
                    key={tag.key}
                    style={[styles.hashtagChip, active && styles.hashtagChipActive]}
                    activeOpacity={0.85}
                    onPress={() => setHashtag(tag.key)}>
                    <Text style={[styles.hashtagText, active && styles.hashtagTextActive]}>{tag.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {activeFilterCount > 0 ? (
              <View style={styles.filterSummary}>
                <Text style={styles.filterSummaryText}>
                  {displayPosts.length} bài viết · {SORT_OPTIONS.find((s) => s.key === sort)?.label}
                </Text>
                <TouchableOpacity onPress={resetFilters}>
                  <Text style={styles.filterClear}>Xoá bộ lọc</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={styles.listFooter}>
            {loadingMore ? (
              <ActivityIndicator size="small" color={WF_COLORS.primary} />
            ) : !clientFiltering && scope === 'all' && hasMorePosts ? (
              <Text style={styles.listFooterText}>
                Cuộn để tải thêm · {displayPosts.length}/{postsTotal} bài viết
              </Text>
            ) : !clientFiltering && scope === 'all' && displayPosts.length > 0 ? (
              <Text style={styles.listFooterText}>Đã hiển thị toàn bộ {postsTotal} bài viết</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={emptyState()}
      />

      {/* ─── Overlay: chi tiết bài viết ─────────────────────── */}
      <PostDetailModal
        visible={!!detailPost}
        post={detailPost}
        liked={detailPost ? !!likedPosts[detailPost.id] : false}
        likeCount={detailPost ? likesCount[detailPost.id] ?? detailPost.likeCount ?? detailPost.likesCount ?? 0 : 0}
        bookmarked={detailPost ? !!bookmarkedPosts[detailPost.id] : false}
        isFollowingAuthor={
          detailPost?.authorId != null ? followingIds.has(Number(detailPost.authorId)) : false
        }
        followLoading={detailPost?.authorId != null ? followLoadingIds.has(Number(detailPost.authorId)) : false}
        cloningItinerary={!!detailPost && cloningPostId === detailPost.id}
        currentUserId={session?.id ?? null}
        menuOptions={detailPost ? buildMenuOptions(detailPost) : []}
        onClose={() => setDetailPost(null)}
        onToggleLike={() => detailPost && toggleLike(detailPost.id)}
        onToggleBookmark={() => detailPost && toggleBookmark(detailPost.id)}
        onToggleFollow={
          detailPost && session && detailPost.authorId != null && !(detailPost.isOwner ?? detailPost.authorId === session.id)
            ? () => toggleFollowAuthor(detailPost.authorId)
            : undefined
        }
        onShare={() => detailPost && handleShare(detailPost)}
        onViewItinerary={() => detailPost && openItineraryFor(detailPost)}
        onCloneItinerary={() => detailPost && cloneItinerary(detailPost)}
        onPressPlace={handleOpenPlace}
        onSubmitReport={submitReport}
        onCommentCountChange={handleCommentCountChange}
      />

      {/* ─── Overlay: soạn bài ──────────────────────────────── */}
      <CreatePostModal
        visible={composerVisible}
        editingPost={editingPost}
        initialPlaceId={checkinPlaceId}
        onClose={() => {
          setComposerVisible(false);
          setEditingPost(null);
          setCheckinPlaceId(null);
        }}
        onSubmitted={(post) => {
          setComposerVisible(false);
          setCheckinPlaceId(null);
          if (editingPost && post) {
            patchPost(editingPost.id, post);
            setEditingPost(null);
            showToast({
              kind: 'success',
              title: 'Đã cập nhật bài viết',
              message: 'Thay đổi của bạn đã được lưu lên cộng đồng.',
            });
          } else {
            setEditingPost(null);
            setFullPosts(null);
            setSavedPosts(null);
            setScope('all');
            resetFilters();
            if (post?.status === 'PENDING_REVIEW') {
              const isDebt = (post.category && post.category.includes('Đòi nợ')) || (post.aiFlagReason && post.aiFlagReason.toLowerCase().includes('đòi nợ'));
              const isOffTopic = (post.category && post.category.includes('Lạc đề')) || (post.aiFlagReason && post.aiFlagReason.toLowerCase().includes('du lịch'));
              showToast({
                kind: isDebt ? 'error' : 'info',
                title: isDebt 
                  ? 'Vi phạm chính sách: Đòi nợ / Tài chính 🚫'
                  : isOffTopic
                  ? 'Nội dung chưa rõ chủ đề Du lịch 📍'
                  : 'Bài viết đang chờ Admin duyệt 🛡️',
                message: post?.aiFlagReason || 'Bài viết đã được chuyển vào hàng đợi kiểm duyệt thủ công của Quản trị viên.',
              });
            } else {
              showToast({
                kind: 'success',
                title: 'Đã đăng bài viết 🎉',
                message: 'Bài viết của bạn đã xuất hiện trên bảng tin cộng đồng.',
              });
            }
            loadInitial();
          }
        }}
      />

      {/* ─── Overlay: sắp xếp ───────────────────────────────── */}
      <ActionSheet
        visible={sortSheetVisible}
        title="Sắp xếp bảng tin"
        options={SORT_OPTIONS.map((option) => ({
          key: option.key,
          label: option.label,
          icon: option.key === 'newest' ? 'clock-o' : option.key === 'popular' ? 'fire' : 'map-o',
          active: sort === option.key,
          onPress: () => setSort(option.key),
        }))}
        onClose={() => setSortSheetVisible(false)}
      />

      {/* ─── Overlay: menu bài viết (từ thẻ feed) ───────────── */}
      <ActionSheet
        visible={!!menuPost}
        title="Tùy chọn bài viết"
        options={menuPost ? buildMenuOptions(menuPost) : []}
        onClose={() => setMenuPost(null)}
      />

      {/* ─── Overlay: báo cáo vi phạm (từ thẻ feed) ─────────── */}
      <ReportPostSheet
        visible={!!reportTarget}
        postTitle={reportTarget?.title || reportTarget?.content?.slice(0, 60)}
        submitting={reportSubmitting}
        onClose={() => setReportTarget(null)}
        onSubmit={async (reason, details) => {
          if (!reportTarget) return;
          setReportSubmitting(true);
          try {
            await submitReport(reportTarget, reason, details);
            setReportTarget(null);
          } finally {
            setReportSubmitting(false);
          }
        }}
      />

      {/* ─── Overlay: xem ảnh ───────────────────────────────── */}
      <ImageLightbox
        visible={!!lightbox}
        images={lightbox?.images || []}
        initialIndex={lightbox?.index || 0}
        authorName={lightbox?.authorName}
        onClose={() => setLightbox(null)}
      />

      {/* ─── Overlay: chi tiết lịch trình ───────────────────── */}
      <ItineraryDetailModal
        visible={itineraryVisible}
        itinerary={itineraryDetail}
        onClose={() => setItineraryVisible(false)}
        canEdit={false}
      />

      {/* ─── Overlay: chi tiết địa điểm check-in ───────────────── */}
      <PlaceDetailModal
        visible={placeDetailVisible}
        place={activePlace}
        saved={false}
        onClose={() => setPlaceDetailVisible(false)}
        onToggleSave={() => {}}
        onAddToPlan={() => {}}
        onWriteCheckinPost={(place) => {
          setPlaceDetailVisible(false);
          setCheckinPlaceId(place.id);
          setComposerVisible(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WF_PAPER.bg,
  },
  list: {
    paddingBottom: 28,
  },
  listFooter: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFooterText: {
    fontSize: 12,
    color: WF_PAPER.inkMuted,
    fontWeight: '600',
  },
  headerWrapper: {
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: WF_PAPER.card,
    borderBottomWidth: 1,
    borderBottomColor: WF_PAPER.cardBorder,
    marginBottom: 10,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  storyHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WF_PAPER.clay,
  },
  storyHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    letterSpacing: -0.2,
  },
  storiesScroll: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  storyItem: {
    alignItems: 'center',
    width: 64,
  },
  storyRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: WF_PAPER.cardBorder,
    padding: 1.5,
    position: 'relative',
    marginBottom: 4,
  },
  storyRingSelected: {
    borderColor: WF_PAPER.clay,
    borderWidth: 2.5,
  },
  storyRingAll: {
    borderColor: WF_PAPER.clayLight,
  },
  storyAllInner: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: WF_PAPER.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  storyBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: WF_PAPER.card,
    borderRadius: 8,
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
  },
  storyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_PAPER.inkSecondary,
    textAlign: 'center',
  },
  storyLabelActive: {
    color: WF_PAPER.clay,
    fontWeight: '800',
  },
  createPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_PAPER.card,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  promptAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: '#EAE5D9',
  },
  promptInputFake: {
    flex: 1,
    backgroundColor: WF_PAPER.bg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
  },
  promptPlaceholder: {
    fontSize: 12,
    color: WF_PAPER.inkMuted,
  },
  promptPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_PAPER.clay,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  promptPostBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  scopeUnderlineRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: WF_PAPER.cardBorder,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  scopeUnderlineTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  scopeUnderlineTabActive: {
    borderBottomColor: WF_PAPER.clay,
  },
  scopeUnderlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_PAPER.inkMuted,
  },
  scopeUnderlineTextActive: {
    color: WF_PAPER.clay,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.bg,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: WF_PAPER.inkPrimary,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.card,
  },
  topicChipActive: {
    backgroundColor: WF_PAPER.clay,
    borderColor: WF_PAPER.clay,
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_PAPER.inkSecondary,
  },
  topicChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  hashtagRow: {
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  hashtagChip: {
    height: 27,
    paddingHorizontal: 10,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: WF_PAPER.pillBg,
    borderWidth: 1,
    borderColor: WF_PAPER.pillBorder,
  },
  hashtagChipActive: {
    backgroundColor: WF_PAPER.clayLight,
    borderColor: WF_PAPER.clay,
  },
  hashtagText: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_PAPER.inkSecondary,
  },
  hashtagTextActive: {
    color: WF_PAPER.clay,
    fontWeight: '800',
  },
  filterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: WF_PAPER.pillBg,
    borderWidth: 1,
    borderColor: WF_PAPER.pillBorder,
  },
  filterSummaryText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
  },
  filterClear: {
    fontSize: 11.5,
    fontWeight: '800',
    color: WF_PAPER.clay,
    textDecorationLine: 'underline',
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: WF_PAPER.card,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    alignItems: 'center',
    width: '100%',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
  },
  alertDesc: {
    fontSize: 12,
    color: WF_PAPER.inkSecondary,
    marginVertical: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: WF_PAPER.clay,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    marginTop: 12,
    fontFamily: SERIF_FONT,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: WF_PAPER.inkSecondary,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
