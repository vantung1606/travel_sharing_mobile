import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/Themed';
import { showToast } from '@/components/Toast';
import { WF_COLORS, WF_PAPER } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { CreatePlacePayload, placeApi, PlaceItem, uploadApi } from '@/src/services/api';

interface AddPlaceModalProps {
  visible: boolean;
  onClose: () => void;
  onPlaceCreated: (place: PlaceItem) => void;
}

const CATEGORY_ITEMS = [
  { id: 'Danh Lam & Thắng Cảnh', label: 'Thắng Cảnh' },
  { id: 'Biển Đảo & Nghỉ Dưỡng', label: 'Biển Đảo' },
  { id: 'Cà Phê', label: 'Cà Phê' },
  { id: 'Ẩm Thực & Đặc Sản', label: 'Ẩm Thực' },
  { id: 'Di Sản & Văn Hóa', label: 'Di Sản Văn Hóa' },
  { id: 'Homestay & Khách Sạn', label: 'Homestay' },
  { id: 'Cắm Trại & Hoạt Động', label: 'Cắm Trại & Phượt' },
  { id: 'Núi Rừng & Mây Ngàn', label: 'Núi Rừng' },
];

const POPULAR_CITIES = [
  'Đà Lạt',
  'Đà Nẵng',
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Hội An',
  'Phú Quốc',
  'Sa Pa',
  'Ninh Bình',
  'Nha Trang',
  'Hà Giang',
  'Huế',
  'Vũng Tàu',
];

