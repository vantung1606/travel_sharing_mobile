import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandedLoading } from '@/components/BrandedLoading';
import { confirmDialog } from '@/components/ConfirmDialog';
import { CreateTripActionSheet } from '@/components/itinerary/CreateTripActionSheet';
import { TripActionSheet } from '@/components/itinerary/TripActionSheet';
import { TripCard } from '@/components/itinerary/TripCard';
import { ItineraryDetailModal } from '@/components/ItineraryDetailModal';
import { Text, TextInput } from '@/components/Themed';
import { showToast } from '@/components/Toast';
import { Chip } from '@/components/ui/Chip';
import { FAB } from '@/components/ui/FAB';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import {
  itineraryApi,
  ItineraryDetailItem,
  ItineraryItem,
  webItineraryUrl,
} from '@/src/services/api';
import { aiService } from '@/src/services/aiService';
import { authStorage, UserSession } from '@/src/services/authStorage';
import { formatItineraryDuration, getItineraryDayCount } from '@/src/utils/itinerary';

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

// Format số tiền có dấu phẩy hàng nghìn
function formatCurrency(num: number | string): string {
  if (!num) return '0';
  const clean = String(num).replace(/\D/g, '');
  if (!clean) return '0';
  return Number(clean).toLocaleString('en-US');
}

