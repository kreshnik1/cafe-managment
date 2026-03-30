export type TransactionType = 'income' | 'expense';

export interface Cafe {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Employee {
  id: string;
  cafe_id: string;
  name: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  cafe_id: string;
  amount: number;
  type: TransactionType;
  category: string;
  note: string | null;
  created_at: string;
}

export interface Shift {
  id: string;
  cafe_id: string;
  employee_id: string;
  start_cash: number;
  end_cash: number | null;
  opened_at: string;
  closed_at: string | null;
  note: string | null;
  employees?: { name: string };
}

export interface DailySummary {
  cafe_id: string;
  day: string;
  total_income: number;
  total_expenses: number;
  profit: number;
}
