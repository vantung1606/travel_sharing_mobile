import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { WF_COLORS } from '@/constants/Colors';
import {
  homeApi,
  HomeStatsData,
  FeaturedItineraryItem,
  itineraryApi,
  PostItem,
} from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── DOCK CONSTANTS (MATCHING WEB 100%) ─────────────────────────────────────
const DOCK_DESTINATIONS = [
  'Đà Lạt',
  'Phú Quốc',
  'Đà Nẵng & Hội An',
  'Sa Pa',
  'Ninh Bình',
  'Hà Giang',
  'Quy Nhơn',
  'Vũng Tàu',
];

const DOCK_BUDGET_OPTIONS = [
  { val: 'budget', title: 'Tiết kiệm', sub: '2.0 - 3.5tr', icon: 'credit-card', badge: 'Tiết kiệm' },
  { val: 'standard', title: 'Tiêu chuẩn', sub: '3.5 - 6.0tr', icon: 'star', badge: 'Phổ biến' },
  { val: 'luxury', title: 'Nghỉ dưỡng VIP', sub: '7.0tr+ / 5 sao', icon: 'diamond', badge: 'Cao cấp' },
];

const DOCK_STYLE_OPTIONS = [
  { val: 'chill', title: 'Nghỉ dưỡng & Ẩm thực', icon: 'coffee' },
  { val: 'photo', title: 'Sống ảo & Văn hóa', icon: 'camera' },
  { val: 'nature', title: 'Thiên nhiên & Trekking', icon: 'tree' },
  { val: 'family', title: 'Gia đình & Tiện nghi', icon: 'users' },
];

const DOCK_DURATION_OPTIONS = [
  { val: '2d1n', title: '2N1Đ', sub: 'Cuối tuần' },
  { val: '3d2n', title: '3N2Đ', sub: 'Phổ biến', badge: 'HOT' },
  { val: '4d3n', title: '4N3Đ', sub: 'Trọn vẹn' },
  { val: '5d4n', title: '5N4Đ', sub: 'Khám phá sâu' },
];

const HIDDEN_GEMS = [
  {
    id: 'dalat',
    title: 'Suối Tía - Hồ Tuyền Lâm (Đà Lạt)',
    time: 'Sương bay: 05:15 - 06:00 sáng',
    badge: 'Độc đáo',
    desc: 'Chèo thuyền kayak qua làn sương mờ ảo như chốn bồng lai tiên cảnh giữa rừng thông.',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    temp: '17°C • Sương nhẹ',
    crowd: 'Vắng người (95% yên tĩnh)',
  },
  {
    id: 'sapa',
    title: 'Bản Sâu Chua - Sa Pa (Lào Cai)',
    time: 'Mùa hoa: 06:30 - 10:00',
    badge: 'Nguyên bản',
    desc: 'Ngôi làng cổ người Mông nằm chênh vênh sườn núi đá, chưa bị thương mại hóa.',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
    temp: '15°C • Nắng sớm',
    crowd: 'Chỉ người bản địa',
  },
  {
    id: 'phuquoc',
    title: 'Hòn Dăm & Rạch Tràm (Phú Quốc)',
    time: 'Hoàng hôn: 16:30 - 18:00',
    badge: 'Hoang sơ',
    desc: 'Hòn đảo tách biệt với rạn san hô tự nhiên và bãi cát trắng trải dài không dấu chân.',
    image: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=80',
    temp: '28°C • Biển êm',
    crowd: 'Tối đa 20 khách/ngày',
  },
];

