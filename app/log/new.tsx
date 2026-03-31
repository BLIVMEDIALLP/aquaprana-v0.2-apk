import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { Pond, CropCycle, PondLog } from '../../src/lib/types';
import {
  calculateBiomass,
  calculateSurvivalRate,
  calculateStockingCount,
} from '../../src/lib/calculations';

/* ─── Colors ─── */
const C = {
  primary: '#1E7AB8',
  green: '#27ae60',
  amber: '#f39c12',
  red: '#e74c3c',
  gray: '#f7f8fa',
  border: '#e2e8f0',
  text: '#1a202c',
  muted: '#718096',
  white: '#ffffff',
} as const;

/* ─── Storage Keys ─── */
const KEYS = {
  PONDS: 'aquaprana_ponds',
  CYCLES: 'aquaprana_cycles',
  LOGS: 'aquaprana_logs',
} as const;

/* ─── Water quality field definitions ─── */
interface WqField {
  key: keyof PondLog;
  label: string;
  unit: string;
  min: number;
  max: number;
  keyboard: 'numeric' | 'decimal-pad';
  flagCheck: (v: number) => string | null;
}

const WATER_QUALITY_FIELDS: WqField[] = [
  {
    key: 'do_mgl',
    label: 'Dissolved Oxygen',
    unit: 'mg/L',
    min: 0,
    max: 20,
    keyboard: 'decimal-pad',
    flagCheck: (v) =>
      v < 4 ? 'Warning: DO below safe range (4–10 mg/L)' :
      v > 10 ? 'Warning: DO above safe range (4–10 mg/L)' : null,
  },
  {
    key: 'ph',
    label: 'pH',
    unit: '',
    min: 0,
    max: 14,
    keyboard: 'decimal-pad',
    flagCheck: (v) =>
      v < 7.5 ? 'Warning: pH below safe range (7.5–8.5)' :
      v > 8.5 ? 'Warning: pH above safe range (7.5–8.5)' : null,
  },
  {
    key: 'temp_c',
    label: 'Temperature',
    unit: '°C',
    min: 0,
    max: 45,
    keyboard: 'decimal-pad',
    flagCheck: (v) =>
      v < 26 ? 'Warning: Temp below safe range (26–32 °C)' :
      v > 32 ? 'Warning: Temp above safe range (26–32 °C)' : null,
  },
  {
    key: 'salinity_ppt',
    label: 'Salinity',
    unit: 'ppt',
    min: 0,
    max: 60,
    keyboard: 'decimal-pad',
    flagCheck: () => null,
  },
  {
    key: 'ammonia_mgl',
    label: 'Ammonia',
    unit: 'mg/L',
    min: 0,
    max: 10,
    keyboard: 'decimal-pad',
    flagCheck: (v) =>
      v > 0.1 ? 'Warning: Ammonia above safe limit (0.1 mg/L)' : null,
  },
  {
    key: 'turbidity_cm',
    label: 'Turbidity (Secchi)',
    unit: 'cm',
    min: 0,
    max: 200,
    keyboard: 'numeric',
    flagCheck: (v) =>
      v < 30 ? 'Warning: Turbidity below 30 cm' :
      v > 50 ? 'Warning: Turbidity above 50 cm' : null,
  },
  {
    key: 'calcium_mgl',
    label: 'Calcium',
    unit: 'mg/L',
    min: 0,
    max: 500,
    keyboard: 'numeric',
    flagCheck: (v) =>
      v < 75 ? 'Warning: Calcium below safe level (75 mg/L)' : null,
  },
  {
    key: 'magnesium_mgl',
    label: 'Magnesium',
    unit: 'mg/L',
    min: 0,
    max: 1000,
    keyboard: 'numeric',
    flagCheck: (v) =>
      v < 100 ? 'Warning: Magnesium below safe level (100 mg/L)' : null,
  },
  {
    key: 'potassium_mgl',
    label: 'Potassium',
    unit: 'mg/L',
    min: 0,
    max: 500,
    keyboard: 'numeric',
    flagCheck: (v) =>
      v < 5 ? 'Warning: Potassium below safe level (5 mg/L)' : null,
  },
];

