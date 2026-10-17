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
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { WF_COLORS } from '@/constants/Colors';
import { ChatModal } from '@/components/ChatModal';
import {
  itineraryApi,
  ItineraryItem,
  ItineraryDetailItem,
} from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import { aiService } from '@/src/services/aiService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SERIF_FONT = Platform.select({ ios: 'Times New Roman', android: 'serif', default: 'serif' });

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

// Khớp 100% với Web AITripGeneratorModal.jsx INTEREST_OPTIONS
const AI_INTEREST_OPTIONS = [
  { id: 'checkin', label: '📸 Sống ảo' },
  { id: 'food', label: '🍜 Ẩm thực' },
  { id: 'beach', label: '🏖️ Biển & Nghỉ dưỡng' },
  { id: 'culture', label: '🏛️ Văn hóa di sản' },
  { id: 'trekking', label: '🧭 Phượt & Trekking' },
  { id: 'nightlife', label: '🎵 Phố đêm vui chơi' },
  { id: 'healing', label: '🌿 Chữa lành' },
  { id: 'shopping', label: '🛍️ Mua sắm & Chợ' },
];

// Khớp 100% với Web COMPANION OPTIONS
const COMPANION_OPTIONS = [
  { id: 'solo', label: 'Cá nhân (Solo)' },
  { id: 'couple', label: 'Cặp đôi' },
  { id: 'friends', label: 'Bạn bè' },
  { id: 'family', label: 'Gia đình' },
];

// Khớp 100% với Web 4 BUDGET TIERS
const BUDGET_TIERS = [
  { id: 1, label: 'Tiết kiệm / Phượt', range: '2.5 - 4.0 Triệu VNĐ', budgetVal: 3500000 },
  { id: 2, label: 'Tiêu chuẩn / Cân bằng', range: '4.0 - 7.0 Triệu VNĐ', budgetVal: 5500000 },
  { id: 3, label: 'Cao cấp / Thoải mái', range: '7.0 - 12.0 Triệu VNĐ', budgetVal: 9000000 },
  { id: 4, label: 'Nghỉ dưỡng VIP', range: '15.0+ Triệu VNĐ', budgetVal: 16000000 },
];

const PACKING_CHECKLIST = [
  { id: 'c1', label: 'Căn cước công dân / Hộ chiếu gốc' },
  { id: 'c2', label: 'Vé máy bay / Đặt phòng khách sạn' },
  { id: 'c3', label: 'Sạc dự phòng & Dây cáp điện thoại' },
  { id: 'c4', label: 'Kem chống nắng & Kính râm' },
  { id: 'c5', label: 'Thuốc y tế cá nhân (dị ứng, đau bụng, cảm)' },
  { id: 'c6', label: 'Quần áo phù hợp thời tiết điểm đến' },
];

// Format số tiền có dấu phẩy hàng nghìn
function formatCurrency(num: number | string): string {
  if (!num) return '0';
  const clean = String(num).replace(/\D/g, '');
  if (!clean) return '0';
  return Number(clean).toLocaleString('en-US');
}

