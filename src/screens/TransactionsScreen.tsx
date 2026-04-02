import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getTransactions, deleteTransaction } from '../services/transactions';
import { Transaction } from '../types';

// ── Types ─────────────────────────────────────────────────────────
type TypeFilter   = 'all' | 'income' | 'expense';
type DatePreset   = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

interface Filters {
  type:       TypeFilter;
  datePreset: DatePreset;
  dateFrom:   Date | null;
  dateTo:     Date | null;
  categories: string[];
}

const DEFAULT_FILTERS: Filters = {
  type: 'all', datePreset: 'all', dateFrom: null, dateTo: null, categories: [],
};

// ── Date helpers ──────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function startOf(preset: Exclude<DatePreset, 'custom' | 'all'>): Date {
  const d = new Date();
  if (preset === 'today') { d.setHours(0,0,0,0); return d; }
  if (preset === 'week')  { d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; }
  if (preset === 'month') { d.setDate(1); d.setHours(0,0,0,0); return d; }
  // year
  return new Date(d.getFullYear(), 0, 1);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function dayKey(iso: string): string { return iso.slice(0, 10); }

function dayLabel(key: string): string {
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const d = new Date(key + 'T00:00:00');
  if (d.toDateString() === today.toDateString())     return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.type !== 'all')         n++;
  if (f.datePreset !== 'all')   n++;
  if (f.categories.length > 0)  n++;
  return n;
}

// ── Mini date spinner ─────────────────────────────────────────────
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }

function DateSpinner({
  label, value, onChange, maxDate,
}: {
  label: string; value: Date; onChange: (d: Date) => void; maxDate?: Date;
}) {
  const [y, m, d] = [value.getFullYear(), value.getMonth(), value.getDate()];

  function apply(ny: number, nm: number, nd: number) {
    nd = Math.min(nd, daysInMonth(ny, nm));
    const next = new Date(ny, nm, nd, 12, 0, 0);
    if (maxDate && next > maxDate) return;
    onChange(next);
  }

  function chDay(delta: number) {
    let nd = d + delta, nm = m, ny = y;
    const max = daysInMonth(ny, nm);
    if (nd > max) { nd = 1; nm++; if (nm > 11) { nm = 0; ny++; } }
    if (nd < 1)   { nm--; if (nm < 0) { nm = 11; ny--; } nd = daysInMonth(ny, nm); }
    apply(ny, nm, nd);
  }
  function chMonth(delta: number) {
    let nm = m + delta, ny = y;
    if (nm > 11) { nm = 0; ny++; } if (nm < 0) { nm = 11; ny--; }
    apply(ny, nm, d);
  }
  function chYear(delta: number) { apply(y + delta, m, d); }

  return (
    <View style={dsStyles.wrap}>
      <Text style={dsStyles.label}>{label}</Text>
      <View style={dsStyles.row}>
        {/* Day */}
        <View style={dsStyles.col}>
          <TouchableOpacity onPress={() => chDay(1)}  style={dsStyles.btn}><Ionicons name="chevron-up"   size={16} color="#6B4E2E" /></TouchableOpacity>
          <View style={dsStyles.box}><Text style={dsStyles.val}>{String(d).padStart(2,'0')}</Text></View>
          <TouchableOpacity onPress={() => chDay(-1)} style={dsStyles.btn}><Ionicons name="chevron-down" size={16} color="#6B4E2E" /></TouchableOpacity>
        </View>
        <Text style={dsStyles.sep}>/</Text>
        {/* Month */}
        <View style={dsStyles.col}>
          <TouchableOpacity onPress={() => chMonth(1)}  style={dsStyles.btn}><Ionicons name="chevron-up"   size={16} color="#6B4E2E" /></TouchableOpacity>
          <View style={dsStyles.box}><Text style={dsStyles.val}>{MONTH_NAMES[m]}</Text></View>
          <TouchableOpacity onPress={() => chMonth(-1)} style={dsStyles.btn}><Ionicons name="chevron-down" size={16} color="#6B4E2E" /></TouchableOpacity>
        </View>
        <Text style={dsStyles.sep}>/</Text>
        {/* Year */}
        <View style={dsStyles.col}>
          <TouchableOpacity onPress={() => chYear(1)}  style={dsStyles.btn}><Ionicons name="chevron-up"   size={16} color="#6B4E2E" /></TouchableOpacity>
          <View style={dsStyles.box}><Text style={[dsStyles.val, { fontSize: 15 }]}>{y}</Text></View>
          <TouchableOpacity onPress={() => chYear(-1)} style={dsStyles.btn}><Ionicons name="chevron-down" size={16} color="#6B4E2E" /></TouchableOpacity>
        </View>
      </View>
      <Text style={dsStyles.preview}>{MONTH_FULL[m]} {String(d).padStart(2,'0')}, {y}</Text>
    </View>
  );
}