const SANDBOX_TIMELINE: Record<number, Array<{ time: string; title: string; cost: string; desc: string }>> = {
  1: [
    { time: '08:30', title: 'Ăn sáng Bánh căn Lệ & Cà phê Tùng', cost: '75.000đ', desc: 'Góc phố hoài niệm, cà phê phin đậm đà giữa tiết trời se lạnh.' },
    { time: '14:30', title: 'Check-in Homestay Nhà Gỗ Thung Lũng', cost: 'Tối ưu 30%', desc: 'Phòng view trọn đồi thông xanh mát, không khí trong lành.' },
    { time: '18:30', title: 'Lẩu gà lá é Tao Ngộ & Kem bơ', cost: '280.000đ/2 người', desc: 'Vị cay nồng lá é trứ danh, ưu đãi thành viên Wayfare.' },
  ],
  2: [
    { time: '05:30', title: 'Săn mây bình minh Đồi Chè Cầu Đất', cost: 'Miễn phí', desc: 'Biển mây bồng bềnh tuyệt đẹp, góc chụp triệu view.' },
    { time: '11:30', title: 'Ăn trưa cơm niêu & Máng trượt Datanla', cost: '160.000đ', desc: 'Trượt máng xuyên rừng thông nguyên sinh hùng vĩ.' },
    { time: '16:45', title: 'Hoàng hôn & Acoustic Thung Lũng Đèn', cost: 'Hidden Gem ⭐', desc: 'Giai điệu mộc giữa biển ánh sáng nhà lồng rực rỡ.' },
  ],
  3: [
    { time: '08:00', title: 'Bánh mì xíu mại Hoàng Diệu', cost: '45.000đ', desc: 'Bát xíu mại thơm phức kèm bánh mì giòn nóng hổi.' },
    { time: '10:00', title: 'Mua quà mứt dâu tây L’angfarm', cost: 'Ưu đãi hội viên', desc: 'Đặc sản chính gốc kiểm định rõ nguồn gốc xuất xứ.' },
    { time: '13:00', title: 'Limousine đón ra sân bay Liên Khương', cost: '120.000đ', desc: 'Kết thúc chuyến đi thư giãn trọn vẹn, không mệt mỏi.' },
  ],
};

