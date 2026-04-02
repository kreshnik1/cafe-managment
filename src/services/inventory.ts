import { supabase } from './supabase';
import { Product, ProductCategory } from '../types';

export async function getProducts(cafeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('cafe_id', cafeId)
    .order('category')
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function addProduct(params: {
  cafeId: string;
  name: string;
  category: ProductCategory;
  price: number;
  stockQuantity?: number;
}): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      cafe_id: params.cafeId,
      name: params.name,
      category: params.category,
      price: params.price,
      stock_quantity: params.stockQuantity ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(
  id: string,
  updates: Partial<Pick<Product, 'name' | 'category' | 'price' | 'is_available' | 'stock_quantity'>>
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleProductAvailability(
  id: string,
  isAvailable: boolean
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({ is_available: isAvailable })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Log a purchase as an Inventory expense without changing stock.
 * Used when the stock has already been set directly (e.g. on product creation).
 */
export async function logInventoryExpense(params: {
  cafeId: string;
  productName: string;
  quantity: number;
  totalCost: number;
}): Promise<void> {
  const { error } = await supabase.from('transactions').insert({
    cafe_id: params.cafeId,
    amount: params.totalCost,
    type: 'expense',
    category: 'Inventory',
    note: `Purchased: ${params.productName} ×${params.quantity}`,
  });
  if (error) throw error;
}

/**
 * Restock a product:
 * - Increases stock_quantity by `quantity`
 * - Creates an expense transaction for the total purchase cost
 */
export async function restockProduct(params: {
  productId: string;
  productName: string;
  cafeId: string;
  currentStock: number;
  quantity: number;
  totalCost: number;
}): Promise<Product> {
  const newStock = params.currentStock + params.quantity;

  // Update stock
  const { data: updated, error: stockError } = await supabase
    .from('products')
    .update({ stock_quantity: newStock })
    .eq('id', params.productId)
    .select()
    .single();
  if (stockError) throw stockError;

  // Record expense
  const { error: txError } = await supabase.from('transactions').insert({
    cafe_id: params.cafeId,
    amount: params.totalCost,
    type: 'expense',
    category: 'Inventory',
    note: `Restocked: ${params.productName} ×${params.quantity}`,
  });
  if (txError) throw txError;

  return updated;
}

/**
 * Decrease stock when order items are fulfilled.
 * Silently skips products with no stock tracking (stock_quantity stays >= 0).
 */
export async function decrementStock(
  items: { productId: string; quantity: number; currentStock: number }[]
): Promise<void> {
  await Promise.all(
    items.map(({ productId, quantity, currentStock }) => {
      const newStock = Math.max(0, currentStock - quantity);
      return supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);
    })
  );
}