export default function ItineraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ─── FLOATING NAVBAR DYNAMIC STATE ───────────────────────
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

  // ─── MAIN DATA STATE ─────────────────────────────────────
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'drafts' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTag, setActiveFilterTag] = useState<'all' | 'ai' | 'group' | 'family'>('all');

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
  const [stopAddress, setStopAddress] = useState<string>('');
  const [stopTime, setStopTime] = useState<string>('08:30');
  const [stopCategory, setStopCategory] = useState<string>('Tham quan');
  const [stopNote, setStopNote] = useState<string>('');
  const [stopCost, setStopCost] = useState<string>('100,000');
  const [submittingStop, setSubmittingStop] = useState<boolean>(false);

  // ─── MODAL MANUAL TRIP STATE ─────────────────────────────
  const [manualModalVisible, setManualModalVisible] = useState<boolean>(false);
  const [manualTitle, setManualTitle] = useState<string>('');
  const [manualDest, setManualDest] = useState<string>('');
  const [manualStartDate, setManualStartDate] = useState<string>('2026-10-25');
  const [manualEndDate, setManualEndDate] = useState<string>('2026-10-28');
  const [manualDays, setManualDays] = useState<number>(4);
  const [manualBudgetFormatted, setManualBudgetFormatted] = useState<string>('4,500,000');
  const [manualCover, setManualCover] = useState<string>(COVER_PRESETS[0].url);
  const [manualGroup, setManualGroup] = useState<string>('Bạn bè');
  const [submittingManual, setSubmittingManual] = useState<boolean>(false);

  // ─── MODAL WANDERAI TRIP GENERATOR STATE ─────────────────
  const [aiModalVisible, setAiModalVisible] = useState<boolean>(false);
  const [aiDest, setAiDest] = useState<string>('Đà Lạt');
  const [aiStartDate, setAiStartDate] = useState<string>('2026-10-25');
  const [aiEndDate, setAiEndDate] = useState<string>('2026-10-28');
  const [aiDays, setAiDays] = useState<number>(4);
  const [aiCompanion, setAiCompanion] = useState<string>('couple');
  const [aiBudgetTier, setAiBudgetTier] = useState<number>(2);
  const [aiSelectedInterests, setAiSelectedInterests] = useState<string[]>(['checkin', 'food', 'culture']);
  const [aiCustomNote, setAiCustomNote] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiProgress, setAiProgress] = useState<number>(0);
  const [aiCurrentStep, setAiCurrentStep] = useState<string>('');

  // Tự động tính số ngày khi đổi ngày đi hoặc ngày về trong Tạo thủ công
  useEffect(() => {
    try {
      if (manualStartDate && manualEndDate) {
        const d1 = new Date(manualStartDate);
        const d2 = new Date(manualEndDate);
        const diffMs = d2.getTime() - d1.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > 0 && diffDays <= 30) {
          setManualDays(diffDays);
        } else {
          setManualDays(1);
        }
      }
    } catch {
      // Ignore
    }
  }, [manualStartDate, manualEndDate]);

  // Tự động tính số ngày khi đổi ngày đi hoặc ngày về trong Lập tour AI
  useEffect(() => {
    try {
      if (aiStartDate && aiEndDate) {
        const d1 = new Date(aiStartDate);
        const d2 = new Date(aiEndDate);
        const diffMs = d2.getTime() - d1.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > 0 && diffDays <= 30) {
          setAiDays(diffDays);
        } else {
          setAiDays(1);
        }
      }
    } catch {
      // Ignore
    }
  }, [aiStartDate, aiEndDate]);

  // ─── DATA FETCHING (CHỈ LẤY LỊCH TRÌNH CỦA TÔI TỪ CSDL) ───
  const fetchItineraries = useCallback(async () => {
    try {
      const session = await authStorage.getSession();
      setCurrentUser(session);

      let list: ItineraryItem[] = [];
      if (session?.email) {
        list = await itineraryApi.getMyItineraries();
      } else {
        list = [];
      }
      setItineraries(list || []);
    } catch (e) {
      console.warn('Fetch my itineraries error:', e);
      setItineraries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    authStorage.getSession().then((session) => {
      setCurrentUser(session);
    });
    fetchItineraries();
  }, [fetchItineraries]);

  const onRefresh = () => {
    setRefreshing(true);
    authStorage.getSession().then((session) => {
      setCurrentUser(session);
    });
    fetchItineraries();
  };

  // ─── SCROLL HANDLER ĐỂ THAY ĐỔI NAVBAR TRONG SUỐT / NỀN TRẮNG (KHỚP 100% VỚI WEB) ───
  const isScrolledRef = React.useRef<boolean>(false);
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const shouldBeScrolled = scrollY > 20;
    if (shouldBeScrolled !== isScrolledRef.current) {
      isScrolledRef.current = shouldBeScrolled;
      setIsScrolled(shouldBeScrolled);
    }
  }, []);

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
    } catch {
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
      Alert.alert('Thành công', `Đã sao chép chuyến đi "${itin.title}" vào danh sách của bạn.`);
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
            } catch {
              Alert.alert('Lỗi', 'Không thể xóa lịch trình này.');
            }
          },
        },
      ]
    );
  };

  // ─── CHỌN ẢNH TỪ MÁY DÙNG EXPO-IMAGE-PICKER ────────────────
  const handlePickCoverImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để chọn ảnh bìa chuyến đi!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setManualCover(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Pick image error', e);
      Alert.alert('Lỗi', 'Không thể mở thư viện ảnh');
    }
  };

  // ─── ADD STOP HANDLER ────────────────────────────────────
  const handleAddStop = async () => {
    if (!stopName.trim() || !selectedItinerary) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên điểm dừng chân!');
      return;
    }

    try {
      setSubmittingStop(true);
      const cleanCost = parseFloat(stopCost.replace(/,/g, '')) || 0;
      const newDetail: ItineraryDetailItem = {
        itineraryId: selectedItinerary.id,
        locationName: stopName.trim(),
        locationAddress: stopAddress.trim() || undefined,
        startTime: stopTime.trim(),
        category: stopCategory,
        dayNumber: stopDayNum,
        estimatedCost: cleanCost,
        note: stopNote.trim(),
      };

      await itineraryApi.addDetail(selectedItinerary.id, newDetail);
      Alert.alert('Thành công', `Đã thêm "${stopName}" vào Ngày ${stopDayNum}`);
      setAddStopModalVisible(false);
      setStopName('');
      setStopAddress('');
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
          } catch {
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
      const rawBudget = parseFloat(manualBudgetFormatted.replace(/,/g, '')) || 4000000;

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
        budgetTotal: rawBudget,
        coverImageUrl: manualCover,
        status: 'UPCOMING',
        isAiGenerated: false,
        groupType: manualGroup,
        details: sampleActivities,
      });

      Alert.alert('Thành công', `Đã tạo chuyến đi "${created.title}"`);
      setManualModalVisible(false);
      setManualTitle('');
      setManualDest('');

      fetchItineraries();
      handleOpenDetail(created);
    } catch (err: any) {
      Alert.alert('Lỗi tạo lịch trình', err.response?.data?.message || err.message || 'Không thể tạo chuyến đi.');
    } finally {
      setSubmittingManual(false);
    }
  };

  // ─── WANDERAI TRIP GENERATOR HANDLER ─────────────────────
  const toggleAiInterest = (id: string) => {
    setAiSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleStartAIGeneration = async () => {
    if (!aiDest.trim()) {
      Alert.alert('Thông báo', 'Vui lòng chọn hoặc nhập điểm đến!');
      return;
    }

    // Kiểm tra tính hợp lệ của ngày đi và ngày về
    if (aiStartDate && aiEndDate) {
      const d1 = new Date(aiStartDate);
      const d2 = new Date(aiEndDate);
      if (d2.getTime() < d1.getTime()) {
        Alert.alert('Lỗi thời gian', 'Ngày kết thúc phải diễn ra sau hoặc trùng với ngày bắt đầu chuyến đi!');
        return;
      }
    }

    // Kiểm tra người dùng đã đăng nhập chưa để lưu vào CSDL
    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập ở tab "Tài khoản" để WanderAI lưu lịch trình vào CSDL!');
      return;
    }

    setIsAiGenerating(true);
    setAiProgress(15);
    setAiCurrentStep('Khởi tạo kết nối & Định vị địa lý...');

    let progressTimer: any = null;

    try {
      progressTimer = setInterval(() => {
        setAiProgress(prev => {
          if (prev < 40) {
            setAiCurrentStep(`Nghiên cứu danh lam, di tích thực tế tại ${aiDest}...`);
            return prev + 15;
          }
          if (prev < 75) {
            setAiCurrentStep(`Khảo sát ẩm thực & quán ăn đặc sản bản địa tại ${aiDest}...`);
            return prev + 12;
          }
          if (prev < 90) {
            setAiCurrentStep(`Tối ưu lộ trình từng ngày & cân đối ngân sách...`);
            return prev + 5;
          }
          return prev;
        });
      }, 700);

      const budgetOption = BUDGET_TIERS.find(b => b.id === aiBudgetTier) || BUDGET_TIERS[1];
      const companionObj = COMPANION_OPTIONS.find(c => c.id === aiCompanion) || COMPANION_OPTIONS[1];
      const interestLabels = aiSelectedInterests
        .map(id => AI_INTEREST_OPTIONS.find(o => o.id === id)?.label)
        .filter(Boolean)
        .join(', ');

      // Build Prompt chi tiết, chuyên sâu cho Gemini 3.8 Flash
      const prompt = `Bạn là chuyên gia cố vấn du lịch bản địa hàng đầu tại Việt Nam.
Hãy nghiên cứu và phân tích điểm đến: "${aiDest}".
Lập lịch trình du lịch ${aiDays} ngày với các danh lam thắng cảnh, di tích lịch sử và quán ăn đặc sản có thật 100% tại "${aiDest}".
Thông tin chuyến đi:
- Điểm đến: ${aiDest}
- Thời lượng: ${aiDays} ngày (${aiDays}N${Math.max(1, aiDays - 1)}Đ)
- Đối tượng: ${companionObj.label}
- Ngân sách: ${budgetOption.label} (${budgetOption.range})
- Gu trải nghiệm: ${interestLabels || 'Khám phá, Ẩm thực'}
${aiCustomNote ? `- Yêu cầu thêm: ${aiCustomNote}` : ''}

QUY TẮC BẮT BUỘC:
1. Nghiên cứu chính xác các địa điểm, quán ăn có thật 100% tại "${aiDest}". Tuyệt đối không dùng văn mẫu chung chung.
2. Mỗi ngày có 3-4 hoạt động sắp xếp từ sáng đến tối.
3. BẮT BUỘC VỀ ĐỊA CHỈ ("address"): Tra cứu và ghi ĐỊA CHỈ CỤ THỂ CHI TIẾT CÓ THẬT của từng quán ăn, địa danh (gồm Số nhà/Tên đường, Phường/Xã, Quận/Huyện/Thị xã tại "${aiDest}"). TUYỆT ĐỐI KHÔNG ĐƯỢC chỉ ghi tên tỉnh thành chung chung như "${aiDest}" hay "Việt Nam".
Ví dụ chuẩn:
- Quán ăn: "Số 48 Ngô Đức Kế, P. Hồng Sơn, TP. Vinh, Nghệ An"
- Danh lam/Di tích: "Làng Sen & Hoàng Trù, xã Kim Liên, huyện Nam Đàn, Nghệ An"
- Trải nghiệm: "Đập Cầu Cau, xã Thanh An, huyện Thanh Chương, Nghệ An"
4. Trả về DUY NHẤT một chuỗi JSON hợp lệ theo định dạng:
{
  "title": "Tên chuyến đi hấp dẫn do AI sáng tạo (VD: Đà Lạt: Chuyến Đi Lãng Mạn Cho Cặp Đôi)",
  "summaryTip": "Mẹo du lịch bản địa ngắn gọn...",
  "placesList": ["Tên điểm thật 1", "Tên điểm thật 2", "Tên điểm thật 3", "Tên điểm thật 4"],
  "days": [
    {
      "dayNumber": 1,
      "title": "Chủ đề ngày...",
      "activities": [
        {
          "time": "08:00",
          "category": "Ẩm thực",
          "location": "Tên địa danh hoặc quán ăn cụ thể",
          "address": "Số nhà, tên đường, phường/xã, quận/huyện cụ thể tại ${aiDest}",
          "note": "Kinh nghiệm ngắn gọn",
          "cost": 50000,
          "transit": "15 phút"
        }
      ]
    }
  ]
}`;

      // GỌI GOOGLE GEMINI 3.8 FLASH THỰC TẾ
      const rawAiResponse = await aiService.generateText({
        prompt,
        model: 'gemini-3.8-flash',
        maxTokens: 8192,
        temperature: 0.3,
      });

      if (progressTimer) clearInterval(progressTimer);
      setAiProgress(95);
      setAiCurrentStep('Hoàn tất phân tích! Đang tổng hợp dữ liệu lịch trình...');

      // Parse JSON an toàn
      let parsedData: any = {};
      try {
        const cleaned = typeof rawAiResponse === 'string'
          ? rawAiResponse.replace(/```json/gi, '').replace(/```/g, '').trim()
          : '';
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        console.warn('JSON parse error from Gemini:', parseErr);
      }

      // Biến đổi các hoạt động thật từ Gemini thành ItineraryDetailItem[]
      const aiActivities: ItineraryDetailItem[] = [];
      if (parsedData.days && Array.isArray(parsedData.days) && parsedData.days.length > 0) {
        parsedData.days.forEach((dayObj: any) => {
          const dNum = Number(dayObj.dayNumber) || 1;
          const acts = dayObj.activities || [];
          acts.forEach((act: any, idx: number) => {
            const numCost = typeof act.cost === 'number'
              ? act.cost
              : parseFloat(String(act.cost || '').replace(/\D/g, '')) || (idx === 1 ? 120000 : 50000);

            const locName = act.location || act.title || `${aiDest} - Trạm dừng ${idx + 1}`;
            const locAddr = (act.address && typeof act.address === 'string' && act.address.trim())
              ? act.address.trim()
              : `${locName}, ${aiDest}, Việt Nam`;

            aiActivities.push({
              dayNumber: dNum,
              visitOrder: idx + 1,
              startTime: act.time || (idx === 0 ? '08:00' : idx === 1 ? '11:30' : idx === 2 ? '14:30' : '18:30'),
              locationName: locName,
              locationAddress: locAddr,
              category: act.category || (idx === 1 ? 'Ẩm thực' : idx === 3 ? 'Chill' : 'Tham quan'),
              estimatedCost: numCost,
              aiTip: act.note || parsedData.summaryTip || undefined,
              transitInfo: act.transit || undefined,
              note: act.note || undefined,
            });
          });
        });
      }

      // Fallback nếu JSON parse rỗng
      if (aiActivities.length === 0) {
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
              visitOrder: a + 1,
              startTime: times[a],
              locationName: `${actThemes[a]}`,
              category: catList[a],
              estimatedCost: a === 1 ? 120000 : 60000,
              note: aiCustomNote ? `Gợi ý AI: ${aiCustomNote}` : `Lịch trình tối ưu cho ${companionObj.label}`,
            });
          }
        }
      }

      const presetCover = COVER_PRESETS.find(c => c.label.includes(aiDest))?.url || COVER_PRESETS[0].url;
      const tripTitle = (parsedData.title && String(parsedData.title).trim())
        ? String(parsedData.title).trim()
        : `${aiDest}: Hành Trình AI Thiết Kế (${aiDays}N${Math.max(1, aiDays - 1)}Đ)`;

      const created = await itineraryApi.createItinerary({
        title: tripTitle,
        destination: aiDest.trim(),
        startDate: aiStartDate.trim() || undefined,
        endDate: aiEndDate.trim() || undefined,
        budgetTotal: budgetOption.budgetVal * (aiCompanion === 'friends' ? 3 : aiCompanion === 'couple' ? 2 : 1),
        coverImageUrl: presetCover,
        status: 'UPCOMING',
        isAiGenerated: true,
        groupType: companionObj.label,
        details: aiActivities,
      });

      setAiProgress(100);
      setAiCurrentStep('Hoàn tất kiến tạo lịch trình!');

      setTimeout(() => {
        setIsAiGenerating(false);
        setAiModalVisible(false);
        fetchItineraries();
        Alert.alert('Thành công', `WanderAI đã hoàn tất thiết kế lịch trình ${aiDest} cho bạn! 🎉`);
        handleOpenDetail(created);
      }, 500);

    } catch (err: any) {
      if (progressTimer) clearInterval(progressTimer);
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
                  <Text style={styles.aiBadgeText}>Tour AI</Text>
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
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isScrolled ? 'dark-content' : 'light-content'}
      />

      {/* ─── DYNAMIC FLOATING NAVBAR (TRONG SUỐT Ở TRÊN CÙNG, TRƯỢT XUỐNG ĐỔI THÀNH NỀN TRẮNG) ─── */}
      <View
        style={[
          styles.floatingNavbar,
          {
            paddingTop: insets.top + 6,
            height: 52 + insets.top + 6,
            backgroundColor: isScrolled ? '#FFFFFF' : 'transparent',
            borderBottomWidth: isScrolled ? 1 : 0,
            borderBottomColor: '#E2E8F0',
            shadowOpacity: isScrolled ? 0.08 : 0,
            elevation: isScrolled ? 4 : 0,
          },
        ]}>
        {/* Brand Logo - Điều hướng về Bảng tin Cộng đồng giống Facebook */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/community')}
          style={styles.navLogoWrapper}>
          <Image
            source={
              isScrolled
                ? require('@/assets/images/wayfare-logo.png')
                : require('@/assets/images/wayfare-logo-white.png')
            }
            style={styles.navHeaderLogo}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Action Buttons: Chat & Profile Avatar */}
        <View style={styles.navRightActions}>
          {/* Nút Chat */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsChatOpen(true)}
            style={[
              styles.navChatBtn,
              {
                backgroundColor: isScrolled ? '#F0F9FF' : 'rgba(255, 255, 255, 0.18)',
                borderColor: isScrolled ? '#BAE6FD' : 'rgba(255, 255, 255, 0.35)',
              },
            ]}>
            <FontAwesome
              name="comments"
              size={14}
              color={isScrolled ? WF_COLORS.primary : '#FFFFFF'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.navChatBtnText,
                { color: isScrolled ? WF_COLORS.primary : '#FFFFFF' },
              ]}>
              Chat
            </Text>
            <View style={styles.navLiveDot} />
          </TouchableOpacity>

          {/* Avatar Người Dùng */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.navAvatarBtn}>
            {currentUser?.avatar ? (
              <Image
                source={{ uri: currentUser.avatar }}
                style={[
                  styles.navAvatarImg,
                  { borderColor: isScrolled ? WF_COLORS.primary : '#FFFFFF' },
                ]}
              />
            ) : (
              <FontAwesome
                name="user-circle"
                size={28}
                color={isScrolled ? WF_COLORS.slate700 : '#FFFFFF'}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredItineraries}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItineraryCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[WF_COLORS.primary]} />}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            {/* ─── 1. FULL-BLEED TRANSPARENT HERO BANNER (ẢNH TRÀN LÊN TẬN ĐỈNH) ─── */}
            <View
              style={[
                styles.heroBox,
                {
                  paddingTop: insets.top + 48,
                  paddingBottom: 16,
                },
              ]}>
              <Image
                source={{ uri: COVER_PRESETS[0].url }}
                style={styles.heroBackdrop}
                resizeMode="cover"
              />
              <View style={styles.heroDarkScrim} />

              <View style={styles.heroContent}>
                {/* Hero Title */}
                <Text style={styles.heroHeadline}>
                  Lịch Trình Du Lịch
                </Text>

                {/* Subtitle ngắn gọn */}
                <Text style={styles.heroSubtitle}>
                  Tổ chức chuyến đi và kiến tạo lịch trình cùng AI.
                </Text>

                {/* Hero Action CTA Buttons */}
                <View style={styles.heroBtnRow}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.aiCtaBtn}
                    onPress={() => setAiModalVisible(true)}>
                    <Text style={styles.aiCtaBtnText}>Lập tour AI</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.manualCtaBtn}
                    onPress={() => setManualModalVisible(true)}>
                    <Text style={styles.manualCtaBtnText}>Tạo thủ công</Text>
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
                  { id: 'drafts', label: 'Bản nháp & AI', count: tabCounts.drafts },
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
                  <Text style={[styles.filterChipText, activeFilterTag === 'ai' && styles.filterChipTextActive]}>
                    Tour AI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, activeFilterTag === 'group' && styles.filterChipActive]}
                  onPress={() => setActiveFilterTag('group')}>
                  <Text style={[styles.filterChipText, activeFilterTag === 'group' && styles.filterChipTextActive]}>
                    Nhóm bạn
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, activeFilterTag === 'family' && styles.filterChipActive]}
                  onPress={() => setActiveFilterTag('family')}>
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
              <Text style={styles.loadingText}>Đang nạp kế hoạch chuyến đi...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <FontAwesome name="suitcase" size={36} color={WF_COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có lịch trình</Text>
              <Text style={styles.emptySubtitle}>
                Bấm vào nút "Lập tour AI" hoặc "Tạo thủ công" bên trên để bắt đầu chuyến đi của bạn nhé!
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setAiModalVisible(true)}>
                <Text style={styles.emptyActionBtnText}>Lập tour AI</Text>
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
                      <Text style={styles.detailAiText}>Tour AI</Text>
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
                      <View style={styles.timelineLeftCol}>
                        <Text style={styles.timelineTimeText}>{detail.startTime || '08:30'}</Text>
                        <View style={styles.timelineDot} />
                        {index < filteredDetails.length - 1 && <View style={styles.timelineLine} />}
                      </View>

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

                        {/* Hàng Địa chỉ cụ thể & Bản đồ Google Maps (Khớp 100% với Web) */}
                        <View style={styles.timelineAddressBox}>
                          <View style={styles.timelineAddressLeft}>
                            <FontAwesome name="map-marker" size={13} color="#0284C7" style={{ marginTop: 2, marginRight: 6 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.timelineAddressText} numberOfLines={2}>
                                {detail.locationAddress || (selectedItinerary?.destination ? `${selectedItinerary.destination}, Việt Nam` : 'Việt Nam')}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.timelineMapBtn}
                            onPress={() => {
                              const q = encodeURIComponent(`${detail.locationName}, ${detail.locationAddress || selectedItinerary?.destination || ''}`);
                              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {
                                Alert.alert('Thông báo', 'Không thể mở ứng dụng bản đồ');
                              });
                            }}>
                            <Text style={styles.timelineMapBtnText}>Bản đồ</Text>
                            <FontAwesome name="external-link" size={9} color="#0284C7" style={{ marginLeft: 3 }} />
                          </TouchableOpacity>
                        </View>

                        {detail.note ? (
                          <Text style={styles.timelineCardNote}>💡 {detail.note}</Text>
                        ) : null}

                        {/* Hàng Chi phí & Di chuyển (Khớp 100% với Web) */}
                        <View style={styles.timelineBottomRow}>
                          <View style={styles.timelineCostRow}>
                            <FontAwesome name="money" size={11} color={detail.estimatedCost ? "#D97706" : "#64748B"} style={{ marginRight: 4 }} />
                            <Text style={[styles.timelineCostText, !detail.estimatedCost && { color: '#64748B', fontWeight: '500' }]}>
                              {detail.estimatedCost ? `~${detail.estimatedCost.toLocaleString('vi-VN')} đ` : 'Theo thực tế'}
                            </Text>
                          </View>

                          {detail.transitInfo ? (
                            <View style={styles.timelineTransitRow}>
                              <FontAwesome name="car" size={11} color="#64748B" style={{ marginRight: 4 }} />
                              <Text style={styles.timelineTransitText}>{detail.transitInfo}</Text>
                            </View>
                          ) : null}
                        </View>
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

      {/* ─── MODAL 2: WANDERAI TRIP GENERATOR (KHỚP 100% VỚI WEB) ── */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        onRequestClose={() => !isAiGenerating && setAiModalVisible(false)}>
        <SafeAreaView style={styles.modalSafeContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Lập Tour AI</Text>
            {!isAiGenerating && (
              <TouchableOpacity onPress={() => setAiModalVisible(false)}>
                <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
              </TouchableOpacity>
            )}
          </View>

          {isAiGenerating ? (
            <View style={styles.aiLoadingContainer}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.aiLoadingProgress}>{aiProgress}%</Text>
              <Text style={styles.aiLoadingTitle}>WanderAI đang kiến tạo hành trình</Text>
              <Text style={styles.aiLoadingStep}>{aiCurrentStep}</Text>

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
                placeholder="Nhập tên điểm đến (VD: Đà Lạt, Sa Pa, Phú Quốc...)"
                placeholderTextColor={WF_COLORS.slate400}
                value={aiDest}
                onChangeText={setAiDest}
              />
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

              {/* 2. Ngày bắt đầu & Ngày kết thúc + Đếm số ngày (Khớp 100% với Web) */}
              <Text style={[styles.aiInputLabel, { marginTop: 16 }]}>2. Thời gian chuyến đi *</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: WF_COLORS.slate500, marginBottom: 4 }}>Ngày bắt đầu</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={WF_COLORS.slate400}
                    value={aiStartDate}
                    onChangeText={setAiStartDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: WF_COLORS.slate500, marginBottom: 4 }}>Ngày kết thúc</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={WF_COLORS.slate400}
                    value={aiEndDate}
                    onChangeText={setAiEndDate}
                  />
                </View>
              </View>

              {/* Ô tính ngày tự động */}
              <View style={[styles.daysCalcBox, { marginTop: 8 }]}>
                <FontAwesome name="calendar-check-o" size={14} color="#0284C7" style={{ marginRight: 6 }} />
                <Text style={styles.daysCalcText}>
                  Thời lượng chuyến đi: <Text style={{ fontWeight: 'bold', color: '#0284C7' }}>{aiDays} Ngày {aiDays > 1 ? `(${aiDays}N${aiDays - 1}Đ)` : '(Trong ngày)'}</Text>
                </Text>
              </View>

              {/* 3. Bạn Đồng Hành */}
              <Text style={[styles.aiInputLabel, { marginTop: 16 }]}>3. Bạn đi cùng ai?</Text>
              <View style={styles.grid2x2}>
                {COMPANION_OPTIONS.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.choiceCard, aiCompanion === c.id && styles.choiceCardActive]}
                    onPress={() => setAiCompanion(c.id)}>
                    <Text style={[styles.choiceCardText, aiCompanion === c.id && styles.choiceCardTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 4. Mức Ngân Sách (Khớp 4 Tiers của Web) */}
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
                      <Text style={styles.budgetRowSub}>{b.range}</Text>
                    </View>
                    <FontAwesome
                      name={aiBudgetTier === b.id ? 'dot-circle-o' : 'circle-o'}
                      size={18}
                      color={aiBudgetTier === b.id ? WF_COLORS.primary : WF_COLORS.slate400}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* 5. Sở thích & Gu du lịch (Khớp 8 options đa chọn của Web) */}
              <Text style={[styles.aiInputLabel, { marginTop: 16 }]}>5. Sở thích & Gu du lịch (chọn nhiều)</Text>
              <View style={styles.grid2x2}>
                {AI_INTEREST_OPTIONS.map(s => {
                  const isSelected = aiSelectedInterests.includes(s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.choiceCard, isSelected && styles.choiceCardActive]}
                      onPress={() => toggleAiInterest(s.id)}>
                      <Text style={[styles.choiceCardText, isSelected && styles.choiceCardTextActive]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 6. Ghi chú cá nhân hóa riêng cho AI */}
              <Text style={[styles.aiInputLabel, { marginTop: 16 }]}>6. Ghi chú riêng cho AI</Text>
              <TextInput
                style={[styles.modalInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="VD: Đi cùng người lớn tuổi ít leo trèo, thích ăn chay, muốn săn hoàng hôn..."
                placeholderTextColor={WF_COLORS.slate400}
                value={aiCustomNote}
                onChangeText={setAiCustomNote}
                multiline
              />

              {/* Submit CTA */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.submitAiBtn}
                onPress={handleStartAIGeneration}>
                <Text style={styles.submitAiBtnText}>Lập tour AI</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ─── MODAL 3: TẠO THỦ CÔNG (TINH GỌN, CHỌN ẢNH MÁY, FORMAT TIỀN) ── */}
      <Modal
        visible={manualModalVisible}
        animationType="slide"
        onRequestClose={() => setManualModalVisible(false)}>
        <SafeAreaView style={styles.modalSafeContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Tạo Lịch Trình Thủ Công</Text>
            <TouchableOpacity onPress={() => setManualModalVisible(false)}>
              <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.aiFormScroll}>
            {/* Tên chuyến đi */}
            <Text style={styles.aiInputLabel}>Tên chuyến đi *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: Nghỉ dưỡng biển Mỹ Khê 3N2Đ, Phượt săn mây Đà Lạt..."
              placeholderTextColor={WF_COLORS.slate400}
              value={manualTitle}
              onChangeText={setManualTitle}
            />

            {/* Điểm đến chính */}
            <Text style={[styles.aiInputLabel, { marginTop: 14 }]}>Điểm đến chính *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: Đà Nẵng, Hà Giang, Phú Quốc..."
              placeholderTextColor={WF_COLORS.slate400}
              value={manualDest}
              onChangeText={setManualDest}
            />

            {/* Ngày đi & ngày về kèm ô tính số ngày */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiInputLabel}>Ngày khởi hành</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={WF_COLORS.slate400}
                  value={manualStartDate}
                  onChangeText={setManualStartDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiInputLabel}>Ngày kết thúc</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={WF_COLORS.slate400}
                  value={manualEndDate}
                  onChangeText={setManualEndDate}
                />
              </View>
            </View>

            {/* Ô tính ngày tự động giống Web */}
            <View style={styles.daysCalcBox}>
              <FontAwesome name="calendar-check-o" size={14} color="#0284C7" style={{ marginRight: 6 }} />
              <Text style={styles.daysCalcText}>
                Thời lượng tính toán: <Text style={{ fontWeight: 'bold', color: '#0284C7' }}>{manualDays} Ngày ({manualDays}N{Math.max(1, manualDays - 1)}Đ)</Text>
              </Text>
            </View>

            {/* Hình thức nhóm */}
            <Text style={[styles.aiInputLabel, { marginTop: 14 }]}>Hình thức nhóm</Text>
            <View style={styles.grid2x2}>
              {COMPANION_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.choiceCard, manualGroup === c.label && styles.choiceCardActive]}
                  onPress={() => setManualGroup(c.label)}>
                  <Text style={[styles.choiceCardText, manualGroup === c.label && styles.choiceCardTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Dự toán ngân sách với dấu phẩy phân tách tiền tệ */}
            <Text style={[styles.aiInputLabel, { marginTop: 14 }]}>Dự toán ngân sách (VNĐ)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="4,500,000"
              placeholderTextColor={WF_COLORS.slate400}
              value={manualBudgetFormatted}
              onChangeText={(text) => {
                const formatted = formatCurrency(text);
                setManualBudgetFormatted(formatted);
              }}
              keyboardType="numeric"
            />

            {/* Chọn ảnh bìa đại diện (Có nút chọn từ thư viện máy) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <Text style={styles.aiInputLabel}>Ảnh bìa đại diện</Text>
              <TouchableOpacity
                onPress={handlePickCoverImage}
                style={styles.uploadPhotoBtn}>
                <FontAwesome name="camera" size={12} color="#0284C7" style={{ marginRight: 5 }} />
                <Text style={styles.uploadPhotoBtnText}>Chọn ảnh từ máy</Text>
              </TouchableOpacity>
            </View>

            {/* Preview ảnh hiện tại */}
            <View style={styles.coverPreviewBox}>
              <Image source={{ uri: manualCover }} style={styles.coverPreviewImage} resizeMode="cover" />
            </View>

            {/* Chọn nhanh ảnh preset */}
            <Text style={[styles.aiInputLabel, { fontSize: 11, color: '#64748B', marginTop: 8 }]}>Hoặc chọn nhanh mẫu cảnh đẹp:</Text>
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

            {/* Submit CTA */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.submitAiBtn, submittingManual && { opacity: 0.7 }]}
              onPress={handleCreateManualTrip}
              disabled={submittingManual}>
              {submittingManual ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitAiBtnText}>Tạo Lịch Trình</Text>
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
              <Text style={styles.modalHeaderTitle}>Thêm Điểm Dừng (Ngày {stopDayNum})</Text>
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

              <Text style={[styles.aiInputLabel, { marginTop: 12 }]}>Địa chỉ cụ thể</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="VD: Đường Kim Liên, Nam Đàn, Nghệ An..."
                placeholderTextColor={WF_COLORS.slate400}
                value={stopAddress}
                onChangeText={setStopAddress}
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
                placeholder="100,000"
                placeholderTextColor={WF_COLORS.slate400}
                value={stopCost}
                onChangeText={(text) => setStopCost(formatCurrency(text))}
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

      {/* ─── MODAL TRÒ CHUYỆN (CHAT & AI ASSISTANT) ─────────────── */}
      <ChatModal visible={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </View>
  );
}

// ─── STYLESHEET WITH TIMES NEW ROMAN / SERIF FONT ───────────
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

  // Dynamic Floating Navbar
  floatingNavbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  navLogoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  navHeaderLogo: {
    width: 125,
    height: 34,
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  navChatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  navLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginLeft: 5,
  },
  navAvatarBtn: {
    padding: 2,
  },
  navAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
  },

  // 1. Full-Bleed Transparent Hero
  heroBox: {
    position: 'relative',
    backgroundColor: '#031726',
    paddingHorizontal: 16,
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
    backgroundColor: 'rgba(3, 23, 38, 0.75)',
  },
  heroContent: {
    zIndex: 10,
  },
  heroHeadline: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: SERIF_FONT,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#E2E8F0',
    marginTop: 4,
    lineHeight: 18,
    fontFamily: SERIF_FONT,
    fontWeight: '400',
  },
  heroBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  aiCtaBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  aiCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  manualCtaBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 10,
    borderRadius: 22,
  },
  manualCtaBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
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
    width: 145,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  kpiCardWarm: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    fontFamily: SERIF_FONT,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    fontFamily: SERIF_FONT,
  },
  kpiSubText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: SERIF_FONT,
  },
  kpiDestText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    fontFamily: SERIF_FONT,
  },
  kpiDurationText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
    marginTop: 1,
    fontFamily: SERIF_FONT,
  },

  // 3. Toolbar & Tabs
  toolbarBox: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontFamily: SERIF_FONT,
  },
  tabsScroll: {
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
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
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
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
    fontFamily: SERIF_FONT,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // 4. Card List Item
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
    height: 175,
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
    top: 10,
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
    paddingVertical: 4,
    borderRadius: 12,
  },
  destinationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  aiBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    fontWeight: '700',
    fontFamily: SERIF_FONT,
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
    paddingVertical: 3,
    borderRadius: 8,
  },
  durationPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  coverDateText: {
    color: '#FEF3C7',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    fontFamily: SERIF_FONT,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
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
    fontFamily: SERIF_FONT,
  },
  metaUserText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    maxWidth: 120,
    fontFamily: SERIF_FONT,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  cardDetailBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
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

  // 5. Empty State
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
    fontFamily: SERIF_FONT,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: SERIF_FONT,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
    fontFamily: SERIF_FONT,
  },
  emptyActionBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
  },
  detailAiBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  detailAiText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
  },
  detailHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
  },
  detailStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
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
    fontWeight: '700',
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
  },
  emptyTimelineSub: {
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
  timelineLeftCol: {
    width: 60,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
  },
  timelineCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: SERIF_FONT,
  },
  timelineCardNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 16,
    fontFamily: SERIF_FONT,
  },
  timelineAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  timelineAddressLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  timelineAddressText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
    fontFamily: SERIF_FONT,
  },
  timelineMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  timelineMapBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    fontFamily: SERIF_FONT,
  },
  timelineBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timelineCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineCostText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    fontFamily: SERIF_FONT,
  },
  timelineTransitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineTransitText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
  },
  aiFormScroll: {
    padding: 18,
    paddingBottom: 40,
  },
  aiInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    fontFamily: SERIF_FONT,
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
    fontFamily: SERIF_FONT,
  },
  hotChipTextActive: {
    color: '#FFFFFF',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChoiceBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    fontWeight: '700',
    color: '#475569',
    fontFamily: SERIF_FONT,
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
    borderRadius: 12,
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
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: SERIF_FONT,
  },
  choiceCardTextActive: {
    color: '#0284C7',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
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
    fontWeight: '700',
    color: '#0F172A',
    fontFamily: SERIF_FONT,
  },
  budgetRowTitleActive: {
    color: '#0284C7',
  },
  budgetRowSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontFamily: SERIF_FONT,
  },
  submitAiBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 22,
    marginTop: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  submitAiBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },

  // Days Calculation Box in Manual modal
  daysCalcBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  daysCalcText: {
    fontSize: 12,
    color: '#0369A1',
    fontFamily: SERIF_FONT,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  uploadPhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    fontFamily: SERIF_FONT,
  },
  coverPreviewBox: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F1F5F9',
  },
  coverPreviewImage: {
    width: '100%',
    height: '100%',
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
    fontFamily: SERIF_FONT,
  },
  aiLoadingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    fontFamily: SERIF_FONT,
  },
  aiLoadingStep: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: SERIF_FONT,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 18,
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 3,
  },
  aiLoadingNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
    fontFamily: SERIF_FONT,
  },

  // Preset covers
  presetScroll: {
    gap: 8,
    marginVertical: 4,
  },
  presetCard: {
    width: 90,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardActive: {
    borderColor: '#0284C7',
  },
  presetImage: {
    width: '100%',
    height: 52,
  },
  presetLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginTop: 2,
    fontFamily: SERIF_FONT,
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
    borderRadius: 18,
    padding: 16,
    maxHeight: '85%',
  },
});
