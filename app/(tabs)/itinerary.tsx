import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { WF_COLORS } from '@/constants/Colors';
import {
  itineraryApi,
  ItineraryItem,
  ItineraryDetailItem,
  API_BASE_URL,
} from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── PRESET COVERS ──────────────────────────────────────────
const COVER_PRESETS = [
  { label: 'Đà Lạt Săn Mây', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Đà Nẵng Biển Xanh', url: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Phú Quốc Hoàng Hôn', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Hà Giang Hùng Vĩ', url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Ninh Bình Non Nước', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Sa Pa Ruộng Bậc Thang', url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80' },
];

const HOT_DESTINATIONS = [
  'Đà Lạt', 'Đà Nẵng', 'Phú Quốc', 'Hà Giang', 'Ninh Bình', 'Sa Pa', 'Quy Nhơn', 'Hà Nội', 'Huế', 'Hội An'
];

const AI_STYLE_PRESETS = [
  { id: 'checkin', label: '📸 Sống ảo', desc: 'Góc chụp & view đẹp' },
  { id: 'food', label: '🍜 Ẩm thực', desc: 'Đặc sản bản địa' },
  { id: 'beach', label: '🏖️ Nghỉ dưỡng', desc: 'Biển xanh cát trắng' },
  { id: 'trekking', label: '🧭 Phượt', desc: 'Trekking & Khám phá' },
  { id: 'culture', label: '🏛️ Văn hóa', desc: 'Di sản & Lịch sử' },
  { id: 'relax', label: '🌿 Chữa lành', desc: 'Yên bình & Thư thái' },
];

const COMPANION_OPTIONS = [
  { id: 'solo', label: 'Một mình', icon: 'user' },
  { id: 'couple', label: 'Cặp đôi', icon: 'heart' },
  { id: 'group', label: 'Nhóm bạn', icon: 'users' },
  { id: 'family', label: 'Gia đình', icon: 'home' },
];

const BUDGET_TIERS = [
  { id: 'economy', label: 'Tiết kiệm', note: '~1.5M - 2.5M/người', budgetVal: 2000000 },
  { id: 'balanced', label: 'Cân bằng', note: '~3.5M - 5M/người', budgetVal: 4000000 },
  { id: 'luxury', label: 'Sang chảnh', note: '> 7M/người', budgetVal: 8000000 },
];

const PACKING_CHECKLIST = [
  { id: 'c1', label: 'Căn cước công dân / Hộ chiếu gốc' },
  { id: 'c2', label: 'Vé máy bay / Đặt phòng khách sạn' },
  { id: 'c3', label: 'Sạc dự phòng & Dây cáp điện thoại' },
  { id: 'c4', label: 'Kem chống nắng & Kính râm' },
  { id: 'c5', label: 'Thuốc y tế cá nhân (dị ứng, đau bụng, cảm)' },
  { id: 'c6', label: 'Quần áo phù hợp thời tiết điểm đến' },
];

