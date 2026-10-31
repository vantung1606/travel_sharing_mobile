import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Share,
  Dimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput } from '@/components/Themed';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { WF_COLORS } from '@/constants/Colors';
import { ChatModal } from '@/components/ChatModal';
import { ItineraryDetailModal } from '@/components/ItineraryDetailModal';
import { BrandedLoading } from '@/components/BrandedLoading';
import { showToast } from '@/components/Toast';
import { confirmDialog } from '@/components/ConfirmDialog';
import {
  itineraryApi,
  ItineraryItem,
  ItineraryDetailItem,
  webItineraryUrl,
} from '@/src/services/api';
import { authStorage, UserSession } from '@/src/services/authStorage';
import { aiService } from '@/src/services/aiService';
import { formatItineraryDuration, getItineraryDayCount } from '@/src/utils/itinerary';

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
  const [activeFilterTag, setActiveFilterTag] = useState<string>('all');

  // ─── MODAL DETAIL STATE ──────────────────────────────────
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedItinerary, setSelectedItinerary] = useState<ItineraryItem | null>(null);

  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

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
    const nextDuration = list[0] ? formatItineraryDuration(getItineraryDayCount(list[0])) : 'Sẵn sàng';

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
      const link = webItineraryUrl(itin.id);
      await Share.share({
        message: `Khám phá kế hoạch chuyến đi "${itin.title}" tại ${itin.destination} trên Wayfare Travel! 🌟${link ? `\n${link}` : ''}`,
        title: itin.title,
      });
    } catch {
      // Ignore
    }
  };

  const handleCloneTrip = async (itin: ItineraryItem) => {
    const session = await authStorage.getSession();
    if (!session) {
      showToast({
        kind: 'info',
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập ở tab "Tài khoản" để sao chép lịch trình này.',
        icon: 'lock',
      });
      return;
    }

    const isOwner =
      (itin.creatorId && session.id && itin.creatorId === session.id) ||
      (itin.creatorEmail && session.email && itin.creatorEmail === session.email);

    if (isOwner) {
      showToast({
        kind: 'info',
        title: 'Không thể sao chép',
        message: 'Bạn là tác giả của lịch trình này nên không thể tự sao chép.',
      });
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Sao chép lịch trình?',
      message: `Chuyến đi "${itin.title}" sẽ được sao chép vào kho cá nhân của bạn.`,
      confirmText: 'Sao chép',
      icon: 'copy',
      accent: 'primary',
    });
    if (!confirmed) return;

    try {
      await itineraryApi.cloneItinerary(itin.id);
      showToast({
        kind: 'success',
        title: 'Đã sao chép lịch trình',
        message: `Chuyến đi "${itin.title}" đã nằm trong kho của bạn.`,
      });
      fetchItineraries();
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Sao chép thất bại',
        message: err.response?.data?.message || err.message || 'Không thể sao chép lịch trình.',
      });
    }
  };

  const handleDeleteTrip = async (itin: ItineraryItem) => {
    const confirmed = await confirmDialog({
      title: 'Xóa lịch trình?',
      message: `Chuyến đi "${itin.title}" sẽ bị xóa vĩnh viễn. Hành động không thể hoàn tác.`,
      confirmText: 'Xóa',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await itineraryApi.deleteItinerary(itin.id);
      showToast({
        kind: 'success',
        title: 'Đã xóa lịch trình',
        message: `Chuyến đi "${itin.title}" đã được xóa.`,
      });
      if (selectedItinerary?.id === itin.id) {
        setDetailModalVisible(false);
      }
      fetchItineraries();
    } catch {
      showToast({
        kind: 'error',
        title: 'Xóa thất bại',
        message: 'Không thể xóa lịch trình này.',
      });
    }
  };

  const handleToggleVisibility = async (itin: ItineraryItem) => {
    try {
      const nextPublic = !(itin.isPublic !== false);
      const updated = await itineraryApi.toggleVisibility(itin.id, nextPublic);
      setItineraries(prev =>
        prev.map(it => (it.id === itin.id ? { ...it, isPublic: updated.isPublic } : it))
      );
      showToast({
        kind: 'success',
        title: nextPublic ? 'Đã công khai lịch trình!' : 'Đã chuyển sang riêng tư!',
        message: nextPublic
          ? 'Mọi người có thể khám phá chuyến đi của bạn.'
          : 'Lịch trình chỉ hiển thị với bạn.',
      });
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Lỗi cập nhật hiển thị',
        message: e?.message || 'Không thể đổi chế độ hiển thị.',
      });
    }
  };

  // ─── CHỌN ẢNH TỪ MÁY DÙNG EXPO-IMAGE-PICKER ────────────────
  const handlePickCoverImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showToast({
          kind: 'info',
          title: 'Cần quyền truy cập ảnh',
          message: 'Vui lòng cấp quyền thư viện ảnh để chọn ảnh bìa chuyến đi.',
        });
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
      showToast({
        kind: 'error',
        title: 'Không mở được thư viện ảnh',
        message: 'Vui lòng thử lại sau ít phút.',
      });
    }
  };

  const handleDeleteStop = async (detailId?: number) => {
    if (!detailId) return;

    const confirmed = await confirmDialog({
      title: 'Xóa trạm dừng?',
      message: 'Trạm dừng này sẽ được xóa khỏi lịch trình của bạn.',
      confirmText: 'Xóa',
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await itineraryApi.deleteDetail(detailId);
      if (selectedItinerary) {
        const full = await itineraryApi.getItineraryById(selectedItinerary.id);
        setSelectedItinerary(full);
      }
    } catch {
      showToast({
        kind: 'error',
        title: 'Xóa thất bại',
        message: 'Không thể xóa trạm dừng này.',
      });
    }
  };

  // ─── MANUAL TRIP CREATION ────────────────────────────────
  const handleCreateManualTrip = async () => {
    if (!manualTitle.trim() || !manualDest.trim()) {
      showToast({
        kind: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập tên chuyến đi và điểm đến chính.',
      });
      return;
    }

    const session = await authStorage.getSession();
    if (!session) {
      showToast({
        kind: 'info',
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập ở tab "Tài khoản" để lưu chuyến đi vào CSDL.',
        icon: 'lock',
      });
      return;
    }

    try {
      setSubmittingManual(true);
      const days = Number(manualDays) || 3;
      const rawBudget = parseFloat(manualBudgetFormatted.replace(/,/g, '')) || 4000000;

      // Tạo chuyến đi thủ công: hoàn toàn để trống để người dùng tự điền mốc giờ và hoạt động
      const manualActivities: ItineraryDetailItem[] = [];

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
        details: manualActivities,
      });

      showToast({
        kind: 'success',
        title: 'Đã tạo chuyến đi',
        message: `"${created.title}" đã được lưu vào kho lịch trình của bạn.`,
      });
      setManualModalVisible(false);
      setManualTitle('');
      setManualDest('');

      fetchItineraries();
      handleOpenDetail(created);
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Tạo chuyến đi thất bại',
        message: err.response?.data?.message || err.message || 'Không thể tạo chuyến đi.',
      });
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
      showToast({
        kind: 'error',
        title: 'Thiếu điểm đến',
        message: 'Vui lòng chọn hoặc nhập điểm đến cho chuyến đi.',
      });
      return;
    }

    // Kiểm tra tính hợp lệ của ngày đi và ngày về
    if (aiStartDate && aiEndDate) {
      const d1 = new Date(aiStartDate);
      const d2 = new Date(aiEndDate);
      if (d2.getTime() < d1.getTime()) {
        showToast({
          kind: 'error',
          title: 'Ngày không hợp lệ',
          message: 'Ngày kết thúc phải diễn ra sau hoặc trùng với ngày bắt đầu chuyến đi.',
        });
        return;
      }
    }

    // Kiểm tra người dùng đã đăng nhập chưa để lưu vào CSDL
    const session = await authStorage.getSession();
    if (!session) {
      showToast({
        kind: 'info',
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập ở tab "Tài khoản" để WanderAI lưu lịch trình vào CSDL.',
        icon: 'lock',
      });
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
3. BẮT BUỘC VỀ ĐỊA CHỈ ("address"): Tra cứu và ghi ĐỊA CHỈ CỤ THỂ CHI TIẾT CÓ THẬT của từng quán ăn, địa danh (gồm Số nhà/Tên đường - Phường/Xã/Quận/Huyện - Tỉnh/Thành phố tại "${aiDest}"). TUYỆT ĐỐI KHÔNG ĐƯỢC chỉ ghi tên đường cộc lốc (như "202 Chương Dương") hay chỉ ghi tên tỉnh thành chung chung như "${aiDest}" hay "Việt Nam".
Ví dụ chuẩn:
- Quán ăn: "202 Chương Dương - Sơn Trà - Đà Nẵng" hoặc "Số 48 Ngô Đức Kế, P. Hồng Sơn, TP. Vinh, Nghệ An"
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

      // GỌI GOOGLE GEMINI 2.5 FLASH THỰC TẾ
      const rawAiResponse = await aiService.generateText({
        prompt,
        model: 'gemini-2.5-flash',
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
        showToast({
          kind: 'success',
          title: 'WanderAI đã thiết kế xong',
          message: `Lịch trình ${aiDest} đã sẵn sàng trong kho của bạn.`,
          duration: 4200,
        });
        handleOpenDetail(created);
      }, 500);

    } catch (err: any) {
      if (progressTimer) clearInterval(progressTimer);
      setIsAiGenerating(false);
      showToast({
        kind: 'error',
        title: 'Tạo tour AI thất bại',
        message: err.response?.data?.message || err.message || 'Không thể tạo tour bằng AI lúc này.',
        duration: 4200,
      });
    }
  };

  const toggleChecklist = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ─── RENDER CARD ITEM ────────────────────────────────────
  const renderItineraryCard = ({ item }: { item: ItineraryItem }) => {
    const imageUrl = item.coverImageUrl || item.coverImage || COVER_PRESETS[0].url;
    const durationText = formatItineraryDuration(getItineraryDayCount(item));
    const budgetDisplay = item.budgetTotal
      ? `${item.budgetTotal.toLocaleString('vi-VN')} đ`
      : item.budgetPerPerson
      ? `~${item.budgetPerPerson.toLocaleString('vi-VN')} đ/người`
      : 'Tùy chi tiêu';

    const isUpcoming = (item.status || '').toLowerCase() === 'upcoming' || (item.status || '').toLowerCase() === 'active';
    const isCompleted = (item.status || '').toLowerCase() === 'completed';

    // Trong tab Lịch trình cá nhân (quản lý chuyến đi của tôi), tất cả lịch trình là của chính chủ nên ẩn nút sao chép
    const isOwner = true;

    return (
      <View style={styles.cardContainer}>
        {/* Cover Image & Overlays */}
        <TouchableOpacity activeOpacity={0.92} onPress={() => handleOpenDetail(item)} style={styles.cardCoverBox}>
          <Image source={{ uri: imageUrl }} style={styles.cardCoverImage} resizeMode="cover" />
          <View style={styles.cardGradientOverlay} />

          {/* Top Badges */}
          <View style={styles.cardTopBadgeRow}>
            <View style={styles.destinationBadge}>
              <FontAwesome name="map-marker" size={12} color={WF_COLORS.primary} style={{ marginRight: 4 }} />
              <Text style={styles.destinationBadgeText}>{item.destination}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              {item.isAiGenerated && (
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>Tour AI</Text>
                </View>
              )}
              <View style={[
                styles.statusBadge,
                { backgroundColor: item.isPublic !== false ? 'rgba(21, 128, 61, 0.9)' : 'rgba(30, 26, 21, 0.85)' }
              ]}>
                <FontAwesome
                  name={item.isPublic !== false ? 'globe' : 'lock'}
                  size={10}
                  color={item.isPublic !== false ? '#FFFFFF' : '#FCD34D'}
                  style={{ marginRight: 3 }}
                />
                <Text style={[styles.statusBadgeText, { color: item.isPublic !== false ? '#FFFFFF' : '#FCD34D' }]}>
                  {item.isPublic !== false ? 'Công khai' : 'Riêng tư'}
                </Text>
              </View>
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
              <FontAwesome name="clock-o" size={11} color={WF_COLORS.slate700} style={{ marginRight: 4 }} />
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
              <FontAwesome name="money" size={12} color={WF_COLORS.amber} style={{ marginRight: 5 }} />
              <Text style={styles.metaBudgetText}>{budgetDisplay}</Text>
            </View>

            {item.travelStyle && (
              <View style={styles.metaBadge}>
                <FontAwesome name="compass" size={11} color="#B0522F" style={{ marginRight: 4 }} />
                <Text style={[styles.metaUserText, { color: '#B0522F', fontWeight: '600' }]} numberOfLines={1}>
                  {item.travelStyle}
                </Text>
              </View>
            )}

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
              <FontAwesome name="arrow-right" size={11} color="#FFFDF8" style={{ marginLeft: 5 }} />
            </TouchableOpacity>

            <View style={styles.cardIconActions}>
              {isOwner && (
                <>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.actionIconBtn,
                      { backgroundColor: item.isPublic !== false ? '#DCFCE7' : '#FEF3C7' },
                    ]}
                    onPress={() => handleToggleVisibility(item)}>
                    <FontAwesome
                      name={item.isPublic !== false ? 'globe' : 'lock'}
                      size={13}
                      color={item.isPublic !== false ? '#15803D' : '#B45309'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.actionIconBtn, { backgroundColor: '#E0F2FE' }]}
                    onPress={() => handleOpenDetail(item)}>
                    <FontAwesome name="pencil" size={12} color="#0369A1" />
                  </TouchableOpacity>
                </>
              )}

              {!isOwner && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.actionIconBtn}
                  onPress={() => handleCloneTrip(item)}>
                  <FontAwesome name="clone" size={14} color={WF_COLORS.slate600} />
                </TouchableOpacity>
              )}

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

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ─── DYNAMIC FLOATING NAVBAR (TRONG SUỐT Ở TRÊN CÙNG, TRƯỢT XUỐNG ĐỔI THÀNH NỀN TRẮNG) ─── */}
      <View
        style={[
          styles.floatingNavbar,
          {
            paddingTop: Math.max(insets.top, 6),
            height: 44 + Math.max(insets.top, 6),
            backgroundColor: isScrolled ? '#FFFDF8' : 'rgba(248, 244, 236, 0.96)',
            borderBottomWidth: isScrolled ? 1 : 0,
            borderBottomColor: '#E4DACB',
            shadowOpacity: 0.02,
            elevation: 0,
          },
        ]}>
        {/* Brand Logo - Điều hướng về Bảng tin Cộng đồng giống Facebook */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/community')}
          style={styles.navLogoWrapper}>
          <Image
            source={require('@/assets/images/wayfare-logo.png')}
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
            style={styles.navChatBtn}>
            <FontAwesome
              name="comments"
              size={14}
              color={WF_COLORS.primary}
              style={{ marginRight: 5 }}
            />
            <Text style={styles.navChatBtnText}>Chat</Text>
          </TouchableOpacity>

          {/* Avatar Người Dùng */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/profile')}
            style={styles.navAvatarBtn}>
            {currentUser?.avatar ? (
              <Image
                source={{ uri: currentUser.avatar }}
                style={styles.navAvatarImg}
              />
            ) : (
              <FontAwesome name="user-circle" size={28} color={WF_COLORS.slate700} />
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
                  paddingTop: Math.max(insets.top, 6) + 50,
                  paddingBottom: 20,
                },
              ]}>
              <View style={styles.heroContent}>
                {/* Hero Title & Count Pill */}
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroHeadline}>Lịch Trình Du Lịch</Text>
                  <View style={styles.heroCountBadge}>
                    <Text style={styles.heroCountBadgeText}>{itineraries?.length || 0} chuyến</Text>
                  </View>
                </View>

                {/* Subtitle ngắn gọn */}
                <Text style={styles.heroSubtitle}>
                  Tổ chức chuyến đi và kiến tạo lịch trình cùng AI
                </Text>

                {/* Hero Action CTA Buttons (Thiết kế thanh lịch) */}
                <View style={styles.heroBtnRow}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.aiCtaBtn}
                    onPress={() => setAiModalVisible(true)}>
                    <FontAwesome name="magic" size={13} color="#FFFDF8" style={{ marginRight: 6 }} />
                    <Text style={styles.aiCtaBtnText}>Lập tour AI</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.88}
                    style={styles.manualCtaBtn}
                    onPress={() => setManualModalVisible(true)}>
                    <FontAwesome name="plus" size={12} color="#1E1A15" style={{ marginRight: 6 }} />
                    <Text style={styles.manualCtaBtnText}>Tạo thủ công</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ─── 2. THANH TÌM KIẾM & BỘ LỌC TỐI GIẢN 1 DÒNG (AIRBNB STYLE - THOÁNG ĐÃNG) ─── */}
            <View style={styles.cleanFilterSection}>
              {/* Search Bar Phẳng, Hiện Đại */}
              <View style={styles.cleanSearchBar}>
                <FontAwesome name="search" size={13} color="#5A5146" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.cleanSearchInput}
                  placeholder="Tìm chuyến đi, điểm đến, địa danh..."
                  placeholderTextColor="#8A7F70"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.trim().length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <FontAwesome name="times-circle" size={14} color="#8A7F70" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 1 Hàng Bộ Lọc Duy Nhất (Cuộn ngang êm ái) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cleanFilterScroll}>
                {[
                  { id: 'all', label: 'Tất cả', count: tabCounts.all },
                  { id: 'upcoming', label: 'Sắp tới', count: tabCounts.upcoming },
                  { id: 'ai', label: 'Tour AI', count: (itineraries || []).filter(i => i.isAiGenerated).length },
                  { id: 'completed', label: 'Đã hoàn thành', count: tabCounts.completed },
                  { id: 'group', label: 'Nhóm bạn' },
                  { id: 'family', label: 'Gia đình' },
                  { id: 'drafts', label: 'Bản nháp', count: tabCounts.drafts },
                ].map(item => {
                  const isActive =
                    (item.id === 'all' && activeTab === 'all' && activeFilterTag === 'all') ||
                    (item.id === 'upcoming' && activeTab === 'upcoming' && activeFilterTag === 'all') ||
                    (item.id === 'completed' && activeTab === 'completed' && activeFilterTag === 'all') ||
                    (item.id === 'drafts' && activeTab === 'drafts' && activeFilterTag === 'all') ||
                    (item.id === 'ai' && activeFilterTag === 'ai') ||
                    (item.id === 'group' && activeFilterTag === 'group') ||
                    (item.id === 'family' && activeFilterTag === 'family');

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      style={[styles.cleanFilterChip, isActive && styles.cleanFilterChipActive]}
                      onPress={() => {
                        if (item.id === 'all') {
                          setActiveTab('all');
                          setActiveFilterTag('all');
                        } else if (item.id === 'upcoming') {
                          setActiveTab('upcoming');
                          setActiveFilterTag('all');
                        } else if (item.id === 'completed') {
                          setActiveTab('completed');
                          setActiveFilterTag('all');
                        } else if (item.id === 'drafts') {
                          setActiveTab('drafts');
                          setActiveFilterTag('all');
                        } else {
                          setActiveTab('all');
                          setActiveFilterTag(item.id);
                        }
                      }}>
                      <Text style={[styles.cleanFilterChipText, isActive && styles.cleanFilterChipTextActive]}>
                        {item.label}
                      </Text>
                      {typeof item.count === 'number' && item.count > 0 ? (
                        <View style={[styles.cleanFilterBadge, isActive && styles.cleanFilterBadgeActive]}>
                          <Text style={[styles.cleanFilterBadgeText, isActive && styles.cleanFilterBadgeTextActive]}>
                            {item.count}
                          </Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <BrandedLoading
              title="Đang tải lịch trình"
              subtitle="Wayfare đang sắp xếp lại các chuyến đi của bạn."
            />
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
      <ItineraryDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        itinerary={selectedItinerary}
        onItineraryUpdated={fetchItineraries}
        canEdit={true}
      />

      {/* ─── MODAL 2: WANDERAI TRIP GENERATOR (KHỚP 100% VỚI WEB) ── */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        onRequestClose={() => {
          if (!isAiGenerating) setAiModalVisible(false);
        }}>
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
              <ActivityIndicator size="large" color="#B0522F" />
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
                <FontAwesome name="calendar-check-o" size={14} color="#B0522F" style={{ marginRight: 6 }} />
                <Text style={styles.daysCalcText}>
                  Thời lượng chuyến đi: <Text style={{ fontWeight: 'bold', color: '#B0522F' }}>{aiDays} Ngày {aiDays > 1 ? `(${aiDays}N${aiDays - 1}Đ)` : '(Trong ngày)'}</Text>
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
              <FontAwesome name="calendar-check-o" size={14} color="#B0522F" style={{ marginRight: 6 }} />
              <Text style={styles.daysCalcText}>
                Thời lượng tính toán: <Text style={{ fontWeight: 'bold', color: '#B0522F' }}>{manualDays} Ngày ({manualDays}N{Math.max(1, manualDays - 1)}Đ)</Text>
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
                <FontAwesome name="camera" size={12} color="#B0522F" style={{ marginRight: 5 }} />
                <Text style={styles.uploadPhotoBtnText}>Chọn ảnh từ máy</Text>
              </TouchableOpacity>
            </View>

            {/* Preview ảnh hiện tại */}
            <View style={styles.coverPreviewBox}>
              <Image source={{ uri: manualCover }} style={styles.coverPreviewImage} resizeMode="cover" />
            </View>

            {/* Chọn nhanh ảnh preset */}
            <Text style={[styles.aiInputLabel, { fontSize: 11, color: '#5A5146', marginTop: 8 }]}>Hoặc chọn nhanh mẫu cảnh đẹp:</Text>
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
                <ActivityIndicator color="#FFFDF8" />
              ) : (
                <Text style={styles.submitAiBtnText}>Tạo Lịch Trình</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
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
    backgroundColor: '#F8F4EC',
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
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
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
    borderRadius: 5,
    borderWidth: 1,
    backgroundColor: '#F6E6DD',
    borderColor: '#E8D5C9',
  },
  navChatBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.primary,
    fontFamily: SERIF_FONT,
  },
  navAvatarBtn: {
    padding: 2,
  },
  navAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: WF_COLORS.primary,
  },

  // 1. Paper Hero
  heroBox: {
    position: 'relative',
    backgroundColor: '#F8F4EC',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E4DACB',
  },
  heroContent: {
    zIndex: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroHeadline: {
    fontSize: 27,
    fontWeight: '900',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
    letterSpacing: -0.5,
  },
  heroCountBadge: {
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  heroCountBadgeText: {
    color: '#5A5146',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#6B6154',
    marginTop: 6,
    lineHeight: 18,
    fontFamily: SERIF_FONT,
    fontWeight: '400',
  },
  heroBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  aiCtaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B0522F',
    paddingVertical: 10,
    borderRadius: 5,
  },
  aiCtaBtnText: {
    color: '#FFFDF8',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  manualCtaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
    paddingVertical: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#1E1A15',
  },
  manualCtaBtnText: {
    color: '#1E1A15',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },

  // 2. Airbnb Style Flat Search & Unified Filter (Thoáng đãng & Tối giản)
  cleanFilterSection: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  cleanSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  cleanSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
    paddingVertical: 0,
  },
  cleanFilterScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 8,
  },
  cleanFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  cleanFilterChipActive: {
    backgroundColor: '#B0522F',
    borderColor: '#B0522F',
  },
  cleanFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5A5146',
    fontFamily: SERIF_FONT,
  },
  cleanFilterChipTextActive: {
    color: '#FFFDF8',
  },
  cleanFilterBadge: {
    marginLeft: 5,
    backgroundColor: '#F3EDE2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  cleanFilterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  cleanFilterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5A5146',
  },
  cleanFilterBadgeTextActive: {
    color: '#FFFDF8',
  },

  // 4. Card List Item
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFDF8',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  cardCoverBox: {
    height: 175,
    position: 'relative',
    backgroundColor: '#1E1A15',
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
    backgroundColor: 'rgba(30, 26, 21, 0.30)',
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
    backgroundColor: 'rgba(248, 244, 236, 0.94)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(30, 26, 21, 0.10)',
  },
  destinationBadgeText: {
    color: '#3B332A',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  aiBadge: {
    backgroundColor: '#B0522F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  aiBadgeText: {
    color: '#FFFDF8',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
  },
  statusBadgeUpcoming: {
    backgroundColor: '#B0522F',
  },
  statusBadgeCompleted: {
    backgroundColor: '#4F6B52',
  },
  statusBadgeText: {
    color: '#FFFDF8',
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
    backgroundColor: 'rgba(248, 244, 236, 0.94)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(30, 26, 21, 0.10)',
  },
  durationPillText: {
    color: '#3B332A',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  coverDateText: {
    color: '#FFFDF8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1A15',
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
    backgroundColor: '#F8F4EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E4DACB',
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
    color: '#5A5146',
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
    borderTopColor: '#F3EDE2',
  },
  cardDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B0522F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 5,
  },
  cardDetailBtnText: {
    color: '#FFFDF8',
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
    borderRadius: 5,
    backgroundColor: '#F3EDE2',
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
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F6E6DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#5A5146',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
    fontFamily: SERIF_FONT,
  },
  emptyActionBtn: {
    backgroundColor: '#B0522F',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 16,
  },
  emptyActionBtnText: {
    color: '#FFFDF8',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },

  // 6. Detail Modal
  detailContainer: {
    flex: 1,
    backgroundColor: '#F8F4EC',
  },
  detailNavbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E4DACB',
    backgroundColor: '#FFFDF8',
  },
  navBackBtn: {
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
    backgroundColor: '#1E1A15',
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
    backgroundColor: 'rgba(30, 26, 21, 0.55)',
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
    borderRadius: 5,
  },
  detailDestText: {
    color: '#FFFDF8',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  detailAiBadge: {
    backgroundColor: '#B0522F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  detailAiText: {
    color: '#FFFDF8',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: SERIF_FONT,
  },
  detailHeroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFDF8',
    lineHeight: 26,
    fontFamily: SERIF_FONT,
  },
  detailStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFDF8',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 5,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4DACB',
    shadowColor: '#5A5146',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 0,
    justifyContent: 'space-around',
  },
  detailStatBox: {
    alignItems: 'center',
  },
  detailStatLabel: {
    fontSize: 11,
    color: '#5A5146',
    fontWeight: '600',
    marginTop: 4,
    fontFamily: SERIF_FONT,
  },
  detailStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1A15',
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
    color: '#1E1A15',
    marginBottom: 10,
    fontFamily: SERIF_FONT,
  },
  dayPillsScroll: {
    gap: 8,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  addStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 5,
    backgroundColor: '#F6E6DD',
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  addStopBtnText: {
    color: '#B0522F',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  timelineSection: {
    marginTop: 14,
    paddingHorizontal: 16,
  },
  emptyTimelineBox: {
    backgroundColor: '#FFFDF8',
    borderRadius: 5,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  emptyTimelineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E1A15',
    marginTop: 8,
    fontFamily: SERIF_FONT,
  },
  emptyTimelineSub: {
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
  timelineLeftCol: {
    width: 60,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineTimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B0522F',
    fontFamily: SERIF_FONT,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#B0522F',
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E8D5C9',
    marginTop: 4,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: '#FFFDF8',
    borderRadius: 5,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E4DACB',
    shadowColor: '#5A5146',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 0,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#F6E6DD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
  },
  categoryBadgeText: {
    color: '#B0522F',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },
  timelineCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
  },
  timelineCardNote: {
    fontSize: 12,
    color: '#5A5146',
    marginTop: 6,
    lineHeight: 16,
    fontFamily: SERIF_FONT,
  },
  timelineAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F4EC',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E4DACB',
    gap: 8,
  },
  timelineAddressLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  timelineAddressText: {
    fontSize: 11,
    color: '#5A5146',
    lineHeight: 15,
    fontFamily: SERIF_FONT,
  },
  timelineMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  timelineMapBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B0522F',
    fontFamily: SERIF_FONT,
  },
  timelineBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3EDE2',
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
    gap: 12,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkItemText: {
    fontSize: 13,
    color: '#3B332A',
    fontWeight: '600',
    fontFamily: SERIF_FONT,
  },
  checkItemTextDone: {
    textDecorationLine: 'line-through',
    color: '#8A7F70',
  },

  // 7. Modals Common
  modalSafeContainer: {
    flex: 1,
    backgroundColor: '#FFFDF8',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E4DACB',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
  },
  modalInput: {
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E4DACB',
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
  },
  aiFormScroll: {
    padding: 18,
    paddingBottom: 40,
  },
  aiInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B332A',
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
    borderRadius: 5,
    backgroundColor: '#F3EDE2',
  },
  hotChipActive: {
    backgroundColor: '#B0522F',
  },
  hotChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A5146',
    fontFamily: SERIF_FONT,
  },
  hotChipTextActive: {
    color: '#FFFDF8',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChoiceBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: '#F3EDE2',
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  dayChoiceBtnActive: {
    backgroundColor: '#B0522F',
    borderColor: '#B0522F',
  },
  dayChoiceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5A5146',
    fontFamily: SERIF_FONT,
  },
  dayChoiceTextActive: {
    color: '#FFFDF8',
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceCard: {
    width: (SCREEN_WIDTH - 36 - 8) / 2,
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E4DACB',
    alignItems: 'flex-start',
  },
  choiceCardActive: {
    backgroundColor: '#F6E6DD',
    borderColor: '#B0522F',
  },
  choiceCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
  },
  choiceCardTextActive: {
    color: '#B0522F',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 5,
    backgroundColor: '#F8F4EC',
    borderWidth: 1,
    borderColor: '#E4DACB',
  },
  budgetRowActive: {
    backgroundColor: '#F6E6DD',
    borderColor: '#B0522F',
  },
  budgetRowTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E1A15',
    fontFamily: SERIF_FONT,
  },
  budgetRowTitleActive: {
    color: '#B0522F',
  },
  budgetRowSub: {
    fontSize: 11,
    color: '#5A5146',
    marginTop: 1,
    fontFamily: SERIF_FONT,
  },
  submitAiBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B0522F',
    paddingVertical: 13,
    borderRadius: 5,
    marginTop: 20,
    shadowColor: '#B0522F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 0,
  },
  submitAiBtnText: {
    color: '#FFFDF8',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: SERIF_FONT,
  },

  // Days Calculation Box in Manual modal
  daysCalcBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6E6DD',
    padding: 10,
    borderRadius: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  daysCalcText: {
    fontSize: 12,
    color: '#8F3F24',
    fontFamily: SERIF_FONT,
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: '#F6E6DD',
    borderWidth: 1,
    borderColor: '#E8D5C9',
  },
  uploadPhotoBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B0522F',
    fontFamily: SERIF_FONT,
  },
  coverPreviewBox: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#D9CDBE',
    backgroundColor: '#F3EDE2',
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
    color: '#B0522F',
    marginTop: 16,
    fontFamily: SERIF_FONT,
  },
  aiLoadingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E1A15',
    marginTop: 8,
    fontFamily: SERIF_FONT,
  },
  aiLoadingStep: {
    fontSize: 13,
    color: '#B0522F',
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: SERIF_FONT,
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E4DACB',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 18,
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#B0522F',
    borderRadius: 3,
  },
  aiLoadingNote: {
    fontSize: 11,
    color: '#8A7F70',
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
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetCardActive: {
    borderColor: '#B0522F',
  },
  presetImage: {
    width: '100%',
    height: 52,
  },
  presetLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5A5146',
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
    backgroundColor: '#FFFDF8',
    borderRadius: 6,
    padding: 16,
    maxHeight: '85%',
  },
});
