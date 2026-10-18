import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { ItineraryAttachCard } from '@/components/community/ItineraryAttachCard';
import { PostMedia } from '@/components/community/PostMedia';
import {
  getPostCommentCount,
  getPostImages,
  getTierLabel,
} from '@/components/community/communityUtils';
import { WF_COLORS } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { PostItem } from '@/src/services/api';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

const READ_MORE_THRESHOLD = 170;

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
  onToggleBookmark: () => void;
  onOpenComments: () => void;
  onShare: () => void;
  onOpenDetail: () => void;
  onOpenMenu: () => void;
  onPressImage: (index: number) => void;
  onPressVideo: () => void;
  onViewItinerary: () => void;
  onCloneItinerary: () => void;
}

/** Tô màu @mention trong nội dung bài viết. */
function renderContent(content: string) {
  const parts = content.split(/(@[\w\u00C0-\u1EF9.]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <Text key={index} style={styles.mention}>
          {part}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
}

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
  onToggleBookmark,
  onOpenComments,
  onShare,
  onOpenDetail,
  onOpenMenu,
  onPressImage,
  onPressVideo,
  onViewItinerary,
  onCloneItinerary,
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

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.85} onPress={onPressAuthor} style={styles.avatarWrap}>
          <Image source={{ uri: post.authorAvatar || FALLBACK_AVATAR }} style={styles.avatar} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={onPressAuthor} style={{ flexShrink: 1 }}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.authorName || 'Thành viên Wayfare'}
              </Text>
            </TouchableOpacity>
            {isOwner ? <Text style={styles.youTag}>Bạn</Text> : null}
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
            <Text style={styles.metaDot}>·</Text>
            <FontAwesome
              name={isPrivate ? 'lock' : 'globe'}
              size={10}
              color={isPrivate ? WF_COLORS.amber : WF_COLORS.slate400}
            />
          </View>
        </View>

        {!isOwner && onToggleFollow ? (
          <TouchableOpacity
            style={[styles.followBtn, isFollowingAuthor && styles.followBtnActive]}
            activeOpacity={0.85}
            onPress={onToggleFollow}
            disabled={followLoading}>
            {followLoading ? (
              <Text style={[styles.followText, isFollowingAuthor && styles.followTextActive]}>...</Text>
            ) : (
              <Text style={[styles.followText, isFollowingAuthor && styles.followTextActive]}>
                {isFollowingAuthor ? 'Đang theo dõi' : 'Theo dõi'}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.menuBtn} onPress={onOpenMenu} accessibilityLabel="Tùy chọn bài viết">
          <FontAwesome name="ellipsis-h" size={16} color={WF_COLORS.slate500} />
        </TouchableOpacity>
      </View>

      {isPending ? (
        <View style={styles.pendingBanner}>
          <FontAwesome name="clock-o" size={12} color="#B45309" />
          <Text style={styles.pendingText}>
            Đang chờ quản trị viên duyệt thủ công · Điểm kiểm duyệt {post.aiSafetyScore ?? '—'}/100
          </Text>
        </View>
      ) : null}

      {/* Body */}
      <TouchableOpacity activeOpacity={0.92} onPress={onOpenDetail}>
        <View style={styles.bodyBlock}>
          {post.category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{post.category}</Text>
            </View>
          ) : null}

          {post.title ? (
            <Text style={styles.title} numberOfLines={3}>
              {post.title}
            </Text>
          ) : null}

          {content ? (
            <Text style={styles.content}>{renderContent(shownContent)}</Text>
          ) : null}

          {canTruncate ? (
            <TouchableOpacity
              onPress={() => setExpanded((v) => !v)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.readMore}>{expanded ? 'Thu gọn' : 'Xem thêm'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Shared post embed */}
      {post.sharedPost ? (
        <View style={styles.sharedBox}>
          <View style={styles.sharedHeader}>
            <Image
              source={{ uri: post.sharedPost.authorAvatar || FALLBACK_AVATAR }}
              style={styles.sharedAvatar}
            />
            <Text style={styles.sharedAuthor} numberOfLines={1}>
              {post.sharedPost.authorName || 'Thành viên Wayfare'}
            </Text>
          </View>
          {post.sharedPost.title ? (
            <Text style={styles.sharedTitle} numberOfLines={2}>
              {post.sharedPost.title}
            </Text>
          ) : null}
          <Text style={styles.sharedContent} numberOfLines={3}>
            {post.sharedPost.content}
          </Text>
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

      {/* Attached itinerary */}
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

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.action} onPress={onToggleLike} activeOpacity={0.7}>
          <FontAwesome
            name={liked ? 'heart' : 'heart-o'}
            size={17}
            color={liked ? '#EF4444' : WF_COLORS.slate500}
          />
          <Text style={[styles.actionText, liked && styles.actionTextLiked]}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={onOpenComments} activeOpacity={0.7}>
          <FontAwesome name="comment-o" size={17} color={WF_COLORS.slate500} />
          <Text style={styles.actionText}>{commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={onShare} activeOpacity={0.7}>
          <FontAwesome name="share-alt" size={16} color={WF_COLORS.slate500} />
          <Text style={styles.actionText}>Chia sẻ</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.action} onPress={onToggleBookmark} activeOpacity={0.7}>
          <FontAwesome
            name={bookmarked ? 'bookmark' : 'bookmark-o'}
            size={17}
            color={bookmarked ? WF_COLORS.primary : WF_COLORS.slate500}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.detailBtn} onPress={onOpenDetail} activeOpacity={0.85}>
          <Text style={styles.detailBtnText}>Chi tiết</Text>
          <FontAwesome name="angle-right" size={13} color={WF_COLORS.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WF_COLORS.white,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: WF_COLORS.primaryLight,
    padding: 2,
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: WF_COLORS.slate200,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    fontFamily: SERIF_FONT,
  },
  youTag: {
    fontSize: 10,
    fontWeight: '700',
    color: WF_COLORS.slate500,
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
    gap: 4,
    marginTop: 3,
  },
  metaText: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    maxWidth: 150,
  },
  metaDot: {
    fontSize: 11,
    color: WF_COLORS.slate400,
  },
  followBtn: {
    borderWidth: 1,
    borderColor: WF_COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginRight: 6,
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
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_COLORS.slate50,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pendingText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  bodyBlock: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: WF_COLORS.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
    marginBottom: 7,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    lineHeight: 22,
    fontFamily: SERIF_FONT,
    marginBottom: 4,
  },
  content: {
    fontSize: 13.5,
    lineHeight: 20,
    color: WF_COLORS.slate700,
  },
  mention: {
    color: WF_COLORS.primary,
    fontWeight: '700',
  },
  readMore: {
    marginTop: 5,
    fontSize: 12.5,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  sharedBox: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
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
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: WF_COLORS.slate100,
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
  actionTextLiked: {
    color: '#EF4444',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: WF_COLORS.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  detailBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
});
