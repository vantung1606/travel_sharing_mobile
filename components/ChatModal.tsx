import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { Text, TextInput } from '@/components/Themed';
import { SERIF_FONT } from '@/constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as ImagePicker from 'expo-image-picker';
import { WF_COLORS } from '@/constants/Colors';
import { chatApi, ChatRoom, ChatMessage, ItineraryItem } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';
import { aiService } from '@/src/services/aiService';
import { ItineraryDetailModal } from './ItineraryDetailModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialRoomId?: string | number;
}

const QUICK_AI_PROMPTS = [
  '🌤️ Thời tiết & săn mây Đà Lạt',
  '🍲 Top 5 món ngon Sa Pa',
  '🏖️ Lịch trình 3N2Đ Phú Quốc tiết kiệm',
  '🛵 Cung đường phượt Hà Giang',
  '🏮 Check-in phố cổ Hội An',
  '☕ Quán cafe view đẹp nhất',
];

export function ChatModal({ visible, onClose, initialRoomId }: ChatModalProps) {
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'ai' | 'group' | 'direct'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Itinerary detail modal inside chat
  const [selectedItinForModal, setSelectedItinForModal] = useState<ItineraryItem | null>(null);
  const [itinModalVisible, setItinModalVisible] = useState<boolean>(false);

  const flatListRef = useRef<FlatList>(null);

  // Pulse animation for AI status
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (visible) {
      loadRooms();
    } else {
      setActiveRoom(null);
      setSearchQuery('');
    }
  }, [visible]);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const data = await chatApi.getRooms();
      setRooms(data || []);

      if (initialRoomId && data) {
        const found = data.find((r) => String(r.id) === String(initialRoomId));
        if (found) {
          handleSelectRoom(found);
        }
      }
    } catch (e) {
      console.warn('Error loading rooms', e);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleSelectRoom = async (room: ChatRoom) => {
    setActiveRoom(room);
    setLoadingMessages(true);
    try {
      const msgs = await chatApi.getRoomMessages(room.id);
      setMessages(msgs || []);
    } catch (e) {
      console.warn('Error loading messages', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Gửi tin nhắn văn bản
  const sendMessageInternal = async (contentToSend: string) => {
    if (!contentToSend.trim() || !activeRoom) return;
    const cleanText = contentToSend.trim();
    setInputText('');
    setSending(true);

    const tempMsg: ChatMessage = {
      id: Date.now(),
      roomId: activeRoom.id,
      content: cleanText,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      messageType: 'TEXT',
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await chatApi.sendMessage(activeRoom.id, cleanText);

      // Nếu là AI Bot, phản hồi tự động thông minh bằng AI thật
      if (activeRoom.type === 'AI') {
        setIsAiTyping(true);
        (async () => {
          try {
            const aiReply = await aiService.generateText({
              prompt: cleanText,
              systemPrompt: 'Bạn là WanderAI, trợ lý du lịch thông minh, thân thiện của Wayfare. Hãy tư vấn điểm đến, ẩm thực, chi phí và lịch trình một cách súc tích, hấp dẫn và thiết thực bằng tiếng Việt.',
              temperature: 0.7,
              responseMimeType: 'text/plain',
            });

            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 1,
                roomId: activeRoom.id,
                senderName: 'Trợ lý AI Wayfare',
                senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                content: aiReply || 'Chào bạn! Tôi có thể giúp gì cho chuyến du lịch sắp tới của bạn?',
                createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: false,
              },
            ]);
          } catch (aiErr: any) {
            console.warn('AI chatbot error:', aiErr);
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 1,
                roomId: activeRoom.id,
                senderName: 'Trợ lý AI Wayfare',
                senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                content: 'WanderAI hiện đang bận xử lý hoặc kết nối gián đoạn. Bạn vui lòng thử lại sau giây lát nhé!',
                createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: false,
              },
            ]);
          } finally {
            setIsAiTyping(false);
          }
        })();
      }
    } catch (e) {
      console.warn('Error sending message', e);
    } finally {
      setSending(false);
    }
  };

  // Gửi ảnh chụp từ máy
  const handlePickImage = async () => {
    if (!activeRoom) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Vui lòng cho phép ứng dụng truy cập thư viện ảnh để gửi hình ảnh.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets[0].uri) {
        const imageUri = res.assets[0].uri;
        const newMsg: ChatMessage = {
          id: Date.now(),
          roomId: activeRoom.id,
          content: 'Đã chia sẻ 1 bức ảnh hành trình 📸',
          imageUrl: imageUri,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: true,
          messageType: 'IMAGE',
        };
        setMessages((prev) => [...prev, newMsg]);

        if (activeRoom.type === 'AI') {
          setIsAiTyping(true);
          setTimeout(() => {
            setIsAiTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + 1,
                roomId: activeRoom.id,
                senderName: 'Trợ lý AI Wayfare',
                senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                content: 'Bức ảnh chụp góc rất đẹp và ánh sáng tự nhiên tuyệt vời! Điểm check-in này rất thích hợp để đưa vào cẩm nang du lịch Wayfare của bạn. ✨',
                createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: false,
              },
            ]);
          }, 800);
        }
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ máy.');
    }
  };

  const handleClearChat = () => {
    Alert.alert('Xóa cuộc trò chuyện', 'Bạn có chắc chắn muốn xóa tin nhắn trong phòng này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => setMessages([]),
      },
    ]);
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Type filter
      if (activeFilter === 'ai' && r.type !== 'AI') return false;
      if (activeFilter === 'group' && r.type !== 'GROUP') return false;
      if (activeFilter === 'direct' && (r.type === 'AI' || r.type === 'GROUP')) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (r.name || '').toLowerCase().includes(q);
        const matchLast = (r.lastMessage || '').toLowerCase().includes(q);
        return matchName || matchLast;
      }
      return true;
    });
  }, [rooms, activeFilter, searchQuery]);

  const aiBotRoom = useMemo(() => rooms.find((r) => r.type === 'AI') || rooms[0], [rooms]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        
        {/* ========================================================= */}
        {/* 1. TOP PREMIUM HEADER BAR                                 */}
        {/* ========================================================= */}
        <View style={styles.topHeader}>
          {/* Left Action Button (Back or Close) */}
          <TouchableOpacity
            style={styles.headerCircleBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (activeRoom) {
                setActiveRoom(null);
              } else {
                onClose();
              }
            }}>
            <FontAwesome
              name={activeRoom ? 'chevron-left' : 'times'}
              size={15}
              color="#0F172A"
            />
          </TouchableOpacity>

          {/* Center Info */}
          {activeRoom ? (
            <View style={styles.activeHeaderInfo}>
              <View style={styles.avatarMiniWrapper}>
                <Image source={{ uri: activeRoom.avatarUrl }} style={styles.activeHeaderAvatar} />
                <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={styles.activeHeaderTitle} numberOfLines={1}>
                    {activeRoom.name}
                  </Text>
                  {activeRoom.type === 'AI' && (
                    <View style={styles.aiBadgePill}>
                      <Text style={styles.aiBadgePillText}>AI Bot</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.activeHeaderSub} numberOfLines={1}>
                  {activeRoom.type === 'AI' ? 'Trợ lý du lịch 24/7 • Phản hồi tức thì' : 'Đang hoạt động trên Wayfare'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.roomListHeaderCenter}>
              <View style={styles.headerIconBadge}>
                <FontAwesome name="comments" size={16} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.mainHeaderTitle}>Hộp Thư & Chat</Text>
                <View style={styles.liveIndicatorRow}>
                  <Animated.View style={[styles.pulseLiveDot, { transform: [{ scale: pulseAnim }] }]} />
                  <Text style={styles.liveIndicatorText}>Trực tuyến • Kết nối thời gian thực</Text>
                </View>
              </View>
            </View>
          )}

          {/* Right Action Button */}
          {activeRoom ? (
            <View style={styles.headerRightRow}>
              <TouchableOpacity
                style={styles.headerCircleBtn}
                activeOpacity={0.8}
                onPress={handleClearChat}>
                <FontAwesome name="trash-o" size={15} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerCircleBtn, { marginLeft: 8 }]}
                activeOpacity={0.8}
                onPress={onClose}>
                <FontAwesome name="times" size={15} color="#64748B" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.headerCircleBtn}
              activeOpacity={0.8}
              onPress={onClose}>
              <FontAwesome name="times" size={15} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        {/* ========================================================= */}
        {/* 2. BODY CONTENT: ROOMS LIST OR ACTIVE CHAT THREAD        */}
        {/* ========================================================= */}
        {!activeRoom ? (
          <View style={styles.roomsMainContainer}>
            
            {/* WanderAI Concierge Hero Card */}
            {aiBotRoom && (
              <TouchableOpacity
                activeOpacity={0.92}
                onPress={() => handleSelectRoom(aiBotRoom)}
                style={styles.aiHeroCard}>
                <View style={styles.aiHeroLeft}>
                  <View style={styles.aiHeroAvatarRing}>
                    <Image
                      source={{
                        uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                      }}
                      style={styles.aiHeroAvatar}
                    />
                    <View style={styles.aiHeroSparkle}>
                      <FontAwesome name="magic" size={10} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.aiHeroTitleRow}>
                      <Text style={styles.aiHeroTitle}>WanderAI Concierge</Text>
                      <View style={styles.aiHeroStatusPill}>
                        <View style={styles.greenPulse} />
                        <Text style={styles.aiHeroStatusText}>Sẵn sàng</Text>
                      </View>
                    </View>
                    <Text style={styles.aiHeroDesc} numberOfLines={2}>
                      Hỏi đáp cẩm nang, gợi ý quán ngon và săn tour trọn gói tức thì 24/7!
                    </Text>
                  </View>
                </View>
                <View style={styles.aiHeroArrow}>
                  <FontAwesome name="chevron-right" size={12} color="#0284C7" />
                </View>
              </TouchableOpacity>
            )}

            {/* Clean Rounded Search Bar */}
            <View style={styles.searchSection}>
              <View style={styles.searchBox}>
                <FontAwesome name="search" size={13} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Tìm kiếm người bạn du lịch, nhóm chat..."
                  placeholderTextColor="#94A3B8"
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <FontAwesome name="times-circle" size={14} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Filter Segment Tabs */}
            <View style={styles.filterScrollWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'ai', label: 'Trợ lý AI 🤖' },
                  { id: 'group', label: 'Nhóm du lịch 👥' },
                  { id: 'direct', label: 'Bạn bè 💬' },
                ].map((f) => {
                  const isActive = activeFilter === f.id;
                  return (
                    <TouchableOpacity
                      key={f.id}
                      activeOpacity={0.8}
                      onPress={() => setActiveFilter(f.id as any)}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}>
                      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Rooms List */}
            {loadingRooms ? (
              <View style={styles.loadingCenterBox}>
                <ActivityIndicator size="large" color={WF_COLORS.primary} />
                <Text style={styles.loadingSubText}>Đang tải danh sách hộp thư...</Text>
              </View>
            ) : filteredRooms.length === 0 ? (
              <View style={styles.emptyRoomsBox}>
                <View style={styles.emptyIconCircle}>
                  <FontAwesome name="comments-o" size={32} color="#94A3B8" />
                </View>
                <Text style={styles.emptyRoomsTitle}>Không tìm thấy cuộc trò chuyện</Text>
                <Text style={styles.emptyRoomsDesc}>
                  Thử tìm kiếm theo tên khác hoặc bấm trò chuyện cùng WanderAI để nhận gợi ý du lịch nhé!
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredRooms}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.roomsList}
                renderItem={({ item }) => {
                  const isAI = item.type === 'AI';
                  const isGroup = item.type === 'GROUP';

                  return (
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={styles.roomItemCard}
                      onPress={() => handleSelectRoom(item)}>
                      {/* Avatar */}
                      <View style={styles.roomAvatarWrapper}>
                        <Image source={{ uri: item.avatarUrl }} style={styles.roomAvatarImage} />
                        <View style={[styles.roomOnlineDot, isAI && { backgroundColor: '#F59E0B' }]} />
                        {isGroup && (
                          <View style={styles.groupBadgeMini}>
                            <FontAwesome name="users" size={8} color="#FFFFFF" />
                          </View>
                        )}
                      </View>

                      {/* Content */}
                      <View style={styles.roomItemBody}>
                        <View style={styles.roomItemTopRow}>
                          <Text style={styles.roomItemName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.roomItemTime}>{item.lastMessageTime || 'Vừa xong'}</Text>
                        </View>
                        <View style={styles.roomItemBottomRow}>
                          <Text style={styles.roomItemSnippet} numberOfLines={1}>
                            {item.lastMessage || 'Bắt đầu cuộc trò chuyện...'}
                          </Text>
                          {(item.unreadCount ?? 0) > 0 && (
                            <View style={styles.unreadPill}>
                              <Text style={styles.unreadPillText}>{item.unreadCount}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        ) : (
          /* ========================================================= */
          /* 3. ACTIVE CHAT THREAD VIEW                                */
          /* ========================================================= */
          <KeyboardAvoidingView
            style={styles.chatThreadMain}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
            
            {loadingMessages ? (
              <View style={styles.loadingCenterBox}>
                <ActivityIndicator size="large" color={WF_COLORS.primary} />
                <Text style={styles.loadingSubText}>Đang nạp lịch sử tin nhắn...</Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item, index) => String(item.id || index)}
                contentContainerStyle={styles.messagesScrollList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                  const isMe = item.isMe;
                  const isAiSender = !isMe && activeRoom.type === 'AI';

                  return (
                    <View style={[styles.msgRowWrapper, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                      {!isMe && (
                        <Image
                          source={{
                            uri:
                              item.senderAvatar ||
                              activeRoom.avatarUrl ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                          }}
                          style={styles.senderAvatarImage}
                        />
                      )}

                      <View style={[styles.bubbleContainer, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                        {!isMe && (
                          <View style={styles.senderBadgeRow}>
                            <Text style={styles.senderNameText}>
                              {item.senderName || activeRoom.name}
                            </Text>
                            {isAiSender && (
                              <View style={styles.aiSenderBadge}>
                                <FontAwesome name="magic" size={8} color="#D97706" style={{ marginRight: 3 }} />
                                <Text style={styles.aiSenderBadgeText}>AI Trợ lý</Text>
                              </View>
                            )}
                          </View>
                        )}

                        {/* Image message */}
                        {item.imageUrl && (
                          <Image
                            source={{ uri: item.imageUrl }}
                            style={styles.bubbleImagePreview}
                            resizeMode="cover"
                          />
                        )}

                        {/* Text message */}
                        <Text style={[styles.bubbleContentText, isMe ? styles.bubbleContentMe : styles.bubbleContentOther]}>
                          {item.content}
                        </Text>

                        {/* Embedded Itinerary Card (nếu AI đính kèm lịch trình) */}
                        {item.itineraryData && (
                          <TouchableOpacity
                            activeOpacity={0.88}
                            onPress={() => {
                              setSelectedItinForModal(item.itineraryData);
                              setItinModalVisible(true);
                            }}
                            style={styles.chatItineraryCard}>
                            <Image
                              source={{ uri: item.itineraryData.coverImageUrl }}
                              style={styles.chatItinCover}
                              resizeMode="cover"
                            />
                            <View style={styles.chatItinBody}>
                              <View style={styles.chatItinHeaderRow}>
                                <View style={styles.chatItinDestBadge}>
                                  <FontAwesome name="map-marker" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
                                  <Text style={styles.chatItinDestText}>{item.itineraryData.destination}</Text>
                                </View>
                                <Text style={styles.chatItinDuration}>
                                  {item.itineraryData.daysCount ? `${item.itineraryData.daysCount}N${item.itineraryData.daysCount - 1}Đ` : '3N2Đ'}
                                </Text>
                              </View>
                              <Text style={styles.chatItinTitle} numberOfLines={2}>
                                {item.itineraryData.title}
                              </Text>
                              <View style={styles.chatItinBottomRow}>
                                <Text style={styles.chatItinBudget}>
                                  ~{Number(item.itineraryData.budgetTotal || 3500000).toLocaleString('vi-VN')} đ/người
                                </Text>
                                <View style={styles.chatItinActionBtn}>
                                  <Text style={styles.chatItinActionText}>Xem chi tiết</Text>
                                  <FontAwesome name="arrow-right" size={10} color="#0284C7" style={{ marginLeft: 4 }} />
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        )}

                        {/* Footer Time & Status */}
                        <View style={styles.bubbleFooterRow}>
                          <Text style={[styles.bubbleTimeText, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                            {item.createdAt}
                          </Text>
                          {isMe && (
                            <FontAwesome name="check" size={10} color="rgba(255, 255, 255, 0.8)" style={{ marginLeft: 4 }} />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {/* AI Typing Indicator */}
            {isAiTyping && (
              <View style={styles.aiTypingBox}>
                <ActivityIndicator size="small" color="#0284C7" style={{ marginRight: 8 }} />
                <Text style={styles.aiTypingText}>WanderAI đang tìm kiếm cẩm nang & kinh nghiệm tốt nhất... ✨</Text>
              </View>
            )}

            {/* Quick AI Suggestion Chips (Gợi ý câu hỏi nhanh) */}
            <View style={styles.quickPromptContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPromptScroll}>
                {QUICK_AI_PROMPTS.map((prompt, pIdx) => (
                  <TouchableOpacity
                    key={pIdx}
                    activeOpacity={0.8}
                    style={styles.quickPromptChip}
                    onPress={() => sendMessageInternal(prompt)}>
                    <Text style={styles.quickPromptText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Bottom Input Action Bar */}
            <View style={[styles.bottomInputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              {/* Photo Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.inputActionIconBtn}
                onPress={handlePickImage}>
                <FontAwesome name="camera" size={17} color="#64748B" />
              </TouchableOpacity>

              {/* Text Input */}
              <View style={styles.inputBubbleContainer}>
                <TextInput
                  style={styles.textInputBox}
                  placeholder={activeRoom.type === 'AI' ? 'Hỏi WanderAI về điểm đến, khách sạn, món ngon...' : 'Nhập tin nhắn trò chuyện...'}
                  placeholderTextColor="#94A3B8"
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                />
              </View>

              {/* Send Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.sendBtn,
                  inputText.trim().length > 0 ? styles.sendBtnActive : styles.sendBtnDisabled,
                ]}
                onPress={() => sendMessageInternal(inputText)}
                disabled={inputText.trim().length === 0 || sending}>
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <FontAwesome name="paper-plane" size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* Modal Xem chi tiết Lịch trình khi bấm vào thẻ trong đoạn chat */}
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
  modalRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // 1. Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roomListHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  mainHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  pulseLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  liveIndicatorText: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '600',
  },
  activeHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  avatarMiniWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  activeHeaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  activeHeaderTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: SCREEN_WIDTH - 190,
  },
  aiBadgePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  aiBadgePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D97706',
  },
  activeHeaderSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // 2. Rooms List Screen
  roomsMainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  aiHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  aiHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiHeroAvatarRing: {
    position: 'relative',
    marginRight: 12,
  },
  aiHeroAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E2E8F0',
  },
  aiHeroSparkle: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  aiHeroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  aiHeroTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  aiHeroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  greenPulse: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  aiHeroStatusText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#047857',
  },
  aiHeroDesc: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  aiHeroArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0F172A',
  },
  filterScrollWrapper: {
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  roomsList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  roomItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  roomAvatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  roomAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  roomOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  groupBadgeMini: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  roomItemBody: {
    flex: 1,
  },
  roomItemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  roomItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  roomItemTime: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  roomItemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomItemSnippet: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  unreadPill: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyRoomsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyRoomsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyRoomsDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

  // 3. Active Chat Thread
  chatThreadMain: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messagesScrollList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  msgRowWrapper: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  senderAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 2,
    backgroundColor: '#E2E8F0',
  },
  bubbleContainer: {
    maxWidth: SCREEN_WIDTH * 0.76,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: '#0284C7',
    borderBottomRightRadius: 4,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  senderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  senderNameText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  aiSenderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  aiSenderBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
  },
  bubbleContentText: {
    fontSize: 13,
    lineHeight: 19,
  },
  bubbleContentMe: {
    color: '#FFFFFF',
  },
  bubbleContentOther: {
    color: '#1E293B',
  },
  bubbleImagePreview: {
    width: 200,
    height: 140,
    borderRadius: 12,
    marginBottom: 6,
  },
  bubbleFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  bubbleTimeText: {
    fontSize: 9.5,
    fontWeight: '500',
  },
  bubbleTimeMe: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  bubbleTimeOther: {
    color: '#94A3B8',
  },

  // Itinerary Card in Chat
  chatItineraryCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  chatItinCover: {
    width: '100%',
    height: 90,
  },
  chatItinBody: {
    padding: 10,
  },
  chatItinHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatItinDestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chatItinDestText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  chatItinDuration: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  chatItinTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 16,
  },
  chatItinBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
  },
  chatItinBudget: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#D97706',
  },
  chatItinActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatItinActionText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0284C7',
  },

  // AI Typing
  aiTypingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E0F2FE',
    borderRadius: 14,
  },
  aiTypingText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
    fontStyle: 'italic',
    flex: 1,
  },

  // Quick Prompt Chips
  quickPromptContainer: {
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickPromptScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  quickPromptChip: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  quickPromptText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },

  // Bottom Input Bar
  bottomInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inputActionIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  inputBubbleContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    marginRight: 8,
    maxHeight: 90,
  },
  textInputBox: {
    fontSize: 13,
    color: '#0F172A',
    lineHeight: 18,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },

  loadingCenterBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingSubText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 10,
  },
});
