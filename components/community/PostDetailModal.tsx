import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/Themed';
import { ActionSheet, ActionSheetOption } from '@/components/community/ActionSheet';
import { ImageLightbox } from '@/components/community/ImageLightbox';
import { ItineraryAttachCard } from '@/components/community/ItineraryAttachCard';
import { PlaceAttachCard } from '@/components/community/PlaceAttachCard';
import { PostMedia } from '@/components/community/PostMedia';
import { ReportPostSheet } from '@/components/community/ReportPostSheet';
import {
  getPostCommentCount,
  getPostImages,
  getTierLabel,
} from '@/components/community/communityUtils';
import { WF_COLORS } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { ConfirmHost, confirmDialog } from '@/components/ConfirmDialog';
import { ToastHost, showToast } from '@/components/Toast';
import { postApi, CommentItem, PostItem } from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

interface PostDetailModalProps {
  visible: boolean;
  post: PostItem | null;
  liked: boolean;
  likeCount: number;
  bookmarked: boolean;
  isFollowingAuthor?: boolean;
  followLoading?: boolean;
  cloningItinerary?: boolean;
  currentUserId?: number | null;
  menuOptions: ActionSheetOption[];
  onClose: () => void;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
  onToggleFollow?: () => void;
  onShare: () => void;
  onViewItinerary: () => void;
  onCloneItinerary: () => void;
  onPressPlace?: (placeId: number) => void;
  onSubmitReport: (post: PostItem, reason: string, details: string) => Promise<void>;
  onCommentCountChange?: (postId: number, count: number) => void;
}

