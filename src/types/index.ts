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

export type ProductCategory = 'drink' | 'food';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed';

export interface Product {
  id: string;
  cafe_id: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock_quantity: number;
  is_available: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products?: { name: string; category: ProductCategory };
}

export interface Order {
  id: string;
  cafe_id: string;
  table_number: string | null;
  status: OrderStatus;
  is_paid: boolean;
  total_amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface DailySummary {
  cafe_id: string;
  day: string;
  total_income: number;
  total_expenses: number;
  profit: number;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  cafe_id: string;
  supplier: string;
  note: string | null;
  total_cost: number;
  created_at: string;
  purchase_order_items?: PurchaseOrderItem[];
}
