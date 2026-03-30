import { supabase } from './supabase';
import { Employee, Shift } from '../types';

// ── Employees ──────────────────────────────────────────────────

export async function getEmployees(cafeId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function addEmployee(cafeId: string, name: string): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({ cafe_id: cafeId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
}

// ── Shifts ─────────────────────────────────────────────────────

export async function getShifts(cafeId: string): Promise<Shift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select('*, employees(name)')
    .eq('cafe_id', cafeId)
    .order('opened_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function openShift(params: {
  cafeId: string;
  employeeId: string;
  startCash: number;
  note?: string;
}): Promise<Shift> {
  const { data, error } = await supabase
    .from('shifts')
    .insert({
      cafe_id: params.cafeId,
      employee_id: params.employeeId,
      start_cash: params.startCash,
      note: params.note ?? null,
    })
    .select('*, employees(name)')
    .single();
  if (error) throw error;
  return data;
}

export async function closeShift(id: string, endCash: number): Promise<Shift> {
  const { data, error } = await supabase
    .from('shifts')
    .update({ end_cash: endCash, closed_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, employees(name)')
    .single();
  if (error) throw error;
  return data;
}

export async function updateShift(
  id: string,
  fields: {
    employeeId?: string;
    startCash?: number;
    endCash?: number | null;
    note?: string | null;
    closedAt?: string | null;
  }
): Promise<Shift> {
  const payload: Record<string, unknown> = {};
  if (fields.employeeId !== undefined) payload.employee_id = fields.employeeId;
  if (fields.startCash  !== undefined) payload.start_cash  = fields.startCash;
  if (fields.endCash    !== undefined) payload.end_cash    = fields.endCash;
  if (fields.note       !== undefined) payload.note        = fields.note;
  if (fields.closedAt   !== undefined) payload.closed_at   = fields.closedAt;

  const { data, error } = await supabase
    .from('shifts')
    .update(payload)
    .eq('id', id)
    .select('*, employees(name)')
    .single();
  if (error) throw error;
  return data;
}