export function PostDetailModal({
  visible,
  post,
  liked,
  likeCount,
  bookmarked,
  isFollowingAuthor,
  followLoading,
  cloningItinerary,
  currentUserId,
  onClose,
  onToggleLike,
  onToggleBookmark,
  onToggleFollow,
  onShare,
  menuOptions,
  onViewItinerary,
  onCloneItinerary,
  onPressPlace,
  onSubmitReport,
  onCommentCountChange,
}: PostDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);
  const [input, setInput] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: number; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const onCountChangeRef = useRef(onCommentCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCommentCountChange;
  }, [onCommentCountChange]);

  const images = useMemo(() => (post ? getPostImages(post) : []), [post]);
  const [commentCount, setCommentCount] = useState(0);
  const isOwner = !!post && (post.isOwner ?? (currentUserId != null && post.authorId === currentUserId));
  const isPrivate = (post?.visibility || 'PUBLIC').toUpperCase() === 'PRIVATE';

  const loadComments = useCallback(async (postId: number) => {
    setLoadingComments(true);
    try {
      const list = await postApi.getComments(postId);
      const normalized = list || [];
      setComments(normalized);
      const total = normalized.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);
      setCommentCount(total);
      onCountChangeRef.current?.(postId, total);
    } catch (err: any) {
      console.warn('Lỗi tải bình luận:', err?.message || err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  useEffect(() => {
    if (!visible || !post) return;
    setInput('');
    setReplyTarget(null);
    setLightboxIndex(null);
    setMenuVisible(false);
    setReportVisible(false);
    setCommentCount(getPostCommentCount(post));
    loadComments(post.id);
    authStorage.getSession().then(setSession);
  }, [visible, post?.id, loadComments]);

  if (!visible || !post) return null;

  const canDelete = (comment: CommentItem) => {
    if (!session) return false;
    const mine = comment.authorId != null && session.id != null && comment.authorId === session.id;
    const admin = (session.role || '').toUpperCase().includes('ADMIN');
    return mine || admin || isOwner;
  };

  const handleOpenVideo = async () => {
    if (!post?.videoUrl) return;
    try {
      const can = await Linking.canOpenURL(post.videoUrl);
      if (can) {
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

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    if (!session) {
      showToast({
        kind: 'info',
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập ở tab "Tài khoản" để bình luận.',
      });
      return;
    }
    try {
      setSubmitting(true);
      const created = await postApi.addComment(post.id, text, replyTarget?.id);
      const enriched: CommentItem = {
        ...created,
        authorName: created?.authorName || session.fullName || 'Tôi',
        authorAvatar: created?.authorAvatar || session.avatarUrl,
        authorHandle: created?.authorHandle || session.handle,
        timeAgo: created?.timeAgo || 'Vừa xong',
        replies: created?.replies || [],
      };

      if (replyTarget) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTarget.id ? { ...c, replies: [...(c.replies || []), enriched] } : c
          )
        );
      } else {
        setComments((prev) => [...prev, enriched]);
      }
      const nextCount = commentCount + 1;
      setCommentCount(nextCount);
      onCommentCountChange?.(post.id, nextCount);
      setInput('');
      setReplyTarget(null);
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Gửi bình luận thất bại',
        message: err?.response?.data?.message || err?.message || 'Không thể gửi bình luận.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (comment: CommentItem, parentId?: number) => {
    const confirmed = await confirmDialog({
      title: 'Xóa bình luận?',
      message: 'Bình luận này sẽ bị gỡ khỏi bài viết.',
      confirmText: 'Xóa',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await postApi.deleteComment(post.id, comment.id);
      if (parentId != null) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId ? { ...c, replies: (c.replies || []).filter((r) => r.id !== comment.id) } : c
          )
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== comment.id));
      }
      const nextCount = Math.max(0, commentCount - 1);
      setCommentCount(nextCount);
      onCommentCountChange?.(post.id, nextCount);
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Xóa bình luận thất bại',
        message: err?.response?.data?.message || 'Không thể xóa bình luận này.',
      });
    }
  };

  const renderAvatar = (uri?: string) => (
    <Image source={{ uri: uri || FALLBACK_AVATAR }} style={styles.commentAvatar} />
  );

  const renderCommentBody = (comment: CommentItem, isReply: boolean, parentId?: number) => (
    <View style={[styles.commentItem, isReply && styles.replyItem]}>
      {renderAvatar(comment.authorAvatar || comment.userAvatar)}
      <View style={{ flex: 1 }}>
        <View style={styles.commentHead}>
          <Text style={styles.commentAuthor} numberOfLines={1}>
            {comment.authorName || comment.userName || 'Thành viên Wayfare'}
            {comment.replyToUserName ? (
              <Text style={styles.replyTo}> → {comment.replyToUserName}</Text>
            ) : null}
          </Text>
          <Text style={styles.commentTime}>{comment.timeAgo || 'Vừa xong'}</Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
        <View style={styles.commentActions}>
          <TouchableOpacity
            onPress={() =>
              setReplyTarget({
                id: parentId ?? comment.id,
                name: comment.authorName || comment.userName || 'thành viên',
              })
            }>
            <Text style={styles.commentActionText}>Trả lời</Text>
          </TouchableOpacity>
          {canDelete(comment) ? (
            <TouchableOpacity onPress={() => handleDelete(comment, parentId)}>
              <Text style={[styles.commentActionText, { color: '#E11D48' }]}>Xóa</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingTop: Math.max(insets.top, 8) + 4 }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={onClose} accessibilityLabel="Đóng">
              <FontAwesome name="angle-left" size={20} color={WF_COLORS.slate900} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bài viết cộng đồng</Text>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => setMenuVisible(true)}
              accessibilityLabel="Tùy chọn">
              <FontAwesome name="ellipsis-h" size={18} color={WF_COLORS.slate700} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Author */}
              <View style={styles.authorRow}>
                <Image source={{ uri: post.authorAvatar || FALLBACK_AVATAR }} style={styles.authorAvatar} />
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.authorName} numberOfLines={1}>
                      {post.authorName || 'Thành viên Wayfare'}
                    </Text>
                    <View style={styles.tierPill}>
                      <Text style={styles.tierPillText}>{getTierLabel(post.authorTier)}</Text>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{post.timeAgo || 'Vừa xong'}</Text>
                    {post.locationTag || post.locationName ? (
                      <>
                        <Text style={styles.metaDot}>·</Text>
                        <FontAwesome name="map-marker" size={10} color={WF_COLORS.slate400} />
                        <Text style={styles.metaText} numberOfLines={1}>
                          {post.locationTag || post.locationName}
                        </Text>
                      </>
                    ) : null}
                    <View style={[styles.visibilityPill, isPrivate && styles.visibilityPillPrivate]}>
                      <FontAwesome
                        name={isPrivate ? 'lock' : 'globe'}
                        size={9}
                        color={isPrivate ? '#B45309' : WF_COLORS.primary}
                      />
                      <Text style={[styles.visibilityText, isPrivate && { color: '#B45309' }]}>
                        {isPrivate ? 'Chỉ mình tôi' : 'Công khai'}
                      </Text>
                    </View>
                  </View>
                </View>
                {!isOwner && onToggleFollow ? (
                  <TouchableOpacity
                    style={[styles.followBtn, isFollowingAuthor && styles.followBtnActive]}
                    onPress={onToggleFollow}
                    disabled={followLoading}>
                    <Text style={[styles.followText, isFollowingAuthor && styles.followTextActive]}>
                      {isFollowingAuthor ? 'Đang theo dõi' : 'Theo dõi'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {post.category ? (
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{post.category}</Text>
                </View>
              ) : null}

              {post.title ? <Text style={styles.title}>{post.title}</Text> : null}
              <Text style={styles.content}>{post.content}</Text>

              {post.sharedPost ? (
                <View style={styles.sharedBox}>
                  <View style={styles.sharedHeader}>
                    <Image
                      source={{ uri: post.sharedPost.authorAvatar || FALLBACK_AVATAR }}
                      style={styles.sharedAvatar}
                    />
                    <Text style={styles.sharedAuthor}>
                      {post.sharedPost.authorName || 'Thành viên Wayfare'}
                    </Text>
                  </View>
                  {post.sharedPost.title ? (
                    <Text style={styles.sharedTitle}>{post.sharedPost.title}</Text>
                  ) : null}
                  <Text style={styles.sharedContent} numberOfLines={4}>
                    {post.sharedPost.content}
                  </Text>
                </View>
              ) : null}

              {images.length > 0 || post.videoUrl ? (
                <View style={styles.mediaWrap}>
                  <PostMedia
                    images={images}
                    videoUrl={post.videoUrl}
                    onPressImage={(index) => setLightboxIndex(index)}
                    onPressVideo={handleOpenVideo}
                  />
                </View>
              ) : null}

              {post.itineraryId || post.sharedPost?.itineraryId ? (
                <ItineraryAttachCard
                  post={post}
                  canClone={!isOwner}
                  cloning={cloningItinerary}
                  onView={onViewItinerary}
                  onClone={onCloneItinerary}
                />
              ) : null}

              {post.placeId || post.sharedPost?.placeId ? (
                <PlaceAttachCard
                  post={post}
                  onPress={onPressPlace}
                />
              ) : null}

              {/* Action bar */}
              <View style={styles.actionBar}>
                <TouchableOpacity style={styles.action} onPress={onToggleLike} activeOpacity={0.7}>
                  <FontAwesome
                    name={liked ? 'heart' : 'heart-o'}
                    size={18}
                    color={liked ? '#EF4444' : WF_COLORS.slate500}
                  />
                  <Text style={[styles.actionText, liked && { color: '#EF4444' }]}>
                    {likeCount} Thích
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={onShare} activeOpacity={0.7}>
                  <FontAwesome name="share-alt" size={17} color={WF_COLORS.slate500} />
                  <Text style={styles.actionText}>Chia sẻ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={onToggleBookmark} activeOpacity={0.7}>
                  <FontAwesome
                    name={bookmarked ? 'bookmark' : 'bookmark-o'}
                    size={18}
                    color={bookmarked ? WF_COLORS.primary : WF_COLORS.slate500}
                  />
                  <Text style={styles.actionText}>{bookmarked ? 'Đã lưu' : 'Lưu'}</Text>
                </TouchableOpacity>
              </View>

              {/* Comments */}
              <View style={styles.commentsHeader}>
                <FontAwesome name="comments-o" size={15} color={WF_COLORS.slate700} />
                <Text style={styles.commentsTitle}>Bình luận ({commentCount})</Text>
              </View>

              {loadingComments ? (
                <View style={styles.commentsLoading}>
                  <ActivityIndicator color={WF_COLORS.primary} />
                  <Text style={styles.commentsLoadingText}>Đang tải bình luận...</Text>
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.commentsEmpty}>
                  <FontAwesome name="comments-o" size={32} color={WF_COLORS.slate400} />
                  <Text style={styles.commentsEmptyTitle}>Chưa có bình luận nào</Text>
                  <Text style={styles.commentsEmptySub}>Hãy là người đầu tiên chia sẻ cảm nghĩ! 🌟</Text>
                </View>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id}>
                    {renderCommentBody(comment, false)}
                    {(comment.replies || []).map((reply) => (
                      <View key={reply.id}>{renderCommentBody(reply, true, comment.id)}</View>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>

            {/* Comment input */}
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              {replyTarget ? (
                <View style={styles.replyHint}>
                  <Text style={styles.replyHintText} numberOfLines={1}>
                    Đang trả lời {replyTarget.name}
                  </Text>
                  <TouchableOpacity onPress={() => setReplyTarget(null)}>
                    <FontAwesome name="times" size={13} color={WF_COLORS.slate500} />
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder={session ? 'Viết bình luận...' : 'Đăng nhập để bình luận'}
                  placeholderTextColor={WF_COLORS.slate400}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  editable={!!session}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!input.trim() || submitting) && { opacity: 0.5 }]}
                  onPress={handleSend}
                  disabled={!input.trim() || submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <FontAwesome name="paper-plane" size={14} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>

        <ImageLightbox
          visible={lightboxIndex != null}
          images={images}
          initialIndex={lightboxIndex ?? 0}
          authorName={post.authorName}
          onClose={() => setLightboxIndex(null)}
        />

        <ActionSheet
          visible={menuVisible}
          title="Tùy chọn bài viết"
          options={menuOptions.map((option) =>
            option.key === 'report' ? { ...option, onPress: () => setReportVisible(true) } : option
          )}
          onClose={() => setMenuVisible(false)}
        />

        <ReportPostSheet
          visible={reportVisible}
          postTitle={post.title || post.content?.slice(0, 60)}
          submitting={reportSubmitting}
          onClose={() => setReportVisible(false)}
          onSubmit={async (reason, details) => {
            setReportSubmitting(true);
            try {
              await onSubmitReport(post, reason, details);
              setReportVisible(false);
            } finally {
              setReportSubmitting(false);
            }
          }}
        />

        {/* Thông báo & hộp xác nhận trong chính modal bài viết */}
        <ConfirmHost enabled={visible} />
        <ToastHost enabled={visible} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    flex: 1,
    marginTop: 42,
    backgroundColor: WF_COLORS.slate50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: WF_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate200,
  },
  headerBtn: {
    width: 40,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    fontFamily: SERIF_FONT,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 20,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  authorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: WF_COLORS.white,
    backgroundColor: WF_COLORS.slate200,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    fontFamily: SERIF_FONT,
    flexShrink: 1,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    maxWidth: 160,
  },
  metaDot: {
    fontSize: 11,
    color: WF_COLORS.slate400,
  },
  visibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: WF_COLORS.primaryLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  visibilityPillPrivate: {
    backgroundColor: WF_COLORS.amberLight,
  },
  visibilityText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  followBtn: {
    borderWidth: 1,
    borderColor: WF_COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  followBtnActive: {
    backgroundColor: WF_COLORS.primaryLight,
    borderColor: '#BAE6FD',
  },
  followText: {
    fontSize: 11,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  followTextActive: {
    color: WF_COLORS.primaryHover,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: WF_COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
    marginBottom: 8,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    lineHeight: 25,
    fontFamily: SERIF_FONT,
    marginBottom: 6,
  },
  content: {
    fontSize: 14,
    lineHeight: 22,
    color: WF_COLORS.slate700,
    marginBottom: 12,
  },
  sharedBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.white,
    marginBottom: 12,
  },
  sharedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sharedAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: WF_COLORS.slate200,
  },
  sharedAuthor: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_COLORS.slate700,
  },
  sharedTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    marginBottom: 3,
  },
  sharedContent: {
    fontSize: 12.5,
    lineHeight: 18,
    color: WF_COLORS.slate600,
  },
  mediaWrap: {
    marginBottom: 12,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.white,
    borderRadius: 14,
    marginBottom: 14,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_COLORS.slate600,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    fontFamily: SERIF_FONT,
  },
  commentsLoading: {
    alignItems: 'center',
    paddingVertical: 26,
  },
  commentsLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: WF_COLORS.slate500,
  },
  commentsEmpty: {
    alignItems: 'center',
    paddingVertical: 26,
  },
  commentsEmptyTitle: {
    marginTop: 8,
    fontSize: 13.5,
    fontWeight: '700',
    color: WF_COLORS.slate700,
  },
  commentsEmptySub: {
    marginTop: 3,
    fontSize: 11.5,
    color: WF_COLORS.slate500,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  replyItem: {
    marginLeft: 34,
    backgroundColor: WF_COLORS.white,
    borderRadius: 12,
    padding: 9,
    borderWidth: 1,
    borderColor: WF_COLORS.slate100,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WF_COLORS.slate200,
  },
  commentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  commentAuthor: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  replyTo: {
    fontSize: 11.5,
    fontWeight: '600',
    color: WF_COLORS.primary,
  },
  commentTime: {
    fontSize: 10,
    color: WF_COLORS.slate400,
  },
  commentText: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 19,
    color: WF_COLORS.slate700,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 5,
  },
  commentActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: WF_COLORS.slate500,
  },
  inputBar: {
    backgroundColor: WF_COLORS.white,
    borderTopWidth: 1,
    borderTopColor: WF_COLORS.slate200,
    paddingHorizontal: 12,
    paddingTop: 9,
  },
  replyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WF_COLORS.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 7,
  },
  replyHintText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: WF_COLORS.primaryHover,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 96,
    minHeight: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13.5,
    color: WF_COLORS.slate900,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WF_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
