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
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { itineraryApi, ItineraryItem, ItineraryDetailItem } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';

export default function ItineraryScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const theme = Colors[colorScheme];

  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
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
  const [newBudget, setNewBudget] = useState<string>('5000000');
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
      let data: ItineraryItem[] = [];
      if (activeTab === 'my') {
        const session = await authStorage.getSession();
        if (!session) {
          Alert.alert('Chưa đăng nhập', 'Vui lòng đăng nhập ở tab "Tài khoản" để xem và quản lý lịch trình cá nhân của bạn!');
          setActiveTab('all');
          return;
        }
        data = await itineraryApi.getMyItineraries();
      } else {
        data = await itineraryApi.getAllItineraries();
      }
      setItineraries(data || []);
    } catch (err: any) {
      console.warn('Fetch itineraries error:', err.message || err);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

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
        'Vui lòng đăng nhập ở tab "Tài khoản" để có thể tạo và lưu lịch trình vào CSDL!',
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

      // Reload detail
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
        activeOpacity={0.9}
        onPress={() => handleOpenDetail(item)}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.imageBox}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.destinationBadge}>
            <FontAwesome name="map-marker" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.destinationText}>{item.destination || 'Điểm đến'}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status || 'PLANNING'}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            {item.startDate ? (
              <View style={[styles.metaPill, { backgroundColor: theme.badge }]}>
                <FontAwesome name="calendar-o" size={12} color={theme.tint} />
                <Text style={[styles.metaText, { color: theme.text }]}>
                  {item.startDate} {item.endDate ? `→ ${item.endDate}` : ''}
                </Text>
              </View>
            ) : null}

            {item.budgetTotal ? (
              <View style={[styles.metaPill, { backgroundColor: theme.badge }]}>
                <FontAwesome name="money" size={12} color="#F59E0B" />
                <Text style={[styles.metaText, { color: theme.text }]}>
                  {item.budgetTotal.toLocaleString('vi-VN')} đ
                </Text>
              </View>
            ) : null}

            {item.creatorName ? (
              <View style={[styles.metaPill, { backgroundColor: theme.badge }]}>
                <FontAwesome name="user-circle" size={12} color={theme.textMuted} />
                <Text style={[styles.metaText, { color: theme.textMuted }]}>{item.creatorName}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const dayDetails = selectedItinerary?.details?.filter(d => (d.dayNumber || 1) === selectedDay) || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header Tabs & Create Plan Button */}
      <View style={styles.topBar}>
        <View style={[styles.tabSwitch, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.switchBtn, activeTab === 'all' && { backgroundColor: theme.tint }]}
            onPress={() => setActiveTab('all')}>
            <Text style={[styles.switchText, activeTab === 'all' ? { color: '#FFFFFF', fontWeight: '700' } : { color: theme.textMuted }]}>
              Khám phá
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switchBtn, activeTab === 'my' && { backgroundColor: theme.tint }]}
            onPress={() => setActiveTab('my')}>
            <Text style={[styles.switchText, activeTab === 'my' ? { color: '#FFFFFF', fontWeight: '700' } : { color: theme.textMuted }]}>
              Plan của tôi
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.createPlanBtn, { backgroundColor: theme.tint }]}
          onPress={handleOpenCreateModal}>
          <FontAwesome name="plus" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.createPlanBtnText}>Lên Plan mới</Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.helperText, { color: theme.textMuted }]}>Đang nạp lịch trình chuyến đi...</Text>
        </View>
      ) : hasError ? (
        <View style={styles.centerBox}>
          <FontAwesome name="calendar" size={44} color={theme.textMuted} style={{ opacity: 0.5 }} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Chưa có kết nối máy chủ</Text>
          <Text style={[styles.errorSub, { color: theme.textMuted }]}>
            Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.
          </Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.tint }]} onPress={fetchItineraries}>
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
              <FontAwesome name="suitcase" size={48} color={theme.textMuted} style={{ opacity: 0.5 }} />
              <Text style={[styles.errorTitle, { color: theme.text }]}>Chưa có kế hoạch nào</Text>
              <Text style={[styles.errorSub, { color: theme.textMuted }]}>
                Bấm nút "Lên Plan mới" bên trên để tạo chuyến đi đầu tiên của bạn nhé!
              </Text>
            </View>
          }
        />
      )}

      {/* ─── MODAL TẠO LỊCH TRÌNH MỚI ──────────────────────────── */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>✈️ Lên Kế Hoạch Chuyến Đi</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <FontAwesome name="times" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Tên chuyến đi *</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="VD: Khám phá Đà Nẵng 4N3Đ"
                  placeholderTextColor={theme.textMuted}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Điểm đến chính *</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="VD: Đà Nẵng, Phú Quốc, Đà Lạt..."
                  placeholderTextColor={theme.textMuted}
                  value={newDestination}
                  onChangeText={setNewDestination}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Ngày đi (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="2026-10-25"
                    placeholderTextColor={theme.textMuted}
                    value={newStartDate}
                    onChangeText={setNewStartDate}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Ngày về (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="2026-10-28"
                    placeholderTextColor={theme.textMuted}
                    value={newEndDate}
                    onChangeText={setNewEndDate}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Ngân sách dự kiến (VNĐ)</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="5000000"
                  placeholderTextColor={theme.textMuted}
                  value={newBudget}
                  onChangeText={setNewBudget}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.submitPlanBtn, { backgroundColor: theme.tint }, submittingPlan && { opacity: 0.7 }]}
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
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
          <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.backBtn}>
              <FontAwesome name="chevron-left" size={16} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.detailHeaderTitle, { color: theme.text }]} numberOfLines={1}>
              {selectedItinerary?.title || 'Chi tiết chuyến đi'}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          {loadingDetail ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={theme.tint} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
              {/* Trip Overview Hero */}
              <View style={[styles.overviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.overviewDestination, { color: theme.tint }]}>
                  📍 {selectedItinerary?.destination}
                </Text>
                <Text style={[styles.overviewTitle, { color: theme.text }]}>
                  {selectedItinerary?.title}
                </Text>

                <View style={styles.overviewMetaRow}>
                  <View style={styles.overviewMetaItem}>
                    <FontAwesome name="calendar" size={13} color={theme.tint} />
                    <Text style={[styles.overviewMetaText, { color: theme.textMuted }]}>
                      {selectedItinerary?.startDate} → {selectedItinerary?.endDate || ''}
                    </Text>
                  </View>
                  {selectedItinerary?.budgetTotal ? (
                    <View style={styles.overviewMetaItem}>
                      <FontAwesome name="money" size={13} color="#F59E0B" />
                      <Text style={[styles.overviewMetaText, { color: theme.textMuted }]}>
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
                    style={[
                      styles.dayChip,
                      selectedDay === day
                        ? { backgroundColor: theme.tint, borderColor: theme.tint }
                        : { backgroundColor: theme.card, borderColor: theme.border },
                    ]}
                    onPress={() => setSelectedDay(day)}>
                    <Text
                      style={[
                        styles.dayChipText,
                        selectedDay === day ? { color: '#FFFFFF', fontWeight: '700' } : { color: theme.text },
                      ]}>
                      Ngày {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Day Actions & List */}
              <View style={styles.daySectionHeader}>
                <Text style={[styles.daySectionTitle, { color: theme.text }]}>
                  Kế hoạch Ngày {selectedDay}
                </Text>
                <TouchableOpacity
                  style={[styles.addStopBtn, { backgroundColor: theme.badge }]}
                  onPress={() => setAddDetailModalVisible(true)}>
                  <FontAwesome name="plus" size={12} color={theme.tint} style={{ marginRight: 4 }} />
                  <Text style={[styles.addStopBtnText, { color: theme.tint }]}>Thêm điểm dừng</Text>
                </TouchableOpacity>
              </View>

              {/* Day Stops Timeline */}
              {dayDetails.length === 0 ? (
                <View style={[styles.emptyDayBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <FontAwesome name="map-o" size={32} color={theme.textMuted} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyDayText, { color: theme.textMuted }]}>
                    Chưa có điểm dừng nào trong Ngày {selectedDay}.
                  </Text>
                  <Text style={[styles.emptyDaySub, { color: theme.textMuted }]}>
                    Bấm "+ Thêm điểm dừng" để lên lịch tham quan cho ngày này!
                  </Text>
                </View>
              ) : (
                dayDetails.map((detail, idx) => (
                  <View
                    key={detail.id || idx}
                    style={[styles.stopCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.stopTimeCol}>
                      <FontAwesome name="clock-o" size={12} color={theme.tint} />
                      <Text style={[styles.stopTime, { color: theme.tint }]}>
                        {detail.startTime || `${idx + 8}:00`}
                      </Text>
                    </View>

                    <View style={styles.stopContentCol}>
                      <Text style={[styles.stopName, { color: theme.text }]}>
                        {detail.locationName}
                      </Text>
                      {detail.category ? (
                        <Text style={[styles.stopCategory, { color: theme.textMuted }]}>
                          {detail.category}
                        </Text>
                      ) : null}
                      {detail.note ? (
                        <Text style={[styles.stopNote, { color: theme.textMuted }]}>
                          📝 {detail.note}
                        </Text>
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
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  ➕ Thêm Điểm Dừng (Ngày {selectedDay})
                </Text>
                <TouchableOpacity onPress={() => setAddDetailModalVisible(false)}>
                  <FontAwesome name="times" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Tên địa điểm / Hoạt động *</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="VD: Cầu Vàng, Ăn mì Quảng Bà Mua..."
                  placeholderTextColor={theme.textMuted}
                  value={newPlaceName}
                  onChangeText={setNewPlaceName}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Giờ bắt đầu</Text>
                  <TextInput
                    style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="09:00"
                    placeholderTextColor={theme.textMuted}
                    value={newPlaceTime}
                    onChangeText={setNewPlaceTime}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Thể loại</Text>
                  <TextInput
                    style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    placeholder="Tham quan"
                    placeholderTextColor={theme.textMuted}
                    value={newPlaceCategory}
                    onChangeText={setNewPlaceCategory}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>Ghi chú thêm</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="Vé vào cổng, lưu ý trang phục..."
                  placeholderTextColor={theme.textMuted}
                  value={newPlaceNote}
                  onChangeText={setNewPlaceNote}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitPlanBtn, { backgroundColor: theme.tint }]}
                onPress={handleAddStopToDay}>
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
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabSwitch: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 3,
  },
  switchBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  switchText: {
    fontSize: 12,
  },
  createPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createPlanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
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
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(13, 148, 136, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
  },
  submitPlanBtn: {
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  submitPlanBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
  detailScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  overviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  overviewDestination: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  overviewTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  overviewMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  overviewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overviewMetaText: {
    fontSize: 13,
  },
  daySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 13,
  },
  daySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  daySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addStopBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyDayBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyDayText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyDaySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  stopTimeCol: {
    alignItems: 'center',
    marginRight: 14,
    width: 48,
  },
  stopTime: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  stopContentCol: {
    flex: 1,
  },
  stopName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  stopCategory: {
    fontSize: 11,
    marginBottom: 2,
  },
  stopNote: {
    fontSize: 12,
  },
  deleteStopBtn: {
    padding: 8,
  },
});
