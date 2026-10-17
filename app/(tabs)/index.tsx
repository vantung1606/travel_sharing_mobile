import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { placeApi, PlaceItem, API_BASE_URL } from '@/src/services/api';

const CATEGORIES = ['Tất cả', 'Biển đảo', 'Núi rừng', 'Văn hóa', 'Ẩm thực', 'Nghỉ dưỡng'];

export default function ExploreScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPlaces = useCallback(async () => {
    try {
      setErrorMsg(null);
      const categoryParam = selectedCategory === 'Tất cả' ? undefined : selectedCategory;
      const data = await placeApi.getAllPlaces({
        keyword: searchKeyword.trim() || undefined,
        category: categoryParam,
      });
      setPlaces(data || []);
    } catch (err: any) {
      console.error('Fetch places error:', err);
      setErrorMsg('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchKeyword, selectedCategory]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlaces();
  };

  const renderPlaceCard = ({ item }: { item: PlaceItem }) => {
    const imageUrl = item.coverImage || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';

    return (
      <TouchableOpacity activeOpacity={0.85} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{item.category || 'Địa điểm'}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.rating ? (
              <View style={styles.ratingBadge}>
                <FontAwesome name="star" size={13} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.locationRow}>
            <FontAwesome name="map-marker" size={14} color="#0D9488" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.city || item.address || 'Việt Nam'}
            </Text>
          </View>
          {item.description ? (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Header */}
      <View style={styles.headerSection}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <FontAwesome name="search" size={16} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Tìm kiếm địa điểm, thành phố..."
            placeholderTextColor="#94A3B8"
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            onSubmitEditing={fetchPlaces}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
          />
          {searchKeyword ? (
            <TouchableOpacity onPress={() => setSearchKeyword('')}>
              <FontAwesome name="times-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Server Indicator */}
        <View style={styles.serverInfoRow}>
          <View style={styles.statusDot} />
          <Text style={styles.serverText} numberOfLines={1}>
            API: {API_BASE_URL}
          </Text>
        </View>

        {/* Categories Horizontal Filter */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item)}
                style={[
                  styles.categoryChip,
                  isSelected
                    ? { backgroundColor: '#0D9488', borderColor: '#0D9488' }
                    : { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected ? { color: '#FFFFFF', fontWeight: '700' } : { color: theme.text },
                  ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0D9488" />
          <Text style={[styles.helperText, { color: theme.text }]}>Đang kết nối đến máy chủ...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerBox}>
          <FontAwesome name="exclamation-circle" size={42} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Kết nối thất bại</Text>
          <Text style={styles.errorSub}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPlaces}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPlaceCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <FontAwesome name="folder-open-o" size={40} color="#94A3B8" />
              <Text style={[styles.helperText, { color: theme.text }]}>Chưa có địa điểm nào phù hợp</Text>
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
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  serverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  serverText: {
    fontSize: 11,
    color: '#64748B',
  },
  categoryList: {
    paddingVertical: 4,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    height: 180,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    marginTop: 40,
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
