import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getStatistics, PeriodRow } from '../services/transactions';

type Mode = 'daily' | 'monthly' | 'yearly' | 'custom';

const MODES: { key: Mode; label: string }[] = [
  { key: 'daily',   label: 'Daily' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly',  label: 'Yearly' },
  { key: 'custom',  label: 'Custom' },
];

// ── Date picker modal (month + year navigation) ───────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function DatePickerModal({
  visible,
  title,
  value,
  onConfirm,
  onCancel,
  maxDate,
  minDate,
}: {
  visible: boolean;
  title: string;
  value: Date;
  onConfirm: (d: Date) => void;
  onCancel: () => void;
  maxDate?: Date;
  minDate?: Date;
}) {
  const [year,  setYear]  = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth());
  const [day,   setDay]   = useState(value.getDate());

  function daysInMonth(y: number, m: number) {
    return new Date(y, m + 1, 0).getDate();
  }

  function clampDay(y: number, m: number, d: number) {
    return Math.min(d, daysInMonth(y, m));
  }

  function changeYear(delta: number) {
    const ny = year + delta;
    const nd = clampDay(ny, month, day);
    setYear(ny); setDay(nd);
  }

  function changeMonth(delta: number) {
    let nm = month + delta;
    let ny = year;
    if (nm > 11) { nm = 0; ny++; }
    if (nm < 0)  { nm = 11; ny--; }
    const nd = clampDay(ny, nm, day);
    setYear(ny); setMonth(nm); setDay(nd);
  }

  function changeDay(delta: number) {
    let nd = day + delta;
    const max = daysInMonth(year, month);
    if (nd > max) nd = 1;
    if (nd < 1)   nd = max;
    setDay(nd);
  }

  function handleConfirm() {
    const d = new Date(year, month, day, 12, 0, 0);
    if (maxDate && d > maxDate) {
      Alert.alert('Invalid date', `Date cannot be after ${maxDate.toLocaleDateString()}`);
      return;
    }
    if (minDate && d < minDate) {
      Alert.alert('Invalid date', `Date cannot be before ${minDate.toLocaleDateString()}`);
      return;
    }
    onConfirm(d);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dpStyles.overlay}>
        <View style={dpStyles.card}>
          <Text style={dpStyles.title}>{title}</Text>

          {/* Year row */}
          <View style={dpStyles.row}>
            <Text style={dpStyles.colLabel}>Year</Text>
            <Text style={dpStyles.colLabel}>Month</Text>
            <Text style={dpStyles.colLabel}>Day</Text>
          </View>
          <View style={dpStyles.row}>
            {/* Year */}
            <View style={dpStyles.spinnerCol}>
              <TouchableOpacity onPress={() => changeYear(1)} style={dpStyles.spinBtn}>
                <Ionicons name="chevron-up" size={18} color="#6B4E2E" />
              </TouchableOpacity>
              <Text style={dpStyles.spinValue}>{year}</Text>
              <TouchableOpacity onPress={() => changeYear(-1)} style={dpStyles.spinBtn}>
                <Ionicons name="chevron-down" size={18} color="#6B4E2E" />
              </TouchableOpacity>
            </View>

            {/* Month */}
            <View style={dpStyles.spinnerCol}>
              <TouchableOpacity onPress={() => changeMonth(1)} style={dpStyles.spinBtn}>
                <Ionicons name="chevron-up" size={18} color="#6B4E2E" />
              </TouchableOpacity>
              <Text style={dpStyles.spinValue}>{MONTH_NAMES[month]}</Text>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={dpStyles.spinBtn}>
                <Ionicons name="chevron-down" size={18} color="#6B4E2E" />
              </TouchableOpacity>
            </View>

            {/* Day */}
            <View style={dpStyles.spinnerCol}>
              <TouchableOpacity onPress={() => changeDay(1)} style={dpStyles.spinBtn}>
                <Ionicons name="chevron-up" size={18} color="#6B4E2E" />
              </TouchableOpacity>
              <Text style={dpStyles.spinValue}>{String(day).padStart(2, '0')}</Text>
              <TouchableOpacity onPress={() => changeDay(-1)} style={dpStyles.spinBtn}>
                <Ionicons name="chevron-down" size={18} color="#6B4E2E" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={dpStyles.preview}>
            {MONTH_FULL[month]} {day}, {year}
          </Text>

          <View style={dpStyles.actions}>
            <TouchableOpacity style={dpStyles.cancelBtn} onPress={onCancel}>
              <Text style={dpStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dpStyles.confirmBtn} onPress={handleConfirm}>
              <Text style={dpStyles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Period row card ───────────────────────────────────────────────
function PeriodCard({ item, maxIncome }: { item: PeriodRow; maxIncome: number }) {
  const isProfit = item.profit >= 0;
  const barWidth = maxIncome > 0 ? (item.total_income / maxIncome) * 100 : 0;
  const expenseBarWidth = maxIncome > 0 ? (item.total_expenses / maxIncome) * 100 : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>{item.label}</Text>
        <Text style={[styles.profitBadge, isProfit ? styles.profitBadgeGreen : styles.profitBadgeRed]}>
          {isProfit ? '+' : ''}${item.profit.toFixed(2)}
        </Text>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#10B981' }]} />
          <View>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              ${item.total_income.toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: '#EF4444' }]} />
          <View>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              ${item.total_expenses.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Bar chart */}
      <View style={styles.bars}>
        <View style={styles.barRow}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${barWidth}%`, backgroundColor: '#10B981' }]} />
          </View>
        </View>
        <View style={styles.barRow}>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${expenseBarWidth}%`, backgroundColor: '#EF4444' }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Summary banner ────────────────────────────────────────────────
