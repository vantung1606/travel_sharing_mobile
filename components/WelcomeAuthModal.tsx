import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
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
import { authApi } from '@/src/services/api';
import { UserSession } from '@/src/services/authStorage';

interface WelcomeAuthModalProps {
  visible: boolean;
  onLoginSuccess: (session: UserSession) => void;
  onContinueAsGuest?: () => void;
}

export function WelcomeAuthModal({
  visible,
  onLoginSuccess,
  onContinueAsGuest,
}: WelcomeAuthModalProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<'fullName' | 'email' | 'password' | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    if (mode === 'register' && !fullName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập Họ và tên để đăng ký thành viên.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const session = await authApi.login(email.trim(), password.trim());
        Alert.alert('Chào mừng trở lại! 🎉', `Đăng nhập thành công, xin chào ${session.fullName || session.email}!`);
        onLoginSuccess(session);
      } else {
        const session = await authApi.register(fullName.trim(), email.trim(), password.trim());
        Alert.alert('Đăng ký thành công! 🌟', 'Tài khoản Wayfare của bạn đã được khởi tạo.');
        onLoginSuccess(session);
      }
    } catch (err: any) {
      Alert.alert('Đăng nhập thất bại', err.response?.data?.message || err.message || 'Email hoặc mật khẩu không chính xác!');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '340055145050-thlfrv3nl1j1jcahh75n8inr8v5j4574.apps.googleusercontent.com';
      const redirectUri = Linking.createURL('oauth');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token%20id_token&scope=openid%20profile%20email&nonce=wayfare_${Date.now()}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success' && result.url) {
        const urlPart = result.url.includes('#') ? result.url.split('#')[1] : (result.url.split('?')[1] || '');
        const params = new URLSearchParams(urlPart);
        const token = params.get('id_token') || params.get('access_token');
        if (token) {
          const session = await authApi.loginWithGoogle(token);
          Alert.alert('Đăng nhập thành công! 🎉', `Chào mừng ${session.fullName} đến với Wayfare!`);
          onLoginSuccess(session);
          return;
        }
      }

      Alert.alert(
        'Đăng nhập Google',
        'Xác thực qua Google chưa hoàn tất hoặc trình duyệt đã đóng. Bạn có thể đăng nhập hoặc đăng ký tài khoản nhanh bằng Email & Mật khẩu ngay phía trên.'
      );
    } catch (err: any) {
      Alert.alert(
        'Đăng nhập Google',
        err.message || 'Không thể mở trình duyệt xác thực Google. Vui lòng sử dụng Đăng nhập bằng Email!'
      );
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
            {/* Mode Selector */}
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

            {/* Inputs */}
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

            {/* Primary Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, (loading || googleLoading) && styles.submitBtnDisabled]}
              activeOpacity={0.88}
              onPress={handleSubmit}
              disabled={loading || googleLoading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
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
                <ActivityIndicator color={WF_COLORS.primary} />
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
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
  },

  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },

  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  requiredMark: {
    color: '#E11D48',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperFocused: {
    borderColor: '#0284C7',
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  eyeBtn: {
    padding: 6,
  },

  submitBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    elevation: 3,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  submitBtnDisabled: {
    opacity: 0.75,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
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
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginHorizontal: 10,
    letterSpacing: 0.8,
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 48,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
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
    color: '#0284C7',
  },
});
