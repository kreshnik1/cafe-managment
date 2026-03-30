import { supabase } from './supabase';
import { Transaction, TransactionType } from '../types';

export async function getTransactions(cafeId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addTransaction(params: {
  cafeId: string;
  amount: number;
  type: TransactionType;
  category: string;
  note?: string;
  date?: Date; // optional — defaults to now
}): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      cafe_id: params.cafeId,
      amount: params.amount,
      type: params.type,
      category: params.category,
      note: params.note ?? null,
      created_at: params.date ? params.date.toISOString() : new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function getDashboardTotals(cafeId: string) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('cafe_id', cafeId)
    .gte('created_at', start)
    .lt('created_at', end);

  if (error) throw error;

  const rows = data ?? [];
  const totalIncome = rows
    .filter((r) => r.type === 'income')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpenses = rows
    .filter((r) => r.type === 'expense')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    totalIncome,
    totalExpenses,
    profit: totalIncome - totalExpenses,
    cashBalance: totalIncome - totalExpenses,
  };
}

// ── Statistics queries ────────────────────────────────────────────

export interface PeriodRow {
  key: string;      // "2026-03-30" | "2026-03" | "2026"
  label: string;    // human-readable
  total_income: number;
  total_expenses: number;
  profit: number;
}

function groupRows(
  rows: { amount: string | number; type: string; created_at: string }[],
  keyFn: (iso: string) => string,
  labelFn: (key: string) => string
): PeriodRow[] {
  const grouped: Record<string, { total_income: number; total_expenses: number }> = {};

  for (const row of rows) {
    const key = keyFn(row.created_at);
    if (!grouped[key]) grouped[key] = { total_income: 0, total_expenses: 0 };
    if (row.type === 'income') {
      grouped[key].total_income += Number(row.amount);
    } else {
      grouped[key].total_expenses += Number(row.amount);
    }
  }

  return Object.entries(grouped)
    .map(([key, s]) => ({
      key,
      label: labelFn(key),
      total_income: s.total_income,
      total_expenses: s.total_expenses,
      profit: s.total_income - s.total_expenses,
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export async function getStatistics(
  cafeId: string,
  mode: 'daily' | 'monthly' | 'yearly' | 'custom',
  from?: Date,
  to?: Date
): Promise<PeriodRow[]> {
  let query = supabase
    .from('transactions')
    .select('amount, type, created_at')
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false });

  if (mode === 'daily') {
    // Last 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    query = query.gte('created_at', cutoff.toISOString());
  } else if (mode === 'monthly') {
    // Current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
    query = query.gte('created_at', yearStart);
  } else if (mode === 'custom' && from && to) {
    const toEnd = new Date(to);
    toEnd.setDate(toEnd.getDate() + 1);
    query = query
      .gte('created_at', from.toISOString())
      .lt('created_at', toEnd.toISOString());
  }
  // yearly: no date filter — fetch all

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  if (mode === 'daily' || mode === 'custom') {
    return groupRows(
      rows,
      (iso) => iso.slice(0, 10),
      (key) => {
        const d = new Date(key + 'T00:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }
    );
  }

  if (mode === 'monthly') {
    return groupRows(
      rows,
      (iso) => iso.slice(0, 7),
      (key) => {
        const [year, month] = key.split('-');
        return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
      }
    );
  }

  // yearly
  return groupRows(
    rows,
    (iso) => iso.slice(0, 4),
    (key) => key
  );
}
