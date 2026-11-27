import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  ChatMessage,
  itineraryApi,
  savedPlaceApi,
} from '@/src/services/api';
import { showToast } from '@/components/Toast';

export interface AiAction {
  type: string;
  label?: string;
  payload?: Record<string, any>;
}

interface AiRichMessageBubbleProps {
  message: ChatMessage;
  onQuickReply?: (text: string) => void;
  onOpenItinerary?: (itineraryId: number) => void;
  onOpenPlace?: (placeId: number) => void;
  onOpenPost?: (postId: number) => void;
  onNavigate?: (path: string) => void;
}

function formatCurrency(val: any): string | null {
  const num = Number(val);
  if (!num || Number.isNaN(num)) return null;
  return `${new Intl.NumberFormat('vi-VN').format(num)}đ`;
}

function formatBackendTime(val?: string): string {
  if (!val) return '08:30:00';
  const clean = String(val).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(clean)) return clean;
  if (/^\d{2}:\d{2}$/.test(clean)) return `${clean}:00`;
  return '08:30:00';
}

function normalizeGroupType(val = ''): string {
  const v = String(val).toLowerCase();
  if (v.includes('1 mình') || v.includes('solo') || v.includes('cá nhân')) return 'Cá nhân';
  if (v.includes('cặp đôi') || v.includes('người yêu')) return 'Cặp đôi';
  if (v.includes('gia đình')) return 'Gia đình';
  if (v.includes('bạn')) return 'Bạn bè';
  return val || 'Cá nhân';
}

function getDefaultDates(durationDays = 2) {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(1, Number(durationDays) || 2) - 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function getCoverImageByDestination(dest = ''): string {
  const d = String(dest).toLowerCase();
  if (d.includes('đà lạt') || d.includes('da lat')) {
    return 'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&w=1200&q=80';
  }
  if (d.includes('hội an') || d.includes('hoi an') || d.includes('đà nẵng')) {
    return 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80';
  }
  if (d.includes('phú quốc') || d.includes('phu quoc') || d.includes('nha trang')) {
    return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80';
  }
  if (d.includes('hà giang') || d.includes('sa pa') || d.includes('sapa')) {
    return 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80';
  }
  return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';
}

function extractSafeReplyText(raw: string): string {
  let safeText = String(raw || '');
  if (safeText.includes('"reply"') && safeText.includes('{')) {
    const match = safeText.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (match && match[1]) {
      try {
        safeText = JSON.parse(`"${match[1]}"`);
      } catch {
        safeText = match[1];
      }
    } else {
      const idx = safeText.indexOf('{');
      if (idx > 15) safeText = safeText.slice(0, idx).trim();
    }
  }
  return safeText.replace(/\s*\((?:placeId|itineraryId|detailId|postId)\s*:\s*\d+\)/gi, '');
}

function FormattedReplyText({ text }: { text: string }) {
  const cleaned = extractSafeReplyText(text);
  const lines = cleaned.split('\n');

  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <View key={i} style={{ height: 4 }} />;
        const isDayHeading = /^-?\s*Ngày\s+\d+[:.]/i.test(trimmed);
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <Text
            key={i}
            style={[
              styles.replyText,
              isDayHeading && styles.replyDayHeading,
            ]}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                return (
                  <Text key={j} style={styles.replyBold}>
                    {part.slice(2, -2)}
                  </Text>
                );
              }
              return <React.Fragment key={j}>{part.replace(/\*\*/g, '')}</React.Fragment>;
            })}
          </Text>
        );
      })}
    </View>
  );
}

