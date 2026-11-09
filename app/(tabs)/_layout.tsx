import React, { useState, useEffect, useCallback } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { AppState, Image, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WF_PAPER } from '@/constants/Colors';
import { ChatModal } from '../../components/ChatModal';
import { NotificationModal } from '@/components/NotificationModal';
import { showToast } from '@/components/Toast';
import { WelcomeAuthModal } from '@/components/WelcomeAuthModal';
import { authStorage, UserSession } from '@/src/services/authStorage';
import { authPrompt } from '@/src/services/authPrompt';
import { notificationApi, chatApi, mapChatRoom } from '@/src/services/api';
import { chatSocket, chatUiState } from '@/src/services/chatSocket';

function DynamicTabIcon({
  name,
  focused,
  avatarUrl,
}: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  focused: boolean;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <View style={[styles.tabAvatarWrap, focused && styles.tabAvatarWrapActive]}>
        <Image source={{ uri: avatarUrl }} style={styles.tabAvatarImg} />
      </View>
    );
  }

  return (
    <View style={[styles.tabCapsule, focused && styles.tabCapsuleActive]}>
      <FontAwesome
        name={name}
        size={focused ? 18 : 17}
        color={focused ? WF_PAPER.clay : '#64748B'}
      />
    </View>
  );
}