export default function ItineraryScreen() {
  // ─── MAIN STATE ──────────────────────────────────────────
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'drafts' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTag, setActiveFilterTag] = useState<'all' | 'ai' | 'group' | 'family'>('all');
  const [currentEmail, setCurrentEmail] = useState<string>('');

  // ─── MODAL DETAIL STATE ──────────────────────────────────
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedItinerary, setSelectedItinerary] = useState<ItineraryItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  // ─── MODAL ADD STOP TO DAY STATE ─────────────────────────
  const [addStopModalVisible, setAddStopModalVisible] = useState<boolean>(false);
  const [stopDayNum, setStopDayNum] = useState<number>(1);
  const [stopName, setStopName] = useState<string>('');
  const [stopTime, setStopTime] = useState<string>('08:30');
  const [stopCategory, setStopCategory] = useState<string>('Tham quan');
  const [stopNote, setStopNote] = useState<string>('');
  const [stopCost, setStopCost] = useState<string>('100000');
  const [submittingStop, setSubmittingStop] = useState<boolean>(false);

  // ─── MODAL MANUAL TRIP STATE ─────────────────────────────
  const [manualModalVisible, setManualModalVisible] = useState<boolean>(false);
  const [manualTitle, setManualTitle] = useState<string>('');
  const [manualDest, setManualDest] = useState<string>('');
  const [manualRegion, setManualRegion] = useState<string>('Tây Nguyên');
  const [manualDays, setManualDays] = useState<number>(3);
  const [manualStartDate, setManualStartDate] = useState<string>('2026-10-25');
  const [manualEndDate, setManualEndDate] = useState<string>('2026-10-28');
  const [manualBudget, setManualBudget] = useState<string>('4500000');
  const [manualCover, setManualCover] = useState<string>(COVER_PRESETS[0].url);
  const [manualGroup, setManualGroup] = useState<string>('Nhóm bạn (3-5 người)');
  const [manualPlaces, setManualPlaces] = useState<string>('');
  const [manualNote, setManualNote] = useState<string>('');
  const [submittingManual, setSubmittingManual] = useState<boolean>(false);

  // ─── MODAL WANDERAI TRIP GENERATOR STATE ─────────────────
  const [aiModalVisible, setAiModalVisible] = useState<boolean>(false);
  const [aiDest, setAiDest] = useState<string>('Đà Lạt');
  const [aiDays, setAiDays] = useState<number>(3);
  const [aiCompanion, setAiCompanion] = useState<string>('group');
  const [aiBudgetTier, setAiBudgetTier] = useState<string>('balanced');
  const [aiStyle, setAiStyle] = useState<string>('checkin');
  const [aiCustomNote, setAiCustomNote] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiProgress, setAiProgress] = useState<number>(0);
  const [aiCurrentStep, setAiCurrentStep] = useState<string>('');

  // ─── DATA FETCHING ───────────────────────────────────────
  const fetchItineraries = useCallback(async () => {
    try {
      const session = await authStorage.getSession();
      setCurrentEmail(session?.email || '');

      let list: ItineraryItem[] = [];
      try {
        list = await itineraryApi.getAllItineraries();
      } catch (err) {
        console.warn('getAllItineraries fallback, trying getMyItineraries', err);
        list = await itineraryApi.getMyItineraries();
      }
      setItineraries(list || []);
    } catch (e) {
      console.warn('Fetch itineraries error:', e);
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

  // ─── STATS DASHBOARD KPIS ────────────────────────────────
  const statsKPI = useMemo(() => {
    const list = itineraries || [];
    const totalTrips = list.length;
    const totalStops = list.reduce((acc, curr) => {
      const stopsInDetails = curr.details?.length || 0;
      const count = curr.placesCount || stopsInDetails || (curr.placesList ? curr.placesList.length : 3);
      return acc + count;
    }, 0);

    const totalBudgetSum = list.reduce((acc, curr) => {
      const b = curr.budgetTotal || (curr.budgetPerPerson ? curr.budgetPerPerson * 2 : 3500000);
      return acc + b;
    }, 0);

    const totalBudgetMil = (totalBudgetSum / 1000000).toFixed(1);
    const nextDestination = list[0]?.destination || 'Chưa có lịch';
    const nextDuration = list[0]?.daysCount ? `${list[0].daysCount}N${Math.max(1, list[0].daysCount - 1)}Đ` : (list[0]?.startDate ? 'Sắp đi' : 'Sẵn sàng');

    return {
      totalTrips,
      totalStops,
      totalBudgetMil,
      nextDestination,
      nextDuration,
    };
  }, [itineraries]);

  // ─── TAB COUNTS ──────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const list = itineraries || [];
    return {
      upcoming: list.filter(i => {
        const s = (i.status || '').toLowerCase();
        return s === 'upcoming' || s === 'active' || s === 'planning' || !s;
      }).length,
      completed: list.filter(i => (i.status || '').toLowerCase() === 'completed').length,
      drafts: list.filter(i => {
        const s = (i.status || '').toLowerCase();
        return s === 'draft' || s === 'drafts' || Boolean(i.isAiGenerated);
      }).length,
      all: list.length,
    };
  }, [itineraries]);

  // ─── FILTERED ITINERARIES ────────────────────────────────
  const filteredItineraries = useMemo(() => {
    return (itineraries || []).filter(itin => {
      const statusLower = (itin.status || '').toLowerCase();

      // Tab match
      if (activeTab === 'upcoming' && statusLower === 'completed') return false;
      if (activeTab === 'completed' && statusLower !== 'completed') return false;
      if (activeTab === 'drafts') {
        const isDraft = statusLower === 'draft' || statusLower === 'drafts' || Boolean(itin.isAiGenerated);
        if (!isDraft) return false;
      }

      // Filter tag
      if (activeFilterTag === 'ai' && !itin.isAiGenerated) return false;
      if (activeFilterTag === 'group' && !itin.groupType?.toLowerCase().includes('nhóm')) return false;
      if (activeFilterTag === 'family' && !itin.groupType?.toLowerCase().includes('gia đình')) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = itin.title?.toLowerCase().includes(q);
        const matchDest = itin.destination?.toLowerCase().includes(q);
        const matchPlaces = itin.placesList?.some(p => p.toLowerCase().includes(q));
        if (!matchTitle && !matchDest && !matchPlaces) return false;
      }

      return true;
    });
  }, [itineraries, activeTab, activeFilterTag, searchQuery]);

  // ─── ACTION HANDLERS ─────────────────────────────────────
  const handleOpenDetail = async (itin: ItineraryItem) => {
    setSelectedItinerary(itin);
    setSelectedDay('all');
    setDetailModalVisible(true);
    setLoadingDetail(true);
    try {
      const full = await itineraryApi.getItineraryById(itin.id);
      if (full) {
        setSelectedItinerary(full);
      }
    } catch (e) {
      console.warn('Fetch detail error:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleShareTrip = async (itin: ItineraryItem) => {
    try {
      await Share.share({
        message: `Khám phá kế hoạch chuyến đi "${itin.title}" tại ${itin.destination} trên Wayfare Travel! 🌟`,
        title: itin.title,
      });
    } catch (error) {
      // Ignore
    }
  };

  const handleCloneTrip = async (itin: ItineraryItem) => {
    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert('Đăng nhập', 'Vui lòng đăng nhập để sao chép lịch trình này vào tài khoản của bạn!');
      return;
    }

    try {
      await itineraryApi.cloneItinerary(itin.id);
      Alert.alert('Thành công! 🎉', `Đã sao chép chuyến đi "${itin.title}" vào danh sách của bạn.`);
      fetchItineraries();
    } catch (err: any) {
      Alert.alert('Lỗi sao chép', err.response?.data?.message || err.message || 'Không thể sao chép lịch trình.');
    }
  };

  const handleDeleteTrip = (itin: ItineraryItem) => {
    Alert.alert(
      'Xóa lịch trình',
      `Bạn có chắc chắn muốn xóa chuyến đi "${itin.title}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await itineraryApi.deleteItinerary(itin.id);
              Alert.alert('Đã xóa', `Đã xóa chuyến đi "${itin.title}" thành công.`);
              if (selectedItinerary?.id === itin.id) {
                setDetailModalVisible(false);
              }
              fetchItineraries();
            } catch (err: any) {
              Alert.alert('Lỗi', 'Không thể xóa lịch trình này.');
            }
          },
        },
      ]
    );
  };

  // ─── ADD STOP HANDLER ────────────────────────────────────
  const handleAddStop = async () => {
    if (!stopName.trim() || !selectedItinerary) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên điểm dừng chân!');
      return;
    }

    try {
      setSubmittingStop(true);
      const newDetail: ItineraryDetailItem = {
        itineraryId: selectedItinerary.id,
        locationName: stopName.trim(),
        startTime: stopTime.trim(),
        category: stopCategory,
        dayNumber: stopDayNum,
        estimatedCost: parseFloat(stopCost) || 0,
        note: stopNote.trim(),
      };

      await itineraryApi.addDetail(selectedItinerary.id, newDetail);
      Alert.alert('Thành công! 🎉', `Đã thêm "${stopName}" vào Ngày ${stopDayNum}`);
      setAddStopModalVisible(false);
      setStopName('');
      setStopNote('');

      // Reload detail
      const full = await itineraryApi.getItineraryById(selectedItinerary.id);
      setSelectedItinerary(full);
      fetchItineraries();
    } catch (err: any) {
      Alert.alert('Lỗi', err.response?.data?.message || 'Không thể thêm điểm dừng');
    } finally {
      setSubmittingStop(false);
    }
  };

  // ─── DELETE STOP HANDLER ─────────────────────────────────
  const handleDeleteStop = (detailId?: number) => {
    if (!detailId) return;
    Alert.alert('Xóa trạm dừng', 'Bạn muốn xóa trạm dừng này khỏi lịch trình?', [
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
            Alert.alert('Lỗi', 'Không thể xóa trạm dừng');
          }
        },
      },
    ]);
  };

  // ─── MANUAL TRIP CREATION ────────────────────────────────
  const handleCreateManualTrip = async () => {
    if (!manualTitle.trim() || !manualDest.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Tên chuyến đi và Điểm đến chính!');
      return;
    }

    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập ở tab "Tài khoản" để lưu chuyến đi vào CSDL!');
      return;
    }

    try {
      setSubmittingManual(true);
      const days = Number(manualDays) || 3;
      const budget = parseFloat(manualBudget) || 4000000;

      // Tạo các activity mẫu chuẩn bị lưu
      const sampleActivities: ItineraryDetailItem[] = [];
      const times = ['08:30', '11:30', '14:30', '18:30'];
      const actTitles = [
        `Khởi hành tham quan ${manualDest}`,
        `Ăn trưa & Thưởng thức đặc sản ${manualDest}`,
        `Check-in điểm danh lam nổi bật`,
        `Dạo phố đêm & Thư giãn chill`,
      ];
      const categories = ['Tham quan', 'Ẩm thực', 'Check-in', 'Chill'];

      for (let d = 1; d <= days; d++) {
        for (let t = 0; t < 4; t++) {
          sampleActivities.push({
            dayNumber: d,
            startTime: times[t],
            locationName: `${manualDest} - ${actTitles[t]}`,
            category: categories[t],
            estimatedCost: t === 1 ? 150000 : 50000,
            note: t === 0 ? 'Khởi hành ngày mới' : 'Trải nghiệm tự do',
          });
        }
      }

      const created = await itineraryApi.createItinerary({
        title: manualTitle.trim(),
        destination: manualDest.trim(),
        startDate: manualStartDate.trim() || undefined,
        endDate: manualEndDate.trim() || undefined,
        budgetTotal: budget,
        coverImageUrl: manualCover,
        status: 'UPCOMING',
        isAiGenerated: false,
        details: sampleActivities,
      });

      Alert.alert('Thành công! 🎉', `Đã tạo chuyến đi "${created.title}"`);
      setManualModalVisible(false);
      setManualTitle('');
      setManualDest('');
      setManualPlaces('');
      setManualNote('');

      fetchItineraries();
      handleOpenDetail(created);
    } catch (err: any) {
      Alert.alert('Lỗi tạo lịch trình', err.response?.data?.message || err.message || 'Không thể tạo chuyến đi.');
    } finally {
      setSubmittingManual(false);
    }
  };

  // ─── WANDERAI TRIP GENERATOR HANDLER ─────────────────────
  const handleStartAIGeneration = async () => {
    if (!aiDest.trim()) {
      Alert.alert('Thông báo', 'Vui lòng chọn hoặc nhập điểm đến!');
      return;
    }

    setIsAiGenerating(true);
    setAiProgress(10);
    setAiCurrentStep('Khởi tạo kết nối & Định vị địa lý...');

    try {
      // Step 1: 30%
      setTimeout(() => {
        setAiProgress(35);
        setAiCurrentStep(`Nghiên cứu danh lam, di tích thực tế tại ${aiDest}...`);
      }, 700);

      // Step 2: 65%
      setTimeout(() => {
        setAiProgress(70);
        setAiCurrentStep('Khảo sát ẩm thực & quán ăn đặc sản bản địa...');
      }, 1400);

      // Step 3: 90%
      setTimeout(() => {
        setAiProgress(92);
        setAiCurrentStep('Tối ưu lộ trình từng ngày & Cân đối ngân sách...');
      }, 2100);

      // Gửi yêu cầu Backend
      const styleLabel = AI_STYLE_PRESETS.find(s => s.id === aiStyle)?.label || 'Check-in sống ảo';
      const budgetOption = BUDGET_TIERS.find(b => b.id === aiBudgetTier) || BUDGET_TIERS[1];
      const companionLabel = COMPANION_OPTIONS.find(c => c.id === aiCompanion)?.label || 'Nhóm bạn';

      // Fallback local preset cover
      const presetCover = COVER_PRESETS.find(c => c.label.includes(aiDest))?.url || COVER_PRESETS[0].url;

      // Day details generated by AI
      const aiActivities: ItineraryDetailItem[] = [];
      const times = ['08:00', '11:00', '14:30', '18:30'];
      const catList = ['Tham quan', 'Ẩm thực', 'Check-in', 'Chill'];
      const actThemes = [
        `Đón bình minh & Thưởng thức điểm tâm đặc sản ${aiDest}`,
        `Check-in danh thắng nổi tiếng tại ${aiDest}`,
        `Trải nghiệm văn hóa & góc view săn ảnh đẹp`,
        `Thưởng thức tiệc tối & Chill ngắm cảnh về đêm`,
      ];

      for (let d = 1; d <= aiDays; d++) {
        for (let a = 0; a < 4; a++) {
          aiActivities.push({
            dayNumber: d,
            startTime: times[a],
            locationName: `${actThemes[a]}`,
            category: catList[a],
            estimatedCost: a === 1 ? 120000 : 60000,
            note: `Gợi ý bởi WanderAI: Lịch trình tối ưu cho ${companionLabel}`,
          });
        }
      }

      const created = await itineraryApi.createItinerary({
        title: `${aiDest}: Hành Trình AI Thiết Kế (${aiDays}N${Math.max(1, aiDays - 1)}Đ)`,
        destination: aiDest.trim(),
        startDate: '2026-10-25',
        endDate: '2026-10-28',
        budgetTotal: budgetOption.budgetVal * (aiCompanion === 'group' ? 3 : aiCompanion === 'couple' ? 2 : 1),
        coverImageUrl: presetCover,
        status: 'UPCOMING',
        isAiGenerated: true,
        details: aiActivities,
      });

      setAiProgress(100);
      setAiCurrentStep('Hoàn tất kiến tạo lịch trình! 🎉');

      setTimeout(() => {
        setIsAiGenerating(false);
        setAiModalVisible(false);
        fetchItineraries();
        Alert.alert('Thành công! ✨', `WanderAI đã thiết kế xong lịch trình ${aiDest} cho bạn!`);
        handleOpenDetail(created);
      }, 500);

    } catch (err: any) {
      setIsAiGenerating(false);
      Alert.alert('Lỗi tạo tour AI', err.response?.data?.message || err.message || 'Không thể tạo tour bằng AI lúc này.');
    }
  };

  const toggleChecklist = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── RENDER CARD ITEM ────────────────────────────────────
  const renderItineraryCard = ({ item }: { item: ItineraryItem }) => {
    const imageUrl = item.coverImageUrl || item.coverImage || COVER_PRESETS[0].url;
    const durationText = item.daysCount ? `${item.daysCount}N${Math.max(1, item.daysCount - 1)}Đ` : '3N2Đ';
    const budgetDisplay = item.budgetTotal
      ? `${item.budgetTotal.toLocaleString('vi-VN')} đ`
      : item.budgetPerPerson
      ? `~${item.budgetPerPerson.toLocaleString('vi-VN')} đ/người`
      : 'Tùy chi tiêu';

    const isUpcoming = (item.status || '').toLowerCase() === 'upcoming' || (item.status || '').toLowerCase() === 'active';
    const isCompleted = (item.status || '').toLowerCase() === 'completed';

    return (
      <View style={styles.cardContainer}>
        {/* Cover Image & Overlays */}
        <TouchableOpacity activeOpacity={0.92} onPress={() => handleOpenDetail(item)} style={styles.cardCoverBox}>
          <Image source={{ uri: imageUrl }} style={styles.cardCoverImage} resizeMode="cover" />
          <View style={styles.cardGradientOverlay} />

          {/* Top Badges */}
          <View style={styles.cardTopBadgeRow}>
            <View style={styles.destinationBadge}>
              <FontAwesome name="map-marker" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.destinationBadgeText}>{item.destination}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              {item.isAiGenerated && (
                <View style={styles.aiBadge}>
                  <FontAwesome name="magic" size={11} color="#FEF08A" style={{ marginRight: 4 }} />
                  <Text style={styles.aiBadgeText}>Tour AI ✨</Text>
                </View>
              )}
              <View style={[styles.statusBadge, isCompleted ? styles.statusBadgeCompleted : styles.statusBadgeUpcoming]}>
                <Text style={styles.statusBadgeText}>
                  {isCompleted ? 'Đã hoàn thành' : isUpcoming ? 'Sắp diễn ra' : 'Bản nháp'}
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Duration & Countdown Overlay */}
          <View style={styles.cardCoverBottomRow}>
            <View style={styles.durationPill}>
              <FontAwesome name="clock-o" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.durationPillText}>{durationText}</Text>
            </View>
            {item.startDate && (
              <Text style={styles.coverDateText}>
                {item.startDate} {item.endDate ? `→ ${item.endDate}` : ''}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Card Body Info */}
        <View style={styles.cardBody}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => handleOpenDetail(item)}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
          </TouchableOpacity>

          {/* Budget & Meta */}
          <View style={styles.cardMetaRow}>
            <View style={styles.metaBadge}>
              <FontAwesome name="money" size={12} color="#D97706" style={{ marginRight: 5 }} />
              <Text style={styles.metaBudgetText}>{budgetDisplay}</Text>
            </View>

            {item.creatorName && (
              <View style={styles.metaBadge}>
                <FontAwesome name="user-circle" size={12} color={WF_COLORS.slate500} style={{ marginRight: 4 }} />
                <Text style={styles.metaUserText} numberOfLines={1}>{item.creatorName}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons Row */}
          <View style={styles.cardActionRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.cardDetailBtn}
              onPress={() => handleOpenDetail(item)}>
              <Text style={styles.cardDetailBtnText}>Xem chi tiết</Text>
              <FontAwesome name="arrow-right" size={11} color="#FFFFFF" style={{ marginLeft: 5 }} />
            </TouchableOpacity>

            <View style={styles.cardIconActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.actionIconBtn}
                onPress={() => handleCloneTrip(item)}>
                <FontAwesome name="clone" size={14} color={WF_COLORS.slate600} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.actionIconBtn}
                onPress={() => handleShareTrip(item)}>
                <FontAwesome name="share-alt" size={14} color={WF_COLORS.slate600} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionIconBtn, styles.actionDeleteBtn]}
                onPress={() => handleDeleteTrip(item)}>
                <FontAwesome name="trash-o" size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ─── TIMELINE DETAILS COMPUTATION ────────────────────────
  const detailsList = selectedItinerary?.details || [];
  const maxDay = useMemo(() => {
    if (!detailsList.length) return selectedItinerary?.daysCount || 3;
    return Math.max(...detailsList.map(d => d.dayNumber || 1));
  }, [detailsList, selectedItinerary]);

  const filteredDetails = useMemo(() => {
    if (selectedDay === 'all') return detailsList;
    return detailsList.filter(d => (d.dayNumber || 1) === selectedDay);
  }, [detailsList, selectedDay]);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredItineraries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItineraryCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[WF_COLORS.primary]} />}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* ─── 1. CINEMATIC HERO BANNER ────────────────────── */}
            <View style={styles.heroBox}>
              <Image
                source={{ uri: COVER_PRESETS[0].url }}
                style={styles.heroBackdrop}
                resizeMode="cover"
              />
              <View style={styles.heroDarkScrim} />

              <View style={styles.heroContent}>
                {/* Breadcrumb */}
                <View style={styles.breadcrumbRow}>
                  <FontAwesome name="compass" size={12} color="#7DD3FC" style={{ marginRight: 5 }} />
                  <Text style={styles.breadcrumbText}>Wayfare</Text>
                  <FontAwesome name="angle-right" size={11} color="#94A3B8" style={{ marginHorizontal: 6 }} />
                  <Text style={[styles.breadcrumbText, { color: '#FFFFFF', fontWeight: 'bold' }]}>
                    Kế Hoạch & Lịch Trình
                  </Text>
                </View>

                {/* Hero Title */}
                <Text style={styles.heroHeadline}>
                  Lịch Trình Du Lịch{'\n'}
                  <Text style={styles.heroHeadlineGradient}>Của Bạn ✨</Text>
                </Text>

                <Text style={styles.heroSubtitle}>
                  Khám phá & tổ chức các chuyến đi thông minh, kiểm soát ngân sách chi tiết và kiến tạo hành trình chỉ với một chạm cùng AI.
                </Text>

                {/* Hero Action CTA Buttons */}
                <View style={styles.heroBtnRow}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.aiCtaBtn}
                    onPress={() => setAiModalVisible(true)}>
                    <FontAwesome name="magic" size={13} color="#FEF08A" style={{ marginRight: 6 }} />
                    <Text style={styles.aiCtaBtnText}>Lập Tour Bằng AI (30s) ✨</Text>
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>FREE</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.manualCtaBtn}
                    onPress={() => setManualModalVisible(true)}>
                    <FontAwesome name="plus" size={12} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.manualCtaBtnText}>+ Tạo Thủ Công</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ─── 2. 4 DASHBOARD KPI METRIC CARDS ─────────────── */}
            <View style={styles.kpiContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.kpiScroll}>
                {/* KPI 1: Tổng chuyến */}
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#E0F2FE' }]}>
                    <FontAwesome name="compass" size={18} color="#0284C7" />
                  </View>
                  <Text style={styles.kpiLabel}>TỔNG CHUYẾN ĐI</Text>
                  <View style={styles.kpiValueRow}>
                    <Text style={styles.kpiValue}>{statsKPI.totalTrips}</Text>
                    <Text style={styles.kpiSubText}>chuyến</Text>
                  </View>
                </View>

                {/* KPI 2: Điểm dừng chân */}
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#DCFCE7' }]}>
                    <FontAwesome name="map-marker" size={18} color="#16A34A" />
                  </View>
                  <Text style={styles.kpiLabel}>ĐIỂM DỪNG CHÂN</Text>
                  <View style={styles.kpiValueRow}>
                    <Text style={styles.kpiValue}>{statsKPI.totalStops}</Text>
                    <Text style={styles.kpiSubText}>địa danh</Text>
                  </View>
                </View>

                {/* KPI 3: Tổng ngân sách */}
                <View style={styles.kpiCard}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#EEF2FF' }]}>
                    <FontAwesome name="money" size={18} color="#4F46E5" />
                  </View>
                  <Text style={styles.kpiLabel}>DỰ TOÁN CHI PHÍ</Text>
                  <View style={styles.kpiValueRow}>
                    <Text style={styles.kpiValue}>{statsKPI.totalBudgetMil}M</Text>
                    <Text style={styles.kpiSubText}>VNĐ</Text>
                  </View>
                </View>

                {/* KPI 4: Kế hoạch sắp tới */}
                <View style={[styles.kpiCard, styles.kpiCardWarm]}>
                  <View style={[styles.kpiIconBox, { backgroundColor: '#F59E0B' }]}>
                    <FontAwesome name="clock-o" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.kpiLabel, { color: '#B45309' }]}>KẾ HOẠCH SẮP TỚI</Text>
                  <Text style={styles.kpiDestText} numberOfLines={1}>{statsKPI.nextDestination}</Text>
                  <Text style={styles.kpiDurationText}>{statsKPI.nextDuration}</Text>
                </View>
              </ScrollView>
            </View>

            {/* ─── 3. SEARCH & FILTER TOOLBAR ──────────────────── */}
            <View style={styles.toolbarBox}>
              {/* Search Bar */}
              <View style={styles.searchBar}>
                <FontAwesome name="search" size={14} color={WF_COLORS.slate400} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm chuyến đi, điểm đến, địa danh..."
                  placeholderTextColor={WF_COLORS.slate400}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.trim().length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <FontAwesome name="times-circle" size={14} color={WF_COLORS.slate400} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Status Segmented Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                {[
                  { id: 'upcoming', label: 'Chuyến sắp tới', count: tabCounts.upcoming },
                  { id: 'completed', label: 'Đã hoàn thành', count: tabCounts.completed },
                  { id: 'drafts', label: 'Bản nháp & AI ✨', count: tabCounts.drafts },
                  { id: 'all', label: 'Tất cả', count: tabCounts.all },
                ].map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      activeOpacity={0.8}
                      style={[styles.tabButton, isActive && styles.tabButtonActive]}
                      onPress={() => setActiveTab(tab.id as any)}>
                      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                        {tab.label}
                      </Text>
                      <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                        <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                          {tab.count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Filter Chips */}
              <View style={styles.filterChipRow}>
                <TouchableOpacity
                  style={[styles.filterChip, activeFilterTag === 'all' && styles.filterChipActive]}
                  onPress={() => setActiveFilterTag('all')}>
                  <Text style={[styles.filterChipText, activeFilterTag === 'all' && styles.filterChipTextActive]}>
                    Tất cả
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, activeFilterTag === 'ai' && styles.filterChipActive]}
                  onPress={() => setActiveFilterTag('ai')}>
                  <FontAwesome name="magic" size={11} color={activeFilterTag === 'ai' ? '#FFFFFF' : '#0284C7'} style={{ marginRight: 4 }} />
                  <Text style={[styles.filterChipText, activeFilterTag === 'ai' && styles.filterChipTextActive]}>
                    Tour AI ✨
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, activeFilterTag === 'group' && styles.filterChipActive]}
                  onPress={() => setActiveFilterTag('group')}>
                  <FontAwesome name="users" size={11} color={activeFilterTag === 'group' ? '#FFFFFF' : WF_COLORS.slate600} style={{ marginRight: 4 }} />
                  <Text style={[styles.filterChipText, activeFilterTag === 'group' && styles.filterChipTextActive]}>
                    Nhóm bạn
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, activeFilterTag === 'family' && styles.filterChipActive]}
                  onPress={() => setActiveFilterTag('family')}>
                  <FontAwesome name="home" size={11} color={activeFilterTag === 'family' ? '#FFFFFF' : WF_COLORS.slate600} style={{ marginRight: 4 }} />
                  <Text style={[styles.filterChipText, activeFilterTag === 'family' && styles.filterChipTextActive]}>
                    Gia đình
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={WF_COLORS.primary} />
              <Text style={styles.loadingText}>Đang nạp kế hoạch chuyến đi từ Railway CSDL...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <FontAwesome name="suitcase" size={36} color={WF_COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có lịch trình phù hợp</Text>
              <Text style={styles.emptySubtitle}>
                Bấm vào nút "Lập Tour Bằng AI (30s) ✨" hoặc "+ Tạo Thủ Công" bên trên để bắt đầu ngay!
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setAiModalVisible(true)}>
                <FontAwesome name="magic" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Tạo Lịch Trình Với AI</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* ─── MODAL 1: CHI TIẾT LỊCH TRÌNH ───────────────────────── */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}>
        <SafeAreaView style={styles.detailContainer} edges={['top', 'bottom']}>
          {/* Top Navbar */}
          <View style={styles.detailNavbar}>
            <TouchableOpacity
              style={styles.navBackBtn}
              onPress={() => setDetailModalVisible(false)}>
              <FontAwesome name="chevron-left" size={15} color={WF_COLORS.slate900} />
            </TouchableOpacity>
            <Text style={styles.navTitle} numberOfLines={1}>
              {selectedItinerary?.title || 'Chi tiết chuyến đi'}
            </Text>
            <TouchableOpacity
              style={styles.navBackBtn}
              onPress={() => selectedItinerary && handleShareTrip(selectedItinerary)}>
              <FontAwesome name="share-alt" size={15} color={WF_COLORS.slate900} />
            </TouchableOpacity>
          </View>

          {loadingDetail ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={WF_COLORS.primary} />
              <Text style={styles.loadingText}>Đang nạp các điểm dừng và chi tiết...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
              {/* Trip Hero Card */}
              <View style={styles.detailHeroCard}>
                <Image
                  source={{ uri: selectedItinerary?.coverImageUrl || selectedItinerary?.coverImage || COVER_PRESETS[0].url }}
                  style={styles.detailHeroImage}
                  resizeMode="cover"
                />
                <View style={styles.detailHeroScrim} />
                <View style={styles.detailHeroBadgeRow}>
                  <View style={styles.detailDestBadge}>
                    <FontAwesome name="map-marker" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.detailDestText}>{selectedItinerary?.destination}</Text>
                  </View>
                  {selectedItinerary?.isAiGenerated && (
                    <View style={styles.detailAiBadge}>
                      <FontAwesome name="magic" size={11} color="#FEF08A" style={{ marginRight: 4 }} />
                      <Text style={styles.detailAiText}>Tour AI ✨</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.detailHeroTitle}>{selectedItinerary?.title}</Text>
              </View>

              {/* Summary Stats Row */}
              <View style={styles.detailStatsRow}>
                <View style={styles.detailStatBox}>
                  <FontAwesome name="calendar" size={14} color={WF_COLORS.primary} />
                  <Text style={styles.detailStatLabel}>Thời gian</Text>
                  <Text style={styles.detailStatValue}>
                    {selectedItinerary?.daysCount ? `${selectedItinerary.daysCount}N${Math.max(1, selectedItinerary.daysCount - 1)}Đ` : '3N2Đ'}
                  </Text>
                </View>

                <View style={styles.detailStatBox}>
                  <FontAwesome name="map-signs" size={14} color="#16A34A" />
                  <Text style={styles.detailStatLabel}>Trạm dừng</Text>
                  <Text style={styles.detailStatValue}>{detailsList.length || 0} điểm</Text>
                </View>

                <View style={styles.detailStatBox}>
                  <FontAwesome name="money" size={14} color="#D97706" />
                  <Text style={styles.detailStatLabel}>Dự toán</Text>
                  <Text style={styles.detailStatValue}>
                    {selectedItinerary?.budgetTotal ? `${(selectedItinerary.budgetTotal / 1000000).toFixed(1)}M` : 'Tùy chọn'}
                  </Text>
                </View>
              </View>

              {/* Day Selector Pills */}
              <View style={styles.daySelectorSection}>
                <Text style={styles.sectionHeaderTitle}>Lộ Trình Từng Ngày</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPillsScroll}>
                  <TouchableOpacity
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

              {/* Add Stop Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.addStopBtn}
                onPress={() => {
                  setStopDayNum(typeof selectedDay === 'number' ? selectedDay : 1);
                  setAddStopModalVisible(true);
                }}>
                <FontAwesome name="plus" size={12} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.addStopBtnText}>
                  + Thêm Điểm Dừng (Ngày {typeof selectedDay === 'number' ? selectedDay : 1})
                </Text>
              </TouchableOpacity>

              {/* Activities Timeline */}
              <View style={styles.timelineSection}>
                {filteredDetails.length === 0 ? (
                  <View style={styles.emptyTimelineBox}>
                    <FontAwesome name="calendar-o" size={28} color={WF_COLORS.slate400} />
                    <Text style={styles.emptyTimelineText}>Chưa có trạm dừng nào cho ngày này.</Text>
                    <Text style={styles.emptyTimelineSub}>Bấm nút "+ Thêm Điểm Dừng" bên trên để tạo lịch trình chi tiết nhé!</Text>
                  </View>
                ) : (
                  filteredDetails.map((detail, index) => (
                    <View key={detail.id || index} style={styles.timelineItem}>
                      {/* Left Time Column */}
                      <View style={styles.timelineLeftCol}>
                        <Text style={styles.timelineTimeText}>{detail.startTime || '08:30'}</Text>
                        <View style={styles.timelineDot} />
                        {index < filteredDetails.length - 1 && <View style={styles.timelineLine} />}
                      </View>

                      {/* Right Card Content */}
                      <View style={styles.timelineCard}>
                        <View style={styles.timelineCardHeader}>
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{detail.category || 'Tham quan'}</Text>
                          </View>
                          {detail.id && (
                            <TouchableOpacity onPress={() => handleDeleteStop(detail.id)}>
                              <FontAwesome name="trash-o" size={13} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>

                        <Text style={styles.timelineCardTitle}>{detail.locationName}</Text>

                        {detail.note ? (
                          <Text style={styles.timelineCardNote}>💡 {detail.note}</Text>
                        ) : null}

                        {detail.estimatedCost ? (
                          <View style={styles.timelineCostRow}>
                            <FontAwesome name="money" size={11} color="#D97706" style={{ marginRight: 4 }} />
                            <Text style={styles.timelineCostText}>
                              ~{detail.estimatedCost.toLocaleString('vi-VN')} đ
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Packing Checklist */}
              <View style={styles.checklistSection}>
                <Text style={styles.sectionHeaderTitle}>Hành Trang Chuẩn Bị</Text>
                <View style={styles.checklistCard}>
                  {PACKING_CHECKLIST.map(item => {
                    const isChecked = Boolean(checkedItems[item.id]);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.8}
                        style={styles.checkItemRow}
                        onPress={() => toggleChecklist(item.id)}>
                        <FontAwesome
                          name={isChecked ? 'check-square' : 'square-o'}
                          size={18}
                          color={isChecked ? WF_COLORS.primary : WF_COLORS.slate400}
                          style={{ marginRight: 10 }}
                        />
                        <Text style={[styles.checkItemText, isChecked && styles.checkItemTextDone]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ─── MODAL 2: WANDERAI TRIP GENERATOR ───────────────────── */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        onRequestClose={() => !isAiGenerating && setAiModalVisible(false)}>
        <SafeAreaView style={styles.modalSafeContainer} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome name="magic" size={18} color="#0284C7" style={{ marginRight: 8 }} />
              <Text style={styles.modalHeaderTitle}>Lập Tour Bằng AI (30s) ✨</Text>
            </View>
            {!isAiGenerating && (
              <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
              </TouchableOpacity>
            )}
          </View>

          {isAiGenerating ? (
            /* AI Progress Animation Screen */
            <View style={styles.aiLoadingContainer}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.aiLoadingProgress}>{aiProgress}%</Text>
              <Text style={styles.aiLoadingTitle}>WanderAI đang kiến tạo hành trình</Text>
              <Text style={styles.aiLoadingStep}>{aiCurrentStep}</Text>

              {/* Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${aiProgress}%` }]} />
              </View>

              <Text style={styles.aiLoadingNote}>
                Đang đối soát danh lam thắng cảnh, tối ưu thời gian di chuyển và cân đối ngân sách thực địa...
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.aiFormScroll}>
              {/* 1. Điểm Đến */}
              <Text style={styles.aiInputLabel}>1. Bạn muốn đi du lịch ở đâu? *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nhập tên điểm đến (VD: Đà Lạt, Sa Pa...)"
                placeholderTextColor={WF_COLORS.slate400}
                value={aiDest}
                onChangeText={setAiDest}
              />
              {/* Quick Hot Suggestions */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hotChipsScroll}>
                {HOT_DESTINATIONS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.hotChip, aiDest === d && styles.hotChipActive]}
                    onPress={() => setAiDest(d)}>
                    <Text style={[styles.hotChipText, aiDest === d && styles.hotChipTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 2. Số Ngày */}
              <Text style={[styles.aiInputLabel, { marginTop: 16 }]}>2. Thời gian chuyến đi *</Text>
              <View style={styles.optionRow}>
                {[1, 2, 3, 4, 5].map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayChoiceBtn, aiDays === d && styles.dayChoiceBtnActive]}
                    onPress={() => setAiDays(d)}>
                    <Text style={[styles.dayChoiceText, aiDays === d && styles.dayChoiceTextActive]}>
                      {d} Ngày
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 3. Bạn Đồng Hành */}
              <Text style={[styles.aiInputLabel, { marginTop: 16 }]}>3. Bạn đi cùng ai?</Text>
              <View style={styles.grid2x2}>
                {COMPANION_OPTIONS.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.choiceCard, aiCompanion === c.id && styles.choiceCardActive]}
                    onPress={() => setAiCompanion(c.id)}>
                    <FontAwesome
                      name={c.icon as any}
                      size={16}
                      color={aiCompanion === c.id ? WF_COLORS.primary : WF_COLORS.slate600}
                    />
                    <Text style={[styles.choiceCardText, aiCompanion === c.id && styles.choiceCardTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 4. Mức Ngân Sách */}
              <Text style={[styles.aiInputLabel, { marginTop: 16 }]}>4. Hạn mức chi phí dự kiến</Text>
              <View style={{ gap: 8 }}>
                {BUDGET_TIERS.map(b => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.budgetRow, aiBudgetTier === b.id && styles.budgetRowActive]}
                    onPress={() => setAiBudgetTier(b.id)}>
                    <View>
                      <Text style={[styles.budgetRowTitle, aiBudgetTier === b.id && styles.budgetRowTitleActive]}>
                        {b.label}
                      </Text>
                      <Text style={styles.budgetRowSub}>{b.note}</Text>
                    </View>
                    <FontAwesome
                      name={aiBudgetTier === b.id ? 'dot-circle-o' : 'circle-o'}
                      size={18}
                      color={aiBudgetTier === b.id ? WF_COLORS.primary : WF_COLORS.slate400}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* 5. Phong Cách Du Lịch */}
              <Text style={[styles.aiInputLabel, { marginTop: 16 }]}>5. Sở thích & Gu du lịch</Text>
              <View style={styles.grid2x2}>
                {AI_STYLE_PRESETS.map(s => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.choiceCard, aiStyle === s.id && styles.choiceCardActive]}
                    onPress={() => setAiStyle(s.id)}>
                    <Text style={[styles.choiceCardText, aiStyle === s.id && styles.choiceCardTextActive]}>
                      {s.label}
                    </Text>
                    <Text style={styles.choiceCardSub}>{s.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit CTA */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.submitAiBtn}
                onPress={handleStartAIGeneration}>
                <FontAwesome name="magic" size={15} color="#FEF08A" style={{ marginRight: 8 }} />
                <Text style={styles.submitAiBtnText}>Tạo Tour Bằng AI (30s) ✨</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ─── MODAL 3: TẠO THỦ CÔNG ───────────────────────────────── */}
      <Modal
        visible={manualModalVisible}
        animationType="slide"
        onRequestClose={() => setManualModalVisible(false)}>
        <SafeAreaView style={styles.modalSafeContainer} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>✈️ Tạo Lịch Trình Thủ Công</Text>
            <TouchableOpacity onPress={() => setManualModalVisible(false)}>
              <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.aiFormScroll}>
            {/* Tên chuyến đi */}
            <Text style={styles.aiInputLabel}>Tên chuyến đi *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: Khám phá vẻ đẹp Sa Pa 3N2Đ"
              placeholderTextColor={WF_COLORS.slate400}
              value={manualTitle}
              onChangeText={setManualTitle}
            />

            {/* Điểm đến chính */}
            <Text style={[styles.aiInputLabel, { marginTop: 14 }]}>Điểm đến chính *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: Sa Pa, Đà Lạt, Mũi Né..."
              placeholderTextColor={WF_COLORS.slate400}
              value={manualDest}
              onChangeText={setManualDest}
            />

            {/* Chọn ảnh bìa Preset */}
            <Text style={[styles.aiInputLabel, { marginTop: 14 }]}>Chọn ảnh bìa đại diện</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
              {COVER_PRESETS.map((p, idx) => {
                const isSelected = manualCover === p.url;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.presetCard, isSelected && styles.presetCardActive]}
                    onPress={() => setManualCover(p.url)}>
                    <Image source={{ uri: p.url }} style={styles.presetImage} />
                    <Text style={styles.presetLabel} numberOfLines={1}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Ngày đi & ngày về */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiInputLabel}>Ngày đi</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="2026-10-25"
                  placeholderTextColor={WF_COLORS.slate400}
                  value={manualStartDate}
                  onChangeText={setManualStartDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiInputLabel}>Ngày về</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="2026-10-28"
                  placeholderTextColor={WF_COLORS.slate400}
                  value={manualEndDate}
                  onChangeText={setManualEndDate}
                />
              </View>
            </View>

            {/* Dự toán ngân sách */}
            <Text style={[styles.aiInputLabel, { marginTop: 14 }]}>Dự toán ngân sách (VNĐ)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="4500000"
              placeholderTextColor={WF_COLORS.slate400}
              value={manualBudget}
              onChangeText={setManualBudget}
              keyboardType="numeric"
            />

            {/* Ghi chú */}
            <Text style={[styles.aiInputLabel, { marginTop: 14 }]}>Ghi chú hành trình</Text>
            <TextInput
              style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
              placeholder="Kế hoạch, lưu ý hành lý hoặc danh sách điểm ghé..."
              placeholderTextColor={WF_COLORS.slate400}
              value={manualNote}
              onChangeText={setManualNote}
              multiline
            />

            {/* Submit */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.submitAiBtn, submittingManual && { opacity: 0.7 }]}
              onPress={handleCreateManualTrip}
              disabled={submittingManual}>
              {submittingManual ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitAiBtnText}>Lưu & Bắt đầu lên lịch</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ─── SUB-MODAL: THÊM ĐIỂM DỪNG VÀO NGÀY ────────────────── */}
      <Modal visible={addStopModalVisible} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.stopCardBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>📍 Thêm Điểm Dừng (Ngày {stopDayNum})</Text>
              <TouchableOpacity onPress={() => setAddStopModalVisible(false)}>
                <FontAwesome name="times" size={16} color={WF_COLORS.slate500} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.aiInputLabel}>Tên địa điểm / Trạm dừng *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="VD: Cáp treo Fansipan, Quán Cà phê săn mây..."
                placeholderTextColor={WF_COLORS.slate400}
                value={stopName}
                onChangeText={setStopName}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiInputLabel}>Khung giờ</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="08:30"
                    placeholderTextColor={WF_COLORS.slate400}
                    value={stopTime}
                    onChangeText={setStopTime}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiInputLabel}>Danh mục</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Tham quan"
                    placeholderTextColor={WF_COLORS.slate400}
                    value={stopCategory}
                    onChangeText={setStopCategory}
                  />
                </View>
              </View>

              <Text style={[styles.aiInputLabel, { marginTop: 12 }]}>Chi phí dự kiến (VNĐ)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="100000"
                placeholderTextColor={WF_COLORS.slate400}
                value={stopCost}
                onChangeText={setStopCost}
                keyboardType="numeric"
              />

              <Text style={[styles.aiInputLabel, { marginTop: 12 }]}>Ghi chú trải nghiệm</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Lưu ý trang phục, vé vào cổng, góc check-in..."
                placeholderTextColor={WF_COLORS.slate400}
                value={stopNote}
                onChangeText={setStopNote}
                multiline
              />

              <TouchableOpacity
                activeOpacity={0.88}
                style={[styles.submitAiBtn, { marginTop: 16 }, submittingStop && { opacity: 0.7 }]}
                onPress={handleAddStop}
                disabled={submittingStop}>
                {submittingStop ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitAiBtnText}>Thêm Điểm Dừng</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLESHEET ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 12,
  },

  // 1. Hero
  heroBox: {
    position: 'relative',
    height: 310,
    backgroundColor: '#031726',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.85,
  },
  heroDarkScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(3, 23, 38, 0.72)',
  },
  heroContent: {
    zIndex: 10,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breadcrumbText: {
    fontSize: 12,
    color: '#BAE6FD',
    fontWeight: '600',
  },
  heroHeadline: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heroHeadlineGradient: {
    color: '#38BDF8',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#FEF3C7',
    marginTop: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
  heroBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  aiCtaBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    borderRadius: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  aiCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  freeBadge: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  freeBadgeText: {
    color: '#FEF08A',
    fontSize: 9,
    fontWeight: '900',
  },
  manualCtaBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 11,
    borderRadius: 24,
  },
  manualCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // 2. KPI Cards
  kpiContainer: {
    marginTop: -16,
    zIndex: 20,
    marginBottom: 10,
  },
  kpiScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  kpiCard: {
    width: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiCardWarm: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  kpiSubText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  kpiDestText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  kpiDurationText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 1,
  },

  // 3. Toolbar & Tabs
  toolbarBox: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  tabsScroll: {
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#0284C7',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // 4. Card List Item
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardCoverBox: {
    height: 180,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  cardCoverImage: {
    width: '100%',
    height: '100%',
  },
  cardGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  cardTopBadgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  destinationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  destinationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  aiBadgeText: {
    color: '#FEF08A',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusBadgeUpcoming: {
    backgroundColor: '#0284C7',
  },
  statusBadgeCompleted: {
    backgroundColor: '#16A34A',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  cardCoverBottomRow: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  durationPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  coverDateText: {
    color: '#FEF3C7',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaBudgetText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  metaUserText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    maxWidth: 120,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  cardDetailBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  cardIconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDeleteBtn: {
    backgroundColor: '#FEE2E2',
  },

  // 5. Empty State & Center Loader
  centerBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // 6. Detail Modal
  detailContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  detailNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  navBackBtn: {
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  detailScrollContent: {
    paddingBottom: 40,
  },
  detailHeroCard: {
    height: 190,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#0F172A',
  },
  detailHeroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  detailHeroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  detailHeroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailDestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailDestText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  detailAiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailAiText: {
    color: '#FEF08A',
    fontSize: 11,
    fontWeight: '800',
  },
  detailHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  detailStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    justifyContent: 'space-around',
  },
  detailStatBox: {
    alignItems: 'center',
  },
  detailStatLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  detailStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  daySelectorSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  dayPillsScroll: {
    gap: 8,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  },
  dayPillTextActive: {
    color: '#FFFFFF',
  },
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  addStopBtnText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '800',
  },
  timelineSection: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  emptyTimelineBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTimelineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  emptyTimelineSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineLeftCol: {
    width: 60,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0284C7',
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#BAE6FD',
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '700',
  },
  timelineCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  timelineCardNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  timelineCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  timelineCostText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  checklistSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  checklistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  checkItemTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },

  // 7. Modals Common
  modalSafeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  aiFormScroll: {
    padding: 18,
    paddingBottom: 40,
  },
  aiInputLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  hotChipsScroll: {
    gap: 6,
    marginTop: 8,
  },
  hotChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  hotChipActive: {
    backgroundColor: '#0284C7',
  },
  hotChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  hotChipTextActive: {
    color: '#FFFFFF',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayChoiceBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayChoiceBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  dayChoiceText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  dayChoiceTextActive: {
    color: '#FFFFFF',
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceCard: {
    width: (SCREEN_WIDTH - 36 - 8) / 2,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  choiceCardActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  choiceCardText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  choiceCardTextActive: {
    color: '#0284C7',
  },
  choiceCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  budgetRowActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  budgetRowTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  budgetRowTitleActive: {
    color: '#0284C7',
  },
  budgetRowSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  submitAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 22,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitAiBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // AI Loading View
  aiLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  aiLoadingProgress: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0284C7',
    marginTop: 16,
    fontFamily: 'monospace',
  },
  aiLoadingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  aiLoadingStep: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 4,
  },
  aiLoadingNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },

  // Preset covers
  presetScroll: {
    gap: 10,
    marginVertical: 4,
  },
  presetCard: {
    width: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardActive: {
    borderColor: '#0284C7',
  },
  presetImage: {
    width: '100%',
    height: 60,
  },
  presetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginTop: 2,
  },

  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  stopCardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    maxHeight: '85%',
  },
});
