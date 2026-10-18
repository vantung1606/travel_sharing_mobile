import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { Text, TextInput } from '@/components/Themed';
import { WF_COLORS } from '@/constants/Colors';
import {
  chatApi,
  ChatMessage,
  ChatMessageType,
  ChatRoom,
  ItineraryItem,
  uploadApi,
} from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';
import { aiService } from '@/src/services/aiService';
import { chatSocket } from '@/src/services/chatSocket';
import { ItineraryDetailModal } from './ItineraryDetailModal';
import { NewChatSheet } from './chat/NewChatSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
const AI_FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

const QUICK_AI_PROMPTS = [
  '🌤️ Thời tiết & săn mây Đà Lạt',
  '🍲 Top 5 món ngon Sa Pa',
  '🏖️ Lịch trình 3N2Đ Phú Quốc tiết kiệm',
  '🛵 Cung đường phượt Hà Giang',
  '🏮 Check-in phố cổ Hội An',
  '☕ Quán cafe view đẹp nhất',
];

const GROUP_WINDOW_MS = 5 * 60 * 1000;

const WEB_NO_OUTLINE =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : undefined;

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialRoomId?: string | number;
}

type ChatListItem =
  | { kind: 'date'; key: string; label: string }
  | {
      kind: 'message';
      key: string;
      message: ChatMessage;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
      showAvatar: boolean;
      showSenderName: boolean;
    };

type RoomListItem =
  | { kind: 'section'; key: string; label: string; count: number }
  | { kind: 'room'; key: string; room: ChatRoom };

// ─── Helpers ────────────────────────────────────────────────

/** Bỏ dấu tiếng Việt để tìm kiếm gần đúng (gõ "da lat" vẫn ra "Đà Lạt"). */
function normalizeVi(value?: string): string {
  if (!value) return '';
  const lower = value.toLowerCase().trim();
  try {
    return lower
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  } catch {
    return lower;
  }
}

/** Backend trả LocalDateTime có thể có 4-6 chữ số thập phân -> cắt an toàn cho JS Date. */
function parseDateSafe(value?: string): Date | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .replace(' ', 'T')
    .replace(/(\.\d{3})\d+/, '$1');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatClock(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  if (isSameDay(date, today)) return 'Hôm nay';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Hôm qua';

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return date.getFullYear() === today.getFullYear()
    ? `${dd}/${mm}`
    : `${dd}/${mm}/${date.getFullYear()}`;
}

function roomDateGroup(room: ChatRoom): string {
  const date = parseDateSafe(room.updatedAt || room.lastActiveAt);
  if (!date) return 'Gần đây';

  const today = new Date();
  if (isSameDay(date, today)) return 'Hôm nay';

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Hôm qua';

  const diffDays = (today.getTime() - date.getTime()) / 86_400_000;
  return diffDays < 7 ? '7 ngày qua' : 'Trước đó';
}

function sortRooms(rooms: ChatRoom[]): ChatRoom[] {
  return [...rooms].sort((a, b) => {
    const ta = parseDateSafe(a.updatedAt || a.lastActiveAt)?.getTime() ?? 0;
    const tb = parseDateSafe(b.updatedAt || b.lastActiveAt)?.getTime() ?? 0;
    return tb - ta;
  });
}

function senderKey(message: ChatMessage): string {
  if (message.isMe) return 'me';
  return String(message.senderId ?? message.senderName ?? 'other');
}

function messagePreview(message: ChatMessage): string {
  switch (message.messageType) {
    case 'IMAGE':
      return 'Đã gửi một ảnh';
    case 'VIDEO':
      return 'Đã gửi một video';
    case 'AUDIO':
    case 'VOICE':
      return 'Đã gửi tin nhắn thoại';
    case 'FILE':
      return 'Đã gửi một tệp đính kèm';
    case 'ITINERARY':
      return 'Đã chia sẻ một lịch trình';
    case 'LOCATION':
      return 'Đã chia sẻ vị trí';
    default:
      return message.content;
  }
}

function normalizeIncomingMessage(raw: any, myId: number | null): ChatMessage {
  const createdAt = raw?.createdAt || '';
  const parsed = parseDateSafe(createdAt);
  return {
    id: raw?.id,
    roomId: raw?.roomId,
    senderId: raw?.senderId ?? undefined,
    senderEmail: raw?.senderEmail,
    senderName: raw?.senderName,
    senderHandle: raw?.senderHandle,
    senderAvatar: raw?.senderAvatar,
    content: raw?.content ?? '',
    messageType: raw?.messageType || 'TEXT',
    createdAt: createdAt || undefined,
    time: raw?.time || (parsed ? formatClock(parsed) : formatClock(new Date())),
    isMe:
      typeof raw?.isMe === 'boolean'
        ? raw.isMe
        : myId != null && raw?.senderId != null && Number(raw.senderId) === myId,
  };
}

function mergeIncomingMessage(prev: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (
    incoming.id != null &&
    prev.some((m) => m.id != null && String(m.id) === String(incoming.id))
  ) {
    return prev;
  }

  if (incoming.isMe) {
    const tempIndex = prev.findIndex(
      (m) =>
        m.isMe &&
        m.isPending &&
        m.content === incoming.content &&
        (m.messageType || 'TEXT') === (incoming.messageType || 'TEXT')
    );
    if (tempIndex !== -1) {
      const next = [...prev];
      next[tempIndex] = { ...incoming, isPending: false, isFailed: false };
      return next;
    }
  }

  return [...prev, incoming];
}

function mergeFetchedMessages(prev: ChatMessage[], fresh: ChatMessage[]): ChatMessage[] {
  const freshKeys = fresh.map((m) => (m.id != null ? String(m.id) : '')).filter(Boolean);

  const keepPending = prev.filter((m) => {
    if (!m.isPending && !m.isFailed) return false;
    if (m.id != null && freshKeys.includes(String(m.id))) return false;
    // Tin đã được server lưu nhưng phản hồi REST chưa kịp về
    return !fresh.some(
      (f) =>
        f.content === m.content &&
        (f.messageType || 'TEXT') === (m.messageType || 'TEXT')
    );
  });

  const keepLocal = prev.filter(
    (m) =>
      m.isLocal &&
      !freshKeys.includes(String(m.id ?? '')) &&
      !keepPending.some((p) => p.id === m.id)
  );

  const merged = [...fresh, ...keepPending, ...keepLocal];
  merged.sort((a, b) => {
    const ta = parseDateSafe(a.createdAt)?.getTime();
    const tb = parseDateSafe(b.createdAt)?.getTime();
    if (ta == null && tb == null) return 0;
    if (ta == null) return 1;
    if (tb == null) return -1;
    return ta - tb;
  });
  return merged;
}

function buildChatItems(
  messages: ChatMessage[],
  showSenderNames: boolean
): ChatListItem[] {
  const items: ChatListItem[] = [];
  let currentDayKey = '';

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const date = parseDateSafe(message.createdAt);
    const key = date ? dayKey(date) : 'unknown';

    if (key !== currentDayKey) {
      items.push({
        kind: 'date',
        key: `date-${key}-${index}`,
        label: date ? formatDayLabel(date) : 'Trước đó',
      });
      currentDayKey = key;
    }

    if (message.messageType === 'SYSTEM') {
      items.push({
        kind: 'message',
        key: `message-${message.id ?? index}`,
        message,
        isFirstInGroup: true,
        isLastInGroup: true,
        showAvatar: false,
        showSenderName: false,
      });
      continue;
    }

    const keyOfSender = senderKey(message);
    const previous = messages[index - 1];
    const next = messages[index + 1];

    const continuity = (a?: ChatMessage, b?: ChatMessage): boolean => {
      if (!a || !b || a.messageType === 'SYSTEM' || b.messageType === 'SYSTEM') {
        return false;
      }
      if (senderKey(a) !== senderKey(b)) return false;
      const da = parseDateSafe(a.createdAt);
      const db = parseDateSafe(b.createdAt);
      if (!da || !db) return false;
      return isSameDay(da, db) && Math.abs(db.getTime() - da.getTime()) <= GROUP_WINDOW_MS;
    };

    const sameAsPrevious = continuity(previous, message);
    const sameAsNext = continuity(message, next);

    items.push({
      kind: 'message',
      key: `message-${message.id ?? index}`,
      message,
      isFirstInGroup: !sameAsPrevious,
      isLastInGroup: !sameAsNext,
      showAvatar: !message.isMe && !sameAsNext,
      showSenderName: !message.isMe && !sameAsPrevious && showSenderNames,
    });
  }

  return items;
}

