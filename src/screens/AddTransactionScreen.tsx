import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { addTransaction } from '../services/transactions';
import { TransactionType } from '../types';

// ── Constants ─────────────────────────────────────────────────────
const DEFAULT_INCOME_CATS  = ['Sales', 'Delivery', 'Catering', 'Other'];
const DEFAULT_EXPENSE_CATS = ['Supplies', 'Rent', 'Utilities', 'Salaries', 'Equipment', 'Other'];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_FULL  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Helpers ───────────────────────────────────────────────────────
function formatDisplayDate(d: Date): string {
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

// ── Date Picker Modal ─────────────────────────────────────────────
function DatePickerModal({
  visible,
  value,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  value: Date;
  onConfirm: (d: Date) => void;
  onCancel: () => void;
}) {
  const [year,  setYear]  = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth());
  const [day,   setDay]   = useState(value.getDate());

  function clampDay(y: number, m: number, d: number) {
    return Math.min(d, daysInMonth(y, m));
  }

  function changeYear(delta: number) {
    const ny = year + delta;
    const nd = clampDay(ny, month, day);
    setYear(ny); setDay(nd);
  }

  function changeMonth(delta: number) {
    let nm = month + delta, ny = year;
    if (nm > 11) { nm = 0; ny++; }
    if (nm < 0)  { nm = 11; ny--; }
    setYear(ny); setMonth(nm); setDay(clampDay(ny, nm, day));
  }

  function changeDay(delta: number) {
    let nd = day + delta;
    const max = daysInMonth(year, month);
    if (nd > max) nd = 1;
    if (nd < 1)   nd = max;
    setDay(nd);
  }

  function handleConfirm() {
    const selected = new Date(year, month, day, 12, 0, 0);
    const today = new Date(); today.setHours(23, 59, 59, 999);
    if (selected > today) {
      Alert.alert('Invalid date', 'You cannot select a future date.');
      return;
    }
    onConfirm(selected);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={dpStyles.overlay}>
        <View style={dpStyles.card}>
          <Text style={dpStyles.title}>Select Date</Text>

          {/* Column labels */}
          <View style={dpStyles.colLabels}>
            <Text style={dpStyles.colLabel}>Day</Text>
            <Text style={dpStyles.colLabel}>Month</Text>
            <Text style={dpStyles.colLabel}>Year</Text>
          </View>

          {/* Spinners */}
          <View style={dpStyles.spinnersRow}>
            {/* Day */}
            <View style={dpStyles.spinnerCol}>
              <TouchableOpacity onPress={() => changeDay(1)}  style={dpStyles.spinBtn}>
                <Ionicons name="chevron-up" size={20} color="#6B4E2E" />
              </TouchableOpacity>
              <View style={dpStyles.spinValueBox}>
                <Text style={dpStyles.spinValue}>{String(day).padStart(2, '0')}</Text>
              </View>
              <TouchableOpacity onPress={() => changeDay(-1)} style={dpStyles.spinBtn}>
                <Ionicons name="chevron-down" size={20} color="#6B4E2E" />
              </TouchableOpacity>
            </View>

            <Text style={dpStyles.separator}>/</Text>

            {/* Month */}
            <View style={dpStyles.spinnerCol}>
              <TouchableOpacity onPress={() => changeMonth(1)}  style={dpStyles.spinBtn}>
                <Ionicons name="chevron-up" size={20} color="#6B4E2E" />
              </TouchableOpacity>
              <View style={dpStyles.spinValueBox}>
                <Text style={dpStyles.spinValue}>{MONTH_NAMES[month]}</Text>
              </View>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={dpStyles.spinBtn}>
                <Ionicons name="chevron-down" size={20} color="#6B4E2E" />
              </TouchableOpacity>
            </View>

            <Text style={dpStyles.separator}>/</Text>

            {/* Year */}
            <View style={dpStyles.spinnerCol}>
              <TouchableOpacity onPress={() => changeYear(1)}  style={dpStyles.spinBtn}>
                <Ionicons name="chevron-up" size={20} color="#6B4E2E" />
              </TouchableOpacity>
              <View style={dpStyles.spinValueBox}>
                <Text style={[dpStyles.spinValue, { fontSize: 18 }]}>{year}</Text>
              </View>
              <TouchableOpacity onPress={() => changeYear(-1)} style={dpStyles.spinBtn}>
                <Ionicons name="chevron-down" size={20} color="#6B4E2E" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Preview */}
          <Text style={dpStyles.preview}>
            {MONTH_FULL[month]} {String(day).padStart(2, '0')}, {year}
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

// ── Add Category Modal ────────────────────────────────────────────
function AddCategoryModal({
  visible,
  onAdd,
  onCancel,
}: {
  visible: boolean;
  onAdd: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');

  function handleAdd() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setValue('');
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={catStyles.overlay}>
        <View style={catStyles.card}>
          <Text style={catStyles.title}>New Category</Text>
          <TextInput
            style={catStyles.input}
            placeholder="e.g. Franchise fee"
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={setValue}
            autoFocus
            maxLength={32}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <View style={catStyles.actions}>
            <TouchableOpacity style={catStyles.cancelBtn} onPress={() => { setValue(''); onCancel(); }}>
              <Text style={catStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[catStyles.addBtn, !value.trim() && catStyles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!value.trim()}
            >
              <Text style={catStyles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function AddTransactionScreen() {
  const navigation = useNavigation();
  const { cafe }   = useAuth();

  const [type,     setType]     = useState<TransactionType>('income');
  const [amount,   setAmount]   = useState('');
  const [category, setCategory] = useState('');
  const [note,     setNote]     = useState('');
  const [date,     setDate]     = useState(new Date());
  const [loading,  setLoading]  = useState(false);

  // Per-type custom category lists (survive type toggle)
  const [incomeCats,  setIncomeCats]  = useState<string[]>(DEFAULT_INCOME_CATS);
  const [expenseCats, setExpenseCats] = useState<string[]>(DEFAULT_EXPENSE_CATS);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddCat,     setShowAddCat]     = useState(false);

  const categories = type === 'income' ? incomeCats : expenseCats;

  function addCategory(name: string) {
    if (type === 'income') {
      if (!incomeCats.includes(name)) setIncomeCats(prev => [...prev, name]);
    } else {
      if (!expenseCats.includes(name)) setExpenseCats(prev => [...prev, name]);
    }
    setCategory(name);
    setShowAddCat(false);
  }

  async function handleSave() {
    if (!cafe) return;
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    if (!category) {
      Alert.alert('Error', 'Please select a category.');
      return;
    }
    setLoading(true);
    try {
      await addTransaction({
        cafeId: cafe.id,
        amount: parsed,
        type,
        category,
        note: note.trim() || undefined,
        date,
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Type toggle ─────────────────────────────────────── */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && styles.typeBtnIncome]}
            onPress={() => { setType('income'); setCategory(''); }}
          >
            <Ionicons name="arrow-up-circle" size={16} color={type === 'income' ? '#fff' : '#9CA3AF'} style={{ marginRight: 6 }} />
            <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
            onPress={() => { setType('expense'); setCategory(''); }}
          >
            <Ionicons name="arrow-down-circle" size={16} color={type === 'expense' ? '#fff' : '#9CA3AF'} style={{ marginRight: 6 }} />
            <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>Expense</Text>
          </TouchableOpacity>
        </View>

        {/* ── Amount ──────────────────────────────────────────── */}
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            placeholderTextColor="#D1D5DB"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* ── Date ────────────────────────────────────────────── */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.dateBtn}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar" size={18} color="#6B4E2E" />
          <Text style={styles.dateBtnText}>{formatDisplayDate(date)}</Text>
          <View style={styles.dateBtnRight}>
            {date.toDateString() !== new Date().toDateString() && (
              <TouchableOpacity
                onPress={() => setDate(new Date())}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.todayLink}>Today</Text>
              </TouchableOpacity>
            )}
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>

        {/* ── Category ────────────────────────────────────────── */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Add new category chip */}
          <TouchableOpacity
            style={styles.categoryChipAdd}
            onPress={() => setShowAddCat(true)}
          >
            <Ionicons name="add" size={14} color="#6B4E2E" style={{ marginRight: 4 }} />
            <Text style={styles.categoryChipAddText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* ── Note ────────────────────────────────────────────── */}
        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          placeholder="Add a note..."
          placeholderTextColor="#9CA3AF"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />

        {/* ── Save ────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, type === 'income' ? styles.saveBtnIncome : styles.saveBtnExpense]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save {type === 'income' ? 'Income' : 'Expense'}</Text>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* ── Modals ──────────────────────────────────────────────── */}
      <DatePickerModal
        visible={showDatePicker}
        value={date}
        onConfirm={(d) => { setDate(d); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />
      <AddCategoryModal
        visible={showAddCat}
        onAdd={addCategory}
        onCancel={() => setShowAddCat(false)}
      />
    </KeyboardAvoidingView>
  );
}

// ── Date picker styles ────────────────────────────────────────────
const dpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  colLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  colLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spinnersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    fontSize: 22,
    color: '#D1D5DB',
    paddingBottom: 4,
    marginHorizontal: 4,
  },
  spinnerCol: { flex: 1, alignItems: 'center' },
  spinBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  spinValueBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    minWidth: 56,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  spinValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  preview: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B4E2E',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 20,
    backgroundColor: '#FDF8F5',
    paddingVertical: 8,
    borderRadius: 8,
  },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#6B4E2E',
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Add category styles ───────────────────────────────────────────
const catStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  addBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#6B4E2E',
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: '#D1D5DB' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── Screen styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 20, paddingBottom: 48 },

  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  typeBtnIncome:  { backgroundColor: '#10B981' },
  typeBtnExpense: { backgroundColor: '#EF4444' },
  typeBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  typeBtnTextActive: { color: '#fff' },

  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  currencySymbol: { fontSize: 24, color: '#9CA3AF', marginRight: 4 },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    paddingVertical: 14,
  },

  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
    gap: 10,
  },
  dateBtnText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1F2937' },
  dateBtnRight: { flexDirection: 'row', alignItems: 'center' },
  todayLink: { fontSize: 12, color: '#6B4E2E', fontWeight: '700' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 24,
  },
  categoryChipActive: { backgroundColor: '#6B4E2E', borderColor: '#6B4E2E' },
  categoryChipText: { color: '#374151', fontSize: 13, fontWeight: '500' },
  categoryChipTextActive: { color: '#fff', fontWeight: '600' },
  categoryChipAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    borderRadius: 24,
    borderStyle: 'dashed',
  },
  categoryChipAddText: { color: '#6B4E2E', fontSize: 13, fontWeight: '600' },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 20,
  },
  noteInput: { height: 84, textAlignVertical: 'top' },

  saveBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnIncome:  { backgroundColor: '#10B981' },
  saveBtnExpense: { backgroundColor: '#EF4444' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
