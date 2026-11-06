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

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: any;
}) {
  return <FontAwesome size={21} style={{ marginBottom: -2 }} {...props} />;
}

export const unstable_settings = {
  anchor: 'community',
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  const prevNotifCountRef = React.useRef(0);
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

  // Lắng nghe WebSocket STOMP thời gian thực cho tin nhắn và hộp thư bên ngoài màn hình chat
  useEffect(() => {
    if (!currentUser) return;
    const rawId = (currentUser as any)?.id ?? (currentUser as any)?.userId;
    const userId = rawId != null ? Number(rawId) : undefined;
    const userEmail = (currentUser as any)?.email ?? undefined;

    const unsubChat = chatSocket.subscribeToUserChat(userId, userEmail, (rawRoom) => {
      // 1. Luôn cập nhật badge số đỏ tin nhắn chưa đọc realtime
      refreshUnreadChatCount();

      // 2. Tuyệt đối KHÔNG hiện thông báo Toast khi người dùng đang ở trong trang chat
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

    return () => unsubChat();
  }, [currentUser, isChatOpen, refreshUnreadChatCount]);

  return (
    <>
      <Tabs
        backBehavior="initialRoute"
        screenOptions={{
          tabBarActiveTintColor: WF_PAPER.clay,
          tabBarInactiveTintColor: WF_PAPER.inkMuted,
          tabBarStyle: {
            backgroundColor: WF_PAPER.card,
            borderTopColor: 'rgba(15, 23, 42, 0.06)',
            borderTopWidth: 1,
            height: 60 + Math.max(insets.bottom, 16),
            paddingBottom: Math.max(insets.bottom, 14) + 4,
            paddingTop: 8,
            elevation: 8,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.05,
            shadowRadius: 12,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            lineHeight: 15,
            fontWeight: '600',
            marginTop: 2,
            letterSpacing: 0.2,
            flexShrink: 0,
          },
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

              {/* Action Buttons: Notification, Chat & Profile */}
              <View style={styles.headerRightActions}>
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
                  style={styles.notifHeaderBtn}>
                  <FontAwesome name="bell-o" size={17} color={WF_PAPER.inkSecondary} />
                  {unreadNotifCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>
                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Nút Trò chuyện / Chat */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsChatOpen(true)}
                  style={styles.chatHeaderBtn}>
                  <FontAwesome name="comments" size={15} color={WF_PAPER.clay} style={{ marginRight: 6 }} />
                  <Text style={styles.chatHeaderBtnText}>Chat</Text>
                  {unreadChatCount > 0 && (
                    <View style={styles.chatBadge}>
                      <Text style={styles.chatBadgeText}>
                        {unreadChatCount > 9 ? '9+' : unreadChatCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Nút Profile Avatar */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    if (currentUser) {
                      router.push('/(tabs)/profile');
                    } else {
                      setIsAuthOpen(true);
                    }
                  }}
                  style={styles.avatarHeaderBtn}>
                  {currentUser?.avatar ? (
                    <Image
                      source={{ uri: currentUser.avatar }}
                      style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: WF_PAPER.clay }}
                    />
                  ) : (
                    <FontAwesome name="user-circle" size={26} color={WF_PAPER.inkSecondary} />
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
            tabBarIcon: ({ color }) => <TabBarIcon name="globe" color={color} />,
          }}
        />

        {/* 3. KHÁM PHÁ */}
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Khám phá',
            tabBarIcon: ({ color }) => <TabBarIcon name="compass" color={color} />,
          }}
        />

        {/* 4. LỊCH TRÌNH */}
        <Tabs.Screen
          name="itinerary"
          options={{
            title: 'Lịch trình',
            tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
          }}
        />

        {/* 5. TÀI KHOẢN */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Tài khoản',
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          }}
        />
      </Tabs>

      {/* Modal Trò chuyện trực tuyến (Tin nhắn & Trợ lý AI) */}
      <ChatModal
        visible={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
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
        onOpenChat={() => {
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
    gap: 10,
  },
  chatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_PAPER.clayLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
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
  chatBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  chatHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
  avatarHeaderBtn: {
    padding: 2,
  },
  notifHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: WF_PAPER.clay,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: WF_PAPER.card,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});

