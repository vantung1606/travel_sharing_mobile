import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { Text } from '@/components/Themed';
import { RichPostText } from '@/components/community/RichTextToolbar';
import { PostMedia } from '@/components/community/PostMedia';
import { UniversalReportModal } from '@/components/UniversalReportModal';
import { showToast } from '@/components/Toast';
import { WF_COLORS, WF_PAPER } from '@/constants/Colors';
import { PostItem, UserProfileItem, userApi } from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import { getUserTier } from '@/src/utils/tierSystem';

const { width } = Dimensions.get('window');

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80';

interface UserProfileModalProps {
  userId: number | null;
  visible: boolean;
  onClose: () => void;
  onPressPost?: (post: PostItem) => void;
  onReportUser?: (userId: number, userName: string) => void;
}

export function UserProfileModal({
  userId,
  visible,
  onClose,
  onPressPost,
  onReportUser,
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfileItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [following, setFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [reportVisible, setReportVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!visible || !userId) {
      setProfile(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    (async () => {
      try {
        const session = await authStorage.getSession();
        if (isMounted) setCurrentSession(session);

        const data = await userApi.getUserProfile(userId);
        if (isMounted && data) {
          setProfile(data);
          setFollowing(Boolean(data.isFollowing));
          setFollowersCount(data.followersCount || 0);
        }
      } catch (err: any) {
        console.warn('Could not load user profile', err);
        showToast({
          kind: 'error',
          title: 'Lỗi tải hồ sơ',
          message: err?.response?.data?.message || 'Không thể tải thông tin người dùng.',
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, userId]);

  const handleToggleFollow = async () => {
    if (!userId || followLoading) return;
    try {
      setFollowLoading(true);
      const res = await userApi.toggleFollow(userId);
      const next = res.isFollowing;
      setFollowing(next);
      setFollowersCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));
      showToast({
        kind: 'success',
        title: next ? 'Đã theo dõi' : 'Đã hủy theo dõi',
        message: next
          ? `Bạn đang theo dõi ${profile?.fullName || 'người dùng này'}.`
          : `Bạn đã hủy theo dõi ${profile?.fullName || 'người dùng này'}.`,
      });
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Thao tác thất bại',
        message: err?.response?.data?.message || err?.message || 'Vui lòng đăng nhập để theo dõi.',
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const isMe = currentSession?.id != null && userId != null && currentSession.id === userId;
  const userTier = getUserTier({ tier: profile?.tier, role: profile?.role });
  const posts = profile?.posts || [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn} accessibilityLabel="Quay lại">
              <FontAwesome name="angle-left" size={24} color={WF_PAPER.inkPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {profile?.fullName || 'Hồ sơ du khách'}
            </Text>
            {userId && !isMe ? (
              <TouchableOpacity
                onPress={() => {
                  if (onReportUser) {
                    onReportUser(userId, profile?.fullName || 'Người dùng');
                  } else {
                    setReportVisible(true);
                  }
                }}
                style={styles.reportBtn}
                accessibilityLabel="Báo cáo người dùng">
                <FontAwesome name="flag-o" size={16} color={WF_PAPER.inkMuted} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WF_COLORS.primary} />
              <Text style={styles.loadingText}>Đang tải thông tin du khách...</Text>
            </View>
          ) : profile ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
              {/* Cover Banner */}
              <View style={styles.coverWrapper}>
                <Image
                  source={{ uri: profile.coverImageUrl || DEFAULT_COVER }}
                  style={styles.coverImage}
                  resizeMode="cover"
                />
                <View style={styles.coverGradient} />
              </View>

              {/* Profile Card Header */}
              <View style={styles.profileHeaderCard}>
                <View style={styles.avatarRow}>
                  {/* Avatar */}
                  <View
                    style={[
                      styles.avatarRing,
                      { borderColor: userTier.avatarRingColor || WF_PAPER.clay },
                    ]}>
                    <Image
                      source={{ uri: profile.avatarUrl || FALLBACK_AVATAR }}
                      style={styles.avatarImage}
                    />
                    <View
                      style={[
                        styles.tierCornerBadge,
                        { backgroundColor: userTier.cornerBgColor || WF_PAPER.clay },
                      ]}>
                      <Text style={styles.tierCornerText}>{userTier.cornerIcon || '🌿'}</Text>
                    </View>
                  </View>

                  {/* Follow Button */}
                  {!isMe && (
                    <TouchableOpacity
                      onPress={handleToggleFollow}
                      disabled={followLoading}
                      style={[styles.followBtn, following && styles.followBtnActive]}
                      activeOpacity={0.85}>
                      {followLoading ? (
                        <ActivityIndicator size="small" color={following ? WF_PAPER.inkPrimary : '#FFFDF8'} />
                      ) : (
                        <>
                          <FontAwesome
                            name={following ? 'check' : 'user-plus'}
                            size={12}
                            color={following ? WF_PAPER.inkPrimary : '#FFFDF8'}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                            {following ? 'Đang theo dõi' : 'Theo dõi'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Names & Badges */}
                <View style={styles.nameSection}>
                  <View style={styles.nameRow}>
                    <Text style={styles.fullName}>{profile.fullName}</Text>
                    {profile.isVerified && (
                      <FontAwesome name="check-circle" size={15} color={WF_COLORS.emerald} style={{ marginLeft: 6 }} />
                    )}
                  </View>
                  <Text style={styles.handleText}>{profile.handle || '@wanderer'}</Text>

                  <View style={styles.badgeRow}>
                    <View style={[styles.tierBadge, { backgroundColor: userTier.badgeBg }]}>
                      <Text style={[styles.tierBadgeText, { color: userTier.avatarRingColor }]}>
                        {userTier.icon} {userTier.name}
                      </Text>
                    </View>
                    {profile.role && profile.role !== 'ROLE_USER' && (
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>
                          {profile.role === 'ROLE_ADMIN' ? 'Quản trị viên' : profile.role}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Bio */}
                {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}

                {/* Meta details */}
                <View style={styles.metaChipsWrap}>
                  {(profile.address || profile.location) && (
                    <View style={styles.metaChip}>
                      <FontAwesome name="map-marker" size={11} color={WF_PAPER.clay} />
                      <Text style={styles.metaChipText}>{profile.address || profile.location}</Text>
                    </View>
                  )}
                  {profile.travelStyle && (
                    <View style={styles.metaChip}>
                      <FontAwesome name="compass" size={11} color={WF_PAPER.clay} />
                      <Text style={styles.metaChipText}>{profile.travelStyle}</Text>
                    </View>
                  )}
                  {profile.budgetPreference && (
                    <View style={styles.metaChip}>
                      <FontAwesome name="tag" size={11} color={WF_PAPER.clay} />
                      <Text style={styles.metaChipText}>{profile.budgetPreference}</Text>
                    </View>
                  )}
                </View>

                {/* Stats Counters */}
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{profile.destinationsCount ?? profile.tripsCount ?? 0}</Text>
                    <Text style={styles.statLabel}>Chuyến đi</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{profile.postsCount ?? posts.length}</Text>
                    <Text style={styles.statLabel}>Bài viết</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{followersCount}</Text>
                    <Text style={styles.statLabel}>Người theo dõi</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{profile.followingCount ?? 0}</Text>
                    <Text style={styles.statLabel}>Đang theo dõi</Text>
                  </View>
                </View>
              </View>

              {/* Posts Section */}
              <View style={styles.postsSection}>
                <View style={styles.sectionTitleRow}>
                  <FontAwesome name="bookmark" size={13} color={WF_PAPER.clay} />
                  <Text style={styles.sectionTitle}>
                    Bài viết đã chia sẻ ({posts.length})
                  </Text>
                </View>

                {posts.length === 0 ? (
                  <View style={styles.emptyPostsBox}>
                    <FontAwesome name="pencil-square-o" size={28} color={WF_PAPER.inkMuted} />
                    <Text style={styles.emptyTitle}>Chưa có bài viết nào</Text>
                    <Text style={styles.emptySub}>
                      {profile.fullName} chưa đăng bài viết công khai nào.
                    </Text>
                  </View>
                ) : (
                  posts.map((post) => (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.postCard}
                      onPress={() => {
                        onClose();
                        if (onPressPost) onPressPost(post);
                      }}
                      activeOpacity={0.85}>
                      {/* Post Header */}
                      <View style={styles.postCardHeader}>
                        <View style={{ flex: 1 }}>
                          {post.title ? (
                            <Text style={styles.postCardTitle} numberOfLines={2}>
                              {post.title}
                            </Text>
                          ) : null}
                          <Text style={styles.postCardMeta}>
                            {post.timeAgo || 'Gần đây'} {post.locationTag ? `· ${post.locationTag}` : ''}
                          </Text>
                        </View>
                        {post.category ? (
                          <View style={styles.postCategoryPill}>
                            <Text style={styles.postCategoryText}>{post.category}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Content */}
                      {post.content ? (
                        <RichPostText
                          content={post.content}
                          numberOfLines={3}
                          style={styles.postCardContent}
                        />
                      ) : null}

                      {/* Media Thumbnails */}
                      {post.images && post.images.length > 0 && (
                        <View style={styles.postMediaWrap}>
                          <PostMedia images={post.images} videoUrl={post.videoUrl} />
                        </View>
                      )}

                      {/* Post Footer */}
                      <View style={styles.postCardFooter}>
                        <View style={styles.postStatItem}>
                          <FontAwesome name="heart" size={12} color="#EF4444" />
                          <Text style={styles.postStatText}>{post.likeCount || 0}</Text>
                        </View>
                        <View style={styles.postStatItem}>
                          <FontAwesome name="comment-o" size={12} color={WF_PAPER.inkMuted} />
                          <Text style={styles.postStatText}>{post.commentCount || 0}</Text>
                        </View>
                        <Text style={styles.postViewDetailText}>Xem chi tiết →</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>

      <UniversalReportModal
        visible={reportVisible}
        targetType="USER"
        targetId={userId}
        targetTitle={profile?.fullName || 'Người dùng'}
        onClose={() => setReportVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 26, 21, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    flex: 1,
    marginTop: 40,
    backgroundColor: WF_PAPER.bg,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: WF_PAPER.card,
    borderBottomWidth: 1,
    borderBottomColor: WF_PAPER.cardBorder,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    maxWidth: width - 110,
    textAlign: 'center',
  },
  reportBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: WF_PAPER.inkMuted,
  },
  scrollBody: {
    paddingBottom: 40,
  },
  coverWrapper: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: WF_PAPER.pillBg,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(30, 26, 21, 0.25)',
  },
  profileHeaderCard: {
    backgroundColor: WF_PAPER.card,
    marginHorizontal: 14,
    marginTop: -38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    padding: 16,
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    backgroundColor: WF_PAPER.card,
    padding: 2,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    backgroundColor: WF_PAPER.clayLight,
  },
  tierCornerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: WF_PAPER.card,
  },
  tierCornerText: {
    fontSize: 11,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: WF_COLORS.primary,
  },
  followBtnActive: {
    backgroundColor: WF_PAPER.pillBg,
    borderWidth: 1,
    borderColor: WF_PAPER.pillBorder,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFDF8',
  },
  followBtnTextActive: {
    color: WF_PAPER.inkPrimary,
  },
  nameSection: {
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullName: {
    fontSize: 18,
    fontWeight: '900',
    color: WF_PAPER.inkPrimary,
    letterSpacing: -0.2,
  },
  handleText: {
    fontSize: 12,
    color: WF_PAPER.inkMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  tierBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  bioText: {
    fontSize: 13,
    color: WF_PAPER.inkSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
  metaChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: WF_PAPER.pillBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: WF_PAPER.pillBorder,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_PAPER.inkSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: WF_PAPER.pillBorder,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: WF_PAPER.inkMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: WF_PAPER.pillBorder,
  },
  postsSection: {
    marginTop: 20,
    paddingHorizontal: 14,
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
  },
  emptyPostsBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_PAPER.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    color: WF_PAPER.inkMuted,
    textAlign: 'center',
  },
  postCard: {
    backgroundColor: WF_PAPER.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    padding: 14,
    gap: 8,
  },
  postCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  postCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    lineHeight: 19,
  },
  postCardMeta: {
    fontSize: 11,
    color: WF_PAPER.inkMuted,
    marginTop: 2,
  },
  postCategoryPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: WF_PAPER.pillBg,
  },
  postCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
  postCardContent: {
    fontSize: 13,
    color: WF_PAPER.inkSecondary,
    lineHeight: 18,
  },
  postMediaWrap: {
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 4,
  },
  postCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: WF_PAPER.pillBorder,
    gap: 14,
  },
  postStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_PAPER.inkSecondary,
  },
  postViewDetailText: {
    marginLeft: 'auto',
    fontSize: 11,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
});
