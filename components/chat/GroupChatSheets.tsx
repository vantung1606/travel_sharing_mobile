import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { confirmDialog } from '@/components/ConfirmDialog';
import { Text } from '@/components/Themed';
import { showToast } from '@/components/Toast';
import { DS_COLOR, DS_RADIUS, DS_TYPE } from '@/constants/DesignSystem';
import { ChatMember, ChatRoom, chatApi } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';

interface CreateGroupSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (room: ChatRoom) => void;
}

export function CreateGroupSheet({ visible, onClose, onCreated }: CreateGroupSheetProps) {
  const [name, setName] = useState('');
  const [intro, setIntro] = useState('');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<ChatMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let current = true;
    setLoadingUsers(true);
    const timer = setTimeout(() => {
      chatApi.getAvailableUsers(query).then((items) => {
        if (current) setUsers(items);
      }).catch((error: any) => {
        if (current) showToast({ kind: 'error', title: 'Không tải được thành viên', message: error?.message || 'Vui lòng thử lại.' });
      }).finally(() => current && setLoadingUsers(false));
    }, query.trim() ? 250 : 0);
    return () => { current = false; clearTimeout(timer); };
  }, [visible, query]);

  const reset = () => {
    setName('');
    setIntro('');
    setQuery('');
    setUsers([]);
    setSelectedIds([]);
  };

  const create = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      showToast({ kind: 'error', title: 'Thiếu tên nhóm', message: 'Nhập tên để tạo nhóm trò chuyện.' });
      return;
    }
    if (!selectedIds.length) {
      showToast({ kind: 'error', title: 'Chưa chọn thành viên', message: 'Chọn ít nhất một người khác để lập nhóm.' });
      return;
    }
    setCreating(true);
    try {
      const room = await chatApi.createGroupRoom({
        name: cleanName,
        memberIds: selectedIds,
        initialMessage: intro.trim() || `Chào mừng mọi người tham gia nhóm ${cleanName}!`,
      });
      reset();
      onClose();
      onCreated(room);
      showToast({ kind: 'success', title: 'Đã tạo nhóm', message: `Nhóm có ${selectedIds.length + 1} thành viên.` });
    } catch (error: any) {
      showToast({ kind: 'error', title: 'Tạo nhóm thất bại', message: error?.response?.data?.message || error?.message || 'Vui lòng thử lại.' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Tạo nhóm trò chuyện"
      subtitle="Đặt tên nhóm và chọn người muốn mời."
      maxHeightPercent={90}
      footer={(
        <View style={styles.footer}>
          <Text style={styles.selectionCount}>{selectedIds.length} người được chọn</Text>
          <TouchableOpacity style={[styles.primaryButton, (!selectedIds.length || creating) && styles.disabled]} onPress={create} disabled={!selectedIds.length || creating}>
            {creating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Tạo nhóm</Text>}
          </TouchableOpacity>
        </View>
      )}>
      <Text style={styles.label}>Tên nhóm *</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Ví dụ: Chuyến đi Đà Lạt" maxLength={100} style={styles.input} accessibilityLabel="Tên nhóm, bắt buộc" />
      <Text style={styles.label}>Lời chào đầu nhóm</Text>
      <TextInput value={intro} onChangeText={setIntro} placeholder="Chào mọi người!" maxLength={500} style={[styles.input, styles.multiline]} multiline />
      <Text style={styles.label}>Tìm người tham gia</Text>
      <View style={styles.searchBox}>
        <FontAwesome name="search" size={14} color={DS_COLOR.inkMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Tên, email hoặc @handle" autoCapitalize="none" style={styles.searchInput} />
      </View>
      {loadingUsers ? <ActivityIndicator style={{ padding: 20 }} color={DS_COLOR.accent} /> : users.length === 0 ? <Text style={styles.empty}>Không tìm thấy thành viên phù hợp.</Text> : users.map((user) => {
        const selected = selectedIds.includes(user.userId);
        return (
          <TouchableOpacity key={user.userId} style={styles.userRow} onPress={() => setSelectedIds((prev) => selected ? prev.filter((id) => id !== user.userId) : [...prev, user.userId])} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}>
            <Image source={{ uri: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }} style={styles.avatar} />
            <View style={styles.userCopy}>
              <Text style={styles.userName} numberOfLines={1}>{user.fullName}</Text>
              <Text style={styles.userMeta} numberOfLines={1}>{user.handle || user.email}</Text>
            </View>
            <FontAwesome name={selected ? 'check-circle' : 'circle-o'} size={19} color={selected ? DS_COLOR.accent : DS_COLOR.inkMuted} />
          </TouchableOpacity>
        );
      })}
    </BottomSheet>
  );
}

interface ManageGroupSheetProps {
  visible: boolean;
  room: ChatRoom | null;
  onClose: () => void;
  onRoomChanged: (room: ChatRoom | null) => void;
}

export function ManageGroupSheet({ visible, room, onClose, onRoomChanged }: ManageGroupSheetProps) {
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [users, setUsers] = useState<ChatMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!visible || !room) return;
    let current = true;
    authStorage.getSession().then((session) => {
      if (current) setCurrentUserId(Number(session?.id ?? (session as any)?.userId) || null);
    });
    chatApi.getRoomMembers(room.id).then((items) => current && setMembers(items)).catch((error: any) => {
      if (current) showToast({ kind: 'error', title: 'Không tải được danh sách', message: error?.message || 'Vui lòng thử lại.' });
    });
    return () => { current = false; };
  }, [visible, room?.id]);

  useEffect(() => {
    if (!visible || !showAdd) return;
    let current = true;
    const timer = setTimeout(() => {
      chatApi.getAvailableUsers(query).then((items) => current && setUsers(items)).catch((error: any) => {
        if (current) showToast({ kind: 'error', title: 'Không tải được thành viên', message: error?.message || 'Vui lòng thử lại.' });
      });
    }, query.trim() ? 250 : 0);
    return () => { current = false; clearTimeout(timer); };
  }, [visible, showAdd, query]);

  const isOwner = members.some((member) => member.userId === currentUserId && member.role === 'OWNER');
  const candidates = useMemo(() => users.filter((user) => !members.some((member) => member.userId === user.userId)), [users, members]);

  const remove = async (member: ChatMember) => {
    if (!room) return;
    const self = member.userId === currentUserId;
    const confirmed = await confirmDialog({
      title: self ? 'Rời nhóm trò chuyện?' : 'Xóa thành viên khỏi nhóm?',
      message: self ? `Bạn sẽ rời “${room.name}”.` : `${member.fullName} sẽ không còn tham gia nhóm này.`,
      confirmText: self ? 'Rời nhóm' : 'Xóa thành viên',
      destructive: true,
    });
    if (!confirmed) return;
    setBusyId(member.userId);
    try {
      const updated = await chatApi.removeMember(room.id, member.userId);
      if (self) {
        onRoomChanged(null);
        onClose();
      } else {
        setMembers((prev) => prev.filter((item) => item.userId !== member.userId));
        onRoomChanged(updated);
      }
      showToast({ kind: 'success', title: self ? 'Đã rời nhóm' : 'Đã xóa thành viên', message: self ? 'Bạn đã rời nhóm trò chuyện.' : `${member.fullName} đã được xóa khỏi nhóm.` });
    } catch (error: any) {
      showToast({ kind: 'error', title: 'Thao tác thất bại', message: error?.response?.data?.message || error?.message || 'Vui lòng thử lại.' });
    } finally {
      setBusyId(null);
    }
  };

  const add = async () => {
    if (!room || !selectedIds.length) return;
    setAdding(true);
    try {
      const updated = await chatApi.addMembers(room.id, selectedIds);
      setMembers(await chatApi.getRoomMembers(room.id));
      onRoomChanged(updated);
      setSelectedIds([]);
      setShowAdd(false);
      setQuery('');
      showToast({ kind: 'success', title: 'Đã thêm thành viên', message: `Đã thêm ${selectedIds.length} người vào nhóm.` });
    } catch (error: any) {
      showToast({ kind: 'error', title: 'Không thêm được thành viên', message: error?.response?.data?.message || error?.message || 'Vui lòng thử lại.' });
    } finally {
      setAdding(false);
    }
  };

  if (!room) return null;
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={showAdd ? 'Thêm thành viên' : room.name}
      subtitle={showAdd ? 'Chọn người muốn mời vào nhóm.' : `${members.length} thành viên`}
      maxHeightPercent={88}
      footer={showAdd ? (
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => { setShowAdd(false); setSelectedIds([]); }} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Quay lại</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.primaryButton, (!selectedIds.length || adding) && styles.disabled]} onPress={add} disabled={!selectedIds.length || adding}>
            {adding ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Thêm ({selectedIds.length})</Text>}
          </TouchableOpacity>
        </View>
      ) : null}>
      {showAdd ? (
        <>
          <View style={styles.searchBox}><FontAwesome name="search" size={14} color={DS_COLOR.inkMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Tìm theo tên, email hoặc @handle" style={styles.searchInput} autoCapitalize="none" /></View>
          {candidates.length === 0 ? <Text style={styles.empty}>Không còn thành viên phù hợp để thêm.</Text> : candidates.map((user) => {
            const selected = selectedIds.includes(user.userId);
            return <TouchableOpacity key={user.userId} style={styles.userRow} onPress={() => setSelectedIds((prev) => selected ? prev.filter((id) => id !== user.userId) : [...prev, user.userId])} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}>
              <Image source={{ uri: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }} style={styles.avatar} />
              <View style={styles.userCopy}><Text style={styles.userName} numberOfLines={1}>{user.fullName}</Text><Text style={styles.userMeta} numberOfLines={1}>{user.handle || user.email}</Text></View>
              <FontAwesome name={selected ? 'check-circle' : 'circle-o'} size={19} color={selected ? DS_COLOR.accent : DS_COLOR.inkMuted} />
            </TouchableOpacity>;
          })}
        </>
      ) : (
        <>
          {isOwner ? <TouchableOpacity style={styles.actionRow} onPress={() => setShowAdd(true)}><FontAwesome name="user-plus" size={15} color={DS_COLOR.accent} /><Text style={styles.actionText}>Thêm thành viên</Text><FontAwesome name="chevron-right" size={11} color={DS_COLOR.inkMuted} /></TouchableOpacity> : null}
          {members.map((member) => {
            const self = member.userId === currentUserId;
            const canRemove = self || (isOwner && member.role !== 'OWNER');
            return <View key={member.userId} style={styles.userRow}>
              <Image source={{ uri: member.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }} style={styles.avatar} />
              <View style={styles.userCopy}><Text style={styles.userName} numberOfLines={1}>{member.fullName}{self ? ' (Bạn)' : ''}</Text><Text style={styles.userMeta}>{member.role === 'OWNER' ? 'Trưởng nhóm' : member.handle || member.email || 'Thành viên'}</Text></View>
              {canRemove ? <TouchableOpacity onPress={() => remove(member)} disabled={busyId === member.userId} accessibilityLabel={self ? 'Rời nhóm' : `Xóa ${member.fullName} khỏi nhóm`} style={styles.removeButton}>{busyId === member.userId ? <ActivityIndicator size="small" color={DS_COLOR.danger} /> : <FontAwesome name={self ? 'sign-out' : 'user-times'} size={15} color={DS_COLOR.danger} />}</TouchableOpacity> : null}
            </View>;
          })}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  label: { color: DS_COLOR.ink, fontSize: DS_TYPE.meta, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: DS_COLOR.line, borderRadius: DS_RADIUS.md, paddingHorizontal: 12, paddingVertical: 11, color: DS_COLOR.ink, backgroundColor: DS_COLOR.surface, fontSize: DS_TYPE.body },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: DS_COLOR.line, borderRadius: DS_RADIUS.md, paddingHorizontal: 12, minHeight: 44, marginTop: 12 },
  searchInput: { flex: 1, minWidth: 0, color: DS_COLOR.ink, fontSize: DS_TYPE.body, paddingVertical: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', minHeight: 58, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: DS_COLOR.line },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: DS_COLOR.surfaceMuted },
  userCopy: { flex: 1, minWidth: 0 },
  userName: { color: DS_COLOR.ink, fontSize: DS_TYPE.body, fontWeight: '700' },
  userMeta: { color: DS_COLOR.inkMuted, fontSize: DS_TYPE.caption, marginTop: 2 },
  empty: { color: DS_COLOR.inkMuted, fontSize: DS_TYPE.body, textAlign: 'center', padding: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selectionCount: { flex: 1, color: DS_COLOR.inkMuted, fontSize: DS_TYPE.caption },
  primaryButton: { minWidth: 108, minHeight: 44, paddingHorizontal: 15, borderRadius: DS_RADIUS.md, backgroundColor: DS_COLOR.accent, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: DS_TYPE.body, fontWeight: '700' },
  secondaryButton: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' },
  secondaryButtonText: { color: DS_COLOR.inkSecondary, fontSize: DS_TYPE.body, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: DS_COLOR.line },
  actionText: { flex: 1, color: DS_COLOR.ink, fontSize: DS_TYPE.body, fontWeight: '700' },
  removeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: DS_RADIUS.md },
});
