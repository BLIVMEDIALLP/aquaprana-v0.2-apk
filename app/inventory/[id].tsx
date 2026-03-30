import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/lib/theme';
import type { InventoryItem, InventoryOrder } from '../../src/lib/types';

type UnitType = 'kg' | 'litre' | 'units' | 'bags';
const UNIT_OPTIONS: UnitType[] = ['kg', 'litre', 'units', 'bags'];
const ADJUST_AMOUNTS = [-10, -5, -1, 1, 5, 10];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ─── Order Row ─── */
interface OrderRowProps {
  order: InventoryOrder;
  unit: string;
  onFulfill: (order: InventoryOrder) => void;
}

function OrderRow({ order, unit, onFulfill }: OrderRowProps) {
  const isPending = order.status === 'pending';
  return (
    <TouchableOpacity
      style={styles.orderRow}
      onPress={() => isPending && onFulfill(order)}
      activeOpacity={isPending ? 0.7 : 1}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.orderQty}>
          {order.quantity} {unit}
        </Text>
        <Text style={styles.orderDate}>{formatDate(order.requested_at)}</Text>
        {order.fulfilled_at ? (
          <Text style={styles.orderDate}>Fulfilled: {formatDate(order.fulfilled_at)}</Text>
        ) : null}
      </View>
      <View
        style={[
          styles.statusPill,
          { backgroundColor: isPending ? '#fff3cd' : '#d4edda' },
        ]}
      >
        <Text
          style={[
            styles.statusPillText,
            { color: isPending ? COLORS.amber : COLORS.green },
          ]}
        >
          {order.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* ─── Screen ─── */

export default function InventoryItemDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<InventoryItem | null>(null);
  const [orders, setOrders] = useState<InventoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState<UnitType>('kg');
  const [editCurrentQty, setEditCurrentQty] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [editRestockQty, setEditRestockQty] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRaw, ordersRaw] = await Promise.all([
        AsyncStorage.getItem('aquaprana_inventory'),
        AsyncStorage.getItem('aquaprana_inventory_orders'),
      ]);
      const items: InventoryItem[] = itemsRaw ? JSON.parse(itemsRaw) : [];
      const allOrders: InventoryOrder[] = ordersRaw ? JSON.parse(ordersRaw) : [];

      const found = items.find((i) => i._id === id) ?? null;
      setItem(found);

      const itemOrders = allOrders
        .filter((o) => o.item_id === id)
        .sort(
          (a, b) =>
            new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime()
        );
      setOrders(itemOrders);

      if (found) {
        setEditName(found.product_name);
        setEditUnit(found.unit);
        setEditCurrentQty(found.current_qty.toString());
        setEditThreshold(found.restock_threshold.toString());
        setEditRestockQty(found.restock_qty ? found.restock_qty.toString() : '');
      }
    } catch (e) {
      console.error('InventoryItemDetail load error', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  /* ─── Quick Adjust ─── */
  async function handleAdjust(delta: number) {
    if (!item) return;
    const newQty = Math.max(0, item.current_qty + delta);
    const updated = { ...item, current_qty: newQty, updated_at: new Date().toISOString() };

    try {
      const raw = await AsyncStorage.getItem('aquaprana_inventory');
      const items: InventoryItem[] = raw ? JSON.parse(raw) : [];
      const idx = items.findIndex((i) => i._id === id);
      if (idx >= 0) {
        items[idx] = updated;
        await AsyncStorage.setItem('aquaprana_inventory', JSON.stringify(items));
      }
      setItem(updated);
    } catch (e) {
      console.error('Adjust stock error', e);
    }
  }

  /* ─── Create Restock Order ─── */
  async function handleCreateOrder() {
    if (!item) return;
    try {
      const raw = await AsyncStorage.getItem('aquaprana_inventory_orders');
      const existing: InventoryOrder[] = raw ? JSON.parse(raw) : [];

      const newOrder: InventoryOrder = {
        _id: Date.now().toString(),
        item_id: item._id,
        user_id: 'local',
        quantity: item.restock_qty || 1,
        status: 'pending',
        requested_at: new Date().toISOString(),
        fulfilled_at: null,
      };

      await AsyncStorage.setItem(
        'aquaprana_inventory_orders',
        JSON.stringify([...existing, newOrder])
      );

      setOrders((prev) => [newOrder, ...prev]);
      Alert.alert('Restock order created!', `Order for ${newOrder.quantity} ${item.unit} placed.`);
    } catch (e) {
      console.error('Create order error', e);
    }
  }

  /* ─── Fulfill Order ─── */
  async function handleFulfillOrder(order: InventoryOrder) {
    Alert.alert('Mark as fulfilled?', `Mark order of ${order.quantity} ${item?.unit} as fulfilled?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Fulfil',
        onPress: async () => {
          try {
            const raw = await AsyncStorage.getItem('aquaprana_inventory_orders');
            const allOrders: InventoryOrder[] = raw ? JSON.parse(raw) : [];
            const idx = allOrders.findIndex((o) => o._id === order._id);
            if (idx >= 0) {
              allOrders[idx] = {
                ...allOrders[idx],
                status: 'fulfilled',
                fulfilled_at: new Date().toISOString(),
              };
              await AsyncStorage.setItem(
                'aquaprana_inventory_orders',
                JSON.stringify(allOrders)
              );
              setOrders((prev) =>
                prev.map((o) =>
                  o._id === order._id
                    ? { ...o, status: 'fulfilled', fulfilled_at: new Date().toISOString() }
                    : o
                )
              );
            }
          } catch (e) {
            console.error('Fulfil order error', e);
          }
        },
      },
    ]);
  }

  /* ─── Save Edit ─── */
  async function handleSaveEdit() {
    if (!item) return;
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem('aquaprana_inventory');
      const items: InventoryItem[] = raw ? JSON.parse(raw) : [];
      const idx = items.findIndex((i) => i._id === id);

      if (idx >= 0) {
        const updated: InventoryItem = {
          ...items[idx],
          product_name: editName.trim(),
          unit: editUnit,
          current_qty: parseFloat(editCurrentQty) || 0,
          restock_threshold: parseFloat(editThreshold) || 0,
          restock_qty: editRestockQty.trim() !== '' ? parseFloat(editRestockQty) : 0,
          updated_at: new Date().toISOString(),
        };
        items[idx] = updated;
        await AsyncStorage.setItem('aquaprana_inventory', JSON.stringify(items));
        setItem(updated);
      }
      setEditMode(false);
    } catch (e) {
      console.error('Save edit error', e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.notFoundText}>Item not found</Text>
          <TouchableOpacity style={styles.backBtnCenter} onPress={() => router.back()}>
            <Text style={styles.backBtnCenterText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isLow = item.current_qty <= item.restock_threshold;
  const ratio =
    item.restock_threshold > 0
      ? Math.min(item.current_qty / item.restock_threshold, 1)
      : 1;
  const barColor = isLow ? COLORS.red : COLORS.green;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item.product_name}
        </Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            if (editMode) {
              setEditMode(false);
            } else {
              setEditMode(true);
            }
          }}
        >
          <Ionicons
            name={editMode ? 'close-outline' : 'pencil-outline'}
            size={22}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── Stock Level Card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Stock Level</Text>

          <View style={styles.stockRow}>
            <Text style={styles.bigQty}>{item.current_qty}</Text>
            <Text style={styles.bigUnit}> {item.unit}</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${ratio * 100}%` as any, backgroundColor: barColor },
              ]}
            />
          </View>
          <Text style={styles.thresholdText}>
            Restock threshold: {item.restock_threshold} {item.unit}
          </Text>

          {isLow && (
            <View style={styles.lowStockCard}>
              <Ionicons name="warning-outline" size={16} color={COLORS.amber} />
              <Text style={styles.lowStockCardText}>
                Low stock — consider reordering
              </Text>
            </View>
          )}
        </View>

        {/* ── Quick Adjust Card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Adjust Stock</Text>
          <View style={styles.adjustGrid}>
            {ADJUST_AMOUNTS.map((delta) => {
              const wouldGoNegative = item.current_qty + delta < 0;
              const disabled = delta < 0 && wouldGoNegative;
              return (
                <TouchableOpacity
                  key={delta}
                  style={[styles.adjustBtn, disabled && styles.adjustBtnDisabled]}
                  onPress={() => handleAdjust(delta)}
                  disabled={disabled}
                >
                  <Text
                    style={[
                      styles.adjustBtnText,
                      delta > 0 ? styles.adjustBtnPlus : styles.adjustBtnMinus,
                      disabled && styles.adjustBtnTextDisabled,
                    ]}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Restock Orders Card ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Restock Orders</Text>

          <TouchableOpacity style={styles.createOrderBtn} onPress={handleCreateOrder}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.createOrderBtnText}>Create Restock Order</Text>
          </TouchableOpacity>

          {orders.length === 0 ? (
            <Text style={styles.noOrdersText}>No orders yet</Text>
          ) : (
            orders.map((order) => (
              <OrderRow
                key={order._id}
                order={order}
                unit={item.unit}
                onFulfill={handleFulfillOrder}
              />
            ))
          )}
        </View>

        {/* ── Edit Mode Form ── */}
        {editMode && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Edit Item</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Product Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Product name"
                placeholderTextColor={COLORS.muted}
                maxLength={100}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Unit</Text>
              <View style={styles.unitRow}>
                {UNIT_OPTIONS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, editUnit === u && styles.unitBtnActive]}
                    onPress={() => setEditUnit(u)}
                  >
                    <Text
                      style={[
                        styles.unitBtnText,
                        editUnit === u && styles.unitBtnTextActive,
                      ]}
                    >
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Current Stock</Text>
              <TextInput
                style={styles.input}
                value={editCurrentQty}
                onChangeText={setEditCurrentQty}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Restock Threshold</Text>
              <TextInput
                style={styles.input}
                value={editThreshold}
                onChangeText={setEditThreshold}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Restock Quantity</Text>
              <TextInput
                style={styles.input}
                value={editRestockQty}
                onChangeText={setEditRestockQty}
                keyboardType="decimal-pad"
                placeholder="Optional"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveChangesBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveEdit}
              disabled={saving}
            >
              <Text style={styles.saveChangesBtnText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.grayBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  editBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.muted,
    marginBottom: SPACING.lg,
  },
  backBtnCenter: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  backBtnCenterText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.semibold,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 48,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  bigQty: {
    fontSize: 48,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    lineHeight: 56,
  },
  bigUnit: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.medium,
    color: COLORS.muted,
    marginBottom: 6,
  },
  progressTrack: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  thresholdText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
  },
  lowStockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e6',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  lowStockCardText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.amber,
    flex: 1,
  },
  adjustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  adjustBtn: {
    flex: 1,
    minWidth: 60,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.grayBg,
  },
  adjustBtnDisabled: {
    opacity: 0.35,
  },
  adjustBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
  },
  adjustBtnPlus: {
    color: COLORS.green,
  },
  adjustBtnMinus: {
    color: COLORS.red,
  },
  adjustBtnTextDisabled: {
    color: COLORS.muted,
  },
  createOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
    minHeight: 48,
  },
  createOrderBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  noOrdersText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  orderQty: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  orderDate: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.muted,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    textTransform: 'capitalize',
  },
  fieldGroup: {
    gap: SPACING.xs,
  },
  fieldLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.grayBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    minHeight: 48,
  },
  unitRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  unitBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.grayBg,
  },
  unitBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitBtnText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.muted,
  },
  unitBtnTextActive: {
    color: COLORS.white,
  },
  saveChangesBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveChangesBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
});
