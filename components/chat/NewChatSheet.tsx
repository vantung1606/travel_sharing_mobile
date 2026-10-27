import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text, TextInput } from '@/components/Themed';
import { WF_COLORS } from '@/constants/Colors';
import { SERIF_FONT } from '@/constants/Typography';
import { chatApi, ChatMember, ChatRoom } from '@/src/services/api';

const FALLBACK_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';

const WEB_NO_OUTLINE =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : undefined;

interface NewChatSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Được gọi sau khi tạo (hoặc mở lại) phòng chat 1-1 thành công. */
  onSelectRoom: (room: ChatRoom) => void;
}

/**
 * Bottom sheet chọn người để bắt đầu cuộc trò chuyện riêng.
 * Dùng API /chat/available-users (tìm kiếm phía server) + /chat/direct.
 */
export function NewChatSheet({ visible, onClose, onSelectRoom }: NewChatSheetProps) {
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<ChatMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingUserId, setCreatingUserId] = useState<number | null>(null);

  const requestIdRef = useRef(0);
  const slideAnim = useRef(new Animated.Value(36)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    slideAnim.setValue(36);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, slideAnim, backdropAnim]);

  const loadUsers = useCallback(async (search: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await chatApi.getAvailableUsers(search);
      if (requestId === requestIdRef.current) {
        setUsers(data);
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setUsers([]);
        setError('Không tải được danh sách người dùng. Vui lòng thử lại.');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    const timer = setTimeout(() => loadUsers(keyword), keyword.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [visible, keyword, loadUsers]);

  useEffect(() => {
    if (!visible) {
      setKeyword('');
      setUsers([]);
      setError(null);
      setCreatingUserId(null);
    }
  }, [visible]);

  const handlePickUser = async (user: ChatMember) => {
    if (creatingUserId != null) return;
    setCreatingUserId(user.userId);
    setError(null);
    try {
      const room = await chatApi.createDirectRoom(user.userId);
      onSelectRoom(room);
    } catch {
      setError(`Không mở được cuộc trò chuyện với ${user.fullName}. Vui lòng thử lại.`);
    } finally {
      setCreatingUserId(null);
    }
  };

  const renderUser = ({ item }: { item: ChatMember }) => {
    const isCreating = creatingUserId === item.userId;
    const status = item.statusText || (item.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến');

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.userRow}
        onPress={() => handlePickUser(item)}
        disabled={creatingUserId != null}
        accessibilityRole="button"
        accessibilityLabel={`Trò chuyện với ${item.fullName}`}>
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
            style={styles.avatar}
          />
          {item.isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.fullName}
          </Text>
          <View style={styles.userMetaRow}>
            {!!item.handle && (
              <Text style={styles.userHandle} numberOfLines={1}>
                {item.handle}
              </Text>
            )}
            <Text
              style={[styles.userStatus, item.isOnline && styles.userStatusOnline]}
              numberOfLines={1}>
              {item.isOnline ? '· ' : ''}
              {status}
            </Text>
          </View>
        </View>

        {isCreating ? (
          <ActivityIndicator size="small" color={WF_COLORS.primary} />
        ) : (
          <View style={styles.chatIconCircle}>
            <FontAwesome name="comment" size={13} color={WF_COLORS.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={styles.backdropPress} onPress={onClose} accessibilityLabel="Đóng" />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetDock}
        pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Trò chuyện mới</Text>
              <Text style={styles.sheetSubtitle}>Chọn một người bạn để bắt đầu trò chuyện</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng">
              <FontAwesome name="times" size={15} color={WF_COLORS.slate600} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <FontAwesome name="search" size={13} color={WF_COLORS.slate400} />
            <TextInput
              style={[styles.searchInput, WEB_NO_OUTLINE]}
              placeholder="Tìm theo tên, email hoặc @handle..."
              placeholderTextColor={WF_COLORS.slate400}
              value={keyword}
              onChangeText={setKeyword}
              autoCorrect={false}
              returnKeyType="search"
            />
            {keyword.length > 0 && (
              <TouchableOpacity onPress={() => setKeyword('')} hitSlop={8}>
                <FontAwesome name="times-circle" size={15} color={WF_COLORS.slate400} />
              </TouchableOpacity>
            )}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <FontAwesome name="exclamation-circle" size={13} color="#B91C1C" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadUsers(keyword)}>
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {loading && users.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={WF_COLORS.primary} />
              <Text style={styles.loadingText}>Đang tìm người phù hợp...</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => String(item.userId)}
              renderItem={renderUser}
              style={styles.userListScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.userList}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <View style={styles.emptyIcon}>
                    <FontAwesome name="user-o" size={22} color={WF_COLORS.slate400} />
                  </View>
                  <Text style={styles.emptyTitle}>Không tìm thấy người phù hợp</Text>
                  <Text style={styles.emptyDesc}>
                    Thử tìm bằng tên khác hoặc kiểm tra lại email / @handle nhé.
                  </Text>
                </View>
              }
            />
          )}

          <Text style={styles.footerNote}>
            Tin nhắn riêng tư chỉ hiển thị giữa bạn và người nhận.
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 60,
    elevation: 60,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdropPress: {
    flex: 1,
  },
  sheetDock: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: WF_COLORS.white,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    maxHeight: '82%',
    shadowColor: '#1E1A15',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: WF_COLORS.slate200,
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: SERIF_FONT,
    fontSize: 18,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  sheetSubtitle: {
    fontFamily: SERIF_FONT,
    fontSize: 11.5,
    color: WF_COLORS.slate500,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WF_COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: WF_COLORS.slate200,
    backgroundColor: WF_COLORS.slate50,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: SERIF_FONT,
    fontSize: 12.5,
    color: WF_COLORS.slate900,
    paddingVertical: 0,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F7E4DF',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontFamily: SERIF_FONT,
    fontSize: 11,
    color: '#B91C1C',
    lineHeight: 16,
  },
  retryText: {
    fontFamily: SERIF_FONT,
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 42,
    gap: 10,
  },
  loadingText: {
    fontFamily: SERIF_FONT,
    fontSize: 12,
    color: WF_COLORS.slate500,
  },
  userListScroll: {
    flexShrink: 1,
    maxHeight: 360,
  },
  userList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WF_COLORS.slate100,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: WF_COLORS.slate100,
  },
  onlineDot: {
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
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  userName: {
    fontFamily: SERIF_FONT,
    fontSize: 13.5,
    fontWeight: '800',
    color: WF_COLORS.slate900,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  userHandle: {
    fontFamily: SERIF_FONT,
    fontSize: 10.5,
    color: WF_COLORS.slate500,
    maxWidth: '55%',
  },
  userStatus: {
    fontFamily: SERIF_FONT,
    fontSize: 10.5,
    color: WF_COLORS.slate400,
    flexShrink: 1,
  },
  userStatusOnline: {
    color: '#047857',
  },
  chatIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WF_COLORS.primarySoft,
    borderWidth: 1,
    borderColor: WF_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 34,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: WF_COLORS.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: SERIF_FONT,
    fontSize: 14,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    marginBottom: 4,
  },
  emptyDesc: {
    fontFamily: SERIF_FONT,
    fontSize: 11.5,
    color: WF_COLORS.slate500,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 270,
  },
  footerNote: {
    fontFamily: SERIF_FONT,
    fontSize: 10.5,
    color: WF_COLORS.slate400,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingTop: 6,
  },
});