export const unstable_settings = {
  anchor: 'community',
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialRoomId, setChatInitialRoomId] = useState<string | number | undefined>(undefined);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  const prevNotifCountRef = React.useRef(0);
  const recentNotifKeysRef = React.useRef(new Set<string>());
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationApi.getUnreadCount();
      setUnreadNotifCount(count);
      if (count > prevNotifCountRef.current && prevNotifCountRef.current > 0) {
        showToast({
          kind: 'info',
          title: 'Thông báo mới',
          message: 'Bạn có tương tác mới từ cộng đồng du lịch Wayfare!',
          icon: 'bell',
        });
      }
      prevNotifCountRef.current = count;
    } catch {
      // Ignore
    }
  }, []);

  const refreshUnreadChatCount = useCallback(async () => {
    try {
      const count = await chatApi.getUnreadCount();
      setUnreadChatCount(count);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    authStorage.getSession().then((session) => {
      setCurrentUser(session);
      if (!session) {
        setIsAuthOpen(true);
      } else {
        refreshUnreadCount();
        refreshUnreadChatCount();
      }
    });

    const unsubscribeAuth = authStorage.subscribe((session) => {
      setCurrentUser(session);
      if (session) {
        refreshUnreadCount();
        refreshUnreadChatCount();
      } else {
        // ĐĂNG XUẤT: ẩn hết mọi lớp phủ đang mở (Chat / Thông báo), đưa app về tab
        // khởi đầu (Cộng đồng) và mở ngay form đăng nhập TOÀN MÀN HÌNH — trên màn
        // hình chỉ còn duy nhất form đăng nhập, người dùng không phải bấm qua bấm
        // lại các dịch vụ để tìm lại chỗ đăng nhập.
        setIsChatOpen(false);
        setIsNotificationOpen(false);
        setUnreadNotifCount(0);
        setIsAuthOpen(true);
        router.replace('/(tabs)/community');
      }
    });

    const unsubscribeUnauth = authStorage.onUnauthorized(() => {
      setCurrentUser(null);
      setIsChatOpen(false);
      setIsNotificationOpen(false);
      setIsAuthOpen(true);
      // Chờ modal đăng nhập mở xong rồi mới báo, để thông báo hiện đúng
      // bên trong modal thay vì bị lớp phủ che mất.
      setTimeout(() => {
        showToast({
          kind: 'error',
          title: 'Phiên làm việc đã hết hạn',
          message: 'Vui lòng đăng nhập lại để tiếp tục sử dụng đầy đủ các tính năng.',
          duration: 4600,
          icon: 'clock-o',
        });
      }, 340);
    });

    // Màn hình nào cần người dùng đăng nhập (thêm địa điểm vào lịch trình, thả
    // tim...) thì gọi authPrompt.open() để mở thẳng form đăng nhập toàn màn hình.
    const unsubscribePrompt = authPrompt.subscribe(() => {
      setIsChatOpen(false);
      setIsNotificationOpen(false);
      setIsAuthOpen(true);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUnauth();
      unsubscribePrompt();
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser) {
        refreshUnreadCount();
        refreshUnreadChatCount();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [currentUser, refreshUnreadCount, refreshUnreadChatCount]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && currentUser) {
        refreshUnreadCount();
        refreshUnreadChatCount();
      }
    });
    return () => subscription.remove();
  }, [currentUser, refreshUnreadCount, refreshUnreadChatCount]);

  // Lắng nghe WebSocket STOMP thời gian thực cho tin nhắn, hộp thư và thông báo hệ thống
  useEffect(() => {
    if (!currentUser) return;
    const rawId = (currentUser as any)?.id ?? (currentUser as any)?.userId;
    const userId = rawId != null ? Number(rawId) : undefined;
    const userEmail = (currentUser as any)?.email ?? undefined;

    chatSocket.connect();

    // 1. Nhận cập nhật hộp thư Chat thời gian thực
    const unsubChat = chatSocket.subscribeToUserChat(userId, userEmail, (rawRoom) => {
      // Luôn cập nhật badge số đỏ tin nhắn chưa đọc realtime
      refreshUnreadChatCount();

      // Tuyệt đối KHÔNG hiện thông báo Toast khi người dùng đang ở trong trang chat
      if (chatUiState.isChatOpen || isChatOpen) {
        return;
      }

      try {
        const room = mapChatRoom(rawRoom);
        // Chỉ hiện toast khi người dùng đang ở bên ngoài màn hình chat và có tin nhắn mới
        if (room && (room.unreadCount || 0) > 0 && room.lastMessage) {
          showToast({
            kind: 'info',
            title: room.name || 'Tin nhắn mới',
            message: room.lastMessage,
            icon: 'comment',
          });
        }
      } catch {
        // Safe fallback
      }
    });

    // 2. Nhận thông báo hệ thống thời gian thực (Zero Latency)
    const unsubNotif = chatSocket.subscribeToNotifications(userId, userEmail, (notification) => {
      if (!notification) return;

      // Chống trùng lặp thông báo trong 4 giây
      const notifKey = notification.id
        ? String(notification.id)
        : `${notification.type}_${notification.message}`;
      if (recentNotifKeysRef.current.has(notifKey)) return;
      recentNotifKeysRef.current.add(notifKey);
      setTimeout(() => recentNotifKeysRef.current.delete(notifKey), 4000);

      // Cập nhật số thông báo chưa đọc ngay lập tức
      setUnreadNotifCount((prev) => prev + 1);

      // Không hiển thị Toast nếu là tin nhắn chat và đang mở modal Chat
      const isChatNotif = notification.type === 'CHAT_MESSAGE';
      if (isChatNotif && (chatUiState.isChatOpen || isChatOpen)) {
        return;
      }

      // Không hiển thị Toast nếu thông báo do chính mình tạo ra
      const isSelf =
        (notification.actorId && notification.actorId === userId) ||
        (notification.actorEmail &&
          userEmail &&
          notification.actorEmail.toLowerCase() === userEmail.toLowerCase());
      if (isSelf) return;

      // Hiển thị Toast thông báo nổi thời gian thực
      showToast({
        kind: 'info',
        title: notification.title || 'Thông báo mới',
        message: notification.message || 'Bạn có tương tác mới từ cộng đồng!',
        icon: 'bell',
        duration: 4000,
      });
    });

    return () => {
      unsubChat();
      unsubNotif();
    };
  }, [currentUser, isChatOpen, refreshUnreadChatCount]);

  return (
    <>
      <Tabs
        backBehavior="initialRoute"
        screenOptions={{
          tabBarActiveTintColor: WF_PAPER.clay,
          tabBarInactiveTintColor: '#64748B',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: 'rgba(15, 23, 42, 0.07)',
            borderTopWidth: 1,
            height: 62 + Math.max(insets.bottom, 12),
            paddingBottom: Math.max(insets.bottom, 10) + 2,
            paddingTop: 8,
            elevation: 12,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
          },
          tabBarLabel: ({ focused, children }) => (
            <View style={styles.tabLabelWrap}>
              <Text style={[styles.tabLabelText, focused && styles.tabLabelTextActive]}>
                {typeof children === 'string' ? children : ''}
              </Text>
              {focused ? <View style={styles.tabActiveDot} /> : <View style={styles.tabDotPlaceholder} />}
            </View>
          ),
          header: () => (
            <View
              style={[
                styles.customHeader,
                {
                  paddingTop: Math.max(insets.top, 8),
                  paddingBottom: 8,
                },
              ]}>
              {/* Brand Logo - Điều hướng về Bảng tin Cộng đồng giống Facebook */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/community')}
                style={styles.logoWrapper}>
                <Image
                  source={require('@/assets/images/wayfare-logo.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Action Buttons: Notification & Chat */}
              <View style={styles.headerRightActions}>
                {/* Nút Trò chuyện / Chat */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsChatOpen(true)}
                  style={styles.headerCircleBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Mở tin nhắn và trợ lý AI">
                  <FontAwesome name="comments-o" size={17} color={WF_PAPER.inkSecondary} />
                  {unreadChatCount > 0 && (
                    <View style={styles.headerBadge}>
                      <Text style={styles.headerBadgeText}>
                        {unreadChatCount > 9 ? '9+' : unreadChatCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Nút Chuông Thông Báo */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (currentUser) {
                      setIsNotificationOpen(true);
                    } else {
                      setIsAuthOpen(true);
                    }
                  }}
                  style={styles.headerCircleBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Mở thông báo">
                  <FontAwesome name="bell-o" size={16} color={WF_PAPER.inkSecondary} />
                  {unreadNotifCount > 0 && (
                    <View style={styles.headerBadge}>
                      <Text style={styles.headerBadgeText}>
                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ),
        }}>
        {/* 1. Trang chủ (Ẩn khỏi thanh Tab bar theo yêu cầu người dùng) */}
        <Tabs.Screen
          name="index"
          options={{
            href: null,
          }}
        />

        {/* 2. CỘNG ĐỒNG (Tab Đầu Tiên khi vào App giống Facebook) */}
        <Tabs.Screen
          name="community"
          options={{
            title: 'Cộng đồng',
            tabBarIcon: ({ focused }) => (
              <DynamicTabIcon name="globe" focused={focused} />
            ),
          }}
        />

        {/* 3. KHÁM PHÁ */}
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Khám phá',
            tabBarIcon: ({ focused }) => (
              <DynamicTabIcon name="compass" focused={focused} />
            ),
          }}
        />

        {/* 4. LỊCH TRÌNH */}
        <Tabs.Screen
          name="itinerary"
          options={{
            title: 'Lịch trình',
            tabBarIcon: ({ focused }) => (
              <DynamicTabIcon
                name={focused ? 'calendar' : 'calendar-o'}
                focused={focused}
              />
            ),
          }}
        />

        {/* 5. TÀI KHOẢN (Hiển thị Avatar thật của user nếu đã đăng nhập) */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Tài khoản',
            tabBarIcon: ({ focused }) => (
              <DynamicTabIcon
                name="user"
                focused={focused}
                avatarUrl={currentUser?.avatarUrl}
              />
            ),
          }}
        />
      </Tabs>

      {/* Modal Trò chuyện trực tuyến (Tin nhắn & Trợ lý AI) */}
      <ChatModal
        visible={isChatOpen}
        initialRoomId={chatInitialRoomId}
        onClose={() => {
          setIsChatOpen(false);
          setChatInitialRoomId(undefined);
          refreshUnreadChatCount();
        }}
      />

      {/* Modal Thông Báo Thời Gian Thực */}
      <NotificationModal
        visible={isNotificationOpen}
        onClose={() => {
          setIsNotificationOpen(false);
          refreshUnreadCount();
        }}
        onNotificationRead={refreshUnreadCount}
        onOpenChat={(roomId) => {
          setChatInitialRoomId(roomId);
          setIsChatOpen(true);
        }}
      />

      {/* Màn hình Xác thực Chào mừng / Đăng nhập VIP (Google & Email) */}
      <WelcomeAuthModal
        visible={isAuthOpen}
        onLoginSuccess={(sess, mode) => {
          setCurrentUser(sess);
          setIsAuthOpen(false);
          refreshUnreadCount();

          const name = sess.fullName || sess.email || 'bạn';
          const isNewAccount = mode === 'register';

          // Chờ modal đăng nhập trượt xuống hết rồi mới bật thông báo,
          // tránh bị lớp phủ của modal che mất trên thiết bị thật.
          setTimeout(() => {
            showToast({
              kind: 'success',
              title: isNewAccount ? 'Tạo tài khoản thành công' : 'Đăng nhập thành công',
              message: isNewAccount
                ? `Chào mừng ${name} đến với cộng đồng Wayfare!`
                : mode === 'google'
                  ? `Xin chào ${name}, hồ sơ Google đã được kết nối.`
                  : `Chào mừng ${name} trở lại Wayfare!`,
            });
          }, 280);
        }}
        onContinueAsGuest={() => setIsAuthOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    backgroundColor: WF_PAPER.card,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  headerLogo: {
    width: 128,
    height: 36,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: WF_PAPER.card,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  // ── DYNAMIC CAPSULE TAB BAR STYLES ────────────────────────
  tabCapsule: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    backgroundColor: 'transparent',
  },
  tabCapsuleActive: {
    backgroundColor: 'rgba(217, 107, 67, 0.12)',
  },
  tabAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  tabAvatarWrapActive: {
    borderColor: WF_PAPER.clay,
    borderWidth: 2,
    shadowColor: WF_PAPER.clay,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  tabAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  tabLabelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabelText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.1,
  },
  tabLabelTextActive: {
    fontWeight: '800',
    color: WF_PAPER.clay,
  },
  tabActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: WF_PAPER.clay,
    marginTop: 2,
  },
  tabDotPlaceholder: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});

