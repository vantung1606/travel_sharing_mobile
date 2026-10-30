import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Text } from '@/components/Themed';
import { WF_PAPER } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { PostItem } from '@/src/services/api';

interface ItineraryAttachCardProps {
  post: PostItem;
  canClone?: boolean;
  cloning?: boolean;
  onView?: () => void;
  onClone?: () => void;
}

function formatMoney(value?: number | null): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
}

/** Thẻ lịch trình đính kèm — phong cách "boarding pass" giống bản web. */
export function ItineraryAttachCard({ post, canClone = true, cloning, onView, onClone }: ItineraryAttachCardProps) {
  const itineraryId = post.itineraryId ?? post.sharedPost?.itineraryId;
  if (!itineraryId) return null;

  const title = post.itineraryTitle || post.sharedPost?.itineraryTitle || 'Lịch trình chi tiết';
  const destination = post.itineraryDestination || post.sharedPost?.itineraryDestination;
  const duration = post.itineraryDuration || post.sharedPost?.itineraryDuration;
  const budget = post.itineraryBudget ?? post.sharedPost?.itineraryBudget;
  const places = post.itineraryPlacesCount ?? post.sharedPost?.itineraryPlacesCount;
  const isAi = post.itineraryIsAi ?? post.sharedPost?.itineraryIsAi;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onView}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Lịch trình: ${title}. Nhấn để xem chi tiết.`}>
      <View style={styles.accent} />
      <View style={styles.body}>
        <View style={styles.mainRow}>
          <View style={styles.contentCol}>
            <View style={styles.topRow}>
              <View style={styles.pill}>
                <FontAwesome name="map-o" size={10} color={WF_PAPER.clay} />
                <Text style={styles.pillText}>Lịch trình</Text>
              </View>
              {duration ? (
                <Text style={styles.durationBadge}>{duration}</Text>
              ) : null}
              {isAi ? (
                <View style={styles.aiPill}>
                  <Text style={styles.aiPillText}>AI tạo</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>

            <View style={styles.metaLine}>
              {budget != null ? (
                <Text style={styles.budgetText}>{formatMoney(budget)} đ</Text>
              ) : null}
              {places != null && places > 0 ? (
                <>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.subMetaText}>{places} điểm dừng</Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={styles.rightActions}>
            {canClone ? (
              <TouchableOpacity
                style={[styles.miniCloneBtn, cloning && { opacity: 0.7 }]}
                activeOpacity={0.8}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onClone?.();
                }}
                disabled={cloning}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                {cloning ? (
                  <ActivityIndicator size="small" color={WF_PAPER.clay} />
                ) : (
                  <>
                    <FontAwesome name="copy" size={11} color={WF_PAPER.clay} />
                    <Text style={styles.miniCloneText}>Chép</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
            <FontAwesome name="angle-right" size={16} color={WF_PAPER.clay} style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: WF_PAPER.bg,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E8D5C9',
    overflow: 'hidden',
  },
  accent: {
    width: 5,
    backgroundColor: WF_PAPER.clay,
  },
  body: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFDF8',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  pillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: WF_PAPER.clayDark,
    letterSpacing: 0.2,
  },
  durationBadge: {
    fontSize: 9.5,
    fontWeight: '700',
    color: WF_PAPER.clayDark,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E8D5C9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  aiPill: {
    backgroundColor: WF_PAPER.clayLight,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: WF_PAPER.clay,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  budgetText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
  dot: {
    fontSize: 10,
    color: WF_PAPER.inkMuted,
  },
  subMetaText: {
    fontSize: 11,
    color: WF_PAPER.inkMuted,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  miniCloneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: 4,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  miniCloneText: {
    fontSize: 10,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
});
