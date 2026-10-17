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
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { placeApi, PlaceItem, API_BASE_URL, itineraryApi, ItineraryItem } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';

const CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: 'compass' },
  { id: 'beach', label: 'Biển đảo', icon: 'sun-o' },
  { id: 'mountain', label: 'Núi rừng', icon: 'tree' },
  { id: 'culture', label: 'Văn hóa', icon: 'university' },
  { id: 'food', label: 'Ẩm thực', icon: 'cutlery' },
  { id: 'resort', label: 'Nghỉ dưỡng', icon: 'bed' },
];

export default function ExploreScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);

  // Modal Chi tiết Địa điểm
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);

  // Modal Chọn Lịch Trình để thêm địa điểm
  const [addToPlanModalVisible, setAddToPlanModalVisible] = useState<boolean>(false);
  const [myItineraries, setMyItineraries] = useState<ItineraryItem[]>([]);
  const [loadingItineraries, setLoadingItineraries] = useState<boolean>(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  const fetchPlaces = useCallback(async () => {
    try {
      setHasConnectionError(false);
      const categoryParam = selectedCategory === 'all' ? undefined : CATEGORIES.find(c => c.id === selectedCategory)?.label;
      const data = await placeApi.getAllPlaces({
        keyword: searchKeyword.trim() || undefined,
        category: categoryParam,
      });
      setPlaces(data || []);
    } catch (err: any) {
      console.warn('Backend connection notice:', err.message || err);
      setHasConnectionError(true);
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

  const handleOpenPlaceDetail = (place: PlaceItem) => {
    setSelectedPlace(place);
    setDetailModalVisible(true);
  };

  const handleOpenAddToPlan = async () => {
    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập ở tab "Tài khoản" để thêm địa điểm vào Lịch trình cá nhân!');
      return;
    }

    setAddToPlanModalVisible(true);
    setLoadingItineraries(true);
    try {
      const list = await itineraryApi.getMyItineraries();
      setMyItineraries(list || []);
    } catch (e) {
      console.warn('Error loading itineraries for add place', e);
    } finally {
      setLoadingItineraries(false);
    }
  };

  const handleConfirmAddPlaceToItinerary = async (itinerary: ItineraryItem) => {
    if (!selectedPlace) return;

    try {
      await itineraryApi.addDetail(itinerary.id, {
        itineraryId: itinerary.id,
        placeId: selectedPlace.id,
        locationName: selectedPlace.name,
        locationAddress: selectedPlace.address || selectedPlace.city,
        category: selectedPlace.category,
        dayNumber: selectedDayNumber,
        note: `Thêm từ Khám phá địa điểm: ${selectedPlace.name}`,
      });

      Alert.alert(
        'Đã thêm thành công! 🎉',
        `"${selectedPlace.name}" đã được thêm vào Ngày ${selectedDayNumber} của chuyến đi "${itinerary.title}".`
      );
      setAddToPlanModalVisible(false);
      setDetailModalVisible(false);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể thêm vào lịch trình');
    }
  };

  const renderPlaceCard = ({ item }: { item: PlaceItem }) => {
    const imageUrl = item.coverImage || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleOpenPlaceDetail(item)}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category || 'Địa điểm'}</Text>
          </View>
          <TouchableOpacity style={styles.favBtn} activeOpacity={0.7}>
            <FontAwesome name="heart-o" size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
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
            <FontAwesome name="map-marker" size={13} color={theme.tint} />
            <Text style={[styles.locationText, { color: theme.textMuted }]} numberOfLines={1}>
              {item.city || item.address || 'Việt Nam'}
            </Text>
          </View>

          {item.description ? (
            <Text style={[styles.cardDescription, { color: theme.textMuted }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Search Header Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <FontAwesome name="search" size={16} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Tìm địa điểm, thành phố du lịch..."
            placeholderTextColor={theme.textMuted}
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            onSubmitEditing={fetchPlaces}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
          />
          {searchKeyword ? (
            <TouchableOpacity onPress={() => setSearchKeyword('')} style={{ padding: 4 }}>
              <FontAwesome name="times-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Categories Horizontal Bar */}
      <View style={styles.categoryContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryContent}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.id;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedCategory(item.id)}
                style={[
                  styles.categoryPill,
                  isSelected
                    ? { backgroundColor: theme.tint, borderColor: theme.tint }
                    : { backgroundColor: theme.card, borderColor: theme.border },
                ]}>
                <FontAwesome
                  name={item.icon as any}
                  size={13}
                  color={isSelected ? '#FFFFFF' : theme.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.categoryText,
                    isSelected ? { color: '#FFFFFF', fontWeight: '700' } : { color: theme.text },
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Content Area */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.statusHint, { color: theme.textMuted }]}>Đang nạp địa điểm du lịch...</Text>
        </View>
      ) : hasConnectionError ? (
        <View style={styles.centerBox}>
          <View style={[styles.alertCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.alertIconWrapper}>
              <FontAwesome name="wifi" size={28} color={theme.tint} />
            </View>
            <Text style={[styles.alertTitle, { color: theme.text }]}>Đang kết nối Cloud Railway</Text>
            <Text style={[styles.alertDesc, { color: theme.textMuted }]}>
              Máy chủ Backend tại:
            </Text>
            <View style={[styles.endpointBox, { backgroundColor: theme.badge }]}>
              <Text style={[styles.endpointText, { color: theme.tint }]}>{API_BASE_URL}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.retryButton, { backgroundColor: theme.tint }]}
              onPress={() => {
                setLoading(true);
                fetchPlaces();
              }}>
              <FontAwesome name="refresh" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Tải lại dữ liệu</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPlaceCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.tint]} />}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <FontAwesome name="compass" size={48} color={theme.textMuted} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Không tìm thấy địa điểm</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
                Thử tìm với từ khóa hoặc danh mục khác xem sao nhé!
              </Text>
            </View>
          }
        />
      )}

      {/* ─── MODAL CHI TIẾT ĐỊA ĐIỂM ────────────────────────────── */}
      <Modal visible={detailModalVisible} animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.backBtn}>
              <FontAwesome name="chevron-left" size={16} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.detailHeaderTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedPlace?.name || 'Chi tiết địa điểm'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedPlace ? (
              <>
                <Image
                  source={{ uri: selectedPlace.coverImage || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80' }}
                  style={styles.detailHeroImage}
                  resizeMode="cover"
                />

                <View style={styles.detailBody}>
                  <View style={styles.detailTagRow}>
                    <View style={[styles.tagPill, { backgroundColor: theme.badge }]}>
                      <Text style={[styles.tagText, { color: theme.tint }]}>{selectedPlace.category || 'Địa điểm'}</Text>
                    </View>
                    {selectedPlace.rating ? (
                      <View style={styles.detailRatingBadge}>
                        <FontAwesome name="star" size={14} color="#F59E0B" />
                        <Text style={styles.detailRatingText}>{selectedPlace.rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.detailName, { color: theme.text }]}>{selectedPlace.name}</Text>

                  <View style={styles.detailInfoRow}>
                    <FontAwesome name="map-marker" size={15} color={theme.tint} />
                    <Text style={[styles.detailInfoText, { color: theme.textMuted }]}>
                      {selectedPlace.address || selectedPlace.city || 'Việt Nam'}
                    </Text>
                  </View>

                  {selectedPlace.openingHours ? (
                    <View style={styles.detailInfoRow}>
                      <FontAwesome name="clock-o" size={15} color={theme.tint} />
                      <Text style={[styles.detailInfoText, { color: theme.textMuted }]}>
                        {selectedPlace.openingHours}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={[styles.sectionHeading, { color: theme.text }]}>Giới thiệu địa điểm</Text>
                  <Text style={[styles.detailDescription, { color: theme.textMuted }]}>
                    {selectedPlace.description || 'Chưa có thông tin mô tả chi tiết cho địa điểm này.'}
                  </Text>

                  {/* Nút Thêm Vào Plan */}
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={[styles.addToPlanMainBtn, { backgroundColor: theme.tint }]}
                    onPress={handleOpenAddToPlan}>
                    <FontAwesome name="calendar-plus-o" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.addToPlanMainBtnText}>Thêm vào Plan chuyến đi</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>

        {/* ─── SUB-MODAL CHỌN LỊCH TRÌNH ĐỂ THÊM VÀO ────────────── */}
        <Modal visible={addToPlanModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Chọn Lịch Trình Của Bạn
                </Text>
                <TouchableOpacity onPress={() => setAddToPlanModalVisible(false)}>
                  <FontAwesome name="times" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                Thêm "{selectedPlace?.name}" vào:
              </Text>

              {/* Chọn Ngày */}
              <View style={styles.dayPickRow}>
                <Text style={[styles.dayPickLabel, { color: theme.text }]}>Chọn ngày:</Text>
                {[1, 2, 3, 4, 5].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dayPickChip,
                      selectedDayNumber === d
                        ? { backgroundColor: theme.tint }
                        : { backgroundColor: theme.badge },
                    ]}
                    onPress={() => setSelectedDayNumber(d)}>
                    <Text
                      style={[
                        styles.dayPickChipText,
                        selectedDayNumber === d ? { color: '#FFFFFF', fontWeight: '700' } : { color: theme.text },
                      ]}>
                      N{d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {loadingItineraries ? (
                <ActivityIndicator size="small" color={theme.tint} style={{ marginVertical: 20 }} />
              ) : myItineraries.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.textMuted, textAlign: 'center', marginBottom: 12 }}>
                    Bạn chưa có lịch trình nào. Hãy vào tab "Lịch trình" để tạo chuyến đi trước nhé!
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  {myItineraries.map((itinerary) => (
                    <TouchableOpacity
                      key={itinerary.id}
                      style={[styles.itineraryPickItem, { borderColor: theme.border }]}
                      onPress={() => handleConfirmAddPlaceToItinerary(itinerary)}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itineraryPickTitle, { color: theme.text }]}>
                          {itinerary.title}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textMuted }}>
                          📍 {itinerary.destination}
                        </Text>
                      </View>
                      <FontAwesome name="chevron-right" size={14} color={theme.tint} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  categoryContainer: {
    paddingVertical: 6,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 190,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  favBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
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
    letterSpacing: -0.2,
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
    gap: 5,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  statusHint: {
    marginTop: 12,
    fontSize: 14,
  },
  alertCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  alertIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  alertDesc: {
    fontSize: 13,
    textAlign: 'center',
  },
  endpointBox: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 10,
  },
  endpointText: {
    fontSize: 12,
    fontWeight: '600',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  // Detail Modal styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 8,
  },
  detailHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  detailHeroImage: {
    width: '100%',
    height: 250,
  },
  detailBody: {
    padding: 18,
  },
  detailTagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailRatingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  detailName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailInfoText: {
    fontSize: 14,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  addToPlanMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addToPlanMainBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  // Modal Chọn Lịch Trình
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 14,
  },
  dayPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dayPickLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayPickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dayPickChipText: {
    fontSize: 12,
  },
  itineraryPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  itineraryPickTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
});
