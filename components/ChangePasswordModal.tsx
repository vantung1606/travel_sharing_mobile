import FontAwesome from '@expo/vector-icons/FontAwesome';
import { isAxiosError } from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/Themed';
import { ToastHost, showToast } from '@/components/Toast';
import { DS_COLOR, DS_RADIUS, DS_SPACE, DS_TOUCH, DS_TYPE } from '@/constants/DesignSystem';
import { authApi } from '@/src/services/api';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Unmount the form on close so passwords and visibility toggles never carry over.
export function ChangePasswordModal({ visible, ...props }: ChangePasswordModalProps) {
  return visible ? <ChangePasswordForm {...props} /> : null;
}

function ChangePasswordForm({ onClose, onSuccess }: Omit<ChangePasswordModalProps, 'visible'>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shown, setShown] = useState({ current: false, next: false, confirm: false });
  const [submitting, setSubmitting] = useState(false);
  const requestInFlight = useRef(false);
  const active = useRef(true);
  const nextInput = useRef<React.ComponentRef<typeof NativeTextInput>>(null);
  const confirmInput = useRef<React.ComponentRef<typeof NativeTextInput>>(null);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const handleClose = () => {
    if (!requestInFlight.current) onClose();
  };

  const handleSubmit = async () => {
    if (requestInFlight.current) return;
    let message = '';
    if (!currentPassword.trim()) message = 'Vui lòng nhập mật khẩu hiện tại của bạn.';
    else if (newPassword.trim().length < 6) message = 'Mật khẩu mới phải có tối thiểu 6 ký tự.';
    // The backend trims the new password before storing it; reject a silent change.
    else if (newPassword !== newPassword.trim()) message = 'Mật khẩu mới không được bắt đầu hoặc kết thúc bằng khoảng trắng.';
    else if (newPassword !== confirmPassword) message = 'Xác nhận mật khẩu mới không trùng khớp.';
    else if (currentPassword === newPassword) message = 'Mật khẩu mới không được trùng với mật khẩu hiện tại.';
    if (message) {
      showToast({ kind: 'error', title: 'Kiểm tra mật khẩu', message });
      return;
    }
    requestInFlight.current = true;
    setSubmitting(true);
    try {
      // Preserve the exact current password, including any surrounding spaces.
      await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      if (!active.current) return;
      onSuccess?.();
      onClose();
      setTimeout(() => showToast({
        kind: 'success',
        title: 'Đổi mật khẩu thành công',
        message: 'Mật khẩu tài khoản của bạn đã được cập nhật.',
      }), 300);
    } catch (error: unknown) {
      if (!active.current) return;
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : error instanceof Error ? error.message : undefined;
      showToast({ kind: 'error', title: 'Đổi mật khẩu thất bại', message: message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra kết nối và thử lại.' });
    } finally {
      requestInFlight.current = false;
      if (active.current) setSubmitting(false);
    }
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: width < 380 ? 12 : 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={[styles.dialog, { padding: width < 380 ? 16 : 24 }]}>
            <View style={styles.header}>
              <FontAwesome name="key" size={18} color={DS_COLOR.accent} />
              <Text style={styles.title}>Đổi mật khẩu</Text>
              <TouchableOpacity onPress={handleClose} disabled={submitting} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Đóng form đổi mật khẩu">
                <FontAwesome name="times" size={18} color={DS_COLOR.inkMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>Nhập mật khẩu hiện tại và tạo mật khẩu mới có ít nhất 6 ký tự.</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Mật khẩu hiện tại <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu đang dùng"
                  placeholderTextColor={DS_COLOR.inkMuted}
                  secureTextEntry={!shown.current}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  editable={!submitting}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  accessibilityLabel="Mật khẩu hiện tại"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => nextInput.current?.focus()}
                />
                <TouchableOpacity style={styles.iconButton} disabled={submitting} onPress={() => setShown(s => ({ ...s, current: !s.current }))} accessibilityRole="button" accessibilityLabel={shown.current ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}>
                  <FontAwesome name={shown.current ? 'eye-slash' : 'eye'} size={16} color={DS_COLOR.inkMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Mật khẩu mới <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrap}>
                <TextInput
                  ref={nextInput}
                  style={styles.input}
                  placeholder="Tối thiểu 6 ký tự"
                  placeholderTextColor={DS_COLOR.inkMuted}
                  secureTextEntry={!shown.next}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!submitting}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  accessibilityLabel="Mật khẩu mới"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => confirmInput.current?.focus()}
                />
                <TouchableOpacity style={styles.iconButton} disabled={submitting} onPress={() => setShown(s => ({ ...s, next: !s.next }))} accessibilityRole="button" accessibilityLabel={shown.next ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}>
                  <FontAwesome name={shown.next ? 'eye-slash' : 'eye'} size={16} color={DS_COLOR.inkMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Xác nhận mật khẩu mới <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrap}>
                <TextInput
                  ref={confirmInput}
                  style={styles.input}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor={DS_COLOR.inkMuted}
                  secureTextEntry={!shown.confirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!submitting}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  accessibilityLabel="Xác nhận mật khẩu mới"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity style={styles.iconButton} disabled={submitting} onPress={() => setShown(s => ({ ...s, confirm: !s.confirm }))} accessibilityRole="button" accessibilityLabel={shown.confirm ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}>
                  <FontAwesome name={shown.confirm ? 'eye-slash' : 'eye'} size={16} color={DS_COLOR.inkMuted} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose} disabled={submitting} accessibilityRole="button">
                <Text style={styles.cancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, submitting && styles.disabled]} onPress={handleSubmit} disabled={submitting} accessibilityRole="button" accessibilityLabel="Cập nhật mật khẩu">
                {submitting ? <ActivityIndicator color={DS_COLOR.surface} /> : <Text style={styles.submitText}>Cập nhật mật khẩu</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ToastHost />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  dialog: { width: '100%', maxWidth: 480, backgroundColor: DS_COLOR.surface, borderRadius: DS_RADIUS.sheet, borderWidth: 1, borderColor: DS_COLOR.line },
  header: { flexDirection: 'row', alignItems: 'center', gap: DS_SPACE.sm, marginBottom: DS_SPACE.sm },
  title: { flex: 1, minWidth: 0, fontSize: DS_TYPE.title, fontWeight: '800', color: DS_COLOR.ink },
  subtitle: { fontSize: DS_TYPE.meta, color: DS_COLOR.inkMuted, lineHeight: 20, marginBottom: DS_SPACE.xl },
  field: { marginBottom: DS_SPACE.lg, gap: DS_SPACE.sm },
  label: { fontSize: DS_TYPE.meta, fontWeight: '700', color: DS_COLOR.inkSecondary },
  required: { color: DS_COLOR.danger },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: DS_COLOR.bg, borderWidth: 1, borderColor: DS_COLOR.line, borderRadius: DS_RADIUS.md, paddingLeft: DS_SPACE.md },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: DS_SPACE.md, fontSize: DS_TYPE.meta, color: DS_COLOR.ink },
  iconButton: { minWidth: DS_TOUCH, minHeight: DS_TOUCH, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', flexWrap: 'wrap', gap: DS_SPACE.sm, paddingTop: DS_SPACE.lg, borderTopWidth: 1, borderTopColor: DS_COLOR.line },
  cancelButton: { flexGrow: 1, flexBasis: 72, minHeight: DS_TOUCH, padding: DS_SPACE.md, alignItems: 'center', justifyContent: 'center', borderRadius: DS_RADIUS.pill, backgroundColor: DS_COLOR.surfaceMuted },
  submitButton: { flexGrow: 2, flexBasis: 160, minHeight: DS_TOUCH, padding: DS_SPACE.md, alignItems: 'center', justifyContent: 'center', borderRadius: DS_RADIUS.pill, backgroundColor: DS_COLOR.accentPressed },
  cancelText: { fontSize: DS_TYPE.meta, fontWeight: '600', textAlign: 'center', color: DS_COLOR.inkSecondary },
  submitText: { fontSize: DS_TYPE.meta, fontWeight: '700', textAlign: 'center', color: DS_COLOR.surface },
  disabled: { opacity: 0.65 },
});
