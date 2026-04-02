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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getPurchaseOrders } from '../services/purchaseOrders';
import { PurchaseOrder } from '../types';

function OrderCard({ order }: { order: PurchaseOrder }) {
  const { fmt } = useSettings();
  const [expanded, setExpanded] = useState(false);
  const date = new Date(order.created_at);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const items = order.purchase_order_items ?? [];

  return (
    <View style={cardStyles.card}>
      {/* Header row */}
      <TouchableOpacity
        style={cardStyles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={cardStyles.supplierIconWrap}>
          <Ionicons name="business-outline" size={20} color="#6B4E2E" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cardStyles.supplier}>{order.supplier}</Text>
          <Text style={cardStyles.meta}>
            {dateStr} · {timeStr}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={cardStyles.total}>{fmt(Number(order.total_cost))}</Text>
          <View style={cardStyles.countBadge}>
            <Text style={cardStyles.countBadgeText}>
              {items.length} item{items.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#9CA3AF"
          style={{ marginLeft: 10 }}
        />
      </TouchableOpacity>

      {/* Note */}
      {order.note ? (
        <View style={cardStyles.noteRow}>
          <Ionicons name="document-text-outline" size={13} color="#9CA3AF" style={{ marginRight: 5 }} />
          <Text style={cardStyles.noteText}>{order.note}</Text>
        </View>
      ) : null}

      {/* Expanded items */}
      {expanded && items.length > 0 && (
        <View style={cardStyles.itemsSection}>
          <View style={cardStyles.itemsHeader}>
            <Text style={[cardStyles.colH, { flex: 1 }]}>PRODUCT</Text>
            <Text style={[cardStyles.colH, { width: 50, textAlign: 'center' }]}>QTY</Text>
            <Text style={[cardStyles.colH, { width: 70, textAlign: 'center' }]}>UNIT</Text>
            <Text style={[cardStyles.colH, { width: 70, textAlign: 'right' }]}>TOTAL</Text>
          </View>
          {items.map((item, idx) => (
            <View key={item.id}>
              <View style={cardStyles.itemRow}>
                <Text style={[cardStyles.itemName, { flex: 1 }]} numberOfLines={1}>
                  {item.product_name}
                </Text>
                <Text style={[cardStyles.itemVal, { width: 50, textAlign: 'center' }]}>
                  {item.quantity}
                </Text>
                <Text style={[cardStyles.itemVal, { width: 70, textAlign: 'center' }]}>
                  {fmt(Number(item.unit_cost))}
                </Text>
                <Text style={[cardStyles.itemVal, { width: 70, textAlign: 'right', fontWeight: '700' }]}>
                  {fmt(item.quantity * Number(item.unit_cost))}
                </Text>
              </View>
              {idx < items.length - 1 && <View style={cardStyles.itemDivider} />}
            </View>
          ))}
          {/* Footer total */}
          <View style={cardStyles.itemsFooter}>
            <Text style={cardStyles.itemsFooterLbl}>Total paid</Text>
            <Text style={cardStyles.itemsFooterVal}>{fmt(Number(order.total_cost))}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export default function PurchaseOrdersScreen() {
  const { cafe } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!cafe) return;
    try {
      const data = await getPurchaseOrders(cafe.id);
      setOrders(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [cafe]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6B4E2E" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6B4E2E" />}
      renderItem={({ item }) => <OrderCard order={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="cube-outline" size={44} color="#D1D5DB" />
          <Text style={styles.emptyText}>No purchase orders yet.</Text>
          <Text style={styles.emptySub}>
            Use "New Order" in Inventory to record a supplier delivery.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 72, gap: 10, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  emptySub: { fontSize: 13, color: '#D1D5DB', textAlign: 'center', lineHeight: 20 },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  supplierIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  supplier: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  meta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  total: { fontSize: 16, fontWeight: '800', color: '#6B4E2E' },
  countBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginTop: -4,
  },
  noteText: { fontSize: 12, color: '#9CA3AF', flex: 1 },

  itemsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
  },
  colH: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  itemVal: { fontSize: 13, color: '#6B7280' },
  itemDivider: { height: 1, backgroundColor: '#F9FAFB', marginHorizontal: 16 },
  itemsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  itemsFooterLbl: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  itemsFooterVal: { fontSize: 15, fontWeight: '800', color: '#6B4E2E' },
});
