import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/Themed';
import { DS_COLOR, DS_RADIUS } from '@/constants/DesignSystem';

export interface CuratedCollection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  category?: string;
  city?: string;
  keyword?: string;
  gradient: [string, string];
}

export const CURATED_COLLECTIONS: CuratedCollection[] = [
  {
    id: 'cafe-cloud',
    title: 'Cafe View Mây',
    subtitle: 'Đà Lạt · Tam Đảo',
    icon: '☕',
    category: 'Nghỉ dưỡng',
    keyword: 'cafe',
    gradient: ['#78350F', '#B45309'],
  },
  {
    id: 'camping-trekking',
    title: 'Cắm Trại & Mây',
    subtitle: 'Tà Xùa · Sa Pa',
    icon: '🏕️',
    category: 'Thiên nhiên',
    keyword: 'cắm trại',
    gradient: ['#065F46', '#047857'],
  },
  {
    id: 'sea-island',
    title: 'Biển Xanh Nắng Gió',
    subtitle: 'Phú Quốc · Côn Đảo',
    icon: '🌊',
    category: 'Thiên nhiên',
    keyword: 'biển',
    gradient: ['#0369A1', '#0284C7'],
  },
  {
    id: 'heritage-ancient',
    title: 'Phố Cổ & Di Sản',
    subtitle: 'Hội An · Tràng An',
    icon: '🏮',
    category: 'Di tích',
    keyword: 'phố cổ',
    gradient: ['#831843', '#BE185D'],
  },
  {
    id: 'photo-spots',
    title: 'Góc Chụp Triệu View',
    subtitle: 'Tọa độ sống ảo hot',
    icon: '📸',
    category: 'Check-in',
    gradient: ['#4C1D95', '#6D28D9'],
  },
  {
    id: 'luxury-resort',
    title: 'Nghỉ Dưỡng VIP',
    subtitle: 'Resort & Villa 5 sao',
    icon: '💎',
    category: 'Nghỉ dưỡng',
    gradient: ['#9A3412', '#C2410C'],
  },
];

interface CuratedCollectionsCarouselProps {
  selectedId: string | null;
  onSelect: (collection: CuratedCollection) => void;
}

export function CuratedCollectionsCarousel({
  selectedId,
  onSelect,
}: CuratedCollectionsCarouselProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Bộ Sưu Tập Tuyển Chọn</Text>
        <Text style={styles.sectionSubtitle}>Dành riêng cho bạn</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}>
        {CURATED_COLLECTIONS.map((item) => {
          const isSelected = selectedId === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => onSelect(item)}
              style={[styles.card, isSelected && styles.cardActive]}
              accessibilityRole="button"
              accessibilityLabel={`Bộ sưu tập ${item.title}`}>
              <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.cardContent}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <View style={styles.textWrap}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: DS_COLOR.ink,
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: DS_COLOR.inkMuted,
    fontWeight: '500',
  },
  scrollList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 146,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'transparent',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardActive: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.02 }],
  },
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  cardIcon: {
    fontSize: 18,
  },
  textWrap: {
    gap: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '500',
  },
});

