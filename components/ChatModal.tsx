import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { WF_COLORS } from '@/constants/Colors';
import { chatApi, ChatRoom, ChatMessage } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ChatModal({ visible, onClose }: ChatModalProps) {
  const insets = useSafeAreaInsets();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      loadRooms();
    }
  }, [visible]);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const data = await chatApi.getRooms();
      setRooms(data || []);
      // Default open first room if none selected
      if (!activeRoom && data && data.length > 0) {
        // We can stay in room list or pick the AI bot
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

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeRoom) return;
    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic message
    const tempMsg: ChatMessage = {
      id: Date.now(),
      roomId: activeRoom.id,
      content: textToSend,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await chatApi.sendMessage(activeRoom.id, textToSend);

      // Nếu là AI Bot, phản hồi tự động sau 800ms
      if (activeRoom.type === 'AI') {
        setTimeout(() => {
          let aiReply = 'Tôi đã ghi nhận! Bạn có thể xem thêm chi tiết các điểm đến nổi bật ở tab Khám phá nhé!';
          const lower = textToSend.toLowerCase();
          if (lower.includes('đà lạt')) {
            aiReply = 'Đà Lạt mùa này săn mây Suối Tía từ 5h15 sáng rất đẹp, tối bạn nên thử lẩu gà lá é Tao Ngộ 280k nhé! 🌸';
          } else if (lower.includes('phú quốc')) {
            aiReply = 'Phú Quốc nên đi cano 4 đảo Hòn Mây Rút, lặn ngắm san hô tự nhiên và ngắm hoàng hôn Sunset Sanato! 🏖️';
          } else if (lower.includes('ăn') || lower.includes('quán')) {
            aiReply = 'Hệ thống gợi ý cho bạn: Bánh căn Lệ, Bánh mì xíu mại Hoàng Diệu, Kem bơ Thanh Thảo. Tất cả đều có điểm đánh giá 4.9⭐ trên Wayfare!';
          }

          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + 1,
              roomId: activeRoom.id,
              senderName: 'Trợ lý AI Wayfare',
              senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
              content: aiReply,
              createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isMe: false,
            },
          ]);
        }, 800);
      }
    } catch (e) {
      console.warn('Error sending message', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (activeRoom) {
                setActiveRoom(null);
              } else {
                onClose();
              }
            }}>
            <FontAwesome name={activeRoom ? 'chevron-left' : 'times'} size={18} color={WF_COLORS.slate700} />
          </TouchableOpacity>

          {activeRoom ? (
            <View style={styles.roomHeaderCenter}>
              <Image source={{ uri: activeRoom.avatarUrl }} style={styles.roomHeaderAvatar} />
              <View>
                <Text style={styles.roomHeaderTitle} numberOfLines={1}>
                  {activeRoom.name}
                </Text>
                <View style={styles.statusOnlineRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.statusOnlineText}>Đang hoạt động</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.modalTitleBox}>
              <FontAwesome name="comments" size={18} color={WF_COLORS.primary} style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Tin nhắn & Trò chuyện</Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeBtnSmall} onPress={onClose}>
            <FontAwesome name="times" size={18} color={WF_COLORS.slate500} />
          </TouchableOpacity>
        </View>

        {/* Body: Danh sách phòng hoặc Cuộc hội thoại */}
        {!activeRoom ? (
          // ─── DANH SÁCH CUỘC HỘI THOẠI ─────────────────────────
          <View style={styles.roomsListContainer}>
            <View style={styles.searchBar}>
              <FontAwesome name="search" size={14} color={WF_COLORS.slate400} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Tìm kiếm người bạn du lịch, nhóm chat..."
                placeholderTextColor={WF_COLORS.slate400}
                style={styles.searchInput}
              />
            </View>

            {loadingRooms ? (
              <ActivityIndicator color={WF_COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={rooms}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.roomItem} onPress={() => handleSelectRoom(item)}>
                    <View style={styles.avatarWrapper}>
                      <Image source={{ uri: item.avatarUrl }} style={styles.roomAvatar} />
                      <View style={styles.avatarOnlineDot} />
                    </View>
                    <View style={styles.roomInfo}>
                      <View style={styles.roomNameRow}>
                        <Text style={styles.roomName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.roomTime}>{item.lastMessageTime}</Text>
                      </View>
                      <Text style={styles.roomLastMsg} numberOfLines={1}>
                        {item.lastMessage}
                      </Text>
                    </View>
                    {(item.unreadCount ?? 0) > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        ) : (
          // ─── KHUNG CHAT VỚI NGƯỜI DÙNG / AI ───────────────────
          <KeyboardAvoidingView
            style={styles.chatThreadContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
            {loadingMessages ? (
              <ActivityIndicator color={WF_COLORS.primary} style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item, index) => String(item.id || index)}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                  const isMe = item.isMe;
                  return (
                    <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
                      {!isMe && (
                        <Image
                          source={{
                            uri:
                              item.senderAvatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                          }}
                          style={styles.msgAvatar}
                        />
                      )}
                      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                        {!isMe && item.senderName && (
                          <Text style={styles.bubbleSenderName}>{item.senderName}</Text>
                        )}
                        <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                          {item.content}
                        </Text>
                        <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                          {item.createdAt}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {/* Input Bar */}
            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
              <TouchableOpacity style={styles.attachBtn}>
                <FontAwesome name="image" size={18} color={WF_COLORS.slate500} />
              </TouchableOpacity>
              <TextInput
                style={styles.chatTextInput}
                placeholder="Nhập tin nhắn với bạn bè hoặc hỏi AI..."
                placeholderTextColor={WF_COLORS.slate400}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || sending}>
                <FontAwesome name="paper-plane" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  roomHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
  },
  roomHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    maxWidth: 200,
  },
  statusOnlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  statusOnlineText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },

  // Rooms List
  roomsListContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  roomAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E2E8F0',
  },
  avatarOnlineDot: {
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
  roomInfo: {
    flex: 1,
  },
  roomNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  roomTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  roomLastMsg: {
    fontSize: 12,
    color: '#64748B',
  },
  unreadBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Thread
  chatThreadContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  msgRow: {
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
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#E2E8F0',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: '#0284C7',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleSenderName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
  },
  bubbleTextOther: {
    color: '#0F172A',
  },
  bubbleTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMe: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  bubbleTimeOther: {
    color: '#94A3B8',
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
});
