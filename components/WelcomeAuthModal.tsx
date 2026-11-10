import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Text, TextInput } from '@/components/Themed';
import { SERIF_FONT } from '@/constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { WF_COLORS } from '@/constants/Colors';
import { ToastHost, showToast } from '@/components/Toast';
import { authApi } from '@/src/services/api';
import { UserSession } from '@/src/services/authStorage';
import { startGoogleSignIn } from '@/src/services/googleAuth';

interface WelcomeAuthModalProps {
  visible: boolean;
  onLoginSuccess: (session: UserSession, mode: 'login' | 'register' | 'google') => void;
  onContinueAsGuest?: () => void;
}

export type AuthMode = 'login' | 'register' | 'forgot_email' | 'forgot_otp' | 'forgot_password';

export function WelcomeAuthModal({
  visible,
  onLoginSuccess,
  onContinueAsGuest,
}: WelcomeAuthModalProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
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
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Mỗi lần mở lại form (sau khi đăng xuất hoặc bấm từ header) luôn trả về
  // đúng trạng thái ban đầu: tab Đăng nhập, ô nhập trống, mật khẩu đang ẩn.
  useEffect(() => {
    if (!visible) return;
    setMode('login');
    setFullName('');
    setEmail('');
    setPassword('');
    setForgotEmail('');
    setOtpCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowNewPassword(false);
    setFocusedField(null);
    setLoading(false);
    setGoogleLoading(false);
    setCountdown(0);
  }, [visible]);

  const handleSendOtp = async () => {
    if (!forgotEmail.trim()) {
      showToast({
        kind: 'error',
        title: 'Thiếu email',
        message: 'Vui lòng nhập địa chỉ email tài khoản của bạn.',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail.trim());
      setLoading(false);
      setMode('forgot_otp');
      setCountdown(60);
      showToast({
        kind: 'success',
        title: 'Đã gửi mã xác thực',
        message: 'Mã OTP 6 số đã được gửi về hộp thư email của bạn (vui lòng kiểm tra cả mục Spam).',
      });
    } catch (err: any) {
      setLoading(false);
      showToast({
        kind: 'error',
        title: 'Gửi mã thất bại',
        message: err?.message || 'Không thể gửi mã xác nhận. Vui lòng kiểm tra lại email.',
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      showToast({
        kind: 'error',
        title: 'Mã OTP chưa đủ',
        message: 'Vui lòng nhập đủ 6 chữ số mã OTP.',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(forgotEmail.trim(), otpCode.trim());
      setLoading(false);
      setResetToken(res.resetToken);
      setMode('forgot_password');
      showToast({
        kind: 'success',
        title: 'Xác thực thành công',
        message: 'Mã OTP chính xác. Vui lòng tạo mật khẩu mới.',
      });
    } catch (err: any) {
      setLoading(false);
      showToast({
        kind: 'error',
        title: 'Xác thực thất bại',
        message: err?.message || 'Mã OTP không chính xác hoặc đã hết hạn.',
      });
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      showToast({
        kind: 'error',
        title: 'Mật khẩu quá ngắn',
        message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.',
      });
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
    setLoading(true);
    try {
      await authApi.resetPassword(forgotEmail.trim(), resetToken, newPassword);
      setLoading(false);
      showToast({
        kind: 'success',
        title: 'Đổi mật khẩu thành công',
        message: 'Vui lòng đăng nhập với mật khẩu mới vừa tạo.',
      });
      setMode('login');
      setEmail(forgotEmail);
      setPassword('');
    } catch (err: any) {
      setLoading(false);
      showToast({
        kind: 'error',
        title: 'Thất bại',
        message: err?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.',
      });
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      showToast({
        kind: 'error',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập đầy đủ Email và Mật khẩu.',
      });
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

    setLoading(true);
    try {
      if (mode === 'login') {
        const session = await authApi.login(email.trim(), password.trim());
        onLoginSuccess(session, 'login');
      } else {
        const session = await authApi.register(fullName.trim(), email.trim(), password.trim());
        onLoginSuccess(session, 'register');
      }
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Đăng nhập thất bại',
        message:
          err.response?.data?.message ||
          err.message ||
          'Email hoặc mật khẩu không chính xác.',
        duration: 4200,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const user = await startGoogleSignIn();
      if (user) {
        onLoginSuccess(user, 'google');
        showToast({
          kind: 'success',
          title: 'Đăng nhập Google thành công',
          message: `Chào mừng ${user.fullName || user.email}!`,
        });
      }
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Đăng nhập Google thất bại',
        message:
          err.response?.data?.message ||
          err.message ||
          'Xác thực tài khoản Google không thành công.',
        duration: 4200,
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
          {/* Brand Header */}
          <View style={styles.brandHeader}>
            <Image
              source={require('@/assets/images/wayfare-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandSlogan}>
              Trải nghiệm du lịch thông minh, kết nối cộng đồng & lên kế hoạch hành trình
            </Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            {/* Mode Selector (Chỉ hiện khi ở login hoặc register) */}
            {mode === 'login' || mode === 'register' ? (
              <View style={styles.modeTabs}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
                  onPress={() => setMode('login')}>
                  <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>Đăng nhập</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}
                  onPress={() => setMode('register')}>
                  <Text style={[styles.modeTabText, mode === 'register' && styles.modeTabTextActive]}>Đăng ký mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setMode('login')}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}
                  activeOpacity={0.7}>
                  <FontAwesome name="arrow-left" size={13} color={WF_COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, color: WF_COLORS.primary, fontWeight: '700' }}>
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
                    ? 'Nhập email tài khoản để nhận mã OTP 6 số qua Resend.'
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
                      color={focusedField === 'forgotEmail' ? WF_COLORS.primary : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="name@example.com"
                      placeholderTextColor={WF_COLORS.slate400}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                      value={forgotEmail}
                      onChangeText={setForgotEmail}
                      onFocus={() => setFocusedField('forgotEmail')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  activeOpacity={0.88}
                  onPress={handleSendOtp}
                  disabled={loading}>
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
                      color={focusedField === 'otp' ? WF_COLORS.primary : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="• • • • • •"
                      placeholderTextColor={WF_COLORS.slate400}
                      keyboardType="number-pad"
                      maxLength={6}
                      style={[styles.input, { letterSpacing: 8, fontSize: 18, fontWeight: '800' }]}
                      value={otpCode}
                      onChangeText={(val) => setOtpCode(val.replace(/\D/g, ''))}
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <Text style={{ fontSize: 12, color: WF_COLORS.slate500 }}>Chưa nhận được mã?</Text>
                  {countdown > 0 ? (
                    <Text style={{ fontSize: 12, color: WF_COLORS.slate400, fontWeight: '600' }}>
                      Gửi lại sau ({countdown}s)
                    </Text>
                  ) : (
                    <TouchableOpacity onPress={handleSendOtp} disabled={loading} activeOpacity={0.7}>
                      <Text style={{ fontSize: 12, color: WF_COLORS.primary, fontWeight: '700' }}>
                        Gửi lại mã
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  activeOpacity={0.88}
                  onPress={handleVerifyOtp}
                  disabled={loading}>
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
                      color={focusedField === 'newPassword' ? WF_COLORS.primary : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="Nhập mật khẩu mới"
                      placeholderTextColor={WF_COLORS.slate400}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      onFocus={() => setFocusedField('newPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowNewPassword(!showNewPassword)}
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
                      color={focusedField === 'confirmPassword' ? WF_COLORS.primary : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="Nhập lại mật khẩu mới"
                      placeholderTextColor={WF_COLORS.slate400}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => setFocusedField('confirmPassword')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  activeOpacity={0.88}
                  onPress={handleResetPassword}
                  disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#FFFDF8" />
                  ) : (
                    <Text style={styles.submitBtnText}>Lưu mật khẩu mới & Đăng nhập</Text>
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
                        color={focusedField === 'fullName' ? WF_COLORS.primary : WF_COLORS.slate400}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="Nguyễn Văn A"
                        placeholderTextColor={WF_COLORS.slate400}
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        onFocus={() => setFocusedField('fullName')}
                        onBlur={() => setFocusedField(null)}
                        autoCapitalize="words"
                        autoComplete="name"
                        textContentType="name"
                        returnKeyType="next"
                      />
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Email tài khoản <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
                    <FontAwesome
                      name="envelope-o"
                      size={14}
                      color={focusedField === 'email' ? WF_COLORS.primary : WF_COLORS.slate400}
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
                      returnKeyType="next"
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
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
                      color={focusedField === 'password' ? WF_COLORS.primary : WF_COLORS.slate400}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder={mode === 'register' ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu của bạn'}
                      placeholderTextColor={WF_COLORS.slate400}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoComplete={mode === 'register' ? 'new-password' : 'password'}
                      textContentType={mode === 'register' ? 'newPassword' : 'password'}
                      returnKeyType="go"
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                      <FontAwesome name={showPassword ? 'eye-slash' : 'eye'} size={15} color={WF_COLORS.slate400} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Quên mật khẩu link */}
                {mode === 'login' && (
                  <View style={{ alignItems: 'flex-end', marginTop: -4, marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setMode('forgot_email');
                        setForgotEmail(email);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ fontSize: 12, color: WF_COLORS.primary, fontWeight: '700' }}>
                        Quên mật khẩu?
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Primary Submit Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, (loading || googleLoading) && styles.submitBtnDisabled]}
                  activeOpacity={0.88}
                  onPress={handleSubmit}
                  disabled={loading || googleLoading}>
                  {loading ? (
                    <ActivityIndicator color="#FFFDF8" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {mode === 'login' ? 'Đăng nhập vào Wayfare' : 'Khởi tạo tài khoản ngay'}
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
                  style={styles.googleBtn}
                  activeOpacity={0.88}
                  onPress={handleGoogleLogin}
                  disabled={loading || googleLoading}>
                  {googleLoading ? (
                    <View style={styles.googleBtnContent}>
                      <ActivityIndicator size="small" color={WF_COLORS.primary} style={styles.googleIcon} />
                      <Text style={[styles.googleBtnText, { color: WF_COLORS.primary }]}>Đang kết nối Google...</Text>
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
    backgroundColor: '#F8F4EC',
  },
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 160,
    height: 48,
    marginBottom: 8,
  },
  brandSlogan: {
    fontSize: 12,
    color: '#5A5146',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },

  card: {
    width: '100%',
    backgroundColor: '#FFFDF8',
    borderRadius: 6,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E4DACB',
    elevation: 0,
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3EDE2',
    borderRadius: 5,
    padding: 4,
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 5,
  },
  modeTabActive: {
    backgroundColor: '#FFFDF8',
    elevation: 0,
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5A5146',
  },
  modeTabTextActive: {
    color: '#1E1A15',
    fontWeight: '800',
  },

  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1A15',
    marginBottom: 6,
  },
  requiredMark: {
    color: '#E11D48',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F4EC',
    borderWidth: 1.5,
    borderColor: '#E4DACB',
    borderRadius: 5,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperFocused: {
    borderColor: '#B0522F',
    backgroundColor: '#FFFDF8',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1E1A15',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  eyeBtn: {
    padding: 6,
  },

  submitBtn: {
    backgroundColor: '#B0522F',
    borderRadius: 5,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    elevation: 0,
    shadowColor: '#B0522F',
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
    color: '#FFFDF8',
    letterSpacing: 0.3,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E4DACB',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A7F70',
    marginHorizontal: 10,
    letterSpacing: 0.8,
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
    borderWidth: 1.5,
    borderColor: '#E4DACB',
    borderRadius: 5,
    height: 48,
    elevation: 0,
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleIcon: {
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },

  guestBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 6,
  },
  guestBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B0522F',
  },
});
