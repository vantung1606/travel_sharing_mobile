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
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { WF_COLORS } from '@/constants/Colors';
import { itineraryApi, ItineraryItem, API_BASE_URL } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';

export default function ItineraryScreen() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'drafts'>('upcoming');
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  // Modal Tạo Lịch Trình
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDestination, setNewDestination] = useState<string>('');
  const [newStartDate, setNewStartDate] = useState<string>('2026-10-25');
  const [newEndDate, setNewEndDate] = useState<string>('2026-10-28');
  const [newBudget, setNewBudget] = useState<string>('3500000');
  const [newCover, setNewCover] = useState<string>('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80');
  const [submittingPlan, setSubmittingPlan] = useState<boolean>(false);

  // Modal Chi Tiết Lịch Trình
  const [selectedItinerary, setSelectedItinerary] = useState<ItineraryItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Modal Thêm Điểm Dừng vào Ngày
  const [addDetailModalVisible, setAddDetailModalVisible] = useState<boolean>(false);
  const [newPlaceName, setNewPlaceName] = useState<string>('');
  const [newPlaceTime, setNewPlaceTime] = useState<string>('09:00');
  const [newPlaceCategory, setNewPlaceCategory] = useState<string>('Tham quan');
  const [newPlaceNote, setNewPlaceNote] = useState<string>('');

  const fetchItineraries = useCallback(async () => {
    try {
      setHasError(false);
      const data = await itineraryApi.getAllItineraries();
      setItineraries(data || []);
    } catch (err: any) {
      console.warn('Fetch itineraries error:', err.message || err);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchItineraries();
  }, [fetchItineraries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItineraries();
  };

  const handleOpenCreateModal = async () => {
    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập ở tab "Tài khoản" để có thể tạo và lưu lịch trình chuyến đi!',
        [{ text: 'Đã hiểu' }]
      );
      return;
    }
    setCreateModalVisible(true);
  };

  const handleCreateItinerary = async () => {
    if (!newTitle.trim() || !newDestination.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập Tên chuyến đi và Điểm đến');
      return;
    }

    try {
      setSubmittingPlan(true);
      const created = await itineraryApi.createItinerary({
        title: newTitle.trim(),
        destination: newDestination.trim(),
        startDate: newStartDate.trim() || undefined,
        endDate: newEndDate.trim() || undefined,
        budgetTotal: parseFloat(newBudget) || 0,
        coverImageUrl: newCover.trim() || undefined,
        status: 'PLANNING',
      });

      Alert.alert('Thành công! 🎉', `Đã tạo kế hoạch chuyến đi "${created.title}"`);
      setCreateModalVisible(false);
      setNewTitle('');
      setNewDestination('');
      fetchItineraries();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Không thể tạo lịch trình';
      Alert.alert('Lỗi tạo lịch trình', msg);
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleOpenDetail = async (itinerary: ItineraryItem) => {
    setSelectedItinerary(itinerary);
    setDetailModalVisible(true);
    setSelectedDay(1);
    setLoadingDetail(true);
    try {
      const full = await itineraryApi.getItineraryById(itinerary.id);
      setSelectedItinerary(full);
    } catch (e) {
      console.warn('Get detail error', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleAddStopToDay = async () => {
    if (!newPlaceName.trim() || !selectedItinerary) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên điểm dừng');
      return;
    }

    try {
      await itineraryApi.addDetail(selectedItinerary.id, {
        itineraryId: selectedItinerary.id,
        locationName: newPlaceName.trim(),
        startTime: newPlaceTime.trim(),
        category: newPlaceCategory,
        dayNumber: selectedDay,
        note: newPlaceNote.trim(),
      });

      Alert.alert('Thành công', `Đã thêm "${newPlaceName}" vào Ngày ${selectedDay}`);
      setAddDetailModalVisible(false);
      setNewPlaceName('');
      setNewPlaceNote('');

      const full = await itineraryApi.getItineraryById(selectedItinerary.id);
      setSelectedItinerary(full);
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể thêm điểm dừng');
    }
  };

  const handleDeleteDetail = (detailId: number) => {
    Alert.alert('Xóa điểm dừng', 'Bạn có chắc chắn muốn xóa điểm dừng này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await itineraryApi.deleteDetail(detailId);
            if (selectedItinerary) {
              const full = await itineraryApi.getItineraryById(selectedItinerary.id);
              setSelectedItinerary(full);
            }
          } catch (e) {
            Alert.alert('Lỗi', 'Không thể xóa điểm dừng');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ItineraryItem }) => {
    const imageUrl = item.coverImageUrl || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => handleOpenDetail(item)}
        style={styles.card}>
        <View style={styles.imageBox}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.destinationBadge}>
            <FontAwesome name="map-marker" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.destinationText}>{item.destination || 'Điểm đến'}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status || 'ACTIVE'}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            {item.startDate ? (
              <View style={styles.metaPill}>
                <FontAwesome name="calendar" size={11} color={WF_COLORS.primary} />
                <Text style={styles.metaText}>
                  {item.startDate} {item.endDate ? `→ ${item.endDate}` : ''}
                </Text>
              </View>
            ) : null}

            {item.budgetTotal ? (
              <View style={styles.metaPill}>
                <FontAwesome name="money" size={12} color="#F59E0B" />
                <Text style={styles.metaText}>
                  {item.budgetTotal.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            ) : null}

            {item.creatorName ? (
              <View style={styles.metaPill}>
                <FontAwesome name="user-circle" size={12} color={WF_COLORS.slate500} />
                <Text style={styles.metaText}>{item.creatorName}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const dayDetails = selectedItinerary?.details?.filter(d => (d.dayNumber || 1) === selectedDay) || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={itineraries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[WF_COLORS.primary]} />}
        ListHeaderComponent={
          <View style={styles.headerWrapper}>
            {/* 1. Breadcrumb chuẩn Web */}
            <View style={styles.breadcrumbRow}>
              <FontAwesome name="compass" size={12} color={WF_COLORS.primary} />
              <Text style={styles.breadcrumbLink}>Trang chủ</Text>
              <Text style={styles.breadcrumbDivider}>/</Text>
              <Text style={styles.breadcrumbCurrent}>Quản lý Lịch trình</Text>
            </View>

            {/* 2. Page Title & Action Button */}
            <View style={styles.titleActionRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.pageTitle}>Lịch Trình Chuyến Đi</Text>
                <Text style={styles.pageSubtitle}>
                  Khám phá & tổ chức các hành trình du lịch thông minh
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.createTripBtn}
                onPress={handleOpenCreateModal}>
                <FontAwesome name="plus" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.createTripBtnText}>Lên Plan mới</Text>
              </TouchableOpacity>
            </View>

            {/* 3. Filter Tabs (Sắp diễn ra | Đã hoàn thành | Bản nháp) */}
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]}
                onPress={() => setActiveTab('upcoming')}>
                <Text style={[styles.tabBtnText, activeTab === 'upcoming' && styles.tabBtnTextActive]}>
                  Sắp diễn ra
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]}
                onPress={() => setActiveTab('completed')}>
                <Text style={[styles.tabBtnText, activeTab === 'completed' && styles.tabBtnTextActive]}>
                  Đã hoàn thành
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'drafts' && styles.tabBtnActive]}
                onPress={() => setActiveTab('drafts')}>
                <Text style={[styles.tabBtnText, activeTab === 'drafts' && styles.tabBtnTextActive]}>
                  Bản nháp
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={WF_COLORS.primary} />
              <Text style={styles.loadingText}>Đang nạp lịch trình chuyến đi từ Railway...</Text>
            </View>
          ) : hasError ? (
            <View style={styles.centerBox}>
              <View style={styles.alertCard}>
                <FontAwesome name="calendar" size={32} color={WF_COLORS.primary} style={{ marginBottom: 10 }} />
                <Text style={styles.alertTitle}>Chưa có kết nối máy chủ</Text>
                <Text style={styles.alertDesc}>Đang nạp từ: {API_BASE_URL}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchItineraries}>
                  <Text style={styles.retryBtnText}>Tải lại dữ liệu</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.centerBox}>
              <FontAwesome name="suitcase" size={44} color={WF_COLORS.slate400} style={{ opacity: 0.5 }} />
              <Text style={styles.emptyTitle}>Chưa có kế hoạch chuyến đi</Text>
              <Text style={styles.emptySub}>Bấm nút "Lên Plan mới" bên trên để tạo lịch trình đầu tiên nhé!</Text>
            </View>
          )
        }
      />

      {/* ─── MODAL TẠO LỊCH TRÌNH ───────────────────────────────── */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCardBox}>
            <View style={styles.modalCardHeader}>
              <Text style={styles.modalCardTitle}>✈️ Lên Kế Hoạch Chuyến Đi</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên chuyến đi *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="VD: Khám phá Đà Nẵng 4N3Đ"
                  placeholderTextColor={WF_COLORS.slate400}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Điểm đến chính *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="VD: Đà Nẵng, Mũi Né, Sa Pa..."
                  placeholderTextColor={WF_COLORS.slate400}
                  value={newDestination}
                  onChangeText={setNewDestination}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Ngày đi</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="2026-10-25"
                    placeholderTextColor={WF_COLORS.slate400}
                    value={newStartDate}
                    onChangeText={setNewStartDate}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Ngày về</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="2026-10-28"
                    placeholderTextColor={WF_COLORS.slate400}
                    value={newEndDate}
                    onChangeText={setNewEndDate}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dự toán ngân sách (VNĐ)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="3500000"
                  placeholderTextColor={WF_COLORS.slate400}
                  value={newBudget}
                  onChangeText={setNewBudget}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.submitPlanBtn, submittingPlan && { opacity: 0.7 }]}
                onPress={handleCreateItinerary}
                disabled={submittingPlan}>
                {submittingPlan ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitPlanBtnText}>Lưu & Bắt đầu lên lịch trình</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL CHI TIẾT LỊCH TRÌNH THEO NGÀY ───────────────── */}
      <Modal visible={detailModalVisible} animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        <SafeAreaView style={styles.modalSafeContainer} edges={['top', 'bottom']}>
          <View style={styles.detailNavbar}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.backBtn}>
              <FontAwesome name="chevron-left" size={15} color={WF_COLORS.slate700} />
            </TouchableOpacity>
            <Text style={styles.detailNavTitle} numberOfLines={1}>
              {selectedItinerary?.title || 'Chi tiết chuyến đi'}
            </Text>
            <View style={{ width: 30 }} />
          </View>

          {loadingDetail ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={WF_COLORS.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
              {/* Trip Overview Hero */}
              <View style={styles.overviewHeroCard}>
                <Text style={styles.overviewDestination}>
                  📍 {selectedItinerary?.destination}
                </Text>
                <Text style={styles.overviewTitle}>
                  {selectedItinerary?.title}
                </Text>

                <View style={styles.overviewMetaRow}>
                  <View style={styles.overviewMetaPill}>
                    <FontAwesome name="calendar" size={12} color={WF_COLORS.primary} style={{ marginRight: 5 }} />
                    <Text style={styles.overviewMetaText}>
                      {selectedItinerary?.startDate} → {selectedItinerary?.endDate || ''}
                    </Text>
                  </View>
                  {selectedItinerary?.budgetTotal ? (
                    <View style={styles.overviewMetaPill}>
                      <FontAwesome name="money" size={12} color="#F59E0B" style={{ marginRight: 5 }} />
                      <Text style={styles.overviewMetaText}>
                        {selectedItinerary.budgetTotal.toLocaleString('vi-VN')} đ
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Day Selector Chips */}
              <View style={styles.daySelectorRow}>
                {[1, 2, 3, 4, 5].map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayChipBtn, selectedDay === day && styles.dayChipBtnActive]}
                    onPress={() => setSelectedDay(day)}>
                    <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>
                      Ngày {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Day Section Header */}
              <View style={styles.daySectionHeader}>
                <Text style={styles.daySectionTitle}>
                  Điểm đến & Hoạt động (Ngày {selectedDay})
                </Text>
                <TouchableOpacity
                  style={styles.addStopBtn}
                  onPress={() => setAddDetailModalVisible(true)}>
                  <FontAwesome name="plus" size={11} color={WF_COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.addStopBtnText}>Thêm điểm dừng</Text>
                </TouchableOpacity>
              </View>

              {/* Timeline stops */}
              {dayDetails.length === 0 ? (
                <View style={styles.emptyDayBox}>
                  <FontAwesome name="map-o" size={30} color={WF_COLORS.slate400} style={{ opacity: 0.5 }} />
                  <Text style={styles.emptyDayText}>Chưa có điểm dừng nào trong Ngày {selectedDay}.</Text>
                  <Text style={styles.emptyDaySub}>Bấm "+ Thêm điểm dừng" để lên lịch tham quan cho ngày này!</Text>
                </View>
              ) : (
                dayDetails.map((detail, idx) => (
                  <View key={detail.id || idx} style={styles.stopCard}>
                    <View style={styles.stopTimeCol}>
                      <FontAwesome name="clock-o" size={12} color={WF_COLORS.primary} />
                      <Text style={styles.stopTimeText}>{detail.startTime || `${idx + 8}:00`}</Text>
                    </View>

                    <View style={styles.stopContentCol}>
                      <Text style={styles.stopNameText}>{detail.locationName}</Text>
                      {detail.category ? (
                        <Text style={styles.stopCategoryText}>{detail.category}</Text>
                      ) : null}
                      {detail.note ? (
                        <Text style={styles.stopNoteText}>📝 {detail.note}</Text>
                      ) : null}
                    </View>

                    {detail.id ? (
                      <TouchableOpacity
                        style={styles.deleteStopBtn}
                        onPress={() => handleDeleteDetail(detail.id!)}>
                        <FontAwesome name="trash-o" size={15} color="#EF4444" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </SafeAreaView>

        {/* ─── SUB-MODAL THÊM ĐIỂM DỪNG VÀO NGÀY ───────────────── */}
        <Modal visible={addDetailModalVisible} animationType="fade" transparent>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCardBox}>
              <View style={styles.modalCardHeader}>
                <Text style={styles.modalCardTitle}>➕ Thêm Điểm Dừng (Ngày {selectedDay})</Text>
                <TouchableOpacity onPress={() => setAddDetailModalVisible(false)}>
                  <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tên địa điểm / Hoạt động *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="VD: Cầu Vàng, Ăn mì Quảng Bà Mua..."
                  placeholderTextColor={WF_COLORS.slate400}
                  value={newPlaceName}
                  onChangeText={setNewPlaceName}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Giờ bắt đầu</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="09:00"
                    placeholderTextColor={WF_COLORS.slate400}
                    value={newPlaceTime}
                    onChangeText={setNewPlaceTime}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Thể loại</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Tham quan"
                    placeholderTextColor={WF_COLORS.slate400}
                    value={newPlaceCategory}
                    onChangeText={setNewPlaceCategory}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ghi chú thêm</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Vé vào cổng, lưu ý trang phục..."
                  placeholderTextColor={WF_COLORS.slate400}
                  value={newPlaceNote}
                  onChangeText={setNewPlaceNote}
                />
              </View>

              <TouchableOpacity style={styles.submitPlanBtn} onPress={handleAddStopToDay}>
                <Text style={styles.submitPlanBtnText}>Thêm vào lịch trình</Text>
              </TouchableOpacity>
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
  list: {
    paddingBottom: 24,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
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
  titleActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  },
  createTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: WF_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  createTripBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  tabBtnActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  tabBtnTextActive: {
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
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  destinationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  content: {
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginBottom: 8,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: WF_COLORS.slate100,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_COLORS.slate700,
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
  // Modal Styles
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
    maxHeight: '85%',
  },
  modalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate700,
    marginBottom: 5,
  },
  modalInput: {
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: WF_COLORS.slate900,
  },
  submitPlanBtn: {
    backgroundColor: WF_COLORS.primary,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  submitPlanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  // Detail Modal
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
  },
  detailScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  overviewHeroCard: {
    backgroundColor: WF_COLORS.primarySoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
    padding: 16,
    marginBottom: 14,
  },
  overviewDestination: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.primary,
    marginBottom: 4,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    marginBottom: 10,
  },
  overviewMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  overviewMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  overviewMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  daySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  dayChipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  dayChipBtnActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  dayChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  daySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  daySectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WF_COLORS.slate900,
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addStopBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  emptyDayBox: {
    backgroundColor: WF_COLORS.slate50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    padding: 24,
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: WF_COLORS.slate700,
    marginTop: 8,
  },
  emptyDaySub: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    marginTop: 2,
    textAlign: 'center',
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  stopTimeCol: {
    alignItems: 'center',
    width: 44,
    marginRight: 12,
  },
  stopTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.primary,
    marginTop: 2,
  },
  stopContentCol: {
    flex: 1,
  },
  stopNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginBottom: 2,
  },
  stopCategoryText: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    marginBottom: 2,
  },
  stopNoteText: {
    fontSize: 11,
    color: WF_COLORS.slate600,
  },
  deleteStopBtn: {
    padding: 6,
  },
});
