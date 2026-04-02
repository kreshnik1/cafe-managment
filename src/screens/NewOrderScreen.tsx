import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  SectionList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { getProducts, decrementStock } from '../services/inventory';
import { createOrder } from '../services/orders';
import { Product, ProductCategory } from '../types';

interface CartItem {
  product: Product;
  quantity: number;
}

function ProductTile({
  item,
  qty,
  onAdd,
  onRemove,
}: {
  item: Product;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const { fmt } = useSettings();
  const isFood = item.category === 'food';
  return (
    <View style={[tileStyles.tile, !item.is_available && tileStyles.tileUnavailable]}>
      <View style={[tileStyles.icon, isFood ? tileStyles.iconFood : tileStyles.iconDrink]}>
        <Ionicons
          name={isFood ? 'fast-food-outline' : 'cafe-outline'}
          size={20}
          color={isFood ? '#D97706' : '#3B82F6'}
        />
      </View>
      <Text style={tileStyles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={tileStyles.price}>{fmt(Number(item.price))}</Text>
      {!item.is_available ? (
        <Text style={tileStyles.unavailable}>Unavailable</Text>
      ) : qty > 0 ? (
        <View style={tileStyles.qtyRow}>
          <TouchableOpacity style={tileStyles.qtyBtn} onPress={onRemove}>
            <Ionicons name="remove" size={16} color="#6B4E2E" />
          </TouchableOpacity>
          <Text style={tileStyles.qtyNum}>{qty}</Text>
          <TouchableOpacity style={tileStyles.qtyBtn} onPress={onAdd}>
            <Ionicons name="add" size={16} color="#6B4E2E" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={tileStyles.addBtn} onPress={onAdd}>
          <Ionicons name="add" size={18} color="#6B4E2E" />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function NewOrderScreen() {
  const navigation = useNavigation<any>();
  const { cafe } = useAuth();
  const { fmt } = useSettings();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [tableNumber, setTableNumber] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!cafe) return;
    getProducts(cafe.id)
      .then(setProducts)
      .catch((e) => Alert.alert('Error', e.message))
      .finally(() => setLoading(false));
  }, [cafe]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: { product, quantity: (existing?.quantity ?? 0) + 1 },
      };
    });
  }

  function removeFromCart(productId: string) {
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing || existing.quantity <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: { ...existing, quantity: existing.quantity - 1 } };
    });
  }

  const cartItems = Object.values(cart);
  const totalAmount = cartItems.reduce(
    (sum, ci) => sum + ci.quantity * Number(ci.product.price),
    0
  );

  async function handleSubmit() {
    if (cartItems.length === 0) {
      Alert.alert('Empty order', 'Add at least one item.');
      return;
    }
    if (!cafe) return;
    setSubmitting(true);
    try {
      await createOrder({
        cafeId: cafe.id,
        tableNumber: tableNumber.trim() || undefined,
        note: note.trim() || undefined,
        items: cartItems.map((ci) => ({
          productId: ci.product.id,
          quantity: ci.quantity,
          unitPrice: Number(ci.product.price),
        })),
      });
      // Decrement stock for each ordered item
      await decrementStock(
        cartItems.map((ci) => ({
          productId: ci.product.id,
          quantity: ci.quantity,
          currentStock: ci.product.stock_quantity,
        }))
      );
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Group products into sections
  const drinks = products.filter((p) => p.category === 'drink');
  const food = products.filter((p) => p.category === 'food');
  const sections = [
    ...(drinks.length > 0 ? [{ title: 'Drinks', data: drinks }] : []),
    ...(food.length > 0 ? [{ title: 'Food', data: food }] : []),
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6B4E2E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ProductTile
            item={item}
            qty={cart[item.id]?.quantity ?? 0}
            onAdd={() => addToCart(item)}
            onRemove={() => removeFromCart(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.formSection}>
            <View style={styles.inputRow}>
              <Ionicons name="location-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="Table number (optional)"
                placeholderTextColor="#9CA3AF"
                value={tableNumber}
                onChangeText={setTableNumber}
                keyboardType="number-pad"
              />
            </View>
            <View style={[styles.inputRow, { marginTop: 10 }]}>
              <Ionicons name="document-text-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.input}
                placeholder="Note (optional)"
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No products in inventory.</Text>
            <Text style={styles.emptySub}>Add products in the Inventory tab first.</Text>
          </View>
        }
      />

      {/* ── Cart summary & submit ─────────────────────────── */}
      {cartItems.length > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartCount}>
              {cartItems.reduce((s, ci) => s + ci.quantity, 0)} items
            </Text>
            <Text style={styles.cartTotal}>{fmt(totalAmount)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.placeBtn, submitting && styles.placeBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.placeBtnText}>Place Order</Text>
                <Ionicons name="checkmark" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 120 },
  formSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, fontSize: 14, color: '#1F2937' },
  sectionHeader: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },
  emptySub: { fontSize: 13, color: '#D1D5DB', textAlign: 'center', paddingHorizontal: 32 },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  cartCount: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  cartTotal: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 2 },
  placeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B4E2E',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#6B4E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  placeBtnDisabled: { opacity: 0.6 },
  placeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const tileStyles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tileUnavailable: { opacity: 0.45 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconDrink: { backgroundColor: '#EFF6FF' },
  iconFood: { backgroundColor: '#FFFBEB' },
  name: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1F2937' },
  price: { fontSize: 14, fontWeight: '700', color: '#6B4E2E', marginRight: 12 },
  unavailable: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FDF8F5',
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyNum: { fontSize: 15, fontWeight: '700', color: '#1F2937', minWidth: 18, textAlign: 'center' },
});
