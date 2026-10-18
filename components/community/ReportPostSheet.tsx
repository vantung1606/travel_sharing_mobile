import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/Themed';
import { REPORT_REASONS } from '@/components/community/communityUtils';
import { WF_COLORS } from '@/constants/Colors';

interface ReportPostSheetProps {
  visible: boolean;
  postTitle?: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** Sheet báo cáo bài viết vi phạm (6 lý do + mô tả thêm). */
export function ReportPostSheet({ visible, postTitle, submitting, onClose, onSubmit }: ReportPostSheetProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setReason('');
      setDetails('');
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: anim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.kav}>
        <Animated.View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 14) + 8, transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Báo cáo bài viết</Text>
              {postTitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {postTitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome name="times" size={16} color={WF_COLORS.slate500} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Chọn lý do vi phạm</Text>
            <View style={styles.reasonList}>
            {REPORT_REASONS.map((item) => {
              const selected = reason === item;
              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.8}
                  style={[styles.reasonRow, selected && styles.reasonRowActive]}
                  onPress={() => setReason(item)}>
                  <FontAwesome
                    name={selected ? 'dot-circle-o' : 'circle-o'}
                    size={16}
                    color={selected ? WF_COLORS.primary : WF_COLORS.slate400}
                  />
                  <Text style={[styles.reasonText, selected && styles.reasonTextActive]}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={styles.detailsInput}
            placeholder="Mô tả thêm (không bắt buộc)..."
            placeholderTextColor={WF_COLORS.slate400}
            value={details}
            onChangeText={setDetails}
            multiline
          />
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.submitBtn, (!reason || submitting) && { opacity: 0.55 }]}
            disabled={!reason || submitting}
            onPress={() => onSubmit(reason, details.trim())}>
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Gửi báo cáo</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 55,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  kav: {
    width: '100%',
  },
  sheet: {
    backgroundColor: WF_COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  scroll: {
    flexShrink: 1,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: WF_COLORS.slate200,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  subtitle: {
    fontSize: 11.5,
    color: WF_COLORS.slate500,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: WF_COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate700,
    marginBottom: 6,
  },
  reasonList: {
    gap: 7,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
  },
  reasonRowActive: {
    borderColor: WF_COLORS.primary,
    backgroundColor: WF_COLORS.primarySoft,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: WF_COLORS.slate700,
    fontWeight: '600',
  },
  reasonTextActive: {
    color: WF_COLORS.primaryHover,
    fontWeight: '700',
  },
  detailsInput: {
    marginTop: 10,
    minHeight: 66,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
    paddingHorizontal: 12,
    paddingTop: 9,
    fontSize: 13,
    color: WF_COLORS.slate900,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 12,
    backgroundColor: WF_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