// ── Transaction item ──────────────────────────────────────────────
function TransactionItem({ item, onDelete }: { item: Transaction; onDelete: (id: string) => void }) {
  const { fmt } = useSettings();
  const isIncome = item.type === 'income';

  function confirmDelete() {
    Alert.alert('Delete transaction', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  }

  return (
    <View style={itemStyles.row}>
      {/* Icon */}
      <View style={[itemStyles.icon, isIncome ? itemStyles.iconIncome : itemStyles.iconExpense]}>
        <Ionicons
          name={isIncome ? 'arrow-up' : 'arrow-down'}
          size={16}
          color={isIncome ? '#059669' : '#DC2626'}
        />
      </View>
      {/* Body */}
      <View style={itemStyles.body}>
        <Text style={itemStyles.category}>{item.category}</Text>
        {item.note ? <Text style={itemStyles.note} numberOfLines={1}>{item.note}</Text> : null}
        <View style={itemStyles.metaRow}>
          <Ionicons name="time-outline" size={10} color="#9CA3AF" style={{ marginRight: 3 }} />
          <Text style={itemStyles.date}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      {/* Amount + delete */}
      <View style={itemStyles.right}>
        <Text style={[itemStyles.amount, isIncome ? itemStyles.amountIncome : itemStyles.amountExpense]}>
          {isIncome ? '+' : '−'}{fmt(Number(item.amount))}
        </Text>
        <TouchableOpacity onPress={confirmDelete} style={itemStyles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={14} color="#D1D5DB" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Day section header ────────────────────────────────────────────
function DayHeader({ label, income, expense }: { label: string; income: number; expense: number }) {
  const { fmt } = useSettings();
  return (
    <View style={itemStyles.dayHeader}>
      <Text style={itemStyles.dayLabel}>{label}</Text>
      <View style={itemStyles.dayTotals}>
        <Text style={itemStyles.dayIncome}>+{fmt(income)}</Text>
        <Text style={itemStyles.dayExpense}>  −{fmt(expense)}</Text>
      </View>
    </View>
  );
}

// ── Summary strip ─────────────────────────────────────────────────
function SummaryStrip({ data, total }: { data: Transaction[]; total: number }) {
  const { t: tr, fmt } = useSettings();
  const income   = data.filter(t => t.type === 'income').reduce((s,t) => s + Number(t.amount), 0);
  const expenses = data.filter(t => t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);

  return (
    <View style={summaryStyles.strip}>
      <View style={summaryStyles.col}>
        <Text style={summaryStyles.count}>{data.length} of {total}</Text>
        <Text style={summaryStyles.colLabel}>{tr('transactionsCount')}</Text>
      </View>
      <View style={summaryStyles.divider} />
      <View style={summaryStyles.col}>
        <Text style={[summaryStyles.val, { color: '#059669' }]}>+{fmt(income)}</Text>
        <Text style={summaryStyles.colLabel}>{tr('transactionsIncome')}</Text>
      </View>
      <View style={summaryStyles.divider} />
      <View style={summaryStyles.col}>
        <Text style={[summaryStyles.val, { color: '#DC2626' }]}>−{fmt(expenses)}</Text>
        <Text style={summaryStyles.colLabel}>{tr('transactionsExpenses')}</Text>
      </View>
      <View style={summaryStyles.divider} />
      <View style={summaryStyles.col}>
        <Text style={[summaryStyles.val, { color: income - expenses >= 0 ? '#6B4E2E' : '#DC2626' }]}>
          {fmt(income - expenses)}
        </Text>
        <Text style={summaryStyles.colLabel}>{tr('transactionsNet')}</Text>
      </View>
    </View>
  );
}

// ── Active filter chips ───────────────────────────────────────────
function ActiveFilterChips({
  filters, onRemoveType, onRemoveDate, onRemoveCategory,
}: {
  filters: Filters;
  onRemoveType: () => void;
  onRemoveDate: () => void;
  onRemoveCategory: (c: string) => void;
}) {
  const hasAny = activeFilterCount(filters) > 0;
  if (!hasAny) return null;

  const PRESET_LABELS: Record<DatePreset, string> = {
    today: 'Today', week: 'This Week', month: 'This Month',
    year: 'This Year', custom: 'Custom Range', all: 'All Time',
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={chipStyles.scroll} contentContainerStyle={chipStyles.content}>
      {filters.type !== 'all' && (
        <TouchableOpacity style={chipStyles.chip} onPress={onRemoveType}>
          <Text style={chipStyles.chipText}>{filters.type === 'income' ? 'Income' : 'Expense'}</Text>
          <Ionicons name="close" size={12} color="#6B4E2E" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
      {filters.datePreset !== 'all' && (
        <TouchableOpacity style={chipStyles.chip} onPress={onRemoveDate}>
          <Text style={chipStyles.chipText}>
            {filters.datePreset === 'custom' && filters.dateFrom && filters.dateTo
              ? `${MONTH_NAMES[filters.dateFrom.getMonth()]} ${filters.dateFrom.getDate()} – ${MONTH_NAMES[filters.dateTo.getMonth()]} ${filters.dateTo.getDate()}`
              : PRESET_LABELS[filters.datePreset]}
          </Text>
          <Ionicons name="close" size={12} color="#6B4E2E" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
      {filters.categories.map(c => (
        <TouchableOpacity key={c} style={chipStyles.chip} onPress={() => onRemoveCategory(c)}>
          <Text style={chipStyles.chipText}>{c}</Text>
          <Ionicons name="close" size={12} color="#6B4E2E" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Filter bottom sheet ───────────────────────────────────────────
const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'all',   label: 'All Time'   },
  { key: 'today', label: 'Today'      },
  { key: 'week',  label: 'This Week'  },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year'  },
  { key: 'custom',label: 'Custom'     },
];

function FilterSheet({
  visible, onClose, filters, onApply, allCategories,
}: {
  visible: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (f: Filters) => void;
  allCategories: string[];
}) {
  const [local, setLocal] = useState<Filters>(filters);

  // Sync when sheet opens
  React.useEffect(() => { if (visible) setLocal(filters); }, [visible]);

  function toggleCategory(c: string) {
    setLocal(prev => ({
      ...prev,
      categories: prev.categories.includes(c)
        ? prev.categories.filter(x => x !== c)
        : [...prev.categories, c],
    }));
  }

  const defaultFrom = useMemo(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; }, []);
  const from = local.dateFrom ?? defaultFrom;
  const to   = local.dateTo   ?? new Date();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={fsStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={fsStyles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={fsStyles.sheet}>
          {/* Handle + title */}
          <View style={fsStyles.handle} />
          <View style={fsStyles.titleRow}>
            <Text style={fsStyles.title}>Filter Transactions</Text>
            <TouchableOpacity onPress={onClose} style={fsStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

            {/* ── Type ──────────────────────────────────────────── */}
            <Text style={fsStyles.sectionLabel}>TYPE</Text>
            <View style={fsStyles.typeRow}>
              {(['all','income','expense'] as TypeFilter[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[fsStyles.typeBtn, local.type === t && (
                    t === 'income' ? fsStyles.typeBtnIncome :
                    t === 'expense' ? fsStyles.typeBtnExpense :
                    fsStyles.typeBtnAll
                  )]}
                  onPress={() => setLocal(prev => ({ ...prev, type: t }))}
                >
                  {t !== 'all' && (
                    <Ionicons
                      name={t === 'income' ? 'arrow-up' : 'arrow-down'}
                      size={14}
                      color={local.type === t ? '#fff' : '#9CA3AF'}
                      style={{ marginRight: 5 }}
                    />
                  )}
                  <Text style={[fsStyles.typeBtnText, local.type === t && fsStyles.typeBtnTextActive]}>
                    {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Date range ────────────────────────────────────── */}
            <Text style={[fsStyles.sectionLabel, { marginTop: 20 }]}>DATE RANGE</Text>
            <View style={fsStyles.presetGrid}>
              {DATE_PRESETS.map(p => (
                <TouchableOpacity
                  key={p.key}
                  style={[fsStyles.presetBtn, local.datePreset === p.key && fsStyles.presetBtnActive]}
                  onPress={() => setLocal(prev => ({
                    ...prev,
                    datePreset: p.key,
                    dateFrom: p.key === 'custom' ? (prev.dateFrom ?? defaultFrom) : null,
                    dateTo:   p.key === 'custom' ? (prev.dateTo   ?? new Date())  : null,
                  }))}
                >
                  <Text style={[fsStyles.presetText, local.datePreset === p.key && fsStyles.presetTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom date spinners */}
            {local.datePreset === 'custom' && (
              <View style={fsStyles.customDates}>
                <DateSpinner
                  label="From"
                  value={from}
                  onChange={d => setLocal(prev => ({ ...prev, dateFrom: d }))}
                  maxDate={to}
                />
                <View style={fsStyles.customDatesDivider} />
                <DateSpinner
                  label="To"
                  value={to}
                  onChange={d => setLocal(prev => ({ ...prev, dateTo: d }))}
                  maxDate={new Date()}
                />
              </View>
            )}

            {/* ── Categories ────────────────────────────────────── */}
            {allCategories.length > 0 && (
              <>
                <View style={fsStyles.catHeader}>
                  <Text style={[fsStyles.sectionLabel, { marginTop: 20, marginBottom: 0 }]}>CATEGORIES</Text>
                  {local.categories.length > 0 && (
                    <TouchableOpacity onPress={() => setLocal(prev => ({ ...prev, categories: [] }))}>
                      <Text style={fsStyles.clearCats}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={fsStyles.catGrid}>
                  {allCategories.map(c => {
                    const active = local.categories.includes(c);
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[fsStyles.catChip, active && fsStyles.catChipActive]}
                        onPress={() => toggleCategory(c)}
                      >
                        {active && <Ionicons name="checkmark" size={12} color="#fff" style={{ marginRight: 4 }} />}
                        <Text style={[fsStyles.catChipText, active && fsStyles.catChipTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Actions */}
          <View style={fsStyles.actions}>
            <TouchableOpacity
              style={fsStyles.resetBtn}
              onPress={() => { setLocal(DEFAULT_FILTERS); onApply(DEFAULT_FILTERS); onClose(); }}
            >
              <Text style={fsStyles.resetText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={fsStyles.applyBtn}
              onPress={() => { onApply(local); onClose(); }}
            >
              <Text style={fsStyles.applyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
type ListRow =
  | { kind: 'header'; key: string; label: string; income: number; expense: number }
  | { kind: 'item';   key: string; data: Transaction };

export default function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const { cafe }   = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [search,       setSearch]       = useState('');
  const [filters,      setFilters]      = useState<Filters>(DEFAULT_FILTERS);
  const [showFilter,   setShowFilter]   = useState(false);

  const load = useCallback(async () => {
    if (!cafe) return;
    try {
      const data = await getTransactions(cafe.id);
      setTransactions(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [cafe]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleDelete(id: string) {
    try {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  // ── All unique categories ─────────────────────────────────────
  const allCategories = useMemo(() => {
    const set = new Set(transactions.map(t => t.category));
    return Array.from(set).sort();
  }, [transactions]);

  // ── Apply filters + search ────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...transactions];

    // Type
    if (filters.type !== 'all') list = list.filter(t => t.type === filters.type);

    // Date
    if (filters.datePreset !== 'all') {
      let from: Date, to: Date = new Date();
      to.setHours(23, 59, 59, 999);
      if (filters.datePreset === 'custom') {
        from = filters.dateFrom ?? new Date(0);
        to   = filters.dateTo   ?? new Date();
        to   = new Date(to); to.setHours(23, 59, 59, 999);
      } else {
        from = startOf(filters.datePreset as Exclude<DatePreset, 'custom' | 'all'>);
      }
      list = list.filter(t => {
        const d = new Date(t.created_at);
        return d >= from && d <= to;
      });
    }

    // Categories
    if (filters.categories.length > 0) {
      list = list.filter(t => filters.categories.includes(t.category));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.category.toLowerCase().includes(q) ||
        (t.note ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [transactions, filters, search]);

  // ── Group into flat list rows ─────────────────────────────────
  const listRows = useMemo((): ListRow[] => {
    const byDay: Record<string, Transaction[]> = {};
    for (const t of filtered) {
      const k = dayKey(t.created_at);
      if (!byDay[k]) byDay[k] = [];
      byDay[k].push(t);
    }
    const rows: ListRow[] = [];
    const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));
    for (const day of sortedDays) {
      const items = byDay[day];
      const income  = items.filter(t => t.type === 'income').reduce((s,t) => s + Number(t.amount), 0);
      const expense = items.filter(t => t.type === 'expense').reduce((s,t) => s + Number(t.amount), 0);
      rows.push({ kind: 'header', key: `hdr-${day}`, label: dayLabel(day), income, expense });
      for (const t of items) rows.push({ kind: 'item', key: t.id, data: t });
    }
    return rows;
  }, [filtered]);

  const filterCount = activeFilterCount(filters);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#6B4E2E" size="large" /></View>;
  }

  return (
    <View style={styles.container}>

      {/* ── Search + Filter bar ──────────────────────────────── */}
      <View style={styles.searchBar}>
        <View style={styles.searchInput}>
          <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchText}
            placeholder="Search category or note…"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && Platform.OS !== 'ios' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, filterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilter(true)}
        >
          <Ionicons name="options-outline" size={18} color={filterCount > 0 ? '#fff' : '#6B4E2E'} />
          {filterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Active filter chips ──────────────────────────────── */}
      <ActiveFilterChips
        filters={filters}
        onRemoveType={() => setFilters(p => ({ ...p, type: 'all' }))}
        onRemoveDate={() => setFilters(p => ({ ...p, datePreset: 'all', dateFrom: null, dateTo: null }))}
        onRemoveCategory={c => setFilters(p => ({ ...p, categories: p.categories.filter(x => x !== c) }))}
      />

      {/* ── Summary strip ────────────────────────────────────── */}
      <SummaryStrip data={filtered} total={transactions.length} />

      {/* ── List ─────────────────────────────────────────────── */}
      <FlatList
        data={listRows}
        keyExtractor={r => r.key}
        renderItem={({ item: row }) =>
          row.kind === 'header'
            ? <DayHeader label={row.label} income={row.income} expense={row.expense} />
            : <TransactionItem item={row.data} onDelete={handleDelete} />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6B4E2E" />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={52} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {filterCount > 0 || search ? 'No matches found' : 'No transactions yet'}
            </Text>
            <Text style={styles.emptyHint}>
              {filterCount > 0 || search
                ? 'Try adjusting your filters or search.'
                : 'Tap + to record your first transaction.'}
            </Text>
          </View>
        }
      />

      {/* ── FAB ──────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddTransaction')}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── Filter sheet ─────────────────────────────────────── */}
      <FilterSheet
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        filters={filters}
        onApply={setFilters}
        allCategories={allCategories}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchText: { flex: 1, fontSize: 14, color: '#1F2937' },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#6B4E2E', borderColor: '#6B4E2E' },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6B4E2E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6B4E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 4 },
  emptyHint:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
});

const itemStyles = StyleSheet.create({
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 2,
  },
  dayLabel:   { fontSize: 13, fontWeight: '700', color: '#374151' },
  dayTotals:  { flexDirection: 'row', alignItems: 'center' },
  dayIncome:  { fontSize: 12, fontWeight: '600', color: '#059669' },
  dayExpense: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconIncome:  { backgroundColor: '#ECFDF5' },
  iconExpense: { backgroundColor: '#FEF2F2' },
  body: { flex: 1 },
  category: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  note:     { fontSize: 12, color: '#6B7280', marginTop: 2 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  date:     { fontSize: 11, color: '#9CA3AF' },
  right:    { alignItems: 'flex-end', gap: 6 },
  amount:   { fontSize: 16, fontWeight: '700' },
  amountIncome:  { color: '#059669' },
  amountExpense: { color: '#DC2626' },
  deleteBtn: { padding: 2 },
});

const summaryStyles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  col:      { flex: 1, alignItems: 'center', gap: 2 },
  divider:  { width: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  count:    { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  val:      { fontSize: 14, fontWeight: '700' },
  colLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
});

const chipStyles = StyleSheet.create({
  scroll:   { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  content:  { paddingHorizontal: 16, paddingVertical: 8, gap: 6, flexDirection: 'row' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#6B4E2E' },
});

// ── Filter sheet styles ───────────────────────────────────────────
const fsStyles = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
  },
  handle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  title:    { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  closeBtn: { padding: 4 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 10 },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  typeBtnAll:     { backgroundColor: '#1F2937', borderColor: '#1F2937' },
  typeBtnIncome:  { backgroundColor: '#059669', borderColor: '#059669' },
  typeBtnExpense: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  typeBtnText:       { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  typeBtnTextActive: { color: '#fff' },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  presetBtnActive: { backgroundColor: '#6B4E2E', borderColor: '#6B4E2E' },
  presetText:       { fontSize: 13, fontWeight: '500', color: '#374151' },
  presetTextActive: { color: '#fff', fontWeight: '600' },

  customDates: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  customDatesDivider: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 12 },

  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  clearCats: { fontSize: 12, fontWeight: '600', color: '#6B4E2E' },
  catGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  catChipActive:     { backgroundColor: '#6B4E2E', borderColor: '#6B4E2E' },
  catChipText:       { fontSize: 13, fontWeight: '500', color: '#374151' },
  catChipTextActive: { color: '#fff', fontWeight: '600' },

  actions: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  resetText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  applyBtn:  { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: '#6B4E2E', alignItems: 'center' },
  applyText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ── Date spinner styles ───────────────────────────────────────────
const dsStyles = StyleSheet.create({
  wrap:    { flex: 1, alignItems: 'center' },
  label:   { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  row:     { flexDirection: 'row', alignItems: 'center' },
  col:     { alignItems: 'center' },
  btn:     { paddingVertical: 4, paddingHorizontal: 6 },
  box:     { backgroundColor: '#fff', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, borderWidth: 1.5, borderColor: '#E5E7EB', minWidth: 44, alignItems: 'center' },
  val:     { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  sep:     { fontSize: 18, color: '#D1D5DB', marginHorizontal: 3, paddingBottom: 2 },
  preview: { fontSize: 11, color: '#6B4E2E', fontWeight: '600', marginTop: 6 },
});
