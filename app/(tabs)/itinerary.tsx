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
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchItineraries = useCallback(async () => {
    try {
      setErrorMsg(null);
      // Lấy danh sách lịch trình từ Backend Spring Boot
      const data = await itineraryApi.getAllItineraries();
      setItineraries(data || []);
    } catch (err: any) {
      console.error('Fetch itineraries error:', err);
      setErrorMsg('Không thể tải lịch trình. Vui lòng kiểm tra lại kết nối!');
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
      <TouchableOpacity activeOpacity={0.88} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.destinationBadge}>
          <FontAwesome name="map-marker" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.destinationText}>{item.destination || 'Điểm đến'}</Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            {item.daysCount ? (
              <View style={styles.metaItem}>
                <FontAwesome name="calendar-o" size={13} color="#0D9488" />
                <Text style={styles.metaText}>{item.daysCount} ngày</Text>
              </View>
            ) : null}

            {item.budget ? (
              <View style={styles.metaItem}>
                <FontAwesome name="money" size={13} color="#F59E0B" />
                <Text style={styles.metaText}>{item.budget.toLocaleString('vi-VN')} đ</Text>
              </View>
            ) : null}

            {item.authorName ? (
              <View style={styles.metaItem}>
                <FontAwesome name="user-circle" size={13} color="#64748B" />
                <Text style={styles.metaText}>{item.authorName}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={[styles.helperText, { color: theme.text }]}>Đang tải lịch trình từ hệ thống...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerBox}>
          <FontAwesome name="exclamation-circle" size={40} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Lỗi kết nối</Text>
          <Text style={styles.errorSub}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchItineraries}>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <FontAwesome name="calendar" size={42} color="#94A3B8" />
              <Text style={[styles.helperText, { color: theme.text }]}>Chưa có lịch trình nào được tạo</Text>
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
  cardImage: {
    width: '100%',
    height: 160,
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
    marginBottom: 10,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
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
