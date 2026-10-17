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
  SafeAreaView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { postApi, PostItem } from '@/src/services/api';

export default function CommunityScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setErrorMsg(null);
      const data = await postApi.getCommunityPosts();
      setPosts(data || []);
    } catch (err: any) {
      console.error('Fetch posts error:', err);
      setErrorMsg('Không thể tải bài viết cộng đồng.');
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
              {item.authorName || 'Người dùng Wayfare'}
            </Text>
            {item.locationName ? (
              <View style={styles.locationBadge}>
                <FontAwesome name="map-marker" size={11} color="#0D9488" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.locationName}
                </Text>
              </View>
            ) : null}
          </View>
          {item.category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category}</Text>
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
          <TouchableOpacity style={styles.actionBtn}>
            <FontAwesome
              name={item.isLiked ? 'heart' : 'heart-o'}
              size={18}
              color={item.isLiked ? '#EF4444' : '#64748B'}
            />
            <Text style={[styles.actionCount, item.isLiked ? { color: '#EF4444' } : {}]}>
              {item.likesCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <FontAwesome name="comment-o" size={18} color="#64748B" />
            <Text style={styles.actionCount}>{item.commentsCount || 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <FontAwesome name="share-square-o" size={18} color="#64748B" />
            <Text style={styles.actionCount}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={[styles.helperText, { color: theme.text }]}>Đang tải bảng tin du lịch...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerBox}>
          <FontAwesome name="exclamation-circle" size={40} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Lỗi kết nối</Text>
          <Text style={styles.errorSub}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPosts}>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <FontAwesome name="commenting-o" size={42} color="#94A3B8" />
              <Text style={[styles.helperText, { color: theme.text }]}>Chưa có bài viết nào trên cộng đồng</Text>
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
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
    backgroundColor: '#E2E8F0',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
  },
  categoryPill: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  postBody: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#E2E8F0',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 60,
  },
  helperText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  errorSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#0D9488',
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
