import { supabase } from './supabase';
import { PurchaseOrder } from '../types';

export interface PurchaseOrderLine {
  productId: string;
  productName: string;
  currentStock: number;
  quantity: number;
  unitCost: number;
}

export async function getPurchaseOrders(cafeId: string): Promise<PurchaseOrder[]> {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, purchase_order_items(*)')
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function savePurchaseOrder(params: {
  cafeId: string;
  supplier: string;
  note?: string;
  lines: PurchaseOrderLine[];
}): Promise<PurchaseOrder> {
  const totalCost = params.lines.reduce(
    (sum, l) => sum + l.quantity * l.unitCost,
    0
  );

  // 1. Create purchase order record
  const { data: order, error: orderError } = await supabase
    .from('purchase_orders')
    .insert({
      cafe_id: params.cafeId,
      supplier: params.supplier,
      note: params.note || null,
      total_cost: totalCost,
    })
    .select()
    .single();
  if (orderError) throw orderError;

  // 2. Insert line items
  const { error: itemsError } = await supabase.from('purchase_order_items').insert(
    params.lines.map((l) => ({
      purchase_order_id: order.id,
      product_id: l.productId,
      product_name: l.productName,
      quantity: l.quantity,
      unit_cost: l.unitCost,
    }))
  );
  if (itemsError) throw itemsError;

  // 3. Update stock for each product
  await Promise.all(
    params.lines.map((l) =>
      supabase
        .from('products')
        .update({ stock_quantity: l.currentStock + l.quantity })
        .eq('id', l.productId)
    )
  );

  // 4. Log a single expense transaction for the whole order
  const { error: txError } = await supabase.from('transactions').insert({
    cafe_id: params.cafeId,
    amount: totalCost,
    type: 'expense',
    category: 'Inventory',
    note: `Purchase order — ${params.supplier} (${params.lines.length} item${params.lines.length !== 1 ? 's' : ''})`,
  });
  if (txError) throw txError;

  return order;
}
