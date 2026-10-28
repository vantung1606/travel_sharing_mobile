import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandedLoading } from '@/components/BrandedLoading';
import { Text, TextInput } from '@/components/Themed';
import { FeaturedPlaceCard, PlaceCard } from '@/components/explore/PlaceCard';
import { PlaceDetailModal } from '@/components/explore/PlaceDetailModal';
import { AddPlaceModal } from '@/components/explore/AddPlaceModal';
import { ExploreMapModal } from '@/components/explore/ExploreMapModal';
import { UserProfileModal } from '@/components/UserProfileModal';
import { WF_COLORS } from '@/constants/Colors';
import { authPrompt } from '@/src/services/authPrompt';
import { authStorage } from '@/src/services/authStorage';
import { itineraryApi, ItineraryItem, placeApi, PlaceItem, savedPlaceApi } from '@/src/services/api';
import { savedPlaces } from '@/src/services/savedPlaces';
import { getItineraryDayCount } from '@/src/utils/itinerary';
import { showToast } from '@/components/Toast';

/**
 * Danh mục THẬT của Wayfare (đúng chuỗi lưu trong CSDL — backend lọc theo
 * categoryName). Trước đây thanh danh mục dùng tên tự chế nên bấm vào là ra
 * danh sách rỗng.
 */
const PLACE_CATEGORIES = [
  { label: 'Tất cả', icon: 'compass' },
  { label: 'Núi Rừng & Mây Ngàn', icon: 'tree' },
  { label: 'Di Sản & Phố Cổ', icon: 'university' },
  { label: 'Biển Đảo & Nghỉ Dưỡng', icon: 'sun-o' },
  { label: 'Danh Lam & Thắng Cảnh', icon: 'camera' },
  { label: 'Quán Cafe & Săn Mây', icon: 'coffee' },
];

const PAGE_SIZE = 50;

// Khoảng giá — GIỐNG HẾT web (ExploreFilterDrawer.budgetOptions): lọc client-side
// trên danh sách đã tải, dựa trên ticketPrice thật (562 địa điểm đã có giá).
const BUDGET_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả mức giá' },
  { value: 'under50k', label: 'Dưới 50k' },
  { value: '50k-200k', label: '50k – 200k' },
  { value: '200k-1m', label: '200k – 1tr' },
  { value: 'above1m', label: 'Trên 1tr' },
];

/** Giá tham chiếu (VND) của địa điểm — ưu tiên ticketPrice thật, đối chiếu web.parsePriceVND. */
const parsePriceVND = (item: PlaceItem): number => {
  if (item.ticketPrice != null) {
    return Number(item.ticketPrice) || 0;
  }
  const text = String(item.priceLevel || '').replace(/\s/g, '');
  if (!text || /mi[nN] ph/i.test(text)) return 0;
  const numbers = (text.match(/[\d.,]+/g) || [])
    .map((n) => Number(n.replace(/[.,]/g, '')))
    .filter((n) => !Number.isNaN(n));
  return numbers.length ? Math.min(...numbers) : 0;
};

const matchBudget = (priceVND: number, budget: string): boolean => {
  switch (budget) {
    case 'under50k':
      return priceVND < 50000;
    case '50k-200k':
      return priceVND >= 50000 && priceVND <= 200000;
    case '200k-1m':
      return priceVND > 200000 && priceVND <= 1000000;
    case 'above1m':
      return priceVND > 1000000;
    default:
      return true;
  }
};

