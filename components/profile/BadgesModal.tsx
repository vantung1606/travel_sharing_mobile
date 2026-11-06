import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { UserProfileItem } from '@/src/services/api';
import { TierItem } from '@/src/utils/tierSystem';

export interface BadgesModalProps {
  visible: boolean;
  onClose: () => void;
  currentTier: TierItem;
  nextTier: TierItem | null;
  userTotalXP: number;
  progressPercent: number;
  achievements: Array<{
    title: string;
    icon: string;
    desc: string;
    date: string;
    unlocked: boolean;
  }>;
  profileData: UserProfileItem | null;
  initialTab?: 'badges' | 'dna';
}

export function BadgesModal({
  visible,
  onClose,
  currentTier,
  nextTier,
  userTotalXP,
  progressPercent,
  achievements,
  profileData,
  initialTab = 'badges',
}: BadgesModalProps) {
  const [activeTab, setActiveTab] = useState<'badges' | 'dna'>(initialTab);

  // Sync initial tab when opened
  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeContainer} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {activeTab === 'badges' ? 'Hệ Thống Danh Hiệu' : 'Hồ Sơ AI Travel DNA'}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeBtn}
          >
            <FontAwesome name="times" size={17} color={DS_COLOR.inkMuted} />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'badges' && styles.tabBtnActive]}
            onPress={() => setActiveTab('badges')}
          >
            <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>
              🏆 Danh Hiệu & XP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'dna' && styles.tabBtnActive]}
            onPress={() => setActiveTab('dna')}
          >
            <Text style={[styles.tabText, activeTab === 'dna' && styles.tabTextActive]}>
              🧬 AI Travel DNA
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {activeTab === 'badges' ? (
            <>
              {/* Prestige Tier Card */}
              <View style={styles.prestigeCard}>
                <View style={styles.prestigeHeader}>
                  <View>
                    <Text style={styles.prestigeSub}>Cấp bậc hiện tại</Text>
                    <Text style={styles.prestigeTitle}>
                      {currentTier.icon} {currentTier.name}
                    </Text>
                  </View>
                  <View style={[styles.xpBadge, { backgroundColor: currentTier.badgeBg }]}>
                    <Text style={styles.xpBadgeText}>{userTotalXP} XP</Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
                  </View>
                  <View style={styles.progressMeta}>
                    <Text style={styles.progressMetaText}>
                      {nextTier ? `Cần ${nextTier.minXP - userTotalXP} XP để lên ${nextTier.name}` : 'Đã đạt cấp tối đa!'}
                    </Text>
                    <Text style={styles.progressPercentText}>{progressPercent}%</Text>
                  </View>
                </View>
              </View>

              {/* Achievements Section */}
              <Text style={styles.sectionHeader}>Huy Hiệu & Thành Tích</Text>
              <View style={styles.achievementsList}>
                {achievements.map((item, idx) => (
                  <View
                    key={idx}
                    style={[styles.achievementCard, item.unlocked ? styles.unlockedCard : styles.lockedCard]}
                  >
                    <Text style={styles.achievementIcon}>{item.icon}</Text>
                    <View style={styles.achievementContent}>
                      <View style={styles.achievementTitleRow}>
                        <Text style={[styles.achievementTitle, !item.unlocked && styles.lockedText]}>
                          {item.title}
                        </Text>
                        <View style={[styles.unlockedPill, item.unlocked ? styles.pillUnlocked : styles.pillLocked]}>
                          <Text style={[styles.pillText, item.unlocked ? styles.textUnlocked : styles.textLocked]}>
                            {item.unlocked ? 'ĐÃ MỞ' : 'CHƯA ĐẠT'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.achievementDesc}>{item.desc}</Text>
                      <Text style={styles.achievementDate}>{item.date}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <>
              {/* DNA Card */}
              <View style={styles.dnaCard}>
                <Text style={styles.dnaHeadline}>Chỉ Số Phong Cách Du Lịch</Text>
                <Text style={styles.dnaSub}>
                  Phân tích từ hành vi lập lịch trình, bài viết và tương tác của bạn trên Wayfare.
                </Text>

                <View style={styles.dnaGrid}>
                  <View style={styles.dnaItem}>
                    <Text style={styles.dnaItemIcon}>🧭</Text>
                    <Text style={styles.dnaItemLabel}>Phong Cách</Text>
                    <Text style={styles.dnaItemValue}>{profileData?.travelStyle || 'Khám phá tự do'}</Text>
                  </View>

                  <View style={styles.dnaItem}>
                    <Text style={styles.dnaItemIcon}>💰</Text>
                    <Text style={styles.dnaItemLabel}>Ngân Sách</Text>
                    <Text style={styles.dnaItemValue}>{profileData?.budgetPreference || 'Linh hoạt'}</Text>
                  </View>

                  <View style={styles.dnaItem}>
                    <Text style={styles.dnaItemIcon}>📍</Text>
                    <Text style={styles.dnaItemLabel}>Địa Bàn</Text>
                    <Text style={styles.dnaItemValue}>{profileData?.address || 'Việt Nam'}</Text>
                  </View>

                  <View style={styles.dnaItem}>
                    <Text style={styles.dnaItemIcon}>🛡️</Text>
                    <Text style={styles.dnaItemLabel}>Xác Minh</Text>
                    <Text style={styles.dnaItemValue}>{profileData?.isVerified ? 'Đã xác thực' : 'Thành viên'}</Text>
                  </View>
                </View>

                {profileData?.bio ? (
                  <View style={styles.bioBox}>
                    <Text style={styles.bioLabel}>Tuyên ngôn xê dịch:</Text>
                    <Text style={styles.bioContent}>"{profileData.bio}"</Text>
                  </View>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: DS_COLOR.bg,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: DS_COLOR.surface,
    borderBottomWidth: 1,
    borderBottomColor: DS_COLOR.line,
  },
  headerTitle: {
    fontSize: DS_TYPE.title,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSwitcher: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: DS_COLOR.surface,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: DS_COLOR.line,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: DS_RADIUS.pill,
    backgroundColor: '#F5F5F4',
  },
  tabBtnActive: {
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: DS_COLOR.accent,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: DS_COLOR.inkSecondary,
  },
  tabTextActive: {
    color: DS_COLOR.accent,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  prestigeCard: {
    backgroundColor: DS_COLOR.surface,
    padding: 16,
    borderRadius: DS_RADIUS.lg,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    marginBottom: 20,
  },
  prestigeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  prestigeSub: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
  },
  prestigeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DS_COLOR.ink,
    marginTop: 2,
  },
  xpBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: DS_RADIUS.pill,
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1A15',
  },
  progressContainer: {
    gap: 6,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E7E5E4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: DS_COLOR.accent,
    borderRadius: 4,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressMetaText: {
    fontSize: 11.5,
    color: DS_COLOR.inkMuted,
  },
  progressPercentText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: DS_COLOR.accent,
  },
  sectionHeader: {
    fontSize: DS_TYPE.body,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginBottom: 10,
  },
  achievementsList: {
    gap: 10,
  },
  achievementCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: DS_COLOR.surface,
    borderRadius: DS_RADIUS.md,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    alignItems: 'center',
  },
  unlockedCard: {
    borderColor: '#E2E8F0',
  },
  lockedCard: {
    opacity: 0.65,
    backgroundColor: '#FAF9F6',
  },
  achievementIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  achievementTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  lockedText: {
    color: DS_COLOR.inkMuted,
  },
  unlockedPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: DS_RADIUS.pill,
  },
  pillUnlocked: {
    backgroundColor: '#D1FAE5',
  },
  pillLocked: {
    backgroundColor: '#F1F5F9',
  },
  pillText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  textUnlocked: {
    color: '#059669',
  },
  textLocked: {
    color: DS_COLOR.inkMuted,
  },
  achievementDesc: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkSecondary,
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 10.5,
    color: DS_COLOR.inkMuted,
  },
  dnaCard: {
    backgroundColor: DS_COLOR.surface,
    borderRadius: DS_RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
  },
  dnaHeadline: {
    fontSize: 16,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginBottom: 4,
  },
  dnaSub: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  dnaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  dnaItem: {
    width: '48%',
    backgroundColor: '#F7F7F5',
    padding: 12,
    borderRadius: DS_RADIUS.md,
    alignItems: 'center',
  },
  dnaItemIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  dnaItemLabel: {
    fontSize: 11,
    color: DS_COLOR.inkMuted,
    fontWeight: '500',
  },
  dnaItemValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginTop: 2,
    textAlign: 'center',
  },
  bioBox: {
    backgroundColor: '#FDF2F0',
    padding: 12,
    borderRadius: DS_RADIUS.md,
    borderLeftWidth: 3,
    borderLeftColor: DS_COLOR.accent,
  },
  bioLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: DS_COLOR.accent,
    marginBottom: 2,
  },
  bioContent: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: DS_COLOR.ink,
    lineHeight: 18,
  },
});
