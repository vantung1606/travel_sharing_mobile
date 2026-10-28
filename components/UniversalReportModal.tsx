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
import { reportApi, uploadApi } from '@/src/services/api';

export type ReportTargetType = 'POST' | 'PLACE' | 'USER' | 'REVIEW';

interface UniversalReportModalProps {
  visible: boolean;
  targetType: ReportTargetType;
  targetId: number | null;
  targetTitle?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_CATEGORIES = [
  { key: 'SPAM', label: 'Spam / Quảng cáo rác', icon: 'ban' },
  { key: 'SCAM', label: 'Thông tin sai sự thật / Lừa đảo', icon: 'exclamation-triangle' },
  { key: 'OFFENSIVE', label: 'Nội dung xúc phạm / Thù ghét', icon: 'frown-o' },
  { key: 'HARASSMENT', label: 'Quấy rối / Công kích cá nhân', icon: 'user-times' },
  { key: 'INAPPROPRIATE', label: 'Hình ảnh nhạy cảm / Đồi trụy', icon: 'eye-slash' },
  { key: 'OTHER', label: 'Vi phạm quy chuẩn khác', icon: 'flag' },
];

const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  POST: 'Bài viết',
  PLACE: 'Địa điểm du lịch',
  USER: 'Tài khoản người dùng',
  REVIEW: 'Đánh giá / Nhận xét',
};

export function UniversalReportModal({
  visible,
  targetType,
  targetId,
  targetTitle,
  onClose,
  onSuccess,
}: UniversalReportModalProps) {
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = useState<string>('SPAM');
  const [description, setDescription] = useState<string>('');
  const [evidenceImage, setEvidenceImage] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const resetForm = () => {
    setSelectedCategory('SPAM');
    setDescription('');
    setEvidenceImage('');
  };

  const handlePickEvidence = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast({
          kind: 'info',
          title: 'Cần quyền truy cập',
          message: 'Vui lòng cấp quyền thư viện ảnh để đính kèm bằng chứng vi phạm.',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploadingImage(true);
      const url = await uploadApi.uploadSingle(asset.uri, asset.fileName || 'evidence.jpg');
      if (url) {
        setEvidenceImage(url);
        showToast({
          kind: 'success',
          title: 'Đã tải ảnh bằng chứng',
          message: 'Ảnh đã được lưu trữ an toàn trên Cloud CDN.',
        });
      }
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Tải ảnh thất bại',
        message: err?.message || 'Không thể tải ảnh bằng chứng lên Cloud CDN.',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!targetId) return;
    const cat = REPORT_CATEGORIES.find((c) => c.key === selectedCategory) || REPORT_CATEGORIES[0];

    setSubmitting(true);
    try {
      await reportApi.submitReport({
        targetType,
        targetId,
        category: cat.key,
        reason: cat.label,
        description: description.trim() || undefined,
        evidenceImageUrl: evidenceImage || undefined,
      });

      showToast({
        kind: 'success',
        title: 'Đã gửi báo cáo vi phạm',
        message: 'Cảm ơn bạn đã hỗ trợ giữ gìn cộng đồng Wayfare an toàn, văn minh.',
        duration: 4000,
      });

      resetForm();
      onClose();
      onSuccess?.();
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Gửi báo cáo thất bại',
        message: err?.response?.data?.message || err?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.',
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
              <Text style={styles.headerTitle}>Báo cáo {TARGET_TYPE_LABELS[targetType]}</Text>
              {targetTitle ? (
                <Text style={styles.headerSub} numberOfLines={1}>
                  {targetTitle}
                </Text>
              ) : null}
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
              
              <Text style={styles.label}>1. Chọn lý do vi phạm</Text>
              <View style={styles.categoryList}>
                {REPORT_CATEGORIES.map((item) => {
                  const selected = selectedCategory === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.categoryItem, selected && styles.categoryItemActive]}
                      onPress={() => setSelectedCategory(item.key)}
                      activeOpacity={0.75}>
                      <View style={[styles.iconCircle, selected && styles.iconCircleActive]}>
                        <FontAwesome
                          name={item.icon as any}
                          size={14}
                          color={selected ? '#FFF' : WF_PAPER.clay}
                        />
                      </View>
                      <Text style={[styles.categoryLabel, selected && styles.categoryLabelActive]}>
                        {item.label}
                      </Text>
                      <FontAwesome
                        name={selected ? 'check-circle' : 'circle-o'}
                        size={18}
                        color={selected ? '#E11D48' : WF_PAPER.cardBorder}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>2. Chi tiết vi phạm (không bắt buộc)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Mô tả cụ thể hành vi vi phạm hoặc cung cấp thêm thông tin cho quản trị viên..."
                placeholderTextColor={WF_PAPER.inkMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>3. Ảnh chụp màn hình bằng chứng (Cloud CDN)</Text>
              {evidenceImage ? (
                <View style={styles.evidenceWrap}>
                  <Image source={{ uri: evidenceImage }} style={styles.evidenceImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.removeEvidenceBtn} onPress={() => setEvidenceImage('')}>
                    <FontAwesome name="times" size={11} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addEvidenceBtn}
                  onPress={handlePickEvidence}
                  disabled={uploadingImage}>
                  {uploadingImage ? (
                    <ActivityIndicator color={WF_PAPER.clay} />
                  ) : (
                    <>
                      <FontAwesome name="camera" size={15} color={WF_PAPER.clay} />
                      <Text style={styles.addEvidenceText}>Đính kèm ảnh bằng chứng</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <View style={styles.noteBox}>
                <FontAwesome name="shield" size={14} color="#059669" style={{ marginTop: 2 }} />
                <Text style={styles.noteText}>
                  Báo cáo của bạn sẽ được bảo mật danh tính và gửi thẳng tới Ban Quản trị Wayfare để xử lý theo Quy chuẩn Cộng đồng.
                </Text>
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
                    <FontAwesome name="flag" size={14} color="#FFF" />
                    <Text style={styles.submitText}>Gửi báo cáo vi phạm</Text>
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
    marginTop: 44,
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
    fontSize: 12,
    color: WF_PAPER.inkMuted,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  categoryList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.pillBg,
  },
  categoryItemActive: {
    borderColor: '#E11D48',
    backgroundColor: '#FFF1F2',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: WF_PAPER.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconCircleActive: {
    backgroundColor: '#E11D48',
  },
  categoryLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: WF_PAPER.inkSecondary,
  },
  categoryLabelActive: {
    color: '#9F1239',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 13,
    color: WF_PAPER.inkPrimary,
    backgroundColor: WF_PAPER.pillBg,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  evidenceWrap: {
    width: 100,
    height: 100,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    marginTop: 4,
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  removeEvidenceBtn: {
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
  addEvidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: WF_PAPER.clayLight,
    borderStyle: 'dashed',
    backgroundColor: WF_PAPER.pillBg,
  },
  addEvidenceText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 6,
    marginTop: 18,
  },
  noteText: {
    flex: 1,
    fontSize: 11.5,
    color: '#065F46',
    lineHeight: 16,
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
    backgroundColor: '#E11D48',
  },
  submitText: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
