import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { ItineraryAttachCard } from '@/components/community/ItineraryAttachCard';
import { PlaceAttachCard } from '@/components/community/PlaceAttachCard';
import { PostMedia } from '@/components/community/PostMedia';
import {
  getPostCommentCount,
  getPostImages,
  getTierLabel,
} from '@/components/community/communityUtils';
import { WF_COLORS, WF_PAPER } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { PostItem } from '@/src/services/api';
import { getUserTier } from '@/src/utils/tierSystem';

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
  onPressPlace?: (placeId: number) => void;
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
  
  // Lọc sạch chuỗi chức danh trong ngoặc đơn (ví dụ: "Lê Tùng (Lữ Hành Bạc)" -> "Lê Tùng")
  const rawAuthorName = post.authorName || 'Thành viên Wayfare';
  const cleanAuthorName = rawAuthorName.replace(/\s*\([^)]*\)\s*$/, '').trim() || 'Thành viên Wayfare';
  const authorTierObj = getUserTier({ tier: post.authorTier, role: post.authorRole });

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPressAuthor}
          style={[styles.avatarWrap, { borderColor: authorTierObj.avatarRingColor || WF_COLORS.primaryLight }]}>
          <Image source={{ uri: post.authorAvatar || FALLBACK_AVATAR }} style={styles.avatar} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={onPressAuthor} style={{ flexShrink: 1 }}>
              <Text style={styles.authorName} numberOfLines={1}>
                {cleanAuthorName}
              </Text>
            </TouchableOpacity>

            {isOwner ? (
              <Text style={styles.youTag}>(Bạn)</Text>
            ) : onToggleFollow ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onToggleFollow}
                disabled={followLoading}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                style={styles.followInlineRow}>
                <Text style={styles.followDot}>·</Text>
                <Text style={[styles.followTextInline, isFollowingAuthor && styles.followTextInlineActive]}>
                  {followLoading ? '...' : isFollowingAuthor ? 'Đang theo dõi' : 'Theo dõi'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={[styles.tierPill, { backgroundColor: authorTierObj.badgeBg }]}>
              <Text style={[styles.tierPillText, { color: authorTierObj.avatarRingColor }]}>
                {authorTierObj.icon} {authorTierObj.nameEn.split(' ')[0]}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{post.timeAgo || 'Vừa xong'}</Text>
            {post.locationTag || post.locationName ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <FontAwesome name="map-marker" size={11} color="#0284C7" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {post.locationTag || post.locationName}
                </Text>
              </>
            ) : null}
            {post.category ? (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText} numberOfLines={1}>{post.category}</Text>
              </>
            ) : null}
            <Text style={styles.metaDot}>·</Text>
            <FontAwesome
              name={isPrivate ? 'lock' : 'globe'}
              size={11}
              color={isPrivate ? '#F59E0B' : '#94A3B8'}
            />
          </View>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.bookmarkHeaderBtn}
            onPress={onToggleBookmark}
            activeOpacity={0.7}
            accessibilityLabel="Lưu bài viết">
            <FontAwesome
              name={bookmarked ? 'bookmark' : 'bookmark-o'}
              size={16}
              color={bookmarked ? '#0284C7' : '#94A3B8'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuBtn} onPress={onOpenMenu} accessibilityLabel="Tùy chọn bài viết">
            <FontAwesome name="ellipsis-h" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>

      {isPending ? (
        <View style={styles.pendingBanner}>
          <FontAwesome name="clock-o" size={12} color="#B45309" />
          <Text style={styles.pendingText}>
            Đang chờ duyệt thủ công · Điểm an toàn AI {post.aiSafetyScore ?? '—'}/100
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

      {/* Attached check-in place */}
      {(post.placeId || post.sharedPost?.placeId) && (
        <View style={styles.itineraryWrap}>
          <PlaceAttachCard
            post={post}
            onPress={onPressPlace}
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
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#E0F2FE',
    padding: 1,
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
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
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  followInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followDot: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  followTextInline: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  followTextInlineActive: {
    color: '#64748B',
    fontWeight: '600',
  },
  youTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tierPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  tierPillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2.5,
  },
  metaText: {
    fontSize: 11.5,
    color: '#64748B',
    maxWidth: 160,
  },
  metaDot: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  bookmarkHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginHorizontal: 14,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  pendingText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  bodyBlock: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 6,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    lineHeight: 21,
    color: '#334155',
  },
  mention: {
    color: '#0284C7',
    fontWeight: '700',
  },
  readMore: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  sharedBox: {
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontWeight: '700',
    color: '#0F172A',
  },
  sharedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  sharedContent: {
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
  },
  mediaWrap: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  itineraryWrap: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  actionTextLiked: {
    color: '#EF4444',
    fontWeight: '700',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
});