export default function ExploreScreen() {
  const router = useRouter();
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [placesTotal, setPlacesTotal] = useState<number>(0);
  const [hasMorePlaces, setHasMorePlaces] = useState<boolean>(false);
  const [placesPage, setPlacesPage] = useState<number>(0);
  const [loadingMorePlaces, setLoadingMorePlaces] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetching, setFetching] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  // Lọc tỉnh thành chạy TRỰC TIẾP trên server (/places?city=) — cùng chuẩn web
  const [selectedCity, setSelectedCity] = useState<string>('Tất cả');
  // Khoảng giá (client-side, giống web) + chế độ xem "Muốn đi"
  const [selectedBudget, setSelectedBudget] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'explore' | 'saved'>('explore');
  const [savedDetails, setSavedDetails] = useState<Record<string, PlaceItem>>({});
  const [hasConnectionError, setHasConnectionError] = useState<boolean>(false);

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

  const fetchPlaces = useCallback(async () => {
    setFetching(true);
    try {
      setHasConnectionError(false);
      const categoryParam = selectedCategory === 'Tất cả' ? undefined : selectedCategory;
      const cityParam = selectedCity === 'Tất cả' ? undefined : selectedCity;
      const result = await placeApi.getPlacesPaged({
        page: 0,
        size: PAGE_SIZE,
        keyword: searchQuery.trim() || undefined,
        category: categoryParam,
        city: cityParam,
      });

      if (result && Array.isArray(result.items)) {
        setPlaces(result.items);
        setPlacesTotal(result.totalElements || result.items.length);
        setHasMorePlaces(Boolean(result.hasNext));
        setPlacesPage(0);
      } else {
        // API phân trang không khả dụng -> tải toàn bộ như trước
        const data = await placeApi.getAllPlaces({
          keyword: searchQuery.trim() || undefined,
          category: categoryParam,
          city: cityParam,
        });
        setPlaces(data || []);
        setPlacesTotal((data || []).length);
        setHasMorePlaces(false);
        setPlacesPage(0);
      }
    } catch (err: any) {
      console.warn('Backend connection notice:', err.message || err);
      setHasConnectionError(true);
    } finally {
      setLoading(false);
      setFetching(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedCategory, selectedCity]);

  const loadMorePlaces = useCallback(async () => {
    if (loadingMorePlaces || !hasMorePlaces) return;
    setLoadingMorePlaces(true);
    try {
      const nextPage = placesPage + 1;
      const categoryParam = selectedCategory === 'Tất cả' ? undefined : selectedCategory;
      const result = await placeApi.getPlacesPaged({
        page: nextPage,
        size: PAGE_SIZE,
        keyword: searchQuery.trim() || undefined,
        category: categoryParam,
        city: selectedCity === 'Tất cả' ? undefined : selectedCity,
      });
      if (result && Array.isArray(result.items)) {
        setPlaces((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...result.items.filter((p) => !seen.has(p.id))];
        });
        setPlacesPage(nextPage);
        setPlacesTotal(result.totalElements || 0);
        setHasMorePlaces(Boolean(result.hasNext));
      }
    } catch (err: any) {
      console.warn('Load more places error:', err?.message || err);
    } finally {
      setLoadingMorePlaces(false);
    }
  }, [loadingMorePlaces, hasMorePlaces, placesPage, searchQuery, selectedCategory, selectedCity]);

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
    return () => { alive = false; };
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

  const isFiltering = searchQuery.trim().length > 0 || selectedCategory !== 'Tất cả' || selectedCity !== 'Tất cả';

  // Danh sách tỉnh THẬT từ dữ liệu đã tải (xếp theo số địa điểm giảm dần)
  const cityOptions = useMemo(() => {
    const counts = new Map<string, number>();
    places.forEach((p) => {
      if (p.city) counts.set(p.city, (counts.get(p.city) || 0) + 1);
    });
    return ['Tất cả', ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)];
  }, [places]);

  // Dải "Nổi bật": lấy theo điểm đánh giá thật của danh sách đang có.
  const featured = useMemo(() => {
    if (isFiltering || selectedBudget !== 'all') return [];
    return [...places]
      .filter((p) => (p.reviewsCount ?? 0) > 0 && (p.rating ?? 0) > 0)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0))
      .slice(0, 10);
  }, [places, isFiltering, selectedBudget]);

  // Địa điểm hiển thị khi đang ở chế độ Khám phá (lọc giá client-side như web)
  const displayedPlaces = useMemo(
    () => (selectedBudget === 'all' ? places : places.filter((p) => matchBudget(parsePriceVND(p), selectedBudget))),
    [places, selectedBudget]
  );

  // Sắp lại danh sách chi tiết "Muốn đi" đúng theo(savedIds) — hiệu quả: hủy tim -> hết khỏi list.
  const savedList = useMemo(
    () => savedIds.map((id) => savedDetails[String(id)]).filter(Boolean),
    [savedIds, savedDetails]
  );

  // Khi sang chế độ "Muốn đi": nạp chi tiết địa điểm THẬT theo id đã lưu
  // (không có dữ liệu cứng; những id đã có sẵn chi tiết thì bỏ qua).
  // NOTE: khi bỏ tim, danh sách được lead qua savedList (map theo savedIds)
  // nên mục vừa bỏ tự biến mất mà không cần effect dọn dẹp.
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

  return (
    <View style={styles.container}>
      <FlatList
        data={viewMode === 'saved' ? savedList : displayedPlaces}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            saved={savedIds.includes(item.id)}
            onPress={() => handleOpenPlaceDetail(item)}
            onToggleSave={() => handleToggleSave(item)}
            onAddToPlan={() => {
              setSelectedPlace(item);
              handleOpenAddToPlan();
            }}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[WF_COLORS.primary]} />}
        onEndReached={viewMode === 'saved' ? undefined : loadMorePlaces}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          <View style={styles.listFooter}>
            {viewMode === 'saved' ? (
              savedList.length > 0 ? (
                <Text style={styles.listFooterText}>
                  {savedList.length} địa điểm bạn đang muốn đi · nhấn tim lại để bỏ lưu
                </Text>
              ) : null
            ) : loadingMorePlaces ? (
              <ActivityIndicator size="small" color={WF_COLORS.primary} />
            ) : hasMorePlaces ? (
              <Text style={styles.listFooterText}>
                Cuộn để tải thêm · {places.length}/{placesTotal} địa điểm
              </Text>
            ) : places.length > 0 ? (
              <Text style={styles.listFooterText}>Đã hiển thị toàn bộ {placesTotal} địa điểm</Text>
            ) : null}
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.overline}>WAYFARE · ĐỊA ĐIỂM</Text>
                <Text style={styles.pageTitle}>Điểm đến Việt Nam</Text>
                <Text style={styles.pageSubtitle}>Những tọa độ đẹp đã được cộng đồng kiểm chứng</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.mapBtn}
                    activeOpacity={0.85}
                    onPress={() => setIsMapOpen(true)}>
                    <FontAwesome name="map" size={11} color="#FFFDF8" style={{ marginRight: 5 }} />
                    <Text style={styles.proposeBtnText}>Bản đồ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.proposeBtn}
                    activeOpacity={0.85}
                    onPress={() => setIsAddPlaceOpen(true)}>
                    <FontAwesome name="plus" size={11} color="#FFFDF8" style={{ marginRight: 5 }} />
                    <Text style={styles.proposeBtnText}>Đề xuất</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalBadgeNum}>{placesTotal || '--'}</Text>
                  <Text style={styles.totalBadgeLabel}>địa điểm</Text>
                </View>
              </View>
            </View>

            {/* Chế độ xem: Khám phá / Muốn đi (wishlist đã đồng bộ server) */}
            <View style={styles.viewToggleRow}>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'explore' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('explore')}>
                <FontAwesome
                  name="compass"
                  size={12}
                  color={viewMode === 'explore' ? '#FFFDF8' : WF_COLORS.slate600}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.viewToggleText, viewMode === 'explore' && styles.viewToggleTextActive]}>
                  Khám phá
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewToggleBtn, viewMode === 'saved' && styles.viewToggleBtnActive]}
                onPress={() => setViewMode('saved')}>
                <FontAwesome
                  name="heart"
                  size={12}
                  color={viewMode === 'saved' ? '#FFFDF8' : WF_COLORS.rose}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.viewToggleText, viewMode === 'saved' && styles.viewToggleTextActive]}>
                  Muốn đi{savedIds.length > 0 ? ` (${savedIds.length})` : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {viewMode === 'explore' ? (
              <>
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
              {fetching && places.length > 0 ? (
                <ActivityIndicator size="small" color={WF_COLORS.primary} />
              ) : searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                  <FontAwesome name="times-circle" size={15} color={WF_COLORS.slate400} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}>
              {PLACE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.label;
                return (
                  <TouchableOpacity
                    key={cat.label}
                    onPress={() => setSelectedCategory(cat.label)}
                    style={[styles.categoryBtn, isSelected && styles.categoryBtnActive]}>
                    <FontAwesome
                      name={cat.icon as any}
                      size={12}
                      color={isSelected ? '#FFFDF8' : WF_COLORS.slate500}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.categoryBtnText, isSelected && styles.categoryBtnTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {cityOptions.length > 2 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}>
                {cityOptions.map((city) => {
                  const isSelected = selectedCity === city;
                  return (
                    <TouchableOpacity
                      key={city}
                      onPress={() => setSelectedCity(city)}
                      style={[styles.cityBtn, isSelected && styles.cityBtnActive]}>
                      <FontAwesome
                        name="map-marker"
                        size={11}
                        color={isSelected ? '#FFFDF8' : WF_COLORS.primary}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.cityBtnText, isSelected && styles.cityBtnTextActive]}>
                        {city}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {featured.length > 0 ? (
              <View style={styles.featuredBlock}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Nổi bật tuần này</Text>
                  <Text style={styles.sectionHint}>Đánh giá cao nhất</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredScroll}>
                  {featured.map((place) => (
                    <FeaturedPlaceCard
                      key={`featured-${place.id}`}
                      place={place}
                      onPress={() => handleOpenPlaceDetail(place)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Bộ lọc KHOẢNG GIÁ — giống web (client-side trên ticketPrice thật) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}>
              {BUDGET_OPTIONS.map((opt) => {
                const isSelected = selectedBudget === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setSelectedBudget(opt.value)}
                    style={[styles.budgetBtn, isSelected && styles.budgetBtnActive]}>
                    <FontAwesome
                      name="money"
                      size={11}
                      color={isSelected ? '#FFFDF8' : WF_COLORS.primary}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.budgetBtnText, isSelected && styles.budgetBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionTitle}>
                {isFiltering || selectedBudget !== 'all' ? 'Kết quả lọc' : 'Tất cả địa điểm'}
              </Text>
              {isFiltering || selectedBudget !== 'all' ? (
                <Text style={styles.sectionHint}>{displayedPlaces.length} địa điểm</Text>
              ) : (
                <Text style={styles.sectionHint}>Cuộn để xem thêm</Text>
              )}
            </View>
              </>
            ) : (
              <>
                <View style={styles.listHeaderRow}>
                  <Text style={styles.sectionTitle}>Danh sách Muốn đi</Text>
                  <Text style={styles.sectionHint}>
                    {savedIds.length > 0 ? `${savedIds.length} địa điểm · đồng bộ cả web` : 'Trống'}
                  </Text>
                </View>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          viewMode === 'saved' ? (
            <View style={styles.centerBox}>
              <FontAwesome name="heart-o" size={40} color={WF_COLORS.rose} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>Chưa có địa điểm nào được lưu</Text>
              <Text style={styles.emptySub}>
                Về tab Khám phá, nhấn nút tim trên địa điểm bạn thích — danh sách sẽ đồng bộ cả sang web.
              </Text>
            </View>
          ) : loading ? (
            <BrandedLoading
              title="Đang tải điểm đến"
              subtitle="Wayfare đang chuẩn bị những tọa độ du lịch đẹp nhất cho bạn."
            />
          ) : hasConnectionError ? (
            <View style={styles.centerBox}>
              <View style={styles.alertCard}>
                <FontAwesome name="cloud" size={32} color={WF_COLORS.primary} style={{ marginBottom: 10 }} />
                <Text style={styles.alertTitle}>Không thể tải điểm đến</Text>
                <Text style={styles.alertDesc}>
                  Kiểm tra kết nối mạng rồi thử lại nhé. Danh sách điểm đến sẽ hiện ngay khi có dữ liệu.
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchPlaces}>
                  <Text style={styles.retryBtnText}>Thử kết nối lại</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.centerBox}>
              <FontAwesome name="compass" size={44} color={WF_COLORS.slate400} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>Không tìm thấy địa điểm phù hợp</Text>
              <Text style={styles.emptySub}>Thử từ khóa khác, hoặc chọn lại danh mục "Tất cả" nhé!</Text>
            </View>
          )
        }
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
                  <TouchableOpacity
                    onPress={() => setSelectedPlanTrip(null)}
                    style={styles.backTripBtn}>
                    <FontAwesome name="arrow-left" size={14} color={WF_COLORS.slate700} />
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
                <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
              </TouchableOpacity>
            </View>

            {/* BƯỚC 1: CHỌN CHUYẾN ĐI */}
            {!selectedPlanTrip ? (
              loadingItineraries ? (
                <ActivityIndicator size="small" color={WF_COLORS.primary} style={{ marginVertical: 30 }} />
              ) : myItineraries.length === 0 ? (
                <View style={styles.noItineraryBox}>
                  <FontAwesome name="calendar-o" size={36} color={WF_COLORS.slate400} style={{ marginBottom: 10 }} />
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
                        <FontAwesome name="chevron-right" size={13} color={WF_COLORS.primary} />
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
                  <TouchableOpacity
                    onPress={() => setSelectedPlanTrip(null)}
                    style={styles.changeTripBtn}>
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
                  <TouchableOpacity
                    style={styles.planDayAddBtn}
                    onPress={handleAddExtraDay}>
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
                  <TouchableOpacity
                    style={styles.planBackBtn}
                    onPress={() => setSelectedPlanTrip(null)}>
                    <Text style={styles.planBackBtnText}>Quay lại</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.planConfirmBtn, submittingPlan && { opacity: 0.6 }]}
                    disabled={submittingPlan}
                    onPress={handleConfirmAddPlaceToItinerary}>
                    {submittingPlan ? (
                      <ActivityIndicator size="small" color="#FFFDF8" />
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
          setPlacesTotal((prev) => prev + 1);
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
    backgroundColor: WF_COLORS.slate50,
  },
  listContainer: {
    paddingBottom: 28,
  },
  listFooter: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listFooterText: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    fontWeight: '600',
  },
  header: {
    paddingTop: 18,
    paddingBottom: 4,
    marginBottom: 6,
    backgroundColor: WF_COLORS.slate50,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  titleBlock: {
    flex: 1,
    marginRight: 12,
  },
  overline: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: WF_COLORS.primary,
    marginBottom: 3,
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: WF_COLORS.slate900,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  pageSubtitle: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginTop: 3,
    lineHeight: 17,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    minWidth: 64,
  },
  proposeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    minWidth: 70,
  },
  proposeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFDF8',
  },
  totalBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    backgroundColor: WF_COLORS.white,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  totalBadgeNum: {
    fontSize: 18,
    fontWeight: '900',
    color: WF_COLORS.primary,
    letterSpacing: -0.4,
  },
  totalBadgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: WF_COLORS.primary,
    marginTop: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.white,
    borderRadius: 5,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: WF_COLORS.slate900,
  },
  clearBtn: {
    padding: 4,
  },
  categoryScroll: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.slate50,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 5,
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
    color: '#FFFDF8',
    fontWeight: '800',
  },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    height: 30,
    borderRadius: 5,
    marginRight: 8,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.white,
  },
  cityBtnActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  cityBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  cityBtnTextActive: {
    color: '#FFFDF8',
    fontWeight: '800',
  },
  viewToggleRow: {
    flexDirection: 'row',
    marginTop: 0,
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: '#FFFDF8',
  },
  viewToggleBtnActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate600,
  },
  viewToggleTextActive: {
    color: '#FFFDF8',
    fontWeight: '800',
  },
  budgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    height: 30,
    borderRadius: 5,
    marginRight: 8,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.white,
  },
  budgetBtnActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  budgetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  budgetBtnTextActive: {
    color: '#FFFDF8',
    fontWeight: '800',
  },
  featuredBlock: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  sectionHint: {
    fontSize: 11,
    color: WF_COLORS.slate400,
    fontWeight: '600',
  },
  featuredScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: WF_COLORS.white,
    padding: 20,
    borderRadius: 6,
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
    borderRadius: 5,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#FFFDF8',
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
  // Sub-modal chọn lịch trình
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 26, 21, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCardBox: {
    width: '100%',
    backgroundColor: WF_COLORS.white,
    borderRadius: 6,
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
  backTripBtn: {
    width: 28,
    height: 28,
    borderRadius: 5,
    backgroundColor: WF_COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTripBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 5,
    backgroundColor: WF_COLORS.primary,
    marginTop: 8,
  },
  createTripBtnText: {
    color: '#FFFDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  noItineraryBox: {
    padding: 24,
    alignItems: 'center',
  },
  noItineraryText: {
    color: WF_COLORS.slate500,
    textAlign: 'center',
    fontSize: 12,
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
    borderRadius: 5,
    backgroundColor: WF_COLORS.slate50,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    marginBottom: 8,
  },
  itineraryChoiceInfo: {
    flex: 1,
  },
  itineraryChoiceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  itineraryChoiceDest: {
    fontSize: 11,
    color: WF_COLORS.slate500,
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
    borderRadius: 6,
    backgroundColor: '#F6E6DD',
    borderWidth: 1,
    borderColor: '#E8D5C9',
    marginBottom: 14,
  },
  planTripBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: WF_COLORS.primary,
    textTransform: 'uppercase',
  },
  planTripBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginTop: 1,
  },
  planTripBannerSub: {
    fontSize: 11,
    color: WF_COLORS.slate600,
    marginTop: 2,
  },
  changeTripBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  changeTripBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  planSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate700,
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
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.white,
    alignItems: 'center',
    marginRight: 8,
    minWidth: 70,
  },
  planDayChipActive: {
    borderColor: WF_COLORS.primary,
    backgroundColor: WF_COLORS.primary,
  },
  planDayChipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  planDayChipTitleActive: {
    color: '#FFFDF8',
  },
  planDayChipDate: {
    fontSize: 9,
    color: WF_COLORS.slate400,
    marginTop: 2,
  },
  planDayChipDateActive: {
    color: '#F6E6DD',
  },
  planDayAddBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: WF_COLORS.primaryLight,
    backgroundColor: '#F6E6DD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planDayAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.primary,
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
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
  },
  timeSlotBtnActive: {
    borderColor: WF_COLORS.primary,
    backgroundColor: '#F6E6DD',
  },
  timeSlotBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  timeSlotBtnLabelActive: {
    color: WF_COLORS.primary,
  },
  timeSlotBtnSub: {
    fontSize: 10,
    color: WF_COLORS.slate500,
    marginTop: 2,
  },
  timeSlotBtnSubActive: {
    color: WF_COLORS.primary,
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: WF_COLORS.slate50,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  inputSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  customTimeInput: {
    flex: 1,
    height: 36,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_COLORS.slate400,
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
    marginRight: 6,
  },
  categoryChipActive: {
    borderColor: WF_COLORS.primary,
    backgroundColor: WF_COLORS.primary,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  categoryChipTextActive: {
    color: '#FFFDF8',
  },
  costInput: {
    height: 40,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_COLORS.slate400,
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate900,
    marginBottom: 8,
  },
  noteInput: {
    height: 58,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_COLORS.slate400,
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: WF_COLORS.slate900,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 5,
    backgroundColor: WF_COLORS.slate100,
  },
  planBackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate700,
  },
  planConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 5,
    backgroundColor: WF_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planConfirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFDF8',
  },
});
