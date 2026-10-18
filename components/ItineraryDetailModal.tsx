import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (visible && itinerary?.id) {
      setFullItin(itinerary);
      setSelectedDay('all');
      fetchFullDetail(itinerary.id);
    }
  }, [visible, itinerary?.id]);

  const fetchFullDetail = async (id: number) => {
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
  };

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

  // Tính số ngày tối đa thực tế
  const maxDay = Math.max(
    fullItin?.daysCount || 1,
    ...detailsList.map(d => d.dayNumber || 1),
    1
  );

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
            <FontAwesome name="chevron-left" size={14} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            {fullItin?.title || 'Chi tiết chuyến đi'}
          </Text>
          <TouchableOpacity style={styles.circleBtn} onPress={handleShareTrip}>
            <FontAwesome name="share-alt" size={14} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0284C7" />
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
                    <FontAwesome name="map-marker" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.destBadgeText}>{fullItin.destination}</Text>
                  </View>
                ) : null}

                {fullItin?.isAiGenerated ? (
                  <View style={styles.aiBadge}>
                    <FontAwesome name="magic" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.aiBadgeText}>Tour AI</Text>
                  </View>
                ) : (
                  <View style={[styles.aiBadge, { backgroundColor: 'rgba(15, 23, 42, 0.65)' }]}>
                    <FontAwesome name="pencil" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.aiBadgeText}>Thủ công</Text>
                  </View>
                )}
              </View>

              <Text style={styles.heroTitle} numberOfLines={3}>
                {fullItin?.title}
              </Text>
            </View>

            {/* Floating Stats Row */}
            <View style={styles.statsCard}>
              <View style={styles.statCol}>
                <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
                  <FontAwesome name="calendar" size={13} color="#0284C7" />
                </View>
                <Text style={styles.statLabel}>Thời gian</Text>
                <Text style={styles.statValue}>
                  {maxDay}N{Math.max(1, maxDay - 1)}Đ
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statCol}>
                <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
                  <FontAwesome name="map-signs" size={13} color="#16A34A" />
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
                  <FontAwesome name="calendar-o" size={26} color="#94A3B8" />
                  <Text style={styles.emptyBoxTitle}>Chưa có trạm dừng nào cho ngày này</Text>
                  <Text style={styles.emptyBoxSub}>
                    Lịch trình ngày này hiện chưa có hoạt động nào.
                  </Text>
                </View>
              ) : (
                filteredDetails.map((detail, index) => {
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
                              color="#0284C7"
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
                            <FontAwesome name="external-link" size={9} color="#0284C7" style={{ marginLeft: 3 }} />
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
                              color={detail.estimatedCost ? '#D97706' : '#64748B'}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.costText,
                                !detail.estimatedCost && { color: '#64748B', fontWeight: '500' },
                              ]}>
                              {detail.estimatedCost
                                ? `~${detail.estimatedCost.toLocaleString('vi-VN')} đ`
                                : 'Theo thực tế'}
                            </Text>
                          </View>

                          {detail.transitInfo ? (
                            <View style={styles.transitRow}>
                              <FontAwesome name="car" size={11} color="#64748B" style={{ marginRight: 4 }} />
                              <Text style={styles.transitText}>{detail.transitInfo}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })
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
                        color={isChecked ? '#0284C7' : '#94A3B8'}
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
    backgroundColor: '#F8FAFC',
  },
  topNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
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
    color: '#64748B',
    marginTop: 10,
    fontFamily: SERIF_FONT,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroCard: {
    height: 180,
    position: 'relative',
    backgroundColor: '#0F172A',
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
    borderRadius: 10,
  },
  destBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: SERIF_FONT,
    lineHeight: 26,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    zIndex: 10,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    fontFamily: SERIF_FONT,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: SERIF_FONT,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F1F5F9',
  },
  daySection: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: SERIF_FONT,
    marginBottom: 10,
  },
  dayScroll: {
    gap: 8,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  dayPillActive: {
    backgroundColor: '#0284C7',
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    fontFamily: SERIF_FONT,
  },
  dayPillTextActive: {
    color: '#FFFFFF',
  },
  timelineSection: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
    fontFamily: SERIF_FONT,
  },
  emptyBoxSub: {
    fontSize: 12,
    color: '#64748B',
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
    color: '#0284C7',
    fontFamily: SERIF_FONT,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284C7',
    marginTop: 5,
  },
  timeLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#BAE6FD',
    marginTop: 4,
  },
  stopCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#0284C7',
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
    color: '#0F172A',
    fontFamily: SERIF_FONT,
    lineHeight: 19,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 7,
    marginTop: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  addressText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
    fontFamily: SERIF_FONT,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  mapBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
    fontFamily: SERIF_FONT,
  },
  noteBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
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
    borderTopColor: '#F1F5F9',
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
    color: '#64748B',
    fontFamily: SERIF_FONT,
  },
  checklistSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkText: {
    fontSize: 12,
    color: '#1E293B',
    flex: 1,
    lineHeight: 17,
    fontFamily: SERIF_FONT,
  },
  checkTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
});
