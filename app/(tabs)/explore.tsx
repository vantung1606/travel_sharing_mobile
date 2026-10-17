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
import { WF_COLORS } from '@/constants/Colors';
import { placeApi, PlaceItem, API_BASE_URL, itineraryApi, ItineraryItem } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';

// Trạm thời tiết du lịch nhanh (Bê nguyên xi từ ExploreHeader của Web)
const WEATHER_TICKERS = [
  { city: 'Đà Lạt', temp: '18°C', icon: '🌫️', status: 'Se lạnh săn mây' },
  { city: 'Sa Pa', temp: '16°C', icon: '⛅', status: 'Sương mù mây ngàn' },
  { city: 'Phú Quốc', temp: '29°C', icon: '☀️', status: 'Nắng ấm biển êm' },
  { city: 'Đà Nẵng', temp: '26°C', icon: '🌤️', status: 'Gió biển dễ chịu' },
  { city: 'Hà Giang', temp: '21°C', icon: '🌾', status: 'Mát mẻ view đèo' },
  { city: 'Ninh Bình', temp: '23°C', icon: '🛶', status: 'Non nước thanh bình' },
];

// Danh mục du lịch chuẩn 100% bản Web
const WEB_CATEGORIES = [
  { id: 'all', label: 'Tất cả', icon: 'compass', count: '100+' },
  { id: 'scenic', label: 'Danh Lam & Thắng Cảnh', icon: 'tree', count: '24' },
  { id: 'heritage', label: 'Di Tích Lịch Sử', icon: 'university', count: '18' },
  { id: 'beach', label: 'Bãi Biển & Đảo', icon: 'sun-o', count: '32' },
  { id: 'food', label: 'Ẩm Thực Bản Địa', icon: 'cutlery', count: '45' },
  { id: 'cafe', label: 'Cafe & Check-in', icon: 'coffee', count: '29' },
  { id: 'market', label: 'Chợ & Phố Đi Bộ', icon: 'shopping-bag', count: '15' },
];

