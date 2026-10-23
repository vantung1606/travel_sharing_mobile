import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { ItineraryDetailModal } from '@/components/ItineraryDetailModal';
import { showToast } from '@/components/Toast';
import { confirmDialog } from '@/components/ConfirmDialog';
import { WF_COLORS } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { itineraryApi, ItineraryItem, postApi, PostItem, userApi } from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

const COMMUNITY_STORIES = [
  { id: 'dalat', location: 'Đà Lạt', badge: '🌸', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80' },
  { id: 'danang', location: 'Đà Nẵng', badge: '🌊', image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=300&q=80' },
  { id: 'phuquoc', location: 'Phú Quốc', badge: '🏖️', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80' },
  { id: 'hagiang', location: 'Hà Giang', badge: '🏍️', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=300&q=80' },
  { id: 'sapa', location: 'Sa Pa', badge: '🌾', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=300&q=80' },
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
    } else if (session && post.authorId != null) {
      const isFollowing = followingIds.has(Number(post.authorId));
      options.push({
        key: 'follow',
        label: isFollowing ? 'Bỏ theo dõi tác giả' : 'Theo dõi tác giả',
        icon: 'user-plus',
        onPress: () => toggleFollowAuthor(post.authorId),
      });
      options.push({
        key: 'hide',
        label: 'Ẩn bài viết này',
        icon: 'eye-slash',
        onPress: () => setHiddenIds((prev) => new Set(prev).add(post.id)),
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
        onPressVideo={() => handleShare(item)}
        onViewItinerary={() => openItineraryFor(item)}
        onCloneItinerary={() => cloneItinerary(item)}
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
            {/* Stories */}
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
                    <FontAwesome name="globe" size={20} color={WF_COLORS.primary} />
                  </View>
                </View>
                <Text style={styles.storyLabel} numberOfLines={1}>
                  Tất cả
                </Text>
              </TouchableOpacity>
              {COMMUNITY_STORIES.map((story) => (
                <TouchableOpacity
                  key={story.id}
                  style={styles.storyItem}
                  activeOpacity={0.85}
                  onPress={() => {
                    setScope('all');
                    setTopic('all');
                    setHashtag('all');
                    setSearch(story.location);
                    scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
                  }}>
                  <View style={styles.storyRing}>
                    <Image source={{ uri: story.image }} style={styles.storyImage} />
                    <View style={styles.storyBadge}>
                      <Text style={{ fontSize: 10 }}>{story.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.storyLabel} numberOfLines={1}>
                    {story.location}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Composer */}
            <TouchableOpacity style={styles.createPromptBox} onPress={openCreate} activeOpacity={0.88}>
              <Image source={{ uri: session?.avatarUrl || session?.avatar || FALLBACK_AVATAR }} style={styles.promptAvatar} />
              <Text style={styles.promptPlaceholder} numberOfLines={1}>
                {session ? 'Chia sẻ khoảnh khắc chuyến đi của bạn...' : 'Đăng nhập để chia sẻ chuyến đi...'}
              </Text>
              <View style={styles.promptPostBtn}>
                <FontAwesome name="pencil" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.promptPostBtnText}>Đăng bài</Text>
              </View>
            </TouchableOpacity>

            {/* Scope tabs */}
            <View style={styles.scopeRow}>
              {FEED_SCOPES.map((item) => {
                const active = scope === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.scopeTab, active && styles.scopeTabActive]}
                    activeOpacity={0.85}
                    onPress={() => {
                      setScope(item.key);
                      scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
                    }}>
                    <Text style={[styles.scopeTabText, active && styles.scopeTabTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Search + sort */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <FontAwesome name="search" size={13} color={WF_COLORS.slate400} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm bài viết, địa điểm, tác giả..."
                  placeholderTextColor={WF_COLORS.slate400}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <FontAwesome name="times-circle" size={14} color={WF_COLORS.slate400} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.sortBtn}
                activeOpacity={0.85}
                accessibilityLabel="Sắp xếp bảng tin"
                onPress={() => setSortSheetVisible(true)}>
                <FontAwesome name="sort" size={14} color={WF_COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Topic chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {TOPIC_FILTERS.map((item) => {
                const active = topic === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.topicChip, active && styles.topicChipActive]}
                    activeOpacity={0.85}
                    onPress={() => setTopic(item.key)}>
                    {item.badge ? (
                      <View style={[styles.topicBadge, active && styles.topicBadgeActive]}>
                        <Text style={[styles.topicBadgeText, active && { color: WF_COLORS.primary }]}>{item.badge}</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.topicChipText, active && styles.topicChipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Hashtag chips */}
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
        onSubmitReport={submitReport}
        onCommentCountChange={handleCommentCountChange}
      />

      {/* ─── Overlay: soạn bài ──────────────────────────────── */}
      <CreatePostModal
        visible={composerVisible}
        editingPost={editingPost}
        onClose={() => {
          setComposerVisible(false);
          setEditingPost(null);
        }}
        onSubmitted={(post) => {
          setComposerVisible(false);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WF_COLORS.slate50,
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
    color: WF_COLORS.slate500,
    fontWeight: '600',
  },
  headerWrapper: {
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: WF_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate200,
    marginBottom: 12,
  },
  storiesScroll: {
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  storyItem: {
    alignItems: 'center',
    width: 62,
  },
  storyRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: WF_COLORS.primary,
    padding: 2,
    position: 'relative',
    marginBottom: 5,
  },
  storyRingAll: {
    borderColor: WF_COLORS.primaryLight,
  },
  storyAllInner: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: WF_COLORS.primarySoft,
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
    backgroundColor: WF_COLORS.white,
    borderRadius: 9,
    paddingHorizontal: 2,
  },
  storyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  createPromptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.slate100,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  promptAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: WF_COLORS.slate200,
  },
  promptPlaceholder: {
    flex: 1,
    fontSize: 12.5,
    color: WF_COLORS.slate500,
  },
  promptPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11,
  },
  promptPostBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  scopeRow: {
    flexDirection: 'row',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: WF_COLORS.slate100,
    borderRadius: 14,
    padding: 4,
  },
  scopeTab: {
    flex: 1,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeTabActive: {
    backgroundColor: WF_COLORS.white,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  scopeTabText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_COLORS.slate500,
  },
  scopeTabTextActive: {
    color: WF_COLORS.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: WF_COLORS.slate900,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
    backgroundColor: WF_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.white,
  },
  topicChipActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  topicBadge: {
    backgroundColor: WF_COLORS.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  topicBadgeActive: {
    backgroundColor: WF_COLORS.white,
  },
  topicBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  topicChipText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    color: WF_COLORS.slate600,
  },
  topicChipTextActive: {
    color: '#FFFFFF',
  },
  hashtagRow: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  hashtagChip: {
    minHeight: 32,
    paddingHorizontal: 11,
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  hashtagChipActive: {
    backgroundColor: WF_COLORS.primaryLight,
    borderColor: WF_COLORS.primary,
  },
  hashtagText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: WF_COLORS.slate600,
  },
  hashtagTextActive: {
    color: WF_COLORS.primary,
    fontWeight: '800',
  },
  filterSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: WF_COLORS.primarySoft,
  },
  filterSummaryText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: WF_COLORS.primaryHover,
  },
  filterClear: {
    fontSize: 11.5,
    fontWeight: '800',
    color: WF_COLORS.primary,
    textDecorationLine: 'underline',
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: WF_COLORS.white,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    alignItems: 'center',
    width: '100%',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  alertDesc: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginVertical: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: WF_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
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
    color: WF_COLORS.slate900,
    marginTop: 12,
    fontFamily: SERIF_FONT,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
