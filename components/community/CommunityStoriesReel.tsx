import React from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { DS_COLOR } from '@/constants/DesignSystem';

export interface StoryTopic {
  id: string;
  label: string;
  query: string;
  imageUrl: string;
}

const FEATURED_STORIES: StoryTopic[] = [
  {
    id: 'dalat',
    label: 'Săn mây',
    query: 'Đà Lạt',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'phuquoc',
    label: 'Biển đảo',
    query: 'Phú Quốc',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'hoian',
    label: 'Phố cổ',
    query: 'Hội An',
    imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'food',
    label: 'Ẩm thực',
    query: 'ẩm thực',
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'hagiang',
    label: 'Phượt núi',
    query: 'Hà Giang',
    imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'healing',
    label: 'Chữa lành',
    query: 'chữa lành',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'sapa',
    label: 'Ruộng bậc thang',
    query: 'Sa Pa',
    imageUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=300&q=80',
  },
];

interface CommunityStoriesReelProps {
  currentUserAvatar?: string | null;
  onCreatePress: () => void;
  onSelectTopic: (story: StoryTopic) => void;
}

export function CommunityStoriesReel({
  currentUserAvatar,
  onCreatePress,
  onSelectTopic,
}: CommunityStoriesReelProps) {
  const { width } = useWindowDimensions();
  const isSmall = width < 380;
  const ringSize = isSmall ? 56 : 64;
  const itemWidth = isSmall ? 62 : 70;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isSmall && { paddingHorizontal: 10, gap: 10 }]}>
        {/* 1. Nút Tạo Khoảnh Khắc Của Tôi */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onCreatePress}
          style={[styles.storyItem, { width: itemWidth }]}
          accessibilityRole="button"
          accessibilityLabel="Đăng bài viết mới">
          <View style={[styles.myStoryWrap, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
            {currentUserAvatar ? (
              <Image source={{ uri: currentUserAvatar }} style={styles.storyAvatar} />
            ) : (
              <View style={styles.fallbackAvatar}>
                <FontAwesome name="user" size={isSmall ? 20 : 24} color="#94A3B8" />
              </View>
            )}
            <View style={styles.plusBadge}>
              <FontAwesome name="plus" size={9} color="#FFFFFF" />
            </View>
          </View>
          <Text style={[styles.myStoryLabel, isSmall && { fontSize: 10.5 }]} numberOfLines={1}>
            Tạo bài
          </Text>
        </TouchableOpacity>

        {/* 2. Danh Sách Stories Xu Hướng */}
        {FEATURED_STORIES.map((story) => (
          <TouchableOpacity
            key={story.id}
            activeOpacity={0.85}
            onPress={() => onSelectTopic(story)}
            style={[styles.storyItem, { width: itemWidth }]}
            accessibilityRole="button"
            accessibilityLabel={`Xem chủ đề ${story.label}`}>
            <LinearGradient
              colors={['#FF5722', '#F59E0B', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.storyRingGradient,
                { width: ringSize, height: ringSize, borderRadius: ringSize / 2 },
              ]}>
              <View style={styles.storyInnerBorder}>
                <Image source={{ uri: story.imageUrl }} style={styles.storyAvatar} />
              </View>
            </LinearGradient>
            <Text style={[styles.storyLabel, isSmall && { fontSize: 10.5 }]} numberOfLines={1}>
              {story.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 23, 42, 0.06)',
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 12,
    alignItems: 'center',
  },
  storyItem: {
    alignItems: 'center',
  },
  myStoryWrap: {
    padding: 2,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
  },
  storyRingGradient: {
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 2,
  },
  storyInnerBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    padding: 2,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF5722',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  myStoryLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  storyLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
});
