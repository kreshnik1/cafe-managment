import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getOrders, updateOrderStatus, markOrderPaid, deleteOrder } from '../services/orders';
import { Order, OrderStatus } from '../types';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; next: OrderStatus | null }
> = {
  pending:   { label: 'Pending',   color: '#D97706', bg: '#FFFBEB', next: 'preparing' },
  preparing: { label: 'Preparing', color: '#2563EB', bg: '#EFF6FF', next: 'ready' },
  ready:     { label: 'Ready',     color: '#059669', bg: '#ECFDF5', next: 'completed' },
  completed: { label: 'Completed', color: '#6B7280', bg: '#F3F4F6', next: null },
};

// ── Order card ────────────────────────────────────────────────────
function OrderCard({
  order,
  onAdvance,
  onTogglePaid,
  onDelete,
}: {
  order: Order;
  onAdvance: (id: string, next: OrderStatus) => void;
  onTogglePaid: (id: string, paid: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { t, fmt } = useSettings();
  const cfg = STATUS_CONFIG[order.status];
  const time = new Date(order.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={cardStyles.card}>
      {/* Header */}
      <View style={cardStyles.header}>
        <View style={cardStyles.headerLeft}>
          <Text style={cardStyles.orderId}>
            {order.table_number ? `${t('ordersTable')} ${order.table_number}` : t('ordersWalkIn')}
          </Text>
          <Text style={cardStyles.time}>{time}</Text>
        </View>
        <View style={cardStyles.headerRight}>
          <View style={[cardStyles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[cardStyles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <TouchableOpacity
            style={[cardStyles.paidBadge, order.is_paid ? cardStyles.paidBadgePaid : cardStyles.paidBadgeUnpaid]}
            onPress={() => onTogglePaid(order.id, !order.is_paid)}
          >
            <Ionicons
              name={order.is_paid ? 'checkmark-circle' : 'time-outline'}
              size={13}
              color={order.is_paid ? '#059669' : '#D97706'}
            />
            <Text style={[cardStyles.paidText, { color: order.is_paid ? '#059669' : '#D97706' }]}>
              {order.is_paid ? t('ordersPaid') : t('ordersUnpaid')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Items */}
      {order.order_items && order.order_items.length > 0 && (
        <View style={cardStyles.items}>
          {order.order_items.map((oi) => (
            <View key={oi.id} style={cardStyles.itemRow}>
              <Text style={cardStyles.itemQty}>{oi.quantity}×</Text>
              <Text style={cardStyles.itemName}>{oi.products?.name ?? '—'}</Text>
              <Text style={cardStyles.itemPrice}>
                {fmt(oi.quantity * Number(oi.unit_price))}
              </Text>
            </View>
          ))}
        </View>
      )}

      {order.note ? (
        <Text style={cardStyles.note}>Note: {order.note}</Text>
      ) : null}

      {/* Footer */}
      <View style={cardStyles.footer}>
        <Text style={cardStyles.total}>{fmt(Number(order.total_amount))}</Text>
        <View style={cardStyles.footerActions}>
          {cfg.next && (
            <TouchableOpacity
              style={cardStyles.advanceBtn}
              onPress={() => onAdvance(order.id, cfg.next!)}
            >
              <Text style={cardStyles.advanceBtnText}>
                Mark {STATUS_CONFIG[cfg.next].label}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#6B4E2E" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={cardStyles.deleteBtn} onPress={() => onDelete(order.id)}>
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
type FilterType = 'all' | 'active' | 'unpaid' | 'completed';

export default function OrdersScreen() {
  const navigation = useNavigation<any>();
  const { cafe } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('active');

  const load = useCallback(async () => {
    if (!cafe) return;
    try {
      const data = await getOrders(cafe.id);
      setOrders(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [cafe]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleAdvance(id: string, next: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: next, updated_at: new Date().toISOString() } : o))
    );
    try {
      await updateOrderStatus(id, next);
    } catch (err: any) {
      Alert.alert('Error', err.message);
      load();
    }
  }

  async function handleTogglePaid(id: string, paid: boolean) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, is_paid: paid } : o)));
    try {
      await markOrderPaid(id, paid);
    } catch (err: any) {
      Alert.alert('Error', err.message);
      load();
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete order', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteOrder(id);
            setOrders((prev) => prev.filter((o) => o.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  }

  const filtered = orders.filter((o) => {
    if (filter === 'active') return o.status !== 'completed';
    if (filter === 'unpaid') return !o.is_paid;
    if (filter === 'completed') return o.status === 'completed';
    return true;
  });

  const unpaidCount = orders.filter((o) => !o.is_paid).length;
  const activeCount = orders.filter((o) => o.status !== 'completed').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6B4E2E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Summary ──────────────────────────────────────────── */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Ionicons name="hourglass-outline" size={16} color="#2563EB" />
          <Text style={styles.summaryNum}>{activeCount}</Text>
          <Text style={styles.summaryLbl}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Ionicons name="time-outline" size={16} color="#D97706" />
          <Text style={styles.summaryNum}>{unpaidCount}</Text>
          <Text style={styles.summaryLbl}>Unpaid</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Ionicons name="receipt-outline" size={16} color="#6B7280" />
          <Text style={styles.summaryNum}>{orders.length}</Text>
          <Text style={styles.summaryLbl}>Total</Text>
        </View>
      </View>

      {/* ── Filter pills ─────────────────────────────────────── */}
      <View style={styles.filterRow}>
        {([
          { key: 'active', label: 'Active' },
          { key: 'unpaid', label: `Unpaid${unpaidCount > 0 ? ` (${unpaidCount})` : ''}` },
          { key: 'completed', label: 'Done' },
          { key: 'all', label: 'All' },
        ] as { key: FilterType; label: string }[]).map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.pill, filter === f.key && styles.pillActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onAdvance={handleAdvance}
            onTogglePaid={handleTogglePaid}
            onDelete={handleDelete}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6B4E2E" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No orders here.</Text>
            <Text style={styles.emptySub}>Tap + to create a new order.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />

      {/* ── FAB ─────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewOrder')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  summaryNum: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  summaryLbl: { fontSize: 12, color: '#9CA3AF' },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  pillActive: { backgroundColor: '#6B4E2E' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  pillTextActive: { color: '#fff' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },
  emptySub: { fontSize: 13, color: '#D1D5DB' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 36 : 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6B4E2E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6B4E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  headerLeft: { gap: 2 },
  headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  orderId: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  time: { fontSize: 11, color: '#9CA3AF' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  paidBadgePaid: { backgroundColor: '#ECFDF5' },
  paidBadgeUnpaid: { backgroundColor: '#FFFBEB' },
  paidText: { fontSize: 12, fontWeight: '700' },
  items: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemQty: { fontSize: 13, color: '#9CA3AF', width: 26 },
  itemName: { flex: 1, fontSize: 13, color: '#1F2937' },
  itemPrice: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  total: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  footerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  advanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  advanceBtnText: { fontSize: 13, fontWeight: '600', color: '#6B4E2E' },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
