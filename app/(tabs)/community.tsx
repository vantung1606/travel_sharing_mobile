import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Text, TextInput } from '@/components/Themed';
import { SERIF_FONT } from '@/constants/Typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { WF_COLORS } from '@/constants/Colors';
import { postApi, PostItem, CommentItem, API_BASE_URL } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';
import axios from 'axios';

// Stories cộng đồng chuẩn 100% bản Web
const COMMUNITY_STORIES = [
  { id: 'dalat', location: 'Đà Lạt', badge: '🌸', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80' },
  { id: 'danang', location: 'Đà Nẵng', badge: '🌊', image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=300&q=80' },
  { id: 'phuquoc', location: 'Phú Quốc', badge: '🏖️', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80' },
  { id: 'hagiang', location: 'Hà Giang', badge: '🏍️', image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=300&q=80' },
  { id: 'sapa', location: 'Sa Pa', badge: '🌾', image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=300&q=80' },
  { id: 'hoian', location: 'Hội An', badge: '🏮', image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=300&q=80' },
];

const TRAVEL_HASHTAGS = [
  '#TấtCả',
  '#KinhNghiệm',
  '#ReviewẨmThực',
  '#PhượtSolo',
  '#ĐàNẵng',
  '#ĐàLạt',
  '#PhúQuốc',
  '#CheckIn',
  '#TiếtKiệm',
];

export default function CommunityScreen() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [selectedTag, setSelectedTag] = useState<string>('#TấtCả');

  // Likes & Bookmarks state
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [likesCount, setLikesCount] = useState<Record<number, number>>({});
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Record<number, boolean>>({});

  // Modal Bình Luận
  const [commentModalVisible, setCommentModalVisible] = useState<boolean>(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [activePostTitle, setActivePostTitle] = useState<string>('');
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);

  // Modal Tạo Bài Viết Mới
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Kinh nghiệm');
  const [newCover, setNewCover] = useState<string>('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80');
  const [submittingPost, setSubmittingPost] = useState<boolean>(false);

  const fetchPosts = useCallback(async () => {
    try {
      setHasError(false);
      const data = await postApi.getCommunityPosts();
      setPosts(data || []);

      // Khởi tạo likes
      const likesMap: Record<number, boolean> = {};
      const countMap: Record<number, number> = {};
      data.forEach(p => {
        likesMap[p.id] = !!p.isLiked;
        countMap[p.id] = p.likesCount || 0;
      });
      setLikedPosts(likesMap);
      setLikesCount(countMap);
    } catch (err: any) {
      console.warn('Fetch posts error:', err.message || err);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const toggleLike = async (postId: number) => {
    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập ở tab "Tài khoản" để thích bài viết!');
      return;
    }

    const isCurrentlyLiked = !!likedPosts[postId];
    // Optimistic update
    setLikedPosts(prev => ({ ...prev, [postId]: !isCurrentlyLiked }));
    setLikesCount(prev => ({
      ...prev,
      [postId]: (prev[postId] || 0) + (isCurrentlyLiked ? -1 : 1),
    }));

    try {
      const res = await postApi.toggleLike(postId);
      if (res) {
        setLikedPosts(prev => ({ ...prev, [postId]: res.isLiked }));
        setLikesCount(prev => ({ ...prev, [postId]: res.likeCount }));
      }
    } catch (err: any) {
      // Rollback
      setLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
      setLikesCount(prev => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (isCurrentlyLiked ? 1 : -1),
      }));
    }
  };

  const toggleBookmark = async (postId: number) => {
    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập ở tab "Tài khoản" để lưu bài viết!');
      return;
    }
    try {
      const res = await postApi.toggleBookmark(postId);
      setBookmarkedPosts(prev => ({ ...prev, [postId]: res.isBookmarked }));
      Alert.alert(
        'Bộ sưu tập',
        res.isBookmarked ? 'Đã lưu bài viết vào bộ sưu tập cá nhân! 🔖' : 'Đã bỏ lưu bài viết khỏi bộ sưu tập.'
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể lưu bài viết lúc này');
    }
  };

  const handleOpenComments = async (post: PostItem) => {
    setActiveCommentPostId(post.id);
    setActivePostTitle(post.title || 'Bài viết cộng đồng');
    setCommentModalVisible(true);
    setLoadingComments(true);
    try {
      const list = await postApi.getComments(post.id);
      setCommentsList(list || []);
    } catch (e) {
      console.warn('Lỗi lấy bình luận:', e);
      setCommentsList([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!activeCommentPostId || !newCommentText.trim()) return;
    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để gửi bình luận!');
      return;
    }

    try {
      setSubmittingComment(true);
      const created = await postApi.addComment(activeCommentPostId, newCommentText.trim());
      const enrichedComment: CommentItem = {
        ...created,
        authorName: created?.authorName || session.fullName || session.name || 'Tôi',
        authorAvatar: created?.authorAvatar || session.avatar || session.avatarUrl,
        authorHandle: created?.authorHandle || session.handle,
        timeAgo: 'Vừa xong',
      };
      setCommentsList(prev => [...prev, enrichedComment]);
      setNewCommentText('');
      setPosts(prev =>
        prev.map(p =>
          p.id === activeCommentPostId ? { ...p, commentsCount: (p.commentsCount || p.commentCount || 0) + 1 } : p
        )
      );
    } catch (err: any) {
      Alert.alert('Lỗi gửi bình luận', err.response?.data?.message || err.message || 'Không thể gửi bình luận');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleOpenCreateModal = async () => {
    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập ở tab "Tài khoản" để chia sẻ bài viết lên cộng đồng!');
      return;
    }
    setCreateModalVisible(true);
  };

  const handleCreatePost = async () => {
    if (!newContent.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung bài viết');
      return;
    }

    try {
      setSubmittingPost(true);
      await postApi.createPost({
        title: newTitle.trim() || undefined,
        content: newContent.trim(),
        category: newCategory,
        locationName: newLocation.trim() || undefined,
        coverImage: newCover.trim() || undefined,
        images: newCover.trim() ? [newCover.trim()] : [],
      });

      Alert.alert('Thành công! 🎉', 'Bài viết của bạn đã được đăng lên Bảng tin cộng đồng.');
      setCreateModalVisible(false);
      setNewTitle('');
      setNewContent('');
      setNewLocation('');
      fetchPosts();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể đăng bài viết';
      Alert.alert('Lỗi đăng bài', msg);
    } finally {
      setSubmittingPost(false);
    }
  };

  const renderPost = ({ item }: { item: PostItem }) => {
    const avatarUrl = item.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
    const postImage = item.coverImage || item.imageUrl || (item.images && item.images.length > 0 ? item.images[0] : null);
    const isLiked = !!likedPosts[item.id];
    const likes = likesCount[item.id] ?? (item.likesCount ?? item.likeCount ?? 0);

    return (
      <View style={styles.postCard}>
        {/* Author Header */}
        <View style={styles.authorRow}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={styles.authorInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.authorName}>{item.authorName || (item.authorHandle ? '@' + item.authorHandle : 'Thành viên Wayfare')}</Text>
              <View style={styles.tierPill}>
                <Text style={styles.tierPillText}>{item.authorTier || 'Thành viên'}</Text>
              </View>
            </View>
            {item.locationName ? (
              <View style={styles.locationBadge}>
                <FontAwesome name="map-marker" size={10} color={WF_COLORS.primary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.locationName}
                </Text>
              </View>
            ) : null}
          </View>

          {item.category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category}</Text>
            </View>
          ) : null}
        </View>

        {/* Post Content */}
        {item.title ? (
          <Text style={styles.postTitle}>{item.title}</Text>
        ) : null}

        <Text style={styles.postBody} numberOfLines={5}>
          {item.content}
        </Text>

        {/* Post Image */}
        {postImage ? (
          <Image source={{ uri: postImage }} style={styles.postImage} resizeMode="cover" />
        ) : null}

        {/* Footer Actions */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item.id)} activeOpacity={0.7}>
            <FontAwesome
              name={isLiked ? 'heart' : 'heart-o'}
              size={16}
              color={isLiked ? '#EF4444' : WF_COLORS.slate500}
            />
            <Text style={[styles.actionCount, isLiked && { color: '#EF4444', fontWeight: '700' }]}>
              {likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => handleOpenComments(item)}>
            <FontAwesome name="comment-o" size={16} color={WF_COLORS.slate500} />
            <Text style={styles.actionCount}>{item.commentsCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            activeOpacity={0.7}
            onPress={() => toggleBookmark(item.id)}>
            <FontAwesome
              name={bookmarkedPosts[item.id] ? 'bookmark' : 'bookmark-o'}
              size={16}
              color={bookmarkedPosts[item.id] ? WF_COLORS.primary : WF_COLORS.slate500}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPost}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[WF_COLORS.primary]} />}
        ListHeaderComponent={
          <View style={styles.headerWrapper}>

            {/* 3. Community Stories Row (Chuẩn Web) */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
              {COMMUNITY_STORIES.map((story) => (
                <View key={story.id} style={styles.storyItem}>
                  <View style={styles.storyRing}>
                    <Image source={{ uri: story.image }} style={styles.storyImage} />
                    <View style={styles.storyBadge}>
                      <Text style={{ fontSize: 10 }}>{story.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.storyLabel} numberOfLines={1}>{story.location}</Text>
                </View>
              ))}
            </ScrollView>

            {/* 4. Quick Post Creator Prompt */}
            <TouchableOpacity style={styles.createPromptBox} onPress={handleOpenCreateModal} activeOpacity={0.88}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80' }}
                style={styles.promptAvatar}
              />
              <Text style={styles.promptPlaceholder}>
                Chia sẻ khoảnh khắc chuyến đi của bạn...
              </Text>
              <View style={styles.promptPostBtn}>
                <FontAwesome name="pencil" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.promptPostBtnText}>Đăng bài</Text>
              </View>
            </TouchableOpacity>

            {/* 5. Travel Hashtags Scroll */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hashtagsScroll}>
              {TRAVEL_HASHTAGS.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => setSelectedTag(tag)}
                    style={[styles.hashtagChip, isSelected && styles.hashtagChipActive]}>
                    <Text style={[styles.hashtagText, isSelected && styles.hashtagTextActive]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={WF_COLORS.primary} />
              <Text style={styles.loadingText}>Đang nạp bảng tin cộng đồng từ Railway...</Text>
            </View>
          ) : hasError ? (
            <View style={styles.centerBox}>
              <View style={styles.alertCard}>
                <FontAwesome name="globe" size={32} color={WF_COLORS.primary} style={{ marginBottom: 10 }} />
                <Text style={styles.alertTitle}>Chưa có kết nối máy chủ</Text>
                <Text style={styles.alertDesc}>Đang nạp từ: {API_BASE_URL}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchPosts}>
                  <Text style={styles.retryBtnText}>Tải lại dữ liệu</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.centerBox}>
              <FontAwesome name="comments-o" size={44} color={WF_COLORS.slate400} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>Chưa có bài viết nào</Text>
              <Text style={styles.emptySub}>Hãy là người đầu tiên chia sẻ khoảnh khắc du lịch tuyệt vời!</Text>
            </View>
          )
        }
      />

      {/* ─── MODAL TẠO BÀI VIẾT MỚI ────────────────────────────── */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardBox}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitle}>✍️ Tạo Bài Viết Mới</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tiêu đề bài viết</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="VD: Trải nghiệm trượt cát tại Mũi Né"
                  placeholderTextColor={WF_COLORS.slate400}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Địa điểm check-in</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="VD: Mũi Né, Phan Thiết, Bình Thuận"
                  placeholderTextColor={WF_COLORS.slate400}
                  value={newLocation}
                  onChangeText={setNewLocation}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nội dung chia sẻ *</Text>
                <TextInput
                  style={[styles.modalInput, { height: 90, textAlignVertical: 'top', paddingTop: 8 }]}
                  placeholder="Cảm nghĩ, mẹo du lịch, lưu ý trang phục, quán ăn ngon..."
                  placeholderTextColor={WF_COLORS.slate400}
                  value={newContent}
                  onChangeText={setNewContent}
                  multiline
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.submitPostBtn, submittingPost && { opacity: 0.7 }]}
                onPress={handleCreatePost}
                disabled={submittingPost}>
                {submittingPost ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitPostBtnText}>Đăng lên Cộng đồng</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL BÌNH LUẬN ─────────────────────────────────────── */}
      <Modal visible={commentModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCardBox, { maxHeight: '82%' }]}>
            <View style={styles.modalCardHeader}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.modalCardTitle}>💬 Bình Luận</Text>
                <Text style={styles.commentModalSub} numberOfLines={1}>{activePostTitle}</Text>
              </View>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)} style={{ padding: 4 }}>
                <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
              </TouchableOpacity>
            </View>

            {loadingComments ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color={WF_COLORS.primary} />
                <Text style={{ marginTop: 8, fontSize: 12, color: WF_COLORS.slate500 }}>Đang tải bình luận...</Text>
              </View>
            ) : commentsList.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <FontAwesome name="comments-o" size={36} color={WF_COLORS.slate400} />
                <Text style={{ marginTop: 8, fontSize: 13, color: WF_COLORS.slate500 }}>Chưa có bình luận nào</Text>
                <Text style={{ fontSize: 11, color: WF_COLORS.slate400, marginTop: 2 }}>Hãy là người đầu tiên chia sẻ cảm nghĩ!</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {commentsList.map((cmt) => {
                  const authorName = cmt.authorName || cmt.userName || (cmt.authorHandle ? '@' + cmt.authorHandle : 'Thành viên Wayfare');
                  const avatar = cmt.authorAvatar || cmt.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
                  const time = cmt.timeAgo || (cmt.createdAt ? new Date(cmt.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong');
                  return (
                    <View key={cmt.id} style={styles.commentRow}>
                      <Image
                        source={{ uri: avatar }}
                        style={styles.commentAvatar}
                      />
                      <View style={styles.commentContentBox}>
                        <View style={styles.commentHeaderLine}>
                          <Text style={styles.commentAuthor}>{authorName}</Text>
                          <Text style={styles.commentTime}>{time}</Text>
                        </View>
                        <Text style={styles.commentBodyText}>{cmt.content}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Input row */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Viết bình luận của bạn..."
                placeholderTextColor={WF_COLORS.slate400}
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <TouchableOpacity
                style={[styles.sendCommentBtn, (!newCommentText.trim() || submittingComment) && { opacity: 0.5 }]}
                onPress={handleAddComment}
                disabled={!newCommentText.trim() || submittingComment}>
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <FontAwesome name="send" size={13} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WF_COLORS.slate50,
  },
  list: {
    paddingBottom: 24,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 8,
    backgroundColor: WF_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate200,
    marginBottom: 8,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
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
  titleSection: {
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: WF_COLORS.slate900,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginTop: 2,
  },
  storiesScroll: {
    gap: 14,
    paddingTop: 2,
    paddingBottom: 6,
    marginBottom: 8,
  },
  storyItem: {
    alignItems: 'center',
    width: 60,
  },
  storyRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: WF_COLORS.primary,
    padding: 2,
    position: 'relative',
    marginBottom: 4,
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
    borderRadius: 8,
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
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    marginBottom: 10,
  },
  promptAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  promptPlaceholder: {
    flex: 1,
    fontSize: 12,
    color: WF_COLORS.slate500,
  },
  promptPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  promptPostBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  hashtagsScroll: {
    gap: 8,
    paddingBottom: 2,
  },
  hashtagChip: {
    backgroundColor: WF_COLORS.slate100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  hashtagChipActive: {
    backgroundColor: WF_COLORS.primaryLight,
    borderColor: WF_COLORS.primary,
  },
  hashtagText: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  hashtagTextActive: {
    color: WF_COLORS.primary,
    fontWeight: '700',
  },
  postCard: {
    backgroundColor: WF_COLORS.white,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: WF_COLORS.slate200,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  tierPill: {
    backgroundColor: WF_COLORS.amberLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tierPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    color: WF_COLORS.slate500,
  },
  categoryPill: {
    backgroundColor: WF_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  postBody: {
    fontSize: 13,
    lineHeight: 19,
    color: WF_COLORS.slate700,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 220,
    backgroundColor: WF_COLORS.slate100,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: WF_COLORS.slate100,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate600,
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: WF_COLORS.slate500,
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
  },
  retryBtn: {
    backgroundColor: WF_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginTop: 4,
    textAlign: 'center',
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCardBox: {
    width: '100%',
    backgroundColor: WF_COLORS.white,
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: WF_COLORS.slate900,
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
  modalInput: {
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: WF_COLORS.slate900,
  },
  submitPostBtn: {
    backgroundColor: WF_COLORS.primary,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  submitPostBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  commentModalSub: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    marginTop: 2,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    marginTop: 2,
  },
  commentContentBox: {
    flex: 1,
    backgroundColor: WF_COLORS.slate100,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  commentTime: {
    fontSize: 10,
    color: WF_COLORS.slate400,
  },
  commentBodyText: {
    fontSize: 12,
    color: WF_COLORS.slate700,
    lineHeight: 17,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: WF_COLORS.slate200,
    gap: 8,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: WF_COLORS.slate100,
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 40,
    fontSize: 13,
    color: WF_COLORS.slate900,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  sendCommentBtn: {
    backgroundColor: WF_COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
