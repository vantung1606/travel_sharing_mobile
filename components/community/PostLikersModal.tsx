import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Text } from '@/components/Themed';
import { SERIF_FONT } from '@/constants/Typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { postApi, PostLikerItem, userApi } from '@/src/services/api';

const WF_PAPER = {
  bg: '#FBF9F4',
  card: '#FFFFFF',
  inkPrimary: '#1E1A15',
  inkSecondary: '#5A5146',
  inkMuted: '#8C8275',
  border: '#E8E1D5',
  borderSubtle: '#F0EAE0',
  clay: '#D97746',
  clayMuted: '#EACAB8',
  pillBg: '#F3EDE2',
  pillBorder: '#E4DACB',
  surfaceSoft: '#F6F2E9',
};

export interface PostLikersModalProps {
  visible: boolean;
  postId: number | null;
  postTitle?: string;
  currentUserId?: number | null;
  onClose: () => void;
  onSelectUser?: (userId: number) => void;
  onFollowChange?: (userId: number, isFollowing: boolean) => void;
}

export function PostLikersModal({
  visible,
  postId,
  postTitle,
  currentUserId,
  onClose,
  onSelectUser,
  onFollowChange,
}: PostLikersModalProps) {
  const [likers, setLikers] = useState<PostLikerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadLikers = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const res = await postApi.getPostLikers(postId);
      setLikers(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.warn('Lỗi khi tải danh sách người thích:', err);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (visible && postId) {
      setSearchQuery('');
      loadLikers();
    }
  }, [visible, postId, loadLikers]);

  const handleToggleFollow = async (targetUser: PostLikerItem) => {
    try {
      setTogglingId(targetUser.id);
      const res = await userApi.toggleFollow(targetUser.id);
      const isNowFollowing = res?.isFollowing;

      setLikers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, isFollowing: isNowFollowing } : u))
      );

      if (typeof onFollowChange === 'function') {
        onFollowChange(targetUser.id, isNowFollowing);
      }
    } catch (err: any) {
      Alert.alert('Thông báo', 'Không thể cập nhật theo dõi: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setTogglingId(null);
    }
  };

  const filteredLikers = useMemo(() => {
    if (!searchQuery.trim()) return likers;
    const q = searchQuery.toLowerCase();
    return likers.filter(
      u =>
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.handle && u.handle.toLowerCase().includes(q)) ||
        (u.bio && u.bio.toLowerCase().includes(q))
    );
  }, [likers, searchQuery]);

  const renderLikerItem = ({ item }: { item: PostLikerItem }) => {
    const isCurrentUser =
      item.isMe || (currentUserId != null && Number(item.id) === Number(currentUserId));
    const isToggling = togglingId === item.id;
    const avatarUrl =
      item.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName || 'User')}&background=random`;

    return (
      <View style={styles.likerItem}>
        {/* User Info */}
        <TouchableOpacity
          style={styles.userInfoTouchable}
          onPress={() => {
            onClose();
            if (typeof onSelectUser === 'function') {
              onSelectUser(item.id);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.avatarWrap}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <View style={styles.heartMiniBadge}>
              <FontAwesome name="heart" size={8} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.userDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.fullName}
              </Text>
              {item.role && item.role.includes('Quản trị') && (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>

            <Text style={styles.userHandle} numberOfLines={1}>
              {item.handle || '@user'}
            </Text>

            {item.bio ? (
              <Text style={styles.userBio} numberOfLines={1}>
                {item.bio}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Action Button */}
        <View style={styles.actionWrap}>
          {isCurrentUser ? (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>Bạn</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.followBtn,
                item.isFollowing ? styles.followingBtn : styles.notFollowingBtn,
              ]}
              onPress={() => handleToggleFollow(item)}
              disabled={isToggling}
              activeOpacity={0.8}
            >
              {isToggling ? (
                <ActivityIndicator
                  size="small"
                  color={item.isFollowing ? WF_PAPER.inkSecondary : '#FFFFFF'}
                />
              ) : (
                <Text
                  style={[
                    styles.followBtnText,
                    item.isFollowing ? styles.followingBtnText : styles.notFollowingBtnText,
                  ]}
                >
                  {item.isFollowing ? 'Đang theo dõi' : '+ Theo dõi'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <SafeAreaView edges={['bottom']} style={styles.sheetContainer}>
          {/* Sheet Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <FontAwesome name="heart" size={14} color="#EF4444" />
              </View>
              <View>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>Người đã thích</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{likers.length}</Text>
                  </View>
                </View>
                {postTitle ? (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {postTitle}
                  </Text>
                ) : null}
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <FontAwesome name="times" size={16} color={WF_PAPER.inkMuted} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          {likers.length > 5 && (
            <View style={styles.searchContainer}>
              <FontAwesome name="search" size={13} color={WF_PAPER.inkMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm người đã thích..."
                placeholderTextColor={WF_PAPER.inkMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <FontAwesome name="times-circle" size={14} color={WF_PAPER.inkMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Body */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#EF4444" />
              <Text style={styles.loadingText}>Đang tải người đã thích...</Text>
            </View>
          ) : filteredLikers.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <FontAwesome name="heart-o" size={28} color={WF_PAPER.inkMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'Không tìm thấy người phù hợp' : 'Chưa có ai thả tim'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Hãy thử tìm bằng từ khóa khác'
                  : 'Hãy là người đầu tiên thích bài viết này!'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredLikers}
              keyExtractor={item => String(item.id)}
              renderItem={renderLikerItem}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 340,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#E5E0D8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: WF_PAPER.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    fontFamily: SERIF_FONT,
  },
  countBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  subtitle: {
    fontSize: 11.5,
    color: WF_PAPER.inkMuted,
    marginTop: 2,
    maxWidth: 220,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WF_PAPER.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_PAPER.surfaceSoft,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WF_PAPER.borderSubtle,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: WF_PAPER.inkPrimary,
    paddingVertical: 0,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: WF_PAPER.inkMuted,
  },
  emptyBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: WF_PAPER.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: WF_PAPER.inkMuted,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  likerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  userInfoTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 11,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WF_PAPER.surfaceSoft,
    borderWidth: 1,
    borderColor: WF_PAPER.borderSubtle,
  },
  heartMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
    maxWidth: 160,
  },
  adminBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
  },
  userHandle: {
    fontSize: 11.5,
    color: WF_PAPER.inkMuted,
    marginTop: 1,
  },
  userBio: {
    fontSize: 11,
    color: WF_PAPER.inkSecondary,
    marginTop: 2,
  },
  actionWrap: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  youBadge: {
    backgroundColor: WF_PAPER.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  youBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: WF_PAPER.inkMuted,
  },
  followBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 78,
  },
  notFollowingBtn: {
    backgroundColor: '#EF4444',
  },
  followingBtn: {
    backgroundColor: WF_PAPER.surfaceSoft,
    borderWidth: 1,
    borderColor: WF_PAPER.border,
  },
  followBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  notFollowingBtnText: {
    color: '#FFFFFF',
  },
  followingBtnText: {
    color: WF_PAPER.inkSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: WF_PAPER.borderSubtle,
    marginLeft: 55,
  },
});
