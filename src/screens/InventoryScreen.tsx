import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  toggleProductAvailability,
  restockProduct,
  logInventoryExpense,
} from '../services/inventory';
import { savePurchaseOrder, PurchaseOrderLine } from '../services/purchaseOrders';
import { Product, ProductCategory } from '../types';

// ── Product card ─────────────────────────────────────────────────
function ProductRow({
  item,
  onToggle,
  onEdit,
  onDelete,
  onRestock,
}: {
  item: Product;
  onToggle: (id: string, val: boolean) => void;
  onEdit: (item: Product) => void;
  onDelete: (id: string) => void;
  onRestock: (item: Product) => void;
}) {
  const { t, fmt } = useSettings();
  const isFood = item.category === 'food';
  const lowStock = item.stock_quantity <= 5;

  return (
    <View style={rowStyles.card}>
      {/* Top row: icon · name · price · toggle */}
      <View style={rowStyles.topRow}>
        <View style={[rowStyles.icon, isFood ? rowStyles.iconFood : rowStyles.iconDrink]}>
          <Ionicons
            name={isFood ? 'fast-food-outline' : 'cafe-outline'}
            size={20}
            color={isFood ? '#D97706' : '#3B82F6'}
          />
        </View>
        <Text style={rowStyles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={rowStyles.price}>{fmt(Number(item.price))}</Text>
        <Switch
          value={item.is_available}
          onValueChange={(val) => onToggle(item.id, val)}
          trackColor={{ true: '#6B4E2E', false: '#E5E7EB' }}
          thumbColor="#fff"
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
      </View>

      {/* Meta row: category badge · stock badge */}
      <View style={rowStyles.metaRow}>
        <View style={rowStyles.catBadge}>
          <Text style={rowStyles.catText}>{item.category}</Text>
        </View>
        <View style={[rowStyles.stockBadge, lowStock ? rowStyles.stockLow : rowStyles.stockOk]}>
          <Ionicons
            name="layers-outline"
            size={10}
            color={lowStock ? '#DC2626' : '#059669'}
            style={{ marginRight: 3 }}
          />
          <Text style={[rowStyles.stockText, { color: lowStock ? '#DC2626' : '#059669' }]}>
            {item.stock_quantity} in stock
          </Text>
        </View>
        {!item.is_available && (
          <View style={rowStyles.unavailBadge}>
            <Text style={rowStyles.unavailText}>Unavailable</Text>
          </View>
        )}
      </View>

      {/* Action row: restock · spacer · edit · delete */}
      <View style={rowStyles.actionsRow}>
        <TouchableOpacity style={rowStyles.restockBtn} onPress={() => onRestock(item)}>
          <Ionicons name="add-circle-outline" size={14} color="#6B4E2E" style={{ marginRight: 4 }} />
          <Text style={rowStyles.restockBtnText}>{t('inventoryRestock')}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={rowStyles.actionBtn} onPress={() => onEdit(item)}>
          <Ionicons name="pencil-outline" size={15} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[rowStyles.actionBtn, { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' }]}
          onPress={() => onDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={15} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────
function ProductModal({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: Product | null;
  onClose: () => void;
  onSave: (
    name: string,
    category: ProductCategory,
    price: string,
    stockQuantity: string,
    purchaseCost: string
  ) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('drink');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setCategory(initial?.category ?? 'drink');
      setPrice(initial ? String(initial.price) : '');
      setStock(initial ? String(initial.stock_quantity) : '0');
      setPurchaseCost('');
    }
  }, [visible, initial]);

  async function handleSave() {
    if (!name.trim()) { Alert.alert('Error', 'Name is required.'); return; }
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) { Alert.alert('Error', 'Enter a valid selling price.'); return; }
    const s = parseInt(stock, 10);
    if (isNaN(s) || s < 0) { Alert.alert('Error', 'Enter a valid stock quantity.'); return; }
    if (!initial && purchaseCost !== '') {
      const c = parseFloat(purchaseCost);
      if (isNaN(c) || c < 0) { Alert.alert('Error', 'Enter a valid purchase cost.'); return; }
    }
    setSaving(true);
    try {
      await onSave(name.trim(), category, price, stock, purchaseCost);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView style={modalStyles.root} keyboardShouldPersistTaps="handled">
        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>{initial ? 'Edit Product' : 'Add Product'}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        <View style={modalStyles.field}>
          <Text style={modalStyles.label}>Name</Text>
          <TextInput
            style={modalStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Espresso"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={modalStyles.field}>
          <Text style={modalStyles.label}>Category</Text>
          <View style={modalStyles.segRow}>
            {(['drink', 'food'] as ProductCategory[]).map((c) => (
              <TouchableOpacity
                key={c}
                style={[modalStyles.seg, category === c && modalStyles.segActive]}
                onPress={() => setCategory(c)}
              >
                <Ionicons
                  name={c === 'food' ? 'fast-food-outline' : 'cafe-outline'}
                  size={16}
                  color={category === c ? '#fff' : '#6B7280'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[modalStyles.segText, category === c && modalStyles.segTextActive]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={modalStyles.field}>
          <Text style={modalStyles.label}>Selling Price ($)</Text>
          <TextInput
            style={modalStyles.input}
            value={price}
            onChangeText={setPrice}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
        </View>

        <View style={modalStyles.field}>
          <Text style={modalStyles.label}>
            {initial ? 'Stock Quantity' : 'Initial Stock Quantity'}
          </Text>
          <TextInput
            style={modalStyles.input}
            value={stock}
            onChangeText={setStock}
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />
          {initial && (
            <Text style={modalStyles.hint}>
              Use the restock button to add purchases and log expenses.
            </Text>
          )}
        </View>

        {!initial && (
          <View style={modalStyles.field}>
            <Text style={modalStyles.label}>Purchase Cost ($) <Text style={modalStyles.labelOptional}>— optional</Text></Text>
            <TextInput
              style={modalStyles.input}
              value={purchaseCost}
              onChangeText={setPurchaseCost}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
            <Text style={modalStyles.hint}>
              Total amount you paid for the initial stock. Will be logged as an Inventory expense.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[modalStyles.saveBtn, saving && modalStyles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={modalStyles.saveBtnText}>{initial ? 'Save Changes' : 'Add Product'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

// ── Restock Modal ─────────────────────────────────────────────────
function RestockModal({
  visible,
  product,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onConfirm: (quantity: number, totalCost: number) => Promise<void>;
}) {
  const { fmt } = useSettings();
  const [quantity, setQuantity] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) { setQuantity(''); setTotalCost(''); }
  }, [visible]);

  async function handleConfirm() {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) { Alert.alert('Error', 'Enter a valid quantity.'); return; }
    const cost = parseFloat(totalCost);
    if (isNaN(cost) || cost < 0) { Alert.alert('Error', 'Enter a valid purchase cost.'); return; }
    setSaving(true);
    try {
      await onConfirm(qty, cost);
    } finally {
      setSaving(false);
    }
  }

  if (!product) return null;

  const qty = parseInt(quantity, 10);
  const cost = parseFloat(totalCost);
  const unitCost = !isNaN(qty) && qty > 0 && !isNaN(cost) ? cost / qty : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={restockStyles.root}>
        <View style={restockStyles.header}>
          <View>
            <Text style={restockStyles.title}>Restock</Text>
            <Text style={restockStyles.subtitle}>{product.name}</Text>
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Current stock info */}
        <View style={restockStyles.currentCard}>
          <Ionicons name="layers-outline" size={18} color="#6B7280" />
          <Text style={restockStyles.currentLabel}>Current stock</Text>
          <Text style={restockStyles.currentValue}>{product.stock_quantity} units</Text>
        </View>

        <View style={restockStyles.field}>
          <Text style={restockStyles.label}>Quantity received</Text>
          <TextInput
            style={restockStyles.input}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="e.g. 24"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
          />
        </View>

        <View style={restockStyles.field}>
          <Text style={restockStyles.label}>Total purchase cost ($)</Text>
          <TextInput
            style={restockStyles.input}
            value={totalCost}
            onChangeText={setTotalCost}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
          <Text style={restockStyles.hint}>
            This amount will be logged as an Inventory expense.
          </Text>
        </View>

        {/* Preview */}
        {unitCost !== null && (
          <View style={restockStyles.preview}>
            <View style={restockStyles.previewRow}>
              <Text style={restockStyles.previewLbl}>New stock</Text>
              <Text style={restockStyles.previewVal}>
                {product.stock_quantity} + {qty} = {product.stock_quantity + qty} units
              </Text>
            </View>
            <View style={restockStyles.previewRow}>
              <Text style={restockStyles.previewLbl}>Cost per unit</Text>
              <Text style={restockStyles.previewVal}>{fmt(unitCost)}</Text>
            </View>
            <View style={[restockStyles.previewRow, { marginBottom: 0 }]}>
              <Text style={restockStyles.previewLbl}>Expense logged</Text>
              <Text style={[restockStyles.previewVal, { color: '#DC2626' }]}>
                −{fmt(cost)}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[restockStyles.confirmBtn, saving && restockStyles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={restockStyles.confirmBtnText}>Confirm Restock</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Purchase Order Modal ──────────────────────────────────────────
interface ExistingLine {
  product: Product;
  qty: string;
  unitCost: string;
}

interface NewProductLine {
  key: string;
  name: string;
  category: ProductCategory;
  price: string;
  qty: string;
  unitCost: string;
}

export interface NewProductOrderLine {
  name: string;
  category: ProductCategory;
  price: number;
  quantity: number;
  unitCost: number;
}

function PurchaseOrderModal({
  visible,
  products,
  onClose,
  onSave,
}: {
  visible: boolean;
  products: Product[];
  onClose: () => void;
  onSave: (
    supplier: string,
    note: string,
    existingLines: PurchaseOrderLine[],
    newProductLines: NewProductOrderLine[]
  ) => Promise<void>;
}) {
  const { fmt } = useSettings();
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');
  const [existingLines, setExistingLines] = useState<ExistingLine[]>([]);
  const [newLines, setNewLines] = useState<NewProductLine[]>([]);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const cardYRef = useRef<Record<string, number>>({});

  React.useEffect(() => {
    if (visible) {
      setSupplier('');
      setNote('');
      setExistingLines(products.map((p) => ({ product: p, qty: '', unitCost: '' })));
      setNewLines([]);
    }
  }, [visible, products]);

  function updateExisting(idx: number, field: 'qty' | 'unitCost', value: string) {
    setExistingLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  function addNewLine() {
    setNewLines((prev) => [
      ...prev,
      { key: String(Date.now()), name: '', category: 'drink', price: '', qty: '', unitCost: '' },
    ]);
    // Scroll to bottom after the new card renders
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }

  function removeNewLine(key: string) {
    setNewLines((prev) => prev.filter((l) => l.key !== key));
  }

  function updateNewLine(key: string, field: keyof Omit<NewProductLine, 'key'>, value: string) {
    setNewLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, [field]: value } : l))
    );
  }

  const activeExisting: PurchaseOrderLine[] = existingLines
    .filter((l) => {
      const qty = parseInt(l.qty, 10);
      const cost = parseFloat(l.unitCost);
      return !isNaN(qty) && qty > 0 && !isNaN(cost) && cost >= 0;
    })
    .map((l) => ({
      productId: l.product.id,
      productName: l.product.name,
      currentStock: l.product.stock_quantity,
      quantity: parseInt(l.qty, 10),
      unitCost: parseFloat(l.unitCost),
    }));

  const activeNew: NewProductOrderLine[] = newLines
    .filter((l) => {
      const qty = parseInt(l.qty, 10);
      const cost = parseFloat(l.unitCost);
      const price = parseFloat(l.price);
      return l.name.trim() !== '' && !isNaN(qty) && qty > 0 && !isNaN(cost) && cost >= 0 && !isNaN(price) && price >= 0;
    })
    .map((l) => ({
      name: l.name.trim(),
      category: l.category,
      price: parseFloat(l.price),
      quantity: parseInt(l.qty, 10),
      unitCost: parseFloat(l.unitCost),
    }));

  const totalActiveCount = activeExisting.length + activeNew.length;
  const total =
    activeExisting.reduce((s, l) => s + l.quantity * l.unitCost, 0) +
    activeNew.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  async function handleSave() {
    if (!supplier.trim()) { Alert.alert('Supplier required', 'Enter the supplier / company name.'); return; }
    if (totalActiveCount === 0) {
      Alert.alert('No items', 'Enter quantity and cost for at least one product.');
      return;
    }
    setSaving(true);
    try {
      await onSave(supplier.trim(), note.trim(), activeExisting, activeNew);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={poStyles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        {/* Header */}
        <View style={poStyles.header}>
          <View>
            <Text style={poStyles.title}>New Purchase Order</Text>
            <Text style={poStyles.subtitle}>Record a supplier delivery</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={poStyles.closeBtn}>
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          {/* Supplier */}
          <View style={poStyles.section}>
            <Text style={poStyles.label}>Supplier / Company</Text>
            <View style={poStyles.inputRow}>
              <Ionicons name="business-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={poStyles.input}
                placeholder="e.g. Metro Cash & Carry"
                placeholderTextColor="#9CA3AF"
                value={supplier}
                onChangeText={setSupplier}
              />
            </View>
          </View>

          {/* Note */}
          <View style={poStyles.section}>
            <Text style={poStyles.label}>Note <Text style={poStyles.optional}>— optional</Text></Text>
            <View style={poStyles.inputRow}>
              <Ionicons name="document-text-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={poStyles.input}
                placeholder="Invoice #, delivery note…"
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
              />
            </View>
          </View>

          {/* ── Existing Products ──────────────────────────────── */}
          {existingLines.length > 0 && (
            <>
              <View style={poStyles.colHeader}>
                <Text style={[poStyles.sectionTitle, { flex: 1 }]}>EXISTING PRODUCTS</Text>
                <Text style={[poStyles.colLbl, { width: 64, textAlign: 'center' }]}>QTY</Text>
                <Text style={[poStyles.colLbl, { width: 80, textAlign: 'center' }]}>UNIT $</Text>
              </View>
              <View style={poStyles.linesCard}>
                {existingLines.map((line, idx) => {
                  const qty = parseInt(line.qty, 10);
                  const cost = parseFloat(line.unitCost);
                  const isActive = !isNaN(qty) && qty > 0 && !isNaN(cost) && cost >= 0;
                  const isFood = line.product.category === 'food';
                  return (
                    <View key={line.product.id}>
                      <View style={[poStyles.lineRow, isActive && poStyles.lineRowActive]}>
                        <View style={[poStyles.lineIcon, isFood ? poStyles.lineIconFood : poStyles.lineIconDrink]}>
                          <Ionicons
                            name={isFood ? 'fast-food-outline' : 'cafe-outline'}
                            size={14}
                            color={isFood ? '#D97706' : '#3B82F6'}
                          />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={poStyles.lineName} numberOfLines={1}>{line.product.name}</Text>
                          <Text style={poStyles.lineStock}>stock: {line.product.stock_quantity}</Text>
                        </View>
                        <TextInput
                          style={poStyles.lineInput}
                          placeholder="0"
                          placeholderTextColor="#D1D5DB"
                          value={line.qty}
                          onChangeText={(v) => updateExisting(idx, 'qty', v)}
                          keyboardType="number-pad"
                          returnKeyType="next"
                        />
                        <TextInput
                          style={[poStyles.lineInput, { width: 80 }]}
                          placeholder="0.00"
                          placeholderTextColor="#D1D5DB"
                          value={line.unitCost}
                          onChangeText={(v) => updateExisting(idx, 'unitCost', v)}
                          keyboardType="decimal-pad"
                        />
                      </View>
                      {idx < existingLines.length - 1 && <View style={poStyles.lineDivider} />}
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* ── New Products ───────────────────────────────────── */}
          <View style={poStyles.colHeader}>
            <Text style={[poStyles.sectionTitle, { flex: 1 }]}>NEW PRODUCTS</Text>
          </View>

          {newLines.map((line) => (
            <View
              key={line.key}
              style={poStyles.newProductCard}
              onLayout={(e) => {
                cardYRef.current[line.key] = e.nativeEvent.layout.y;
              }}
            >
              {/* Name + remove */}
              <View style={poStyles.newProductHeader}>
                <TextInput
                  style={[poStyles.inputRow, poStyles.input, { flex: 1 }]}
                  placeholder="Product name"
                  placeholderTextColor="#9CA3AF"
                  value={line.name}
                  onChangeText={(v) => updateNewLine(line.key, 'name', v)}
                  onFocus={() => {
                    const y = cardYRef.current[line.key];
                    if (y !== undefined) scrollRef.current?.scrollTo({ y: y - 20, animated: true });
                  }}
                />
                <TouchableOpacity
                  style={poStyles.removeBtn}
                  onPress={() => removeNewLine(line.key)}
                >
                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Category */}
              <View style={poStyles.newCatRow}>
                {(['drink', 'food'] as ProductCategory[]).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[poStyles.catChip, line.category === c && poStyles.catChipActive]}
                    onPress={() => updateNewLine(line.key, 'category', c)}
                  >
                    <Ionicons
                      name={c === 'food' ? 'fast-food-outline' : 'cafe-outline'}
                      size={13}
                      color={line.category === c ? '#fff' : '#6B7280'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[poStyles.catChipText, line.category === c && poStyles.catChipTextActive]}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Price / Qty / Unit cost row */}
              <View style={poStyles.newFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={poStyles.newFieldLbl}>Selling $</Text>
                  <TextInput
                    style={poStyles.newFieldInput}
                    placeholder="0.00"
                    placeholderTextColor="#D1D5DB"
                    value={line.price}
                    onChangeText={(v) => updateNewLine(line.key, 'price', v)}
                    keyboardType="decimal-pad"
                    onFocus={() => {
                      const y = cardYRef.current[line.key];
                      if (y !== undefined) scrollRef.current?.scrollTo({ y: y - 20, animated: true });
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={poStyles.newFieldLbl}>Qty</Text>
                  <TextInput
                    style={poStyles.newFieldInput}
                    placeholder="0"
                    placeholderTextColor="#D1D5DB"
                    value={line.qty}
                    onChangeText={(v) => updateNewLine(line.key, 'qty', v)}
                    keyboardType="number-pad"
                    onFocus={() => {
                      const y = cardYRef.current[line.key];
                      if (y !== undefined) scrollRef.current?.scrollTo({ y: y - 20, animated: true });
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={poStyles.newFieldLbl}>Unit Cost $</Text>
                  <TextInput
                    style={poStyles.newFieldInput}
                    placeholder="0.00"
                    placeholderTextColor="#D1D5DB"
                    value={line.unitCost}
                    onChangeText={(v) => updateNewLine(line.key, 'unitCost', v)}
                    keyboardType="decimal-pad"
                    onFocus={() => {
                      const y = cardYRef.current[line.key];
                      if (y !== undefined) scrollRef.current?.scrollTo({ y: y - 20, animated: true });
                    }}
                  />
                </View>
              </View>
            </View>
          ))}

          {/* Add new product button */}
          <TouchableOpacity style={poStyles.addNewBtn} onPress={addNewLine}>
            <Ionicons name="add-circle-outline" size={18} color="#6B4E2E" style={{ marginRight: 6 }} />
            <Text style={poStyles.addNewBtnText}>Add New Product</Text>
          </TouchableOpacity>

          {/* Total + summary */}
          {totalActiveCount > 0 && (
            <View style={poStyles.totalCard}>
              <View style={poStyles.totalRow}>
                <Text style={poStyles.totalLbl}>Items ordered</Text>
                <Text style={poStyles.totalVal}>{totalActiveCount} product{totalActiveCount !== 1 ? 's' : ''}</Text>
              </View>
              <View style={poStyles.totalRow}>
                <Text style={poStyles.totalLbl}>Units total</Text>
                <Text style={poStyles.totalVal}>
                  {activeExisting.reduce((s, l) => s + l.quantity, 0) +
                    activeNew.reduce((s, l) => s + l.quantity, 0)}
                </Text>
              </View>
              <View style={[poStyles.totalRow, poStyles.totalRowFinal]}>
                <Text style={poStyles.totalFinalLbl}>Total cost</Text>
                <Text style={poStyles.totalFinalVal}>{fmt(total)}</Text>
              </View>
              <Text style={poStyles.totalHint}>
                Will be logged as an Inventory expense and stock will be updated.
                {activeNew.length > 0 && ` ${activeNew.length} new product${activeNew.length !== 1 ? 's' : ''} will be added to inventory.`}
              </Text>
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Save button */}
        <View style={poStyles.footer}>
          <TouchableOpacity
            style={[poStyles.saveBtn, (saving || totalActiveCount === 0) && poStyles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving || totalActiveCount === 0}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={poStyles.saveBtnText}>
                  Save Order {totalActiveCount > 0 ? `· ${fmt(total)}` : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────
export default function InventoryScreen() {
  const { cafe } = useAuth();
  const { t, fmt } = useSettings();
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [purchaseOrderVisible, setPurchaseOrderVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'drink' | 'food'>('all');

  const load = useCallback(async () => {
    if (!cafe) return;
    try {
      const data = await getProducts(cafe.id);
      setProducts(data);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [cafe]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function handleToggle(id: string, val: boolean) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_available: val } : p)));
    try {
      await toggleProductAvailability(id, val);
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_available: !val } : p)));
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete product', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct(id);
            setProducts((prev) => prev.filter((p) => p.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  }

  async function handleSave(
    name: string,
    category: ProductCategory,
    priceStr: string,
    stockStr: string,
    purchaseCostStr: string
  ) {
    if (!cafe) return;
    const price = parseFloat(priceStr);
    const stockQuantity = parseInt(stockStr, 10);
    if (editing) {
      const updated = await updateProduct(editing.id, { name, category, price, stock_quantity: stockQuantity });
      setProducts((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
    } else {
      const created = await addProduct({ cafeId: cafe.id, name, category, price, stockQuantity });
      setProducts((prev) => [...prev, created]);
      // Log expense if a purchase cost was entered
      const totalCost = parseFloat(purchaseCostStr);
      if (!isNaN(totalCost) && totalCost > 0) {
        await logInventoryExpense({
          cafeId: cafe.id,
          productName: name,
          quantity: stockQuantity,
          totalCost,
        });
      }
    }
    setModalVisible(false);
    setEditing(null);
  }

  async function handleRestock(quantity: number, totalCost: number) {
    if (!restocking || !cafe) return;
    const updated = await restockProduct({
      productId: restocking.id,
      productName: restocking.name,
      cafeId: cafe.id,
      currentStock: restocking.stock_quantity,
      quantity,
      totalCost,
    });
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setRestocking(null);
  }

  async function handleSavePurchaseOrder(
    supplier: string,
    note: string,
    existingLines: PurchaseOrderLine[],
    newProductLines: NewProductOrderLine[]
  ) {
    if (!cafe) return;
    try {
      // Create new products first, collect their IDs
      const createdLines: PurchaseOrderLine[] = await Promise.all(
        newProductLines.map(async (l) => {
          const product = await addProduct({
            cafeId: cafe.id,
            name: l.name,
            category: l.category,
            price: l.price,
            stockQuantity: 0,
          });
          return {
            productId: product.id,
            productName: l.name,
            currentStock: 0,
            quantity: l.quantity,
            unitCost: l.unitCost,
          };
        })
      );
      const allLines = [...existingLines, ...createdLines];
      await savePurchaseOrder({ cafeId: cafe.id, supplier, note, lines: allLines });
      await load();
      setPurchaseOrderVisible(false);
      Alert.alert('Order saved', `Purchase order from ${supplier} has been recorded.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  const filtered = filter === 'all' ? products : products.filter((p) => p.category === filter);
  const drinks = products.filter((p) => p.category === 'drink').length;
  const food = products.filter((p) => p.category === 'food').length;
  const lowStockCount = products.filter((p) => p.stock_quantity <= 5).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6B4E2E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Summary bar ─────────────────────────────────────── */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Ionicons name="cafe-outline" size={16} color="#3B82F6" />
          <Text style={styles.summaryNum}>{drinks}</Text>
          <Text style={styles.summaryLbl}>{t('inventoryDrinks')}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Ionicons name="fast-food-outline" size={16} color="#D97706" />
          <Text style={styles.summaryNum}>{food}</Text>
          <Text style={styles.summaryLbl}>{t('inventoryFood')}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Ionicons name="warning-outline" size={16} color={lowStockCount > 0 ? '#DC2626' : '#9CA3AF'} />
          <Text style={[styles.summaryNum, lowStockCount > 0 && { color: '#DC2626' }]}>
            {lowStockCount}
          </Text>
          <Text style={styles.summaryLbl}>{t('inventoryLowStock')}</Text>
        </View>
      </View>

      {/* ── Filter pills + Purchase Order button ─────────────── */}
      <View style={styles.filterBar}>
        {/* Row 1: category filter pills */}
        <View style={styles.filterPillsRow}>
          {(['all', 'drink', 'food'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.pill, filter === f && styles.pillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                {f === 'all' ? t('inventoryAll') : f === 'drink' ? t('inventoryDrinks') : t('inventoryFood')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Row 2: action buttons */}
        <View style={styles.filterActionsRow}>
          <TouchableOpacity style={styles.pillOutline} onPress={() => navigation.navigate('PurchaseOrders')}>
            <Ionicons name="time-outline" size={13} color="#6B4E2E" style={{ marginRight: 4 }} />
            <Text style={styles.pillOutlineText}>{t('inventoryHistory')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillPrimary} onPress={() => setPurchaseOrderVisible(true)}>
            <Ionicons name="cube-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.pillPrimaryText}>{t('inventoryNewOrder')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductRow
            item={item}
            onToggle={handleToggle}
            onEdit={(p) => { setEditing(p); setModalVisible(true); }}
            onDelete={handleDelete}
            onRestock={(p) => setRestocking(p)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6B4E2E" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>{t('inventoryNoProducts')}</Text>
            <Text style={styles.emptySub}>{t('inventoryNoProductsSub')}</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* ── FAB ─────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setEditing(null); setModalVisible(true); }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <ProductModal
        visible={modalVisible}
        initial={editing}
        onClose={() => { setModalVisible(false); setEditing(null); }}
        onSave={handleSave}
      />

      <RestockModal
        visible={restocking !== null}
        product={restocking}
        onClose={() => setRestocking(null)}
        onConfirm={handleRestock}
      />

      <PurchaseOrderModal
        visible={purchaseOrderVisible}
        products={products}
        onClose={() => setPurchaseOrderVisible(false)}
        onSave={(supplier, note, existingLines, newProductLines) =>
          handleSavePurchaseOrder(supplier, note, existingLines, newProductLines)
        }
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingTop: 12, paddingBottom: 100 },
  separator: { height: 10 },

  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryDivider: { width: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  summaryNum: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  summaryLbl: { fontSize: 12, color: '#9CA3AF' },

  filterBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterActionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  pillActive: { backgroundColor: '#6B4E2E' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  pillTextActive: { color: '#fff' },
  pillOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    backgroundColor: '#FDF8F5',
    marginLeft: 4,
  },
  pillOutlineText: { fontSize: 12, fontWeight: '700', color: '#6B4E2E' },
  pillPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#6B4E2E',
    marginLeft: 6,
  },
  pillPrimaryText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#9CA3AF' },
  emptySub: { fontSize: 13, color: '#D1D5DB' },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 36 : 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6B4E2E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6B4E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});

const rowStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconDrink: { backgroundColor: '#EFF6FF' },
  iconFood: { backgroundColor: '#FFFBEB' },
  name: { fontSize: 15, fontWeight: '600', color: '#1F2937', flex: 1, marginHorizontal: 10 },
  price: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginRight: 8 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    marginLeft: 48,
  },
  catBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
  },
  catText: { fontSize: 11, fontWeight: '600', color: '#6B7280', textTransform: 'capitalize' },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stockOk: { backgroundColor: '#ECFDF5' },
  stockLow: { backgroundColor: '#FEF2F2' },
  stockText: { fontSize: 11, fontWeight: '700' },
  unavailBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FEF3C7',
  },
  unavailText: { fontSize: 11, fontWeight: '600', color: '#D97706' },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  restockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    backgroundColor: '#FDF8F5',
  },
  restockBtnText: { fontSize: 12, fontWeight: '700', color: '#6B4E2E' },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
});

const modalStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  segRow: { flexDirection: 'row', gap: 10 },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  segActive: { backgroundColor: '#6B4E2E', borderColor: '#6B4E2E' },
  segText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  segTextActive: { color: '#fff' },
  labelOptional: { fontSize: 12, fontWeight: '400', color: '#9CA3AF' },
  saveBtn: {
    backgroundColor: '#6B4E2E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
    shadowColor: '#6B4E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

const restockStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  currentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  currentLabel: { flex: 1, fontSize: 14, color: '#6B7280' },
  currentValue: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  preview: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewLbl: { fontSize: 13, color: '#6B7280' },
  previewVal: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  confirmBtn: {
    flexDirection: 'row',
    backgroundColor: '#6B4E2E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6B4E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

const poStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  optional: { fontSize: 11, fontWeight: '400', color: '#9CA3AF', textTransform: 'none' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  input: { flex: 1, fontSize: 15, color: '#1F2937' },

  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  colLbl: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.6 },

  linesCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  lineRowActive: {
    backgroundColor: '#FDF8F5',
  },
  lineIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  lineIconDrink: { backgroundColor: '#EFF6FF' },
  lineIconFood: { backgroundColor: '#FFFBEB' },
  lineName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  lineStock: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  lineInput: {
    width: 64,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
    marginLeft: 6,
  },
  lineDivider: { height: 1, backgroundColor: '#F9FAFB', marginLeft: 54 },

  sectionTitle: { fontSize: 10, fontWeight: '700', color: '#6B4E2E', letterSpacing: 0.6 },

  emptyLines: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  emptyLinesText: { fontSize: 14, color: '#9CA3AF' },

  newProductCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  newProductHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  removeBtn: { padding: 2 },
  newCatRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  catChipActive: { backgroundColor: '#6B4E2E', borderColor: '#6B4E2E' },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  catChipTextActive: { color: '#fff' },
  newFieldRow: { flexDirection: 'row', gap: 8 },
  newFieldLbl: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 4 },
  newFieldInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    textAlign: 'center',
  },

  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8D9CE',
    borderStyle: 'dashed',
    backgroundColor: '#FDF8F5',
  },
  addNewBtnText: { fontSize: 14, fontWeight: '700', color: '#6B4E2E' },

  totalCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRowFinal: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    marginTop: 2,
  },
  totalLbl: { fontSize: 13, color: '#6B7280' },
  totalVal: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  totalFinalLbl: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  totalFinalVal: { fontSize: 18, fontWeight: '800', color: '#6B4E2E' },
  totalHint: { fontSize: 11, color: '#9CA3AF', lineHeight: 16 },

  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: '#6B4E2E',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6B4E2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
