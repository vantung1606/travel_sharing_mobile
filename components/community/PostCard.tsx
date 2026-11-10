import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { FeedVideoPlayer } from '@/components/community/FeedVideoPlayer';
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
  isVideoPlaying?: boolean;
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
 * Card bài viết mạng xã hội du lịch hiện đại (Modern Travel Feed Card):
 * - Nền trắng sáng, viền ấm, shadow mềm đồng nhất với giao diện toàn app.
 * - Ảnh hiển thị tự nhiên, sắc nét và trọn vẹn, KHÔNG bị phủ gradient đen tối.
 * - Tiêu đề và nội dung thoáng đãng, dễ đọc.
 * - Thanh tương tác trực quan với Tim đỏ, Bình luận, Chia sẻ, Lưu và Xem bài.
 */
export function PostCard({
  post,
  isVideoPlaying,
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
  const hasMedia = !post.sharedPost && (images.length > 0 || Boolean(post.videoUrl));
  const commentCount = getPostCommentCount(post);
  const isOwner = post.isOwner ?? (currentUserId != null && post.authorId === currentUserId);
  const visibilityUpper = (post.visibility || 'PUBLIC').toUpperCase();
  const isPrivate = visibilityUpper === 'PRIVATE';
  const isFriends = visibilityUpper === 'FRIENDS';
  const isPending = post.status === 'PENDING_REVIEW';
  const content = post.content || '';
  const canTruncate = content.length > READ_MORE_THRESHOLD;
  const shownContent = canTruncate && !expanded ? `${content.slice(0, READ_MORE_THRESHOLD).trimEnd()}...` : content;
  const authorTier = getUserTier({ tier: post.authorTier, role: post.authorRole });
  const locationText = post.locationTag || post.locationName;

  return (
    <View style={styles.card}>
      {/* ── 1. Tác giả & Công cụ Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPressAuthor}
          accessibilityLabel={`Xem hồ sơ ${post.authorName || 'thành viên'}`}
          style={[styles.avatarWrap, { borderColor: authorTier.avatarRingColor || '#E05836' }]}>
          <Image source={{ uri: post.authorAvatar || FALLBACK_AVATAR }} style={styles.avatar} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={onPressAuthor} style={{ flexShrink: 1 }}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.authorName || 'Thành viên Wayfare'}
              </Text>
            </TouchableOpacity>

            {post.sharedPost ? (
              <Text style={styles.sharedActionText}>đã chia sẻ bài viết</Text>
            ) : null}

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
                  {followLoading ? '...' : isFollowingAuthor ? '· Đang theo dõi' : '· Theo dõi'}
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
                  <FontAwesome name="map-marker" size={11} color="#D9532F" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {locationText}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
            {isPrivate ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <FontAwesome name="lock" size={10} color="#9CA3AF" />
              </>
            ) : isFriends ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <FontAwesome name="users" size={10} color="#9CA3AF" />
              </>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuBtn}
          onPress={onOpenMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Tùy chọn bài viết">
          <FontAwesome name="ellipsis-h" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Banner chờ duyệt */}
      {isPending ? (
        <View style={styles.pendingBanner}>
          <FontAwesome name="clock-o" size={12} color="#D97706" />
          <Text style={styles.pendingText}>Bài viết đang chờ quản trị viên duyệt</Text>
        </View>
      ) : null}

      {/* ── 2. Nội dung văn bản (Tiêu đề & Chữ) ── */}
      <View style={styles.bodyBlock}>
        <TouchableOpacity activeOpacity={0.92} onPress={onOpenDetail} accessibilityRole="button">
          {post.title ? (
            <Text style={styles.postTitle} numberOfLines={2}>
              {post.title}
            </Text>
          ) : null}

          {content ? (
            <RichPostText
              content={shownContent}
              style={
                (!post.title || post.title.trim().length === 0) && content.length <= 120
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

      {/* ── 3. Khu vực Hình ảnh & Video Sắc nét (Ưu tiên Video đầu, sau đó đến Lưới Ảnh đa tầng) ── */}
      {hasMedia ? (
        <View style={styles.mediaContainer}>
          <PostMedia
            images={images}
            videoUrl={post.videoUrl}
            locationText={locationText}
            isVideoPlaying={Boolean(isVideoPlaying)}
            renderVideo={
              post.videoUrl
                ? () => (
                    <View style={styles.videoWrap}>
                      <FeedVideoPlayer
                        videoUrl={post.videoUrl!}
                        isPlaying={Boolean(isVideoPlaying)}
                      />
                      {!isVideoPlaying && (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={styles.centerPlayBtn}
                          onPress={onPressVideo}
                          accessibilityLabel="Phát video">
                          <View style={styles.playIconCircle}>
                            <FontAwesome name="play" size={20} color="#FFFFFF" style={{ marginLeft: 3 }} />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                : undefined
            }
            onPressImage={onPressImage}
            onPressVideo={onPressVideo}
          />
        </View>
      ) : null}

      {/* ── 4. Bài viết được chia sẻ lại (nếu có) ── */}
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
          {(() => {
            const sharedImg =
              post.sharedPost.imageUrl ||
              post.sharedPost.coverImage ||
              (post.sharedPost.images && post.sharedPost.images[0]);
            return sharedImg ? (
              <Image source={{ uri: sharedImg }} style={styles.sharedMediaThumb} resizeMode="cover" />
            ) : null;
          })()}
        </View>
      ) : null}

      {/* ── 5. Lịch trình đính kèm (nếu có) ── */}
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

      {/* ── 6. Thanh tương tác hiện đại ── */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onToggleLike}
          activeOpacity={0.7}
          accessibilityLabel={liked ? 'Bỏ thích bài viết' : 'Thích bài viết'}>
          <FontAwesome name={liked ? 'heart' : 'heart-o'} size={18} color={liked ? '#EF4444' : '#6B7280'} />
          <Text style={[styles.actionText, liked && styles.actionTextLiked]}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onOpenComments}
          activeOpacity={0.7}
          accessibilityLabel="Xem bình luận">
          <FontAwesome name="comment-o" size={18} color="#6B7280" />
          <Text style={styles.actionText}>{formatCount(commentCount)}</Text>
          {post.commentLocked ? (
            <FontAwesome name="lock" size={12} color="#B45309" style={{ marginLeft: -2 }} />
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onShare}
          activeOpacity={0.7}
          accessibilityLabel="Chia sẻ bài viết">
          <FontAwesome name="share-alt" size={17} color="#6B7280" />
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
            color={bookmarked ? '#F59E0B' : '#6B7280'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.detailLinkBtn}
          onPress={onOpenDetail}
          activeOpacity={0.7}
          accessibilityLabel="Xem chi tiết bài viết">
          <Text style={styles.detailLinkText}>Xem bài</Text>
          <FontAwesome name="angle-right" size={13} color="#D9532F" style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EDE7DE',
    elevation: 2,
    shadowColor: '#201608',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    padding: 1,
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  authorName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1C1917',
  },
  youTag: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D9532F',
  },
  followText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D9532F',
  },
  followTextActive: {
    color: '#9CA3AF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11.5,
    color: '#9CA3AF',
  },
  metaDot: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
    maxWidth: 180,
  },
  locationText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#D9532F',
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FEF3C7',
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pendingText: {
    flex: 1,
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
  },
  bodyBlock: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  postTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#1C1917',
    lineHeight: 23,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  content: {
    fontSize: 14,
    lineHeight: 21,
    color: '#374151',
  },
  shortContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1C1917',
  },
  readMore: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#D9532F',
  },
  mediaContainer: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3EFE9',
    borderWidth: 1,
    borderColor: '#EFEAE1',
  },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000000',
  },
  centerPlayBtn: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageTouchable: {
    width: '100%',
    aspectRatio: 4 / 3,
    position: 'relative',
    backgroundColor: '#F3EFE9',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  photoCountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  photoLocationTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: '75%',
  },
  photoLocationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  sharedActionText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  sharedBox: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F9F6F0',
    borderWidth: 1,
    borderColor: '#EFEAE1',
  },
  sharedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },
  sharedAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  sharedAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1917',
  },
  sharedTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1C1917',
    marginBottom: 4,
  },
  sharedContent: {
    fontSize: 12.5,
    color: '#4B5563',
    lineHeight: 18,
  },
  sharedMediaThumb: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: '#E2E8F0',
  },
  itineraryWrap: {
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3EFE9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
  },
  actionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#6B7280',
  },
  actionTextLiked: {
    color: '#EF4444',
    fontWeight: '700',
  },
  detailLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
  },
  detailLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D9532F',
  },
});
