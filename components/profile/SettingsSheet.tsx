import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/Themed';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { TierItem } from '@/src/utils/tierSystem';

export interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
  currentTier?: TierItem;
  userXP?: number;
  onEditProfile: () => void;
  onChangePassword: () => void;
  onViewBadges: () => void;
  onViewDna: () => void;
  onLogout: () => void;
}

export function SettingsSheet({
  visible,
  onClose,
  userEmail,
  userName,
  currentTier,
  userXP = 0,
  onEditProfile,
  onChangePassword,
  onViewBadges,
  onViewDna,
  onLogout,
}: SettingsSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Cài Đặt & Tài Khoản">
      <View style={styles.container}>
        {/* User Summary Pill */}
        <View style={styles.userSummaryBox}>
          <View style={styles.userSummaryLeft}>
            <Text style={styles.userNameText} numberOfLines={1}>
              {userName || 'Nhà Lữ Hành'}
            </Text>
            <Text style={styles.userEmailText} numberOfLines={1}>
              {userEmail || ''}
            </Text>
          </View>
          {currentTier ? (
            <View style={[styles.tierPill, { backgroundColor: currentTier.badgeBg }]}>
              <Text style={styles.tierText}>
                {currentTier.icon} {currentTier.name}
              </Text>
              <Text style={styles.xpText}>{userXP} XP</Text>
            </View>
          ) : null}
        </View>

        {/* 1. Chỉnh sửa hồ sơ */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            onClose();
            onEditProfile();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#F0F9FF' }]}>
            <FontAwesome name="pencil" size={15} color="#0284C7" />
          </View>
          <View style={styles.itemTextCol}>
            <Text style={styles.itemTitle}>Chỉnh sửa hồ sơ</Text>
            <Text style={styles.itemDesc}>Họ tên, tiểu sử, số điện thoại, sở thích du lịch</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={DS_COLOR.inkMuted} />
        </TouchableOpacity>

        {/* 2. Đổi mật khẩu */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            onClose();
            onChangePassword();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#F8F4EC' }]}>
            <FontAwesome name="key" size={15} color={DS_COLOR.accent} />
          </View>
          <View style={styles.itemTextCol}>
            <Text style={styles.itemTitle}>Đổi mật khẩu</Text>
            <Text style={styles.itemDesc}>Cập nhật mật khẩu mới bảo vệ tài khoản</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={DS_COLOR.inkMuted} />
        </TouchableOpacity>

        {/* 3. Danh hiệu & Cấp bậc */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            onClose();
            onViewBadges();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <FontAwesome name="trophy" size={15} color="#D97706" />
          </View>
          <View style={styles.itemTextCol}>
            <Text style={styles.itemTitle}>Hệ thống danh hiệu & Cấp bậc</Text>
            <Text style={styles.itemDesc}>Xem điểm kinh nghiệm (XP) và huy hiệu đạt được</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={DS_COLOR.inkMuted} />
        </TouchableOpacity>

        {/* 4. Hồ sơ AI Travel DNA */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            onClose();
            onViewDna();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#EDE9FE' }]}>
            <FontAwesome name="compass" size={16} color="#7C3AED" />
          </View>
          <View style={styles.itemTextCol}>
            <Text style={styles.itemTitle}>Hồ sơ AI Travel DNA</Text>
            <Text style={styles.itemDesc}>Khám phá gu du lịch cá nhân hóa của bạn</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={DS_COLOR.inkMuted} />
        </TouchableOpacity>

        {/* 5. Đăng xuất */}
        <TouchableOpacity
          style={[styles.settingItem, styles.logoutItem]}
          onPress={() => {
            onClose();
            onLogout();
          }}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
            <FontAwesome name="sign-out" size={15} color={DS_COLOR.danger} />
          </View>
          <View style={styles.itemTextCol}>
            <Text style={[styles.itemTitle, { color: DS_COLOR.danger }]}>Đăng xuất</Text>
            <Text style={styles.itemDesc}>Thoát khỏi phiên đăng nhập trên thiết bị này</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={DS_COLOR.danger} />
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 24,
  },
  userSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F7F5',
    padding: 12,
    borderRadius: DS_RADIUS.md,
    marginBottom: 8,
  },
  userSummaryLeft: {
    flex: 1,
    marginRight: 8,
  },
  userNameText: {
    fontSize: DS_TYPE.body,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  userEmailText: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
    marginTop: 1,
  },
  tierPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: DS_RADIUS.pill,
    alignItems: 'center',
  },
  tierText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#1E1A15',
  },
  xpText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#5A5146',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: DS_COLOR.line,
  },
  logoutItem: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: DS_TYPE.body,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
  },
});
