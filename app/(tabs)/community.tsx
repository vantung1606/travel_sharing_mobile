import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import * as Clipboard from 'expo-clipboard';

import { Text, TextInput } from '@/components/Themed';
import { CommunityFeedSkeleton } from '@/components/CommunityFeedSkeleton';
import { ActionSheet, ActionSheetOption } from '@/components/community/ActionSheet';
import { CommunityFilterSheet } from '@/components/community/CommunityFilterSheet';
import { CommunityStoriesReel, StoryTopic } from '@/components/community/CommunityStoriesReel';
import { CreatePostModal } from '@/components/community/CreatePostModal';
import { ImageLightbox } from '@/components/community/ImageLightbox';
import { PostCard } from '@/components/community/PostCard';
import { PostDetailModal } from '@/components/community/PostDetailModal';
import { PostLikersModal } from '@/components/community/PostLikersModal';
import { SharePostModal } from '@/components/community/SharePostModal';
import { UniversalReportModal } from '@/components/UniversalReportModal';
import { UserProfileModal } from '@/components/UserProfileModal';
import {
  FEED_SCOPES,
  FeedScope,
  PostSortKey,
  TOPIC_FILTERS,
  TopicKey,
  filterAndSortPosts,
  getPostImages,
} from '@/components/community/communityUtils';
import { useLocalSearchParams } from 'expo-router';
import { PlaceDetailModal } from '@/components/explore/PlaceDetailModal';
import { ItineraryDetailModal } from '@/components/ItineraryDetailModal';
import { showToast } from '@/components/Toast';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Chip } from '@/components/ui/Chip';
import { FAB } from '@/components/ui/FAB';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { WF_PAPER } from '@/constants/Colors';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { itineraryApi, ItineraryItem, placeApi, PlaceItem, postApi, PostItem, userApi } from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import { authPrompt } from '@/src/services/authPrompt';
import { chatSocket } from '@/src/services/chatSocket';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIDDEN_POSTS_STORAGE_KEY = 'wayfare_hidden_post_ids';

const PAGE_SIZE = 10;

