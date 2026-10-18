import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
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

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const LOGO_RATIO = 676 / 1732;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAVY = '#031726';

interface WelcomeAuthModalProps {
  visible: boolean;
  onLoginSuccess: (session: UserSession) => void;
  onContinueAsGuest?: () => void;
}

/** Ảnh nền hero xoay vòng — đồng bộ bộ ảnh banner của bản web. */
const HERO_SLIDES = [
  {
    id: 'sapa',
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80',
    title: 'Sa Pa · Mù Cang Chải',
    desc: 'Ruộng bậc thang xanh ngát giữa ngàn mây',
  },
  {
    id: 'hagiang',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    title: 'Hà Giang · Hẻm Tu Sản',
    desc: 'Sông Nho Quế xanh ngọc giữa đại ngàn hùng vĩ',
  },
  {
    id: 'phuquoc',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    title: 'Phú Quốc · Bãi Trường',
    desc: 'Hoàng hôn đỏ rực bên bờ biển đảo ngọc',
  },
];

/* ─────────────────────────────────────────────────────────────
 * Gradient dựng thủ công bằng các dải màu nội suy (không cần
 * thư viện native) để nút Đăng nhập có dải màu mượt như bản web.
 * ───────────────────────────────────────────────────────────── */
const GRADIENT_STOPS = ['#0EA5E9', '#0284C7', '#1D4ED8'];

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mixColor(from: string, to: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

function buildGradient(stops: string[], steps: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    const position = i / (steps - 1);
    const scaled = position * (stops.length - 1);
    const index = Math.min(stops.length - 2, Math.floor(scaled));
    out.push(mixColor(stops[index], stops[index + 1], scaled - index));
  }
  return out;
}

// 64 dải màu đủ mịn để mắt không nhận ra vạch nối, không cần thư viện gradient.
const SUBMIT_GRADIENT = buildGradient(GRADIENT_STOPS, 64);

interface StrengthInfo {
  score: number;
  label: string;
  color: string;
}

function evaluatePassword(password: string): StrengthInfo {
  if (!password) return { score: 0, label: '', color: WF_COLORS.slate200 };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const capped = Math.max(1, Math.min(4, score));
  if (capped === 1) return { score: 1, label: 'Yếu', color: WF_COLORS.rose };
  if (capped === 2) return { score: 2, label: 'Trung bình', color: WF_COLORS.amber };
  if (capped === 3) return { score: 3, label: 'Mạnh', color: WF_COLORS.emerald };
  return { score: 4, label: 'Rất mạnh', color: WF_COLORS.primary };
}

type FieldKey = 'fullName' | 'email' | 'password' | 'confirm';

interface AuthFieldProps {
  icon: string;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  error?: string;
  hint?: string;
  valid?: boolean;
  secureTextEntry?: boolean;
  secureVisible?: boolean;
  onToggleSecure?: () => void;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  autoComplete?: 'name' | 'email' | 'password' | 'new-password' | 'off';
  textContentType?: 'name' | 'emailAddress' | 'password' | 'newPassword';
  returnKeyType?: 'next' | 'done' | 'go';
}