/* ─── Helpers ─── */
function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function padTwo(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatTime(date: Date): string {
  return `${padTwo(date.getHours())}:${padTwo(date.getMinutes())}`;
}

/* ─── Component ─── */
export default function NewLogScreen() {
  const router = useRouter();
  const { pondId } = useLocalSearchParams<{ pondId: string }>();

  const [loading, setLoading] = useState(true);
  const [pond, setPond] = useState<Pond | null>(null);
  const [cycle, setCycle] = useState<CropCycle | null>(null);
  const [dailyCap, setDailyCap] = useState(false);

  /* ─── Time picker ─── */
  const [observedTime, setObservedTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  /* ─── Water quality ─── */
  const [wqValues, setWqValues] = useState<Record<string, string>>({});
  const [wqWarnings, setWqWarnings] = useState<Record<string, string | null>>({});

  /* ─── Farm management ─── */
  const [feedQty, setFeedQty] = useState('');
  const [feedBrand, setFeedBrand] = useState('');
  const [mortalityCount, setMortalityCount] = useState('');
  const [treatment, setTreatment] = useState('');
  const [abwSample, setAbwSample] = useState('');
  const [notes, setNotes] = useState('');

  /* ─── Load pond + cycle + check daily cap ─── */
  useEffect(() => {
    async function load() {
      if (!pondId) { setLoading(false); return; }
      try {
        const [pondsRaw, cyclesRaw, logsRaw] = await Promise.all([
          AsyncStorage.getItem(KEYS.PONDS),
          AsyncStorage.getItem(KEYS.CYCLES),
          AsyncStorage.getItem(KEYS.LOGS),
        ]);

        const ponds: Pond[] = pondsRaw ? JSON.parse(pondsRaw) : [];
        const cycles: CropCycle[] = cyclesRaw ? JSON.parse(cyclesRaw) : [];
        const logs: PondLog[] = logsRaw ? JSON.parse(logsRaw) : [];

        const foundPond = ponds.find((p) => p._id === pondId) || null;
        const foundCycle =
          cycles.find((c) => c.pond_id === pondId && c.status === 'active') || null;

        setPond(foundPond);
        setCycle(foundCycle);

        // Check daily cap
        const today = new Date().toISOString().slice(0, 10);
        const todayCount = logs.filter(
          (l) => l.pond_id === pondId && l.created_at.slice(0, 10) === today
        ).length;
        if (todayCount >= 4) setDailyCap(true);
      } catch {
        // proceed with nulls
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pondId]);

  /* ─── Biomass calculation ─── */
  const stockingCount =
    cycle && pond
      ? calculateStockingCount(cycle.stocking_density, pond.area_acres ?? 1)
      : 0;

  const abwNum = parseFloat(abwSample) || 0;
  const mortalityNum = parseInt(mortalityCount) || 0;
  const survivalRate =
    stockingCount > 0
      ? calculateSurvivalRate(stockingCount, mortalityNum)
      : 0;
  const biomass =
    stockingCount > 0 && abwNum > 0
      ? calculateBiomass(stockingCount, abwNum, survivalRate)
      : null;

  /* ─── Validation on blur ─── */
  const handleWqBlur = useCallback(
    (field: WqField) => {
      const raw = wqValues[field.key as string];
      if (!raw) {
        setWqWarnings((prev) => ({ ...prev, [field.key as string]: null }));
        return;
      }
      const v = parseFloat(raw);
      if (isNaN(v)) {
        setWqWarnings((prev) => ({ ...prev, [field.key as string]: null }));
        return;
      }
      setWqWarnings((prev) => ({
        ...prev,
        [field.key as string]: field.flagCheck(v),
      }));
    },
    [wqValues]
  );

  /* ─── Save ─── */
  const handleSave = useCallback(async () => {
    if (dailyCap) {
      Alert.alert(
        'Daily log limit reached',
        'Maximum 4 entries per day. Try again tomorrow.'
      );
      return;
    }

    // Re-check cap
    try {
      const logsRaw = await AsyncStorage.getItem(KEYS.LOGS);
      const allLogs: PondLog[] = logsRaw ? JSON.parse(logsRaw) : [];
      const today = new Date().toISOString().slice(0, 10);
      const count = allLogs.filter(
        (l) => l.pond_id === pondId && l.created_at.slice(0, 10) === today
      ).length;
      if (count >= 4) {
        setDailyCap(true);
        Alert.alert(
          'Daily log limit reached',
          'Maximum 4 entries per day. Try again tomorrow.'
        );
        return;
      }

      const now = new Date().toISOString();
      const todayDate = now.slice(0, 10);
      const timeStr = formatTime(observedTime);

      const newLog: PondLog = {
        _id: generateId(),
        cycle_id: cycle?._id ?? '',
        pond_id: pondId ?? '',
        observed_at: `${todayDate}T${timeStr}:00`,
        do_mgl: wqValues.do_mgl ? parseFloat(wqValues.do_mgl) : null,
        ph: wqValues.ph ? parseFloat(wqValues.ph) : null,
        temp_c: wqValues.temp_c ? parseFloat(wqValues.temp_c) : null,
        salinity_ppt: wqValues.salinity_ppt ? parseFloat(wqValues.salinity_ppt) : null,
        ammonia_mgl: wqValues.ammonia_mgl ? parseFloat(wqValues.ammonia_mgl) : null,
        turbidity_cm: wqValues.turbidity_cm ? parseFloat(wqValues.turbidity_cm) : null,
        calcium_mgl: wqValues.calcium_mgl ? parseFloat(wqValues.calcium_mgl) : null,
        magnesium_mgl: wqValues.magnesium_mgl ? parseFloat(wqValues.magnesium_mgl) : null,
        potassium_mgl: wqValues.potassium_mgl ? parseFloat(wqValues.potassium_mgl) : null,
        param_source: 'manual',
        feed_qty_kg: feedQty ? parseFloat(feedQty) : null,
        feed_brand: feedBrand || null,
        mortality_count: mortalityCount ? parseInt(mortalityCount) : null,
        treatment: treatment || null,
        abw_g: abwNum > 0 ? abwNum : null,
        biomass_kg: biomass !== null ? parseFloat(biomass.toFixed(2)) : null,
        notes: notes || null,
        created_at: now,
        updated_at: now,
      };

      allLogs.push(newLog);
      await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(allLogs));

      Alert.alert('Success', 'Log saved successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to save log. Please try again.');
    }
  }, [
    dailyCap, pondId, observedTime, cycle, wqValues,
    feedQty, feedBrand, mortalityCount, treatment,
    abwNum, biomass, notes, router,
  ]);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={C.white} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>New Log Entry</Text>
          {pond && <Text style={s.headerSubtitle}>{pond.name}</Text>}
        </View>
        <View style={s.backBtn} />
      </View>

      {/* Daily cap banner */}
      {dailyCap && (
        <View style={s.capBanner}>
          <Ionicons name="warning" size={16} color={C.red} />
          <Text style={s.capBannerText}>
            Daily log limit reached. Maximum 4 entries per day.
          </Text>
        </View>
      )}

      {/* Scrollable form */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Section: Observation Time ── */}
        <SectionHeader icon="time-outline" label="Observation Time" />
        <View style={s.card}>
          <FieldLabel label="Time" required />
          <TouchableOpacity
            style={s.timePickerBtn}
            onPress={() => setShowTimePicker(true)}
            accessibilityLabel="Select observation time"
          >
            <Ionicons name="time-outline" size={18} color={C.primary} />
            <Text style={s.timePickerText}>{formatTime(observedTime)}</Text>
            <Ionicons name="chevron-down" size={16} color={C.muted} />
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={observedTime}
              mode="time"
              is24Hour
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (date) setObservedTime(date);
              }}
            />
          )}
        </View>

        {/* ── Section: Water Quality ── */}
        <SectionHeader icon="water-outline" label="Water Quality" />
        <View style={s.wqGrid}>
          {WATER_QUALITY_FIELDS.map((field) => {
            const key = field.key as string;
            const warning = wqWarnings[key] ?? null;
            const val = wqValues[key] ?? '';
            const numVal = parseFloat(val);
            const status = val && !isNaN(numVal) ? field.flagCheck(numVal) : null;
            const tileColor = status ? '#fffbeb' : val ? '#f0fdf4' : C.white;
            const borderColor = status ? C.amber : val ? C.green : C.border;
            return (
              <View
                key={key}
                style={[s.wqTile, { backgroundColor: tileColor, borderColor }]}
              >
                <Text style={s.wqTileLabel}>
                  {field.label}
                  {field.unit ? ` (${field.unit})` : ''}
                </Text>
                <TextInput
                  style={s.wqTileInput}
                  value={val}
                  onChangeText={(t) =>
                    setWqValues((prev) => ({ ...prev, [key]: t }))
                  }
                  onBlur={() => handleWqBlur(field)}
                  placeholder="—"
                  placeholderTextColor={C.muted}
                  keyboardType={field.keyboard}
                  returnKeyType="next"
                />
                {warning && (
                  <View style={s.wqTileWarn}>
                    <Ionicons name="warning" size={10} color={C.amber} />
                    <Text style={s.wqTileWarnText} numberOfLines={2}>{warning.replace('Warning: ', '')}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Section: Farm Management ── */}
        <SectionHeader icon="leaf-outline" label="Farm Management" />

        <View style={s.card}>
          <FieldLabel label="Feed Quantity (kg)" />
          <TextInput
            style={s.input}
            value={feedQty}
            onChangeText={setFeedQty}
            placeholder="0.0"
            placeholderTextColor={C.muted}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </View>

        <View style={s.card}>
          <FieldLabel label="Feed Brand" />
          <TextInput
            style={s.input}
            value={feedBrand}
            onChangeText={setFeedBrand}
            placeholder="e.g. CP Feed 35%"
            placeholderTextColor={C.muted}
            returnKeyType="done"
          />
        </View>

        <View style={s.card}>
          <FieldLabel label="Mortality Count" />
          <TextInput
            style={s.input}
            value={mortalityCount}
            onChangeText={setMortalityCount}
            placeholder="0"
            placeholderTextColor={C.muted}
            keyboardType="numeric"
            returnKeyType="done"
          />
        </View>

        <View style={s.card}>
          <FieldLabel label="Treatment Applied" />
          <TextInput
            style={s.input}
            value={treatment}
            onChangeText={setTreatment}
            placeholder="e.g. Lime, Probiotics"
            placeholderTextColor={C.muted}
            returnKeyType="done"
          />
        </View>

        <View style={s.card}>
          <FieldLabel label="ABW Sample (g)" />
          <TextInput
            style={s.input}
            value={abwSample}
            onChangeText={setAbwSample}
            placeholder="0.0"
            placeholderTextColor={C.muted}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <Text style={s.hint}>Weigh 5–10 animals</Text>
        </View>

        <View style={s.card}>
          <FieldLabel label="Biomass (kg) — auto-calculated" />
          <View style={s.readonlyInput}>
            <Text style={s.readonlyText}>
              {biomass !== null ? biomass.toFixed(2) : '—'}
            </Text>
          </View>
          <Text style={s.hint}>= stocking count × ABW × survival% ÷ 1000</Text>
        </View>

        {/* ── Section: Notes ── */}
        <SectionHeader icon="document-text-outline" label="Notes" />
        <View style={s.card}>
          <TextInput
            style={s.textarea}
            value={notes}
            onChangeText={(t) => { if (t.length <= 500) setNotes(t); }}
            placeholder="Any additional observations..."
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{notes.length}/500</Text>
        </View>

        <View style={s.bottomPad} />
      </ScrollView>

      {/* Sticky Save Button */}
      <View style={s.stickyBottom}>
        <TouchableOpacity
          style={[s.saveBtn, dailyCap && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={dailyCap}
          activeOpacity={0.85}
          accessibilityLabel="Save log entry"
        >
          <Ionicons name="checkmark-circle" size={20} color={C.white} />
          <Text style={s.saveBtnText}>Save Log</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Sub-components ─── */

function SectionHeader({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon} size={15} color={C.primary} />
      <Text style={s.sectionLabel}>{label}</Text>
    </View>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={s.fieldLabel}>
      {label}
      {required && <Text style={s.required}> *</Text>}
    </Text>
  );
}

/* ─── Styles ─── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gray },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.gray },

  /* Header */
  header: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, paddingHorizontal: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.white },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  /* Cap banner */
  capBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 10,
    margin: 12,
    padding: 12,
    gap: 8,
  },
  capBannerText: { flex: 1, fontSize: 13, fontWeight: '500', color: C.red },

  /* Scroll */
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 12 },
  bottomPad: { height: 100 },

  /* Section header */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: C.text, textTransform: 'uppercase', letterSpacing: 0.5 },

  /* Card */
  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 10,
  },
  cardWarn: { borderColor: C.amber, backgroundColor: '#fffbeb' },

  /* Field label */
  fieldLabel: { fontSize: 12, fontWeight: '500', color: C.muted, marginBottom: 8 },
  required: { color: C.red },

  /* Input */
  input: {
    backgroundColor: C.gray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: C.text,
    minHeight: 48,
  },

  /* Readonly input */
  readonlyInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 48,
    justifyContent: 'center',
  },
  readonlyText: { fontSize: 15, color: C.muted },

  /* Textarea */
  textarea: {
    backgroundColor: C.gray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: C.text,
    minHeight: 100,
  },
  charCount: { fontSize: 11, color: C.muted, textAlign: 'right', marginTop: 6 },

  /* Hint */
  hint: { fontSize: 11, color: C.muted, marginTop: 6 },

  /* Warning */
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 8 },
  warningText: { flex: 1, fontSize: 12, color: C.amber, fontWeight: '500' },

  /* WQ 2-col grid */
  wqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  wqTile: {
    width: '47%',
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
    minHeight: 80,
    justifyContent: 'space-between',
  },
  wqTileLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 4,
  },
  wqTileInput: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    paddingVertical: 2,
    minHeight: 32,
  },
  wqTileWarn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 3,
    marginTop: 4,
  },
  wqTileWarnText: {
    flex: 1,
    fontSize: 9,
    color: C.amber,
    fontWeight: '500',
    lineHeight: 12,
  },

  /* Time picker button */
  timePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.gray,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
    minHeight: 48,
  },
  timePickerText: { flex: 1, fontSize: 16, fontWeight: '600', color: C.text },

  /* Sticky bottom */
  stickyBottom: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
    minHeight: 52,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: C.muted, shadowOpacity: 0 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: C.white },
});