/** 5 chủ đề hiển thị nhanh; các chủ đề còn lại nằm trong sheet Bộ lọc. */
const QUICK_TOPICS = TOPIC_FILTERS.slice(0, 5);

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
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

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
  const [selectedPostForLikers, setSelectedPostForLikers] = useState<PostItem | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [shareTarget, setShareTarget] = useState<PostItem | null>(null);

  // ── Place Check-in & Post Deep-link integration ───────────
  const routeParams = useLocalSearchParams<{ checkinPlaceId?: string; postId?: string; _t?: string }>();
  const [checkinPlaceId, setCheckinPlaceId] = useState<number | null>(null);
  const [activePlace, setActivePlace] = useState<PlaceItem | null>(null);
  const [placeDetailVisible, setPlaceDetailVisible] = useState(false);
  const lastOpenedPostIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (routeParams?.checkinPlaceId) {
      const pid = Number(routeParams.checkinPlaceId);
      if (pid) {
        setCheckinPlaceId(pid);
        setComposerVisible(true);
      }
    }
  }, [routeParams?.checkinPlaceId]);

  // Tự động mở modal chi tiết bài viết cụ thể khi bấm vào thông báo
  useEffect(() => {
    if (routeParams?.postId) {
      const pidStr = String(routeParams.postId);
      const pid = Number(pidStr);
      if (pid) {
        lastOpenedPostIdRef.current = pidStr;
        const found =
          (pagedPosts || []).find((p) => p.id === pid) ||
          (fullPosts || []).find((p) => p.id === pid);
        if (found) {
          setDetailPost(found);
        } else {
          postApi
            .getPostById(pid)
            .then((post) => {
              if (post) setDetailPost(post);
            })
            .catch((err) => console.warn('Could not load target notification post:', err));
        }
      }
    }
  }, [routeParams?.postId, routeParams?._t, pagedPosts, fullPosts]);

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

  // Trì hoãn từ khoá tìm kiếm để không lọc lại toàn bộ feed sau mỗi ký tự.
  const deferredSearch = useDeferredValue(search);
  const clientFiltering =
    scope !== 'all' || topic !== 'all' || hashtag !== 'all' || !!deferredSearch.trim() || sort !== 'newest';

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
        setHasMorePosts(Boolean(result.hasNext));
      } else {
        data = await postApi.getCommunityPosts();
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

  // Đăng ký nhận sự kiện tương tác cộng đồng thời gian thực (like, comment)
  useEffect(() => {
    const unsub = chatSocket.subscribeToCommunity((event) => {
      if (!event || !event.postId) return;
      const postId = Number(event.postId);

      if (event.type === 'LIKE_CHANGED' && event.likeCount != null) {
        setLikesCount((prev) => ({ ...prev, [postId]: Number(event.likeCount) }));
      } else if (
        (event.type === 'COMMENT_ADDED' || event.type === 'COMMENT_DELETED') &&
        event.commentCount != null
      ) {
        setCommentOverrides((prev) => ({ ...prev, [postId]: Number(event.commentCount) }));
      }
    });

    return () => unsub();
  }, []);

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
    else if (clientFiltering) base = fullPosts ?? pagedPosts;
    else base = pagedPosts;

    const filtered = filterAndSortPosts(base, {
      scope,
      topic,
      hashtag,
      search: deferredSearch,
      sort,
      followingIds,
      currentUserId: session?.id ?? null,
    });
    return hiddenIds.size ? filtered.filter((p) => !hiddenIds.has(p.id)) : filtered;
  }, [scope, clientFiltering, savedPosts, fullPosts, pagedPosts, topic, hashtag, deferredSearch, sort, followingIds, session?.id, hiddenIds]);

  const listBusy = loading || (scope === 'saved' && loadingSaved);

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

  const copyPostLink = async (post: PostItem) => {
    try {
      const shareUrl = `https://wayfare.vn/community?postId=${post.id}`;
      await Clipboard.setStringAsync(shareUrl);
      showToast({
        kind: 'success',
        title: 'Đã sao chép liên kết',
        message: 'Đã sao chép liên kết bài viết vào bộ nhớ tạm!',
        icon: 'copy',
      });
    } catch {
      showToast({
        kind: 'error',
        title: 'Lỗi sao chép',
        message: 'Không thể sao chép liên kết vào bộ nhớ tạm.',
      });
    }
  };

  const handleShare = (post: PostItem) => {
    setShareTarget(post);
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

  const handleToggleCommentLock = async (post: PostItem) => {
    try {
      const updated = await postApi.toggleCommentLock(post.id);
      const isLocked = Boolean(updated?.commentLocked ?? !post.commentLocked);
      patchPost(post.id, { commentLocked: isLocked });
      showToast({
        kind: 'success',
        title: isLocked ? 'Đã tắt bình luận' : 'Đã mở lại bình luận',
        message: isLocked
          ? 'Người khác sẽ không thể bình luận vào bài viết này.'
          : 'Mọi người đã có thể tiếp tục bình luận vào bài viết.',
        icon: isLocked ? 'lock' : 'comments',
      });
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Thao tác thất bại',
        message: err?.response?.data?.message || 'Không thể đổi trạng thái bình luận.',
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
    const images = getPostImages(post);
    if (!images.length) return;
    const safeIndex = Math.max(0, Math.min(index, images.length - 1));
    setLightbox({ images, index: safeIndex, authorName: post.authorName });
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
      options.push({
        key: 'comment_lock',
        label: post.commentLocked ? 'Mở lại bình luận' : 'Tắt tính năng bình luận',
        icon: post.commentLocked ? 'comments' : 'lock',
        onPress: () => handleToggleCommentLock(post),
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

    options.push({
      key: 'copy_link',
      label: 'Sao chép liên kết bài viết',
      icon: 'copy',
      onPress: () => copyPostLink(post),
    });
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

  const handleScopeChange = (key: FeedScope) => {
    if ((key === 'following' || key === 'saved') && !session) {
      authPrompt.open();
      return;
    }
    setScope(key);
    scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const scrollRef = useRef<FlatList<PostItem>>(null);

  // ── Theo dõi bài viết đang nằm trong màn hình để tự phát video ──
  const [activeVisiblePostId, setActiveVisiblePostId] = useState<number | null>(null);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 45,
    waitForInteraction: false,
  }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: any }> }) => {
      if (viewableItems && viewableItems.length > 0) {
        // Ưu tiên bài có video đang hiển thị ở giữa màn hình
        const videoPost = viewableItems.find((v) => v.item && Boolean((v.item as PostItem).videoUrl));
        if (videoPost?.item) {
          setActiveVisiblePostId(Number((videoPost.item as PostItem).id));
        } else {
          const first = viewableItems[0]?.item as PostItem | undefined;
          setActiveVisiblePostId(first ? Number(first.id) : null);
        }
      } else {
        setActiveVisiblePostId(null);
      }
    }
  ).current;

  const renderPost = ({ item }: { item: PostItem }) => {
    const liked = !!likedPosts[item.id];
    const likes = likesCount[item.id] ?? item.likeCount ?? item.likesCount ?? 0;
    const commentCount = commentOverrides[item.id] ?? item.commentCount ?? item.commentsCount ?? 0;
    const postWithCount: PostItem = { ...item, commentCount, likeCount: likes, isLiked: liked };
    const canFollow = session && !(item.isOwner ?? (session.id != null && item.authorId === session.id)) && item.authorId != null;
    const isAnyModalOpen = Boolean(
      detailPost ||
      composerVisible ||
      editingPost ||
      menuPost ||
      reportTarget ||
      lightbox ||
      itineraryVisible ||
      placeDetailVisible ||
      selectedPostForLikers ||
      selectedUserId ||
      shareTarget ||
      filterSheetVisible
    );

    return (
      <PostCard
        post={postWithCount}
        isVideoPlaying={!isAnyModalOpen && activeVisiblePostId === Number(item.id)}
        liked={liked}
        likeCount={likes}
        bookmarked={!!bookmarkedPosts[item.id]}
        isFollowingAuthor={item.authorId != null ? followingIds.has(Number(item.authorId)) : false}
        followLoading={item.authorId != null ? followLoadingIds.has(Number(item.authorId)) : false}
        cloningItinerary={cloningPostId === item.id}
        currentUserId={session?.id ?? null}
        onToggleFollow={canFollow ? () => toggleFollowAuthor(item.authorId) : undefined}
        onToggleLike={() => toggleLike(item.id)}
        onPressLikers={() => setSelectedPostForLikers(item)}
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
        onPressAuthor={() => item.authorId && setSelectedUserId(Number(item.authorId))}
      />
    );
  };

  const activeFilterCount =
    (topic !== 'all' ? 1 : 0) + (hashtag !== 'all' ? 1 : 0) + (sort !== 'newest' ? 1 : 0);
  const hasFilter = activeFilterCount > 0 || !!search.trim();

  const emptyState = () => {
    if (listBusy) return <CommunityFeedSkeleton />;
    if (hasError && !clientFiltering) {
      return (
        <View style={styles.centerBox}>
          <View style={styles.alertCard}>
            <FontAwesome name="globe" size={32} color={WF_PAPER.clay} style={{ marginBottom: 10 }} />
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
        <FontAwesome name={msg.icon} size={42} color={WF_PAPER.inkMuted} style={{ opacity: 0.55 }} />
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
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[WF_PAPER.clay]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <CommunityStoriesReel
              currentUserAvatar={session?.avatarUrl}
              onCreatePress={openCreate}
              onSelectTopic={(story: StoryTopic) => {
                setSearch(story.query);
                scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
              }}
            />
            <View style={styles.feedHeader}>
              <SegmentedTabs
                items={FEED_SCOPES.map((item) => ({ key: item.key, label: item.label }))}
                value={scope}
                onChange={handleScopeChange}
              />

            <View style={styles.toolbarRow}>
              <View style={styles.searchBox}>
                <FontAwesome name="search" size={14} color={DS_COLOR.inkMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm bài viết, địa điểm, tác giả..."
                  placeholderTextColor={DS_COLOR.inkMuted}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                  accessibilityLabel="Tìm kiếm bài viết"
                />
                {search ? (
                  <TouchableOpacity
                    onPress={() => setSearch('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Xoá từ khoá tìm kiếm">
                    <FontAwesome name="times-circle" size={15} color={DS_COLOR.inkMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
                activeOpacity={0.85}
                accessibilityLabel={`Bộ lọc${activeFilterCount > 0 ? `, ${activeFilterCount} mục đang chọn` : ''}`}
                onPress={() => setFilterSheetVisible(true)}>
                {loadingFull ? (
                  <ActivityIndicator size="small" color={DS_COLOR.accent} />
                ) : (
                  <FontAwesome
                    name="sliders"
                    size={15}
                    color={activeFilterCount > 0 ? DS_COLOR.accent : DS_COLOR.inkSecondary}
                  />
                )}
                <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>Lọc</Text>
                {activeFilterCount > 0 ? (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {QUICK_TOPICS.map((item) => (
                <Chip
                  key={item.key}
                  label={item.label}
                  active={topic === item.key}
                  onPress={() => {
                    setTopic(item.key);
                    scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
                  }}
                />
              ))}
            </ScrollView>
          </View>
          </>
        }
        ListFooterComponent={
          <View style={styles.listFooter}>
            {loadingMore ? <ActivityIndicator size="small" color={DS_COLOR.accent} /> : null}
          </View>
        }
        ListEmptyComponent={emptyState()}
      />

      {/* Nút tạo bài viết nổi */}
      <FAB onPress={openCreate} accessibilityLabel="Đăng bài viết mới" />

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
        onPressLikers={() => detailPost && setSelectedPostForLikers(detailPost)}
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
        onPressAuthor={(userId) => setSelectedUserId(userId)}
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

      {/* ─── Overlay: bộ lọc feed ───────────────────────────── */}
      <CommunityFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        topic={topic}
        onTopicChange={setTopic}
        hashtag={hashtag}
        onHashtagChange={setHashtag}
        sort={sort}
        onSortChange={setSort}
        onReset={resetFilters}
      />

      {/* ─── Overlay: menu bài viết (từ thẻ feed) ───────────── */}
      <ActionSheet
        visible={!!menuPost}
        title="Tùy chọn bài viết"
        options={menuPost ? buildMenuOptions(menuPost) : []}
        onClose={() => setMenuPost(null)}
      />

      {/* ─── Overlay: báo cáo vi phạm bài viết đa năng ─────────── */}
      <UniversalReportModal
        visible={!!reportTarget}
        targetType="POST"
        targetId={reportTarget?.id ?? null}
        targetTitle={reportTarget?.title || reportTarget?.content?.slice(0, 60)}
        onClose={() => setReportTarget(null)}
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

      {/* ─── Overlay: danh sách người đã thích ───────────── */}
      <PostLikersModal
        visible={!!selectedPostForLikers}
        postId={selectedPostForLikers?.id ?? null}
        postTitle={selectedPostForLikers?.title}
        currentUserId={session?.id ?? null}
        onClose={() => setSelectedPostForLikers(null)}
        onFollowChange={(targetUserId, isFollowing) => {
          setFollowingIds((prev) => {
            const next = new Set(prev);
            if (isFollowing) next.add(targetUserId);
            else next.delete(targetUserId);
            return next;
          });
        }}
      />

      {/* ─── Overlay: hồ sơ công khai thành viên ────────────── */}
      <UserProfileModal
        visible={selectedUserId != null}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onPressPost={(post) => {
          setSelectedUserId(null);
          setDetailPost(post);
        }}
      />

      {/* ─── Overlay: chia sẻ bài viết (Repost & Multi-channel) ─ */}
      <SharePostModal
        visible={!!shareTarget}
        post={shareTarget}
        session={session}
        onClose={() => setShareTarget(null)}
        onPostShared={(newPost) => {
          setPagedPosts((prev) => [newPost, ...prev]);
          setFullPosts((prev) => (prev ? [newPost, ...prev] : null));
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
    paddingBottom: 116,
  },
  listFooter: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: DS_COLOR.surface,
    borderBottomWidth: 1,
    borderBottomColor: DS_COLOR.line,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.surfaceMuted,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: DS_TYPE.body,
    lineHeight: 20,
    color: DS_COLOR.ink,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.surfaceMuted,
  },
  filterBtnActive: {
    backgroundColor: DS_COLOR.accentSoft,
  },
  filterBtnText: {
    fontSize: DS_TYPE.meta,
    fontWeight: '500',
    color: DS_COLOR.inkSecondary,
  },
  filterBtnTextActive: {
    color: DS_COLOR.accent,
    fontWeight: '600',
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: DS_COLOR.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chipRow: {
    gap: 8,
    paddingTop: 10,
    paddingRight: 16,
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: WF_PAPER.card,
    padding: 20,
    borderRadius: DS_RADIUS.lg,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    alignItems: 'center',
    width: '100%',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WF_PAPER.inkPrimary,
  },
  alertDesc: {
    fontSize: 13,
    color: WF_PAPER.inkSecondary,
    marginVertical: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryBtn: {
    backgroundColor: WF_PAPER.clay,
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: WF_PAPER.inkPrimary,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: WF_PAPER.inkSecondary,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
});
