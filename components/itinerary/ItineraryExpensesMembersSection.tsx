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
import { showToast } from '@/components/Toast';

const EXPENSE_CATEGORIES = ['Ăn uống', 'Di chuyển', 'Khách sạn', 'Vé tham quan', 'Mua sắm', 'Khác'];

interface Props {
  itineraryId?: number;
  budgetTotal?: number;
  isOwner: boolean;
}

export function ItineraryExpensesMembersSection({ itineraryId, budgetTotal = 0, isOwner }: Props) {
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

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
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [itineraryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!itineraryId) return null;

  const actualTotal = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalPeople = 1 + members.length;
  const perPerson = Math.round(actualTotal / Math.max(1, totalPeople));
  const budgetNum = Number(budgetTotal) || 0;
  const pct = budgetNum > 0 ? Math.min(100, Math.round((actualTotal / budgetNum) * 100)) : 0;
  const isOver = budgetNum > 0 && actualTotal > budgetNum;

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

  return (
    <View style={styles.card}>
      {/* 1. Chi tiêu thực tế & Chia tiền nhóm */}
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FontAwesome name="money" size={14} color="#0284C7" />
          <Text style={styles.title}>Chi tiêu thực tế & Chia tiền ({totalPeople} người)</Text>
        </View>
        {loading && <ActivityIndicator size="small" color="#94A3B8" />}
      </View>

      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Đã chi thực tế:</Text>
          <Text style={[styles.boldVal, isOver && { color: '#DC2626' }]}>
            {actualTotal.toLocaleString('vi-VN')}đ
          </Text>
        </View>
        {budgetNum > 0 && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${pct}%` as any, backgroundColor: isOver ? '#EF4444' : '#10B981' },
              ]}
            />
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.muted}>Bình quân / người:</Text>
          <Text style={[styles.boldVal, { color: '#0369A1' }]}>
            {perPerson.toLocaleString('vi-VN')}đ
          </Text>
        </View>
      </View>

      {expenses.map((exp) => (
        <View key={exp.id} style={styles.itemRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {exp.description || exp.category}
            </Text>
            <Text style={styles.itemSub}>
              {exp.category} · {exp.payerName || 'Thành viên'}
            </Text>
          </View>
          <Text style={styles.itemAmount}>{Number(exp.amount || 0).toLocaleString('vi-VN')}đ</Text>
          {isOwner && (
            <TouchableOpacity onPress={() => handleDeleteExpense(exp.id)} style={{ padding: 6 }}>
              <FontAwesome name="trash-o" size={13} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      ))}

      {isOwner && (
        <View style={styles.formWrap}>
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
          <View style={{ flexDirection: 'row', gap: 6 }}>
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
              style={[styles.addBtn, submittingExp && { opacity: 0.6 }]}
              disabled={submittingExp}
              onPress={handleAddExpense}>
              <Text style={styles.addBtnText}>Ghi</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. Bạn đồng hành */}
      <View style={styles.divider} />
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <FontAwesome name="users" size={13} color="#059669" />
          <Text style={styles.title}>Bạn đồng hành ({members.length})</Text>
        </View>
      </View>

      {members.length > 0 ? (
        members.map((m) => (
          <View key={m.id || m.userId} style={styles.itemRow}>
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
                <FontAwesome name="trash-o" size={13} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Chưa có bạn đồng hành nào được mời.</Text>
      )}

      {isOwner && (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Email bạn đồng hành..."
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={memberEmail}
            onChangeText={setMemberEmail}
          />
          <TouchableOpacity
            style={[styles.inviteBtn, submittingMember && { opacity: 0.6 }]}
            disabled={submittingMember}
            onPress={handleAddMember}>
            <Text style={styles.addBtnText}>Mời</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muted: {
    fontSize: 12,
    color: '#64748B',
  },
  boldVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.05)',
  },
  itemTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemSub: {
    fontSize: 11,
    color: '#64748B',
  },
  itemAmount: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  formWrap: {
    gap: 8,
    marginTop: 4,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  catChipTextActive: {
    color: '#0369A1',
    fontWeight: '700',
  },
  input: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    fontSize: 12,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  addBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.08)',
    marginVertical: 4,
  },
  emptyText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },
});