function getActionStyle(type: string) {
  const t = type.toUpperCase();
  if (t === 'CREATE_ITINERARY' || t === 'CREATE_POST') {
    return { bg: '#C2592B', border: '#C2592B', text: '#FFFDF8', icon: 'magic' as const };
  }
  if (t === 'ADD_ITINERARY_STOP') {
    return { bg: '#059669', border: '#059669', text: '#FFFDF8', icon: 'plus' as const };
  }
  if (t === 'SAVE_PLACE') {
    return { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C', icon: 'heart' as const };
  }
  if (t === 'DELETE_ITINERARY' || t === 'DELETE_ITINERARY_STOP') {
    return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', icon: 'trash-o' as const };
  }
  if (t === 'UPDATE_ITINERARY' || t === 'UPDATE_ITINERARY_STOP' || t === 'TOGGLE_ITINERARY_VISIBILITY') {
    return { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', icon: 'pencil' as const };
  }
  if (t === 'OPEN_PLACE') {
    return { bg: '#FAF7F0', border: '#E7E0D3', text: '#1E1A15', icon: 'map-marker' as const };
  }
  if (t === 'OPEN_ITINERARY' || t === 'CLONE_ITINERARY') {
    return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', icon: 'map-o' as const };
  }
  if (t === 'OPEN_POST') {
    return { bg: '#FAF7F0', border: '#E7E0D3', text: '#1E1A15', icon: 'file-text-o' as const };
  }
  return { bg: '#FAF7F0', border: '#E7E0D3', text: '#1E1A15', icon: 'external-link' as const };
}

export function AiRichMessageBubble({
  message,
  onQuickReply,
  onOpenItinerary,
  onOpenPlace,
  onOpenPost,
  onNavigate,
}: AiRichMessageBubbleProps) {
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [doneMap, setDoneMap] = useState<Record<number, { label: string; itineraryId?: number }>>({});
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);
  const [expandedProposals, setExpandedProposals] = useState<Record<number, boolean>>({ 0: true });
  const [removedStops, setRemovedStops] = useState<Record<string, boolean>>({});

  const parsed = useMemo(() => {
    if (typeof message.content !== 'string') return null;
    const trimmed = message.content.trim();
    if (!trimmed.startsWith('{')) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }, [message.content]);

  const replyText: string = parsed?.reply ?? message.content ?? '';
  const actions: AiAction[] = Array.isArray(parsed?.actions) ? parsed.actions : [];
  const quickReplies: string[] = Array.isArray(parsed?.quickReplies) ? parsed.quickReplies : [];

  const createItineraryActions = actions
    .map((act, idx) => ({ act, idx }))
    .filter(({ act }) => String(act?.type || '').toUpperCase() === 'CREATE_ITINERARY');

  const otherActions = actions
    .map((act, idx) => ({ act, idx }))
    .filter(({ act }) => String(act?.type || '').toUpperCase() !== 'CREATE_ITINERARY');

  const actionLabelsLower = new Set(
    actions.map((a) => (a?.label || '').trim().toLowerCase())
  );
  const filteredQuickReplies = quickReplies
    .filter((qr) => qr && !actionLabelsLower.has(qr.trim().toLowerCase()))
    .slice(0, 4);

  const executeAction = async (action: AiAction, idx: number) => {
    if (!action?.type || loadingIdx !== null) return;
    const type = String(action.type).toUpperCase();
    const payload = action.payload || {};

    if ((type === 'DELETE_ITINERARY' || type === 'DELETE_ITINERARY_STOP') && confirmIdx !== idx) {
      setConfirmIdx(idx);
      return;
    }
    setConfirmIdx(null);

    if (type === 'OPEN_PLACE') {
      if (payload.placeId && onOpenPlace) {
        onOpenPlace(Number(payload.placeId));
      } else {
        onNavigate?.('/(tabs)/explore');
      }
      return;
    }
    if (type === 'OPEN_ITINERARY') {
      if (payload.itineraryId && onOpenItinerary) {
        onOpenItinerary(Number(payload.itineraryId));
      } else {
        onNavigate?.('/(tabs)/itinerary');
      }
      return;
    }
    if (type === 'OPEN_POST') {
      if (payload.postId && onOpenPost) {
        onOpenPost(Number(payload.postId));
      } else {
        onNavigate?.('/(tabs)/community');
      }
      return;
    }
    if (type === 'NAVIGATE') {
      onNavigate?.(payload.path || '/(tabs)/explore');
      return;
    }
    if (type === 'CREATE_POST') {
      onNavigate?.('/(tabs)/community');
      return;
    }

    setLoadingIdx(idx);
    try {
      if (type === 'CREATE_ITINERARY') {
        const defaults = getDefaultDates(payload.durationDays);
        const destName = payload.destination || 'Việt Nam';
        const rawDetails = Array.isArray(payload.details) ? payload.details : [];
        const details = rawDetails
          .filter((_, dIdx) => !removedStops[`${idx}-${dIdx}`])
          .map((d: any, dIdx: number) => {
            const dayNum = Number(d.dayNumber) || 1;
            const rawDayTitle = (d.dayTitle || '').trim();
            const normalizedDayTitle = rawDayTitle.startsWith(`Ngày ${dayNum}`)
              ? rawDayTitle
              : rawDayTitle
                ? `Ngày ${dayNum}: ${rawDayTitle}`
                : `Ngày ${dayNum}: Khám phá ${destName}`;
            return {
              dayNumber: dayNum,
              dayTitle: normalizedDayTitle,
              visitOrder: Number(d.visitOrder) || dIdx + 1,
              placeId: d.placeId ? Number(d.placeId) : undefined,
              locationName: d.locationName || 'Điểm dừng chân',
              locationAddress: d.locationAddress || destName,
              category: d.category || 'Khám phá',
              startTime: formatBackendTime(d.startTime),
              estimatedCost: d.estimatedCost ? Number(d.estimatedCost) : 0,
              aiTip: d.aiTip || '',
              transitInfo: d.transitInfo || '',
              note: d.note || '',
            };
          });

        const created = await itineraryApi.createItinerary({
          title: payload.title || `Chuyến đi ${destName}`,
          destination: destName,
          startDate: payload.startDate || defaults.startDate,
          endDate: payload.endDate || defaults.endDate,
          budgetTotal: payload.budgetTotal ? Number(payload.budgetTotal) : 3000000,
          coverImageUrl: payload.coverImageUrl || getCoverImageByDestination(destName),
          isAiGenerated: true,
          isPublic: payload.isPublic !== false,
          status: (payload.status || 'ACTIVE').toUpperCase(),
          groupType: normalizeGroupType(payload.groupType),
          travelStyle: payload.travelStyle || 'Nghỉ dưỡng & Khám phá',
          details,
        });
        showToast({
          kind: 'success',
          title: 'Đã lưu lịch trình',
          message: `Đã lưu "${created?.title || payload.title}" vào tài khoản của bạn!`,
        });
        setDoneMap((prev) => ({
          ...prev,
          [idx]: { label: 'Đã lưu • Mở xem ngay', itineraryId: created?.id },
        }));
      } else if (type === 'ADD_ITINERARY_STOP') {
        if (!payload.itineraryId) throw new Error('Thiếu mã lịch trình.');
        await itineraryApi.addDetail(Number(payload.itineraryId), {
          dayNumber: Number(payload.dayNumber) || 1,
          placeId: payload.placeId ? Number(payload.placeId) : undefined,
          locationName: payload.locationName || 'Điểm dừng mới',
          locationAddress: payload.locationAddress || '',
          category: payload.category || 'Tham quan',
          startTime: formatBackendTime(payload.startTime),
          estimatedCost: payload.estimatedCost ? Number(payload.estimatedCost) : 0,
          note: payload.note || '',
        });
        showToast({
          kind: 'success',
          title: 'Đã thêm điểm dừng',
          message: `Đã thêm "${payload.locationName}" vào lịch trình!`,
        });
        setDoneMap((prev) => ({
          ...prev,
          [idx]: { label: 'Đã thêm • Mở lịch trình', itineraryId: Number(payload.itineraryId) },
        }));
      } else if (type === 'UPDATE_ITINERARY') {
        if (!payload.itineraryId) throw new Error('Thiếu mã lịch trình.');
        const existing = await itineraryApi.getItineraryById(Number(payload.itineraryId));
        await itineraryApi.updateItinerary(Number(payload.itineraryId), {
          ...existing,
          ...(payload.title ? { title: payload.title } : {}),
          ...(payload.destination ? { destination: payload.destination } : {}),
          ...(payload.startDate ? { startDate: payload.startDate } : {}),
          ...(payload.endDate ? { endDate: payload.endDate } : {}),
          ...(payload.budgetTotal !== undefined ? { budgetTotal: Number(payload.budgetTotal) } : {}),
          ...(payload.groupType ? { groupType: payload.groupType } : {}),
          ...(payload.travelStyle ? { travelStyle: payload.travelStyle } : {}),
          ...(payload.status ? { status: payload.status } : {}),
        });
        showToast({ kind: 'success', title: 'Đã cập nhật', message: 'Đã cập nhật lịch trình thành công!' });
        setDoneMap((prev) => ({
          ...prev,
          [idx]: { label: 'Đã cập nhật • Mở xem', itineraryId: Number(payload.itineraryId) },
        }));
      } else if (type === 'DELETE_ITINERARY') {
        if (!payload.itineraryId) throw new Error('Thiếu mã lịch trình.');
        await itineraryApi.deleteItinerary(Number(payload.itineraryId));
        showToast({ kind: 'success', title: 'Đã xóa lịch trình' });
        setDoneMap((prev) => ({ ...prev, [idx]: { label: 'Đã xóa lịch trình' } }));
      } else if (type === 'UPDATE_ITINERARY_STOP') {
        if (!payload.detailId) throw new Error('Thiếu mã điểm dừng.');
        await itineraryApi.updateDetail(Number(payload.detailId), {
          ...(payload.locationName ? { locationName: payload.locationName } : {}),
          ...(payload.dayNumber ? { dayNumber: Number(payload.dayNumber) } : {}),
          ...(payload.startTime ? { startTime: formatBackendTime(payload.startTime) } : {}),
          ...(payload.estimatedCost !== undefined ? { estimatedCost: Number(payload.estimatedCost) } : {}),
          ...(payload.note !== undefined ? { note: payload.note } : {}),
        });
        showToast({ kind: 'success', title: 'Đã cập nhật điểm dừng' });
        setDoneMap((prev) => ({ ...prev, [idx]: { label: 'Đã sửa điểm dừng' } }));
      } else if (type === 'DELETE_ITINERARY_STOP') {
        if (!payload.detailId) throw new Error('Thiếu mã điểm dừng.');
        await itineraryApi.deleteDetail(Number(payload.detailId));
        showToast({ kind: 'success', title: 'Đã xóa điểm dừng' });
        setDoneMap((prev) => ({ ...prev, [idx]: { label: 'Đã xóa điểm dừng' } }));
      } else if (type === 'SAVE_PLACE') {
        if (!payload.placeId) throw new Error('Thiếu mã địa điểm.');
        await savedPlaceApi.addSavedPlace(Number(payload.placeId));
        showToast({ kind: 'success', title: 'Đã lưu địa điểm vào danh sách yêu thích!' });
        setDoneMap((prev) => ({ ...prev, [idx]: { label: 'Đã lưu địa điểm' } }));
      } else if (type === 'UNSAVE_PLACE') {
        if (!payload.placeId) throw new Error('Thiếu mã địa điểm.');
        await savedPlaceApi.removeSavedPlace(Number(payload.placeId));
        showToast({ kind: 'info', title: 'Đã bỏ lưu địa điểm' });
        setDoneMap((prev) => ({ ...prev, [idx]: { label: 'Đã bỏ lưu' } }));
      } else if (type === 'CLONE_ITINERARY') {
        if (!payload.itineraryId) throw new Error('Thiếu mã lịch trình.');
        const cloned = await itineraryApi.cloneItinerary(Number(payload.itineraryId));
        showToast({ kind: 'success', title: 'Đã sao chép lịch trình về tài khoản!' });
        setDoneMap((prev) => ({
          ...prev,
          [idx]: { label: 'Đã sao chép • Mở xem', itineraryId: cloned?.id },
        }));
      } else if (type === 'TOGGLE_ITINERARY_VISIBILITY') {
        if (!payload.itineraryId) throw new Error('Thiếu mã lịch trình.');
        const updated = await itineraryApi.toggleVisibility(Number(payload.itineraryId), payload.isPublic);
        const pub = updated?.isPublic !== false;
        showToast({ kind: 'success', title: pub ? 'Đã chuyển Công khai' : 'Đã chuyển Riêng tư' });
        setDoneMap((prev) => ({
          ...prev,
          [idx]: { label: pub ? 'Đang Công khai' : 'Đang Riêng tư', itineraryId: Number(payload.itineraryId) },
        }));
      }
    } catch (err: any) {
      showToast({
        kind: 'error',
        title: 'Thao tác thất bại',
        message: err?.message || 'Vui lòng thử lại sau.',
      });
    } finally {
      setLoadingIdx(null);
    }
  };

  return (
    <View style={styles.root}>
      {/* 1. Văn bản trả lời */}
      {replyText ? <FormattedReplyText text={replyText} /> : null}

      {/* 2. Card đề xuất lịch trình (CREATE_ITINERARY) */}
      {createItineraryActions.map(({ act, idx }) => {
        const p = act.payload || {};
        const details: any[] = Array.isArray(p.details) ? p.details : [];
        const visibleDetails = details
          .map((d, dIdx) => ({ d, dIdx }))
          .filter(({ dIdx }) => !removedStops[`${idx}-${dIdx}`]);
        const isExpanded = expandedProposals[idx] !== false;
        const doneInfo = doneMap[idx];
        const isLoading = loadingIdx === idx;
        const budgetFmt = formatCurrency(p.budgetTotal);

        return (
          <View key={idx} style={styles.proposalCard}>
            <View style={styles.proposalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.proposalTag}>✨ ĐỀ XUẤT LỊCH TRÌNH</Text>
                <Text style={styles.proposalTitle}>
                  {p.title || `Khám phá ${p.destination || 'Việt Nam'}`}
                </Text>
                <Text style={styles.proposalMeta}>
                  {[
                    p.destination,
                    p.durationDays ? `${p.durationDays} ngày` : null,
                    p.groupType ? normalizeGroupType(p.groupType) : null,
                    budgetFmt,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  setExpandedProposals((prev) => ({ ...prev, [idx]: !isExpanded }))
                }
                style={styles.expandBtn}>
                <FontAwesome
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {isExpanded && visibleDetails.length > 0 && (
              <View style={styles.stopsWrap}>
                {visibleDetails.slice(0, 12).map(({ d, dIdx }) => (
                  <View key={dIdx} style={styles.stopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stopMeta}>
                        Ngày {d.dayNumber || 1} · {d.startTime || '08:30'} · {d.category || 'Tham quan'}
                      </Text>
                      <Text style={styles.stopName}>{d.locationName}</Text>
                      {d.note ? (
                        <Text style={styles.stopNote} numberOfLines={2}>
                          {d.note}
                        </Text>
                      ) : null}
                    </View>
                    {!doneInfo && (
                      <TouchableOpacity
                        onPress={() =>
                          setRemovedStops((prev) => ({ ...prev, [`${idx}-${dIdx}`]: true }))
                        }
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={{ padding: 4 }}>
                        <FontAwesome name="times" size={12} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {visibleDetails.length > 12 && (
                  <Text style={styles.moreStopsText}>
                    +{visibleDetails.length - 12} chặng khác sẽ được lưu đầy đủ
                  </Text>
                )}
              </View>
            )}

            {doneInfo ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.doneBtn}
                onPress={() => {
                  if (doneInfo.itineraryId && onOpenItinerary) {
                    onOpenItinerary(doneInfo.itineraryId);
                  }
                }}>
                <FontAwesome name="check-circle" size={13} color="#047857" />
                <Text style={styles.doneBtnText}>{doneInfo.label}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isLoading}
                style={[styles.savePlanBtn, isLoading && { opacity: 0.65 }]}
                onPress={() => executeAction(act, idx)}>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFDF8" />
                ) : (
                  <>
                    <FontAwesome name="bookmark" size={12} color="#FFFDF8" />
                    <Text style={styles.savePlanBtnText}>
                      {act.label || 'Lưu lịch trình vào tài khoản'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* 3. Các nút thao tác nhanh (ADD_ITINERARY_STOP, SAVE_PLACE, OPEN_*, UPDATE_*, DELETE_*) */}
      {otherActions.length > 0 && (
        <View style={styles.actionsSection}>
          <Text style={styles.actionsHeading}>THAO TÁC NHANH</Text>
          <View style={styles.actionsWrap}>
            {otherActions.map(({ act, idx }) => {
              const doneInfo = doneMap[idx];
              const isLoading = loadingIdx === idx;
              const isConfirm = confirmIdx === idx;
              const styleCfg = getActionStyle(act.type || '');

              if (doneInfo) {
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.85}
                    style={styles.actionDonePill}
                    onPress={() => {
                      if (doneInfo.itineraryId && onOpenItinerary) {
                        onOpenItinerary(doneInfo.itineraryId);
                      }
                    }}>
                    <FontAwesome name="check" size={11} color="#047857" />
                    <Text style={styles.actionDoneText}>{doneInfo.label}</Text>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.85}
                  disabled={isLoading}
                  onPress={() => executeAction(act, idx)}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: isConfirm ? '#DC2626' : styleCfg.bg,
                      borderColor: isConfirm ? '#DC2626' : styleCfg.border,
                    },
                  ]}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={styleCfg.text} />
                  ) : (
                    <>
                      <FontAwesome
                        name={styleCfg.icon}
                        size={11}
                        color={isConfirm ? '#FFFFFF' : styleCfg.text}
                      />
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: isConfirm ? '#FFFFFF' : styleCfg.text },
                        ]}>
                        {isConfirm ? 'Bấm lần nữa để xóa' : act.label || act.type}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* 4. Gợi ý câu hỏi tiếp theo (Quick Replies) */}
      {filteredQuickReplies.length > 0 && onQuickReply && (
        <View style={styles.quickSection}>
          <Text style={styles.quickHeading}>Gợi ý tiếp theo:</Text>
          <View style={styles.quickWrap}>
            {filteredQuickReplies.map((qr, qIdx) => (
              <TouchableOpacity
                key={qIdx}
                activeOpacity={0.8}
                style={styles.quickChip}
                onPress={() => onQuickReply(qr)}>
                <Text style={styles.quickChipText}>{qr}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  replyText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#1E1A15',
  },
  replyDayHeading: {
    fontWeight: '800',
    color: '#9A3412',
    marginTop: 4,
  },
  replyBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  proposalCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E0D3',
    backgroundColor: '#FAF7F0',
    padding: 12,
    gap: 10,
  },
  proposalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  proposalTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2592B',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  proposalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1A15',
  },
  proposalMeta: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  expandBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stopsWrap: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
    paddingTop: 8,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
  },
  stopMeta: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#C2592B',
  },
  stopName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  stopNote: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  moreStopsText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  savePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#C2592B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  savePlanBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFDF8',
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  doneBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#047857',
  },
  actionsSection: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.08)',
    paddingTop: 8,
  },
  actionsHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionDonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  actionDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  quickSection: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.06)',
    paddingTop: 8,
  },
  quickHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  quickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FAF7F0',
    borderWidth: 1,
    borderColor: '#E7E0D3',
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#3B332A',
  },
});

