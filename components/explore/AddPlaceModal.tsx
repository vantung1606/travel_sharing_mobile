import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
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

const CATEGORIES = [
  'Núi Rừng & Mây Ngàn',
  'Di Sản & Phố Cổ',
  'Biển Đảo & Nghỉ Dưỡng',
  'Danh Lam & Thắng Cảnh',
  'Quán Cafe & Săn Mây',
  'Ẩm thực & Check-in',
  'Văn hóa & Lịch sử',
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
  const [description, setDescription] = useState('');
  const [openHours, setOpenHours] = useState('07:30 - 21:00');
  const [ticketPrice, setTicketPrice] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setCategoryName('Danh Lam & Thắng Cảnh');
    setCity('Đà Lạt');
    setAddress('');
    setDescription('');
    setOpenHours('07:30 - 21:00');
    setTicketPrice('');
    setPhoneNumber('');
    setImages([]);
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
      const payload: CreatePlacePayload = {
        name: name.trim(),
        categoryName: categoryName || undefined,
        city: city || undefined,
        address: address.trim(),
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
              <Text style={styles.label}>Danh mục du lịch</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const active = categoryName === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCategoryName(cat)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
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
              <Text style={styles.label}>
                Địa chỉ chi tiết <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Số nhà, Tên đường, Phường/Xã..."
                placeholderTextColor={WF_PAPER.inkMuted}
                value={address}
                onChangeText={setAddress}
              />

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
              </View>
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
