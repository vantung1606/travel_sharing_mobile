import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { ItineraryAttachCard } from '@/components/community/ItineraryAttachCard';
import { PostMedia } from '@/components/community/PostMedia';
import { RichPostText } from '@/components/community/RichTextToolbar';
import { formatCount, getPostCommentCount, getPostImages } from '@/components/community/communityUtils';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { PostItem } from '@/src/services/api';
import { getUserTier } from '@/src/utils/tierSystem';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

const READ_MORE_THRESHOLD = 200;

interface PostCardProps {
  post: PostItem;
  liked: boolean;
  likeCount: number;
  bookmarked: boolean;
  isFollowingAuthor?: boolean;
  followLoading?: boolean;
  cloningItinerary?: boolean;
  currentUserId?: number | null;
  onPressAuthor?: () => void;
  onToggleFollow?: () => void;
  onToggleLike: () => void;
  onPressLikers?: () => void;
  onToggleBookmark: () => void;
  onOpenComments: () => void;
  onShare: () => void;
  onOpenDetail: () => void;
  onOpenMenu: () => void;
  onPressImage: (index: number) => void;
  onPressVideo: () => void;
  onViewItinerary: () => void;
  onCloneItinerary: () => void;
  onPressPlace?: (placeId: number) => void;
}

/**
 * Card bài viết cho feed mobile.
 *
 * Nguyên tắc: chỉ giữ 3 lớp thông tin (tác giả → nội dung → media → hành động).
 * Bỏ category trùng meta, bỏ bookmark ở header, bỏ nút "Chi tiết" (bấm thân card
 * đã mở chi tiết), bỏ điểm kiểm duyệt AI khỏi giao diện người dùng.
 */
