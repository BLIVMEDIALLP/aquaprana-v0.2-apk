import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, FONTS, SPACING, RADIUS } from '../../src/lib/theme';
import type { InventoryItem } from '../../src/lib/types';

type UnitType = 'kg' | 'litre' | 'units' | 'bags';
const UNIT_OPTIONS: UnitType[] = ['kg', 'litre', 'units', 'bags'];

interface FormErrors {
  productName?: string;
  unit?: string;
  currentQty?: string;
  threshold?: string;
}

export default function AddInventoryItem() {
  const router = useRouter();

  const [productName, setProductName] = useState('');
  const [unit, setUnit] = useState<UnitType | null>(null);
  const [currentQty, setCurrentQty] = useState('');
  const [threshold, setThreshold] = useState('');
  const [restockQty, setRestockQty] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!productName.trim()) {
      newErrors.productName = 'Product name is required';
    } else if (productName.trim().length > 100) {
      newErrors.productName = 'Product name must be 100 characters or less';
    }

    if (!unit) {
      newErrors.unit = 'Please select a unit';
    }

    const qtyNum = parseFloat(currentQty);
    if (currentQty.trim() === '' || isNaN(qtyNum)) {
      newErrors.currentQty = 'Current stock is required';
    } else if (qtyNum < 0) {
      newErrors.currentQty = 'Current stock must be 0 or greater';
    }

    const threshNum = parseFloat(threshold);
    if (threshold.trim() === '' || isNaN(threshNum)) {
      newErrors.threshold = 'Restock threshold is required';
    } else if (threshNum < 0) {
      newErrors.threshold = 'Restock threshold must be 0 or greater';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem('aquaprana_inventory');
      const existing: InventoryItem[] = raw ? JSON.parse(raw) : [];

      const now = new Date().toISOString();
      const newItem: InventoryItem = {
        _id: Date.now().toString(),
        user_id: 'local',
        product_name: productName.trim(),
        unit: unit!,
        current_qty: parseFloat(currentQty),
        restock_threshold: parseFloat(threshold),
        restock_qty: restockQty.trim() !== '' ? parseFloat(restockQty) : 0,
        location: null,
        created_at: now,
        updated_at: now,
      };

      await AsyncStorage.setItem(
        'aquaprana_inventory',
        JSON.stringify([...existing, newItem])
      );
      router.back();
    } catch (e) {
      console.error('AddInventoryItem save error', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.grayBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Item</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={[styles.input, errors.productName ? styles.inputError : null]}
              value={productName}
              onChangeText={(t) => {
                setProductName(t);
                if (errors.productName) setErrors((e) => ({ ...e, productName: undefined }));
              }}
              placeholder="e.g. Vannamei Feed, Lime, Probiotics"
              placeholderTextColor={COLORS.muted}
              maxLength={100}
              returnKeyType="next"
            />
            {errors.productName ? (
              <Text style={styles.errorText}>{errors.productName}</Text>
            ) : null}
          </View>

          {/* Unit */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Unit *</Text>
            <View style={styles.unitRow}>
              {UNIT_OPTIONS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                  onPress={() => {
                    setUnit(u);
                    if (errors.unit) setErrors((e) => ({ ...e, unit: undefined }));
                  }}
                >
                  <Text
                    style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.unit ? (
              <Text style={styles.errorText}>{errors.unit}</Text>
            ) : null}
          </View>

          {/* Current Stock */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Current Stock *</Text>
            <TextInput
              style={[styles.input, errors.currentQty ? styles.inputError : null]}
              value={currentQty}
              onChangeText={(t) => {
                setCurrentQty(t);
                if (errors.currentQty) setErrors((e) => ({ ...e, currentQty: undefined }));
              }}
              placeholder="0"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
            {errors.currentQty ? (
              <Text style={styles.errorText}>{errors.currentQty}</Text>
            ) : null}
          </View>

          {/* Restock Threshold */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Restock Threshold *</Text>
            <Text style={styles.hint}>Alert when stock falls to or below this level</Text>
            <TextInput
              style={[styles.input, errors.threshold ? styles.inputError : null]}
              value={threshold}
              onChangeText={(t) => {
                setThreshold(t);
                if (errors.threshold) setErrors((e) => ({ ...e, threshold: undefined }));
              }}
              placeholder="0"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
            {errors.threshold ? (
              <Text style={styles.errorText}>{errors.threshold}</Text>
            ) : null}
          </View>

          {/* Restock Quantity (optional) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Restock Quantity</Text>
            <Text style={styles.hint}>Default order quantity</Text>
            <TextInput
              style={styles.input}
              value={restockQty}
              onChangeText={setRestockQty}
              placeholder="Optional"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : 'Save Item'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerPlaceholder: {
    width: 44,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 48,
    gap: SPACING.lg,
  },
  fieldGroup: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.text,
  },
  hint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.muted,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    minHeight: 48,
  },
  inputError: {
    borderColor: COLORS.red,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.red,
  },
  unitRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  unitBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
  },
  unitBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitBtnText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.muted,
  },
  unitBtnTextActive: {
    color: COLORS.white,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: SPACING.md,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
  },
});
