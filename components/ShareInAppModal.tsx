import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from './Themed';
import { ToastHost, showToast } from './Toast';
import { chatApi, type ChatRoom } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';
import { authPrompt } from '@/src/services/authPrompt';
import { SHARE_EVENT, shareMessage, type InAppShare } from '@/src/services/inAppShare';
import { WF_COLORS } from '@/constants/Colors';

export function ShareInAppModal() {
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<InAppShare | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const sending = useRef(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(SHARE_EVENT, (value: InAppShare) => setItem(value));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!item) return;
    let current = true;
    (async () => {
      const session = await authStorage.getSession();
      if (!current) return;
      if (!session?.token) { setItem(null); authPrompt.open(); return; }
      setLoading(true); setError(false); setRooms([]);
      const data = await chatApi.getRooms();
      if (current) setRooms(data.filter(room => room.type !== 'AI' && !room.isPinned));
    })().catch(() => { if (current) setError(true); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [item, retry]);

  const send = async (room: ChatRoom) => {
    if (!item || sending.current) return;
    sending.current = true; setSendingId(String(room.id));
    try {
      await chatApi.sendMessage(room.id, shareMessage(item), 'TEXT');
      setItem(null);
      showToast({ kind: 'success', title: 'Đã chia sẻ trong Wayfare', message: `Đã gửi cho ${room.name}.` });
    } catch {
      showToast({ kind: 'error', title: 'Chưa gửi được nội dung', message: 'Kiểm tra kết nối và thử lại.' });
    } finally { sending.current = false; setSendingId(null); }
  };

  return <Modal visible={!!item} animationType="slide" onRequestClose={() => { if (!sending.current) setItem(null); }}>
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.heading}>Gửi trong Wayfare</Text><Text numberOfLines={2} style={styles.subtitle}>{item?.title}</Text></View><Pressable accessibilityLabel="Đóng chia sẻ" disabled={!!sendingId} onPress={() => setItem(null)} style={styles.close}><FontAwesome name="times" size={20} color={WF_COLORS.slate700} /></Pressable></View>
      <FlatList data={rooms} keyExtractor={room => String(room.id)} contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <ActivityIndicator color={WF_COLORS.primary} /> : <View style={styles.empty}><Text>{error ? 'Không tải được cuộc trò chuyện.' : 'Chưa có cuộc trò chuyện. Hãy bắt đầu trò chuyện với bạn bè trước khi chia sẻ.'}</Text>{error && <Pressable onPress={() => setRetry(value => value + 1)} style={styles.close}><Text>Thử lại</Text></Pressable>}</View>}
        renderItem={({ item: room }) => <Pressable accessibilityLabel={`Gửi cho ${room.name}`} disabled={!!sendingId} onPress={() => void send(room)} style={({ pressed }) => [styles.room, pressed && { backgroundColor: '#F1F5F9' }]}>
          {room.avatarUrl ? <Image source={{ uri: room.avatarUrl }} style={styles.avatar} /> : <View style={styles.avatar}><FontAwesome name={room.type === 'DIRECT' ? 'user' : 'users'} size={18} color={WF_COLORS.slate500} /></View>}
          <Text numberOfLines={1} style={styles.name}>{room.name}</Text>{sendingId === String(room.id) ? <ActivityIndicator color={WF_COLORS.primary} /> : <FontAwesome name="send-o" size={18} color={WF_COLORS.primary} />}
        </Pressable>} />
      <ToastHost enabled={!!item} />
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderColor: '#E2E8F0' }, heading: { fontSize: 20, fontWeight: '700', color: '#0F172A' }, subtitle: { fontSize: 13, color: '#64748B', marginTop: 6 }, close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, list: { padding: 16 }, room: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E2E8F0' }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }, name: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0F172A' }, empty: { paddingVertical: 32, gap: 16 }
});
