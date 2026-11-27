import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { itineraryApi } from '@/src/services/api';
import { authStorage } from '@/src/services/authStorage';
import { showToast } from '@/components/Toast';

const EXPENSE_CATEGORIES = ['Ăn uống', 'Di chuyển', 'Khách sạn', 'Vé tham quan', 'Mua sắm', 'Khác'];

interface Props {
  itineraryId?: number;
  budgetTotal?: number;
  isOwner: boolean;
  creatorName?: string;
  creatorEmail?: string;
  mode: 'expenses' | 'members';
}

export function ItineraryExpensesMembersSection({
  itineraryId,
  budgetTotal = 0,
  isOwner,
  creatorName,
  creatorEmail,
  mode,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [detailCreator, setDetailCreator] = useState<{ name: string; email: string }>({ name: '', email: '' });
  const [currentUser, setCurrentUser] = useState<{ id?: number; email?: string } | null>(null);

  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Ăn uống');
  const [expDesc, setExpDesc] = useState('');
  const [submittingExp, setSubmittingExp] = useState(false);

  const [memberEmail, setMemberEmail] = useState('');
  const [submittingMember, setSubmittingMember] = useState(false);

  const loadData = useCallback(async () => {
    if (!itineraryId) return;
    setLoading(true);
    try {
      const detail: any = await itineraryApi.getItineraryById(itineraryId);
      setExpenses(Array.isArray(detail?.expenses) ? detail.expenses : []);
      setMembers(Array.isArray(detail?.members) ? detail.members : []);
      setDetailCreator({
        name: detail?.creatorName || detail?.authorName || '',
        email: detail?.creatorEmail || '',
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [itineraryId]);

  useEffect(() => {
    loadData();
    authStorage.getSession().then((s) => setCurrentUser(s ? (s.user ?? s) : null)).catch(() => {});
  }, [loadData]);

  if (!itineraryId) return null;

  const rawOwnerEmail = (detailCreator.email || creatorEmail || '').trim().toLowerCase();
  const ownerFromMembers = members.find(
    (m) =>
      String(m.role || '').toUpperCase() === 'OWNER' ||
      (rawOwnerEmail && String(m.email || '').trim().toLowerCase() === rawOwnerEmail)
  );
  const ownerDisplayName = ownerFromMembers?.fullName || detailCreator.name || creatorName || 'Chủ chuyến đi';
  const ownerDisplayEmail = ownerFromMembers?.email || detailCreator.email || creatorEmail || '';
  const ownerEmailKey = ownerDisplayEmail.trim().toLowerCase();

  const companions: any[] = [];
  const seenKeys = new Set<string>(ownerEmailKey ? [ownerEmailKey] : []);
  for (const m of members) {
    if (String(m.role || '').toUpperCase() === 'OWNER') continue;
    const key = String(m.email || m.userId || m.id || '').trim().toLowerCase();
    if (!key || seenKeys.has(key)) continue;
    seenKeys.add(key);
    companions.push(m);
  }

  const actualTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalPeople = 1 + companions.length;
  const perPerson = Math.round(actualTotal / Math.max(1, totalPeople));
  const budgetNum = Number(budgetTotal) || 0;
  const remaining = budgetNum - actualTotal;
  const pct = budgetNum > 0 ? Math.min(100, Math.round((actualTotal / budgetNum) * 100)) : 0;
  const isOver = budgetNum > 0 && actualTotal > budgetNum;
  const isMember = Boolean(
    currentUser &&
      companions.some(
        (m) =>
          (m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (m.userId != null && currentUser.id != null && String(m.userId) === String(currentUser.id))
      )
  );
  const canLogExpense = isOwner || isMember;

  const handleAddExpense = async () => {
    const num = Number(expAmount.replace(/\D/g, ''));
    if (!num || num <= 0) {
      showToast({ kind: 'error', title: 'Thiếu số tiền', message: 'Vui lòng nhập số tiền hợp lệ.' });
      return;
    }
    setSubmittingExp(true);
    try {
      await itineraryApi.addExpense(itineraryId, {
        amount: num,
        category: expCategory,
        description: expDesc.trim() || expCategory,
      });
      setExpAmount('');
      setExpDesc('');
      showToast({ kind: 'success', title: 'Đã ghi nhận chi tiêu!' });
      await loadData();
    } catch (e: any) {
      showToast({ kind: 'error', title: 'Lỗi thêm chi tiêu', message: e?.message || 'Vui lòng thử lại.' });
    } finally {
      setSubmittingExp(false);
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    try {
      await itineraryApi.deleteExpense(expenseId);
      setExpenses((prev) => prev.filter((item) => item.id !== expenseId));
      showToast({ kind: 'info', title: 'Đã xóa khoản chi' });
    } catch (e: any) {
      showToast({ kind: 'error', title: 'Không thể xóa', message: e?.message || '' });
    }
  };

  const handleAddMember = async () => {
    const email = memberEmail.trim();
    if (!email || !email.includes('@')) {
      showToast({ kind: 'error', title: 'Email không hợp lệ' });
      return;
    }
    setSubmittingMember(true);
    try {
      await itineraryApi.addMember(itineraryId, email, 'VIEWER');
      setMemberEmail('');
      showToast({ kind: 'success', title: 'Đã mời thành viên!', message: email });
      await loadData();
    } catch (e: any) {
      showToast({ kind: 'error', title: 'Không thể mời', message: e?.message || 'Kiểm tra lại email.' });
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await itineraryApi.removeMember(itineraryId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      showToast({ kind: 'info', title: 'Đã xóa thành viên' });
    } catch (e: any) {
      showToast({ kind: 'error', title: 'Không thể xóa', message: e?.message || '' });
    }
  };

  if (mode === 'members') {
    return (
      <View style={styles.wrap}>
        {isOwner && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Mời bạn đồng hành qua email</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Nhập email tài khoản Wayfare..."
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={memberEmail}
                onChangeText={setMemberEmail}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, submittingMember && { opacity: 0.6 }]}
                disabled={submittingMember}
                onPress={handleAddMember}>
                <Text style={styles.primaryBtnText}>{submittingMember ? '...' : 'Mời'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionLabel}>Thành viên chuyến đi ({totalPeople})</Text>
            {loading && <ActivityIndicator size="small" color="#94A3B8" />}
          </View>

          <View style={styles.listRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {ownerDisplayName}
              </Text>
              {ownerDisplayEmail ? (
                <Text style={styles.itemSub} numberOfLines={1}>
                  {ownerDisplayEmail}
                </Text>
              ) : null}
            </View>
            <View style={styles.ownerPill}>
              <Text style={styles.ownerPillText}>Chủ chuyến đi</Text>
            </View>
          </View>

          {companions.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có bạn đồng hành nào được mời.</Text>
          ) : (
            companions.map((m) => (
              <View key={m.id || m.userId} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {m.fullName || m.email}
                  </Text>
                  <Text style={styles.itemSub} numberOfLines={1}>
                    {m.email}
                  </Text>
                </View>
                {isOwner && (
                  <TouchableOpacity onPress={() => handleRemoveMember(m.userId)} style={{ padding: 6 }}>
                    <FontAwesome name="trash-o" size={14} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {/* 1. Tổng hợp chi tiêu gọn gàng */}
      <View style={styles.card}>
        <View style={styles.metricsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.metricLabel}>Dự kiến</Text>
            <Text style={styles.metricVal}>{budgetNum.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.metricLabel}>Đã chi</Text>
            <Text style={[styles.metricVal, { color: isOver ? '#DC2626' : '#047857' }]}>
              {actualTotal.toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.metricLabel}>Chia {totalPeople} người</Text>
            <Text style={[styles.metricVal, { color: '#0369A1' }]}>
              {perPerson.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>

        {budgetNum > 0 && (
          <View style={{ gap: 4 }}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${pct}%` as any, backgroundColor: isOver ? '#EF4444' : '#10B981' },
                ]}
              />
            </View>
            <View style={styles.headerRow}>
              <Text style={styles.itemSub}>Đã dùng {pct}%</Text>
              <Text style={[styles.itemSub, isOver && { color: '#DC2626', fontWeight: '700' }]}>
                {isOver
                  ? `Vượt ${Math.abs(remaining).toLocaleString('vi-VN')}đ`
                  : `Còn ${remaining.toLocaleString('vi-VN')}đ`}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 2. Form ghi khoản chi mới */}
      {canLogExpense && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Ghi khoản chi mới</Text>
          <View style={styles.catRow}>
            {EXPENSE_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setExpCategory(c)}
                style={[styles.catChip, expCategory === c && styles.catChipActive]}>
                <Text style={[styles.catChipText, expCategory === c && styles.catChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Số tiền (VNĐ)"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={expAmount}
              onChangeText={setExpAmount}
            />
            <TextInput
              style={[styles.input, { flex: 1.4 }]}
              placeholder="Mô tả khoản chi"
              placeholderTextColor="#94A3B8"
              value={expDesc}
              onChangeText={setExpDesc}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, submittingExp && { opacity: 0.6 }]}
              disabled={submittingExp}
              onPress={handleAddExpense}>
              <Text style={styles.primaryBtnText}>{submittingExp ? '...' : 'Ghi'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. Danh sách khoản chi */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.sectionLabel}>Danh sách khoản chi ({expenses.length})</Text>
          {loading && <ActivityIndicator size="small" color="#94A3B8" />}
        </View>

        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có khoản chi tiêu thực tế nào.</Text>
        ) : (
          expenses.map((exp) => (
            <View key={exp.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {exp.description || exp.category}
                </Text>
                <Text style={styles.itemSub}>
                  {exp.category} · {exp.payerName || 'Thành viên'}
                </Text>
              </View>
              <Text style={styles.itemAmount}>{Number(exp.amount || 0).toLocaleString('vi-VN')}đ</Text>
              {(isOwner || (currentUser?.id != null && String(exp.payerId) === String(currentUser.id))) && (
                <TouchableOpacity onPress={() => handleDeleteExpense(exp.id)} style={{ padding: 6 }}>
                  <FontAwesome name="trash-o" size={14} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metricVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15, 23, 42, 0.06)',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  itemAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  ownerPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  ownerPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  catChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  catChipTextActive: {
    color: '#0369A1',
    fontWeight: '700',
  },
  input: {
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    fontSize: 12.5,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  primaryBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 10,
  },
});
