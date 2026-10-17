import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { postApi, PostItem } from '@/src/services/api';

export default function CommunityScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchPosts = useCallback(async () => {
    try {
      setHasError(false);
      const data = await postApi.getCommunityPosts();
      setPosts(data || []);
    } catch (err: any) {
      console.warn('Fetch posts notice:', err.message || err);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const renderPost = ({ item }: { item: PostItem }) => {
    const avatarUrl = item.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
    const postImage = item.coverImage || (item.images && item.images.length > 0 ? item.images[0] : null);

    return (
      <View style={[styles.postCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Author Header */}
        <View style={styles.authorRow}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View style={styles.authorInfo}>
            <Text style={[styles.authorName, { color: theme.text }]}>
              {item.authorName || 'Thành viên Wayfare'}
            </Text>
            {item.locationName ? (
              <View style={styles.locationBadge}>
                <FontAwesome name="map-marker" size={11} color={theme.tint} />
                <Text style={[styles.locationText, { color: theme.textMuted }]} numberOfLines={1}>
                  {item.locationName}
                </Text>
              </View>
            ) : null}
          </View>
          {item.category ? (
            <View style={[styles.categoryPill, { backgroundColor: theme.badge }]}>
              <Text style={[styles.categoryPillText, { color: theme.tint }]}>{item.category}</Text>
            </View>
          ) : null}
        </View>

        {/* Post Content */}
        {item.title ? (
          <Text style={[styles.postTitle, { color: theme.text }]}>{item.title}</Text>
        ) : null}

        <Text style={[styles.postBody, { color: theme.text }]} numberOfLines={4}>
          {item.content}
        </Text>

        {/* Post Image */}
        {postImage ? (
          <Image source={{ uri: postImage }} style={styles.postImage} resizeMode="cover" />
        ) : null}

        {/* Footer Actions */}
        <View style={[styles.footerRow, { borderTopColor: theme.border }]}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <FontAwesome
              name={item.isLiked ? 'heart' : 'heart-o'}
              size={17}
              color={item.isLiked ? '#EF4444' : theme.textMuted}
            />
            <Text style={[styles.actionCount, { color: item.isLiked ? '#EF4444' : theme.textMuted }]}>
              {item.likesCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <FontAwesome name="comment-o" size={17} color={theme.textMuted} />
            <Text style={[styles.actionCount, { color: theme.textMuted }]}>
              {item.commentsCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <FontAwesome name="share-square-o" size={17} color={theme.textMuted} />
            <Text style={[styles.actionCount, { color: theme.textMuted }]}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.helperText, { color: theme.textMuted }]}>Đang nạp bảng tin cộng đồng...</Text>
        </View>
      ) : hasError ? (
        <View style={styles.centerBox}>
          <FontAwesome name="globe" size={44} color={theme.textMuted} style={{ opacity: 0.5 }} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Chưa có kết nối máy chủ</Text>
          <Text style={[styles.errorSub, { color: theme.textMuted }]}>
            Bảng tin bài viết sẽ xuất hiện khi Backend Spring Boot được khởi động.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.tint }]}
            onPress={() => {
              setLoading(true);
              fetchPosts();
            }}>
            <FontAwesome name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryText}>Tải lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.tint]} />}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <FontAwesome name="comments-o" size={44} color={theme.textMuted} style={{ opacity: 0.5 }} />
              <Text style={[styles.errorTitle, { color: theme.text }]}>Chưa có bài viết nào</Text>
              <Text style={[styles.errorSub, { color: theme.textMuted }]}>
                Hãy là người đầu tiên chia sẻ khoảnh khắc du lịch tuyệt vời!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    gap: 16,
  },
  postCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    backgroundColor: '#334155',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  postBody: {
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#1E293B',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  helperText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
  },
  errorSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
