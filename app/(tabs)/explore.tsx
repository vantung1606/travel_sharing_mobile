import FontAwesome from '@expo/vector-icons/FontAwesome';
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
import { WF_COLORS } from '@/constants/Colors';
import { authPrompt } from '@/src/services/authPrompt';
import { authStorage } from '@/src/services/authStorage';
import { itineraryApi, ItineraryItem, placeApi, PlaceItem, savedPlaceApi } from '@/src/services/api';
import { savedPlaces } from '@/src/services/savedPlaces';
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
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  const [savedIds, setSavedIds] = useState<number[]>([]);

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

  const handleOpenAddToPlan = async () => {
    const session = await authStorage.getSession();
    if (!session) {
      // Mở thẳng form đăng nhập toàn màn hình thay vì chỉ báo lỗi.
      authPrompt.open();
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
        note: `Thêm từ Địa điểm: ${selectedPlace.name}`,
      });

      showToast({
        kind: 'success',
        title: 'Đã thêm vào lịch trình',
        message: `"${selectedPlace.name}" đã được đưa vào Ngày ${selectedDayNumber} của chuyến đi "${itinerary.title}".`,
        icon: 'map-marker',
      });
      setAddToPlanModalVisible(false);
      setDetailModalVisible(false);
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Thêm vào lịch trình thất bại',
        message: err.response?.data?.message || 'Không thể thêm địa điểm này vào lịch trình.',
      });
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
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeNum}>{placesTotal || '--'}</Text>
                <Text style={styles.totalBadgeLabel}>địa điểm</Text>
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
                  color={viewMode === 'explore' ? '#FFFFFF' : WF_COLORS.slate600}
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
                  color={viewMode === 'saved' ? '#FFFFFF' : WF_COLORS.rose}
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
                        color={isSelected ? '#FFFFFF' : WF_COLORS.primary}
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
                      color={isSelected ? '#FFFFFF' : WF_COLORS.primary}
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
      />

      {/* ─── SUB-MODAL CHỌN LỊCH TRÌNH ───────────────────────── */}
      <Modal
        visible={addToPlanModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setAddToPlanModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardBox}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitle}>Chọn Lịch Trình Của Bạn</Text>
              <TouchableOpacity onPress={() => setAddToPlanModalVisible(false)}>
                <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalCardSub}>Thêm "{selectedPlace?.name}" vào:</Text>

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
              <View style={styles.noItineraryBox}>
                <Text style={styles.noItineraryText}>
                  Bạn chưa có lịch trình nào. Hãy vào tab "Lịch trình" tạo chuyến đi trước nhé!
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.itineraryList} showsVerticalScrollIndicator={false}>
                {myItineraries.map((itinerary) => (
                  <TouchableOpacity
                    key={itinerary.id}
                    style={styles.itineraryChoiceItem}
                    onPress={() => handleConfirmAddPlaceToItinerary(itinerary)}>
                    <View style={styles.itineraryChoiceInfo}>
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
    paddingTop: 6,
    paddingBottom: 10,
    marginBottom: 6,
    backgroundColor: WF_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate200,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 12,
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
    fontSize: 24,
    fontWeight: '900',
    color: WF_COLORS.slate900,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    marginTop: 3,
    lineHeight: 17,
  },
  totalBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 74,
    backgroundColor: WF_COLORS.primarySoft,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    backgroundColor: WF_COLORS.slate100,
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 46,
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
    backgroundColor: WF_COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontWeight: '800',
  },
  cityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
    backgroundColor: WF_COLORS.primarySoft,
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
    color: '#FFFFFF',
    fontWeight: '800',
  },
  viewToggleRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: '#FFFFFF',
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
    color: '#FFFFFF',
    fontWeight: '800',
  },
  budgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
    backgroundColor: WF_COLORS.primarySoft,
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
    color: '#FFFFFF',
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
  // Sub-modal chọn lịch trình
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
    fontWeight: '700',
    color: WF_COLORS.slate700,
    marginRight: 2,
  },
  dayCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_COLORS.slate100,
  },
  dayCircleBtnActive: {
    backgroundColor: WF_COLORS.primary,
  },
  dayCircleText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate700,
  },
  dayCircleTextActive: {
    color: '#FFFFFF',
  },
  noItineraryBox: {
    padding: 20,
    alignItems: 'center',
  },
  noItineraryText: {
    color: WF_COLORS.slate500,
    textAlign: 'center',
    marginBottom: 12,
  },
  itineraryList: {
    maxHeight: 220,
  },
  itineraryChoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
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
});