/** Ô nhập liệu dạng viên thuốc kèm icon, trạng thái lỗi và dấu kiểm hợp lệ. */
function AuthField({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  focused,
  onFocus,
  onBlur,
  error,
  hint,
  valid,
  secureTextEntry,
  secureVisible,
  onToggleSecure,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  textContentType,
  returnKeyType,
}: AuthFieldProps) {
  const hasError = !!error;
  const showEye = secureTextEntry !== undefined;

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && !hasError && styles.fieldFocused,
          hasError && styles.fieldInvalid,
        ]}>
        <FontAwesome
          name={icon as any}
          size={15}
          color={hasError ? WF_COLORS.rose : focused ? WF_COLORS.primary : WF_COLORS.slate400}
          style={styles.fieldIcon}
        />
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={WF_COLORS.slate400}
          secureTextEntry={showEye ? !secureVisible : false}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          autoComplete={autoComplete}
          textContentType={textContentType}
          returnKeyType={returnKeyType}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {showEye ? (
          <TouchableOpacity
            onPress={onToggleSecure}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={secureVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
            <FontAwesome
              name={secureVisible ? 'eye-slash' : 'eye'}
              size={15}
              color={WF_COLORS.slate400}
            />
          </TouchableOpacity>
        ) : valid ? (
          <FontAwesome name="check-circle" size={15} color={WF_COLORS.emerald} />
        ) : null}
      </View>
      {hasError ? (
        <View style={styles.fieldMessageRow}>
          <FontAwesome name="exclamation-circle" size={11} color={WF_COLORS.rose} />
          <Text style={styles.fieldError}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function WelcomeAuthModal({ visible, onLoginSuccess, onContinueAsGuest }: WelcomeAuthModalProps) {
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<FieldKey | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── Hero carousel ─────────────────────────────────────────
  const opacities = useRef(HERO_SLIDES.map((_, index) => new Animated.Value(index === 0 ? 1 : 0))).current;
  const [slideIndex, setSlideIndex] = useState(0);
  const slideIndexRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    slideIndexRef.current = 0;
    setSlideIndex(0);
    opacities.forEach((value, index) => value.setValue(index === 0 ? 1 : 0));

    const timer = setInterval(() => {
      const next = (slideIndexRef.current + 1) % HERO_SLIDES.length;
      slideIndexRef.current = next;
      setSlideIndex(next);
      Animated.parallel(
        opacities.map((value, index) =>
          Animated.timing(value, {
            toValue: index === next ? 1 : 0,
            duration: 880,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          })
        )
      ).start();
    }, 4200);

    return () => clearInterval(timer);
  }, [visible, opacities]);

  const strength = useMemo(() => evaluatePassword(password), [password]);

  const clearFieldError = useCallback((key: FieldKey) => {
    setFormError(null);
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const switchMode = (next: 'login' | 'register') => {
    if (next === mode) return;
    setMode(next);
    setErrors({});
    setFormError(null);
    setFocusedField(null);
  };

  const validate = () => {
    const next: Partial<Record<FieldKey, string>> = {};

    if (mode === 'register') {
      const name = fullName.trim();
      if (!name) next.fullName = 'Vui lòng nhập họ và tên.';
      else if (name.length < 2) next.fullName = 'Họ và tên cần tối thiểu 2 ký tự.';
      else if (name.length > 100) next.fullName = 'Họ và tên tối đa 100 ký tự.';
    }

    const mail = email.trim();
    if (!mail) next.email = 'Vui lòng nhập địa chỉ email.';
    else if (!EMAIL_RE.test(mail)) next.email = 'Email chưa đúng định dạng.';

    if (!password) next.password = 'Vui lòng nhập mật khẩu.';
    else if (password.length < 6) next.password = 'Mật khẩu cần tối thiểu 6 ký tự.';

    if (mode === 'register') {
      if (!confirm) next.confirm = 'Vui lòng nhập lại mật khẩu.';
      else if (confirm !== password) next.confirm = 'Mật khẩu nhập lại chưa khớp.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        const session = await authApi.login(email.trim(), password.trim());
        Alert.alert(
          'Chào mừng trở lại! 🎉',
          `Đăng nhập thành công, xin chào ${session.fullName || session.email}!`
        );
        onLoginSuccess(session);
      } else {
        const session = await authApi.register(fullName.trim(), email.trim(), password.trim());
        Alert.alert('Đăng ký thành công! 🌟', 'Tài khoản Wayfare của bạn đã được khởi tạo.');
        onLoginSuccess(session);
      }
    } catch (err: any) {
      setFormError(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    setGoogleLoading(true);
    try {
      const googleClientId =
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
        '340055145050-thlfrv3nl1j1jcahh75n8inr8v5j4574.apps.googleusercontent.com';
      const redirectUri = Linking.createURL('oauth');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        googleClientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token%20id_token&scope=openid%20profile%20email&nonce=wayfare_${Date.now()}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success' && result.url) {
        const urlPart = result.url.includes('#')
          ? result.url.split('#')[1]
          : result.url.split('?')[1] || '';
        const params = new URLSearchParams(urlPart);
        const token = params.get('id_token') || params.get('access_token');
        if (token) {
          const session = await authApi.loginWithGoogle(token);
          Alert.alert('Đăng nhập thành công! 🎉', `Chào mừng ${session.fullName} đến với Wayfare!`);
          onLoginSuccess(session);
          return;
        }
      }

      setFormError(
        'Xác thực Google chưa hoàn tất hoặc trình duyệt đã bị đóng. Bạn vẫn có thể đăng nhập nhanh bằng Email & Mật khẩu phía trên.'
      );
    } catch (err: any) {
      setFormError(
        err?.message || 'Không thể mở trình duyệt xác thực Google. Vui lòng thử lại sau.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;
  const isRegister = mode === 'register';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onContinueAsGuest}>
      <View style={styles.root}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* ── HERO ─────────────────────────────────────────── */}
            <View style={styles.hero}>
              <View style={styles.heroImages}>
                {HERO_SLIDES.map((slide, index) => (
                  <Animated.Image
                    key={slide.id}
                    source={{ uri: slide.image }}
                    style={[styles.heroImage, { opacity: opacities[index] }]}
                    resizeMode="cover"
                  />
                ))}
              </View>
              <View style={styles.heroScrimTop} />
              <View style={styles.heroScrimBottom} />

              <View style={[styles.heroTop, { paddingTop: insets.top + 14 }]}>
                <Image
                  source={require('@/assets/images/wayfare-logo-white.png')}
                  style={styles.heroLogo}
                  resizeMode="contain"
                />
                {onContinueAsGuest ? (
                  <TouchableOpacity
                    style={styles.heroClose}
                    onPress={onContinueAsGuest}
                    activeOpacity={0.85}
                    accessibilityLabel="Đóng màn hình đăng nhập">
                    <FontAwesome name="times" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.heroBottom}>
                <Text style={styles.heroHeadline}>Hành trình bắt đầu từ đây</Text>
                <View style={styles.heroLocation}>
                  <FontAwesome name="map-marker" size={11} color={WF_COLORS.amber} />
                  <Text style={styles.heroLocationText} numberOfLines={1}>
                    {HERO_SLIDES[slideIndex].title}
                  </Text>
                </View>
                <View style={styles.heroDots}>
                  {HERO_SLIDES.map((slide, index) => (
                    <View
                      key={slide.id}
                      style={[styles.heroDot, index === slideIndex && styles.heroDotActive]}
                    />
                  ))}
                </View>
              </View>
            </View>

            {/* ── SHEET ────────────────────────────────────────── */}
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>
                {isRegister ? 'Tạo tài khoản mới' : 'Đăng nhập tài khoản'}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {isRegister
                  ? 'Chỉ mất vài giây để bắt đầu lưu giữ mọi hành trình của bạn.'
                  : 'Tiếp tục hành trình và kết nối cùng cộng đồng Wayfare.'}
              </Text>

              <View style={styles.modeTabs}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.modeTab, !isRegister && styles.modeTabActive]}
                  onPress={() => switchMode('login')}>
                  <Text style={[styles.modeTabText, !isRegister && styles.modeTabTextActive]}>
                    Đăng nhập
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.modeTab, isRegister && styles.modeTabActive]}
                  onPress={() => switchMode('register')}>
                  <Text style={[styles.modeTabText, isRegister && styles.modeTabTextActive]}>
                    Đăng ký mới
                  </Text>
                </TouchableOpacity>
              </View>

              {formError ? (
                <View style={styles.banner}>
                  <FontAwesome name="exclamation-circle" size={13} color={WF_COLORS.rose} />
                  <Text style={styles.bannerText}>{formError}</Text>
                </View>
              ) : null}

              {isRegister ? (
                <AuthField
                  icon="user-o"
                  label="Họ và tên"
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    clearFieldError('fullName');
                  }}
                  placeholder="Nguyễn Văn A"
                  focused={focusedField === 'fullName'}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  error={errors.fullName}
                  valid={fullName.trim().length >= 2}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                />
              ) : null}

              <AuthField
                icon="envelope-o"
                label="Email tài khoản"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearFieldError('email');
                }}
                placeholder="name@example.com"
                focused={focusedField === 'email'}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                error={errors.email}
                valid={EMAIL_RE.test(email.trim())}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
              />

              <AuthField
                icon="lock"
                label="Mật khẩu"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  clearFieldError('password');
                  if (errors.confirm) clearFieldError('confirm');
                }}
                placeholder="Tối thiểu 6 ký tự"
                focused={focusedField === 'password'}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                error={errors.password}
                secureTextEntry
                secureVisible={showPassword}
                onToggleSecure={() => setShowPassword((prev) => !prev)}
                autoComplete={isRegister ? 'new-password' : 'password'}
                textContentType={isRegister ? 'newPassword' : 'password'}
                returnKeyType={isRegister ? 'next' : 'go'}
              />

              {isRegister && password.length > 0 ? (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBars}>
                    {[0, 1, 2, 3].map((index) => (
                      <View
                        key={index}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor:
                              index < strength.score ? strength.color : WF_COLORS.slate200,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[styles.strengthText, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              ) : null}

              {isRegister ? (
                <AuthField
                  icon="lock"
                  label="Nhập lại mật khẩu"
                  value={confirm}
                  onChangeText={(text) => {
                    setConfirm(text);
                    clearFieldError('confirm');
                  }}
                  placeholder="Xác nhận lại mật khẩu"
                  focused={focusedField === 'confirm'}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  error={errors.confirm}
                  valid={confirm.length > 0 && confirm === password}
                  secureTextEntry
                  secureVisible={showConfirm}
                  onToggleSecure={() => setShowConfirm((prev) => !prev)}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                />
              ) : null}

              <TouchableOpacity
                style={[styles.submitBtn, busy && styles.submitBtnDisabled]}
                activeOpacity={0.9}
                onPress={handleSubmit}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}>
                <View style={styles.gradientFill} pointerEvents="none">
                  {SUBMIT_GRADIENT.map((color, index) => (
                    <View key={index} style={{ flex: 1, backgroundColor: color }} />
                  ))}
                </View>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>
                      {isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
                    </Text>
                    <FontAwesome name="arrow-right" size={13} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>HOẶC TIẾP TỤC VỚI</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={[styles.googleBtn, busy && styles.googleBtnDisabled]}
                activeOpacity={0.9}
                onPress={handleGoogleLogin}
                disabled={busy}>
                {googleLoading ? (
                  <ActivityIndicator color={WF_COLORS.primary} />
                ) : (
                  <>
                    <AntDesign name="google" size={17} color="#4285F4" />
                    <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {onContinueAsGuest ? (
                <TouchableOpacity
                  style={styles.guestBtn}
                  activeOpacity={0.85}
                  onPress={onContinueAsGuest}>
                  <FontAwesome name="compass" size={13} color={WF_COLORS.primary} />
                  <Text style={styles.guestBtnText}>Khám phá trước với tư cách Khách</Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.terms}>
                Bằng việc tiếp tục, bạn đồng ý với{' '}
                <Text style={styles.termsStrong}>Điều khoản dịch vụ</Text> và{' '}
                <Text style={styles.termsStrong}>Chính sách bảo mật</Text> của Wayfare.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: NAVY,
  },

  /* ── Hero ───────────────────────────────────────────────── */
  hero: {
    height: 296,
    overflow: 'hidden',
    justifyContent: 'space-between',
    backgroundColor: NAVY,
  },
  heroImages: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  heroScrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '52%',
    backgroundColor: 'rgba(3, 23, 38, 0.42)',
  },
  heroScrimBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '68%',
    backgroundColor: 'rgba(3, 23, 38, 0.72)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  heroLogo: {
    width: 124,
    height: 124 * LOGO_RATIO,
  },
  heroClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  heroBottom: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  heroHeadline: {
    fontFamily: SERIF_FONT,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '700',
    color: '#FFFFFF',
    maxWidth: 262,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  heroLocationText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 0.2,
  },
  heroDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  heroDotActive: {
    width: 20,
    backgroundColor: WF_COLORS.amber,
  },

  /* ── Sheet ──────────────────────────────────────────────── */
  sheet: {
    marginTop: -26,
    backgroundColor: WF_COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 30,
    flexGrow: 1,
  },
  sheetTitle: {
    fontFamily: SERIF_FONT,
    fontSize: 22,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: WF_COLORS.slate500,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
    paddingHorizontal: 6,
  },

  modeTabs: {
    flexDirection: 'row',
    backgroundColor: WF_COLORS.slate100,
    borderRadius: 999,
    padding: 4,
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  modeTabActive: {
    backgroundColor: WF_COLORS.white,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: WF_COLORS.slate500,
  },
  modeTabTextActive: {
    color: WF_COLORS.primary,
    fontWeight: '800',
  },

  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: WF_COLORS.roseLight,
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#9F1239',
    fontWeight: '600',
  },

  fieldGroup: {
    marginBottom: 15,
  },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: WF_COLORS.slate700,
    marginBottom: 7,
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
    paddingHorizontal: 16,
  },
  fieldFocused: {
    borderColor: WF_COLORS.primary,
    backgroundColor: WF_COLORS.white,
    shadowColor: WF_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldInvalid: {
    borderColor: WF_COLORS.rose,
    backgroundColor: '#FFF5F6',
  },
  fieldIcon: {
    marginRight: 11,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: WF_COLORS.slate900,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : null),
  },
  fieldMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    marginLeft: 6,
  },
  fieldError: {
    fontSize: 11,
    fontWeight: '700',
    color: WF_COLORS.rose,
  },
  fieldHint: {
    fontSize: 11,
    color: WF_COLORS.slate400,
    marginTop: 6,
    marginLeft: 6,
  },

  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -6,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '800',
    minWidth: 62,
    textAlign: 'right',
  },

  submitBtn: {
    height: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: WF_COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  gradientFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: WF_COLORS.slate200,
  },
  dividerText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: WF_COLORS.slate400,
    marginHorizontal: 10,
    letterSpacing: 1,
  },

  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
    borderRadius: 999,
    backgroundColor: WF_COLORS.white,
    borderWidth: 1.5,
    borderColor: WF_COLORS.slate200,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  googleBtnDisabled: {
    opacity: 0.6,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: WF_COLORS.slate700,
  },

  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 999,
    marginTop: 12,
    backgroundColor: WF_COLORS.primarySoft,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
  },
  guestBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },

  terms: {
    fontSize: 10.5,
    lineHeight: 16,
    color: WF_COLORS.slate400,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  termsStrong: {
    color: WF_COLORS.slate600,
    fontWeight: '700',
  },
});