export function PostCard({
  post,
  liked,
  likeCount,
  bookmarked,
  isFollowingAuthor,
  followLoading,
  cloningItinerary,
  currentUserId,
  onPressAuthor,
  onToggleFollow,
  onToggleLike,
  onPressLikers,
  onToggleBookmark,
  onOpenComments,
  onShare,
  onOpenDetail,
  onOpenMenu,
  onPressImage,
  onPressVideo,
  onViewItinerary,
  onCloneItinerary,
  onPressPlace,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(false);

  const images = useMemo(() => getPostImages(post), [post]);
  const commentCount = getPostCommentCount(post);
  const isOwner = post.isOwner ?? (currentUserId != null && post.authorId === currentUserId);
  const isPrivate = (post.visibility || 'PUBLIC').toUpperCase() === 'PRIVATE';
  const isPending = post.status === 'PENDING_REVIEW';
  const content = post.content || '';
  const canTruncate = content.length > READ_MORE_THRESHOLD;
  const shownContent = canTruncate && !expanded ? `${content.slice(0, READ_MORE_THRESHOLD).trimEnd()}...` : content;
  const authorTier = getUserTier({ tier: post.authorTier, role: post.authorRole });
  const locationText = post.locationTag || post.locationName;

  return (
    <View style={styles.card}>
      {/* Tác giả + meta */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPressAuthor}
          accessibilityLabel={`Xem hồ sơ ${post.authorName || 'thành viên'}`}
          style={[styles.avatarWrap, { borderColor: authorTier.avatarRingColor || DS_COLOR.accentSoft }]}>
          <Image source={{ uri: post.authorAvatar || FALLBACK_AVATAR }} style={styles.avatar} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={onPressAuthor} style={{ flexShrink: 1 }}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.authorName || 'Thành viên Wayfare'}
              </Text>
            </TouchableOpacity>

            {isOwner ? (
              <Text style={styles.youTag}>(Bạn)</Text>
            ) : onToggleFollow ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onToggleFollow}
                disabled={followLoading}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                accessibilityLabel={isFollowingAuthor ? 'Bỏ theo dõi tác giả' : 'Theo dõi tác giả'}>
                <Text style={[styles.followText, isFollowingAuthor && styles.followTextActive]}>
                  {followLoading ? '...' : isFollowingAuthor ? 'Đang theo dõi' : 'Theo dõi'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{post.timeAgo || 'Vừa xong'}</Text>
            {locationText ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    const placeId = post.placeId || post.sharedPost?.placeId;
                    if (placeId && onPressPlace) onPressPlace(placeId);
                  }}
                  disabled={!(post.placeId || post.sharedPost?.placeId) || !onPressPlace}
                  style={styles.locationBtn}>
                  <FontAwesome name="map-marker" size={11} color={DS_COLOR.accent} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {locationText}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
            {isPrivate ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <FontAwesome name="lock" size={10} color={DS_COLOR.inkMuted} />
              </>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuBtn}
          onPress={onOpenMenu}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityLabel="Tùy chọn bài viết">
          <FontAwesome name="ellipsis-h" size={16} color={DS_COLOR.inkMuted} />
        </TouchableOpacity>
      </View>

      {isPending ? (
        <View style={styles.pendingBanner}>
          <FontAwesome name="clock-o" size={12} color={DS_COLOR.warning} />
          <Text style={styles.pendingText}>Bài viết đang chờ quản trị viên duyệt</Text>
        </View>
      ) : null}

      {/* Nội dung */}
      <View style={styles.bodyBlock}>
        <TouchableOpacity activeOpacity={0.92} onPress={onOpenDetail} accessibilityRole="button">
          {post.title ? (
            <Text style={styles.title} numberOfLines={3}>
              {post.title}
            </Text>
          ) : null}

          {content ? (
            <RichPostText
              content={shownContent}
              style={
                (!post.title || post.title.trim().length === 0) && content.length <= 120 && images.length === 0 && !post.videoUrl
                  ? styles.shortContent
                  : styles.content
              }
            />
          ) : null}
        </TouchableOpacity>

        {canTruncate ? (
          <TouchableOpacity
            onPress={() => setExpanded((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.readMore}>{expanded ? 'Thu gọn' : 'Xem thêm'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Bài chia sẻ lại */}
      {post.sharedPost ? (
        <View style={styles.sharedBox}>
          <View style={styles.sharedHeader}>
            <Image source={{ uri: post.sharedPost.authorAvatar || FALLBACK_AVATAR }} style={styles.sharedAvatar} />
            <Text style={styles.sharedAuthor} numberOfLines={1}>
              {post.sharedPost.authorName || 'Thành viên Wayfare'}
            </Text>
          </View>
          {post.sharedPost.title ? (
            <Text style={styles.sharedTitle} numberOfLines={2}>
              {post.sharedPost.title}
            </Text>
          ) : null}
          <RichPostText content={post.sharedPost.content} style={styles.sharedContent} numberOfLines={3} />
        </View>
      ) : null}

      {/* Media */}
      {(images.length > 0 || post.videoUrl) && (
        <View style={styles.mediaWrap}>
          <PostMedia
            images={images}
            videoUrl={post.videoUrl}
            onPressImage={onPressImage}
            onPressVideo={onPressVideo}
          />
        </View>
      )}

      {/* Lịch trình đính kèm */}
      {(post.itineraryId || post.sharedPost?.itineraryId) && (
        <View style={styles.itineraryWrap}>
          <ItineraryAttachCard
            post={post}
            canClone={!isOwner}
            cloning={cloningItinerary}
            onView={onViewItinerary}
            onClone={onCloneItinerary}
          />
        </View>
      )}

      {/* Hành động */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onToggleLike}
          activeOpacity={0.7}
          accessibilityLabel={liked ? 'Bỏ thích bài viết' : 'Thích bài viết'}>
          <FontAwesome name={liked ? 'heart' : 'heart-o'} size={18} color={liked ? '#EF4444' : DS_COLOR.inkMuted} />
          <Text style={[styles.actionText, liked && styles.actionTextLiked]}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onOpenComments}
          activeOpacity={0.7}
          accessibilityLabel="Xem bình luận">
          <FontAwesome name="comment-o" size={18} color={DS_COLOR.inkMuted} />
          <Text style={styles.actionText}>{formatCount(commentCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onShare}
          activeOpacity={0.7}
          accessibilityLabel="Chia sẻ bài viết">
          <FontAwesome name="share-alt" size={17} color={DS_COLOR.inkMuted} />
          <Text style={styles.actionText}>Chia sẻ</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onToggleBookmark}
          activeOpacity={0.7}
          accessibilityLabel={bookmarked ? 'Bỏ lưu bài viết' : 'Lưu bài viết'}>
          <FontAwesome
            name={bookmarked ? 'bookmark' : 'bookmark-o'}
            size={18}
            color={bookmarked ? DS_COLOR.accent : DS_COLOR.inkMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS_COLOR.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: DS_RADIUS.lg,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    padding: 1.5,
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: DS_COLOR.surfaceMuted,
  },
  headerInfo: {
    flex: 1,
    paddingTop: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  authorName: {
    fontSize: DS_TYPE.body,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  youTag: {
    fontSize: DS_TYPE.caption,
    fontWeight: '500',
    color: DS_COLOR.inkMuted,
  },
  followText: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  followTextActive: {
    color: DS_COLOR.inkMuted,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  metaText: {
    fontSize: 12,
    color: DS_COLOR.inkMuted,
  },
  metaDot: {
    fontSize: 11,
    color: DS_COLOR.inkMuted,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
    maxWidth: 190,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    color: DS_COLOR.accent,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    marginRight: -6,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: DS_COLOR.warningSoft,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: DS_RADIUS.sm,
  },
  pendingText: {
    flex: 1,
    fontSize: 12,
    color: DS_COLOR.warning,
    fontWeight: '500',
  },
  bodyBlock: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: DS_COLOR.ink,
    lineHeight: 22,
    marginBottom: 6,
  },
  content: {
    fontSize: 14,
    lineHeight: 21,
    color: DS_COLOR.inkSecondary,
  },
  shortContent: {
    fontSize: 15,
    lineHeight: 22,
    color: DS_COLOR.ink,
    fontWeight: '400',
  },
  readMore: {
    marginTop: 6,
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  sharedBox: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 12,
    borderRadius: DS_RADIUS.md,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    backgroundColor: '#F8FAFC',
  },
  sharedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  sharedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sharedAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  sharedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginBottom: 2,
  },
  sharedContent: {
    fontSize: 12,
    lineHeight: 17,
    color: DS_COLOR.inkSecondary,
  },
  mediaWrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  itineraryWrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: DS_COLOR.line,
    backgroundColor: DS_COLOR.surface,
  },
  actionBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: DS_TYPE.meta,
    fontWeight: '500',
    color: DS_COLOR.inkSecondary,
  },
  actionTextLiked: {
    color: '#EF4444',
  },
});
