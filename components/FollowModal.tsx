import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { WF_COLORS } from '@/constants/Colors';
import { userApi } from '@/src/services/api';

const SERIF_FONT = Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' });

export interface FollowModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'followers' | 'following';
  onFollowChange?: () => void;
}

export function FollowModal({
  visible,
  onClose,
  initialTab = 'following',
  onFollowChange,
}: FollowModalProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      loadData();
    }
  }, [visible, initialTab]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [followersRes, followingRes] = await Promise.all([
        userApi.getFollowers().catch(() => []),
        userApi.getFollowing().catch(() => []),
      ]);
      setFollowers(followersRes || []);
      setFollowing(followingRes || []);
    } catch (e) {
      console.warn('Error loading follow list:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleFollow = async (targetUser: any) => {
    if (!targetUser?.id || togglingId === targetUser.id) return;
    try {
      setTogglingId(targetUser.id);
      const res = await userApi.toggleFollow(targetUser.id);
      const newStatus = res?.isFollowing ?? !targetUser.isFollowing;

      // Update following list
      setFollowing(prev => {
        if (!newStatus) {
          return prev.filter(u => u.id !== targetUser.id);
        } else {
          const exists = prev.some(u => u.id === targetUser.id);
          if (!exists) return [...prev, { ...targetUser, isFollowing: true }];
          return prev.map(u => u.id === targetUser.id ? { ...u, isFollowing: true } : u);
        }
      });

      // Update followers list isFollowing flag
      setFollowers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, isFollowing: newStatus } : u))
      );

      onFollowChange?.();
    } catch (e) {
      console.warn('Toggle follow error:', e);
    } finally {
      setTogglingId(null);
    }
  };

  const currentList = activeTab === 'followers' ? followers : following;

  const renderUserItem = ({ item }: { item: any }) => {
    const isCurrentlyFollowing = activeTab === 'following' ? true : Boolean(item.isFollowing);
    const avatar = item.avatarUrl || item.avatar;

    return (
      <View style={styles.userRow}>
        <View style={styles.userInfoLeft}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.userAvatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <FontAwesome name="user" size={18} color="#64748B" />
            </View>
          )}
          <View style={styles.userMeta}>
            <Text style={styles.userName} numberOfLines={1}>
              {item.fullName || item.name || 'Người dùng Wayfare'}
            </Text>
            <Text style={styles.userHandle} numberOfLines={1}>
              @{item.handle || item.username || `user_${item.id}`}
            </Text>
            {item.bio ? (
              <Text style={styles.userBio} numberOfLines={1}>
                {item.bio}
              </Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={togglingId === item.id}
          style={[
            styles.followActionBtn,
            isCurrentlyFollowing ? styles.followingBtn : styles.notFollowingBtn,
          ]}
          onPress={() => handleToggleFollow(item)}>
          {togglingId === item.id ? (
            <ActivityIndicator size="small" color={isCurrentlyFollowing ? '#64748B' : '#FFFFFF'} />
          ) : (
            <Text
              style={[
                styles.followActionBtnText,
                isCurrentlyFollowing ? styles.followingBtnText : styles.notFollowingBtnText,
              ]}>
              {isCurrentlyFollowing ? 'Đang theo dõi' : '+ Theo dõi'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <FontAwesome name="chevron-left" size={16} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mạng Lưới Kết Nối</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabItem, activeTab === 'followers' && styles.tabItemActive]}
            onPress={() => setActiveTab('followers')}>
            <Text style={[styles.tabItemText, activeTab === 'followers' && styles.tabItemTextActive]}>
              Người theo dõi ({followers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.tabItem, activeTab === 'following' && styles.tabItemActive]}
            onPress={() => setActiveTab('following')}>
            <Text style={[styles.tabItemText, activeTab === 'following' && styles.tabItemTextActive]}>
              Đang theo dõi ({following.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* List Content */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0284C7" />
            <Text style={styles.loadingText}>Đang tải danh sách kết nối...</Text>
          </View>
        ) : (
          <FlatList
            data={currentList}
            keyExtractor={item => String(item.id || Math.random())}
            renderItem={renderUserItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <FontAwesome
                    name={activeTab === 'followers' ? 'users' : 'user-plus'}
                    size={32}
                    color="#94A3B8"
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {activeTab === 'followers'
                    ? 'Chưa có người theo dõi nào'
                    : 'Bạn chưa theo dõi người dùng nào'}
                </Text>
                <Text style={styles.emptySub}>
                  {activeTab === 'followers'
                    ? 'Chia sẻ những chuyến đi tuyệt vời để kết nối với nhiều bạn đồng hành hơn!'
                    : 'Khám phá các thành viên nổi bật trên Bảng tin Cộng đồng để theo dõi nhé!'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: SERIF_FONT,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#0284C7',
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: SERIF_FONT,
  },
  tabItemTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
    fontFamily: SERIF_FONT,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  userInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userMeta: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: SERIF_FONT,
  },
  userHandle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    fontFamily: SERIF_FONT,
  },
  userBio: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontFamily: SERIF_FONT,
  },
  followActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 95,
  },
  followingBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  notFollowingBtn: {
    backgroundColor: '#0284C7',
  },
  followActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  followingBtnText: {
    color: '#475569',
  },
  notFollowingBtnText: {
    color: '#FFFFFF',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    fontFamily: SERIF_FONT,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    fontFamily: SERIF_FONT,
  },
});
