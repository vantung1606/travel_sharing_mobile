import React, { useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter } from 'expo-router';
import { Image, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WF_COLORS } from '@/constants/Colors';
import { ChatModal } from '@/components/ChatModal';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: any;
}) {
  return <FontAwesome size={21} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: WF_COLORS.primary,
          tabBarInactiveTintColor: WF_COLORS.slate400,
          tabBarStyle: {
            backgroundColor: WF_COLORS.white,
            borderTopColor: WF_COLORS.slate200,
            borderTopWidth: 1,
            height: 64 + Math.max(insets.bottom, 22),
            paddingBottom: Math.max(insets.bottom, 20) + 4,
            paddingTop: 8,
            elevation: 12,
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginTop: 2,
          },
          header: () => (
            <View
              style={[
                styles.customHeader,
                {
                  paddingTop: insets.top + 6,
                  height: 56 + insets.top + 6,
                },
              ]}>
              {/* Brand Logo - 100% Căn chuẩn dưới thanh thông báo hệ thống */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)')}
                style={styles.logoWrapper}>
                <Image
                  source={require('@/assets/images/wayfare-logo.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              {/* Action Buttons: Chat & Profile */}
              <View style={styles.headerRightActions}>
                {/* Nút Trò chuyện / Chat */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setIsChatOpen(true)}
                  style={styles.chatHeaderBtn}>
                  <FontAwesome name="comments" size={16} color={WF_COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.chatHeaderBtnText}>Chat</Text>
                  <View style={styles.liveDot} />
                </TouchableOpacity>

                {/* Nút Profile Avatar */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/profile')}
                  style={styles.avatarHeaderBtn}>
                  <FontAwesome name="user-circle" size={24} color={WF_COLORS.slate700} />
                </TouchableOpacity>
              </View>
            </View>
          ),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Trang chủ',
            tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Khám phá',
            tabBarIcon: ({ color }) => <TabBarIcon name="compass" color={color} />,
          }}
        />
        <Tabs.Screen
          name="itinerary"
          options={{
            title: 'Lịch trình',
            tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: 'Cộng đồng',
            tabBarIcon: ({ color }) => <TabBarIcon name="globe" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Tài khoản',
            tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          }}
        />
        <Tabs.Screen
          name="two"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Modal Trò chuyện trực tuyến (Tin nhắn & Trợ lý AI) */}
      <ChatModal visible={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  customHeader: {
    backgroundColor: WF_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  headerLogo: {
    width: 125,
    height: 34,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  chatHeaderBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  avatarHeaderBtn: {
    padding: 2,
  },
});
