import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { WF_PAPER } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { ToastHost, showToast } from '@/components/Toast';
import { itineraryApi, ItineraryItem, placeApi, PlaceItem, postApi, PostItem, uploadApi } from '@/src/services/api';
import { RichTextToolbar } from '@/components/community/RichTextToolbar';

interface CreatePostModalProps {
  visible: boolean;
  editingPost?: PostItem | null;
  initialPlaceId?: number | null;
  onClose: () => void;
  onSubmitted: (post?: PostItem) => void;
}

const MAX_IMAGES = 9;

export function CreatePostModal({ visible, editingPost, initialPlaceId, onClose, onSubmitted }: CreatePostModalProps) {
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
  const [placeId, setPlaceId] = useState<number | null>(null);
  const [availablePlaces, setAvailablePlaces] = useState<PlaceItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

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
      setPlaceId(editingPost.placeId ?? null);
    } else {
      setTitle('');
      setContent('');
      setLocation('Việt Nam');
      setCategory('Ẩm thực & Check-in');
      setVideoUrl('');
      setVisibility('PUBLIC');
      setImages([]);
      setItineraryId(null);
      setPlaceId(initialPlaceId ?? null);
    }

    itineraryApi
      .getMyItineraries()
      .then((list) => setMyItineraries(list || []))
      .catch(() => setMyItineraries([]));

    placeApi
      .getAllPlaces({ status: 'ACTIVE' })
      .then((list) => setAvailablePlaces(list || []))
      .catch(() => setAvailablePlaces([]));
  }, [visible, editingPost, initialPlaceId]);

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

  const handlePickVideo = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast({
          kind: 'info',
          title: 'Cần quyền truy cập',
          message: 'Vui lòng cấp quyền truy cập thư viện để chọn video tải lên.',
        });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploadingVideo(true);
      const url = await uploadApi.uploadSingle(
        asset.uri,
        asset.fileName || `video_${Date.now()}.mp4`,
        asset.mimeType || 'video/mp4'
      );
      if (url) {
        setVideoUrl(url);
        showToast({
          kind: 'success',
          title: 'Tải video thành công',
          message: 'Video đã được tải lên Cloud CDN an toàn!',
          icon: 'check-circle',
        });
      } else {
        throw new Error('Không nhận được đường dẫn video từ máy chủ.');
      }
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Tải video thất bại',
        message: err?.response?.data?.message || err?.message || 'Không thể tải video lên Cloud CDN.',
      });
    } finally {
      setUploadingVideo(false);
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
    if (uploading || uploadingVideo) {
      showToast({
        kind: 'info',
        title: 'Đang tải tệp tin',
        message: 'Vui lòng đợi ảnh hoặc video tải xong rồi mới đăng bài.',
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
        placeId: placeId ?? undefined,
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
              <FontAwesome name="times" size={18} color={WF_PAPER.inkSecondary} />
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
                    color={visibility === 'PUBLIC' ? WF_PAPER.card : WF_PAPER.inkMuted}
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
                    color={visibility === 'PRIVATE' ? WF_PAPER.card : WF_PAPER.inkMuted}
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
                placeholderTextColor={WF_PAPER.inkMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Nội dung *</Text>
              <RichTextToolbar
                value={content}
                onChangeText={setContent}
                selection={selection}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0 },
                ]}
                placeholder="Cảm nghĩ, mẹo du lịch, quán ăn ngon, lưu ý... (Hỗ trợ in đậm, nghiêng, trích dẫn, @...)"
                placeholderTextColor={WF_PAPER.inkMuted}
                value={content}
                onChangeText={setContent}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
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
                placeholderTextColor={WF_PAPER.inkMuted}
                value={location}
                onChangeText={setLocation}
              />

              <View style={styles.labelRow}>
                <Text style={styles.label}>Video bài viết (Cloud CDN / YouTube)</Text>
                {videoUrl ? (
                  <TouchableOpacity onPress={() => setVideoUrl('')}>
                    <Text style={{ fontSize: 12, color: '#E11D48', fontWeight: '600' }}>Xóa video</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {videoUrl ? (
                <View style={styles.videoPreviewCard}>
                  <View style={styles.videoPreviewHeader}>
                    <View style={styles.videoIconCircle}>
                      <FontAwesome name="play" size={13} color="#FFF" style={{ marginLeft: 2 }} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.videoUrlText} numberOfLines={1}>
                        {videoUrl}
                      </Text>
                      <Text style={styles.videoCloudBadge}>
                        {videoUrl.includes('cloudinary') ? 'Cloudinary Cloud CDN ✓' : 'Đính kèm ngoại vi'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.videoPreviewActions}>
                    <TouchableOpacity
                      style={styles.previewBtn}
                      onPress={() => Linking.openURL(videoUrl)}>
                      <FontAwesome name="external-link" size={12} color={WF_PAPER.clay} />
                      <Text style={styles.previewBtnText}>Xem trước video</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.previewBtn, { borderColor: '#FCA5A5' }]}
                      onPress={() => setVideoUrl('')}>
                      <FontAwesome name="trash" size={12} color="#E11D48" />
                      <Text style={[styles.previewBtnText, { color: '#E11D48' }]}>Gỡ bỏ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : uploadingVideo ? (
                <View style={styles.videoLoadingBox}>
                  <ActivityIndicator size="small" color={WF_PAPER.clay} />
                  <Text style={styles.videoLoadingText}>
                    Đang tải video lên Cloudinary Cloud CDN... Vui lòng giữ ứng dụng mở.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={styles.uploadVideoBtn}
                    onPress={handlePickVideo}
                    disabled={uploadingVideo}>
                    <FontAwesome name="video-camera" size={16} color={WF_PAPER.clay} />
                    <Text style={styles.uploadVideoBtnText}>Tải video từ thiết bị lên Cloud CDN</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, { marginTop: 0 }]}
                    placeholder="Hoặc dán trực tiếp link video (YouTube, MP4)..."
                    placeholderTextColor={WF_PAPER.inkMuted}
                    value={videoUrl}
                    onChangeText={setVideoUrl}
                    autoCapitalize="none"
                  />
                </View>
              )}

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
                      <FontAwesome name="times" size={10} color={WF_PAPER.card} />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < MAX_IMAGES ? (
                  <TouchableOpacity style={styles.addThumb} onPress={handlePickImages} disabled={uploading}>
                    {uploading ? (
                      <ActivityIndicator color={WF_PAPER.clay} />
                    ) : (
                      <>
                        <FontAwesome name="plus" size={16} color={WF_PAPER.clay} />
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
                            color={active ? WF_PAPER.card : WF_PAPER.clay}
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

              {/* Place check-in attach */}
              {availablePlaces.length > 0 ? (
                <>
                  <Text style={styles.label}>Gắn vị trí check-in địa điểm (không bắt buộc)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    {availablePlaces.slice(0, 30).map((pl) => {
                      const active = placeId === pl.id;
                      return (
                        <TouchableOpacity
                          key={pl.id}
                          style={[styles.placeChip, active && styles.placeChipActive]}
                          onPress={() => setPlaceId(active ? null : pl.id)}>
                          <FontAwesome
                            name={active ? 'check-circle' : 'map-marker'}
                            size={12}
                            color={active ? WF_PAPER.card : WF_PAPER.clay}
                          />
                          <Text
                            style={[styles.placeChipText, active && styles.placeChipTextActive]}
                            numberOfLines={1}>
                            {pl.name}
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
                  <ActivityIndicator color={WF_PAPER.card} />
                ) : (
                  <>
                    <FontAwesome name="paper-plane" size={14} color={WF_PAPER.card} />
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
    backgroundColor: 'rgba(30, 26, 21, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    flex: 1,
    marginTop: 42,
    backgroundColor: WF_PAPER.card,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: WF_PAPER.cardBorder,
  },
  headerBtn: {
    width: 34,
    height: 34,
    borderRadius: 5,
    backgroundColor: WF_PAPER.pillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
    fontFamily: SERIF_FONT,
  },
  headerSub: {
    fontSize: 11.5,
    color: WF_PAPER.inkMuted,
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
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.bg,
  },
  visibilityActive: {
    backgroundColor: WF_PAPER.clay,
    borderColor: WF_PAPER.clay,
  },
  visibilityLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: WF_PAPER.inkSecondary,
  },
  visibilityLabelActive: {
    color: WF_PAPER.card,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '800',
    color: WF_PAPER.inkSecondary,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.bg,
    borderRadius: 5,
    paddingHorizontal: 13,
    height: 46,
    fontSize: 13.5,
    color: WF_PAPER.inkPrimary,
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
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: WF_PAPER.clay,
    borderColor: WF_PAPER.clay,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_PAPER.inkSecondary,
  },
  chipTextActive: {
    color: WF_PAPER.card,
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
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: WF_PAPER.pillBg,
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
    borderRadius: 5,
    backgroundColor: 'rgba(30, 26, 21, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addThumb: {
    width: 84,
    height: 84,
    borderRadius: 5,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: WF_PAPER.clay,
    backgroundColor: WF_PAPER.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addThumbText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
  itineraryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    maxWidth: 220,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_PAPER.clayLight,
    backgroundColor: WF_PAPER.bg,
  },
  itineraryChipActive: {
    backgroundColor: WF_PAPER.clay,
    borderColor: WF_PAPER.clay,
  },
  itineraryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_PAPER.clayDark,
    flexShrink: 1,
  },
  itineraryChipTextActive: {
    color: WF_PAPER.card,
  },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    maxWidth: 220,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.card,
  },
  placeChipActive: {
    backgroundColor: WF_PAPER.clay,
    borderColor: WF_PAPER.clay,
  },
  placeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_PAPER.inkMuted,
    flexShrink: 1,
  },
  placeChipTextActive: {
    color: WF_PAPER.card,
  },
  footer: {
    paddingHorizontal: 14,
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
    borderRadius: 4,
    backgroundColor: WF_PAPER.clay,
  },
  submitText: {
    color: WF_PAPER.card,
    fontSize: 14.5,
    fontWeight: '800',
  },
  videoPreviewCard: {
    backgroundColor: WF_PAPER.pillBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    padding: 12,
    marginBottom: 14,
  },
  videoPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  videoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WF_PAPER.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoUrlText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
  },
  videoCloudBadge: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  videoPreviewActions: {
    flexDirection: 'row',
    gap: 10,
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    backgroundColor: WF_PAPER.card,
  },
  previewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_PAPER.inkPrimary,
  },
  videoLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: WF_PAPER.pillBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    padding: 14,
    marginBottom: 14,
  },
  videoLoadingText: {
    flex: 1,
    fontSize: 12,
    color: WF_PAPER.inkMuted,
    lineHeight: 18,
  },
  uploadVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: WF_PAPER.clayLight,
    borderStyle: 'dashed',
    backgroundColor: WF_PAPER.pillBg,
  },
  uploadVideoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: WF_PAPER.clay,
  },
});
