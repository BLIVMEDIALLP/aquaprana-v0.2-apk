import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/lib/theme';
import type { InventoryItem } from '../../src/lib/types';

/* ─── Item Card ─── */

interface ItemCardProps {
  item: InventoryItem;
  onPress: () => void;
}

function ItemCard({ item, onPress }: ItemCardProps) {
  const isLow = item.current_qty <= item.restock_threshold;
  const ratio =
    item.restock_threshold > 0
      ? Math.min(item.current_qty / item.restock_threshold, 1)
      : 1;
  const barColor = isLow ? COLORS.red : COLORS.green;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Row 1: name + unit badge */}
      <View style={styles.cardRow}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.product_name}
        </Text>
        <View style={styles.unitBadge}>
          <Text style={styles.unitBadgeText}>{item.unit}</Text>
        </View>
      </View>

      {/* Row 2: progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${ratio * 100}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>

      {/* Row 3: qty label + low stock warning */}
      <View style={styles.cardRow}>
        <Text style={styles.qtyText}>
          {item.current_qty} {item.unit} remaining
        </Text>
        {isLow && (
          <Text style={styles.lowStockText}>⚠ Low stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ─── Empty State ─── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color={COLORS.muted} />
      <Text style={styles.emptyTitle}>No inventory items</Text>
      <Text style={styles.emptySubtitle}>
        Track feed, chemicals, and supplies by adding your first item.
      </Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onAdd}>
        <Text style={styles.emptyBtnText}>Add first item</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ─── Screen ─── */

export default function InventoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem('aquaprana_inventory');
      setItems(raw ? JSON.parse(raw) : []);
    } catch (e) {
      console.error('InventoryScreen load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const goAdd = () => router.push('/inventory/add');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inventory</Text>
          <Text style={styles.headerSub}>Feed, medicines &amp; supplies</Text>
        </View>
        <TouchableOpacity style={styles.headerAddBtn} onPress={goAdd}>
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : items.length === 0 ? (
        <EmptyState onAdd={goAdd} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => router.push(`/inventory/${item._id}`)}
            />
          )}
        />
      )}

      {/* FAB */}
      {items.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={goAdd}>
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}
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
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.white,
  },
  headerSub: {
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
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
    gap: SPACING.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  unitBadge: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  unitBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  qtyText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
  },
  lowStockText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.amber,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
