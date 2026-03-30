import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import {
  getEmployees,
  addEmployee,
  deleteEmployee,
  getShifts,
  openShift,
  closeShift,
  updateShift,
} from '../services/shifts';
import { Employee, Shift } from '../types';

// ── Helpers ───────────────────────────────────────────────────────
function avatarColor(name: string): string {
  const palette = ['#6B4E2E', '#4E7C6B', '#4E5D7C', '#7C4E6B', '#7C6B4E'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function formatShiftTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function shiftDuration(openedAt: string, closedAt: string | null): string {
  const end = closedAt ? new Date(closedAt) : new Date();
  const mins = Math.floor((end.getTime() - new Date(openedAt).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Input row helper ─────────────────────────────────────────────
function ModalField({
  label, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  multiline?: boolean;
}) {
  return (
    <View style={mStyles.field}>
      <Text style={mStyles.fieldLabel}>{label}</Text>
      <TextInput
        style={[mStyles.fieldInput, multiline && mStyles.fieldInputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
      />
    </View>
  );
}

// ── Tab bar ──────────────────────────────────────────────────────
type Tab = 'staff' | 'shifts';

// ── Main Screen ──────────────────────────────────────────────────
export default function ShiftsScreen() {
  const { cafe } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('shifts');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts,    setShifts]    = useState<Shift[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Open shift modal ─────────────────────────────────────────
  const [openModal,        setOpenModal]        = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [startCash,        setStartCash]        = useState('');
  const [shiftNote,        setShiftNote]        = useState('');
  const [savingShift,      setSavingShift]      = useState(false);

  // ── Close shift modal ────────────────────────────────────────
  const [closeModal,   setCloseModal]   = useState(false);
  const [closingShift, setClosingShift] = useState<Shift | null>(null);
  const [endCash,      setEndCash]      = useState('');

  // ── Edit shift modal ─────────────────────────────────────────
  const [editModal,         setEditModal]         = useState(false);
  const [editingShift,      setEditingShift]      = useState<Shift | null>(null);
  const [editEmployee,      setEditEmployee]      = useState<Employee | null>(null);
  const [editStartCash,     setEditStartCash]     = useState('');
  const [editEndCash,       setEditEndCash]       = useState('');
  const [editNote,          setEditNote]          = useState('');
  const [editReopenShift,   setEditReopenShift]   = useState(false);

  // ── Add employee modal ───────────────────────────────────────
  const [empModal,    setEmpModal]    = useState(false);
  const [newEmpName,  setNewEmpName]  = useState('');
  const [savingEmp,   setSavingEmp]   = useState(false);

  // ── Data loading ─────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!cafe) return;
    try {
      const [emps, shiftData] = await Promise.all([
        getEmployees(cafe.id),
        getShifts(cafe.id),
      ]);
      setEmployees(emps);
      setShifts(shiftData);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [cafe]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // ── Handlers ─────────────────────────────────────────────────
  async function handleAddEmployee() {
    if (!newEmpName.trim() || !cafe) return;
    setSavingEmp(true);
    try {
      const emp = await addEmployee(cafe.id, newEmpName.trim());
      setEmployees(prev => [...prev, emp]);
      setNewEmpName('');
      setEmpModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingEmp(false);
    }
  }

  async function handleDeleteEmployee(emp: Employee) {
    Alert.alert('Remove staff member', `Remove ${emp.name} from the team?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await deleteEmployee(emp.id);
            setEmployees(prev => prev.filter(e => e.id !== emp.id));
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  }

  async function handleOpenShift() {
    if (!selectedEmployee || !cafe) return;
    const cash = parseFloat(startCash);
    if (isNaN(cash) || cash < 0) {
      Alert.alert('Error', 'Enter a valid start cash amount.');
      return;
    }
    setSavingShift(true);
    try {
      const shift = await openShift({
        cafeId: cafe.id,
        employeeId: selectedEmployee.id,
        startCash: cash,
        note: shiftNote.trim() || undefined,
      });
      setShifts(prev => [shift, ...prev]);
      setOpenModal(false);
      setStartCash(''); setShiftNote(''); setSelectedEmployee(null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingShift(false);
    }
  }

  async function handleCloseShift() {
    if (!closingShift) return;
    const cash = parseFloat(endCash);
    if (isNaN(cash) || cash < 0) {
      Alert.alert('Error', 'Enter a valid end cash amount.');
      return;
    }
    setSavingShift(true);
    try {
      const updated = await closeShift(closingShift.id, cash);
      setShifts(prev => prev.map(s => s.id === updated.id ? updated : s));
      setCloseModal(false); setEndCash(''); setClosingShift(null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingShift(false);
    }
  }

  function openEditModal(shift: Shift) {
    const emp = employees.find(e => e.id === shift.employee_id) ?? null;
    setEditingShift(shift);
    setEditEmployee(emp);
    setEditStartCash(String(shift.start_cash));
    setEditEndCash(shift.end_cash != null ? String(shift.end_cash) : '');
    setEditNote(shift.note ?? '');
    setEditReopenShift(false);
    setEditModal(true);
  }

  async function handleSaveEdit() {
    if (!editingShift || !editEmployee) return;
    const sc = parseFloat(editStartCash);
    if (isNaN(sc) || sc < 0) {
      Alert.alert('Error', 'Enter a valid start cash amount.');
      return;
    }
    const ec = editEndCash.trim() !== '' ? parseFloat(editEndCash) : null;
    if (ec !== null && (isNaN(ec) || ec < 0)) {
      Alert.alert('Error', 'Enter a valid end cash amount.');
      return;
    }
    setSavingShift(true);
    try {
      const wasOpen = !editingShift.closed_at;
      let closedAt = editingShift.closed_at;

      // Re-open a closed shift
      if (editReopenShift && !wasOpen) closedAt = null;
      // Close an open shift if end cash was entered
      if (wasOpen && ec !== null && !editReopenShift) closedAt = new Date().toISOString();

      const updated = await updateShift(editingShift.id, {
        employeeId: editEmployee.id,
        startCash: sc,
        endCash: ec,
        note: editNote.trim() || null,
        closedAt,
      });
      setShifts(prev => prev.map(s => s.id === updated.id ? updated : s));
      setEditModal(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingShift(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6B4E2E" size="large" />
      </View>
    );
  }

  const openShifts   = shifts.filter(s => !s.closed_at);
  const closedShifts = shifts.filter(s =>  s.closed_at);

  return (
    <View style={styles.container}>

      {/* ── Segment tabs ──────────────────────────────────────── */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'shifts' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('shifts')}
        >
          <Ionicons
            name="time-outline"
            size={15}
            color={activeTab === 'shifts' ? '#fff' : '#6B7280'}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.segmentText, activeTab === 'shifts' && styles.segmentTextActive]}>
            Shifts
          </Text>
          {openShifts.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{openShifts.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'staff' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('staff')}
        >
          <Ionicons
            name="people-outline"
            size={15}
            color={activeTab === 'staff' ? '#fff' : '#6B7280'}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.segmentText, activeTab === 'staff' && styles.segmentTextActive]}>
            Staff
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{employees.length}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6B4E2E" />}
      >

        {/* ════════════════ STAFF TAB ════════════════ */}
        {activeTab === 'staff' && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Team Members</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setEmpModal(true)}>
                <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {employees.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No team members yet</Text>
                <Text style={styles.emptySubtitle}>Add your first staff member to start tracking shifts.</Text>
              </View>
            ) : (
              employees.map((emp, i) => (
                <View key={emp.id} style={[styles.empCard, i === employees.length - 1 && { marginBottom: 0 }]}>
                  <View style={[styles.empAvatar, { backgroundColor: avatarColor(emp.name) }]}>
                    <Text style={styles.empAvatarText}>{emp.name[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>{emp.name}</Text>
                    <Text style={styles.empMeta}>
                      {shifts.filter(s => s.employee_id === emp.id).length} shift(s) recorded
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteEmployee(emp)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {/* ════════════════ SHIFTS TAB ════════════════ */}
        {activeTab === 'shifts' && (
          <>
            {/* Open shifts */}
            {openShifts.length > 0 && (
              <>
                <Text style={styles.groupLabel}>ACTIVE</Text>
                {openShifts.map(shift => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onClose={() => { setClosingShift(shift); setEndCash(''); setCloseModal(true); }}
                    onEdit={() => openEditModal(shift)}
                  />
                ))}
              </>
            )}

            {/* Closed shifts */}
            {closedShifts.length > 0 && (
              <>
                <Text style={[styles.groupLabel, openShifts.length > 0 && { marginTop: 8 }]}>HISTORY</Text>
                {closedShifts.map(shift => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onEdit={() => openEditModal(shift)}
                  />
                ))}
              </>
            )}

            {shifts.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No shifts yet</Text>
                <Text style={styles.emptySubtitle}>Tap the button below to open the first shift.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── FAB ─────────────────────────────────────────────────── */}
      {activeTab === 'shifts' && (
        <TouchableOpacity
          style={[styles.fab, employees.length === 0 && styles.fabDisabled]}
          onPress={() => employees.length > 0 && setOpenModal(true)}
          disabled={employees.length === 0}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ════════════════ MODALS ════════════════════════════════ */}

      {/* Open shift */}
      <BottomSheet visible={openModal} onClose={() => setOpenModal(false)} title="Open New Shift">
        <Text style={mStyles.fieldLabel}>Assign to</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {employees.map(emp => (
            <TouchableOpacity
              key={emp.id}
              style={[mStyles.empChip, selectedEmployee?.id === emp.id && mStyles.empChipActive]}
              onPress={() => setSelectedEmployee(emp)}
            >
              <View style={[mStyles.chipAvatar, { backgroundColor: avatarColor(emp.name) }]}>
                <Text style={mStyles.chipAvatarText}>{emp.name[0].toUpperCase()}</Text>
              </View>
              <Text style={[mStyles.empChipText, selectedEmployee?.id === emp.id && mStyles.empChipTextActive]}>
                {emp.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ModalField label="Opening Cash ($)" value={startCash} onChangeText={setStartCash} placeholder="0.00" keyboardType="decimal-pad" />
        <ModalField label="Note (optional)" value={shiftNote} onChangeText={setShiftNote} placeholder="Any notes for this shift..." multiline />
        <View style={mStyles.actions}>
          <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setOpenModal(false)}>
            <Text style={mStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[mStyles.primaryBtn, !selectedEmployee && mStyles.primaryBtnDisabled]}
            onPress={handleOpenShift}
            disabled={savingShift || !selectedEmployee}
          >
            {savingShift ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="play" size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={mStyles.primaryText}>Open Shift</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Close shift */}
      <BottomSheet visible={closeModal} onClose={() => setCloseModal(false)} title="Close Shift">
        <View style={mStyles.shiftSummaryRow}>
          <View style={[mStyles.summaryAvatar, { backgroundColor: avatarColor(closingShift?.employees?.name ?? 'X') }]}>
            <Text style={mStyles.summaryAvatarText}>
              {(closingShift?.employees?.name ?? 'X')[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={mStyles.summaryName}>{closingShift?.employees?.name}</Text>
            <Text style={mStyles.summaryMeta}>
              Opened {closingShift ? formatShiftTime(closingShift.opened_at) : ''}
            </Text>
          </View>
        </View>
        <View style={mStyles.summaryInfoRow}>
          <View style={mStyles.summaryInfo}>
            <Text style={mStyles.summaryInfoLabel}>Opening Cash</Text>
            <Text style={mStyles.summaryInfoValue}>${Number(closingShift?.start_cash ?? 0).toFixed(2)}</Text>
          </View>
          <View style={mStyles.summaryInfo}>
            <Text style={mStyles.summaryInfoLabel}>Duration</Text>
            <Text style={mStyles.summaryInfoValue}>
              {closingShift ? shiftDuration(closingShift.opened_at, null) : '—'}
            </Text>
          </View>
        </View>
        <ModalField label="Closing Cash ($)" value={endCash} onChangeText={setEndCash} placeholder="0.00" keyboardType="decimal-pad" />
        <View style={mStyles.actions}>
          <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setCloseModal(false)}>
            <Text style={mStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[mStyles.primaryBtn, { backgroundColor: '#EF4444' }]}
            onPress={handleCloseShift}
            disabled={savingShift}
          >
            {savingShift ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="stop" size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={mStyles.primaryText}>Close Shift</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Edit shift */}
      <BottomSheet visible={editModal} onClose={() => setEditModal(false)} title="Edit Shift">
        <Text style={mStyles.fieldLabel}>Employee</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {employees.map(emp => (
            <TouchableOpacity
              key={emp.id}
              style={[mStyles.empChip, editEmployee?.id === emp.id && mStyles.empChipActive]}
              onPress={() => setEditEmployee(emp)}
            >
              <View style={[mStyles.chipAvatar, { backgroundColor: avatarColor(emp.name) }]}>
                <Text style={mStyles.chipAvatarText}>{emp.name[0].toUpperCase()}</Text>
              </View>
              <Text style={[mStyles.empChipText, editEmployee?.id === emp.id && mStyles.empChipTextActive]}>
                {emp.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={mStyles.twoCol}>
          <View style={{ flex: 1 }}>
            <ModalField label="Opening Cash ($)" value={editStartCash} onChangeText={setEditStartCash} placeholder="0.00" keyboardType="decimal-pad" />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <ModalField label="Closing Cash ($)" value={editEndCash} onChangeText={setEditEndCash} placeholder="0.00" keyboardType="decimal-pad" />
          </View>
        </View>
        <ModalField label="Note (optional)" value={editNote} onChangeText={setEditNote} placeholder="Shift notes..." multiline />

        {/* Re-open toggle for closed shifts */}
        {editingShift && !!editingShift.closed_at && (
          <TouchableOpacity
            style={[mStyles.toggleRow, editReopenShift && mStyles.toggleRowActive]}
            onPress={() => setEditReopenShift(v => !v)}
          >
            <Ionicons
              name={editReopenShift ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={editReopenShift ? '#10B981' : '#9CA3AF'}
              style={{ marginRight: 8 }}
            />
            <Text style={[mStyles.toggleText, editReopenShift && mStyles.toggleTextActive]}>
              Re-open this shift (clear closing time)
            </Text>
          </TouchableOpacity>
        )}

        <View style={mStyles.actions}>
          <TouchableOpacity style={mStyles.cancelBtn} onPress={() => setEditModal(false)}>
            <Text style={mStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={mStyles.primaryBtn} onPress={handleSaveEdit} disabled={savingShift}>
            {savingShift ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={mStyles.primaryText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* Add employee */}
      <BottomSheet visible={empModal} onClose={() => { setEmpModal(false); setNewEmpName(''); }} title="Add Team Member">
        <ModalField label="Full Name" value={newEmpName} onChangeText={setNewEmpName} placeholder="e.g. Maria Lopez" />
        <View style={mStyles.actions}>
          <TouchableOpacity style={mStyles.cancelBtn} onPress={() => { setEmpModal(false); setNewEmpName(''); }}>
            <Text style={mStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[mStyles.primaryBtn, !newEmpName.trim() && mStyles.primaryBtnDisabled]}
            onPress={handleAddEmployee}
            disabled={savingEmp || !newEmpName.trim()}
          >
            {savingEmp ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="person-add" size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={mStyles.primaryText}>Add Member</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}

// ── Shift Card ────────────────────────────────────────────────────
function ShiftCard({
  shift,
  onClose,
  onEdit,
}: {
  shift: Shift;
  onClose?: () => void;
  onEdit: () => void;
}) {
  const isOpen = !shift.closed_at;
  const diff   = shift.end_cash != null ? shift.end_cash - shift.start_cash : null;
  const name   = shift.employees?.name ?? 'Unknown';

  return (
    <View style={[cardStyles.card, isOpen && cardStyles.cardOpen]}>
      {/* Header row */}
      <View style={cardStyles.header}>
        <View style={[cardStyles.avatar, { backgroundColor: avatarColor(name) }]}>
          <Text style={cardStyles.avatarText}>{name[0].toUpperCase()}</Text>
        </View>
        <View style={cardStyles.headerInfo}>
          <Text style={cardStyles.name}>{name}</Text>
          <View style={cardStyles.metaRow}>
            <Ionicons name="time-outline" size={12} color="#9CA3AF" style={{ marginRight: 3 }} />
            <Text style={cardStyles.meta}>{formatShiftTime(shift.opened_at)}</Text>
            {shift.closed_at && (
              <>
                <Text style={cardStyles.metaSep}>·</Text>
                <Ionicons name="hourglass-outline" size={12} color="#9CA3AF" style={{ marginRight: 3 }} />
                <Text style={cardStyles.meta}>{shiftDuration(shift.opened_at, shift.closed_at)}</Text>
              </>
            )}
          </View>
        </View>
        <View style={[cardStyles.statusPill, isOpen ? cardStyles.statusOpen : cardStyles.statusClosed]}>
          <View style={[cardStyles.statusDot, { backgroundColor: isOpen ? '#10B981' : '#9CA3AF' }]} />
          <Text style={[cardStyles.statusText, { color: isOpen ? '#065F46' : '#6B7280' }]}>
            {isOpen ? 'Active' : 'Closed'}
          </Text>
        </View>
      </View>

      {/* Cash row */}
      <View style={cardStyles.cashRow}>
        <View style={cardStyles.cashBox}>
          <Text style={cardStyles.cashLabel}>Opening</Text>
          <Text style={cardStyles.cashValue}>${Number(shift.start_cash).toFixed(2)}</Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color="#D1D5DB" />
        <View style={cardStyles.cashBox}>
          <Text style={cardStyles.cashLabel}>Closing</Text>
          <Text style={cardStyles.cashValue}>
            {shift.end_cash != null ? `$${Number(shift.end_cash).toFixed(2)}` : '—'}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={14} color="#D1D5DB" />
        <View style={cardStyles.cashBox}>
          <Text style={cardStyles.cashLabel}>Difference</Text>
          <Text style={[
            cardStyles.cashValue,
            diff != null && (diff >= 0 ? cardStyles.diffPos : cardStyles.diffNeg),
          ]}>
            {diff != null ? `${diff >= 0 ? '+' : ''}$${diff.toFixed(2)}` : '—'}
          </Text>
        </View>
      </View>

      {shift.note ? (
        <View style={cardStyles.noteRow}>
          <Ionicons name="document-text-outline" size={13} color="#9CA3AF" style={{ marginRight: 5 }} />
          <Text style={cardStyles.noteText}>{shift.note}</Text>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={cardStyles.actions}>
        <TouchableOpacity style={cardStyles.editBtn} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={14} color="#6B4E2E" style={{ marginRight: 5 }} />
          <Text style={cardStyles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        {isOpen && onClose && (
          <TouchableOpacity style={cardStyles.closeBtn} onPress={onClose}>
            <Ionicons name="stop-circle-outline" size={14} color="#EF4444" style={{ marginRight: 5 }} />
            <Text style={cardStyles.closeBtnText}>Close Shift</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Bottom Sheet wrapper ──────────────────────────────────────────
function BottomSheet({
  visible, onClose, title, children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={bsStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={bsStyles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={bsStyles.sheet}>
          {/* Handle */}
          <View style={bsStyles.handle} />
          {/* Title row */}
          <View style={bsStyles.titleRow}>
            <Text style={bsStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={bsStyles.closeIcon}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content:   { padding: 16, paddingBottom: 100 },

  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  segmentBtnActive: { backgroundColor: '#6B4E2E' },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  segmentTextActive: { color: '#fff' },
  badge: {
    marginLeft: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6B4E2E', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },

  empCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  empAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  empAvatarText: { fontWeight: '700', color: '#fff', fontSize: 17 },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  empMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  deleteBtn: { padding: 6 },

  emptyState: { alignItems: 'center', paddingTop: 48, paddingBottom: 24, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 4 },
  emptySubtitle: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', maxWidth: 240, lineHeight: 18 },

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
  fabDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardOpen: {
    borderColor: '#A7F3D0',
    shadowColor: '#10B981',
    shadowOpacity: 0.1,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
  meta: { fontSize: 11, color: '#9CA3AF' },
  metaSep: { fontSize: 11, color: '#D1D5DB', marginHorizontal: 4 },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusOpen:   { backgroundColor: '#ECFDF5' },
  statusClosed: { backgroundColor: '#F9FAFB' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 12, fontWeight: '600' },

  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  cashBox: { flex: 1, alignItems: 'center' },
  cashLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  cashValue: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  diffPos: { color: '#10B981' },
  diffNeg: { color: '#EF4444' },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  noteText: { flex: 1, fontSize: 12, color: '#6B7280', fontStyle: 'italic', lineHeight: 17 },

  actions: { flexDirection: 'row', gap: 8 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
  },
  editBtnText: { fontSize: 13, fontWeight: '600', color: '#6B4E2E' },
  closeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  closeBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
});

// ── Bottom sheet styles ───────────────────────────────────────────
const bsStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  closeIcon: { padding: 4 },
});

// ── Modal field styles ────────────────────────────────────────────
const mStyles = StyleSheet.create({
  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  fieldInputMulti: { height: 72, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row' },

  empChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    paddingVertical: 6,
    paddingLeft: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  empChipActive: { backgroundColor: '#6B4E2E', borderColor: '#6B4E2E' },
  chipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 7,
  },
  chipAvatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  empChipText: { color: '#374151', fontWeight: '500', fontSize: 14 },
  empChipTextActive: { color: '#fff', fontWeight: '600' },

  shiftSummaryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  summaryAvatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  summaryName: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  summaryMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  summaryInfoRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  summaryInfo: { flex: 1, alignItems: 'center' },
  summaryInfoLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 3 },
  summaryInfoValue: { fontSize: 16, fontWeight: '700', color: '#1F2937' },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  toggleRowActive: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  toggleText: { flex: 1, fontSize: 13, color: '#6B7280', fontWeight: '500' },
  toggleTextActive: { color: '#065F46' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  primaryBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6B4E2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#D1D5DB' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
