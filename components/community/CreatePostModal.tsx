import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
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
import { POST_CATEGORIES } from '@/components/community/communityUtils';
import { WF_COLORS } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { ToastHost, showToast } from '@/components/Toast';
import { itineraryApi, ItineraryItem, postApi, PostItem, uploadApi } from '@/src/services/api';

interface CreatePostModalProps {
  visible: boolean;
  editingPost?: PostItem | null;
  onClose: () => void;
  onSubmitted: (post?: PostItem) => void;
}

const MAX_IMAGES = 9;

export function CreatePostModal({ visible, editingPost, onClose, onSubmitted }: CreatePostModalProps) {
  const insets = useSafeAreaInsets();
  const isEdit = !!editingPost;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<string>('Ẩm thực & Check-in');
  const [videoUrl, setVideoUrl] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [images, setImages] = useState<string[]>([]);
  const [itineraryId, setItineraryId] = useState<number | null>(null);
  const [myItineraries, setMyItineraries] = useState<ItineraryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editingPost) {
      setTitle(editingPost.title || '');
      setContent(editingPost.content || '');
      setLocation(editingPost.locationTag || editingPost.locationName || '');
      setCategory(editingPost.category || 'Ẩm thực & Check-in');
      setVideoUrl(editingPost.videoUrl || '');
      setVisibility((editingPost.visibility || 'PUBLIC').toUpperCase() === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC');
      setImages(editingPost.images?.length ? editingPost.images : editingPost.imageUrl ? [editingPost.imageUrl] : []);
      setItineraryId(editingPost.itineraryId ?? null);
    } else {
      setTitle('');
      setContent('');
      setLocation('Việt Nam');
      setCategory('Ẩm thực & Check-in');
      setVideoUrl('');
      setVisibility('PUBLIC');
      setImages([]);
      setItineraryId(null);
    }

    itineraryApi
      .getMyItineraries()
      .then((list) => setMyItineraries(list || []))
      .catch(() => setMyItineraries([]));
  }, [visible, editingPost]);

  const handlePickImages = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast({
          kind: 'info',
          title: 'Cần quyền truy cập ảnh',
          message: 'Vui lòng cấp quyền thư viện ảnh để đính kèm hình vào bài viết.',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, MAX_IMAGES - images.length),
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const uploaded: string[] = [];
      for (const asset of result.assets) {
        try {
          const url = await uploadApi.uploadSingle(asset.uri, asset.fileName || undefined);
          if (url) uploaded.push(url);
        } catch (err: any) {
          console.warn('Upload ảnh thất bại:', err?.message || err);
        }
      }
      setImages((prev) => [...prev, ...uploaded].slice(0, MAX_IMAGES));
      if (!uploaded.length) {
        showToast({
          kind: 'error',
          title: 'Tải ảnh thất bại',
          message: 'Không thể tải ảnh lên. Vui lòng thử lại.',
        });
      }
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Không chọn được ảnh',
        message: err?.message || 'Vui lòng thử lại sau ít phút.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast({
        kind: 'error',
        title: 'Thiếu tiêu đề',
        message: 'Vui lòng nhập tiêu đề bài viết trước khi đăng.',
      });
      return;
    }
    if (!content.trim()) {
      showToast({
        kind: 'error',
        title: 'Thiếu nội dung',
        message: 'Vui lòng nhập nội dung bài viết trước khi đăng.',
      });
      return;
    }
    if (uploading) {
      showToast({
        kind: 'info',
        title: 'Đang tải ảnh',
        message: 'Vui lòng đợi ảnh tải xong rồi đăng bài.',
      });
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category: category || 'Ẩm thực & Check-in',
        locationTag: location.trim() || 'Việt Nam',
        images,
        videoUrl: videoUrl.trim() || undefined,
        visibility,
        itineraryId: itineraryId ?? undefined,
      };
      const result = isEdit && editingPost
        ? await postApi.updatePost(editingPost.id, payload)
        : await postApi.createPost(payload);
      onSubmitted(result);
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: isEdit ? 'Cập nhật thất bại' : 'Đăng bài thất bại',
        message: err?.response?.data?.message || err?.message || 'Không thể lưu bài viết.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingTop: Math.max(insets.top, 8) + 4 }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
              <FontAwesome name="times" size={18} color={WF_COLORS.slate700} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{isEdit ? 'Chỉnh sửa bài viết' : 'Chia sẻ với cộng đồng'}</Text>
              <Text style={styles.headerSub}>
                {isEdit ? 'Cập nhật nội dung bài viết của bạn' : 'Đăng review, ảnh đẹp hoặc đính kèm tour'}
              </Text>
            </View>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
              {/* Visibility */}
              <View style={styles.visibilityRow}>
                <TouchableOpacity
                  style={[styles.visibilityOption, visibility === 'PUBLIC' && styles.visibilityActive]}
                  onPress={() => setVisibility('PUBLIC')}>
                  <FontAwesome
                    name="globe"
                    size={13}
                    color={visibility === 'PUBLIC' ? '#FFFFFF' : WF_COLORS.slate500}
                  />
                  <Text style={[styles.visibilityLabel, visibility === 'PUBLIC' && styles.visibilityLabelActive]}>
                    Công khai
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.visibilityOption, visibility === 'PRIVATE' && styles.visibilityActive]}
                  onPress={() => setVisibility('PRIVATE')}>
                  <FontAwesome
                    name="lock"
                    size={13}
                    color={visibility === 'PRIVATE' ? '#FFFFFF' : WF_COLORS.slate500}
                  />
                  <Text style={[styles.visibilityLabel, visibility === 'PRIVATE' && styles.visibilityLabelActive]}>
                    Chỉ mình tôi
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Tiêu đề</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Bí kíp du lịch Đà Nẵng 4N3Đ tự túc"
                placeholderTextColor={WF_COLORS.slate400}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Nội dung *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Cảm nghĩ, mẹo du lịch, quán ăn ngon, lưu ý trang phục..."
                placeholderTextColor={WF_COLORS.slate400}
                value={content}
                onChangeText={setContent}
                multiline
              />

              <Text style={styles.label}>Chủ đề</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {POST_CATEGORIES.map((item) => {
                  const active = category === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setCategory(active ? '' : item)}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.label}>Địa điểm check-in</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Mũi Né, Phan Thiết"
                placeholderTextColor={WF_COLORS.slate400}
                value={location}
                onChangeText={setLocation}
              />

              <Text style={styles.label}>Video (tùy chọn)</Text>
              <TextInput
                style={styles.input}
                placeholder="Link video YouTube hoặc MP4..."
                placeholderTextColor={WF_COLORS.slate400}
                value={videoUrl}
                onChangeText={setVideoUrl}
                autoCapitalize="none"
              />

              {/* Images */}
              <View style={styles.labelRow}>
                <Text style={styles.label}>Hình ảnh ({images.length}/{MAX_IMAGES})</Text>
              </View>
              <View style={styles.imageGrid}>
                {images.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.imageThumb}>
                    <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeThumb}
                      onPress={() => setImages((prev) => prev.filter((_, i) => i !== index))}>
                      <FontAwesome name="times" size={10} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < MAX_IMAGES ? (
                  <TouchableOpacity style={styles.addThumb} onPress={handlePickImages} disabled={uploading}>
                    {uploading ? (
                      <ActivityIndicator color={WF_COLORS.primary} />
                    ) : (
                      <>
                        <FontAwesome name="plus" size={16} color={WF_COLORS.primary} />
                        <Text style={styles.addThumbText}>Thêm ảnh</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Itinerary attach */}
              {myItineraries.length > 0 ? (
                <>
                  <Text style={styles.label}>Đính kèm lịch trình (không bắt buộc)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {myItineraries.map((it) => {
                      const active = itineraryId === it.id;
                      return (
                        <TouchableOpacity
                          key={it.id}
                          style={[styles.itineraryChip, active && styles.itineraryChipActive]}
                          onPress={() => setItineraryId(active ? null : it.id)}>
                          <FontAwesome
                            name={active ? 'check-circle' : 'map-o'}
                            size={12}
                            color={active ? '#FFFFFF' : WF_COLORS.primary}
                          />
                          <Text
                            style={[styles.itineraryChipText, active && styles.itineraryChipTextActive]}
                            numberOfLines={1}>
                            {it.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity
                style={[styles.submitBtn, (submitting || uploading) && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={submitting || uploading}>
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <FontAwesome name="paper-plane" size={14} color="#FFFFFF" />
                    <Text style={styles.submitText}>{isEdit ? 'Lưu thay đổi' : 'Đăng bài viết'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>

        {/* Thông báo trong chính modal soạn bài */}
        <ToastHost enabled={visible} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    flex: 1,
    marginTop: 42,
    backgroundColor: WF_COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate200,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WF_COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    fontFamily: SERIF_FONT,
  },
  headerSub: {
    fontSize: 11.5,
    color: WF_COLORS.slate500,
    marginTop: 1,
  },
  form: {
    padding: 14,
    paddingBottom: 24,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
  },
  visibilityActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  visibilityLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: WF_COLORS.slate600,
  },
  visibilityLabelActive: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 12.5,
    fontWeight: '800',
    color: WF_COLORS.slate700,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
    borderRadius: 12,
    paddingHorizontal: 13,
    height: 46,
    fontSize: 13.5,
    color: WF_COLORS.slate900,
    marginBottom: 14,
  },
  textArea: {
    height: 108,
    paddingTop: 11,
    textAlignVertical: 'top',
  },
  chipRow: {
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_COLORS.slate600,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  imageThumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: WF_COLORS.slate100,
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
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: WF_COLORS.primary,
    backgroundColor: WF_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addThumbText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: WF_COLORS.primary,
  },
  itineraryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    maxWidth: 220,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: WF_COLORS.primarySoft,
  },
  itineraryChipActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  itineraryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.primaryHover,
    flexShrink: 1,
  },
  itineraryChipTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.white,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: WF_COLORS.primary,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
