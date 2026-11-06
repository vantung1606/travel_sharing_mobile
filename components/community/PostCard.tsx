import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/Themed';
import { ItineraryAttachCard } from '@/components/community/ItineraryAttachCard';
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
 * Card bài viết phong cách Immersive Travel Poster (Ý tưởng 1):
 * - Dùng ĐÚNG 1 LỚP LinearGradient trong suốt mượt mà phủ toàn card (không dùng nhiều ô mờ/dải đen chắp vá).
 * - Thông tin tác giả & công cụ nổi tự nhiên trên gradient, không bọc ô đen vụn vặt.
 * - Đảm bảo thanh tương tác ở đáy thoáng đãng, sắc sảo và thanh lịch.
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
  const hasMedia = images.length > 0 || Boolean(post.videoUrl);
  const commentCount = getPostCommentCount(post);
  const isOwner = post.isOwner ?? (currentUserId != null && post.authorId === currentUserId);
  const isPrivate = (post.visibility || 'PUBLIC').toUpperCase() === 'PRIVATE';
  const isPending = post.status === 'PENDING_REVIEW';
  const content = post.content || '';
  const canTruncate = content.length > READ_MORE_THRESHOLD;
  const shownContent = canTruncate && !expanded ? `${content.slice(0, READ_MORE_THRESHOLD).trimEnd()}...` : content;
  const authorTier = getUserTier({ tier: post.authorTier, role: post.authorRole });
  const locationText = post.locationTag || post.locationName;

  // ══════════════════════════════════════════════════════════
  // 1. DẠNG IMMERSIVE CINEMATIC POSTER (KHI CÓ ẢNH HOẶC VIDEO)
  // ══════════════════════════════════════════════════════════
  if (hasMedia) {
    const heroImageUri = images[0] || (post.videoUrl ? FALLBACK_AVATAR : '');

    return (
      <View style={styles.posterCard}>
        {/* Ảnh nền trọn vẹn của card */}
        {heroImageUri ? (
          <Image source={{ uri: heroImageUri }} style={styles.posterBgImage} resizeMode="cover" />
        ) : (
          <View style={[styles.posterBgImage, { backgroundColor: '#1E1A15' }]} />
        )}

        {/* DUY NHẤT 1 LỚP GRADIENT MỜ TRONG SUỐT LIỀN MẠCH TOÀN CARD */}
        <LinearGradient
          colors={[
            'rgba(15, 23, 42, 0.70)',
            'rgba(15, 23, 42, 0.18)',
            'transparent',
            'rgba(15, 23, 42, 0.45)',
            'rgba(15, 23, 42, 0.85)',
            'rgba(15, 23, 42, 0.98)',
          ]}
          locations={[0, 0.18, 0.38, 0.65, 0.84, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Thanh Header nổi: Tác giả tự nhiên & Nút Bookmark, 3 Chấm */}
        <View style={styles.posterTopRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPressAuthor}
            style={styles.posterAuthorRow}
            accessibilityLabel={`Xem hồ sơ ${post.authorName || 'thành viên'}`}>
            <Image
              source={{ uri: post.authorAvatar || FALLBACK_AVATAR }}
              style={[styles.posterAvatar, { borderColor: authorTier.avatarRingColor || '#FFFFFF' }]}
            />
            <View style={styles.posterAuthorTextWrap}>
              <View style={styles.posterNameFollowRow}>
                <Text style={styles.posterAuthorName} numberOfLines={1}>
                  {post.authorName || 'Thành viên Wayfare'}
                </Text>
                {isOwner ? (
                  <Text style={styles.posterYouTag}>(Bạn)</Text>
                ) : onToggleFollow ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onToggleFollow}
                    disabled={followLoading}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[styles.posterFollowText, isFollowingAuthor && styles.posterFollowTextActive]}>
                      {followLoading ? '...' : isFollowingAuthor ? '· Đang theo dõi' : '· Theo dõi'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.posterMetaRow}>
                <Text style={styles.posterMetaText}>{post.timeAgo || 'Vừa xong'}</Text>
                {locationText ? (
                  <>
                    <Text style={styles.posterMetaDot}>·</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        const placeId = post.placeId || post.sharedPost?.placeId;
                        if (placeId && onPressPlace) onPressPlace(placeId);
                      }}
                      disabled={!(post.placeId || post.sharedPost?.placeId) || !onPressPlace}>
                      <Text style={styles.posterLocationText} numberOfLines={1}>
                        {locationText}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                {isPrivate ? (
                  <>
                    <Text style={styles.posterMetaDot}>·</Text>
                    <FontAwesome name="lock" size={10} color="#CBD5E1" />
                  </>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.posterTopRightActions}>
            {images.length > 1 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onPressImage(0)}
                style={styles.photoCountBadge}>
                <FontAwesome name="image" size={11} color="#FFFFFF" />
                <Text style={styles.photoCountText}>{images.length}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.glassCircleBtn}
              onPress={onToggleBookmark}
              activeOpacity={0.8}
              accessibilityLabel={bookmarked ? 'Bỏ lưu' : 'Lưu bài viết'}>
              <FontAwesome
                name={bookmarked ? 'bookmark' : 'bookmark-o'}
                size={15}
                color={bookmarked ? '#F59E0B' : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.glassCircleBtn}
              onPress={onOpenMenu}
              activeOpacity={0.8}
              accessibilityLabel="Tùy chọn bài viết">
              <FontAwesome name="ellipsis-h" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Nút phát video */}
        {post.videoUrl && (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.centerPlayBtn}
            onPress={onPressVideo}
            accessibilityLabel="Phát video">
            <View style={styles.playIconCircle}>
              <FontAwesome name="play" size={22} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </View>
          </TouchableOpacity>
        )}

        {/* Banner chờ duyệt nếu có */}
        {isPending && (
          <View style={styles.posterPendingBanner}>
            <FontAwesome name="clock-o" size={12} color="#FEF3C7" />
            <Text style={styles.posterPendingText}>Đang chờ quản trị viên duyệt</Text>
          </View>
        )}

        {/* Cụm thông tin & tương tác đáy Poster */}
        <View style={styles.posterBottomContent}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={onOpenDetail}
            accessibilityRole="button"
            accessibilityLabel={`Xem chi tiết bài viết ${post.title || ''}`}>
            {locationText && (
              <View style={styles.posterLocationRow}>
                <FontAwesome name="map-marker" size={12} color="#FBBF24" />
                <Text style={styles.posterLocationTagText} numberOfLines={1}>
                  {locationText}
                </Text>
              </View>
            )}

            {post.title ? (
              <Text style={styles.posterTitle} numberOfLines={2}>
                {post.title}
              </Text>
            ) : null}

            {content ? (
              <Text style={styles.posterSnippet} numberOfLines={2}>
                {content}
              </Text>
            ) : null}
          </TouchableOpacity>

          {/* Lịch trình đính kèm */}
          {(post.itineraryId || post.sharedPost?.itineraryId) && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onViewItinerary}
              style={styles.posterItinPill}
              accessibilityRole="button"
              accessibilityLabel="Xem lịch trình đính kèm">
              <FontAwesome name="calendar-check-o" size={12} color="#FBBF24" />
              <Text style={styles.posterItinText} numberOfLines={1}>
                Chuyến đi đính kèm · Xem lịch trình
              </Text>
              <FontAwesome name="angle-right" size={12} color="#FBBF24" />
            </TouchableOpacity>
          )}

          {/* Thanh tương tác nhanh chìm trên ảnh */}
          <View style={styles.posterActionBar}>
            <TouchableOpacity
              style={styles.posterActionBtn}
              onPress={onToggleLike}
              activeOpacity={0.7}
              accessibilityLabel={liked ? 'Bỏ thích' : 'Thích bài viết'}>
              <FontAwesome
                name={liked ? 'heart' : 'heart-o'}
                size={18}
                color={liked ? '#EF4444' : '#FFFFFF'}
              />
              <Text style={[styles.posterActionText, liked && styles.posterActionTextLiked]}>
                {formatCount(likeCount)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.posterActionBtn}
              onPress={onOpenComments}
              activeOpacity={0.7}
              accessibilityLabel="Bình luận">
              <FontAwesome name="comment-o" size={17} color="#FFFFFF" />
              <Text style={styles.posterActionText}>{formatCount(commentCount)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.posterActionBtn}
              onPress={onShare}
              activeOpacity={0.7}
              accessibilityLabel="Chia sẻ">
              <FontAwesome name="share-alt" size={16} color="#FFFFFF" />
              <Text style={styles.posterActionText}>Chia sẻ</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={styles.posterExploreBtn}
              onPress={onOpenDetail}
              activeOpacity={0.85}
              accessibilityLabel="Khám phá chi tiết">
              <Text style={styles.posterExploreText}>Xem bài</Text>
              <FontAwesome name="arrow-right" size={10} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════
  // 2. DẠNG EDITORIAL NOTE CARD (KHI BÀI VIẾT CHỈ CÓ CHỮ)
  // ══════════════════════════════════════════════════════════
  return (
    <View style={styles.editorialCard}>
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

      {/* Nội dung dạng ký sự */}
      <View style={styles.bodyBlock}>
        <TouchableOpacity activeOpacity={0.92} onPress={onOpenDetail} accessibilityRole="button">
          {post.title ? (
            <Text style={styles.editorialTitle} numberOfLines={3}>
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

      {/* Thanh hành động */}
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
  // ── 1. STYLES CHO IMMERSIVE POSTER CARD (Ý TƯỞNG 1 TINH GỌN) ──
  posterCard: {
    height: 470,
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1E1A15',
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  posterBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  posterTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  posterAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    maxWidth: '75%',
  },
  posterAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 8,
  },
  posterAuthorTextWrap: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  posterNameFollowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterAuthorName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  posterYouTag: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  posterFollowText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  posterFollowTextActive: {
    color: '#6EE7B7',
  },
  posterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  posterMetaText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  posterMetaDot: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  posterLocationText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 120,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  posterTopRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  glassCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPlayBtn: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -26,
    marginTop: -26,
    zIndex: 8,
  },
  playIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPendingBanner: {
    position: 'absolute',
    top: 56,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(180, 83, 9, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    zIndex: 9,
  },
  posterPendingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  posterBottomContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    zIndex: 10,
  },
  posterLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  posterLocationTagText: {
    color: '#FDE68A',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  posterTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  posterSnippet: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 10,
  },
  posterItinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  posterItinText: {
    color: '#FEF3C7',
    fontSize: 12,
    fontWeight: '700',
  },
  posterActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  posterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  posterActionText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  posterActionTextLiked: {
    color: '#FCA5A5',
    fontWeight: '700',
  },
  posterExploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  posterExploreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── 2. STYLES CHO EDITORIAL NOTE CARD (BÀI TEXT ONLY) ──────
  editorialCard: {
    backgroundColor: DS_COLOR.surface,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    gap: 6,
  },
  authorName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  youTag: {
    fontSize: 12,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  followText: {
    fontSize: 12,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  followTextActive: {
    color: DS_COLOR.inkMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  metaText: {
    fontSize: 11.5,
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
    fontSize: 11.5,
    fontWeight: '600',
    color: DS_COLOR.accent,
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
  editorialTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: DS_COLOR.ink,
    lineHeight: 23,
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
  },
  readMore: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  sharedBox: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 12,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.surfaceMuted,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
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
    color: DS_COLOR.ink,
  },
  sharedTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginBottom: 4,
  },
  sharedContent: {
    fontSize: 12.5,
    color: DS_COLOR.inkSecondary,
    lineHeight: 18,
  },
  itineraryWrap: {
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.05)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
  },
  actionText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: DS_COLOR.inkSecondary,
  },
  actionTextLiked: {
    color: '#EF4444',
    fontWeight: '600',
  },
});
