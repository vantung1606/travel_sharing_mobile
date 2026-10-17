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
import { itineraryApi, ItineraryItem } from '@/src/services/api';

export default function ItineraryScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchItineraries = useCallback(async () => {
    try {
      setHasError(false);
      const data = await itineraryApi.getAllItineraries();
      setItineraries(data || []);
    } catch (err: any) {
      console.warn('Fetch itineraries notice:', err.message || err);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchItineraries();
  }, [fetchItineraries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItineraries();
  };

  const renderItem = ({ item }: { item: ItineraryItem }) => {
    const imageUrl = item.coverImage || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.imageBox}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.destinationBadge}>
            <FontAwesome name="map-marker" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.destinationText}>{item.destination || 'Điểm đến'}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            {item.daysCount ? (
              <View style={[styles.metaPill, { backgroundColor: theme.badge }]}>
                <FontAwesome name="calendar-o" size={12} color={theme.tint} />
                <Text style={[styles.metaText, { color: theme.text }]}>{item.daysCount} ngày</Text>
              </View>
            ) : null}

            {item.budget ? (
              <View style={[styles.metaPill, { backgroundColor: theme.badge }]}>
                <FontAwesome name="money" size={12} color="#F59E0B" />
                <Text style={[styles.metaText, { color: theme.text }]}>
                  {item.budget.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            ) : null}

            {item.authorName ? (
              <View style={[styles.metaPill, { backgroundColor: theme.badge }]}>
                <FontAwesome name="user-circle" size={12} color={theme.textMuted} />
                <Text style={[styles.metaText, { color: theme.textMuted }]}>{item.authorName}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.helperText, { color: theme.textMuted }]}>Đang nạp lịch trình...</Text>
        </View>
      ) : hasError ? (
        <View style={styles.centerBox}>
          <FontAwesome name="calendar" size={44} color={theme.textMuted} style={{ opacity: 0.5 }} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Chưa có kết nối máy chủ</Text>
          <Text style={[styles.errorSub, { color: theme.textMuted }]}>
            Lịch trình sẽ tự động hiển thị khi Backend Spring Boot được khởi động.
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: theme.tint }]}
            onPress={() => {
              setLoading(true);
              fetchItineraries();
            }}>
            <FontAwesome name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryText}>Tải lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={itineraries}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.tint]} />}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <FontAwesome name="calendar-check-o" size={44} color={theme.textMuted} style={{ opacity: 0.5 }} />
              <Text style={[styles.errorTitle, { color: theme.text }]}>Chưa có lịch trình</Text>
              <Text style={[styles.errorSub, { color: theme.textMuted }]}>
                Các chuyến đi được tạo trên Web sẽ hiển thị đồng bộ tại đây.
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
  card: {
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
  imageBox: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  destinationBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  destinationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
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
