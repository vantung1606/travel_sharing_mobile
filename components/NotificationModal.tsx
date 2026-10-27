import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Text, TextInput } from '@/components/Themed';
import { SERIF_FONT } from '@/constants/Typography';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { WF_COLORS } from '@/constants/Colors';
import { ConfirmHost, confirmDialog } from '@/components/ConfirmDialog';
import { ToastHost, showToast } from '@/components/Toast';
import { notificationApi, NotificationDto } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';

const { width } = Dimensions.get('window');

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onNotificationRead?: () => void;
  onOpenChat?: () => void;
}

type FilterTab = 'all' | 'unread' | 'ai' | 'social' | 'system';

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onNotificationRead,
  onOpenChat,
}) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch notifications
  const loadNotifications = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await notificationApi.getNotifications();
      setNotifications(data || []);
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (e) {
      console.warn('Error loading notifications:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onNotificationRead]);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible, loadNotifications]);

  // Mark single as read
  const handleMarkAsRead = async (item: NotificationDto) => {
    if (!item.isRead) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      );
      await notificationApi.markAsRead(item.id);
      if (onNotificationRead) {
        onNotificationRead();
      }
    }

    // Handle deep-link / navigation according to targetUrl or type
    handleNotificationClick(item);
  };

  const handleNotificationClick = (item: NotificationDto) => {
    const url = (item.targetUrl || '').toLowerCase();
    const type = item.type || '';

    if (type === 'CHAT_MESSAGE' || type === 'CHAT_INVITE' || url.includes('/chat')) {
      onClose();
      if (onOpenChat) {
        setTimeout(onOpenChat, 200);
      }
    } else if (url.includes('/itineraries') || url.includes('itinerary') || type === 'AI_READY' || type === 'ITINERARY_SHARED') {
      onClose();
      setTimeout(() => {
        router.push('/(tabs)/itinerary');
      }, 200);
    } else if (url.includes('/profile') || url.includes('user') || type === 'FOLLOW') {
      onClose();
      setTimeout(() => {
        router.push('/(tabs)/profile');
      }, 200);
    } else if (url.includes('/explore') || type === 'PLACE_APPROVED') {
      onClose();
      setTimeout(() => {
        router.push('/(tabs)/explore');
      }, 200);
    } else {
      // Mặc định về Bảng tin cộng đồng
      onClose();
      setTimeout(() => {
        router.push('/(tabs)/community');
      }, 200);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    if (unreadCount === 0) return;

    const confirmed = await confirmDialog({
      title: 'Đánh dấu đã đọc?',
      message: `Cả ${unreadCount} thông báo chưa đọc sẽ được đánh dấu là đã đọc.`,
      confirmText: 'Đánh dấu',
      icon: 'check',
      accent: 'primary',
    });
    if (!confirmed) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await notificationApi.markAllAsRead();
    if (onNotificationRead) {
      onNotificationRead();
    }
    // Không thông báo: huy hiệu số chưa đọc đã tự biến mất ngay trên màn hình.
  };

  // Delete single notification
  const handleDeleteNotification = async (id: number) => {
    const confirmed = await confirmDialog({
      title: 'Xóa thông báo?',
      message: 'Thông báo này sẽ được gỡ khỏi danh sách của bạn.',
      confirmText: 'Xóa',
      destructive: true,
    });
    if (!confirmed) return;

    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await notificationApi.deleteNotification(id);
    if (onNotificationRead) {
      onNotificationRead();
    }
    showToast({
      kind: 'success',
      title: 'Đã xóa thông báo',
      message: 'Thông báo đã được gỡ khỏi danh sách.',
    });
  };

  // Resolve metadata by notification type
  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'AI_READY':
        return {
          iconName: 'magic' as const,
          iconColor: '#F59E0B',
          bgColor: '#FEF3C7',
          borderColor: '#FDE68A',
          badgeText: 'WanderAI',
          badgeColor: '#D97706',
        };
      case 'LIKE':
        return {
          iconName: 'heart' as const,
          iconColor: '#EF4444',
          bgColor: '#FEE2E2',
          borderColor: '#FECACA',
          badgeText: 'Yêu thích',
          badgeColor: '#DC2626',
        };
      case 'COMMENT':
      case 'COMMENT_REPLY':
        return {
          iconName: 'comment' as const,
          iconColor: '#B0522F',
          bgColor: '#F6E6DD',
          borderColor: '#E8D5C9',
          badgeText: 'Bình luận',
          badgeColor: '#B0522F',
        };
      case 'CHAT_MESSAGE':
        return {
          iconName: 'comments' as const,
          iconColor: '#2563EB',
          bgColor: '#DBEAFE',
          borderColor: '#BFDBFE',
          badgeText: 'Tin nhắn',
          badgeColor: '#8F3F24',
        };
      case 'FOLLOW':
        return {
          iconName: 'user-plus' as const,
          iconColor: '#8B5CF6',
          bgColor: '#EDE9FE',
          borderColor: '#DDD6FE',
          badgeText: 'Theo dõi',
          badgeColor: '#7C3AED',
        };
      case 'SHARE':
      case 'COMMUNITY_SHARE':
      case 'ITINERARY_SHARED':
        return {
          iconName: 'share-alt' as const,
          iconColor: '#0D9488',
          bgColor: '#CCFBF1',
          borderColor: '#99F6E4',
          badgeText: 'Chia sẻ',
          badgeColor: '#0F766E',
        };
      case 'PLACE_APPROVED':
      case 'POST_APPROVED':
        return {
          iconName: 'check-circle' as const,
          iconColor: '#10B981',
          bgColor: '#D1FAE5',
          borderColor: '#A7F3D0',
          badgeText: 'Đã duyệt',
          badgeColor: '#059669',
        };
      case 'SYSTEM':
      default:
        return {
          iconName: 'bell' as const,
          iconColor: '#B0522F',
          bgColor: '#F6E6DD',
          borderColor: '#E8D5C9',
          badgeText: 'Hệ thống',
          badgeColor: '#8F3F24',
        };
    }
  };

  // Format relative time helper
  const formatTime = (timeStr?: string, createdAt?: string) => {
    if (timeStr && timeStr.trim().length > 0) return timeStr;
    if (!createdAt) return 'Vừa xong';
    try {
      const date = new Date(createdAt);
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) return 'Vừa xong';
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    } catch {
      return 'Gần đây';
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Filter by Tab
      if (activeTab === 'unread' && item.isRead) return false;
      if (activeTab === 'ai' && item.type !== 'AI_READY') return false;
      if (activeTab === 'social') {
        const socialTypes = ['LIKE', 'COMMENT', 'COMMENT_REPLY', 'FOLLOW', 'SHARE', 'COMMUNITY_SHARE', 'CHAT_MESSAGE', 'CHAT_INVITE'];
        if (!socialTypes.includes(item.type)) return false;
      }
      if (activeTab === 'system') {
        const sysTypes = ['SYSTEM', 'PLACE_APPROVED', 'POST_APPROVED', 'POST_HIDDEN', 'POST_LOCKED', 'POST_DELETED', 'REPORT_DISMISSED', 'REPORT_ALERT'];
        if (!sysTypes.includes(item.type)) return false;
      }

      // Filter by search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const msg = (item.message || '').toLowerCase();
        const actor = (item.actorName || '').toLowerCase();
        return msg.includes(q) || actor.includes(q);
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const unreadTotal = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIconBadge}>
              <FontAwesome name="bell" size={17} color="#B0522F" />
              {unreadTotal > 0 && <View style={styles.headerDotBadge} />}
            </View>
            <View>
              <Text style={styles.headerTitle}>Thông báo</Text>
              <Text style={styles.headerSubtitle}>
                {unreadTotal > 0 ? `${unreadTotal} tin chưa đọc` : 'Tất cả đã cập nhật'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {/* Mark All Read Button */}
            {unreadTotal > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.markAllBtn}
                onPress={handleMarkAllAsRead}>
                <FontAwesome name="check-circle" size={14} color="#B0522F" style={{ marginRight: 5 }} />
                <Text style={styles.markAllBtnText}>Đã đọc hết</Text>
              </TouchableOpacity>
            )}

            {/* Close Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeBtn}
              onPress={onClose}>
              <FontAwesome name="times" size={16} color="#5A5146" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Segment Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'all' && styles.filterTabActive]}
            onPress={() => setActiveTab('all')}
            activeOpacity={0.8}>
            <Text style={[styles.filterTabText, activeTab === 'all' && styles.filterTabTextActive]}>
              Tất cả
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'unread' && styles.filterTabActive]}
            onPress={() => setActiveTab('unread')}
            activeOpacity={0.8}>
            <Text style={[styles.filterTabText, activeTab === 'unread' && styles.filterTabTextActive]}>
              Chưa đọc {unreadTotal > 0 ? `(${unreadTotal})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'ai' && styles.filterTabActive]}
            onPress={() => setActiveTab('ai')}
            activeOpacity={0.8}>
            <Text style={[styles.filterTabText, activeTab === 'ai' && styles.filterTabTextActive]}>
              AI Trợ lý ✨
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'social' && styles.filterTabActive]}
            onPress={() => setActiveTab('social')}
            activeOpacity={0.8}>
            <Text style={[styles.filterTabText, activeTab === 'social' && styles.filterTabTextActive]}>
              Tương tác 💬
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'system' && styles.filterTabActive]}
            onPress={() => setActiveTab('system')}
            activeOpacity={0.8}>
            <Text style={[styles.filterTabText, activeTab === 'system' && styles.filterTabTextActive]}>
              Hệ thống 🛡️
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={14} color="#8A7F70" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm nội dung thông báo..."
            placeholderTextColor="#8A7F70"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <FontAwesome name="times-circle" size={14} color="#8A7F70" />
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#B0522F" />
            <Text style={styles.loadingText}>Đang tải thông báo...</Text>
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <FontAwesome name="bell-slash-o" size={42} color="#8A7F70" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Không tìm thấy thông báo phù hợp' : 'Không có thông báo nào'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Thử thay đổi từ khóa tìm kiếm để xem kết quả khác'
                : 'Mọi hoạt động mới, lịch trình AI và tương tác sẽ hiển thị tại đây.'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.emptyRefreshBtn}
              onPress={() => loadNotifications()}>
              <FontAwesome name="refresh" size={13} color="#B0522F" style={{ marginRight: 6 }} />
              <Text style={styles.emptyRefreshBtnText}>Làm mới</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 16 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadNotifications(true)}
                colors={['#B0522F']}
                tintColor="#B0522F"
              />
            }
            renderItem={({ item }) => {
              const meta = getTypeMeta(item.type);
              const isUnread = !item.isRead;

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.notificationCard, isUnread && styles.notificationCardUnread]}
                  onPress={() => handleMarkAsRead(item)}>
                  {/* Left Avatar / Icon */}
                  <View style={styles.avatarWrapper}>
                    {item.actorAvatar ? (
                      <Image source={{ uri: item.actorAvatar }} style={styles.actorAvatar} />
                    ) : item.type === 'AI_READY' ? (
                      <View style={[styles.actorAvatarPlaceholder, { backgroundColor: '#FEF3C7' }]}>
                        <FontAwesome name="magic" size={18} color="#D97706" />
                      </View>
                    ) : (
                      <View style={[styles.actorAvatarPlaceholder, { backgroundColor: '#F3EDE2' }]}>
                        <FontAwesome name="user-circle" size={24} color="#5A5146" />
                      </View>
                    )}

                    {/* Small badge icon at bottom-right of avatar */}
                    <View style={[styles.cornerTypeBadge, { backgroundColor: meta.bgColor, borderColor: meta.borderColor }]}>
                      <FontAwesome name={meta.iconName} size={10} color={meta.iconColor} />
                    </View>
                  </View>

                  {/* Body Content */}
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.typePill, { backgroundColor: meta.bgColor, borderColor: meta.borderColor }]}>
                        <Text style={[styles.typePillText, { color: meta.badgeColor }]}>{meta.badgeText}</Text>
                      </View>
                      <Text style={styles.timeText}>{formatTime(item.time, item.createdAt)}</Text>
                    </View>

                    {item.actorName && (
                      <Text style={styles.actorNameText} numberOfLines={1}>
                        {item.actorName}
                      </Text>
                    )}

                    <Text style={[styles.messageText, isUnread && styles.messageTextUnread]}>
                      {item.message}
                    </Text>
                  </View>

                  {/* Right Actions: Unread dot & Delete */}
                  <View style={styles.rightActionsColumn}>
                    {isUnread && <View style={styles.unreadDot} />}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.cardDeleteBtn}
                      onPress={() => handleDeleteNotification(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <FontAwesome name="trash-o" size={14} color="#D9CDBE" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Thông báo & hộp xác nhận trong chính modal */}
        <ConfirmHost enabled={visible} />
        <ToastHost enabled={visible} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFDF8',
    borderBottomWidth: 1,
    borderBottomColor: '#E4DACB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F6E6DD',
    borderWidth: 1,
    borderColor: '#E8D5C9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  headerDotBadge: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFDF8',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1A15',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#5A5146',
    marginTop: 1,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6E6DD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0522F',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3EDE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFDF8',
    borderBottomWidth: 1,
    borderBottomColor: '#F3EDE2',
    gap: 6,
  },
  filterTab: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3EDE2',
  },
  filterTabActive: {
    backgroundColor: '#B0522F',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5A5146',
  },
  filterTabTextActive: {
    color: '#FFFDF8',
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E1A15',
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E4DACB',
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  notificationCardUnread: {
    backgroundColor: '#F6E6DD',
    borderColor: '#E8D5C9',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
    marginTop: 2,
  },
  actorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E4DACB',
  },
  actorAvatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerTypeBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.8,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: '#8A7F70',
  },
  actorNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1A15',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 13,
    color: '#5A5146',
    lineHeight: 18,
  },
  messageTextUnread: {
    color: '#1E1A15',
    fontWeight: '600',
  },
  rightActionsColumn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    minHeight: 46,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#B0522F',
    marginTop: 2,
  },
  cardDeleteBtn: {
    padding: 4,
    marginTop: 'auto',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#5A5146',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3EDE2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3B332A',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#5A5146',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F6E6DD',
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  emptyRefreshBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B0522F',
  },
});
