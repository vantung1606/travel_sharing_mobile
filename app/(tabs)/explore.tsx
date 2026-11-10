import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { BrandedLoading } from '@/components/BrandedLoading';
import { Text, TextInput } from '@/components/Themed';
import { AddPlaceModal } from '@/components/explore/AddPlaceModal';
import { ExploreFilterSheet } from '@/components/explore/ExploreFilterSheet';
import { ExploreMapModal } from '@/components/explore/ExploreMapModal';
import { FeaturedPlaceCard, PlaceCard } from '@/components/explore/PlaceCard';
import { PlaceDetailModal } from '@/components/explore/PlaceDetailModal';
import { PLACE_CATEGORIES, matchBudget, parsePriceVND } from '@/components/explore/exploreFilters';
import { Chip } from '@/components/ui/Chip';
import { FAB } from '@/components/ui/FAB';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { UserProfileModal } from '@/components/UserProfileModal';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { authPrompt } from '@/src/services/authPrompt';
import { authStorage } from '@/src/services/authStorage';
import { itineraryApi, ItineraryItem, placeApi, PlaceItem, savedPlaceApi } from '@/src/services/api';
import { savedPlaces } from '@/src/services/savedPlaces';
import { getItineraryDayCount } from '@/src/utils/itinerary';
import { showToast } from '@/components/Toast';
import { tabBarVisibility } from '@/src/services/tabBarVisibility';

const PAGE_SIZE = 50;
const ALL = 'Tất cả';
const SEARCH_DEBOUNCE_MS = 320;

const HOT_EXPLORE_CITIES = [
  { name: 'Tất cả', icon: '✨' },
  { name: 'Đà Lạt', icon: '🌸' },
  { name: 'Đà Nẵng', icon: '🌊' },
  { name: 'Phú Quốc', icon: '🏖️' },
  { name: 'Sa Pa', icon: '🏔️' },
  { name: 'Ninh Bình', icon: '🛶' },
  { name: 'Hà Nội', icon: '☕' },
  { name: 'Hội An', icon: '🏮' },
  { name: 'TP. Hồ Chí Minh', icon: '🌆' },
  { name: 'Quy Nhơn', icon: '🏝️' },
];

/** Một dòng trong danh sách: hero 16:9 hoặc card địa điểm thường. */
type ExploreRow =
  | { kind: 'hero'; place: PlaceItem; key: string }
  | { kind: 'place'; place: PlaceItem; key: string };