export function AddPlaceModal({ visible, onClose, onPlaceCreated }: AddPlaceModalProps) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [categoryName, setCategoryName] = useState('Danh Lam & Thắng Cảnh');
  const [city, setCity] = useState('Đà Lạt');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [description, setDescription] = useState('');
  const [openHours, setOpenHours] = useState('07:30 - 21:00');
  const [ticketPrice, setTicketPrice] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setCategoryName('Danh Lam & Thắng Cảnh');
    setCity('Đà Lạt');
    setAddress('');
    setLatitude('');
    setLongitude('');
    setDescription('');
    setOpenHours('07:30 - 21:00');
    setTicketPrice('');
    setPhoneNumber('');
    setImages([]);
    setShowUrlFallback(false);
    setUrlInput('');
  };

  const handleAutoGeocode = async () => {
    const cleanAddr = address.trim();
    const cleanCity = city.trim();
    if (!cleanAddr && !cleanCity) {
      showToast({
        kind: 'info',
        title: 'Nhập địa chỉ trước',
        message: 'Vui lòng nhập địa chỉ cụ thể hoặc tỉnh/thành để tìm tọa độ GPS.',
      });
      return;
    }

    setIsGeocoding(true);
    try {
      const sanitized = cleanAddr.replace(/-/g, ', ').replace(/\//g, ', ').trim();
      const query = `${sanitized}, ${cleanCity}, Việt Nam`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=vn`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'vi,en;q=0.9' } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        setLatitude(Number(data[0].lat).toFixed(6));
        setLongitude(Number(data[0].lon).toFixed(6));
        showToast({
          kind: 'success',
          title: 'Đã ghim GPS',
          message: `Tọa độ: ${Number(data[0].lat).toFixed(4)}, ${Number(data[0].lon).toFixed(4)}`,
        });
      } else {
        const cityUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanCity + ', Việt Nam')}&format=json&limit=1&countrycodes=vn`;
        const cityRes = await fetch(cityUrl);
        const cityData = await cityRes.json();
        if (Array.isArray(cityData) && cityData.length > 0 && cityData[0].lat && cityData[0].lon) {
          setLatitude(Number(cityData[0].lat).toFixed(6));
          setLongitude(Number(cityData[0].lon).toFixed(6));
          showToast({
            kind: 'success',
            title: 'Đã ghim GPS khu vực',
            message: `Tọa độ: ${Number(cityData[0].lat).toFixed(4)}, ${Number(cityData[0].lon).toFixed(4)}`,
          });
        } else {
          showToast({
            kind: 'info',
            title: 'Không tìm thấy tọa độ tự động',
            message: 'Hệ thống sẽ định vị ngầm khi Ban Quản Trị duyệt địa điểm.',
          });
        }
      }
    } catch {
      showToast({
        kind: 'error',
        title: 'Lỗi định vị GPS',
        message: 'Không thể kết nối đến máy chủ bản đồ vệ tinh OpenStreetMap.',
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast({
          kind: 'info',
          title: 'Quyền vị trí bị từ chối',
          message: 'Vui lòng cấp quyền vị trí thiết bị để lấy tọa độ hiện tại.',
        });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc?.coords) {
        setLatitude(loc.coords.latitude.toFixed(6));
        setLongitude(loc.coords.longitude.toFixed(6));
        showToast({
          kind: 'success',
          title: 'Đã ghim vị trí hiện tại',
          message: `GPS: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`,
        });
      }
    } catch (e: any) {
      showToast({
        kind: 'error',
        title: 'Lỗi lấy vị trí',
        message: e?.message || 'Không thể lấy vị trí hiện tại của thiết bị.',
      });
    } finally {
      setIsLocating(false);
    }
  };

  const handleAddImageUrl = () => {
    const raw = urlInput.trim();
    if (!raw) return;
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      showToast({
        kind: 'error',
        title: 'URL không hợp lệ',
        message: 'Link ảnh phải bắt đầu bằng https:// hoặc http://',
      });
      return;
    }
    setImages((prev) => [...prev, raw].slice(0, 6));
    setUrlInput('');
    setShowUrlFallback(false);
    showToast({
      kind: 'success',
      title: 'Đã thêm ảnh',
      message: 'Đã thêm liên kết ảnh vào danh sách ảnh địa điểm.',
    });
  };

  const handlePickImages = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast({
          kind: 'info',
          title: 'Cần quyền truy cập ảnh',
          message: 'Vui lòng cấp quyền thư viện ảnh để tải hình ảnh địa điểm lên Cloud CDN.',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, 6 - images.length),
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploadingImage(true);
      const uploaded: string[] = [];
      for (const asset of result.assets) {
        try {
          const url = await uploadApi.uploadSingle(asset.uri, asset.fileName || undefined);
          if (url) uploaded.push(url);
        } catch (err: any) {
          console.warn('Upload ảnh địa điểm thất bại:', err?.message || err);
        }
      }
      setImages((prev) => [...prev, ...uploaded].slice(0, 6));
      if (uploaded.length > 0) {
        showToast({
          kind: 'success',
          title: 'Tải ảnh thành công',
          message: `Đã lưu trữ ${uploaded.length} ảnh lên Cloudinary Cloud CDN.`,
        });
      }
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Không chọn được ảnh',
        message: err?.message || 'Vui lòng thử lại sau ít phút.',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast({
        kind: 'error',
        title: 'Thiếu tên địa điểm',
        message: 'Vui lòng nhập tên địa điểm du lịch muốn đề xuất.',
      });
      return;
    }
    if (!address.trim()) {
      showToast({
        kind: 'error',
        title: 'Thiếu địa chỉ',
        message: 'Vui lòng nhập địa chỉ cụ thể để du khách có thể tìm đường.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const priceNum = ticketPrice.trim() ? parseFloat(ticketPrice.replace(/\D/g, '')) : undefined;
      const latNum = latitude.trim() ? parseFloat(latitude) : undefined;
      const lngNum = longitude.trim() ? parseFloat(longitude) : undefined;
      const payload: CreatePlacePayload = {
        name: name.trim(),
        categoryName: categoryName || undefined,
        city: city || undefined,
        address: address.trim(),
        latitude: latNum && !isNaN(latNum) ? latNum : undefined,
        longitude: lngNum && !isNaN(lngNum) ? lngNum : undefined,
        description: description.trim() || undefined,
        openHours: openHours.trim() || undefined,
        ticketPrice: priceNum && !isNaN(priceNum) ? priceNum : undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        coverImageUrl: images[0] || undefined,
        images: images.length > 0 ? images : undefined,
      };

      const created = await placeApi.createPlace(payload);
      showToast({
        kind: 'success',
        title: 'Đề xuất địa điểm thành công! 🎉',
        message: 'Cảm ơn đóng góp của bạn. Địa điểm mới đã được lưu vào hệ thống.',
        duration: 4000,
      });
      resetForm();
      onClose();
      onPlaceCreated(created);
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Đề xuất thất bại',
        message: err?.response?.data?.message || err?.message || 'Không thể tạo địa điểm mới. Vui lòng thử lại.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingTop: Math.max(insets.top, 8) + 4 }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={onClose} accessibilityLabel="Đóng">
              <FontAwesome name="times" size={18} color={WF_PAPER.inkPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Đề xuất Địa điểm mới</Text>
              <Text style={styles.headerSub}>Chia sẻ tọa độ du lịch độc đáo đến cộng đồng Wayfare</Text>
            </View>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              
              {/* Tên địa điểm */}
              <Text style={styles.label}>
                Tên địa điểm / Tên quán <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Cầu Vàng Bà Nà Hills, Tiệm Cà Phê Hoàng Hôn..."
                placeholderTextColor={WF_PAPER.inkMuted}
                value={name}
                onChangeText={setName}
              />

              {/* Danh mục */}
              <Text style={styles.label}>Danh mục trải nghiệm</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {CATEGORY_ITEMS.map((cat) => {
                  const active = categoryName === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCategoryName(cat.id)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Tỉnh / Thành phố */}
              <Text style={styles.label}>Tỉnh / Thành phố</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {POPULAR_CITIES.map((c) => {
                  const active = city === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCity(c)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Địa chỉ cụ thể */}
              <View style={styles.labelRow}>
                <Text style={styles.label}>
                  Địa chỉ chi tiết <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.addressRuleHint}>Kèm Phường/Quận & Tỉnh/Thành</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="VD: 202 Chương Dương - Sơn Trà - Đà Nẵng"
                placeholderTextColor={WF_PAPER.inkMuted}
                value={address}
                onChangeText={setAddress}
              />

              {/* Định vị GPS thông minh */}
              <View style={styles.gpsRow}>
                <TouchableOpacity
                  style={[styles.gpsBtn, isGeocoding && { opacity: 0.6 }]}
                  onPress={handleAutoGeocode}
                  disabled={isGeocoding}
                  activeOpacity={0.8}>
                  {isGeocoding ? (
                    <ActivityIndicator size="small" color="#059669" style={{ marginRight: 6 }} />
                  ) : (
                    <FontAwesome name="compass" size={13} color="#059669" style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.gpsBtnText}>Lấy GPS từ địa chỉ</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.gpsBtn, isLocating && { opacity: 0.6 }]}
                  onPress={handleGetCurrentLocation}
                  disabled={isLocating}
                  activeOpacity={0.8}>
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 6 }} />
                  ) : (
                    <FontAwesome name="location-arrow" size={13} color="#2563EB" style={{ marginRight: 6 }} />
                  )}
                  <Text style={[styles.gpsBtnText, { color: '#2563EB' }]}>Vị trí hiện tại</Text>
                </TouchableOpacity>
              </View>

              {latitude && longitude ? (
                <View style={styles.gpsBadgeSuccess}>
                  <FontAwesome name="check-circle" size={12} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.gpsBadgeText}>
                    Đã ghim GPS: {latitude}, {longitude}
                  </Text>
                </View>
              ) : (
                <View style={styles.gpsBadgePending}>
                  <FontAwesome name="info-circle" size={12} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={styles.gpsBadgePendingText}>
                    Chưa ghim GPS (Hệ thống sẽ định vị ngầm tự động khi duyệt)
                  </Text>
                </View>
              )}

              {/* Mô tả */}
              <Text style={styles.label}>Mô tả / Kinh nghiệm trải nghiệm</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Điểm nổi bật, góc chụp đẹp, thời điểm lý tưởng trong ngày..."
                placeholderTextColor={WF_PAPER.inkMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              {/* Hàng: Giờ mở cửa & Giá vé */}
              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Giờ mở cửa</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 07:00 - 22:00"
                    placeholderTextColor={WF_PAPER.inkMuted}
                    value={openHours}
                    onChangeText={setOpenHours}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Giá vé / Chi phí</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="VD: 50.000đ"
                    placeholderTextColor={WF_PAPER.inkMuted}
                    value={ticketPrice}
                    onChangeText={setTicketPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Số điện thoại liên hệ */}
              <Text style={styles.label}>Số điện thoại liên hệ (không bắt buộc)</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: 0912 345 678"
                placeholderTextColor={WF_PAPER.inkMuted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />

              {/* Hình ảnh Cloud CDN */}
              <View style={styles.labelRow}>
                <Text style={styles.label}>Hình ảnh tải lên Cloud CDN ({images.length}/6)</Text>
                <TouchableOpacity
                  onPress={() => setShowUrlFallback(!showUrlFallback)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.urlToggleText}>
                    {showUrlFallback ? 'Ẩn ô dán link' : 'Hoặc dán URL ảnh'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showUrlFallback ? (
                <View style={styles.urlInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Dán link ảnh: https://..."
                    placeholderTextColor={WF_PAPER.inkMuted}
                    value={urlInput}
                    onChangeText={setUrlInput}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.urlAddBtn} onPress={handleAddImageUrl} activeOpacity={0.8}>
                    <Text style={styles.urlAddBtnText}>Thêm</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.imageGrid}>
                {images.map((uri, idx) => (
                  <View key={`${uri}-${idx}`} style={styles.imageThumb}>
                    <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeThumb}
                      onPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}>
                      <FontAwesome name="times" size={10} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 6 ? (
                  <TouchableOpacity
                    style={styles.addThumb}
                    onPress={handlePickImages}
                    disabled={uploadingImage}>
                    {uploadingImage ? (
                      <ActivityIndicator color={WF_PAPER.clay} />
                    ) : (
                      <>
                        <FontAwesome name="camera" size={16} color={WF_PAPER.clay} />
                        <Text style={styles.addThumbText}>Thêm ảnh</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>

            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity
                style={[styles.submitBtn, (submitting || uploadingImage) && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={submitting || uploadingImage}>
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <FontAwesome name="plus-circle" size={16} color="#FFF" />
                    <Text style={styles.submitText}>Gửi đề xuất địa điểm</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 26, 21, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    flex: 1,
    marginTop: 38,
    backgroundColor: WF_PAPER.card,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: WF_PAPER.cardBorder,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: WF_PAPER.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    fontFamily: SERIF_FONT,
  },
  headerSub: {
    fontSize: 11.5,
    color: WF_PAPER.inkMuted,
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  required: {
    color: '#E11D48',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: WF_PAPER.inkPrimary,
    backgroundColor: WF_PAPER.pillBg,
  },
  textArea: {
    height: 90,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.pillBg,
  },
  chipActive: {
    backgroundColor: WF_PAPER.clay,
    borderColor: WF_PAPER.clay,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: WF_PAPER.inkSecondary,
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  imageThumb: {
    width: 90,
    height: 90,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  removeThumb: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 26, 21, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumb: {
    width: 90,
    height: 90,
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: WF_PAPER.clayLight,
    backgroundColor: WF_PAPER.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addThumbText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
  addressRuleHint: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -4,
    marginBottom: 8,
  },
  gpsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: WF_PAPER.pillBg,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
  },
  gpsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  gpsBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 10,
  },
  gpsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  gpsBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  gpsBadgePendingText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#D97706',
  },
  urlToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  urlAddBtn: {
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 5,
    backgroundColor: WF_PAPER.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urlAddBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.card,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 6,
    backgroundColor: WF_PAPER.clay,
  },
  submitText: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