export default function ItineraryScreen() {
  // ─── MAIN DATA STATE ─────────────────────────────────────
  const [itineraries, setItineraries] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilterTag, setActiveFilterTag] = useState<string>('all');

  // ─── ACTION SHEETS STATE ─────────────────────────────────
  const [actionSheetVisible, setActionSheetVisible] = useState<boolean>(false);
  const [actionSheetItem, setActionSheetItem] = useState<ItineraryItem | null>(null);
  const [createSheetVisible, setCreateSheetVisible] = useState<boolean>(false);

  // ─── MODAL DETAIL STATE ──────────────────────────────────
  const [detailModalVisible, setDetailModalVisible] = useState<boolean>(false);
  const [selectedItinerary, setSelectedItinerary] = useState<ItineraryItem | null>(null);

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

  // ─── DATA FETCHING (LẤY TỪ CSDL MYSQL QUA API) ─────────────
  const fetchItineraries = useCallback(async () => {
    try {
      const session = await authStorage.getSession();
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
    fetchItineraries();
  }, [fetchItineraries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItineraries();
  };

  // ─── TAB COUNTS ──────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const list = itineraries || [];
    const upcomingCount = list.filter(i => {
      const s = (i.status || '').toLowerCase();
      return s === 'upcoming' || s === 'active' || s === 'planning' || !s;
    }).length;
    const completedCount = list.filter(i => (i.status || '').toLowerCase() === 'completed').length;
    return {
      upcoming: upcomingCount,
      completed: completedCount,
      all: list.length,
    };
  }, [itineraries]);

  // ─── FILTERED ITINERARIES ────────────────────────────────
  const filteredItineraries = useMemo(() => {
    return (itineraries || []).filter(itin => {
      const statusLower = (itin.status || '').toLowerCase();
      const isCompleted = statusLower === 'completed';

      // Tab match
      if (activeTab === 'upcoming' && isCompleted) return false;
      if (activeTab === 'completed' && !isCompleted) return false;

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
    try {
      const full = await itineraryApi.getItineraryById(itin.id);
      if (full) {
        setSelectedItinerary(full);
      }
    } catch (e) {
      console.warn('Fetch detail error:', e);
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
        message: `Chuyến đi "${itin.title}" đã được xóa khỏi tài khoản.`,
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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setManualCover(result.assets[0].uri);
      }
    } catch {
      showToast({
        kind: 'error',
        title: 'Lỗi chọn ảnh',
        message: 'Không thể mở thư viện ảnh trên thiết bị.',
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
      const rawBudget = parseFloat(manualBudgetFormatted.replace(/,/g, '')) || 4000000;

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
        details: [],
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

    const session = await authStorage.getSession();
    if (!session) {
      showToast({
        kind: 'info',
        title: 'Yêu cầu đăng nhập',
        message: 'Vui lòng đăng nhập ở tab "Tài khoản" để AI có thể lưu tour vào tài khoản.',
        icon: 'lock',
      });
      return;
    }

    setIsAiGenerating(true);
    setAiProgress(10);
    setAiCurrentStep('Khởi động động cơ Gemini AI...');

    const companionObj = COMPANION_OPTIONS.find(c => c.id === aiCompanion) || COMPANION_OPTIONS[1];
    const budgetOption = BUDGET_TIERS.find(b => b.id === aiBudgetTier) || BUDGET_TIERS[1];
    const interestLabels = aiSelectedInterests
      .map(id => AI_INTEREST_OPTIONS.find(o => o.id === id)?.label)
      .filter(Boolean)
      .join(', ');

    const promptText = `
Bạn là Trợ lý Lập trình Du lịch Tinh nhuệ "WanderAI" của Wayfare Travel.
Hãy kiến tạo một lịch trình du lịch chuyên sâu, đầy cảm xúc và tối ưu tuyệt đối cho chuyến đi sau:
- Điểm đến: "${aiDest}"
- Thời lượng: ${aiDays} ngày (${aiStartDate || 'ngày 1'} đến ${aiEndDate || 'ngày ' + aiDays})
- Đối tượng đồng hành: ${companionObj.label}
- Phong cách / Sở thích chính: ${interestLabels || 'Khám phá toàn diện & Ẩm thực'}
- Hạn mức ngân sách: ${budgetOption.label} (${budgetOption.range})
${aiCustomNote ? `- Yêu cầu đặc biệt từ người dùng: "${aiCustomNote}"` : ''}

QUY TẮC BẮT BUỘC VỀ ĐỊA ĐIỂM & ĐỊA CHỈ:
1. Mỗi ngày phải có chính xác 4 trạm dừng tiêu biểu theo dòng thời gian hợp lý (Sáng: 08:00, Trưa: 11:30, Chiều: 14:30, Tối: 18:30).
2. Tên trạm dừng (location) và Địa chỉ cụ thể (address) PHẢI là địa danh có thật, nổi tiếng và đang hoạt động tại ${aiDest}.
3. Trường "address" bắt buộc ghi rõ Số nhà/Tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố (ví dụ: "Số 1 Trần Hưng Đạo, Phường 10, TP. Đà Lạt, Lâm Đồng"). Không được ghi chung chung như "Trung tâm thành phố" hay "Tại khách sạn".
4. Chi phí (cost) cho mỗi trạm phải là số nguyên VNĐ thực tế (ví dụ: 50000, 120000).

BẮT BUỘC TRẢ VỀ DUY NHẤT 1 ĐỐI TƯỢNG JSON HỢP LỆ (KHÔNG DÙNG BACKTICKS MARKDOWN, KHÔNG CHÈN TEXT GIẢI THÍCH):
{
  "title": "${aiDest}: Lịch Trình Chữa Lành & Trải Nghiệm ${aiDays}N${Math.max(1, aiDays - 1)}Đ",
  "summaryTip": "Lời khuyên cô đọng giúp chuyến đi ${aiDest} của ${companionObj.label} trọn vẹn nhất",
  "days": [
    {
      "dayNumber": 1,
      "theme": "Chủ đề ngày 1",
      "activities": [
        {
          "time": "08:00",
          "location": "Tên địa điểm cụ thể",
          "address": "Số nhà, Tên đường, Phường, Quận, Tỉnh/Thành",
          "category": "Ẩm thực",
          "cost": 60000,
          "note": "Kinh nghiệm thực địa hữu ích"
        }
      ]
    }
  ]
}
`;

    let progressTimer: any = null;
    try {
      progressTimer = setInterval(() => {
        setAiProgress(prev => {
          if (prev >= 88) return prev;
          if (prev === 20) setAiCurrentStep(`Đang phân tích các tọa độ nổi tiếng tại ${aiDest}...`);
          if (prev === 45) setAiCurrentStep(`Tối ưu lộ trình và cung đường di chuyển ${aiDays} ngày...`);
          if (prev === 70) setAiCurrentStep('Tính toán chi phí thực tế & tổng hợp mẹo du lịch...');
          return prev + 6;
        });
      }, 900);

      const rawAiResponse = await aiService.generateText({ prompt: promptText });

      if (progressTimer) clearInterval(progressTimer);
      setAiProgress(95);
      setAiCurrentStep('Hoàn tất phân tích! Đang tổng hợp dữ liệu lịch trình...');

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
        : `${aiDest}: Lịch Trình AI Thiết Kế (${aiDays}N${Math.max(1, aiDays - 1)}Đ)`;

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

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredItineraries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TripCard
            item={item}
            onPress={() => handleOpenDetail(item)}
            onMenuPress={() => {
              setActionSheetItem(item);
              setActionSheetVisible(true);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[DS_COLOR.accent]} />
        }
        stickyHeaderIndices={[0]}
        ListHeaderComponent={
          <View style={styles.feedHeader}>
            {/* 1. Segmented Tabs 3 trạng thái */}
            <SegmentedTabs
              items={[
                { key: 'upcoming', label: `Sắp tới (${tabCounts.upcoming})` },
                { key: 'completed', label: `Đã xong (${tabCounts.completed})` },
                { key: 'all', label: `Tất cả (${tabCounts.all})` },
              ]}
              value={activeTab}
              onChange={(key) => setActiveTab(key as any)}
            />

            {/* 2. Search Box */}
            <View style={styles.toolbarRow}>
              <View style={styles.searchBox}>
                <FontAwesome name="search" size={14} color={DS_COLOR.inkMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm chuyến đi, điểm đến..."
                  placeholderTextColor={DS_COLOR.inkMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  accessibilityLabel="Tìm kiếm lịch trình"
                />
                {searchQuery ? (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Xóa từ khóa tìm kiếm"
                  >
                    <FontAwesome name="times-circle" size={15} color={DS_COLOR.inkMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* 3. Chips lọc nhanh 1 dòng */}
            <View style={styles.chipsRow}>
              <Chip
                label="Tất cả"
                active={activeFilterTag === 'all'}
                onPress={() => setActiveFilterTag('all')}
              />
              <Chip
                label="Tour AI"
                active={activeFilterTag === 'ai'}
                onPress={() => setActiveFilterTag(activeFilterTag === 'ai' ? 'all' : 'ai')}
              />
              <Chip
                label="Nhóm bạn"
                active={activeFilterTag === 'group'}
                onPress={() => setActiveFilterTag(activeFilterTag === 'group' ? 'all' : 'group')}
              />
              <Chip
                label="Gia đình"
                active={activeFilterTag === 'family'}
                onPress={() => setActiveFilterTag(activeFilterTag === 'family' ? 'all' : 'family')}
              />
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
              <FontAwesome name="calendar-o" size={42} color={DS_COLOR.inkMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>Chưa có lịch trình nào</Text>
              <Text style={styles.emptySubtitle}>
                Bắt đầu chuyến đi mới bằng cách kiến tạo cùng AI hoặc tự lên lịch trình theo ý thích.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => setCreateSheetVisible(true)}
                activeOpacity={0.85}
              >
                <FontAwesome name="plus" size={13} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionBtnText}>Tạo lịch trình mới</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* FAB Nút nổi thêm chuyến đi */}
      <FAB
        icon="plus"
        onPress={() => setCreateSheetVisible(true)}
        accessibilityLabel="Tạo lịch trình mới"
      />

      {/* Sheet lựa chọn hình thức tạo lịch trình */}
      <CreateTripActionSheet
        visible={createSheetVisible}
        onClose={() => setCreateSheetVisible(false)}
        onSelectAI={() => setAiModalVisible(true)}
        onSelectManual={() => setManualModalVisible(true)}
      />

      {/* Sheet hành động cho từng chuyến đi khi bấm ⋯ */}
      <TripActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        itinerary={actionSheetItem}
        onView={() => {
          if (actionSheetItem) handleOpenDetail(actionSheetItem);
        }}
        onShare={() => {
          if (actionSheetItem) handleShareTrip(actionSheetItem);
        }}
        onToggleVisibility={() => {
          if (actionSheetItem) handleToggleVisibility(actionSheetItem);
        }}
        onDelete={() => {
          if (actionSheetItem) handleDeleteTrip(actionSheetItem);
        }}
      />

      {/* Modal chi tiết lộ trình */}
      <ItineraryDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        itinerary={selectedItinerary}
        onItineraryUpdated={fetchItineraries}
        canEdit={true}
      />

      {/* ─── MODAL WANDERAI TRIP GENERATOR ───────────────────── */}
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
              <TouchableOpacity
                onPress={() => setAiModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <FontAwesome name="times" size={18} color={DS_COLOR.inkMuted} />
              </TouchableOpacity>
            )}
          </View>

          {isAiGenerating ? (
            <View style={styles.aiLoadingContainer}>
              <ActivityIndicator size="large" color={DS_COLOR.accent} />
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
                placeholderTextColor={DS_COLOR.inkMuted}
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

              {/* 2. Ngày bắt đầu & Ngày kết thúc */}
              <Text style={[styles.aiInputLabel, { marginTop: 16 }]}>2. Thời gian chuyến đi *</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSubLabel}>Ngày bắt đầu</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={DS_COLOR.inkMuted}
                    value={aiStartDate}
                    onChangeText={setAiStartDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSubLabel}>Ngày kết thúc</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={DS_COLOR.inkMuted}
                    value={aiEndDate}
                    onChangeText={setAiEndDate}
                  />
                </View>
              </View>

              {/* Ô tính ngày tự động */}
              <View style={[styles.daysCalcBox, { marginTop: 8 }]}>
                <FontAwesome name="calendar-check-o" size={14} color={DS_COLOR.accent} style={{ marginRight: 6 }} />
                <Text style={styles.daysCalcText}>
                  Thời lượng: <Text style={{ fontWeight: 'bold', color: DS_COLOR.accent }}>{aiDays} Ngày {aiDays > 1 ? `(${aiDays}N${aiDays - 1}Đ)` : '(Trong ngày)'}</Text>
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
                      <Text style={styles.budgetRowSub}>{b.range}</Text>
                    </View>
                    <FontAwesome
                      name={aiBudgetTier === b.id ? 'dot-circle-o' : 'circle-o'}
                      size={18}
                      color={aiBudgetTier === b.id ? DS_COLOR.accent : DS_COLOR.inkMuted}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* 5. Sở thích & Gu du lịch */}
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
                placeholderTextColor={DS_COLOR.inkMuted}
                value={aiCustomNote}
                onChangeText={setAiCustomNote}
                multiline
              />

              {/* Submit CTA */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.submitAiBtn}
                onPress={handleStartAIGeneration}>
                <Text style={styles.submitAiBtnText}>Lập Tour Cùng AI</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ─── MODAL TẠO LỊCH TRÌNH THỦ CÔNG ───────────────────── */}
      <Modal
        visible={manualModalVisible}
        animationType="slide"
        onRequestClose={() => setManualModalVisible(false)}>
        <SafeAreaView style={styles.modalSafeContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Tạo Lịch Trình Thủ Công</Text>
            <TouchableOpacity
              onPress={() => setManualModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome name="times" size={18} color={DS_COLOR.inkMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.aiFormScroll}>
            {/* Tên chuyến đi */}
            <Text style={styles.aiInputLabel}>Tên chuyến đi *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: Nghỉ dưỡng biển Mỹ Khê 3N2Đ, Phượt săn mây Đà Lạt..."
              placeholderTextColor={DS_COLOR.inkMuted}
              value={manualTitle}
              onChangeText={setManualTitle}
            />

            {/* Điểm đến chính */}
            <Text style={[styles.aiInputLabel, { marginTop: 14 }]}>Điểm đến chính *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="VD: Đà Nẵng, Hà Giang, Phú Quốc..."
              placeholderTextColor={DS_COLOR.inkMuted}
              value={manualDest}
              onChangeText={setManualDest}
            />

            {/* Ngày đi & ngày về */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputSubLabel}>Ngày khởi hành</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={DS_COLOR.inkMuted}
                  value={manualStartDate}
                  onChangeText={setManualStartDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputSubLabel}>Ngày kết thúc</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={DS_COLOR.inkMuted}
                  value={manualEndDate}
                  onChangeText={setManualEndDate}
                />
              </View>
            </View>

            {/* Ô tính ngày tự động */}
            <View style={styles.daysCalcBox}>
              <FontAwesome name="calendar-check-o" size={14} color={DS_COLOR.accent} style={{ marginRight: 6 }} />
              <Text style={styles.daysCalcText}>
                Thời lượng: <Text style={{ fontWeight: 'bold', color: DS_COLOR.accent }}>{manualDays} Ngày ({manualDays}N{Math.max(1, manualDays - 1)}Đ)</Text>
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

            {/* Dự toán ngân sách */}
            <Text style={[styles.aiInputLabel, { marginTop: 14 }]}>Dự toán ngân sách (VNĐ)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="4,500,000"
              placeholderTextColor={DS_COLOR.inkMuted}
              value={manualBudgetFormatted}
              onChangeText={(text) => {
                const formatted = formatCurrency(text);
                setManualBudgetFormatted(formatted);
              }}
              keyboardType="numeric"
            />

            {/* Chọn ảnh bìa */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <Text style={styles.aiInputLabel}>Ảnh bìa đại diện</Text>
              <TouchableOpacity
                onPress={handlePickCoverImage}
                style={styles.uploadPhotoBtn}>
                <FontAwesome name="camera" size={12} color={DS_COLOR.accent} style={{ marginRight: 5 }} />
                <Text style={styles.uploadPhotoBtnText}>Chọn ảnh từ máy</Text>
              </TouchableOpacity>
            </View>

            {/* Preview ảnh hiện tại */}
            <View style={styles.coverPreviewBox}>
              <Image source={{ uri: manualCover }} style={styles.coverPreviewImage} resizeMode="cover" />
            </View>

            {/* Chọn nhanh ảnh preset */}
            <Text style={[styles.aiInputLabel, { fontSize: 11, color: DS_COLOR.inkMuted, marginTop: 8 }]}>Hoặc chọn nhanh mẫu cảnh đẹp:</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS_COLOR.bg,
  },
  listContent: {
    paddingHorizontal: 0,
    paddingBottom: 96,
  },
  feedHeader: {
    backgroundColor: DS_COLOR.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 40,
    backgroundColor: DS_COLOR.surface,
    borderRadius: DS_RADIUS.pill,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: DS_TYPE.body,
    color: DS_COLOR.ink,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: DS_TYPE.page,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: DS_TYPE.body,
    color: DS_COLOR.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS_COLOR.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: DS_RADIUS.pill,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: DS_TYPE.body,
    fontWeight: '700',
  },

  // Modal Styles
  modalSafeContainer: {
    flex: 1,
    backgroundColor: DS_COLOR.surface,
  },
  modalHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: DS_COLOR.line,
  },
  modalHeaderTitle: {
    fontSize: DS_TYPE.page,
    fontWeight: '700',
    color: DS_COLOR.ink,
  },
  aiLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  aiLoadingProgress: {
    fontSize: 32,
    fontWeight: '800',
    color: DS_COLOR.accent,
    marginTop: 16,
    marginBottom: 8,
  },
  aiLoadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginBottom: 6,
    textAlign: 'center',
  },
  aiLoadingStep: {
    fontSize: 13,
    color: DS_COLOR.inkMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#E7E5E4',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: DS_COLOR.accent,
    borderRadius: 4,
  },
  aiLoadingNote: {
    fontSize: 12,
    color: DS_COLOR.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  aiFormScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  aiInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginBottom: 6,
  },
  inputSubLabel: {
    fontSize: 11.5,
    color: DS_COLOR.inkMuted,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    borderRadius: DS_RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: DS_TYPE.body,
    color: DS_COLOR.ink,
  },
  hotChipsScroll: {
    gap: 8,
    paddingVertical: 8,
  },
  hotChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: DS_RADIUS.pill,
    backgroundColor: '#F5F5F4',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  hotChipActive: {
    backgroundColor: '#FDF2F0',
    borderColor: DS_COLOR.accent,
  },
  hotChipText: {
    fontSize: 12,
    color: DS_COLOR.ink,
    fontWeight: '500',
  },
  hotChipTextActive: {
    color: DS_COLOR.accent,
    fontWeight: '700',
  },
  daysCalcBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF2F0',
    padding: 10,
    borderRadius: DS_RADIUS.sm,
    marginTop: 10,
  },
  daysCalcText: {
    fontSize: 12.5,
    color: DS_COLOR.ink,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceCard: {
    width: '48.5%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: DS_RADIUS.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCardActive: {
    backgroundColor: '#FDF2F0',
    borderColor: DS_COLOR.accent,
  },
  choiceCardText: {
    fontSize: 12.5,
    color: DS_COLOR.ink,
    fontWeight: '600',
    textAlign: 'center',
  },
  choiceCardTextActive: {
    color: DS_COLOR.accent,
    fontWeight: '700',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: DS_COLOR.line,
    borderRadius: DS_RADIUS.sm,
  },
  budgetRowActive: {
    backgroundColor: '#FDF2F0',
    borderColor: DS_COLOR.accent,
  },
  budgetRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: DS_COLOR.ink,
    marginBottom: 2,
  },
  budgetRowTitleActive: {
    color: DS_COLOR.accent,
    fontWeight: '700',
  },
  budgetRowSub: {
    fontSize: 11.5,
    color: DS_COLOR.inkMuted,
  },
  submitAiBtn: {
    marginTop: 24,
    backgroundColor: DS_COLOR.accent,
    paddingVertical: 14,
    borderRadius: DS_RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitAiBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  uploadPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: DS_RADIUS.sm,
    backgroundColor: '#FDF2F0',
  },
  uploadPhotoBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: DS_COLOR.accent,
  },
  coverPreviewBox: {
    height: 120,
    borderRadius: DS_RADIUS.sm,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: DS_COLOR.line,
  },
  coverPreviewImage: {
    width: '100%',
    height: '100%',
  },
  presetScroll: {
    gap: 8,
    paddingVertical: 8,
  },
  presetCard: {
    width: 90,
    borderRadius: DS_RADIUS.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
  },
  presetCardActive: {
    borderColor: DS_COLOR.accent,
  },
  presetImage: {
    width: 90,
    height: 55,
  },
  presetLabel: {
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 3,
    color: DS_COLOR.ink,
    fontWeight: '500',
  },
});
