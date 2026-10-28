import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { Text, TextInput } from '@/components/Themed';
import { showToast } from '@/components/Toast';
import { WF_COLORS, WF_PAPER } from '@/constants/Colors';
import { authApi } from '@/src/services/api';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangePasswordModal({
  visible,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const cur = currentPassword.trim();
    const np = newPassword.trim();
    const cp = confirmPassword.trim();

    if (!cur) {
      showToast({
        kind: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập mật khẩu hiện tại của bạn.',
      });
      return;
    }

    if (!np || np.length < 6) {
      showToast({
        kind: 'error',
        title: 'Mật khẩu không hợp lệ',
        message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.',
      });
      return;
    }

    if (np === cur) {
      showToast({
        kind: 'error',
        title: 'Trùng mật khẩu cũ',
        message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.',
      });
      return;
    }

    if (np !== cp) {
      showToast({
        kind: 'error',
        title: 'Xác nhận không khớp',
        message: 'Mật khẩu xác nhận phải trùng khớp với mật khẩu mới.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await authApi.changePassword(cur, np, cp);

      showToast({
        kind: 'success',
        title: 'Đổi mật khẩu thành công! 🔐',
        message: 'Mật khẩu tài khoản của bạn đã được cập nhật an toàn.',
      });

      resetForm();
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.';
      showToast({
        kind: 'error',
        title: 'Đổi mật khẩu thất bại',
        message: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <FontAwesome name="key" size={15} color={WF_COLORS.primary} />
              </View>
              <Text style={styles.title}>Đổi Mật Khẩu</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              disabled={submitting}
              style={styles.closeBtn}
              accessibilityLabel="Đóng">
              <FontAwesome name="times" size={16} color={WF_PAPER.inkMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Bảo mật tài khoản Wayfare của bạn. Mật khẩu mới cần có tối thiểu 6 ký tự.
          </Text>

          {/* Form */}
          <View style={styles.body}>
            {/* Current Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Mật khẩu hiện tại <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu đang dùng..."
                  placeholderTextColor={WF_PAPER.inkMuted}
                  secureTextEntry={!showCurrent}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  editable={!submitting}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowCurrent((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <FontAwesome
                    name={showCurrent ? 'eye' : 'eye-slash'}
                    size={15}
                    color={WF_PAPER.inkMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Mật khẩu mới <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Tối thiểu 6 ký tự..."
                  placeholderTextColor={WF_PAPER.inkMuted}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!submitting}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNew((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <FontAwesome
                    name={showNew ? 'eye' : 'eye-slash'}
                    size={15}
                    color={WF_PAPER.inkMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm New Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Xác nhận mật khẩu mới <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập lại mật khẩu mới..."
                  placeholderTextColor={WF_PAPER.inkMuted}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!submitting}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirm((v) => !v)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <FontAwesome
                    name={showConfirm ? 'eye' : 'eye-slash'}
                    size={15}
                    color={WF_PAPER.inkMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Footer actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleClose}
              disabled={submitting}
              activeOpacity={0.8}>
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFDF8" />
              ) : (
                <>
                  <FontAwesome name="check" size={13} color="#FFFDF8" style={{ marginRight: 6 }} />
                  <Text style={styles.submitText}>Cập nhật mật khẩu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 26, 21, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: WF_PAPER.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    padding: 20,
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: WF_PAPER.clayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: WF_PAPER.inkPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  subtitle: {
    fontSize: 12,
    color: WF_PAPER.inkMuted,
    lineHeight: 17,
    marginBottom: 16,
  },
  body: {
    gap: 12,
  },
  fieldGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_PAPER.inkSecondary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_PAPER.bg,
    borderWidth: 1,
    borderColor: WF_PAPER.cardBorder,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: WF_PAPER.inkPrimary,
    backgroundColor: 'transparent',
  },
  eyeBtn: {
    padding: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: WF_PAPER.pillBorder,
  },
  cancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 5,
    backgroundColor: WF_PAPER.pillBg,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: WF_PAPER.inkSecondary,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 5,
    backgroundColor: WF_COLORS.primary,
  },
  submitBtnDisabled: {
    opacity: 0.65,
  },
  submitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFDF8',
  },
});
