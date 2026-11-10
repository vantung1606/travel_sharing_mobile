import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
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
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* 1. Nút Tạo Khoảnh Khắc Của Tôi */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onCreatePress}
          style={styles.storyItem}
          accessibilityRole="button"
          accessibilityLabel="Đăng bài viết mới">
          <View style={styles.myStoryRing}>
            {currentUserAvatar ? (
              <Image source={{ uri: currentUserAvatar }} style={styles.storyAvatar} />
            ) : (
              <View style={styles.fallbackAvatar}>
                <FontAwesome name="user" size={24} color="#94A3B8" />
              </View>
            )}
            <View style={styles.plusBadge}>
              <FontAwesome name="plus" size={10} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.myStoryLabel} numberOfLines={1}>
            Tạo bài
          </Text>
        </TouchableOpacity>

        {/* 2. Danh Sách Stories Xu Hướng */}
        {FEATURED_STORIES.map((story) => (
          <TouchableOpacity
            key={story.id}
            activeOpacity={0.85}
            onPress={() => onSelectTopic(story)}
            style={styles.storyItem}
            accessibilityRole="button"
            accessibilityLabel={`Xem chủ đề ${story.label}`}>
            <View style={styles.storyRing}>
              <Image source={{ uri: story.imageUrl }} style={styles.storyAvatar} />
            </View>
            <Text style={styles.storyLabel} numberOfLines={1}>
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
    borderBottomColor: '#F1F5F9',
  },
  scrollContent: {
    paddingHorizontal: 14,
    gap: 14,
    alignItems: 'center',
  },
  storyItem: {
    alignItems: 'center',
    width: 66,
  },
  myStoryRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    borderWidth: 2.5,
    borderColor: DS_COLOR.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS_COLOR.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myStoryLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '700',
    color: DS_COLOR.ink,
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
