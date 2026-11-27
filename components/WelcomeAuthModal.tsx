import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput as NativeTextInput,
  useWindowDimensions,
} from 'react-native';
import { isAxiosError } from 'axios';
import { Text, TextInput } from '@/components/Themed';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import { WF_COLORS, WF_RADIUS } from '@/constants/Colors';
import { ToastHost, showToast } from '@/components/Toast';
import { authApi } from '@/src/services/api';
import { UserSession } from '@/src/services/authStorage';
import type { AuthEntryMode } from '@/src/services/authPrompt';
import { startGoogleSignIn } from '@/src/services/googleAuth';

interface WelcomeAuthModalProps {
  visible: boolean;
  initialMode?: AuthEntryMode;
  onLoginSuccess: (session: UserSession, mode: 'login' | 'register' | 'google') => void;
  onContinueAsGuest?: () => void;
}

export type AuthMode = AuthEntryMode | 'forgot_email' | 'forgot_otp' | 'forgot_password';

// Sky 700 keeps the web authentication palette readable on white.
const AUTH_ACCENT = '#0369A1';

const isValidEmail = (value: string) => value.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function authErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || (error.response ? fallback : 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.');
  }
  return error instanceof Error ? error.message : fallback;
}

export function WelcomeAuthModal({
  visible,
  initialMode = 'login',
  onLoginSuccess,
  onContinueAsGuest,
}: WelcomeAuthModalProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const requestInFlight = useRef(false);
  const emailInputRef = useRef<React.ComponentRef<typeof NativeTextInput>>(null);
  const passwordInputRef = useRef<React.ComponentRef<typeof NativeTextInput>>(null);
  const confirmPasswordInputRef = useRef<React.ComponentRef<typeof NativeTextInput>>(null);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const isBusy = loading || googleLoading;
  const [focusedField, setFocusedField] = useState<'fullName' | 'email' | 'password' | 'forgotEmail' | 'otp' | 'newPassword' | 'confirmPassword' | null>(null);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Mỗi lần mở lại form, chọn đúng tab được yêu cầu và xóa thông tin lần trước.
  useEffect(() => {
    if (!visible) return;
    // Reset the authentication form when this full-screen modal is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initialMode);
    setFullName('');
    setEmail('');
    setPassword('');
    setForgotEmail('');
    setOtpCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setRememberMe(true);
    setShowNewPassword(false);
    setFocusedField(null);
    setLoading(false);
    setGoogleLoading(false);
    setCountdown(0);
  }, [visible, initialMode]);

  const clearRecoveryForm = () => {
    setOtpCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setCountdown(0);
    setFocusedField(null);
  };

  const returnToLogin = () => {
    if (requestInFlight.current) return;
    clearRecoveryForm();
    setMode('login');
    setShowPassword(false);
  };

  const openPasswordRecovery = () => {
    if (requestInFlight.current) return;
    clearRecoveryForm();
    setForgotEmail(isValidEmail(email.trim()) ? email.trim() : '');
    setMode('forgot_email');
  };

  const handleRequestClose = () => {
    if (requestInFlight.current) return;
    if (mode.startsWith('forgot_')) {
      returnToLogin();
    } else {
      onContinueAsGuest?.();
    }
  };

  const handleSendOtp = async () => {
    if (requestInFlight.current || (mode !== 'forgot_email' && mode !== 'forgot_otp')) return;
    if (mode === 'forgot_otp' && countdown > 0) return;
    const normalizedEmail = forgotEmail.trim();
    if (!isValidEmail(normalizedEmail)) {
      showToast({
        kind: 'error',
        title: 'Email chưa hợp lệ',
        message: 'Vui lòng nhập email tài khoản đúng định dạng, tối đa 100 ký tự.',
      });
      return;
    }
    requestInFlight.current = true;
    setLoading(true);
    try {
      await authApi.forgotPassword(normalizedEmail);
      clearRecoveryForm();
      setForgotEmail(normalizedEmail);
      setMode('forgot_otp');
      setCountdown(60);
      showToast({
        kind: 'success',
        title: 'Đã gửi mã xác thực',
        message: 'Mã OTP 6 số đã được gửi về hộp thư email của bạn (vui lòng kiểm tra cả mục Spam).',
      });
    } catch (err: unknown) {
      showToast({
        kind: 'error',
        title: 'Gửi mã thất bại',
        message: authErrorMessage(err, 'Không thể gửi mã xác nhận. Vui lòng kiểm tra lại email.'),
      });
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (requestInFlight.current || mode !== 'forgot_otp') return;
    if (!/^\d{6}$/.test(otpCode)) {
      showToast({
        kind: 'error',
        title: 'Mã OTP chưa đủ',
        message: 'Vui lòng nhập đủ 6 chữ số mã OTP.',
      });
      return;
    }
    requestInFlight.current = true;
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(forgotEmail.trim(), otpCode.trim());
      if (!res.resetToken?.trim()) {
        throw new Error('Chưa nhận được mã đặt lại mật khẩu. Vui lòng xác thực OTP lại.');
      }
      setResetToken(res.resetToken);
      setMode('forgot_password');
      showToast({
        kind: 'success',
        title: 'Xác thực thành công',
        message: 'Mã OTP chính xác. Vui lòng tạo mật khẩu mới.',
      });
    } catch (err: unknown) {
      showToast({
        kind: 'error',
        title: 'Xác thực thất bại',
        message: authErrorMessage(err, 'Mã OTP không chính xác hoặc đã hết hạn.'),
      });
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (requestInFlight.current || mode !== 'forgot_password') return;
    if (!resetToken.trim()) {
      returnToLogin();
      showToast({ kind: 'error', title: 'Thiếu mã xác thực', message: 'Vui lòng thực hiện lại bước quên mật khẩu.' });
      return;
    }
    if (newPassword.trim().length < 6) {
      showToast({
        kind: 'error',
        title: 'Mật khẩu quá ngắn',
        message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.',
      });
      return;
    }
    // The reset-password endpoint trims passwords before storing them.
    if (newPassword !== newPassword.trim()) {
      showToast({ kind: 'error', title: 'Mật khẩu chưa hợp lệ', message: 'Mật khẩu mới không được bắt đầu hoặc kết thúc bằng khoảng trắng.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast({
        kind: 'error',
        title: 'Mật khẩu không khớp',
        message: 'Xác nhận mật khẩu mới không trùng khớp.',
      });
      return;
    }
    requestInFlight.current = true;
    setLoading(true);
    try {
      await authApi.resetPassword(forgotEmail.trim(), resetToken, newPassword);
      showToast({
        kind: 'success',
        title: 'Đổi mật khẩu thành công',
        message: 'Vui lòng đăng nhập với mật khẩu mới vừa tạo.',
      });
      setMode('login');
      setEmail(forgotEmail);
      setPassword('');
      setShowPassword(false);
      clearRecoveryForm();
    } catch (err: unknown) {
      showToast({
        kind: 'error',
        title: 'Thất bại',
        message: authErrorMessage(err, 'Không thể đặt lại mật khẩu. Vui lòng thử lại.'),
      });
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (requestInFlight.current || (mode !== 'login' && mode !== 'register')) return;
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password.trim()) {
      showToast({
        kind: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập đầy đủ Email và Mật khẩu.',
      });
      return;
    }
    if (normalizedEmail.length > 100 || (mode === 'register' && !isValidEmail(normalizedEmail))) {
      showToast({ kind: 'error', title: mode === 'register' ? 'Email chưa hợp lệ' : 'Tên đăng nhập quá dài', message: mode === 'register' ? 'Nhập địa chỉ email đúng định dạng, tối đa 100 ký tự.' : 'Tên đăng nhập tối đa 100 ký tự.' });
      return;
    }
    if (mode === 'register' && !fullName.trim()) {
      showToast({
        kind: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập Họ và tên để đăng ký thành viên.',
      });
      return;
    }
    if (mode === 'register' && (fullName.trim().length < 2 || fullName.trim().length > 100)) {
      showToast({ kind: 'error', title: 'Họ tên chưa hợp lệ', message: 'Họ tên cần từ 2 đến 100 ký tự.' });
      return;
    }
    if (mode === 'register' && (password.length < 6 || password.length > 100)) {
      showToast({ kind: 'error', title: 'Mật khẩu chưa hợp lệ', message: 'Mật khẩu cần từ 6 đến 100 ký tự.' });
      return;
    }

    requestInFlight.current = true;
    setLoading(true);
    try {
      if (mode === 'login') {
        const session = await authApi.login(normalizedEmail, password);
        onLoginSuccess(session, 'login');
      } else {
        const session = await authApi.register(fullName.trim(), normalizedEmail, password);
        onLoginSuccess(session, 'register');
      }
    } catch (err: unknown) {
      showToast({
        kind: 'error',
        title: mode === 'register' ? 'Đăng ký thất bại' : 'Đăng nhập thất bại',
        message: authErrorMessage(err, mode === 'register' ? 'Không thể tạo tài khoản. Vui lòng thử lại.' : 'Email hoặc mật khẩu không chính xác.'),
        duration: 4200,
      });
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setGoogleLoading(true);
    try {
      const user = await startGoogleSignIn();
      if (user) {
        onLoginSuccess(user, 'google');
      }
    } catch (err: unknown) {
      showToast({
        kind: 'error',
        title: 'Đăng nhập Google thất bại',
        message: authErrorMessage(err, 'Xác thực tài khoản Google không thành công.'),
        duration: 4200,
      });
    } finally {
      requestInFlight.current = false;
      setGoogleLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleRequestClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingHorizontal: isSmallScreen ? 12 : 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <Image
              source={require('@/assets/images/wayfare-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            {(mode === 'login' || mode === 'register') && (
              <Text style={styles.heading}>{mode === 'login' ? 'Đăng nhập tài khoản' : 'Đăng ký tài khoản'}</Text>
            )}
            <Text style={styles.brandSlogan}>
              Trải nghiệm du lịch thông minh, kết nối cộng đồng & lên kế hoạch hành trình
            </Text>
          </View>

          {/* Login Card */}
          <View style={[styles.card, { padding: isSmallScreen ? 16 : 22 }]}>
            {/* Mode Selector (Chỉ hiện khi ở login hoặc register) */}
            {mode === 'login' || mode === 'register' ? (
              <View style={styles.modeTabs}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
                  disabled={isBusy}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === 'login', disabled: isBusy }}
                  onPress={returnToLogin}>
                  <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>Đăng nhập</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}
                  disabled={isBusy}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: mode === 'register', disabled: isBusy }}
                  onPress={() => { setMode('register'); setShowPassword(false); setFocusedField(null); }}>
                  <Text style={[styles.modeTabText, mode === 'register' && styles.modeTabTextActive]}>Đăng ký</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={returnToLogin}
                  disabled={isBusy}
                  style={styles.backButton}
                  accessibilityRole="button"
                  activeOpacity={0.7}>
                  <FontAwesome name="arrow-left" size={13} color={AUTH_ACCENT} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, color: AUTH_ACCENT, fontWeight: '700' }}>
                    Quay lại đăng nhập
                  </Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '800', color: WF_COLORS.slate900, marginTop: 8 }}>
                  {mode === 'forgot_email'
                    ? 'Khôi phục mật khẩu'
                    : mode === 'forgot_otp'
                    ? 'Xác thực mã OTP'
                    : 'Thiết lập mật khẩu mới'}
                </Text>
                <Text style={{ fontSize: 12, color: WF_COLORS.slate500, marginTop: 4, lineHeight: 18 }}>
                  {mode === 'forgot_email'
                    ? 'Nhập email tài khoản để nhận mã xác thực gồm 6 chữ số.'
                    : mode === 'forgot_otp'
                    ? `Mã xác thực 6 số đã được gửi đến ${forgotEmail}.`
                    : 'Mã OTP hợp lệ. Vui lòng tạo mật khẩu mới (tối thiểu 6 ký tự).'}
                </Text>
              </View>
            )}

            {/* BƯỚC QUÊN MẬT KHẨU 1: NHẬP EMAIL */}
            {mode === 'forgot_email' && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Email tài khoản <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={[styles.inputWrapper, focusedField === 'forgotEmail' && styles.inputWrapperFocused]}>
                    <FontAwesome
                      name="envelope-o"
                      size={14}
                      color={focusedField === 'forgotEmail' ? AUTH_ACCENT : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="name@example.com"
                      placeholderTextColor={WF_COLORS.slate400}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="send"
                      onSubmitEditing={handleSendOtp}
                      editable={!isBusy}
                      maxLength={100}
                      accessibilityLabel="Email khôi phục tài khoản, bắt buộc"
                      style={styles.input}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      onFocus={() => setFocusedField('forgotEmail')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, isBusy && styles.submitBtnDisabled]}
                  activeOpacity={0.88}
                  onPress={handleSendOtp}
                  accessibilityRole="button"
                  disabled={isBusy}>
                  {loading ? (
                    <ActivityIndicator color="#FFFDF8" />
                  ) : (
                    <Text style={styles.submitBtnText}>Gửi mã OTP xác nhận</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* BƯỚC QUÊN MẬT KHẨU 2: NHẬP MÃ OTP */}
            {mode === 'forgot_otp' && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Mã xác thực 6 số <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={[styles.inputWrapper, focusedField === 'otp' && styles.inputWrapperFocused]}>
                    <FontAwesome
                      name="key"
                      size={14}
                      color={focusedField === 'otp' ? AUTH_ACCENT : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="• • • • • •"
                      placeholderTextColor={WF_COLORS.slate400}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoComplete="one-time-code"
                      textContentType="oneTimeCode"
                      returnKeyType="done"
                      onSubmitEditing={handleVerifyOtp}
                      editable={!isBusy}
                      accessibilityLabel="Mã xác thực gồm 6 chữ số, bắt buộc"
                      style={[styles.input, { letterSpacing: 8, fontSize: 18, fontWeight: '800' }]}
                      value={otpCode}
                      onChangeText={(val) => setOtpCode(val.replace(/\D/g, ''))}
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={styles.resendRow}>
                  <Text style={{ fontSize: 12, color: WF_COLORS.slate500 }}>Chưa nhận được mã?</Text>
                  {countdown > 0 ? (
                    <Text style={{ fontSize: 12, color: WF_COLORS.slate400, fontWeight: '600' }}>
                      Gửi lại sau ({countdown}s)
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOtp} disabled={isBusy} activeOpacity={0.7} style={styles.textButton} accessibilityRole="button">
                      <Text style={{ fontSize: 12, color: AUTH_ACCENT, fontWeight: '700' }}>
                        Gửi lại mã
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, isBusy && styles.submitBtnDisabled]}
                  activeOpacity={0.88}
                  onPress={handleVerifyOtp}
                  accessibilityRole="button"
                  disabled={isBusy}>
                  {loading ? (
                    <ActivityIndicator color="#FFFDF8" />
                  ) : (
                    <Text style={styles.submitBtnText}>Xác thực mã OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* BƯỚC QUÊN MẬT KHẨU 3: ĐẶT MẬT KHẨU MỚI */}
            {mode === 'forgot_password' && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Mật khẩu mới (tối thiểu 6 ký tự) <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={[styles.inputWrapper, focusedField === 'newPassword' && styles.inputWrapperFocused]}>
                    <FontAwesome
                      name="lock"
                      size={16}
                      color={focusedField === 'newPassword' ? AUTH_ACCENT : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="Nhập mật khẩu mới"
                      placeholderTextColor={WF_COLORS.slate400}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                      editable={!isBusy}
                      accessibilityLabel="Mật khẩu mới, tối thiểu 6 ký tự"
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      onFocus={() => setFocusedField('newPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      disabled={isBusy}
                      accessibilityRole="button"
                      accessibilityLabel={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                      style={styles.eyeBtn}>
                      <FontAwesome name={showNewPassword ? 'eye-slash' : 'eye'} size={15} color={WF_COLORS.slate400} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Xác nhận lại mật khẩu mới <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={[styles.inputWrapper, focusedField === 'confirmPassword' && styles.inputWrapperFocused]}>
                    <FontAwesome
                      name="check-circle-o"
                      size={16}
                      color={focusedField === 'confirmPassword' ? AUTH_ACCENT : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={confirmPasswordInputRef}
                      placeholder="Nhập lại mật khẩu mới"
                      placeholderTextColor={WF_COLORS.slate400}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={handleResetPassword}
                      editable={!isBusy}
                      accessibilityLabel="Xác nhận mật khẩu mới, bắt buộc"
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, isBusy && styles.submitBtnDisabled]}
                  activeOpacity={0.88}
                  onPress={handleResetPassword}
                  accessibilityRole="button"
                  disabled={isBusy}>
                  {loading ? (
                    <ActivityIndicator color="#FFFDF8" />
                  ) : (
                    <Text style={styles.submitBtnText}>Lưu mật khẩu mới</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Inputs (Đăng nhập / Đăng ký thông thường) */}
            {(mode === 'login' || mode === 'register') && (
              <>
                {mode === 'register' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Họ và tên <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <View style={[styles.inputWrapper, focusedField === 'fullName' && styles.inputWrapperFocused]}>
                      <FontAwesome
                        name="user-o"
                        size={15}
                        color={focusedField === 'fullName' ? AUTH_ACCENT : WF_COLORS.slate400}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="Nguyễn Văn A"
                        placeholderTextColor={WF_COLORS.slate400}
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        maxLength={100}
                        accessibilityLabel="Họ và tên, bắt buộc"
                        onFocus={() => setFocusedField('fullName')}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="words"
                        autoComplete="name"
                        textContentType="name"
                        returnKeyType="next"
                        submitBehavior="submit"
                        onSubmitEditing={() => emailInputRef.current?.focus()}
                        editable={!isBusy}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {mode === 'login' ? 'Email hoặc tên đăng nhập' : 'Email tài khoản'} <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
                    <FontAwesome
                      name="envelope-o"
                      size={14}
                      color={focusedField === 'email' ? AUTH_ACCENT : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={emailInputRef}
                      placeholder={mode === 'login' ? 'Email hoặc tên đăng nhập' : 'name@example.com'}
                      placeholderTextColor={WF_COLORS.slate400}
                      keyboardType={mode === 'login' ? 'default' : 'email-address'}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete={mode === 'login' ? 'username' : 'email'}
                      textContentType={mode === 'login' ? 'username' : 'emailAddress'}
                      returnKeyType="next"
                      submitBehavior="submit"
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                      editable={!isBusy}
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      maxLength={100}
                      accessibilityLabel={mode === 'login' ? 'Email hoặc tên đăng nhập' : 'Email, bắt buộc'}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Mật khẩu bảo mật <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={[styles.inputWrapper, focusedField === 'password' && styles.inputWrapperFocused]}>
                    <FontAwesome
                      name="lock"
                      size={16}
                      color={focusedField === 'password' ? AUTH_ACCENT : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      ref={passwordInputRef}
                      placeholder={mode === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu của bạn'}
                      placeholderTextColor={WF_COLORS.slate400}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete={mode === 'register' ? 'new-password' : 'password'}
                      textContentType={mode === 'register' ? 'newPassword' : 'password'}
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit}
                      editable={!isBusy}
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      maxLength={mode === 'register' ? 100 : undefined}
                      accessibilityLabel="Mật khẩu, bắt buộc"
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={isBusy}
                      style={styles.eyeBtn}
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                      <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={15} color={WF_COLORS.slate400} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Quên mật khẩu link */}
                {mode === 'login' && (
                  <View style={styles.loginOptions}>
                    <TouchableOpacity
                      onPress={() => setRememberMe((value) => !value)}
                      disabled={isBusy}
                      activeOpacity={0.75}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: rememberMe }}
                      accessibilityLabel="Nhớ mật khẩu">
                      <View style={styles.rememberContent}>
                        <FontAwesome name={rememberMe ? 'check-square' : 'square-o'} size={16} color={rememberMe ? AUTH_ACCENT : WF_COLORS.slate400} />
                        <Text style={{ fontSize: 12, color: WF_COLORS.slate700 }}>Nhớ mật khẩu</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={openPasswordRecovery}
                      accessibilityRole="button"
                      disabled={isBusy}
                      style={styles.textButton}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ fontSize: 12, color: AUTH_ACCENT, fontWeight: '700' }}>
                        Quên mật khẩu?
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Primary Submit Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, isBusy && styles.submitBtnDisabled]}
                  activeOpacity={0.88}
                  onPress={handleSubmit}
                  accessibilityRole="button"
                  disabled={isBusy}>
                  {loading ? (
                    <ActivityIndicator color="#FFFDF8" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>HOẶC TIẾP TỤC VỚI</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* GOOGLE SIGN IN BUTTON */}
                <TouchableOpacity
                  style={[styles.googleBtn, isBusy && styles.submitBtnDisabled]}
                  activeOpacity={0.88}
                  onPress={handleGoogleLogin}
                  accessibilityRole="button"
                  disabled={isBusy}>
                  {googleLoading ? (
                    <View style={styles.googleBtnContent}>
                      <ActivityIndicator size="small" color={AUTH_ACCENT} style={styles.googleIcon} />
                      <Text style={[styles.googleBtnText, { color: AUTH_ACCENT }]}>Đang kết nối Google...</Text>
                    </View>
                  ) : (
                    <View style={styles.googleBtnContent}>
                      <AntDesign name="google" size={18} color="#4285F4" style={styles.googleIcon} />
                      <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Continue as Guest option */}
                {onContinueAsGuest && (
                  <TouchableOpacity
                    style={styles.guestBtn}
                    activeOpacity={0.7}
                    disabled={isBusy}
                    accessibilityRole="button"
                    onPress={onContinueAsGuest}>
                    <Text style={styles.guestBtnText}>Khám phá trước với tư cách Khách →</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast đặt ngay trong modal để thông báo không bị lớp phủ của modal che.
          Chỉ nhận hiển thị khi modal đang mở (visible). */}
      <ToastHost enabled={visible} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WF_COLORS.slate50,
  },
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  brandHeader: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 160,
    height: 48,
    marginBottom: 8,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    textAlign: 'center',
    marginBottom: 8,
  },
  brandSlogan: {
    fontSize: 12,
    color: WF_COLORS.slate500,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },

  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: WF_COLORS.white,
    borderRadius: WF_RADIUS.cardLg,
    padding: 22,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    elevation: 0,
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: WF_COLORS.slate100,
    borderRadius: WF_RADIUS.pill,
    padding: 4,
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: WF_RADIUS.pill,
  },
  modeTabActive: {
    backgroundColor: WF_COLORS.white,
    elevation: 0,
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: WF_COLORS.slate500,
  },
  modeTabTextActive: {
    color: WF_COLORS.slate900,
    fontWeight: '800',
  },

  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    marginBottom: 6,
  },
  requiredMark: {
    color: WF_COLORS.rose,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.white,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    borderRadius: WF_RADIUS.pill,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputWrapperFocused: {
    borderColor: AUTH_ACCENT,
    backgroundColor: WF_COLORS.white,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: WF_COLORS.slate900,
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  eyeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  loginOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    marginTop: -4,
    marginBottom: 12,
  },
  rememberContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
  },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },

  submitBtn: {
    backgroundColor: AUTH_ACCENT,
    borderRadius: WF_RADIUS.pill,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    elevation: 0,
    shadowColor: AUTH_ACCENT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  submitBtnDisabled: {
    opacity: 0.75,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: WF_COLORS.white,
    letterSpacing: 0.3,
    textAlign: 'center',
    flexShrink: 1,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: WF_COLORS.slate200,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: WF_COLORS.slate500,
    marginHorizontal: 10,
    letterSpacing: 0.8,
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_COLORS.white,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    borderRadius: WF_RADIUS.pill,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    elevation: 0,
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
  },
  googleBtnContent: {
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleBtnText: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: WF_COLORS.slate700,
  },

  guestBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 16,
    paddingVertical: 6,
  },
  guestBtnText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: AUTH_ACCENT,
  },
});
