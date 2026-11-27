import FontAwesome from '@expo/vector-icons/FontAwesome';
import { isAxiosError } from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/Themed';
import { ToastHost, showToast } from '@/components/Toast';
import { DS_COLOR, DS_RADIUS, DS_SPACE, DS_TOUCH, DS_TYPE } from '@/constants/DesignSystem';
import { provinceApi, ProvinceItem } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';
import { normalizeVi } from '@/components/community/communityUtils';

type Region = 'all' | 'north' | 'central' | 'highlands' | 'south';

const REGION_LABELS: { id: Region; label: string }[] = [
  { id: 'all', label: 'Toàn quốc' },
  { id: 'north', label: 'Miền Bắc' },
  { id: 'central', label: 'Miền Trung' },
  { id: 'highlands', label: 'Tây Nguyên' },
  { id: 'south', label: 'Miền Nam' },
];

interface TravelFootprintSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function TravelFootprintSheet({ visible, onClose }: TravelFootprintSheetProps) {
  return visible ? <TravelFootprintContent onClose={onClose} /> : null;
}

function footprintError(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.';
  }
  return error instanceof Error ? error.message : 'Không thể cập nhật dấu chân du lịch.';
}

function TravelFootprintContent({ onClose }: Pick<TravelFootprintSheetProps, 'onClose'>) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const active = useRef(true);
  const requestVersion = useRef(0);
  const requestInFlight = useRef(false);
  const loadingInFlight = useRef(true);
  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [visited, setVisited] = useState<string[]>([]);
  const [region, setRegion] = useState<Region>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    loadingInFlight.current = true;
    const version = ++requestVersion.current;
    try {
      const [catalog, mine] = await Promise.all([
        provinceApi.getProvinces(),
        provinceApi.getMyVisited(),
      ]);
      if (!active.current || version !== requestVersion.current) return;
      setProvinces(catalog);
      setVisited(mine);
      setError(null);
    } catch (error: unknown) {
      if (active.current && version === requestVersion.current) setError(footprintError(error));
    } finally {
      if (active.current && version === requestVersion.current) {
        loadingInFlight.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    active.current = true;
    const unsubscribe = authStorage.subscribe(() => {
      active.current = false;
      requestVersion.current += 1;
      onClose();
    });
    void authStorage.getSession().then(session => {
      if (!active.current) return;
      if (session?.token) void load();
      else onClose();
    });
    return () => {
      active.current = false;
      requestVersion.current += 1;
      unsubscribe();
    };
  }, [load, onClose]);

  const retry = () => {
    if (requestInFlight.current || loadingInFlight.current || !active.current) return;
    loadingInFlight.current = true;
    setLoading(true);
    setError(null);
    void load();
  };

  const close = () => {
    active.current = false;
    requestVersion.current += 1;
    onClose();
  };

  const filtered = useMemo(() => {
    const normalized = normalizeVi(query);
    return provinces.filter((province) => {
      if (region !== 'all' && province.region !== region) return false;
      if (!normalized) return true;
      return [province.name, ...(province.aliases || [])].some(name => normalizeVi(name).includes(normalized));
    });
  }, [provinces, query, region]);

  const toggle = async (province: ProvinceItem) => {
    if (requestInFlight.current || loading || error || !active.current) return;
    requestInFlight.current = true;
    const nextVisited = !visited.includes(province.code);
    setPendingCode(province.code);
    try {
      const updated = await provinceApi.setVisited(province.code, nextVisited);
      if (!active.current) return;
      setVisited(updated);
      showToast({
        kind: 'success',
        title: nextVisited ? 'Đã lưu dấu chân' : 'Đã gỡ dấu chân',
        message: province.name,
      });
    } catch (error: unknown) {
      if (!active.current) return;
      showToast({
        kind: 'error',
        title: 'Cập nhật thất bại',
        message: footprintError(error),
      });
    } finally {
      requestInFlight.current = false;
      if (active.current) setPendingCode(null);
    }
  };

  const visitedCodes = new Set(visited);
  const visitedCount = provinces.filter(province => visitedCodes.has(province.code)).length;
  const progress = provinces.length ? Math.min(100, Math.round((visitedCount / provinces.length) * 100)) : 0;
  const regionItems = REGION_LABELS.map(item => {
    const items = provinces.filter(p => item.id === 'all' || p.region === item.id);
    return { ...item, total: items.length, visited: items.filter(p => visitedCodes.has(p.code)).length };
  });

  return (
    <Modal visible animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView style={[styles.overlay, { paddingTop: insets.top + 16 }]} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.heading}>Dấu chân du lịch</Text>
              <Text style={[styles.stateText, styles.headerSubtitle]}>Đánh dấu những tỉnh thành bạn đã ghé qua.</Text>
            </View>
            <TouchableOpacity onPress={close} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="Đóng dấu chân du lịch">
              <FontAwesome name="times" size={18} color={DS_COLOR.inkMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={[styles.container, { paddingHorizontal: width < 380 ? 12 : 20 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} accessibilityLabel="Danh sách dấu chân du lịch">
            {!loading && !error && (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <View>
                    <Text style={styles.progressValue}>{visitedCount}/{provinces.length}</Text>
                    <Text style={styles.progressLabel}>tỉnh thành đã ghé</Text>
                  </View>
                  <Text style={styles.progressPercent}>{progress}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
              </View>
            )}

            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm tỉnh, thành phố..."
              placeholderTextColor={DS_COLOR.inkMuted}
              accessibilityLabel="Tìm tỉnh thành"
              autoCorrect={false}
              editable={!loading && !error}
              autoCapitalize="none"
              returnKeyType="search"
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionRow}>
              {regionItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => setRegion(item.id)}
                  style={[styles.regionChip, region === item.id && styles.regionChipActive]}
                  accessibilityRole="radio"
                  disabled={loading || Boolean(error)}
                  accessibilityState={{ checked: region === item.id }}>
                  <Text style={[styles.regionText, region === item.id && styles.regionTextActive]}>
                    {item.label}{!loading && !error ? ` (${item.visited}/${item.total})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={DS_COLOR.accent} />
                <Text style={styles.stateText}>Đang tải danh mục tỉnh thành...</Text>
              </View>
            ) : error ? (
              <View style={styles.stateBox}>
                <FontAwesome name="exclamation-circle" size={28} color={DS_COLOR.danger} />
                <Text style={styles.stateText}>{error}</Text>
                <TouchableOpacity onPress={retry} style={styles.retryButton} accessibilityRole="button">
                  <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.stateBox}>
                <FontAwesome name="map-o" size={28} color={DS_COLOR.inkMuted} />
                <Text style={styles.stateText}>{provinces.length ? 'Không có tỉnh thành phù hợp.' : 'Chưa có danh mục tỉnh thành.'}</Text>
              </View>
            ) : (
              <View style={styles.provinceList}>
                {filtered.map((province) => {
                  const checked = visitedCodes.has(province.code);
                  const isPending = pendingCode === province.code;
                  return (
                    <TouchableOpacity
                      key={province.code}
                      onPress={() => toggle(province)}
                      disabled={Boolean(pendingCode)}
                      style={[styles.provinceRow, checked && styles.provinceRowVisited]}
                      accessibilityRole="checkbox"
                      activeOpacity={0.8}
                      accessibilityState={{ checked, disabled: Boolean(pendingCode) }}
                      accessibilityLabel={`${province.name}, ${checked ? 'đã ghé' : 'chưa đánh dấu'}`}>
                      <View style={[styles.pin, checked && styles.pinVisited]}>
                        <FontAwesome name={checked ? 'check' : 'map-marker'} size={14} color={checked ? DS_COLOR.surface : DS_COLOR.accent} />
                      </View>
                      <View style={styles.provinceText}>
                        <Text style={styles.provinceName}>{province.name}</Text>
                        <Text style={styles.provinceRegion}>{REGION_LABELS.find(region => region.id === province.region)?.label || 'Việt Nam'}</Text>
                      </View>
                      {isPending ? <ActivityIndicator size="small" color={DS_COLOR.accent} /> : <FontAwesome name={checked ? 'check-circle' : 'circle-o'} size={20} color={checked ? DS_COLOR.success : DS_COLOR.inkMuted} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <ToastHost />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.45)' },
  sheet: { width: '100%', maxWidth: 640, maxHeight: '100%', flexShrink: 1, backgroundColor: DS_COLOR.surface, borderTopLeftRadius: DS_RADIUS.sheet, borderTopRightRadius: DS_RADIUS.sheet },
  header: { flexDirection: 'row', alignItems: 'center', gap: DS_SPACE.sm, paddingHorizontal: DS_SPACE.lg, paddingVertical: DS_SPACE.md, borderBottomWidth: 1, borderBottomColor: DS_COLOR.line },
  headerText: { flex: 1, minWidth: 0, gap: DS_SPACE.xs },
  headerSubtitle: { textAlign: 'left' },
  heading: { fontSize: DS_TYPE.title, fontWeight: '800', color: DS_COLOR.ink },
  closeButton: { minWidth: DS_TOUCH, minHeight: DS_TOUCH, justifyContent: 'center', alignItems: 'center' },
  scroll: { flexShrink: 1 },
  container: { paddingVertical: DS_SPACE.lg },
  progressCard: { padding: DS_SPACE.lg, borderRadius: DS_RADIUS.lg, backgroundColor: DS_COLOR.accentSoft, marginBottom: DS_SPACE.md },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressValue: { fontSize: DS_TYPE.page, fontWeight: '900', color: DS_COLOR.ink },
  progressLabel: { marginTop: 2, fontSize: DS_TYPE.caption, color: DS_COLOR.inkMuted },
  progressPercent: { fontSize: DS_TYPE.title, fontWeight: '800', color: DS_COLOR.accentPressed },
  progressTrack: { height: 8, marginTop: DS_SPACE.md, borderRadius: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.8)' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: DS_COLOR.accent },
  search: { minHeight: DS_TOUCH, paddingHorizontal: DS_SPACE.md, borderWidth: 1, borderColor: DS_COLOR.line, borderRadius: DS_RADIUS.md, color: DS_COLOR.ink, backgroundColor: DS_COLOR.surface },
  regionRow: { gap: DS_SPACE.sm, paddingVertical: DS_SPACE.md },
  regionChip: { minHeight: DS_TOUCH, justifyContent: 'center', paddingHorizontal: DS_SPACE.md, borderWidth: 1, borderColor: DS_COLOR.line, borderRadius: DS_RADIUS.pill, backgroundColor: DS_COLOR.surfaceMuted },
  regionChipActive: { borderColor: DS_COLOR.accent, backgroundColor: DS_COLOR.accentSoft },
  regionText: { fontSize: DS_TYPE.caption, color: DS_COLOR.inkSecondary, fontWeight: '600' },
  regionTextActive: { color: DS_COLOR.accentPressed, fontWeight: '800' },
  provinceList: { gap: DS_SPACE.sm },
  provinceRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', padding: DS_SPACE.md, borderWidth: 1, borderColor: DS_COLOR.line, borderRadius: DS_RADIUS.md, backgroundColor: DS_COLOR.surface },
  provinceRowVisited: { borderColor: DS_COLOR.success, backgroundColor: DS_COLOR.successSoft },
  pin: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: DS_COLOR.accentSoft },
  pinVisited: { backgroundColor: DS_COLOR.success },
  provinceText: { flex: 1, minWidth: 0, marginHorizontal: DS_SPACE.md },
  provinceName: { fontSize: DS_TYPE.body, fontWeight: '700', color: DS_COLOR.ink },
  provinceRegion: { marginTop: 2, fontSize: DS_TYPE.caption, color: DS_COLOR.inkMuted },
  stateBox: { alignItems: 'center', justifyContent: 'center', gap: DS_SPACE.sm, paddingVertical: DS_SPACE.xxxl, paddingHorizontal: DS_SPACE.xl },
  stateText: { fontSize: DS_TYPE.meta, color: DS_COLOR.inkMuted, textAlign: 'center' },
  retryButton: { minHeight: DS_TOUCH, justifyContent: 'center', paddingHorizontal: DS_SPACE.lg, borderRadius: DS_RADIUS.pill, backgroundColor: DS_COLOR.accent },
  retryText: { fontSize: DS_TYPE.meta, color: DS_COLOR.surface, fontWeight: '700' },
});