export default function HomeScreen() {
  const router = useRouter();

  // Platform Data
  const [stats, setStats] = useState<HomeStatsData>({
    totalItineraries: 128,
    totalPlaces: 84,
    totalPosts: 320,
    totalUsers: 1450,
  });
  const [featuredTours, setFeaturedTours] = useState<FeaturedItineraryItem[]>([]);
  const [communityHighlights, setCommunityHighlights] = useState<PostItem[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingTours, setLoadingTours] = useState<boolean>(true);

  // Dock States
  const [selectedDest, setSelectedDest] = useState<string>('Đà Nẵng & Hội An');
  const [selectedBudget, setSelectedBudget] = useState<string>('standard');
  const [selectedStyle, setSelectedStyle] = useState<string>('chill');
  const [selectedDuration, setSelectedDuration] = useState<string>('3d2n');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Sandbox Day
  const [sandboxDay, setSandboxDay] = useState<number>(1);

  const loadData = useCallback(async () => {
    try {
      const [statsData, toursData, highlightsData] = await Promise.all([
        homeApi.getStats(),
        homeApi.getFeaturedItineraries(selectedRegion),
        homeApi.getCommunityHighlights(),
      ]);
      if (statsData) setStats(statsData);
      if (toursData) setFeaturedTours(toursData);
      if (highlightsData) setCommunityHighlights(highlightsData);
    } catch (e) {
      console.warn('Home data load notice', e);
    } finally {
      setLoadingTours(false);
      setRefreshing(false);
    }
  }, [selectedRegion]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Tính toán ngân sách ước tính
  const getEstimate = () => {
    if (selectedBudget === 'budget') {
      return { cost: '2.000.000đ - 3.200.000đ', badge: 'Tiết kiệm ~600k 💳' };
    }
    if (selectedBudget === 'luxury') {
      return { cost: '7.500.000đ - 12.000.000đ', badge: 'Dịch vụ 5 sao 💎' };
    }
    return { cost: '3.500.000đ - 5.000.000đ', badge: 'Tiết kiệm ~850k ⭐' };
  };

  const estimate = getEstimate();

  // Xử lý tạo lịch trình AI
  const handleAIGenerate = async () => {
    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập ở tab "Tài khoản" để lưu lịch trình thông minh do AI tạo vào tài khoản của bạn!'
      );
      return;
    }

    setIsGenerating(true);
    try {
      const newPlan = await itineraryApi.aiQuickGenerate({
        destination: selectedDest,
        budget: selectedBudget,
        style: selectedStyle,
        duration: selectedDuration,
      });

      Alert.alert(
        'Thành công rực rỡ! ✨',
        `AI đã khởi tạo hoàn tất lịch trình "${newPlan?.title || selectedDest}" cho bạn!`,
        [
          {
            text: 'Đến xem ngay',
            onPress: () => router.push('/(tabs)/itinerary'),
          },
          { text: 'Ở lại', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      // Fallback nếu API bận, tạo thủ công
      try {
        await itineraryApi.createItinerary({
          title: `Hành trình ${selectedDest} (${selectedDuration.toUpperCase()})`,
          destination: selectedDest,
          status: 'ACTIVE',
        });
        Alert.alert(
          'Lịch trình đã sẵn sàng! 🎒',
          `Đã tạo thành công chuyến đi "${selectedDest}". Bạn có thể xem và thêm các điểm dừng tại tab Lịch trình.`,
          [
            {
              text: 'Mở Lịch trình',
              onPress: () => router.push('/(tabs)/itinerary'),
            },
            { text: 'Đóng', style: 'cancel' },
          ]
        );
      } catch (innerErr: any) {
        Alert.alert('Lỗi', innerErr.message || 'Không thể tạo chuyến đi lúc này.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloneTour = async (tour: FeaturedItineraryItem) => {
    const session = await authStorage.getSession();
    if (!session) {
      Alert.alert('Yêu cầu đăng nhập', 'Vui lòng đăng nhập để lưu bản sao lịch trình mẫu này về kế hoạch của bạn!');
      return;
    }
    try {
      await itineraryApi.createItinerary({
        title: tour.title,
        destination: tour.location || 'Việt Nam',
        coverImageUrl: tour.image,
        status: 'ACTIVE',
      });
      Alert.alert('Đã sao chép! 🎉', `Lịch trình "${tour.title}" đã được lưu vào danh sách của bạn.`, [
        { text: 'Xem lịch trình', onPress: () => router.push('/(tabs)/itinerary') },
        { text: 'Đóng', style: 'cancel' },
      ]);
    } catch (e: any) {
      Alert.alert('Thông báo', e.message || 'Không thể sao chép lịch trình.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[WF_COLORS.primary]} />}
      showsVerticalScrollIndicator={false}>
      
      {/* ─── 1. HERO BANNER ────────────────────────────────────────────── */}
      <View style={styles.heroSection}>
        <View style={styles.vipBadge}>
          <FontAwesome name="diamond" size={12} color={WF_COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.vipBadgeText}>WAYFARE CONCIERGE • TRẢI NGHIỆM ĐẲNG CẤP</Text>
        </View>

        <Text style={styles.heroTitle}>
          Khám Phá Việt Nam{'\n'}
          <Text style={styles.heroTitleHighlight}>Thiết Kế Hành Trình Độc Bản</Text>
        </Text>

        <Text style={styles.heroSubtitle}>
          Hệ thống hoạch định du lịch thông minh, tối ưu thời gian & kết nối trực tiếp dữ liệu Cloud Railway.
        </Text>
      </View>

      {/* ─── 2. INTERACTIVE TRAVEL DOCK (AI PLANNER QUICK BAR) ─────────── */}
      <View style={styles.dockCard}>
        <View style={styles.dockHeader}>
          <View style={styles.dockTitleGroup}>
            <View style={styles.conciergeIconBox}>
              <FontAwesome name="compass" size={16} color={WF_COLORS.primary} />
            </View>
            <View>
              <Text style={styles.dockTitle}>Kiến Trúc Sư Hành Trình</Text>
              <Text style={styles.dockSub}>Tự động hóa lộ trình theo phong cách & ngân sách</Text>
            </View>
          </View>
        </View>

        {/* 2.1 Chọn Điểm đến */}
        <Text style={styles.inputLabel}>1. Điểm đến mong muốn:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.destScroll}>
          {DOCK_DESTINATIONS.map((dest) => {
            const isSelected = selectedDest === dest;
            return (
              <TouchableOpacity
                key={dest}
                style={[styles.destChip, isSelected && styles.destChipActive]}
                onPress={() => setSelectedDest(dest)}>
                <FontAwesome
                  name="map-marker"
                  size={13}
                  color={isSelected ? '#FFFFFF' : WF_COLORS.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.destChipText, isSelected && styles.destChipTextActive]}>{dest}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2.2 Chọn Ngân sách */}
        <Text style={styles.inputLabel}>2. Mức ngân sách chi tiêu:</Text>
        <View style={styles.budgetRow}>
          {DOCK_BUDGET_OPTIONS.map((b) => {
            const isSelected = selectedBudget === b.val;
            return (
              <TouchableOpacity
                key={b.val}
                style={[styles.budgetCard, isSelected && styles.budgetCardActive]}
                onPress={() => setSelectedBudget(b.val)}>
                <FontAwesome
                  name={b.icon as any}
                  size={16}
                  color={isSelected ? WF_COLORS.primary : WF_COLORS.slate500}
                />
                <Text style={[styles.budgetTitle, isSelected && styles.budgetTitleActive]}>{b.title}</Text>
                <Text style={styles.budgetSub}>{b.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2.3 Chọn Phong cách */}
        <Text style={styles.inputLabel}>3. Phong cách trải nghiệm:</Text>
        <View style={styles.styleGrid}>
          {DOCK_STYLE_OPTIONS.map((st) => {
            const isSelected = selectedStyle === st.val;
            return (
              <TouchableOpacity
                key={st.val}
                style={[styles.stylePill, isSelected && styles.stylePillActive]}
                onPress={() => setSelectedStyle(st.val)}>
                <FontAwesome
                  name={st.icon as any}
                  size={13}
                  color={isSelected ? '#FFFFFF' : WF_COLORS.slate700}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.stylePillText, isSelected && styles.stylePillTextActive]}>{st.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2.4 Chọn Số ngày */}
        <Text style={styles.inputLabel}>4. Thời gian chuyến đi:</Text>
        <View style={styles.durationRow}>
          {DOCK_DURATION_OPTIONS.map((d) => {
            const isSelected = selectedDuration === d.val;
            return (
              <TouchableOpacity
                key={d.val}
                style={[styles.durationChip, isSelected && styles.durationChipActive]}
                onPress={() => setSelectedDuration(d.val)}>
                <Text style={[styles.durationChipText, isSelected && styles.durationChipTextActive]}>{d.title}</Text>
                <Text style={[styles.durationChipSub, isSelected && styles.durationChipSubActive]}>{d.sub}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2.5 Hộp ước tính & Nút AI Generate */}
        <View style={styles.estimateBox}>
          <View>
            <Text style={styles.estimateLabel}>Chi phí dự kiến:</Text>
            <Text style={styles.estimateValue}>{estimate.cost}</Text>
          </View>
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{estimate.badge}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleAIGenerate}
          disabled={isGenerating}>
          {isGenerating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View style={styles.generateBtnContent}>
              <FontAwesome name="compass" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.generateBtnText}>Khởi Tạo Hành Trình Độc Bản</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── 3. LIVE PLATFORM STATS COUNTER ────────────────────────────── */}
      <View style={styles.statsSection}>
        <View style={styles.statBox}>
          <View style={[styles.statIconCircle, { backgroundColor: '#E0F2FE' }]}>
            <FontAwesome name="map" size={16} color="#0284C7" />
          </View>
          <Text style={styles.statNumber}>{stats.totalItineraries}+</Text>
          <Text style={styles.statLabel}>Lịch trình</Text>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <FontAwesome name="map-marker" size={16} color="#D97706" />
          </View>
          <Text style={styles.statNumber}>{stats.totalPlaces}+</Text>
          <Text style={styles.statLabel}>Địa điểm</Text>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIconCircle, { backgroundColor: '#D1FAE5' }]}>
            <FontAwesome name="file-text" size={16} color="#059669" />
          </View>
          <Text style={styles.statNumber}>{stats.totalPosts}+</Text>
          <Text style={styles.statLabel}>Bài viết</Text>
        </View>

        <View style={styles.statBox}>
          <View style={[styles.statIconCircle, { backgroundColor: '#EDE9FE' }]}>
            <FontAwesome name="users" size={16} color="#7C3AED" />
          </View>
          <Text style={styles.statNumber}>{stats.totalUsers}+</Text>
          <Text style={styles.statLabel}>Thành viên</Text>
        </View>
      </View>

      {/* ─── 3.1 VIP PRIVILEGE CLUB BANNER ───────────────────────── */}
      <View style={styles.vipClubCard}>
        <View style={styles.vipClubHeader}>
          <View style={styles.vipCrownBadge}>
            <FontAwesome name="trophy" size={14} color="#D97706" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.vipClubTitle}>HỘI VIÊN WAYFARE PRIVILEGE CLUB</Text>
            <Text style={styles.vipClubSubtitle}>Đặc quyền cá nhân hóa & cố vấn du lịch chuyên sâu</Text>
          </View>
        </View>
        <View style={styles.vipPerksRow}>
          <View style={styles.vipPerkItem}>
            <FontAwesome name="check-circle" size={12} color="#0284C7" style={{ marginRight: 5 }} />
            <Text style={styles.vipPerkText}>Live Chat 24/7</Text>
          </View>
          <View style={styles.vipPerkItem}>
            <FontAwesome name="check-circle" size={12} color="#0284C7" style={{ marginRight: 5 }} />
            <Text style={styles.vipPerkText}>Lịch trình không giới hạn</Text>
          </View>
          <View style={styles.vipPerkItem}>
            <FontAwesome name="check-circle" size={12} color="#0284C7" style={{ marginRight: 5 }} />
            <Text style={styles.vipPerkText}>Đồng bộ Cloud Railway</Text>
          </View>
        </View>
      </View>

      {/* ─── 4. FEATURED ITINERARIES SHOWCASE ─────────────────────────── */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionSuper}>BỘ SƯU TẬP ĐẶC SẮC</Text>
            <Text style={styles.sectionTitle}>Lịch Trình Tiêu Biểu</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/itinerary')}>
            <Text style={styles.viewAllText}>Xem tất cả →</Text>
          </TouchableOpacity>
        </View>

        {/* Region filter tabs */}
        <View style={styles.regionFilterRow}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'bac', label: 'Miền Bắc' },
            { id: 'trung', label: 'Miền Trung' },
            { id: 'nam', label: 'Miền Nam' },
          ].map((r) => {
            const isActive = selectedRegion === r.id;
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.regionTab, isActive && styles.regionTabActive]}
                onPress={() => setSelectedRegion(r.id)}>
                <Text style={[styles.regionTabText, isActive && styles.regionTabTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loadingTours ? (
          <ActivityIndicator color={WF_COLORS.primary} style={{ marginVertical: 30 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toursScroll}>
            {featuredTours.map((tour) => (
              <View key={tour.id} style={styles.tourCard}>
                <Image source={{ uri: tour.image }} style={styles.tourImage} />
                <View style={styles.tourTagBadge}>
                  <Text style={styles.tourTagText}>{tour.tag}</Text>
                </View>
                <View style={styles.tourContent}>
                  <View style={styles.tourMetaRow}>
                    <Text style={styles.tourDuration}>⏱️ {tour.duration}</Text>
                    <Text style={styles.tourRating}>⭐ {tour.rating}</Text>
                  </View>
                  <Text style={styles.tourTitle} numberOfLines={2}>{tour.title}</Text>
                  <Text style={styles.tourDesc} numberOfLines={2}>{tour.desc}</Text>
                  <View style={styles.tourFooter}>
                    <View>
                      <Text style={styles.tourPriceLabel}>Dự kiến từ</Text>
                      <Text style={styles.tourPrice}>{tour.price}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.cloneButton}
                      onPress={() => handleCloneTour(tour)}>
                      <FontAwesome name="clone" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.cloneBtnText}>Lưu bản sao</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ─── 5. HIDDEN GEMS (VIÊN NGỌC ẨN) ────────────────────────────── */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionSuper}>ĐỘC ĐÁO & BẢN ĐỊA</Text>
            <Text style={styles.sectionTitle}>Viên Ngọc Ẩn Của Du Khách</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gemsScroll}>
          {HIDDEN_GEMS.map((gem) => (
            <View key={gem.id} style={styles.gemCard}>
              <Image source={{ uri: gem.image }} style={styles.gemImage} />
              <View style={styles.gemOverlay}>
                <View style={styles.gemBadge}>
                  <Text style={styles.gemBadgeText}>{gem.badge}</Text>
                </View>
                <Text style={styles.gemTitle}>{gem.title}</Text>
                <Text style={styles.gemTime}>⏰ {gem.time}</Text>
                <Text style={styles.gemDesc} numberOfLines={2}>{gem.desc}</Text>
                <View style={styles.gemMetaRow}>
                  <Text style={styles.gemMetaText}>⛅ {gem.temp}</Text>
                  <Text style={styles.gemMetaText}>🍃 {gem.crowd}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ─── 6. INTERACTIVE SANDBOX DAY TIMELINE ───────────────────────── */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionSuper}>LỊCH TRÌNH MẪU ĐÀ LẠT 3N2Đ</Text>
            <Text style={styles.sectionTitle}>Trải Nghiệm Từng Khung Giờ</Text>
          </View>
        </View>

        {/* Day switch tabs */}
        <View style={styles.sandboxDayTabs}>
          {[1, 2, 3].map((d) => {
            const isActive = sandboxDay === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.sandboxDayBtn, isActive && styles.sandboxDayBtnActive]}
                onPress={() => setSandboxDay(d)}>
                <Text style={[styles.sandboxDayText, isActive && styles.sandboxDayTextActive]}>Ngày {d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timeline items */}
        <View style={styles.timelineCard}>
          {SANDBOX_TIMELINE[sandboxDay]?.map((item, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineTimeBox}>
                <Text style={styles.timelineTime}>{item.time}</Text>
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeaderRow}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <View style={styles.costBadge}>
                    <Text style={styles.costBadgeText}>{item.cost}</Text>
                  </View>
                </View>
                <Text style={styles.timelineDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ─── 7. FOOTER CALL-TO-ACTION ─────────────────────────────────── */}
      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>Sẵn sàng cho chuyến du lịch tiếp theo?</Text>
        <Text style={styles.ctaDesc}>
          Khám phá hơn 100+ địa điểm đặc sắc trên bản đồ du lịch tương tác Wayfare!
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/(tabs)/explore')}>
          <Text style={styles.ctaBtnText}>Khám Phá Địa Điểm Ngay 🚀</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WF_COLORS.slate50,
  },
  contentContainer: {
    paddingBottom: 40,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: WF_COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate200,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  vipBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: WF_COLORS.slate900,
    lineHeight: 32,
    marginBottom: 6,
  },
  heroTitleHighlight: {
    color: WF_COLORS.primary,
  },
  heroSubtitle: {
    fontSize: 13,
    color: WF_COLORS.slate700,
    lineHeight: 19,
  },

  // Dock Card
  dockCard: {
    backgroundColor: WF_COLORS.white,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  dockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate100,
  },
  dockTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  conciergeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dockTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  dockSub: {
    fontSize: 11,
    color: WF_COLORS.slate500,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginTop: 10,
    marginBottom: 6,
  },
  destScroll: {
    marginBottom: 4,
  },
  destChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: WF_COLORS.slate100,
    marginRight: 8,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  destChipActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  destChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  destChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  budgetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: WF_COLORS.slate50,
    borderWidth: 1.5,
    borderColor: WF_COLORS.slate200,
  },
  budgetCardActive: {
    backgroundColor: WF_COLORS.primarySoft,
    borderColor: WF_COLORS.primary,
  },
  budgetTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginTop: 4,
  },
  budgetTitleActive: {
    color: WF_COLORS.primary,
  },
  budgetSub: {
    fontSize: 10,
    color: WF_COLORS.slate500,
    marginTop: 2,
  },

  styleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stylePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  stylePillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  stylePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  stylePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  durationChipActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  durationChipTextActive: {
    color: '#FFFFFF',
  },
  durationChipSub: {
    fontSize: 9,
    color: WF_COLORS.slate500,
    marginTop: 2,
  },
  durationChipSubActive: {
    color: '#E0F2FE',
  },

  estimateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  estimateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    textTransform: 'uppercase',
  },
  estimateValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
    marginTop: 1,
  },
  savingsBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },

  generateButton: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  generateBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Stats Section
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: WF_COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: WF_COLORS.slate900,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: WF_COLORS.slate500,
    marginTop: 1,
  },

  // VIP Club Banner
  vipClubCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  vipClubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  vipCrownBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vipClubTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  vipClubSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  vipPerksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  vipPerkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vipPerkText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },

  // Section Common
  sectionContainer: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionSuper: {
    fontSize: 10,
    fontWeight: '800',
    color: WF_COLORS.primary,
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: WF_COLORS.slate900,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },

  // Region Filter
  regionFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  regionTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: WF_COLORS.white,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  regionTabActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  regionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_COLORS.slate700,
  },
  regionTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  // Tours Scroll
  toursScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  tourCard: {
    width: SCREEN_WIDTH * 0.72,
    backgroundColor: WF_COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  tourImage: {
    width: '100%',
    height: 130,
    backgroundColor: WF_COLORS.slate200,
  },
  tourTagBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tourTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tourContent: {
    padding: 12,
  },
  tourMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tourDuration: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.slate500,
  },
  tourRating: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  tourTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    lineHeight: 18,
    marginBottom: 4,
  },
  tourDesc: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    lineHeight: 15,
    marginBottom: 10,
  },
  tourFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: WF_COLORS.slate100,
  },
  tourPriceLabel: {
    fontSize: 9,
    color: WF_COLORS.slate400,
  },
  tourPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },
  cloneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cloneBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Gems Scroll
  gemsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  gemCard: {
    width: SCREEN_WIDTH * 0.78,
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: WF_COLORS.slate900,
  },
  gemImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gemOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'flex-end',
    padding: 14,
  },
  gemBadge: {
    backgroundColor: '#0284C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  gemBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gemTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  gemTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FDE68A',
    marginBottom: 4,
  },
  gemDesc: {
    fontSize: 11,
    color: '#E2E8F0',
    lineHeight: 15,
    marginBottom: 6,
  },
  gemMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gemMetaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // Sandbox Timeline
  sandboxDayTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  sandboxDayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: WF_COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  sandboxDayBtnActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  sandboxDayText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate700,
  },
  sandboxDayTextActive: {
    color: '#FFFFFF',
  },
  timelineCard: {
    backgroundColor: WF_COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineTimeBox: {
    width: 50,
    alignItems: 'center',
    marginRight: 10,
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: '800',
    color: WF_COLORS.primary,
    backgroundColor: WF_COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: WF_COLORS.slate200,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    flex: 1,
  },
  costBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  costBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  timelineDesc: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    lineHeight: 15,
  },

  // CTA Card
  ctaCard: {
    backgroundColor: '#0284C7',
    marginHorizontal: 16,
    marginTop: 26,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  ctaDesc: {
    fontSize: 12,
    color: '#E0F2FE',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 3,
  },
  ctaBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
});