export default function ExploreScreen() {
  const [exploreLayer, setExploreLayer] = useState<'spots' | 'destinations'>('spots');
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);

  // Modal Chi tiết Địa điểm
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);

  // Modal Chọn Lịch Trình để thêm địa điểm
  const [addToPlanModalVisible, setAddToPlanModalVisible] = useState<boolean>(false);
  const [myItineraries, setMyItineraries] = useState<ItineraryItem[]>([]);
  const [loadingItineraries, setLoadingItineraries] = useState<boolean>(false);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  // Wishlist
  const [savedPlaces, setSavedPlaces] = useState<Record<number, boolean>>({});

  const fetchPlaces = useCallback(async () => {
    try {
      setHasConnectionError(false);
      const categoryParam = selectedCategory === 'Tất cả' ? undefined : selectedCategory;
      const data = await placeApi.getAllPlaces({
        keyword: searchQuery.trim() || undefined,
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
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlaces();
  };

  const toggleSave = (id: number) => {
    setSavedPlaces(prev => ({ ...prev, [id]: !prev[id] }));
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
        note: `Thêm từ Khám phá: ${selectedPlace.name}`,
      });

      Alert.alert(
        'Đã thêm thành công! 🎉',
        `"${selectedPlace.name}" đã được đưa vào Ngày ${selectedDayNumber} của chuyến đi "${itinerary.title}".`
      );
      setAddToPlanModalVisible(false);
      setDetailModalVisible(false);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể thêm vào lịch trình');
    }
  };

  const renderPlaceCard = ({ item }: { item: PlaceItem }) => {
    const imageUrl = item.coverImage || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80';
    const isSaved = !!savedPlaces[item.id];

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => handleOpenPlaceDetail(item)}
        style={styles.card}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          
          {/* Badge Thành phố & Danh mục */}
          <View style={styles.badgeTopLeft}>
            <View style={styles.cityPill}>
              <FontAwesome name="map-marker" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.cityPillText}>{item.city || 'Việt Nam'}</Text>
            </View>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category || 'Địa điểm'}</Text>
            </View>
          </View>

          {/* Nút yêu thích */}
          <TouchableOpacity
            style={[styles.favBtn, isSaved && { backgroundColor: '#FEE2E2' }]}
            activeOpacity={0.7}
            onPress={() => toggleSave(item.id)}>
            <FontAwesome
              name={isSaved ? 'heart' : 'heart-o'}
              size={15}
              color={isSaved ? '#EF4444' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
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
            <FontAwesome name="map-marker" size={12} color={WF_COLORS.slate400} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.address || `${item.city}, Việt Nam`}
            </Text>
          </View>

          {item.description ? (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Card Footer Actions */}
          <View style={styles.cardFooterRow}>
            <View style={styles.priceTag}>
              <Text style={styles.priceTagText}>
                {item.priceLevel ? `Chi phí: ${item.priceLevel}` : 'Miễn phí tham quan'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.cardAddPlanBtn}
              onPress={() => {
                setSelectedPlace(item);
                handleOpenAddToPlan();
              }}>
              <FontAwesome name="plus" size={11} color={WF_COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.cardAddPlanBtnText}>Thêm vào Plan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={places}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPlaceCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[WF_COLORS.primary]} />}
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            {/* 1. Breadcrumb Navigation chuẩn Web */}
            <View style={styles.breadcrumbRow}>
              <FontAwesome name="compass" size={12} color={WF_COLORS.primary} />
              <Text style={styles.breadcrumbLink}>Trang chủ</Text>
              <Text style={styles.breadcrumbDivider}>/</Text>
              <Text style={styles.breadcrumbCurrent}>Khám phá</Text>
            </View>

            {/* 2. Page Title & Subtitle */}
            <View style={styles.titleSection}>
              <Text style={styles.pageTitle}>Khám Phá Điểm Đến</Text>
              <Text style={styles.pageSubtitle}>
                Theo dõi thời tiết thực tế & tọa độ du lịch trên khắp 63 tỉnh thành Việt Nam
              </Text>
            </View>

            {/* 3. Weather Tickers Bar (Trạm thời tiết du lịch nhanh của Web) */}
            <View style={styles.weatherTickerWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weatherScroll}>
                {WEATHER_TICKERS.map((t, idx) => (
                  <View key={idx} style={styles.weatherPill}>
                    <Text style={{ fontSize: 13, marginRight: 4 }}>{t.icon}</Text>
                    <Text style={styles.weatherCity}>{t.city}</Text>
                    <Text style={styles.weatherTemp}>{t.temp}</Text>
                    <Text style={styles.weatherStatus}>• {t.status}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* 4. Primary Discovery Tabs (Tọa độ bản địa / Cẩm nang Tỉnh thành) */}
            <View style={styles.layerTabsRow}>
              <TouchableOpacity
                style={[styles.layerTab, exploreLayer === 'spots' && styles.layerTabActive]}
                onPress={() => setExploreLayer('spots')}>
                <FontAwesome
                  name="map-pin"
                  size={12}
                  color={exploreLayer === 'spots' ? '#FFFFFF' : WF_COLORS.slate700}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.layerTabText, exploreLayer === 'spots' && styles.layerTabTextActive]}>
                  Tọa độ bản địa
                </Text>
                <View style={[styles.layerCountBadge, exploreLayer === 'spots' && styles.layerCountBadgeActive]}>
                  <Text style={[styles.layerCountText, exploreLayer === 'spots' && { color: WF_COLORS.primary }]}>
                    {places.length || '100+'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.layerTab, exploreLayer === 'destinations' && styles.layerTabActive]}
                onPress={() => setExploreLayer('destinations')}>
                <FontAwesome
                  name="globe"
                  size={12}
                  color={exploreLayer === 'destinations' ? '#FFFFFF' : WF_COLORS.slate700}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.layerTabText, exploreLayer === 'destinations' && styles.layerTabTextActive]}>
                  Cẩm nang Tỉnh thành
                </Text>
              </TouchableOpacity>
            </View>

            {/* 5. Clean Search Box */}
            <View style={styles.searchBox}>
              <FontAwesome name="search" size={15} color={WF_COLORS.primary} style={styles.searchIcon} />
              <TextInput
                placeholder="Tìm tên địa điểm, thành phố, dịch vụ..."
                placeholderTextColor={WF_COLORS.slate400}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={fetchPlaces}
                style={styles.searchInput}
                returnKeyType="search"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                  <FontAwesome name="times-circle" size={15} color={WF_COLORS.slate400} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* 6. Horizontal Categories Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
              {WEB_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.label)}
                    style={[styles.categoryBtn, isSelected && styles.categoryBtnActive]}>
                    <FontAwesome
                      name={cat.icon as any}
                      size={12}
                      color={isSelected ? '#FFFFFF' : WF_COLORS.slate500}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.categoryBtnText, isSelected && styles.categoryBtnTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={WF_COLORS.primary} />
              <Text style={styles.loadingText}>Đang nạp tọa độ du lịch từ Railway...</Text>
            </View>
          ) : hasConnectionError ? (
            <View style={styles.centerBox}>
              <View style={styles.alertCard}>
                <FontAwesome name="cloud" size={32} color={WF_COLORS.primary} style={{ marginBottom: 10 }} />
                <Text style={styles.alertTitle}>Đang kết nối Cloud Railway</Text>
                <Text style={styles.alertDesc}>Đang nạp dữ liệu từ: {API_BASE_URL}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchPlaces}>
                  <Text style={styles.retryBtnText}>Thử kết nối lại</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.centerBox}>
              <FontAwesome name="compass" size={44} color={WF_COLORS.slate400} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>Không tìm thấy địa điểm phù hợp</Text>
              <Text style={styles.emptySub}>Thử gõ từ khóa khác hoặc bấm nút "Tất cả" xem sao nhé!</Text>
            </View>
          )
        }
      />

      {/* ─── MODAL CHI TIẾT ĐỊA ĐIỂM (PLACE DETAIL MODAL) ────────── */}
      <Modal visible={detailModalVisible} animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <SafeAreaView style={styles.modalSafeContainer} edges={['top', 'bottom']}>
          <View style={styles.detailNavbar}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.backBtn}>
              <FontAwesome name="chevron-left" size={15} color={WF_COLORS.slate700} />
            </TouchableOpacity>
            <Text style={styles.detailNavTitle} numberOfLines={1}>
              {selectedPlace?.name || 'Chi tiết địa điểm'}
            </Text>
            <TouchableOpacity onPress={() => selectedPlace && toggleSave(selectedPlace.id)} style={styles.favNavBtn}>
              <FontAwesome
                name={selectedPlace && savedPlaces[selectedPlace.id] ? 'heart' : 'heart-o'}
                size={18}
                color={selectedPlace && savedPlaces[selectedPlace.id] ? '#EF4444' : WF_COLORS.slate700}
              />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedPlace ? (
              <>
                <Image
                  source={{ uri: selectedPlace.coverImage || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80' }}
                  style={styles.detailHeroImage}
                  resizeMode="cover"
                />

                <View style={styles.detailContentBox}>
                  {/* Category & Rating */}
                  <View style={styles.detailTagBar}>
                    <View style={styles.detailCatTag}>
                      <Text style={styles.detailCatTagText}>{selectedPlace.category || 'Địa điểm'}</Text>
                    </View>
                    <View style={styles.detailCityTag}>
                      <FontAwesome name="map-marker" size={11} color={WF_COLORS.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.detailCityTagText}>{selectedPlace.city || 'Việt Nam'}</Text>
                    </View>
                    {selectedPlace.rating ? (
                      <View style={styles.detailRatingPill}>
                        <FontAwesome name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                        <Text style={styles.detailRatingPillText}>{selectedPlace.rating.toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.detailMainName}>{selectedPlace.name}</Text>

                  {/* Info rows */}
                  <View style={styles.infoRow}>
                    <FontAwesome name="map-marker" size={14} color={WF_COLORS.primary} style={{ width: 20 }} />
                    <Text style={styles.infoRowText}>{selectedPlace.address || `${selectedPlace.city}, Việt Nam`}</Text>
                  </View>

                  {selectedPlace.openingHours ? (
                    <View style={styles.infoRow}>
                      <FontAwesome name="clock-o" size={14} color={WF_COLORS.emerald} style={{ width: 20 }} />
                      <Text style={styles.infoRowText}>{selectedPlace.openingHours}</Text>
                    </View>
                  ) : null}

                  {selectedPlace.priceLevel ? (
                    <View style={styles.infoRow}>
                      <FontAwesome name="ticket" size={14} color={WF_COLORS.amber} style={{ width: 20 }} />
                      <Text style={styles.infoRowText}>{selectedPlace.priceLevel}</Text>
                    </View>
                  ) : null}

                  {/* Tiện ích đặc trưng */}
                  <Text style={styles.detailSectionTitle}>Tiện ích nổi bật</Text>
                  <View style={styles.amenityRow}>
                    {['Wifi miễn phí', 'Chụp ảnh đẹp', 'Bãi đỗ xe', 'Thân thiện gia đình'].map((amenity, idx) => (
                      <View key={idx} style={styles.amenityChip}>
                        <FontAwesome name="check-circle" size={12} color={WF_COLORS.emerald} style={{ marginRight: 4 }} />
                        <Text style={styles.amenityChipText}>{amenity}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Description */}
                  <Text style={styles.detailSectionTitle}>Giới thiệu chi tiết</Text>
                  <Text style={styles.detailBodyText}>
                    {selectedPlace.description || 'Chưa có thông tin mô tả chi tiết cho địa điểm này.'}
                  </Text>

                  {/* Add to Trip Action Button */}
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.mainAddToPlanBtn}
                    onPress={handleOpenAddToPlan}>
                    <FontAwesome name="calendar-plus-o" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.mainAddToPlanBtnText}>Thêm vào Plan chuyến đi</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>

        {/* ─── SUB-MODAL CHỌN LỊCH TRÌNH ───────────────────────── */}
        <Modal visible={addToPlanModalVisible} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCardBox}>
              <View style={styles.modalCardHeader}>
                <Text style={styles.modalCardTitle}>Chọn Lịch Trình Của Bạn</Text>
                <TouchableOpacity onPress={() => setAddToPlanModalVisible(false)}>
                  <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalCardSub}>
                Thêm "{selectedPlace?.name}" vào:
              </Text>

              {/* Day selection */}
              <View style={styles.daySelectionRow}>
                <Text style={styles.daySelectionLabel}>Chọn ngày:</Text>
                {[1, 2, 3, 4, 5].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayCircleBtn, selectedDayNumber === d && styles.dayCircleBtnActive]}
                    onPress={() => setSelectedDayNumber(d)}>
                    <Text style={[styles.dayCircleText, selectedDayNumber === d && styles.dayCircleTextActive]}>
                      N{d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {loadingItineraries ? (
                <ActivityIndicator size="small" color={WF_COLORS.primary} style={{ marginVertical: 20 }} />
              ) : myItineraries.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: WF_COLORS.slate500, textAlign: 'center', marginBottom: 12 }}>
                    Bạn chưa có lịch trình nào. Hãy vào tab "Lịch trình" tạo chuyến đi trước nhé!
                  </Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  {myItineraries.map((itinerary) => (
                    <TouchableOpacity
                      key={itinerary.id}
                      style={styles.itineraryChoiceItem}
                      onPress={() => handleConfirmAddPlaceToItinerary(itinerary)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itineraryChoiceTitle}>{itinerary.title}</Text>
                        <Text style={styles.itineraryChoiceDest}>📍 {itinerary.destination}</Text>
                      </View>
                      <FontAwesome name="chevron-right" size={13} color={WF_COLORS.primary} />
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
    backgroundColor: WF_COLORS.slate50,
  },
  listContainer: {
    paddingBottom: 24,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: WF_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate200,
    marginBottom: 12,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  breadcrumbLink: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate500,
  },
  breadcrumbDivider: {
    fontSize: 12,
    color: WF_COLORS.slate400,
  },
  breadcrumbCurrent: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  titleSection: {
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: WF_COLORS.slate900,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginTop: 2,
    lineHeight: 16,
  },
  weatherTickerWrapper: {
    marginBottom: 12,
  },
  weatherScroll: {
    gap: 8,
  },
  weatherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.slate100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  weatherCity: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginRight: 4,
  },
  weatherTemp: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_COLORS.primary,
    marginRight: 4,
  },
  weatherStatus: {
    fontSize: 10,
    color: WF_COLORS.slate500,
  },
  layerTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  layerTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: WF_COLORS.slate100,
  },
  layerTabActive: {
    backgroundColor: WF_COLORS.primary,
  },
  layerTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate700,
  },
  layerTabTextActive: {
    color: '#FFFFFF',
  },
  layerCountBadge: {
    backgroundColor: WF_COLORS.slate200,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  layerCountBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  layerCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: WF_COLORS.slate700,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.slate100,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: WF_COLORS.slate900,
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  categoryBtnActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  categoryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  categoryBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: WF_COLORS.white,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
  badgeTopLeft: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cityPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  categoryPill: {
    backgroundColor: 'rgba(2, 132, 199, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 16,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    flex: 1,
    marginRight: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 12,
    color: WF_COLORS.slate500,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: WF_COLORS.slate500,
    marginBottom: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: WF_COLORS.slate100,
  },
  priceTag: {
    backgroundColor: WF_COLORS.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priceTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  cardAddPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
  },
  cardAddPlanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: WF_COLORS.slate500,
  },
  alertCard: {
    backgroundColor: WF_COLORS.white,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    alignItems: 'center',
    width: '100%',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  alertDesc: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginVertical: 6,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: WF_COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginTop: 4,
    textAlign: 'center',
  },
  // Modal Chi tiết
  modalSafeContainer: {
    flex: 1,
    backgroundColor: WF_COLORS.white,
  },
  detailNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate200,
  },
  backBtn: {
    padding: 6,
  },
  detailNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  favNavBtn: {
    padding: 6,
  },
  detailHeroImage: {
    width: '100%',
    height: 240,
  },
  detailContentBox: {
    padding: 16,
  },
  detailTagBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  detailCatTag: {
    backgroundColor: WF_COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailCatTagText: {
    color: WF_COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  detailCityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailCityTagText: {
    color: WF_COLORS.slate700,
    fontSize: 11,
    fontWeight: '600',
  },
  detailRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  detailRatingPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  detailMainName: {
    fontSize: 20,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoRowText: {
    fontSize: 13,
    color: WF_COLORS.slate700,
    flex: 1,
  },
  detailSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginTop: 16,
    marginBottom: 8,
  },
  amenityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.slate100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  amenityChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  detailBodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: WF_COLORS.slate600,
    marginBottom: 20,
  },
  mainAddToPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_COLORS.primary,
    height: 48,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: WF_COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  mainAddToPlanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Sub-modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCardBox: {
    width: '100%',
    backgroundColor: WF_COLORS.white,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  modalCardSub: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginBottom: 12,
  },
  daySelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  daySelectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  dayCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WF_COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleBtnActive: {
    backgroundColor: WF_COLORS.primary,
  },
  dayCircleText: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  dayCircleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  itineraryChoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate100,
  },
  itineraryChoiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginBottom: 2,
  },
  itineraryChoiceDest: {
    fontSize: 12,
    color: WF_COLORS.slate500,
  },
});
