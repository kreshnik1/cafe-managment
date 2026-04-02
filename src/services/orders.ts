import { supabase } from './supabase';
import { Order, OrderItem, OrderStatus } from '../types';

export async function getOrders(cafeId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id, order_id, product_id, quantity, unit_price,
        products ( name, category )
      )
    `)
    .eq('cafe_id', cafeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createOrder(params: {
  cafeId: string;
  tableNumber?: string;
  note?: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
}): Promise<Order> {
  const totalAmount = params.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      cafe_id: params.cafeId,
      table_number: params.tableNumber ?? null,
      note: params.note ?? null,
      total_amount: totalAmount,
    })
    .select()
    .single();
  if (orderError) throw orderError;

  const itemRows = params.items.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(itemRows);
  if (itemsError) throw itemsError;

  return order;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export async function markOrderPaid(orderId: string, isPaid: boolean): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ is_paid: isPaid, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export async function deleteOrder(orderId: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) throw error;
}