export default function ExploreScreen() {
  const router = useRouter();
  const scrollRef = useRef<FlatList<ExploreRow>>(null);
  const { width: screenWidth } = useWindowDimensions();
  const isSmallScreen = screenWidth < 380;

  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [hasMorePlaces, setHasMorePlaces] = useState<boolean>(false);
  const [placesPage, setPlacesPage] = useState<number>(0);
  const [loadingMorePlaces, setLoadingMorePlaces] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetching, setFetching] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  // Lọc tỉnh thành chạy TRỰC TIẾP trên server (/places?city=) — cùng chuẩn web
  const [selectedCity, setSelectedCity] = useState<string>(ALL);
  // Khoảng giá (client-side, giống web) + chế độ xem "Muốn đi"
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'explore' | 'saved'>('explore');
  const [savedDetails, setSavedDetails] = useState<Record<string, PlaceItem>>({});
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);

  // Tỉnh/thành đã gặp, tích luỹ qua các lần tải để chip trong sheet không
  // bị co lại còn 1 lựa chọn khi đang lọc theo tỉnh.
  const [knownCities, setKnownCities] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);

  const [addToPlanModalVisible, setAddToPlanModalVisible] = useState<boolean>(false);
  const [myItineraries, setMyItineraries] = useState<ItineraryItem[]>([]);
  const [loadingItineraries, setLoadingItineraries] = useState<boolean>(false);
  const [selectedPlanTrip, setSelectedPlanTrip] = useState<ItineraryItem | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);
  const [customDaysCount, setCustomDaysCount] = useState<number | null>(null);
  const [planTimeSlot, setPlanTimeSlot] = useState<'morning' | 'afternoon' | 'evening' | 'custom'>('morning');
  const [planCustomTime, setPlanCustomTime] = useState<string>('09:00');
  const [planCategory, setPlanCategory] = useState<string>('Tham quan');
  const [planCost, setPlanCost] = useState<string>('0');
  const [planNote, setPlanNote] = useState<string>('');
  const [submittingPlan, setSubmittingPlan] = useState<boolean>(false);

  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [isAddPlaceOpen, setIsAddPlaceOpen] = useState<boolean>(false);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Gõ tới đâu gọi API tới đó là lỗi cũ: mỗi ký tự = 1 request. Giờ chỉ gọi
  // sau khi người dùng dừng gõ ~320ms.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const rememberCities = useCallback((items: PlaceItem[]) => {
    setKnownCities((prev) => {
      const set = new Set(prev);
      items.forEach((p) => {
        if (p.city) set.add(p.city);
      });
      if (set.size === prev.length) return prev;
      return [...set].sort((a, b) => a.localeCompare(b, 'vi'));
    });
  }, []);

  const fetchPlaces = useCallback(async () => {
    setFetching(true);
    try {
      setHasConnectionError(false);
      const categoryParam = selectedCategory === ALL ? undefined : selectedCategory;
      const cityParam = selectedCity === ALL ? undefined : selectedCity;
      const keyword = debouncedSearch.trim() || undefined;
      const result = await placeApi.getPlacesPaged({
        page: 0,
        size: PAGE_SIZE,
        keyword,
        category: categoryParam,
        city: cityParam,
      });

      if (result && Array.isArray(result.items)) {
        setPlaces(result.items);
        setHasMorePlaces(Boolean(result.hasNext));
        setPlacesPage(0);
        rememberCities(result.items);
      } else {
        // API phân trang không khả dụng -> tải toàn bộ như trước
        const data = await placeApi.getAllPlaces({
          keyword,
          category: categoryParam,
          city: cityParam,
        });
        setPlaces(data || []);
        setHasMorePlaces(false);
        setPlacesPage(0);
        rememberCities(data || []);
      }
    } catch (err: any) {
      console.warn('Backend connection notice:', err.message || err);
      setHasConnectionError(true);
    } finally {
      setLoading(false);
      setFetching(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, selectedCategory, selectedCity, rememberCities]);

  const loadMorePlaces = useCallback(async () => {
    if (loadingMorePlaces || !hasMorePlaces) return;
    setLoadingMorePlaces(true);
    try {
      const nextPage = placesPage + 1;
      const categoryParam = selectedCategory === ALL ? undefined : selectedCategory;
      const result = await placeApi.getPlacesPaged({
        page: nextPage,
        size: PAGE_SIZE,
        keyword: debouncedSearch.trim() || undefined,
        category: categoryParam,
        city: selectedCity === ALL ? undefined : selectedCity,
      });
      if (result && Array.isArray(result.items)) {
        setPlaces((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...result.items.filter((p) => !seen.has(p.id))];
        });
        setPlacesPage(nextPage);
        setHasMorePlaces(Boolean(result.hasNext));
        rememberCities(result.items);
      }
    } catch (err: any) {
      console.warn('Load more places error:', err?.message || err);
    } finally {
      setLoadingMorePlaces(false);
    }
  }, [
    loadingMorePlaces,
    hasMorePlaces,
    placesPage,
    debouncedSearch,
    selectedCategory,
    selectedCity,
    rememberCities,
  ]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // Danh sách "muốn đi": lưu bền trên thiết bị + HYDRATION từ SERVER khi đã
  // đăng nhập (union theo placeId) — những gì đã lưu trên web/thiết bị khác
  // cũng xuất hiện ở đây, hết chia rẽ danh sách giữa các nền tảng.
  useEffect(() => {
    savedPlaces.getAll().then(setSavedIds);
    return savedPlaces.subscribe(setSavedIds);
  }, []);

  useEffect(() => {
    let alive = true;
    authStorage.getSession().then((session) => {
      if (!alive || !session) return;
      savedPlaceApi.getSavedPlaces().then((ids) => {
        if (alive && Array.isArray(ids) && ids.length > 0) {
          savedPlaces.merge(ids).then(setSavedIds);
        }
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlaces();
  };

  const handleToggleSave = async (place: PlaceItem) => {
    const session = await authStorage.getSession();
    if (!session) {
      authPrompt.open();
      return;
    }
    // LOCAL trước (nút tim phản hồi tức thì) rồi ghi ĐÈ lên SERVER.
    const nowSaved = await savedPlaces.toggle(place.id);
    const syncCall = nowSaved ? savedPlaceApi.addSavedPlace : savedPlaceApi.removeSavedPlace;
    syncCall(place.id).catch((err: unknown) => {
      console.warn('Wishlist server sync failed', err);
    });
  };

  const handleOpenPlaceDetail = (place: PlaceItem) => {
    setSelectedPlace(place);
    setDetailModalVisible(true);
  };

  const getTripDaysCount = (trip: ItineraryItem | null) => {
    if (!trip) return 1;
    if (customDaysCount && customDaysCount > 0) return customDaysCount;
    return getItineraryDayCount(trip);
  };

  const formatTripDayDate = (trip: ItineraryItem | null, dayIndex: number) => {
    if (!trip?.startDate) return null;
    const baseDate = new Date(trip.startDate);
    baseDate.setDate(baseDate.getDate() + (dayIndex - 1));
    const dayName = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][baseDate.getDay()];
    const dateStr = `${baseDate.getDate().toString().padStart(2, '0')}/${(baseDate.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${dayName}, ${dateStr}`;
  };

  const handleOpenAddToPlan = async () => {
    const session = await authStorage.getSession();
    if (!session) {
      // Mở thẳng form đăng nhập toàn màn hình thay vì chỉ báo lỗi.
      authPrompt.open();
      return;
    }

    setSelectedPlanTrip(null);
    setSelectedDayNumber(1);
    setCustomDaysCount(null);
    setPlanTimeSlot('morning');
    setPlanCustomTime('09:00');
    setPlanCategory(selectedPlace?.category || 'Tham quan');
    setPlanCost(selectedPlace?.ticketPrice ? String(selectedPlace.ticketPrice) : '0');
    setPlanNote(`Tham quan, chụp ảnh và trải nghiệm tại ${selectedPlace?.name || 'địa điểm'}`);

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

  const handleSelectItineraryForPlan = (trip: ItineraryItem) => {
    setSelectedPlanTrip(trip);
    setSelectedDayNumber(1);
    const count = getTripDaysCount(trip);
    setCustomDaysCount(count);
  };

  const handleAddExtraDay = () => {
    const current = selectedPlanTrip ? getTripDaysCount(selectedPlanTrip) : 1;
    const next = current + 1;
    setCustomDaysCount(next);
    setSelectedDayNumber(next);
  };

  const handleConfirmAddPlaceToItinerary = async () => {
    if (!selectedPlace || !selectedPlanTrip) return;

    let finalStartTime = '09:00:00';
    let timeSlotLabel = 'Buổi sáng (08:30)';

    if (planTimeSlot === 'custom') {
      finalStartTime = `${planCustomTime}:00`;
      timeSlotLabel = `${planCustomTime}`;
    } else if (planTimeSlot === 'afternoon') {
      finalStartTime = '14:00:00';
      timeSlotLabel = 'Buổi chiều (14:00)';
    } else if (planTimeSlot === 'evening') {
      finalStartTime = '18:30:00';
      timeSlotLabel = 'Buổi tối (18:30)';
    } else {
      finalStartTime = '08:30:00';
      timeSlotLabel = 'Buổi sáng (08:30)';
    }

    setSubmittingPlan(true);
    try {
      await itineraryApi.addDetail(selectedPlanTrip.id, {
        itineraryId: selectedPlanTrip.id,
        placeId: selectedPlace.id,
        locationName: selectedPlace.name,
        locationAddress: selectedPlace.address || selectedPlace.city,
        category: planCategory || selectedPlace.category || 'Tham quan',
        dayNumber: selectedDayNumber,
        startTime: finalStartTime,
        estimatedCost: Number(planCost) || undefined,
        note: (planNote || '').trim() || undefined,
      });

      showToast({
        kind: 'success',
        title: 'Đã thêm vào lịch trình! 🚀',
        message: `"${selectedPlace.name}" đã được xếp vào Ngày ${selectedDayNumber} (${timeSlotLabel}) của chuyến đi "${selectedPlanTrip.title}".`,
        icon: 'calendar',
      });
      setAddToPlanModalVisible(false);
      setDetailModalVisible(false);
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Thêm vào lịch trình thất bại',
        message: err.response?.data?.message || 'Không thể thêm địa điểm này vào lịch trình.',
      });
    } finally {
      setSubmittingPlan(false);
    }
  };

  const hasActiveFilters = selectedCategory !== ALL || selectedCity !== ALL || selectedBudget !== 'all';
  const activeFilterCount =
    (selectedCategory !== ALL ? 1 : 0) + (selectedCity !== ALL ? 1 : 0) + (selectedBudget !== 'all' ? 1 : 0);
  const isFiltering = searchQuery.trim().length > 0 || hasActiveFilters;

  const handleResetSheetFilters = () => {
    setSelectedCategory(ALL);
    setSelectedCity(ALL);
    setSelectedBudget('all');
  };

  const handleResetAllFilters = () => {
    handleResetSheetFilters();
    setSearchQuery('');
  };

  // Hero 16:9 = địa điểm được đánh giá cao nhất, chỉ xuất hiện khi chưa lọc.
  // Nằm trong danh sách nên cuộn đi cùng nội dung, không chiếm chrome.
  const heroPlace = useMemo<PlaceItem | null>(() => {
    if (isFiltering) return null;
    const rated = places.filter((p) => (p.reviewsCount ?? 0) > 0 && (p.rating ?? 0) > 0);
    if (!rated.length) return null;
    return [...rated].sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0)
    )[0];
  }, [places, isFiltering]);

  // Địa điểm hiển thị khi đang ở chế độ Khám phá (lọc giá client-side như web)
  const displayedPlaces = useMemo(
    () => (selectedBudget === 'all' ? places : places.filter((p) => matchBudget(parsePriceVND(p), selectedBudget))),
    [places, selectedBudget]
  );

  const exploreRows = useMemo<ExploreRow[]>(() => {
    const rows: ExploreRow[] = displayedPlaces
      .filter((p) => p.id !== heroPlace?.id)
      .map((p) => ({ kind: 'place', place: p, key: `place-${p.id}` }));
    if (heroPlace) {
      rows.unshift({ kind: 'hero', place: heroPlace, key: `hero-${heroPlace.id}` });
    }
    return rows;
  }, [displayedPlaces, heroPlace]);

  // Sắp lại danh sách chi tiết "Muốn đi" đúng theo savedIds — hủy tim là mất mục.
  const savedList = useMemo(
    () => savedIds.map((id) => savedDetails[String(id)]).filter((p): p is PlaceItem => Boolean(p)),
    [savedIds, savedDetails]
  );

  const savedRows = useMemo<ExploreRow[]>(
    () => savedList.map((p) => ({ kind: 'place', place: p, key: `saved-${p.id}` })),
    [savedList]
  );

  // Khi sang chế độ "Muốn đi": nạp chi tiết địa điểm THẬT theo id đã lưu
  // (không có dữ liệu cứng; những id đã có sẵn chi tiết thì bỏ qua).
  useEffect(() => {
    if (viewMode !== 'saved' || savedIds.length === 0) return undefined;
    let alive = true;
    const missing = savedIds.filter((id) => !savedDetails[String(id)]);
    if (missing.length > 0) {
      Promise.all(missing.map((id) => placeApi.getPlaceById(id).catch(() => null))).then((results) => {
        if (!alive) return;
        setSavedDetails((prev) => {
          const next = { ...prev };
          missing.forEach((id, idx) => {
            const found = results[idx];
            if (found) next[String(id)] = found;
          });
          return next;
        });
      });
    }
    return () => {
      alive = false;
    };
  }, [viewMode, savedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollToTop = () => {
    scrollRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const renderRow = ({ item }: { item: ExploreRow }) => {
    if (item.kind === 'hero') {
      return <FeaturedPlaceCard place={item.place} onPress={() => handleOpenPlaceDetail(item.place)} />;
    }
    return (
      <PlaceCard
        place={item.place}
        saved={savedIds.includes(item.place.id)}
        onPress={() => handleOpenPlaceDetail(item.place)}
        onToggleSave={() => handleToggleSave(item.place)}
      />
    );
  };

  const emptyState = () => {
    if (viewMode === 'saved') {
      return (
        <View style={styles.centerBox}>
          <FontAwesome name="heart-o" size={40} color={DS_COLOR.accent} />
          <Text style={styles.emptyTitle}>Chưa có địa điểm nào được lưu</Text>
          <Text style={styles.emptySub}>
            Về tab Khám phá, nhấn nút tim trên địa điểm bạn thích — danh sách sẽ đồng bộ cả sang web.
          </Text>
        </View>
      );
    }
    if (loading) {
      return (
        <BrandedLoading
          title="Đang tải điểm đến"
          subtitle="Wayfare đang chuẩn bị những tọa độ du lịch đẹp nhất cho bạn."
        />
      );
    }
    if (hasConnectionError) {
      return (
        <View style={styles.centerBox}>
          <View style={styles.alertCard}>
            <FontAwesome name="cloud" size={32} color={DS_COLOR.accent} style={{ marginBottom: 10 }} />
            <Text style={styles.alertTitle}>Không thể tải điểm đến</Text>
            <Text style={styles.alertDesc}>
              Kiểm tra kết nối mạng rồi thử lại nhé. Danh sách điểm đến sẽ hiện ngay khi có dữ liệu.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchPlaces}>
              <Text style={styles.retryBtnText}>Thử kết nối lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.centerBox}>
        <FontAwesome name="compass" size={40} color={DS_COLOR.inkMuted} />
        <Text style={styles.emptyTitle}>Không tìm thấy địa điểm phù hợp</Text>
        <Text style={styles.emptySub}>Thử từ khoá khác, hoặc xoá bớt bộ lọc nhé.</Text>
        {isFiltering ? (
          <TouchableOpacity style={styles.retryBtn} onPress={handleResetAllFilters}>
            <Text style={styles.retryBtnText}>Xoá bộ lọc</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={scrollRef}
        data={viewMode === 'saved' ? savedRows : exploreRows}
        keyExtractor={(item) => item.key}
        renderItem={renderRow}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onScroll={tabBarVisibility.onScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[DS_COLOR.accent]} />}
        onEndReached={viewMode === 'saved' ? undefined : loadMorePlaces}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View style={[styles.feedHeader, isSmallScreen && { paddingHorizontal: 12 }]}>
            <SegmentedTabs
              items={[
                { key: 'explore', label: 'Khám phá' },
                { key: 'saved', label: savedIds.length > 0 ? `Muốn đi (${savedIds.length})` : 'Muốn đi' },
              ]}
              value={viewMode}
              onChange={(key) => {
                setViewMode(key);
                scrollRef.current?.scrollToOffset({ offset: 0, animated: false });
              }}
            />

            {viewMode === 'explore' ? (
              <>
                <View style={styles.toolbarRow}>
                  <View style={styles.searchBox}>
                    <FontAwesome name="search" size={14} color={DS_COLOR.inkMuted} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Tìm địa điểm, thành phố..."
                      placeholderTextColor={DS_COLOR.inkMuted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      onSubmitEditing={() => setDebouncedSearch(searchQuery)}
                      returnKeyType="search"
                      accessibilityLabel="Tìm kiếm địa điểm"
                    />
                    {fetching && places.length > 0 ? (
                      <ActivityIndicator size="small" color={DS_COLOR.accent} />
                    ) : searchQuery ? (
                      <TouchableOpacity
                        onPress={() => setSearchQuery('')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel="Xoá từ khoá tìm kiếm">
                        <FontAwesome name="times-circle" size={15} color={DS_COLOR.inkMuted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={[styles.iconBtn, activeFilterCount > 0 && styles.iconBtnActive]}
                    activeOpacity={0.85}
                    onPress={() => setIsFilterOpen(true)}
                    accessibilityLabel={`Bộ lọc${activeFilterCount > 0 ? `, ${activeFilterCount} mục đang chọn` : ''}`}>
                    <FontAwesome
                      name="sliders"
                      size={16}
                      color={activeFilterCount > 0 ? DS_COLOR.accent : DS_COLOR.inkSecondary}
                    />
                    {activeFilterCount > 0 ? (
                      <View style={styles.filterBadge}>
                        <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.iconBtn}
                    activeOpacity={0.85}
                    onPress={() => setIsMapOpen(true)}
                    accessibilityLabel="Xem bản đồ địa điểm">
                    <FontAwesome name="map" size={16} color={DS_COLOR.inkSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Dải Tọa Độ / Thành Phố Thịnh Hành */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cityPillRow}>
                  {HOT_EXPLORE_CITIES.map((c) => {
                    const isSelected = (c.name === 'Tất cả' && selectedCity === ALL) || selectedCity === c.name;
                    return (
                      <TouchableOpacity
                        key={c.name}
                        activeOpacity={0.8}
                        onPress={() => {
                          const newCity = c.name === 'Tất cả' ? ALL : c.name;
                          setSelectedCity(newCity);
                          scrollToTop();
                        }}
                        style={[styles.cityPill, isSelected && styles.cityPillActive]}>
                        <Text style={styles.cityPillIcon}>{c.icon}</Text>
                        <Text style={[styles.cityPillText, isSelected && styles.cityPillTextActive]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}>
                  {PLACE_CATEGORIES.map((cat) => (
                    <Chip
                      key={cat.label}
                      label={cat.short}
                      active={selectedCategory === cat.label}
                      onPress={() => {
                        setSelectedCategory(cat.label);
                        scrollToTop();
                      }}
                    />
                  ))}
                </ScrollView>
              </>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={styles.listFooter}>
            {loadingMorePlaces ? <ActivityIndicator size="small" color={DS_COLOR.accent} /> : null}
          </View>
        }
        ListEmptyComponent={emptyState()}
      />

      {/* Nút đề xuất địa điểm: hành động tạo mới duy nhất của trang */}
      {viewMode === 'explore' ? (
        <FAB onPress={() => setIsAddPlaceOpen(true)} accessibilityLabel="Đề xuất địa điểm mới" />
      ) : null}

      <ExploreFilterSheet
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        category={selectedCategory}
        onCategoryChange={(value) => {
          setSelectedCategory(value);
          scrollToTop();
        }}
        city={selectedCity}
        onCityChange={(value) => {
          setSelectedCity(value);
          scrollToTop();
        }}
        cities={knownCities}
        budget={selectedBudget}
        onBudgetChange={setSelectedBudget}
        onReset={handleResetSheetFilters}
      />

      <PlaceDetailModal
        visible={detailModalVisible}
        place={selectedPlace}
        saved={Boolean(selectedPlace && savedIds.includes(selectedPlace.id))}
        onClose={() => setDetailModalVisible(false)}
        onToggleSave={() => selectedPlace && handleToggleSave(selectedPlace)}
        onAddToPlan={handleOpenAddToPlan}
        onRequireLogin={() => authPrompt.open()}
        onPressAuthor={(uid) => setSelectedUserId(uid)}
        onWriteCheckinPost={(place) => {
          setDetailModalVisible(false);
          router.push({
            pathname: '/(tabs)/community',
            params: { checkinPlaceId: String(place.id) },
          });
        }}
      />

      {/* ─── SUB-MODAL CHỌN LỊCH TRÌNH ───────────────────────── */}
      <Modal
        visible={addToPlanModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setAddToPlanModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardBox}>
            {/* Header */}
            <View style={styles.modalCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {selectedPlanTrip && (
                  <TouchableOpacity onPress={() => setSelectedPlanTrip(null)} style={styles.backTripBtn}>
                    <FontAwesome name="arrow-left" size={14} color={DS_COLOR.inkSecondary} />
                  </TouchableOpacity>
                )}
                <View>
                  <Text style={styles.modalCardTitle}>
                    {selectedPlanTrip ? 'Lên lịch trình chi tiết' : 'Thêm vào Lịch trình'}
                  </Text>
                  <Text style={styles.modalCardSub}>
                    {selectedPlanTrip
                      ? `Chọn ngày & giờ cho "${selectedPlace?.name}"`
                      : `Chọn chuyến đi để thêm "${selectedPlace?.name}"`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAddToPlanModalVisible(false)}>
                <FontAwesome name="times" size={18} color={DS_COLOR.inkMuted} />
              </TouchableOpacity>
            </View>

            {/* BƯỚC 1: CHỌN CHUYẾN ĐI */}
            {!selectedPlanTrip ? (
              loadingItineraries ? (
                <ActivityIndicator size="small" color={DS_COLOR.accent} style={{ marginVertical: 30 }} />
              ) : myItineraries.length === 0 ? (
                <View style={styles.noItineraryBox}>
                  <FontAwesome name="calendar-o" size={36} color={DS_COLOR.inkMuted} style={{ marginBottom: 10 }} />
                  <Text style={styles.noItineraryText}>
                    Bạn chưa có chuyến đi nào được lưu trên tài khoản này.
                  </Text>
                  <TouchableOpacity
                    style={styles.createTripBtn}
                    onPress={() => {
                      setAddToPlanModalVisible(false);
                      setDetailModalVisible(false);
                      router.push('/(tabs)/itinerary');
                    }}>
                    <Text style={styles.createTripBtnText}>+ Tạo lịch trình mới</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView style={styles.itineraryList} showsVerticalScrollIndicator={false}>
                  {myItineraries.map((itinerary) => {
                    const daysTotal = getTripDaysCount(itinerary);
                    const stops = Array.isArray(itinerary.details)
                      ? itinerary.details.length
                      : itinerary.placesCount || 0;

                    return (
                      <TouchableOpacity
                        key={itinerary.id}
                        style={styles.itineraryChoiceItem}
                        onPress={() => handleSelectItineraryForPlan(itinerary)}>
                        <View style={styles.itineraryChoiceInfo}>
                          <Text style={styles.itineraryChoiceTitle} numberOfLines={1}>
                            {itinerary.title}
                          </Text>
                          <Text style={styles.itineraryChoiceDest}>
                            📍 {itinerary.destination} • {daysTotal} ngày • {stops} điểm
                          </Text>
                        </View>
                        <FontAwesome name="chevron-right" size={13} color={DS_COLOR.accent} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )
            ) : (
              /* BƯỚC 2: CHỌN NGÀY, GIỜ, GHI CHÚ */
              <ScrollView style={styles.planDetailScroll} showsVerticalScrollIndicator={false}>
                {/* Trip Banner */}
                <View style={styles.planTripBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTripBannerLabel}>Chuyến đi đã chọn</Text>
                    <Text style={styles.planTripBannerTitle} numberOfLines={1}>
                      {selectedPlanTrip.title}
                    </Text>
                    <Text style={styles.planTripBannerSub}>
                      📍 {selectedPlanTrip.destination} • Thời lượng: {getTripDaysCount(selectedPlanTrip)} ngày
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedPlanTrip(null)} style={styles.changeTripBtn}>
                    <Text style={styles.changeTripBtnText}>Đổi</Text>
                  </TouchableOpacity>
                </View>

                {/* 1. Chọn Ngày */}
                <Text style={styles.planSectionLabel}>1. Ghé thăm vào ngày thứ mấy?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planDayRow}>
                  {Array.from({ length: getTripDaysCount(selectedPlanTrip) }).map((_, i) => {
                    const dayNum = i + 1;
                    const isSelected = selectedDayNumber === dayNum;
                    const dateStr = formatTripDayDate(selectedPlanTrip, dayNum);

                    return (
                      <TouchableOpacity
                        key={dayNum}
                        style={[styles.planDayChip, isSelected && styles.planDayChipActive]}
                        onPress={() => setSelectedDayNumber(dayNum)}>
                        <Text style={[styles.planDayChipTitle, isSelected && styles.planDayChipTitleActive]}>
                          Ngày {dayNum}
                        </Text>
                        {dateStr && (
                          <Text style={[styles.planDayChipDate, isSelected && styles.planDayChipDateActive]}>
                            {dateStr}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.planDayAddBtn} onPress={handleAddExtraDay}>
                    <Text style={styles.planDayAddBtnText}>+ Ngày {getTripDaysCount(selectedPlanTrip) + 1}</Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* 2. Chọn Khung giờ */}
                <Text style={styles.planSectionLabel}>2. Khung giờ dự kiến</Text>
                <View style={styles.timeSlotGrid}>
                  {[
                    { id: 'morning', label: '🌅 Buổi sáng', sub: '08:30 - 11:30' },
                    { id: 'afternoon', label: '☀️ Buổi chiều', sub: '14:00 - 17:00' },
                    { id: 'evening', label: '🌙 Buổi tối', sub: '18:30 - 21:00' },
                    { id: 'custom', label: '⏱️ Giờ tự chọn', sub: 'Cụ thể' },
                  ].map((slot) => {
                    const isSelected = planTimeSlot === slot.id;
                    return (
                      <TouchableOpacity
                        key={slot.id}
                        style={[styles.timeSlotBtn, isSelected && styles.timeSlotBtnActive]}
                        onPress={() => setPlanTimeSlot(slot.id as any)}>
                        <Text style={[styles.timeSlotBtnLabel, isSelected && styles.timeSlotBtnLabelActive]}>
                          {slot.label}
                        </Text>
                        <Text style={[styles.timeSlotBtnSub, isSelected && styles.timeSlotBtnSubActive]}>
                          {slot.sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {planTimeSlot === 'custom' && (
                  <View style={styles.customTimeRow}>
                    <Text style={styles.inputSubLabel}>Nhập giờ bắt đầu (HH:mm):</Text>
                    <TextInput
                      style={styles.customTimeInput}
                      value={planCustomTime}
                      onChangeText={setPlanCustomTime}
                      placeholder="09:00"
                    />
                  </View>
                )}

                {/* 3. Phân loại hoạt động */}
                <Text style={styles.planSectionLabel}>3. Loại hoạt động</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
                  {['Tham quan', 'Ăn uống', 'Check-in', 'Vui chơi', 'Thư giãn'].map((cat) => {
                    const isSelected = planCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                        onPress={() => setPlanCategory(cat)}>
                        <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* 4. Chi phí dự kiến */}
                <Text style={styles.planSectionLabel}>4. Chi phí dự kiến (VNĐ)</Text>
                <TextInput
                  style={styles.costInput}
                  keyboardType="numeric"
                  value={planCost}
                  onChangeText={setPlanCost}
                  placeholder="0 (Miễn phí)"
                />

                {/* 5. Ghi chú hoạt động */}
                <Text style={styles.planSectionLabel}>5. Ghi chú kế hoạch</Text>
                <TextInput
                  style={styles.noteInput}
                  multiline
                  numberOfLines={2}
                  value={planNote}
                  onChangeText={setPlanNote}
                  placeholder="VD: Chụp ảnh góc đẹp, thưởng thức cà phê..."
                />

                {/* Action Buttons */}
                <View style={styles.planActionRow}>
                  <TouchableOpacity style={styles.planBackBtn} onPress={() => setSelectedPlanTrip(null)}>
                    <Text style={styles.planBackBtnText}>Quay lại</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.planConfirmBtn, submittingPlan && { opacity: 0.6 }]}
                    disabled={submittingPlan}
                    onPress={handleConfirmAddPlaceToItinerary}>
                    {submittingPlan ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.planConfirmBtnText}>
                        Xác nhận thêm (Ngày {selectedDayNumber})
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── MODAL BẢN ĐỒ TƯƠNG TÁC & GPS ─────────────────────── */}
      <ExploreMapModal
        visible={isMapOpen}
        places={places}
        onClose={() => setIsMapOpen(false)}
        onOpenPlaceDetail={(place) => {
          setIsMapOpen(false);
          handleOpenPlaceDetail(place);
        }}
      />

      {/* ─── MODAL ĐỀ XUẤT ĐỊA ĐIỂM MỚI ─────────────────────── */}
      <AddPlaceModal
        visible={isAddPlaceOpen}
        onClose={() => setIsAddPlaceOpen(false)}
        onPlaceCreated={(newPlace) => {
          setPlaces((prev) => [newPlace, ...prev]);
          setSelectedPlace(newPlace);
          setDetailModalVisible(true);
        }}
      />

      {/* ─── MODAL HỒ SƠ CÔNG KHAI THÀNH VIÊN ───────────────── */}
      <UserProfileModal
        visible={selectedUserId != null}
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS_COLOR.bg,
  },
  list: {
    paddingBottom: 116,
  },
  listFooter: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: DS_COLOR.surface,
    borderBottomWidth: 1,
    borderBottomColor: DS_COLOR.line,
    marginBottom: 14,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: DS_TYPE.body,
    lineHeight: 20,
    color: DS_COLOR.ink,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: DS_COLOR.accentSoft,
  },
  filterBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: DS_COLOR.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cityPillRow: {
    gap: 8,
    paddingTop: 10,
    paddingRight: 16,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cityPillActive: {
    backgroundColor: DS_COLOR.accent,
    borderColor: DS_COLOR.accent,
    shadowColor: DS_COLOR.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 2,
  },
  cityPillIcon: {
    fontSize: 13,
  },
  cityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  cityPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipRow: {
    gap: 8,
    paddingTop: 10,
    paddingRight: 16,
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: DS_COLOR.surface,
    padding: 20,
    borderRadius: DS_RADIUS.lg,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    alignItems: 'center',
    width: '100%',
  },
  alertTitle: {
    fontSize: DS_TYPE.body,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  alertDesc: {
    fontSize: DS_TYPE.meta,
    color: DS_COLOR.inkSecondary,
    marginVertical: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryBtn: {
    backgroundColor: DS_COLOR.accent,
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DS_RADIUS.md,
    marginTop: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: DS_TYPE.meta,
  },
  emptyTitle: {
    fontSize: DS_TYPE.title,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginTop: 12,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: DS_TYPE.meta,
    color: DS_COLOR.inkMuted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  // Sub-modal chọn lịch trình
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCardBox: {
    width: '100%',
    backgroundColor: DS_COLOR.surface,
    borderRadius: DS_RADIUS.lg,
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
    fontSize: DS_TYPE.title,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  modalCardSub: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
    marginBottom: 12,
    marginTop: 2,
  },
  backTripBtn: {
    width: 32,
    height: 32,
    borderRadius: DS_RADIUS.sm,
    backgroundColor: DS_COLOR.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTripBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.accent,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTripBtnText: {
    color: '#FFFFFF',
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
  },
  noItineraryBox: {
    padding: 24,
    alignItems: 'center',
  },
  noItineraryText: {
    color: DS_COLOR.inkMuted,
    textAlign: 'center',
    fontSize: DS_TYPE.meta,
    marginBottom: 8,
  },
  itineraryList: {
    maxHeight: 280,
  },
  itineraryChoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.surfaceMuted,
    marginBottom: 8,
  },
  itineraryChoiceInfo: {
    flex: 1,
  },
  itineraryChoiceTitle: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  itineraryChoiceDest: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
    marginTop: 2,
  },
  // Step 2 styles
  planDetailScroll: {
    maxHeight: 460,
  },
  planTripBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.accentSoft,
    marginBottom: 14,
  },
  planTripBannerLabel: {
    fontSize: DS_TYPE.caption,
    fontWeight: '700',
    color: DS_COLOR.accent,
    textTransform: 'uppercase',
  },
  planTripBannerTitle: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginTop: 2,
  },
  planTripBannerSub: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkSecondary,
    marginTop: 2,
  },
  changeTripBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: DS_RADIUS.sm,
    backgroundColor: DS_COLOR.surface,
  },
  changeTripBtnText: {
    fontSize: DS_TYPE.caption,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  planSectionLabel: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.inkSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  planDayRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  planDayChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: DS_RADIUS.sm,
    backgroundColor: DS_COLOR.surfaceMuted,
    alignItems: 'center',
    marginRight: 8,
    minWidth: 70,
  },
  planDayChipActive: {
    backgroundColor: DS_COLOR.accent,
  },
  planDayChipTitle: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  planDayChipTitleActive: {
    color: '#FFFFFF',
  },
  planDayChipDate: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
    marginTop: 2,
  },
  planDayChipDateActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  planDayAddBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: DS_RADIUS.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: DS_COLOR.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDayAddBtnText: {
    fontSize: DS_TYPE.caption,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  timeSlotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  timeSlotBtn: {
    width: '48%',
    padding: 10,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.surfaceMuted,
  },
  timeSlotBtnActive: {
    backgroundColor: DS_COLOR.accentSoft,
    borderWidth: 1,
    borderColor: DS_COLOR.accent,
  },
  timeSlotBtnLabel: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  timeSlotBtnLabelActive: {
    color: DS_COLOR.accent,
  },
  timeSlotBtnSub: {
    fontSize: DS_TYPE.caption,
    color: DS_COLOR.inkMuted,
    marginTop: 2,
  },
  timeSlotBtnSubActive: {
    color: DS_COLOR.accent,
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    padding: 10,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.surfaceMuted,
  },
  inputSubLabel: {
    fontSize: DS_TYPE.caption,
    fontWeight: '600',
    color: DS_COLOR.inkSecondary,
  },
  customTimeInput: {
    flex: 1,
    height: 36,
    borderRadius: DS_RADIUS.sm,
    backgroundColor: DS_COLOR.surface,
    paddingHorizontal: 10,
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.ink,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: DS_COLOR.surfaceMuted,
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: DS_COLOR.accent,
  },
  categoryChipText: {
    fontSize: DS_TYPE.caption,
    fontWeight: '500',
    color: DS_COLOR.inkSecondary,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  costInput: {
    height: 40,
    borderRadius: DS_RADIUS.sm,
    backgroundColor: DS_COLOR.surfaceMuted,
    paddingHorizontal: 12,
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginBottom: 8,
  },
  noteInput: {
    height: 58,
    borderRadius: DS_RADIUS.sm,
    backgroundColor: DS_COLOR.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: DS_TYPE.meta,
    color: DS_COLOR.ink,
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  planActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  planBackBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBackBtnText: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: DS_COLOR.inkSecondary,
  },
  planConfirmBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: DS_RADIUS.md,
    backgroundColor: DS_COLOR.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planConfirmBtnText: {
    fontSize: DS_TYPE.meta,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
