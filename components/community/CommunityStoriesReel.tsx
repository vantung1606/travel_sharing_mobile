import React, { useMemo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { PostItem } from '@/src/services/api';
import { DS_COLOR } from '@/constants/DesignSystem';

export interface StoryTopic {
  id: string;
  label: string;
  query: string;
  imageUrl?: string | null;
  count?: number | null;
}

const FALLBACK_DESTINATION_STORIES: StoryTopic[] = [
  {
    id: 'dalat',
    label: 'Đà Lạt',
    query: 'Đà Lạt',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'danang',
    label: 'Đà Nẵng',
    query: 'Đà Nẵng',
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'phuquoc',
    label: 'Phú Quốc',
    query: 'Phú Quốc',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'hagiang',
    label: 'Hà Giang',
    query: 'Hà Giang',
    imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'sapa',
    label: 'Sa Pa',
    query: 'Sa Pa',
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'ninhbinh',
    label: 'Ninh Bình',
    query: 'Ninh Bình',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'hoian',
    label: 'Hội An',
    query: 'Hội An',
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=300&q=80',
  },
];

interface CommunityStoriesReelProps {
  posts?: PostItem[];
  topLocations?: StoryTopic[];
  selectedQuery?: string;
  currentUserAvatar?: string | null;
  onCreatePress?: () => void;
  onSelectTopic: (story: StoryTopic) => void;
}

export function CommunityStoriesReel({
  posts = [],
  topLocations = [],
  selectedQuery = '',
  onSelectTopic,
}: CommunityStoriesReelProps) {
  const { width } = useWindowDimensions();
  const isSmall = width < 380;
  const ringSize = isSmall ? 54 : 60;
  const itemWidth = isSmall ? 64 : 72;
  const [failedImages, setFailedImages] = React.useState<Record<string, boolean>>({});

  // Ưu tiên dữ liệu thống kê toàn hệ thống & toàn thời gian từ Backend (/posts/top-locations)
  const realLocationStories = useMemo<StoryTopic[]>(() => {
    if (Array.isArray(topLocations) && topLocations.length > 0) {
      return topLocations;
    }
    if (!Array.isArray(posts) || posts.length === 0) return [];
    const map = new Map<string, StoryTopic>();
    posts.forEach((p) => {
      const loc = (p.locationTag || p.locationName || '').trim();
      if (!loc || loc.toLowerCase() === 'việt nam') return;
      const img =
        (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null) ||
        p.coverImage ||
        p.imageUrl ||
        null;
      const existing = map.get(loc);
      if (!existing) {
        map.set(loc, {
          id: loc,
          label: loc,
          query: loc,
          count: 1,
          imageUrl: img,
        });
      } else {
        existing.count = (existing.count || 0) + 1;
        if (!existing.imageUrl && img) {
          existing.imageUrl = img;
        }
      }
    });
    return Array.from(map.values())
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 10);
  }, [topLocations, posts]);

  const storiesToDisplay =
    realLocationStories.length > 0 ? realLocationStories : FALLBACK_DESTINATION_STORIES;
  const isAllSelected = !selectedQuery.trim();

  return (
    <View style={styles.container}>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isSmall && { paddingHorizontal: 12, gap: 10 }]}>
        {/* Nút Tất cả (Reset bộ lọc địa điểm, giống Web) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelectTopic({ id: 'all', label: 'Tất cả', query: '' })}
          style={[styles.storyItem, { width: itemWidth }]}
          accessibilityRole="button"
          accessibilityLabel="Xem tất cả bài viết">
          <View
            style={[
              styles.ringOuter,
              { width: ringSize, height: ringSize, borderRadius: ringSize / 2 },
              isAllSelected ? styles.ringActive : styles.ringIdle,
            ]}>
            <View style={styles.allInnerCircle}>
              <FontAwesome name="compass" size={isSmall ? 20 : 22} color="#B45309" />
            </View>
          </View>
          <Text
            style={[
              styles.storyLabel,
              isSmall && { fontSize: 10.5 },
              isAllSelected && styles.storyLabelActive,
            ]}
            numberOfLines={1}>
            Tất cả
          </Text>
        </TouchableOpacity>

        {/* Danh sách địa điểm dựa theo lượt bài đăng thực tế */}
        {storiesToDisplay.map((story) => {
          const isSelected =
            Boolean(selectedQuery.trim()) &&
            selectedQuery.toLowerCase().includes(story.query.toLowerCase());

          return (
            <TouchableOpacity
              key={story.id}
              activeOpacity={0.85}
              onPress={() =>
                onSelectTopic(
                  isSelected ? { id: 'all', label: 'Tất cả', query: '' } : story
                )
              }
              style={[styles.storyItem, { width: itemWidth }]}
              accessibilityRole="button"
              accessibilityLabel={`Xem bài viết tại ${story.label}`}>
              <View style={{ position: 'relative' }}>
                <View
                  style={[
                    styles.ringOuter,
                    { width: ringSize, height: ringSize, borderRadius: ringSize / 2 },
                    isSelected ? styles.ringActive : styles.ringIdle,
                  ]}>
                  <View style={styles.storyInnerBorder}>
                    {story.imageUrl &&
                    !failedImages[story.id] &&
                    !/\/video\/upload\//i.test(story.imageUrl) &&
                    !/\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(story.imageUrl) ? (
                      <Image
                        source={{ uri: story.imageUrl }}
                        style={styles.storyAvatar}
                        onError={() =>
                          setFailedImages((prev) => (prev[story.id] ? prev : { ...prev, [story.id]: true }))
                        }
                      />
                    ) : (
                      <View style={styles.fallbackAvatar}>
                        <FontAwesome name="map-marker" size={20} color="#B45309" />
                      </View>
                    )}
                  </View>
                </View>
                {story.count ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{story.count}</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.storyLabel,
                  isSmall && { fontSize: 10.5 },
                  isSelected && styles.storyLabelActive,
                ]}
                numberOfLines={1}>
                {story.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFDF8',
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 26, 21, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DS_COLOR.accent,
  },
  headerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E1A15',
    letterSpacing: -0.2,
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 12,
    alignItems: 'center',
  },
  storyItem: {
    alignItems: 'center',
  },
  ringOuter: {
    padding: 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringActive: {
    borderColor: DS_COLOR.accent,
  },
  ringIdle: {
    borderColor: 'rgba(30, 26, 21, 0.12)',
  },
  allInnerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#F3EDE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyInnerBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    padding: 1.5,
    backgroundColor: '#FFFDF8',
    overflow: 'hidden',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#F8F4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#1E1A15',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFDF8',
  },
  countBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F8F4EC',
  },
  storyLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '600',
    color: '#3B332A',
    textAlign: 'center',
  },
  storyLabelActive: {
    color: DS_COLOR.accent,
    fontWeight: '800',
  },
});
