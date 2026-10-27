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
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.pill}>
            <FontAwesome name="map-o" size={11} color={WF_PAPER.clay} />
            <Text style={styles.pillText}>Lịch trình chi tiết</Text>
          </View>
          {isAi ? (
            <View style={styles.aiPill}>
              <Text style={styles.aiPillText}>AI tạo</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {destination ? (
          <View style={styles.metaRow}>
            <FontAwesome name="map-marker" size={11} color={WF_PAPER.inkMuted} />
            <Text style={styles.metaText} numberOfLines={1}>
              {destination}
            </Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          {duration ? (
            <View style={styles.statChip}>
              <FontAwesome name="clock-o" size={10} color={WF_PAPER.clayDark} />
              <Text style={styles.statText}>{duration}</Text>
            </View>
          ) : null}
          {places != null && places > 0 ? (
            <View style={styles.statChip}>
              <FontAwesome name="map-pin" size={10} color={WF_PAPER.clayDark} />
              <Text style={styles.statText}>{places} điểm dừng</Text>
            </View>
          ) : null}
          {budget != null ? (
            <View style={styles.statChip}>
              <FontAwesome name="money" size={10} color={WF_PAPER.clayDark} />
              <Text style={styles.statText}>{formatMoney(budget)} đ</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} activeOpacity={0.85} onPress={onView}>
            <FontAwesome name="eye" size={12} color={WF_PAPER.clayDark} />
            <Text style={styles.btnGhostText}>Xem chi tiết</Text>
          </TouchableOpacity>
          {canClone ? (
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, cloning && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={onClone}
              disabled={cloning}>
              {cloning ? (
                <ActivityIndicator size="small" color="#FFFDF8" />
              ) : (
                <>
                  <FontAwesome name="copy" size={12} color="#FFFDF8" />
                  <Text style={styles.btnPrimaryText}>Sao chép Tour</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
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
    padding: 13,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFDF8',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    color: WF_PAPER.clayDark,
    letterSpacing: 0.2,
  },
  aiPill: {
    backgroundColor: WF_PAPER.clayLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: WF_PAPER.clay,
  },
  title: {
    fontSize: 14.5,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    fontFamily: SERIF_FONT,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    flex: 1,
    fontSize: 11.5,
    color: WF_PAPER.inkMuted,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 9,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFDF8',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F6E6DD',
  },
  statText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: WF_PAPER.inkSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 11,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 5,
  },
  btnGhost: {
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  btnGhostText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_PAPER.clayDark,
  },
  btnPrimary: {
    backgroundColor: WF_PAPER.clay,
  },
  btnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFDF8',
  },
});
