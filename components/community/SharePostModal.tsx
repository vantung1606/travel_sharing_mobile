import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Share,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/Themed';
import { showToast } from '@/components/Toast';
import { DS_COLOR, DS_RADIUS, DS_SPACE, DS_TYPE } from '@/constants/DesignSystem';
import { postApi, PostItem } from '@/src/services/api';
import { authPrompt } from '@/src/services/authPrompt';
import { UserSession } from '@/src/services/authStorage';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

type Visibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

interface SharePostModalProps {
  visible: boolean;
  post: PostItem | null;
  session: UserSession | null;
  onClose: () => void;
  onPostShared?: (newPost: PostItem) => void;
}

export function SharePostModal({
  visible,
  post,
  session,
  onClose,
  onPostShared,
}: SharePostModalProps) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setCaption('');
      setVisibility('PUBLIC');
      setSubmitting(false);
      setCopied(false);
      Animated.timing(anim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    } else if (mounted) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => setMounted(false));
    }
  }, [visible, mounted, anim]);

  if (!mounted || !post) return null;

  const originalAuthor = post.sharedPost ? post.sharedPost.authorName : post.authorName;
  const originalTitle = post.sharedPost ? post.sharedPost.title : post.title;
  const originalContent = post.sharedPost ? post.sharedPost.content : post.content;
  const originalThumbnail =
    (post.sharedPost ? post.sharedPost.imageUrl || post.sharedPost.coverImage : post.imageUrl || post.coverImage) ||
    (post.images && post.images.length > 0 ? post.images[0] : null);

  const shareUrl = `https://wayfare.vn/community?postId=${post.id}`;

  const handleShareToFeed = async () => {
    if (!session) {
      authPrompt.open();
      return;
    }

    try {
      setSubmitting(true);
      Keyboard.dismiss();

      const titleText = caption.trim()
        ? caption.trim().length > 60
          ? caption.trim().substring(0, 57) + '...'
          : caption.trim()
        : `Chia sẻ bài viết của ${post.authorName || 'thành viên'}`;

      const contentText = caption.trim() || 'Chia sẻ bài viết này cùng mọi người!';

      const newPost = await postApi.createPost({
        title: titleText,
        content: contentText,
        sharedPostId: post.id,
        category: post.category || 'Phượt & Khám phá',
        locationTag: post.locationTag || '',
        visibility,
      });

      showToast({
        kind: 'success',
        title: 'Đã chia sẻ thành công',
        message: 'Bài viết đã được đăng lên Bảng tin của bạn! ✨',
        icon: 'share-alt',
      });

      if (onPostShared) {
        onPostShared(newPost);
      }
      onClose();
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Chia sẻ thất bại',
        message: err?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      setCopied(true);
      showToast({
        kind: 'success',
        title: 'Đã sao chép liên kết',
        message: 'Liên kết bài viết đã được lưu vào bộ nhớ tạm! 📋',
        icon: 'copy',
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast({
        kind: 'error',
        title: 'Không thể sao chép',
        message: 'Vui lòng thử lại sau.',
      });
    }
  };

  const handleNativeShare = async () => {
    try {
      onClose();
      await Share.share({
        title: post.title || 'Wayfare Travel',
        message: `${post.title ? `${post.title}\n` : ''}${(post.content || '').slice(0, 160)}\n\n— Khám phá trên Wayfare: ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // User cancelled
    }
  };

  const toggleVisibility = () => {
    if (visibility === 'PUBLIC') setVisibility('FRIENDS');
    else if (visibility === 'FRIENDS') setVisibility('PRIVATE');
    else setVisibility('PUBLIC');
  };

  const visibilityInfo = {
    PUBLIC: { label: 'Công khai', icon: 'globe' as const },
    FRIENDS: { label: 'Bạn bè', icon: 'users' as const },
    PRIVATE: { label: 'Chỉ mình tôi', icon: 'lock' as const },
  }[visibility];

  const backdropOpacity = anim;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetContainer,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 6,
              transform: [{ translateY }],
            },
          ]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Chia sẻ bài viết</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Đóng">
              <FontAwesome name="times" size={17} color={DS_COLOR.inkMuted} />
            </TouchableOpacity>
          </View>

          {/* Repost Author Header */}
          <View style={styles.authorRow}>
            <Image
              source={{ uri: session?.avatarUrl || FALLBACK_AVATAR }}
              style={styles.authorAvatar}
            />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName} numberOfLines={1}>
                {session?.fullName || 'Bạn'}
              </Text>
              <TouchableOpacity
                style={styles.privacyPill}
                activeOpacity={0.75}
                onPress={toggleVisibility}
                accessibilityLabel="Đổi quyền riêng tư">
                <FontAwesome name={visibilityInfo.icon} size={11} color={DS_COLOR.inkSecondary} />
                <Text style={styles.privacyText}>{visibilityInfo.label}</Text>
                <FontAwesome name="chevron-down" size={9} color={DS_COLOR.inkMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Caption Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.captionInput}
              placeholder="Bạn nghĩ gì về chuyến đi này? (Không bắt buộc)..."
              placeholderTextColor={DS_COLOR.inkMuted}
              multiline
              maxLength={280}
              value={caption}
              onChangeText={setCaption}
              textAlignVertical="top"
            />
            <Text style={styles.charCounter}>{caption.length}/280</Text>
          </View>

          {/* Snippet Card Preview bài viết gốc */}
          <View style={styles.previewCard}>
            {originalThumbnail ? (
              <Image source={{ uri: originalThumbnail }} style={styles.previewThumb} />
            ) : null}
            <View style={styles.previewBody}>
              <Text style={styles.previewAuthor} numberOfLines={1}>
                {originalAuthor || 'Thành viên Wayfare'}
              </Text>
              {originalTitle ? (
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {originalTitle}
                </Text>
              ) : null}
              <Text style={styles.previewSnippet} numberOfLines={2}>
                {originalContent || 'Không có mô tả chi tiết.'}
              </Text>
            </View>
          </View>

          {/* Primary Action: Đăng lên Bảng tin */}
          <TouchableOpacity
            style={[styles.repostBtn, submitting && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleShareToFeed}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FontAwesome name="paper-plane" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.repostBtnText}>Chia sẻ ngay lên Bảng tin</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>HOẶC CHIA SẺ QUA</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Quick Actions Row */}
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              activeOpacity={0.75}
              onPress={handleCopyLink}
              accessibilityLabel="Sao chép liên kết">
              <View style={[styles.quickIconCircle, copied && { backgroundColor: DS_COLOR.successSoft }]}>
                <FontAwesome
                  name={copied ? 'check' : 'copy'}
                  size={16}
                  color={copied ? DS_COLOR.success : DS_COLOR.inkSecondary}
                />
              </View>
              <Text style={styles.quickActionLabel}>{copied ? 'Đã chép' : 'Sao chép link'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              activeOpacity={0.75}
              onPress={handleNativeShare}
              accessibilityLabel="Chia sẻ ra các ứng dụng khác">
              <View style={styles.quickIconCircle}>
                <FontAwesome name="share-alt" size={16} color={DS_COLOR.accent} />
              </View>
              <Text style={styles.quickActionLabel}>Ứng dụng khác</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  sheetContainer: {
    backgroundColor: DS_COLOR.surface,
    borderTopLeftRadius: DS_RADIUS.sheet,
    borderTopRightRadius: DS_RADIUS.sheet,
    paddingHorizontal: DS_SPACE.lg,
    paddingTop: DS_SPACE.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: DS_COLOR.line,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DS_COLOR.ink,
  },
  closeBtn: {
    padding: 6,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  authorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: DS_COLOR.surfaceMuted,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginBottom: 2,
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: DS_COLOR.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: DS_RADIUS.pill,
    alignSelf: 'flex-start',
  },
  privacyText: {
    fontSize: 11,
    fontWeight: '600',
    color: DS_COLOR.inkSecondary,
  },
  inputContainer: {
    backgroundColor: DS_COLOR.surfaceMuted,
    borderRadius: DS_RADIUS.md,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    marginBottom: 12,
  },
  captionInput: {
    fontSize: DS_TYPE.body,
    color: DS_COLOR.ink,
    minHeight: 52,
    maxHeight: 100,
    padding: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  charCounter: {
    fontSize: 10.5,
    color: DS_COLOR.inkMuted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: DS_RADIUS.md,
    padding: 9,
    marginBottom: 14,
    gap: 10,
  },
  previewThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: DS_COLOR.surfaceMuted,
  },
  previewBody: {
    flex: 1,
  },
  previewAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: DS_COLOR.accent,
    marginBottom: 2,
  },
  previewTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: DS_COLOR.ink,
    marginBottom: 2,
  },
  previewSnippet: {
    fontSize: 11.5,
    lineHeight: 16,
    color: DS_COLOR.inkSecondary,
  },
  repostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS_COLOR.accent,
    height: 44,
    borderRadius: DS_RADIUS.md,
    marginBottom: 14,
  },
  repostBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: DS_COLOR.line,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: DS_COLOR.inkMuted,
    paddingHorizontal: 10,
    letterSpacing: 0.5,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: 6,
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS_COLOR.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: DS_COLOR.inkSecondary,
  },
});

