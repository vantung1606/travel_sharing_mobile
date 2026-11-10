import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
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
import { ImageLightbox } from '@/components/community/ImageLightbox';
import { getPostImages } from '@/components/community/communityUtils';
import { UniversalReportModal } from '@/components/UniversalReportModal';
import { FollowModal } from '@/components/FollowModal';
import { ItineraryDetailModal } from '@/components/ItineraryDetailModal';
import { showToast } from '@/components/Toast';
import { WF_COLORS, WF_PAPER } from '@/constants/Colors';
import {
  ItineraryItem,
  itineraryApi,
  PostItem,
  UserProfileItem,
  userApi,
} from '@/src/services/api';
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
  onOpenChat?: (userId: number, userName?: string) => void;
}

export function UserProfileModal({
  userId,
  visible,
  onClose,
  onPressPost,
  onReportUser,
  onOpenChat,
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfileItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [following, setFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [reportVisible, setReportVisible] = useState<boolean>(false);
  const [lightboxPost, setLightboxPost] = useState<PostItem | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Parity state: Tabs, Itinerary inspection, Follow modal
  const [activeTab, setActiveTab] = useState<'posts' | 'itineraries'>('posts');
  const [selectedItinForDetail, setSelectedItinForDetail] = useState<ItineraryItem | null>(null);
  const [cloningItinId, setCloningItinId] = useState<number | null>(null);
  const [followModalState, setFollowModalState] = useState<{
    visible: boolean;
    tab: 'followers' | 'following';
  }>({ visible: false, tab: 'followers' });

  useEffect(() => {
    if (!visible || !userId) {
      setProfile(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setActiveTab('posts');

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

  const handleCloneItinerary = async (itin: ItineraryItem) => {
    if (!currentSession) {
      showToast({
        kind: 'info',
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập để sao chép lịch trình.',
      });
      return;
    }

    Alert.alert(
      'Sao chép lịch trình',
      `Bạn có muốn sao chép lịch trình "${itin.title}" vào kho cá nhân của bạn không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Sao chép',
          onPress: async () => {
            try {
              setCloningItinId(itin.id);
              await itineraryApi.cloneItinerary(itin.id);
              showToast({
                kind: 'success',
                title: 'Thành công',
                message: `Đã sao chép lịch trình "${itin.title}" vào kho của bạn! 🎉`,
              });
            } catch (err: any) {
              showToast({
                kind: 'error',
                title: 'Không thể sao chép',
                message: err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi sao chép lịch trình.',
              });
            } finally {
              setCloningItinId(null);
            }
          },
        },
      ]
    );
  };

  const isMe = currentSession?.id != null && userId != null && currentSession.id === userId;
  const userTier = getUserTier({ tier: profile?.tier, role: profile?.role });
  const posts = profile?.posts || [];
  const itineraries = profile?.itineraries || [];

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

                  {/* Header Action Buttons (Follow / Chat / Own Account) */}
                  <View style={styles.actionButtonsWrap}>
                    {isMe ? (
                      <View style={styles.myAccountBadge}>
                        <Text style={styles.myAccountBadgeText}>Tài khoản của bạn</Text>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={handleToggleFollow}
                          disabled={followLoading}
                          style={[styles.followBtn, following && styles.followBtnActive]}
                          activeOpacity={0.85}>
                          {followLoading ? (
                            <ActivityIndicator
                              size="small"
                              color={following ? WF_PAPER.inkPrimary : '#FFFDF8'}
                            />
                          ) : (
                            <>
                              <FontAwesome
                                name={following ? 'check' : 'user-plus'}
                                size={12}
                                color={following ? WF_PAPER.inkPrimary : '#FFFDF8'}
                                style={{ marginRight: 5 }}
                              />
                              <Text
                                style={[
                                  styles.followBtnText,
                                  following && styles.followBtnTextActive,
                                ]}>
                                {following ? 'Đang theo dõi' : 'Theo dõi'}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            onClose();
                            if (onOpenChat && profile.id) {
                              onOpenChat(profile.id, profile.fullName);
                            } else if (profile.id) {
                              DeviceEventEmitter.emit('wayfare_open_chat', {
                                userId: profile.id,
                                userName: profile.fullName,
                              });
                            }
                          }}
                          style={styles.chatBtn}
                          activeOpacity={0.85}>
                          <FontAwesome
                            name="commenting-o"
                            size={13}
                            color={WF_PAPER.clay}
                            style={{ marginRight: 5 }}
                          />
                          <Text style={styles.chatBtnText}>Nhắn tin</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>

                {/* Names & Badges */}
                <View style={styles.nameSection}>
                  <View style={styles.nameRow}>
                    <Text style={styles.fullName}>{profile.fullName}</Text>
                    {profile.isVerified && (
                      <FontAwesome
                        name="check-circle"
                        size={15}
                        color={WF_COLORS.emerald}
                        style={{ marginLeft: 6 }}
                      />
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

                {/* Interactive Stats Counters (Clickable for Tabs & Follow Lists) */}
                <View style={styles.statsGrid}>
                  <TouchableOpacity
                    style={[styles.statBox, activeTab === 'itineraries' && styles.statBoxActive]}
                    activeOpacity={0.7}
                    onPress={() => setActiveTab('itineraries')}>
                    <Text
                      style={[
                        styles.statValue,
                        activeTab === 'itineraries' && styles.statValueHighlight,
                      ]}>
                      {profile.itinerariesCount ?? itineraries.length}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        activeTab === 'itineraries' && styles.statLabelHighlight,
                      ]}>
                      Lịch trình
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.statDivider} />

                  <TouchableOpacity
                    style={[styles.statBox, activeTab === 'posts' && styles.statBoxActive]}
                    activeOpacity={0.7}
                    onPress={() => setActiveTab('posts')}>
                    <Text
                      style={[
                        styles.statValue,
                        activeTab === 'posts' && styles.statValueHighlight,
                      ]}>
                      {profile.postsCount ?? posts.length}
                    </Text>
                    <Text
                      style={[
                        styles.statLabel,
                        activeTab === 'posts' && styles.statLabelHighlight,
                      ]}>
                      Bài viết
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.statDivider} />

                  <TouchableOpacity
                    style={styles.statBox}
                    activeOpacity={0.7}
                    onPress={() =>
                      setFollowModalState({ visible: true, tab: 'followers' })
                    }>
                    <Text style={styles.statValue}>{followersCount}</Text>
                    <Text style={styles.statLabel}>Người theo dõi</Text>
                  </TouchableOpacity>

                  <View style={styles.statDivider} />

                  <TouchableOpacity
                    style={styles.statBox}
                    activeOpacity={0.7}
                    onPress={() =>
                      setFollowModalState({ visible: true, tab: 'following' })
                    }>
                    <Text style={styles.statValue}>{profile.followingCount ?? 0}</Text>
                    <Text style={styles.statLabel}>Đang theo dõi</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Segmented Tab Switcher Navigation (Web Parity) */}
              <View style={styles.tabNavRow}>
                <TouchableOpacity
                  style={[styles.tabNavBtn, activeTab === 'posts' && styles.tabNavBtnActive]}
                  onPress={() => setActiveTab('posts')}
                  activeOpacity={0.8}>
                  <FontAwesome
                    name="globe"
                    size={13}
                    color={activeTab === 'posts' ? WF_PAPER.clay : WF_PAPER.inkMuted}
                  />
                  <Text
                    style={[
                      styles.tabNavText,
                      activeTab === 'posts' && styles.tabNavTextActive,
                    ]}>
                    Bài viết chia sẻ
                  </Text>
                  <View
                    style={[
                      styles.tabNavBadge,
                      activeTab === 'posts' && styles.tabNavBadgeActive,
                    ]}>
                    <Text
                      style={[
                        styles.tabNavBadgeText,
                        activeTab === 'posts' && styles.tabNavBadgeTextActive,
                      ]}>
                      {posts.length}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabNavBtn,
                    activeTab === 'itineraries' && styles.tabNavBtnActive,
                  ]}
                  onPress={() => setActiveTab('itineraries')}
                  activeOpacity={0.8}>
                  <FontAwesome
                    name="map"
                    size={12}
                    color={activeTab === 'itineraries' ? WF_PAPER.clay : WF_PAPER.inkMuted}
                  />
                  <Text
                    style={[
                      styles.tabNavText,
                      activeTab === 'itineraries' && styles.tabNavTextActive,
                    ]}>
                    Kho Lịch trình
                  </Text>
                  <View
                    style={[
                      styles.tabNavBadge,
                      activeTab === 'itineraries' && styles.tabNavBadgeActive,
                    ]}>
                    <Text
                      style={[
                        styles.tabNavBadgeText,
                        activeTab === 'itineraries' && styles.tabNavBadgeTextActive,
                      ]}>
                      {itineraries.length}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* TAB 1: Posts Section */}
              {activeTab === 'posts' && (
                <View style={styles.postsSection}>
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
                        {(getPostImages(post).length > 0 || Boolean(post.videoUrl)) && (
                          <View style={styles.postMediaWrap}>
                            <PostMedia
                              images={getPostImages(post)}
                              videoUrl={post.videoUrl}
                              onPressImage={(idx) => {
                                setLightboxPost(post);
                                setLightboxIndex(idx);
                              }}
                            />
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
              )}

              {/* TAB 2: Itineraries Section (Web Parity) */}
              {activeTab === 'itineraries' && (
                <View style={styles.postsSection}>
                  {itineraries.length === 0 ? (
                    <View style={styles.emptyPostsBox}>
                      <FontAwesome name="map-o" size={28} color={WF_PAPER.inkMuted} />
                      <Text style={styles.emptyTitle}>Chưa có lịch trình công khai</Text>
                      <Text style={styles.emptySub}>
                        {profile.fullName} chưa xuất bản lịch trình nào.
                      </Text>
                    </View>
                  ) : (
                    itineraries.map((itin) => {
                      const isOwner = Boolean(
                        isMe ||
                          (currentSession?.id && itin.creatorId && currentSession.id === itin.creatorId) ||
                          (currentSession?.email &&
                            itin.creatorEmail &&
                            currentSession.email.toLowerCase() === itin.creatorEmail.toLowerCase())
                      );

                      const durationDays =
                        itin.startDate && itin.endDate
                          ? Math.max(
                              1,
                              Math.round(
                                (new Date(itin.endDate).getTime() -
                                  new Date(itin.startDate).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              ) + 1
                            )
                          : 3;
                      const durationNights = Math.max(0, durationDays - 1);

                      return (
                        <View key={itin.id} style={styles.itinCard}>
                          {/* Cover image & badges */}
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setSelectedItinForDetail(itin)}
                            style={styles.itinCoverWrapper}>
                            <Image
                              source={{ uri: itin.coverImageUrl || DEFAULT_COVER }}
                              style={styles.itinCoverImage}
                              resizeMode="cover"
                            />
                            <View style={styles.itinCoverGradient} />

                            {/* Top badges */}
                            <View style={styles.itinTopBadges}>
                              <View style={styles.itinTypeBadge}>
                                <FontAwesome
                                  name={itin.isAiGenerated ? 'magic' : 'compass'}
                                  size={10}
                                  color="#FFFDF8"
                                />
                                <Text style={styles.itinTypeBadgeText}>
                                  {itin.isAiGenerated ? 'Gợi ý du lịch' : 'Lộ trình'}
                                </Text>
                              </View>
                              <View style={styles.itinDurationBadge}>
                                <Text style={styles.itinDurationText}>
                                  {`${durationDays}N${durationNights}Đ`}
                                </Text>
                              </View>
                            </View>

                            {/* Destination overlay */}
                            <View style={styles.itinDestinationRow}>
                              <FontAwesome name="map-marker" size={12} color="#FFFDF8" />
                              <Text style={styles.itinDestinationText} numberOfLines={1}>
                                {itin.destination || 'Việt Nam'}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          {/* Content body */}
                          <View style={styles.itinBody}>
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => setSelectedItinForDetail(itin)}>
                              <Text style={styles.itinTitle} numberOfLines={2}>
                                {itin.title}
                              </Text>
                            </TouchableOpacity>

                            <View style={styles.itinBudgetRow}>
                              <Text style={styles.itinBudgetLabel}>Dự toán:</Text>
                              <Text style={styles.itinBudgetValue}>
                                {Number(itin.budgetTotal || 0).toLocaleString('vi-VN')} đ
                              </Text>
                            </View>

                            {/* Action buttons */}
                            <View style={styles.itinActionsRow}>
                              <TouchableOpacity
                                style={styles.itinDetailBtn}
                                activeOpacity={0.85}
                                onPress={() => setSelectedItinForDetail(itin)}>
                                <FontAwesome name="eye" size={12} color={WF_PAPER.clay} />
                                <Text style={styles.itinDetailBtnText}>Xem chi tiết</Text>
                              </TouchableOpacity>

                              {!isOwner && (
                                <TouchableOpacity
                                  style={styles.itinCloneBtn}
                                  activeOpacity={0.85}
                                  disabled={cloningItinId === itin.id}
                                  onPress={() => handleCloneItinerary(itin)}>
                                  {cloningItinId === itin.id ? (
                                    <ActivityIndicator size="small" color="#FFFDF8" />
                                  ) : (
                                    <>
                                      <FontAwesome name="copy" size={11} color="#FFFDF8" />
                                      <Text style={styles.itinCloneBtnText}>Sao chép</Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
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

      <FollowModal
        visible={followModalState.visible}
        targetUserId={userId || undefined}
        userName={profile?.fullName}
        initialTab={followModalState.tab}
        onClose={() => setFollowModalState((prev) => ({ ...prev, visible: false }))}
        onFollowChange={() => {
          if (userId) {
            userApi
              .getUserProfile(userId)
              .then((d) => {
                if (d) {
                  setProfile(d);
                  setFollowersCount(d.followersCount || 0);
                  setFollowing(Boolean(d.isFollowing));
                }
              })
              .catch(() => {});
          }
        }}
      />

      <ItineraryDetailModal
        visible={Boolean(selectedItinForDetail)}
        itinerary={selectedItinForDetail}
        canEdit={false}
        onClose={() => setSelectedItinForDetail(null)}
      />

      <ImageLightbox
        visible={lightboxIndex !== null && Boolean(lightboxPost)}
        images={lightboxPost ? getPostImages(lightboxPost) : []}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => {
          setLightboxIndex(null);
          setLightboxPost(null);
        }}
        authorName={profile?.fullName || 'Người dùng'}
        authorAvatar={profile?.avatarUrl || FALLBACK_AVATAR}
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
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 13,
    color: WF_PAPER.inkMuted,
    fontWeight: '600',
  },
  scrollBody: {
    paddingBottom: 40,
  },
  coverWrapper: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: WF_PAPER.clayLight,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 26, 21, 0.25)',
  },
  profileHeaderCard: {
    marginTop: -32,
    marginHorizontal: 14,
    backgroundColor: WF_PAPER.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    padding: 14,
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: -38,
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
  actionButtonsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myAccountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: WF_PAPER.pillBg,
    borderWidth: 1,
    borderColor: WF_PAPER.pillBorder,
  },
  myAccountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_PAPER.inkSecondary,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7.5,
    borderRadius: 5,
    backgroundColor: WF_COLORS.primary,
  },
  followBtnActive: {
    backgroundColor: WF_PAPER.pillBg,
    borderWidth: 1,
    borderColor: WF_PAPER.pillBorder,
  },
  followBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFDF8',
  },
  followBtnTextActive: {
    color: WF_PAPER.inkPrimary,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: WF_PAPER.pillBg,
    borderWidth: 1,
    borderColor: WF_PAPER.pillBorder,
  },
  chatBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_PAPER.clay,
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: WF_PAPER.pillBorder,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statBoxActive: {
    backgroundColor: WF_PAPER.pillBg,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
  },
  statValueHighlight: {
    color: WF_PAPER.clay,
  },
  statLabel: {
    fontSize: 11,
    color: WF_PAPER.inkMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  statLabelHighlight: {
    color: WF_PAPER.clay,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: WF_PAPER.pillBorder,
  },
  tabNavRow: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 14,
    backgroundColor: WF_PAPER.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    padding: 3,
    gap: 4,
  },
  tabNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 4,
    gap: 6,
  },
  tabNavBtnActive: {
    backgroundColor: WF_PAPER.pillBg,
    borderWidth: 1,
    borderColor: WF_PAPER.pillBorder,
  },
  tabNavText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_PAPER.inkMuted,
  },
  tabNavTextActive: {
    color: WF_PAPER.clay,
  },
  tabNavBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: WF_PAPER.pillBorder,
  },
  tabNavBadgeActive: {
    backgroundColor: 'rgba(217, 83, 30, 0.15)',
  },
  tabNavBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: WF_PAPER.inkMuted,
  },
  tabNavBadgeTextActive: {
    color: WF_PAPER.clay,
  },
  postsSection: {
    marginTop: 14,
    paddingHorizontal: 14,
    gap: 12,
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
  itinCard: {
    backgroundColor: WF_PAPER.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    overflow: 'hidden',
    marginBottom: 2,
  },
  itinCoverWrapper: {
    height: 120,
    width: '100%',
    position: 'relative',
    backgroundColor: WF_PAPER.clayLight,
  },
  itinCoverImage: {
    width: '100%',
    height: '100%',
  },
  itinCoverGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 26, 21, 0.35)',
  },
  itinTopBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itinTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 83, 30, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  itinTypeBadgeText: {
    color: '#FFFDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  itinDurationBadge: {
    backgroundColor: 'rgba(30, 26, 21, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  itinDurationText: {
    color: '#FFFDF8',
    fontSize: 10,
    fontWeight: '800',
  },
  itinDestinationRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  itinDestinationText: {
    color: '#FFFDF8',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  itinBody: {
    padding: 12,
    gap: 8,
  },
  itinTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    lineHeight: 19,
  },
  itinBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itinBudgetLabel: {
    fontSize: 12,
    color: WF_PAPER.inkMuted,
    fontWeight: '600',
  },
  itinBudgetValue: {
    fontSize: 13,
    fontWeight: '800',
    color: WF_PAPER.clay,
  },
  itinActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: WF_PAPER.pillBorder,
  },
  itinDetailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: WF_PAPER.pillBg,
    borderWidth: 1,
    borderColor: WF_PAPER.pillBorder,
  },
  itinDetailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
  itinCloneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: WF_COLORS.primary,
  },
  itinCloneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFDF8',
  },
});