function SummaryBanner({ data }: { data: PeriodRow[] }) {
  const totalIncome   = data.reduce((s, r) => s + r.total_income,   0);
  const totalExpenses = data.reduce((s, r) => s + r.total_expenses, 0);
  const totalProfit   = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? ((totalProfit / totalIncome) * 100).toFixed(1) : '0.0';

  return (
    <View style={styles.banner}>
      <View style={styles.bannerItem}>
        <Ionicons name="arrow-up-circle" size={18} color="#10B981" />
        <Text style={styles.bannerLabel}>Income</Text>
        <Text style={[styles.bannerValue, { color: '#10B981' }]}>${totalIncome.toFixed(2)}</Text>
      </View>
      <View style={styles.bannerDivider} />
      <View style={styles.bannerItem}>
        <Ionicons name="arrow-down-circle" size={18} color="#EF4444" />
        <Text style={styles.bannerLabel}>Expenses</Text>
        <Text style={[styles.bannerValue, { color: '#EF4444' }]}>${totalExpenses.toFixed(2)}</Text>
      </View>
      <View style={styles.bannerDivider} />
      <View style={styles.bannerItem}>
        <Ionicons name="trending-up" size={18} color={totalProfit >= 0 ? '#6B4E2E' : '#EF4444'} />
        <Text style={styles.bannerLabel}>Profit</Text>
        <Text style={[styles.bannerValue, { color: totalProfit >= 0 ? '#6B4E2E' : '#EF4444' }]}>
          {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
        </Text>
      </View>
      <View style={styles.bannerDivider} />
      <View style={styles.bannerItem}>
        <Ionicons name="pie-chart" size={18} color="#3B82F6" />
        <Text style={styles.bannerLabel}>Margin</Text>
        <Text style={[styles.bannerValue, { color: '#3B82F6' }]}>{margin}%</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function StatisticsScreen() {
  const { cafe } = useAuth();

  const [mode, setMode]   = useState<Mode>('monthly');
  const [data, setData]   = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Custom range
  const [fromDate, setFromDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [toDate, setToDate] = useState<Date>(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker,   setShowToPicker]   = useState(false);

  const load = useCallback(async (m: Mode = mode, from = fromDate, to = toDate) => {
    if (!cafe) return;
    try {
      const result = await getStatistics(cafe.id, m, from, to);
      setData(result);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [cafe, mode, fromDate, toDate]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(mode, fromDate, toDate);
    }, [mode, fromDate, toDate])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load(mode, fromDate, toDate);
    setRefreshing(false);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setLoading(true);
    load(m, fromDate, toDate);
  }

  const maxIncome = data.reduce((max, r) => Math.max(max, r.total_income), 0);

  return (
    <View style={styles.container}>

      {/* Mode tabs */}
      <View style={styles.modeTabs}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modeTab, mode === m.key && styles.modeTabActive]}
            onPress={() => switchMode(m.key)}
          >
            <Text style={[styles.modeTabText, mode === m.key && styles.modeTabTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom date range selectors */}
      {mode === 'custom' && (
        <View style={styles.customRange}>
          <TouchableOpacity
            style={styles.dateRangeBtn}
            onPress={() => setShowFromPicker(true)}
          >
            <Ionicons name="calendar-outline" size={14} color="#6B4E2E" style={{ marginRight: 5 }} />
            <Text style={styles.dateRangeBtnText}>
              From: {fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
          <Ionicons name="arrow-forward" size={14} color="#9CA3AF" style={{ marginHorizontal: 6 }} />
          <TouchableOpacity
            style={styles.dateRangeBtn}
            onPress={() => setShowToPicker(true)}
          >
            <Ionicons name="calendar-outline" size={14} color="#6B4E2E" style={{ marginRight: 5 }} />
            <Text style={styles.dateRangeBtnText}>
              To: {toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Summary banner */}
      {!loading && data.length > 0 && <SummaryBanner data={data} />}

      {/* List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#6B4E2E" size="large" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => <PeriodCard item={item} maxIncome={maxIncome} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={56} color="#D1D5DB" />
              <Text style={styles.emptyText}>No data for this period.</Text>
              <Text style={styles.emptyHint}>Add transactions to see statistics.</Text>
            </View>
          }
        />
      )}

      {/* Date pickers */}
      <DatePickerModal
        visible={showFromPicker}
        title="From Date"
        value={fromDate}
        maxDate={toDate}
        onConfirm={(d) => {
          setFromDate(d);
          setShowFromPicker(false);
          setLoading(true);
          load('custom', d, toDate);
        }}
        onCancel={() => setShowFromPicker(false)}
      />
      <DatePickerModal
        visible={showToPicker}
        title="To Date"
        value={toDate}
        minDate={fromDate}
        maxDate={new Date()}
        onConfirm={(d) => {
          setToDate(d);
          setShowToPicker(false);
          setLoading(true);
          load('custom', fromDate, d);
        }}
        onCancel={() => setShowToPicker(false)}
      />
    </View>
  );
}

// ── Date picker styles ────────────────────────────────────────────
const dpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  colLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 },
  spinnerCol: { flex: 1, alignItems: 'center' },
  spinBtn: { padding: 10 },
  spinValue: { fontSize: 20, fontWeight: '700', color: '#1F2937', minWidth: 48, textAlign: 'center' },
  preview: { textAlign: 'center', fontSize: 15, color: '#6B4E2E', fontWeight: '600', marginTop: 12, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#6B4E2E', alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Screen styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },

  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modeTabActive: { backgroundColor: '#6B4E2E' },
  modeTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  modeTabTextActive: { color: '#fff' },

  customRange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateRangeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateRangeBtnText: { fontSize: 12, fontWeight: '600', color: '#6B4E2E' },

  banner: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  bannerItem: { flex: 1, alignItems: 'center', gap: 3 },
  bannerDivider: { width: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  bannerLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  bannerValue: { fontSize: 13, fontWeight: '700' },

  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  profitBadge: { fontSize: 13, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  profitBadgeGreen: { backgroundColor: '#D1FAE5', color: '#065F46' },
  profitBadgeRed: { backgroundColor: '#FEE2E2', color: '#991B1B' },

  cardStats: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  statValue: { fontSize: 15, fontWeight: '700', marginTop: 1 },

  bars: { gap: 4 },
  barRow: {},
  barTrack: {
    height: 5,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: 5, borderRadius: 3 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#374151', marginTop: 4 },
  emptyHint: { fontSize: 13, color: '#9CA3AF' },
});
