import React, { useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { Text, TextInput } from '@/components/Themed';
import { SERIF_FONT } from '@/constants/Typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { WF_COLORS } from '@/constants/Colors';
import { ConfirmHost, confirmDialog } from '@/components/ConfirmDialog';
import { ToastHost, showToast } from '@/components/Toast';
import { itineraryApi, ItineraryItem, ItineraryDetailItem } from '@/src/services/api';
import { getItineraryDayCount } from '@/src/utils/itinerary';

const PACKING_CHECKLIST = [
  { id: '1', label: 'Căn cước công dân / Hộ chiếu & Giấy tờ tùy thân' },
  { id: '2', label: 'Vé máy bay / Vé tàu / Xác nhận phòng khách sạn' },
  { id: '3', label: 'Sạc dự phòng, cáp sạc & gậy chụp ảnh selfie' },
  { id: '4', label: 'Trang phục phù hợp thời tiết & đồ bơi/áo khoác' },
  { id: '5', label: 'Túi thuốc cá nhân (hạ sốt, tiêu hóa, băng gạc)' },
  { id: '6', label: 'Kem chống nắng, kính râm & nón rộng vành' },
];

export interface ItineraryDetailModalProps {
  visible: boolean;
  onClose: () => void;
  itinerary: ItineraryItem | null;
  onItineraryUpdated?: () => void;
  canEdit?: boolean;
}

export function ItineraryDetailModal({
  visible,
  onClose,
  itinerary,
  onItineraryUpdated,
  canEdit = true,
}: ItineraryDetailModalProps) {
  const [fullItin, setFullItin] = useState<ItineraryItem | null>(itinerary);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});
  const [togglingVisibility, setTogglingVisibility] = useState<boolean>(false);

  const handleToggleVisibility = async () => {
    if (!fullItin?.id || togglingVisibility) return;
    setTogglingVisibility(true);
    try {
      const nextPublic = !(fullItin.isPublic !== false);
      const updated = await itineraryApi.toggleVisibility(fullItin.id, nextPublic);
      setFullItin(prev => prev ? { ...prev, isPublic: updated.isPublic } : null);
      if (onItineraryUpdated) onItineraryUpdated();
      showToast({
        kind: 'success',
        title: nextPublic ? 'Đã công khai lịch trình!' : 'Đã chuyển sang riêng tư!',
        message: nextPublic ? 'Mọi người có thể khám phá chuyến đi của bạn.' : 'Lịch trình chỉ hiển thị với bạn.',
      });
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Lỗi cập nhật hiển thị',
        message: e?.message || 'Không thể đổi chế độ hiển thị.',
      });
    } finally {
      setTogglingVisibility(false);
    }
  };

  const fetchFullDetail = useCallback(async (id: number) => {
    try {
      setLoading(true);
      const data = await itineraryApi.getItineraryById(id);
      if (data) {
        setFullItin(data);
      }
    } catch (e) {
      console.warn('Fetch itinerary detail error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && itinerary?.id) {
      setFullItin(itinerary);
      setSelectedDay('all');
      fetchFullDetail(itinerary.id);
    }
  }, [visible, itinerary, fetchFullDetail]);

  const handleShareTrip = async () => {
    if (!fullItin) return;
    try {
      await Share.share({
        message: `Khám phá kế hoạch chuyến đi "${fullItin.title}" tại ${fullItin.destination} trên Wayfare Travel! 🌟`,
        title: fullItin.title,
      });
    } catch {
      // Ignore
    }
  };

  const toggleChecklist = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const detailsList: ItineraryDetailItem[] = fullItin?.details || [];

  // Số ngày thực tế: ưu tiên khoảng ngày, sau đó mới đến daysCount/trạm dừng.
  const maxDay = getItineraryDayCount(fullItin);

  const filteredDetails = selectedDay === 'all'
    ? detailsList
    : detailsList.filter(d => d.dayNumber === selectedDay);

  const handleDeleteStop = async (detailId?: number) => {
    if (!detailId || !fullItin?.id) return;

    const confirmed = await confirmDialog({
      title: 'Xóa điểm dừng chân?',
      message: 'Điểm dừng chân này sẽ được xóa khỏi lịch trình.',
      confirmText: 'Xóa',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await itineraryApi.deleteDetail(detailId);
      fetchFullDetail(fullItin.id);
      onItineraryUpdated?.();
      showToast({
        kind: 'success',
        title: 'Đã xóa điểm dừng',
        message: 'Lịch trình đã được cập nhật.',
      });
    } catch {
      showToast({
        kind: 'error',
        title: 'Xóa thất bại',
        message: 'Không thể xóa điểm dừng chân này.',
      });
    }
  };

  // State thêm trạm dừng mới (hoàn toàn do người dùng tự điền)
  const [addStopVisible, setAddStopVisible] = useState<boolean>(false);
  const [newStopDay, setNewStopDay] = useState<number>(1);
  const [newStopTime, setNewStopTime] = useState<string>('08:30');
  const [newStopLocation, setNewStopLocation] = useState<string>('');
  const [newStopCategory, setNewStopCategory] = useState<string>('Tham quan');
  const [newStopCost, setNewStopCost] = useState<string>('50,000');
  const [newStopNote, setNewStopNote] = useState<string>('');
  const [submittingStop, setSubmittingStop] = useState<boolean>(false);

  const handleSaveStop = async () => {
    if (!newStopLocation.trim()) {
      showToast({
        kind: 'info',
        title: 'Thiếu tên địa điểm',
        message: 'Vui lòng nhập tên trạm dừng hoặc hoạt động!',
      });
      return;
    }

    if (!fullItin?.id) return;

    try {
      setSubmittingStop(true);
      const costNum = parseFloat(newStopCost.replace(/,/g, '')) || 0;
      const startTimeFormatted = newStopTime.includes(':')
        ? (newStopTime.length === 5 ? `${newStopTime}:00` : newStopTime)
        : '08:30:00';

      await itineraryApi.addDetail(fullItin.id, {
        dayNumber: newStopDay,
        startTime: startTimeFormatted,
        locationName: newStopLocation.trim(),
        locationAddress: fullItin.destination ? `${fullItin.destination}, Việt Nam` : 'Việt Nam',
        category: newStopCategory,
        estimatedCost: costNum,
        note: newStopNote.trim(),
      });

      showToast({
        kind: 'success',
        title: 'Đã thêm trạm dừng',
        message: `"${newStopLocation.trim()}" đã được thêm vào Ngày ${newStopDay}.`,
      });

      setAddStopVisible(false);
      setNewStopLocation('');
      setNewStopNote('');
      fetchFullDetail(fullItin.id);
      onItineraryUpdated?.();
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Thêm trạm dừng thất bại',
        message: e?.message || 'Không thể lưu trạm dừng.',
      });
    } finally {
      setSubmittingStop(false);
    }
  };

  // State chỉnh sửa toàn bộ chuyến đi & lưu phong cách du lịch
  const [editTripVisible, setEditTripVisible] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDestination, setEditDestination] = useState<string>('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [editBudget, setEditBudget] = useState<string>('');
  const [editGroupType, setEditGroupType] = useState<string>('Cá nhân');
  const [editTravelStyle, setEditTravelStyle] = useState<string>('Nghỉ dưỡng & Khám phá');
  const [editIsPublic, setEditIsPublic] = useState<boolean>(true);
  const [editCoverImageUrl, setEditCoverImageUrl] = useState<string>('');
  const [submittingEdit, setSubmittingEdit] = useState<boolean>(false);

  const openEditTripModal = () => {
    if (!fullItin) return;
    setEditTitle(fullItin.title || '');
    setEditDestination(fullItin.destination || '');
    setEditStartDate(fullItin.startDate || '');
    setEditEndDate(fullItin.endDate || '');
    setEditBudget(fullItin.budgetTotal ? String(fullItin.budgetTotal) : '');
    setEditGroupType(fullItin.groupType || 'Cá nhân');
    setEditTravelStyle(fullItin.travelStyle || 'Nghỉ dưỡng & Khám phá');
    setEditIsPublic(fullItin.isPublic !== false);
    setEditCoverImageUrl(fullItin.coverImageUrl || fullItin.coverImage || '');
    setEditTripVisible(true);
  };

  const handleSaveTripEdit = async () => {
    if (!editTitle.trim() || !editDestination.trim()) {
      showToast({
        kind: 'info',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập tên chuyến đi và điểm đến!',
      });
      return;
    }
    if (!fullItin?.id) return;
    try {
      setSubmittingEdit(true);
      const budgetNum = parseFloat(editBudget.replace(/,/g, '')) || 0;
      const updated = await itineraryApi.updateItinerary(fullItin.id, {
        title: editTitle.trim(),
        destination: editDestination.trim(),
        startDate: editStartDate.trim() || undefined,
        endDate: editEndDate.trim() || undefined,
        budgetTotal: budgetNum > 0 ? budgetNum : undefined,
        groupType: editGroupType,
        travelStyle: editTravelStyle,
        isPublic: editIsPublic,
        coverImageUrl: editCoverImageUrl.trim() || undefined,
      });
      setFullItin(updated);
      setEditTripVisible(false);
      onItineraryUpdated?.();
      showToast({
        kind: 'success',
        title: 'Đã cập nhật chuyến đi! 🎉',
        message: `Thông tin chuyến đi "${editTitle.trim()}" đã được lưu thành công.`,
      });
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Cập nhật thất bại',
        message: e?.message || 'Không thể lưu thông tin chuyến đi.',
      });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const coverUrl =
    fullItin?.coverImageUrl ||
    fullItin?.coverImage ||
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';

  const budgetDisplay = fullItin?.budgetTotal
    ? `${(fullItin.budgetTotal / 1000000).toFixed(1)}M`
    : 'Linh hoạt';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Top Navbar */}
        <View style={styles.topNavbar}>
          <TouchableOpacity style={styles.circleBtn} onPress={onClose}>
            <FontAwesome name="chevron-left" size={14} color="#1E1A15" />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            {fullItin?.title || 'Chi tiết chuyến đi'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {canEdit && (
              <TouchableOpacity
                style={[
                  styles.circleBtn,
                  { backgroundColor: fullItin?.isPublic !== false ? '#DCFCE7' : '#FEF3C7' },
                ]}
                onPress={handleToggleVisibility}
                disabled={togglingVisibility}
                activeOpacity={0.8}
              >
                <FontAwesome
                  name={fullItin?.isPublic !== false ? 'globe' : 'lock'}
                  size={14}
                  color={fullItin?.isPublic !== false ? '#15803D' : '#B45309'}
                />
              </TouchableOpacity>
            )}
            {canEdit && (
              <TouchableOpacity
                style={[styles.circleBtn, { backgroundColor: '#E0F2FE' }]}
                onPress={openEditTripModal}
                activeOpacity={0.8}
              >
                <FontAwesome name="pencil" size={13} color="#0369A1" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.circleBtn} onPress={handleShareTrip}>
              <FontAwesome name="share-alt" size={14} color="#1E1A15" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#B0522F" />
            <Text style={styles.loadingText}>Đang tải chi tiết hành trình & trạm dừng...</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Hero Cover Card */}
            <View style={styles.heroCard}>
              <Image source={{ uri: coverUrl }} style={styles.heroImage} resizeMode="cover" />
              <View style={styles.heroScrim} />

              <View style={styles.heroBadgesRow}>
                {fullItin?.destination ? (
                  <View style={styles.destBadge}>
                    <FontAwesome name="map-marker" size={11} color="#FFFDF8" style={{ marginRight: 4 }} />
                    <Text style={styles.destBadgeText}>{fullItin.destination}</Text>
                  </View>
                ) : null}

                {fullItin?.isAiGenerated ? (
                  <View style={styles.aiBadge}>
                    <FontAwesome name="magic" size={10} color="#FFFDF8" style={{ marginRight: 4 }} />
                    <Text style={styles.aiBadgeText}>Tour AI</Text>
                  </View>
                ) : (
                  <View style={[styles.aiBadge, { backgroundColor: 'rgba(30, 26, 21, 0.65)' }]}>
                    <FontAwesome name="pencil" size={10} color="#FFFDF8" style={{ marginRight: 4 }} />
                    <Text style={styles.aiBadgeText}>Thủ công</Text>
                  </View>
                )}

                <TouchableOpacity
                  activeOpacity={canEdit ? 0.8 : 1}
                  onPress={canEdit ? handleToggleVisibility : undefined}
                  style={[
                    styles.aiBadge,
                    {
                      backgroundColor: fullItin?.isPublic !== false ? 'rgba(21, 128, 61, 0.9)' : 'rgba(180, 83, 9, 0.9)',
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <FontAwesome
                    name={fullItin?.isPublic !== false ? 'globe' : 'lock'}
                    size={10}
                    color="#FFFDF8"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.aiBadgeText}>
                    {fullItin?.isPublic !== false ? 'Công khai' : 'Riêng tư'}
                  </Text>
                </TouchableOpacity>

                <View
                  style={[
                    styles.aiBadge,
                    { backgroundColor: 'rgba(180, 83, 9, 0.85)', flexDirection: 'row', alignItems: 'center' },
                  ]}
                >
                  <FontAwesome name="compass" size={10} color="#FFFDF8" style={{ marginRight: 4 }} />
                  <Text style={styles.aiBadgeText}>
                    {fullItin?.travelStyle || 'Nghỉ dưỡng & Khám phá'}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroTitle} numberOfLines={3}>
                {fullItin?.title}
              </Text>
            </View>

            {/* Floating Stats Row */}
            <View style={styles.statsCard}>
              <View style={styles.statCol}>
                <View style={[styles.statIconBox, { backgroundColor: '#F6E6DD' }]}>
                  <FontAwesome name="calendar" size={13} color="#B0522F" />
                </View>
                <Text style={styles.statLabel}>Thời gian</Text>
                <Text style={styles.statValue}>
                  {maxDay}N{Math.max(1, maxDay - 1)}Đ
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statCol}>
                <View style={[styles.statIconBox, { backgroundColor: '#E8EFE3' }]}>
                  <FontAwesome name="map-signs" size={13} color="#4F6B52" />
                </View>
                <Text style={styles.statLabel}>Trạm dừng</Text>
                <Text style={styles.statValue}>{detailsList.length} điểm</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statCol}>
                <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                  <FontAwesome name="money" size={13} color="#D97706" />
                </View>
                <Text style={styles.statLabel}>Dự toán</Text>
                <Text style={styles.statValue}>{budgetDisplay}</Text>
              </View>
            </View>

            {/* Day Selector Pills */}
            <View style={styles.daySection}>
              <Text style={styles.sectionTitle}>Lộ Trình Từng Ngày</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayScroll}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.dayPill, selectedDay === 'all' && styles.dayPillActive]}
                  onPress={() => setSelectedDay('all')}>
                  <Text style={[styles.dayPillText, selectedDay === 'all' && styles.dayPillTextActive]}>
                    Toàn bộ chuyến
                  </Text>
                </TouchableOpacity>

                {Array.from({ length: maxDay }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isActive = selectedDay === dayNum;
                  return (
                    <TouchableOpacity
                      key={dayNum}
                      activeOpacity={0.8}
                      style={[styles.dayPill, isActive && styles.dayPillActive]}
                      onPress={() => setSelectedDay(dayNum)}>
                      <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>
                        Ngày {dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Timeline Stops */}
            <View style={styles.timelineSection}>
              {filteredDetails.length === 0 ? (
                <View style={styles.emptyBox}>
                  <FontAwesome name="calendar-o" size={26} color="#8A7F70" />
                  <Text style={styles.emptyBoxTitle}>Chưa có trạm dừng nào cho ngày này</Text>
                  <Text style={styles.emptyBoxSub}>
                    Lịch trình ngày này hiện chưa có hoạt động nào.
                  </Text>
                  {canEdit && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.addFirstStopBtn}
                      onPress={() => {
                        setNewStopDay(selectedDay === 'all' ? 1 : selectedDay);
                        setAddStopVisible(true);
                      }}>
                      <FontAwesome name="plus" size={13} color="#FFFDF8" style={{ marginRight: 6 }} />
                      <Text style={styles.addFirstStopBtnText}>+ Thêm trạm dừng đầu tiên</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {filteredDetails.map((detail, index) => {
                    // Cắt bỏ phần giây :00 nếu có
                    const formattedTime = (detail.startTime || '08:30').slice(0, 5);

                    return (
                      <View key={detail.id || index} style={styles.timelineItem}>
                        {/* Left Time Column */}
                        <View style={styles.timeCol}>
                          <Text style={styles.timeText}>{formattedTime}</Text>
                          <View style={styles.timeDot} />
                          {index < filteredDetails.length - 1 && <View style={styles.timeLine} />}
                        </View>

                        {/* Right Detail Card */}
                        <View style={styles.stopCard}>
                          {/* Header: Category Badge & Delete */}
                          <View style={styles.stopHeader}>
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryBadgeText}>{detail.category || 'Tham quan'}</Text>
                            </View>
                            {canEdit && detail.id ? (
                              <TouchableOpacity
                                onPress={() => handleDeleteStop(detail.id)}
                                style={styles.deleteTouch}>
                                <FontAwesome name="trash-o" size={13} color="#EF4444" />
                              </TouchableOpacity>
                            ) : null}
                          </View>

                          {/* Title */}
                          <Text style={styles.stopTitle}>{detail.locationName}</Text>

                          {/* Specific Address Box & Google Maps Link (Match Web 100%) */}
                          <View style={styles.addressBox}>
                            <View style={styles.addressLeft}>
                              <FontAwesome
                                name="map-marker"
                                size={13}
                                color="#B0522F"
                                style={{ marginTop: 2, marginRight: 6 }}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.addressText} numberOfLines={2}>
                                  {detail.locationAddress ||
                                    (fullItin?.destination
                                      ? `${fullItin.destination}, Việt Nam`
                                      : 'Việt Nam')}
                                </Text>
                              </View>
                            </View>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              style={styles.mapBtn}
                              onPress={() => {
                                const q = encodeURIComponent(
                                  `${detail.locationName}, ${detail.locationAddress || fullItin?.destination || ''}`
                                );
                                Linking.openURL(
                                  `https://www.google.com/maps/search/?api=1&query=${q}`
                                ).catch(() => {
                                  showToast({
                                    kind: 'error',
                                    title: 'Không mở được bản đồ',
                                    message: 'Vui lòng thử lại sau.',
                                  });
                                });
                              }}>
                              <Text style={styles.mapBtnText}>Bản đồ</Text>
                              <FontAwesome name="external-link" size={9} color="#B0522F" style={{ marginLeft: 3 }} />
                            </TouchableOpacity>
                          </View>

                          {/* Note / Tip */}
                          {detail.note ? (
                            <View style={styles.noteBox}>
                              <Text style={styles.noteText}>💡 {detail.note}</Text>
                            </View>
                          ) : null}

                          {/* Bottom Row: Cost & Transit */}
                          <View style={styles.stopBottomRow}>
                            <View style={styles.costRow}>
                              <FontAwesome
                                name="money"
                                size={11}
                                color={detail.estimatedCost ? '#D97706' : '#5A5146'}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.costText,
                                  !detail.estimatedCost && { color: '#5A5146', fontWeight: '500' },
                                ]}>
                                {detail.estimatedCost
                                  ? `~${detail.estimatedCost.toLocaleString('vi-VN')} đ`
                                  : 'Theo thực tế'}
                              </Text>
                            </View>

                            {detail.transitInfo ? (
                              <View style={styles.transitRow}>
                                <FontAwesome name="car" size={11} color="#5A5146" style={{ marginRight: 4 }} />
                                <Text style={styles.transitText}>{detail.transitInfo}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    );
                  })}

                  {canEdit && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.addMoreStopBtn}
                      onPress={() => {
                        setNewStopDay(selectedDay === 'all' ? 1 : selectedDay);
                        setAddStopVisible(true);
                      }}>
                      <FontAwesome name="plus" size={12} color="#B0522F" style={{ marginRight: 6 }} />
                      <Text style={styles.addMoreStopBtnText}>
                        + Thêm trạm dừng vào Ngày {selectedDay === 'all' ? 1 : selectedDay}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* Checklist */}
            <View style={styles.checklistSection}>
              <Text style={styles.sectionTitle}>Hành Trang Chuẩn Bị</Text>
              <View style={styles.checklistCard}>
                {PACKING_CHECKLIST.map(item => {
                  const isChecked = Boolean(checkedItems[item.id]);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      style={styles.checkRow}
                      onPress={() => toggleChecklist(item.id)}>
                      <FontAwesome
                        name={isChecked ? 'check-square' : 'square-o'}
                        size={17}
                        color={isChecked ? '#B0522F' : '#8A7F70'}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={[styles.checkText, isChecked && styles.checkTextDone]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        )}

        {/* Modal Thêm trạm dừng mới */}
        <Modal
          visible={addStopVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddStopVisible(false)}>
          <View style={styles.addModalOverlay}>
            <View style={styles.addModalCard}>
              <View style={styles.addModalHeader}>
                <Text style={styles.addModalTitle}>Thêm trạm dừng mới</Text>
                <TouchableOpacity onPress={() => setAddStopVisible(false)}>
                  <FontAwesome name="times" size={18} color="#5A5146" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {/* Ngày */}
                <Text style={styles.fieldLabel}>Chọn ngày (Ngày 1 - {maxDay})</Text>
                <View style={styles.dayPickRow}>
                  {Array.from({ length: maxDay }).map((_, i) => {
                    const d = i + 1;
                    const isSel = newStopDay === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        style={[styles.dayPickBtn, isSel && styles.dayPickBtnActive]}
                        onPress={() => setNewStopDay(d)}>
                        <Text style={[styles.dayPickText, isSel && styles.dayPickTextActive]}>
                          N{d}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Giờ */}
                <Text style={styles.fieldLabel}>Thời gian (VD: 08:30)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newStopTime}
                  onChangeText={setNewStopTime}
                  placeholder="08:30"
                  placeholderTextColor="#8A7F70"
                />

                {/* Tên hoạt động / Địa điểm */}
                <Text style={styles.fieldLabel}>Tên hoạt động / Điểm đến *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newStopLocation}
                  onChangeText={setNewStopLocation}
                  placeholder="VD: Cà phê sáng, Tham quan Bảo tàng..."
                  placeholderTextColor="#8A7F70"
                />

                {/* Thể loại */}
                <Text style={styles.fieldLabel}>Thể loại</Text>
                <View style={styles.categoryPickerRow}>
                  {['Tham quan', 'Ăn uống', 'Nghỉ ngơi', 'Di chuyển', 'Khám phá'].map((cat) => {
                    const isSelected = newStopCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChoice, isSelected && styles.categoryChoiceActive]}
                        onPress={() => setNewStopCategory(cat)}>
                        <Text style={[styles.categoryChoiceText, isSelected && styles.categoryChoiceTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Chi phí ước tính */}
                <Text style={styles.fieldLabel}>Dự toán chi phí (VNĐ)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={newStopCost}
                  onChangeText={setNewStopCost}
                  keyboardType="numeric"
                  placeholder="VD: 150000 (để trống nếu miễn phí)"
                  placeholderTextColor="#8A7F70"
                />

                {/* Ghi chú */}
                <Text style={styles.fieldLabel}>Ghi chú / Mẹo nhỏ</Text>
                <TextInput
                  style={[styles.fieldInput, { height: 60, textAlignVertical: 'top' }]}
                  value={newStopNote}
                  onChangeText={setNewStopNote}
                  multiline
                  placeholder="Mang theo nón, đặt bàn trước..."
                  placeholderTextColor="#8A7F70"
                />
              </ScrollView>

              <View style={styles.addModalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setAddStopVisible(false)}>
                  <Text style={styles.cancelModalBtnText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitModalBtn, submittingStop && { opacity: 0.6 }]}
                  disabled={submittingStop}
                  onPress={handleSaveStop}>
                  {submittingStop ? (
                    <ActivityIndicator size="small" color="#FFFDF8" />
                  ) : (
                    <Text style={styles.submitModalBtnText}>Thêm vào lịch trình</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Chỉnh Sửa Toàn Bộ Chuyến Đi */}
        <Modal
          visible={editTripVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEditTripVisible(false)}>
          <View style={styles.addModalOverlay}>
            <View style={[styles.addModalCard, { maxHeight: '90%' }]}>
              <View style={styles.addModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FontAwesome name="pencil-square-o" size={18} color="#B0522F" />
                  <Text style={styles.addModalTitle}>Chỉnh sửa chuyến đi</Text>
                </View>
                <TouchableOpacity onPress={() => setEditTripVisible(false)}>
                  <FontAwesome name="times" size={18} color="#5A5146" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                {/* Tên chuyến đi */}
                <Text style={styles.fieldLabel}>Tên lịch trình / Chuyến đi *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="VD: Khám phá Đà Nẵng 3N2Đ"
                  placeholderTextColor="#8A7F70"
                />

                {/* Điểm đến */}
                <Text style={styles.fieldLabel}>Điểm đến chính *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editDestination}
                  onChangeText={setEditDestination}
                  placeholder="VD: Đà Nẵng, Phú Quốc..."
                  placeholderTextColor="#8A7F70"
                />

                {/* Ngày đi & Ngày về */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Ngày bắt đầu (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={editStartDate}
                      onChangeText={setEditStartDate}
                      placeholder="2026-11-01"
                      placeholderTextColor="#8A7F70"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Ngày kết thúc (YYYY-MM-DD)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={editEndDate}
                      onChangeText={setEditEndDate}
                      placeholder="2026-11-04"
                      placeholderTextColor="#8A7F70"
                    />
                  </View>
                </View>

                {/* Ngân sách */}
                <Text style={styles.fieldLabel}>Dự toán tổng ngân sách (VNĐ)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editBudget}
                  onChangeText={setEditBudget}
                  keyboardType="numeric"
                  placeholder="VD: 5000000"
                  placeholderTextColor="#8A7F70"
                />

                {/* Nhóm đối tượng */}
                <Text style={styles.fieldLabel}>Nhóm đồng hành</Text>
                <View style={styles.categoryPickerRow}>
                  {['Cá nhân', 'Cặp đôi', 'Bạn bè', 'Gia đình'].map((grp) => {
                    const isSelected = editGroupType === grp;
                    return (
                      <TouchableOpacity
                        key={grp}
                        style={[styles.categoryChoice, isSelected && styles.categoryChoiceActive]}
                        onPress={() => setEditGroupType(grp)}>
                        <Text style={[styles.categoryChoiceText, isSelected && styles.categoryChoiceTextActive]}>
                          {grp}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Phong cách du lịch */}
                <Text style={styles.fieldLabel}>Phong cách du lịch</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {[
                    'Nghỉ dưỡng & Khám phá',
                    'Phượt bụi & Mạo hiểm',
                    'Ẩm thực & Check-in',
                    'Văn hóa & Lịch sử',
                    'Gia đình & Thư giãn',
                    'Sinh thái & Thiên nhiên',
                  ].map((style) => {
                    const isSelected = editTravelStyle === style;
                    return (
                      <TouchableOpacity
                        key={style}
                        style={[styles.categoryChoice, isSelected && styles.categoryChoiceActive]}
                        onPress={() => setEditTravelStyle(style)}>
                        <Text style={[styles.categoryChoiceText, isSelected && styles.categoryChoiceTextActive]}>
                          {style}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Chế độ hiển thị */}
                <Text style={styles.fieldLabel}>Chế độ hiển thị</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.categoryChoice,
                      { flex: 1, alignItems: 'center', paddingVertical: 10 },
                      editIsPublic && { backgroundColor: '#DCFCE7', borderColor: '#15803D' },
                    ]}
                    onPress={() => setEditIsPublic(true)}>
                    <Text style={[styles.categoryChoiceText, editIsPublic && { color: '#15803D', fontWeight: '700' }]}>
                      Công khai 🌐
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.categoryChoice,
                      { flex: 1, alignItems: 'center', paddingVertical: 10 },
                      !editIsPublic && { backgroundColor: '#FEF3C7', borderColor: '#B45309' },
                    ]}
                    onPress={() => setEditIsPublic(false)}>
                    <Text style={[styles.categoryChoiceText, !editIsPublic && { color: '#B45309', fontWeight: '700' }]}>
                      Riêng tư 🔒
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Link ảnh bìa */}
                <Text style={styles.fieldLabel}>URL Ảnh bìa chuyến đi</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={editCoverImageUrl}
                  onChangeText={setEditCoverImageUrl}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#8A7F70"
                />
              </ScrollView>

              <View style={styles.addModalActions}>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setEditTripVisible(false)}>
                  <Text style={styles.cancelModalBtnText}>Hủy bỏ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitModalBtn, submittingEdit && { opacity: 0.6 }]}
                  disabled={submittingEdit}
                  onPress={handleSaveTripEdit}>
                  {submittingEdit ? (
                    <ActivityIndicator size="small" color="#FFFDF8" />
                  ) : (
                    <Text style={styles.submitModalBtnText}>Lưu thay đổi 🎉</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Thông báo & hộp xác nhận trong chính modal */}
        <ConfirmHost enabled={visible} />
        <ToastHost enabled={visible} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  topNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFDF8',
    borderBottomWidth: 1,
    borderBottomColor: '#E4DACB',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 5,
    backgroundColor: '#F3EDE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#5A5146',
    marginTop: 10,
    fontFamily: SERIF_FONT,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroCard: {
    height: 180,
    position: 'relative',
    backgroundColor: '#1E1A15',
    justifyContent: 'flex-end',
    padding: 16,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 26, 21, 0.65)',
  },
  heroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  destBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  destBadgeText: {
    color: '#FFFDF8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B0522F',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  aiBadgeText: {
    color: '#FFFDF8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFDF8',
    fontFamily: SERIF_FONT,
    lineHeight: 26,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFDF8',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E4DACB',
    shadowColor: '#5A5146',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 0,
    zIndex: 10,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 10,
    color: '#5A5146',
    fontWeight: '600',
    fontFamily: SERIF_FONT,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F3EDE2',
  },
  daySection: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
    marginBottom: 10,
  },
  dayScroll: {
    gap: 8,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 5,
    backgroundColor: '#E4DACB',
  },
  dayPillActive: {
    backgroundColor: '#B0522F',
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A5146',
    fontFamily: SERIF_FONT,
  },
  dayPillTextActive: {
    color: '#FFFDF8',
  },
  timelineSection: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  emptyBox: {
    backgroundColor: '#FFFDF8',
    borderRadius: 6,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  emptyBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B332A',
    marginTop: 8,
    fontFamily: SERIF_FONT,
  },
  emptyBoxSub: {
    fontSize: 12,
    color: '#5A5146',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: SERIF_FONT,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timeCol: {
    width: 52,
    alignItems: 'center',
    paddingTop: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B0522F',
    fontFamily: SERIF_FONT,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B0522F',
    marginTop: 5,
  },
  timeLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E8D5C9',
    marginTop: 4,
  },
  stopCard: {
    flex: 1,
    backgroundColor: '#FFFDF8',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E4DACB',
    shadowColor: '#5A5146',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 0,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#F6E6DD',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#B0522F',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  deleteTouch: {
    padding: 3,
  },
  stopTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
    lineHeight: 19,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F4EC',
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginTop: 7,
    borderWidth: 1,
    borderColor: '#E4DACB',
    gap: 8,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  addressText: {
    fontSize: 11,
    color: '#5A5146',
    lineHeight: 15,
    fontFamily: SERIF_FONT,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  mapBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B0522F',
    fontFamily: SERIF_FONT,
  },
  noteBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  noteText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
    fontFamily: SERIF_FONT,
  },
  stopBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3EDE2',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    fontFamily: SERIF_FONT,
  },
  transitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transitText: {
    fontSize: 10,
    color: '#5A5146',
    fontFamily: SERIF_FONT,
  },
  checklistSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  checklistCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4DACB',
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkText: {
    fontSize: 12,
    color: '#3B332A',
    flex: 1,
    lineHeight: 17,
    fontFamily: SERIF_FONT,
  },
  checkTextDone: {
    textDecorationLine: 'line-through',
    color: '#8A7F70',
  },
  addFirstStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B0522F',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 5,
    marginTop: 12,
  },
  addFirstStopBtnText: {
    color: '#FFFDF8',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  addMoreStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6E6DD',
    borderWidth: 1,
    borderColor: '#E8D5C9',
    borderStyle: 'dashed',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 5,
    marginTop: 10,
  },
  addMoreStopBtnText: {
    color: '#B0522F',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  addModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 26, 21, 0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  addModalCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 6,
    padding: 20,
    maxHeight: '85%',
  },
  addModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E4DACB',
    marginBottom: 12,
  },
  addModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A5146',
    marginTop: 10,
    marginBottom: 4,
    fontFamily: SERIF_FONT,
  },
  fieldInput: {
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#D9CDBE',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E1A15',
  },
  dayPickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  dayPickBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: '#F3EDE2',
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  dayPickBtnActive: {
    backgroundColor: '#B0522F',
    borderColor: '#B0522F',
  },
  dayPickText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A5146',
  },
  dayPickTextActive: {
    color: '#FFFDF8',
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  categoryChoice: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#F3EDE2',
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  categoryChoiceActive: {
    backgroundColor: '#F6E6DD',
    borderColor: '#B0522F',
  },
  categoryChoiceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5A5146',
  },
  categoryChoiceTextActive: {
    color: '#B0522F',
    fontWeight: '700',
  },
  addModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E4DACB',
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 5,
    backgroundColor: '#F3EDE2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5A5146',
  },
  submitModalBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 5,
    backgroundColor: '#B0522F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFDF8',
  },
});
