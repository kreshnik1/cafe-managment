import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getDashboardTotals, getTransactions } from '../services/transactions';
import { createCafe } from '../services/cafes';
import { signOut } from '../services/auth';
import { supabase } from '../services/supabase';
import StatCard from '../components/StatCard';

interface Totals {
  totalIncome: number;
  totalExpenses: number;
  ordersIncome: number;
  profit: number;
  cashBalance: number;
}

interface ActivityItem {
  id: string;
  kind: 'transaction' | 'order';
  isIncome: boolean;
  category: string;
  note: string | null;
  amount: number;
  created_at: string;
}

// ── Recent activity row ───────────────────────────────────────────
function RecentRow({ item }: { item: ActivityItem }) {
  const { fmt } = useSettings();
  const time = new Date(item.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
  return (
    <View style={recentStyles.row}>
      <View style={[recentStyles.iconWrap, item.isIncome ? recentStyles.iconWrapIncome : recentStyles.iconWrapExpense]}>
        <Ionicons
          name={item.kind === 'order' ? 'receipt-outline' : item.isIncome ? 'arrow-up' : 'arrow-down'}
          size={14}
          color={item.isIncome ? '#059669' : '#EF4444'}
        />
      </View>
      <View style={recentStyles.body}>
        <Text style={recentStyles.cat}>{item.category}</Text>
        {item.note ? <Text style={recentStyles.note} numberOfLines={1}>{item.note}</Text> : null}
      </View>
      <View style={recentStyles.right}>
        <Text style={[recentStyles.amount, item.isIncome ? recentStyles.amountIn : recentStyles.amountEx]}>
          {item.isIncome ? '+' : '−'}{fmt(Number(item.amount))}
        </Text>
        <Text style={recentStyles.time}>{time}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function DashboardScreen() {
  const navigation   = useNavigation<any>();
  const { user, cafe, setCafe, cafeLoaded } = useAuth();
  const { t, fmt } = useSettings();

  const [totals,       setTotals]       = useState<Totals | null>(null);
  const [recent,       setRecent]       = useState<ActivityItem[]>([]);
  const [refreshing,   setRefreshing]   = useState(false);
  const [cafeName,     setCafeName]     = useState('');
  const [creatingCafe, setCreatingCafe] = useState(false);

  const load = useCallback(async () => {
    if (!cafe) return;
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const start    = `${todayStr}T00:00:00.000Z`;
      const end      = `${todayStr}T23:59:59.999Z`;

      const [t, allTx, { data: todayOrders }] = await Promise.all([
        getDashboardTotals(cafe.id),
        getTransactions(cafe.id),
        supabase
          .from('orders')
          .select('id, total_amount, table_number, is_paid, created_at')
          .eq('cafe_id', cafe.id)
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false }),
      ]);

      setTotals(t);

      // Build unified activity list
      const txItems: ActivityItem[] = allTx
        .filter(tx => tx.created_at.startsWith(todayStr))
        .map(tx => ({
          id: tx.id,
          kind: 'transaction',
          isIncome: tx.type === 'income',
          category: tx.category,
          note: tx.note,
          amount: Number(tx.amount),
          created_at: tx.created_at,
        }));

      const orderItems: ActivityItem[] = (todayOrders ?? []).map(o => ({
        id: `order-${o.id}`,
        kind: 'order',
        isIncome: true,
        category: o.is_paid ? 'Order (Paid)' : 'Order (Unpaid)',
        note: o.table_number ? `Table ${o.table_number}` : 'Walk-in',
        amount: Number(o.total_amount),
        created_at: o.created_at,
      }));

      const merged = [...txItems, ...orderItems]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 6);

      setRecent(merged);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }, [cafe]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleCreateCafe() {
    if (!cafeName.trim()) { Alert.alert('Error', 'Please enter a cafe name.'); return; }
    if (!user) return;
    setCreatingCafe(true);
    try {
      const newCafe = await createCafe(cafeName.trim(), user.id);
      setCafe(newCafe);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setCreatingCafe(false);
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        try { await signOut(); } catch (err: any) { Alert.alert('Error', err.message); }
      }},
    ]);
  }

  // ── Still looking up the cafe — don't render anything yet ────
  if (!cafeLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color="#6B4E2E" />
      </View>
    );
  }

  // ── No cafe yet (first-time user) ─────────────────────────────
  if (!cafe) {
    return (
      <View style={styles.setupRoot}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.setupCard}>
          <View style={styles.setupIconWrap}>
            <Text style={styles.setupEmoji}>☕</Text>
          </View>
          <Text style={styles.setupTitle}>Set up your cafe</Text>
          <Text style={styles.setupSub}>Give your business a name to get started.</Text>
          <View style={styles.setupInputRow}>
            <Ionicons name="storefront-outline" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.setupInput}
              placeholder="e.g. Morning Brew Café"
              placeholderTextColor="#9CA3AF"
              value={cafeName}
              onChangeText={setCafeName}
              returnKeyType="done"
              onSubmitEditing={handleCreateCafe}
            />
          </View>
          <TouchableOpacity
            style={[styles.setupBtn, !cafeName.trim() && styles.setupBtnDisabled]}
            onPress={handleCreateCafe}
            disabled={creatingCafe || !cafeName.trim()}
          >
            {creatingCafe ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.setupBtnText}>Create Cafe</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Today ─────────────────────────────────────────────────────
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr  = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6B4E2E" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.cafeIconWrap}>
              <Ionicons name="storefront" size={18} color="#6B4E2E" />
            </View>
            <View>
              <Text style={styles.cafeName}>{cafe.name}</Text>
              <Text style={styles.greeting}>{greeting} · {dateStr}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* ── Today's stats ────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>TODAY'S SUMMARY</Text>
        {totals ? (
          <>
            <View style={styles.grid}>
              <StatCard
                label={t('dashboardIncome')}
                value={fmt(totals.totalIncome)}
                color="#059669"
                icon="arrow-up-circle"
                trend="up"
                subLabel={`${t('dashboardOrders')} ${fmt(totals.ordersIncome)}`}
              />
              <StatCard
                label={t('dashboardExpenses')}
                value={fmt(totals.totalExpenses)}
                color="#DC2626"
                icon="arrow-down-circle"
                trend="down"
                subLabel="Today"
              />
            </View>
            <View style={[styles.grid, { marginTop: 12 }]}>
              <StatCard
                label={t('dashboardProfit')}
                value={fmt(totals.profit)}
                color={totals.profit >= 0 ? '#6B4E2E' : '#DC2626'}
                icon={totals.profit >= 0 ? 'trending-up' : 'trending-down'}
                trend={totals.profit >= 0 ? 'up' : 'down'}
                fullWidth
                subLabel={totals.profit >= 0 ? 'Profitable day' : 'Operating at a loss'}
              />
            </View>
            <View style={[styles.grid, { marginTop: 12 }]}>
              <StatCard
                label={t('dashboardCashBalance')}
                value={fmt(totals.cashBalance)}
                color="#3B82F6"
                icon="cash-outline"
                trend="neutral"
                fullWidth
                subLabel="Income minus expenses"
              />
            </View>
          </>
        ) : (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color="#6B4E2E" />
            <Text style={styles.loadingText}>Loading today's data…</Text>
          </View>
        )}

        {/* ── Quick actions ────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>QUICK ACTIONS</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionIncome]}
            onPress={() => navigation.navigate('AddTransaction')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="add-circle" size={22} color="#059669" />
            </View>
            <Text style={[styles.actionLabel, { color: '#059669' }]}>Add Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionExpense]}
            onPress={() => navigation.navigate('AddTransaction')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons name="remove-circle" size={22} color="#DC2626" />
            </View>
            <Text style={[styles.actionLabel, { color: '#DC2626' }]}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Orders')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="receipt" size={22} color="#D97706" />
            </View>
            <Text style={[styles.actionLabel, { color: '#D97706' }]}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Staff')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FDF8F5' }]}>
              <Ionicons name="people" size={22} color="#6B4E2E" />
            </View>
            <Text style={[styles.actionLabel, { color: '#6B4E2E' }]}>Shifts</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent transactions ──────────────────────────────── */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionLabel}>TODAY'S TRANSACTIONS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>

        </View>

        {recent.length === 0 ? (
          <View style={styles.recentEmpty}>
            <Ionicons name="receipt-outline" size={32} color="#D1D5DB" />
            <Text style={styles.recentEmptyText}>No activity recorded today.</Text>
            <TouchableOpacity
              style={styles.recentEmptyBtn}
              onPress={() => navigation.navigate('AddTransaction')}
            >
              <Ionicons name="add" size={15} color="#6B4E2E" style={{ marginRight: 5 }} />
              <Text style={styles.recentEmptyBtnText}>Add first transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recentCard}>
            {recent.map((item, i) => (
              <View key={item.id}>
                <RecentRow item={item} />
                {i < recent.length - 1 && <View style={styles.recentDivider} />}
              </View>
            ))}
            <TouchableOpacity style={styles.recentMore} onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.recentMoreText}>View all transactions</Text>
              <Ionicons name="chevron-forward" size={14} color="#6B4E2E" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content:   { padding: 20 },

  // Setup screen
  setupRoot: { flex: 1, backgroundColor: '#F3F4F6', justifyContent: 'center', padding: 24 },
  setupCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  setupIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: '#FDF8F5',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  setupEmoji:    { fontSize: 38 },
  setupTitle:    { fontSize: 22, fontWeight: '700', color: '#1F2937', marginBottom: 6 },
  setupSub:      { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 24 },
  setupInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  setupInput:       { flex: 1, fontSize: 15, color: '#1F2937' },
  setupBtn: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#6B4E2E',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6B4E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  setupBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
  setupBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
  },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cafeIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#FDF8F5',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5, borderColor: '#E8D9CE',
  },
  cafeName: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  greeting: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  signOutBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center',
  },

  // Section labels
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  // Stat grid
  grid:        { flexDirection: 'row', gap: 12 },
  loadingWrap: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  loadingText: { fontSize: 13, color: '#9CA3AF' },

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
  },
  actionIncome:  { borderColor: '#D1FAE5' },
  actionExpense: { borderColor: '#FEE2E2' },
  actionIcon:    { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel:   { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // Recent
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },
  seeAll:       { fontSize: 13, fontWeight: '600', color: '#6B4E2E' },
  recentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  recentDivider: { height: 1, backgroundColor: '#F9FAFB', marginHorizontal: 16 },
  recentMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 4,
  },
  recentMoreText: { fontSize: 13, fontWeight: '600', color: '#6B4E2E' },
  recentEmpty: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  recentEmptyText:    { fontSize: 13, color: '#9CA3AF' },
  recentEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recentEmptyBtnText: { fontSize: 13, fontWeight: '600', color: '#6B4E2E' },
});

const recentStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  iconWrapIncome:  { backgroundColor: '#ECFDF5' },
  iconWrapExpense: { backgroundColor: '#FEF2F2' },
  body:   { flex: 1 },
  cat:    { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  note:   { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  right:  { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: 14, fontWeight: '700' },
  amountIn:  { color: '#059669' },
  amountEx:  { color: '#DC2626' },
  time:   { fontSize: 11, color: '#9CA3AF' },
});