function parseItineraryPayload(content: string): any | null {
  if (!content || !content.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// ─── Small presentational pieces ────────────────────────────

function TypingDots() {
  const values = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;

  useEffect(() => {
    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 140),
          Animated.timing(value, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.delay(280),
        ])
      )
    );
    loops.forEach((loop) => loop.start());
    return () => {
      loops.forEach((loop) => loop.stop());
      values.forEach((value) => value.setValue(0.3));
    };
  }, [values]);

  return (
    <View style={styles.typingDots}>
      {values.map((value, index) => (
        <Animated.View key={index} style={[styles.typingDot, { opacity: value }]} />
      ))}
    </View>
  );
}

function SkeletonPulse({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

function RoomsSkeleton() {
  return (
    <SkeletonPulse>
      <View style={styles.roomsSkeleton}>
        {[0, 1, 2, 3, 4].map((row) => (
          <View key={row} style={styles.skeletonRoomRow}>
            <View style={styles.skeletonAvatar} />
            <View style={{ flex: 1 }}>
              <View style={styles.skeletonLineWide} />
              <View style={styles.skeletonLineShort} />
            </View>
            <View style={styles.skeletonTime} />
          </View>
        ))}
      </View>
    </SkeletonPulse>
  );
}

function MessagesSkeleton() {
  return (
    <SkeletonPulse>
      <View style={styles.messagesSkeleton}>
        <View style={[styles.skeletonBubble, styles.skeletonBubbleOther]} />
        <View style={[styles.skeletonBubble, styles.skeletonBubbleMe]} />
        <View style={[styles.skeletonBubble, styles.skeletonBubbleOther, { width: '48%' }]} />
        <View style={[styles.skeletonBubble, styles.skeletonBubbleMe, { width: '38%' }]} />
        <View style={[styles.skeletonBubble, styles.skeletonBubbleOther, { width: '62%' }]} />
      </View>
    </SkeletonPulse>
  );
}

// ─── Main component ─────────────────────────────────────────

export function ChatModal({ visible, onClose, initialRoomId }: ChatModalProps) {
  const insets = useSafeAreaInsets();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [refreshingRooms, setRefreshingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(40);
  const [sending, setSending] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);

  const [activeFilter, setActiveFilter] = useState<
    'all' | 'unread' | 'ai' | 'group' | 'direct'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedItinForModal, setSelectedItinForModal] = useState<ItineraryItem | null>(null);
  const [itinModalVisible, setItinModalVisible] = useState(false);

  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const listRef = useRef<FlatList<ChatListItem>>(null);
  const nearBottomRef = useRef(true);
  const sendingRef = useRef(false);
  const currentUserIdRef = useRef<number | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  const hasLoadedRoomsRef = useRef(false);
  const initialRoomHandledRef = useRef(false);
  const lastMeasuredTextRef = useRef('');

  const unsubscribeRoomRef = useRef<(() => void) | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filterPulse = useRef(new Animated.Value(1)).current;

  // ── Session ───────────────────────────────────────────────
  useEffect(() => {
    authStorage
      .getSession()
      .then((session) => {
        const rawId = (session as any)?.id ?? (session as any)?.userId;
        currentUserIdRef.current = rawId != null ? Number(rawId) : null;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    activeRoomIdRef.current = activeRoom ? String(activeRoom.id) : null;
  }, [activeRoom]);

  // ── Realtime cleanup ──────────────────────────────────────
  const stopRoomRealtime = useCallback(() => {
    if (unsubscribeRoomRef.current) {
      unsubscribeRoomRef.current();
      unsubscribeRoomRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => stopRoomRealtime, [stopRoomRealtime]);

  // ── Scrolling ─────────────────────────────────────────────
  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
    nearBottomRef.current = true;
    setShowJumpToBottom(false);
    setNewMessageCount(0);
  }, []);

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!text) {
      setInputHeight(40);
      lastMeasuredTextRef.current = '';
    }
  };

  const handleInputContentSizeChange = (
    event: NativeSyntheticEvent<{ contentSize: { width: number; height: number } }>
  ) => {
    if (!inputText) return;
    // Chỉ đo lại khi nội dung thực sự đổi, tránh vòng lặp chiều cao trên web.
    if (lastMeasuredTextRef.current === inputText) return;
    lastMeasuredTextRef.current = inputText;
    const nextHeight = event.nativeEvent.contentSize.height + 14;
    setInputHeight(Math.min(112, Math.max(40, nextHeight)));
  };

  const handleMessagesScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const nearBottom = distanceFromBottom < 90;

    nearBottomRef.current = nearBottom;
    setShowJumpToBottom(!nearBottom && contentSize.height > layoutMeasurement.height + 120);
    if (nearBottom) {
      setNewMessageCount(0);
    }
  };

  // ── Rooms ─────────────────────────────────────────────────
  const updateRoomFromMessage = useCallback(
    (roomId: string | number, message: ChatMessage) => {
      setRooms((prev) => {
        const index = prev.findIndex((room) => String(room.id) === String(roomId));
        if (index === -1) return prev;

        const room = prev[index];
        const isActive = activeRoomIdRef.current === String(roomId);
        const updated: ChatRoom = {
          ...room,
          lastMessage: messagePreview(message),
          lastMessageTime: message.time || room.lastMessageTime,
          updatedAt: message.createdAt || new Date().toISOString(),
          unreadCount: isActive
            ? 0
            : message.isMe
              ? room.unreadCount
              : (room.unreadCount || 0) + 1,
        };

        const next = [...prev];
        next.splice(index, 1);
        next.unshift(updated);
        return next;
      });
    },
    []
  );

  const handleSelectRoom = useCallback(
    async (room: ChatRoom) => {
      stopRoomRealtime();

      setActiveRoom(room);
      setMessages([]);
      setMessagesError(null);
      setLoadingMessages(true);
      setInputText('');
      setInputHeight(40);
      setShowJumpToBottom(false);
      setNewMessageCount(0);
      nearBottomRef.current = true;

      setRooms((prev) =>
        prev.map((item) =>
          String(item.id) === String(room.id) ? { ...item, unreadCount: 0 } : item
        )
      );

      try {
        const history = await chatApi.getRoomMessages(room.id);
        const normalized = history.map((message) =>
          normalizeIncomingMessage(message, currentUserIdRef.current)
        );
        setMessages(normalized);
        setTimeout(() => scrollToBottom(false), 120);
      } catch {
        setMessagesError('Không tải được tin nhắn. Kiểm tra kết nối và thử lại.');
      } finally {
        setLoadingMessages(false);
      }

      // Realtime qua STOMP /topic/room.{roomId}
      unsubscribeRoomRef.current = chatSocket.subscribeToRoom(room.id, (incoming) => {
        if (activeRoomIdRef.current !== String(room.id)) return;

        const normalized = normalizeIncomingMessage(incoming, currentUserIdRef.current);
        if (normalized.id == null) return;

        setMessages((prev) => mergeIncomingMessage(prev, normalized));
        updateRoomFromMessage(room.id, normalized);

        if (!nearBottomRef.current && !normalized.isMe) {
          setNewMessageCount((count) => count + 1);
        }
      });

      // Polling dự phòng 5s nếu WebSocket bị chặn
      pollTimerRef.current = setInterval(async () => {
        try {
          const freshHistory = await chatApi.getRoomMessages(room.id);
          if (activeRoomIdRef.current !== String(room.id)) return;

          const normalized = freshHistory.map((message) =>
            normalizeIncomingMessage(message, currentUserIdRef.current)
          );

          setMessages((prev) => {
            const merged = mergeFetchedMessages(prev, normalized);
            const unchanged =
              merged.length === prev.length &&
              merged.every((message, index) => String(message.id) === String(prev[index]?.id));
            return unchanged ? prev : merged;
          });

          const latest = normalized[normalized.length - 1];
          if (latest) updateRoomFromMessage(room.id, latest);
        } catch {
          // Bỏ qua lỗi polling, lần sau thử lại
        }
      }, 5000);
    },
    [scrollToBottom, stopRoomRealtime, updateRoomFromMessage]
  );

  const loadRooms = useCallback(
    async (silent = false) => {
      const showSkeleton = !silent && !hasLoadedRoomsRef.current;
      if (showSkeleton) setLoadingRooms(true);
      setRoomsError(null);

      try {
        const data = await chatApi.getRooms();
        hasLoadedRoomsRef.current = true;
        setRooms(sortRooms(data));

        if (initialRoomId && !initialRoomHandledRef.current) {
          const found = data.find((room) => String(room.id) === String(initialRoomId));
          if (found) {
            initialRoomHandledRef.current = true;
            handleSelectRoom(found);
          }
        }
      } catch {
        setRoomsError('Không tải được hộp thư. Kiểm tra kết nối và thử lại.');
      } finally {
        if (showSkeleton) setLoadingRooms(false);
      }
    },
    [handleSelectRoom, initialRoomId]
  );

  // Mở/đóng modal
  useEffect(() => {
    if (!visible) {
      stopRoomRealtime();
      setActiveRoom(null);
      setMessages([]);
      setSearchQuery('');
      setActiveFilter('all');
      setPreviewImage(null);
      setIsAiTyping(false);
      setInputText('');
      setInputHeight(40);
      setNewMessageCount(0);
      setShowJumpToBottom(false);
      return;
    }
    if (initialRoomId) {
      initialRoomHandledRef.current = false;
    }
    loadRooms();
  }, [visible, initialRoomId, loadRooms, stopRoomRealtime]);

  // Tự cập nhật danh sách phòng khi đang ở màn hình hộp thư
  useEffect(() => {
    if (!visible || activeRoom) return;
    const timer = setInterval(() => loadRooms(true), 30_000);
    return () => clearInterval(timer);
  }, [visible, activeRoom, loadRooms]);

  useEffect(() => {
    if (isAiTyping) {
      setTimeout(() => scrollToBottom(true), 60);
    }
  }, [isAiTyping, scrollToBottom]);

  // Nhịp thở nhẹ cho badge "Chưa đọc" ở bộ lọc
  useEffect(() => {
    if (activeFilter !== 'unread') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(filterPulse, {
          toValue: 1.04,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(filterPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      filterPulse.setValue(1);
    };
  }, [activeFilter, filterPulse]);

  // ── Navigation within chat ────────────────────────────────
  const handleBack = () => {
    stopRoomRealtime();
    setActiveRoom(null);
    setMessages([]);
    setMessagesError(null);
    setInputText('');
    setInputHeight(40);
    setShowJumpToBottom(false);
    setNewMessageCount(0);
    setPreviewImage(null);
    setIsAiTyping(false);
    loadRooms(true);
  };

  const handleClose = () => {
    stopRoomRealtime();
    onClose();
  };

  const handleRefreshRooms = async () => {
    setRefreshingRooms(true);
    await loadRooms(true);
    setRefreshingRooms(false);
  };

  const handleCreatedRoom = (room: ChatRoom) => {
    setIsNewChatOpen(false);
    setRooms((prev) =>
      prev.some((item) => String(item.id) === String(room.id))
        ? prev
        : sortRooms([room, ...prev])
    );
    handleSelectRoom(room);
  };

  // ── Sending ───────────────────────────────────────────────
  const appendLocalAssistantMessage = useCallback(
    (room: ChatRoom, content: string) => {
      if (activeRoomIdRef.current !== String(room.id)) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `local-ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          roomId: room.id,
          senderName: 'Trợ lý du lịch',
          senderAvatar: room.avatarUrl || AI_FALLBACK_AVATAR,
          content,
          messageType: 'TEXT',
          createdAt: new Date().toISOString(),
          time: formatClock(new Date()),
          isMe: false,
          isLocal: true,
        },
      ]);
      setTimeout(() => scrollToBottom(true), 60);
    },
    [scrollToBottom]
  );

  const requestAiReply = useCallback(
    async (room: ChatRoom, prompt: string) => {
      setIsAiTyping(true);
      try {
        const reply = await aiService.generateText({
          prompt,
          systemPrompt:
            'Bạn là trợ lý du lịch thân thiện của Wayfare. Hãy tư vấn điểm đến, ẩm thực, chi phí và lịch trình một cách súc tích, thực tế, tự nhiên bằng tiếng Việt. Không dùng từ ngữ phóng đại hay sáo rỗng.',
          temperature: 0.7,
          responseMimeType: 'text/plain',
        });
        appendLocalAssistantMessage(
          room,
          reply?.trim() ||
            'Mình chưa có gợi ý phù hợp cho câu hỏi này. Bạn thử hỏi cụ thể hơn về điểm đến hoặc ngân sách nhé!'
        );
      } catch {
        appendLocalAssistantMessage(
          room,
          'Trợ lý đang tạm thời gián đoạn kết nối. Bạn thử lại sau ít phút nhé!'
        );
      } finally {
        if (activeRoomIdRef.current === String(room.id)) {
          setIsAiTyping(false);
        }
      }
    },
    [appendLocalAssistantMessage]
  );

  const sendMessageInternal = useCallback(
    async (rawContent: string, messageType: ChatMessageType = 'TEXT', localImageUri?: string) => {
      const room = activeRoom;
      if (!room || sendingRef.current) return;

      const content = rawContent.trim();
      if (!content && messageType !== 'IMAGE') return;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        roomId: room.id,
        content: localImageUri || content,
        messageType,
        createdAt: new Date().toISOString(),
        time: formatClock(new Date()),
        isMe: true,
        isPending: true,
      };

      setMessages((prev) => [...prev, optimistic]);
      scrollToBottom(true);

      if (messageType !== 'IMAGE') {
        setInputText('');
        setInputHeight(40);
      }

      sendingRef.current = true;
      setSending(true);

      try {
        let payload = content;
        if (messageType === 'IMAGE' && localImageUri) {
          const uploadedUrl = await uploadApi.uploadSingle(localImageUri);
          if (!uploadedUrl) {
            throw new Error('Không tải được ảnh lên máy chủ');
          }
          payload = uploadedUrl;
        }

        const saved = await chatApi.sendMessage(room.id, payload, messageType);
        const normalizedSaved = normalizeIncomingMessage(saved, currentUserIdRef.current);

        setMessages((prev) => {
          const withoutTemp = prev.filter((message) => message.id !== tempId);
          if (
            normalizedSaved.id != null &&
            withoutTemp.some((message) => String(message.id) === String(normalizedSaved.id))
          ) {
            return withoutTemp;
          }
          return [...withoutTemp, normalizedSaved];
        });

        updateRoomFromMessage(room.id, normalizedSaved);

        if (room.type === 'AI') {
          if (messageType === 'TEXT') {
            requestAiReply(room, content);
          } else if (messageType === 'IMAGE') {
            appendLocalAssistantMessage(
              room,
              'Ảnh đã được gửi đi. Bạn có muốn mình gợi ý thêm vài điểm check-in tương tự cho chuyến đi không?'
            );
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempId
              ? { ...message, isPending: false, isFailed: true }
              : message
          )
        );
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [activeRoom, appendLocalAssistantMessage, requestAiReply, scrollToBottom, updateRoomFromMessage]
  );

  const handlePickImage = async () => {
    if (!activeRoom || sendingRef.current) return;

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Cần quyền truy cập ảnh',
          'Vui lòng cho phép ứng dụng truy cập thư viện ảnh để gửi hình ảnh trong cuộc trò chuyện.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      const asset = result.assets?.[0];
      if (!result.canceled && asset?.uri) {
        await sendMessageInternal('Hình ảnh', 'IMAGE', asset.uri);
      }
    } catch {
      Alert.alert('Không chọn được ảnh', 'Vui lòng thử lại sau ít phút.');
    }
  };

  const handleRetry = (failed: ChatMessage) => {
    if (!activeRoom) return;
    const type = failed.messageType || 'TEXT';
    const isLocalUri = type === 'IMAGE' && !/^https?:\/\//i.test(failed.content);

    setMessages((prev) => prev.filter((message) => message.id !== failed.id));
    sendMessageInternal(
      isLocalUri ? 'Hình ảnh' : failed.content,
      type,
      isLocalUri ? failed.content : undefined
    );
  };

  const handleClearChat = () => {
    Alert.alert(
      'Xoá lịch sử trò chuyện?',
      'Tin nhắn chỉ bị xoá khỏi thiết bị này. Những người khác trong cuộc trò chuyện vẫn giữ nguyên.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: () => setMessages([]),
        },
      ]
    );
  };

  // ── Derived data ──────────────────────────────────────────
  const aiRoom = useMemo(() => rooms.find((room) => room.type === 'AI'), [rooms]);

  const counts = useMemo(
    () => ({
      all: rooms.length,
      unread: rooms.filter((room) => (room.unreadCount || 0) > 0).length,
      ai: rooms.filter((room) => room.type === 'AI').length,
      group: rooms.filter((room) => room.type === 'GROUP' || room.type === 'ITINERARY').length,
      direct: rooms.filter((room) => room.type === 'DIRECT').length,
    }),
    [rooms]
  );

  const unreadTotal = useMemo(
    () => rooms.reduce((total, room) => total + (room.unreadCount || 0), 0),
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    const query = normalizeVi(searchQuery);

    return rooms.filter((room) => {
      let matchesFilter = true;
      if (activeFilter === 'unread') matchesFilter = (room.unreadCount || 0) > 0;
      else if (activeFilter === 'ai') matchesFilter = room.type === 'AI';
      else if (activeFilter === 'group') {
        matchesFilter = room.type === 'GROUP' || room.type === 'ITINERARY';
      } else if (activeFilter === 'direct') matchesFilter = room.type === 'DIRECT';

      if (!matchesFilter) return false;
      if (!query) return true;

      return (
        normalizeVi(room.name).includes(query) ||
        normalizeVi(room.lastMessage).includes(query)
      );
    });
  }, [activeFilter, rooms, searchQuery]);

  const roomItems = useMemo<RoomListItem[]>(() => {
    const items: RoomListItem[] = [];
    let currentGroup = '';

    filteredRooms.forEach((room) => {
      const group = roomDateGroup(room);
      if (group !== currentGroup) {
        currentGroup = group;
        items.push({
          kind: 'section',
          key: `section-${group}-${items.length}`,
          label: group,
          count: filteredRooms.filter((item) => roomDateGroup(item) === group).length,
        });
      }
      items.push({ kind: 'room', key: `room-${room.id}`, room });
    });

    return items;
  }, [filteredRooms]);

  const chatItems = useMemo(
    () => buildChatItems(messages, activeRoom?.type !== 'DIRECT'),
    [activeRoom?.type, messages]
  );

  // ── Renderers ─────────────────────────────────────────────
  const openItinerary = (itinerary: ItineraryItem) => {
    setSelectedItinForModal(itinerary);
    setItinModalVisible(true);
  };

  const openAttachment = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Không mở được liên kết', 'Vui lòng thử lại trên trình duyệt.');
    }
  };

  const renderItineraryCard = (message: ChatMessage) => {
    const payload = message.itineraryData || parseItineraryPayload(message.content);
    if (!payload) {
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.attachmentCard}
          onPress={() => openAttachment(message.content)}>
          <View style={styles.attachmentIcon}>
            <FontAwesome name="map-o" size={15} color={WF_COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.attachmentTitle}>Lịch trình được chia sẻ</Text>
            <Text style={styles.attachmentSubtitle} numberOfLines={1}>
              Bấm để xem chi tiết
            </Text>
          </View>
          <FontAwesome name="angle-right" size={15} color={WF_COLORS.slate400} />
        </TouchableOpacity>
      );
    }

    const cover = payload.coverImageUrl || '';
    const destination = payload.destination || 'Việt Nam';
    const duration =
      payload.duration ||
      (payload.daysCount ? `${payload.daysCount} ngày` : 'Nhiều ngày');
    const budget = Number(payload.budgetTotal || 0);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.itineraryCard}
        onPress={() => {
          if (payload.id && payload.title && payload.destination) {
            openItinerary(payload as ItineraryItem);
          }
        }}>
        {!!cover && (
          <Image source={{ uri: cover }} style={styles.itineraryCover} resizeMode="cover" />
        )}
        <View style={styles.itineraryBody}>
          <View style={styles.itineraryTopRow}>
            <View style={styles.itineraryDestinationPill}>
              <FontAwesome
                name="map-marker"
                size={9}
                color={WF_COLORS.white}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.itineraryDestinationText} numberOfLines={1}>
                {destination}
              </Text>
            </View>
            <Text style={styles.itineraryDuration}>{duration}</Text>
          </View>
          <Text style={styles.itineraryTitle} numberOfLines={2}>
            {payload.title || 'Lịch trình du lịch'}
          </Text>
          <View style={styles.itineraryBottomRow}>
            <Text style={styles.itineraryBudget}>
              {budget > 0 ? `~${budget.toLocaleString('vi-VN')} đ/người` : 'Chi phí linh hoạt'}
            </Text>
            <View style={styles.itineraryLink}>
              <Text style={styles.itineraryLinkText}>Xem chi tiết</Text>
              <FontAwesome
                name="arrow-right"
                size={9}
                color={WF_COLORS.primary}
                style={{ marginLeft: 4 }}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessageContent = (message: ChatMessage, isMe: boolean) => {
    if (message.messageType === 'IMAGE') {
      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setPreviewImage(message.content)}
          disabled={!message.content || message.isFailed}
          style={styles.imageWrap}>
          <Image source={{ uri: message.content }} style={styles.imageBubble} resizeMode="cover" />
          {message.isPending && (
            <View style={styles.imageOverlay}>
              <ActivityIndicator size="small" color={WF_COLORS.white} />
              <Text style={styles.imageOverlayText}>Đang gửi...</Text>
            </View>
          )}
          {message.isFailed && (
            <View style={styles.imageOverlay}>
              <FontAwesome name="exclamation-circle" size={18} color={WF_COLORS.white} />
              <Text style={styles.imageOverlayText}>Gửi thất bại</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (message.messageType === 'ITINERARY') {
      return renderItineraryCard(message);
    }

    if (
      message.messageType === 'VIDEO' ||
      message.messageType === 'AUDIO' ||
      message.messageType === 'VOICE' ||
      message.messageType === 'FILE' ||
      message.messageType === 'LOCATION'
    ) {
      const config: Record<
        string,
        { icon: React.ComponentProps<typeof FontAwesome>['name']; title: string; subtitle: string }
      > = {
        VIDEO: { icon: 'play-circle', title: 'Video', subtitle: 'Bấm để xem video' },
        AUDIO: { icon: 'music', title: 'Tin nhắn thoại', subtitle: 'Bấm để nghe' },
        VOICE: { icon: 'music', title: 'Tin nhắn thoại', subtitle: 'Bấm để nghe' },
        FILE: { icon: 'file-o', title: 'Tệp đính kèm', subtitle: 'Bấm để mở tệp' },
        LOCATION: { icon: 'map-marker', title: 'Vị trí', subtitle: 'Bấm để xem trên bản đồ' },
      };
      const item = config[message.messageType || 'FILE'];
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.attachmentCard, isMe && styles.attachmentCardMe]}
          onPress={() => openAttachment(message.content)}>
          <View style={[styles.attachmentIcon, isMe && styles.attachmentIconMe]}>
            <FontAwesome
              name={item.icon}
              size={15}
              color={isMe ? WF_COLORS.white : WF_COLORS.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.attachmentTitle, isMe && styles.attachmentTextMe]}>
              {item.title}
            </Text>
            <Text
              style={[styles.attachmentSubtitle, isMe && styles.attachmentSubtitleMe]}
              numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>
          <FontAwesome
            name="angle-right"
            size={15}
            color={isMe ? 'rgba(255,255,255,0.7)' : WF_COLORS.slate400}
          />
        </TouchableOpacity>
      );
    }

    return (
      <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
        {message.content}
      </Text>
    );
  };

  const renderChatItem = ({ item }: { item: ChatListItem }) => {
    if (item.kind === 'date') {
      return (
        <View style={styles.dateRow}>
          <View style={styles.dateLine} />
          <Text style={styles.dateLabel}>{item.label}</Text>
          <View style={styles.dateLine} />
        </View>
      );
    }

    const { message, isFirstInGroup, isLastInGroup, showAvatar, showSenderName } = item;
    const isMe = !!message.isMe;

    if (message.messageType === 'SYSTEM') {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{message.content}</Text>
        </View>
      );
    }

    const senderName =
      message.senderName ||
      (activeRoom?.type === 'AI' ? 'Trợ lý du lịch' : activeRoom?.name || 'Thành viên');

    const bubbleShape = isMe
      ? {
          borderTopRightRadius: isFirstInGroup ? 18 : 7,
          borderBottomRightRadius: isLastInGroup ? 6 : 7,
        }
      : {
          borderTopLeftRadius: isFirstInGroup ? 18 : 7,
          borderBottomLeftRadius: isLastInGroup ? 6 : 7,
        };

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
          <View style={styles.avatarSlot}>
            {showAvatar ? (
              <Image
                source={{
                  uri: message.senderAvatar || activeRoom?.avatarUrl || FALLBACK_AVATAR,
                }}
                style={styles.messageAvatar}
              />
            ) : null}
          </View>
        )}

        <View style={[styles.messageColumn, isMe && styles.messageColumnMe]}>
          {showSenderName && (
            <View style={styles.senderRow}>
              <Text style={styles.senderName} numberOfLines={1}>
                {senderName}
              </Text>
              {activeRoom?.type === 'AI' && !message.isMe && (
                <View style={styles.assistantBadge}>
                  <FontAwesome name="compass" size={7} color="#B45309" />
                  <Text style={styles.assistantBadgeText}>Trợ lý</Text>
                </View>
              )}
            </View>
          )}

          <View
            style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
              bubbleShape,
              message.messageType === 'IMAGE' && styles.bubbleImage,
            ]}>
            {renderMessageContent(message, isMe)}

            {isLastInGroup && (
              <View style={styles.bubbleMeta}>
                <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                  {message.time || ''}
                </Text>
                {isMe &&
                  (message.isPending ? (
                    <FontAwesome
                      name="clock-o"
                      size={9}
                      color="rgba(255,255,255,0.75)"
                      style={{ marginLeft: 4 }}
                    />
                  ) : message.isFailed ? (
                    <FontAwesome
                      name="exclamation-circle"
                      size={9}
                      color="#FECACA"
                      style={{ marginLeft: 4 }}
                    />
                  ) : (
                    <FontAwesome
                      name="check"
                      size={9}
                      color="rgba(255,255,255,0.8)"
                      style={{ marginLeft: 4 }}
                    />
                  ))}
              </View>
            )}
          </View>

          {message.isFailed && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.retryRow}
              onPress={() => handleRetry(message)}>
              <FontAwesome name="refresh" size={9} color="#DC2626" />
              <Text style={styles.retryText}>Gửi lại</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderRoomItem = ({ item }: { item: RoomListItem }) => {
    if (item.kind === 'section') {
      return (
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>{item.label}</Text>
          <Text style={styles.sectionCount}>{item.count}</Text>
        </View>
      );
    }

    const { room } = item;
    const unread = room.unreadCount || 0;
    const isGroup = room.type === 'GROUP' || room.type === 'ITINERARY';
    const isAi = room.type === 'AI';

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.roomRow}
        onPress={() => handleSelectRoom(room)}
        accessibilityRole="button"
        accessibilityLabel={`Mở cuộc trò chuyện ${room.name}`}>
        <View style={styles.roomAvatarWrap}>
          <Image
            source={{ uri: room.avatarUrl || FALLBACK_AVATAR }}
            style={[styles.roomAvatar, unread > 0 && styles.roomAvatarUnread]}
          />

          {isAi && (
            <View style={styles.roomAvatarBadgeAi}>
              <FontAwesome name="compass" size={8} color={WF_COLORS.white} />
            </View>
          )}

          {isGroup && (
            <View style={styles.roomAvatarBadgeGroup}>
              <FontAwesome name="users" size={7} color={WF_COLORS.white} />
            </View>
          )}

          {!isAi && !isGroup && room.isOnline && <View style={styles.roomOnlineDot} />}
        </View>

        <View style={styles.roomBody}>
          <View style={styles.roomTopRow}>
            <View style={styles.roomNameRow}>
              <Text
                style={[styles.roomName, unread > 0 && styles.roomNameUnread]}
                numberOfLines={1}>
                {room.name}
              </Text>
              {isAi && (
                <View style={styles.roomTypePill}>
                  <Text style={styles.roomTypePillText}>Trợ lý</Text>
                </View>
              )}
            </View>
            <Text style={[styles.roomTime, unread > 0 && styles.roomTimeUnread]}>
              {room.lastMessageTime || ''}
            </Text>
          </View>

          <View style={styles.roomBottomRow}>
            <Text
              style={[styles.roomSnippet, unread > 0 && styles.roomSnippetUnread]}
              numberOfLines={1}>
              {room.lastMessage || 'Bắt đầu cuộc trò chuyện'}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadPill}>
                <Text style={styles.unreadPillText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const canSend = inputText.trim().length > 0 && !sending;
  const showQuickPrompts =
    activeRoom?.type === 'AI' && !inputText.trim() && !loadingMessages;

  const threadSubtitle = (() => {
    if (!activeRoom) return '';
    if (activeRoom.type === 'AI') return 'Trợ lý du lịch · Luôn sẵn sàng';
    if (activeRoom.type === 'GROUP' || activeRoom.type === 'ITINERARY') {
      const count = activeRoom.membersCount;
      return count ? `${count} thành viên` : 'Nhóm trò chuyện';
    }
    return activeRoom.statusText || (activeRoom.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến');
  })();

  // ── UI ────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={activeRoom ? handleBack : handleClose}>
      <View style={styles.root}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          {activeRoom ? (
            <>
              <TouchableOpacity
                style={styles.headerIconBtn}
                activeOpacity={0.8}
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Quay lại danh sách trò chuyện">
                <FontAwesome name="chevron-left" size={15} color={WF_COLORS.slate700} />
              </TouchableOpacity>

              <View style={styles.threadHeaderCenter}>
                <View style={styles.threadAvatarWrap}>
                  <Image
                    source={{ uri: activeRoom.avatarUrl || FALLBACK_AVATAR }}
                    style={styles.threadAvatar}
                  />
                  {activeRoom.type !== 'AI' &&
                    activeRoom.type !== 'GROUP' &&
                    activeRoom.type !== 'ITINERARY' &&
                    activeRoom.isOnline && <View style={styles.threadOnlineDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.threadTitle} numberOfLines={1}>
                    {activeRoom.name}
                  </Text>
                  <Text style={styles.threadSubtitle} numberOfLines={1}>
                    {threadSubtitle}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.headerIconBtn}
                activeOpacity={0.8}
                onPress={handleClearChat}
                accessibilityRole="button"
                accessibilityLabel="Xoá lịch sử trò chuyện trên thiết bị">
                <FontAwesome name="trash-o" size={15} color={WF_COLORS.slate500} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerEyebrow}>WAYFARE</Text>
                <Text style={styles.headerTitle}>Tin nhắn</Text>
                <Text style={styles.headerSubtitle}>
                  {loadingRooms && rooms.length === 0
                    ? 'Đang đồng bộ hộp thư...'
                    : unreadTotal > 0
                      ? `${unreadTotal} tin nhắn chưa đọc`
                      : `${rooms.length} cuộc trò chuyện`}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.composeBtn}
                activeOpacity={0.85}
                onPress={() => setIsNewChatOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Bắt đầu cuộc trò chuyện mới">
                <FontAwesome name="pencil" size={15} color={WF_COLORS.white} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.headerIconBtn, { marginLeft: 8 }]}
                activeOpacity={0.8}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Đóng hộp thư">
                <FontAwesome name="times" size={15} color={WF_COLORS.slate500} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {!activeRoom ? (
          <View style={styles.roomsScreen}>
            {/* Travel assistant hero */}
            {aiRoom && (
              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.assistantCard}
                onPress={() => handleSelectRoom(aiRoom)}>
                <View style={styles.assistantIcon}>
                  <FontAwesome name="compass" size={20} color="#B45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assistantTitle}>Trợ lý du lịch</Text>
                  <Text style={styles.assistantDesc} numberOfLines={2}>
                    Gợi ý lịch trình, món ngon và chi phí cho chuyến đi của bạn
                  </Text>
                </View>
                <View style={styles.assistantCta}>
                  <Text style={styles.assistantCtaText}>Hỏi ngay</Text>
                  <FontAwesome
                    name="long-arrow-right"
                    size={11}
                    color="#B45309"
                    style={{ marginLeft: 5 }}
                  />
                </View>
              </TouchableOpacity>
            )}

            {/* Search */}
            <View style={styles.searchBox}>
              <FontAwesome name="search" size={13} color={WF_COLORS.slate400} />
              <TextInput
                style={[styles.searchInput, WEB_NO_OUTLINE]}
                placeholder="Tìm cuộc trò chuyện..."
                placeholderTextColor={WF_COLORS.slate400}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                  <FontAwesome name="times-circle" size={15} color={WF_COLORS.slate400} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filterRow}>
              {(
                [
                  { id: 'all', label: 'Tất cả', count: counts.all },
                  { id: 'unread', label: 'Chưa đọc', count: counts.unread },
                  { id: 'ai', label: 'Trợ lý', count: counts.ai },
                  { id: 'group', label: 'Nhóm', count: counts.group },
                  { id: 'direct', label: 'Bạn bè', count: counts.direct },
                ] as const
              ).map((filter) => {
                const isActive = activeFilter === filter.id;
                return (
                  <Animated.View
                    key={filter.id}
                    style={
                      filter.id === 'unread' && isActive
                        ? { transform: [{ scale: filterPulse }] }
                        : undefined
                    }>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setActiveFilter(filter.id)}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      accessibilityRole="button"
                      accessibilityLabel={`Lọc ${filter.label}`}>
                      <Text
                        style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                        {filter.label}
                      </Text>
                      {filter.count > 0 && (
                        <View
                          style={[styles.filterCount, isActive && styles.filterCountActive]}>
                          <Text
                            style={[
                              styles.filterCountText,
                              isActive && styles.filterCountTextActive,
                            ]}>
                            {filter.count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </ScrollView>

            {roomsError && !loadingRooms ? (
              <View style={styles.errorBanner}>
                <FontAwesome name="wifi" size={13} color="#B91C1C" />
                <Text style={styles.errorBannerText}>{roomsError}</Text>
                <TouchableOpacity onPress={() => loadRooms()} hitSlop={8}>
                  <Text style={styles.errorRetry}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {loadingRooms && rooms.length === 0 ? (
              <RoomsSkeleton />
            ) : (
              <FlatList
                data={roomItems}
                keyExtractor={(item) => item.key}
                renderItem={renderRoomItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                  styles.roomList,
                  roomItems.length === 0 && styles.roomListEmpty,
                ]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshingRooms}
                    onRefresh={handleRefreshRooms}
                    tintColor={WF_COLORS.primary}
                    colors={[WF_COLORS.primary]}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <View style={styles.emptyIcon}>
                      <FontAwesome
                        name="comments-o"
                        size={28}
                        color={WF_COLORS.primary}
                      />
                    </View>
                    <Text style={styles.emptyTitle}>
                      {rooms.length === 0
                        ? 'Hộp thư đang trống'
                        : 'Không tìm thấy cuộc trò chuyện'}
                    </Text>
                    <Text style={styles.emptyDesc}>
                      {rooms.length === 0
                        ? 'Bắt đầu trò chuyện với một người bạn hoặc hỏi trợ lý du lịch để lên ý tưởng cho chuyến đi.'
                        : 'Thử từ khoá khác hoặc xoá bộ lọc để xem tất cả cuộc trò chuyện.'}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.emptyAction}
                      onPress={() => {
                        if (rooms.length === 0) {
                          setIsNewChatOpen(true);
                        } else {
                          setSearchQuery('');
                          setActiveFilter('all');
                        }
                      }}>
                      <Text style={styles.emptyActionText}>
                        {rooms.length === 0 ? 'Bắt đầu trò chuyện' : 'Xoá bộ lọc'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
        ) : (
          /* ── Thread ─────────────────────────────────────── */
          <KeyboardAvoidingView
            style={styles.threadScreen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
            <View style={styles.threadBody}>
              {loadingMessages ? (
                <MessagesSkeleton />
              ) : messagesError ? (
                <View style={styles.threadError}>
                  <View style={styles.threadErrorIcon}>
                    <FontAwesome name="wifi" size={22} color="#B91C1C" />
                  </View>
                  <Text style={styles.threadErrorTitle}>Không tải được tin nhắn</Text>
                  <Text style={styles.threadErrorDesc}>{messagesError}</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.threadErrorBtn}
                    onPress={() => handleSelectRoom(activeRoom)}>
                    <Text style={styles.threadErrorBtnText}>Thử lại</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  data={chatItems}
                  keyExtractor={(item) => item.key}
                  renderItem={renderChatItem}
                  contentContainerStyle={[
                    styles.messageList,
                    chatItems.length === 0 && styles.messageListEmpty,
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                  onScroll={handleMessagesScroll}
                  scrollEventThrottle={16}
                  onContentSizeChange={() => {
                    if (nearBottomRef.current) {
                      listRef.current?.scrollToEnd({ animated: true });
                    }
                  }}
                  ListFooterComponent={
                    isAiTyping ? (
                      <View style={styles.typingRow}>
                        <Image
                          source={{ uri: activeRoom.avatarUrl || AI_FALLBACK_AVATAR }}
                          style={styles.typingAvatar}
                        />
                        <View style={styles.typingBubble}>
                          <TypingDots />
                          <Text style={styles.typingLabel}>Đang soạn...</Text>
                        </View>
                      </View>
                    ) : null
                  }
                  ListEmptyComponent={
                    <View style={styles.threadEmpty}>
                      <View style={styles.threadEmptyIcon}>
                        <FontAwesome
                          name={activeRoom.type === 'AI' ? 'compass' : 'comments-o'}
                          size={26}
                          color={WF_COLORS.primary}
                        />
                      </View>
                      <Text style={styles.threadEmptyTitle}>
                        {activeRoom.type === 'AI'
                          ? 'Bắt đầu trò chuyện với trợ lý'
                          : 'Chưa có tin nhắn nào'}
                      </Text>
                      <Text style={styles.threadEmptyDesc}>
                        {activeRoom.type === 'AI'
                          ? 'Hỏi về điểm đến, lịch trình, món ngon hoặc ngân sách cho chuyến đi của bạn.'
                          : 'Gửi lời chào đầu tiên để bắt đầu cuộc trò chuyện.'}
                      </Text>
                    </View>
                  }
                />
              )}

              {showJumpToBottom && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.jumpButton}
                  onPress={() => scrollToBottom(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Xuống tin nhắn mới nhất">
                  <FontAwesome name="angle-down" size={17} color={WF_COLORS.primary} />
                  {newMessageCount > 0 && (
                    <View style={styles.jumpBadge}>
                      <Text style={styles.jumpBadgeText}>
                        {newMessageCount > 9 ? '9+' : newMessageCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {showQuickPrompts && (
              <View style={styles.quickWrap}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.quickScrollView}
                  contentContainerStyle={styles.quickScroll}
                  keyboardShouldPersistTaps="handled">
                  {QUICK_AI_PROMPTS.map((prompt) => (
                    <TouchableOpacity
                      key={prompt}
                      activeOpacity={0.8}
                      style={styles.quickChip}
                      onPress={() => sendMessageInternal(prompt)}>
                      <Text style={styles.quickChipText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View
              style={[
                styles.inputBar,
                { paddingBottom: Math.max(insets.bottom, 10) },
              ]}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.attachButton}
                onPress={handlePickImage}
                disabled={sending}
                accessibilityRole="button"
                accessibilityLabel="Gửi ảnh từ thư viện">
                <FontAwesome
                  name="camera"
                  size={17}
                  color={sending ? WF_COLORS.slate400 : WF_COLORS.slate600}
                />
              </TouchableOpacity>

              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, WEB_NO_OUTLINE, { height: Math.min(112, Math.max(40, inputHeight)) }]}
                  placeholder={
                    activeRoom.type === 'AI'
                      ? 'Hỏi về điểm đến, món ngon, chi phí...'
                      : 'Nhập tin nhắn...'
                  }
                  placeholderTextColor={WF_COLORS.slate400}
                  value={inputText}
                  onChangeText={handleInputChange}
                  onContentSizeChange={handleInputContentSizeChange}
                  multiline
                  maxLength={500}
                  blurOnSubmit={false}
                  onFocus={() => setTimeout(() => scrollToBottom(true), 260)}
                />
                {inputText.length > 440 && (
                  <Text style={styles.charCount}>{inputText.length}/500</Text>
                )}
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.sendButton, canSend ? styles.sendButtonActive : styles.sendButtonIdle]}
                onPress={() => sendMessageInternal(inputText)}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityLabel="Gửi tin nhắn">
                {sending ? (
                  <ActivityIndicator size="small" color={WF_COLORS.white} />
                ) : (
                  <FontAwesome
                    name="paper-plane"
                    size={14}
                    color={canSend ? WF_COLORS.white : WF_COLORS.slate400}
                  />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* New chat sheet */}
        <NewChatSheet
          visible={isNewChatOpen}
          onClose={() => setIsNewChatOpen(false)}
          onSelectRoom={handleCreatedRoom}
        />

        {/* Full-screen image preview */}
        {!!previewImage && (
          <View style={styles.previewRoot}>
            <Pressable
              style={styles.previewBackdrop}
              onPress={() => setPreviewImage(null)}
            />
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={[styles.previewClose, { top: insets.top + 12 }]}
              onPress={() => setPreviewImage(null)}
              accessibilityRole="button"
              accessibilityLabel="Đóng ảnh">
              <FontAwesome name="times" size={18} color={WF_COLORS.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Itinerary detail */}
        {selectedItinForModal && (
          <ItineraryDetailModal
            visible={itinModalVisible}
            onClose={() => {
              setItinModalVisible(false);
              setSelectedItinForModal(null);
            }}
            itinerary={selectedItinForModal}
            canEdit={false}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F6F8FB',
  },

  // ── Header ────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: WF_COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WF_COLORS.slate200,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 5,
  },
  headerEyebrow: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: WF_COLORS.primary,
    marginBottom: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: WF_COLORS.slate500,
    marginTop: 1,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  composeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WF_COLORS.primary,
    shadowColor: WF_COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  threadHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  threadAvatarWrap: {
    position: 'relative',
    marginRight: 10,
  },
  threadAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: WF_COLORS.slate100,
    borderWidth: 1.5,
    borderColor: WF_COLORS.primaryLight,
  },
  threadOnlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: WF_COLORS.emerald,
    borderWidth: 2,
    borderColor: WF_COLORS.white,
  },
  threadTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  threadSubtitle: {
    fontSize: 10.5,
    color: WF_COLORS.slate500,
    marginTop: 1,
  },

  // ── Rooms screen ─────────────────────────────────────────
  roomsScreen: {
    flex: 1,
  },
  assistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    padding: 13,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  assistantIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  assistantTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 2,
  },
  assistantDesc: {
    fontSize: 10.5,
    lineHeight: 15,
    color: '#92400E',
  },
  assistantCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
  },
  assistantCtaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.white,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: WF_COLORS.slate900,
    paddingVertical: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 50,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: WF_COLORS.white,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
  },
  filterChipActive: {
    backgroundColor: WF_COLORS.primary,
    borderColor: WF_COLORS.primary,
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: WF_COLORS.slate600,
  },
  filterChipTextActive: {
    color: WF_COLORS.white,
  },
  filterCount: {
    minWidth: 16,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: WF_COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  filterCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: WF_COLORS.slate500,
  },
  filterCountTextActive: {
    color: WF_COLORS.white,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
    color: '#B91C1C',
  },
  errorRetry: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B91C1C',
  },
  roomList: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  roomListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 5,
  },
  sectionLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: WF_COLORS.slate400,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: 9.5,
    fontWeight: '700',
    color: WF_COLORS.slate400,
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: WF_COLORS.white,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.025,
    shadowRadius: 4,
    elevation: 1,
  },
  roomAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  roomAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: WF_COLORS.slate100,
  },
  roomAvatarUnread: {
    borderWidth: 2,
    borderColor: WF_COLORS.primaryLight,
  },
  roomOnlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: WF_COLORS.emerald,
    borderWidth: 2,
    borderColor: WF_COLORS.white,
  },
  roomAvatarBadgeAi: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: WF_COLORS.white,
  },
  roomAvatarBadgeGroup: {
    position: 'absolute',
    left: -2,
    top: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: WF_COLORS.white,
  },
  roomBody: {
    flex: 1,
  },
  roomTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  roomNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 6,
  },
  roomName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: WF_COLORS.slate900,
    flexShrink: 1,
  },
  roomNameUnread: {
    fontWeight: '800',
    color: '#0B1220',
  },
  roomTypePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: WF_COLORS.amberLight,
  },
  roomTypePillText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#B45309',
  },
  roomTime: {
    fontSize: 9.5,
    fontWeight: '500',
    color: WF_COLORS.slate400,
  },
  roomTimeUnread: {
    color: WF_COLORS.primary,
    fontWeight: '800',
  },
  roomBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomSnippet: {
    flex: 1,
    fontSize: 11.5,
    color: WF_COLORS.slate500,
    marginRight: 8,
  },
  roomSnippetUnread: {
    color: WF_COLORS.slate700,
    fontWeight: '600',
  },
  unreadPill: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: WF_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: WF_COLORS.white,
  },
  emptyBox: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 30,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: WF_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    marginBottom: 5,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 11.5,
    lineHeight: 18,
    color: WF_COLORS.slate500,
    textAlign: 'center',
    maxWidth: 290,
  },
  emptyAction: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: WF_COLORS.primary,
  },
  emptyActionText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: WF_COLORS.white,
  },

  // ── Thread ───────────────────────────────────────────────
  threadScreen: {
    flex: 1,
  },
  threadBody: {
    flex: 1,
    position: 'relative',
  },
  messageList: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  messageListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 6,
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: WF_COLORS.slate200,
  },
  dateLabel: {
    marginHorizontal: 10,
    fontSize: 9.5,
    fontWeight: '700',
    color: WF_COLORS.slate400,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 3,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatarSlot: {
    width: 34,
    marginRight: 6,
    alignItems: 'center',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: WF_COLORS.slate100,
  },
  messageColumn: {
    maxWidth: '79%',
    alignItems: 'flex-start',
  },
  messageColumnMe: {
    alignItems: 'flex-end',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
    marginLeft: 3,
  },
  senderName: {
    fontSize: 10,
    fontWeight: '800',
    color: WF_COLORS.primary,
    maxWidth: 190,
  },
  assistantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: WF_COLORS.amberLight,
  },
  assistantBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#B45309',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: '100%',
  },
  bubbleMe: {
    backgroundColor: WF_COLORS.primary,
    shadowColor: WF_COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleOther: {
    backgroundColor: WF_COLORS.white,
    borderWidth: 1,
    borderColor: '#E8EEF5',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  bubbleImage: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 6,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 19,
  },
  bubbleTextMe: {
    color: WF_COLORS.white,
  },
  bubbleTextOther: {
    color: '#1E293B',
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    paddingHorizontal: 2,
  },
  bubbleTime: {
    fontSize: 8.5,
    fontWeight: '600',
    color: WF_COLORS.slate400,
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.72)',
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    marginRight: 2,
  },
  retryText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  systemRow: {
    alignItems: 'center',
    marginVertical: 7,
  },
  systemText: {
    fontSize: 9.5,
    lineHeight: 14,
    color: WF_COLORS.slate500,
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 6,
  },
  typingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 6,
    backgroundColor: WF_COLORS.slate100,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: WF_COLORS.white,
    borderWidth: 1,
    borderColor: '#E8EEF5',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderBottomLeftRadius: 6,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: WF_COLORS.primary,
  },
  typingLabel: {
    fontSize: 9,
    color: WF_COLORS.slate400,
    fontWeight: '600',
  },
  jumpButton: {
    position: 'absolute',
    right: 16,
    bottom: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WF_COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
  },
  jumpBadge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: WF_COLORS.rose,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: WF_COLORS.white,
  },
  jumpBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: WF_COLORS.white,
  },
  threadEmpty: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  threadEmptyIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: WF_COLORS.primarySoft,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  threadEmptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    textAlign: 'center',
    marginBottom: 5,
  },
  threadEmptyDesc: {
    fontSize: 11.5,
    lineHeight: 18,
    color: WF_COLORS.slate500,
    textAlign: 'center',
    maxWidth: 290,
  },
  quickWrap: {
    backgroundColor: WF_COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: WF_COLORS.slate200,
  },
  quickScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 7,
  },
  quickScrollView: {
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
  },
  quickChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: WF_COLORS.primarySoft,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
  },
  quickChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: WF_COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: WF_COLORS.slate200,
  },
  attachButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WF_COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
    marginBottom: 1,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: WF_COLORS.slate50,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    paddingHorizontal: 12,
    paddingVertical: 2,
    marginRight: 7,
    justifyContent: 'center',
    minHeight: 40,
  },
  input: {
    fontSize: 13,
    lineHeight: 18,
    color: WF_COLORS.slate900,
    paddingTop: Platform.OS === 'ios' ? 9 : 7,
    paddingBottom: Platform.OS === 'ios' ? 9 : 7,
  },
  charCount: {
    position: 'absolute',
    right: 9,
    bottom: 2,
    fontSize: 8,
    color: WF_COLORS.slate400,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendButtonActive: {
    backgroundColor: WF_COLORS.primary,
    shadowColor: WF_COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.26,
    shadowRadius: 5,
    elevation: 3,
  },
  sendButtonIdle: {
    backgroundColor: WF_COLORS.slate100,
  },

  // ── Attachments & itinerary ──────────────────────────────
  imageWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: WF_COLORS.slate100,
  },
  imageBubble: {
    width: Math.min(SCREEN_WIDTH * 0.62, 238),
    height: Math.min(SCREEN_WIDTH * 0.62, 238) * 0.74,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imageOverlayText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: WF_COLORS.white,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 190,
    maxWidth: 250,
    paddingVertical: 6,
  },
  attachmentCardMe: {
    minWidth: 190,
  },
  attachmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: WF_COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentIconMe: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  attachmentTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  attachmentTextMe: {
    color: WF_COLORS.white,
  },
  attachmentSubtitle: {
    fontSize: 9.5,
    color: WF_COLORS.slate500,
    marginTop: 1,
  },
  attachmentSubtitleMe: {
    color: 'rgba(255,255,255,0.75)',
  },
  itineraryCard: {
    width: 244,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: WF_COLORS.primarySoft,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
  },
  itineraryCover: {
    width: '100%',
    height: 86,
  },
  itineraryBody: {
    padding: 9,
  },
  itineraryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 6,
  },
  itineraryDestinationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WF_COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 7,
    maxWidth: '70%',
  },
  itineraryDestinationText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: WF_COLORS.white,
  },
  itineraryDuration: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0369A1',
  },
  itineraryTitle: {
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    marginBottom: 6,
  },
  itineraryBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: WF_COLORS.primaryLight,
  },
  itineraryBudget: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#B45309',
  },
  itineraryLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itineraryLinkText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: WF_COLORS.primary,
  },

  // ── Loading / error ──────────────────────────────────────
  roomsSkeleton: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  skeletonRoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: WF_COLORS.white,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: WF_COLORS.slate200,
    marginRight: 12,
  },
  skeletonLineWide: {
    height: 11,
    width: '58%',
    borderRadius: 5,
    backgroundColor: WF_COLORS.slate200,
    marginBottom: 7,
  },
  skeletonLineShort: {
    height: 9,
    width: '82%',
    borderRadius: 5,
    backgroundColor: WF_COLORS.slate100,
  },
  skeletonTime: {
    width: 28,
    height: 9,
    borderRadius: 5,
    backgroundColor: WF_COLORS.slate100,
    marginLeft: 8,
  },
  messagesSkeleton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  skeletonBubble: {
    height: 42,
    borderRadius: 16,
    backgroundColor: WF_COLORS.slate200,
    marginBottom: 12,
  },
  skeletonBubbleOther: {
    alignSelf: 'flex-start',
    width: '58%',
  },
  skeletonBubbleMe: {
    alignSelf: 'flex-end',
    width: '46%',
    backgroundColor: WF_COLORS.primaryLight,
  },
  threadError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  threadErrorIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  threadErrorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    marginBottom: 5,
  },
  threadErrorDesc: {
    fontSize: 11.5,
    lineHeight: 17,
    color: WF_COLORS.slate500,
    textAlign: 'center',
    maxWidth: 280,
  },
  threadErrorBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 13,
    backgroundColor: WF_COLORS.primary,
  },
  threadErrorBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: WF_COLORS.white,
  },

  // ── Image preview ────────────────────────────────────────
  previewRoot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 80,
    elevation: 80,
  },
  previewBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  previewClose: {
    position: 'absolute',
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
